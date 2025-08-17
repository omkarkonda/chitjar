/**
 * Funds List Component for ChitJar Frontend
 *
 * This component displays a list of funds as cards with key metrics.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';

class FundsList {
  constructor() {
    this.funds = [];
    this.isLoading = false;
    this.error = null;
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

      // For each fund, fetch entries to calculate progress
      for (const fund of this.funds) {
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
        }
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
      // Already showing loading state from app.js, no need to re-render
      return;
    }

    if (this.error) {
      container.innerHTML = this.renderErrorState();
      // Add event listener for retry button
      const retryButton = container.querySelector('#retry-funds');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.loadData();
        });
      }
      return;
    }

    // Render the funds list
    container.innerHTML = this.renderFundsList();

    // Add event listeners for fund cards
    this.addFundCardEventListeners();
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
    return `
      <div class="funds__header">
        <h2>My Funds</h2>
      </div>
      
      ${
        this.funds.length > 0
          ? `<div class="funds__grid">
          ${this.funds.map(fund => this.renderFundCard(fund)).join('')}
        </div>`
          : this.renderEmptyState()
      }
    `;
  }

  /**
   * Render a fund card
   */
  renderFundCard(fund) {
    // Ensure progress object exists
    const progress = fund.progress || { paid: 0, total: fund.total_months || 0, percentage: 0 };
    
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
  }
}

// Export singleton instance
export const fundsList = new FundsList();
