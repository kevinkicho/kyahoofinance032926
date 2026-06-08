import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1200 } });
await ctx.addInitScript(() => {
  localStorage.setItem('equities-view-viewMode', 'portfolio');
});
const p = await ctx.newPage();
await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(12000);
await p.screenshot({ path: '/tmp/eq-portfolio-fixed.png', fullPage: true });

const probe = await p.evaluate(() => {
  const card = [...document.querySelectorAll('.eq-bento-card')].find(c => c.querySelector('.eq-panel-title')?.textContent?.includes('Portfolio'));
  if (!card) return { error: 'no card' };
  const cardR = card.getBoundingClientRect();
  const addRowR = card.querySelector('.pf-add-row')?.getBoundingClientRect();
  const emptyR = card.querySelector('.pf-empty')?.getBoundingClientRect();
  return {
    panel: { top: Math.round(cardR.top), bottom: Math.round(cardR.bottom), height: Math.round(cardR.height) },
    addRow: addRowR ? { top: Math.round(addRowR.top), height: Math.round(addRowR.height), offsetFromPanelTop: Math.round(addRowR.top - cardR.top) } : null,
    empty: emptyR ? { top: Math.round(emptyR.top), height: Math.round(emptyR.height) } : null,
  };
});
console.log(JSON.stringify(probe, null, 2));
await b.close();
