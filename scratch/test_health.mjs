import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.argv[2] || 'https://kevinkicho.github.io/kyahoofinance032926/';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
});
const page = await context.newPage();

const logs = [];
page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

console.log(`Navigating to ${URL}...`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(8000);

const markets = ['equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance', 'commodities', 'globalMacro', 'crypto', 'credit', 'sentiment', 'calendar', 'bls', 'eia'];

const results = {};

for (const marketId of markets) {
  console.log(`\n=== ${marketId} ===`);

  // Click the tab to make it active
  const tab = page.locator(`button[data-market="${marketId}"]`);
  if (await tab.count() === 0) {
    console.log(`  Tab not found`);
    continue;
  }
  await tab.click();
  await page.waitForTimeout(3000);

  // Hover the tab wrapper to open dropdown
  const wrapper = page.locator(`.market-tab-wrapper`).filter({ has: tab });
  await wrapper.hover({ force: true });
  await page.waitForTimeout(500);

  // Read everything via evaluate
  const data = await page.evaluate(() => {
    const dropdown = document.querySelector('.market-panel-dropdown');
    const items = dropdown ? Array.from(dropdown.querySelectorAll('.market-panel-dropdown-item')) : [];
    const dropdownStatuses = {};
    items.forEach(item => {
      const title = item.querySelector('.panel-dropdown-title')?.textContent?.trim() || '';
      const dot = item.querySelector('.panel-dropdown-status-dot');
      const status = dot?.getAttribute('data-status') || 'none';
      const badge = item.querySelector('.panel-dropdown-badge')?.textContent?.trim() || '';
      dropdownStatuses[title] = { status, badge };
    });

    const els = document.querySelectorAll('[data-panel-key]');
    const rendered = {};
    els.forEach(el => {
      const key = el.getAttribute('data-panel-key');
      if (!key) return;
      const text = el.textContent || '';
      const footer = el.querySelector('.bento-footer, [class*="footer"]');
      const footerText = footer?.textContent || '';
      rendered[key] = {
        hasUnavailable: /unavailable|no data/i.test(text),
        isStale: /stale/i.test(footerText),
      };
    });

    return { dropdownStatuses, rendered, itemCount: items.length };
  });

  console.log(`  Dropdown items: ${data.itemCount}`);
  console.log(`  Rendered panels: ${Object.keys(data.rendered).length}`);

  const mismatches = [];
  for (const [title, dd] of Object.entries(data.dropdownStatuses)) {
    const panelKey = Object.keys(data.rendered).find(k => k.includes(title) || title.includes(k));
    const dom = panelKey ? data.rendered[panelKey] : null;

    if (!dom) {
      if (dd.status !== 'not-rendered' && dd.status !== 'null' && dd.status !== 'unknown') {
        mismatches.push({ title, dropdown: dd.status, dom: 'NOT_RENDERED' });
      }
    } else if (dom.hasUnavailable && dd.status !== 'null') {
      mismatches.push({ title, dropdown: dd.status, dom: 'UNAVAILABLE' });
    } else if (dom.isStale && dd.status !== 'stale') {
      mismatches.push({ title, dropdown: dd.status, dom: 'STALE' });
    } else if (!dom.hasUnavailable && !dom.isStale && dd.status === 'null') {
      mismatches.push({ title, dropdown: dd.status, dom: 'OK' });
    }
  }

  results[marketId] = {
    dropdownItems: data.itemCount,
    renderedPanels: Object.keys(data.rendered).length,
    mismatches,
  };

  if (mismatches.length === 0) {
    console.log(`  ✅ All match`);
  } else {
    console.log(`  ❌ ${mismatches.length} mismatches:`);
    mismatches.forEach(m => console.log(`    ${m.title}: dropdown=${m.dropdown} dom=${m.dom}`));
  }
}

let total = 0;
console.log('\n\n=== SUMMARY ===');
for (const [market, r] of Object.entries(results)) {
  if (r.mismatches?.length) {
    console.log(`❌ ${market}: ${r.mismatches.length} mismatches`);
    total += r.mismatches.length;
  } else {
    console.log(`✅ ${market}: ${r.dropdownItems} dropdown, ${r.renderedPanels} rendered`);
  }
}
console.log(`\nTotal mismatches: ${total}`);

writeFileSync('/tmp/opencode/health_test.json', JSON.stringify(results, null, 2));
await browser.close();
