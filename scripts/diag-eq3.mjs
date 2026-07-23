import { chromium } from 'playwright';
const browser = await chromium.launch();

const VIEWS = [
  { name: 'heatmap', click: 'Heatmap' },
  { name: 'list', click: 'List View' },
  { name: 'race', click: 'Bar Race' },
  { name: 'portfolio', click: 'Portfolio' },
  { name: 'datahub', click: 'DataHub' },
];

const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push('PE: ' + e.message.slice(0,250)));
page.on('console', m => { if (m.type() === 'error') errs.push('CE: ' + m.text().slice(0,250)); });

await page.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(15000);

for (const v of VIEWS) {
  // Try clicking the view-mode tab
  try {
    const found = await page.evaluate((label) => {
      const all = document.querySelectorAll('button, [class*="tab"], [class*="toggle"]');
      for (const b of all) {
        if (b.textContent?.trim() === label && !b.disabled) { b.click(); return true; }
      }
      return false;
    }, v.click);
    if (!found) { console.log(v.name + ': button not found'); continue; }
    await page.waitForTimeout(3000);
    const grid = await page.evaluate(() => [...document.querySelectorAll('.react-grid-layout > *')].map(c => {
      const r = c.getBoundingClientRect();
      return { title: c.querySelector('.bento-panel-title, .eq-panel-title')?.textContent?.trim()?.slice(0,30), w: Math.round(r.width), h: Math.round(r.height) };
    }));
    console.log('=== ' + v.name + ' ===');
    grid.forEach(it => console.log('  "'+(it.title||'')+'" w='+it.w+' h='+it.h));
    await page.screenshot({ path: `/tmp/eq-${v.name}.png`, fullPage: true });
  } catch (e) { console.log(v.name + ' err: ' + e.message); }
}
console.log('errors during run:', errs.slice(0,5));
await browser.close();
