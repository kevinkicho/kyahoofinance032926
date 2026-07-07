import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const CACHE_DIR = path.join(__dirname, '..', 'datacache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

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
  } catch { /* skip */ }
  return null;
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
  } catch { return null; }
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

