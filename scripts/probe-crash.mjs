/**
 * Hosted crash probe: load each market and collect pageerror + ErrorBoundary text.
 *   node scripts/probe-crash.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const MARKETS = (process.env.PROBE_MARKETS
  || 'equities,bonds,fx,derivatives,realEstate,insurance,commodities,globalMacro,equitiesDeepDive,crypto,credit,sentiment,calendar,bls,eia,alerts,watchlist,analytics')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const SETTLE = Number(process.env.PROBE_SETTLE_MS || 10000);

async function dismissSplash(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
  });
  for (let i = 0; i < 15; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(250);
      if (!(await page.locator('.splash-screen, .splash-overlay').count())) return;
    } else return;
    await page.waitForTimeout(300);
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = [];

for (const mid of MARKETS) {
  const pageErrors = [];
  const consoleErrors = [];
  const onPage = (e) => pageErrors.push(String(e?.message || e).slice(0, 300));
  const onConsole = (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 220));
  };
  page.on('pageerror', onPage);
  page.on('console', onConsole);

  try {
    await page.goto(`${BASE}/?market=${encodeURIComponent(mid)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissSplash(page);
    await page.waitForTimeout(SETTLE);

    const stats = await page.evaluate(() => {
      const body = document.body?.innerText || '';
      const crashed = /crashed|something went wrong|ErrorBoundary|Market Hub.*crashed/i.test(body);
      const panels = document.querySelectorAll('[data-panel-key], .bento-panel-title, .bento-panel-title-row').length;
      return {
        crashed,
        panels,
        peek: body.slice(0, 180).replace(/\s+/g, ' '),
      };
    });

    const row = {
      market: mid,
      ...stats,
      pageErrors: pageErrors.slice(0, 5),
      consoleErrors: consoleErrors.filter((t) => !/favicon|WebSocket/i.test(t)).slice(0, 5),
    };
    results.push(row);
    const mark = row.crashed || row.pageErrors.length ? 'CRASH' : row.panels === 0 ? 'EMPTY' : 'OK';
    console.log(JSON.stringify({ mark, ...row }));
  } catch (e) {
    results.push({ market: mid, crashed: true, error: String(e?.message || e).slice(0, 200) });
    console.log(JSON.stringify({ mark: 'FAIL', market: mid, error: String(e?.message || e).slice(0, 200) }));
  }

  page.off('pageerror', onPage);
  page.off('console', onConsole);
}

await browser.close();

const bad = results.filter((r) => r.crashed || (r.pageErrors && r.pageErrors.length) || r.panels === 0);
console.log('\n--- summary ---');
console.log(`ok: ${results.length - bad.length}/${results.length}`);
if (bad.length) {
  console.log('problems:', bad.map((b) => b.market).join(', '));
  process.exitCode = 1;
}
