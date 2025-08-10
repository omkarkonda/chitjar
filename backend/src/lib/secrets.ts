import crypto from 'crypto';
import { config } from './config';

/**
 * Secret management utilities for handling sensitive configuration
 */
export class SecretManager {
  private static algorithm = 'aes-256-gcm';
  private static keyLength = 32;
  private static ivLength = 16;
  private static saltLength = 64;
  private static tagLength = 16;

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
   */
  static encrypt(text: string, key: string): string {
    const salt = crypto.randomBytes(this.saltLength);
    const iv = crypto.randomBytes(this.ivLength);
    
    // Derive key from password and salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, this.keyLength, 'sha256');
    
    // Create cipher
    const cipher = crypto.createCipherGCM(this.algorithm, derivedKey);
    cipher.setAAD(Buffer.from('chitjar', 'utf8'));
    
    // Encrypt
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const tag = cipher.getAuthTag();
    
    // Combine all parts
    return salt.toString('hex') + ':' + iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data (for future use)
   */
  static decrypt(encryptedData: string, key: string): string {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [saltHex, ivHex, tagHex, encrypted] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    // Derive key from password and salt
    const derivedKey = crypto.pbkdf2Sync(key, salt, 100000, this.keyLength, 'sha256');
    
    // Create decipher
    const decipher = crypto.createDecipherGCM(this.algorithm, derivedKey);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from('chitjar', 'utf8'));
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
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
