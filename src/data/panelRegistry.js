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
    { id: 'carry', title: 'Carry Map', field: 'carryData', fieldPath: 'carryData', source: 'fx.js', external: [{ name: 'FRED / ECB', seriesIds: ['FEDFUNDS','ECBMRRFR'] }], renderCheck: 'carryData && Object.keys(carryData).length > 0' },
    { id: 'correlation', title: 'Correlation Matrix', field: 'history', fieldPath: 'history', source: 'fx.js:33 (Frankfurter)', external: [{ name: 'Frankfurter', seriesIds: [] }], renderCheck: '!!history && Object.keys(history).length > 0', renderType: 'CurrencyCorrelationMatrix', shapeCheck: SHAPE_CHECKS.fxHistory, notes: 'Component expects history keyed by currency code with array values (e.g. { EUR: [...rates] }), NOT date→currency. If shape is wrong, panel shows "No history available for correlation".' },
    { id: 'reer', title: 'REER Chart', field: 'reerData', fieldPath: 'reerData', source: 'fx.js', external: [{ name: 'BIS', seriesIds: [] }], renderCheck: 'reerData?.dates?.length > 0', renderType: 'SafeECharts' },
  ],

  crypto: [
    { id: 'coin-overview', title: 'Coin Market Overview', field: 'coinMarketData', fieldPath: 'coinMarketData.coins', source: 'crypto.js', external: [{ name: 'CoinGecko', seriesIds: [] }], renderCheck: 'coinMarketData?.coins?.length > 0' },
    { id: 'fear-greed', title: 'Fear & Greed', field: 'fearGreedData', fieldPath: 'fearGreedData', source: 'crypto.js', external: [{ name: 'Alternative.me', seriesIds: [] }], renderCheck: 'fearGreedData && Object.keys(fearGreedData).length > 0' },
    { id: 'defi', title: 'DeFi Chains', field: 'defiData', fieldPath: 'defiData', source: 'crypto.js', external: [{ name: 'DefiLlama', seriesIds: [] }], renderCheck: 'defiData && Object.keys(defiData).length > 0' },
    { id: 'funding', title: 'Funding & Positioning', field: 'fundingData', fieldPath: 'fundingData', source: 'crypto.js', external: [{ name: 'Bybit', seriesIds: [] }], renderCheck: 'fundingData && Object.keys(fundingData).length > 0' },
    { id: 'onchain', title: 'On-Chain Metrics', field: 'onChainData', fieldPath: 'onChainData', source: 'crypto.js', external: [{ name: 'Mempool.space / Etherscan', seriesIds: [] }], renderCheck: 'onChainData && Object.keys(onChainData).length > 0' },
  ],

  equities: [
    { id: 'key-indices', title: 'Key Indices', field: 'indices', fieldPath: 'indices', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: ['^GSPC','^IXIC','^DJI'] }], renderCheck: 'indices && indices.length > 0' },
    { id: 'heatmap', title: 'Heatmap', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0', renderType: 'HeatmapView' },
    { id: 'bar-race', title: 'Bar Race', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0', renderType: 'BarRaceView' },
    { id: 'list', title: 'List View', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0', renderType: 'ListView' },
    { id: 'portfolio', title: 'Portfolio Tracker', field: 'quotes', fieldPath: 'quotes', source: 'stocks.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'quotes && Object.keys(quotes).length > 0' },
  ],

  derivatives: [
    { id: 'vix-term', title: 'VIX Term Structure', field: 'vixTermStructure', fieldPath: 'vixTermStructure', source: 'derivatives.js', external: [{ name: 'Yahoo Finance / FRED', seriesIds: ['VIXCLS'] }], renderCheck: 'vixTermStructure && vixTermStructure.length > 0' },
    { id: 'vol-surface', title: 'Vol Surface', field: 'volSurfaceData', fieldPath: 'volSurfaceData', source: 'derivatives.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'volSurfaceData && Object.keys(volSurfaceData).length > 0' },
    { id: 'options-flow', title: 'Options Flow', field: 'optionsFlow', fieldPath: 'optionsFlow', source: 'derivatives.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'optionsFlow && Object.keys(optionsFlow).length > 0' },
    { id: 'gamma', title: 'Gamma Exposure', field: 'gammaExposure', fieldPath: 'gammaExposure', source: 'derivatives.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'gammaExposure && Object.keys(gammaExposure).length > 0' },
  ],

  realEstate: [
    { id: 'price-index', title: 'Price Index', field: 'caseShiller', fieldPath: 'caseShiller', source: 'realEstate.js', external: [{ name: 'FRED', seriesIds: ['CSUSHPISA'] }], renderCheck: 'caseShiller?.dates?.length > 0', renderType: 'SafeECharts' },
    { id: 'reit', title: 'REIT Screen', field: 'reitData', fieldPath: 'reitData', source: 'realEstate.js', external: [{ name: 'Yahoo Finance', seriesIds: ['VNQ','O','SPG'] }], renderCheck: 'reitData && reitData.length > 0' },
    { id: 'affordability', title: 'Affordability Map', field: 'housingAffordability', fieldPath: 'housingAffordability', source: 'realEstate.js', external: [{ name: 'FRED / NAR', seriesIds: ['MEHOINUSA672N'] }], renderCheck: 'housingAffordability && Object.keys(housingAffordability).length > 0' },
    { id: 'cap-rate', title: 'Cap Rate Monitor', field: 'capRateData', fieldPath: 'capRateData', source: 'realEstate.js', external: [{ name: 'FRED', seriesIds: ['MORTGAGE30US','DGS10'] }], renderCheck: 'capRateData && Object.keys(capRateData).length > 0' },
  ],

  insurance: [
    { id: 'cat-bonds', title: 'Cat Bond Spreads', field: 'catBondSpreads', fieldPath: 'catBondSpreads', source: 'insurance.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'catBondSpreads && catBondSpreads.length > 0' },
    { id: 'combined-ratio', title: 'Combined Ratio', field: 'combinedRatioData', fieldPath: 'combinedRatioData', source: 'insurance.js', external: [{ name: 'FRED / SEC EDGAR', seriesIds: [] }], renderCheck: 'combinedRatioData && Object.keys(combinedRatioData).length > 0' },
    { id: 'reinsurance', title: 'Reinsurance Pricing', field: 'reinsurancePricing', fieldPath: 'reinsurancePricing', source: 'insurance.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'reinsurancePricing && reinsurancePricing.length > 0' },
    { id: 'reserve', title: 'Reserve Adequacy', field: 'reserveAdequacyData', fieldPath: 'reserveAdequacyData', source: 'insurance.js', external: [{ name: 'FRED / SEC EDGAR', seriesIds: [] }], renderCheck: 'reserveAdequacyData && Object.keys(reserveAdequacyData).length > 0' },
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
  ],

  credit: [
    { id: 'ig-hy', title: 'IG/HY Dashboard', field: 'spreadData', fieldPath: 'spreadData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: ['BAMLH0A0HYM2','BAMLC0A0CM'] }], renderCheck: 'spreadData && Object.keys(spreadData).length > 0' },
    { id: 'em-bonds', title: 'EM Bonds', field: 'emBondData', fieldPath: 'emBondData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: ['BAMLEMCBPIOAS'] }], renderCheck: 'emBondData && Object.keys(emBondData).length > 0' },
    { id: 'loan-market', title: 'Loan Market', field: 'loanData', fieldPath: 'loanData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: [] }], renderCheck: 'loanData && Object.keys(loanData).length > 0' },
    { id: 'default-watch', title: 'Default Watch', field: 'defaultData', fieldPath: 'defaultData', source: 'credit.js', external: [{ name: 'FRED', seriesIds: ['DRSFRWBS'] }], renderCheck: 'defaultData && Object.keys(defaultData).length > 0' },
  ],

  sentiment: [
    { id: 'fear-greed', title: 'Fear & Greed', field: 'fearGreedData', fieldPath: 'fearGreedData', source: 'sentiment.js', external: [{ name: 'CNN / Alternative.me', seriesIds: [] }], renderCheck: 'fearGreedData && Object.keys(fearGreedData).length > 0' },
    { id: 'cftc', title: 'CFTC Positioning', field: 'cftcData', fieldPath: 'cftcData', source: 'sentiment.js', external: [{ name: 'CFTC Socrata', seriesIds: [] }], renderCheck: 'cftcData && cftcData.length > 0' },
    { id: 'risk-dashboard', title: 'Risk Dashboard', field: 'riskData', fieldPath: 'riskData', source: 'sentiment.js', external: [{ name: 'FRED', seriesIds: ['BAMLH0A0HYM2','T10Y2Y'] }], renderCheck: 'riskData && Object.keys(riskData).length > 0' },
    { id: 'cross-asset', title: 'Cross-Asset Returns', field: 'returnsData', fieldPath: 'returnsData', source: 'sentiment.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'returnsData && Object.keys(returnsData).length > 0' },
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
    { id: 'insider', title: 'Insider Trading', field: 'insiderData', fieldPath: 'insiderData', source: 'equityDeepDive.js', external: [{ name: 'SEC EDGAR', seriesIds: [] }], renderCheck: 'insiderData && insiderData.length > 0' },
  ],
};

// Markets that have panel registry entries (for the dropdown)
export const TRACEABLE_MARKETS = Object.keys(PANEL_REGISTRY);