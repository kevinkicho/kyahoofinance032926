/**
 * Scaffold independent panel modules for EVERY market in MARKET_PANELS.
 *
 * - Creates src/panels/<market>/<panelId>.jsx via definePanel
 * - Body uses ctx.__render(panelId) when the tab provides a legacy renderer
 *   so we can compose all panels without dropping UI during migration.
 * - Updates src/panels/registry.js to import all packs.
 *
 * Run: node scripts/scaffold-all-market-panels.mjs
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

// Markets with hand-written independent modules (do not overwrite)
const HAND_WRITTEN = new Set([
  'bonds:yield',
  'bonds:credit',
  'bonds:realYield',
  'bonds:breakevens',
  'bonds:duration',
  'bonds:cpi',
  'bonds:macro',
  'bonds:ecb-yields',
  'bonds:global-rates',
]);

function safeFileName(panelId) {
  // panelId may contain hyphens; valid JS module name
  return panelId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function panelModuleSource(marketId, panel) {
  const key = `${marketId}:${panel.id}`;
  const fileBase = safeFileName(panel.id);
  const pid = panel.id;
  return `import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: ${key}
 * Body prefers ctx.__render('${pid}') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['${pid}'], ctx.__subtitle['${pid}'], ctx.__disabled['${pid}']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('${pid}', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel ${key}] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={${JSON.stringify(panel.title + ' — awaiting data')}}
      reason={${JSON.stringify(key)}}
    />
  );
}

export default definePanel({
  key: ${JSON.stringify(key)},
  panelId: ${JSON.stringify(pid)},
  markets: [${JSON.stringify(marketId)}],
  title: ${JSON.stringify(panel.title)},
  source: 'Market data',
  className: ${JSON.stringify(marketId + '-bento-card')},
  contentClassName: ${JSON.stringify(marketId + '-panel-content')},
  modulePath: ${JSON.stringify(`src/panels/${marketId}/${fileBase}.jsx`)},
  getSubtitle: (ctx) => ctx?.__subtitle?.['${pid}'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['${pid}']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['${pid}']),
  Body,
});
`;
}

const packImports = [];
const packNames = [];

for (const [marketId, panels] of Object.entries(byM)) {
  const dir = path.join(root, 'src/panels', marketId);
  fs.mkdirSync(dir, { recursive: true });
  const exports = [];
  const varNames = [];

  for (const panel of panels) {
    const key = `${marketId}:${panel.id}`;
    const fileBase = safeFileName(panel.id);
    const filePath = path.join(dir, `${fileBase}.jsx`);
    const varName = ('p_' + fileBase.replace(/-/g, '_')).replace(/[^a-zA-Z0-9_]/g, '_');

    if (!HAND_WRITTEN.has(key)) {
      fs.writeFileSync(filePath, panelModuleSource(marketId, panel));
    } else if (!fs.existsSync(filePath) && !fs.existsSync(path.join(dir, `${fileBase}.js`))) {
      // hand-written lives under bonds/*.jsx with different names — skip
    }

    // index always lists modules; hand-written bonds use existing filenames
    const importPath = HAND_WRITTEN.has(key)
      ? null
      : `./${fileBase}.jsx`;

    if (importPath) {
      exports.push(`import ${varName} from '${importPath}';`);
      varNames.push(varName);
    }
  }

  // bonds index is hand-maintained
  if (marketId === 'bonds') {
    packImports.push(`import { BONDS_PANELS } from './bonds/index.js';`);
    packNames.push('...BONDS_PANELS');
    continue;
  }

  const indexSrc = `${exports.join('\n')}

/** @type {import('../definePanel').PanelDefinition[]} */
export const ${marketId.toUpperCase()}_PANELS = [
  ${varNames.join(',\n  ')}
];

export const ${marketId.toUpperCase()}_PANEL_BY_ID = Object.fromEntries(
  ${marketId.toUpperCase()}_PANELS.map((p) => [p.panelId, p]),
);
`;
  fs.writeFileSync(path.join(dir, 'index.js'), indexSrc);
  const packConst = `${marketId.toUpperCase()}_PANELS`;
  packImports.push(`import { ${packConst} } from './${marketId}/index.js';`);
  packNames.push(`...${packConst}`);
  console.log(`scaffolded ${marketId}: ${varNames.length} panels`);
}

const registrySrc = `/**
 * Global panel registry — all markets.
 * Generated by scripts/scaffold-all-market-panels.mjs (bonds pack is hand-maintained).
 */
${packImports.join('\n')}

const byKey = new Map();
const byMarket = new Map();

function register(panel) {
  if (!panel?.key) return;
  byKey.set(panel.key, panel);
  for (const m of panel.markets || []) {
    if (!byMarket.has(m)) byMarket.set(m, []);
    const list = byMarket.get(m);
    if (!list.find((p) => p.key === panel.key)) list.push(panel);
  }
}

const ALL = [
  ${packNames.join(',\n  ')}
];

for (const p of ALL) register(p);

export function getPanel(key) {
  return byKey.get(key) || null;
}

export function getPanelForMarket(marketId, panelId) {
  return getPanel(\`\${marketId}:\${panelId}\`)
    || (byMarket.get(marketId) || []).find((p) => p.panelId === panelId)
    || null;
}

export function listPanelsForMarket(marketId) {
  return byMarket.get(marketId) || [];
}

export function listAllPanels() {
  return [...byKey.values()];
}

export { register as registerPanel };
`;

fs.writeFileSync(path.join(root, 'src/panels/registry.js'), registrySrc);
console.log('Updated registry.js with', packNames.length, 'packs');
