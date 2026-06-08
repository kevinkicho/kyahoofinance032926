import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
// Force heatmap view (not portfolio)
await ctx.addInitScript(() => {
  localStorage.setItem('equities-view-viewMode', 'heatmap');
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PE: ' + e.message.slice(0,400)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE: ' + m.text().slice(0,400)); });
await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(15000);
await p.screenshot({ path: '/tmp/eq-heatmap.png', fullPage: true });

const grid = await p.evaluate(() => [...document.querySelectorAll('.react-grid-layout > *')].map(c => {
  const r = c.getBoundingClientRect();
  return { title: c.querySelector('.bento-panel-title, .eq-panel-title')?.textContent?.trim()?.slice(0,40), w: Math.round(r.width), h: Math.round(r.height), classes: c.className.slice(0,80) };
}));
console.log('Heatmap view grid:');
grid.forEach(it => console.log('  "'+(it.title||'(none)')+'" w='+it.w+' h='+it.h));

// Check viewMode value
const viewMode = await p.evaluate(() => localStorage.getItem('equities-view-viewMode'));
console.log('viewMode:', viewMode);

// Check what's actually rendered in the equities area
const eqDash = await p.evaluate(() => {
  const dash = document.querySelector('.eq-dashboard');
  if (!dash) return { error: 'no dashboard' };
  return { html: dash.innerHTML.slice(0, 2000), classes: dash.className };
});
console.log('Dashboard:', eqDash.classes);
console.log('First 2000 chars:', eqDash.html);
console.log('---');
console.log('Errors:', errs.slice(0, 5));
await b.close();
