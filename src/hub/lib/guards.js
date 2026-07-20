import { isRenderableMarketSnapshot } from '../../data/marketNormalizers';

export const STRUCTURAL_GUARDS = {
  bonds:          d => { const yd = d.yieldCurveData; if (!yd || typeof yd !== 'object') return false; return Object.values(yd).filter(v => v && typeof v === 'object' && Object.values(v).some(x => x != null)).length >= 3; },
  commodities:    d => (d.priceDashboardData?.length > 0) || (d.sectorHeatmapData?.commodities?.length > 0) || (d.yahoo?.futures && Object.keys(d.yahoo.futures).length > 0) || (d.cotData === null || d.cotData === undefined || !Array.isArray(d.cotData) || d.cotData.length >= 2),
  sentiment:      d => (d.fearGreedData != null && Object.keys(d.fearGreedData).length > 0) || (d.riskData != null && Object.keys(d.riskData).length > 0) || (Array.isArray(d.cftcData) && d.cftcData.length > 0),
  globalMacro:    d => (Array.isArray(d.scorecardData) && d.scorecardData.length >= 8) || (Array.isArray(d.growthInflationData) && d.growthInflationData.length > 0) || (d.centralBankData?.length > 0),
  credit:         d => {
    const fredSpreadBranch = d.spreadData?.history?.dates?.length >= 6 && d.commercialPaper?.rate != null;
    const emBondBranch = Array.isArray(d.emBondData?.countries) && d.emBondData.countries.length >= 5;
    const loanBranch = Array.isArray(d.loanData?.indices) && d.loanData.indices.length >= 1;
    const defaultBranch = Array.isArray(d.defaultData?.rates) && d.defaultData.rates.length >= 1;
    return fredSpreadBranch || emBondBranch || loanBranch || defaultBranch;
  },
  crypto:         d => (d.coinMarketData?.coins?.length >= 2) || (d.coins?.length >= 2) || (d.fearGreedData != null),
  equities:      d => (d.quotes && Object.keys(d.quotes).length >= 50) || (Array.isArray(d.stocks) && d.stocks.length >= 1),
  equitiesDeepDive: d => (Array.isArray(d.sectorData?.sectors) && d.sectorData.sectors.length >= 5) || (Array.isArray(d.sectors) && d.sectors.length >= 5),
  calendar:       d => {
    const events = Array.isArray(d.economicEvents) && d.economicEvents.length >= 1;
    const earnings = Array.isArray(d.earningsSeason) && d.earningsSeason.length >= 1;
    const banks = Array.isArray(d.centralBanks) && d.centralBanks.length >= 1;
    return events || earnings || banks;
  },
  derivatives:    d => d.vixTermStructure?.values?.length >= 2,
  insurance:      d => (Array.isArray(d.combinedRatioData) && d.combinedRatioData.length >= 1) || d.hyOAS != null || d.igOAS != null || d.catLosses != null,
  realEstate:     d => (Array.isArray(d.reitData) && d.reitData.length >= 2) || (d.caseShillerData?.dates?.length > 0) || (d.mortgageRates?.rate30y != null),
  fx:             d => d.spotRates != null && Object.keys(d.spotRates).length >= 3,
  imf:            d => (Array.isArray(d.countries) && d.countries.length >= 5) || d.reserves != null,
  worldbank:      d => (Array.isArray(d.countries) && d.countries.length >= 5) || d.indicators?.length > 0,
  bls:            d => d.series && Object.keys(d.series).length > 0,
  eia:            d => d.electricity?.residential != null || d.co2Emissions?.total != null,
  census:         d => d.series && Object.keys(d.series).length > 0,
};

export function passesStructuralGuard(id, d) {
  if (id === 'analytics') return true;
  const renderable = isRenderableMarketSnapshot(id, d);
  if (renderable != null) return renderable;
  const guard = STRUCTURAL_GUARDS[id];
  if (!guard) return true;
  try {
    return guard(d);
  } catch {
    return false;
  }
}

