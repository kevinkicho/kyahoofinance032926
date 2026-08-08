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
 *
 * Slot resolution (paths only — never mock values):
 *   1. Rich hand inventory (multi-slot / cross-market / multi anyOf)
 *   2. PANEL_FIELD_MAP auto paths
 *   3. Market contract panel requiredFields
 *   4. Simple hand single-slot entry
 */

import { PANEL_FIELD_MAP } from './panelFieldMap.js';
import { getMarketContract } from '../../shared/contracts/index.js';

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
    any('natgas', ['eia.henry_hub.value', 'eia.natgas.value', 'fred.natgas.value', 'yahoo.futures.NG=F.price']),
    any('copper', ['fred.copper.value', 'yahoo.futures.HG=F.price', 'fred.copper']),
    // Gold/silver often missing without Yahoo futures — optional so energy metals still green
    any('gold', ['yahoo.futures.GC=F.price', 'fred.gold_am.value', 'fred.gold_am'], { required: false }),
    any('silver', ['yahoo.futures.SI=F.price', 'fred.silver.value', 'fred.silver'], { required: false }),
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
    // Require actual heatmap rows (not merely any FRED object → false green).
    any('heatmap.rows', ['sectorHeatmapData.commodities', 'priceDashboardData']),
    any('energy.or.metals', [
      'yahoo.futures.CL=F.price',
      'yahoo.futures.GC=F.price',
      'eia.wti_price.value',
      'fred.wti.value',
      'fred.copper.value',
    ]),
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
    // Monetary metals are required; PGMs optional (less liquid / often quote-null).
    any('gold', ['yahoo.futures.GC=F.price', 'yahoo.futures.GC=F']),
    any('silver', ['yahoo.futures.SI=F.price', 'yahoo.futures.SI=F']),
    any('platinum', ['yahoo.futures.PL=F.price', 'yahoo.futures.PL=F'], { required: false }),
    any('palladium', ['yahoo.futures.PA=F.price', 'yahoo.futures.PA=F'], { required: false }),
  ],
  'commodities:eia-petrol': [
    any('petroleum', ['eia.wti_price.value', 'eia.wti_price', 'eia.gasoline_regular.value', 'eiaPetroleum.gasoline']),
  ],
  'commodities:physical-pressure': [
    p('crudeStocks', 'supplyDemand.crudeStocks.latest'),
    p('natGas', 'supplyDemand.natGasStorage.latest'),
    any('eia.stocks', ['eia.crude_stocks.value', 'eia.crude_stocks', 'eia.natgas_storage.value', 'eia.natgas_storage']),
  ],
  'commodities:usda-ag': [
    any('ag', ['fred.wheat.value', 'fred.rice.value', 'fred.corn.value', 'fred.wheat', 'fred.corn', 'usda.commodities']),
  ],
  'commodities:fao-prices': [
    any('food', ['fao.foodPriceIndex.value', 'fao.foodPriceIndex', 'fred.wheat.value', 'fred.wheat']),
  ],
  // Never bind health to whole `fred` / `yahoo` bags — any sibling series greened hollow panels.
  'commodities:materials-grid': [
    any('copper', ['fred.copper.value', 'fred.copper', 'yahoo.futures.HG=F.price']),
    any('aluminum', ['fred.aluminum.value', 'fred.aluminum'], { required: false }),
  ],
  'commodities:criticality': [
    any('copper', ['fred.copper.value', 'fred.copper']),
    any('wti', ['fred.wti.value', 'eia.wti_price.value'], { required: false }),
  ],
  'commodities:battery-chain': [
    any('copper', ['fred.copper.value', 'fred.copper', 'yahoo.futures.HG=F.price']),
  ],
  'commodities:regime': [
    any('dashboard', ['priceDashboardData', 'sectorHeatmapData.commodities', 'yahoo.futures']),
    any('energy', ['yahoo.futures.CL=F.price', 'eia.wti_price.value', 'fred.wti.value']),
  ],
  'commodities:material-detail': [
    any('copper', ['fred.copper.value', 'fred.copper']),
    any('aluminum', ['fred.aluminum.value', 'fred.aluminum'], { required: false }),
  ],
  'commodities:exposure-matrix': [
    any('futures', ['yahoo.futures.CL=F.price', 'yahoo.futures.GC=F.price', 'yahoo.futures']),
  ],

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
    // US multi-tenor curve is the primary panel; intl 10Y overlays are best-effort
    p('us', 'yieldCurveData.US'),
    any('us.10y', ['yieldCurveData.US.10y', 'treasuryRates.US10Y']),
    any('us.2y', ['yieldCurveData.US.2y', 'treasuryRates.US2Y']),
    p('de', 'yieldCurveData.DE', { required: false }),
    p('jp', 'yieldCurveData.JP', { required: false }),
    p('gb', 'yieldCurveData.GB', { required: false }),
  ],
  'bonds:metrics': [
    any('t10y2y', ['spreadIndicators.t10y2y', 'spreadIndicators.T10Y2Y', 'spreadHistory.t10y2y']),
    any('t10y3m', ['spreadIndicators.t10y3m', 'spreadIndicators.T10Y3M', 'spreadHistory.t10y3m']),
  ],
  'bonds:credit': [
    // IG is the reliable BAML series; HY/EM often null under FRED rate limits
    any('ig', ['spreadData.current.igSpread', 'spreadData.current.IG', 'spreadData.IG', 'creditIndices.baa10y']),
    any('hy', ['spreadData.current.hySpread', 'spreadData.current.HY', 'spreadData.HY'], { required: false }),
    any('em', ['spreadData.current.emSpread', 'spreadData.current.EM', 'spreadData.EM'], { required: false }),
    any('bbb', ['spreadData.current.bbbSpread', 'spreadData.BBB'], { required: false }),
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
  'bonds:breakevens': [
    any('be5y', ['breakevensData.current.be5y', 'breakevensData.be5y']),
    any('be10y', ['breakevensData.current.be10y', 'breakevensData.be10y'], { required: false }),
    any('fwd5y5y', ['breakevensData.current.forward5y5y', 'breakevensData.forward5y5y'], { required: false }),
    any('real5y', ['breakevensData.current.real5y', 'tipsYields.5y'], { required: false }),
  ],
  'bonds:duration': [p('buckets', 'durationLadder.buckets')],
  'bonds:macro': [any('macro', ['macroData', 'nationalDebt', 'fedBalanceSheetHistory.values'])],
  'bonds:foreign-holders': [p('latest', 'latest', { crossMarket: 'treasuryTIC' })],
  'bonds:money-market': [p('sofr', 'sofr', { crossMarket: 'nyfed' })],
  // Auctions live on treasuryAuctions market, not the bonds primary payload.
  'bonds:auctions': [
    any('auctions', ['auctions', 'summary', 'auctionData'], { crossMarket: 'treasuryAuctions' }),
  ],
  'bonds:ecb-yields': [
    any('policy', ['policyRates', 'moneyMarket', 'yieldCurve'], { crossMarket: 'ecb' }),
  ],
  'bonds:global-rates': [
    any('curve', ['yieldCurveData', 'treasuryRates', 'macroData.centralBankRates']),
  ],
  'bonds:treasury-cost': [p('latest', 'latest', { crossMarket: 'treasuryCost' })],

  // ═══════════════════════════════════════════════════════════════════════════
  // FX
  // ═══════════════════════════════════════════════════════════════════════════
  'fx:kpi': [
    p('EUR', 'spotRates.EUR'),
    p('JPY', 'spotRates.JPY'),
    p('GBP', 'spotRates.GBP'),
    any('dxy', ['dxyHistory.values', 'dxyHistory.dates'], { required: false }),
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
    any('reserves', [
      'imfReserves.reserves',
      'imfReserves',
      'spotRates', // soft content if IMF absent
      'dxyHistory',
    ]),
    any('reservesImf', ['cofer', 'ifsReserves'], { crossMarket: 'imf', required: false }),
    any('usdShare', ['imfReserves.reserves.USD', 'cofer.USD'], { required: false }),
  ],
  'fx:treasury-tic': [p('latest', 'latest', { crossMarket: 'treasuryTIC' })],

  // ═══════════════════════════════════════════════════════════════════════════
  // DERIVATIVES / CRYPTO / CREDIT / others — multi-slot where known
  // ═══════════════════════════════════════════════════════════════════════════
  'derivatives:kpi': [p('vixTerm', 'vixTermStructure'), any('vix', ['vixEnrichment', 'fredVixHistory'])],
  'derivatives:metrics': [any('enrich', ['vixEnrichment', 'putCallRatio', 'vixPercentile'])],
  'derivatives:vixterm': [p('vixTermStructure', 'vixTermStructure')],
  // fredVixHistory often null under FRED 403 — fall back to term / enrichment
  'derivatives:vix1y': [
    any('vix1y', ['fredVixHistory', 'vixTermStructure', 'vixEnrichment', 'vixPercentile']),
  ],
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
    any('otc.ir', ['categories.ir.series', 'categories.ir'], { crossMarket: 'bisOTC', required: false }),
    any('otc.fx', ['categories.fx.series', 'categories.fx'], { crossMarket: 'bisOTC', required: false }),
    any('otc.any', ['categories'], { crossMarket: 'bisOTC', required: false }),
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
    any('bis.jp', ['bisCreditToGDP.JP.latest', 'bisCreditToGDP.JP'], { crossMarket: 'globalMacro', required: false }),
    any('bis.any', ['bisCreditToGDP'], { crossMarket: 'globalMacro', required: false }),
  ],
  'credit:treasury-credit-holdings': [p('tic', 'latest', { crossMarket: 'treasuryTIC' })],

  'insurance:kpi': [
    p('hyOAS', 'hyOAS'),
    p('igOAS', 'igOAS'),
    any('industryAvg', ['industryAvgCombinedRatio', 'combinedRatioData.industryAvg', 'combinedRatioData']),
    // sectorETF is often an array of holdings — accept whole list, not only .price
    any('sectorETF', ['sectorETF', 'sectorETF.price', 'sectorETF.0.price'], { required: false }),
  ],
  'insurance:hyoas': [
    any('hyLatest', ['hyOAS']),
    any('hyHistory', ['fredHyOasHistory.values', 'fredHyOasHistory']),
  ],
  'insurance:catloss': [
    // FRED $ losses preferred; FEMA cross-market is the live proxy when NPORCT missing
    any('catStream', ['catLosses.values', 'catLosses'], { required: false }),
    any('femaDecls', ['declarations', 'byType', 'summary'], { crossMarket: 'fema' }),
  ],
  'insurance:crhist': [
    any('history', ['combinedRatioHistory.values', 'combinedRatioHistory', 'combinedRatioData.quarters']),
    any('industryAvg', ['industryAvgCombinedRatio'], { required: false }),
    any('lines', ['combinedRatioData.lines', 'combinedRatioData.byLine', 'combinedRatioData']),
  ],
  'insurance:crline': [
    any('byLine', ['combinedRatioData.byLine', 'combinedRatioData.lines']),
    any('quarters', ['combinedRatioData.quarters'], { required: false }),
  ],
  'insurance:reinsrates': [
    // Equity proxies (array) or legacy byCategory
    any('pricing', ['reinsurancePricing.byCategory', 'reinsurancePricing', 'reinsurers']),
  ],
  'insurance:reserves': [
    any('reserves', ['reserveAdequacyData.lines', 'reserveAdequacyData.adequacy', 'reserveAdequacyData']),
    any('adequacy', ['reserveAdequacyData.adequacy', 'reserveAdequacyData.lines'], { required: false }),
  ],
  'insurance:catbonds': [
    any('proxy', ['catBondProxy.price', 'catBondProxy']),
    any('spreads', ['catBondSpreads']),
  ],
  'insurance:etfs': [
    // sectorETF is often an array of holdings, not a single .price object
    any('etf', ['sectorETF.0.price', 'sectorETF.price', 'sectorETF', 'catBondProxy.price', 'catBondProxy']),
    any('change', ['sectorETF.0.changePct', 'sectorETF.changePct', 'sectorETF'], { required: false }),
  ],
  'insurance:catastrophes': [p('fema', 'declarations', { crossMarket: 'fema' })],
  'insurance:ins-penetration': [p('wb', 'countries', { crossMarket: 'worldbank' })],
  'insurance:combined-ratios': [p('edgar', 'issuers', { crossMarket: 'edgarInsurerRatios' })],
  'insurance:cat-exposure': [any('cat', ['catLosses.values', 'catLosses', 'fema.declarations', 'fema.summary', 'usgs.events'])],
  'insurance:usgs-minerals': [p('usgs', 'events', { crossMarket: 'usgs' })],
  'insurance:ecb-supervisory': [p('ecb', 'policyRates', { crossMarket: 'ecb' })],
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
  // Prefer live IMF satellite; fall back to primary macro bags so DNS outages
  // do not hard-fail the panel (required fallback always present on globalMacro).
  'globalMacro:imf-reserves': [
    any('ifs', [
      'ifsReserves', // via cross-market resolution in anyOf market prefix
      'scorecardData',
      'growthInflationData',
      'imfWEO',
    ]),
    any('ifsImf', ['ifsReserves', 'countries'], { crossMarket: 'imf', required: false }),
  ],
  'globalMacro:imf-cofer': [
    any('cofer', ['scorecardData', 'debtData', 'imfWEO', 'cofer']),
    any('coferImf', ['cofer'], { crossMarket: 'imf', required: false }),
  ],
  'globalMacro:wb-trade': [p('wb', 'countries', { crossMarket: 'worldbank' })],
  'globalMacro:wb-dev': [p('wb', 'countries', { crossMarket: 'worldbank' })],
  'globalMacro:ecb-eur': [p('ecb', 'policyRates', { crossMarket: 'ecb' })],
  'globalMacro:tga-balance': [p('dts', 'series', { crossMarket: 'treasuryDTS' })],
  // currentQuarter is a label string ("26:Q3"); metrics live on latest.gdp / evolution
  'globalMacro:gdpnow': [
    any('gdpnow', ['latest.gdp', 'evolution', 'priorQuarters', 'latest'], { crossMarket: 'fedGDPNow' }),
    any('gdpnowLabel', ['currentQuarter'], { crossMarket: 'fedGDPNow', required: false }),
  ],
  'globalMacro:fomc-sep': [p('sep', 'projections', { crossMarket: 'fedSEP' })],
  'globalMacro:cleveland': [p('nowcast', 'latest', { crossMarket: 'fedInflationNowcast' })],
  'globalMacro:bea-accounts': [p('bea', 'gdpComponents', { crossMarket: 'bea' })],
  'globalMacro:eurostat': [p('euro', 'hicp', { crossMarket: 'eurostat' })],
  'globalMacro:oecd-direct': [p('oecd', 'cli', { crossMarket: 'oecd' })],
  'globalMacro:bea-income': [p('bea', 'personalIncome', { crossMarket: 'bea' })],
  'globalMacro:global-liquidity': [
    // Panel is TGA + ECB M3 + BEA saving + GDPNow composite (cross-market).
    any('tga', ['latest.closeB', 'series'], { crossMarket: 'treasuryDTS' }),
    any('m3', ['m3Growth', 'm3Growth.0'], { crossMarket: 'ecb' }),
    any('saving', ['savingRate', 'savingRate.0'], { crossMarket: 'bea' }),
  ],

  'equities:kpi': [p('indices', 'indices')],
  'equities:heatmap': [p('quotes', 'quotes')],
  'equities:sidebar': [p('quotes', 'quotes')],
  'equities:portfolio': [p('quotes', 'quotes')],
  'equities:universe-updates': [any('u', ['universe', 'quotes', 'universeUpdates.updates'])],
  'equities:sec-fundamentals': [p('edgar', 'tickers', { crossMarket: 'edgar' })],
  // edgarFilingActivity: total/tickerCount are numeric; byTicker/material are string catalogs
  'equities:sec-filings': [
    any('filings', ['total', 'tickerCount', 'byType', 'byTicker'], { crossMarket: 'edgarFilingActivity' }),
    any('edgarFallback', ['tickers'], { crossMarket: 'edgar', required: false }),
  ],
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
  'equitiesDeepDive:insider': [
    // Dense transactions bag is enough; name/type often blank on Yahoo.
    any('insider', ['insiderData.transactions', 'insiderData']),
    any('tx.shares', ['insiderData.transactions.0.shares', 'insiderData.transactions.0.value'], { required: false }),
    any('tx.ticker', ['insiderData.transactions.0.ticker'], { required: false }),
    any('holders.shares', ['insiderData.holders.0.shares'], { required: false }),
  ],
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
  // Prefer satellite treasuryAuctions market; calendar may embed a thin copy
  'calendar:treasury': [
    any('ta', ['auctions', 'upcoming', 'results', 'latest'], { crossMarket: 'treasuryAuctions' }),
    any('taLocal', ['treasuryAuctions', 'auctions'], { required: false }),
  ],
  // optionsExpiry is [{ date, type }] — event catalog (see placeholderValueOk)
  'calendar:options': [any('options', ['optionsExpiry', 'optionsExpiry.0.date'])],
  'calendar:release-impact': [any('kr', ['keyReleases', 'economicEvents'])],
  'calendar:catalyst-wall': [p('events', 'economicEvents')],

  // BLS: bind to concrete series leaves — never the whole `series` catalog bag.
  'bls:kpi': [
    any('unemployment', ['series.unemployment.latest.value', 'series.unemployment.latest', 'series.unemployment']),
    any('payrolls', ['series.nonfarmPayrolls.latest.value', 'series.nonfarmPayrolls.latest', 'series.nonfarmPayrolls'], { required: false }),
    any('cpi', ['series.cpi.latest.value', 'series.cpi.latest', 'series.cpi'], { required: false }),
  ],
  'bls:trends-top': [
    any('unemployment', ['series.unemployment.history.values', 'series.unemployment.latest.value', 'series.unemployment']),
    any('participation', ['series.laborParticipation.history.values', 'series.laborParticipation'], { required: false }),
  ],
  'bls:trends-bottom': [
    any('cpi', ['series.cpi.history.values', 'series.cpi.latest.value', 'series.cpi']),
    any('jobOpenings', ['series.jobOpenings.history.values', 'series.jobOpenings'], { required: false }),
  ],
  'bls:jolts': [
    any('openings', ['series.jobOpenings.latest.value', 'series.jobOpenings.history.values', 'series.jobOpenings']),
    any('hires', ['series.joltsHires.latest.value', 'series.joltsHires'], { required: false }),
  ],
  'bls:productivity': [
    any('output', ['series.outputPerHour.latest.value', 'series.outputPerHour.history.values', 'series.outputPerHour']),
    any('ulc', ['series.unitLaborCosts.latest.value', 'series.unitLaborCosts'], { required: false }),
  ],
  'bls:cpi-components': [
    any('cpi', ['series.cpi.latest.value', 'series.cpi']),
    any('food', ['series.cpiFood.latest.value', 'series.cpiFood'], { required: false }),
  ],
  'bls:ppi-by-industry': [
    any('ppi', ['series.ppi.latest.value', 'series.ppi']),
    any('intermediate', ['series.ppiIntermediate.latest.value', 'series.ppiIntermediate'], { required: false }),
  ],
  'bls:eci': [
    any('total', ['series.eciTotal.latest.value', 'series.eciTotal.history.values', 'series.eciTotal']),
    any('wages', ['series.eciWages.latest.value', 'series.eciWages'], { required: false }),
  ],
  'bls:unemployment-duration': [
    any('lt5', ['series.unempLess5Weeks.latest.value', 'series.unempLess5Weeks']),
    any('27p', ['series.unemp27PlusWeeks.latest.value', 'series.unemp27PlusWeeks'], { required: false }),
  ],

  // EIA: leaf series, not whole sector bags when avoidable
  'eia:kpi': [any('pet', ['petroleum.price', 'petroleum.latest', 'petroleum'])],
  'eia:prices': [any('p', ['petroleum.price', 'petroleum.latest', 'petroleum', 'naturalGas.price', 'naturalGas'])],
  'eia:electricity': [any('e', ['electricity.price', 'electricity.latest', 'electricity'])],
  'eia:petroleum': [any('p', ['petroleum.price', 'petroleum.latest', 'petroleum'])],
  'eia:natural-gas': [any('g', ['naturalGas.price', 'naturalGas.latest', 'naturalGas'])],
  'eia:co2': [any('c', ['co2Emissions.latest', 'co2Emissions.value', 'co2Emissions'])],
  'eia:consumption': [any('c', ['electricity.consumption', 'electricity', 'petroleum.consumption', 'petroleum'])],
  'eia:trends': [any('t', ['petroleum', 'naturalGas', 'electricity'])],
  'eia:summary': [p('petroleum', 'petroleum')],

  // Empty triggered list is healthy (All Clear) — score rules as live slots too.
  // Empty alerts[] is healthy "All Clear"; rules are string metadata catalogs
  'alerts:kpi': [
    any('status', ['alerts', 'rules', 'status', 'summary']),
    any('rules', ['rules'], { required: false }),
  ],
  'alerts:active-alerts': [
    any('feed', ['alerts', 'rules']),
  ],
  'alerts:alert-rules': [any('rules', ['rules', 'alerts'])],

  'watchlist:kpi': [p('quotes', 'quotes')],
  'watchlist:my-tickers': [p('quotes', 'quotes')],
  'watchlist:my-metrics': [p('quotes', 'quotes')],

  // /api/analytics shape: apiUsage, endpoints, dataFreshness, cacheFiles, memCache, errorLog, environment
  'analytics:kpi': [any('a', ['apiUsage', 'dataFreshness', 'endpoints'])],
  'analytics:provenance': [any('sources', ['apiUsage.sources', 'endpoints', 'dataFreshness.markets'])],
  'analytics:diagnostics': [any('sources', ['endpoints', 'apiUsage.sources', 'errorLog'])],
  'analytics:server': [any('a', ['environment', 'memCache', 'apiUsage'])],
  'analytics:api-usage': [any('sources', ['apiUsage.sources', 'apiUsage'])],
  'analytics:source-health': [any('sources', ['apiUsage.sources', 'dataFreshness.markets', 'endpoints'])],
  'analytics:endpoints': [any('sources', ['endpoints'])],
  'analytics:freshness': [any('a', ['dataFreshness', 'cacheFiles', 'apiUsage'])],
  'analytics:error-log': [any('sources', ['errorLog', 'endpoints'])],
  'analytics:mem-cache': [any('a', ['memCache', 'environment', 'apiUsage'])],
  'analytics:cache-files': [any('a', ['cacheFiles', 'dataFreshness', 'apiUsage'])],
  'analytics:routes': [any('sources', ['endpoints', 'apiUsage.sources'])],
  'analytics:panel-trace': [any('sources', ['endpoints', 'apiUsage.sources', 'dataFreshness'])],
  'analytics:coverage-matrix': [any('sources', ['dataFreshness.markets', 'endpoints', 'apiUsage.sources'])],
};

