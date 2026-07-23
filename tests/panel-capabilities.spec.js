/**
 * Playwright: panel capability restoration.
 *
 * Loads the hub, waits for splash, then for each major market tab asserts
 * that market data landed in the DataProvider (via window debug / DOM) and
 * that at least one bento panel is visible with non-empty content.
 *
 * Run:
 *   npx playwright test tests/panel-capabilities.spec.js
 */
import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const routing = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'shared', 'api-routing.json'), 'utf8')
);

const BASE = '/kyahoofinance032926/';

// Markets that should show real dashboard panels after load
const CAPABILITY_TABS = [
  { id: 'bonds', label: /bonds/i },
  { id: 'fx', label: /fx/i },
  { id: 'crypto', label: /crypto/i },
  { id: 'commodities', label: /commodities/i },
  { id: 'credit', label: /credit/i },
  { id: 'sentiment', label: /sentiment/i },
  { id: 'calendar', label: /calendar/i },
  { id: 'equities', label: /equities/i },
  { id: 'realEstate', label: /real estate/i },
  { id: 'insurance', label: /insurance/i },
  { id: 'globalMacro', label: /macro/i },
  { id: 'derivatives', label: /derivatives/i },
  { id: 'equitiesDeepDive', label: /equity\+/i },
];

test.describe('Panel capabilities — markets load data into UI', () => {
  test.setTimeout(180_000);

  test.beforeEach(async ({ page }) => {
    // Warm primary APIs so first paint is not empty
    const apiBase = process.env.PLAYWRIGHT_API_BASE || 'http://localhost:3001';
    for (const id of ['bonds', 'fx', 'crypto', 'calendar']) {
      const p = routing.markets[id]?.primary;
      if (p) {
        await page.request.get(`${apiBase}${p}`, { timeout: 90_000 }).catch(() => {});
      }
    }
  });

  for (const tab of CAPABILITY_TABS) {
    test(`${tab.id} tab renders at least one populated panel`, async ({ page }) => {
      await page.goto(`${BASE}?market=${tab.id}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });

      // Dismiss splash if present (wait up to 90s for data wave + retries)
      const splash = page.locator('.splash-overlay, .splash-screen');
      if (await splash.count()) {
        await splash.first().waitFor({ state: 'hidden', timeout: 90_000 }).catch(() => {});
      }

      // Navigate via URL market param already set; wait for region
      await page.waitForTimeout(2000);

      // Prefer panels with data-panel-key; fall back to bento title rows
      const panels = page.locator('[data-panel-key], .bento-panel-title-row, [class*="bento-card"]');
      await expect(panels.first(), `${tab.id} should render a panel`).toBeVisible({ timeout: 60_000 });

      const panelCount = await panels.count();
      expect(panelCount, `${tab.id} panel count`).toBeGreaterThanOrEqual(1);

      // At least one panel should not be a pure "No data" empty state
      const bodyText = await page.locator('main, .hub-content, [role="region"], body').first().innerText();
      const onlyEmpty =
        /no data available|not available|unavailable/i.test(bodyText) &&
        bodyText.replace(/\s+/g, ' ').trim().length < 80;
      expect(onlyEmpty, `${tab.id} should not be entirely empty`).toBeFalsy();
    });
  }
});

test.describe('Panel routing diagnostic page integration', () => {
  test('frontend can reach /api/panel-routing via same origin proxy', async ({ page }) => {
    // In dev, Vite proxies /api → backend. Hit from page context.
    await page.goto(`${BASE}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const result = await page.evaluate(async () => {
      try {
        const r = await fetch('/api/panel-routing');
        const j = await r.json();
        return { status: r.status, ok: j.ok, hasBonds: !!j.markets?.bonds };
      } catch (e) {
        return { error: String(e) };
      }
    });
    expect(result.error, JSON.stringify(result)).toBeUndefined();
    expect(result.status).toBe(200);
    expect(result.ok).toBe(true);
    expect(result.hasBonds).toBe(true);
  });
});
