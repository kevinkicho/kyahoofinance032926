import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => {
  localStorage.setItem('equities-view-viewMode', 'portfolio');
});
const p = await ctx.newPage();
await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(15000);
await p.screenshot({ path: '/tmp/eq-portfolio2.png', fullPage: false });

const probe = await p.evaluate(() => {
  const card = [...document.querySelectorAll('.eq-bento-card')].find(c => c.querySelector('.eq-panel-title')?.textContent?.includes('Portfolio'));
  if (!card) return { error: 'no card' };
  const r = (sel) => {
    const el = card.querySelector(sel);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) };
  };
  return {
    card: r('.eq-bento-card') || (() => { const b = card.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) }; })(),
    titleRow: r('.eq-panel-title-row'),
    content: r('.pf-tracker'),
    addRow: r('.pf-add-row'),
    empty: r('.pf-empty'),
    footer: r('.eq-panel-footer'),
  };
});
console.log(JSON.stringify(probe, null, 2));
await b.close();
