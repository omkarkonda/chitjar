/**
 * Insights Component for ChitJar Frontend
 *
 * This component displays strategic bidding insights including historical bidding trends,
 * borrower vs investor guidance, and projected payouts.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';

class Insights {
  constructor() {
    this.insights = [];
    this.isLoading = false;
    this.error = null;
    this.chart = null;
  }

  /**
   * Load insights data from the API
   */
  async loadData() {
    // Check if user is authenticated before trying to load data
    if (!apiClient.isAuthenticated()) {
      this.error = 'You must be logged in to view insights';
      this.isLoading = false;
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const response = await apiClient.get('/analytics/insights');
      this.insights = response.data.insights || [];
    } catch (error) {
      // Handle authentication errors specifically
      if (error.message && error.message.includes('Invalid access token')) {
        this.error = 'Your session has expired. Please log in again.';
        // Clear the invalid token
        apiClient.clearToken();
        // Dispatch a logout event to redirect to login
        window.dispatchEvent(new CustomEvent('logout'));
      } else {
        this.error = error.message || 'Failed to load insights data';
      }
      console.error('Insights data load error:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Render the insights component
   */
  render() {
    const container = document.querySelector('.main');
    if (!container) return;

    if (this.isLoading) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    if (this.error) {
      container.innerHTML = this.renderErrorState();
      // Add event listener for retry button
      const retryButton = container.querySelector('#retry-insights');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.loadData();
        });
      }
      return;
    }

    // Render the insights
    container.innerHTML = this.renderInsights();

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Render the loading state
   */
  renderLoadingState() {
    return `
      <div class="insights">
        <div class="insights__header">
          <div class="loading__skeleton insights-header-skeleton"></div>
        </div>
        
        <div class="insights__content">
          <div class="loading__skeleton insights-content-skeleton"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render the error state
   */
  renderErrorState() {
    return `
      <div class="insights">
        <div class="insights__error">
          <div class="error">
            <p>Error loading insights data: ${this.error}</p>
            <button class="btn btn--primary" id="retry-insights">Retry</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the insights
   */
  renderInsights() {
    return `
      <div class="insights">
        <div class="insights__header">
          <h2>Strategic Insights</h2>
          <p>Historical bidding trends and guidance for borrowers vs investors</p>
        </div>
        
        ${this.renderGuidanceSection()}
        
        ${this.renderHistoricalTrends()}
        
        ${this.renderProjectedPayouts()}
      </div>
    `;
  }

  /**
   * Render the guidance section
   */
  renderGuidanceSection() {
    return `
      <div class="insights__section">
        <h3>Borrower vs Investor Guidance</h3>
        <div class="insights__guidance">
          <div class="guidance-card">
            <h4>For Borrowers</h4>
            <ul>
              <li>Winning a bid early can reduce your effective interest rate</li>
              <li>Consider bidding slightly above the average discount to improve chances</li>
              <li>Monitor trends to time your bid strategically</li>
            </ul>
          </div>
          
          <div class="guidance-card">
            <h4>For Investors</h4>
            <ul>
              <li>Average dividends provide steady returns throughout the chit period</li>
              <li>Late bids typically have higher discounts but lower chances of winning</li>
              <li>Diversify across multiple chit funds to reduce risk</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render historical trends section
   */
  renderHistoricalTrends() {
    if (!this.insights || this.insights.length === 0) {
      return `
        <div class="insights__section">
          <h3>Historical Bidding Trends</h3>
          <div class="insights__empty">
            <p>No bidding data available yet. Add some bids to see historical trends.</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="insights__section">
        <h3>Historical Bidding Trends</h3>
        <div class="insights__trends">
          ${this.renderTrendsByFund()}
        </div>
      </div>
    `;
  }

  /**
   * Render trends by fund
   */
  renderTrendsByFund() {
    return this.insights
      .map(fundInsight => {
        return `
        <div class="fund-trends" data-fund-id="${fundInsight.fund_id}">
          <div class="fund-trends__header">
            <h4>${fundInsight.fund_name}</h4>
            <div class="fund-trends__metrics">
              <div class="metric">
                <span class="metric__label">Avg Discount</span>
                <span class="metric__value">${formatINR(fundInsight.average_discount)}</span>
              </div>
              <div class="metric">
                <span class="metric__label">Avg Winning Bid</span>
                <span class="metric__value">${formatINR(fundInsight.average_winning_bid)}</span>
              </div>
              <div class="metric">
                <span class="metric__label">Total Bids</span>
                <span class="metric__value">${fundInsight.bid_count}</span>
              </div>
            </div>
          </div>
          
          ${this.renderLatestBidsTable(fundInsight.latest_bids)}
        </div>
      `;
      })
      .join('');
  }

  /**
   * Render latest bids table
   */
  renderLatestBidsTable(bids) {
    if (!bids || bids.length === 0) {
      return `
        <div class="bids-table__empty">
          <p>No bids recorded for this fund yet.</p>
        </div>
      `;
    }

    return `
      <div class="bids-table">
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th>Winning Bid</th>
              <th>Discount</th>
              <th>Winner</th>
            </tr>
          </thead>
          <tbody>
            ${bids
              .map(
                bid => `
              <tr>
                <td>${bid.month_key}</td>
                <td>${formatINR(bid.winning_bid)}</td>
                <td>${formatINR(bid.discount_amount)}</td>
                <td>${bid.bidder_name || 'N/A'}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Render projected payouts section
   */
  renderProjectedPayouts() {
    return `
      <div class="insights__section">
        <h3>Projected Payouts</h3>
        <div class="insights__projections">
          <div class="projection-card">
            <h4>Dividend Projections</h4>
            <p>Based on historical averages, you can expect:</p>
            <ul>
              <li>Monthly dividends of ₹800-1,200 per ₹10,000 installment</li>
              <li>Total dividends of ₹9,600-14,400 per ₹1,00,000 chit fund annually</li>
            </ul>
          </div>
          
          <div class="projection-card">
            <h4>Bid Strategy</h4>
            <p>To improve your chances of winning:</p>
            <ul>
              <li>Bid early for lower competition but higher effective cost</li>
              <li>Bid late for higher discounts but lower winning probability</li>
              <li>Monitor trends to find the optimal bidding window</li>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Add event listeners
   */
  addEventListeners() {
    // No specific event listeners needed for this component yet
  }
}

// Export singleton instance
export const insights = new Insights();
