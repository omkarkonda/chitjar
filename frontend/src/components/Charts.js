/**
 * Chart.js Wrapper Component for ChitJar
 *
 * This module provides a themed wrapper around Chart.js with accessible color palettes,
 * INR currency formatting, and responsive design for mobile and desktop.
 */

import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register Chart.js components
Chart.register(
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  TimeScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Import formatting utilities for INR and date formatting
import { formatINR } from '../lib/formatters.js';

// ============================================================================
// Color Palette Configuration
// ============================================================================

/**
 * Accessible color palette for charts
 * These colors have been tested for accessibility and color blindness friendly
 */
export const chartColors = {
  // Primary colors
  primary: '#2E7D32', // Green - Main brand color
  secondary: '#1565C0', // Blue - Secondary brand color
  accent: '#EF6C00', // Orange - Accent color
  warning: '#F57C00', // Orange - Warning color
  danger: '#D32F2F', // Red - Danger/error color
  success: '#388E3C', // Green - Success color

  // Neutral colors
  background: '#FFFFFF', // White - Chart background
  grid: '#E0E0E0', // Light gray - Grid lines
  border: '#9E9E9E', // Gray - Axis borders
  text: '#212121', // Dark gray - Text color
  textLight: '#757575', // Medium gray - Light text color

  // Data series colors (accessible palette)
  series1: '#2E7D32', // Green
  series2: '#1565C0', // Blue
  series3: '#EF6C00', // Orange
  series4: '#7B1FA2', // Purple
  series5: '#C2185B', // Pink
  series6: '#388E3C', // Light green
  series7: '#0288D1', // Light blue
  series8: '#F57C00', // Light orange
};

// ============================================================================
// Chart Configuration
// ============================================================================

/**
 * Base chart configuration with themed defaults
 */
export const baseChartConfig = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: chartColors.text,
        font: {
          family: "'Roboto', 'Helvetica', 'Arial', sans-serif",
          size: 12,
        },
      },
    },
    tooltip: {
      backgroundColor: chartColors.background,
      titleColor: chartColors.text,
      bodyColor: chartColors.text,
      borderColor: chartColors.border,
      borderWidth: 1,
      padding: 12,
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }

          // Format currency values
          if (context.parsed.y !== null) {
            label += formatINR(context.parsed.y);
          }

          return label;
        },
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: chartColors.textLight,
        font: {
          family: "'Roboto', 'Helvetica', 'Arial', sans-serif",
          size: 11,
        },
      },
      grid: {
        color: chartColors.grid,
      },
      border: {
        color: chartColors.border,
      },
    },
    y: {
      ticks: {
        color: chartColors.textLight,
        font: {
          family: "'Roboto', 'Helvetica', 'Arial', sans-serif",
          size: 11,
        },
        callback: function (value) {
          // Format Y-axis values as INR
          return formatINR(value);
        },
      },
      grid: {
        color: chartColors.grid,
      },
      border: {
        color: chartColors.border,
      },
    },
  },
};

// ============================================================================
// Chart Factories
// ============================================================================

/**
 * Create a bar chart
 *
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data object
 * @param {Object} options - Additional options to override defaults
 * @returns {Chart} Chart instance
 */
export function createBarChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element with ID '${canvasId}' not found`);
    return null;
  }

  const ctx = canvas.getContext('2d');

  // Merge base config with provided options
  const config = {
    type: 'bar',
    data: data,
    options: {
      ...baseChartConfig,
      ...options,
    },
  };

  return new Chart(ctx, config);
}

/**
 * Create a line chart
 *
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data object
 * @param {Object} options - Additional options to override defaults
 * @returns {Chart} Chart instance
 */
export function createLineChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element with ID '${canvasId}' not found`);
    return null;
  }

  const ctx = canvas.getContext('2d');

  // Merge base config with provided options
  const config = {
    type: 'line',
    data: data,
    options: {
      ...baseChartConfig,
      ...options,
    },
  };

  return new Chart(ctx, config);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format chart data for consistent structure
 *
 * @param {Array} labels - X-axis labels
 * @param {Array} datasets - Data series
 * @returns {Object} Formatted chart data object
 */
export function formatChartData(labels, datasets) {
  return {
    labels: labels,
    datasets: datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor:
        dataset.backgroundColor ||
        chartColors[`series${index + 1}`] ||
        chartColors.primary,
      borderColor:
        dataset.borderColor ||
        chartColors[`series${index + 1}`] ||
        chartColors.primary,
      borderWidth: dataset.borderWidth || 2,
      fill: dataset.fill || false,
    })),
  };
}

/**
 * Destroy existing chart instance to prevent memory leaks
 *
 * @param {Chart} chartInstance - Chart instance to destroy
 */
export function destroyChart(chartInstance) {
  if (chartInstance) {
    chartInstance.destroy();
  }
}

/**
 * Update chart data
 *
 * @param {Chart} chartInstance - Chart instance to update
 * @param {Object} newData - New data object
 */
export function updateChartData(chartInstance, newData) {
  if (chartInstance && newData) {
    chartInstance.data = newData;
    chartInstance.update();
  }
}
