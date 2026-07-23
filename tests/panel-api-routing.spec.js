/**
 * Playwright: panel API routing smoke.
 *
 * Verifies the backend routing registry is live and that every tab market's
 * primary endpoint returns a usable JSON payload (through Vite proxy when
 * PLAYWRIGHT_SKIP_WEBSERVER is not set — uses npm start via playwright.config).
 *
 * Run:
 *   npx playwright test tests/panel-api-routing.spec.js
 *   PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/panel-api-routing.spec.js
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const routing = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'shared', 'api-routing.json'), 'utf8')
);

const API_BASE = process.env.PLAYWRIGHT_API_BASE || 'http://localhost:3001';

test.describe('Panel API routing registry', () => {
  test('GET /api/panel-routing returns registry', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/panel-routing`);
    expect(res.ok(), `panel-routing status ${res.status()}`).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.tabMarkets).toEqual(routing.tabMarkets);
    expect(body.markets.bonds.primary).toBe('/api/bonds');
  });

  test('GET /api/health is ok', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('ok');
  });
});

test.describe('Primary tab market endpoints', () => {
  test.setTimeout(180_000);

  for (const marketId of routing.tabMarkets) {
    if (marketId === 'alerts') {
      test(`${marketId} is federated (no primary HTTP route)`, () => {
        expect(routing.markets.alerts).toBeUndefined();
      });
      continue;
    }

    const cfg = routing.markets[marketId];
    test(`${marketId} → ${cfg.primary} returns JSON payload`, async ({ request }) => {
      const res = await request.get(`${API_BASE}${cfg.primary}`, { timeout: 90_000 });
      expect(res.ok(), `${cfg.primary} → HTTP ${res.status()}`).toBeTruthy();
      const body = await res.json();
      expect(body, 'body should be object').toBeTruthy();
      expect(typeof body).toBe('object');

      // Must have more than pure meta fields
      const keys = Object.keys(body).filter(
        k => !k.startsWith('_') && !['lastUpdated', 'fetchedOn', 'isLive', 'isCurrent', 'error'].includes(k)
      );
      expect(keys.length, `${marketId} should expose data keys`).toBeGreaterThan(0);
    });
  }
});

test.describe('Cross-market dependency endpoints (sample)', () => {
  test.setTimeout(120_000);

  const sampleDeps = [
    '/api/treasuryTIC',
    '/api/nyfed',
    '/api/treasuryAuctions',
    '/api/fema',
    '/api/usgs',
    '/api/institutional',
    '/api/cftcTFF',
  ];

  for (const p of sampleDeps) {
    test(`${p} responds`, async ({ request }) => {
      const res = await request.get(`${API_BASE}${p}`, { timeout: 60_000 });
      expect(res.ok(), `${p} → ${res.status()}`).toBeTruthy();
      const body = await res.json();
      expect(body).toBeTruthy();
    });
  }
});
