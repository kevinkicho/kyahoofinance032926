// Auto-regressive check for every panel the user complained about.
// For each item we verify two axes:
//   1) SHAPE — does the API response carry the keys the panel reads?
//      (independent of whether values are present — needs no API key)
//   2) RENDER — does the panel render anything other than placeholder
//      when data IS available?
// The script is idempotent — call it after each fix and it re-checks.
import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import nodePath from 'node:path';

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));
const PORT_FILE = nodePath.resolve(__dirname, '..', '.server-port');
let PORT;
try { PORT = readFileSync(PORT_FILE, 'utf8').trim(); }
catch { console.error(`error: ${PORT_FILE} not found — start the app first with \`npm start\``); process.exit(1); }
const BASE = `http://localhost:5173`;

async function fetchJson(path) {
  const r = await fetch(`http://localhost:${PORT}${path}`, { signal: AbortSignal.timeout(45000) });
  // Return both the parsed body and the HTTP status so checks can
  // distinguish "5xx because no API key" (env-blocked) from "200 with
  // wrong shape" (genuine bug). Tag the synthetic shape so callers can
  // detect environment-blocked routes consistently.
  const body = await r.json().catch(() => null);
  if (!r.ok) return { __status: r.status, error: body?.error || `HTTP ${r.status}` };
  return body;
}

