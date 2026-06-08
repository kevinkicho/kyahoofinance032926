import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 4200 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(`pageerror: ${e.message}`));
page.on('console', m => { if (m.type() === 'error') errs.push(`console: ${m.text().slice(0,200)}`); });

await page.goto('http://localhost:5173/?market=bonds', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(20000);

// Inspect the auctions panel
const out = await page.evaluate(() => {
  const cards = Array.from(document.querySelectorAll('[class*="bento-card"]'));
  for (const c of cards) {
    const t = c.querySelector('.bento-panel-title')?.textContent?.trim();
    if (t?.includes('Auctions')) {
      const badge = c.querySelector('.df-fetched, .df-static, .df-no-data, .df-pending, .df-error');
      const tableRows = c.querySelectorAll('tbody tr').length;
      const hasChart = !!c.querySelector('canvas, svg.echarts-svg, .echarts-for-react');
      return {
        title: t,
        badgeText: badge?.textContent?.trim(),
        badgeClass: badge?.className,
        tableRows,
        hasChart,
        bodyLen: c.textContent?.length || 0,
      };
    }
  }
  return null;
});
console.log('Auctions panel:', JSON.stringify(out, null, 2));
console.log('Errors:', errs.slice(0,3));
await browser.close();
