/**
 * Export Dialog Component for ChitJar Frontend
 *
 * This component provides a modal dialog for exporting data in CSV or JSON formats.
 */

class ExportDialog {
  constructor() {
    this.isLoading = false;
  }

  /**
   * Show the export dialog
   */
  show() {
    this.render();

    // Show modal
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
    }
  }

  /**
   * Hide the export dialog
   */
  hide() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
  }

  /**
   * Export data in the specified format
   * @param {string} entityType - Type of entity to export (funds, entries, bids, backup)
   * @param {string} format - Format to export in (csv, json)
   */
  exportData(entityType, format) {
    // Construct the URL for export
    let url = `/export/${entityType}.${format}`;

    // For backup, the URL is slightly different
    if (entityType === 'backup') {
      url = '/export/backup.json';
    }

    // Create the full URL with auth token
    const authToken = localStorage.getItem('authToken');
    const fullUrl = `/api/v1${url}${authToken ? `?Authorization=Bearer%20${authToken}` : ''}`;

    // Create a temporary link element to trigger download
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = `chitjar-${entityType}.${format}`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Cancel button
    const cancelButton = document.getElementById('export-cancel-button');
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

    // Export buttons
    const exportButtons = document.querySelectorAll('[data-export]');
    exportButtons.forEach(button => {
      button.addEventListener('click', e => {
        const exportType = e.target.dataset.export;
        if (exportType) {
          const [entityType, format] = exportType.split('-');
          this.exportData(entityType, format);
        }
      });
    });
  }

  /**
   * Render the export dialog
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
        <h2>Export Data</h2>
        <button class="modal-close" aria-label="Close">&times;</button>
      </div>
      <div class="modal-body">
        ${this.renderExportOptions()}
      </div>
    `;
  }

  /**
   * Render export options
   */
  renderExportOptions() {
    return `
      <div class="export-options">
        <div class="export-section">
          <h3>Funds</h3>
          <div class="export-buttons">
            <button class="btn btn--secondary" data-export="funds-csv">CSV</button>
            <button class="btn btn--secondary" data-export="funds-json">JSON</button>
          </div>
        </div>
        
        <div class="export-section">
          <h3>Monthly Entries</h3>
          <div class="export-buttons">
            <button class="btn btn--secondary" data-export="entries-csv">CSV</button>
            <button class="btn btn--secondary" data-export="entries-json">JSON</button>
          </div>
        </div>
        
        <div class="export-section">
          <h3>Bids</h3>
          <div class="export-buttons">
            <button class="btn btn--secondary" data-export="bids-csv">CSV</button>
            <button class="btn btn--secondary" data-export="bids-json">JSON</button>
          </div>
        </div>
        
        <div class="export-section">
          <h3>Complete Backup</h3>
          <div class="export-buttons">
            <button class="btn btn--primary" data-export="backup-json">JSON</button>
          </div>
          <p class="export-description">Full backup of all your data including funds, entries, and bids.</p>
        </div>
        
        <div class="form-actions">
          <button id="export-cancel-button" class="btn btn--secondary">Cancel</button>
        </div>
      </div>
    `;
  }
}

// Export singleton instance
export const exportDialog = new ExportDialog();
