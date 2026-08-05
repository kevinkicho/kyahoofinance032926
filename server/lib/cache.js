import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';
import {
  isGcsCacheEnabled,
  gcsReadJson,
  gcsWriteJson,
  gcsReadLatest,
} from './gcsCache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, '..', 'datacache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

/** Fire-and-forget GCS upload so route handlers stay fast. */
function scheduleGcsWrite(market, data) {
  if (!isGcsCacheEnabled() || !data) return;
  const day = todayStr();
  setImmediate(() => {
    gcsWriteJson(market, day, data).catch((e) => {
      console.warn(`[datacache] gcs write ${market}:`, e?.message || e);
    });
  });
}

/**
 * Seed local disk from GCS when local miss/hollow. Sync-looking API uses a
 * deasync-free approach: only async readers call this; sync readers still
 * work from local files (and async path is what routeFactory uses).
 */
async function hydrateFromGcs(market) {
  if (!isGcsCacheEnabled()) return null;
  try {
    const today = todayStr();
    let remote = await gcsReadJson(market, today);
    let fetchedOn = today;
    if (!remote) {
      const latest = await gcsReadLatest(market, 5);
      if (latest?.data) {
        remote = latest.data;
        fetchedOn = latest.fetchedOn;
      }
    }
    if (!remote || typeof remote !== 'object') return null;
    if (isStructurallyHollow(market, remote)) return null;
    // Seed local so subsequent sync reads are instant
    try {
      const fp = path.join(CACHE_DIR, `${market}-${today}.json`);
      if (!fs.existsSync(fp)) {
        const toSeed = { ...remote, _hydratedFromGcs: fetchedOn };
        fs.writeFileSync(fp, JSON.stringify(toSeed), 'utf8');
        console.warn(`[datacache] seeded local ${market} from GCS (${fetchedOn})`);
      }
    } catch { /* ignore disk */ }
    return remote;
  } catch (e) {
    console.warn(`[datacache] gcs hydrate ${market}:`, e?.message || e);
    return null;
  }
}

/**
 * Per-request context. When skipCache is true (client sent ?refresh=true),
 * all readDailyCache* helpers return null so handlers re-fetch upstream.
 */
export const requestContext = new AsyncLocalStorage();

export function shouldSkipCache() {
  return !!requestContext.getStore()?.skipCache;
}

export function todayStr() { return new Date().toISOString().split('T')[0]; }

function countNonNullValues(obj, depth = 0) {
  if (depth > 4) return { total: 0, nonNull: 0 };
  let total = 0;
  let nonNull = 0;
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const v of Object.values(obj)) {
      if (v && typeof v === 'object') {
        const sub = countNonNullValues(v, depth + 1);
        total += sub.total;
        nonNull += sub.nonNull;
      } else {
        total++;
        if (v != null && v !== false && v !== '') nonNull++;
      }
    }
  }
  return { total, nonNull };
}

