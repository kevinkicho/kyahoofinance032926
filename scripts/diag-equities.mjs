import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1200 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PE: ' + e.message));
page.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 250)); });

await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);

// Full page screenshot
await page.screenshot({ path: '/tmp/eq-full.png', fullPage: true });
console.log('Saved /tmp/eq-full.png');

// Inspect grid items + their dims
const gridInfo = await page.evaluate(() => {
  const wrappers = document.querySelectorAll('.react-grid-layout');
  const out = [];
  for (const w of wrappers) {
    const items = [...w.children].map(item => {
      const r = item.getBoundingClientRect();
      return {
        title: item.querySelector('.bento-panel-title, h3')?.textContent?.trim()?.slice(0, 40),
        w: Math.round(r.width),
        h: Math.round(r.height),
        x: Math.round(r.x),
        y: Math.round(r.y),
      };
    });
    out.push({ items });
  }
  return out;
});
console.log('Grid items:');
gridInfo.forEach(g => g.items.forEach(it => console.log('  "' + (it.title || '') + '" w=' + it.w + ' h=' + it.h + ' (' + it.x + ',' + it.y + ')')));

// Find Market Summary specifically
const ms = await page.evaluate(() => {
  for (const c of document.querySelectorAll('[class*="bento-card"]')) {
    const txt = c.querySelector('.bento-panel-title')?.textContent?.trim();
    if (txt === 'Market Summary' || txt?.includes('Summary')) {
      const r = c.getBoundingClientRect();
      return { title: txt, w: r.width, h: r.height, html: c.innerHTML.slice(0, 500) };
    }
  }
  return null;
});
console.log('Market Summary:', JSON.stringify(ms, null, 2));

console.log('Errors:', errs.slice(0, 10));
await browser.close();
