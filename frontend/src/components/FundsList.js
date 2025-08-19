/**
 * Funds List Component for ChitJar Frontend
 *
 * This component displays a list of funds as cards with key metrics.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';
import { debounce } from '../lib/performance.js';
import { handleApiError } from '../lib/errorHandler.js';
import { hasMultipleActiveFunds } from '../lib/edgeCaseHandler.js';

class FundsList {
  constructor() {
    this.funds = [];
    this.isLoading = false;
    this.error = null;

    // Pagination properties
    this.currentPage = 1;
    this.itemsPerPage = 10;
    this.totalPages = 1;

    // Debounced load data function
    this.debouncedLoadData = debounce(() => this.loadData(), 300);
  }

  /**
   * Load funds data from the API
   */
  async loadData() {
    // Check if user is authenticated before trying to load data
    if (!apiClient.isAuthenticated()) {
      this.error = 'You must be logged in to view funds';
      this.isLoading = false;
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // Fetch funds
      const response = await apiClient.get('/funds');
      this.funds = response.data.funds || [];

      // Calculate pagination
      this.totalPages = Math.ceil(this.funds.length / this.itemsPerPage);

      // For each fund, fetch entries to calculate progress
      // Use a limited concurrency to avoid overwhelming the server
      const concurrencyLimit = 5;
      let activeRequests = 0;
      const fundQueue = [...this.funds];

      const processFundQueue = async () => {
        while (fundQueue.length > 0 && activeRequests < concurrencyLimit) {
          const fund = fundQueue.shift();
          activeRequests++;

          try {
            const entriesResponse = await apiClient.get(
              `/funds/${fund.id}/entries`
            );
            const entries = entriesResponse.data.entries || [];

            // Calculate progress: count of paid entries vs total months
            const paidEntries = entries.filter(entry => entry.is_paid).length;
            fund.progress = {
              paid: paidEntries,
              total: fund.total_months || 0,
              percentage:
                fund.total_months > 0
                  ? Math.round((paidEntries / fund.total_months) * 100)
                  : 0,
            };
          } catch (error) {
            // If we can't fetch entries for a fund, set default progress
            fund.progress = {
              paid: 0,
              total: fund.total_months,
              percentage: 0,
            };
            console.warn(`Failed to fetch entries for fund ${fund.id}:`, error);
          } finally {
            activeRequests--;
          }
        }

        // If there are still funds in the queue, process them
        if (fundQueue.length > 0) {
          // Yield to the event loop to avoid blocking
          await new Promise(resolve => setTimeout(resolve, 0));
          await processFundQueue();
        }
      };

      // Process funds with limited concurrency
      if (this.funds.length > 0) {
        await processFundQueue();
      }
    } catch (error) {
      // Handle authentication errors specifically
      if (error.message && error.message.includes('Invalid access token')) {
        this.error = 'Your session has expired. Please log in again.';
        // Clear the invalid token
        apiClient.clearToken();
        // Dispatch a logout event to redirect to login
        window.dispatchEvent(new CustomEvent('logout'));
      } else {
        handleApiError(error, 'Loading funds data', { silent: true });
        this.error = error.message || 'Failed to load funds data';
      }
      console.error('Funds data load error:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Render the funds list component
   */
  render() {
    const container = document.querySelector('.funds');
    if (!container) return;

    if (this.isLoading) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    if (this.error) {
      container.innerHTML = this.renderErrorState();
      return;
    }

    // Check for edge cases
    const hasMultipleActive = hasMultipleActiveFunds(this.funds);
    
    container.innerHTML = `
      <div class="funds__header">
        <h2>My Chit Funds</h2>
        <button class="btn btn--primary" id="add-fund">
          <i class="icon-plus"></i>
          Add Fund
        </button>
      </div>
      
      ${hasMultipleActive ? `
        <div class="alert alert--info">
          <p>You have multiple active funds. You can manage each fund individually.</p>
        </div>
      ` : ''}
      
      ${this.funds.length === 0 ? this.renderEmptyState() : this.renderFundsList()}
    `;

    this.attachEventListeners();
  }

  /**
   * Render the error state
   */
  renderErrorState() {
    return `
      <div class="funds__header">
        <h2>My Funds</h2>
      </div>
      
      <div class="funds__error">
        <div class="error">
          <p>Error loading funds data: ${this.error}</p>
          <button class="btn btn--primary" id="retry-funds">Retry</button>
        </div>
      </div>
    `;
  }

  /**
   * Render the funds list
   */
  renderFundsList() {
    // Get funds for current page
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    const paginatedFunds = this.funds.slice(startIndex, endIndex);

    return `
      <div class="funds__header">
        <h2>My Funds</h2>
        <!--
        <div class="funds__actions">
          <button id="import-csv-button" class="btn btn--secondary" aria-label="Import funds data from CSV file">Import CSV</button>
          <button id="export-data-button" class="btn btn--secondary" aria-label="Export funds data to CSV or JSON file">Export Data</button>
        </div>
        -->
      </div>
      
      ${
        this.funds.length > 0
          ? `<div class="funds__grid">
          ${paginatedFunds.map(fund => this.renderFundCard(fund)).join('')}
        </div>
        ${this.renderPagination()}`
          : this.renderEmptyState()
      }
    `;
  }

  /**
   * Render a fund card
   */
  renderFundCard(fund) {
    // Ensure progress object exists
    const progress = fund.progress || {
      paid: 0,
      total: fund.total_months || 0,
      percentage: 0,
    };

    return `
      <div class="fund-card" data-fund-id="${fund.id}">
        <div class="fund-card__header">
          <h3 class="fund-card__title">${fund.name || 'Unnamed Fund'}</h3>
          <span class="fund-card__status ${fund.is_active ? 'fund-card__status--active' : 'fund-card__status--inactive'}">
            ${fund.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div class="fund-card__details">
          <div class="fund-card__metric">
            <span class="fund-card__metric-label">Chit Value</span>
            <span class="fund-card__metric-value">${formatINR(fund.chit_value || 0)}</span>
          </div>
          
          <div class="fund-card__metric">
            <span class="fund-card__metric-label">Installment</span>
            <span class="fund-card__metric-value">${formatINR(fund.installment_amount || 0)}</span>
          </div>
          
          <div class="fund-card__progress">
            <div class="fund-card__progress-info">
              <span class="fund-card__progress-label">Progress</span>
              <span class="fund-card__progress-text">${progress.paid}/${progress.total} months</span>
            </div>
            <div class="fund-card__progress-bar">
              <div class="fund-card__progress-fill" style="width: ${progress.percentage}%"></div>
            </div>
            <div class="fund-card__progress-percent">${progress.percentage}%</div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the empty state
   */
  renderEmptyState() {
    return `
      <div class="funds__empty">
        <div class="empty-state">
          <p>No funds yet. Add your first fund to get started!</p>
          <button class="btn btn--primary" id="add-first-fund">Add Fund</button>
        </div>
      </div>
    `;
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
    if (this.totalPages <= 1) return '';

    const pageButtons = [];

    // Previous button
    pageButtons.push(
      `<button class="btn btn--secondary pagination-btn ${this.currentPage === 1 ? 'disabled' : ''}" 
              data-page="prev" 
              aria-label="Previous page" 
              ${this.currentPage === 1 ? 'disabled' : ''}>
        Previous
      </button>`
    );

    // Page numbers
    for (let i = 1; i <= this.totalPages; i++) {
      // Only show first, last, current, and nearby pages
      if (
        i === 1 ||
        i === this.totalPages ||
        (i >= this.currentPage - 2 && i <= this.currentPage + 2)
      ) {
        pageButtons.push(
          `<button class="btn btn--secondary pagination-btn ${i === this.currentPage ? 'active' : ''}" 
                  data-page="${i}" 
                  aria-label="Page ${i}" 
                  ${i === this.currentPage ? 'aria-current="page"' : ''}>
            ${i}
          </button>`
        );
      } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
        // Show ellipsis for skipped pages
        pageButtons.push('<span class="pagination-ellipsis">...</span>');
      }
    }

    // Next button
    pageButtons.push(
      `<button class="btn btn--secondary pagination-btn ${this.currentPage === this.totalPages ? 'disabled' : ''}" 
              data-page="next" 
              aria-label="Next page" 
              ${this.currentPage === this.totalPages ? 'disabled' : ''}>
        Next
      </button>`
    );

    return `
      <div class="funds__pagination">
        <div class="pagination-controls">
          ${pageButtons.join('')}
        </div>
        <div class="pagination-info">
          Showing ${Math.min((this.currentPage - 1) * this.itemsPerPage + 1, this.funds.length)} 
          to ${Math.min(this.currentPage * this.itemsPerPage, this.funds.length)} 
          of ${this.funds.length} funds
        </div>
      </div>
    `;
  }

  /**
   * Add event listeners to fund cards
   */
  addFundCardEventListeners() {
    const fundCards = document.querySelectorAll('.fund-card');
    fundCards.forEach(card => {
      card.addEventListener('click', e => {
        // Don't navigate if clicking on a button or link within the card
        if (e.target.closest('button, a')) {
          return;
        }

        const fundId = card.dataset.fundId;
        if (fundId) {
          // Dispatch a custom event to navigate to fund detail
          window.dispatchEvent(
            new CustomEvent('navigateToFund', { detail: { fundId } })
          );
        }
      });
    });

    // Add event listener for import CSV button
    /*
    const importButton = document.getElementById('import-csv-button');
    if (importButton) {
      importButton.addEventListener('click', () => {
        // Dispatch event to show CSV import dialog for funds
        window.dispatchEvent(new CustomEvent('showCSVImportDialog', {
          detail: { type: 'funds' }
        }));
      });
    }
    */

    // Add event listener for export data button
    /*
    const exportButton = document.getElementById('export-data-button');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        // Dispatch event to show export dialog
        window.dispatchEvent(new CustomEvent('showExportDialog'));
      });
    }
    */

    // Add event listeners for pagination buttons
    const paginationButtons = document.querySelectorAll('.pagination-btn');
    paginationButtons.forEach(button => {
      button.addEventListener('click', e => {
        const page = e.target.dataset.page;

        if (page === 'prev' && this.currentPage > 1) {
          this.currentPage--;
          this.render();
        } else if (page === 'next' && this.currentPage < this.totalPages) {
          this.currentPage++;
          this.render();
        } else if (
          !isNaN(parseInt(page)) &&
          page >= 1 &&
          page <= this.totalPages
        ) {
          this.currentPage = parseInt(page);
          this.render();
        }
      });
    });
  }
}

// Export singleton instance
export const fundsList = new FundsList();