// CRITICAL_FIELDS — markets whose snapshots may pass the structural guard
// but have null critical fields because upstream APIs failed on snapshot day.
// When any critical field is null, the market needs a live repair fetch.
const CRITICAL_FIELDS = {
  bonds:          ['spreadHistory', 'fedBalanceSheetHistory', 'm2HistoryData', 'cpiComponents', 'debtToGdpHistory', 'breakevensData', 'durationLadder', 'macroData'],
  realEstate:     ['foreclosureData', 'mbaApplications', 'creDelinquencies', 'existingHomeSales', 'rentalVacancy', 'treasury10y'],
  fx:             ['fredFxRates', 'dxyHistory', 'rateDifferentials'],
  derivatives:    ['volPremium', 'skewHistory', 'vixPercentile'],
  insurance:      ['industryAvgCombinedRatio', 'catLosses', 'reinsurancePricing'],
  globalMacro:    ['imfWEO', 'bisCreditToGDP'],
  commodities:    ['sectorHeatmapData', 'commodityCurrencies'],
  crypto:         ['ethGas', 'fundingData', 'onChainData'],
  credit:         ['delinquencyRates', 'commercialPaper'],
  sentiment:      ['riskData', 'returnsData', 'cftcData'],
  equities:       ['quotes', 'indices'],
  equitiesDeepDive: ['sectorData', 'factorData', 'earningsData', 'shortData', 'insiderData'],
  calendar:       ['economicEvents', 'centralBanks', 'earningsSeason'],
  bls:            ['series'],
  eia:            ['electricity', 'co2Emissions', 'petroleum', 'naturalGas'],
};

export function needsLiveRepair(id, data) {
  if (!data || typeof data !== 'object') return true;
  // Markets with custom logic
  if (id === 'equitiesDeepDive') {
    if (!data.sectorData?.sectors?.length && !data.factorData?.inFavor && !data.factorData?.stocks?.length) return true;
    if (data.equityRiskPremium == null && data.spPE == null && data.buffettIndicator == null) return true;
    return false;
  }
  if (id === 'globalMacro') {
    if (data.cfnai?.values?.length === 0 && data.oecdCli == null) return true;
    const fields = CRITICAL_FIELDS[id] || [];
    return fields.some(f => data[f] == null);
  }
  if (id === 'sentiment') {
    if (data.fearGreedData?.score == null && data.fearGreedData?.value == null) return true;
    const fields = CRITICAL_FIELDS[id] || [];
    return fields.some(f => data[f] == null);
  }
  if (id === 'calendar') {
    if (!data.centralBanks?.length && !data.economicEvents?.length && !data.keyReleases?.length) return true;
    return false;
  }
  // Markets that don't need repair (system endpoints or always-fresh)
  if (id === 'analytics' || id === 'watchlist' || id === 'alerts') return false;
  // Generic critical-field check
  const fields = CRITICAL_FIELDS[id];
  if (!fields) return false;
  return fields.some(f => data[f] == null);
}

export function hasNonNullData(d, id) {
  if (!d || typeof d !== 'object') return false;
  const renderable = isRenderableMarketSnapshot(id, d);
  if (renderable != null) return renderable;
  const isSystemLike = id === 'analytics' || id === 'watchlist' || id === 'censusTrade' || id === 'eiaPetroleum' ||
                       id === 'cftcTFF' || id === 'bisOTC' || id === 'fao' ||
                       (id && (id.includes('Trade') || id.includes('Petroleum') || id.startsWith('treasury')));
  if (isSystemLike) {
    return Object.keys(d).some(k => !k.startsWith('_') && d[k] != null);
  }
  let nonNull = 0;
  for (const [k, v] of Object.entries(d)) {
    if (k.startsWith('_') || k === 'lastUpdated' || k === 'fetchedOn' || k === 'isCurrent' || k === 'isLive' || k === 'countryCount') continue;
    if (v != null && v !== false) {
      if (typeof v === 'object') {
        if (Array.isArray(v)) {
          if (v.length > 0) nonNull++;
        } else {
          const childValues = Object.values(v);
          if (childValues.length > 0 && childValues.some(x => x != null && x !== false)) {
            let hadSource = false;
            for (const cv of childValues) {
              if (cv != null && cv !== false && typeof cv === 'object' && !Array.isArray(cv) && cv._source === true) {
                nonNull++;
                hadSource = true;
              }
            }
            if (!hadSource) nonNull++;
          }
        }
      } else {
        nonNull++;
      }
    }
  }
  return nonNull >= 2;
}
