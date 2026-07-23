/**
 * Explicit data-placeholder inventory per panel.
 *
 * A "placeholder" is one discrete value the UI is built to show (KPI, table
 * cell, chart series, list). Green health requires a high fill rate of these
 * slots — not merely "any one field non-null".
 *
 * path: dotted path from the market's primary API payload (or crossMarket.data)
 * anyOf: first non-empty path wins
 * required: if true, missing slot always fails the panel (default true)
 */

/** @typedef {{ id: string, path?: string, anyOf?: string[], crossMarket?: string, required?: boolean }} Placeholder */

function p(id, path, extra = {}) {
  return { id, path, required: true, ...extra };
}
function any(id, paths, extra = {}) {
  return { id, anyOf: paths, required: true, ...extra };
}

/** @type {Record<string, Placeholder[]>} key = `${marketId}:${panelId}` */
export const PANEL_PLACEHOLDERS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // COMMODITIES — Supply & Demand (canonical multi-slot example)
  // UI: 4 KPI pills + surplus table (4 rows × key metrics) + 4 chart series
  // ═══════════════════════════════════════════════════════════════════════════
  'commodities:supply': [
    p('kpi.crudeStocks.latest', 'supplyDemand.crudeStocks.latest'),
    p('kpi.crudeStocks.avg5yr', 'supplyDemand.crudeStocks.avg5yr'),
    p('kpi.natGas.latest', 'supplyDemand.natGasStorage.latest'),
    p('kpi.natGas.avg5yr', 'supplyDemand.natGasStorage.avg5yr'),
    p('kpi.crudeProduction.latest', 'supplyDemand.crudeProduction.values'),
    any('kpi.gold.latest', ['fred.gold_am.value', 'fred.gold_am.history', 'yahoo.futures.GC=F.price']),
    p('series.crudeStocks', 'supplyDemand.crudeStocks.values'),
    p('series.natGasStorage', 'supplyDemand.natGasStorage.values'),
    p('series.crudeProduction', 'supplyDemand.crudeProduction.values'),
    p('series.gasolineStocks', 'supplyDemand.gasolineStocks.values'),
    p('series.distillateStocks', 'supplyDemand.distillateStocks.values'),
    p('table.crude.latest', 'supplyDemand.crudeStocks.latest'),
    p('table.gasoline.latest', 'supplyDemand.gasolineStocks.latest'),
    p('table.distillate.latest', 'supplyDemand.distillateStocks.latest'),
    p('table.natGas.latest', 'supplyDemand.natGasStorage.latest'),
  ],

  'commodities:sidebar': [
    any('dbc.price', ['yahoo.dbc.price', 'yahoo.futures.DBC=F.price']),
    any('gold.price', ['yahoo.futures.GC=F.price', 'fred.gold_am.value']),
    any('wti.price', ['eia.wti_price.value', 'fred.wti.value', 'yahoo.futures.CL=F.price']),
    any('natgas.price', ['eia.natgas.value', 'fred.natgas.value', 'yahoo.futures.NG=F.price']),
  ],
  'commodities:prices': [
    any('wti', ['eia.wti_price.value', 'fred.wti.value', 'yahoo.futures.CL=F.price']),
    any('brent', ['eia.brent_price.value', 'fred.brent.value', 'yahoo.futures.BZ=F.price']),
    any('natgas', ['eia.natgas.value', 'fred.natgas.value', 'yahoo.futures.NG=F.price']),
    any('gold', ['yahoo.futures.GC=F.price', 'fred.gold_am.value']),
    any('silver', ['yahoo.futures.SI=F.price', 'fred.silver.value']),
    any('copper', ['yahoo.futures.HG=F.price', 'fred.copper.value']),
  ],
  'commodities:futures': [
    p('curve.labels', 'futuresCurveData.labels'),
    p('curve.prices', 'futuresCurveData.prices'),
    any('curve.spot', ['futuresCurveData.spotPrice', 'futuresCurveData.prices', 'yahoo.futures.CL=F.price', 'eia.wti_price.value']),
    any('gold.labels', ['goldFuturesCurve.labels', 'yahoo.futures.GC=F.price']),
    any('gold.prices', ['goldFuturesCurve.prices', 'yahoo.futures.GC=F.price']),
    any('gold.spot', ['goldFuturesCurve.spotPrice', 'yahoo.futures.GC=F.price']),
  ],
  'commodities:sector': [
    any('futures.map', ['yahoo.futures', 'fred']),
  ],
  'commodities:wti-brent': [
    any('wti', ['eia.wti_price.value', 'fred.wti.value', 'yahoo.futures.CL=F.price']),
    any('brent', ['eia.brent_price.value', 'fred.brent.value', 'yahoo.futures.BZ=F.price']),
  ],
  'commodities:cot': [
    any('cot', ['cotData', 'cftcTFF.contracts']),
  ],
  'commodities:comfx': [
    any('dollar', ['fred.dollarIndex.value', 'fred.dollarIndex']),
  ],
  'commodities:energy-stack': [
    any('wti', ['eia.wti_price.value', 'eia.brent_price.value']),
    any('natgas', ['eia.natgas.value', 'eia.natgas_storage.value']),
    any('gasoline', ['eia.gasoline_regular.value', 'eia.gasoline_padd1.value']),
  ],
  'commodities:curve-board': [
    p('labels', 'futuresCurveData.labels'),
    p('prices', 'futuresCurveData.prices'),
  ],
  'commodities:precious-complex': [
    any('gold', ['yahoo.futures.GC=F.price', 'yahoo.futures.GC=F', 'priceDashboardData']),
    any('silver', ['yahoo.futures.SI=F.price', 'yahoo.futures.SI=F', 'priceDashboardData']),
    any('platinum', ['yahoo.futures.PL=F.price', 'yahoo.futures.PL=F']),
    any('palladium', ['yahoo.futures.PA=F.price', 'yahoo.futures.PA=F']),
  ],
  'commodities:eia-petrol': [
    any('petroleum', ['eia.petroleum', 'eia.wti_price', 'eiaPetroleum.gasoline']),
  ],
  'commodities:physical-pressure': [
    p('crudeStocks', 'supplyDemand.crudeStocks.latest'),
    p('natGas', 'supplyDemand.natGasStorage.latest'),
    any('eia', ['eia.crude_stocks', 'eia.natgas_storage', 'eia']),
  ],
  'commodities:usda-ag': [
    any('ag', ['fred.wheat', 'fred.rice', 'fred.corn', 'worldBank', 'usda.commodities']),
  ],
  'commodities:fao-prices': [
    any('food', ['fao.foodPriceIndex', 'worldBank', 'fred.wheat']),
  ],
  'commodities:materials-grid': [any('metals', ['fred', 'yahoo.futures'])],
  'commodities:criticality': [any('fred', ['fred'])],
  'commodities:battery-chain': [any('copper', ['fred.copper', 'fred'])],
  'commodities:regime': [any('yahoo', ['yahoo', 'fred'])],
  'commodities:material-detail': [any('fred', ['fred'])],
  'commodities:exposure-matrix': [any('yahoo', ['yahoo.futures', 'yahoo'])],

  // ═══════════════════════════════════════════════════════════════════════════
  // BONDS
  // ═══════════════════════════════════════════════════════════════════════════
  'bonds:kpi': [
    p('us.3m', 'yieldCurveData.US.3m'),
    p('us.2y', 'yieldCurveData.US.2y'),
    p('us.10y', 'yieldCurveData.US.10y'),
    p('us.30y', 'yieldCurveData.US.30y'),
    any('fedFunds', ['treasuryRates.fedFunds', 'macroData.centralBankRates.US']),
  ],
  'bonds:yield': [
    p('us', 'yieldCurveData.US'),
    p('de', 'yieldCurveData.DE'),
    p('jp', 'yieldCurveData.JP'),
    p('gb', 'yieldCurveData.GB'),
  ],
  'bonds:metrics': [
    any('t10y2y', ['spreadIndicators.t10y2y', 'spreadIndicators.T10Y2Y', 'spreadHistory.t10y2y']),
    any('t10y3m', ['spreadIndicators.t10y3m', 'spreadIndicators.T10Y3M', 'spreadHistory.t10y3m']),
  ],
  'bonds:credit': [
    any('ig', ['spreadData.current.igSpread', 'spreadData.current.IG', 'spreadData.IG']),
    any('hy', ['spreadData.current.hySpread', 'spreadData.current.HY', 'spreadData.HY']),
    any('em', ['spreadData.current.emSpread', 'spreadData.current.EM', 'spreadData.EM']),
  ],
  'bonds:realYield': [
    any('tips5', ['tipsYields.5y', 'tipsYields.dfii5', 'tipsYields']),
    any('tips10', ['tipsYields.10y', 'tipsYields.dfii10', 'tipsYields']),
  ],
  'bonds:ratings': [p('countries', 'creditRatings.countries')],
  'bonds:curvespreads': [
    p('dates', 'spreadHistory.dates'),
    any('t10y2y', ['spreadHistory.t10y2y', 'spreadHistory.T10Y2Y']),
  ],
  'bonds:fed': [p('dates', 'fedBalanceSheetHistory.dates'), p('values', 'fedBalanceSheetHistory.values')],
  'bonds:m2': [p('dates', 'm2HistoryData.dates'), p('values', 'm2HistoryData.values')],
  'bonds:cpi': [p('dates', 'cpiComponents.dates'), any('all', ['cpiComponents.all', 'cpiComponents.latest'])],
  'bonds:debtgdp': [p('dates', 'debtToGdpHistory.dates'), p('values', 'debtToGdpHistory.values')],
  'bonds:breakevens': [any('be5y', ['breakevensData.current.be5y', 'breakevensData.be5y'])],
  'bonds:duration': [p('buckets', 'durationLadder.buckets')],
  'bonds:macro': [any('macro', ['macroData', 'nationalDebt', 'fedBalanceSheetHistory.values'])],
  'bonds:foreign-holders': [p('latest', 'latest', { crossMarket: 'treasuryTIC' })],
  'bonds:money-market': [p('sofr', 'sofr', { crossMarket: 'nyfed' })],
  'bonds:auctions': [any('auctions', ['auctionData', 'auctions'])],
  'bonds:ecb-yields': [p('policyRates', 'policyRates', { crossMarket: 'ecb' })],
  'bonds:global-rates': [p('curve', 'yieldCurveData')],
  'bonds:treasury-cost': [p('latest', 'latest', { crossMarket: 'treasuryCost' })],

  // ═══════════════════════════════════════════════════════════════════════════
  // FX
  // ═══════════════════════════════════════════════════════════════════════════
  'fx:kpi': [
    p('EUR', 'spotRates.EUR'),
    p('JPY', 'spotRates.JPY'),
    p('GBP', 'spotRates.GBP'),
    any('dxy', ['dxyHistory.values', 'dxyHistory.dates']),
  ],
  'fx:sidebar': [p('spotRates', 'spotRates')],
  'fx:movers': [p('changes1d', 'changes1d')],
  'fx:dxy': [p('dates', 'dxyHistory.dates'), p('values', 'dxyHistory.values')],
  'fx:cot': [p('cotHistory', 'cotHistory')],
  'fx:corr': [p('history', 'history')],
  'fx:reer': [any('reer', ['reer.dates', 'reer'])],
  'fx:ratediff': [p('rateDifferentials', 'rateDifferentials')],
  'fx:carry': [p('rateDifferentials', 'rateDifferentials')],
  'fx:rate-dashboard': [p('rateDifferentials', 'rateDifferentials')],
  'fx:imf-cofer': [
    any('reserves', ['imfReserves.reserves', 'imfReserves', 'imf.cofer', 'cofer']),
    any('usdShare', ['imfReserves.reserves.USD', 'imf.cofer.USD', 'cofer.USD']),
    any('eurShare', ['imfReserves.reserves.EUR', 'imf.cofer.EUR', 'cofer.EUR']),
  ],
  'fx:treasury-tic': [p('latest', 'latest', { crossMarket: 'treasuryTIC' })],
  'fx:bis-reer': [any('reer', ['reer.dates', 'reer'])],

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVATIVES / CRYPTO / CREDIT / others — multi-slot where known
  // ═══════════════════════════════════════════════════════════════════════════
  'derivatives:kpi': [p('vixTerm', 'vixTermStructure'), any('vix', ['vixEnrichment', 'fredVixHistory'])],
  'derivatives:metrics': [any('enrich', ['vixEnrichment', 'putCallRatio', 'vixPercentile'])],
  'derivatives:vixterm': [p('vixTermStructure', 'vixTermStructure')],
  'derivatives:vix1y': [p('fredVixHistory', 'fredVixHistory')],
  'derivatives:skew': [
    any('spot', ['skewIndex.value', 'skewIndex']),
    any('history', ['skewHistory.values', 'skewHistory']),
  ],
  'derivatives:volsurf': [p('volSurfaceData', 'volSurfaceData')],
  'derivatives:flow': [p('optionsFlow', 'optionsFlow')],
  'derivatives:gamma': [p('gammaExposure', 'gammaExposure')],
  'derivatives:volprem': [p('volPremium', 'volPremium')],
  'derivatives:cftc-tff': [p('contracts', 'contracts', { crossMarket: 'cftcTFF' })],
  'derivatives:bis-otc': [
    any('otc.total', ['categories.total.series', 'categories.total'], { crossMarket: 'bisOTC' }),
    any('otc.ir', ['categories.ir.series', 'categories.ir'], { crossMarket: 'bisOTC' }),
    any('otc.fx', ['categories.fx.series', 'categories.fx'], { crossMarket: 'bisOTC' }),
    any('otc.any', ['categories'], { crossMarket: 'bisOTC' }),
  ],
  'derivatives:ecb-derivatives': [p('policyRates', 'policyRates', { crossMarket: 'ecb' })],

  'crypto:sidebar': [p('coins', 'coinMarketData.coins')],
  'crypto:top-cryptos': [p('coins', 'coinMarketData.coins')],
  'crypto:fear-greed': [any('fg', ['fearGreedData.value', 'fearGreedData.score', 'fearGreedData'])],
  'crypto:funding': [p('funding', 'fundingData')],
  'crypto:defi-tvl': [any('defi', ['defiData.chains', 'defiData'])],
  'crypto:exchanges': [p('exchanges', 'topExchanges')],
  'crypto:onchain': [p('onchain', 'onChainData')],
  'crypto:onchain-chart': [p('onchain', 'onChainData')],
  'crypto:stablecoin-composition': [p('stablecoinMcap', 'stablecoinMcap')],
  'crypto:defi-tvl-trend': [any('defi', ['defiData.chains', 'defiData'])],
  'crypto:btc-onchain': [p('onchain', 'onChainData')],

  'credit:kpi': [any('spread', ['spreadData.current', 'spreadData'])],
  'credit:key-metrics': [any('spread', ['spreadData.current', 'spreadData'])],
  'credit:credit-spreads': [any('spread', ['spreadData.current', 'spreadData.history', 'spreadData'])],
  'credit:spread-summary': [any('spread', ['spreadData.current', 'spreadData'])],
  'credit:em-spread': [p('em', 'emBondData')],
  'credit:em-yields': [p('em', 'emBondData')],
  'credit:cp-rates': [any('cp', ['commercialPaper.rate', 'commercialPaper'])],
  'credit:clo-tranches': [p('loan', 'loanData')],
  'credit:default-rates': [p('default', 'defaultData')],
  'credit:delinquency': [p('delinq', 'delinquencyRates')],
  'credit:bank-sector': [p('fdic', 'aggregate', { crossMarket: 'fdic' })],
  'credit:credit-quality': [any('cq', ['creditQuality', 'spreadData'])],
  'credit:muni-market': [p('msrb', 'summary', { crossMarket: 'msrb' })],
  'credit:bank-stress': [any('lend', ['lendingStandards', 'spreadData'])],
  'credit:ted-spread': [any('ted', ['tedSpread.values', 'tedSpread.latest', 'tedSpread'])],
  'credit:wb-debt': [p('countries', 'countries', { crossMarket: 'worldbank' })],
  'credit:bis-total-credit': [
    any('bis.us', ['bisCreditToGDP.US.latest', 'bisCreditToGDP.US', 'bisCreditToGDP'], { crossMarket: 'globalMacro' }),
    any('bis.jp', ['bisCreditToGDP.JP.latest', 'bisCreditToGDP.JP'], { crossMarket: 'globalMacro' }),
    any('bis.any', ['bisCreditToGDP'], { crossMarket: 'globalMacro' }),
  ],
  'credit:treasury-credit-holdings': [p('tic', 'latest', { crossMarket: 'treasuryTIC' })],

  'insurance:kpi': [
    p('hyOAS', 'hyOAS'),
    p('igOAS', 'igOAS'),
    any('industryAvg', ['industryAvgCombinedRatio', 'combinedRatioData']),
    any('sectorETF', ['sectorETF.price', 'sectorETF']),
  ],
  'insurance:hyoas': [
    any('hyLatest', ['hyOAS']),
    any('hyHistory', ['fredHyOasHistory.values', 'fredHyOasHistory']),
  ],
  'insurance:catloss': [
    // Either FRED $ losses or FEMA declaration stream is enough for this panel
    any('catStream', ['catLosses.values', 'catLosses', 'fema.declarations', 'fema.byType', 'fema.summary']),
  ],
  'insurance:crhist': [
    any('history', ['combinedRatioHistory.values', 'combinedRatioHistory']),
    any('industryAvg', ['industryAvgCombinedRatio']),
    any('lines', ['combinedRatioData.lines', 'combinedRatioData']),
  ],
  'insurance:crline': [
    p('quarters', 'combinedRatioData.quarters'),
    p('lines', 'combinedRatioData.lines'),
  ],
  'insurance:reinsrates': [
    any('pricing', ['reinsurancePricing']),
    any('reinsurers', ['reinsurers']),
  ],
  'insurance:reserves': [
    p('lines', 'reserveAdequacyData.lines'),
    p('adequacy', 'reserveAdequacyData.adequacy'),
  ],
  'insurance:catbonds': [
    any('proxy', ['catBondProxy.price', 'catBondProxy']),
    any('spreads', ['catBondSpreads']),
  ],
  'insurance:etfs': [
    p('price', 'sectorETF.price'),
    any('change', ['sectorETF.changePct', 'sectorETF']),
  ],
  'insurance:catastrophes': [p('fema', 'declarations', { crossMarket: 'fema' })],
  'insurance:ins-penetration': [p('wb', 'countries', { crossMarket: 'worldbank' })],
  'insurance:combined-ratios': [p('edgar', 'issuers', { crossMarket: 'edgarInsurerRatios' })],
  'insurance:cat-exposure': [any('cat', ['catLosses.values', 'catLosses', 'fema.declarations', 'fema.summary', 'usgs.events'])],
  'insurance:usgs-minerals': [p('usgs', 'events', { crossMarket: 'usgs' })],
  'insurance:ecb-supervisory': [p('ecb', 'policyRates', { crossMarket: 'ecb' })],
  'insurance:wb-ins-penetration': [p('wb', 'countries', { crossMarket: 'worldbank' })],
  'insurance:fema-disasters': [p('fema', 'declarations', { crossMarket: 'fema' })],
  'insurance:usgs-earthquakes': [p('usgs', 'events', { crossMarket: 'usgs' })],

  'realEstate:metrics': [any('mtg', ['mortgageRates.rate30y', 'mortgageRates'])],
  'realEstate:shiller': [any('cs', ['caseShillerData.values', 'caseShillerData'])],
  'realEstate:reitetf': [any('vnq', ['reitEtf.price', 'reitEtf'])],
  'realEstate:reitperf': [p('reitData', 'reitData')],
  'realEstate:foreclosure': [p('foreclosureData', 'foreclosureData')],
  'realEstate:mba': [any('mtg', ['mortgageRates', 'mbaApplications'])],
  'realEstate:cre': [p('creDelinquencies', 'creDelinquencies')],
  'realEstate:caprate': [p('capRateData', 'capRateData')],
  'realEstate:afford': [p('affordabilityData', 'affordabilityData')],
  'realEstate:supply': [p('supplyData', 'supplyData')],
  'realEstate:hud-afford': [any('hud', ['hudData', 'affordabilityData'])],
  'realEstate:afford-stack': [p('affordabilityData', 'affordabilityData')],
  'realEstate:census-housing': [p('series', 'series', { crossMarket: 'census' })],
  'realEstate:census-trade': [p('series', 'series', { crossMarket: 'census' })],
  'realEstate:census-trends-housing': [p('series', 'series', { crossMarket: 'census' })],
  'realEstate:census-trends-trade': [p('series', 'series', { crossMarket: 'census' })],
  'realEstate:fhfa-hpi': [p('fhfaHpi', 'fhfaHpi')],
  'realEstate:bis-property-prices': [p('priceIndexData', 'priceIndexData')],
  'realEstate:metro-case-shiller': [p('caseShillerData', 'caseShillerData')],
  'realEstate:hud-affordability-by-metro': [any('hud', ['hudData', 'affordabilityData'])],

  'globalMacro:kpi': [p('scorecard', 'scorecardData')],
  'globalMacro:sidebar': [p('scorecard', 'scorecardData')],
  'globalMacro:scorecard': [p('scorecard', 'scorecardData')],
  'globalMacro:gdp': [p('growth', 'growthInflationData')],
  'globalMacro:cpi': [p('growth', 'growthInflationData')],
  'globalMacro:rates': [p('cb', 'centralBankData')],
  'globalMacro:debt': [p('debt', 'debtData')],
  'globalMacro:activity': [any('act', ['cfnai', 'industrialProd', 'consumerSentiment', 'economicActivityData'])],
  'globalMacro:cli': [p('oecdCli', 'oecdCli')],
  'globalMacro:imf-reserves': [any('ifs', ['imf.ifsReserves', 'imf.countries'])],
  'globalMacro:imf-cofer': [any('cofer', ['imf.cofer', 'cofer'])],
  'globalMacro:wb-trade': [p('wb', 'countries', { crossMarket: 'worldbank' })],
  'globalMacro:wb-dev': [p('wb', 'countries', { crossMarket: 'worldbank' })],
  'globalMacro:ecb-eur': [p('ecb', 'policyRates', { crossMarket: 'ecb' })],
  'globalMacro:tga-balance': [p('dts', 'series', { crossMarket: 'treasuryDTS' })],
  'globalMacro:gdpnow': [p('gdpnow', 'currentQuarter', { crossMarket: 'fedGDPNow' })],
  'globalMacro:fomc-sep': [p('sep', 'projections', { crossMarket: 'fedSEP' })],
  'globalMacro:cleveland': [p('nowcast', 'latest', { crossMarket: 'fedInflationNowcast' })],
  'globalMacro:bea-accounts': [p('bea', 'gdpComponents', { crossMarket: 'bea' })],
  'globalMacro:eurostat': [p('euro', 'hicp', { crossMarket: 'eurostat' })],
  'globalMacro:oecd-direct': [p('oecd', 'cli', { crossMarket: 'oecd' })],
  'globalMacro:bea-income': [p('bea', 'personalIncome', { crossMarket: 'bea' })],
  'globalMacro:global-liquidity': [
    any('bis', ['bisCreditToGDP']),
    any('m2', ['m2Growth']),
    any('scorecard', ['scorecardData']),
  ],

  'equities:kpi': [p('indices', 'indices')],
  'equities:heatmap': [p('quotes', 'quotes')],
  'equities:sidebar': [p('quotes', 'quotes')],
  'equities:portfolio': [p('quotes', 'quotes')],
  'equities:universe-updates': [any('u', ['universe', 'quotes', 'universeUpdates.updates'])],
  'equities:sec-fundamentals': [p('edgar', 'tickers', { crossMarket: 'edgar' })],
  'equities:sec-filings': [p('filings', 'byTicker', { crossMarket: 'edgarFilingActivity' })],
  'equities:bea-corporate-profits': [
    any('profits', ['corporateProfits', 'gdpComponents'], { crossMarket: 'bea' }),
    any('gdp', ['gdpComponents'], { crossMarket: 'bea' }),
    any('saving', ['savingRate'], { crossMarket: 'bea' }),
  ],
  'equities:wb-market-cap': [p('wb', 'countries', { crossMarket: 'worldbank' })],

  'equitiesDeepDive:kpi': [p('sectorData', 'sectorData')],
  'equitiesDeepDive:sidebar': [p('sectorData', 'sectorData')],
  'equitiesDeepDive:valuation': [any('val', ['spPE', 'buffettIndicator', 'equityRiskPremium', 'sectorData'])],
  'equitiesDeepDive:etf': [p('sectorData', 'sectorData')],
  'equitiesDeepDive:factor-favor': [p('factorData', 'factorData')],
  'equitiesDeepDive:sector-beat': [p('sectorData', 'sectorData')],
  'equitiesDeepDive:shorted': [p('shortData', 'shortData')],
  'equitiesDeepDive:scores': [p('factorData', 'factorData')],
  'equitiesDeepDive:earnings': [p('earningsData', 'earningsData')],
  'equitiesDeepDive:institutions': [p('inst', 'institutions', { crossMarket: 'institutional' })],
  'equitiesDeepDive:insider': [p('insiderData', 'insiderData')],
  'equitiesDeepDive:earnings-quality': [p('earningsData', 'earningsData')],

  'sentiment:sidebar': [any('fg', ['fearGreedData', 'riskData'])],
  'sentiment:key-metrics': [p('riskData', 'riskData')],
  'sentiment:fear-greed': [p('fearGreedData', 'fearGreedData')],
  'sentiment:fsi': [any('fsi', ['fsiHistory', 'riskData'])],
  'sentiment:cftc': [p('cftcData', 'cftcData')],
  'sentiment:cross-asset': [p('returnsData', 'returnsData')],
  'sentiment:risk-dashboard': [p('riskData', 'riskData')],
  'sentiment:leverage': [
    any('margin', ['marginDebt.values', 'marginDebt']),
    any('consumer', ['consumerCredit.values', 'consumerCredit']),
    any('flows', ['mutualFundFlows.values', 'mutualFundFlows']),
  ],
  'sentiment:news-sentiment': [p('news', 'series', { crossMarket: 'fedNewsSentiment' })],
  'sentiment:fed-risk-mood': [p('news', 'series', { crossMarket: 'fedNewsSentiment' })],

  'calendar:kpi': [p('events', 'economicEvents')],
  'calendar:economic': [p('events', 'economicEvents')],
  'calendar:sidebar': [p('cb', 'centralBanks')],
  'calendar:cb-rates': [p('cb', 'centralBanks')],
  'calendar:cb-timeline': [p('cb', 'centralBanks')],
  'calendar:earnings': [p('earnings', 'earningsSeason')],
  'calendar:key-data': [any('kr', ['keyReleases', 'economicEvents'])],
  'calendar:treasury': [any('ta', ['treasuryAuctions', 'auctions'])],
  'calendar:options': [p('options', 'optionsExpiry')],
  'calendar:release-impact': [any('kr', ['keyReleases', 'economicEvents'])],
  'calendar:catalyst-wall': [p('events', 'economicEvents')],

  'bls:kpi': [p('series', 'series')],
  'bls:trends-top': [p('series', 'series')],
  'bls:trends-bottom': [p('series', 'series')],
  'bls:jolts': [p('series', 'series')],
  'bls:productivity': [p('series', 'series')],
  'bls:cpi-components': [p('series', 'series')],
  'bls:ppi-by-industry': [p('series', 'series')],
  'bls:eci': [p('series', 'series')],
  'bls:unemployment-duration': [p('series', 'series')],

  'eia:kpi': [p('petroleum', 'petroleum')],
  'eia:prices': [any('p', ['petroleum', 'naturalGas'])],
  'eia:electricity': [p('electricity', 'electricity')],
  'eia:petroleum': [p('petroleum', 'petroleum')],
  'eia:natural-gas': [p('naturalGas', 'naturalGas')],
  'eia:co2': [p('co2', 'co2Emissions')],
  'eia:consumption': [any('c', ['electricity', 'petroleum'])],
  'eia:trends': [any('t', ['petroleum', 'naturalGas', 'electricity'])],
  'eia:summary': [p('petroleum', 'petroleum')],

  // Empty triggered list is healthy (All Clear) — score rules as live slots too.
  'alerts:kpi': [
    any('status', ['alerts', 'rules']),
    p('rules', 'rules'),
  ],
  'alerts:active-alerts': [
    any('feed', ['alerts', 'rules']),
  ],
  'alerts:alert-rules': [p('rules', 'rules')],
  'alerts:alert-rules': [p('rules', 'rules')],

  'watchlist:kpi': [p('quotes', 'quotes')],
  'watchlist:my-tickers': [p('quotes', 'quotes')],
  'watchlist:my-metrics': [p('quotes', 'quotes')],

  'analytics:kpi': [any('a', ['date', 'sources'])],
  'analytics:provenance': [p('sources', 'sources')],
  'analytics:diagnostics': [p('sources', 'sources')],
  'analytics:server': [any('a', ['date', 'sources'])],
  'analytics:api-usage': [p('sources', 'sources')],
  'analytics:source-health': [p('sources', 'sources')],
  'analytics:endpoints': [p('sources', 'sources')],
  'analytics:freshness': [any('a', ['date', 'sources'])],
  'analytics:error-log': [p('sources', 'sources')],
  'analytics:mem-cache': [any('a', ['date', 'sources'])],
  'analytics:cache-files': [any('a', ['date', 'sources'])],
  'analytics:routes': [p('sources', 'sources')],
  'analytics:panel-trace': [p('sources', 'sources')],
  'analytics:coverage-matrix': [p('sources', 'sources')],
};

/**
 * Minimum fill rate for a panel to be considered "green" on the data stream.
 * Partial fill (e.g. 2/15 slots) is NOT success.
 */
export const MIN_PLACEHOLDER_FILL_RATE = 0.85;

export function getPanelPlaceholders(marketId, panelId) {
  return PANEL_PLACEHOLDERS[`${marketId}:${panelId}`] || null;
}
