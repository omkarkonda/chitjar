/**
 * Dashboard Component for ChitJar Frontend
 *
 * This component displays the user's dashboard with total profit and fund performance chart.
 * The chart is responsive on small screens and print-friendly.
 */

import { apiClient } from '../lib/apiClient.js';
import { formatINR } from '../lib/formatters.js';
import { createBarChart, formatChartData } from './Charts.js';
import { handleApiError } from '../lib/errorHandler.js';

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
    // Check if user is authenticated before trying to load data
    if (!apiClient.isAuthenticated()) {
      this.error = 'You must be logged in to view the dashboard';
      this.isLoading = false;
      this.render();
      return;
    }

    this.isLoading = true;
    this.error = null;

    try {
      const response = await apiClient.get('/analytics/dashboard');
      this.totalProfit = response.data.total_profit || 0;
      this.funds = response.data.funds || [];
    } catch (error) {
      // Handle authentication errors specifically
      if (error.message && error.message.includes('Invalid access token')) {
        this.error = 'Your session has expired. Please log in again.';
        // Clear the invalid token
        apiClient.clearToken();
        // Dispatch a logout event to redirect to login
        window.dispatchEvent(new CustomEvent('logout'));
      } else {
        handleApiError(error, 'Loading dashboard data', { silent: true });
        this.error = error.message || 'Failed to load dashboard data';
      }
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
      // Already showing loading state from app.js, no need to re-render
      return;
    }

    if (this.error) {
      container.innerHTML = this.renderErrorState();
      // Add event listener for retry button
      const retryButton = container.querySelector('#retry-dashboard');
      if (retryButton) {
        retryButton.addEventListener('click', () => {
          this.loadData();
        });
      }
      return;
    }

    // Render the dashboard content
    container.innerHTML = this.renderDashboard();
    
    // Use a slight delay to ensure DOM is fully ready before rendering chart
    setTimeout(() => {
      this.renderChart();
    }, 0);
  }

  /**
   * Render the error state
   */
  renderErrorState() {
    return `
      <div class="dashboard__stats">
        <div class="stat-card">
          <h3>Total Profit</h3>
          <p class="stat-value">₹0</p>
        </div>
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
      <div class="dashboard__stats">
        <div class="stat-card">
          <h3>Total Profit</h3>
          <p class="stat-value ${this.totalProfit >= 0 ? 'stat-value--positive' : 'stat-value--negative'}">
            ${formatINR(this.totalProfit)}
          </p>
        </div>
      </div>
      
      <div class="dashboard__chart-container">
        <div class="chart-header">
          <h3>Fund vs Profit</h3>
          <div class="chart-actions">
            <button class="btn btn--icon chart-fullscreen" aria-label="Expand chart" title="Expand chart">
              <span class="icon-fullscreen">⛶</span>
            </button>
          </div>
        </div>
        ${this.funds.length > 0
          ? `
          <div class="chart-wrapper">
            <canvas id="fund-profit-chart" class="chart-canvas" role="img" aria-label="Bar chart showing profit for each fund"></canvas>
            <div class="chart-data-table" role="region" aria-labelledby="chart-data-label" tabindex="0">
              <h4 id="chart-data-label" class="sr-only">Fund vs Profit Data Table</h4>
              ${this.renderChartDataTable()}
            </div>
          </div>
          `
          : this.renderEmptyChartState()
        }
      </div>
    `;
  }

  /**
   * Render the chart data table for accessibility
   */
  renderChartDataTable() {
    return `
      <table class="data-table">
        <thead>
          <tr>
            <th scope="col">Fund Name</th>
            <th scope="col">Profit (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${this.funds.map(fund => `
            <tr>
              <td>${fund.fund_name || 'Unnamed Fund'}</td>
              <td>${formatINR(fund.total_profit || 0)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
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
    if (!this.funds || this.funds.length === 0) {
      console.log('No funds to display in chart');
      return;
    }

    const canvas = document.getElementById('fund-profit-chart');
    if (!canvas) {
      console.log('Canvas element not found');
      return;
    }

    // Ensure canvas has dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = canvas.parentElement.clientWidth || 400;
      canvas.height = 300;
    }

    // Prepare chart data
    const labels = this.funds.map(fund => fund.fund_name || 'Unnamed Fund');
    const profits = this.funds.map(fund => fund.total_profit || 0);

    console.log('Chart data:', { labels, profits });

    // Check if we have any non-zero profits to display
    const hasData = profits.some(profit => profit !== 0);
    if (!hasData && profits.length > 0) {
      console.log('All profits are zero, but still showing chart with funds');
    }

    // Create color array based on profit values (green for positive, red for negative)
    const backgroundColors = profits.map(profit => 
      profit >= 0 ? '#10b981' : '#ef4444'  // green-500 for profit, red-500 for loss
    );

    const chartData = formatChartData(labels, [
      {
        label: 'Profit (₹)',
        data: profits,
        backgroundColor: backgroundColors,
        borderColor: profits.map(() => '#ffffff'),
        borderWidth: 2,
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
              size: window.innerWidth < 768 ? 10 : 12
            }
          },
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              // Format Y-axis values as INR
              return '₹' + formatINR(value, 0);
            },
            font: {
              size: window.innerWidth < 768 ? 10 : 12
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.1)'
          }
        },
      },
      plugins: {
        legend: {
          display: false
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
            }
          },
        },
      },
      // Animation configuration for smoother transitions
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      },
      // Interaction configuration
      interaction: {
        mode: 'index',
        intersect: false
      }
    };

    // Create the chart
    this.chart = createBarChart('fund-profit-chart', chartData, chartConfig);

    // Add event listeners for chart actions
    this.setupChartEventListeners();

    // Add event listener for retry button if it exists
    const retryButton = document.getElementById('retry-dashboard');
    if (retryButton) {
      retryButton.addEventListener('click', () => {
        this.loadData();
      });
    }
  }

  /**
   * Setup event listeners for chart actions
   */
  setupChartEventListeners() {
    // Fullscreen button
    const fullscreenButton = document.querySelector('.chart-fullscreen');
    if (fullscreenButton) {
      fullscreenButton.addEventListener('click', () => {
        this.toggleChartFullscreen();
      });
    }

    // Handle window resize for responsive chart
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  /**
   * Toggle chart fullscreen mode
   */
  toggleChartFullscreen() {
    const chartContainer = document.querySelector('.dashboard__chart-container');
    const fullscreenButton = document.querySelector('.chart-fullscreen');
    
    if (!chartContainer || !fullscreenButton) return;
    
    if (document.fullscreenElement) {
      // Exit fullscreen
      document.exitFullscreen();
      fullscreenButton.innerHTML = '<span class="icon-fullscreen">⛶</span>';
      fullscreenButton.setAttribute('title', 'Expand chart');
      fullscreenButton.setAttribute('aria-label', 'Expand chart');
    } else {
      // Enter fullscreen
      chartContainer.requestFullscreen();
      fullscreenButton.innerHTML = '<span class="icon-fullscreen">⛶</span>';
      fullscreenButton.setAttribute('title', 'Exit fullscreen');
      fullscreenButton.setAttribute('aria-label', 'Exit fullscreen');
    }
  }

  /**
   * Handle window resize for responsive chart
   */
  handleResize() {
    if (this.chart) {
      // Update chart to fit new container size
      this.chart.resize();
    }
  }
}

// Export singleton instance
export const dashboard = new Dashboard();
