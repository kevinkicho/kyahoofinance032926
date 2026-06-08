import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/?market=commodities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);
// Click Heatmap toggle
await page.evaluate(() => {
  for (const c of document.querySelectorAll('[class*="bento-card"]')) {
    const txt = c.querySelector('.bento-panel-title')?.textContent?.trim();
    if (txt === 'Sector Performance') {
      c.querySelectorAll('button').forEach(b => { if (/heatmap/i.test(b.textContent)) b.click(); });
    }
  }
});
await page.waitForTimeout(1000);
const el = await page.evaluateHandle(() => {
  for (const c of document.querySelectorAll('[class*="bento-card"]')) {
    const txt = c.querySelector('.bento-panel-title')?.textContent?.trim();
    if (txt === 'Sector Performance') return c;
  }
  return null;
});
const box = await el.boundingBox();
if (box) {
  await page.screenshot({ path: '/tmp/sector-heatmap.png', clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  console.log('Saved /tmp/sector-heatmap.png size:', Math.round(box.width) + 'x' + Math.round(box.height));
}
await browser.close();
