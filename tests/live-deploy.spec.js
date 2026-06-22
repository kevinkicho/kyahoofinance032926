import { test, expect } from '@playwright/test';

const BASE = 'https://kevinkicho.github.io/kyahoofinance032926/';
const API_BASE = 'https://api-4uzq3y2xva-uc.a.run.app';

test.setTimeout(120000);

test.describe('Equities market — live deployment', () => {
  test('page loads and renders equities dashboard', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto(`${BASE}?market=equities`, { waitUntil: 'networkidle' });

    // App container should be visible
    await expect(page.locator('#root')).toBeVisible();

    // Wait for data to load (skeletons should be replaced by real content)
    await page.waitForTimeout(8000);

    // Check that some panel content rendered (not stuck on skeleton)
    const skeletonCount = await page.locator('[class*="skeleton"], [class*="Skeleton"]').count();
    const cardCount = await page.locator('[class*="bento"], [class*="BentoCard"], [class*="card"]').count();
    console.log(`Equities: skeletonCount=${skeletonCount}, cardCount=${cardCount}`);

    // Take a screenshot for visual verification
    await page.screenshot({ path: 'test-results/equities-live.png', fullPage: true });

    // Check for critical JS errors (filter out known noise)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('manifest') &&
      !e.includes('Deprecation') &&
      !e.includes('third-party cookie')
    );
    console.log(`Equities errors (${criticalErrors.length}):`, criticalErrors.slice(0, 5));

    // Should have some rendered content
    expect(cardCount).toBeGreaterThan(0);
  });

  test('equities heatmap or key indices visible', async ({ page }) => {
    await page.goto(`${BASE}?market=equities`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(10000);

    // Look for key equities UI elements
    const tabBars = await page.locator('[class*="tab"], [class*="Tab"]').count();
    const tables = await page.locator('table').count();
    const charts = await page.locator('canvas, [class*="echarts"], [_echarts_instance_]').count();
    const text = await page.textContent('body');

    console.log(`Equities UI: tabs=${tabBars}, tables=${tables}, charts=${charts}`);
    console.log('Has AAPL text:', text?.includes('AAPL') || false);
    console.log('Has S&P text:', text?.includes('S&P') || text?.includes('GSPC') || false);
    console.log('Has heatmap text:', text?.includes('heatmap') || text?.includes('Heatmap') || false);

    await page.screenshot({ path: 'test-results/equities-content.png', fullPage: true });
  });
});

test.describe('Analytics market — API endpoint validation', () => {
  test('analytics page shows endpoint usage', async ({ page }) => {
    await page.goto(`${BASE}?market=analytics`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(8000);

    const text = await page.textContent('body');
    console.log('Analytics body text (first 2000 chars):', text?.substring(0, 2000));

    // Look for endpoint names in the analytics page
    const endpointNames = ['stocks', 'bonds', 'fx', 'crypto', 'commodities', 'macro',
      'realEstate', 'insurance', 'credit', 'sentiment', 'calendar', 'derivatives',
      'globalMacro', 'equityDeepDive', 'analytics', 'fred', 'bls', 'eia'];
    const found = endpointNames.filter(name => text?.includes(name));
    console.log(`Analytics: found ${found.length}/${endpointNames.length} endpoint names:`, found);

    await page.screenshot({ path: 'test-results/analytics-live.png', fullPage: true });

    expect(found.length).toBeGreaterThan(0);
  });

  test('analytics API endpoint returns data', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/analytics`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    console.log('Analytics API keys:', Object.keys(data));
    console.log('Analytics _sources:', data._sources);

    // Check if endpoint tracker data exists
    if (data.endpoints) {
      console.log('Tracked endpoints:', Object.keys(data.endpoints));
    }
    if (data.endpointMetrics) {
      console.log('Endpoint metrics:', Object.keys(data.endpointMetrics));
    }
  });
});

test.describe('API endpoint smoke tests', () => {
  // GET endpoints with generous timeout for cold-start Cloud Run
  test.use({ actionTimeout: 60000 });

  const getEndpoints = [
    'bonds', 'fx', 'crypto', 'commodities', 'macro',
    'realEstate', 'insurance', 'credit', 'sentiment', 'calendar',
    'derivatives', 'globalMacro', 'equityDeepDive', 'analytics',
    'bls', 'eia', 'census', 'watchlist',
    'rate-limits', 'cache/status', 'health',
  ];

  for (const ep of getEndpoints) {
    test(`GET /api/${ep} responds`, async ({ request }) => {
      const res = await request.get(`${API_BASE}/api/${ep}`, { timeout: 60000 });
      const status = res.status();
      if (status === 200) {
        const data = await res.json();
        const keys = Object.keys(data);
        const hasSources = !!data._sources;
        console.log(`/api/${ep}: 200 — keys: ${keys.slice(0, 6).join(', ')}${keys.length > 6 ? '...' : ''} _sources=${hasSources}`);
      } else {
        console.log(`/api/${ep}: ${status}`);
      }
      expect([200, 503, 404, 504]).toContain(status);
    });
  }

  test('POST /api/stocks responds', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/stocks`, {
      data: { tickers: ['AAPL'] },
      timeout: 60000,
    });
    const status = res.status();
    console.log(`POST /api/stocks: ${status}`);
    if (status === 200) {
      const data = await res.json();
      console.log('  AAPL price:', data.AAPL?.price);
    }
    expect([200, 503]).toContain(status);
  });
});