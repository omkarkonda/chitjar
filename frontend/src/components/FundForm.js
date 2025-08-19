/**
 * Fund Form Component for ChitJar Frontend
 *
 * This component handles fund creation and editing with validation,
 * helper tooltips, and success/error toasts.
 */

import { apiClient } from '../lib/apiClient.js';
import { validateFundCreation, validateFundUpdate } from '../lib/validators.js';
import { formatINR, parseINR } from '../lib/formatters.js';
import { toast } from '../lib/toast.js';

class FundForm {
  constructor() {
    this.fundId = null;
    this.isEditing = false;
    this.fundData = {
      name: '',
      chit_value: '',
      installment_amount: '',
      total_months: '',
      start_month: '',
      end_month: '',
      notes: '',
    };
    this.errors = {};
    this.isSubmitting = false;
  }

  /**
   * Initialize the form for creating a new fund
   */
  initCreate() {
    this.fundId = null;
    this.isEditing = false;
    this.fundData = {
      name: '',
      chit_value: '',
      installment_amount: '',
      total_months: '',
      start_month: '',
      end_month: '',
      notes: '',
    };
    this.errors = {};
    this.isSubmitting = false;
    this.render();
  }

  /**
   * Initialize the form for editing an existing fund
   */
  async initEdit(fundId) {
    this.fundId = fundId;
    this.isEditing = true;
    this.errors = {};
    this.isSubmitting = false;

    try {
      // Fetch fund data
      const response = await apiClient.get(`/funds/${fundId}`);
      const fund = response.data;

      // Populate form data
      this.fundData = {
        name: fund.name || '',
        chit_value: fund.chit_value ? fund.chit_value.toString() : '',
        installment_amount: fund.installment_amount
          ? fund.installment_amount.toString()
          : '',
        total_months: fund.total_months ? fund.total_months.toString() : '',
        start_month: fund.start_month || '',
        end_month: fund.end_month || '',
        notes: fund.notes || '',
      };

      this.render();
    } catch (error) {
      // console.error('Error loading fund data:', error);
      toast.error('Failed to load fund data. Please try again.');
    }
  }

  /**
   * Render the fund form
   */
  render() {
    const container = document.querySelector('.add');
    if (!container) return;

    container.innerHTML = this.renderForm();
    this.attachEventListeners();
  }

