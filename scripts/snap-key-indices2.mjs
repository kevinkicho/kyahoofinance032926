import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('console.err: ' + m.text().slice(0, 200)); });

await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);

// (a) Default snap
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
  await page.waitForTimeout(400);
  const b2 = await el.boundingBox();
  await page.screenshot({ path: '/tmp/ki-default.png', clip: { x: b2.x, y: b2.y, width: b2.width, height: b2.height + 220 } });
  console.log('Saved /tmp/ki-default.png (with footer space)');
}

// (b) Hover on a China pill (Hang Seng) and snap with popover open
const pill = await page.evaluateHandle(() => {
  const labels = document.querySelectorAll('.market-kpi-label');
  for (const l of labels) {
    if (l.textContent.trim() === 'Hang Seng') return l.closest('.market-kpi-pill');
  }
  return null;
});
if (pill) {
  const pbox = await pill.boundingBox();
  await page.mouse.move(pbox.x + pbox.width / 2, pbox.y + pbox.height / 2);
  await page.waitForTimeout(2000);  // let history fetch
  await page.screenshot({ path: '/tmp/ki-hover.png', fullPage: false });
  console.log('Saved /tmp/ki-hover.png (with hover popover)');
}

console.log('errors:', errs.slice(0, 5));
await browser.close();
