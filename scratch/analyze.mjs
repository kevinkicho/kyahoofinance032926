import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const URL = 'http://127.0.0.1:5175/kyahoofinance032926/';
mkdirSync('/tmp/opencode/screenshots', { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

console.log(`Navigating to ${URL}...`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(5000);

const markets = ['equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance', 'commodities', 'globalMacro', 'crypto', 'credit', 'sentiment', 'calendar', 'bls', 'eia'];

for (const marketId of markets) {
  console.log(`\n=== ${marketId} ===`);
  const tab = page.locator(`button[data-market="${marketId}"]`);
  if (await tab.count() === 0) { console.log(`  Tab not found`); continue; }
  await tab.click();
  await page.waitForTimeout(2000);

  // Read rendered panels from DOM
  const panels = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-panel-key]');
    const rendered = {};
    els.forEach(el => {
      const key = el.getAttribute('data-panel-key');
      if (!key) return;
      const text = el.textContent || '';
      const footer = el.querySelector('[class*="footer"]');
      const footerText = footer?.textContent || '';
      rendered[key] = {
        unavailable: /unavailable|no data/i.test(text),
        stale: /stale/i.test(footerText),
        footer: footerText.substring(0, 60),
      };
    });
    return rendered;
  });

  console.log(`  Rendered (${Object.keys(panels).length}):`);
  for (const [k, v] of Object.entries(panels)) {
    const status = v.unavailable ? 'UNAVAILABLE' : v.stale ? 'STALE' : 'OK';
    console.log(`    ${k}: ${status}`);
  }
}

await browser.close();
console.log('\nDone.');
