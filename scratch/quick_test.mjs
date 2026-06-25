import { chromium } from 'playwright';
import { createServer } from 'http';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

const DIST = '/mnt/c/Users/kevin/Workspace/kyahoofinance032926/dist';
const MIME = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml'};

const server = createServer((req, res) => {
  let fp = join(DIST, req.url.replace('/kyahoofinance032926/', '/'));
  if (fp.endsWith('/')) fp += '/index.html';
  if (!existsSync(fp)) fp = join(DIST, 'index.html');
  const ext = fp.substring(fp.lastIndexOf('.'));
  res.writeHead(200, {'Content-Type': MIME[ext]||'application/octet-stream'});
  createReadStream(fp).pipe(res);
});

await new Promise(r => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;
console.log(`Server on port ${PORT}`);

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 } })).newPage();

await page.goto(`http://127.0.0.1:${PORT}/kyahoofinance032926/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(3000);

const markets = ['equities','bonds','fx','derivatives','realEstate','insurance','commodities','globalMacro','crypto','credit','sentiment','calendar','bls','eia'];

for (const marketId of markets) {
  await page.locator(`button[data-market="${marketId}"]`).click();
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-panel-key]');
    const rendered = {};
    els.forEach(el => {
      const key = el.getAttribute('data-panel-key');
      if (!key) return;
      const text = el.textContent || '';
      const footer = el.querySelector('[class*="footer"]');
      const footerText = footer?.textContent || '';
      rendered[key] = { unavailable: /unavailable|no data/i.test(text), stale: /stale/i.test(footerText) };
    });
    return rendered;
  });

  const panels = Object.entries(data);
  const unavailable = panels.filter(([,v]) => v.unavailable);
  const stale = panels.filter(([,v]) => v.stale);
  console.log(`${marketId}: ${panels.length} rendered, ${unavailable.length} unavailable, ${stale.length} stale`);
  if (unavailable.length) console.log(`  UNAVAILABLE: ${unavailable.map(([k])=>k).join(', ')}`);
  if (stale.length) console.log(`  STALE: ${stale.map(([k])=>k).join(', ')}`);
}

server.close();
await browser.close();
