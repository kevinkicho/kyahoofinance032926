// Panel Registry — maps every panel in every market to its data field path,
// backend source, external API dependencies, and frontend render condition.
// This is the "trace spec" used by the Panel Trace Inspector in Analytics.
//
// Each entry: { id, title, field, fieldPath, source, external, renderCheck, shapeCheck }
// - field: top-level key in the API response (e.g. "spreadHistory")
// - fieldPath: dotted path for nested fields (e.g. "durationLadder.buckets")
// - source: backend route file + approximate line (for reference)
// - external: array of { name, seriesIds } for upstream API dependencies
// - renderCheck: description of the frontend condition that gates rendering
// - shapeCheck: optional function (value) => { ok, detail } that validates
//   the internal data shape the component expects — catches cases where the
//   field is present but structured wrong (e.g. history keyed by date instead
//   of currency code).

function hasArrayValues(obj, minKeys = 2) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const arrKeys = Object.keys(obj).filter(k => Array.isArray(obj[k]) && obj[k].length > 0);
  return arrKeys.length >= minKeys;
}

const SHAPE_CHECKS = {
  // FX REER panel uses `reer` (not reerData) from /api/fx
  // Carry Map uses rateDifferentials (not carryData)

// FX history must be keyed by currency code with array values, not by date
  fxHistory: (val) => {
    if (!val || typeof val !== 'object') return { ok: false, detail: 'null or not object' };
    const keys = Object.keys(val);
    if (keys.length === 0) return { ok: false, detail: 'empty object' };
    // Check if keyed by dates (wrong shape)
    const looksLikeDates = keys.every(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    if (looksLikeDates) {
      return { ok: false, detail: `WRONG SHAPE: keyed by date (${keys.length} dates), component expects currency→array` };
    }
    // Check if keyed by currency with array values
    const hasArrays = hasArrayValues(val, 3);
    if (hasArrays) return { ok: true, detail: `${keys.length} currencies with array data` };
    return { ok: false, detail: `no currency→array structure found (keys: ${keys.slice(0, 4).join(',')})` };
  },
  // spreadHistory must have dates + t10y2y + t10y3m arrays
  spreadHistory: (val) => {
    if (!val || typeof val !== 'object') return { ok: false, detail: 'null' };
    if (!Array.isArray(val.dates) || val.dates.length === 0) return { ok: false, detail: 'no dates array' };
    if (!Array.isArray(val.t10y2y) || val.t10y2y.length === 0) return { ok: false, detail: 'no t10y2y array' };
    return { ok: true, detail: `${val.dates.length} dates` };
  },
  // breakevensData must have current.be5y (non-null)
  breakevens: (val) => {
    if (!val || typeof val !== 'object') return { ok: false, detail: 'null' };
    if (!val.current || val.current.be5y == null) return { ok: false, detail: 'current.be5y is null' };
    return { ok: true, detail: `be5y=${val.current.be5y}` };
  },
  // macroData must have >0 keys with non-null values
  macroData: (val) => {
    if (!val || typeof val !== 'object') return { ok: false, detail: 'null' };
    const nonNull = Object.entries(val).filter(([,v]) => v != null);
    if (nonNull.length === 0) return { ok: false, detail: 'all values null' };
    return { ok: true, detail: `${nonNull.length}/${Object.keys(val).length} non-null` };
  },
  // durationLadder must have buckets array with non-null amounts
  durationLadder: (val) => {
    if (!val || typeof val !== 'object') return { ok: false, detail: 'null' };
    if (!Array.isArray(val.buckets)) return { ok: false, detail: 'no buckets array' };
    const hasAmounts = val.buckets.some(b => b?.amount != null);
    if (!hasAmounts) return { ok: false, detail: `${val.buckets.length} buckets but all amounts null` };
    return { ok: true, detail: `${val.buckets.length} buckets with data` };
  },
};

export const PANEL_REGISTRY = {
  bonds: [
    {
      id: 'yield', title: 'Yield Curve',
      field: 'yieldCurveData', fieldPath: 'yieldCurveData',
      source: 'bonds.js:170-250', external: [{ name: 'FRED', seriesIds: ['DGS3MO','DGS6MO','DGS1','DGS2','DGS5','DGS7','DGS10','DGS20','DGS30'] }],
      renderCheck: 'yieldCurveData && Object.keys(yieldCurveData).length >= 3',
    },
    {
      id: 'credit', title: 'Credit Spreads',
      field: 'spreadData', fieldPath: 'spreadData',
      source: 'bonds.js:270-310', external: [{ name: 'FRED', seriesIds: ['BAMLH0A0HYM2','BAMLC0A0CM','BAMLEMCBPIOAS'] }],
      renderCheck: 'spreadData?.current && Object.keys(spreadData.current).length > 0',
    },
    {
      id: 'realYield', title: 'Real Yields',
      field: 'tipsYields', fieldPath: 'tipsYields',
      source: 'bonds.js:200-210', external: [{ name: 'FRED', seriesIds: ['DFII5','DFII10','DFII30'] }],
      renderCheck: 'tipsYields && Object.keys(tipsYields).length > 0',
    },
    {
      id: 'ratings', title: 'Credit Ratings',
      field: 'creditRatings', fieldPath: 'creditRatings.countries',
      source: 'bonds.js:250-260', external: [{ name: 'Static fallback', seriesIds: [] }],
      renderCheck: 'creditRatingsData && creditRatingsData.length > 0',
    },
    {
      id: 'curvespreads', title: 'Curve Spreads',
      field: 'spreadHistory', fieldPath: 'spreadHistory.dates',
      source: 'bonds.js:324-367', external: [{ name: 'FRED', seriesIds: ['T10Y2Y','T10Y3M'] }],
      renderCheck: 'spreadHistory?.dates?.length > 0 → spreadHistoryOption memo',
      renderType: 'SafeECharts',
      shapeCheck: SHAPE_CHECKS.spreadHistory,
    },
    {
      id: 'fed', title: 'Fed Balance Sheet',
      field: 'fedBalanceSheetHistory', fieldPath: 'fedBalanceSheetHistory.dates',
      source: 'bonds.js:534-547', external: [{ name: 'FRED', seriesIds: ['WALCL'] }],
      renderCheck: 'fedBalanceSheetHistory?.dates?.length > 0 → fedBalanceOption memo',
      renderType: 'SafeECharts',
      notes: 'WALCL is frequently blocked by Akamai WAF — has cache fallback',
    },
    {
      id: 'm2', title: 'M2 Money Supply',
      field: 'm2HistoryData', fieldPath: 'm2HistoryData.dates',
      source: 'bonds.js:551-564', external: [{ name: 'FRED', seriesIds: ['M2SL'] }],
      renderCheck: 'm2HistoryData?.dates?.length > 0 → m2Option memo',
      renderType: 'SafeECharts',
      notes: 'M2SL is frequently blocked by Akamai WAF — has cache fallback',
    },
    {
      id: 'cpi', title: 'CPI Components',
      field: 'cpiComponents', fieldPath: 'cpiComponents.dates',
      source: 'bonds.js:388-438', external: [{ name: 'FRED', seriesIds: ['CPIAUCSL','CPILFESL','CPIFABSL','CPIENGSL'] }],
      renderCheck: 'cpiComponents?.dates?.length > 0',
      renderType: 'CpiComponents component',
    },
    {
      id: 'debtgdp', title: 'Debt-to-GDP',
      field: 'debtToGdpHistory', fieldPath: 'debtToGdpHistory.dates',
      source: 'bonds.js:372-383', external: [{ name: 'FRED', seriesIds: ['GFDEGDQ188S'] }],
      renderCheck: 'debtToGdpHistory?.dates?.length > 0 → debtToGdpOption memo',
      renderType: 'SafeECharts',
    },
    {
      id: 'breakevens', title: 'Breakeven Inflation',
      field: 'breakevensData', fieldPath: 'breakevensData.current.be5y',
      source: 'bonds.js:443-479', external: [{ name: 'FRED', seriesIds: ['T5YIE','T10YIE','T5YIFR','DFII5','DFII10'] }],
      renderCheck: '!!breakevensData?.current?.be5y',
      renderType: 'BreakevenMonitor component',
      shapeCheck: SHAPE_CHECKS.breakevens,
      notes: 'All-or-nothing Promise.all — if any of 5 FRED series fails, entire field is null',
    },
    {
      id: 'duration', title: 'Duration Ladder',
      field: 'durationLadder', fieldPath: 'durationLadder.buckets',
      source: 'bonds.js:597-677', external: [{ name: 'Treasury Fiscal Data', seriesIds: [] }],
      renderCheck: '!!durationLadderMeta → hasData = buckets.some(b => b.amount != null)',
      renderType: 'DurationLadder component',
      shapeCheck: SHAPE_CHECKS.durationLadder,
    },
    {
      id: 'macro', title: 'Macro Indicators',
      field: 'macroData', fieldPath: 'macroData',
      source: 'bonds.js:519-526', external: [{ name: 'FRED', seriesIds: ['WALCL','M2SL','GFDEBTN','FYFSD','UNRATE','CIVPART','GDP','PCEPI','TB3MS'] }],
      renderCheck: 'macroData && Object.keys(macroData).length > 0',
      renderType: 'Object.entries map → MetricValue',
      shapeCheck: SHAPE_CHECKS.macroData,
    },
    {
      id: 'foreign-holders', title: 'Foreign Holders',
      field: '(cross-market: treasuryTIC)', fieldPath: 'ticCtx.data.latest',
      source: 'treasuryTIC.js', external: [{ name: 'US Treasury TIC', seriesIds: [] }],
      renderCheck: '!!(ticCtx?.data?.latest?.length)',
      renderType: 'SafeECharts',
      notes: 'Cross-market — uses useMarketData("treasuryTIC"), not bonds data',
    },
    {
      id: 'money-market', title: 'Money Market',
      field: '(cross-market: nyfed)', fieldPath: 'nyfedCtx.data.sofr.series',
      source: 'nyfed.js', external: [{ name: 'NY Fed Markets', seriesIds: [] }],
      renderCheck: '!!(nyfedCtx?.data?.sofr?.series?.length)',
      renderType: 'SafeECharts',
      notes: 'Cross-market — uses useMarketData("nyfed")',
    },
    {
      id: 'auctions', title: 'Treasury Auctions',
      field: '(cross-market: treasuryAuctions)', fieldPath: 'auctionCtx.data',
      source: 'treasuryAuctions.js', external: [{ name: 'Treasury Fiscal Data', seriesIds: [] }],
      renderCheck: 'auctionCtx?.data?.auctions?.length > 0',
      renderType: 'Custom table',
      notes: 'Cross-market — uses useMarketData("treasuryAuctions")',
    },
  ],

  fx: [
    { id: 'rate-matrix', title: 'Rate Matrix', field: 'spotRates', fieldPath: 'spotRates', source: 'fx.js', external: [{ name: 'Frankfurter / FRED', seriesIds: ['DEXUSEU','DEXJPUS'] }], renderCheck: 'spotRates && Object.keys(spotRates).length > 0' },
    { id: 'top-movers', title: 'Top Movers', field: 'changes1d', fieldPath: 'changes1d', source: 'fx.js', external: [{ name: 'Frankfurter', seriesIds: [] }], renderCheck: 'changes1d && Object.keys(changes1d).length > 0' },
    { id: 'dxy', title: 'DXY Tracker', field: 'dxyHistory', fieldPath: 'dxyHistory', source: 'fx.js', external: [{ name: 'FRED', seriesIds: ['DTWEXBGS'] }], renderCheck: 'dxyHistory?.dates?.length > 0', renderType: 'SafeECharts' },
    { id: 'carry', title: 'Carry Map', field: 'rateDifferentials', fieldPath: 'rateDifferentials', source: 'fx.js', external: [{ name: 'FRED / ECB', seriesIds: ['FEDFUNDS','ECBMRRFR'] }], renderCheck: 'rateDifferentials && (rateDifferentials.fed != null || Object.keys(rateDifferentials).length > 0)' },
    { id: 'correlation', title: 'Correlation Matrix', field: 'history', fieldPath: 'history', source: 'fx.js:33 (Frankfurter)', external: [{ name: 'Frankfurter', seriesIds: [] }], renderCheck: '!!history && Object.keys(history).length > 0', renderType: 'CurrencyCorrelationMatrix', shapeCheck: SHAPE_CHECKS.fxHistory, notes: 'Component expects history keyed by currency code with array values (e.g. { EUR: [...rates] }), NOT date→currency. If shape is wrong, panel shows "No history available for correlation".' },
    { id: 'reer', title: 'REER Chart', field: 'reer', fieldPath: 'reer', source: 'fx.js', external: [{ name: 'BIS / FRED', seriesIds: [] }], renderCheck: 'reer?.dates?.length > 0', renderType: 'SafeECharts' },
    { id: 'imf-cofer', title: 'IMF COFER Reserves', field: 'imfReserves', fieldPath: 'imfReserves', source: 'fx.js (IMF COFER)', external: [{ name: 'IMF', seriesIds: [] }], renderCheck: 'imfReserves?.reserves && Object.keys(imfReserves.reserves).length > 0', renderType: 'ImfCoferPanel' },
    { id: 'treasury-tic', title: 'Treasury TIC Holdings', field: '(cross-market: treasuryTIC)', fieldPath: 'ticCtx.data.latest', source: 'treasuryTIC.js', external: [{ name: 'US Treasury TIC', seriesIds: [] }], renderCheck: 'ticCtx?.data?.latest?.length > 0', renderType: 'TreasuryTicPanel' },
    { id: 'bis-reer', title: 'BIS REER Comparison', field: 'reer', fieldPath: 'reer', source: 'fx.js (BIS/FRED)', external: [{ name: 'BIS', seriesIds: ['RNBUSBIS','RNBEBIS','RNJPBIS','RNGBBIS','RNCBBIS'] }], renderCheck: 'reer?.dates?.length > 0', renderType: 'BisReerPanel' },
  ],

  crypto: [
    { id: 'coin-overview', title: 'Coin Market Overview', field: 'coinMarketData', fieldPath: 'coinMarketData.coins', source: 'crypto.js', external: [{ name: 'CoinGecko', seriesIds: [] }], renderCheck: 'coinMarketData?.coins?.length > 0' },
    { id: 'fear-greed', title: 'Fear & Greed', field: 'fearGreedData', fieldPath: 'fearGreedData', source: 'crypto.js', external: [{ name: 'Alternative.me', seriesIds: [] }], renderCheck: 'fearGreedData && Object.keys(fearGreedData).length > 0' },
    { id: 'defi', title: 'DeFi Chains', field: 'defiData', fieldPath: 'defiData', source: 'crypto.js', external: [{ name: 'DefiLlama', seriesIds: [] }], renderCheck: 'defiData && Object.keys(defiData).length > 0' },
    { id: 'funding', title: 'Funding & Positioning', field: 'fundingData', fieldPath: 'fundingData', source: 'crypto.js', external: [{ name: 'Bybit', seriesIds: [] }], renderCheck: 'fundingData && Object.keys(fundingData).length > 0' },
    { id: 'onchain', title: 'On-Chain Metrics', field: 'onChainData', fieldPath: 'onChainData', source: 'crypto.js', external: [{ name: 'Mempool.space / Etherscan', seriesIds: [] }], renderCheck: 'onChainData && Object.keys(onChainData).length > 0' },
    { id: 'stablecoin-composition', title: 'Stablecoin Composition', field: 'stablecoinMcap', fieldPath: 'stablecoinMcap', source: 'crypto.js (DeFi Llama)', external: [{ name: 'DeFi Llama', seriesIds: [] }], renderCheck: 'stablecoinMcap != null', renderType: 'StablecoinCompositionPanel' },
    { id: 'defi-tvl-trend', title: 'DeFi TVL Trend', field: 'defiData', fieldPath: 'defiData.chains', source: 'crypto.js (DeFi Llama)', external: [{ name: 'DeFi Llama', seriesIds: [] }], renderCheck: 'defiData?.chains?.length > 0', renderType: 'DefiTvlTrendPanel' },
    { id: 'btc-onchain', title: 'BTC On-Chain Activity', field: 'onChainData', fieldPath: 'onChainData', source: 'crypto.js (mempool.space)', external: [{ name: 'Mempool.space', seriesIds: [] }], renderCheck: 'onChainData != null', renderType: 'BtcOnChainPanel' },
  ],

  equities: [
    { id: 'kpi', title: 'Key Indices', field: 'indices', fieldPath: 'indices', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: ['^GSPC','^IXIC','^DJI','^RUT','^STOXX50E','^N225','^HSI'] }], renderCheck: 'indexQuotes && Object.keys(indexQuotes).length > 0', renderType: 'KeyIndicesStrip' },
    { id: 'sidebar', title: 'Market Summary', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0', renderType: 'Sidebar' },
    { id: 'key-indices', title: 'Key Indices', field: 'indices', fieldPath: 'indices', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: ['^GSPC','^IXIC','^DJI'] }], renderCheck: 'indices && indices.length > 0' },
    { id: 'heatmap', title: 'Heatmap', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0', renderType: 'HeatmapView' },
    { id: 'bar-race', title: 'Bar Race', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0', renderType: 'BarRaceView' },
    { id: 'list', title: 'List View', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0', renderType: 'ListView' },
    { id: 'portfolio', title: 'Portfolio Tracker', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0' },
    { id: 'sec-fundamentals', title: 'SEC Fundamentals', field: '(cross-market: edgar)', fieldPath: 'edgarCtx.data', source: 'edgar.js (SEC EDGAR XBRL)', external: [{ name: 'SEC EDGAR', seriesIds: [] }], renderCheck: 'edgarRows && edgarRows.length > 0', renderType: 'BentoCard table' },
    { id: 'bea-corporate-profits', title: 'BEA Corporate Profits', field: '(cross-market: bea)', fieldPath: 'beaCtx.data.gdpComponents', source: 'bea.js', external: [{ name: 'Bureau of Economic Analysis', seriesIds: [] }], renderCheck: 'beaCtx?.data?.gdpComponents?.length > 0', renderType: 'BentoCard table' },
    { id: 'wb-market-cap', title: 'World Bank Market Cap', field: '(cross-market: worldbank)', fieldPath: 'wbCtx.data.countries', source: 'worldbank.js', external: [{ name: 'World Bank', seriesIds: ['CM.MKT.LCAP.GD.ZS'] }], renderCheck: 'wbCtx?.data?.countries?.length > 0', renderType: 'BentoCard table' },
    {
      id: 'universe-updates', title: 'Universe Expansion Queue',
      field: 'updates', fieldPath: 'updates',
      crossMarket: 'universeUpdates',
      source: 'universeUpdates.js (Finnhub IPO calendar + Yahoo quotes)',
      external: [{ name: 'Finnhub', seriesIds: [] }, { name: 'Yahoo Finance', seriesIds: [] }],
      renderCheck: 'universeUpdates.length > 0',
      renderType: 'Custom table (15 columns)',
      subFieldCheck: (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return { ok: false, detail: 'no updates array' };
        const expectedFields = ['name', 'fullName', 'sector', 'industry', 'marketCap', 'price', 'changePct', 'pe', 'revenue', 'netIncome', 'profitMargins', 'beta', 'divYield', 'weekHigh52', 'weekLow52', 'exchange'];
        const nullCounts = {};
        for (const f of expectedFields) {
          const nullCount = arr.filter(item => item?.[f] == null).length;
          if (nullCount > 0) nullCounts[f] = `${nullCount}/${arr.length} null`;
        }
        const nullKeys = Object.keys(nullCounts);
        if (nullKeys.length === 0) return { ok: true, detail: `${arr.length} entries, all fields populated` };
        // Distinguish partial nulls (some entries missing) from total nulls (all entries missing)
        const totalNulls = nullKeys.filter(f => nullCounts[f].startsWith(`${arr.length}/`));
        if (totalNulls.length > 0) {
          return { ok: false, detail: `${arr.length} entries but ${totalNulls.length} fields ALL null: ${totalNulls.join(', ')}` };
        }
        return { ok: false, detail: `${arr.length} entries, ${nullKeys.length} fields with partial nulls: ${nullKeys.map(f => `${f}(${nullCounts[f]})`).join(', ')}` };
      },
      notes: 'Cross-market: uses useMarketData("universeUpdates"), not /api/equities. Yahoo may not return sector/industry/fundamentals for recent IPOs.',
    },
    {
      id: 'sec-filings', title: 'SEC Filing Activity',
      field: 'byType', fieldPath: 'byType',
      crossMarket: 'edgarFilingActivity',
      source: 'edgar.js (SEC EDGAR submissions API)',
      external: [{ name: 'SEC EDGAR', seriesIds: [] }],
      renderCheck: 'filingActivityData && Object.keys(filingActivityData).length > 0',
      notes: 'Cross-market: uses useMarketData("edgarFilingActivity"), not /api/equities. Aggregates filing counts across 20 mega-cap tickers.',
    },
  ],

  derivatives: [
    { id: 'kpi', title: 'Derivatives Key Metrics', field: 'vixTermStructure', fieldPath: 'vixTermStructure', source: 'derivatives.js', external: [{ name: 'Yahoo Finance / FRED', seriesIds: ['VIXCLS'] }], renderCheck: 'vixTermStructure != null', renderType: 'KPI strip' },
    { id: 'metrics', title: 'Key Metrics', field: 'vixTermStructure', fieldPath: 'vixTermStructure', source: 'derivatives.js', external: [{ name: 'Yahoo Finance / FRED', seriesIds: ['VIXCLS'] }], renderCheck: 'vixTermStructure != null', renderType: 'KPI strip' },
    { id: 'vix-term', title: 'VIX Term Structure', field: 'vixTermStructure', fieldPath: 'vixTermStructure', source: 'derivatives.js', external: [{ name: 'Yahoo Finance / FRED', seriesIds: ['VIXCLS'] }], renderCheck: 'vixTermStructure && vixTermStructure.length > 0' },
    { id: 'vix1y', title: 'VIX — 1 Year', field: 'fredVixHistory', fieldPath: 'fredVixHistory', source: 'derivatives.js', external: [{ name: 'FRED', seriesIds: ['VIXCLS'] }], renderCheck: 'fredVixHistory?.values?.length > 0', renderType: 'SafeECharts' },
    { id: 'skew', title: 'Skew Index', field: 'skewIndex', fieldPath: 'skewIndex', source: 'derivatives.js', external: [{ name: 'CBOE / FRED', seriesIds: ['SKEW'] }], renderCheck: 'skewIndex != null' },
    { id: 'vol-surface', title: 'Vol Surface', field: 'volSurfaceData', fieldPath: 'volSurfaceData', source: 'derivatives.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'volSurfaceData && Object.keys(volSurfaceData).length > 0' },
    { id: 'options-flow', title: 'Options Flow', field: 'optionsFlow', fieldPath: 'optionsFlow', source: 'derivatives.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'optionsFlow && Object.keys(optionsFlow).length > 0' },
    { id: 'gamma', title: 'Gamma Exposure', field: 'gammaExposure', fieldPath: 'gammaExposure', source: 'derivatives.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'gammaExposure && Object.keys(gammaExposure).length > 0' },
    { id: 'volprem', title: 'Vol Premium', field: 'volPremium', fieldPath: 'volPremium', source: 'derivatives.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'volPremium != null' },
    { id: 'cftc-tff', title: 'CFTC Financial Futures', field: 'contracts', fieldPath: 'contracts', crossMarket: 'cftcTFF', source: 'cftcTFF.js', external: [{ name: 'CFTC Socrata', seriesIds: [] }], renderCheck: 'cftcTFFCtx?.data?.contracts && Object.keys(cftcTFFCtx.data.contracts).length > 0' },
    { id: 'bis-otc', title: 'BIS OTC Derivatives', field: 'categories', fieldPath: 'categories', crossMarket: 'bisOTC', source: 'bisOTC.js', external: [{ name: 'BIS', seriesIds: [] }], renderCheck: 'bisOTCCtx?.data?.categories && Object.keys(bisOTCCtx.data.categories).length > 0' },
    { id: 'ecb-derivatives', title: 'ECB Financial Market Data', field: '(cross-market: ecb)', fieldPath: 'ecbCtx.data', source: 'ecb.js', external: [{ name: 'ECB SDW', seriesIds: [] }], renderCheck: 'ecbCtx?.data?.policyRates != null', renderType: 'BentoCard table' },
  ],

  realEstate: [
    { id: 'price-index', title: 'Price Index', field: 'caseShiller', fieldPath: 'caseShiller', source: 'realEstate.js', external: [{ name: 'FRED', seriesIds: ['CSUSHPISA'] }], renderCheck: 'caseShiller?.dates?.length > 0', renderType: 'SafeECharts' },
    { id: 'reit', title: 'REIT Screen', field: 'reitData', fieldPath: 'reitData', source: 'realEstate.js', external: [{ name: 'Yahoo Finance', seriesIds: ['VNQ','O','SPG'] }], renderCheck: 'reitData && reitData.length > 0' },
    { id: 'affordability', title: 'Affordability Map', field: 'housingAffordability', fieldPath: 'housingAffordability', source: 'realEstate.js', external: [{ name: 'FRED / NAR', seriesIds: ['MEHOINUSA672N'] }], renderCheck: 'housingAffordability && Object.keys(housingAffordability).length > 0' },
    { id: 'cap-rate', title: 'Cap Rate Monitor', field: 'capRateData', fieldPath: 'capRateData', source: 'realEstate.js', external: [{ name: 'FRED', seriesIds: ['MORTGAGE30US','DGS10'] }], renderCheck: 'capRateData && Object.keys(capRateData).length > 0' },
    { id: 'fhfa-hpi', title: 'FHFA House Price Index', field: 'fhfaHpi', fieldPath: 'fhfaHpi', source: 'realEstate.js', external: [{ name: 'FRED', seriesIds: ['USSTHPI'] }], renderCheck: 'fhfaHpi?.values?.length > 0' },
    { id: 'bis-property-prices', title: 'BIS Property Price Comparison', field: 'priceIndexData', fieldPath: 'priceIndexData', source: 'realEstate.js (BIS/FRED)', external: [{ name: 'BIS', seriesIds: [] }], renderCheck: 'priceIndexData && Object.keys(priceIndexData).length > 0', renderType: 'BisPropertyPricePanel' },
    { id: 'metro-case-shiller', title: 'Metro Case-Shiller', field: 'caseShillerData', fieldPath: 'caseShillerData.metros', source: 'realEstate.js (FRED)', external: [{ name: 'FRED', seriesIds: ['SFXRSA','NYXRSA','LXXRSA','MIXRSA','CHXRSA'] }], renderCheck: 'caseShillerData?.metros && Object.keys(caseShillerData.metros).length > 0', renderType: 'MetroCaseShillerPanel' },
    { id: 'hud-affordability-by-metro', title: 'HUD Affordability by Metro', field: 'hudData', fieldPath: 'hudData', source: 'realEstate.js (HUD/Census)', external: [{ name: 'HUD', seriesIds: [] }], renderCheck: 'Array.isArray(hudData) && hudData.length > 0', renderType: 'HudAffordabilityPanel' },
  ],

  insurance: [
    { id: 'cat-bonds', title: 'Cat Bond Spreads', field: 'catBondSpreads', fieldPath: 'catBondSpreads', source: 'insurance.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'catBondSpreads && catBondSpreads.length > 0' },
    { id: 'combined-ratio', title: 'Combined Ratio', field: 'combinedRatioData', fieldPath: 'combinedRatioData', source: 'insurance.js', external: [{ name: 'FRED / SEC EDGAR', seriesIds: [] }], renderCheck: 'combinedRatioData && Object.keys(combinedRatioData).length > 0' },
    { id: 'reinsurance', title: 'Reinsurance Pricing', field: 'reinsurancePricing', fieldPath: 'reinsurancePricing', source: 'insurance.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'reinsurancePricing && reinsurancePricing.length > 0' },
    { id: 'reserve', title: 'Reserve Adequacy', field: 'reserveAdequacyData', fieldPath: 'reserveAdequacyData', source: 'insurance.js', external: [{ name: 'FRED / SEC EDGAR', seriesIds: [] }], renderCheck: 'reserveAdequacyData && Object.keys(reserveAdequacyData).length > 0' },
    { id: 'fema-disasters', title: 'FEMA Disaster Declarations', field: '(cross-market: fema)', fieldPath: 'femaCtx.data.declarations', source: 'fema.js', external: [{ name: 'FEMA', seriesIds: [] }], renderCheck: 'femaCtx?.data?.declarations?.length > 0', renderType: 'FemaDisasterPanel' },
    { id: 'usgs-earthquakes', title: 'USGS Earthquake Activity', field: '(cross-market: usgs)', fieldPath: 'usgsCtx.data.events', source: 'usgs.js', external: [{ name: 'USGS', seriesIds: [] }], renderCheck: 'usgsCtx?.data?.events?.length > 0', renderType: 'UsgsEarthquakePanel' },
  ],

  commodities: [
    { id: 'price-dashboard', title: 'Price Dashboard', field: 'priceDashboardData', fieldPath: 'priceDashboardData', source: 'commoditiesEnhanced.js:298 (EIA+Yahoo)', external: [{ name: 'FRED / EIA / Yahoo', seriesIds: ['GOLDAMGBD228NLBM','POILWTIUSDM'] }], renderCheck: 'priceDashboardData && priceDashboardData.length > 0' },
    { id: 'futures-curve', title: 'Futures Curve', field: 'futuresCurveData', fieldPath: 'futuresCurveData', source: 'commoditiesEnhanced.js:498 (Yahoo CME)', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'futuresCurveData && futuresCurveData.labels?.length > 0', renderType: 'FuturesCurve component' },
    { id: 'sector', title: 'Sector Performance', field: 'sectorHeatmapData', fieldPath: 'sectorHeatmapData.commodities', source: 'commoditiesEnhanced.js (Yahoo futures + historical)', external: [{ name: 'Yahoo Finance', seriesIds: [] }, { name: 'FRED PPI', seriesIds: ['WPUFD49207'] }], renderCheck: '!!sectorHeatmapData && sectorHeatmapData.commodities?.length > 0', renderType: 'SectorHeatmap component', shapeCheck: (val) => {
      if (!val || typeof val !== 'object') return { ok: false, detail: 'null' };
      const comms = val.commodities;
      if (!Array.isArray(comms) || comms.length === 0) return { ok: false, detail: 'no commodities array' };
      const w1Present = comms.filter(c => c.w1 != null).length;
      const m1Present = comms.filter(c => c.m1 != null).length;
      if (w1Present === 0) return { ok: false, detail: `WRONG SHAPE: ${comms.length} commodities but w1 is null for all — historical closes not fetched` };
      if (m1Present === 0) return { ok: false, detail: `WRONG SHAPE: ${comms.length} commodities but m1 is null for all — historical closes not fetched` };
      return { ok: true, detail: `${comms.length} commodities, w1=${w1Present}/${comms.length}, m1=${m1Present}/${comms.length}` };
    }, notes: 'w1/m1 require Yahoo historical chart data (30+ daily closes). If null, backend didn\'t fetch chart() data. PPI YoY needs FRED WPUFD49207 in FRED_COMMODITIES — check fredCommodities.ppiCommodity for the mini chart.' },
    { id: 'supply-demand', title: 'Supply & Demand', field: 'supplyDemandData', fieldPath: 'supplyDemandData', source: 'commoditiesEnhanced.js:324 (EIA)', external: [{ name: 'EIA / USDA', seriesIds: [] }], renderCheck: 'supplyDemandData && Object.keys(supplyDemandData).length > 0' },
    { id: 'cot', title: 'COT Positioning', field: 'cotData', fieldPath: 'cotData', source: 'commoditiesEnhanced.js (CFTC)', external: [{ name: 'CFTC Socrata', seriesIds: [] }], renderCheck: 'cotData && cotData.length > 0' },
    { id: 'comfx', title: 'Commodity FX (vs USD)', field: 'commodityCurrencies', fieldPath: 'commodityCurrencies', source: 'commoditiesEnhanced.js (Yahoo FX pairs)', external: [{ name: 'Yahoo Finance', seriesIds: ['AUDUSD=X','USDCAD=X','USDBRL=X'] }], renderCheck: '!!commodityCurrencies', renderType: 'Custom table', shapeCheck: (val) => {
      if (!val || typeof val !== 'object') return { ok: false, detail: 'null — backend did not include commodityCurrencies in enhanced route' };
      const keys = Object.keys(val);
      if (keys.length === 0) return { ok: false, detail: 'empty object' };
      const withRate = keys.filter(k => val[k]?.rate != null);
      if (withRate.length === 0) return { ok: false, detail: `${keys.length} currencies but all have null rate` };
      return { ok: true, detail: `${withRate.length} currencies with rates` };
    }, notes: 'Only built in legacy commodities.js route. Enhanced route must fetch AUDUSD=X, USDCAD=X, etc. via Yahoo.' },
    { id: 'curve-board', title: 'Curve Structure Board', field: 'futuresCurveData', fieldPath: 'futuresCurveData.spotPrice', source: 'commoditiesEnhanced.js:498', external: [{ name: 'Yahoo Finance CME', seriesIds: [] }], renderCheck: '!!(futuresCurveData || goldFuturesCurve)', renderType: 'curveBoardRows memo', shapeCheck: (val) => {
      if (!val || typeof val !== 'object') return { ok: false, detail: 'null' };
      if (!val.labels || val.labels.length === 0) return { ok: false, detail: 'no labels' };
      if (val.spotPrice == null) return { ok: false, detail: `WRONG SHAPE: ${val.labels.length} contracts but spotPrice is null — curveSpreadPct cannot compute structure` };
      return { ok: true, detail: `${val.labels.length} contracts, spot=${val.spotPrice}` };
    }, notes: 'curveSpreadPct() requires spotPrice to compute contango/backwardation. If null, panel shows "unavailable".' },
  ],

  globalMacro: [
    { id: 'scorecard', title: 'Scorecard', field: 'scorecardData', fieldPath: 'scorecardData', source: 'globalMacro.js', external: [{ name: 'IMF / World Bank / FRED', seriesIds: [] }], renderCheck: 'scorecardData && scorecardData.length > 0' },
    { id: 'central-bank-rates', title: 'Central Bank Rates', field: 'centralBankData', fieldPath: 'centralBankData', source: 'globalMacro.js', external: [{ name: 'FRED / ECB', seriesIds: ['FEDFUNDS','ECBMRRFR'] }], renderCheck: 'centralBankData && centralBankData.length > 0' },
    { id: 'debt-monitor', title: 'Debt Monitor', field: 'debtData', fieldPath: 'debtData', source: 'globalMacro.js', external: [{ name: 'IMF / World Bank', seriesIds: [] }], renderCheck: 'debtData && debtData.length > 0' },
    { id: 'growth-inflation', title: 'Growth & Inflation', field: 'growthInflationData', fieldPath: 'growthInflationData', source: 'globalMacro.js', external: [{ name: 'World Bank / FRED', seriesIds: ['GDP','CPIAUCSL'] }], renderCheck: 'growthInflationData && growthInflationData.length > 0' },
    { id: 'economic-activity', title: 'Economic Activity', field: 'economicActivityData', fieldPath: 'economicActivityData', source: 'globalMacro.js', external: [{ name: 'OECD / FRED', seriesIds: ['UNRATE'] }], renderCheck: 'economicActivityData && Object.keys(economicActivityData).length > 0' },
    { id: 'imf-weo', title: 'IMF World Economic Outlook', field: 'imfWEO', fieldPath: 'imfWEO', crossMarket: 'imf', source: 'imf.js', external: [{ name: 'IMF', seriesIds: [] }], renderCheck: 'imfCtx?.data?.countries?.length > 0' },
    { id: 'oecd-indicators', title: 'OECD Leading Indicators', field: 'oecdCli', fieldPath: 'oecdCli', source: 'globalMacro.js', external: [{ name: 'OECD (via FRED)', seriesIds: ['USALOLITOAASTSAM'] }], renderCheck: 'oecdCli && Object.keys(oecdCli).length > 0' },
    { id: 'bis-liquidity', title: 'BIS Global Liquidity', field: 'bisCreditToGDP', fieldPath: 'bisCreditToGDP', source: 'globalMacro.js', external: [{ name: 'BIS', seriesIds: [] }], renderCheck: 'bisCreditToGDP && Object.keys(bisCreditToGDP).length > 0' },
  ],

  credit: [
    { id: 'ig-hy', title: 'IG/HY Dashboard', field: 'spreadData', fieldPath: 'spreadData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: ['BAMLH0A0HYM2','BAMLC0A0CM'] }], renderCheck: 'spreadData && Object.keys(spreadData).length > 0' },
    { id: 'em-bonds', title: 'EM Bonds', field: 'emBondData', fieldPath: 'emBondData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: ['BAMLEMCBPIOAS'] }], renderCheck: 'emBondData && Object.keys(emBondData).length > 0' },
    { id: 'loan-market', title: 'Loan Market', field: 'loanData', fieldPath: 'loanData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: [] }], renderCheck: 'loanData && Object.keys(loanData).length > 0' },
    { id: 'default-watch', title: 'Default Watch', field: 'defaultData', fieldPath: 'defaultData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: ['DRSFRWBS'] }], renderCheck: 'defaultData && Object.keys(defaultData).length > 0' },
    { id: 'bis-total-credit', title: 'BIS Total Credit', field: 'bisCreditToGDP', fieldPath: 'bisCreditToGDP', crossMarket: 'globalMacro', source: 'globalMacro.js', external: [{ name: 'BIS', seriesIds: [] }], renderCheck: 'macroCtx?.data?.bisCreditToGDP && Object.keys(macroCtx.data.bisCreditToGDP).length > 0' },
    { id: 'fdic-summary', title: 'FDIC Banking Summary', field: 'summary', fieldPath: 'summary', crossMarket: 'fdic', source: 'fdic.js', external: [{ name: 'FDIC', seriesIds: [] }], renderCheck: 'fdicCtx?.data?.summary' },
    { id: 'ted-spread', title: 'TED Spread', field: 'tedSpread', fieldPath: 'tedSpread', source: 'credit.js', external: [{ name: 'FRED', seriesIds: ['TEDRATE'] }], renderCheck: 'tedSpread && tedSpread.values?.length > 0' },
    { id: 'wb-debt', title: 'World Bank Debt Statistics', field: '(cross-market: worldbank)', fieldPath: 'wbCtx.data.countries', source: 'worldbank.js', external: [{ name: 'World Bank', seriesIds: ['NY.GDP.MKTP.KD.ZG','NE.TRD.GNFS.ZS'] }], renderCheck: 'wbCtx?.data?.countries?.length > 0', renderType: 'WorldBankDebtPanel' },
    { id: 'treasury-credit-holdings', title: 'Treasury Credit Holdings', field: '(cross-market: treasuryTIC)', fieldPath: 'ticCtx.data.latest', source: 'treasuryTIC.js', external: [{ name: 'US Treasury TIC', seriesIds: [] }], renderCheck: 'ticCtx?.data?.latest?.length > 0', renderType: 'TreasuryCreditHoldingsPanel' },
  ],

  sentiment: [
    { id: 'fear-greed', title: 'Fear & Greed', field: 'fearGreedData', fieldPath: 'fearGreedData', source: 'sentiment.js', external: [{ name: 'CNN / Alternative.me', seriesIds: [] }], renderCheck: 'fearGreedData && Object.keys(fearGreedData).length > 0' },
    { id: 'cftc', title: 'CFTC Positioning', field: 'cftcData', fieldPath: 'cftcData', source: 'sentiment.js', external: [{ name: 'CFTC Socrata', seriesIds: [] }], renderCheck: 'cftcData && cftcData.length > 0' },
    { id: 'risk-dashboard', title: 'Risk Dashboard', field: 'riskData', fieldPath: 'riskData', source: 'sentiment.js', external: [{ name: 'FRED', seriesIds: ['BAMLH0A0HYM2','T10Y2Y'] }], renderCheck: 'riskData && Object.keys(riskData).length > 0' },
    { id: 'cross-asset', title: 'Cross-Asset Returns', field: 'returnsData', fieldPath: 'returnsData', source: 'sentiment.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'returnsData && Object.keys(returnsData).length > 0' },
    { id: 'eurostat-confidence', title: 'Eurostat Confidence', field: 'eurostatConfidence', fieldPath: 'eurostatConfidence', crossMarket: 'eurostat', source: 'eurostat.js', external: [{ name: 'Eurostat', seriesIds: [] }], renderCheck: 'eurostatCtx?.data?.confidence' },
    { id: 'oecd-leading', title: 'OECD Leading Indicators', field: 'oecdCli', fieldPath: 'oecdCli', crossMarket: 'globalMacro', source: 'globalMacro.js', external: [{ name: 'OECD (via FRED)', seriesIds: ['USALOLITOAASTSAM'] }], renderCheck: 'macroCtx?.data?.oecdCli && Object.keys(macroCtx.data.oecdCli).length > 0' },
  ],

  calendar: [
    { id: 'economic-calendar', title: 'Economic Calendar', field: 'economicEvents', fieldPath: 'economicEvents', source: 'calendar.js', external: [{ name: 'FRED Releases', seriesIds: [] }], renderCheck: 'economicEvents && economicEvents.length > 0' },
    { id: 'central-bank-schedule', title: 'Central Bank Schedule', field: 'centralBanks', fieldPath: 'centralBanks', source: 'calendar.js', external: [{ name: 'Static', seriesIds: [] }], renderCheck: 'centralBanks && centralBanks.length > 0' },
    { id: 'earnings', title: 'Earnings Season', field: 'earningsSeason', fieldPath: 'earningsSeason', source: 'calendar.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'earningsSeason && earningsSeason.length > 0' },
  ],

  equityDeepDive: [
    { id: 'sector-rotation', title: 'Sector Rotation', field: 'sectorData', fieldPath: 'sectorData', source: 'equityDeepDive.js', external: [{ name: 'Yahoo Finance ETFs', seriesIds: ['XLK','XLF','XLE'] }], renderCheck: 'sectorData && sectorData.length > 0' },
    { id: 'factor-rankings', title: 'Factor Rankings', field: 'factorData', fieldPath: 'factorData', source: 'equityDeepDive.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'factorData && factorData.length > 0' },
    { id: 'earnings-watch', title: 'Earnings Watch', field: 'earningsData', fieldPath: 'earningsData', source: 'equityDeepDive.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'earningsData && earningsData.length > 0' },
    { id: 'short-interest', title: 'Short Interest', field: 'shortData', fieldPath: 'shortData', source: 'equityDeepDive.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'shortData && shortData.length > 0' },
    { id: 'insider', title: 'Insider Trading', field: 'insiderData', fieldPath: 'insiderData.transactions', source: 'equityDeepDive.js', external: [{ name: 'Yahoo Finance / SEC Form 4', seriesIds: [] }], renderCheck: 'insiderData && (insiderData.transactions?.length > 0 || insiderData.holders?.length > 0)' },
    { id: 'sec-13f', title: 'SEC 13F Holdings', field: 'holdings', fieldPath: 'holdings', crossMarket: 'institutional', source: 'institutional.js', external: [{ name: 'SEC 13F', seriesIds: [] }], renderCheck: 'instCtx?.data?.holdings?.length > 0' },
  ],

  eia: [
    { id: 'prices', title: 'US Electricity Retail Prices', field: 'electricity', fieldPath: 'electricity', source: 'eia.js', external: [{ name: 'EIA', seriesIds: ['elecResidential','elecCommercial','elecIndustrial'] }], renderCheck: 'electricity && (electricity.residential || electricity.commercial || electricity.industrial)' },
    { id: 'consumption', title: 'Electricity Consumption', field: 'electricity', fieldPath: 'electricity', source: 'eia.js', external: [{ name: 'EIA', seriesIds: ['elecResidential','elecCommercial','elecIndustrial'] }], renderCheck: 'electricity && Object.keys(electricity).length > 0' },
    { id: 'trends', title: 'Price Trends (3-Year Monthly)', field: 'electricity', fieldPath: 'electricity', source: 'eia.js', external: [{ name: 'EIA', seriesIds: ['elecResidential','elecCommercial','elecIndustrial'] }], renderCheck: 'electricity && Object.keys(electricity).length > 0' },
    { id: 'co2', title: 'CO₂ Emissions by Sector (US)', field: 'co2Emissions', fieldPath: 'co2Emissions', source: 'eia.js', external: [{ name: 'EIA', seriesIds: ['co2Total','co2BySector'] }], renderCheck: 'co2Emissions && (co2Emissions.total || co2Emissions.bySector)' },
    { id: 'petroleum', title: 'Petroleum', field: 'petroleum', fieldPath: 'petroleum', source: 'eia.js', external: [{ name: 'EIA', seriesIds: ['RWTC','RBRTE','EER_EPMRU_PF4_RGC_DPG','EER_EPD2DXL0_PF4_RGC_DPG','EER_EPD2F_PF4_Y35NY_DPG'] }], renderCheck: 'petroleum && (petroleum.wti || petroleum.brent)' },
    { id: 'natural-gas', title: 'Natural Gas', field: 'naturalGas', fieldPath: 'naturalGas', source: 'eia.js', external: [{ name: 'EIA', seriesIds: ['RNGWHHD'] }], renderCheck: 'naturalGas && naturalGas.henryHub' },
  ],

  bls: [
    { id: 'kpi', title: 'Key Labor Market Indicators', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['UNRATE','CIVPART','PAYEMS','CPIAUCSL'] }], renderCheck: 'series && Object.keys(series).length > 0' },
    { id: 'trends-top', title: 'Trends (3-Year) — Top', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['UNRATE','CIVPART','PAYEMS','CPIAUCSL','PPIFIS'] }], renderCheck: 'series && Object.keys(series).length > 0' },
    { id: 'trends-bottom', title: 'Trends (3-Year) — Bottom', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['UNRATE','CIVPART','PAYEMS','CPIAUCSL','PPIFIS'] }], renderCheck: 'series && Object.keys(series).length > 0' },
    { id: 'jolts', title: 'JOLTS', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['JTSJOL','JTSQUR','JTSHIR','JTSLDL'] }], renderCheck: 'series?.jolts?.latest?.value != null' },
    { id: 'productivity', title: 'Productivity', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['OPHNFB','ULCNFB'] }], renderCheck: 'series?.productivity?.latest?.value != null' },
    { id: 'cpi-components', title: 'CPI Components', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['CPIAUCSL','CPILFESL','CPIAPPSL','CPITRNSL','CPIMEDSL'] }], renderCheck: 'series?.cpiComponents?.latest?.value != null' },
    { id: 'ppi-by-industry', title: 'PPI by Industry', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['PPIFIS','PPIACO','WPUFD49207'] }], renderCheck: 'series?.ppiByIndustry?.latest?.value != null' },
    { id: 'eci', title: 'Employment Cost Index', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['ECIWAG','ECIBEN','ECICOMP'] }], renderCheck: 'series?.eci?.latest?.value != null' },
    { id: 'unemployment-duration', title: 'Unemployment Duration', field: 'series', fieldPath: 'series', source: 'bls.js', external: [{ name: 'BLS/FRED', seriesIds: ['UEMPMEAN','UEMPMED'] }], renderCheck: 'series?.unemploymentDuration?.latest?.value != null' },
  ],
};

// Markets that have panel registry entries (for the dropdown)
export const TRACEABLE_MARKETS = Object.keys(PANEL_REGISTRY);