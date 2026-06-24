// Panel coverage registry.
//
// Source of truth for "which panels MUST render with content on each tab".
// Adding a new panel? Add a line here. The coverage spec
// (tests/panel-coverage.spec.js) hard-fails when:
//   1. a registered panel is missing
//   2. a registered panel renders empty / PENDING / NO DATA
//   3. an UNREGISTERED panel shows up (so newly-added panels can't ship
//      without being explicitly tracked)
//
// Per-entry fields:
//   title          — exact text content of `.bento-panel-title-row` (required
//                    unless titlePattern given)
//   titlePattern   — RegExp for dynamic titles (e.g. "Detail · AAPL")
//   count          — minimum number of panels with this title (default 1).
//                    Some tabs reuse a title like "Key Metrics" twice.
//   minValues      — minimum meaningful text values inside the panel when no
//                    chart is present (default 1). KPI strips should set this
//                    higher to catch all-em-dash regressions.
//   chartOnly      — true for panels whose only content is a chart (no text
//                    metrics). The presence check still requires a <canvas>
//                    or sized <svg>.
//
// Title matching is case-sensitive and entity-decoded (so register
// "Supply & Demand", not "Supply &amp; Demand").
//
// IMPORTANT: only register panels that render on the **default landing
// view** of the tab. Sub-tab-only panels (e.g. "ML Explorer", "Bar Race")
// should not be in this list — extend with a sub-tab walker if needed.

