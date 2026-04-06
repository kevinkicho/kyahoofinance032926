// src/hub/markets.config.js
export const MARKETS = [
  { id: 'equities',         label: 'Equities',    icon: '📈' },
  { id: 'bonds',            label: 'Bonds',        icon: '🏛️' },
  { id: 'fx',               label: 'FX',           icon: '💱' },
  { id: 'derivatives',      label: 'Derivatives',  icon: '📊' },
  { id: 'realEstate',       label: 'Real Estate',  icon: '🏠' },
  { id: 'insurance',        label: 'Insurance',    icon: '🛡️' },
  { id: 'commodities',      label: 'Commodities',  icon: '🛢️' },
  { id: 'globalMacro',      label: 'Macro',        icon: '🌐' },
  { id: 'equitiesDeepDive', label: 'Equity+',      icon: '🔍' },
  { id: 'crypto',           label: 'Crypto',       icon: '🪙' },
  { id: 'credit',           label: 'Credit',       icon: '🏦' },
  { id: 'sentiment', label: 'Sentiment', icon: '🎭' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
];

export const DEFAULT_MARKET = 'equities';

export const SEARCH_INDEX = [
  { marketId: 'equities',         label: 'Equities',    icon: '📈', subTabs: ['Heatmap', 'List', 'Portfolio', 'Radar', 'Data Hub'] },
  { marketId: 'bonds',            label: 'Bonds',        icon: '🏛️', subTabs: ['Yield Curve', 'Credit Matrix', 'Spread Monitor', 'Duration Ladder', 'Breakevens'] },
  { marketId: 'fx',               label: 'FX',           icon: '💱', subTabs: ['Rate Matrix', 'Carry Map', 'DXY Tracker', 'Top Movers'] },
  { marketId: 'derivatives',      label: 'Derivatives',  icon: '📊', subTabs: ['Vol Surface', 'VIX Term Structure', 'Options Flow'] },
  { marketId: 'realEstate',       label: 'Real Estate',  icon: '🏠', subTabs: ['Price Index', 'REIT Screen', 'Affordability Map', 'Cap Rate Monitor'] },
  { marketId: 'insurance',        label: 'Insurance',    icon: '🛡️', subTabs: ['Cat Bond Spreads', 'Combined Ratio', 'Reserve Adequacy', 'Reinsurance Pricing'] },
  { marketId: 'commodities',      label: 'Commodities',  icon: '🛢️', subTabs: ['Price Dashboard', 'Futures Curve', 'Sector Heatmap', 'Supply & Demand', 'COT Positioning'] },
  { marketId: 'globalMacro',      label: 'Macro',        icon: '🌐', subTabs: ['Scorecard', 'Growth & Inflation', 'Central Bank Rates', 'Debt Monitor'] },
  { marketId: 'equitiesDeepDive', label: 'Equity+',      icon: '🔍', subTabs: ['Sector Rotation', 'Factor Rankings', 'Earnings Watch', 'Short Interest'] },
  { marketId: 'crypto',           label: 'Crypto',       icon: '🪙', subTabs: ['Market Overview', 'Cycle Indicators', 'DeFi & Chains', 'Funding & Positioning'] },
  { marketId: 'credit',           label: 'Credit',       icon: '🏦', subTabs: ['IG / HY Dashboard', 'EM Bonds', 'Loan Market', 'Default Watch'] },
  { marketId: 'sentiment',        label: 'Sentiment',    icon: '🎭', subTabs: ['Fear & Greed', 'CFTC Positioning', 'Risk Dashboard', 'Cross-Asset Returns'] },
  { marketId: 'calendar',         label: 'Calendar',     icon: '📅', subTabs: ['Economic Calendar', 'Central Banks', 'Earnings Season', 'Key Releases'] },
];
