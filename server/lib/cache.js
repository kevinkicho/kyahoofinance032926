import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { AsyncLocalStorage } from 'async_hooks';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, '..', 'datacache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

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
      return data;
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
    const str = JSON.stringify(data);
    if (str.length < 200) {
      console.warn(`[datacache] skipping cache for ${market}: response too small (${str.length} bytes), likely empty`);
      return;
    }
    const { total, nonNull } = countNonNullValues(data);
    if (total > 5 && nonNull / total < 0.15) {
      console.warn(`[datacache] skipping cache for ${market}: too many null values (${nonNull}/${total}), likely failed fetch`);
      return;
    }
    fs.writeFileSync(path.join(CACHE_DIR, `${market}-${todayStr()}.json`), str, 'utf8');
  } catch (e) { console.warn(`[datacache] write failed for ${market}:`, e.message); }
}

export function readLatestCache(market) {
  try {
    const files = fs.readdirSync(CACHE_DIR)
      .filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort().reverse();
    if (!files.length) return null;
    const fetchedOn = files[0].slice(market.length + 1, -5);
    const data = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, files[0]), 'utf8'));
    const { total, nonNull } = countNonNullValues(data);
    if (total > 5 && nonNull / total < 0.15) {
      console.warn(`[datacache] skipping latest cache for ${market}: too many null values (${nonNull}/${total})`);
      return null;
    }
    return { data, fetchedOn };
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
  if (shouldSkipCache()) return null;
  try {
    const fp = path.join(CACHE_DIR, `${market}-${todayStr()}.json`);
    const content = await fs.promises.readFile(fp, 'utf8');
    const data = JSON.parse(content);
    const str = JSON.stringify(data);
    if (str.length < 200) {
      console.warn(`[datacache] skipping stale cache for ${market}: too small (${str.length} bytes)`);
      return null;
    }
    const { total, nonNull } = countNonNullValues(data);
    if (total > 5 && nonNull / total < 0.15) {
      console.warn(`[datacache] skipping stale cache for ${market}: too many null values (${nonNull}/${total})`);
      try { await fs.promises.unlink(fp); } catch {}
      return null;
    }
    return data;
  } catch (err) {
    /* skip if file doesn't exist or is invalid */
  }
  return null;
}

export async function writeDailyCacheAsync(market, data) {
  try {
    if (!data || typeof data !== 'object') return;
    const str = JSON.stringify(data);
    if (str.length < 200) {
      console.warn(`[datacache] skipping cache for ${market}: response too small (${str.length} bytes), likely empty`);
      return;
    }
    const { total, nonNull } = countNonNullValues(data);
    if (total > 5 && nonNull / total < 0.15) {
      console.warn(`[datacache] skipping cache for ${market}: too many null values (${nonNull}/${total}), likely failed fetch`);
      return;
    }
    const fp = path.join(CACHE_DIR, `${market}-${todayStr()}.json`);
    await fs.promises.writeFile(fp, str, 'utf8');
  } catch (e) {
    console.warn(`[datacache] write failed for ${market}:`, e.message);
  }
}

export async function readLatestCacheAsync(market) {
  try {
    const files = (await fs.promises.readdir(CACHE_DIR))
      .filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort().reverse();
    if (!files.length) return null;
    const fetchedOn = files[0].slice(market.length + 1, -5);
    const content = await fs.promises.readFile(path.join(CACHE_DIR, files[0]), 'utf8');
    const data = JSON.parse(content);
    const { total, nonNull } = countNonNullValues(data);
    if (total > 5 && nonNull / total < 0.15) {
      console.warn(`[datacache] skipping latest cache for ${market}: too many null values (${nonNull}/${total})`);
      return null;
    }
    return { data, fetchedOn };
  } catch (e) { console.warn(`[datacache] readLatestCacheAsync failed for ${market}:`, e?.message); return null; }
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