/** Market-specific "looks full but useless" payloads that poison panels all day. */
export function isStructurallyHollow(market, data) {
  if (!data || typeof data !== 'object') return true;
  if (market === 'crypto') {
    const coins = data.coinMarketData?.coins;
    // Global stats alone is not enough — Top Cryptos panel needs coin rows.
    if (!Array.isArray(coins) || coins.length < 3) return true;
  }
  if (market === 'bonds') {
    // Tenors alone are not enough — spread/history panels go blank.
    const hasSpreads = !!(
      data.spreadIndicators?.t10y2y != null
      || data.spreadHistory?.dates?.length > 10
      || data.spreadData?.history?.dates?.length > 10
      || data.spreadData?.dates?.length > 10
    );
    const hasHist = !!(
      data.yieldHistory?.dates?.length > 10
      || data.fredYieldHistory?.dates?.length > 10
      || data.breakevensData?.history?.dates?.length > 5
      || data.cpiComponents?.dates?.length > 5
    );
    const us = data.yieldCurveData?.US;
    const hasCurve = us && Object.values(us).filter((v) => v != null).length >= 4;
    // Hollow if curve missing OR both spreads and histories missing
    if (!hasCurve) return true;
    if (!hasSpreads && !hasHist) return true;
  }
  if (market === 'insurance') {
    // Need at least one rich series beyond a single OAS number
    const hasRich = !!(
      (Array.isArray(data.catBondSpreads) && data.catBondSpreads.length >= 3)
      || (Array.isArray(data.sectorETF) && data.sectorETF.length >= 3)
      || data.combinedRatioData?.quarters?.length > 0
      || data.reserveAdequacyData?.lines?.length > 0
      || data.reinsurancePricing?.length > 0
    );
    if (!hasRich && data.hyOAS == null) return true;
  }
  if (market === 'cftcTFF') {
    const contracts = data.contracts || {};
    const withSeries = Object.values(contracts).filter((c) => Array.isArray(c?.series) && c.series.length > 0);
    if (withSeries.length < 1) return true;
  }
  if (market === 'bisOTC') {
    const cats = data.categories || {};
    const withSeries = Object.values(cats).filter((c) => Array.isArray(c?.series) && c.series.length > 0);
    if (withSeries.length < 1) return true;
  }
  if (market === 'usda' || market === 'fao') {
    if (data.commodities == null && data.foodPriceIndex == null && data.summary == null && !data.series?.length) return true;
  }
  if (market === 'realEstate') {
    // A shell with only metadata / null series must not poison GCS or disk.
    const hasPrices = !!(
      data.caseShillerData?.national?.values?.length > 3
      || data.caseShillerData?.values?.length > 3
      || data.medianHomePrice?.values?.length > 3
      || data.priceIndexData
    );
    const hasRates = data.mortgageRates?.rate30y != null || data.mortgageRates?.rate15y != null;
    const hasReits = Array.isArray(data.reitData) && data.reitData.length >= 2;
    const hasSupply = !!(
      data.housingStarts?.values?.length > 3
      || data.supplyData?.housingStarts?.values?.length > 3
    );
    if (!hasPrices && !hasRates && !hasReits && !hasSupply) return true;
  }
  if (market === 'eia') {
    // Empty-green shell (all null electricity/petroleum) must not count as success.
    const hasElec = !!(
      data.electricity?.residential?.latest?.price != null
      || data.electricity?.commercial?.latest?.price != null
      || data.electricity?.industrial?.latest?.price != null
    );
    const hasPetro = !!(
      (data.petroleum?.wti?.values?.length >= 2)
      || (data.petroleum?.brent?.values?.length >= 2)
      || (data.petroleum?.wti?.latest?.value != null)
    );
    const hasNg = !!(data.naturalGas?.henryHub?.values?.length >= 2
      || data.naturalGas?.henryHub?.latest?.value != null);
    const hasCo2 = !!(
      (Array.isArray(data.co2Emissions?.total) && data.co2Emissions.total.length > 0)
      || (Array.isArray(data.co2Emissions?.bySector) && data.co2Emissions.bySector.length > 0)
    );
    if (!hasElec && !hasPetro && !hasNg && !hasCo2) return true;
  }
  return false;
}

/**
 * When today's daily file is partial, fill null fields from older non-hollow
 * cache files so panels keep last-known series until a full live rebuild.
 */
export function hydratePartialDaily(market, daily) {
  if (!daily || typeof daily !== 'object') return daily;
  try {
    const today = todayStr();
    const files = fs.readdirSync(CACHE_DIR)
      .filter((f) => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 14);
    const out = { ...daily };
    let filled = 0;
    let fromDate = null;
    for (const file of files) {
      const fetchedOn = file.slice(market.length + 1, -5);
      if (fetchedOn === today) continue; // skip self
      let prior;
      try {
        prior = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
      } catch {
        continue;
      }
      if (!prior || typeof prior !== 'object') continue;
      if (isStructurallyHollow(market, prior)) continue;
      for (const [k, v] of Object.entries(prior)) {
        if (k.startsWith('_') || k === 'lastUpdated' || k === 'fetchedOn') continue;
        if (isEmptyField(out[k]) && !isEmptyField(v)) {
          out[k] = v;
          filled++;
          fromDate = fetchedOn;
        }
      }
      // One good prior day is usually enough
      if (filled > 0) break;
    }
    if (filled) {
      out._hydratedFrom = fromDate;
      out._hydratedFields = filled;
    }
    return out;
  } catch {
    return daily;
  }
}

