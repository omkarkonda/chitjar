/**
 * Monthly Entry Form Component for ChitJar Frontend
 *
 * This component allows users to add or edit monthly entries for a fund,
 * including dividend amount, prize money, and payment status.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR, parseINR } from '../lib/formatters.js';
import { validateMonthlyEntry } from '../lib/validators.js';

class MonthlyEntryForm {
  constructor() {
    this.fundId = null;
    this.entryId = null;
    this.isEditing = false;
    this.entry = {
      month_key: '',
      dividend_amount: '',
      prize_money: '',
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
      prize_money: '',
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
        prize_money: formatINR(response.data.prize_money),
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
    const prizeMoney = parseINR(this.entry.prize_money);

    // Prepare data for submission
    const submitData = {
      fund_id: this.fundId,
      month_key: this.entry.month_key,
      dividend_amount: dividendAmount,
      prize_money: prizeMoney,
      is_paid: this.entry.is_paid,
      notes: this.entry.notes,
    };

    // Validate data
    const validation = validateMonthlyEntry(submitData, this.fund);
    if (!validation.isValid) {
      this.error = validation.errors.join(', ');
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
        
        ${
          this.error
            ? `
          <div class="error-message">
            <p>${this.error}</p>
          </div>
        `
            : ''
        }
        
        <form id="monthly-entry-form">
          <input type="hidden" id="month-key" value="${this.entry.month_key}">
          
          <div class="form-group">
            <label for="dividend-amount">Dividend Amount (₹)</label>
            <input 
              type="text" 
              id="dividend-amount" 
              value="${this.entry.dividend_amount}"
              placeholder="0.00"
              inputmode="decimal"
            >
            <small class="form-text">Enter dividend received for this month</small>
          </div>
          
          <div class="form-group">
            <label for="prize-money">Prize Money (₹)</label>
            <input 
              type="text" 
              id="prize-money" 
              value="${this.entry.prize_money}"
              placeholder="0.00"
              inputmode="decimal"
            >
            <small class="form-text">Enter prize money received for this month</small>
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
              rows="3"
              placeholder="Add any additional notes..."
            >${this.entry.notes}</textarea>
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
    }

    const prizeInput = document.getElementById('prize-money');
    if (prizeInput) {
      prizeInput.addEventListener('input', e => {
        this.handleInputChange('prize_money', e.target.value);
      });
    }

    const paidCheckbox = document.getElementById('is-paid');
    if (paidCheckbox) {
      paidCheckbox.addEventListener('change', e => {
        this.handleInputChange('is_paid', e.target.checked);
      });
    }

    const notesInput = document.getElementById('notes');
    if (notesInput) {
      notesInput.addEventListener('input', e => {
        this.handleInputChange('notes', e.target.value);
      });
    }
  }
}

// Export singleton instance
export const monthlyEntryForm = new MonthlyEntryForm();
