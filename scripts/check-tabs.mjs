import { chromium } from '@playwright/test';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT_FILE = path.resolve(__dirname, '..', '.server-port');
const PORT = readFileSync(PORT_FILE, 'utf8').trim();
const BASE = `http://localhost:5173/kyahoofinance032926`;

const TABS = [
  'equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const results = [];
for (const tab of TABS) {
  const errors = [];
  page.on('pageerror', e => errors.push({ type: 'pageerror', msg: e.message.slice(0, 200) }));
  page.on('console', m => { if (m.type() === 'error') errors.push({ type: 'console', msg: m.text().slice(0, 200) }); });

  try {
    await page.goto(`${BASE}/?market=${tab}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000);
    const title = await page.title().catch(() => '(no title)');
    results.push({ tab, ok: true, title, errors: errors.slice(0, 10) });
  } catch (e) {
    results.push({ tab, ok: false, error: e.message.slice(0, 200), errors: errors.slice(0, 10) });
  }
}

await browser.close();

let pass = 0, fail = 0;
for (const r of results) {
  const status = r.ok ? '✓' : '✗';
  if (r.ok) pass++; else fail++;
  console.log(`${status} ${r.tab.padEnd(20)} ${r.ok ? r.title : r.error}`);
  if (r.errors.length) {
    for (const e of r.errors) console.log(`   ${e.type}: ${e.msg}`);
  }
}
console.log(`\nTabs: ${TABS.length} total, ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