export function readDailyCache(market) {
  if (shouldSkipCache()) return null;
  try {
    const fp = path.join(CACHE_DIR, `${market}-${todayStr()}.json`);
    if (fs.existsSync(fp)) {
      const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const str = JSON.stringify(data);
      if (str.length < 200) {
        console.warn(`[datacache] skipping stale cache for ${market}: too small (${str.length} bytes)`);
        return null;
      }
      const { total, nonNull } = countNonNullValues(data);
      if (total > 5 && nonNull / total < 0.15) {
        console.warn(`[datacache] skipping stale cache for ${market}: too many null values (${nonNull}/${total})`);
        fs.unlinkSync(fp);
        return null;
      }
      if (isStructurallyHollow(market, data)) {
        // Prefer hydrating from an older good cache over returning null
        // (null forces a full live stampede that often times out on Cloud Run).
        const hydrated = hydratePartialDaily(market, data);
        if (!isStructurallyHollow(market, hydrated)) {
          console.warn(`[datacache] hydrated partial ${market} from prior day`);
          return hydrated;
        }
        console.warn(`[datacache] skipping hollow cache for ${market}: critical fields empty`);
        try { fs.unlinkSync(fp); } catch { /* ignore */ }
        return null;
      }
      // Even non-hollow payloads may miss a few series — backfill nulls quietly.
      return hydratePartialDaily(market, data);
    }
  } catch (e) { console.warn(`[datacache] readDailyCache failed for ${market}:`, e?.message); }
  return null;
}

/** Last YYYY-MM-DD on a history-shaped field ({ dates: [...] } or top-level dates). */
function seriesEndDate(val) {
  if (!val || typeof val !== 'object') return null;
  if (Array.isArray(val.dates) && val.dates.length) {
    return String(val.dates[val.dates.length - 1]).slice(0, 10);
  }
  if (Array.isArray(val) && val.length && val[0]?.date) {
    return String(val[val.length - 1].date).slice(0, 10);
  }
  return null;
}

function isEmptyField(v) {
  if (v == null) return true;
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    // Hollow metric rows: every item lacks any non-null primitive value
    const valueKeys = ['value', 'rate', 'price', 'spread', 'lastPrint', 'previous', 'cpi', 'score', 'marketCapB'];
    const anyLive = v.some((row) => {
      if (row == null) return false;
      if (typeof row !== 'object') return true;
      if (valueKeys.some((k) => row[k] != null && row[k] !== '')) return true;
      return Object.values(row).some((x) => x != null && x !== '' && typeof x !== 'object');
    });
    return !anyLive;
  }
  if (typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) return true;
    // { current: { igSpread: null, ... }, history: { dates: [] } }
    if (v.current && typeof v.current === 'object') {
      const curVals = Object.values(v.current);
      const allNull = curVals.length > 0 && curVals.every((x) => x == null || x === '');
      const noHistory = !v.history?.dates?.length;
      if (allNull && noHistory) return true;
      // Partial current all-null even with empty series arrays
      if (allNull && Array.isArray(v.history?.dates) && v.history.dates.length === 0) return true;
    }
    // defaultData: { rates: [all null values], chargeoffs: null }
    if (Array.isArray(v.rates)) {
      const ratesHollow = isEmptyField(v.rates);
      const noCo = !v.chargeoffs?.dates?.length;
      const noHist = !v.defaultHistory?.dates?.length;
      if (ratesHollow && noCo && noHist) return true;
    }
    // riskData with empty signals and no flat metrics
    if (Array.isArray(v.signals) && v.signals.length === 0) {
      const flat = ['vix', 'hyOas', 'igOas', 'fsi', 'vvix', 'move'];
      if (flat.every((k) => v[k] == null)) return true;
    }
  }
  return false;
}

