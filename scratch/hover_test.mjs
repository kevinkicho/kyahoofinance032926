import { chromium } from 'playwright';
import { createServer } from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, extname } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

const DIST = '/mnt/c/Users/kevin/Workspace/kyahoofinance032926/dist';
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const PREFIX = '/kyahoofinance032926';
const OUT = '/mnt/c/Users/kevin/Workspace/kyahoofinance032926/screenshots';
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

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();

await page.goto(`http://127.0.0.1:${PORT}`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(5000); // Wait for all markets to fetch

const markets = ['equities','bonds','fx','derivatives','realEstate','insurance','commodities','globalMacro','crypto','credit','sentiment','calendar','bls','eia'];

console.log('=== Hovering each tab WITHOUT clicking first ===');
const results = {};

for (const m of markets) {
  // Hover ONLY — no clicking
  await page.evaluate((marketId) => {
    const btn = document.querySelector(`button[data-market="${marketId}"]`);
    const wrapper = btn?.closest('.market-tab-wrapper');
    if (wrapper) wrapper.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
  }, m);
  await page.waitForTimeout(300);

  // Read dropdown
  const items = page.locator('.market-panel-dropdown-item');
  const count = await items.count();
  const dropdown = {};
  for (let i = 0; i < count; i++) {
    const item = items.nth(i);
    const title = (await item.locator('.panel-dropdown-title').textContent()) || '';
    const dot = item.locator('.panel-dropdown-status-dot');
    const status = (await dot.getAttribute('data-status')) || 'none';
    dropdown[title.trim()] = status;
  }

  // Screenshot
  await page.screenshot({ path: `${OUT}/${m}_hover.png` });

  // Summary
  const green = Object.values(dropdown).filter(s => s === 'ok').length;
  const red = Object.values(dropdown).filter(s => s === 'null').length;
  const grey = Object.values(dropdown).filter(s => s === 'unknown').length;
  const orange = Object.values(dropdown).filter(s => s === 'stale').length;
  console.log(`${m}: ${count} items — ${green} green, ${red} red, ${grey} grey, ${orange} orange`);

  results[m] = { total: count, green, red, grey, orange, items: dropdown };

  // Move mouse away to close dropdown
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
}

// Summary
console.log('\n=== SUMMARY ===');
let totalGreen = 0, totalRed = 0, totalGrey = 0;
for (const [m, r] of Object.entries(results)) {
  totalGreen += r.green;
  totalRed += r.red;
  totalGrey += r.grey;
  const status = r.red > 0 ? `${r.green} green, ${r.red} red, ${r.grey} grey` : `${r.green} green, ${r.grey} grey`;
  console.log(`${m}: ${r.total} items — ${status}`);
}
console.log(`\nTotal: ${totalGreen} green, ${totalRed} red, ${totalGrey} grey`);

writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 2));
server.close();
await browser.close();
console.log('Done.');
