/**
 * Playwright: panel API routing smoke (strict).
 *
 * Empty-but-green (HTTP 200 with hollow / null-only payloads) is a FAILURE.
 *
 * Run:
 *   npx playwright test tests/panel-api-routing.spec.js
 *   PLAYWRIGHT_API_BASE=https://… PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/panel-api-routing.spec.js
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { isStructurallyHollow } from '../server/lib/cache.js';

const routing = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'shared', 'api-routing.json'), 'utf8'),
);

const API_BASE = process.env.PLAYWRIGHT_API_BASE || 'http://localhost:3001';

/** Path → hollow-check market id */
function pathToMarket(apiPath) {
  const p = apiPath.replace(/^\/api\//, '').replace(/\/$/, '');
  if (p === 'commoditiesEnhanced' || p === 'commodities/v2') return 'commodities';
  if (p === 'equityDeepDive') return 'equityDeepDive';
  return p.split('/')[0];
}

function countNonNullLeaves(obj, depth = 0, acc = { total: 0, nonNull: 0 }) {
  if (depth > 5) return acc;
  if (obj == null) {
    acc.total += 1;
    return acc;
  }
  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      acc.total += 1;
      return acc;
    }
    for (const item of obj.slice(0, 40)) countNonNullLeaves(item, depth + 1, acc);
    return acc;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k.startsWith('_')) continue;
      if (['lastUpdated', 'fetchedOn', 'isLive', 'isCurrent', 'status', 'date', 'today'].includes(k)) {
        acc.total += 1;
        if (v != null && v !== '') acc.nonNull += 1;
        continue;
      }
      countNonNullLeaves(v, depth + 1, acc);
    }
    return acc;
  }
  acc.total += 1;
  if (obj !== '' && obj !== false) acc.nonNull += 1;
  return acc;
}

/**
 * Assert payload is usable market data — not empty-green.
 * @param {object} body
 * @param {string} label market id or path for messages
 * @param {string} [hollowMarket] market id for isStructurallyHollow
 */
function assertHasRealData(body, label, hollowMarket) {
  expect(body, `${label}: body`).toBeTruthy();
  expect(typeof body).toBe('object');
  expect(body._degraded, `${label}: must not be degraded shell`).not.toBe(true);
  if (body.error != null && body.error !== false) {
    // Allow diagnostics that still ship data; hard-fail pure error shells
    const leaves = countNonNullLeaves(body);
    expect(
      leaves.nonNull,
      `${label}: error payload without data (${body.error})`,
    ).toBeGreaterThanOrEqual(5);
  }

  const keys = Object.keys(body).filter(
    (k) => !k.startsWith('_')
      && !['lastUpdated', 'fetchedOn', 'isLive', 'isCurrent', 'error', 'status'].includes(k),
  );
  expect(keys.length, `${label}: should expose data keys`).toBeGreaterThan(0);

  const market = hollowMarket || pathToMarket(label.startsWith('/') ? label : `/api/${label}`);
  if (['bonds', 'crypto', 'insurance', 'realEstate', 'eia', 'cftcTFF', 'bisOTC', 'usda', 'fao'].includes(market)) {
    expect(
      isStructurallyHollow(market, body),
      `${label}: structurally hollow (empty-green)`,
    ).toBe(false);
  }

  const leaves = countNonNullLeaves(body);
  expect(leaves.nonNull, `${label}: sparse non-null leaves=${leaves.nonNull}`).toBeGreaterThanOrEqual(3);

  // All _sources false ⇒ empty-green
  if (body._sources && typeof body._sources === 'object') {
    const vals = Object.values(body._sources);
    if (vals.length > 0 && vals.every((v) => v === false || v == null) && leaves.nonNull < 8) {
      throw new Error(`${label}: all _sources false with sparse data (empty-green)`);
    }
  }
}

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

test.describe('Primary tab market endpoints (strict data)', () => {
  test.setTimeout(180_000);

  for (const marketId of routing.tabMarkets) {
    if (marketId === 'alerts') {
      test(`${marketId} is federated (no primary HTTP route)`, () => {
        expect(routing.markets.alerts).toBeUndefined();
      });
      continue;
    }

    // analytics primary is rate-limits (diag) — lighter check
    if (marketId === 'analytics') {
      test(`${marketId} → ${routing.markets.analytics.primary} responds`, async ({ request }) => {
        const res = await request.get(`${API_BASE}${routing.markets.analytics.primary}`, { timeout: 60_000 });
        expect(res.ok()).toBeTruthy();
        const body = await res.json();
        expect(body).toBeTruthy();
        expect(Object.keys(body).length).toBeGreaterThan(0);
      });
      continue;
    }

    const cfg = routing.markets[marketId];
    test(`${marketId} → ${cfg.primary} returns real data (not empty-green)`, async ({ request }) => {
      const res = await request.get(`${API_BASE}${cfg.primary}`, { timeout: 90_000 });
      expect(res.ok(), `${cfg.primary} → HTTP ${res.status()}`).toBeTruthy();
      const body = await res.json();
      const hollowId = marketId === 'commodities' ? 'commodities' : marketId === 'equitiesDeepDive' ? 'equityDeepDive' : marketId;
      assertHasRealData(body, cfg.primary, hollowId === 'eia' ? 'eia' : hollowId);
    });
  }
});

test.describe('Cross-market dependency endpoints (strict sample)', () => {
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
    test(`${p} returns real data`, async ({ request }) => {
      const res = await request.get(`${API_BASE}${p}`, { timeout: 60_000 });
      expect(res.ok(), `${p} → ${res.status()}`).toBeTruthy();
      const body = await res.json();
      assertHasRealData(body, p, pathToMarket(p));
    });
  }
});
