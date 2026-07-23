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
  equities:      d => (d.quotes && Object.keys(d.quotes).length >= 1) || (Array.isArray(d.stocks) && d.stocks.length >= 1),
  equitiesDeepDive: d => (Array.isArray(d.sectorData?.sectors) && d.sectorData.sectors.length >= 5) || (Array.isArray(d.sectors) && d.sectors.length >= 5),
  calendar:       d => {
    const events = Array.isArray(d.economicEvents) && d.economicEvents.length >= 1;
    const earnings = Array.isArray(d.earningsSeason) && d.earningsSeason.length >= 1;
    const banks = Array.isArray(d.centralBanks) && d.centralBanks.length >= 1;
    return events || earnings || banks;
  },
  derivatives:    d => d.vixTermStructure?.values?.length >= 2,
  // combinedRatioData is an object { quarters, lines } (not an array) in the
  // live insurance route — also accept reinsurer tables / ETF proxies so a
  // partial FRED outage does not blank the whole tab.
  insurance:      d => {
    const cr = d.combinedRatioData;
    const crOk = Array.isArray(cr)
      ? cr.length >= 1
      : !!(cr && typeof cr === 'object' && (cr.lines || cr.quarters || cr.byLine || Object.keys(cr).length > 0));
    return crOk
      || d.hyOAS != null
      || d.igOAS != null
      || d.catLosses != null
      || (Array.isArray(d.reinsurers) && d.reinsurers.length > 0)
      || (Array.isArray(d.catBondSpreads) && d.catBondSpreads.length > 0)
      || d.sectorETF != null
      || d.catBondProxy != null
      || d.reserveAdequacyData != null;
  },
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
  // Fast-path known rich payloads so a strict normalizer cannot blank a tab
  // that clearly has usable market data (e.g. yahoo.futures, coin lists).
  if (id === 'commodities' || id === 'commoditiesEnhanced') {
    if (d.yahoo?.futures && Object.keys(d.yahoo.futures).length > 0) return true;
    if (d.priceDashboardData?.length > 0) return true;
    if (d.eia && Object.keys(d.eia).length > 0) return true;
    if (d.supplyDemand && Object.values(d.supplyDemand).some(v => v != null)) return true;
  }
  if (id === 'crypto') {
    if (d.coinMarketData?.coins?.length >= 1 || d.coins?.length >= 1 || d.fearGreedData != null) return true;
  }
  if (id === 'insurance') {
    if (d.reinsurers?.length > 0 || d.sectorETF || d.hyOAS != null || d.combinedRatioData) return true;
  }
  if (id === 'realEstate') {
    if (d.reitData?.length > 0 || d.caseShillerData || d.mortgageRates || d.priceIndexData) return true;
  }
  if (id === 'globalMacro') {
    if (d.scorecardData?.length > 0 || d.cfnai || d.oecdCli) return true;
  }
  if (id === 'equitiesDeepDive') {
    if (d.sectorData?.sectors?.length > 0 || d.factorData?.stocks?.length > 0) return true;
  }
  if (id === 'derivatives') {
    if (d.vixTermStructure?.values?.length > 0 || d.optionsFlow?.length > 0) return true;
  }

  // True → definitely keep. False → still try generic scoring (sparse feeds
  // used to return false and blank entire tabs via applyResult).
  const renderable = isRenderableMarketSnapshot(id, d);
  if (renderable === true) return true;

  const isSystemLike = id === 'analytics' || id === 'watchlist' || id === 'censusTrade' || id === 'eiaPetroleum' ||
                       id === 'cftcTFF' || id === 'bisOTC' || id === 'fao' || id === 'bls' || id === 'census' ||
                       id === 'oecd' || id === 'edgar' || id === 'usda' || id === 'universeUpdates' ||
                       (id && (id.includes('Trade') || id.includes('Petroleum') || id.startsWith('treasury') || id.startsWith('fed')));
  if (isSystemLike) {
    // Accept any non-meta field so aux endpoints count as "fetched" for panels.
    return Object.keys(d).some(k =>
      !k.startsWith('_') &&
      k !== 'lastUpdated' && k !== 'fetchedOn' && k !== 'isCurrent' && k !== 'isLive' &&
      d[k] != null
    );
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
          } else if (childValues.length > 0) {
            // Non-empty object shell (e.g. series: { unemp: {...} }) counts
            nonNull++;
          }
        }
      } else {
        nonNull++;
      }
    }
  }
  // One real field is enough to paint panels; require 2 only for "rich" tabs.
  return nonNull >= 1;
}
