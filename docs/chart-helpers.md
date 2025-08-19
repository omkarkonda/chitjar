# Chart.js Helpers for ChitJar

This document describes the Chart.js helper functions and configurations used in the ChitJar application to standardize chart appearance, colors, and formatting.

## Color Palette

The application uses an accessible color palette that has been tested for color blindness friendliness:

### Primary Colors
- `primary`: #2E7D32 (Green) - Main brand color
- `secondary`: #1565C0 (Blue) - Secondary brand color
- `accent`: #EF6C00 (Orange) - Accent color
- `warning`: #F57C00 (Orange) - Warning color
- `danger`: #D32F2F (Red) - Danger/error color
- `success`: #388E3C (Green) - Success color

### Neutral Colors
- `background`: #FFFFFF (White) - Chart background
- `grid`: #E0E0E0 (Light gray) - Grid lines
- `border`: #9E9E9E (Gray) - Axis borders
- `text`: #212121 (Dark gray) - Text color
- `textLight`: #757575 (Medium gray) - Light text color

### Data Series Colors
The application provides 12 distinct colors for data series:
1. `series1`: #2E7D32 (Green)
2. `series2`: #1565C0 (Blue)
3. `series3`: #EF6C00 (Orange)
4. `series4`: #7B1FA2 (Purple)
5. `series5`: #C2185B (Pink)
6. `series6`: #388E3C (Light green)
7. `series7`: #0288D1 (Light blue)
8. `series8`: #F57C00 (Light orange)
9. `series9`: #8E24AA (Purple)
10. `series10`: #00897B (Teal)
11. `series11`: #F4511E (Deep Orange)
12. `series12`: #546E7A (Blue Gray)

### Color Schemes
Predefined color schemes for specific use cases:
- `profitLoss`: Green for profit, Red for loss
- `sequential`: For data that progresses from low to high
- `diverging`: For data that diverges from a central point
- `categorical`: For distinct categories

## Chart Configurations

### Base Configuration
The `baseChartConfig` provides default settings for all charts:
- Responsive design with maintained aspect ratio
- Themed legend with Roboto font
- Tooltips with currency formatting using Indian digit grouping
- Scales with appropriate fonts and grid lines
- Smooth animations and optimized interactions

### Chart-Specific Configurations
- `barChartConfig`: Optimized for bar charts with appropriate thickness and spacing
- `lineChartConfig`: Optimized for line charts with smooth curves and point styling

## Chart Factories

### createBarChart(canvasId, data, options)
Creates a bar chart with standardized styling.

### createLineChart(canvasId, data, options)
Creates a line chart with smooth curves and point styling.

### createPieChart(canvasId, data, options)
Creates a pie chart with legend positioned to the right.

### createDoughnutChart(canvasId, data, options)
Creates a doughnut chart with customizable cutout.

## Utility Functions

### formatChartData(labels, datasets)
Formats chart data with standardized colors and styling.

### formatChartDataWithScheme(labels, datasets, colorScheme)
Formats chart data using a specific color scheme.

### destroyChart(chartInstance)
Destroys a chart instance to prevent memory leaks.

### updateChartData(chartInstance, newData)
Updates chart data and refreshes the display.

### formatAxisCurrency(value, decimals)
Formats axis values as Indian currency with digit grouping.

### formatAxisPercentage(value)
Formats axis values as percentages.

### formatAxisDate(value)
Formats axis values as dates in DD/MMM/YYYY format.

## Usage Examples

### Creating a Bar Chart
```javascript
import { createBarChart, formatChartData } from './Charts.js';

const labels = ['Fund A', 'Fund B', 'Fund C'];
const data = [10000, 15000, 12000];

const chartData = formatChartData(labels, [{
  label: 'Profit (₹)',
  data: data
}]);

const chart = createBarChart('myChart', chartData);
```

### Creating a Line Chart with Custom Options
```javascript
import { createLineChart, formatChartData } from './Charts.js';

const labels = ['Jan', 'Feb', 'Mar', 'Apr'];
const data = [1000, 1500, 1200, 1800];

const chartData = formatChartData(labels, [{
  label: 'Monthly Dividends',
  data: data,
  borderColor: '#2E7D32',
  backgroundColor: 'rgba(46, 125, 50, 0.1)'
}]);

const chart = createLineChart('dividendChart', chartData, {
  scales: {
    y: {
      beginAtZero: true
    }
  }
});
```

## Best Practices

1. Always use the provided chart factories instead of creating Chart instances directly
2. Format data using `formatChartData` or `formatChartDataWithScheme` for consistent styling
3. Destroy chart instances when components are unmounted to prevent memory leaks
4. Use appropriate color schemes for different types of data
5. Format axis values using the provided formatting functions for consistency
6. Ensure charts are responsive by using the base configuration
7. Test charts with different data sets to ensure proper display