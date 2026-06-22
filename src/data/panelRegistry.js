// Panel Registry — maps every panel in every market to its data field path,
// backend source, external API dependencies, and frontend render condition.
// This is the "trace spec" used by the Panel Trace Inspector in Analytics.
//
// Each entry: { id, title, field, fieldPath, source, external, renderCheck }
// - field: top-level key in the API response (e.g. "spreadHistory")
// - fieldPath: dotted path for nested fields (e.g. "durationLadder.buckets")
// - source: backend route file + approximate line (for reference)
// - external: array of { name, seriesIds } for upstream API dependencies
// - renderCheck: description of the frontend condition that gates rendering

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
      notes: 'All-or-nothing Promise.all — if any of 5 FRED series fails, entire field is null',
    },
    {
      id: 'duration', title: 'Duration Ladder',
      field: 'durationLadder', fieldPath: 'durationLadder.buckets',
      source: 'bonds.js:597-677', external: [{ name: 'Treasury Fiscal Data', seriesIds: [] }],
      renderCheck: '!!durationLadderMeta → hasData = buckets.some(b => b.amount != null)',
      renderType: 'DurationLadder component',
    },
    {
      id: 'macro', title: 'Macro Indicators',
      field: 'macroData', fieldPath: 'macroData',
      source: 'bonds.js:519-526', external: [{ name: 'FRED', seriesIds: ['WALCL','M2SL','GFDEBTN','FYFSD','UNRATE','CIVPART','GDP','PCEPI','TB3MS'] }],
      renderCheck: 'macroData && Object.keys(macroData).length > 0',
      renderType: 'Object.entries map → MetricValue',
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
    { id: 'correlation', title: 'Correlation Matrix', field: 'correlationMatrix', fieldPath: 'correlationMatrix', source: 'fx.js', external: [{ name: 'Computed from spotRates', seriesIds: [] }], renderCheck: 'correlationMatrix && Object.keys(correlationMatrix).length > 0' },
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
    { id: 'price-dashboard', title: 'Price Dashboard', field: 'priceDashboardData', fieldPath: 'priceDashboardData', source: 'commoditiesEnhanced.js', external: [{ name: 'FRED / EIA / Yahoo', seriesIds: ['GOLDAMGBD228NLBM','POILWTIUSDM'] }], renderCheck: 'priceDashboardData && priceDashboardData.length > 0' },
    { id: 'futures-curve', title: 'Futures Curve', field: 'futuresCurveData', fieldPath: 'futuresCurveData', source: 'commoditiesEnhanced.js', external: [{ name: 'Yahoo Finance', seriesIds: [] }], renderCheck: 'futuresCurveData && Object.keys(futuresCurveData).length > 0' },
    { id: 'sector-heatmap', title: 'Sector Heatmap', field: 'sectorHeatmapData', fieldPath: 'sectorHeatmapData', source: 'commoditiesEnhanced.js', external: [{ name: 'Computed', seriesIds: [] }], renderCheck: 'sectorHeatmapData && sectorHeatmapData.length > 0' },
    { id: 'supply-demand', title: 'Supply & Demand', field: 'supplyDemandData', fieldPath: 'supplyDemandData', source: 'commoditiesEnhanced.js', external: [{ name: 'EIA / USDA', seriesIds: [] }], renderCheck: 'supplyDemandData && Object.keys(supplyDemandData).length > 0' },
    { id: 'cot', title: 'COT Positioning', field: 'cotData', fieldPath: 'cotData', source: 'commoditiesEnhanced.js', external: [{ name: 'CFTC Socrata', seriesIds: [] }], renderCheck: 'cotData && cotData.length > 0' },
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