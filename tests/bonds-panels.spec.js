import { test, expect } from '@playwright/test';

const BASE = '/kyahoofinance032926/';

test.setTimeout(120000);

const bondsMockData = {
  isLive: true, isCurrent: true,
  yieldCurveData: { US: { '3m': 5.25, '6m': 5.20, '1y': 4.85, '2y': 4.50, '5y': 4.20, '10y': 4.12, '30y': 4.42 }, DE: { '10y': 2.45 }, JP: { '10y': 0.95 }, GB: { '10y': 4.05 } },
  spreadHistory: { dates: ['2026-01', '2026-02', '2026-03'], t10y2y: [-0.2, -0.25, -0.3], t10y3m: [-0.7, -0.75, -0.8], t5y30y: [0.1, 0.12, 0.15] },
  fedBalanceSheetHistory: { dates: ['2026-01', '2026-02', '2026-03'], values: [7500, 7400, 7300] },
  m2HistoryData: { dates: ['2026-01', '2026-02', '2026-03'], values: [21000, 20900, 20850] },
  cpiComponents: { dates: ['2026-01', '2026-02', '2026-03'], all: [3.1, 3.2, 3.0], core: [3.8, 3.7, 3.6], food: [2.5, 2.4, 2.3], energy: [-1.0, -0.5, -2.0], latest: { all: 3.0, core: 3.6, food: 2.3, energy: -2.0 } },
  debtToGdpHistory: { dates: ['2026-01', '2026-02', '2026-03'], values: [120.5, 121.2, 122.0], latest: 122.0 },
  breakevensData: { current: { be5y: 2.3, be10y: 2.2 }, history: { dates: ['2026-01', '2026-02', '2026-03'], be5y: [2.2, 2.25, 2.3], be10y: [2.1, 2.15, 2.2], forward5y5y: [2.0, 2.05, 2.1] } },
  durationLadder: { buckets: [{ bucket: '1-3 Yrs', amount: 500 }, { bucket: '3-5 Yrs', amount: 800 }], total: 1300, avgRate: 4.2 },
  macroData: { cftcNetLong: 12000, moneyVelocity: 1.3, centralBankRates: { 'United States': 5.25, 'Euro Area': 4.25, 'United Kingdom': 5.00, 'Japan': 0.10, 'Canada': 4.75, 'Australia': 4.35 } },
  spreadData: { current: { igSpread: 105, hySpread: 345 }, history: { dates: [], IG: [], HY: [] }, etfs: [] },
  treasuryRates: { US10Y: 4.12, US10Y_CHANGE: 0.05, US2Y: 4.50, US2Y_CHANGE: -0.02 },
  spreadIndicators: { t10y2y: -0.38 },
  tipsYields: { '5y': 2.1, '10y': 2.2, '30y': 2.4 },
  realYieldHistory: { dates: ['2026-01', '2026-02', '2026-03'], d5y: [2.0, 2.05, 2.1], d10y: [2.1, 2.15, 2.2] },
  creditRatings: { asOf: '2026-06-24', countries: [{ country: 'US', name: 'United States', sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' }] },
};

test('bonds panels show data after needsLiveRepair fix', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  // Intercept RTDB snapshot calls — return mock bonds data so DataProvider seeds the market
  await page.route(/firebaseio\.com\/marketSnapshots/, async (route) => {
    const url = route.request().url();
    if (url.includes('history.json?shallow=true')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ '2026-06-24': true }) });
      return;
    }
    const match = url.match(/marketSnapshots\/([^/]+)\//);
    const marketId = match ? match[1] : null;
    const mockData = marketId === 'bonds' ? bondsMockData : { isLive: true, isCurrent: true, key1: [1, 2], key2: [3, 4] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: mockData, fetchedAt: '2026-06-24T12:00:00Z' }) });
  });

  await page.goto(`${BASE}?market=bonds`, { waitUntil: 'domcontentloaded' });

  // Wait for data to load from RTDB mock
  await page.waitForTimeout(10000);

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
  // Bonds-specific panels should have rendered (skeletons from other markets may persist)
  expect(hasYieldValue).toBe(true);
});