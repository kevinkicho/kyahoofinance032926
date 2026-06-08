import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const responses = [];
page.on('response', async r => {
  if (r.url().includes('/api/treasury/auctions')) {
    try {
      const body = await r.text();
      responses.push({ status: r.status(), len: body.length, snippet: body.slice(0, 300) });
    } catch {}
  }
});
await page.goto('http://localhost:5173/?market=bonds', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);
console.log('Auction responses:');
responses.forEach(r => console.log('  status=' + r.status + ' len=' + r.len + '\n  ' + r.snippet));
await browser.close();
