/**
 * Extract a *small* digest from a full market payload for Firestore.
 *
 * Rules (wise use of data):
 * - Prefer latest scalars / short KPI maps over full history series
 * - Cap arrays (top N tickers / rows)
 * - Never embed multi-year FRED histories
 * - Keep total JSON under ~48 KiB so docs stay cheap and under 1 MiB easily
 * - Merge contract digestKeys when shared/contracts is available
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const MAX_DIGEST_BYTES = 48 * 1024;

function contractDigestFields(marketId, data) {
  try {
    const mod = require('../../shared/contracts/index.js');
    if (typeof mod.extractContractDigestFields === 'function') {
      return mod.extractContractDigestFields(marketId, data) || {};
    }
  } catch { /* contracts optional for unit isolation */ }
  return {};
}
const MAX_ARRAY = 12;
const MAX_MAP_KEYS = 24;

function isPlainObject(v) {
  return v != null && typeof v === 'object' && !Array.isArray(v);
}

function lastNumeric(series) {
  if (!series) return null;
  if (typeof series === 'number' && Number.isFinite(series)) return series;
  if (Array.isArray(series)) {
    for (let i = series.length - 1; i >= 0; i--) {
      const x = series[i];
      if (typeof x === 'number' && Number.isFinite(x)) return x;
      if (Array.isArray(x) && typeof x[x.length - 1] === 'number') return x[x.length - 1];
      if (isPlainObject(x) && typeof x.value === 'number') return x.value;
    }
    return null;
  }
  if (isPlainObject(series)) {
    if (typeof series.latest === 'number') return series.latest;
    if (typeof series.value === 'number') return series.value;
    if (Array.isArray(series.values)) return lastNumeric(series.values);
    if (Array.isArray(series.data)) return lastNumeric(series.data);
  }
  return null;
}

function trimArray(arr, n = MAX_ARRAY) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, n);
}

function trimMap(obj, n = MAX_MAP_KEYS) {
  if (!isPlainObject(obj)) return {};
  const out = {};
  let i = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    if (i++ >= n) break;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'string' && v.length < 80) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (isPlainObject(v)) {
      const inner = {};
      for (const [ik, iv] of Object.entries(v)) {
        if (typeof iv === 'number' && Number.isFinite(iv)) inner[ik] = iv;
        if (Object.keys(inner).length >= 8) break;
      }
      if (Object.keys(inner).length) out[k] = inner;
    }
  }
  return out;
}

function fieldPresence(data) {
  if (!isPlainObject(data)) return { total: 0, filled: 0, hollow: [] };
  let total = 0;
  let filled = 0;
  const hollow = [];
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('_') || k === 'lastUpdated' || k === 'fetchedOn' || k === 'isLive' || k === 'isCurrent') continue;
    total++;
    const empty =
      v == null
      || (Array.isArray(v) && v.length === 0)
      || (isPlainObject(v) && Object.keys(v).length === 0);
    if (empty) hollow.push(k);
    else filled++;
  }
  return { total, filled, hollow: hollow.slice(0, 20) };
}

/** Bonds: curve points + a few spreads, not full history. */
function digestBonds(data) {
  const yc = data.yieldCurveData?.US || data.yieldCurveData || {};
  const rates = trimMap(typeof yc === 'object' ? yc : {}, 12);
  return {
    kind: 'bonds',
    treasuryRates: trimMap(data.treasuryRates || {}, 12),
    usCurve: rates,
    tips10y: data.tipsYields?.['10y'] ?? data.tipsYields?.['10Y'] ?? null,
    hyOas: lastNumeric(data.hyOAS || data.spreadData?.HY || data.creditSpreads?.HY),
    igOas: lastNumeric(data.igOAS || data.spreadData?.IG),
  };
}

function digestEquities(data) {
  const quotes = data.quotes || {};
  const tickers = Object.keys(quotes);
  const sample = {};
  for (const t of tickers.slice(0, MAX_ARRAY)) {
    const q = quotes[t];
    if (!q || typeof q !== 'object') continue;
    sample[t] = {
      p: q.price ?? q.p ?? null,
      cp: q.changePct ?? q.cp ?? null,
      mc: q.marketCap ?? q.mc ?? null,
    };
  }
  return {
    kind: 'equities',
    quoteCount: tickers.length,
    indexCount: data.indices ? Object.keys(data.indices).length : 0,
    sampleQuotes: sample,
    coverage: data.coverage || null,
  };
}

