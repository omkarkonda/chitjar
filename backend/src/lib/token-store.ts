import { query } from './db';
import { config } from './config';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

/**
 * Row type for refresh_tokens
 */
export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  token_jti: string;
  user_agent: string | null;
  ip_address: string | null;
  is_revoked: boolean;
  expires_at: string; // ISO string
  created_at: string; // ISO string
}

/**
 * Hash a refresh token with bcrypt
 */
export async function hashRefreshToken(token: string): Promise<string> {
  const rounds = config.bcryptRounds;
  return bcrypt.hash(token, rounds);
}

/**
 * Compare raw token with stored hash
 */
export async function compareRefreshToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

/**
 * Decode JWT to get jti and exp
 */
export function decodeRefreshToken(token: string): { jti?: string; exp?: number } {
  const decoded = jwt.decode(token) as { jti?: string; exp?: number } | null;
  return decoded || {};
}

/**
 * Save a refresh token record for a user
 */
export async function saveRefreshToken(params: {
  userId: string;
  refreshToken: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  const { userId, refreshToken, userAgent = null, ipAddress = null } = params;
  const { jti, exp } = decodeRefreshToken(refreshToken);

  if (!jti || !exp) {
    throw new Error('Invalid refresh token payload');
  }

  const tokenHash = await hashRefreshToken(refreshToken);
  // exp is seconds since epoch
  const expiresAt = new Date(exp * 1000).toISOString();

  await query(
    `
    INSERT INTO refresh_tokens (user_id, token_hash, token_jti, user_agent, ip_address, expires_at, is_revoked)
    VALUES ($1, $2, $3, $4, $5, $6, false)
    ON CONFLICT (token_jti) DO UPDATE SET
      token_hash = EXCLUDED.token_hash,
      user_agent = EXCLUDED.user_agent,
      ip_address = EXCLUDED.ip_address,
      expires_at = EXCLUDED.expires_at,
      is_revoked = false
    `,
    [userId, tokenHash, jti, userAgent, ipAddress, expiresAt]
  );
}

/**
 * Find a refresh token by JTI
 */
export async function findRefreshTokenByJti(tokenJti: string): Promise<RefreshTokenRow | null> {
  const result = await query(
    `
    SELECT id, user_id, token_hash, token_jti, user_agent, ip_address, is_revoked, expires_at, created_at
    FROM refresh_tokens
    WHERE token_jti = $1
    LIMIT 1
    `,
    [tokenJti]
  );
  return result.rows[0] || null;
}

/**
 * Revoke a refresh token by JTI
 */
export async function revokeRefreshTokenByJti(tokenJti: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE token_jti = $1`,
    [tokenJti]
  );
}

/**
 * Revoke all refresh tokens for a user
 */
export async function revokeAllTokensForUser(userId: string): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET is_revoked = true WHERE user_id = $1`,
    [userId]
  );
}

/**
 * Cleanup expired tokens (optional maintenance)
 */
export async function deleteExpiredTokens(): Promise<number> {
  const result = await query(
    `DELETE FROM refresh_tokens WHERE expires_at < NOW() RETURNING 1`
  );
  return result.rowCount || 0;
}