import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';

const URL = 'http://127.0.0.1:5175/kyahoofinance032926/';
mkdirSync('/tmp/opencode/screenshots', { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await context.newPage();

const logs = [];
page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

console.log(`Navigating to ${URL}...`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);

const markets = ['equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance', 'commodities', 'globalMacro', 'crypto', 'credit', 'sentiment', 'calendar', 'bls', 'eia'];

for (const marketId of markets) {
  console.log(`\n=== ${marketId} ===`);

  // Click tab to make it active
  const tab = page.locator(`button[data-market="${marketId}"]`);
  if (await tab.count() === 0) { console.log(`  Tab not found`); continue; }
  await tab.click();
  await page.waitForTimeout(3000);

  // Screenshot the panel viewport (scroll down to show panels)
  await page.screenshot({ path: `/tmp/opencode/screenshots/${marketId}_viewport.png`, fullPage: false });
  console.log(`  Saved ${marketId}_viewport.png`);

  // Hover the wrapper to open dropdown
  const wrapper = page.locator('.market-tab-wrapper').filter({ has: tab });
  if (await wrapper.count() > 0) {
    await wrapper.hover({ force: true });
    await page.waitForTimeout(500);
    // Screenshot with dropdown visible
    await page.screenshot({ path: `/tmp/opencode/screenshots/${marketId}_dropdown.png`, fullPage: false });
    console.log(`  Saved ${marketId}_dropdown.png`);
    // Move mouse away to close dropdown
    await page.mouse.move(0, 0);
    await page.waitForTimeout(200);
  }

  // Read DOM state
  const data = await page.evaluate(() => {
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
      };
    });
    return rendered;
  });
  console.log(`  Rendered panels (${Object.keys(data).length}): ${Object.keys(data).join(', ')}`);
}

// Check console errors
const errors = logs.filter(l => l.type === 'error' || l.text?.includes('structural guard') || l.text?.includes('hasNonNullData'));
console.log(`\n=== Console Errors (${errors.length}) ===`);
errors.forEach(e => console.log(`  [${e.type}] ${e.text?.slice(0, 200)}`));

writeFileSync('/tmp/opencode/screenshots/panel_state.json', JSON.stringify({ logs: errors }, null, 2));
await browser.close();
console.log('\nDone.');