/**
 * Merge a fresh payload with the previous daily/latest cache so a transient
 * upstream outage (FRED 403, Yahoo timeout) does not wipe fields that were
 * previously populated. Fills empty keys and prefers the longer/newer history
 * series when a rate-limited refresh returns a truncated time series.
 */
export function mergeWithPreviousCache(market, incoming) {
  if (!incoming || typeof incoming !== 'object') return incoming;
  const prev = readLatestCache(market);
  if (!prev?.data || typeof prev.data !== 'object') return incoming;
  const out = { ...incoming };
  let usedPrev = false;
  for (const [k, v] of Object.entries(prev.data)) {
    if (k.startsWith('_') || k === 'lastUpdated' || k === 'fetchedOn') continue;
    const cur = out[k];
    if (isEmptyField(cur) && !isEmptyField(v)) {
      out[k] = v;
      usedPrev = true;
      continue;
    }
    // Prefer previous history when it ends on a later observation date
    // (common when refresh hits rate limits mid-batch and only partial history returns).
    const curEnd = seriesEndDate(cur);
    const prevEnd = seriesEndDate(v);
    if (curEnd && prevEnd && prevEnd > curEnd) {
      out[k] = v;
      usedPrev = true;
    }
  }
  if (usedPrev && prev.fetchedOn) out._mergedFromCacheDate = prev.fetchedOn;
  return out;
}

export function writeDailyCache(market, data) {
  try {
    if (!data || typeof data !== 'object') return;
    const fp = path.join(CACHE_DIR, `${market}-${todayStr()}.json`);
    // Never let null/empty fields from a partial concurrent fetch clobber a
    // richer payload already on disk (Cloud Run often has overlapping rebuilds).
    const existing = (() => {
      try {
        if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
      } catch { /* ignore */ }
      return null;
    })();

    // Start from incoming, then fill empties from today's file (not the reverse:
    // `{...existing, ...data}` would let nulls wipe good series).
    let toWrite = { ...data };
    if (existing && typeof existing === 'object') {
      for (const [k, v] of Object.entries(existing)) {
        if (k.startsWith('_') || k === 'lastUpdated' || k === 'fetchedOn') continue;
        if (isEmptyField(toWrite[k]) && !isEmptyField(v)) {
          toWrite[k] = v;
        } else {
          // Prefer longer history series when both present
          const curEnd = seriesEndDate(toWrite[k]);
          const prevEnd = seriesEndDate(v);
          if (curEnd && prevEnd && prevEnd > curEnd) toWrite[k] = v;
          if (
            Array.isArray(toWrite[k]?.dates) && Array.isArray(v?.dates)
            && v.dates.length > (toWrite[k].dates?.length || 0)
            && !curEnd
          ) {
            toWrite[k] = v;
          }
        }
      }
    }
    // Then fill any remaining empties from prior non-hollow days
    toWrite = mergeWithPreviousCache(market, toWrite);

    if (isStructurallyHollow(market, toWrite)) {
      console.warn(`[datacache] refusing to write hollow ${market} cache`);
      return;
    }
    // If we already have a non-hollow today file and the merge did not grow it,
    // still write (may refresh lastUpdated) — but never shrink below existing.
    if (existing && !isStructurallyHollow(market, existing)) {
      const exLen = JSON.stringify(existing).length;
      const newLen = JSON.stringify(toWrite).length;
      // Allow small churn; block catastrophic shrink from a partial rebuild
      if (newLen < exLen * 0.5 && exLen > 5000) {
        console.warn(
          `[datacache] refusing to shrink ${market} cache ${exLen}→${newLen} bytes (partial overwrite guard)`
        );
        return;
      }
    }
    const str = JSON.stringify(toWrite);
    if (str.length < 200) {
      console.warn(`[datacache] skipping cache for ${market}: response too small (${str.length} bytes), likely empty`);
      return;
    }
    const { total, nonNull } = countNonNullValues(toWrite);
    if (total > 5 && nonNull / total < 0.15) {
      console.warn(`[datacache] skipping cache for ${market}: too many null values (${nonNull}/${total}), likely failed fetch`);
      return;
    }
    fs.writeFileSync(fp, str, 'utf8');
    scheduleGcsWrite(market, toWrite);
    // Tiny Firestore freshness index (not bulk JSON) — see server/lib/firestoreMeta.js
    try {
      // Dynamic import keeps local disk path working if module fails to load.
      import('./firestoreMeta.js').then((m) => {
        m.scheduleMarketMetaWrite?.(market, toWrite, { bytes: str.length });
      }).catch(() => {});
    } catch { /* ignore */ }
  } catch (e) { console.warn(`[datacache] write failed for ${market}:`, e.message); }
}

