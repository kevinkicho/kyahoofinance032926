/**
 * Shared helpers: strip empty/null datapoints and detect hollow cache shells
 * so panels never bind all-null placeholder rows.
 */

export function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/** True when a value is "present" for density checks (not null/empty). */
export function hasValue(v) {
  if (v == null || v === '') return false;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'object') return Object.keys(v).length > 0;
  return true;
}

/**
 * Drop keys whose values are null/undefined/empty-string.
 * Optionally keep false/0.
 */
export function omitNullFields(obj, { keepZero = true } = {}) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    if (!keepZero && v === 0) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Keep only array items that have at least one of the required numeric
 * (or any) fields populated.
 */
export function filterRowsWithData(rows, requiredAnyOf = []) {
  if (!Array.isArray(rows)) return [];
  if (!requiredAnyOf.length) {
    return rows.filter((row) => {
      if (!row || typeof row !== 'object') return row != null;
      return Object.values(row).some((v) => hasValue(v) && v !== false);
    });
  }
  return rows.filter((row) => {
    if (!row || typeof row !== 'object') return false;
    return requiredAnyOf.some((key) => hasValue(row[key]));
  });
}

/**
 * History object { dates, values, ...series } — drop if no dates/values.
 */
export function hasHistory(h) {
  if (!h || typeof h !== 'object') return false;
  if (Array.isArray(h.dates) && h.dates.length > 0) return true;
  if (Array.isArray(h.values) && h.values.length > 0) return true;
  return false;
}

/**
 * Spread-style current object: empty if every value is null/undefined.
 */
export function isHollowCurrent(current) {
  if (!current || typeof current !== 'object') return true;
  const vals = Object.values(current);
  if (!vals.length) return true;
  return vals.every((x) => x == null || x === '');
}

/**
 * Detect hollow market field for cache merge (extends isEmptyField ideas).
 */
export function isHollowField(v) {
  if (v == null) return true;
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    // Array of metric rows: hollow if none have a numeric value/rate/price
    const valueKeys = ['value', 'rate', 'price', 'spread', 'lastPrint', 'previous', 'cpi', 'score'];
    const anyLive = v.some((row) => {
      if (row == null) return false;
      if (typeof row !== 'object') return true;
      return valueKeys.some((k) => hasValue(row[k])) || Object.values(row).some(hasValue);
    });
    return !anyLive;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return true;
    if (v.current && typeof v.current === 'object') {
      const allNull = isHollowCurrent(v.current);
      const noHistory = !hasHistory(v.history);
      if (allNull && noHistory) return true;
    }
    // rates + chargeoffs style
    if (Array.isArray(v.rates) && isHollowField(v.rates) && !hasHistory(v.chargeoffs) && !hasHistory(v.defaultHistory)) {
      return true;
    }
    // signals array hollow
    if (Array.isArray(v.signals) && v.signals.length === 0 && isHollowCurrent(
      Object.fromEntries(Object.entries(v).filter(([k]) => !['signals', 'overallScore', 'overallLabel'].includes(k)))
    )) {
      return true;
    }
  }
  return false;
}

/**
 * isLive = any of the listed fields is non-hollow.
 */
export function computeIsLive(payload, fieldNames = []) {
  if (!payload || typeof payload !== 'object') return false;
  if (!fieldNames.length) {
    return Object.entries(payload)
      .filter(([k]) => !k.startsWith('_') && k !== 'lastUpdated' && k !== 'fetchedOn' && k !== 'isLive' && k !== 'isCurrent')
      .some(([, v]) => !isHollowField(v) && hasValue(v));
  }
  return fieldNames.some((name) => !isHollowField(payload[name]) && hasValue(payload[name]));
}

/**
 * Strip hollow / all-null datapoint rows from a market payload so disk caches
 * written before hygiene never re-poison the UI.
 * Mutates a shallow clone; safe to call on every response path.
 */
