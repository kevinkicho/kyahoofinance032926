import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => {
  localStorage.setItem('equities-view-viewMode', 'heatmap');
});
const p = await ctx.newPage();
await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(12000);

const probe = await p.evaluate(() => {
  const card = [...document.querySelectorAll('.eq-bento-card')].find(c => c.querySelector('.eq-panel-title')?.textContent?.includes('Key Indices'));
  if (!card) return { error: 'no card' };
  const cardR = card.getBoundingClientRect();
  const panel = card.querySelector('.market-kpi-panel');
  const groups = [...card.querySelectorAll('.market-kpi-strip')];
  const footer = card.querySelector('.data-footer, .df-root');
  const groupsParent = panel?.firstElementChild;
  return {
    card: { h: Math.round(cardR.height) },
    panel: panel ? { h: Math.round(panel.getBoundingClientRect().height) } : null,
    groupsParent: groupsParent ? { h: Math.round(groupsParent.getBoundingClientRect().height), classes: groupsParent.className } : null,
    groups: groups.map(g => ({ h: Math.round(g.getBoundingClientRect().height), pills: g.children.length })),
    footer: footer ? {
      h: Math.round(footer.getBoundingClientRect().height),
      top: Math.round(footer.getBoundingClientRect().top),
      bottom: Math.round(footer.getBoundingClientRect().bottom),
      classes: footer.className,
      tag: footer.tagName,
    } : null,
    cardBottom: Math.round(cardR.bottom),
  };
});
console.log(JSON.stringify(probe, null, 2));
await b.close();
