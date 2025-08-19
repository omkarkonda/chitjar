/**
 * Insights Component for ChitJar Frontend
 *
 * This component displays strategic bidding insights including historical bidding trends,
 * borrower vs investor guidance, and projected payouts.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';
import { createLineChart, formatChartData } from './Charts.js';

class Insights {
  constructor() {
    this.insights = [];
    this.isLoading = false;
    this.error = null;
    this.charts = new Map(); // Store chart instances by fund ID
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

    // Render charts after DOM is updated
    this.renderChartsAfterDOM();

    // Add event listeners
    this.addEventListeners();
  }

  /**
   * Render charts after DOM is updated
   */
  renderChartsAfterDOM() {
    // Clean up existing charts
    this.charts.forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.charts.clear();

    // Only render charts if we have insights data
    if (!this.insights || this.insights.length === 0) {
      return;
    }

    // Use a slight delay to ensure DOM is fully ready before rendering charts
    setTimeout(() => {
      this.insights.forEach(fundInsight => {
        this.renderWinningBidChart(fundInsight);
        this.renderDiscountChart(fundInsight);
      });
    }, 0);
  }

  /**
   * Render winning bid trend chart for a fund
   */
  renderWinningBidChart(fundInsight) {
    // Don't render chart if not enough data or container doesn't exist
    if (!fundInsight.latest_bids || fundInsight.latest_bids.length < 2) {
      return;
    }

    const canvasId = `winning-bid-chart-${fundInsight.fund_id}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return;
    }

    // Ensure canvas has dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = canvas.parentElement.clientWidth || 400;
      canvas.height = 200;
    }

    // Prepare chart data (reverse to show oldest first)
    const bids = [...fundInsight.latest_bids].reverse();
    const labels = bids.map(bid => bid.month_key);
    const winningBids = bids.map(bid => bid.winning_bid);

    const chartData = formatChartData(labels, [
      {
        label: 'Winning Bid (₹)',
        data: winningBids,
        borderColor: '#3b82f6', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      },
    ]);

    // Create responsive chart configuration
    const chartConfig = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: window.innerWidth < 768 ? 10 : 12,
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              // Format Y-axis values as INR
              return '₹' + formatINR(value, 0);
            },
            font: {
              size: window.innerWidth < 768 ? 10 : 12,
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#1f2937',
          bodyColor: '#1f2937',
          borderColor: '#d1d5db',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function (context) {
              // Format tooltip values as INR
              return (
                context.dataset.label + ': ₹' + formatINR(context.parsed.y)
              );
            },
            title: function (context) {
              return context[0].label;
            },
          },
        },
      },
      // Animation configuration for smoother transitions
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      // Interaction configuration
      interaction: {
        mode: 'index',
        intersect: false,
      },
    };

    // Create the chart
    const chart = createLineChart(canvasId, chartData, chartConfig);
    if (chart) {
      this.charts.set(`${fundInsight.fund_id}-winning-bid`, chart);
    }
  }

  /**
   * Render discount trend chart for a fund
   */
  renderDiscountChart(fundInsight) {
    // Don't render chart if not enough data or container doesn't exist
    if (!fundInsight.latest_bids || fundInsight.latest_bids.length < 2) {
      return;
    }

    const canvasId = `discount-chart-${fundInsight.fund_id}`;
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      return;
    }

    // Ensure canvas has dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = canvas.parentElement.clientWidth || 400;
      canvas.height = 200;
    }

    // Prepare chart data (reverse to show oldest first)
    const bids = [...fundInsight.latest_bids].reverse();
    const labels = bids.map(bid => bid.month_key);
    const discounts = bids.map(bid => bid.discount_amount);

    const chartData = formatChartData(labels, [
      {
        label: 'Discount Amount (₹)',
        data: discounts,
        borderColor: '#10b981', // green-500
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.3,
      },
    ]);

    // Create responsive chart configuration
    const chartConfig = {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          ticks: {
            autoSkip: false,
            maxRotation: 45,
            minRotation: 0,
            font: {
              size: window.innerWidth < 768 ? 10 : 12,
            },
          },
          grid: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              // Format Y-axis values as INR
              return '₹' + formatINR(value, 0);
            },
            font: {
              size: window.innerWidth < 768 ? 10 : 12,
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)',
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#1f2937',
          bodyColor: '#1f2937',
          borderColor: '#d1d5db',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function (context) {
              // Format tooltip values as INR
              return (
                context.dataset.label + ': ₹' + formatINR(context.parsed.y)
              );
            },
            title: function (context) {
              return context[0].label;
            },
          },
        },
      },
      // Animation configuration for smoother transitions
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      // Interaction configuration
      interaction: {
        mode: 'index',
        intersect: false,
      },
    };

    // Create the chart
    const chart = createLineChart(canvasId, chartData, chartConfig);
    if (chart) {
      this.charts.set(`${fundInsight.fund_id}-discount`, chart);
    }
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
          
          ${this.renderTrendCharts(fundInsight)}
          
          ${this.renderLatestBidsTable(fundInsight.latest_bids)}
        </div>
      `;
      })
      .join('');
  }

  /**
   * Render trend charts for a fund
   */
  renderTrendCharts(fundInsight) {
    // Only render charts if we have enough data
    if (!fundInsight.latest_bids || fundInsight.latest_bids.length < 2) {
      return '';
    }

    return `
      <div class="fund-trends__charts">
        <div class="chart-container">
          <h5>Winning Bid Trend</h5>
          <div class="chart-wrapper">
            <canvas id="winning-bid-chart-${fundInsight.fund_id}" class="chart-canvas" role="img" aria-label="Line chart showing winning bid trend over time"></canvas>
          </div>
        </div>
        <div class="chart-container">
          <h5>Discount Amount Trend</h5>
          <div class="chart-wrapper">
            <canvas id="discount-chart-${fundInsight.fund_id}" class="chart-canvas" role="img" aria-label="Line chart showing discount amount trend over time"></canvas>
          </div>
        </div>
      </div>
    `;
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
