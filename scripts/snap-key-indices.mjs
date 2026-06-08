import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);
const el = await page.evaluateHandle(() => {
  for (const c of document.querySelectorAll('[class*="bento-card"]')) {
    const txt = c.querySelector('.bento-panel-title')?.textContent?.trim();
    if (txt === 'Key Indices') return c;
  }
  return null;
});
const box = await el.boundingBox();
if (box) {
  await el.evaluate(node => node.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(500);
  const b2 = await el.boundingBox();
  await page.screenshot({ path: '/tmp/key-indices.png', clip: { x: b2.x, y: b2.y, width: b2.width, height: b2.height } });
  console.log('Saved /tmp/key-indices.png size:', Math.round(b2.width) + 'x' + Math.round(b2.height));
}
await browser.close();
