// Data-correctness tests. Where ui.spec.js validates the chrome works
// regardless of upstream data, these tests intercept /api/* calls with
// page.route() and verify that specific values flow from the (canned) API
// response all the way into the rendered DOM.
import { test, expect } from '@playwright/test';

// Minimal but realistic /api/bonds response. Field names match what
// BondsMarket.jsx and BondsSidebar.jsx actually consume; the structural
// guard in DataProvider requires yieldCurveData to be a map of country
// objects with at least one non-null leaf value.
const cannedBondsResponse = {
  isLive: true,
  isCurrent: true,
  fetchedOn: '2026-05-01',
  lastUpdated: '2026-05-01T16:00:00Z',
  treasuryRates: {
    US10Y: 4.12,
    US10Y_CHANGE: 0.05,
    US2Y: 4.50,
    US2Y_CHANGE: -0.02,
  },
  spreadIndicators: {
    t10y2y: -0.38,
  },
  // Real /api/bonds returns IG/HY OAS in basis points under spreadData.current
  spreadData: {
    current: {
      igSpread: 105,   // bps → renders as "105 bps"
      hySpread: 345,   // bps → renders as "345 bps"
    },
    history: { dates: [], IG: [], HY: [] },
    etfs: [],
  },
  yieldCurveData: {
    US: { '3m': 5.25, '6m': 5.20, '1y': 4.85, '2y': 4.50, '5y': 4.20, '10y': 4.12, '30y': 4.42 },
    DE: { '10y': 2.45 },
    JP: { '10y': 0.95 },
    GB: { '10y': 4.05 },
  },
  _sources: { fred: true },
};

const cannedCryptoResponse = {
  isLive: true,
  isCurrent: true,
  fetchedOn: '2026-05-01',
  lastUpdated: '2026-05-01T16:00:00Z',
  coinMarketData: {
    coins: [
      { id: 'bitcoin',  symbol: 'BTC', name: 'Bitcoin',  current_price: 67890.12, market_cap: 1_350_000_000_000, price_change_percentage_24h: 1.23 },
      { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', current_price:  3456.78, market_cap:   415_000_000_000, price_change_percentage_24h: 0.87 },
    ],
  },
  fearGreedData: { value: 73, label: 'Greed' },
  defiData: { total: 158_000_000_000, chains: [] },
  fundingData: { rates: [] },
  onChainData: { hashrate: { history: [] }, fees: {} },
  stablecoinMcap: 162_000_000_000,
  btcDominance: 52.7,
  topExchanges: [],
  ethGas: 18,
  _sources: { coingecko: true },
};

// Helper: make /api/* respond with `data`, except `pass` paths which fall through.
async function mockApi(page, path, data, status = 200) {
  await page.route(new RegExp(path), async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}

test.describe('Mocked-API data correctness', () => {
  // The ▶ button kicks off ~21 endpoint fetches in batches of 4. Even with
  // the target endpoint mocked, the unmocked endpoints in earlier batches
  // can push the render of the active tab past Playwright's default 5s
  // assertion timeout. Bump it for these tests.
  test.slow();

  test.beforeEach(async ({ page }) => {
    // Intercept RTDB snapshot calls to force live fetches of /api/*
    await page.route(/firebaseio\.com\/marketSnapshots/, async (route) => {
      await route.fulfill({ status: 404, contentType: 'application/json', body: 'null' });
    });
    // Intercept all other /api/ calls to avoid hitting the throttled backend
    await page.route(/\/api\//, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ isLive: true, isCurrent: true }),
      });
    });
    page.on('console', msg => console.log(`[browser console] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', err => console.log(`[browser error] ${err.message}`));
    page.on('request', req => console.log(`[browser req] ${req.method()} ${req.url()}`));
  });

  test('Bonds KPI strip renders treasury rates from /api/bonds', async ({ page }) => {
    await mockApi(page, '/api/bonds', cannedBondsResponse);

    await page.goto('/?market=bonds');
    await page.getByRole('button', { name: 'Refresh data now' }).click();

    // Wait for the panel to leave skeleton state (FETCHED badge appears in
    // the DataFooter once the bonds response lands and DataProvider commits).
    await expect(page.getByText('FETCHED').first()).toBeVisible({ timeout: 15_000 });

    // The KPI strip projects treasuryRates.US10Y → "4.12%",
    // spreadIndicators.t10y2y → "-0.38%", spreadData.current.hySpread → "345 bps".
    await expect(page.getByText('4.12%').first()).toBeVisible();
    await expect(page.getByText('-0.38%').first()).toBeVisible();
    await expect(page.getByText('345 bps').first()).toBeVisible();
  });

  test('Crypto sidebar shows BTC dominance from /api/crypto', async ({ page }) => {
    await mockApi(page, '/api/crypto', cannedCryptoResponse);

    await page.goto('/?market=crypto');
    await page.getByRole('button', { name: 'Refresh data now' }).click();

    await expect(page.getByText('FETCHED').first()).toBeVisible({ timeout: 15_000 });

    // CryptoSidebar formats btcDominance as `${v.toFixed(1)}%` → "52.7%".
    await expect(page.getByText('52.7%').first()).toBeVisible();
    // Fear & Greed label should appear too.
    await expect(page.getByText('Greed').first()).toBeVisible();
  });

  test('Bonds tab degrades gracefully when /api/bonds errors', async ({ page }) => {
    // Mock the endpoint to return a server error.
    await mockApi(page, '/api/bonds', { error: 'upstream unavailable' }, 503);

    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));

    await page.goto('/?market=bonds');
    await page.getByRole('button', { name: 'Refresh data now' }).click();

    // App must still render the Bonds region and stay interactive — no
    // unhandled JS errors should escape, even though the data fetch failed.
    await expect(page.getByRole('region', { name: /Bonds/i }).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
