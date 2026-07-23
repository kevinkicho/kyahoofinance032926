/**
 * Audit every UI panel against live API payloads.
 * Run: node scripts/audit-panel-data.mjs
 * Requires: API on localhost:3001 (or PANEL_AUDIT_API_BASE)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const BASE = process.env.PANEL_AUDIT_API_BASE || 'http://localhost:3001';

const routing = JSON.parse(fs.readFileSync(path.join(root, 'shared/api-routing.json'), 'utf8'));
const panelsSrc = fs.readFileSync(path.join(root, 'src/data/marketPanels.js'), 'utf8');
const registrySrc = fs.readFileSync(path.join(root, 'src/data/panelRegistry.js'), 'utf8');

// ── parse MARKET_PANELS ──────────────────────────────────────────────────────
const marketPanels = {};
let cur = null;
for (const line of panelsSrc.split(/\n/)) {
  const m = line.match(/^\s{2}([a-zA-Z]+):\s*\[/);
  if (m) cur = m[1];
  const id = line.match(/id:\s*'([^']+)'/);
  const title = line.match(/title:\s*'([^']+)'/);
  if (id && title && cur) {
    (marketPanels[cur] ||= []).push({ id: id[1], title: title[1] });
  }
}

// ── parse panelRegistry fields ───────────────────────────────────────────────
const regPanels = {};
let regMarket = null;
const lines = registrySrc.split(/\n/);
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\s{2}([a-zA-Z]+):\s*\[/);
  if (m) regMarket = m[1];
  if (!regMarket) continue;
  if (lines[i].includes('id:') && lines[i].includes("'")) {
    const block = lines.slice(i, i + 14).join('\n');
    const pid = block.match(/id:\s*'([^']+)'/)?.[1];
    const field = block.match(/field:\s*'([^']+)'/)?.[1];
    const fieldPath = block.match(/fieldPath:\s*'([^']+)'/)?.[1];
    if (pid) {
      (regPanels[regMarket] ||= []).push({ id: pid, field, fieldPath: fieldPath || field });
    }
  }
}

function hasPath(obj, p) {
  if (!p || obj == null) return false;
  const parts = String(p).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let c = obj;
  for (const part of parts) {
    if (c == null) return false;
    c = c[part];
  }
  if (c == null || c === false) return false;
  if (Array.isArray(c)) return c.length > 0;
  if (typeof c === 'object') return Object.keys(c).length > 0;
  return true;
}

function nonMetaKeys(d) {
  return Object.keys(d || {}).filter(
    (k) => !k.startsWith('_') && !['lastUpdated', 'fetchedOn', 'isLive', 'isCurrent', 'error'].includes(k)
  );
}

function valuePreview(obj, p) {
  if (!p || !obj) return '';
  const parts = String(p).split('.');
  let c = obj;
  for (const part of parts) c = c?.[part];
  if (c == null) return 'null';
  if (Array.isArray(c)) return `arr[${c.length}]`;
  if (typeof c === 'object') return `obj{${Object.keys(c).slice(0, 5).join(',')}}`;
  return String(c).slice(0, 40);
}

async function fetchJson(p) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 90000);
  try {
    const r = await fetch(BASE + p, { signal: ctrl.signal });
    const text = await r.text();
    clearTimeout(t);
    let j = null;
    try {
      j = JSON.parse(text);
    } catch {
      /* ignore */
    }
    return { ok: r.ok, status: r.status, bytes: text.length, data: j };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, bytes: 0, data: null, error: e.message };
  }
}

// Collect endpoints
const endpointData = {};
const toFetch = new Set();
for (const id of routing.tabMarkets) {
  if (id === 'alerts') continue;
  const cfg = routing.markets[id];
  if (!cfg) continue;
  toFetch.add(cfg.primary);
  for (const d of cfg.deps || []) toFetch.add(d);
}
const extras = [
  '/api/treasuryTIC', '/api/nyfed', '/api/treasuryAuctions', '/api/ecb', '/api/treasuryCost',
  '/api/fema', '/api/usgs', '/api/institutional', '/api/usda', '/api/eiaPetroleum', '/api/fao',
  '/api/cftcTFF', '/api/bisOTC', '/api/fed/news-sentiment', '/api/imf', '/api/worldbank',
  '/api/bea', '/api/oecd', '/api/eurostat', '/api/fdic', '/api/msrb', '/api/census',
  '/api/censusTrade', '/api/edgar/filing-activity', '/api/edgar/insurer-ratios', '/api/universeUpdates',
  '/api/fed/sep', '/api/fed/gdpnow', '/api/fed/inflation-nowcast',
];
for (const p of extras) toFetch.add(p);

