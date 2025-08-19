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
  
  // Additional colors for extended data series
  series9: '#8E24AA', // Purple
  series10: '#00897B', // Teal
  series11: '#F4511E', // Deep Orange
  series12: '#546E7A', // Blue Gray
};

/**
 * Chart color schemes for different types of data
 */
export const chartColorSchemes = {
  // Profit/Loss scheme - Green for profit, Red for loss
  profitLoss: ['#2E7D32', '#D32F2F'],
  
  // Sequential scheme - For data that progresses from low to high
  sequential: ['#E8F5E9', '#C8E6C9', '#A5D6A7', '#81C784', '#66BB6A', '#4CAF50', '#43A047', '#388E3C', '#2E7D32', '#1B5E20'],
  
  // Diverging scheme - For data that diverges from a central point
  diverging: ['#D32F2F', '#EF5350', '#FF8A80', '#FFCCBC', '#E0E0E0', '#BBDEFB', '#90CAF9', '#64B5F6', '#1565C0'],
  
  // Categorical scheme - For distinct categories
  categorical: ['#2E7D32', '#1565C0', '#EF6C00', '#7B1FA2', '#C2185B', '#388E3C', '#0288D1', '#F57C00', '#8E24AA', '#00897B']
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
        // Padding between legend items
        padding: 10,
        // Box width for color indicators
        boxWidth: 12,
      },
      // Position of the legend
      position: 'top',
    },
    tooltip: {
      backgroundColor: chartColors.background,
      titleColor: chartColors.text,
      bodyColor: chartColors.text,
      borderColor: chartColors.border,
      borderWidth: 1,
      padding: 12,
      cornerRadius: 4,
      displayColors: true,
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
        title: function (context) {
          // Format title if it's a date
          if (context[0] && context[0].label) {
            return context[0].label;
          }
          return '';
        }
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
        // Maximum rotation for labels
        maxRotation: 45,
        minRotation: 0,
      },
      grid: {
        color: chartColors.grid,
        drawBorder: true,
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
          // Format Y-axis values as INR with Indian digit grouping
          return formatINR(value);
        },
        // Include currency symbol in ticks
        includeBounds: true,
      },
      grid: {
        color: chartColors.grid,
        drawBorder: true,
      },
      border: {
        color: chartColors.border,
      },
    },
  },
  // Animation configuration
  animation: {
    duration: 500,
    easing: 'easeOutQuart'
  },
  // Interaction configuration
  interaction: {
    mode: 'index',
    intersect: false
  }
};

/**
 * Configuration for bar charts
 */
export const barChartConfig = {
  ...baseChartConfig,
  plugins: {
    ...baseChartConfig.plugins,
    legend: {
      ...baseChartConfig.plugins.legend,
      position: 'top'
    }
  },
  scales: {
    ...baseChartConfig.scales,
    x: {
      ...baseChartConfig.scales.x,
      // Bar thickness configuration
      barThickness: 'flex',
      categoryPercentage: 0.8,
      barPercentage: 0.9
    },
    y: {
      ...baseChartConfig.scales.y,
      beginAtZero: true
    }
  }
};

/**
 * Configuration for line charts
 */
export const lineChartConfig = {
  ...baseChartConfig,
  plugins: {
    ...baseChartConfig.plugins,
    legend: {
      ...baseChartConfig.plugins.legend,
      position: 'top'
    }
  },
  scales: {
    ...baseChartConfig.scales,
    x: {
      ...baseChartConfig.scales.x
    },
    y: {
      ...baseChartConfig.scales.y,
      beginAtZero: false
    }
  },
  elements: {
    line: {
      tension: 0.4, // Smooth curves
      borderWidth: 2
    },
    point: {
      radius: 3,
      hoverRadius: 6,
      hitRadius: 10
    }
  }
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
  // Check if Chart.js is available
  if (typeof Chart === 'undefined' || !Chart) {
    console.error('Chart.js is not available');
    return null;
  }

  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element with ID '${canvasId}' not found`);
    return null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error(`Could not get 2D context for canvas '${canvasId}'`);
    return null;
  }

  // Merge bar chart config with provided options
  const config = {
    type: 'bar',
    data: data,
    options: {
      ...barChartConfig,
      ...options,
    },
  };

  try {
    const chart = new Chart(ctx, config);
    console.log('Bar chart created successfully:', canvasId);
    return chart;
  } catch (error) {
    console.error('Error creating bar chart:', error);
    return null;
  }
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
  if (!ctx) {
    console.error(`Could not get 2D context for canvas '${canvasId}'`);
    return null;
  }

  // Merge line chart config with provided options
  const config = {
    type: 'line',
    data: data,
    options: {
      ...lineChartConfig,
      ...options,
    },
  };

  try {
    const chart = new Chart(ctx, config);
    console.log('Line chart created successfully:', canvasId);
    return chart;
  } catch (error) {
    console.error('Error creating line chart:', error);
    return null;
  }
}

/**
 * Create a pie chart
 *
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data object
 * @param {Object} options - Additional options to override defaults
 * @returns {Chart} Chart instance
 */
export function createPieChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element with ID '${canvasId}' not found`);
    return null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error(`Could not get 2D context for canvas '${canvasId}'`);
    return null;
  }

  // Pie chart specific configuration
  const pieConfig = {
    ...baseChartConfig,
    plugins: {
      ...baseChartConfig.plugins,
      legend: {
        ...baseChartConfig.plugins.legend,
        position: 'right'
      }
    },
    scales: {
      x: undefined, // Pie charts don't have axes
      y: undefined
    }
  };

  const config = {
    type: 'pie',
    data: data,
    options: {
      ...pieConfig,
      ...options,
    },
  };

  try {
    const chart = new Chart(ctx, config);
    console.log('Pie chart created successfully:', canvasId);
    return chart;
  } catch (error) {
    console.error('Error creating pie chart:', error);
    return null;
  }
}