/**
 * Minimum fill rate among *required* placeholders for fetchOk.
 * 1.0 caused permanent reds when one secondary series lagged; 0.85 still
 * rejects sparse bags (e.g. 2/10) while allowing one optional miss.
 */
export const MIN_PLACEHOLDER_FILL_RATE = 0.85;

/**
 * Fallback placeholders derived from PANEL_FIELD_MAP when no hand-authored entry.
 * Paths only — never invents sample values.
 */
export function placeholdersFromFieldMap(marketId, panelId) {
  const key = `${marketId}:${panelId}`;
  const spec = PANEL_FIELD_MAP?.[key];
  if (!spec) return null;
  const specs = Array.isArray(spec.anyOf) ? spec.anyOf : [spec];
  const slots = [];
  specs.forEach((s, i) => {
    const path = s.fieldPath || s.field;
    if (!path) return;
    if (s.crossMarket) {
      slots.push({
        id: `auto.${i}.${s.crossMarket}.${path}`,
        path,
        crossMarket: s.crossMarket,
        required: i === 0,
      });
    } else {
      slots.push({
        id: `auto.${i}.${path}`,
        path,
        required: i === 0,
      });
    }
  });
  return slots.length ? slots : null;
}

/**
 * Multi-slot / cross-market hand inventories still win (complex UIs).
 * Single-slot hand entries defer to field map / contract when available.
 */
