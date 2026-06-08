import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
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
console.log('Panel size:', box.width, 'x', box.height);
const hasFooter = await page.evaluate(() => {
  const card = [...document.querySelectorAll('[class*="bento-card"]')].find(c => c.querySelector('.bento-panel-title')?.textContent?.trim() === 'Key Indices');
  return !!card?.querySelector('.df-root');
});
console.log('DataFooter present in card:', hasFooter);

await el.evaluate(node => node.scrollIntoView({ block: 'start' }));
await page.waitForTimeout(400);
const b2 = await el.boundingBox();
await page.screenshot({ path: '/tmp/ki-full.png', clip: { x: b2.x, y: b2.y, width: b2.width, height: b2.height } });
console.log('Saved /tmp/ki-full.png');
await browser.close();
