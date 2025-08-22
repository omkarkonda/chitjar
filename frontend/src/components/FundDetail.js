/**
 * Fund Detail Component for ChitJar Frontend
 *
 * This component displays detailed information about a specific fund
 * including KPIs and entries list.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR, formatDate } from '../lib/formatters.js';
import { monthlyEntryForm } from './MonthlyEntryForm.js';
import { createFocusTrap } from '../lib/focusTrap.js';
import { debounce } from '../lib/performance.js';
import { handleApiError } from '../lib/errorHandler.js';
import { isZeroDividendMonth, isPastMonth } from '../lib/edgeCaseHandler.js';
import { isFundEnded, canAddEntriesToFund, getFundStatusDescription } from '../lib/fundUtils.js';

class FundDetail {
  constructor() {
    this.fund = null;
    this.entries = [];
    this.analytics = null;
    this.isLoading = false;
    this.error = null;

    // Calculated values
    this.netAmount = 0;
    this.totalDividend = 0;
    this.annualInterestAt12Percent = 0;
    this.roi = 0;
    this.avgMonthlyDividend = 0;
    this.monthsToCompletion = 0;

    // Virtualization properties
    this.visibleEntries = [];
    this.entriesPerPage = 20;
    this.currentPage = 1;

    // Debounced calculation functions
    this.debouncedCalculateValues = debounce(
      () => this.calculateDerivedValues(),
      300
    );
    this.debouncedLoadData = debounce(fundId => this.loadData(fundId), 300);
  }

  /**
   * Load fund detail data from the API
   * @param {string} fundId - The ID of the fund to load
   */
  async loadData(fundId) {
    // Check if user is authenticated before trying to load data
    if (!apiClient.isAuthenticated()) {
      this.error = 'You must be logged in to view fund details';
      this.isLoading = false;
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      // Fetch fund details
      const fundResponse = await apiClient.get(`/funds/${fundId}`);
      this.fund = fundResponse.data;

      // Fetch entries - using the fund's entries endpoint which includes missing months
      const entriesResponse = await apiClient.get(`/funds/${fundId}/entries`);
      this.entries = entriesResponse.data.entries || [];

      // Fetch analytics
      const analyticsResponse = await apiClient.get(
        `/analytics/funds/${fundId}`
      );
      this.analytics = analyticsResponse.data;

      // Calculate derived values
      this.calculateDerivedValues();
    } catch (error) {
      // Handle authentication errors specifically
      if (error.message && error.message.includes('Invalid access token')) {
        this.error = 'Your session has expired. Please log in again.';
        // Clear the invalid token
        apiClient.clearToken();
        // Dispatch a logout event to redirect to login
        window.dispatchEvent(new CustomEvent('logout'));
      } else {
        handleApiError(error, 'Loading fund data', { silent: true });
        this.error = error.message || 'Failed to load fund data';
      }
      console.error('Fund detail data load error:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Calculate derived values from fund data
   */
  calculateDerivedValues() {
    if (!this.fund || !this.entries) return;

    // Calculate net amount (sum of dividend_amount - installment_amount for paid entries)
    this.netAmount = this.entries.reduce((total, entry) => {
      if (entry.is_paid) {
        const dividend = parseFloat(entry.dividend_amount) || 0;
        const installment = parseFloat(this.fund.installment_amount) || 0;
        return total + (dividend - installment);
      }
      return total;
    }, 0);

    // Calculate total dividend (sum of dividend_amount for paid entries)
    this.totalDividend = this.entries.reduce((total, entry) => {
      if (entry.is_paid) {
        const dividend = parseFloat(entry.dividend_amount) || 0;
        return total + dividend;
      }
      return total;
    }, 0);

    // Calculate average monthly dividend
    const paidEntries = this.entries.filter(entry => entry.is_paid);
    const paidMonths = paidEntries.length;
    const totalDividends = paidEntries.reduce(
      (total, entry) => total + (parseFloat(entry.dividend_amount) || 0),
      0
    );
    this.avgMonthlyDividend = paidMonths > 0 ? totalDividends / paidMonths : 0;

    // Calculate months to completion
    this.monthsToCompletion = this.fund.total_months - paidMonths;

    // Calculate total amount paid
    const totalInstallments = paidMonths * (parseFloat(this.fund.installment_amount) || 0);
    
    // Calculate month-on-month compound interest at 12% annual rate (1% monthly)
    // For each paid month, we calculate interest on the cumulative amount paid so far
    this.annualInterestAt12Percent = 0;
    let cumulativeAmount = 0;
    const installmentAmount = parseFloat(this.fund.installment_amount) || 0;
    
    // For each paid month, add installment and calculate 1% interest on new total
    for (let i = 0; i < paidMonths; i++) {
      cumulativeAmount += installmentAmount;
      const monthlyInterest = cumulativeAmount * 0.01; // 1% monthly interest (12% annual)
      this.annualInterestAt12Percent += monthlyInterest;
    }

    // Calculate ROI
    this.roi =
      totalInstallments > 0
        ? (this.netAmount / totalInstallments) * 100
        : 0;
  }

  /**
   * Render the fund detail component
   */
  render() {
    const container = document.querySelector('.fund-detail');
    if (!container) return;

    if (this.isLoading) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    if (this.error) {
      container.innerHTML = this.renderErrorState();
      // Add event listener for retry button
      const retryButton = container.querySelector('#retry-fund-detail');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.loadData(this.fund?.id);
        });
      }
      return;
    }

    // Render the fund detail
    container.innerHTML = this.renderFundDetail();

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Render the loading state
   */
  renderLoadingState() {
    return `
      <div class="fund-detail__header">
        <div class="loading__skeleton fund-detail-header-skeleton"></div>
      </div>
      
      <div class="fund-detail__kpis">
        <div class="loading__skeleton kpi-grid-skeleton"></div>
      </div>
      
      <div class="fund-detail__entries">
        <div class="loading__skeleton entries-header-skeleton"></div>
        <div class="loading__skeleton entries-list-skeleton"></div>
      </div>
    `;
  }

  /**
   * Render the error state
   */
  renderErrorState() {
    return `
      <div class="fund-detail__error">
        <div class="error">
          <p>Error loading fund data: ${this.error}</p>
          <button class="btn btn--primary" id="retry-fund-detail">Retry</button>
        </div>
      </div>
    `;
  }

  /**
   * Render the fund detail
   */
  renderFundDetail() {
    if (!this.fund) return '';

    return `
      <div class="fund-detail__header">
        <div class="fund-detail__header-top">
          <h2>${this.fund.name}</h2>
          <span class="fund-detail__status ${this.fund.is_active ? 'fund-detail__status--active' : 'fund-detail__status--inactive'}">
            ${this.fund.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div class="fund-detail__header-info">
          <div class="fund-detail__metric">
            <span class="fund-detail__metric-label">Chit Value</span>
            <span class="fund-detail__metric-value">${formatINR(this.fund.chit_value)}</span>
          </div>
          <div class="fund-detail__metric">
            <span class="fund-detail__metric-label">Installment</span>
            <span class="fund-detail__metric-value">${formatINR(this.fund.installment_amount)}</span>
          </div>
          <div class="fund-detail__metric">
            <span class="fund-detail__metric-label">Total Months</span>
            <span class="fund-detail__metric-value">${this.fund.total_months}</span>
          </div>
        </div>
      </div>
      
      ${this.renderKPIs()}
      
      ${this.renderEntriesList()}
    `;
  }

  /**
   * Render the KPIs section
   */
  renderKPIs() {
    const xirrValue = this.analytics?.xirr;
    const xirrDisplay =
      xirrValue !== null && xirrValue !== undefined
        ? `${xirrValue.toFixed(2)}%`
        : 'N/A';

    return `
      <div class="fund-detail__kpis">
        <h3>Performance Metrics</h3>
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="kpi-card__label">Net Amount</div>
            <div class="kpi-card__value">${formatINR(this.netAmount || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">Total Dividend</div>
            <div class="kpi-card__value">${formatINR(this.totalDividend || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">12% Monthly Compound</div>
            <div class="kpi-card__value">${formatINR(this.annualInterestAt12Percent || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">ROI</div>
            <div class="kpi-card__value">${(this.roi || 0).toFixed(2)}%</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">Avg Monthly Dividend</div>
            <div class="kpi-card__value">${formatINR(this.avgMonthlyDividend || 0)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">Months to Completion</div>
            <div class="kpi-card__value">${this.monthsToCompletion || 0}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-card__label">XIRR</div>
            <div class="kpi-card__value">${xirrDisplay}</div>
          </div>
        </div>
        
        ${this.renderFdComparison()}
      </div>
    `;
  }

  /**
   * Render the FD comparison section
   */
  renderFdComparison() {
    return `
      <div class="fd-comparison">
        <div class="fd-comparison__header">
          <h4>FD Comparison</h4>
          <span class="form-label__tooltip" data-tooltip="Compare your fund's XIRR with a fixed deposit rate to evaluate performance. Enter the current FD interest rate offered by banks.">
            ⓘ
          </span>
        </div>
        <div class="fd-comparison__form">
          <div class="form-group">
            <label for="fd-rate">
              Fixed Deposit Rate (%)
              <span class="form-label__tooltip" data-tooltip="Enter the annual interest rate for fixed deposits currently offered by major banks. This is used as a benchmark to compare with your fund's XIRR.">
                ⓘ
              </span>
            </label>
            <input 
              type="number" 
              id="fd-rate" 
              class="form-input" 
              placeholder="Enter FD rate (e.g., 7.5)" 
              min="0" 
              max="50" 
              step="0.1"
            >
            <button class="btn btn--primary" id="compare-fd">Compare</button>
          </div>
        </div>
        <div id="fd-comparison-result"></div>
        
        <div class="assumptions-note">
          <h5>Assumptions for Calculations</h5>
          <ul>
            <li>XIRR calculation includes all cash flows (installments as outflows, dividends and prize money as inflows)</li>
            <li>FD comparison uses simple interest calculation for benchmarking</li>
            <li>All calculations are based on actual data entered, not projections</li>
            <li>Forecast projections use simple averages of historical dividend and prize money</li>
            <li>Forecasts assume consistent installment amounts as per fund terms</li>
          </ul>
        </div>
      </div>
    `;
  }

  /**
   * Render the entries list
   */
  renderEntriesList() {
    // Calculate visible entries for current page
    const startIndex = (this.currentPage - 1) * this.entriesPerPage;
    const endIndex = startIndex + this.entriesPerPage;
    this.visibleEntries = this.entries.slice(startIndex, endIndex);

    // Check if entries can be added to this fund
    const entryPermission = canAddEntriesToFund(this.fund);

    return `
      <div class="fund-detail__entries">
        <div class="entries-header">
          <h3>Monthly Entries</h3>
          <div class="entries-header__actions">
            <button 
              class="btn btn--secondary ${!entryPermission.canAdd ? 'btn--disabled' : ''}" 
              id="add-entry" 
              aria-label="Add new monthly entry"
              ${!entryPermission.canAdd ? 'disabled' : ''}
            >
              Add Entry
            </button>
            ${!entryPermission.canAdd ? `
              <div class="entries-header__status">
                <small class="text-muted">
                  <i class="icon-info"></i>
                  ${entryPermission.reason}
                </small>
              </div>
            ` : ''}
          </div>
        </div>
        <div class="entries-list">
          ${
            this.entries.length > 0
              ? `${this.visibleEntries.map(entry => this.renderEntryCard(entry)).join('')}
                ${this.renderPagination()}`
              : this.renderEmptyEntries()
          }
        </div>
      </div>
    `;
  }

  /**
   * Render a single entry card with edge case handling
   * @param {Object} entry - The entry object to render
   * @returns {string} HTML string for the entry card
   */
  renderEntryCard(entry) {
    if (!entry || !this.fund) return '';

    // Format the date for display
    const date = new Date(entry.month_key + '-01');
    const formattedDate = date.toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });

    // Check for edge cases
    const isPast = isPastMonth(entry.month_key);
    const isZeroDividend = isZeroDividendMonth(entry);
    const isMissing = entry.is_missing;

    // Add warning classes for edge cases
    let cardClasses = 'entry-card';
    if (isPast) cardClasses += ' entry-card--past';
    if (isZeroDividend) cardClasses += ' entry-card--zero-dividend';
    if (isMissing) cardClasses += ' entry-card--missing';

    return `
      <div class="${cardClasses}" data-entry-id="${entry.id}">
        <div class="entry-card__header">
          <div class="entry-card__month">
            <span class="entry-card__month-label">Month</span>
            <span class="entry-card__month-value">${formattedDate}</span>
            ${isMissing ? '<span class="entry-card__missing-badge">Missing</span>' : ''}
          </div>
          <div class="entry-card__status">
            <span class="entry-card__status-label">Status</span>
            <span class="entry-card__status-value ${entry.is_paid ? 'entry-card__status-value--paid' : 'entry-card__status-value--unpaid'}">
              ${entry.is_paid ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>
        
        <div class="entry-card__details">
          <div class="entry-card__metric">
            <span class="entry-card__metric-label">Dividend</span>
            <span class="entry-card__metric-value">${formatINR(entry.dividend_amount || 0)}</span>
          </div>
        </div>
        
        <div class="entry-card__actions">
          <button class="btn btn--icon edit-entry" data-entry-id="${entry.id}" aria-label="Edit entry for ${formattedDate}">
            <i class="icon-edit"></i>
          </button>
        </div>
        
        ${isPast ? `<div class="entry-card__warning">Past entry - edits affect historical data</div>` : ''}
        ${isZeroDividend ? `<div class="entry-card__warning">Zero dividend month</div>` : ''}
        ${isMissing ? `<div class="entry-card__warning">No entry recorded for this month</div>` : ''}
      </div>
    `;
  }

  /**
   * Render the empty entries state
   */
  renderEmptyEntries() {
    // Check if entries can be added to this fund
    const entryPermission = canAddEntriesToFund(this.fund);

    return `
      <div class="entries-empty">
        <div class="empty-state">
          <p>No entries yet. ${entryPermission.canAdd ? 'Add your first entry to get started!' : 'This fund has ended.'}</p>
          ${entryPermission.canAdd ? `
            <button class="btn btn--primary" id="add-first-entry" aria-label="Add first monthly entry">Add Entry</button>
          ` : `
            <button class="btn btn--primary btn--disabled" disabled aria-label="Cannot add entries to ended fund">Add Entry</button>
            <small class="text-muted">
              <i class="icon-info"></i>
              ${entryPermission.reason}
            </small>
          `}
        </div>
      </div>
    `;
  }

  /**
   * Render pagination controls for entries
   */
  renderPagination() {
    const totalPages = Math.ceil(this.entries.length / this.entriesPerPage);

    if (totalPages <= 1) return '';

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
    for (let i = 1; i <= totalPages; i++) {
      // Only show first, last, current, and nearby pages
      if (
        i === 1 ||
        i === totalPages ||
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
      `<button class="btn btn--secondary pagination-btn ${this.currentPage === totalPages ? 'disabled' : ''}" 
              data-page="next" 
              aria-label="Next page" 
              ${this.currentPage === totalPages ? 'disabled' : ''}>
        Next
      </button>`
    );

    return `
      <div class="entries__pagination">
        <div class="pagination-controls">
          ${pageButtons.join('')}
        </div>
        <div class="pagination-info">
          Showing ${Math.min((this.currentPage - 1) * this.entriesPerPage + 1, this.entries.length)} 
          to ${Math.min(this.currentPage * this.entriesPerPage, this.entries.length)} 
          of ${this.entries.length} entries
        </div>
      </div>
    `;
  }

  /**
   * Add event listeners to the component
   */
  addEventListeners() {
    // Add entry button
    const addEntryButton = document.getElementById('add-entry');
    if (addEntryButton) {
      addEntryButton.addEventListener('click', () => {
        // Check if entries can be added before showing form
        const entryPermission = canAddEntriesToFund(this.fund);
        if (entryPermission.canAdd) {
          this.showAddEntryForm();
        }
      });
    }

    // Add first entry button
    const addFirstEntryButton = document.getElementById('add-first-entry');
    if (addFirstEntryButton) {
      addFirstEntryButton.addEventListener('click', () => {
        // Check if entries can be added before showing form
        const entryPermission = canAddEntriesToFund(this.fund);
        if (entryPermission.canAdd) {
          this.showAddEntryForm();
        }
      });
    }

    // Edit entry buttons
    const editEntryButtons = document.querySelectorAll('.edit-entry');
    editEntryButtons.forEach(button => {
      button.addEventListener('click', e => {
        const entryId = e.target.closest('.edit-entry').dataset.entryId;
        this.showEditEntryForm(entryId);
      });
    });

    // Retry button
    const retryButton = document.getElementById('retry-fund-detail');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.loadData(this.fund?.id);
      });
    }

    // Add event listeners for pagination buttons
    const paginationButtons = document.querySelectorAll(
      '.entries__pagination .pagination-btn'
    );
    paginationButtons.forEach(button => {
      button.addEventListener('click', e => {
        const page = e.target.dataset.page;
        const totalPages = Math.ceil(this.entries.length / this.entriesPerPage);

        if (page === 'prev' && this.currentPage > 1) {
          this.currentPage--;
          this.render();
        } else if (page === 'next' && this.currentPage < totalPages) {
          this.currentPage++;
          this.render();
        } else if (!isNaN(parseInt(page)) && page >= 1 && page <= totalPages) {
          this.currentPage = parseInt(page);
          this.render();
        }
      });
    });

    // FD comparison button
    const compareFdButton = document.getElementById('compare-fd');
    if (compareFdButton) {
      compareFdButton.addEventListener('click', () => {
        this.compareWithFd();
      });
    }

    // FD rate input - allow Enter key to trigger comparison
    const fdRateInput = document.getElementById('fd-rate');
    if (fdRateInput) {
      fdRateInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') {
          this.compareWithFd();
        }
      });
    }

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
   * Compare fund performance with a fixed deposit rate
   */
  async compareWithFd() {
    if (!this.fund || !this.fund.id) return;

    const fdRateInput = document.getElementById('fd-rate');
    const resultContainer = document.getElementById('fd-comparison-result');

    if (!fdRateInput || !resultContainer) return;

    const fdRate = parseFloat(fdRateInput.value);

    // Validate input
    if (isNaN(fdRate) || fdRate <= 0 || fdRate > 50) {
      resultContainer.innerHTML = `
        <div class="error-message">
          <p>Please enter a valid FD rate between 0.1 and 50.</p>
        </div>
      `;
      return;
    }

    try {
      // First, get the cash flow data for debugging
      const cashFlowResponse = await apiClient.get(
        `/analytics/funds/${this.fund.id}/cash-flow`
      );

      const cashFlowData = cashFlowResponse.data;

      // Display cash flow data for debugging
      console.log('Cash flow data for XIRR calculation:', cashFlowData);

      // Check if we have sufficient data
      const hasPositive = cashFlowData.cash_flow_series.some(
        cf => cf.amount > 0
      );
      const hasNegative = cashFlowData.cash_flow_series.some(
        cf => cf.amount < 0
      );

      if (!hasPositive || !hasNegative) {
        resultContainer.innerHTML = `
          <div class="info-message">
            <p>Unable to calculate XIRR due to insufficient data:</p>
            <ul>
              <li>Has positive cash flows: ${hasPositive ? 'Yes' : 'No'}</li>
              <li>Has negative cash flows: ${hasNegative ? 'Yes' : 'No'}</li>
              <li>Total cash flow entries: ${cashFlowData.cash_flow_series.length}</li>
            </ul>
            <p>XIRR requires at least one positive and one negative cash flow.</p>
          </div>
        `;
        return;
      }

      // Make API call to compare with FD
      const response = await apiClient.post(
        `/analytics/funds/${this.fund.id}/fd-comparison`,
        {
          fund_id: this.fund.id,
          fd_rate: fdRate,
        }
      );

      const data = response.data;

      // Display result
      if (data.is_fund_better === true) {
        resultContainer.innerHTML = `
          <div class="success-message">
            <p>Your fund's XIRR (${data.fund_xirr?.toFixed(2)}%) is <strong>higher</strong> than the FD rate (${data.fd_rate.toFixed(2)}%).</p>
            <p>This means your fund is performing better than a fixed deposit with the same rate.</p>
          </div>
        `;
      } else if (data.is_fund_better === false) {
        resultContainer.innerHTML = `
          <div class="warning-message">
            <p>Your fund's XIRR (${data.fund_xirr?.toFixed(2)}%) is <strong>lower</strong> than the FD rate (${data.fd_rate.toFixed(2)}%).</p>
            <p>This means a fixed deposit with this rate would be more profitable than your fund.</p>
          </div>
        `;
      } else if (data.fund_xirr === null) {
        resultContainer.innerHTML = `
          <div class="info-message">
            <p>Unable to calculate your fund's XIRR. This could be because:</p>
            <ul>
              <li>The fund doesn't have enough data (entries) yet</li>
              <li>All entries have the same cash flow values</li>
              <li>The cash flow pattern doesn't allow for XIRR calculation</li>
            </ul>
            <p>Please add more entries or check your existing entries to ensure they have varying values.</p>
          </div>
        `;
      } else {
        resultContainer.innerHTML = `
          <div class="info-message">
            <p>Unable to compare your fund's performance with the FD rate due to insufficient data.</p>
          </div>
        `;
      }
    } catch (error) {
      console.error('FD comparison error:', error);
      handleApiError(error, 'Comparing with FD rate');
      resultContainer.innerHTML = `
        <div class="error-message">
          <p>Failed to compare with FD rate. Please try again later.</p>
        </div>
      `;
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

  /**
   * Show the add entry form
   */
  showAddEntryForm() {
    if (!this.fund) return;

    // Generate a month key for the current month or next available month
    const currentDate = new Date();
    const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

    // Show the modal with the monthly entry form
    this.showModal(() => {
      const modalContainer = document.getElementById('modal-container');
      if (modalContainer) {
        modalContainer.innerHTML = `
          <div class="modal-header">
            <h2 id="modal-title">Add Monthly Entry</h2>
            <button class="modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-content"></div>
          </div>
        `;

        // Initialize the monthly entry form for creation
        monthlyEntryForm.initNew(
          this.fund.id,
          currentMonth,
          (data) => {
            // Success callback - refresh fund data and close modal
            this.hideModal();
            this.loadData(this.fund.id);
            // Show success message
            window.dispatchEvent(new CustomEvent('showToast', {
              detail: {
                message: 'Monthly entry added successfully',
                type: 'success'
              }
            }));
          },
          () => {
            // Cancel callback - just close modal
            this.hideModal();
          }
        );

        // Add event listener for close button
        const closeButton = modalContainer.querySelector('.modal-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            this.hideModal();
          });
        }

        // Add event listener for overlay click to close
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
          modalOverlay.addEventListener('click', e => {
            if (e.target === modalOverlay) {
              this.hideModal();
            }
          });
        }
      }
    });
  }

  /**
   * Show the edit entry form
   * @param {string} entryId - The ID of the entry to edit
   */
  showEditEntryForm(entryId) {
    if (!this.fund) return;

    // Show the modal with the monthly entry form
    this.showModal(() => {
      const modalContainer = document.getElementById('modal-container');
      if (modalContainer) {
        modalContainer.innerHTML = `
          <div class="modal-header">
            <h2 id="modal-title">Edit Monthly Entry</h2>
            <button class="modal-close" aria-label="Close">&times;</button>
          </div>
          <div class="modal-body">
            <div class="modal-content"></div>
          </div>
        `;

        // Initialize the monthly entry form for editing
        monthlyEntryForm.initEdit(
          entryId,
          (data) => {
            // Success callback - refresh fund data and close modal
            this.hideModal();
            this.loadData(this.fund.id);
            // Show success message
            window.dispatchEvent(new CustomEvent('showToast', {
              detail: {
                message: 'Monthly entry updated successfully',
                type: 'success'
              }
            }));
          },
          () => {
            // Cancel callback - just close modal
            this.hideModal();
          }
        );

        // Add event listener for close button
        const closeButton = modalContainer.querySelector('.modal-close');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            this.hideModal();
          });
        }

        // Add event listener for overlay click to close
        const modalOverlay = document.getElementById('modal-overlay');
        if (modalOverlay) {
          modalOverlay.addEventListener('click', e => {
            if (e.target === modalOverlay) {
              this.hideModal();
            }
          });
        }
      }
    });
  }

  /**
   * Show modal dialog
   * @param {Function} contentCallback - Function to render modal content
   */
  showModal(contentCallback) {
    // Create modal overlay if it doesn't exist
    let modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) {
      modalOverlay = document.createElement('div');
      modalOverlay.id = 'modal-overlay';
      modalOverlay.className = 'modal-overlay';
      modalOverlay.setAttribute('role', 'dialog');
      modalOverlay.setAttribute('aria-modal', 'true');
      modalOverlay.setAttribute('aria-labelledby', 'modal-title');
      document.body.appendChild(modalOverlay);
    }

    // Create modal container if it doesn't exist
    let modalContainer = document.getElementById('modal-container');
    if (!modalContainer) {
      modalContainer = document.createElement('div');
      modalContainer.id = 'modal-container';
      modalContainer.className = 'modal-container';
      modalOverlay.appendChild(modalContainer);
    }

    // Create focus trap
    this.focusTrap = createFocusTrap(modalContainer);

    // Add close event for overlay click
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) {
        this.hideModal();
      }
    });

    // Add escape key handler
    const escapeHandler = e => {
      if (e.key === 'Escape') {
        this.hideModal();
        document.removeEventListener('keydown', escapeHandler);
      }
    };
    document.addEventListener('keydown', escapeHandler);

    // Store the element that opened the modal for focus return
    this.lastFocusedElement = document.activeElement;

    // Show modal
    modalOverlay.style.display = 'flex';

    // Activate focus trap
    this.focusTrap.activate();

    // Render content
    if (contentCallback) {
      contentCallback();
    }
  }

  /**
   * Hide modal dialog
   */
  hideModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.style.display = 'none';

      // Deactivate focus trap
      if (this.focusTrap) {
        this.focusTrap.deactivate();
      }

      // Return focus to the element that opened the modal
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
      }
    }
  }
}

// Export singleton instance
export const fundDetail = new FundDetail();
