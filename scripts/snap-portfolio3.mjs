import { chromium } from 'playwright';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
await ctx.addInitScript(() => {
  localStorage.setItem('equities-view-viewMode', 'portfolio');
});
const p = await ctx.newPage();
await p.goto('http://localhost:5173/?market=equities', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(10000);

// Check computed styles + which rules apply
const probe = await p.evaluate(() => {
  const card = [...document.querySelectorAll('.eq-bento-card')].find(c => c.querySelector('.eq-panel-title')?.textContent?.includes('Portfolio'));
  const addRow = card.querySelector('.pf-add-row');
  const empty = card.querySelector('.pf-empty');
  const cs1 = getComputedStyle(addRow);
  const cs2 = getComputedStyle(empty);
  return {
    addRow: { flex: cs1.flex, flexGrow: cs1.flexGrow, flexShrink: cs1.flexShrink, flexBasis: cs1.flexBasis, alignItems: cs1.alignItems, height: cs1.height, minHeight: cs1.minHeight },
    empty: { flex: cs2.flex, flexGrow: cs2.flexGrow, flexShrink: cs2.flexShrink, flexBasis: cs2.flexBasis, height: cs2.height },
    parentClasses: card.querySelector('.pf-tracker')?.className,
  };
});
console.log(JSON.stringify(probe, null, 2));

// Check which CSS rules match
const rules = await p.evaluate(() => {
  const stylesheets = [...document.styleSheets];
  const matches = [];
  for (const ss of stylesheets) {
    try {
      for (const rule of ss.cssRules) {
        if (rule.selectorText && (rule.selectorText.includes('eq-panel-content') && rule.selectorText.includes('> div'))) {
          matches.push({ selector: rule.selectorText, css: rule.cssText.slice(0, 200) });
        }
      }
    } catch {}
  }
  return matches;
});
console.log('Matching CSS rules:');
rules.forEach(r => console.log('  ', r.selector, '=>', r.css));
await b.close();
