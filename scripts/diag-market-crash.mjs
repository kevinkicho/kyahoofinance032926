import { chromium } from 'playwright';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const MARKETS = (process.env.DIAG_MARKETS || 'bonds,realEstate').split(',');

const browser = await chromium.launch({ headless: true });
for (const mid of MARKETS) {
  const page = await browser.newPage();
  const errors = [];
  const cons = [];
  page.on('pageerror', (e) => errors.push(String(e.stack || e.message || e).slice(0, 800)));
  page.on('console', (m) => {
    if (m.type() === 'error') cons.push(m.text().slice(0, 400));
  });
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
  });
  await page.goto(`${BASE}/?market=${encodeURIComponent(mid)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000,
  });
  for (let i = 0; i < 15; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    } else break;
  }
  await page.waitForTimeout(20000);
  const info = await page.evaluate(() => {
    const text = document.body?.innerText || '';
    return {
      title: document.title,
      crashed: /something went wrong|ErrorBoundary|crashed/i.test(text),
      panels: document.querySelectorAll('[data-panel-key]').length,
      bento: document.querySelectorAll('.bento-card, .react-grid-item').length,
      peek: text.slice(0, 500).replace(/\s+/g, ' '),
    };
  });
  console.log(`=== ${mid} ===`);
  console.log(JSON.stringify(info, null, 2));
  console.log('pageErrors:', errors);
  console.log('consoleErrors:', cons.slice(0, 10));
  await page.screenshot({ path: `screenshots/debug-${mid}.png`, fullPage: true });
  await page.close();
}
await browser.close();