export function isRichPlaceholderInventory(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return false;
  const required = slots.filter((s) => s.required !== false);
  if (required.length >= 2) return true;
  if (slots.some((s) => s.crossMarket || (Array.isArray(s.anyOf) && s.anyOf.length > 1))) return true;
  return false;
}

/**
 * Contract panel requiredFields → path slots (schema only, no mock values).
 * @returns {Placeholder[]|null}
 */
export function placeholdersFromContract(marketId, panelId) {
  const c = getMarketContract(marketId);
  if (!c?.panels?.length) return null;
  const entry = c.panels.find((p) => p.panelId === panelId);
  if (!entry?.requiredFields?.length) return null;
  return entry.requiredFields.map((f) => ({
    id: `contract.${f}`,
    path: f,
    required: true,
  }));
}

/** @deprecated alias */
export const placeholdersFromContractPaths = placeholdersFromContract;

/**
 * Resolve L1 slots for a panel (no mock values — paths only).
 *
 * Priority:
 *   1. Rich hand inventory (multi-slot / cross-market)
 *   2. PANEL_FIELD_MAP auto paths
 *   3. Market contract panel requiredFields
 *   4. Simple hand single-slot entry
 */
export function getPanelPlaceholders(marketId, panelId) {
  const key = `${marketId}:${panelId}`;
  const hand = PANEL_PLACEHOLDERS[key] || null;
  if (hand && isRichPlaceholderInventory(hand)) return hand;

  const fromMap = placeholdersFromFieldMap(marketId, panelId);
  if (fromMap?.length) return fromMap;

  const fromContract = placeholdersFromContract(marketId, panelId);
  if (fromContract?.length) return fromContract;

  if (hand?.length) return hand;
  return null;
}
