import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
// Don't force anything — see browser default
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PE: ' + e.message.slice(0,400)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE: ' + m.text().slice(0,400)); });
await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(12000);
await p.screenshot({ path: '/tmp/eq-asis.png', fullPage: true });

const viewMode = await p.evaluate(() => localStorage.getItem('equities-view-viewMode'));
console.log('Default viewMode (no forcing):', viewMode);

const grid = await p.evaluate(() => [...document.querySelectorAll('.react-grid-layout > *')].map(c => {
  const r = c.getBoundingClientRect();
  return { title: c.querySelector('.bento-panel-title, .eq-panel-title')?.textContent?.trim()?.slice(0,40), w: Math.round(r.width), h: Math.round(r.height) };
}));
console.log('Grid panels:');
grid.forEach(it => console.log('  "'+(it.title||'(none)')+'" w='+it.w+' h='+it.h));

console.log('Errors:', errs.slice(0, 5));
await b.close();
