// src/styles/semanticColors.js
// Semantic color constants for consistent theming across all dashboards

/**
 * Semantic colors for financial data visualization
 * Use these instead of hardcoded hex values for consistency
 */
export const colors = {
  // Positive / Bullish / Growth
  positive: '#22c55e',
  positiveLight: '#4ade80',
  positiveDark: '#16a34a',

  // Negative / Bearish / Decline
  negative: '#ef4444',
  negativeLight: '#f87171',
  negativeDark: '#dc2626',

  // Warning / Caution / Neutral
  warning: '#fbbf24',
  warningLight: '#fcd34d',
  warningDark: '#f59e0b',

  // Informational / Neutral
  info: '#3b82f6',
  infoLight: '#60a5fa',
  infoDark: '#2563eb',

  // Accent colors for specific data types
  accent: {
    purple: '#a78bfa',
    teal: '#14b8a6',
    orange: '#fb923c',
    pink: '#f472b6',
    indigo: '#818cf8',
    cyan: '#22d3ee',
    lime: '#a3e635',
  },

  // Gradient colors for charts
  gradient: {
    positive: 'rgba(34, 197, 94, 0.1)',
    negative: 'rgba(239, 68, 68, 0.1)',
    neutral: 'rgba(167, 139, 250, 0.1)',
  },
};

/**
 * Get color based on numeric value (for spreads, changes, etc.)
 * @param {number} value - The value to evaluate
 * @param {object} options - Configuration options
 * @param {number} options.positiveThreshold - Value above which is positive (default: 0)
 * @param {number} options.negativeThreshold - Value below which is negative (default: 0)
 * @param {boolean} options.inverted - Invert positive/negative (for spreads where low is good)
 * @returns {string} - Hex color
 */
export function getValueColor(value, options = {}) {
  const { positiveThreshold = 0, negativeThreshold = 0, inverted = false } = options;

  if (value == null) return colors.info;

  if (inverted) {
    if (value < negativeThreshold) return colors.negative;
    if (value > positiveThreshold) return colors.positive;
    return colors.warning;
  }

  if (value > positiveThreshold) return colors.positive;
  if (value < negativeThreshold) return colors.negative;
  return colors.warning;
}

/**
 * Get color for spread/OAS values (inverted - lower is better)
 * @param {number} spread - Spread in basis points
 * @param {number} warningThreshold - Warning threshold (default: 100 for IG, 250 for HY)
 * @param {number} dangerThreshold - Danger threshold (default: 150 for IG, 400 for HY)
 * @returns {string} - Hex color
 */
export function getSpreadColor(spread, warningThreshold = 100, dangerThreshold = 150) {
  if (spread == null) return colors.info;
  if (spread >= dangerThreshold) return colors.negative;
  if (spread >= warningThreshold) return colors.warning;
  return colors.positive;
}

/**
 * Get color for yield/interest rate changes
 * @param {number} change - Change in basis points or percentage
 * @returns {string} - Hex color
 */
export function getYieldChangeColor(change) {
  if (change == null) return colors.info;
  if (change > 0) return colors.negative; // Rising yields = bearish for bonds
  if (change < 0) return colors.positive; // Falling yields = bullish for bonds
  return colors.warning;
}

/**
 * Get color for VIX/volatility level
 * @param {number} vix - VIX level
 * @returns {string} - Hex color
 */
export function getVixColor(vix) {
  if (vix == null) return colors.info;
  if (vix >= 25) return colors.negative; // High fear
  if (vix >= 18) return colors.warning;   // Elevated
  return colors.positive;                 // Low fear
}

/**
 * Get color for Fear & Greed index (0-100)
 * @param {number} value - Fear & Greed value
 * @returns {string} - Hex color
 */
export function getFearGreedColor(value) {
  if (value == null) return colors.info;
  if (value >= 75) return colors.accent.teal;     // Extreme Greed
  if (value >= 50) return colors.positive;          // Greed
  if (value >= 25) return colors.warning;           // Fear
  return colors.negative;                            // Extreme Fear
}

/**
 * Get color for return/percentage change
 * @param {number} returnPct - Return percentage
 * @returns {string} - Hex color
 */
export function getReturnColor(returnPct) {
  if (returnPct == null) return colors.info;
  if (returnPct >= 0) return colors.positive;
  return colors.negative;
}

/**
 * Chart color palette for multiple series
 */
export const chartPalette = [
  '#60a5fa', // Blue
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#a78bfa', // Purple
  '#14b8a6', // Teal
  '#f472b6', // Pink
  '#fb923c', // Orange
  '#818cf8', // Indigo
  '#22d3ee', // Cyan
];

/**
 * Get chart color by index
 * @param {number} index - Series index
 * @returns {string} - Hex color
 */
export function getChartColor(index) {
  return chartPalette[index % chartPalette.length];
}

export default colors;