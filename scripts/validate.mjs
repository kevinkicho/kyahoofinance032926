// Comprehensive UI validation against the running app. For every tab
// that's been complained about, screenshot the page and dump the panel
// state (badge, body content). Output goes to test-results/validate/.
//
// Run from anywhere — paths are resolved relative to the project root
// (this file's location). `npm run test:validate` is the friendly entry.
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT_FILE = path.join(PROJECT_ROOT, '.server-port');

let PORT;
try { PORT = readFileSync(PORT_FILE, 'utf8').trim(); }
catch { console.error(`error: ${PORT_FILE} not found — start the app first with \`npm start\``); process.exit(1); }
const BASE = `http://localhost:5173`;
const OUT_DIR = path.join(PROJECT_ROOT, 'test-results', 'validate');

mkdirSync(OUT_DIR, { recursive: true });

// Tabs the user has reported issues with at any point.
const TABS = [
  'equities', 'commodities', 'credit', 'bonds', 'realEstate', 'insurance',
  'sentiment', 'globalMacro', 'fx', 'equitiesDeepDive', 'calendar',
  'bls', 'eia', 'derivatives', 'crypto', 'analytics',
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push({ tab: '?', msg: e.message.slice(0,150) }));
page.on('console', m => { if (m.type() === 'error') errors.push({ tab: '?', msg: m.text().slice(0,150) }); });

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());

const report = [];
for (const t of TABS) {
  errors.length = 0;
  try {
    await page.goto(`${BASE}/?market=${t}`, { waitUntil: 'domcontentloaded' });
    // Cold-cache fetches with API keys can take 20+s for FRED-heavy
    // routes (bonds, realEstate). Wait 30s before probing the DOM.
    await page.waitForTimeout(30000);
    const panels = await page.evaluate(() => {
      // Most dashboards use `[market]-bento-card`, but BLS standardised on
      // `bls-bento-panel`. Match both so the validator finds every panel.
      return Array.from(document.querySelectorAll('[class*="bento-card"], [class*="bento-panel"]:not([class*="bento-panel-content"]):not([class*="bento-panel-title-row"])')).map(c => {
        const title = (c.querySelector('[class*="panel-title"]')?.textContent || '?').trim().slice(0, 60);
        const badge = c.querySelector('.df-fetched, .df-static, .df-pending')?.textContent?.trim() || '';
        const body = (c.querySelector('.bento-panel-content')?.textContent || '').replace(/\s+/g,' ').trim();
        const charts = c.querySelectorAll('canvas, svg').length;
        // Heuristic: a panel is "bound" if it shows ANY of:
        //  · at least one chart canvas/svg
        //  · a number that's not just an em-dash placeholder
        //  · explicit FETCHED badge
        // It's "empty" if it says "no data" / em-dashes only / placeholder.
        const numericChars = (body.match(/\d/g) || []).length;
        const placeholderOnly = /^([\s—\-NA?]|null|—|N\/A)+$/i.test(body) || (numericChars === 0 && body.length < 40);
        const sayingNoData = /no .{0,20}data|temporarily unavailable|not configured/i.test(body);
        const hasData = !sayingNoData && (charts > 0 || (numericChars >= 2 && !placeholderOnly) || badge === 'FETCHED');
        const isEmpty = sayingNoData || (badge === 'NO DATA' && charts === 0) || (placeholderOnly && charts === 0);
        return { title, badge, charts, bodyLen: body.length, bodyPeek: body.slice(0, 100), hasData, isEmpty };
      });
    });
    await page.screenshot({ path: `${OUT_DIR}/${t}.png`, fullPage: true });
    report.push({ tab: t, panels, errors: errors.slice() });
    const ok = panels.filter(p => p.hasData).length;
    const bad = panels.filter(p => p.isEmpty).length;
    console.log(`${t.padEnd(20)} ${panels.length} panels · ${ok} bound · ${bad} empty · errors=${errors.length}`);
  } catch (e) {
    report.push({ tab: t, error: e.message });
    console.log(`${t.padEnd(20)} ERROR: ${e.message.slice(0,80)}`);
  }
}

// Markdown report
const md = ['# Tab Validation Report\n', `${new Date().toISOString()}\n`];
for (const r of report) {
  md.push(`## ${r.tab}`);
  if (r.error) { md.push(`> nav error: ${r.error}\n`); continue; }
  md.push(`Screenshot: ![${r.tab}](validate/${r.tab}.png)\n`);
  md.push('| panel | badge | data | charts | body peek |');
  md.push('|---|---|---|---|---|');
  r.panels.forEach(p => md.push(`| ${p.title} | ${p.badge || '-'} | ${p.hasData ? '✓' : (p.isEmpty ? '✗' : '?')} | ${p.charts} | ${(p.bodyPeek || '').replace(/\|/g,'/').slice(0,60)} |`));
  if (r.errors?.length) {
    md.push('\nErrors:');
    [...new Set(r.errors.map(e => e.msg))].slice(0,5).forEach(m => md.push(`- ${m}`));
  }
  md.push('');
}
const reportPath = path.join(PROJECT_ROOT, 'test-results', 'validate.md');
writeFileSync(reportPath, md.join('\n'));
writeFileSync(path.join(PROJECT_ROOT, 'test-results', 'validate.json'), JSON.stringify(report, null, 2));
console.log(`\nReport: ${reportPath}`);
await browser.close();
