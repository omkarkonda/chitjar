/**
 * Dashboard Component for ChitJar Frontend
 *
 * This component displays the user's dashboard with total profit and fund performance chart.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';
import { createBarChart, formatChartData } from './Charts.js';

class Dashboard {
  constructor() {
    this.totalProfit = 0;
    this.funds = [];
    this.chart = null;
    this.isLoading = false;
    this.error = null;
  }

  /**
   * Load dashboard data from the API
   */
  async loadData() {
    this.isLoading = true;
    this.error = null;

    try {
      const response = await apiClient.get('/analytics/dashboard');
      this.totalProfit = response.data.total_profit || 0;
      this.funds = response.data.funds || [];
    } catch (error) {
      this.error = error.message || 'Failed to load dashboard data';
      console.error('Dashboard data load error:', error);
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  /**
   * Render the dashboard component
   */
  render() {
    const container = document.querySelector('.dashboard');
    if (!container) return;

    if (this.isLoading) {
      container.innerHTML = this.renderLoadingState();
      return;
    }

    if (this.error) {
      container.innerHTML = this.renderErrorState();
      return;
    }

    container.innerHTML = this.renderDashboard();
    this.renderChart();
  }

  /**
   * Render the loading state
   */
  renderLoadingState() {
    return `
      <div class="dashboard__header">
        <h2>Dashboard</h2>
      </div>
      
      <div class="dashboard__stats">
        <div class="stat-card">
          <h3>Total Profit</h3>
          <div class="loading__skeleton stat-value-skeleton"></div>
        </div>
      </div>
      
      <div class="dashboard__chart-container">
        <div class="chart-header">
          <h3>Fund vs Profit</h3>
        </div>
        <div class="chart-placeholder">
          <div class="loading__skeleton chart-skeleton"></div>
        </div>
      </div>
    `;
  }

  /**
   * Render the error state
   */
  renderErrorState() {
    return `
      <div class="dashboard__header">
        <h2>Dashboard</h2>
      </div>
      
      <div class="dashboard__error">
        <div class="error">
          <p>Error loading dashboard data: ${this.error}</p>
          <button class="btn btn--primary" id="retry-dashboard">Retry</button>
        </div>
      </div>
    `;
  }

  /**
   * Render the dashboard content
   */
  renderDashboard() {
    return `
      <div class="dashboard__header">
        <h2>Dashboard</h2>
      </div>
      
      <div class="dashboard__stats">
        <div class="stat-card">
          <h3>Total Profit</h3>
          <p class="stat-value">${formatINR(this.totalProfit)}</p>
        </div>
      </div>
      
      <div class="dashboard__chart-container">
        <div class="chart-header">
          <h3>Fund vs Profit</h3>
        </div>
        ${
          this.funds.length > 0
            ? '<canvas id="fund-profit-chart" class="chart-canvas"></canvas>'
            : this.renderEmptyChartState()
        }
      </div>
    `;
  }

  /**
   * Render the empty chart state
   */
  renderEmptyChartState() {
    return `
      <div class="chart-placeholder">
        <p>No funds available to display. Add your first fund to see chart data.</p>
      </div>
    `;
  }

  /**
   * Render the fund vs profit chart
   */
  renderChart() {
    // Clean up existing chart if it exists
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }

    // Don't render chart if no funds or container doesn't exist
    if (this.funds.length === 0) return;

    const canvas = document.getElementById('fund-profit-chart');
    if (!canvas) return;

    // Prepare chart data
    const labels = this.funds.map(fund => fund.fund_name);
    const profits = this.funds.map(fund => fund.total_profit);

    const chartData = formatChartData(labels, [
      {
        label: 'Profit (₹)',
        data: profits,
        backgroundColor: [
          '#3b82f6', // blue-500
          '#10b981', // green-500
          '#f59e0b', // amber-500
          '#ef4444', // red-500
          '#8b5cf6', // violet-500
          '#ec4899', // pink-500
        ],
      },
    ]);

    // Create the chart
    this.chart = createBarChart('fund-profit-chart', chartData, {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              // Format Y-axis values as INR
              return '₹' + formatINR(value, 0);
            },
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              // Format tooltip values as INR
              return (
                context.dataset.label + ': ₹' + formatINR(context.parsed.y)
              );
            },
          },
        },
      },
    });

    // Add event listener for retry button if it exists
    const retryButton = document.getElementById('retry-dashboard');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.loadData();
      });
    }
  }
}

// Export singleton instance
export const dashboard = new Dashboard();
