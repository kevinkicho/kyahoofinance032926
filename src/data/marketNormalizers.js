const OK = 'ok';
const MISSING = 'missing';
const SOURCE_UNAVAILABLE = 'sourceUnavailable';

export function fieldStatus(value, source = true) {
  if (source === false || source === 'false') return SOURCE_UNAVAILABLE;
  if (value == null) return MISSING;
  if (Array.isArray(value)) return value.length > 0 ? OK : MISSING;
  if (typeof value === 'object') return Object.keys(value).length > 0 ? OK : MISSING;
  return OK;
}

function latestValue(series) {
  if (!series) return null;
  if (series.latest?.value != null) return series.latest.value;
  if (Array.isArray(series.values) && series.values.length) return series.values[series.values.length - 1];
  if (Array.isArray(series.history?.values) && series.history.values.length) return series.history.values[series.history.values.length - 1];
  if (Array.isArray(series.history) && series.history.length) return series.history[series.history.length - 1]?.value ?? null;
  if (series.value != null) return series.value;
  return null;
}

function toSeries(series) {
  if (!series) return { dates: [], values: [] };
  if (Array.isArray(series.dates) && Array.isArray(series.values)) return series;
  if (Array.isArray(series.history?.dates) && Array.isArray(series.history?.values)) return series.history;
  if (Array.isArray(series.history)) {
    return {
      dates: series.history.map(row => row.date ?? row.period).filter(Boolean),
      values: series.history.map(row => row.value ?? null),
    };
  }
  return { dates: [], values: [] };
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function pick(obj, keys) {
  for (const key of keys) {
    const value = obj?.[key];
    if (value != null) return value;
  }
  return null;
}

export function normalizeBondsData(data = {}) {
  const usCurve = data.yieldCurveData?.US || data.yieldCurveData?.us || {};
  const treasuryRates = {
    ...(data.treasuryRates || {}),
    US3M: data.treasuryRates?.US3M ?? usCurve['3m'] ?? usCurve['3M'] ?? null,
    US2Y: data.treasuryRates?.US2Y ?? usCurve['2y'] ?? usCurve['2Y'] ?? null,
    US5Y: data.treasuryRates?.US5Y ?? usCurve['5y'] ?? usCurve['5Y'] ?? null,
    US10Y: data.treasuryRates?.US10Y ?? usCurve['10y'] ?? usCurve['10Y'] ?? null,
    US30Y: data.treasuryRates?.US30Y ?? usCurve['30y'] ?? usCurve['30Y'] ?? null,
  };
  const spreadIndicators = {
    ...(data.spreadIndicators || {}),
    t10y2y: data.spreadIndicators?.t10y2y ?? (
      isNum(treasuryRates.US10Y) && isNum(treasuryRates.US2Y) ? treasuryRates.US10Y - treasuryRates.US2Y : null
    ),
    t10y3m: data.spreadIndicators?.t10y3m ?? (
      isNum(treasuryRates.US10Y) && isNum(treasuryRates.US3M) ? treasuryRates.US10Y - treasuryRates.US3M : null
    ),
  };
  const spreadData = data.spreadData ? {
    ...data.spreadData,
    current: {
      ...(data.spreadData.current || {}),
      igSpread: data.spreadData.current?.igSpread ?? data.spreadData.current?.ig ?? data.spreadData.IG?.at?.(-1) ?? null,
      hySpread: data.spreadData.current?.hySpread ?? data.spreadData.current?.hy ?? data.spreadData.HY?.at?.(-1) ?? null,
      emSpread: data.spreadData.current?.emSpread ?? data.spreadData.current?.em ?? data.spreadData.EM?.at?.(-1) ?? null,
      bbbSpread: data.spreadData.current?.bbbSpread ?? data.spreadData.current?.bbb ?? data.spreadData.BBB?.at?.(-1) ?? null,
    },
  } : null;
  const breakevensData = data.breakevensData || { current: {}, history: { dates: [], be5y: [], be10y: [], forward5y5y: [] } };
  const values = {
    treasuryRates,
    spreadIndicators,
    spreadData,
    tipsYields: data.tipsYields || {},
    breakevensData,
  };
  return {
    values,
    series: {
      realYieldHistory: data.realYieldHistory || { dates: [], d5y: [], d10y: [] },
      fredYieldHistory: data.fredYieldHistory || { dates: [], values: [] },
      spreadHistory: data.spreadHistory || { dates: [], t10y2y: [], t10y3m: [], t5y30y: [], latest: {} },
    },
    availability: {
      us10y: fieldStatus(treasuryRates.US10Y, data._sources?.['US Treasury Yields']),
      us2y: fieldStatus(treasuryRates.US2Y, data._sources?.['US Treasury Yields']),
      us3m: fieldStatus(treasuryRates.US3M, data._sources?.['US Treasury Yields']),
      tips: fieldStatus(data.tipsYields, data._sources?.['TIPS Real Yields']),
      creditSpreads: fieldStatus(spreadData?.current, data._sources?.['Credit Spreads (IG_HY_EM_BBB)']),
    },
    sources: data._sources || {},
  };
}

export function normalizeCommoditiesData(data = {}) {
  const fred = data.fred || {};
  const yahooFutures = data.yahoo?.futures || {};
  const goldHistory = toSeries(fred.gold_am || fred.gold || data.fredCommodities?.goldHistory);
  const goldLatest = latestValue(fred.gold_am || fred.gold) ?? yahooFutures['GC=F']?.price ?? null;
  const wtiLatest = latestValue(data.eia?.wti_price || fred.wti) ?? yahooFutures['CL=F']?.price ?? null;
  const supplyDemand = data.supplyDemandData || {};
  const eia = data.eia || {};
  const normalizedSupplyDemand = {
    ...supplyDemand,
    crudeStocks: supplyDemand.crudeStocks || (eia.crude_stocks ? {
      periods: (eia.crude_stocks.history || []).map(row => row.date),
      values: (eia.crude_stocks.history || []).map(row => row.value),
      avg5yr: eia.crude_stocks._avg5yr ?? null,
    } : undefined),
    natGasStorage: supplyDemand.natGasStorage || (eia.natgas_storage ? {
      periods: (eia.natgas_storage.history || []).map(row => row.date),
      values: (eia.natgas_storage.history || []).map(row => row.value),
      avg5yr: eia.natgas_storage._avg5yr ?? null,
    } : undefined),
    crudeProduction: supplyDemand.crudeProduction || (eia.crude_production ? {
      periods: (eia.crude_production.history || []).map(row => row.date),
      values: (eia.crude_production.history || []).map(row => row.value),
    } : undefined),
  };
  return {
    values: {
      goldLatest,
      wtiLatest,
      goldOilRatio: data.goldOilRatio || (isNum(goldLatest) && isNum(wtiLatest) ? { ratio: Math.round((goldLatest / wtiLatest) * 100) / 100 } : null),
      supplyDemandData: normalizedSupplyDemand,
    },
    series: {
      goldHistory,
      wtiHistory: toSeries(fred.wti || data.fredCommodities?.wtiHistory),
      brentHistory: toSeries(fred.brent || data.fredCommodities?.brentHistory),
    },
    availability: {
      supplyDemand: fieldStatus(normalizedSupplyDemand, data._sources?.eia),
      gold: fieldStatus(goldLatest, data._sources?.fred || data._sources?.yahoo),
    },
    sources: data._sources || {},
  };
}

export function normalizeSentimentData(data = {}) {
  return {
    values: {
      fearGreedData: data.fearGreedData || null,
      cftcData: data.cftcData || null,
      riskData: data.riskData || null,
      returnsData: data.returnsData || null,
      marginDebtLatest: latestValue(data.marginDebt),
      consumerCreditLatest: latestValue(data.consumerCredit),
      fsiLatest: latestValue(data.fsiHistory),
    },
    series: {
      marginDebt: toSeries(data.marginDebt),
      consumerCredit: toSeries(data.consumerCredit),
      vvixHistory: data.vvixHistory || { dates: [], values: [] },
      fsiHistory: data.fsiHistory || { dates: [], values: [] },
    },
    availability: {
      fearGreed: fieldStatus(data.fearGreedData, data._sources?.fearGreedData),
      cftc: fieldStatus(data.cftcData, data._sources?.cftcCot),
      returns: fieldStatus(data.returnsData),
      leverage: fieldStatus(data.marginDebt || data.consumerCredit),
    },
    sources: data._sources || {},
  };
}

export function normalizeRealEstateData(data = {}, context = {}) {
  const commodities = context.commodities || {};
  const gold = pick(commodities?.yahoo?.futures?.['GC=F'], ['price']) ?? pick(commodities?.fred?.gold_am, ['value']);
  const wti = pick(commodities?.eia?.wti_price, ['value']) ?? pick(commodities?.yahoo?.futures?.['CL=F'], ['price']);
  const natGas = pick(commodities?.eia?.natgas, ['value']) ?? pick(commodities?.yahoo?.futures?.['NG=F'], ['price']);
  const capRateData = Array.isArray(data.capRateData)
    ? data.capRateData.map(row => ({
        ...row,
        impliedYieldPct: isNum(row.impliedYield) && row.impliedYield > 100 ? row.impliedYield / 100 : row.impliedYield,
      }))
    : data.capRateData;
  return {
    values: {
      caseShillerLatest: data.caseShillerData?.national?.values?.at?.(-1) ?? null,
      medianHomePriceLatest: latestValue(data.medianHomePrice),
      mortgageRate30y: data.mortgageRates?.rate30y ?? null,
      mortgageRate15y: data.mortgageRates?.rate15y ?? null,
      housingStartsLatest: data.housingStarts?.starts?.at?.(-1) ?? null,
      homeownershipRate: data.homeownershipRate ?? null,
      commoditiesData: { gold, wti, natGas },
      capRateData,
    },
    series: {
      caseShiller: data.caseShillerData?.national || { dates: [], values: [] },
      medianHomePrice: toSeries(data.medianHomePrice),
    },
    availability: {
      caseShiller: fieldStatus(data.caseShillerData, data._sources?.caseShiller),
      mortgageRates: fieldStatus(data.mortgageRates, data._sources?.mortgageRates),
      housingStarts: fieldStatus(data.housingStarts, data._sources?.housingStarts),
      commodities: fieldStatus({ gold, wti, natGas }),
    },
    sources: data._sources || {},
  };
}

export function normalizeCalendarData(data = {}) {
  const economicEvents = Array.isArray(data.economicEvents) ? data.economicEvents : [];
  const centralBanks = Array.isArray(data.centralBanks) ? data.centralBanks : [];
  const earningsSeason = Array.isArray(data.earningsSeason) ? data.earningsSeason : [];
  const keyReleases = Array.isArray(data.keyReleases) ? data.keyReleases : [];
  return {
    values: {
      economicEvents,
      centralBanks,
      earningsSeason,
      keyReleases,
      treasuryAuctions: Array.isArray(data.treasuryAuctions) ? data.treasuryAuctions : [],
      optionsExpiry: Array.isArray(data.optionsExpiry) ? data.optionsExpiry : [],
      dividendCalendar: Array.isArray(data.dividendCalendar) ? data.dividendCalendar : [],
      coverage: {
        low: economicEvents.length === 1,
        eventCount: economicEvents.length,
      },
    },
    series: {},
    availability: {
      economicEvents: fieldStatus(economicEvents, data._sources?.econEvents),
      centralBanks: fieldStatus(centralBanks, data._sources?.centralBankRates),
      earnings: fieldStatus(earningsSeason, data._sources?.earnings),
      keyReleases: fieldStatus(keyReleases, data._sources?.fredReleases),
    },
    sources: data._sources || {},
  };
}

const COUNTRY_META = {
  US: { flag: '🇺🇸', name: 'United States' },
  EA: { flag: '🇪🇺', name: 'Euro Area' },
  GB: { flag: '🇬🇧', name: 'United Kingdom' },
  JP: { flag: '🇯🇵', name: 'Japan' },
  CA: { flag: '🇨🇦', name: 'Canada' },
  KR: { flag: '🇰🇷', name: 'South Korea' },
  CN: { flag: '🇨🇳', name: 'China' },
  DE: { flag: '🇩🇪', name: 'Germany' },
  FR: { flag: '🇫🇷', name: 'France' },
  IT: { flag: '🇮🇹', name: 'Italy' },
};

function normalizeOecdCli(oecdCli) {
  if (!oecdCli) return { map: {}, countries: [], asOf: null };
  if (Array.isArray(oecdCli.countries)) {
    return {
      map: Object.fromEntries(oecdCli.countries.map(c => [c.code, { value: c.cli ?? c.value, date: c.date }])),
      countries: oecdCli.countries,
      asOf: oecdCli.asOf ?? oecdCli.countries.find(c => c.date)?.date ?? null,
    };
  }
  const countries = Object.entries(oecdCli)
    .filter(([, entry]) => entry && typeof entry === 'object')
    .map(([code, entry]) => {
      const value = entry.value ?? entry.cli ?? null;
      const meta = COUNTRY_META[code] || {};
      return {
        code,
        flag: meta.flag || code,
        name: meta.name || code,
        cli: value,
        value,
        date: entry.date ?? null,
        trend: value > 100 ? 'improving' : value < 99 ? 'slowing' : 'stable',
      };
    });
  return { map: oecdCli, countries, asOf: countries.find(c => c.date)?.date ?? null };
}

export function normalizeGlobalMacroData(data = {}) {
  const cfnai = data.cfnai || null;
  const oecd = normalizeOecdCli(data.oecdCli);
  return {
    values: {
      ...data,
      cfnai: cfnai ? {
        ...cfnai,
        latest: cfnai.latest ?? cfnai.values?.[cfnai.values.length - 1] ?? null,
      } : null,
      oecdCli: oecd.map,
      oecdCliDetail: {
        countries: oecd.countries,
        asOf: oecd.asOf,
      },
    },
    series: {
      cfnai: cfnai?.dates?.length ? cfnai : null,
      yieldSpread: data.yieldSpread || null,
    },
    availability: {
      cfnai: fieldStatus(cfnai?.latest ?? cfnai?.values?.[cfnai?.values?.length - 1], data._sources?.cfnai),
      oecdCli: fieldStatus(oecd.countries, data._sources?.oecdCli),
      yieldSpread: fieldStatus(data.yieldSpread?.values, data._sources?.yieldSpread),
    },
    sources: data._sources || {},
  };
}

function averageByKey(rows, key) {
  const nums = (rows || []).map(row => row?.[key]).filter(isNum);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function normalizeFactorData(factorData = {}) {
  const stocks = Array.isArray(factorData.stocks) ? factorData.stocks : [];
  const rawInFavor = factorData.inFavor || {};
  const derived = {
    value: averageByKey(stocks, 'value'),
    momentum: averageByKey(stocks, 'momentum'),
    quality: averageByKey(stocks, 'quality'),
    lowVol: averageByKey(stocks, 'lowVol'),
  };
  const hasUsableRaw = Object.values(rawInFavor).some(v => isNum(v) && v !== 0);
  const inFavor = hasUsableRaw ? rawInFavor : derived;
  const factorReturns = [
    { name: 'Value', key: 'value', return: inFavor.value },
    { name: 'Momentum', key: 'momentum', return: inFavor.momentum },
    { name: 'Quality', key: 'quality', return: inFavor.quality },
    { name: 'Low-Vol', key: 'lowVol', return: inFavor.lowVol },
  ].filter(f => isNum(f.return));
  return { ...factorData, inFavor, factorReturns, stocks };
}

export function normalizeEquityDeepDiveData(data = {}) {
  const sectors = Array.isArray(data.sectorData?.sectors) ? data.sectorData.sectors : [];
  const factorData = normalizeFactorData(data.factorData || {});
  const aggregateShortPct = data.shortData?.aggregateShortPct ?? (
    data.shortData?.mostShorted?.length ? averageByKey(data.shortData.mostShorted, 'shortFloat') : null
  );
  const avgSurprise = data.earningsData?.avgSurprise ?? averageByKey(data.earningsData?.beatRates, 'beatRate');
  return {
    values: {
      ...data,
      sectorData: { ...(data.sectorData || {}), sectors },
      factorData,
      earningsData: { ...(data.earningsData || {}), avgSurprise },
      shortData: { ...(data.shortData || {}), aggregateShortPct },
    },
    series: {
      sectors,
      factorReturns: factorData.factorReturns,
      factorStocks: factorData.stocks,
    },
    availability: {
      sectors: fieldStatus(sectors, data._sources?.sectorData),
      factors: fieldStatus(factorData.factorReturns, data._sources?.factorData),
      earnings: fieldStatus(data.earningsData?.upcoming, data._sources?.earningsData),
      short: fieldStatus(data.shortData?.mostShorted, data._sources?.shortData),
    },
    sources: data._sources || {},
  };
}

export function normalizeSeriesPayload(data = {}) {
  const series = data.series || {};
  return {
    values: Object.fromEntries(Object.entries(series).map(([key, value]) => [key, {
      latest: value?.latest?.value ?? latestValue(value),
      previous: value?.previous?.value ?? null,
      label: value?.label || key,
      unit: value?.unit || '',
    }])),
    series: Object.fromEntries(Object.entries(series).map(([key, value]) => [key, toSeries(value)])),
    availability: Object.fromEntries(Object.entries(series).map(([key, value]) => [key, fieldStatus(value, value?._source)])),
    sources: data._sources || {},
  };
}

export function isRenderableMarketSnapshot(id, data) {
  if (!data || typeof data !== 'object') return false;
  if (['analytics', 'watchlist', 'usda', 'censusTrade', 'eiaPetroleum'].includes(id)) {
    return Object.keys(data).some(key => !key.startsWith('_') && data[key] != null);
  }
  if (id === 'bea') return !!(data.gdpComponents?.length || data.personalIncome?.length || data.savingRate?.length);
  if (id === 'eurostat') return !!(data.hicp?.length || data.unemployment?.length || data.govtDeficit?.length);
  if (id === 'oecd') return !!(data.cli && Object.values(data.cli).some(rows => Array.isArray(rows) && rows.length));
  if (id === 'edgar') return !!(data.tickers && Object.keys(data.tickers).length);
  if (id === 'universeUpdates') return Array.isArray(data.updates);
  if (id === 'bls' || id === 'census') return Object.keys(data.series || {}).length > 0;
  if (id === 'calendar') {
    const n = normalizeCalendarData(data);
    return n.values.economicEvents.length > 0 || n.values.centralBanks.length > 0 || n.values.earningsSeason.length > 0 || n.values.keyReleases.length > 0;
  }
  if (id === 'globalMacro') {
    const n = normalizeGlobalMacroData(data);
    return !!(n.values.scorecardData?.length || n.series.cfnai?.values?.length || n.values.oecdCliDetail?.countries?.length);
  }
  if (id === 'equitiesDeepDive') {
    const n = normalizeEquityDeepDiveData(data);
    return !!(n.values.sectorData?.sectors?.length || n.values.factorData?.stocks?.length || n.values.factorData?.factorReturns?.length);
  }
  return null;
}

export const DATA_STATUS_LABEL = {
  [OK]: 'Available',
  [MISSING]: 'No current source data',
  stale: 'Waiting for next scheduled release',
  [SOURCE_UNAVAILABLE]: 'Source unavailable',
  partial: 'Partial snapshot',
};
