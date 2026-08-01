/**
 * Generate src/panels/manifest.js from MARKET_PANELS.
 * Run: node scripts/gen-panel-manifest.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const panelsSrc = fs.readFileSync(path.join(root, 'src/data/marketPanels.js'), 'utf8');
const start = panelsSrc.indexOf('export const MARKET_PANELS');
const body = panelsSrc.slice(start);

const byM = {};
let cur = null;
for (const line of body.split('\n')) {
  const mh = line.match(/^  ([a-zA-Z0-9_]+): \[/);
  if (mh) {
    cur = mh[1];
    byM[cur] = byM[cur] || [];
  }
  const id = line.match(/id: '([^']+)'/);
  const title = line.match(/title: '([^']+)'/);
  if (id && title && cur) byM[cur].push({ id: id[1], title: title[1] });
}

const dash = {
  equities: 'src/markets/equities/EquitiesMarket.jsx',
  bonds: 'src/markets/bonds/components/BondsDashboard.jsx',
  fx: 'src/markets/fx/components/FXDashboard.jsx',
  derivatives: 'src/markets/derivatives/components/DerivativesDashboard.jsx',
  realEstate: 'src/markets/realEstate/components/RealEstateDashboard.jsx',
  insurance: 'src/markets/insurance/components/InsuranceDashboard.jsx',
  commodities: 'src/markets/commodities/components/CommoditiesDashboard.jsx',
  globalMacro: 'src/markets/globalMacro/components/GlobalMacroDashboard.jsx',
  equitiesDeepDive: 'src/markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.jsx',
  crypto: 'src/markets/crypto/components/CryptoDashboard.jsx',
  credit: 'src/markets/credit/components/CreditDashboard.jsx',
  sentiment: 'src/markets/sentiment/components/SentimentDashboard.jsx',
  calendar: 'src/markets/calendar/components/CalendarDashboard.jsx',
  bls: 'src/markets/bls/components/BlsDashboard.jsx',
  eia: 'src/markets/eia/EiaMarket.jsx',
  alerts: 'src/markets/alerts/components/AlertsDashboard.jsx',
  watchlist: 'src/markets/watchlist/WatchlistMarket.jsx',
  analytics: 'src/markets/analytics/AnalyticsMarket.jsx',
  census: 'src/markets/census/components/CensusDashboard.jsx',
  imf: 'src/markets/imf/components/ImfDashboard.jsx',
  worldbank: 'src/markets/worldbank/components/WorldBankDashboard.jsx',
};

// Independent modules under src/panels/<market>/<panelId>.jsx
// Hand-written bonds aliases (file name ≠ panelId).
const HAND_ALIASES = {
  'bonds:ecb-yields': 'src/panels/bonds/ecbYields.jsx',
  'bonds:global-rates': 'src/panels/bonds/globalRates.jsx',
  'bonds:realYield': 'src/panels/bonds/realYield.jsx',
};

function resolveModule(marketId, panelId) {
  const key = `${marketId}:${panelId}`;
  if (HAND_ALIASES[key]) return HAND_ALIASES[key];
  const candidate = path.join(root, 'src/panels', marketId, `${panelId}.jsx`);
  if (fs.existsSync(candidate)) return `src/panels/${marketId}/${panelId}.jsx`;
  const js = path.join(root, 'src/panels', marketId, `${panelId}.js`);
  if (fs.existsSync(js)) return `src/panels/${marketId}/${panelId}.js`;
  return null;
}

const lines = [];
lines.push('/**');
lines.push(' * Panel traceability manifest — generated from MARKET_PANELS.');
lines.push(' * Run: node scripts/gen-panel-manifest.mjs');
lines.push(' * Prefer extracting UI into markets/<m>/panels/ (see src/panels/README.md).');
lines.push(' */');
lines.push('');
lines.push('/** @typedef {{ marketId: string, panelId: string, title: string, key: string, dashboard: string, module: string|null, placeholders: string }} PanelManifestEntry */');
lines.push('');
lines.push('/** @type {PanelManifestEntry[]} */');
lines.push('export const PANEL_MANIFEST = [');

let n = 0;
for (const [m, list] of Object.entries(byM)) {
  for (const p of list) {
    const key = `${m}:${p.id}`;
    const dashPath = dash[m] || `src/markets/${m}/`;
    const mod = resolveModule(m, p.id);
    lines.push('  {');
    lines.push(`    key: ${JSON.stringify(key)},`);
    lines.push(`    marketId: ${JSON.stringify(m)},`);
    lines.push(`    panelId: ${JSON.stringify(p.id)},`);
    lines.push(`    title: ${JSON.stringify(p.title)},`);
    lines.push(`    dashboard: ${JSON.stringify(dashPath)},`);
    lines.push(`    module: ${mod ? JSON.stringify(mod) : 'null'},`);
    lines.push(`    placeholders: ${JSON.stringify(key)},`);
    lines.push('  },');
    n += 1;
  }
}
lines.push('];');
lines.push('');
lines.push('export function getPanelManifestEntry(marketId, panelId) {');
lines.push('  return PANEL_MANIFEST.find((e) => e.marketId === marketId && e.panelId === panelId) || null;');
lines.push('}');
lines.push('');
lines.push('export function listPanelsForMarket(marketId) {');
lines.push('  return PANEL_MANIFEST.filter((e) => e.marketId === marketId);');
lines.push('}');
lines.push('');

const out = path.join(root, 'src/panels/manifest.js');
fs.writeFileSync(out, lines.join('\n'));
console.log(`Wrote ${n} entries → ${out}`);
