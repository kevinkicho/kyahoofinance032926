/**
 * Quick local payload density + placeholder fill probe.
 * Usage: node scripts/probe-local-density.mjs [base]
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.argv[2] || process.env.API_BASE || 'http://127.0.0.1:3001';

// Dynamic import of ESM modules used by health
const { MARKET_PANELS } = await import(pathToFileURL(path.join(ROOT, 'src/data/marketPanels.js')).href);
const { getPanelPlaceholders, MIN_PLACEHOLDER_FILL_RATE } = await import(
  pathToFileURL(path.join(ROOT, 'src/data/panelPlaceholders.js')).href
);
const { resolvePath, placeholderValueOk } = await import(
  pathToFileURL(path.join(ROOT, 'src/hub/lib/panelHealthUtils.js')).href
);
const { MARKET_ENDPOINTS } = await import(
  pathToFileURL(path.join(ROOT, 'src/hub/lib/marketEndpoints.js')).href
);

const TAB_TO_ENDPOINT = {
  equities: '/api/equities',
  bonds: '/api/bonds',
  fx: '/api/fx',
  derivatives: '/api/derivatives',
  realEstate: '/api/realEstate',
  insurance: '/api/insurance',
  commodities: '/api/commodities/v2',
  globalMacro: '/api/globalMacro',
  equitiesDeepDive: '/api/equityDeepDive',
  crypto: '/api/crypto',
  credit: '/api/credit',
  sentiment: '/api/sentiment',
  calendar: '/api/calendar',
  bls: '/api/bls',
  eia: '/api/eia',
  watchlist: '/api/watchlist',
  analytics: null,
  alerts: null,
};

async function fetchJson(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
    const text = await res.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* */ }
    return { status: res.status, bytes: text.length, data, isHtml: /^\s*</.test(text) };
  } finally {
    clearTimeout(t);
  }
}

function scorePanel(marketId, panelId, markets) {
  const placeholders = getPanelPlaceholders(marketId, panelId) || [];
  const primary = markets[marketId] || null;
  const allDataMap = { ...markets };
  if (primary) allDataMap[marketId] = primary;
  if (!placeholders.length) {
    return { fetchOk: !!primary, fillRate: primary ? 1 : 0, empty: [], waiting: [] };
  }
  let req = 0, filled = 0;
  const empty = [];
  const waiting = [];
  for (const slot of placeholders) {
    const isReq = slot.required !== false;
    if (isReq) req++;
    let v = null;
    if (slot.crossMarket) {
      const dep = allDataMap[slot.crossMarket];
      if (!dep) {
        if (isReq) waiting.push(slot.crossMarket);
        if (isReq) empty.push(slot.id || slot.path);
        continue;
      }
      if (slot.path) v = resolvePath(dep, slot.path);
      else if (slot.anyOf) {
        for (const p of slot.anyOf) {
          const c = resolvePath(dep, p);
          if (placeholderValueOk(c, p)) { v = c; break; }
        }
      } else v = dep;
    } else if (slot.anyOf) {
      for (const p of slot.anyOf) {
        let c = resolvePath(primary, p);
        if (!placeholderValueOk(c, p) && p.includes('.')) {
          const parts = p.split('.');
          if (allDataMap[parts[0]]) c = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
        }
        if (placeholderValueOk(c, p)) { v = c; break; }
      }
    } else if (slot.path) {
      v = resolvePath(primary, slot.path);
      if (!placeholderValueOk(v, slot.path) && slot.path.includes('.')) {
        const parts = slot.path.split('.');
        if (allDataMap[parts[0]]) v = resolvePath(allDataMap[parts[0]], parts.slice(1).join('.'));
      }
    }
    if (Array.isArray(v) && v.length && v.every((x) => x == null)) v = null;
    if (placeholderValueOk(v, slot.path || slot.id)) {
      if (isReq) filled++;
    } else if (isReq) empty.push(slot.id || slot.path || '?');
  }
  const fillRate = req ? filled / req : 1;
  return {
    fetchOk: fillRate >= MIN_PLACEHOLDER_FILL_RATE,
    fillRate,
    empty: empty.slice(0, 8),
    waiting: [...new Set(waiting)].slice(0, 6),
  };
}

const markets = {};
const routeReport = [];

// Fetch all unique endpoints needed for tabs + common deps
const need = new Set(Object.values(TAB_TO_ENDPOINT).filter(Boolean));
for (const id of Object.keys(MARKET_ENDPOINTS || {})) {
  need.add(MARKET_ENDPOINTS[id]);
}

// Limit concurrent
const list = [...need];
console.log(`Probing ${list.length} routes at ${BASE}…`);
for (let i = 0; i < list.length; i += 6) {
  const batch = list.slice(i, i + 6);
  await Promise.all(batch.map(async (ep) => {
    const url = `${BASE}${ep}`;
    try {
      const r = await fetchJson(url);
      // map path back to market ids that use it
      for (const [mid, path] of Object.entries(MARKET_ENDPOINTS || {})) {
        if (path === ep) markets[mid] = r.data;
      }
      // tab aliases
      for (const [mid, path] of Object.entries(TAB_TO_ENDPOINT)) {
        if (path === ep) markets[mid] = r.data;
      }
      const keys = r.data && typeof r.data === 'object'
        ? Object.keys(r.data).filter((k) => !k.startsWith('_')).length
        : 0;
      routeReport.push({
        ep,
        status: r.status,
        bytes: r.bytes,
        keys,
        degraded: r.data?._degraded || null,
        cache: r.data?._cacheSource || null,
        isHtml: r.isHtml,
      });
    } catch (e) {
      routeReport.push({ ep, status: 0, error: e.message });
    }
  }));
}

// Score all panels (fetch gate only — matches incomplete without DOM)
const fail = [];
const ok = [];
for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
  for (const p of panels) {
    const sc = scorePanel(marketId, p.id, markets);
    const row = { marketId, panelId: p.id, ...sc };
    if (sc.fetchOk) ok.push(row);
    else fail.push(row);
  }
}

fail.sort((a, b) => a.fillRate - b.fillRate);

const byMarket = {};
for (const f of fail) {
  byMarket[f.marketId] = (byMarket[f.marketId] || 0) + 1;
}

console.log('\n=== Route density (sample) ===');
routeReport
  .sort((a, b) => (a.bytes || 0) - (b.bytes || 0))
  .slice(0, 25)
  .forEach((r) => console.log(JSON.stringify(r)));

console.log('\n=== Fetch-gate summary ===');
console.log(JSON.stringify({
  total: ok.length + fail.length,
  fetchOk: ok.length,
  fetchFail: fail.length,
  minFill: MIN_PLACEHOLDER_FILL_RATE,
  failByMarket: byMarket,
}, null, 2));

console.log('\n=== Worst 40 incomplete (fetch) ===');
fail.slice(0, 40).forEach((f) => {
  console.log(`${f.marketId}:${f.panelId} fill=${(f.fillRate * 100).toFixed(0)}% empty=[${(f.empty || []).join(',')}] wait=[${(f.waiting || []).join(',')}]`);
});

// Write full report
import { writeFileSync, mkdirSync } from 'node:fs';
mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
const out = path.join(ROOT, 'reports', 'local-fetch-fail.json');
writeFileSync(out, JSON.stringify({ routeReport, fail, okCount: ok.length, failCount: fail.length, byMarket }, null, 2));
console.log(`\nWrote ${out}`);
