/** Live-chip predicates for credit tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** KPI strip always paints 5 cards; live only when a painted metric is numeric. */
export function hasCreditKpiMetrics({ spreadData, emBondData, defaultData, commercialPaper } = {}) {
  const cur = spreadData?.current;
  if (isFiniteNumber(cur?.igSpread) || isFiniteNumber(cur?.hySpread) || isFiniteNumber(cur?.emSpread)) return true;
  const countries = Array.isArray(emBondData?.countries) ? emBondData.countries : [];
  if (countries.some((c) => isFiniteNumber(c?.spread))) return true;
  const rates = defaultRateRows(defaultData);
  if (rates.some((r) => isFiniteNumber(r?.value))) return true;
  if (isFiniteNumber(defaultData?.defaultRate)) return true;
  if (isFiniteNumber(commercialPaper?.rate) || isFiniteNumber(commercialPaper?.financial3m) || isFiniteNumber(commercialPaper?.nonfinancial3m)) return true;
  return false;
}

/** Key-metrics sidebar is empty when no spread / default / delinquency / CP number exists. */
export function hasKeyMetricsContent({ spreadData, defaultData, delinquencyRates, commercialPaper } = {}) {
  const cur = spreadData?.current;
  if (isFiniteNumber(cur?.igSpread) || isFiniteNumber(cur?.hySpread) || isFiniteNumber(cur?.emSpread)) return true;
  if (defaultRateRows(defaultData).length > 0) return true;
  if (isFiniteNumber(defaultData?.defaultRate)) return true;
  if (isFiniteNumber(delinquencyRates?.[0]?.rate)) return true;
  if (isFiniteNumber(commercialPaper?.rate)) return true;
  return false;
}

/** Credit-spreads chart needs history dates plus at least one non-null series. */
export function hasSpreadHistory(spreadData) {
  const history = spreadData?.history;
  const dates = history?.dates;
  if (!Array.isArray(dates) || !dates.length) return false;
  return ['IG', 'HY', 'BBB', 'CCC', 'EM'].some(
    (k) => Array.isArray(history?.[k]) && history[k].some((v) => v != null),
  );
}

export function hasSpreadSummary(spreadData) {
  const c = spreadData?.current;
  if (!c || typeof c !== 'object') return false;
  return [c.igSpread, c.hySpread, c.emSpread, c.bbbSpread, c.cccSpread].some((v) => v != null);
}

export function hasEmYieldRows(emBondData) {
  const list = emBondData?.countries || emBondData;
  return Array.isArray(list) && list.length > 0;
}

export function hasCpRates(commercialPaper) {
  if (!commercialPaper || typeof commercialPaper !== 'object' || Array.isArray(commercialPaper)) return false;
  return commercialPaper.rate != null
    || commercialPaper.financial3m != null
    || commercialPaper.nonfinancial3m != null
    || commercialPaper.volume != null;
}

export function hasCloTranches(loanData) {
  if (Array.isArray(loanData?.cloTranches)) return loanData.cloTranches.length > 0;
  if (Array.isArray(loanData)) return loanData.length > 0;
  return false;
}

/** Default-rate rows the tile can slice. Leftover isLive / rates bag remount-crash .slice. */
export function defaultRateRows(defaultData) {
  return Array.isArray(defaultData?.rates) ? defaultData.rates : [];
}

export function hasDefaultRateRows(defaultData) {
  return defaultRateRows(defaultData).length > 0;
}

export function hasDelinquencyRows(delinquencyRates) {
  return Array.isArray(delinquencyRates) && delinquencyRates.length > 0;
}

export function hasTedSpreadSeries(tedSpread) {
  return Array.isArray(tedSpread?.values) && tedSpread.values.length > 0;
}

/** Trade-activity rows that paint trades / par; leftover sibling keys still empty / crash the tile. */
export function muniTradeRows(msrbData) {
  const rows = Array.isArray(msrbData?.tradeTypes) ? msrbData.tradeTypes : [];
  return rows.filter((r) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
    if (typeof r.type !== 'string' || !r.type.trim()) return false;
    return isFiniteNumber(r.trades) || isFiniteNumber(r.parM);
  });
}

/** Primary-market bars that paint par $M; leftover period / isLive sibling keys still empty / crash the tile. */
export function muniPrimaryRows(msrbData) {
  const rows = Array.isArray(msrbData?.primaryMarket) ? msrbData.primaryMarket : [];
  return rows.filter((r) => {
    if (!r || typeof r !== 'object' || Array.isArray(r)) return false;
    if (typeof r.period !== 'string' || !r.period.trim()) return false;
    if (/total/i.test(r.period)) return false;
    return isFiniteNumber(r.parM);
  });
}

/** Muni tile is empty unless a trade or issuance row paints; leftover summary bag is leftover. */
export function hasMuniMarketSummary(msrbData) {
  return muniTradeRows(msrbData).length > 0 || muniPrimaryRows(msrbData).length > 0;
}

/** Bank-stress paints 6 cards; leftover spread / FDIC bags still dash out. */
export function hasBankStressContent({
  spreadData,
  defaultData,
  commercialPaper,
  fdicData,
} = {}) {
  const hy = Number(spreadData?.current?.hySpread);
  const ig = Number(spreadData?.current?.igSpread);
  if (Number.isFinite(hy) || Number.isFinite(ig)) return true;

  const def = defaultData?.rates?.[0]?.value ?? defaultData?.defaultRate;
  if (typeof def === 'number' && Number.isFinite(def)) return true;

  if (typeof commercialPaper?.rate === 'number' && Number.isFinite(commercialPaper.rate)) return true;

  const aggregate = Array.isArray(fdicData?.aggregate) ? fdicData.aggregate : [];
  const latest = aggregate[0];
  const prior = aggregate[1];
  if (
    latest?.depositsB != null
    && prior?.depositsB
    && Number.isFinite(Number(latest.depositsB))
    && Number.isFinite(Number(prior.depositsB))
  ) {
    return true;
  }

  return Array.isArray(fdicData?.failures) && fdicData.failures.length > 0;
}

/** Credit-quality chart is empty when dates exist but no Aaa/Baa/spread series paint. */
export function hasCreditQualitySeries(creditQuality) {
  if (!Array.isArray(creditQuality?.dates) || !creditQuality.dates.length) return false;
  return ['aaaPct', 'baaPct', 'spreadBps'].some(
    (k) => Array.isArray(creditQuality?.[k]) && creditQuality[k].some((v) => v != null),
  );
}
