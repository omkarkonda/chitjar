/**
 * CSV Import Dialog Component for ChitJar Frontend
 *
 * This component provides a modal dialog for importing CSV files with preview and error handling.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';

class CSVImportDialog {
  constructor() {
    this.file = null;
    this.previewData = null;
    this.errors = [];
    this.isLoading = false;
    this.canImport = false;
  }

  /**
   * Show the CSV import dialog
   */
  show() {
    this.file = null;
    this.previewData = null;
    this.errors = [];
    this.canImport = false;

    this.render();
    this.setupEventListeners();

    // Show modal
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide the CSV import dialog
   */
  hide() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  }

  /**
   * Handle file selection
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.file = file;
      this.previewData = null;
      this.errors = [];
      this.canImport = false;

      // Update UI to show file name and enable import button
      this.render();
    }
  }

  /**
   * Import the selected CSV file
   */
  async importFile() {
    if (!this.file) return;

    this.isLoading = true;
    this.render();

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('csvFile', this.file);

      // Send file to backend for parsing and validation
      const response = await apiClient.request('/bids/import/csv', {
        method: 'POST',
        body: formData,
      });

      // Update state with preview data and errors
      this.previewData = response.data.preview || [];
      this.errors = response.data.errors || [];
      this.canImport = response.data.canImport || false;

      // Show success message if no errors
      if (this.canImport) {
        // Dispatch event to notify that import is ready
        window.dispatchEvent(
          new CustomEvent('csvImportReady', {
            detail: {
              totalRows: response.data.totalRows,
              validRows: response.data.validRows,
            },
          })
        );
      }
    } catch (error) {
      console.error('CSV import error:', error);
      this.errors = [{ message: error.message || 'Failed to import CSV file' }];
      this.canImport = false;
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Confirm and complete the import
   */
  async confirmImport() {
    if (!this.previewData || this.previewData.length === 0) return;

    this.isLoading = true;
    this.render();

    try {
      // Send confirmation request to backend
      const response = await apiClient.post('/bids/import/csv/confirm', {
        bids: this.previewData,
      });

      // Hide modal and show success message
      this.hide();

      // Dispatch event to notify that import was successful
      window.dispatchEvent(
        new CustomEvent('csvImportSuccess', {
          detail: { importedCount: response.data.importedCount },
        })
      );
    } catch (error) {
      console.error('CSV confirm import error:', error);
      this.errors = [
        { message: error.message || 'Failed to confirm CSV import' },
      ];
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // File input change
    const fileInput = document.getElementById('csv-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', e => this.handleFileSelect(e));
    }

    // Import button
    const importButton = document.getElementById('csv-import-button');
    if (importButton) {
      importButton.addEventListener('click', () => this.importFile());
    }

    // Confirm button
    const confirmButton = document.getElementById('csv-confirm-button');
    if (confirmButton) {
      confirmButton.addEventListener('click', () => this.confirmImport());
    }

    // Cancel button
    const cancelButton = document.getElementById('csv-cancel-button');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => this.hide());
    }

    // Close button (X)
    const closeButton = document.querySelector('.modal-close');
    if (closeButton) {
      closeButton.addEventListener('click', () => this.hide());
    }

    // Modal overlay click to close
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', e => {
        if (e.target === modalOverlay) {
          this.hide();
        }
      });
    }
  }

  /**
   * Render the CSV import dialog
   */
  render() {
    const modalContainer = document.getElementById('modal-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = this.renderContent();
    this.setupEventListeners();
  }

  /**
   * Render the content of the dialog
   */
  renderContent() {
    return `
      <div class="modal-header">
        <h2>Import Bids from CSV</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        ${this.isLoading ? this.renderLoadingState() : this.renderImportForm()}
      </div>
    `;
  }

  /**
   * Render the loading state
   */
  renderLoadingState() {
    return `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Processing CSV file...</p>
      </div>
    `;
  }

  /**
   * Render the import form
   */
  renderImportForm() {
    if (this.previewData) {
      return this.renderPreview();
    }

    return `
      <div class="csv-import-form">
        <div class="form-group">
          <label for="csv-file-input">Select CSV File</label>
          <input type="file" id="csv-file-input" accept=".csv" class="file-input">
          ${this.file ? `<p class="file-name">${this.file.name}</p>` : ''}
        </div>
        
        <div class="form-actions">
          <button id="csv-cancel-button" class="btn btn--secondary">Cancel</button>
          <button id="csv-import-button" class="btn btn--primary" ${!this.file ? 'disabled' : ''}>
            Preview
          </button>
        </div>
        
        ${this.errors.length > 0 ? this.renderErrors() : ''}
      </div>
    `;
  }

  /**
   * Render the preview of imported data
   */
  renderPreview() {
    return `
      <div class="csv-preview">
        <h3>Preview</h3>
        ${this.errors.length > 0 ? this.renderErrors() : ''}
        
        ${
          this.previewData && this.previewData.length > 0
            ? `
          <div class="preview-table-container">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>Fund ID</th>
                  <th>Month</th>
                  <th>Winning Bid</th>
                  <th>Discount Amount</th>
                  <th>Bidder Name</th>
                </tr>
              </thead>
              <tbody>
                ${this.previewData
                  .slice(0, 10)
                  .map(
                    row => `
                  <tr>
                    <td>${row.fund_id || ''}</td>
                    <td>${row.month_key || ''}</td>
                    <td>${formatINR(row.winning_bid || 0)}</td>
                    <td>${formatINR(row.discount_amount || 0)}</td>
                    <td>${row.bidder_name || ''}</td>
                  </tr>
                `
                  )
                  .join('')}
                ${
                  this.previewData.length > 10
                    ? `
                  <tr>
                    <td colspan="5" class="preview-more">... and ${this.previewData.length - 10} more rows</td>
                  </tr>
                `
                    : ''
                }
              </tbody>
            </table>
          </div>
        `
            : ''
        }
        
        <div class="preview-summary">
          <p>Total rows: ${this.previewData ? this.previewData.length : 0}</p>
          ${
            this.errors.length > 0
              ? `
            <p class="error-count">${this.errors.length} error(s) found</p>
          `
              : ''
          }
        </div>
        
        <div class="form-actions">
          <button id="csv-cancel-button" class="btn btn--secondary">Cancel</button>
          <button id="csv-confirm-button" class="btn btn--primary" ${!this.canImport ? 'disabled' : ''}>
            Import ${this.previewData ? this.previewData.length : 0} Rows
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render errors
   */
  renderErrors() {
    return `
      <div class="error-list">
        <h4>Errors:</h4>
        <ul>
          ${this.errors
            .map(
              error => `
            <li class="error-item">
              ${error.message || 'Unknown error'}
              ${error.line ? ` (Line ${error.line})` : ''}
            </li>
          `
            )
            .join('')}
        </ul>
      </div>
    `;
  }
}

// Export singleton instance
export const csvImportDialog = new CSVImportDialog();
