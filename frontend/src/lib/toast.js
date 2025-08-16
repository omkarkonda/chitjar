/**
 * Toast Notification System for ChitJar Frontend
 *
 * This module provides a simple toast notification system for displaying
 * success, error, warning, and info messages to the user.
 */

// Toast container element
let toastContainer = null;

// Initialize toast system
function initToastSystem() {
  if (toastContainer) return;

  // Create toast container
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);

  // Add styles for toast container
  const style = document.createElement('style');
  style.textContent = `
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    
    .toast {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      font-size: 14px;
      font-weight: 500;
      min-width: 280px;
      max-width: 400px;
      animation: toastSlideIn 0.3s ease-out forwards;
      pointer-events: auto;
    }
    
    .toast.toast--success {
      background-color: #10b981;
      color: white;
    }
    
    .toast.toast--error {
      background-color: #ef4444;
      color: white;
    }
    
    .toast.toast--warning {
      background-color: #f59e0b;
      color: white;
    }
    
    .toast.toast--info {
      background-color: #3b82f6;
      color: white;
    }
    
    .toast__icon {
      margin-right: 12px;
      font-size: 18px;
    }
    
    .toast__message {
      flex: 1;
      word-break: break-word;
    }
    
    .toast__close {
      background: none;
      border: none;
      color: white;
      opacity: 0.8;
      cursor: pointer;
      padding: 4px;
      margin-left: 12px;
      font-size: 16px;
      line-height: 1;
    }
    
    .toast__close:hover {
      opacity: 1;
    }
    
    .toast--hide {
      animation: toastSlideOut 0.3s ease-out forwards;
    }
    
    @keyframes toastSlideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes toastSlideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(100%);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
}

// Create a toast notification
function createToast(message, type = 'info', duration = 5000) {
  // Initialize if not already done
  initToastSystem();

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;

  // Add icon based on type
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${message}</span>
    <button class="toast__close" aria-label="Close notification">×</button>
  `;

  // Add close button functionality
  const closeButton = toast.querySelector('.toast__close');
  closeButton.addEventListener('click', () => {
    toast.classList.add('toast--hide');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  });

  // Add to container
  toastContainer.appendChild(toast);

  // Auto remove after duration
  if (duration > 0) {
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.add('toast--hide');
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, 300);
      }
    }, duration);
  }

  return toast;
}

// Export toast functions
export const toast = {
  success: (message, duration) => createToast(message, 'success', duration),
  error: (message, duration) => createToast(message, 'error', duration),
  warning: (message, duration) => createToast(message, 'warning', duration),
  info: (message, duration) => createToast(message, 'info', duration),
};
