/**
 * Focus Trap Utility for ChitJar Frontend
 *
 * This utility helps manage focus within modal dialogs to ensure
 * keyboard navigation is properly contained.
 */

/**
 * Create a focus trap for a modal dialog
 * @param {HTMLElement} modalElement - The modal element to trap focus within
 * @returns {Object} Object with activate and deactivate methods
 */
export function createFocusTrap(modalElement) {
  let previousActiveElement = null;
  let firstFocusableElement = null;
  let lastFocusableElement = null;

  /**
   * Get all focusable elements within the modal
   * @returns {NodeList} Focusable elements
   */
  function getFocusableElements() {
    return modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
  }

  /**
   * Handle tab key presses to trap focus
   * @param {KeyboardEvent} e - Keyboard event
   */
  function handleTabKey(e) {
    if (e.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;

    firstFocusableElement = focusableElements[0];
    lastFocusableElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstFocusableElement) {
      // Shift + Tab on first element focuses last element
      lastFocusableElement.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === lastFocusableElement) {
      // Tab on last element focuses first element
      firstFocusableElement.focus();
      e.preventDefault();
    }
  }

  /**
   * Activate the focus trap
   */
  function activate() {
    // Store the element that opened the modal
    previousActiveElement = document.activeElement;

    // Add keydown listener for tab trapping
    modalElement.addEventListener('keydown', handleTabKey);

    // Focus the first focusable element in the modal
    setTimeout(() => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }, 100);
  }

  /**
   * Deactivate the focus trap
   */
  function deactivate() {
    // Remove keydown listener
    modalElement.removeEventListener('keydown', handleTabKey);

    // Return focus to the element that opened the modal
    if (previousActiveElement) {
      previousActiveElement.focus();
    }
  }

  return {
    activate,
    deactivate,
  };
}
