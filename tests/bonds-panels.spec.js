import { test, expect } from '@playwright/test';

const BASE = 'https://kevinkicho.github.io/kyahoofinance032926/';

test.setTimeout(120000);

test('bonds panels show data after needsLiveRepair fix', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto(`${BASE}?market=bonds`, { waitUntil: 'networkidle' });

  // Wait for data to load — the needsLiveRepair fix will trigger a live fetch
  // for bonds, which takes ~15-20s on cold Cloud Run
  await page.waitForTimeout(30000);

  const text = await page.textContent('body');

  // Check for the 8 panel titles
  const panels = [
    'Curve Spreads',
    'Fed Balance Sheet',
    'CPI Components',
    'Debt-to-GDP',
    'M2 Money Supply',
    'Breakeven Inflation',
    'Duration Ladder',
    'Macro Indicators',
  ];

  console.log('=== Panel presence check ===');
  for (const panel of panels) {
    const present = text?.includes(panel);
    console.log(`  ${panel}: ${present ? 'found' : 'NOT found'}`);
  }

  // Check for "stale" or "no data" indicators
  const hasStale = text?.toLowerCase().includes('stale');
  const hasNoData = text?.toLowerCase().includes('no data');
  console.log(`\nHas "stale": ${hasStale}`);
  console.log(`Has "no data": ${hasNoData}`);

  // Check for actual data values (e.g. percentages, billions)
  const hasYieldValue = /\d+\.\d+%/.test(text || '');
  const hasDollarValue = /\$[\d,.]+/.test(text || '');
  console.log(`Has yield values: ${hasYieldValue}`);
  console.log(`Has dollar values: ${hasDollarValue}`);

  // Count BentoCards and skeletons
  const cardCount = await page.locator('[class*="bento"], [class*="BentoCard"]').count();
  const skeletonCount = await page.locator('[class*="skeleton"], [class*="Skeleton"]').count();
  console.log(`\nCards: ${cardCount}, Skeletons: ${skeletonCount}`);

  // Check SafeECharts containers with dimensions
  const chartsWithDimensions = await page.locator('[_echarts_instance_]').count();
  console.log(`ECharts instances: ${chartsWithDimensions}`);

  await page.screenshot({ path: 'test-results/bonds-after-fix.png', fullPage: true });

  // Filter critical errors
  const critical = consoleErrors.filter(e =>
    !e.includes('favicon') && !e.includes('manifest') &&
    !e.includes('third-party cookie') && !e.includes('Deprecation')
  );
  console.log(`\nConsole errors (${critical.length}):`, critical.slice(0, 5));

  // At least some data should be present
  expect(cardCount).toBeGreaterThan(0);
  expect(skeletonCount).toBe(0);
});