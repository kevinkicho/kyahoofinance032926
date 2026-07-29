/**
 * Strict full-surface API health check (CLI).
 *
 * Discovers GET endpoints from:
 *   - server/index.js inline routes + app.use mounts
 *   - server/routes/*.js router.get paths
 *   - sample expansions for :param routes
 *   - known aliases (treasury/*, commodities/v2, …)
 *
 * SUCCESS requires ALL of:
 *   - HTTP 2xx
 *   - Parseable JSON
 *   - Not degraded / hollow / error payload
 *   - Real non-null data (empty-but-green FAILS)
 *
 * Auth-gated routes (admin, mutating POST/DELETE) are classified separately
 * unless API_HEALTH_INCLUDE_AUTH=1.
 *
 * Usage:
 *   npm run api:health
 *   SHOT_BASE_URL=http://localhost:3001 npm run api:health
 *   API_HEALTH_OUT=test-results/api-health.json npm run api:health
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStructurallyHollow } from '../server/lib/cache.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SERVER = join(ROOT, 'server');
const ROUTES_DIR = join(SERVER, 'routes');

const BASE = (process.env.SHOT_BASE_URL || process.env.API_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.API_HEALTH_TIMEOUT_MS || 180_000);
const CONCURRENCY = Math.max(1, Number(process.env.API_HEALTH_CONCURRENCY || 4));
const MIN_BYTES = Number(process.env.API_HEALTH_MIN_BYTES || 40);
const MIN_NONNULL = Number(process.env.API_HEALTH_MIN_NONNULL || 3);
const MIN_DENSITY = Number(process.env.API_HEALTH_MIN_DENSITY || 0.10);
const INCLUDE_AUTH = process.env.API_HEALTH_INCLUDE_AUTH === '1';
const INCLUDE_POST = process.env.API_HEALTH_INCLUDE_POST === '1';

const HOLLOW_MARKETS = new Set([
  'crypto', 'bonds', 'insurance', 'cftcTFF', 'bisOTC', 'usda', 'fao', 'realEstate', 'eia',
]);

// ── Discovery ────────────────────────────────────────────────────────────────

function parseMounts(indexSrc) {
  const mounts = [];
  const re = /app\.use\(\s*['"](\/api[^'"]*)['"]\s*,\s*(\w+)/g;
  let m;
  while ((m = re.exec(indexSrc))) {
    mounts.push({ base: m[1].replace(/\/$/, ''), routerVar: m[2] });
  }
  return mounts;
}

function parseInlineGets(indexSrc) {
  const paths = [];
  const re = /app\.get\(\s*['"](\/api[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(indexSrc))) paths.push(m[1]);
  return paths;
}

function parseRouterGets(fileSrc) {
  const paths = [];
  const re = /router\.get\(\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(fileSrc))) paths.push(m[1]);
  return paths;
}

/** Map router import var → routes filename from index.js */
function parseRouterFiles(indexSrc) {
  const map = {};
  const re = /import\s+(\w+)\s+from\s+['"]\.\/routes\/([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(indexSrc))) {
    map[m[1]] = m[2].replace(/\.js$/, '') + '.js';
  }
  return map;
}

