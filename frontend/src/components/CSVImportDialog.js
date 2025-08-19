/**
 * CSV Import Dialog Component for ChitJar Frontend
 *
 * This component provides a modal dialog for importing CSV files with preview and error handling.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';
import { createFocusTrap } from '../lib/focusTrap.js';
import { readCsvFile, parseCsvString, mapHeaders, validateCsvData } from '../lib/csvParser.js';

class CSVImportDialog {
  constructor() {
    this.file = null;
    this.previewData = null;
    this.errors = [];
    this.isLoading = false;
    this.canImport = false;
    this.fileType = 'bids'; // Default to bids, can be 'funds' or 'entries'
  }

  /**
   * Show the CSV import dialog
   */
  show(fileType = 'bids') {
    this.fileType = fileType;
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
      modalOverlay.setAttribute('aria-label', 'CSV Import Dialog');

      // Create focus trap
      const modalContainer = document.getElementById('modal-container');
      if (modalContainer) {
        this.focusTrap = createFocusTrap(modalContainer);
        this.focusTrap.activate();
      }
    }
  }

  /**
   * Hide the CSV import dialog
   */
  hide() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.display = 'none';

      // Deactivate focus trap
      if (this.focusTrap) {
        this.focusTrap.deactivate();
      }
    }

    // Dispatch event to notify that dialog was closed
    window.dispatchEvent(new CustomEvent('csvImportDialogClosed'));
  }

  /**
   * Handle file selection
   */
  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.file = file;
      this.previewData = null;
      this.errors = [];
      this.canImport = false;

      // Update UI to show file name and enable import button
      this.render();

      // Parse file on selection for immediate preview
      await this.parseFile();
    }
  }

  /**
   * Parse the selected CSV file on the client side
   */
  async parseFile() {
    if (!this.file) return;

    this.isLoading = true;
    this.render();

    try {
      // Read file contents
      const csvContent = await readCsvFile(this.file);
      
      // Parse CSV data
      const parsedData = parseCsvString(csvContent);
      
      // Map headers to standardized field names
      if (parsedData.length > 0) {
        const headers = Object.keys(parsedData[0]);
        const mappedHeaders = mapHeaders(headers, this.fileType);
        
        // Update data with mapped headers
        const mappedData = parsedData.map(row => {
          const newRow = {};
          const originalKeys = Object.keys(row);
          originalKeys.forEach((key, index) => {
            newRow[mappedHeaders[index]] = row[key];
          });
          return newRow;
        });
        
        // Validate data
        const validationErrors = validateCsvData(mappedData, this.fileType);
        
        // Update state
        this.previewData = mappedData;
        this.errors = validationErrors;
        this.canImport = validationErrors.length === 0;
      } else {
        this.previewData = [];
        this.errors = [{ message: 'No data found in CSV file' }];
        this.canImport = false;
      }
    } catch (error) {
      console.error('CSV parsing error:', error);
      this.errors = [{ message: error.message || 'Failed to parse CSV file' }];
      this.canImport = false;
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Import the selected CSV file
   */
  async importFile() {
    if (!this.file || !this.previewData || !this.canImport) return;

    this.isLoading = true;
    this.render();

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('csvFile', this.file);

      // Send file to backend for processing
      const response = await apiClient.request('/bids/import/csv', {
        method: 'POST',
        body: formData,
      });

      // Show success message
      window.dispatchEvent(
        new CustomEvent('csvImportSuccess', {
          detail: { importedCount: response.data.importedCount },
        })
      );
      
      // Hide dialog
      this.hide();
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
        <h2 id="modal-title">Import ${this.fileType === 'bids' ? 'Bids' : this.fileType === 'funds' ? 'Funds' : 'Entries'} from CSV</h2>
        <button class="modal-close" aria-label="Close CSV Import Dialog">&times;</button>
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
    if (this.previewData && this.previewData.length > 0) {
      return this.renderPreview();
    }

    return `
      <div class="csv-import-form">
        <div class="form-group">
          <label for="csv-file-input">Select CSV File</label>
          <input type="file" id="csv-file-input" accept=".csv" class="file-input" aria-describedby="csv-file-help">
          <div id="csv-file-help" class="form-help">Choose a CSV file containing ${this.fileType} data to import</div>
          ${this.file ? `<p class="file-name">Selected file: ${this.file.name}</p>` : ''}
        </div>
        
        <div class="form-actions">
          <button id="csv-cancel-button" class="btn btn--secondary">Cancel</button>
          <button id="csv-import-button" class="btn btn--primary" ${!this.canImport ? 'disabled' : ''}>
            Import
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
    // Determine headers based on data type
    let headers = [];
    if (this.fileType === 'bids') {
      headers = ['Fund Name', 'Month', 'Winning Bid', 'Discount Amount', 'Bidder Name'];
    } else if (this.fileType === 'funds') {
      headers = ['Name', 'Chit Value', 'Installment Amount', 'Total Months', 'Start Month', 'End Month'];
    } else if (this.fileType === 'entries') {
      headers = ['Fund Name', 'Month', 'Dividend Amount', 'Prize Money', 'Is Paid'];
    }

    // Get preview rows (first 10)
    const previewRows = this.previewData.slice(0, 10);

    return `
      <div class="csv-preview">
        <h3>Preview</h3>
        ${this.errors.length > 0 ? this.renderErrors() : ''}
        
        <div class="preview-table-container" role="table" aria-label="CSV Data Preview">
          <div role="rowgroup">
            <div role="row">
              ${headers.map(header => `<span role="columnheader">${header}</span>`).join('')}
            </div>
          </div>
          <div role="rowgroup">
            ${previewRows
              .map(row => {
                let cells = [];
                if (this.fileType === 'bids') {
                  cells = [
                    row.fund_name || '',
                    row.month_key || '',
                    formatINR(row.winning_bid || 0),
                    formatINR(row.discount_amount || 0),
                    row.bidder_name || ''
                  ];
                } else if (this.fileType === 'funds') {
                  cells = [
                    row.name || '',
                    formatINR(row.chit_value || 0),
                    formatINR(row.installment_amount || 0),
                    row.total_months || '',
                    row.start_month || '',
                    row.end_month || ''
                  ];
                } else if (this.fileType === 'entries') {
                  cells = [
                    row.fund_name || '',
                    row.month_key || '',
                    formatINR(row.dividend_amount || 0),
                    formatINR(row.prize_money || 0),
                    row.is_paid ? 'Yes' : 'No'
                  ];
                }
                return `
                  <div role="row">
                    ${cells.map(cell => `<span role="cell">${cell}</span>`).join('')}
                  </div>
                `;
              })
              .join('')}
            ${this.previewData.length > 10
              ? `
                <div role="row">
                  <span role="cell" colspan="${headers.length}" class="preview-more">... and ${this.previewData.length - 10} more rows</span>
                </div>
              `
              : ''
            }
          </div>
        </div>
        
        <div class="preview-summary">
          <p>Total rows: ${this.previewData ? this.previewData.length : 0}</p>
          ${this.errors.length > 0
            ? `
              <p class="error-count">${this.errors.length} error(s) found</p>
            `
            : ''
          }
        </div>
        
        <div class="form-actions">
          <button id="csv-cancel-button" class="btn btn--secondary">Cancel</button>
          <button id="csv-import-button" class="btn btn--primary" ${!this.canImport ? 'disabled' : ''}>
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
                  ${error.field ? ` [Field: ${error.field}]` : ''}
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
