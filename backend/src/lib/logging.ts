/**
 * Logging Utilities for ChitJar Backend
 * 
 * This module provides structured logging with different levels and monitoring hooks
 * for unexpected conditions while ensuring no PII is logged.
 */

import winston from 'winston';
import { config, isDevelopment, isProduction } from './config';

// Create a logger instance
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'chitjar-api' },
  transports: [
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({ 
      filename: config.logFile,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// If we're not in production, also log to the console
if (!isProduction()) {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Log an info message
 * @param message - The message to log
 * @param meta - Additional metadata (no PII)
 */
export function logInfo(message: string, meta?: Record<string, any>): void {
  logger.info(message, sanitizeMetadata(meta));
}

/**
 * Log a warning message
 * @param message - The message to log
 * @param meta - Additional metadata (no PII)
 */
export function logWarn(message: string, meta?: Record<string, any>): void {
  logger.warn(message, sanitizeMetadata(meta));
}

/**
 * Log an error message
 * @param message - The message to log
 * @param error - The error object
 * @param meta - Additional metadata (no PII)
 */
export function logError(message: string, error?: Error, meta?: Record<string, any>): void {
  const logMeta = {
    ...sanitizeMetadata(meta),
    error: error ? {
      name: error.name,
      message: error.message,
      // Only include stack trace in development
      ...(isDevelopment() && { stack: error.stack })
    } : undefined
  };
  
  logger.error(message, logMeta);
}

/**
 * Log a debug message
 * @param message - The message to log
 * @param meta - Additional metadata (no PII)
 */
export function logDebug(message: string, meta?: Record<string, any>): void {
  logger.debug(message, sanitizeMetadata(meta));
}

/**
 * Sanitize metadata to remove PII
 * @param meta - Metadata to sanitize
 * @returns Sanitized metadata
 */
function sanitizeMetadata(meta?: Record<string, any>): Record<string, any> | undefined {
  if (!meta) return undefined;
  
  // Create a copy to avoid modifying the original
  const sanitized: Record<string, any> = {};
  
  // Fields that should never be logged (PII)
  const piiFields = [
    'password',
    'password_hash',
    'email',
    'name',
    'phone',
    'address',
    'ssn',
    'credit_card',
    'token',
    'refresh_token',
    'authorization',
    'cookie',
    'auth'
  ];
  
  // Fields that should be masked if present
  const maskFields = [
    'id',
    'user_id',
    'fund_id',
    'entry_id',
    'bid_id'
  ];
  
  for (const [key, value] of Object.entries(meta)) {
    // Skip PII fields entirely
    if (piiFields.some(field => key.toLowerCase().includes(field))) {
      continue;
    }
    
    // Mask ID fields
    if (maskFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = maskId(value);
      continue;
    }
    
    // For objects, recursively sanitize
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, any>);
      continue;
    }
    
    // For arrays, sanitize each element if it's an object
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null ? sanitizeMetadata(item as Record<string, any>) : item
      );
      continue;
    }
    
    // Otherwise, keep the value
    sanitized[key] = value;
  }
  
  return sanitized;
}

/**
 * Mask ID values to preserve uniqueness without revealing actual IDs
 * @param id - The ID to mask
 * @returns Masked ID or original value if not an ID
 */
function maskId(id: any): string | any {
  if (typeof id !== 'string' && typeof id !== 'number') {
    return id;
  }
  
  const idStr = String(id);
  
  // If it looks like a UUID, mask it
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idStr)) {
    return `uuid-${hashString(idStr).substring(0, 8)}`;
  }
  
  // If it looks like a numeric ID, mask it
  if (/^\d+$/.test(idStr)) {
    return `id-${hashString(idStr).substring(0, 8)}`;
  }
  
  // Otherwise, return as is
  return id;
}

/**
 * Simple hash function for masking (not cryptographically secure)
 * @param str - String to hash
 * @returns Hashed string
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Monitor unexpected conditions
 * @param condition - Description of the unexpected condition
 * @param context - Context information (no PII)
 */
export function monitorUnexpectedCondition(condition: string, context?: Record<string, any>): void {
  logWarn(`Unexpected condition detected: ${condition}`, {
    ...context,
    timestamp: new Date().toISOString(),
    userAgent: typeof process !== 'undefined' ? process.env['USER_AGENT'] : undefined
  });
}

/**
 * Monitor API endpoint usage
 * @param endpoint - The API endpoint
 * @param method - HTTP method
 * @param statusCode - HTTP status code
 * @param duration - Request duration in ms
 * @param userId - User ID (masked)
 */
export function monitorApiUsage(
  endpoint: string, 
  method: string, 
  statusCode: number, 
  duration: number,
  userId?: string
): void {
  logInfo('API endpoint accessed', {
    endpoint,
    method,
    statusCode,
    duration,
    userId: userId ? maskId(userId) : undefined
  });
}

/**
 * Monitor database query performance
 * @param query - Query description
 * @param duration - Query duration in ms
 * @param rowCount - Number of rows returned
 */
export function monitorDbQuery(query: string, duration: number, rowCount?: number): void {
  // Log slow queries (> 100ms)
  if (duration > 100) {
    logWarn('Slow database query detected', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''), // Truncate long queries
      duration,
      rowCount
    });
  }
  
  // Always log metrics for monitoring
  logDebug('Database query executed', {
    query: query.substring(0, 50) + (query.length > 50 ? '...' : ''), // Truncate long queries
    duration,
    rowCount
  });
}

/**
 * Monitor authentication events
 * @param event - Authentication event type
 * @param userId - User ID (masked)
 * @param ip - IP address (masked for privacy)
 */
export function monitorAuthEvent(event: string, userId?: string, ip?: string): void {
  logInfo(`Authentication event: ${event}`, {
    userId: userId ? maskId(userId) : undefined,
    // Mask IP address for privacy (only log first two octets)
    ip: ip ? maskIpAddress(ip) : undefined
  });
}

/**
 * Mask IP address for privacy
 * @param ip - IP address to mask
 * @returns Masked IP address
 */
function maskIpAddress(ip: string): string {
  if (ip.includes('.')) {
    // IPv4 - mask last octet
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
    }
  } else if (ip.includes(':')) {
    // IPv6 - mask last part
    const parts = ip.split(':');
    if (parts.length > 2) {
      return `${parts.slice(0, -1).join(':')}:xxxx`;
    }
  }
  return 'xxx.xxx.xxx.xxx';
}

// Export logger for direct use if needed
export { logger };