  /**
   * Render the fund form HTML
   */
  renderForm() {
    return `
      <div class="fund-form-container">
        <div class="fund-form__header">
          <h2>${this.isEditing ? 'Edit Fund' : 'Add New Fund'}</h2>
          <p class="fund-form__subtitle">
            ${this.isEditing ? 'Update your fund details' : 'Create a new chit fund to track'}
          </p>
        </div>
        
        <form class="fund-form" id="fundForm">
          <div class="form-group">
            <label for="fundName" class="form-label">
              Fund Name
              <span class="form-label__tooltip" data-tooltip="Enter a descriptive name for your chit fund">
                ⓘ
              </span>
            </label>
            <input 
              type="text" 
              id="fundName" 
              name="name" 
              class="form-input ${this.errors.name ? 'form-input--error' : ''}"
              value="${this.fundData.name}"
              placeholder="e.g., Monthly Chit Fund 2024"
              maxlength="255"
            >
            ${this.errors.name ? `<div class="form-error">${this.errors.name}</div>` : ''}
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="chitValue" class="form-label">
                Chit Value (₹)
                <span class="form-label__tooltip" data-tooltip="Total value of the chit fund">
                  ⓘ
                </span>
              </label>
              <input 
                type="text" 
                id="chitValue" 
                name="chit_value" 
                class="form-input ${this.errors.chit_value ? 'form-input--error' : ''}"
                value="${this.fundData.chit_value}"
                placeholder="e.g., 1,00,000"
              >
              ${this.errors.chit_value ? `<div class="form-error">${this.errors.chit_value}</div>` : ''}
            </div>
            
            <div class="form-group">
              <label for="installmentAmount" class="form-label">
                Installment Amount (₹)
                <span class="form-label__tooltip" data-tooltip="Monthly payment amount for each member">
                  ⓘ
                </span>
              </label>
              <input 
                type="text" 
                id="installmentAmount" 
                name="installment_amount" 
                class="form-input ${this.errors.installment_amount ? 'form-input--error' : ''}"
                value="${this.fundData.installment_amount}"
                placeholder="e.g., 10,000"
              >
              ${this.errors.installment_amount ? `<div class="form-error">${this.errors.installment_amount}</div>` : ''}
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label for="totalMonths" class="form-label">
                Total Months
                <span class="form-label__tooltip" data-tooltip="Duration of the chit fund in months">
                  ⓘ
                </span>
              </label>
              <input 
                type="number" 
                id="totalMonths" 
                name="total_months" 
                class="form-input ${this.errors.total_months ? 'form-input--error' : ''}"
                value="${this.fundData.total_months}"
                placeholder="e.g., 12"
                min="1"
                max="120"
              >
              ${this.errors.total_months ? `<div class="form-error">${this.errors.total_months}</div>` : ''}
            </div>
            
            <div class="form-group">
              <label for="startMonth" class="form-label">
                Start Month
                <span class="form-label__tooltip" data-tooltip="Start date of the chit fund (YYYY-MM)">
                  ⓘ
                </span>
              </label>
              <input 
                type="month" 
                id="startMonth" 
                name="start_month" 
                class="form-input ${this.errors.start_month ? 'form-input--error' : ''}"
                value="${this.fundData.start_month}"
              >
              ${this.errors.start_month ? `<div class="form-error">${this.errors.start_month}</div>` : ''}
            </div>
            
            <div class="form-group">
              <label for="endMonth" class="form-label">
                End Month
                <span class="form-label__tooltip" data-tooltip="End date of the chit fund (YYYY-MM)">
                  ⓘ
                </span>
              </label>
              <input 
                type="month" 
                id="endMonth" 
                name="end_month" 
                class="form-input ${this.errors.end_month ? 'form-input--error' : ''}"
                value="${this.fundData.end_month}"
              >
              ${this.errors.end_month ? `<div class="form-error">${this.errors.end_month}</div>` : ''}
            </div>
          </div>
          
          <div class="form-group">
            <label for="fundNotes" class="form-label">
              Notes
              <span class="form-label__tooltip" data-tooltip="Additional information about this fund (optional)">
                ⓘ
              </span>
            </label>
            <textarea 
              id="fundNotes" 
              name="notes" 
              class="form-textarea ${this.errors.notes ? 'form-input--error' : ''}"
              placeholder="Any additional notes about this fund..."
              maxlength="1000"
              rows="3"
            >${this.fundData.notes}</textarea>
            ${this.errors.notes ? `<div class="form-error">${this.errors.notes}</div>` : ''}
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn--secondary" id="cancelFund">
              Cancel
            </button>
            <button type="submit" class="btn btn--primary" id="submitFund" ${this.isSubmitting ? 'disabled' : ''}>
              ${this.isSubmitting ? 'Saving...' : this.isEditing ? 'Update Fund' : 'Create Fund'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Attach event listeners to form elements
   */
  attachEventListeners() {
    const form = document.getElementById('fundForm');
    if (!form) return;

    // Form submission
    form.addEventListener('submit', e => {
      e.preventDefault();
      this.handleSubmit();
    });

    // Cancel button
    const cancelButton = document.getElementById('cancelFund');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        // Navigate back to funds list
        window.dispatchEvent(
          new CustomEvent('routeChange', { detail: { route: 'funds' } })
        );
      });
    }

    // Real-time validation
    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input.name, input.value);
      });

      // Format monetary inputs on blur
      if (
        input.type === 'text' &&
        (input.name === 'chit_value' || input.name === 'installment_amount')
      ) {
        input.addEventListener('blur', () => {
          if (input.value) {
            // Format the value as INR
            const numericValue = parseINR(input.value);
            if (!isNaN(numericValue) && numericValue > 0) {
              input.value = formatINR(numericValue);
            }
          }
        });

        input.addEventListener('focus', () => {
          // Remove formatting when focusing
          if (input.value) {
            const numericValue = parseINR(input.value);
            if (!isNaN(numericValue)) {
              input.value = numericValue.toString();
            }
          }
        });
      }
    });

    // Tooltip functionality
    const tooltips = document.querySelectorAll('.form-label__tooltip');
    tooltips.forEach(tooltip => {
      tooltip.addEventListener('mouseenter', e => {
        const tooltipText = e.target.getAttribute('data-tooltip');
        this.showTooltip(e.target, tooltipText);
      });

      tooltip.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });
    });
  }

  /**
   * Validate a single field
   */
  validateField(fieldName, value) {
    // For monetary fields, parse the value
    let parsedValue = value;
    if (fieldName === 'chit_value' || fieldName === 'installment_amount') {
      const numericValue = parseINR(value);
      if (!isNaN(numericValue)) {
        parsedValue = numericValue.toString();
      }
    }

    const data = { ...this.fundData, [fieldName]: parsedValue };
    const validator = this.isEditing
      ? validateFundUpdate
      : validateFundCreation;
    const result = validator(data);

    // Since our validator doesn't have hasError method, we need to check errors manually
    // For single field validation, we need to run validation on the entire object
    // and then check if there are errors for this specific field
    const fieldErrors = result.errors.filter(error => 
      error.includes(fieldName.replace(/_/g, ' ')) || 
      (fieldName === 'chit_value' && error.includes('Chit value')) ||
      (fieldName === 'installment_amount' && error.includes('Installment amount')) ||
      (fieldName === 'total_months' && error.includes('Total months')) ||
      (fieldName === 'start_month' && error.includes('Start month')) ||
      (fieldName === 'end_month' && error.includes('End month')) ||
      (fieldName === 'notes' && error.includes('Notes'))
    );

    if (fieldErrors.length > 0) {
      this.errors[fieldName] = fieldErrors[0];
    } else {
      delete this.errors[fieldName];
    }

    // Re-render to show validation errors
    this.render();
  }

  /**
   * Validate the entire form
   */
  validateForm() {
    // Parse monetary values before validation
    const data = { ...this.fundData };
    if (data.chit_value) {
      data.chit_value = parseINR(data.chit_value);
    }
    if (data.installment_amount) {
      data.installment_amount = parseINR(data.installment_amount);
    }

    const validator = this.isEditing
      ? validateFundUpdate
      : validateFundCreation;
    const result = validator(data);

    // Convert errors array to object format expected by the form
    this.errors = {};
    if (result.errors && result.errors.length > 0) {
      // We'll just show the first error for each field type
      result.errors.forEach(error => {
        if (error.includes('Fund name')) {
          this.errors.name = error;
        } else if (error.includes('Chit value')) {
          this.errors.chit_value = error;
        } else if (error.includes('Installment amount')) {
          this.errors.installment_amount = error;
        } else if (error.includes('Total months')) {
          this.errors.total_months = error;
        } else if (error.includes('Start month')) {
          this.errors.start_month = error;
        } else if (error.includes('End month')) {
          this.errors.end_month = error;
        } else if (error.includes('Notes')) {
          this.errors.notes = error;
        } else {
          // Generic error
          this.errors.form = error;
        }
      });
    }
    
    return result.isValid;
  }

  /**
   * Handle form submission
   */
  async handleSubmit() {
    // Validate form
    if (!this.validateForm()) {
      this.render();
      return;
    }

    // Prevent multiple submissions
    if (this.isSubmitting) return;

    this.isSubmitting = true;
    this.render();

    try {
      // Prepare data for submission
      const submitData = {
        name: this.fundData.name,
        chit_value: parseINR(this.fundData.chit_value),
        installment_amount: parseINR(this.fundData.installment_amount),
        total_months: parseInt(this.fundData.total_months),
        start_month: this.fundData.start_month,
        end_month: this.fundData.end_month,
        notes: this.fundData.notes || undefined,
      };

      if (this.isEditing) {
        // Update existing fund
        await apiClient.put(`/funds/${this.fundId}`, submitData);
        toast.success('Fund updated successfully!');
      } else {
        // Create new fund
        await apiClient.post('/funds', submitData);
        toast.success('Fund created successfully!');
      }

      // Navigate back to funds list
      window.dispatchEvent(
        new CustomEvent('routeChange', { detail: { route: 'funds' } })
      );
    } catch (error) {
      // console.error('Fund form submission error:', error);
      this.isSubmitting = false;

      // Handle specific error cases
      if (error.message && error.message.includes('Invalid access token')) {
        toast.error('Your session has expired. Please log in again.');
        apiClient.clearToken();
        window.dispatchEvent(new CustomEvent('logout'));
      } else {
        toast.error(error.message || 'Failed to save fund. Please try again.');
        this.render();
      }
    }
  }

  /**
   * Show tooltip
   */
  showTooltip(element, text) {
    // Remove any existing tooltips
    this.hideTooltip();

    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'form-tooltip';
    tooltip.textContent = text;

    // Position tooltip near the element
    const rect = element.getBoundingClientRect();
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${rect.bottom + 5}px`;
    tooltip.style.left = `${rect.left}px`;
    tooltip.style.zIndex = '1000';

    document.body.appendChild(tooltip);
    this.currentTooltip = tooltip;
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.currentTooltip) {
      if (this.currentTooltip.parentNode) {
        this.currentTooltip.parentNode.removeChild(this.currentTooltip);
      }
      this.currentTooltip = null;
    }
  }
}

// Export singleton instance
export const fundForm = new FundForm();
