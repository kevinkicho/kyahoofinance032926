// src/hub/markets.config.js
export const MARKETS = [
  { id: 'equities',         label: 'Equities' },
  { id: 'bonds',            label: 'Bonds' },
  { id: 'fx',               label: 'FX' },
  { id: 'derivatives',      label: 'Derivatives' },
  { id: 'realEstate',       label: 'Real Estate' },
  { id: 'insurance',        label: 'Insurance' },
  { id: 'commodities',      label: 'Commodities' },
  { id: 'globalMacro',      label: 'Macro' },
  { id: 'equitiesDeepDive', label: 'Equity+' },
  { id: 'crypto',           label: 'Crypto' },
  { id: 'credit',           label: 'Credit' },
  { id: 'sentiment',        label: 'Sentiment' },
  { id: 'calendar',         label: 'Calendar' },
  { id: 'bls',              label: 'Labor' },
  { id: 'eia',              label: 'Energy' },
  { id: 'alerts',           label: 'Alerts' },
  { id: 'watchlist',        label: 'Watchlist' },
  { id: 'analytics',        label: 'Analytics' },
];

export const DEFAULT_MARKET = 'equities';

export const SEARCH_INDEX = [
  { marketId: 'equities',         label: 'Equities',    subTabs: ['Heatmap', 'List', 'Bar Race', 'Portfolio', 'Radar', 'ML Explorer', 'Data Hub'], keywords: ['AAPL', 'TSLA', 'MSFT', 'NVDA', 'S&P 500', 'Nasdaq'] },
  { marketId: 'bonds',            label: 'Bonds',       subTabs: ['Yield Curve', 'Credit Matrix', 'Spread Monitor', 'Duration Ladder', 'Breakevens'], keywords: ['DGS10', 'UST10Y', '10Y Treasury', 'TIPS', 'Real Yields'] },
  { marketId: 'fx',               label: 'FX',          subTabs: ['Rate Matrix', 'Carry Map', 'DXY Tracker', 'Top Movers'], keywords: ['DXY', 'USD', 'EURUSD', 'JPY'] },
  { marketId: 'derivatives',      label: 'Derivatives', subTabs: ['Vol Surface', 'VIX Term Structure', 'Options Flow'], keywords: ['VIX', 'VIXCLS', 'SKEW', 'Gamma', 'GEX', 'VVIX'] },
  { marketId: 'realEstate',       label: 'Real Estate', subTabs: ['Price Index', 'REIT Screen', 'Affordability Map', 'Cap Rate Monitor', 'Housing & Construction', 'Trade & Consumption'], keywords: ['Case-Shiller', 'Housing', 'REIT', 'Retail Sales', 'Housing Starts', 'Census', 'Building Permits', 'Durable Goods', 'Trade Balance'] },
  { marketId: 'insurance',        label: 'Insurance',   subTabs: ['Cat Bond Spreads', 'Combined Ratio', 'Reserve Adequacy', 'Reinsurance Pricing'], keywords: ['Cat Bonds', 'Insurance'] },
  { marketId: 'commodities',      label: 'Commodities', subTabs: ['Price Dashboard', 'Futures Curve', 'Sector Heatmap', 'Supply & Demand', 'COT Positioning'], keywords: ['Gold', 'Oil', 'WTI', 'Brent', 'Natural Gas', 'GC=F', 'CL=F'] },
  { marketId: 'globalMacro',      label: 'Macro',       subTabs: ['Scorecard', 'Growth & Inflation', 'Central Bank Rates', 'Debt Monitor', 'Economic Activity', 'OECD Leading Indicators', 'International Reserves', 'COFER', 'Trade Openness', 'GDP per Capita'], keywords: ['GDP', 'CPI', 'Fed Funds', 'Interest Rates', 'Inflation', 'IMF', 'World Bank', 'Reserves', 'COFER', 'Trade'] },
  { marketId: 'equitiesDeepDive', label: 'Equity+',     subTabs: ['Sector Rotation', 'Factor Rankings', 'Earnings Watch', 'Short Interest', 'Inst. Holdings', 'Insider Trading'], keywords: ['Short Interest', 'Insiders'] },
  { marketId: 'crypto',           label: 'Crypto',      subTabs: ['Market Overview', 'Cycle Indicators', 'DeFi & Chains', 'Funding & Positioning'], keywords: ['BTC', 'ETH', 'SOL', 'Bitcoin', 'Ethereum'] },
  { marketId: 'credit',           label: 'Credit',      subTabs: ['IG / HY Dashboard', 'EM Bonds', 'Loan Market', 'Default Watch'], keywords: ['HY Spread', 'High Yield', 'Investment Grade', 'Sovereign'] },
  { marketId: 'sentiment',        label: 'Sentiment',   subTabs: ['Fear & Greed', 'CFTC Positioning', 'Risk Dashboard', 'Cross-Asset Returns', 'Correlation Matrix'], keywords: ['Fear & Greed', 'Sentiment Index', 'Risk Off'] },
  { marketId: 'calendar',         label: 'Calendar',    subTabs: ['Economic Calendar', 'Central Banks', 'Earnings Season', 'Key Releases'], keywords: ['Economic Calendar', 'FOMC'] },
  { marketId: 'bls',              label: 'Labor',        subTabs: ['Labor Market', 'Prices', 'Trends', 'Productivity', 'Wages', 'JOLTS'], keywords: ['CPI', 'Non-farm Payrolls', 'Unemployment', 'JOLTS', 'Productivity', 'Wages'] },
  { marketId: 'eia',              label: 'Energy',       subTabs: ['Electricity', 'Emissions', 'Energy Overview', 'Petroleum', 'Natural Gas', 'Outlook'], keywords: ['Energy', 'Oil Production', 'EIA', 'Petroleum', 'Natural Gas', 'STEO', 'Coal'] },
  { marketId: 'alerts',           label: 'Alerts',      subTabs: ['Active Alerts', 'Alert Rules'], keywords: ['Anomalies', 'Alerts'] },
  { marketId: 'watchlist',        label: 'Watchlist',   subTabs: ['My Tickers', 'My Metrics'], keywords: ['Watchlist', 'Favorites'] },
  { marketId: 'analytics',        label: 'Analytics',   subTabs: ['API Usage', 'Endpoints', 'Data Freshness', 'Rate Limits', 'Cache'], keywords: ['API', 'Endpoints', 'Freshness'] },
];