function digestCrypto(data) {
  const coins = Array.isArray(data.coinMarketData)
    ? data.coinMarketData
    : Array.isArray(data.coins) ? data.coins : [];
  return {
    kind: 'crypto',
    coinCount: coins.length,
    top: trimArray(coins, 8).map((c) => ({
      id: c.id || c.symbol || c.name,
      price: c.current_price ?? c.price ?? null,
      ch24: c.price_change_percentage_24h ?? c.change24h ?? null,
      mcap: c.market_cap ?? c.mcap ?? null,
    })),
    btcDominance: data.btcDominance ?? data.btc_dominance ?? null,
    fearGreed: data.fearGreedData?.value ?? data.fearGreed ?? null,
  };
}

function digestFx(data) {
  return {
    kind: 'fx',
    rates: trimMap(data.rates || data.frankfurter || data.liveRates || {}, 16),
    dxy: lastNumeric(data.dxyHistory || data.dxy),
    reerSample: trimMap(data.reer || {}, 8),
  };
}

function digestCredit(data) {
  return {
    kind: 'credit',
    hyOas: lastNumeric(data.hyOAS || data.spreadData?.HY),
    igOas: lastNumeric(data.igOAS || data.spreadData?.IG),
    emOas: lastNumeric(data.emOAS || data.emBondData),
    delinquencies: lastNumeric(data.delinquencyRates),
  };
}

function digestSentiment(data) {
  return {
    kind: 'sentiment',
    fearGreed: data.fearGreedData?.value ?? data.fearGreedData?.score ?? null,
    fsi: lastNumeric(data.fsiHistory || data.financialStressIndex),
    vix: lastNumeric(data.vixData || data.riskData?.vix),
  };
}

function digestGeneric(marketId, data) {
  const presence = fieldPresence(data);
  const scalars = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (k.startsWith('_')) continue;
    if (typeof v === 'number' && Number.isFinite(v)) scalars[k] = v;
    else if (typeof v === 'string' && v.length < 40 && /date|asOf|status/i.test(k)) scalars[k] = v;
    if (Object.keys(scalars).length >= 16) break;
  }
  return {
    kind: 'generic',
    marketId,
    fieldsFilled: presence.filled,
    fieldsTotal: presence.total,
    hollowFields: presence.hollow,
    scalars,
  };
}

const SPECIAL = {
  bonds: digestBonds,
  equities: digestEquities,
  equityDeepDive: digestEquities,
  crypto: digestCrypto,
  fx: digestFx,
  credit: digestCredit,
  sentiment: digestSentiment,
};

/**
 * @returns {{ digest: object, bytes: number, truncated: boolean }}
 */
export function extractMarketDigest(marketId, data) {
  if (!data || typeof data !== 'object') {
    return { digest: { kind: 'empty', marketId }, bytes: 0, truncated: false };
  }
  const id = String(marketId || '');
  // Map cache key aliases
  const key =
    id === 'commodities_enhanced' ? 'commodities'
      : id === 'equityDeepDive' ? 'equityDeepDive'
        : id;

  let digest;
  try {
    const fn = SPECIAL[key] || SPECIAL[id];
    digest = fn ? fn(data) : digestGeneric(id, data);
  } catch {
    digest = digestGeneric(id, data);
  }

  // Layer contract digestKeys (shallow KPIs) without blowing size budget
  const fromContract = contractDigestFields(id, data);
  if (fromContract && Object.keys(fromContract).length) {
    digest.contract = fromContract;
  }

  const presence = fieldPresence(data);
  digest.meta = {
    marketId: id,
    fetchedOn: data.fetchedOn || data.fetchedAt || null,
    isLive: data.isLive === true,
    isCurrent: data.isCurrent === true,
    fieldsFilled: presence.filled,
    fieldsTotal: presence.total,
  };

  let json = JSON.stringify(digest);
  let truncated = false;
  if (json.length > MAX_DIGEST_BYTES) {
    truncated = true;
    // Drop heavy optional maps
    delete digest.sampleQuotes;
    delete digest.top;
    delete digest.rates;
    delete digest.usCurve;
    digest.note = 'truncated_for_size';
    json = JSON.stringify(digest);
  }
  if (json.length > MAX_DIGEST_BYTES) {
    digest = {
      kind: 'stub',
      marketId: id,
      fieldsFilled: presence.filled,
      fieldsTotal: presence.total,
      fetchedOn: data.fetchedOn || null,
      note: 'hard_cap',
    };
    json = JSON.stringify(digest);
  }

  return { digest, bytes: json.length, truncated };
}

export { MAX_DIGEST_BYTES, fieldPresence };
