/**
 * Monthly Entry Form Component for ChitJar Frontend
 *
 * This component allows users to add or edit monthly entries for a fund,
 * including dividend amount, prize money, and payment status.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR, parseINR } from '../lib/formatters.js';
import { validateMonthlyEntry } from '../lib/validators.js';
import { handleApiError } from '../lib/errorHandler.js';
import { 
  isPastMonth, 
  isZeroDividendMonth,
  formatPastEntryWarning,
  formatZeroDividendWarning
} from '../lib/edgeCaseHandler.js';
import { generateMonthlyEntryWarnings } from '../lib/warningValidator.js';

class MonthlyEntryForm {
  constructor() {
    this.fundId = null;
    this.entryId = null;
    this.isEditing = false;
    this.entry = {
      month_key: '',
      dividend_amount: '',
      is_paid: true,
      notes: '',
    };
    this.fund = null;
    this.isLoading = false;
    this.error = null;
    this.onSuccess = null;
    this.onCancel = null;
  }

  /**
   * Initialize the form for adding a new entry
   * @param {string} fundId - The ID of the fund to add entry for
   * @param {string} monthKey - The month key (YYYY-MM) for the entry
   * @param {Function} onSuccess - Callback function on successful submission
   * @param {Function} onCancel - Callback function on cancel
   */
  initNew(fundId, monthKey, onSuccess, onCancel) {
    this.fundId = fundId;
    this.entryId = null;
    this.isEditing = false;
    this.entry = {
      month_key: monthKey,
      dividend_amount: '',
      is_paid: true,
      notes: '',
    };
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;

    // Load fund details for validation
    this.loadFundDetails();
  }

  /**
   * Initialize the form for editing an existing entry
   * @param {string} entryId - The ID of the entry to edit
   * @param {Function} onSuccess - Callback function on successful submission
   * @param {Function} onCancel - Callback function on cancel
   */
  async initEdit(entryId, onSuccess, onCancel) {
    this.entryId = entryId;
    this.isEditing = true;
    this.onSuccess = onSuccess;
    this.onCancel = onCancel;

    // Load existing entry data
    await this.loadEntryData();
  }

  /**
   * Load fund details for validation
   */
  async loadFundDetails() {
    if (!this.fundId) return;

    try {
      const response = await apiClient.get(`/funds/${this.fundId}`);
      this.fund = response.data;
      this.render();
    } catch (error) {
      console.error('Failed to load fund details:', error);
      this.error = 'Failed to load fund details';
      this.render();
    }
  }

  /**
   * Load existing entry data for editing
   */
  async loadEntryData() {
    if (!this.entryId) return;

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      const response = await apiClient.get(`/entries/${this.entryId}`);
      this.entry = {
        ...response.data,
        dividend_amount: formatINR(response.data.dividend_amount),
      };
      this.fundId = response.data.fund_id;

      // Load fund details
      await this.loadFundDetails();
    } catch (error) {
      console.error('Failed to load entry data:', error);
      this.error = 'Failed to load entry data';
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Handle form submission
   * @param {Event} e - Form submit event
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Parse numeric values
    const dividendAmount = parseINR(this.entry.dividend_amount);

    // Prepare data for submission
    const submitData = {
      fund_id: this.fundId,
      month_key: this.entry.month_key,
      dividend_amount: dividendAmount,
      is_paid: this.entry.is_paid,
      notes: this.entry.notes,
    };

    // Validate data
    const validation = validateMonthlyEntry(submitData, this.fund);
    if (!validation.isValid) {
      // Convert field-specific errors to component's expected format
      this.errors = { ...validation.errors };
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;
    this.render();

    try {
      let response;
      if (this.isEditing) {
        // Update existing entry
        response = await apiClient.put(`/entries/${this.entryId}`, submitData);
      } else {
        // Create new entry
        response = await apiClient.post('/entries', submitData);
      }

      // Success callback
      if (this.onSuccess) {
        this.onSuccess(response.data);
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
      handleApiError(error, 'Saving entry');
      this.error = error.message || 'Failed to save entry';
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Handle form cancellation
   */
  handleCancel() {
    if (this.onCancel) {
      this.onCancel();
    }
  }

  /**
   * Handle input changes
   * @param {string} field - Field name
   * @param {any} value - New value
   */
  handleInputChange(field, value) {
    this.entry[field] = value;
    this.error = null; // Clear error when user makes changes
    
    // Clear specific field error
    if (this.errors && this.errors[field]) {
      delete this.errors[field];
    }
    
    this.render();
  }

  /**
   * Validate a single field
   * @param {string} fieldName - Name of the field to validate
   * @param {any} value - Value to validate
   */
  validateField(fieldName, value) {
    // Parse numeric values
    let parsedValue = value;
    if (fieldName === 'dividend_amount') {
      const numericValue = parseINR(value);
      if (!isNaN(numericValue)) {
        parsedValue = numericValue;
      }
    }

    const data = { ...this.entry, [fieldName]: parsedValue };
    const result = validateMonthlyEntry(data, this.fund);

    // Update the specific field error
    if (!this.errors) {
      this.errors = {};
    }
    
    if (result.errors[fieldName]) {
      this.errors[fieldName] = result.errors[fieldName];
    } else {
      delete this.errors[fieldName];
    }

    // Re-render to show validation errors
    this.render();
  }

  /**
   * Render the form
   */
  render() {
    const container = document.querySelector('.modal-content') || document.body;
    container.innerHTML = this.renderForm();

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Render the form HTML
   */
  renderForm() {
    if (this.isLoading && !this.isEditing) {
      return `
        <div class="monthly-entry-form">
          <div class="form-header">
            <h2>${this.isEditing ? 'Edit Monthly Entry' : 'Add Monthly Entry'}</h2>
          </div>
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading...</p>
          </div>
        </div>
      `;
    }

    // Check for edge cases
    const edgeCaseWarnings = [];
    if (isPastMonth(this.entry.month_key)) {
      edgeCaseWarnings.push(formatPastEntryWarning(this.entry.month_key));
    }
    if (isZeroDividendMonth(this.entry)) {
      edgeCaseWarnings.push(formatZeroDividendWarning());
    }
    
    // Generate validation warnings
    const validationWarnings = generateMonthlyEntryWarnings(this.entry, this.fund);
    const allWarnings = [...edgeCaseWarnings, ...validationWarnings];

    const monthLabel = this.entry.month_key
      ? new Date(this.entry.month_key + '-01').toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
        })
      : '';

    return `
      <div class="monthly-entry-form">
        <div class="form-header">
          <h2>${this.isEditing ? 'Edit Monthly Entry' : 'Add Monthly Entry'}</h2>
          <p>${monthLabel}</p>
        </div>
        
        ${this.error ? `
          <div class="error-message">
            <p>${this.error}</p>
          </div>
        ` : ''}
        
        ${allWarnings.length > 0 ? `
          <div class="warning-message">
            <ul>
              ${allWarnings.map(warning => `<li>${warning}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        
        <form id="monthly-entry-form">
          <input type="hidden" id="month-key" value="${this.entry.month_key}">
          
          <div class="form-group">
            <label for="dividend-amount">Dividend Amount (₹)</label>
            <input 
              type="text" 
              id="dividend-amount" 
              class="form-input ${this.errors && this.errors.dividend_amount ? 'form-input--error' : ''}"
              value="${this.entry.dividend_amount}"
              placeholder="0.00"
              inputmode="decimal"
            >
            ${this.errors && this.errors.dividend_amount ? `<div class="form-error">${this.errors.dividend_amount}</div>` : ''}
            <small class="form-text">Enter dividend received for this month</small>
          </div>
          
          <div class="form-group form-group--checkbox">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                id="is-paid"
                ${this.entry.is_paid ? 'checked' : ''}
              >
              <span class="checkbox-custom"></span>
              Mark as Paid
            </label>
            <small class="form-text">Check if the installment for this month has been paid</small>
          </div>
          
          <div class="form-group">
            <label for="notes">Notes</label>
            <textarea 
              id="notes" 
              class="form-input ${this.errors && this.errors.notes ? 'form-input--error' : ''}"
              rows="3"
              placeholder="Add any additional notes..."
            >${this.entry.notes}</textarea>
            ${this.errors && this.errors.notes ? `<div class="form-error">${this.errors.notes}</div>` : ''}
          </div>
          
          <div class="form-actions">
            <button 
              type="button" 
              class="btn btn--secondary"
              id="cancel-btn"
              ${this.isLoading ? 'disabled' : ''}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn btn--primary"
              ${this.isLoading ? 'disabled' : ''}
            >
              ${this.isLoading ? 'Saving...' : this.isEditing ? 'Update Entry' : 'Add Entry'}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Add event listeners to form elements
   */
  addEventListeners() {
    const form = document.getElementById('monthly-entry-form');
    if (form) {
      form.addEventListener('submit', e => this.handleSubmit(e));
    }

    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }

    const dividendInput = document.getElementById('dividend-amount');
    if (dividendInput) {
      dividendInput.addEventListener('input', e => {
        this.handleInputChange('dividend_amount', e.target.value);
      });
      dividendInput.addEventListener('blur', e => {
        this.validateField('dividend_amount', e.target.value);
      });
    }

    const paidCheckbox = document.getElementById('is-paid');
    if (paidCheckbox) {
      paidCheckbox.addEventListener('change', e => {
        this.handleInputChange('is_paid', e.target.checked);
      });
    }

    const notesTextarea = document.getElementById('notes');
    if (notesTextarea) {
      notesTextarea.addEventListener('input', e => {
        this.handleInputChange('notes', e.target.value);
      });
      notesTextarea.addEventListener('blur', e => {
        this.validateField('notes', e.target.value);
      });
    }
  }
}

// Export singleton instance
export const monthlyEntryForm = new MonthlyEntryForm();
