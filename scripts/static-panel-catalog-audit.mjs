/**
 * Static catalogue vs layout vs JSX key audit (no browser).
 *   node scripts/static-panel-catalog-audit.mjs
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import path from 'path';
import { MARKET_PANELS } from '../src/data/marketPanels.js';

const ROOT = path.resolve('src/markets');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else if (/\.(jsx?|tsx?)$/.test(name)) acc.push(p);
  }
  return acc;
}

function extractLayoutKeys(src) {
  const keys = new Set();
  // { i: 'foo' } or { i: "foo"
  const re = /\{\s*i\s*:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(src))) keys.add(m[1]);
  return [...keys];
}

function extractBentoKeys(src) {
  const keys = new Set();
  // key="foo" near BentoCard or data-panel-key
  const reKey = /(?:key|panelKey|data-panel-key)=['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = reKey.exec(src))) keys.add(m[1]);
  // key={"foo"} rare
  const reKey2 = /key=\{\s*['"`]([^'"`]+)['"`]\s*\}/g;
  while ((m = reKey2.exec(src))) keys.add(m[1]);
  return [...keys];
}

function extractUnmountRisks(src, file) {
  const risks = [];
  const lines = src.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/return\s+null\s*;/.test(line)) {
      // lookback for Bento / panel context
      const window = lines.slice(Math.max(0, i - 8), i + 1).join('\n');
      if (/BentoCard|data-panel-key|key=|hasGex|if\s*\(!/.test(window)) {
        risks.push({ file, line: i + 1, text: line.trim().slice(0, 120) });
      }
    }
    if (/\{\s*[^}]{0,40}&&\s*\(?\s*<BentoCard/.test(line) || /if\s*\(![^\)]*\)\s*return\s+null/.test(line) && /BentoCard/.test(lines.slice(i, i + 15).join('\n'))) {
      risks.push({ file, line: i + 1, text: line.trim().slice(0, 120), kind: 'conditional-card' });
    }
  }
  return risks;
}

// Market id → likely source folders
const MARKET_DIRS = {
  equities: ['equities'],
  bonds: ['bonds'],
  fx: ['fx'],
  derivatives: ['derivatives'],
  realEstate: ['realEstate'],
  insurance: ['insurance'],
  commodities: ['commodities'],
  globalMacro: ['globalMacro'],
  equitiesDeepDive: ['equitiesDeepDive'],
  crypto: ['crypto'],
  credit: ['credit'],
  sentiment: ['sentiment'],
  calendar: ['calendar'],
  bls: ['bls'],
  eia: ['eia'],
  alerts: ['alerts'],
  watchlist: ['watchlist'],
  analytics: ['analytics'],
};

const files = walk(ROOT);
const allSrcByMarket = {};
for (const [mid, dirs] of Object.entries(MARKET_DIRS)) {
  const parts = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/');
    if (dirs.some((d) => rel.startsWith(d + '/') || rel === d)) {
      parts.push({ file: f, src: readFileSync(f, 'utf8') });
    }
  }
  allSrcByMarket[mid] = parts;
}

const report = { at: new Date().toISOString(), markets: {} };
const allRisks = [];

for (const mid of Object.keys(MARKET_PANELS)) {
  const catalog = (MARKET_PANELS[mid] || []).map((p) => p.id);
  const catalogSet = new Set(catalog);
  const parts = allSrcByMarket[mid] || [];
  const layoutKeys = new Set();
  const renderKeys = new Set();
  for (const { file, src } of parts) {
    for (const k of extractLayoutKeys(src)) layoutKeys.add(k);
    for (const k of extractBentoKeys(src)) renderKeys.add(k);
    allRisks.push(...extractUnmountRisks(src, path.relative(process.cwd(), file).replace(/\\/g, '/')));
  }

  // Filter render keys to plausible panel ids (exclude react internal-ish)
  const renderPanelish = [...renderKeys].filter((k) =>
    catalogSet.has(k) || layoutKeys.has(k) || /^[a-z][a-z0-9_-]*$/i.test(k)
  );

  const catalogOnly = catalog.filter((id) => !layoutKeys.has(id) && !renderPanelish.includes(id));
  const layoutOnly = [...layoutKeys].filter((id) => !catalogSet.has(id));
  const inLayoutNotCatalog = [...layoutKeys].filter((id) => !catalogSet.has(id));
  const catalogNotInLayout = catalog.filter((id) => layoutKeys.size && !layoutKeys.has(id));
  const aligned = catalog.filter((id) => layoutKeys.has(id) || renderPanelish.includes(id));

  report.markets[mid] = {
    catalogCount: catalog.length,
    layoutCount: layoutKeys.size,
    renderKeyCount: renderPanelish.length,
    catalog,
    layoutKeys: [...layoutKeys].sort(),
    renderKeys: renderPanelish.sort(),
    catalogNotInLayout,
    layoutNotInCatalog: inLayoutNotCatalog,
    catalogOnlyNoRender: catalogOnly,
    alignedCount: aligned.length,
  };
}

report.unmountRisks = allRisks.slice(0, 200);
report.summary = {
  markets: Object.keys(report.markets).length,
  totalCatalog: Object.values(report.markets).reduce((s, m) => s + m.catalogCount, 0),
  totalCatalogNotInLayout: Object.values(report.markets).reduce((s, m) => s + m.catalogNotInLayout.length, 0),
  marketsWithCatalogLayoutGap: Object.entries(report.markets)
    .filter(([, m]) => m.catalogNotInLayout.length)
    .map(([id, m]) => ({ id, missingFromLayout: m.catalogNotInLayout })),
  unmountRiskCount: allRisks.length,
};

const out = 'test-results/static-panel-catalog-audit.json';
writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log('\nPer-market catalog∉layout:');
for (const [mid, m] of Object.entries(report.markets)) {
  if (m.catalogNotInLayout.length) {
    console.log(`  ${mid}: ${m.catalogNotInLayout.join(', ')}`);
  }
}
console.log(`\nwrote ${out}`);