/**
 * Create a doughnut chart
 *
 * @param {string} canvasId - ID of the canvas element
 * @param {Object} data - Chart data object
 * @param {Object} options - Additional options to override defaults
 * @returns {Chart} Chart instance
 */
export function createDoughnutChart(canvasId, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    console.error(`Canvas element with ID '${canvasId}' not found`);
    return null;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error(`Could not get 2D context for canvas '${canvasId}'`);
    return null;
  }

  // Doughnut chart specific configuration
  const doughnutConfig = {
    ...baseChartConfig,
    plugins: {
      ...baseChartConfig.plugins,
      legend: {
        ...baseChartConfig.plugins.legend,
        position: 'right'
      }
    },
    scales: {
      x: undefined, // Doughnut charts don't have axes
      y: undefined
    }
  };

  const config = {
    type: 'doughnut',
    data: data,
    options: {
      ...doughnutConfig,
      ...options,
      cutout: '50%' // Default cutout for doughnut charts
    },
  };

  try {
    const chart = new Chart(ctx, config);
    console.log('Doughnut chart created successfully:', canvasId);
    return chart;
  } catch (error) {
    console.error('Error creating doughnut chart:', error);
    return null;
  }
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
  console.log('Formatting chart data:', { labels, datasets });
  
  const formattedData = {
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
      // Ensure point styling for line charts
      pointBackgroundColor: dataset.pointBackgroundColor || 
        chartColors[`series${index + 1}`] || 
        chartColors.primary,
      pointBorderColor: dataset.pointBorderColor || '#FFFFFF',
      pointBorderWidth: dataset.pointBorderWidth || 1,
      pointRadius: dataset.pointRadius || 3,
      pointHoverRadius: dataset.pointHoverRadius || 6,
    })),
  };
  
  console.log('Formatted chart data:', formattedData);
  return formattedData;
}

/**
 * Format chart data with color scheme
 *
 * @param {Array} labels - X-axis labels
 * @param {Array} datasets - Data series
 * @param {string} colorScheme - Color scheme to use (profitLoss, sequential, diverging, categorical)
 * @returns {Object} Formatted chart data object
 */
export function formatChartDataWithScheme(labels, datasets, colorScheme = 'categorical') {
  const colors = chartColorSchemes[colorScheme] || chartColorSchemes.categorical;
  
  const formattedData = {
    labels: labels,
    datasets: datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor:
        dataset.backgroundColor ||
        colors[index % colors.length],
      borderColor:
        dataset.borderColor ||
        colors[index % colors.length],
      borderWidth: dataset.borderWidth || 2,
      fill: dataset.fill || false,
      pointBackgroundColor: dataset.pointBackgroundColor || 
        colors[index % colors.length],
      pointBorderColor: dataset.pointBorderColor || '#FFFFFF',
      pointBorderWidth: dataset.pointBorderWidth || 1,
      pointRadius: dataset.pointRadius || 3,
      pointHoverRadius: dataset.pointHoverRadius || 6,
    })),
  };
  
  return formattedData;
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

/**
 * Format axis values as Indian currency
 *
 * @param {number} value - Value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency string
 */
export function formatAxisCurrency(value, decimals = 0) {
  // Use the existing formatINR function but allow for decimal places
  return formatINR(value, decimals);
}

/**
 * Format axis values as percentages
 *
 * @param {number} value - Value to format
 * @returns {string} Formatted percentage string
 */
export function formatAxisPercentage(value) {
  return value.toFixed(2) + '%';
}

/**
 * Format axis values as dates
 *
 * @param {string|Date} value - Date value to format
 * @returns {string} Formatted date string
 */
export function formatAxisDate(value) {
  const date = new Date(value);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short'
  });
}
