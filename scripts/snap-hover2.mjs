import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const histReqs = [];
page.on('response', r => { if (r.url().includes('/api/history/')) histReqs.push({ url: r.url(), status: r.status() }); });

await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);

const pill = await page.locator('.market-kpi-pill').filter({ hasText: 'STAR 50' }).first();
await pill.hover();
await page.waitForTimeout(5000);    // generous wait for fetch

console.log('History requests:', histReqs);

const popoverInfo = await page.evaluate(() => {
  const popover = [...document.body.children].find(e => getComputedStyle(e).position === 'fixed' && parseInt(getComputedStyle(e).zIndex) > 1000);
  if (!popover) return null;
  const r = popover.getBoundingClientRect();
  return { rect: r, fullHtml: popover.innerHTML.slice(0, 800), svgCount: popover.querySelectorAll('svg').length };
});
console.log('Popover:', JSON.stringify(popoverInfo, null, 2));

if (popoverInfo) {
  await page.screenshot({
    path: '/tmp/ki-popover.png',
    clip: { x: Math.max(0, popoverInfo.rect.x - 10), y: Math.max(0, popoverInfo.rect.y - 80), width: Math.min(800, popoverInfo.rect.width + 20), height: Math.min(900, popoverInfo.rect.height + 120) }
  });
  console.log('Saved /tmp/ki-popover.png');
}
await browser.close();
