import { test } from '@playwright/test';

const BASE = 'https://kevinkicho.github.io/kyahoofinance032926/';

test.setTimeout(120000);

test('real estate panel audit', async ({ page }) => {
  await page.goto(`${BASE}?market=realEstate`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(40000);

  // Get all BentoCard titles
  const cards = await page.locator('.bento-card-title, [class*="bento-card-title"]').allTextContents();
  console.log('=== Rendered BentoCards ===');
  cards.forEach((t, i) => console.log(`  ${i}: ${t}`));

  // Check for specific panel content
  const body = await page.textContent('body');
  const expected = [
    'Case-Shiller', 'REIT', 'Affordability', 'Cap Rate', 'Mortgage',
    'Foreclosure', 'MBA', 'CRE', 'Supply', 'Housing',
    'Census', 'HUD', 'Median Price', 'Homeownership', 'Rental',
  ];
  console.log('\n=== Expected panel content ===');
  for (const e of expected) {
    console.log(`  ${e}: ${body?.includes(e) ? 'FOUND' : 'MISSING'}`);
  }

  // Count charts and skeletons
  const charts = await page.locator('[_echarts_instance_]').count();
  const skeletons = await page.locator('[class*="skeleton"], [class*="Skeleton"]').count();
  console.log(`\nCharts: ${charts}, Skeletons: ${skeletons}`);

  // Check for stale/no-data indicators
  const hasStale = body?.toLowerCase().includes('stale');
  const hasNoData = body?.toLowerCase().includes('no data');
  const hasUnavailable = body?.toLowerCase().includes('unavailable');
  console.log(`\nStale: ${hasStale}, No data: ${hasNoData}, Unavailable: ${hasUnavailable}`);

  await page.screenshot({ path: 'test-results/realestate-audit.png', fullPage: true });
});