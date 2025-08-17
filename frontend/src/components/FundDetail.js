/**
 * Fund Detail Component for ChitJar Frontend
 *
 * This component displays detailed information about a specific fund including
 * KPIs and a list of monthly entries.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR, formatDate } from '../lib/formatters.js';

class FundDetail {
  constructor() {
    this.fund = null;
    this.entries = [];
    this.analytics = null;
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Load fund data from the API
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

      // Fetch fund analytics
      const analyticsResponse = await apiClient.get(
        `/analytics/funds/${fundId}`
      );
      this.analytics = analyticsResponse.data;

      // Fetch entries for this fund
      const entriesResponse = await apiClient.get(`/funds/${fundId}/entries`);
      this.entries = entriesResponse.data.entries || [];

      // Calculate additional metrics
      this.calculateMetrics();
    } catch (error) {
      // Handle authentication errors specifically
      if (error.message && error.message.includes('Invalid access token')) {
        this.error = 'Your session has expired. Please log in again.';
        // Clear the invalid token
        apiClient.clearToken();
        // Dispatch a logout event to redirect to login
        window.dispatchEvent(new CustomEvent('logout'));
      } else {
        this.error = error.message || 'Failed to load fund data';
      }
      console.error('Fund detail load error:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Calculate additional metrics for the fund
   */
  calculateMetrics() {
    if (!this.fund || !this.entries) return;

    // Calculate current profit (sum of all cash flows)
    let currentProfit = 0;
    let totalDividends = 0;
    let paidMonths = 0;

    this.entries.forEach(entry => {
      if (entry.is_paid) {
        paidMonths++;
        const dividend = parseFloat(entry.dividend_amount) || 0;
        const prize = parseFloat(entry.prize_money) || 0;
        const installment = parseFloat(this.fund.installment_amount) || 0;

        // Net cash flow: dividend + prize - installment
        currentProfit += dividend + prize - installment;
        totalDividends += dividend;
      }
    });

    this.currentProfit = currentProfit;
    this.paidMonths = paidMonths;

    // Calculate average monthly dividend
    this.avgMonthlyDividend = paidMonths > 0 ? totalDividends / paidMonths : 0;

    // Calculate months to completion
    this.monthsToCompletion = this.fund.total_months - paidMonths;

    // Calculate ROI
    const totalInstallments =
      paidMonths * (parseFloat(this.fund.installment_amount) || 0);
    this.roi =
      totalInstallments > 0 ? (currentProfit / totalInstallments) * 100 : 0;
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
        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="loading__skeleton kpi-skeleton"></div>
          </div>
          <div class="kpi-card">
            <div class="loading__skeleton kpi-skeleton"></div>
          </div>
          <div class="kpi-card">
            <div class="loading__skeleton kpi-skeleton"></div>
          </div>
          <div class="kpi-card">
            <div class="loading__skeleton kpi-skeleton"></div>
          </div>
        </div>
      </div>
      
      <div class="fund-detail__entries">
        <div class="entries-header">
          <h3>Monthly Entries</h3>
        </div>
        <div class="entries-list">
          <div class="loading__skeleton entries-list-skeleton"></div>
        </div>
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
            <div class="kpi-card__label">Current Profit</div>
            <div class="kpi-card__value">${formatINR(this.currentProfit || 0)}</div>
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
      </div>
    `;
  }

  /**
   * Render the entries list
   */
  renderEntriesList() {
    return `
      <div class="fund-detail__entries">
        <div class="entries-header">
          <h3>Monthly Entries</h3>
          <button class="btn btn--secondary" id="add-entry">Add Entry</button>
        </div>
        <div class="entries-list">
          ${
            this.entries.length > 0
              ? this.entries.map(entry => this.renderEntry(entry)).join('')
              : this.renderEmptyEntries()
          }
        </div>
      </div>
    `;
  }

  /**
   * Render a single entry
   */
  renderEntry(entry) {
    const entryDate = entry.month_key
      ? new Date(entry.month_key + '-01')
      : null;
    const formattedDate = entryDate ? formatDate(entryDate) : entry.month_key;

    return `
      <div class="entry-card" data-entry-id="${entry.id}">
        <div class="entry-card__header">
          <div class="entry-card__date">${formattedDate}</div>
          <div class="entry-card__status ${entry.is_paid ? 'entry-card__status--paid' : 'entry-card__status--unpaid'}">
            ${entry.is_paid ? 'Paid' : 'Unpaid'}
          </div>
        </div>
        <div class="entry-card__details">
          <div class="entry-card__metric">
            <span class="entry-card__metric-label">Dividend</span>
            <span class="entry-card__metric-value">${formatINR(entry.dividend_amount || 0)}</span>
          </div>
          <div class="entry-card__metric">
            <span class="entry-card__metric-label">Prize Money</span>
            <span class="entry-card__metric-value">${formatINR(entry.prize_money || 0)}</span>
          </div>
        </div>
        <div class="entry-card__actions">
          <button class="btn btn--icon edit-entry" data-entry-id="${entry.id}">
            <i class="icon-edit"></i>
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render the empty entries state
   */
  renderEmptyEntries() {
    return `
      <div class="entries-empty">
        <p>No entries yet. Add your first monthly entry to get started!</p>
        <button class="btn btn--primary" id="add-first-entry">Add Entry</button>
      </div>
    `;
  }

  /**
   * Add event listeners to buttons
   */
  addEventListeners() {
    // Add entry button
    const addEntryButton = document.querySelector('#add-entry');
    if (addEntryButton) {
      addEntryButton.addEventListener('click', () => {
        // TODO: Implement add entry functionality
        console.log('Add entry clicked for fund:', this.fund?.id);
      });
    }

    // Add first entry button
    const addFirstEntryButton = document.querySelector('#add-first-entry');
    if (addFirstEntryButton) {
      addFirstEntryButton.addEventListener('click', () => {
        // TODO: Implement add entry functionality
        console.log('Add first entry clicked for fund:', this.fund?.id);
      });
    }

    // Edit entry buttons
    const editEntryButtons = document.querySelectorAll('.edit-entry');
    editEntryButtons.forEach(button => {
      button.addEventListener('click', e => {
        const entryId = e.target.closest('.edit-entry').dataset.entryId;
        // TODO: Implement edit entry functionality
        console.log('Edit entry clicked:', entryId);
      });
    });
  }
}

// Export singleton instance
export const fundDetail = new FundDetail();