export function sanitizeMarketPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  const out = { ...payload };

  // ── Credit ──────────────────────────────────────────────────────────────
  if (out.loanData && typeof out.loanData === 'object') {
    const indices = Array.isArray(out.loanData.indices)
      ? out.loanData.indices.filter((i) => i && i.value != null && Number.isFinite(Number(i.value)))
        .map((i) => omitNullFields(i))
      : [];
    const clo = Array.isArray(out.loanData.cloTranches)
      ? out.loanData.cloTranches.filter((t) => t && (t.spread != null || t.yield != null))
        .map((t) => omitNullFields(t))
      : [];
    out.loanData = (indices.length || clo.length)
      ? { ...out.loanData, indices, cloTranches: clo }
      : null;
  }
  if (out.defaultData?.rates && Array.isArray(out.defaultData.rates)) {
    const rates = out.defaultData.rates
      .filter((r) => r && r.value != null)
      .map((r) => omitNullFields(r));
    out.defaultData = rates.length || out.defaultData.chargeoffs
      ? { ...out.defaultData, rates }
      : null;
  }
  if (Array.isArray(out.delinquencyRates)) {
    out.delinquencyRates = out.delinquencyRates
      .filter((r) => r && (r.rate != null || r.value != null))
      .map((r) => omitNullFields(r));
    if (!out.delinquencyRates.length) out.delinquencyRates = null;
  }

  // ── Calendar ────────────────────────────────────────────────────────────
  if (Array.isArray(out.centralBanks)) {
    out.centralBanks = out.centralBanks
      .filter((b) => b?.bank && b.rate != null && Number.isFinite(Number(b.rate)))
      .map((b) => omitNullFields(b));
  }
  if (Array.isArray(out.economicEvents)) {
    out.economicEvents = out.economicEvents
      .filter((e) => e?.date && (e.event || e.name))
      .map((e) => omitNullFields(e));
  }
  if (Array.isArray(out.earningsSeason)) {
    out.earningsSeason = out.earningsSeason
      .filter((e) => e?.ticker && e?.date)
      .map((e) => omitNullFields(e));
  }
  if (Array.isArray(out.keyReleases)) {
    out.keyReleases = out.keyReleases
      .filter((r) => r?.date && r?.name)
      .map((r) => omitNullFields(r));
  }

  // ── Sentiment ───────────────────────────────────────────────────────────
  if (out.fearGreedData?.indicators && Array.isArray(out.fearGreedData.indicators)) {
    out.fearGreedData = {
      ...out.fearGreedData,
      indicators: out.fearGreedData.indicators
        .filter((i) => i && i.value != null && Number.isFinite(Number(i.value)))
        .map((i) => omitNullFields(i)),
    };
  }
  if (out.riskData && typeof out.riskData === 'object') {
    const signals = Array.isArray(out.riskData.signals)
      ? out.riskData.signals.filter((s) => s && s.value != null)
      : [];
    out.riskData = omitNullFields({ ...out.riskData, signals });
  }
  if (out.returnsData?.assets && Array.isArray(out.returnsData.assets)) {
    out.returnsData = {
      ...out.returnsData,
      assets: out.returnsData.assets
        .filter((a) => a && (a.ret1d != null || a.ret1w != null || a.ret1m != null || a.ret3m != null))
        .map((a) => omitNullFields(a)),
    };
  }

  // ── Insurance ───────────────────────────────────────────────────────────
  if (Array.isArray(out.reinsurancePricing)) {
    out.reinsurancePricing = out.reinsurancePricing
      .filter((r) => r && r.price != null)
      .map((r) => omitNullFields(r));
  }
  if (Array.isArray(out.reinsurers)) {
    out.reinsurers = out.reinsurers
      .filter((r) => r && r.price != null)
      .map((r) => omitNullFields(r));
  }
  if (Array.isArray(out.catBondSpreads)) {
    out.catBondSpreads = out.catBondSpreads
      .filter((r) => r && r.spread != null)
      .map((r) => omitNullFields(r));
  }
  if (Array.isArray(out.sectorETF)) {
    // sectorETF is array-like with extra props via Object.assign
    const rows = out.sectorETF
      .filter((r) => r && (r.price != null || r.value != null || r.changePct != null))
      .map((r) => omitNullFields(r));
    if (rows.length) {
      const meta = omitNullFields({
        symbol: out.sectorETF.symbol,
        name: out.sectorETF.name,
        price: out.sectorETF.price,
        changePct: out.sectorETF.changePct,
        _source: out.sectorETF._source,
        _note: out.sectorETF._note,
      });
      out.sectorETF = Object.assign(rows, meta);
    } else {
      out.sectorETF = null;
    }
  }
  if (out.catBondProxy && out.catBondProxy.price == null) {
    out.catBondProxy = null;
  } else if (out.catBondProxy) {
    out.catBondProxy = omitNullFields(out.catBondProxy);
  }

  // ── Derivatives ─────────────────────────────────────────────────────────
  if (Array.isArray(out.optionsFlow)) {
    out.optionsFlow = out.optionsFlow
      .filter((r) => r && (r.premium != null || r.volume != null || r.oi != null || r.symbol))
      .map((r) => omitNullFields(r));
    if (!out.optionsFlow.length) out.optionsFlow = null;
  }
  if (Array.isArray(out.gammaExposure)) {
    out.gammaExposure = out.gammaExposure
      .filter((r) => r && (r.gamma != null || r.gex != null || r.strike != null))
      .map((r) => omitNullFields(r));
    if (!out.gammaExposure.length) out.gammaExposure = null;
  }

  // ── Spread current: drop null keys inside current ───────────────────────
  if (out.spreadData?.current && typeof out.spreadData.current === 'object') {
    out.spreadData = {
      ...out.spreadData,
      current: omitNullFields(out.spreadData.current),
    };
    if (isHollowCurrent(out.spreadData.current) && !hasHistory(out.spreadData.history)) {
      out.spreadData = null;
    }
  }

  return out;
}