export const PANEL_REGISTRY = {
  equities: {
    panels: [
      { title: 'Market Summary', minValues: 4 },
      { title: 'Key Indices' },
      { title: 'Equity Heatmap' },
    ],
  },
  bonds: {
    panels: [
      { title: 'Key Metrics', count: 2, minValues: 4 },
      { title: 'Yield Curve', chartOnly: true },
      { title: 'Credit Spreads' },
      { title: 'Credit Ratings' },
      { title: 'Curve Spreads' },
      { title: 'Fed Balance Sheet' },
      { title: 'M2 Money Supply' },
      { title: 'CPI Components (YoY)' },
      { title: 'Debt-to-GDP' },
      { title: 'Breakeven Inflation' },
      { title: 'Duration Ladder' },
      { title: 'Macro Indicators' },
      { title: 'TIPS Real Yields' },
      { title: 'Foreign Holders' },
      { title: 'Money Market' },
      { title: 'Recent Auctions' },
      { title: 'ECB Policy Rates' },
      { title: 'Global Central Bank Policy Rates' },
      { title: 'Treasury Avg Interest Cost' },
    ],
  },
  fx: {
    panels: [
      { title: 'FX Key Metrics', minValues: 4 },
      { title: 'FX Dashboard' },
      { title: 'DXY Dollar Index' },
      { title: 'Currency Correlation (30D)' },
      { title: 'Real Effective Exchange Rates' },
      { title: 'Rate Differentials' },
      { title: 'Rate Differential Dashboard' },
      { title: 'Cross-Rate Matrix' },
      { title: 'Top Movers' },
      { title: 'Top Movers vs USD' },
      { title: 'CFTC COT Positioning' },
      { title: 'Carry Map' },
    ],
  },
  derivatives: {
    panels: [
      { title: 'Derivatives Key Metrics', minValues: 4 },
      { title: 'Key Metrics' },
      { title: 'VIX Term Structure' },
      { title: 'VIX — 1 Year' },
      { title: 'SKEW Index' },
      { title: 'Vol Surface (SPX)' },
      { title: 'Options Flow' },
      { title: 'Gamma Exposure (GEX)' },
      { title: 'Vol Premium' },
      { title: 'CFTC Financial Futures Positioning' },
      { title: 'BIS OTC Derivatives — Global Notional Outstanding' },
    ],
  },
  realEstate: {
    panels: [
      { title: 'Key Metrics', minValues: 4 },
      { title: 'Case-Shiller Index' },
      { title: 'REIT ETF (VNQ)' },
      { title: 'REIT Performance' },
      { title: 'Distress Indicators' },
      { title: 'Cap Rates by Sector' },
      { title: 'Housing Affordability Stack' },
      { title: 'Supply & Demand' },
    ],
  },
  insurance: {
    panels: [
      { title: 'Insurance Key Metrics', minValues: 4 },
      { title: 'Industry Combined Ratio' },
      { title: 'Combined Ratio by Line' },
      { title: 'Reinsurance Rates' },
      { title: 'Reserve Adequacy' },
      { title: 'Cat Bond Spreads' },
      { title: 'Sector ETFs' },
      { title: 'HY OAS Spread' },
      { title: 'Natural Catastrophe Losses' },
      { title: 'Catastrophe Exposure Monitor' },
    ],
  },
  commodities: {
    panels: [
      { title: 'Market Summary', minValues: 4 },
      { title: 'Commodity Prices' },
      { title: 'Futures Curve' },
      { title: 'Sector Performance' },
      { title: 'Supply & Demand' },
      { title: 'COT Positioning' },
      { title: 'Commodity FX (vs USD)' },
      { title: 'Physical Supply Pressure' },
      { title: 'Strategic Materials Periodic Grid' },
      { title: 'Criticality Leaderboard' },
      { title: 'Battery Supply Chain' },
      { title: 'Precious Metals Complex' },
      { title: 'Commodity Regime Dashboard' },
      { title: 'Energy Stack' },
      { title: 'Curve Structure Board' },
      { title: 'Strategic Material Detail' },
      { title: 'Material-to-Sector Exposure Matrix' },
    ],
  },
  globalMacro: {
    panels: [
      { title: 'Macro Key Metrics', minValues: 4 },
      { title: 'Quick Indicators' },
      { title: 'Country Scorecard' },
      { title: 'GDP Growth' },
      { title: 'CPI Inflation' },
      { title: 'Policy Rates' },
      { title: 'Debt / GDP' },
      { title: 'Economic Activity' },
      { title: 'OECD Leading Indicators' },
      { title: 'International Reserves' },
      { title: 'COFER Currency Shares' },
      { title: 'Trade Openness' },
      { title: 'GDP per Capita vs Growth' },
      { title: 'Global Liquidity Dashboard' },
    ],
  },
  equitiesDeepDive: {
    panels: [
      { title: 'Key Metrics', minValues: 4 },
      { title: 'ETF Performance' },
      { title: 'Factor In Favor' },
      { title: 'Sector Beat Rate' },
      { title: 'Most Shorted' },
      { title: 'Stock Factor Scores' },
      { title: 'Upcoming Earnings' },
      { title: 'Top Institutions' },
      { title: 'Insider Trading' },
      { title: 'Equity+ Summary' },
      { title: 'Earnings Quality & Revision Monitor' },
    ],
  },
  crypto: {
    panels: [
      { title: 'Top Cryptos' },
      { title: 'Fear & Greed Index' },
      { title: 'Funding Rates' },
      { title: 'DeFi TVL by Chain' },
      { title: 'Top Exchanges' },
      { title: 'On-Chain Metrics' },
      { title: 'BTC Hashrate (30d)' },
    ],
  },
  credit: {
    panels: [
      { title: 'Credit Key Metrics', minValues: 4 },
      { title: 'Key Metrics' },
      { title: 'Credit Spreads' },
      { title: 'Spread Summary' },
      { title: 'EM Spread History' },
      { title: 'EM ETF Yields' },
      { title: 'Commercial Paper' },
      { title: 'Default Rates' },
      { title: 'Delinquency Rates' },
      { title: 'Bank Stress Monitor' },
      { title: 'US Banking Sector' },
    ],
  },
  sentiment: {
    panels: [
      { title: 'Market Snapshot', minValues: 4 },
      { title: 'Key Metrics' },
      { title: 'Fear & Greed Index' },
      { title: 'Financial Stress Index' },
      { title: 'Cross-Asset Returns' },
      { title: 'CFTC Positioning' },
      { title: 'Risk Dashboard' },
      { title: 'Leverage Metrics' },
      { title: 'Cross-Asset Correlation Matrix' },
      { title: 'Fed Narrative & Risk Mood' },
    ],
  },
  calendar: {
    panels: [
      { title: 'Calendar Key Metrics', minValues: 4 },
      { title: 'Calendar Summary' },
      { title: 'Economic Calendar' },
      { title: 'Central Bank Rates' },
      { title: 'Upcoming Meetings' },
      { title: 'Earnings Season' },
      { title: 'Key US Releases' },
      { title: 'Treasury Auctions' },
      { title: 'Options Expiry' },
      { title: 'Release Impact Tracker' },
      { title: 'Market Catalyst Wall' },
    ],
  },
  bls: {
    panels: [
      { title: 'Key Labor Market Indicators' },
      { title: 'Trends (3-Year) — Labor' },
      { title: 'Trends (3-Year) — Prices & Jobs' },
      { title: 'JOLTS — Job Openings, Hires, Quits & Layoffs' },
      { title: 'Productivity & Unit Labor Costs' },
      { title: 'CPI Components — Food, Energy, Shelter' },
      { title: 'PPI by Industry — Final, Intermediate, Services' },
      { title: 'Employment Cost Index' },
      { title: 'Unemployment by Duration' },
    ],
  },
  eia: {
    panels: [
      { title: 'US Electricity Retail Prices' },
      { title: 'Electricity Consumption' },
      { title: 'Price Trends (3-Year Monthly)' },
      { title: 'CO₂ Emissions by Sector (US)' },
      { title: 'Petroleum Prices' },
      { title: 'Natural Gas — Henry Hub Spot' },
    ],
  },
  alerts: {
    panels: [
      { title: 'Active Alerts' },
      { title: 'Cross-Market Correlations' },
      { title: 'Status Summary' },
    ],
  },
  watchlist: {
    panels: [
      { title: 'Watchlist Key Metrics', minValues: 2 },
      { title: 'My Tickers' },
      { title: 'Cross-Market Alert Board' },
    ],
  },
  analytics: {
    panels: [
      { title: 'Analytics Key Metrics', minValues: 4 },
      { title: 'API Usage' },
      { title: 'Data Freshness' },
      { title: 'Data Source Health' },
      { title: 'Endpoint Metrics' },
      { title: 'Express Routes' },
      { title: 'File Cache' },
      { title: 'Memory Cache' },
      { title: 'Provenance Audit' },
      { title: 'API Health Diagnostics' },
      { title: 'Server' },
      { title: 'Error Log' },
      { title: 'Panel Trace Inspector' },
      { title: 'Endpoint Coverage Matrix' },
      { title: 'Panel Visibility Audit' },
    ],
  },
};

// Markets where "extra unregistered panel" should be a warning, not a hard
// failure. Useful for tabs whose default view legitimately varies (e.g.
// equities sub-tabs that mount different panel sets).
export const SOFT_EXTRA_MARKETS = new Set([
  'equities', // sub-tab driven; default landing varies
]);