export function readLatestCache(market) {
  try {
    const files = fs.readdirSync(CACHE_DIR)
      .filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort().reverse();
    // Walk newest → older so a hollow "today" file does not hide a good prior day.
    for (const file of files) {
      try {
        const fetchedOn = file.slice(market.length + 1, -5);
        const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
        const { total, nonNull } = countNonNullValues(data);
        if (total > 5 && nonNull / total < 0.15) continue;
        if (isStructurallyHollow(market, data)) continue;
        return { data, fetchedOn };
      } catch { /* try older */ }
    }
    return null;
  } catch { return null; }
}

// Walk historical cache files (newest first) and return the first one
// where `fieldPath` resolves to a present, non-empty value. `fieldPath` is
// dot-separated, e.g. "fedBalanceSheetHistory.dates". Used by routes that
// want a per-field fallback when today's fetch failed for a specific
// series but yesterday's cache had it. `lookbackDays` caps how far we
// look back (default 14).
export function readLatestCacheWithField(market, fieldPath, lookbackDays = 14) {
  try {
    const parts = String(fieldPath).split('.');
    const files = fs.readdirSync(CACHE_DIR)
      .filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort().reverse()
      .slice(0, lookbackDays);
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, file), 'utf8'));
        let cur = data;
        for (const p of parts) cur = cur?.[p];
        // Treat empty arrays / empty objects as missing.
        if (cur == null) continue;
        if (Array.isArray(cur) && cur.length === 0) continue;
        if (typeof cur === 'object' && Object.keys(cur).length === 0) continue;
        const fetchedOn = file.slice(market.length + 1, -5);
        return { data, fetchedOn };
      } catch { /* skip unreadable file */ }
    }
  } catch { /* swallow */ }
  return null;
}

export function __prefetchMarket(market) {
  if (process.env.LOG_VERBOSE) console.log(`[cache] Smart Prefetching market: ${market}`);
  // Trigger for background data pipeline to refresh this specific market
}

export function cleanOldCaches() {
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    fs.readdirSync(CACHE_DIR).forEach(f => {
      const m = f.match(/-(\d{4}-\d{2}-\d{2})\.json$/);
      if (m && m[1] < cutoffStr) fs.unlinkSync(path.join(CACHE_DIR, f));
    });
  } catch { /* best-effort */ }
}

export async function readDailyCacheAsync(market) {
  // Local first (hollow reject + prior-day hydrate), then shared GCS.
  const local = readDailyCache(market);
  if (local) return local;
  if (shouldSkipCache()) return null;
  return hydrateFromGcs(market);
}

/**
 * Best available non-hollow cache for a market (cache-first / last-good).
 * Prefer today's disk → prior local day → GCS today → GCS prior.
 * Never invents payload fields — only real written bags.
 *
 * @returns {Promise<{
 *   data: object,
 *   fetchedOn: string,
 *   isCurrent: boolean,
 *   isStale: boolean,
 *   source: 'daily_file'|'prior_day'|'gcs_today'|'gcs_prior'|'memory_shape',
 * }|null>}
 */
