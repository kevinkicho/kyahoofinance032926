import { chromium } from 'playwright';
import { createServer } from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const DIST = '/mnt/c/Users/kevin/Workspace/kyahoofinance032926/dist';
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const PREFIX = '/kyahoofinance032926';
const OUT = '/tmp/opencode/health_test';
const { mkdirSync, writeFileSync } = await import('fs');
mkdirSync(OUT, { recursive: true });

const server = createServer((req, res) => {
  let url = req.url.split('?')[0];
  if (url.startsWith(PREFIX)) url = url.slice(PREFIX.length);
  if (!url.startsWith('/')) url = '/' + url;
  let f = join(DIST, url);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(DIST, 'index.html');
  const ext = extname(f);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  createReadStream(f).pipe(res);
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
console.log(`Server on port ${PORT}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000);

const markets = ['equities','bonds','fx','derivatives','realEstate','insurance','commodities','globalMacro','crypto','credit','sentiment','calendar','bls','eia'];

// Phase 1: Click each tab to populate cache
console.log('=== Phase 1: Click all tabs to populate cache ===');
for (const m of markets) {
  const tab = page.locator(`button[data-market="${m}"]`);
  if (await tab.count() === 0) continue;
  await tab.click();
  await page.waitForTimeout(1500);
}

// Phase 2: Hover each tab and check dropdown status
console.log('\n=== Phase 2: Hover tabs and check dropdown status ===');
const allResults = {};

for (const m of markets) {
  const tab = page.locator(`button[data-market="${m}"]`);
  if (await tab.count() === 0) continue;

  // Click to make it active
  await tab.click();
  await page.waitForTimeout(1500);

  // Hover to open dropdown
  await page.evaluate((marketId) => {
    const btn = document.querySelector(`button[data-market="${marketId}"]`);
    const wrapper = btn?.closest('.market-tab-wrapper');
    if (wrapper) wrapper.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }, m);
  await page.waitForTimeout(500);

  // Read dropdown
  const items = page.locator('.market-panel-dropdown-item');
  const count = await items.count();
  const dropdown = {};
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const title = (await item.locator('.panel-dropdown-title').textContent()) || '';
    const dot = item.locator('.panel-dropdown-status-dot');
    const status = (await dot.getAttribute('data-status')) || 'none';
    const badgeEl = item.locator('.panel-dropdown-badge');
    const badge = (await badgeEl.count()) > 0 ? (await badgeEl.textContent()) : '';
    dropdown[title.trim()] = { status, badge: badge.trim() };
  }

  // Read DOM panels
  const domPanels = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-panel-key]');
    const map = {};
    els.forEach(el => {
      const key = el.getAttribute('data-panel-key');
      if (!key) return;
      const text = el.textContent || '';
      const footer = el.querySelector('[class*="footer"]');
      const footerText = footer?.textContent || '';
      map[key] = { unavailable: /unavailable|no data/i.test(text), stale: /stale/i.test(footerText) };
    });
    return map;
  });

  // Screenshot
  await page.screenshot({ path: `${OUT}/${m}_hover.png` });

  // Compare - use panel IDs from marketPanels to match dropdown to DOM
  const mismatches = [];
  // Get panel IDs from marketPanels (dropdown uses titles, DOM uses IDs)
  const panelIds = await page.evaluate((mktId) => {
    // Import marketPanels dynamically
    const panels = window.__MARKET_PANELS__?.[mktId] || [];
    return panels.map(p => ({ id: p.id, title: p.title }));
  }, m);

  for (const panel of panelIds) {
    const ddEntry = dropdown[panel.title];
    const domStatus = domPanels[panel.id];

    if (!ddEntry) continue; // Panel not in dropdown

    if (domStatus) {
      // Panel in DOM — check if status matches
      const expectedStatus = domStatus.unavailable ? 'null' : domStatus.stale ? 'stale' : 'ok';
      if (ddEntry.status !== expectedStatus) {
        mismatches.push({ title: panel.title, id: panel.id, dropdown: ddEntry.status, expected: expectedStatus });
      }
    } else {
      // Panel not in DOM
      if (ddEntry.status !== 'unknown' && ddEntry.status !== 'null') {
        mismatches.push({ title: panel.title, id: panel.id, dropdown: ddEntry.status, expected: 'unknown (not rendered)' });
      }
    }
  }

  allResults[m] = { dropdown: count, dom: Object.keys(domPanels).length, mismatches };

  const sym = mismatches.length === 0 ? '✅' : '❌';
  console.log(`${sym} ${m}: ${count} dropdown, ${Object.keys(domPanels).length} DOM${mismatches.length ? `, ${mismatches.length} MISMATCHES` : ''}`);
  mismatches.slice(0, 5).forEach(mm => console.log(`    ${mm.title} (${mm.id}): dropdown=${mm.dropdown}, expected=${mm.expected}`));
}

// Summary
console.log('\n=== SUMMARY ===');
let totalMM = 0;
for (const [m, r] of Object.entries(allResults)) {
  if (r.mismatches.length) { totalMM += r.mismatches.length; console.log(`❌ ${m}: ${r.mismatches.length} mismatches`); }
  else { console.log(`✅ ${m}: ${r.dropdown} dropdown, ${r.dom} DOM`); }
}
console.log(`\nTotal mismatches: ${totalMM}`);
if (errors.length) console.log(`Console errors: ${errors.length}`);

writeFileSync(`${OUT}/results.json`, JSON.stringify(allResults, null, 2));
server.close();
await browser.close();
console.log('Done.');