/** Expand path params / query samples into concrete probe URLs */
function expandPath(fullPath) {
  // Use real registry keys (commoditySources) and cacheable market ids (analytics).
  const samples = {
    ':ticker': ['AAPL', 'MSFT', 'SPY'],
    ':market': ['bonds', 'crypto', 'credit', 'realEstate', 'insurance', 'sentiment', 'calendar', 'bls', 'eia'],
    ':path': ['api%2Fbonds'], // tracker keys are full paths; Express :path is one segment so we also try bare
    ':key': ['GOLD', 'WTI_CRUDE', 'COPPER', 'SILVER', 'NATGAS_HENRYHUB'],
  };

  // No params
  if (!fullPath.includes(':')) {
    if (fullPath === '/api/fred/batch') {
      return [
        { path: '/api/fred/batch?group=US_YIELDS', kind: 'get' },
        { path: '/api/fred/batch?group=MACRO', kind: 'get' },
      ];
    }
    if (fullPath === '/api/fred/observations') {
      return [
        { path: '/api/fred/observations?series_id=DGS10&limit=5', kind: 'get' },
        { path: '/api/fred/observations?series_id=UNRATE&limit=5', kind: 'get' },
      ];
    }
    if (fullPath === '/api/snapshot') {
      // requires date=YYYY-MM-DD
      const d = new Date().toISOString().slice(0, 10);
      return [{ path: `/api/snapshot?date=${d}`, kind: 'get' }];
    }
    return [{ path: fullPath, kind: 'get' }];
  }

  const out = [];
  // analytics endpoint history: try both encoded full path and short id
  if (fullPath.includes('/endpoint/:path')) {
    for (const p of ['bonds', 'fx', 'crypto', 'api%2Fbonds']) {
      out.push({ path: fullPath.replace(':path', p), kind: 'get' });
    }
    return out;
  }

  for (const [token, vals] of Object.entries(samples)) {
    if (!fullPath.includes(token)) continue;
    for (const v of vals) {
      out.push({ path: fullPath.split(token).join(v), kind: 'get' });
    }
  }
  return out;
}

/**
 * Build full inventory of probe targets.
 * Returns { path, method, group, skipReason? }
 */
