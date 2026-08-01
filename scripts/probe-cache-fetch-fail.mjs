/**
 * Offline: score MARKET_PANELS placeholders against server/datacache/*.json
 * No live server required.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, 'server', 'datacache');

const { MARKET_PANELS } = await import(pathToFileURL(path.join(ROOT, 'src/data/marketPanels.js')).href);
const { getPanelPlaceholders, MIN_PLACEHOLDER_FILL_RATE } = await import(
  pathToFileURL(path.join(ROOT, 'src/data/panelPlaceholders.js')).href
);
const { resolvePath, placeholderValueOk } = await import(
  pathToFileURL(path.join(ROOT, 'src/hub/lib/panelHealthUtils.js')).href
);

function loadLatestCaches() {
  const byMarket = {};
  if (!fs.existsSync(CACHE)) return byMarket;
  const files = fs.readdirSync(CACHE).filter((f) => f.endsWith('.json'));
  // market-YYYY-MM-DD.json
  const latest = {};
  for (const f of files) {
    const m = f.match(/^(.+)-(\d{4}-\d{2}-\d{2})\.json$/);
    if (!m) continue;
    const market = m[1];
    const day = m[2];
    if (!latest[market] || day > latest[market].day) latest[market] = { day, f };
  }
  // Map cache file stem → endpoint market ids
  const stemToIds = {
    commodities_enhanced: ['commodities', 'commoditiesEnhanced'],
    equityDeepDive: ['equitiesDeepDive', 'equityDeepDive'],
    edgar_filing_activity: ['edgarFilingActivity'],
    edgar_insurer_ratios: ['edgarInsurerRatios'],
    fed_news_sentiment: ['fedNewsSentiment'],
    fed_gdpnow: ['fedGDPNow'],
    fed_sep: ['fedSEP'],
    fed_inflation_nowcast: ['fedInflationNowcast'],
    eiaPetroleum: ['eiaPetroleum'],
    censusTrade: ['censusTrade'],
    treasuryTIC: ['treasuryTIC'],
    treasuryAuctions: ['treasuryAuctions'],
    treasuryCost: ['treasuryCost'],
    treasuryDTS: ['treasuryDTS'],
    cftcTFF: ['cftcTFF'],
    bisOTC: ['bisOTC'],
    universeUpdates: ['universeUpdates'],
  };
  for (const [stem, { f }] of Object.entries(latest)) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(CACHE, f), 'utf8'));
      const ids = stemToIds[stem] || [stem];
      for (const id of ids) byMarket[id] = data;
      // also raw stem
      byMarket[stem] = data;
    } catch { /* */ }
  }
  return byMarket;
}

function scorePanel(marketId, panelId, markets) {
  const placeholders = getPanelPlaceholders(marketId, panelId) || [];
  const primary = markets[marketId] || null;
  if (!placeholders.length) {
    return { fetchOk: false, fillRate: 0, empty: ['(no placeholders)'], waiting: [], reason: 'no_placeholders' };
  }
  let req = 0, filled = 0;
  const empty = [];
  const waiting = [];
  for (const slot of placeholders) {
    const isReq = slot.required !== false;
    if (isReq) req++;
    let v = null;
    let usedPath = slot.path || slot.anyOf?.[0] || slot.id || '';
    if (slot.crossMarket) {
      const dep = markets[slot.crossMarket];
      if (!dep) {
        if (isReq) { waiting.push(slot.crossMarket); empty.push(slot.id || slot.path); }
        continue;
      }
      if (slot.path) {
        v = resolvePath(dep, slot.path);
        usedPath = slot.path;
      } else if (slot.anyOf) {
        for (const p of slot.anyOf) {
          const c = resolvePath(dep, p);
          if (placeholderValueOk(c, p)) { v = c; usedPath = p; break; }
        }
      } else {
        v = dep;
        usedPath = slot.crossMarket;
      }
    } else if (slot.anyOf) {
      for (const p of slot.anyOf) {
        let c = resolvePath(primary, p);
        if (!placeholderValueOk(c, p) && p.includes('.')) {
          const parts = p.split('.');
          if (markets[parts[0]]) c = resolvePath(markets[parts[0]], parts.slice(1).join('.'));
        }
        if (placeholderValueOk(c, p)) { v = c; usedPath = p; break; }
      }
    } else if (slot.path) {
      v = resolvePath(primary, slot.path);
      usedPath = slot.path;
      if (!placeholderValueOk(v, slot.path) && slot.path.includes('.')) {
        const parts = slot.path.split('.');
        if (markets[parts[0]]) v = resolvePath(markets[parts[0]], parts.slice(1).join('.'));
      }
    }
    if (Array.isArray(v) && v.length && v.every((x) => x == null)) v = null;
    // Critical: validate with the path that actually matched (anyOf), not slot.id
    if (placeholderValueOk(v, usedPath)) {
      if (isReq) filled++;
    } else if (isReq) empty.push(slot.id || slot.path || '?');
  }
  const fillRate = req ? filled / req : 1;
  return {
    fetchOk: fillRate >= MIN_PLACEHOLDER_FILL_RATE,
    fillRate,
    empty: empty.slice(0, 10),
    waiting: [...new Set(waiting)].slice(0, 6),
  };
}