export async function readBestAvailableCache(market) {
  if (shouldSkipCache()) return null;
  const today = todayStr();

  // 1. Today's local (may be partially hydrated from older days)
  try {
    const daily = readDailyCache(market);
    if (daily && typeof daily === 'object' && !isStructurallyHollow(market, daily)) {
      const priorHint = daily._hydratedFromGcs || daily._hydratedFrom || daily._mergedFromCacheDate || null;
      // Pure prior-day seed written under today's filename still not "current"
      const onlyPriorSeed = !!(daily._hydratedFromGcs && daily._hydratedFromGcs !== today
        && !daily.lastUpdated?.toString?.().startsWith?.(today));
      // If bag is only a GCS seed of an older day, mark stale
      const fo = onlyPriorSeed
        ? String(daily._hydratedFromGcs).slice(0, 10)
        : today;
      const isCurrent = fo === today && !onlyPriorSeed;
      return {
        data: daily,
        fetchedOn: fo,
        isCurrent,
        isStale: !isCurrent,
        source: onlyPriorSeed ? 'gcs_prior' : (priorHint && priorHint !== today ? 'daily_file' : 'daily_file'),
        hydratedFrom: priorHint && String(priorHint).slice(0, 10) !== today
          ? String(priorHint).slice(0, 10)
          : null,
      };
    }
  } catch { /* fall through */ }

  // 2. Latest non-hollow local day (or GCS via async helper)
  try {
    const latest = await readLatestCacheAsync(market);
    if (latest?.data && !isStructurallyHollow(market, latest.data)) {
      const fo = String(latest.fetchedOn || '').slice(0, 10) || today;
      const isCurrent = fo === today;
      return {
        data: latest.data,
        fetchedOn: fo,
        isCurrent,
        isStale: !isCurrent,
        source: isCurrent ? 'daily_file' : 'prior_day',
        hydratedFrom: null,
      };
    }
  } catch { /* fall through */ }

  return null;
}

/**
 * Attach standard cache provenance flags for API responses (no mock fields).
 */
export function withCacheProvenance(data, meta = {}) {
  const today = todayStr();
  const fetchedOn = String(meta.fetchedOn || data?.fetchedOn || today).slice(0, 10);
  const isCurrent = meta.isCurrent != null ? !!meta.isCurrent : fetchedOn === today;
  const isStale = meta.isStale != null ? !!meta.isStale : !isCurrent;
  return {
    ...data,
    fetchedOn,
    isCurrent,
    isStale,
    isLive: meta.isLive === true,
    _cacheSource: meta.source || data?._cacheSource || 'cache',
    ...(meta.hydratedFrom ? { _hydratedFrom: meta.hydratedFrom } : {}),
  };
}

export async function writeDailyCacheAsync(market, data) {
  // Delegate to sync writer so hollow refusal + mergeWithPrevious apply once.
  // Writer also schedules GCS upload when MARKET_CACHE_BUCKET is set.
  writeDailyCache(market, data);
}

export async function readLatestCacheAsync(market) {
  const local = readLatestCache(market);
  if (local) return local;
  if (!isGcsCacheEnabled()) return null;
  try {
    const remote = await gcsReadLatest(market, 7);
    if (!remote?.data || isStructurallyHollow(market, remote.data)) return null;
    return remote;
  } catch {
    return null;
  }
}

export async function readLatestCacheWithFieldAsync(market, fieldPath, lookbackDays = 14) {
  try {
    const parts = String(fieldPath).split('.');
    const files = (await fs.promises.readdir(CACHE_DIR))
      .filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort().reverse()
      .slice(0, lookbackDays);
    for (const file of files) {
      try {
        const content = await fs.promises.readFile(path.join(CACHE_DIR, file), 'utf8');
        const data = JSON.parse(content);
        let cur = data;
        for (const p of parts) cur = cur?.[p];
        if (cur == null) continue;
        if (Array.isArray(cur) && cur.length === 0) continue;
        if (typeof cur === 'object' && Object.keys(cur).length === 0) continue;
        const fetchedOn = file.slice(market.length + 1, -5);
        return { data, fetchedOn };
      } catch { /* skip unreadable file */ }
    }
  } catch { /* swallow */ }
  return null;
}

export async function cleanOldCachesAsync() {
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const files = await fs.promises.readdir(CACHE_DIR);
    for (const f of files) {
      const m = f.match(/-(\d{4}-\d{2}-\d{2})\.json$/);
      if (m && m[1] < cutoffStr) {
        try { await fs.promises.unlink(path.join(CACHE_DIR, f)); } catch {}
      }
    }
  } catch { /* best-effort */ }
}