function discoverEndpoints() {
  const indexSrc = readFileSync(join(SERVER, 'index.js'), 'utf8');
  const routerFiles = parseRouterFiles(indexSrc);
  const mounts = parseMounts(indexSrc);
  const targets = new Map(); // path -> meta

  function add(path, meta = {}) {
    if (!path.startsWith('/api')) return;
    // Skip wild SPA etc.
    if (path.includes('*')) return;
    const key = path;
    if (!targets.has(key)) targets.set(key, { path, method: 'GET', ...meta });
  }

  for (const p of parseInlineGets(indexSrc)) add(p, { group: 'inline' });

  // Always-known ops
  for (const p of [
    '/api/health',
    '/api/health/series',
    '/api/cache/status',
    '/api/rate-limits',
  ]) add(p, { group: 'ops' });

  for (const mount of mounts) {
    // ticker router is mounted at /api
    const file = routerFiles[mount.routerVar];
    if (!file) {
      // mount without matching import (e.g. only default) — still try base
      if (mount.base !== '/api') add(mount.base, { group: 'mount-only' });
      continue;
    }
    const srcPath = join(ROUTES_DIR, file);
    let src;
    try {
      src = readFileSync(srcPath, 'utf8');
    } catch {
      continue;
    }
    const group = file.replace(/\.js$/, '');
    if (group === 'admin' && !INCLUDE_AUTH) {
      // record as skipped inventory
      add(`${mount.base}/config`, { group: 'admin', skip: 'auth' });
      continue;
    }
    const gets = parseRouterGets(src);
    for (const rel of gets) {
      const full = rel === '/'
        ? mount.base
        : `${mount.base}${rel.startsWith('/') ? rel : `/${rel}`}`;
      // normalize double slashes
      const norm = full.replace(/\/{2,}/g, '/');
      for (const exp of expandPath(norm)) {
        add(exp.path, { group });
      }
    }
  }

  // Extra alias paths + more concrete probes toward full surface coverage
  const extras = [
    '/api/commodities/v2',
    '/api/commodities/v2/coverage',
    '/api/commoditiesEnhanced/coverage',
    '/api/commoditiesEnhanced/commodity/GOLD',
    '/api/commoditiesEnhanced/commodity/WTI_CRUDE',
    '/api/commoditiesEnhanced/commodity/COPPER',
    '/api/commodities/v2/commodity/GOLD',
    '/api/commodities/v2/commodity/WTI_CRUDE',
    '/api/treasury/tic',
    '/api/treasury/auctions',
    '/api/treasury/dts',
    '/api/census-trade',
    '/api/eia-petroleum',
    '/api/panel-routing/health?deep=1',
    '/api/admin/config', // public config (no secrets)
  ];
  for (const a of extras) add(a, { group: 'extra' });

  // POSTs that return market data (enabled by default; disable with API_HEALTH_INCLUDE_POST=0)
  const wantPost = process.env.API_HEALTH_INCLUDE_POST !== '0';
  if (wantPost || INCLUDE_POST) {
    targets.set('POST /api/stocks', {
      path: '/api/stocks',
      method: 'POST',
      group: 'stocks',
      body: { tickers: ['AAPL', 'MSFT', 'SPY'] },
    });
    targets.set('POST /api/watchlist', {
      path: '/api/watchlist',
      method: 'POST',
      group: 'watchlist',
      body: { tickers: ['AAPL', 'MSFT'] },
    });
  }

  // Expand still-parameterized leftovers that slipped through
  const final = [];
  for (const t of targets.values()) {
    if (t.skip) {
      final.push(t);
      continue;
    }
    if (t.path.includes(':')) {
      for (const exp of expandPath(t.path)) {
        final.push({ ...t, path: exp.path });
      }
    } else {
      final.push(t);
    }
  }

  // de-dupe by method+path
  const seen = new Set();
  const out = [];
  for (const t of final) {
    const k = `${t.method || 'GET'} ${t.path}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  out.sort((a, b) => a.path.localeCompare(b.path));
  return out;
}

// ── Assessment ───────────────────────────────────────────────────────────────

function pathToMarket(path) {
  const clean = path.split('?')[0].replace(/^\/api\//, '').replace(/\/$/, '');
  const map = {
    commoditiesEnhanced: 'commodities',
    'commodities/v2': 'commodities',
    equityDeepDive: 'equityDeepDive',
    'edgar/insurer-ratios': 'edgarInsurerRatios',
    'edgar/filing-activity': 'edgarFilingActivity',
    'fed/sep': 'fedSEP',
    'fed/gdpnow': 'fedGDPNow',
    'fed/inflation-nowcast': 'fedInflationNowcast',
    'fed/news-sentiment': 'fedNewsSentiment',
    'treasury/tic': 'treasuryTIC',
    'treasury/auctions': 'treasuryAuctions',
    'treasury/dts': 'treasuryDTS',
    'health/series': 'healthSeries',
  };
  if (map[clean]) return map[clean];
  return clean.split('/')[0];
}

function countLeaves(obj, depth = 0, acc = { total: 0, nonNull: 0, arrays: 0, arrayItems: 0 }) {
  if (depth > 6) return acc;
  if (obj == null) {
    acc.total++;
    return acc;
  }
  if (Array.isArray(obj)) {
    acc.arrays++;
    acc.arrayItems += obj.length;
    if (obj.length === 0) {
      acc.total++;
      return acc;
    }
    for (const item of obj.slice(0, 50)) countLeaves(item, depth + 1, acc);
    return acc;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('_')) continue;
      if (['lastUpdated', 'fetchedOn', 'isLive', 'isCurrent', 'timestamp', 'generatedAt', 'date', 'today'].includes(k)) {
        acc.total++;
        if (v != null && v !== '') acc.nonNull++;
        continue;
      }
      countLeaves(v, depth + 1, acc);
    }
    return acc;
  }
  acc.total++;
  if (obj !== '' && obj !== false) acc.nonNull++;
  return acc;
}

/** True if payload is an empty shell dressed as success */
function isEmptyGreen(data, path) {
  if (!data || typeof data !== 'object') return true;

  if (data._degraded === true) return true;
  if (String(data._cacheSource || '').includes('degraded')) return true;
  if (data.error != null && data.error !== false) return true;
  if (data.status === 'error') return true;
  if (data.ok === false && data.error) return true;

  // Explicit empty data arrays / null primary fields with _sources all false
  const sources = data._sources;
  if (sources && typeof sources === 'object') {
    const vals = Object.values(sources);
    if (vals.length && vals.every((v) => v === false || v == null)) {
      // all sources failed — empty green if no real series either
      const dens = countLeaves(data);
      if (dens.nonNull < 5) return true;
    }
  }

  // health series: require at least one series ok if status not skip
  if (path.startsWith('/api/health/series')) {
    if (data.status === 'skip') return false; // key missing is environment, still "honest"
    if (data.status === 'degraded') return true; // treat degraded FRED as fail for strict
    if (!Array.isArray(data.series) || data.series.length === 0) return true;
    if (data.failed > 0) return true;
    return false;
  }

  return false;
}

function assess(target, status, bodyText, ms) {
  const path = target.path;
  const market = pathToMarket(path);
  const bytes = bodyText?.length ?? 0;
  const base = {
    path,
    method: target.method || 'GET',
    group: target.group,
    market,
    status,
    bytes,
    ms,
  };

  if (target.skip) {
    return { ...base, ok: true, skipped: true, reason: `skip_${target.skip}` };
  }

  if (status === 401 || status === 403) {
    return { ...base, ok: false, reason: `auth_${status}` };
  }
  if (status === 404) {
    return { ...base, ok: false, reason: 'http_404' };
  }
  if (status === 400) {
    return { ...base, ok: false, reason: 'http_400_bad_request' };
  }
  if (status < 200 || status >= 300) {
    return { ...base, ok: false, reason: `http_${status}` };
  }
  if (bytes < MIN_BYTES) {
    return { ...base, ok: false, reason: `too_small_${bytes}b` };
  }

  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    return { ...base, ok: false, reason: 'invalid_json' };
  }
  if (data == null || typeof data !== 'object') {
    return { ...base, ok: false, reason: 'not_object' };
  }

  if (isEmptyGreen(data, path)) {
    const reason = data.error
      ? `payload_error:${String(data.error).slice(0, 60)}`
      : data._degraded
        ? 'degraded_shell'
        : data.status === 'degraded'
          ? 'status_degraded'
          : 'empty_green';
    return { ...base, ok: false, reason };
  }

  // Tiny intentional ops endpoints
  if (path === '/api/health') {
    const ok = data.status === 'ok' || data.ok === true || !!data.timestamp;
    return { ...base, ok, reason: ok ? 'health_ok' : 'health_bad' };
  }
  if (path === '/api/cache/status' || path === '/api/rate-limits') {
    const keys = Object.keys(data).filter((k) => !k.startsWith('_'));
    return { ...base, ok: keys.length >= 1, reason: keys.length ? 'diag_ok' : 'diag_empty' };
  }
  if (path === '/api/panel-routing' || path.startsWith('/api/panel-routing?')) {
    const ok = data.ok === true && (data.markets || data.tabMarkets);
    return { ...base, ok, reason: ok ? 'registry_ok' : 'registry_bad' };
  }
  if (path.includes('/coverage')) {
    const n = data.summary?.totalCommodities ?? data.totalCommodities ?? 0;
    return { ...base, ok: n > 0, reason: n > 0 ? 'coverage_ok' : 'coverage_empty' };
  }
  if (path.includes('/commodity/')) {
    const ok = !!(data.key || data.name || data.sources);
    return { ...base, ok, reason: ok ? 'commodity_meta_ok' : 'commodity_meta_empty' };
  }

  if (HOLLOW_MARKETS.has(market)) {
    try {
      if (isStructurallyHollow(market, data)) {
        return { ...base, ok: false, reason: 'structurally_hollow' };
      }
    } catch { /* ignore */ }
  }

  const dens = countLeaves(data);
  const density = dens.total > 0 ? dens.nonNull / dens.total : 0;

  if (dens.nonNull < MIN_NONNULL) {
    return {
      ...base,
      ok: false,
      reason: `sparse_nonnull_${dens.nonNull}`,
      density: Number(density.toFixed(3)),
      leaves: dens,
    };
  }
  if (dens.total >= 8 && density < MIN_DENSITY) {
    return {
      ...base,
      ok: false,
      reason: `low_density_${density.toFixed(2)}`,
      density: Number(density.toFixed(3)),
      leaves: dens,
    };
  }

  // meta-only objects (only timestamps / flags)
  const dataKeys = Object.keys(data).filter(
    (k) => !k.startsWith('_')
      && !['lastUpdated', 'fetchedOn', 'isLive', 'isCurrent', 'timestamp', 'generatedAt', 'status', 'date', 'today'].includes(k),
  );
  if (dataKeys.length === 0 && dens.arrayItems === 0) {
    return { ...base, ok: false, reason: 'meta_only', density: Number(density.toFixed(3)) };
  }

  // stocks/stats with all zeros and no underlying cache is empty-green
  if (path === '/api/stocks/stats') {
    const sum = (data.advancers || 0) + (data.decliners || 0) + (data.unchanged || 0);
    if (sum === 0) {
      return { ...base, ok: false, reason: 'empty_stats_zeros' };
    }
  }

  return {
    ...base,
    ok: true,
    reason: 'data_ok',
    density: Number(density.toFixed(3)),
    leaves: dens,
    topKeys: dataKeys.slice(0, 8),
  };
}

async function fetchOne(target) {
  if (target.skip) {
    return assess(target, 0, '', 0);
  }
  const url = `${BASE}${target.path}`;
  const t0 = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const init = {
      method: target.method || 'GET',
      signal: ctrl.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'api-health/2.0',
      },
      cache: 'no-store',
    };
    if (target.body) {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(target.body);
    }
    const res = await fetch(url, init);
    const text = await res.text();
    return assess(target, res.status, text, Date.now() - t0);
  } catch (e) {
    return {
      path: target.path,
      method: target.method || 'GET',
      group: target.group,
      market: pathToMarket(target.path),
      status: 0,
      bytes: 0,
      ms: Date.now() - t0,
      ok: false,
      reason: `network:${e?.name || 'err'}:${String(e?.message || e).slice(0, 100)}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function pad(s, n) {
  const t = String(s);
  return t.length >= n ? t.slice(0, n) : t + ' '.repeat(n - t.length);
}

async function main() {
  const inventory = discoverEndpoints();
  const active = inventory.filter((t) => !t.skip);
  const skipped = inventory.filter((t) => t.skip);

  console.log(`api-health base=${BASE}`);
  console.log(`discovered=${inventory.length} probe=${active.length} skipped=${skipped.length} concurrency=${CONCURRENCY}`);
  console.log(`rule: HTTP 2xx alone is NOT success — empty/hollow/error payloads FAIL\n`);

  if (process.env.API_HEALTH_LIST_ONLY === '1') {
    for (const t of inventory) {
      console.log(`${t.skip ? 'SKIP' : 'GET '} ${t.path}${t.skip ? ` (${t.skip})` : ''}`);
    }
    process.exit(0);
  }

  const results = await mapPool(active, CONCURRENCY, async (target) => {
    const r = await fetchOne(target);
    const mark = r.ok ? 'OK  ' : 'FAIL';
    console.log(
      `${mark} ${pad(r.status || '-', 4)} ${pad((r.bytes || 0) + 'b', 9)} ${pad((r.ms || 0) + 'ms', 8)} ${pad(r.reason, 32)} ${r.path}`,
    );
    return r;
  });

  // add skips to report
  for (const t of skipped) {
    results.push(assess(t, 0, '', 0));
  }

  const probed = results.filter((r) => !r.skipped);
  const ok = probed.filter((r) => r.ok);
  const fail = probed.filter((r) => !r.ok);

  console.log('\n========== SUMMARY ==========');
  console.log(`Probed: ${probed.length}`);
  console.log(`OK:     ${ok.length}/${probed.length}`);
  console.log(`FAIL:   ${fail.length}/${probed.length}`);
  console.log(`Skip:   ${skipped.length} (auth/admin — set API_HEALTH_INCLUDE_AUTH=1 to include)`);

  if (fail.length) {
    console.log('\nFailed endpoints (empty-green / error / hollow):');
    for (const f of fail) {
      console.log(`  - ${f.path}`);
      console.log(`      reason=${f.reason}  http=${f.status}  bytes=${f.bytes}  ms=${f.ms}`);
    }
  }

  const byReason = {};
  for (const f of fail) {
    const k = String(f.reason).split(':')[0];
    byReason[k] = (byReason[k] || 0) + 1;
  }
  if (Object.keys(byReason).length) console.log('\nFail reasons:', byReason);

  const outPath = process.env.API_HEALTH_OUT || join(ROOT, 'test-results', 'api-health.json');
  try {
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(
      outPath,
      JSON.stringify({
        base: BASE,
        at: new Date().toISOString(),
        summary: { probed: probed.length, ok: ok.length, fail: fail.length, skipped: skipped.length },
        inventory: inventory.map((t) => t.path),
        results,
      }, null, 2),
    );
    console.log(`\nwrote ${outPath}`);
  } catch (e) {
    console.warn('could not write report:', e.message);
  }

  process.exit(fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
