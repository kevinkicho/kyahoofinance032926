/**
 * Quick hosted market probe: panel counts + page errors per tab.
 *   node scripts/probe-hosted-markets.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const MARKETS = (process.env.PROBE_MARKETS || 'bonds,realEstate,credit,globalMacro,bls,eia,crypto,fx,insurance,derivatives,sentiment,commodities').split(',');
const SETTLE = Number(process.env.PROBE_SETTLE_MS || 14000);

async function dismissSplash(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
  });
  for (let i = 0; i < 20; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      if (!(await page.locator('.splash-screen, .splash-overlay').count())) return;
    } else return;
    await page.waitForTimeout(400);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  for (const mid of MARKETS) {
    const pageErrors = [];
    const onErr = (e) => pageErrors.push(String(e?.message || e).slice(0, 180));
    page.on('pageerror', onErr);

    await page.goto(`${BASE}/?market=${encodeURIComponent(mid)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismissSplash(page);
    await page.waitForTimeout(SETTLE);

    const stats = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('[data-panel-key]')];
      const keys = [...new Set(cards.map((c) => c.getAttribute('data-panel-key')))];
      const body = document.body?.innerText || '';
      const crashed = /crashed|something went wrong|ErrorBoundary/i.test(body);
      const pending = cards.filter((c) => /PENDING|WAITING|LOADING/i.test(c.textContent || '')).length;
      const empty = cards.filter((c) => {
        const t = (c.textContent || '').replace(/\s+/g, ' ');
        return /no data|unavailable|not configured/i.test(t) && t.length < 180;
      }).length;
      return {
        panels: keys.length,
        pending,
        empty,
        crashed,
        sample: keys.slice(0, 10),
        peek: body.slice(0, 120).replace(/\s+/g, ' '),
      };
    });

    page.off('pageerror', onErr);
    const row = { market: mid, ...stats, pageErrors: pageErrors.slice(0, 4) };
    results.push(row);
    console.log(JSON.stringify(row));
  }

  await browser.close();

  const bad = results.filter((r) => r.crashed || r.panels === 0 || r.pageErrors.length);
  console.log('\n--- summary ---');
  console.log(`ok-ish: ${results.filter((r) => !r.crashed && r.panels > 0).length}/${results.length}`);
  if (bad.length) {
    console.log('problem markets:', bad.map((b) => b.market).join(', '));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
