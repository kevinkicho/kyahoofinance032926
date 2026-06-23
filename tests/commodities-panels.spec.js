import { test, expect } from '@playwright/test';

const BASE = 'https://kevinkicho.github.io/kyahoofinance032926/';

test.setTimeout(120000);

test('commodities panels show data after fixes', async ({ page }) => {
  await page.goto(`${BASE}?market=commodities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(40000);

  const text = await page.textContent('body');

  const panels = ['Sector Performance', 'Commodity FX', 'Curve Structure Board'];
  console.log('=== Panel presence ===');
  for (const p of panels) {
    console.log(`  ${p}: ${text?.includes(p) ? 'found' : 'NOT found'}`);
  }

  // Check for w1/m1 data (not just '—')
  const hasW1 = /\d+\.\d%/.test(text || '');
  const hasContango = text?.toLowerCase().includes('contango') || text?.toLowerCase().includes('backwardation');
  const hasFxRates = /\d+\.\d{4}/.test(text || '');
  const hasPpi = text?.includes('PPI') || text?.includes('ppi');
  const hasStale = text?.toLowerCase().includes('stale');
  const hasNoData = text?.toLowerCase().includes('no data') || text?.toLowerCase().includes('unavailable');

  console.log(`\nHas percentage data: ${hasW1}`);
  console.log(`Has contango/backwardation: ${hasContango}`);
  console.log(`Has FX rates: ${hasFxRates}`);
  console.log(`Has PPI text: ${hasPpi}`);
  console.log(`Has stale: ${hasStale}`);
  console.log(`Has no-data/unavailable: ${hasNoData}`);

  const charts = await page.locator('[_echarts_instance_]').count();
  const skeletons = await page.locator('[class*="skeleton"], [class*="Skeleton"]').count();
  console.log(`\nCharts: ${charts}, Skeletons: ${skeletons}`);

  await page.screenshot({ path: 'test-results/commodities-after-fix.png', fullPage: true });

  expect(skeletons).toBe(0);
});