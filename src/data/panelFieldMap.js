/**
 * Canonical mapping: MARKET_PANELS id → API field path(s).
 * Used by panel health (fetch gate). Keep aligned with market dashboards.
 *
 * fieldPath: dotted path on primary market payload
 * crossMarket: optional dep market id (payload root = that market's data)
 * anyOf: alternate paths — first with substance wins
 */

export const PANEL_FIELD_MAP = {
  // ── Equities ──
  'equities:kpi': { field: 'indices', fieldPath: 'indices' },
  'equities:heatmap': { field: 'quotes', fieldPath: 'quotes' },
  'equities:sidebar': { field: 'quotes', fieldPath: 'quotes' },
  'equities:portfolio': { field: 'quotes', fieldPath: 'quotes' },
  // Tile paints only universeUpdates.updates. universe/quotes are heatmap siblings.
  'equities:universe-updates': { field: 'updates', fieldPath: 'updates', crossMarket: 'universeUpdates' },
  'equities:sec-fundamentals': { field: 'tickers', fieldPath: 'tickers', crossMarket: 'edgar' },
  'equities:sec-filings': { field: 'byTicker', fieldPath: 'byTicker', crossMarket: 'edgarFilingActivity' },
  'equities:bea-corporate-profits': { field: 'gdpComponents', fieldPath: 'gdpComponents', crossMarket: 'bea' },
  'equities:wb-market-cap': { field: 'countries', fieldPath: 'countries', crossMarket: 'worldbank' },

  // ── Bonds ──
  'bonds:kpi': { field: 'yieldCurveData', fieldPath: 'yieldCurveData' },
  'bonds:yield': { field: 'yieldCurveData', fieldPath: 'yieldCurveData' },
  'bonds:metrics': { anyOf: [
    { field: 'spreadIndicators', fieldPath: 'spreadIndicators' },
    { field: 'treasuryRates', fieldPath: 'treasuryRates' },
    { field: 'yieldCurveData', fieldPath: 'yieldCurveData' },
  ] },
  'bonds:credit': { field: 'spreadData', fieldPath: 'spreadData' },
  'bonds:realYield': { field: 'tipsYields', fieldPath: 'tipsYields' },
  'bonds:ratings': { field: 'creditRatings', fieldPath: 'creditRatings.countries' },
  'bonds:curvespreads': { field: 'spreadHistory', fieldPath: 'spreadHistory' },
  'bonds:fed': { field: 'fedBalanceSheetHistory', fieldPath: 'fedBalanceSheetHistory' },
  'bonds:m2': { field: 'm2HistoryData', fieldPath: 'm2HistoryData' },
  'bonds:cpi': { field: 'cpiComponents', fieldPath: 'cpiComponents' },
  'bonds:debtgdp': { field: 'debtToGdpHistory', fieldPath: 'debtToGdpHistory' },
  'bonds:breakevens': { field: 'breakevensData', fieldPath: 'breakevensData' },
  'bonds:duration': { field: 'durationLadder', fieldPath: 'durationLadder' },
  // Macro Indicators paints macroData + nationalDebt.
  // fedBalanceSheetHistory is the sibling Fed chart.
  'bonds:macro': { anyOf: [
    { field: 'macroData', fieldPath: 'macroData' },
    { field: 'nationalDebt', fieldPath: 'nationalDebt' },
  ] },
  'bonds:foreign-holders': { field: 'latest', fieldPath: 'latest', crossMarket: 'treasuryTIC' },
  'bonds:money-market': { field: 'sofr', fieldPath: 'sofr', crossMarket: 'nyfed' },
  'bonds:auctions': { anyOf: [
    { field: 'auctionData', fieldPath: 'auctionData' },
    { field: 'auctions', fieldPath: 'auctions', crossMarket: 'treasuryAuctions' },
  ] },
  'bonds:ecb-yields': { field: 'policyRates', fieldPath: 'policyRates', crossMarket: 'ecb' },
  // Global CB policy rates paint FRED centralBankRates + ECB MRR overlay.
  // yieldCurveData is the sibling yield-curve panel.
  'bonds:global-rates': { anyOf: [
    { field: 'centralBankRates', fieldPath: 'macroData.centralBankRates' },
    { field: 'policyRates', fieldPath: 'policyRates', crossMarket: 'ecb' },
  ] },
  'bonds:treasury-cost': { field: 'latest', fieldPath: 'latest', crossMarket: 'treasuryCost' },

  // ── FX ──
  'fx:kpi': { field: 'spotRates', fieldPath: 'spotRates' },
  'fx:sidebar': { field: 'spotRates', fieldPath: 'spotRates' },
  'fx:movers': { field: 'changes1d', fieldPath: 'changes1d' },
  'fx:dxy': { field: 'dxyHistory', fieldPath: 'dxyHistory' },
  'fx:cot': { field: 'cotHistory', fieldPath: 'cotHistory' },
  'fx:corr': { field: 'history', fieldPath: 'history' },
  'fx:reer': { field: 'reer', fieldPath: 'reer' },
  'fx:ratediff': { field: 'rateDifferentials', fieldPath: 'rateDifferentials' },
  'fx:carry': { field: 'rateDifferentials', fieldPath: 'rateDifferentials' },
  'fx:rate-dashboard': { field: 'rateDifferentials', fieldPath: 'rateDifferentials' },
  'fx:imf-cofer': { anyOf: [
    { field: 'imfReserves', fieldPath: 'imfReserves' },
    { field: 'cofer', fieldPath: 'cofer', crossMarket: 'imf' },
  ] },
  'fx:treasury-tic': { field: 'latest', fieldPath: 'latest', crossMarket: 'treasuryTIC' },

  // ── Derivatives ──
  'derivatives:kpi': { field: 'vixTermStructure', fieldPath: 'vixTermStructure' },
  'derivatives:metrics': { field: 'vixEnrichment', fieldPath: 'vixEnrichment' },
  'derivatives:vixterm': { field: 'vixTermStructure', fieldPath: 'vixTermStructure' },
  'derivatives:vix1y': { field: 'fredVixHistory', fieldPath: 'fredVixHistory' },
  'derivatives:skew': { field: 'skewIndex', fieldPath: 'skewIndex' },
  'derivatives:volsurf': { field: 'volSurfaceData', fieldPath: 'volSurfaceData' },
  'derivatives:flow': { field: 'optionsFlow', fieldPath: 'optionsFlow' },
  'derivatives:gamma': { field: 'gammaExposure', fieldPath: 'gammaExposure' },
  'derivatives:volprem': { field: 'volPremium', fieldPath: 'volPremium' },
  'derivatives:cftc-tff': { field: 'contracts', fieldPath: 'contracts', crossMarket: 'cftcTFF' },
  'derivatives:bis-otc': { field: 'categories', fieldPath: 'categories', crossMarket: 'bisOTC' },
  'derivatives:ecb-derivatives': { field: 'policyRates', fieldPath: 'policyRates', crossMarket: 'ecb' },

  // ── Real Estate ──
  'realEstate:metrics': { field: 'mortgageRates', fieldPath: 'mortgageRates' },
  'realEstate:shiller': { field: 'caseShillerData', fieldPath: 'caseShillerData' },
  'realEstate:reitetf': { field: 'reitEtf', fieldPath: 'reitEtf' },
  'realEstate:reitperf': { field: 'reitData', fieldPath: 'reitData' },
  'realEstate:foreclosure': { field: 'foreclosureData', fieldPath: 'foreclosureData' },
  // MBA Applications chart paints mbaApplications purchase/refi.
  // mortgageRates is the sibling Key Metrics tile.
  'realEstate:mba': { field: 'mbaApplications', fieldPath: 'mbaApplications' },
  'realEstate:cre': { field: 'creDelinquencies', fieldPath: 'creDelinquencies' },
  'realEstate:caprate': { field: 'capRateData', fieldPath: 'capRateData' },
  'realEstate:supply': { field: 'supplyData', fieldPath: 'supplyData' },
  // HUD Rental Affordability paints hudData (chart/map).
  // affordabilityData is the sibling Housing Affordability Stack tile.
  'realEstate:hud-afford': { field: 'hudData', fieldPath: 'hudData' },
  'realEstate:afford-stack': { field: 'affordabilityData', fieldPath: 'affordabilityData' },
  'realEstate:census-housing': { field: 'series', fieldPath: 'series', crossMarket: 'census' },
  'realEstate:census-trade': { field: 'series', fieldPath: 'series', crossMarket: 'census' },
  'realEstate:census-trends-housing': { field: 'series', fieldPath: 'series', crossMarket: 'census' },
  'realEstate:census-trends-trade': { field: 'series', fieldPath: 'series', crossMarket: 'census' },
  'realEstate:fhfa-hpi': { field: 'fhfaHpi', fieldPath: 'fhfaHpi' },
  'realEstate:bis-property-prices': { field: 'priceIndexData', fieldPath: 'priceIndexData' },
  'realEstate:metro-case-shiller': { field: 'caseShillerData', fieldPath: 'caseShillerData' },
  // HUD Affordability by Metro paints hudData only.
  // affordabilityData is the sibling afford-stack tile.
  'realEstate:hud-affordability-by-metro': { field: 'hudData', fieldPath: 'hudData' },

  // ── Insurance ──
  'insurance:kpi': { field: 'hyOAS', fieldPath: 'hyOAS' },
  'insurance:hyoas': { field: 'fredHyOasHistory', fieldPath: 'fredHyOasHistory' },
  'insurance:catloss': { anyOf: [
    { field: 'catLosses', fieldPath: 'catLosses' },
    { field: 'declarations', fieldPath: 'declarations', crossMarket: 'fema' },
  ] },
  // Industry Combined Ratio chart paints combinedRatioHistory only.
  // combinedRatioData is the sibling by-line tile; industryAvg is the KPI strip.
  'insurance:crhist': { field: 'combinedRatioHistory', fieldPath: 'combinedRatioHistory' },
  'insurance:crline': { field: 'combinedRatioData', fieldPath: 'combinedRatioData' },
  'insurance:reinsrates': { anyOf: [
    { field: 'reinsurancePricing', fieldPath: 'reinsurancePricing' },
    { field: 'reinsurers', fieldPath: 'reinsurers' },
  ] },
  'insurance:reserves': { field: 'reserveAdequacyData', fieldPath: 'reserveAdequacyData' },
  // Cat Bond Spreads paints catBondSpreads only.
  // catBondProxy is an unused Yahoo ILS leftover (not painted).
  'insurance:catbonds': { field: 'catBondSpreads', fieldPath: 'catBondSpreads' },
  // Sector / Industry Pulse paints sectorETF only.
  // catBondProxy is an unused Yahoo ILS leftover (not painted by etfs or catbonds).
  'insurance:etfs': { field: 'sectorETF', fieldPath: 'sectorETF' },
  'insurance:catastrophes': { field: 'declarations', fieldPath: 'declarations', crossMarket: 'fema' },
  'insurance:ins-penetration': { field: 'countries', fieldPath: 'countries', crossMarket: 'worldbank' },
  'insurance:combined-ratios': { field: 'issuers', fieldPath: 'issuers', crossMarket: 'edgarInsurerRatios' },
  'insurance:cat-exposure': { anyOf: [
    { field: 'catLosses', fieldPath: 'catLosses' },
    { field: 'declarations', fieldPath: 'declarations', crossMarket: 'fema' },
    { field: 'events', fieldPath: 'events', crossMarket: 'usgs' },
  ] },
  'insurance:usgs-minerals': { field: 'minerals', fieldPath: 'minerals', crossMarket: 'usgs' },
  'insurance:ecb-supervisory': { field: 'policyRates', fieldPath: 'policyRates', crossMarket: 'ecb' },
  'insurance:fema-disasters': { field: 'declarations', fieldPath: 'declarations', crossMarket: 'fema' },
  'insurance:usgs-earthquakes': { field: 'events', fieldPath: 'events', crossMarket: 'usgs' },

  // ── Commodities (enhanced route shape: eia/fred/yahoo/supplyDemand/futuresCurveData) ──
  'commodities:sidebar': { field: 'yahoo', fieldPath: 'yahoo' },
  'commodities:prices': { anyOf: [
    { field: 'yahoo', fieldPath: 'yahoo.futures' },
    { field: 'fred', fieldPath: 'fred' },
    { field: 'eia', fieldPath: 'eia' },
  ] },
  // Futures Curves paints futuresCurveData + optional goldFuturesCurve.
  // yahoo.futures / eia are leftover sibling false-greens (prices tile).
  'commodities:futures': { anyOf: [
    { field: 'futuresCurveData', fieldPath: 'futuresCurveData' },
    { field: 'goldFuturesCurve', fieldPath: 'goldFuturesCurve' },
  ] },
  // Sector Performance paints sectorHeatmapData rows only.
  // priceDashboardData is the sibling prices tile; yahoo.futures is unused leftover.
  'commodities:sector': { field: 'sectorHeatmapData', fieldPath: 'sectorHeatmapData.commodities' },
  'commodities:supply': { anyOf: [
    { field: 'supplyDemand', fieldPath: 'supplyDemand' },
    { field: 'eia', fieldPath: 'eia' },
    { field: 'fred', fieldPath: 'fred' },
  ] },
  // WTI vs Brent chart paints FRED wti/brent history only.
  // eia / yahoo.futures are leftover sibling false-greens (prices tile).
  'commodities:wti-brent': { anyOf: [
    { field: 'wti', fieldPath: 'fred.wti.history' },
    { field: 'wti', fieldPath: 'fred.wti.values' },
    { field: 'brent', fieldPath: 'fred.brent.history' },
    { field: 'brent', fieldPath: 'fred.brent.values' },
  ] },
  // COT Positioning paints cotData.commodities only.
  // cftcTFF.contracts is the sibling derivatives CFTC TFF tile.
  'commodities:cot': { field: 'cotData', fieldPath: 'cotData.commodities' },
  // Commodity FX table paints commodityCurrencies only.
  // fred.dollarIndex is unused leftover (DXY / FRED bag).
  'commodities:comfx': { field: 'commodityCurrencies', fieldPath: 'commodityCurrencies' },
  // US Ag Commodity Prices paints USDA NASS or FRED corn/wheat/soybeans.
  // worldBank / whole FRED bag were leftover sibling false-greens (FAO / prices).
  'commodities:usda-ag': { anyOf: [
    { field: 'commodities', fieldPath: 'commodities', crossMarket: 'usda' },
    { field: 'summary', fieldPath: 'summary', crossMarket: 'usda' },
    { field: 'wheat', fieldPath: 'fred.wheat.history' },
    { field: 'corn', fieldPath: 'fred.corn.history' },
    { field: 'soybeans', fieldPath: 'fred.soybeans.history' },
  ] },
  // EIA Petroleum tile paints eiaPetroleum gasoline/Henry Hub/crude stocks.
  // commodities.eia is the sibling prices bag.
  'commodities:eia-petrol': { anyOf: [
    { field: 'gasoline', fieldPath: 'gasoline', crossMarket: 'eiaPetroleum' },
    { field: 'naturalGas', fieldPath: 'naturalGas', crossMarket: 'eiaPetroleum' },
    { field: 'crudeStocks', fieldPath: 'crudeStocks', crossMarket: 'eiaPetroleum' },
  ] },
  // Physical Pressure paints eiaPetroleum + USDA + Census trade.
  // supplyDemand / commodities.eia / yahoo were leftover sibling false-greens.
  'commodities:physical-pressure': { anyOf: [
    { field: 'crudeStocks', fieldPath: 'crudeStocks', crossMarket: 'eiaPetroleum' },
    { field: 'gasoline', fieldPath: 'gasoline', crossMarket: 'eiaPetroleum' },
    { field: 'naturalGas', fieldPath: 'naturalGas', crossMarket: 'eiaPetroleum' },
    { field: 'summary', fieldPath: 'summary', crossMarket: 'usda' },
    { field: 'summary', fieldPath: 'summary.worldBalanceB', crossMarket: 'censusTrade' },
  ] },
  'commodities:materials-grid': { anyOf: [
    { field: 'fred', fieldPath: 'fred' },
    { field: 'yahoo', fieldPath: 'yahoo' },
  ] },
  'commodities:criticality': { field: 'fred', fieldPath: 'fred' },
  'commodities:battery-chain': { anyOf: [
    { field: 'fred', fieldPath: 'fred.copper' },
    { field: 'fred', fieldPath: 'fred' },
  ] },
  'commodities:precious-complex': { anyOf: [
    { field: 'yahoo', fieldPath: 'yahoo.futures.GC=F' },
    { field: 'yahoo', fieldPath: 'yahoo.futures.SI=F' },
    { field: 'yahoo', fieldPath: 'yahoo.futures' },
  ] },
  // Commodity Regime paints priceDashboardData sector averages.
  // sectorHeatmapData is the sibling sector tile; yahoo.futures is unused leftover.
  'commodities:regime': { field: 'priceDashboardData', fieldPath: 'priceDashboardData' },
  // Energy Stack paints priceDashboardData energy futures + optional EIA crude stocks.
  // commodities.eia is the sibling prices bag leftover.
  'commodities:energy-stack': { anyOf: [
    { field: 'priceDashboardData', fieldPath: 'priceDashboardData' },
    { field: 'crudeStocks', fieldPath: 'crudeStocks', crossMarket: 'eiaPetroleum' },
  ] },
  'commodities:curve-board': { anyOf: [
    { field: 'futuresCurveData', fieldPath: 'futuresCurveData' },
    { field: 'goldFuturesCurve', fieldPath: 'goldFuturesCurve' },
  ] },
  'commodities:material-detail': { field: 'fred', fieldPath: 'fred' },
  'commodities:exposure-matrix': { field: 'yahoo', fieldPath: 'yahoo' },
  'commodities:fao-prices': { anyOf: [
    { field: 'foodPriceIndex', fieldPath: 'foodPriceIndex', crossMarket: 'fao' },
    { field: 'series', fieldPath: 'series', crossMarket: 'fao' },
  ] },
  'commodities:us-trade': { anyOf: [
    { field: 'blocs', fieldPath: 'blocs', crossMarket: 'censusTrade' },
    { field: 'summary', fieldPath: 'summary', crossMarket: 'censusTrade' },
  ] },

  // ── Global Macro ──
  'globalMacro:kpi': { field: 'scorecardData', fieldPath: 'scorecardData' },
  'globalMacro:sidebar': { field: 'scorecardData', fieldPath: 'scorecardData' },
  'globalMacro:scorecard': { field: 'scorecardData', fieldPath: 'scorecardData' },
  'globalMacro:gdp': { field: 'growthInflationData', fieldPath: 'growthInflationData' },
  'globalMacro:cpi': { field: 'growthInflationData', fieldPath: 'growthInflationData' },
  'globalMacro:rates': { field: 'centralBankData', fieldPath: 'centralBankData' },
  'globalMacro:debt': { field: 'debtData', fieldPath: 'debtData' },
  // CFNAI activity chart. industrialProd / consumerSentiment are unused leftovers.
  'globalMacro:activity': { field: 'cfnai', fieldPath: 'cfnai' },
  'globalMacro:cli': { field: 'oecdCli', fieldPath: 'oecdCli' },
  'globalMacro:imf-reserves': { anyOf: [
    { field: 'ifsReserves', fieldPath: 'ifsReserves', crossMarket: 'imf' },
    { field: 'countries', fieldPath: 'countries', crossMarket: 'imf' },
  ] },
  'globalMacro:imf-cofer': { anyOf: [
    { field: 'cofer', fieldPath: 'cofer', crossMarket: 'imf' },
    { field: 'cofer', fieldPath: 'cofer' },
  ] },
  'globalMacro:wb-trade': { field: 'countries', fieldPath: 'countries', crossMarket: 'worldbank' },
  'globalMacro:wb-dev': { field: 'countries', fieldPath: 'countries', crossMarket: 'worldbank' },
  'globalMacro:ecb-eur': { field: 'policyRates', fieldPath: 'policyRates', crossMarket: 'ecb' },
  'globalMacro:tga-balance': { field: 'series', fieldPath: 'series', crossMarket: 'treasuryDTS' },
  'globalMacro:gdpnow': { field: 'currentQuarter', fieldPath: 'currentQuarter', crossMarket: 'fedGDPNow' },
  'globalMacro:fomc-sep': { field: 'projections', fieldPath: 'projections', crossMarket: 'fedSEP' },
  'globalMacro:cleveland': { field: 'latest', fieldPath: 'latest', crossMarket: 'fedInflationNowcast' },
  'globalMacro:bea-accounts': { field: 'gdpComponents', fieldPath: 'gdpComponents', crossMarket: 'bea' },
  'globalMacro:eurostat': { field: 'hicp', fieldPath: 'hicp', crossMarket: 'eurostat' },
  'globalMacro:oecd-direct': { field: 'cli', fieldPath: 'cli', crossMarket: 'oecd' },
  'globalMacro:bea-income': { field: 'personalIncome', fieldPath: 'personalIncome', crossMarket: 'bea' },
  'globalMacro:global-liquidity': { anyOf: [
    { field: 'series', fieldPath: 'series', crossMarket: 'treasuryDTS' },
    { field: 'm3Growth', fieldPath: 'm3Growth', crossMarket: 'ecb' },
    { field: 'savingRate', fieldPath: 'savingRate', crossMarket: 'bea' },
  ] },

  // ── Equity+ ──
  'equitiesDeepDive:kpi': { field: 'sectorData', fieldPath: 'sectorData' },
  'equitiesDeepDive:sidebar': { field: 'sectorData', fieldPath: 'sectorData' },
  'equitiesDeepDive:valuation': { anyOf: [
    { field: 'equityRiskPremium', fieldPath: 'equityRiskPremium' },
    { field: 'spPE', fieldPath: 'spPE' },
    { field: 'buffettIndicator', fieldPath: 'buffettIndicator' },
    { field: 'sectorData', fieldPath: 'sectorData' },
  ] },
  'equitiesDeepDive:etf': { field: 'sectorData', fieldPath: 'sectorData' },
  'equitiesDeepDive:factor-favor': { field: 'factorData', fieldPath: 'factorData' },
  'equitiesDeepDive:sector-beat': { field: 'sectorData', fieldPath: 'sectorData' },
  'equitiesDeepDive:shorted': { field: 'shortData', fieldPath: 'shortData' },
  'equitiesDeepDive:scores': { field: 'factorData', fieldPath: 'factorData' },
  'equitiesDeepDive:factor-rankings': { anyOf: [
    { field: 'factorData', fieldPath: 'factorData' },
    { field: 'breadthDivergence', fieldPath: 'breadthDivergence' },
    { field: 'equityRiskPremium', fieldPath: 'equityRiskPremium' },
  ] },
  'equitiesDeepDive:earnings': { field: 'earningsData', fieldPath: 'earningsData' },
  'equitiesDeepDive:institutions': { field: 'institutions', fieldPath: 'institutions', crossMarket: 'institutional' },
  'equitiesDeepDive:insider': { anyOf: [
    { field: 'insiderData', fieldPath: 'insiderData.transactions' },
    { field: 'insiderData', fieldPath: 'insiderData.holders' },
    { field: 'insiderData', fieldPath: 'insiderData' },
  ] },
  'equitiesDeepDive:earnings-quality': { field: 'earningsData', fieldPath: 'earningsData' },

  // ── Crypto ──
  'crypto:sidebar': { field: 'coinMarketData', fieldPath: 'coinMarketData' },
  'crypto:top-cryptos': { field: 'coinMarketData', fieldPath: 'coinMarketData.coins' },
  'crypto:fear-greed': { field: 'fearGreedData', fieldPath: 'fearGreedData' },
  'crypto:funding': { field: 'fundingData', fieldPath: 'fundingData' },
  'crypto:defi-tvl': { field: 'defiData', fieldPath: 'defiData' },
  'crypto:exchanges': { field: 'topExchanges', fieldPath: 'topExchanges' },
  'crypto:onchain': { field: 'onChainData', fieldPath: 'onChainData' },
  'crypto:onchain-chart': { field: 'onChainData', fieldPath: 'onChainData' },
  'crypto:stablecoin-composition': { field: 'stablecoinMcap', fieldPath: 'stablecoinMcap' },
  'crypto:defi-tvl-trend': { field: 'defiData', fieldPath: 'defiData' },
  'crypto:btc-onchain': { field: 'onChainData', fieldPath: 'onChainData' },

  // ── Credit ──
  'credit:kpi': { field: 'spreadData', fieldPath: 'spreadData' },
  'credit:key-metrics': { field: 'spreadData', fieldPath: 'spreadData' },
  'credit:credit-spreads': { field: 'spreadData', fieldPath: 'spreadData' },
  'credit:spread-summary': { field: 'spreadData', fieldPath: 'spreadData' },
  'credit:em-yields': { field: 'emBondData', fieldPath: 'emBondData' },
  'credit:cp-rates': { field: 'commercialPaper', fieldPath: 'commercialPaper' },
  'credit:clo-tranches': { field: 'loanData', fieldPath: 'loanData' },
  'credit:default-rates': { field: 'defaultData', fieldPath: 'defaultData' },
  'credit:delinquency': { field: 'delinquencyRates', fieldPath: 'delinquencyRates' },
  'credit:bank-sector': { field: 'aggregate', fieldPath: 'aggregate', crossMarket: 'fdic' },
  'credit:credit-quality': { field: 'creditQuality', fieldPath: 'creditQuality' },
  'credit:muni-market': { field: 'summary', fieldPath: 'summary', crossMarket: 'msrb' },
  // Bank Stress Monitor paints FDIC deposits/failures + HY/default/CP.
  // Unused SLOOS lendingStandards was a leftover false-green.
  'credit:bank-stress': { anyOf: [
    { field: 'aggregate', fieldPath: 'aggregate', crossMarket: 'fdic' },
    { field: 'failures', fieldPath: 'failures', crossMarket: 'fdic' },
    { field: 'spreadData', fieldPath: 'spreadData' },
    { field: 'defaultData', fieldPath: 'defaultData' },
    { field: 'commercialPaper', fieldPath: 'commercialPaper' },
  ] },
  'credit:ted-spread': { field: 'tedSpread', fieldPath: 'tedSpread' },
  'credit:wb-debt': { field: 'countries', fieldPath: 'countries', crossMarket: 'worldbank' },
  'credit:bis-total-credit': { field: 'bisCreditToGDP', fieldPath: 'bisCreditToGDP', crossMarket: 'globalMacro' },
  'credit:treasury-credit-holdings': { field: 'latest', fieldPath: 'latest', crossMarket: 'treasuryTIC' },

  // ── Sentiment ──
  'sentiment:sidebar': { field: 'fearGreedData', fieldPath: 'fearGreedData' },
  'sentiment:key-metrics': { field: 'riskData', fieldPath: 'riskData' },
  'sentiment:fear-greed': { field: 'fearGreedData', fieldPath: 'fearGreedData' },
  // STLFSI chart. riskData is the sibling key-metrics / risk-dashboard tile.
  'sentiment:fsi': { field: 'fsiHistory', fieldPath: 'fsiHistory' },
  'sentiment:cftc': { field: 'cftcData', fieldPath: 'cftcData' },
  'sentiment:cross-asset': { field: 'returnsData', fieldPath: 'returnsData' },
  'sentiment:risk-dashboard': { field: 'riskData', fieldPath: 'riskData' },
  'sentiment:leverage': { anyOf: [
    { field: 'marginDebt', fieldPath: 'marginDebt' },
    { field: 'consumerCredit', fieldPath: 'consumerCredit' },
    { field: 'mutualFundFlows', fieldPath: 'mutualFundFlows' },
  ] },
  'sentiment:news-sentiment': { field: 'series', fieldPath: 'series', crossMarket: 'fedNewsSentiment' },
  'sentiment:fed-risk-mood': { field: 'series', fieldPath: 'series', crossMarket: 'fedNewsSentiment' },

  // ── Calendar ──
  'calendar:kpi': { field: 'economicEvents', fieldPath: 'economicEvents' },
  'calendar:economic': { field: 'economicEvents', fieldPath: 'economicEvents' },
  'calendar:sidebar': { field: 'centralBanks', fieldPath: 'centralBanks' },
  'calendar:cb-rates': { field: 'centralBanks', fieldPath: 'centralBanks' },
  'calendar:cb-timeline': { field: 'centralBanks', fieldPath: 'centralBanks' },
  'calendar:earnings': { field: 'earningsSeason', fieldPath: 'earningsSeason' },
  'calendar:key-data': { anyOf: [
    { field: 'keyReleases', fieldPath: 'keyReleases' },
    { field: 'economicEvents', fieldPath: 'economicEvents' },
  ] },
  'calendar:treasury': { anyOf: [
    { field: 'treasuryAuctions', fieldPath: 'treasuryAuctions' },
    { field: 'auctions', fieldPath: 'auctions', crossMarket: 'treasuryAuctions' },
  ] },
  'calendar:options': { field: 'optionsExpiry', fieldPath: 'optionsExpiry' },
  'calendar:release-impact': { anyOf: [
    { field: 'keyReleases', fieldPath: 'keyReleases' },
    { field: 'economicEvents', fieldPath: 'economicEvents' },
  ] },
  'calendar:catalyst-wall': { field: 'economicEvents', fieldPath: 'economicEvents' },

  // ── BLS / EIA ──
  'bls:kpi': { field: 'series', fieldPath: 'series' },
  'bls:trends-top': { field: 'series', fieldPath: 'series' },
  'bls:trends-bottom': { field: 'series', fieldPath: 'series' },
  'bls:jolts': { field: 'series', fieldPath: 'series' },
  'bls:productivity': { field: 'series', fieldPath: 'series' },
  'bls:cpi-components': { field: 'series', fieldPath: 'series' },
  'bls:ppi-by-industry': { field: 'series', fieldPath: 'series' },
  'bls:eci': { field: 'series', fieldPath: 'series' },
  'bls:unemployment-duration': { field: 'series', fieldPath: 'series' },

  'eia:kpi': { field: 'petroleum', fieldPath: 'petroleum' },
  // Electricity retail prices tile. petroleum/naturalGas are sibling panels.
  'eia:prices': { field: 'electricity', fieldPath: 'electricity' },
  'eia:electricity': { field: 'electricity', fieldPath: 'electricity' },
  'eia:petroleum': { field: 'petroleum', fieldPath: 'petroleum' },
  'eia:natural-gas': { field: 'naturalGas', fieldPath: 'naturalGas' },
  'eia:co2': { field: 'co2Emissions', fieldPath: 'co2Emissions' },
  // Electricity consumption tile. petroleum is the sibling petroleum panel.
  'eia:consumption': { field: 'electricity', fieldPath: 'electricity' },
  // Electricity 3-year monthly price trends. petroleum/naturalGas are sibling panels.
  'eia:trends': { field: 'electricity', fieldPath: 'electricity' },
  'eia:summary': { field: 'petroleum', fieldPath: 'petroleum' },

  // ── Alerts / Watchlist / Analytics (client-side / federated) ──
  'alerts:kpi': { anyOf: [
    { field: 'rules', fieldPath: 'rules' },
    { field: 'alerts', fieldPath: 'alerts' },
  ] },
  'alerts:active-alerts': { anyOf: [
    { field: 'alerts', fieldPath: 'alerts' },
    { field: 'rules', fieldPath: 'rules' },
  ] },
  'alerts:alert-rules': { field: 'rules', fieldPath: 'rules' },

  // Watchlist is user-driven; empty quotes is a valid empty state (stays red until user adds tickers).
  'watchlist:kpi': { field: 'quotes', fieldPath: 'quotes' },
  'watchlist:my-tickers': { field: 'quotes', fieldPath: 'quotes' },
  'watchlist:my-metrics': { field: 'quotes', fieldPath: 'quotes' },

  'analytics:kpi': { field: 'date', fieldPath: 'date' },
  'analytics:provenance': { field: 'sources', fieldPath: 'sources' },
  'analytics:diagnostics': { field: 'sources', fieldPath: 'sources' },
  'analytics:server': { field: 'date', fieldPath: 'date' },
  'analytics:api-usage': { field: 'sources', fieldPath: 'sources' },
  'analytics:source-health': { field: 'sources', fieldPath: 'sources' },
  'analytics:endpoints': { field: 'sources', fieldPath: 'sources' },
  'analytics:freshness': { field: 'date', fieldPath: 'date' },
  'analytics:error-log': { field: 'sources', fieldPath: 'sources' },
  'analytics:mem-cache': { field: 'date', fieldPath: 'date' },
  'analytics:cache-files': { field: 'date', fieldPath: 'date' },
  'analytics:routes': { field: 'sources', fieldPath: 'sources' },
  'analytics:panel-trace': { field: 'sources', fieldPath: 'sources' },
  'analytics:coverage-matrix': { field: 'sources', fieldPath: 'sources' },
};

// Note: analytics primary endpoint is /api/rate-limits → { date, sources }

export function getPanelFieldSpec(marketId, panelId) {
  return PANEL_FIELD_MAP[`${marketId}:${panelId}`] || null;
}
