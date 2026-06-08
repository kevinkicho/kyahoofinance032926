import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);

// Hover over Hang Seng
const pill = await page.locator('.market-kpi-pill').filter({ hasText: 'Hang Seng' }).first();
const pbox = await pill.boundingBox();
await pill.hover();
await page.waitForTimeout(4000);

const popoverInfo = await page.evaluate(() => {
  const popover = [...document.body.children].find(e => getComputedStyle(e).position === 'fixed' && parseInt(getComputedStyle(e).zIndex) > 1000);
  if (!popover) return null;
  const r = popover.getBoundingClientRect();
  return { rect: { x: r.x, y: r.y, width: r.width, height: r.height }, svgs: popover.querySelectorAll('svg').length };
});
console.log('Popover:', JSON.stringify(popoverInfo));

if (popoverInfo) {
  await page.screenshot({
    path: '/tmp/ki-popover.png',
    clip: { x: Math.max(0, popoverInfo.rect.x - 10), y: Math.max(0, popoverInfo.rect.y - 100), width: Math.min(800, popoverInfo.rect.width + 20), height: Math.min(900, popoverInfo.rect.height + 130) }
  });
  console.log('Saved /tmp/ki-popover.png');
}
await browser.close();