console.log(`Fetching ${toFetch.size} endpoints from ${BASE}…`);
const list = [...toFetch];
for (let i = 0; i < list.length; i += 3) {
  const batch = list.slice(i, i + 3);
  await Promise.all(
    batch.map(async (p) => {
      endpointData[p] = await fetchJson(p);
      process.stdout.write(endpointData[p].ok ? '.' : 'x');
    })
  );
}
console.log('\n');

// Cross-market field resolvers used by dashboards
const CROSS = {
  'foreign-holders': '/api/treasuryTIC',
  'money-market': '/api/nyfed',
  auctions: '/api/treasuryAuctions',
  'ecb-yields': '/api/ecb',
  'global-rates': '/api/ecb',
  'treasury-cost': '/api/treasuryCost',
  'treasury-tic': '/api/treasuryTIC',
  'imf-cofer': '/api/imf',
  'cftc-tff': '/api/cftcTFF',
  'bis-otc': '/api/bisOTC',
  'ecb-derivatives': '/api/ecb',
  'fema-disasters': '/api/fema',
  'usgs-earthquakes': '/api/usgs',
  'usgs-minerals': '/api/usgs',
  catastrophes: '/api/fema',
  'usda-ag': '/api/usda',
  'eia-petrol': '/api/eiaPetroleum',
  'fao-prices': '/api/fao',
  'wb-ins-penetration': '/api/worldbank',
  'wb-debt': '/api/worldbank',
  'wb-trade': '/api/worldbank',
  'wb-dev': '/api/worldbank',
  'wb-market-cap': '/api/worldbank',
  'bis-total-credit': '/api/bisOTC',
  'treasury-credit-holdings': '/api/treasuryTIC',
  'bank-sector': '/api/fdic',
  'muni-market': '/api/msrb',
  'news-sentiment': '/api/fed/news-sentiment',
  'fed-risk-mood': '/api/fed/news-sentiment',
  gdpnow: '/api/fed/gdpnow',
  'fomc-sep': '/api/fed/sep',
  cleveland: '/api/fed/inflation-nowcast',
  'bea-accounts': '/api/bea',
  'bea-income': '/api/bea',
  'bea-corporate-profits': '/api/bea',
  eurostat: '/api/eurostat',
  'oecd-direct': '/api/oecd',
  'oecd-leading': '/api/oecd',
  'ecb-eur': '/api/ecb',
  'ecb-supervisory': '/api/ecb',
  'tga-balance': '/api/treasuryDTS',
  institutions: '/api/institutional',
  'sec-filings': '/api/edgar/filing-activity',
  'sec-fundamentals': '/api/edgar',
  'combined-ratios': '/api/edgar/insurer-ratios',
  'universe-updates': '/api/universeUpdates',
  'census-housing': '/api/census',
  'census-trade': '/api/censusTrade',
  'census-trends-housing': '/api/census',
  'census-trends-trade': '/api/censusTrade',
};

const report = [];

for (const marketId of Object.keys(marketPanels)) {
  const panels = marketPanels[marketId];
  const cfg = routing.markets[marketId];
  const primary = cfg?.primary || (marketId === 'alerts' ? 'federated' : null);
  let primaryData = null;
  let primaryMeta = { status: 'n/a', bytes: 0 };
  if (primary && primary !== 'federated') {
    const ep = endpointData[primary];
    primaryMeta = { status: ep?.status ?? 0, bytes: ep?.bytes ?? 0, ok: !!ep?.ok, error: ep?.error };
    primaryData = ep?.data;
  }

  const panelResults = [];
  for (const p of panels) {
    const reg = (regPanels[marketId] || []).find((r) => r.id === p.id);
    let fieldStatus = 'unknown';
    let detail = '';
    let source = primary;

    if (marketId === 'alerts') {
      fieldStatus = 'federated';
      detail = 'computed client-side from other markets';
      source = 'federated';
    } else if (!primaryData && primary !== 'federated') {
      fieldStatus = 'no-primary';
      detail = JSON.stringify(primaryMeta);
    } else if (CROSS[p.id]) {
      source = CROSS[p.id];
      const dep = endpointData[source];
      if (dep?.ok && dep.data && nonMetaKeys(dep.data).length > 0) {
        fieldStatus = 'ok-cross';
        detail = `${source} keys=${nonMetaKeys(dep.data).length}`;
      } else {
        fieldStatus = 'missing-cross';
        detail = `${source} status=${dep?.status} err=${dep?.error || ''}`;
      }
    } else if (reg?.fieldPath || reg?.field) {
      const candidates = [reg.fieldPath, reg.field].filter(Boolean);
      // common aliases for enhanced commodities shape
      if (marketId === 'commodities') {
        candidates.push('yahoo.futures', 'eia', 'supplyDemand', 'futuresCurveData', 'fred');
      }
      const hit = candidates.find((c) => hasPath(primaryData, c));
      if (hit) {
        fieldStatus = 'ok';
        detail = `${hit}=${valuePreview(primaryData, hit)}`;
      } else {
        fieldStatus = 'missing-field';
        detail = `want ${reg.fieldPath || reg.field}; have ${nonMetaKeys(primaryData).slice(0, 10).join(',')}`;
      }
    } else {
      // untracked panel — still count primary health
      if (primaryData && nonMetaKeys(primaryData).length > 0) {
        fieldStatus = 'ok-untracked';
        detail = 'no panelRegistry field mapping';
      } else {
        fieldStatus = 'unknown';
        detail = 'no registry + empty primary';
      }
    }

    panelResults.push({
      id: p.id,
      title: p.title,
      fieldStatus,
      detail,
      fieldPath: reg?.fieldPath || reg?.field || null,
      source,
    });
  }

  const counts = panelResults.reduce((a, r) => {
    a[r.fieldStatus] = (a[r.fieldStatus] || 0) + 1;
    return a;
  }, {});

  report.push({
    marketId,
    primary,
    primaryMeta,
    primaryKeys: primaryData ? nonMetaKeys(primaryData).length : 0,
    panelCount: panels.length,
    counts,
    panels: panelResults,
  });
}

