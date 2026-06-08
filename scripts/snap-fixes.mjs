import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

async function snap(market, title, file) {
  await page.goto(`http://localhost:5173/?market=${market}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(20000);
  const el = await page.evaluateHandle((t) => {
    for (const c of document.querySelectorAll('[class*="bento-card"]')) {
      const txt = c.querySelector('.bento-panel-title')?.textContent?.trim();
      if (txt === t) return c;
    }
    return null;
  }, title);
  await el.evaluate(node => node.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const box = await el.boundingBox();
  if (box) {
    await page.screenshot({ path: file, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
    console.log('Saved ' + file + ' size:', Math.round(box.width) + 'x' + Math.round(box.height));
  }
}

await snap('bonds',       'Recent Auctions',     '/tmp/auctions-fixed.png');
await snap('bonds',       'Money Market',        '/tmp/money-fixed.png');
await snap('commodities', 'Sector Performance',  '/tmp/sector-fixed.png');
await snap('calendar',    'Key US Releases',     '/tmp/calendar-fixed.png');
await browser.close();
