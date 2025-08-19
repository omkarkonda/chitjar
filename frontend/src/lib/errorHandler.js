/**
 * Centralized Error Handler for ChitJar Frontend
 *
 * This module provides a centralized error handling system that automatically
 * displays appropriate toast notifications for API failures and other errors.
 */

import { toast } from './toast.js';
import { logError, monitorUnexpectedCondition } from './logging.js';

/**
 * Handle API errors and display appropriate toast notifications
 * @param {Error} error - The error object
 * @param {string} operation - Description of the operation that failed
 * @param {Object} options - Additional options for error handling
 * @param {boolean} options.silent - If true, don't show toast notifications
 * @param {string} options.fallbackMessage - Custom fallback message
 * @returns {string} The error message that was displayed
 */
export function handleApiError(error, operation = 'Operation', options = {}) {
  // Default options
  const { silent = false, fallbackMessage = null } = options;
  
  // Log the error
  logError(`${operation} failed`, error);
  
  // Extract error message
  let message = error.message || 'An unknown error occurred';
  
  // Handle different types of errors
  if (error.name === 'TypeError' && message.includes('fetch')) {
    message = 'Network error. Please check your connection and try again.';
  } else if (message.includes('HTTP 401')) {
    // Don't show toast for 401 errors as they're handled by apiClient
    return message;
  } else if (message.includes('HTTP 403')) {
    message = 'Access denied. You do not have permission to perform this action.';
  } else if (message.includes('HTTP 404')) {
    message = 'Resource not found.';
  } else if (message.includes('HTTP 5')) {
    message = 'Server error. Please try again later.';
  }
  
  // Use fallback message if provided and we have a generic error
  if (fallbackMessage && (message.includes('unknown') || message.includes('HTTP'))) {
    message = fallbackMessage;
  }
  
  // Show toast notification if not silent
  if (!silent) {
    toast.error(`${operation} failed: ${message}`);
  }
  
  return message;
}

/**
 * Handle form validation errors
 * @param {Object} errors - Validation errors object
 * @param {string} formName - Name of the form
 */
export function handleValidationErrors(errors, formName = 'Form') {
  if (!errors || typeof errors !== 'object') return;
  
  // Get the first error message
  const firstError = Object.values(errors)[0];
  if (firstError) {
    toast.error(`${formName} validation error: ${firstError}`);
  }
}

/**
 * Global error handler for uncaught errors
 * @param {ErrorEvent} event - The error event
 */
export function handleGlobalError(event) {
  // Don't show toast for script loading errors
  if (event.message && event.message.includes('Script error')) {
    return;
  }
  
  // Log the error
  logError('Global error occurred', event.error || event, {
    url: window.location.href,
    userAgent: navigator ? navigator.userAgent : undefined
  });
  
  // Monitor unexpected conditions
  monitorUnexpectedCondition('Global error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
  
  // Show a generic error message for uncaught errors
  toast.error('An unexpected error occurred. Please try again.');
}

/**
 * Initialize global error handlers
 */
export function initGlobalErrorHandlers() {
  // Handle uncaught JavaScript errors
  window.addEventListener('error', handleGlobalError);
  
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Prevent the default browser behavior
    event.preventDefault();
    
    // Handle the error
    if (event.reason instanceof Error) {
      handleApiError(event.reason, 'Operation');
    } else {
      toast.error('An unexpected error occurred. Please try again.');
    }
  });
}