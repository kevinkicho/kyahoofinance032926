import { chromium } from 'playwright';
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 4200 } });
const page = await ctx.newPage();
for (const m of ['credit','bonds','watchlist']) {
  console.log('\n=== ' + m + ' ===');
  await page.goto(`${BASE}/?market=${m}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(15000);
  const out = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('.df-no-data, .df-static').forEach(el => {
      const text = el.textContent.trim();
      if (text !== 'NO DATA') return;
      const root = el.closest('.df-root');
      const label = root?.querySelector('.df-label')?.textContent?.trim() || '(no label)';
      const card = el.closest('[class*="bento-card"]');
      const cardTitle = card?.querySelector('.bento-panel-title, .bento-card__title, h3, h4, .ins-panel-title')?.textContent?.trim() || '(no title)';
      items.push({ cardTitle, label });
    });
    return items;
  });
  out.forEach(p => console.log('  NO DATA in [' + p.cardTitle + ']  label="' + p.label + '"'));
}
await browser.close();