// ── Print ────────────────────────────────────────────────────────────────────
console.log('=== PANEL DATA FETCH AUDIT ===\n');
console.log('Status legend:');
console.log('  ok / ok-cross / ok-untracked / federated = can show data');
console.log('  missing-field / missing-cross / no-primary = cannot show data\n');

let totalPanels = 0;
let totalOk = 0;
let totalBad = 0;

for (const r of report) {
  const c = r.counts;
  const ok =
    (c.ok || 0) + (c['ok-cross'] || 0) + (c['ok-untracked'] || 0) + (c.federated || 0);
  const bad = (c['missing-field'] || 0) + (c['missing-cross'] || 0) + (c['no-primary'] || 0);
  totalPanels += r.panelCount;
  totalOk += ok;
  totalBad += bad;
  const flag = bad === 0 ? 'OK ' : bad > r.panelCount / 2 ? 'BAD' : 'MIX';
  const pstat = r.primaryMeta?.ok
    ? `HTTP ${r.primaryMeta.status} ${r.primaryMeta.bytes}b keys=${r.primaryKeys}`
    : `FAIL ${JSON.stringify(r.primaryMeta)}`;
  console.log(
    `${flag} ${r.marketId.padEnd(18)} ${String(ok).padStart(2)}/${String(r.panelCount).padStart(2)} panels data-ready  missing=${bad}  ${r.primary || '-'} (${pstat})`
  );
}

console.log(`\nTOTAL: ${totalOk}/${totalPanels} panels data-ready, ${totalBad} missing\n`);

console.log('=== PROBLEMS (panels without data path) ===\n');
for (const r of report) {
  const miss = r.panels.filter((p) =>
    ['missing-field', 'missing-cross', 'no-primary'].includes(p.fieldStatus)
  );
  if (!miss.length) continue;
  console.log(`-- ${r.marketId} --`);
  for (const p of miss) {
    console.log(`  [${p.fieldStatus}] ${p.id.padEnd(28)} ${p.title}`);
    console.log(`      path=${p.fieldPath || '-'} source=${p.source}`);
    console.log(`      ${p.detail.slice(0, 140)}`);
  }
  console.log('');
}

console.log('=== ENDPOINT HEALTH ===\n');
const epRows = Object.entries(endpointData)
  .map(([p, v]) => ({ p, ...v }))
  .sort((a, b) => a.p.localeCompare(b.p));
for (const e of epRows) {
  const flag = e.ok && e.bytes > 50 ? 'OK ' : 'BAD';
  console.log(
    `${flag} ${e.p.padEnd(40)} st=${String(e.status).padEnd(3)} bytes=${String(e.bytes).padStart(7)} ${e.error || ''}`
  );
}

const outPath = path.join(root, 'panel-data-audit.json');
fs.writeFileSync(
  outPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      base: BASE,
      summary: { totalPanels, totalOk, totalBad },
      markets: report,
      endpoints: Object.fromEntries(
        Object.entries(endpointData).map(([p, v]) => [
          p,
          { ok: v.ok, status: v.status, bytes: v.bytes, error: v.error || null },
        ])
      ),
    },
    null,
    2
  )
);
console.log(`\nFull report: ${outPath}`);
