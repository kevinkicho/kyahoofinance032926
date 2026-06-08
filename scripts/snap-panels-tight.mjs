import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/?market=bonds', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(22000);

// Find target panels and screenshot them tightly cropped.
const targets = [
  { title: 'Recent Auctions', file: '/tmp/auctions-panel.png' },
  { title: 'Money Market',    file: '/tmp/money-panel.png' },
];
for (const t of targets) {
  const el = await page.evaluateHandle((title) => {
    for (const c of document.querySelectorAll('[class*="bento-card"]')) {
      const txt = c.querySelector('.bento-panel-title')?.textContent?.trim();
      if (txt === title) return c;
    }
    return null;
  }, t.title);
  const box = await el.boundingBox();
  if (!box) { console.log('NOT FOUND:', t.title); continue; }
  // Scroll panel into view first
  await el.evaluate(node => node.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  const box2 = await el.boundingBox();
  await page.screenshot({ path: t.file, clip: { x: box2.x, y: box2.y, width: box2.width, height: box2.height } });
  console.log('Saved', t.file, 'size:', Math.round(box2.width) + 'x' + Math.round(box2.height));
}
await browser.close();
