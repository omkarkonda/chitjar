/**
 * Frontend Logging Utilities for ChitJar
 * 
 * This module provides structured logging with different levels and monitoring hooks
 * for unexpected conditions while ensuring no PII is logged.
 */

/**
 * Log levels
 */
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

/**
 * Current log level
 */
const currentLogLevel = LOG_LEVELS.INFO;

/**
 * Log an info message
 * @param {string} message - The message to log
 * @param {Object} meta - Additional metadata (no PII)
 */
export function logInfo(message, meta = {}) {
  if (currentLogLevel < LOG_LEVELS.INFO) return;
  
  const logEntry = {
    level: 'info',
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeMetadata(meta)
  };
  
  console.log('[INFO]', JSON.stringify(logEntry));
}

/**
 * Log a warning message
 * @param {string} message - The message to log
 * @param {Object} meta - Additional metadata (no PII)
 */
export function logWarn(message, meta = {}) {
  if (currentLogLevel < LOG_LEVELS.WARN) return;
  
  const logEntry = {
    level: 'warn',
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeMetadata(meta)
  };
  
  console.warn('[WARN]', JSON.stringify(logEntry));
}

/**
 * Log an error message
 * @param {string} message - The message to log
 * @param {Error} error - The error object
 * @param {Object} meta - Additional metadata (no PII)
 */
export function logError(message, error = null, meta = {}) {
  if (currentLogLevel < LOG_LEVELS.ERROR) return;
  
  const logEntry = {
    level: 'error',
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeMetadata(meta),
    error: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined
  };
  
  console.error('[ERROR]', JSON.stringify(logEntry));
}

/**
 * Log a debug message
 * @param {string} message - The message to log
 * @param {Object} meta - Additional metadata (no PII)
 */
export function logDebug(message, meta = {}) {
  if (currentLogLevel < LOG_LEVELS.DEBUG) return;
  
  const logEntry = {
    level: 'debug',
    message,
    timestamp: new Date().toISOString(),
    ...sanitizeMetadata(meta)
  };
  
  console.debug('[DEBUG]', JSON.stringify(logEntry));
}

/**
 * Sanitize metadata to remove PII
 * @param {Object} meta - Metadata to sanitize
 * @returns {Object} Sanitized metadata
 */
function sanitizeMetadata(meta) {
  if (!meta || typeof meta !== 'object') return {};
  
  // Create a copy to avoid modifying the original
  const sanitized = {};
  
  // Fields that should never be logged (PII)
  const piiFields = [
    'password',
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
      sanitized[key] = sanitizeMetadata(value);
      continue;
    }
    
    // For arrays, sanitize each element if it's an object
    if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'object' && item !== null ? sanitizeMetadata(item) : item
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
 * @param {*} id - The ID to mask
 * @returns {string|*} Masked ID or original value if not an ID
 */
function maskId(id) {
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
 * @param {string} str - String to hash
 * @returns {string} Hashed string
 */
function hashString(str) {
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
 * @param {string} condition - Description of the unexpected condition
 * @param {Object} context - Context information (no PII)
 */
export function monitorUnexpectedCondition(condition, context = {}) {
  logWarn(`Unexpected condition detected: ${condition}`, {
    ...context,
    timestamp: new Date().toISOString(),
    userAgent: navigator ? navigator.userAgent : undefined
  });
}

/**
 * Monitor API endpoint usage
 * @param {string} endpoint - The API endpoint
 * @param {string} method - HTTP method
 * @param {number} statusCode - HTTP status code
 * @param {number} duration - Request duration in ms
 */
export function monitorApiUsage(endpoint, method, statusCode, duration) {
  logInfo('API endpoint accessed', {
    endpoint,
    method,
    statusCode,
    duration
  });
}

/**
 * Monitor authentication events
 * @param {string} event - Authentication event type
 */
export function monitorAuthEvent(event) {
  logInfo(`Authentication event: ${event}`);
}

/**
 * Send logs to backend for centralized monitoring
 * @param {Object} logData - Log data to send
 */
export async function sendLogToBackend(logData) {
  try {
    // In a real implementation, you would send logs to a backend endpoint
    // For now, we'll just log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[REMOTE LOG]', JSON.stringify(logData));
    }
  } catch (error) {
    // Don't let logging errors break the application
    console.error('Failed to send log to backend:', error);
  }
}