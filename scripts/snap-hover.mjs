import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);

const pill = await page.evaluateHandle(() => {
  for (const l of document.querySelectorAll('.market-kpi-label')) {
    if (l.textContent.trim() === 'STAR 50') return l.closest('.market-kpi-pill');
  }
  return null;
});
const pbox = await pill.boundingBox();
await page.mouse.move(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2);
await page.waitForTimeout(3000);                  // let fetch complete
// Crop around pill + popover (popover is typically ~190px tall, below the pill)
await page.screenshot({
  path: '/tmp/ki-hover-tight.png',
  clip: { x: pbox.x - 50, y: pbox.y - 20, width: 380, height: 320 }
});
console.log('saved /tmp/ki-hover-tight.png');
await browser.close();