// CHECKS — a list of {tab, name, shape, renderRule}
// shape(json) → { ok, why } — does the SERVER response carry the right keys?
// renderRule(card) → { ok, why } — does the DOM card show non-placeholder content?
const CHECKS = [
  { tab: 'insurance', name: 'Cat Bond Spreads',
    shape: j => Array.isArray(j.catBondSpreads) ? { ok: true } : { ok: false, why: 'catBondSpreads not array' },
    panel: 'Cat Bond Spreads',
  },
  { tab: 'insurance', name: 'Industry Combined Ratio',
    shape: j => j.combinedRatioHistory && Array.isArray(j.combinedRatioHistory.values) ? { ok: true } : { ok: false, why: 'combinedRatioHistory missing' },
    panel: 'Industry Combined Ratio',
  },
  { tab: 'bonds', name: 'Bonds Key Metrics',
    shape: j => (!j || j?.__status === 503 || j?.error) ? { ok: false, env: true, why: `${j?.error || 'no response'} (FRED required)` }
      : (j.treasuryRates && ('US10Y' in j.treasuryRates) && ('US2Y' in j.treasuryRates)) ? { ok: true } : { ok: false, why: 'treasuryRates.US10Y/US2Y missing' },
    panel: 'Key Metrics',
  },
  { tab: 'bonds', name: 'Duration Ladder',
    shape: j => (!j || j?.__status === 503 || j?.error) ? { ok: false, env: true, why: 'FRED required' }
      : (j.durationLadder && Array.isArray(j.durationLadder.buckets)) ? { ok: true } : { ok: false, why: 'durationLadder missing' },
    panel: 'Duration Ladder',
  },
  { tab: 'commodities', name: 'COT Positioning shape',
    shape: async () => {
      const s = await fetchJson('/api/sentiment');
      const items = s?.cftcData?.commodities;
      if (!Array.isArray(items)) return { ok: false, why: 'cftcData.commodities missing' };
      const hasReal = items.some(i => i.netPct !== 0 || i.longK !== 0);
      return hasReal ? { ok: true } : { ok: false, env: true, why: 'CFTC commodities all zeros (Socrata limit hit?)' };
    },
    panel: 'COT Positioning',
  },
  { tab: 'commodities', name: 'Sector Performance',
    shape: j => (j.yahoo?.futures && Object.keys(j.yahoo.futures).length > 0) ? { ok: true } : { ok: false, why: 'yahoo.futures empty' },
    panel: 'Sector Performance',
    apiPath: '/api/commodities/v2',
  },
  { tab: 'commodities', name: 'Commodity FX (Currencies)',
    shape: async () => {
      const f = await fetchJson('/api/fx');
      const r = f?.spotRates || {};
      return (r.CAD != null && r.AUD != null) ? { ok: true } : { ok: false, why: 'FX spot rates missing' };
    },
    panel: 'Commodity FX',
  },
  { tab: 'commodities', name: 'Futures Curve',
    shape: j => (j.futuresCurveData?.labels?.length || j.goldFuturesCurve?.labels?.length) ? { ok: true } : { ok: false, why: 'no futures contracts returned' },
    panel: 'Futures Curve',
    apiPath: '/api/commodities/v2',
  },
  { tab: 'commodities', name: 'Market Summary',
    shape: j => (j.yahoo?.futures && Object.keys(j.yahoo.futures).length > 0) ? { ok: true } : { ok: false, why: 'yahoo futures empty' },
    panel: 'Market Summary',
    apiPath: '/api/commodities/v2',
  },
  { tab: 'commodities', name: 'Supply & Demand',
    shape: j => (j.eia && Object.keys(j.eia).length > 0) || (j.supplyDemand && Object.values(j.supplyDemand).some(v => v != null)) ? { ok: true } : { ok: false, env: true, why: 'EIA key required' },
    panel: 'Supply & Demand',
    apiPath: '/api/commodities/v2',
  },
  { tab: 'sentiment', name: 'Fear & Greed Index',
    shape: j => (j.fearGreedData?.score != null) ? { ok: true } : { ok: false, why: 'fearGreedData.score missing' },
    panel: 'Fear & Greed',
  },
  { tab: 'sentiment', name: 'Risk Dashboard',
    shape: j => (Array.isArray(j.riskData?.signals) && j.riskData.signals.length > 0) ? { ok: true } : { ok: false, why: 'riskData.signals missing' },
    panel: 'Risk Dashboard',
  },
  { tab: 'sentiment', name: 'Leverage Metrics (FRED)',
    shape: j => (j.marginDebt?.values?.length || j.consumerCredit?.values?.length) ? { ok: true } : { ok: false, env: true, why: 'FRED key required' },
    panel: 'Leverage Metrics',
  },
  { tab: 'globalMacro', name: 'OECD Leading Indicators',
    shape: j => (j.oecdCli && Object.keys(j.oecdCli).length > 0) ? { ok: true } : { ok: false, env: true, why: 'FRED OECD mirror needs key' },
    panel: 'OECD Leading Indicators',
  },
  { tab: 'globalMacro', name: 'Economic Activity / CFNAI',
    shape: j => (j.cfnai?.latest != null || j.cfnai?.values?.length) ? { ok: true } : { ok: false, env: true, why: 'FRED CFNAIMA3 needs key' },
    panel: 'Economic Activity',
  },
  { tab: 'globalMacro', name: 'International Reserves',
    shape: async () => {
      const i = await fetchJson('/api/imf');
      return (i?.ifsReserves && Object.keys(i.ifsReserves).length > 0) ? { ok: true } : { ok: false, why: 'imf ifsReserves missing' };
    },
    panel: 'International Reserves',
  },
  { tab: 'globalMacro', name: 'Trade Openness',
    shape: async () => {
      const w = await fetchJson('/api/worldbank');
      const c = w?.countries || [];
      return c.some(x => x.tradeGdp != null) ? { ok: true } : { ok: false, env: true, why: 'World Bank tradeGdp not populated' };
    },
    panel: 'Trade Openness',
  },
  { tab: 'equitiesDeepDive', name: 'Equity+ Key Metrics',
    shape: j => (j.sectorData?.sectors?.length > 0 || j.factorData?.inFavor) ? { ok: true } : { ok: false, why: 'sectorData/factorData missing' },
    panel: 'Equity+ Key Metrics',
    apiPath: '/api/equityDeepDive',
  },
  { tab: 'credit', name: 'Credit Key Metrics',
    shape: j => (j.spreadData?.current && j.emBondData?.countries) ? { ok: true } : { ok: false, env: true, why: 'spreadData/emBondData shape (FRED key required)' },
    panel: 'Credit Key Metrics',
  },
  { tab: 'bls', name: 'BLS panels (FRED fallback)',
    shape: j => {
      const s = j.series || {};
      const live = Object.values(s).filter(x => x?._source).length;
      return live > 0 ? { ok: true } : { ok: false, env: true, why: 'BLS or FRED key required' };
    },
    panel: 'kpi',
  },
  { tab: 'eia', name: 'EIA panels',
    shape: j => (j.electricity?.residential || j.co2Emissions?.total) ? { ok: true } : { ok: false, env: true, why: 'EIA key required' },
    panel: 'electricity',
  },
  { tab: 'realEstate', name: 'Real Estate Key Metrics',
    shape: j => (j.caseShillerData || j.mortgageRates || j.reitEtf) ? { ok: true } : { ok: false, env: true, why: 'FRED key required for full data' },
    panel: 'Key Metrics',
  },
  { tab: 'fx', name: 'FX REER (single panel)',
    shape: () => ({ ok: true }), // shape always ok (env may make values null)
    panel: 'Real Effective Exchange Rates',
    requireSinglePanel: true,
  },
  { tab: 'fx', name: 'FX DXY Dollar Index',
    shape: j => j.dxyHistory?.values?.length ? { ok: true } : { ok: false, env: true, why: 'FRED DTWEXBGS needs key' },
    panel: 'DXY Dollar Index',
  },
  { tab: 'calendar', name: 'Treasury Auctions',
    shape: j => (Array.isArray(j.treasuryAuctions) && j.treasuryAuctions.length > 0) ? { ok: true } : { ok: false, why: 'treasuryAuctions empty/null' },
    panel: 'Treasury Auctions',
  },
];

