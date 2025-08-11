import crypto from 'crypto';
import { config } from './config';

/**
 * Secret management utilities for handling sensitive configuration
 */
export class SecretManager {

  /**
   * Generate a secure random string for JWT secrets
   */
  static generateJWTSecret(length: number = 64): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random string for API keys
   */
  static generateAPIKey(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Hash a password using bcrypt (wrapper for bcryptjs)
   */
  static async hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, config.bcryptRounds);
  }

  /**
   * Verify a password against a hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.compare(password, hash);
  }

  /**
   * Encrypt sensitive data (for future use)
   * TODO: Implement proper AES-GCM encryption when needed
   */
  static encrypt(text: string, key: string): string {
    // Simple base64 encoding for now - replace with proper encryption later
    const combined = key + ':' + text;
    return Buffer.from(combined).toString('base64');
  }

  /**
   * Decrypt sensitive data (for future use)
   * TODO: Implement proper AES-GCM decryption when needed
   */
  static decrypt(encryptedData: string, key: string): string {
    // Simple base64 decoding for now - replace with proper decryption later
    const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
    const parts = combined.split(':');
    if (parts.length < 2 || parts[0] !== key) {
      throw new Error('Invalid encrypted data or key');
    }
    return parts.slice(1).join(':');
  }

  /**
   * Generate a secure random token for password reset, etc.
   */
  static generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate a secure random UUID
   */
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  /**
   * Validate JWT secret strength
   */
  static validateJWTSecret(secret: string): boolean {
    return secret.length >= 32 && /^[a-zA-Z0-9+/=]+$/.test(secret);
  }

  /**
   * Sanitize sensitive data for logging
   */
  static sanitizeForLog(data: any): any {
    if (typeof data === 'string') {
      // Mask sensitive fields
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
      for (const field of sensitiveFields) {
        if (data.toLowerCase().includes(field.toLowerCase())) {
          return '[REDACTED]';
        }
      }
      return data;
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('password') || lowerKey.includes('token') || 
            lowerKey.includes('secret') || lowerKey.includes('key') || 
            lowerKey.includes('authorization')) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLog(value);
        }
      }
      return sanitized;
    }
    
    return data;
  }
}

// Export commonly used functions
export const generateJWTSecret = SecretManager.generateJWTSecret;
export const generateAPIKey = SecretManager.generateAPIKey;
export const hashPassword = SecretManager.hashPassword;
export const verifyPassword = SecretManager.verifyPassword;
export const generateToken = SecretManager.generateToken;
export const generateUUID = SecretManager.generateUUID;
export const sanitizeForLog = SecretManager.sanitizeForLog;
