import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
// Force viewMode to portfolio (matching the user's persisted state)
await ctx.addInitScript(() => {
  localStorage.setItem('equities-view-viewMode', 'portfolio');
});
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push('PE: ' + e.message.slice(0,300)));
p.on('console', m => { if (m.type() === 'error') errs.push('CE: ' + m.text().slice(0,300)); });
await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(20000);
await p.screenshot({ path: '/tmp/eq-portfolio.png', fullPage: true });

const grid = await p.evaluate(() => [...document.querySelectorAll('.react-grid-layout > *')].map(c => {
  const r = c.getBoundingClientRect();
  return { title: c.querySelector('.bento-panel-title, .eq-panel-title')?.textContent?.trim()?.slice(0,40), w: Math.round(r.width), h: Math.round(r.height), classes: c.className.slice(0,80) };
}));
console.log('Portfolio view grid:');
grid.forEach(it => console.log('  "'+(it.title||'(none)')+'" w='+it.w+' h='+it.h));

// Check Portfolio Tracker DOM specifically
const ptInfo = await p.evaluate(() => {
  const card = [...document.querySelectorAll('[class*="bento-card"], .eq-bento-card')].find(c => c.querySelector('.bento-panel-title, .eq-panel-title')?.textContent?.includes('Portfolio'));
  if (!card) return null;
  return { html: card.innerHTML.slice(0, 1500), w: card.getBoundingClientRect().width, h: card.getBoundingClientRect().height };
});
console.log('Portfolio panel:', JSON.stringify(ptInfo, null, 2));
console.log('Errors:', errs.slice(0, 5));
await b.close();