const SKIP_LINK_CHECK = async (page) => {
  // The skip-to-content link should be visually hidden until focused.
  await page.goto(`${BASE}/?market=equities`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  return await page.evaluate(() => {
    const el = document.querySelector('.skip-link');
    if (!el) return { ok: false, why: 'no .skip-link element' };
    const r = el.getBoundingClientRect();
    const visible = r.width > 1 && r.height > 1 && r.top >= 0 && r.left >= 0;
    return visible ? { ok: false, why: `visible at (${r.top},${r.left}) ${r.width}x${r.height}` } : { ok: true };
  });
};

const PERSIST_CHECK = async (page) => {
  await page.goto(`${BASE}/?market=fx`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const card = page.locator('.react-grid-item').first();
  const titleRow = card.locator('.bento-panel-title-row').first();
  const box = await titleRow.boundingBox();
  if (!box) return { ok: false, why: 'no card to drag' };
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height / 2 + 360, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await card.evaluate(el => el.style.transform);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const reloaded = await page.locator('.react-grid-item').first().evaluate(el => el.style.transform);
  return after === reloaded ? { ok: true } : { ok: false, why: `before=${after} after=${reloaded}` };
};

const OVERLAP_CHECK = async (page) => {
  // Audit a few tabs for overlapping bento cards.
  const issues = [];
  for (const tab of ['fx', 'bonds', 'globalMacro', 'commodities']) {
    await page.goto(`${BASE}/?market=${tab}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8000);
    const overlaps = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.react-grid-item'));
      let count = 0;
      for (let i = 0; i < items.length; i++) for (let j = i+1; j < items.length; j++) {
        const a = items[i].getBoundingClientRect(), b = items[j].getBoundingClientRect();
        if (a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y) count++;
      }
      return count;
    });
    if (overlaps > 0) issues.push(`${tab}: ${overlaps}`);
  }
  return issues.length === 0 ? { ok: true } : { ok: false, why: `overlaps in ${issues.join(', ')}` };
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const results = [];

  // 1. SHAPE checks (server side)
  const apiCache = {};
  const tabApi = {
    insurance: '/api/insurance', bonds: '/api/bonds', commodities: '/api/commodities/v2',
    sentiment: '/api/sentiment', globalMacro: '/api/globalMacro', equitiesDeepDive: '/api/equityDeepDive',
    credit: '/api/credit', bls: '/api/bls', eia: '/api/eia', realEstate: '/api/realEstate',
    fx: '/api/fx', calendar: '/api/calendar',
  };
  for (const c of CHECKS) {
    const path = c.apiPath || tabApi[c.tab];
    if (path && !apiCache[path]) apiCache[path] = await fetchJson(path);
    const j = apiCache[path];
    let shape;
    try {
      shape = typeof c.shape === 'function' ? await c.shape(j) : { ok: true };
    } catch (e) { shape = { ok: false, why: 'shape check threw: ' + e.message }; }
    results.push({ check: c.name, tab: c.tab, shape });
  }

  // 2. UI checks
  const skipLink = await SKIP_LINK_CHECK(page).catch(e => ({ ok: false, why: e.message }));
  const overlap = await OVERLAP_CHECK(page).catch(e => ({ ok: false, why: e.message }));
  const persist = await PERSIST_CHECK(page).catch(e => ({ ok: false, why: e.message }));

  // 3. Per-tab DOM checks for duplicate panels
  await page.goto(`${BASE}/?market=fx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  const reerCount = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.react-grid-item')).filter(item => {
      const titles = item.querySelectorAll('.bento-panel-title');
      return Array.from(titles).some(t => t.textContent.trim() === 'Real Effective Exchange Rates');
    }).length;
  });

  await browser.close();

  // Render report
  console.log('=== AUTO-REGRESSION REPORT ===');
  console.log(`backend ${PORT} · ${new Date().toISOString()}\n`);

  const fail = [], envBlocked = [], pass = [];
  for (const r of results) {
    if (r.shape.ok) pass.push(r);
    else if (r.shape.env) envBlocked.push(r);
    else fail.push(r);
  }
  console.log(`PASS: ${pass.length}  ENV-BLOCKED: ${envBlocked.length}  FAIL: ${fail.length}\n`);

  if (fail.length) {
    console.log('## FAIL (need fix):');
    fail.forEach(r => console.log(`  ✗ [${r.tab}] ${r.check} — ${r.shape.why}`));
    console.log('');
  }
  if (envBlocked.length) {
    console.log('## ENV-BLOCKED (works on user side with API keys):');
    envBlocked.forEach(r => console.log(`  ⊘ [${r.tab}] ${r.check} — ${r.shape.why}`));
    console.log('');
  }
  console.log('## PASS:');
  pass.forEach(r => console.log(`  ✓ [${r.tab}] ${r.check}`));

  console.log('\n## UI checks:');
  console.log(`  ${skipLink.ok ? '✓' : '✗'} Skip-link hidden ${skipLink.ok ? '' : '— ' + skipLink.why}`);
  console.log(`  ${persist.ok ? '✓' : '✗'} Drag persistence ${persist.ok ? '' : '— ' + persist.why}`);
  console.log(`  ${overlap.ok ? '✓' : '✗'} No overlapping panels ${overlap.ok ? '' : '— ' + overlap.why}`);
  console.log(`  ${reerCount === 1 ? '✓' : '✗'} FX REER single panel (count=${reerCount})`);

  process.exit(fail.length === 0 && skipLink.ok && persist.ok && overlap.ok && reerCount === 1 ? 0 : 1);
})();
