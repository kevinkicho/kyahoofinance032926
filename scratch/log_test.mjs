import { chromium } from 'playwright';
import { createServer } from 'http';
import { createReadStream, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

const DIST = '/mnt/c/Users/kevin/Workspace/kyahoofinance032926/dist';
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};
const PREFIX = '/kyahoofinance032926';

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
await page.waitForTimeout(5000);

// Click bonds tab
await page.locator('button[data-market="bonds"]').click();
await page.waitForTimeout(2000);

// Hover insurance tab
await page.evaluate(() => {
  const btn = document.querySelector('button[data-market="insurance"]');
  const w = btn?.closest('.market-tab-wrapper');
  if (w) w.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
});
await page.waitForTimeout(500);

// Read log from localStorage
const log = await page.evaluate(() => {
  return window.__APP_LOG?.get() || [];
});

console.log(`\n=== Log entries: ${log.length} ===`);
log.forEach(e => {
  console.log(`[${e.type}] ${JSON.stringify(e).slice(0, 200)}`);
});

// Also read from localStorage directly
const storedLog = await page.evaluate(() => {
  const raw = localStorage.getItem('app-log');
  return raw ? JSON.parse(raw) : [];
});
console.log(`\n=== Stored log entries: ${storedLog.length} ===`);

server.close();
await browser.close();