/**
 * Critical FRED series used across markets — for /api/health/series and CI.
 * lastKnownLive: series that must return a recent non-null observation.
 */
export const CRITICAL_FRED_SERIES = [
  { id: 'DFEDTARU', name: 'Fed funds target upper', maxAgeDays: 14, markets: ['calendar', 'bonds'] },
  { id: 'ECBDFR', name: 'ECB deposit facility', maxAgeDays: 14, markets: ['calendar', 'bonds'] },
  { id: 'IUDSOIA', name: 'SONIA', maxAgeDays: 14, markets: ['calendar', 'bonds'] },
  { id: 'IRSTCI01JPM156N', name: 'Japan immediate rates', maxAgeDays: 90, markets: ['calendar'] },
  { id: 'BAMLC0A0CM', name: 'IG OAS', maxAgeDays: 14, markets: ['credit', 'sentiment'] },
  { id: 'BAMLH0A0HYM2', name: 'HY OAS', maxAgeDays: 14, markets: ['credit', 'sentiment'] },
  { id: 'BAMLEMCBPIOAS', name: 'EM OAS', maxAgeDays: 14, markets: ['credit'] },
  { id: 'VIXCLS', name: 'VIX', maxAgeDays: 7, markets: ['sentiment', 'derivatives'] },
  { id: 'STLFSI4', name: 'St Louis FSI', maxAgeDays: 21, markets: ['sentiment'] },
  { id: 'DCPF3M', name: 'Financial CP 3M', maxAgeDays: 14, markets: ['credit'] },
  { id: 'DRALACBN', name: 'C&I charge-off', maxAgeDays: 200, markets: ['credit'] },
  { id: 'CPIAUCSL', name: 'CPI', maxAgeDays: 60, markets: ['calendar'] },
];