const markets = loadLatestCaches();
// Federated alerts shape (DataProvider computeAlerts) — not a disk market
if (!markets.alerts) {
  markets.alerts = {
    alerts: [],
    rules: [
      { id: 'vix-spike', label: 'VIX Spike', severity: 'high', enabled: true },
      { id: 'curve-inversion', label: 'Yield Curve Inversion', severity: 'high', enabled: true },
    ],
  };
}
// Minimal analytics shell so offline probe matches /api/analytics keys
if (!markets.analytics) {
  markets.analytics = {
    apiUsage: { date: '2026-07-31', sources: [{ name: 'FRED', used: 1, limit: 100 }], totalExternalCalls: 1 },
    endpoints: [{ path: '/api/bonds', calls: 1, avgMs: 10, errors: 0 }],
    dataFreshness: { today: '2026-07-31', markets: [{ market: 'bonds', isCurrent: true, keyCount: 5 }], currentCount: 1 },
    cacheFiles: { count: 1, totalSizeKB: 10, files: [{ name: 'bonds.json', sizeKB: 10 }] },
    memCache: { keyCount: 1, keys: ['x'], hits: 1, misses: 0, hitRate: 100 },
    errorLog: [],
    environment: { nodeVersion: 'v20', platform: 'win32', cpus: 4, totalMemGB: 16, freeMemGB: 8 },
  };
}
const loaded = Object.keys(markets).filter((k) => markets[k] && typeof markets[k] === 'object');
console.log('Loaded cache markets:', loaded.length, loaded.sort().join(', '));

const fail = [];
const ok = [];
const byMarket = {};
for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
  byMarket[marketId] = { ok: 0, fail: 0, noCache: !markets[marketId], fails: [] };
  for (const p of panels) {
    const sc = scorePanel(marketId, p.id, markets);
    if (sc.fetchOk) {
      ok.push({ marketId, panelId: p.id });
      byMarket[marketId].ok++;
    } else {
      fail.push({ marketId, panelId: p.id, ...sc });
      byMarket[marketId].fail++;
      byMarket[marketId].fails.push({ id: p.id, fill: sc.fillRate, empty: sc.empty, wait: sc.waiting });
    }
  }
}

console.log(JSON.stringify({
  total: ok.length + fail.length,
  fetchOk: ok.length,
  fetchFail: fail.length,
  minFill: MIN_PLACEHOLDER_FILL_RATE,
}, null, 2));

console.log('\nBy market (fail count):');
Object.entries(byMarket)
  .sort((a, b) => b[1].fail - a[1].fail)
  .forEach(([m, s]) => {
    console.log(`  ${m}: fail=${s.fail} ok=${s.ok} noCache=${s.noCache}`);
  });

console.log('\nWorst 50:');
fail.sort((a, b) => a.fillRate - b.fillRate).slice(0, 50).forEach((f) => {
  console.log(`  ${f.marketId}:${f.panelId} ${(f.fillRate * 100).toFixed(0)}% empty=${JSON.stringify(f.empty)} wait=${JSON.stringify(f.waiting)}`);
});

fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports', 'cache-fetch-fail.json'), JSON.stringify({ byMarket, fail, okCount: ok.length }, null, 2));
console.log('\nWrote reports/cache-fetch-fail.json');
