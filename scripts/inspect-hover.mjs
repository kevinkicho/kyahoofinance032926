import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (['error','warning'].includes(m.type())) errs.push(m.type() + ': ' + m.text().slice(0, 200)); });

await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);

// Use Playwright's hover() — fires mouseenter properly
const pill = await page.locator('.market-kpi-pill').filter({ hasText: 'STAR 50' }).first();
await pill.hover();
await page.waitForTimeout(2500);

const result = await page.evaluate(() => {
  const out = [];
  for (const el of document.body.children) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && parseInt(cs.zIndex) > 1000) {
      out.push({ tag: el.tagName, top: cs.top, left: cs.left, html: el.innerHTML.slice(0, 300) });
    }
  }
  return { popovers: out, svgCount: document.querySelectorAll('svg').length };
});
console.log('After hover:', JSON.stringify(result, null, 2));

// Also try click
await pill.click();
await page.waitForTimeout(2500);
const afterClick = await page.evaluate(() => {
  const out = [];
  for (const el of document.body.children) {
    const cs = getComputedStyle(el);
    if (cs.position === 'fixed' && parseInt(cs.zIndex) > 1000) {
      out.push({ tag: el.tagName, top: cs.top, left: cs.left });
    }
  }
  return { popovers: out, svgCount: document.querySelectorAll('svg').length };
});
console.log('After click:', JSON.stringify(afterClick, null, 2));
console.log('Errors:', errs.slice(0, 5));
await browser.close();
