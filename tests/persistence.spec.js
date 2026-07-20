/**
 * Drag/resize persistence regression. Drags the first bento card on a few
 * representative tabs, reloads the page, and asserts the card is still in
 * the dragged position. Catches any future regression of the noCompactor
 * fix in BentoWrapper (RGL's vertical compactor would otherwise snap
 * every card back to the top on remount).
 *
 * Usage:
 *   npx playwright test tests/persistence.spec.js --reporter=list
 */
import { test, expect } from '@playwright/test';

const BASE = '/kyahoofinance032926/';

const TARGETS = [
  { market: 'fx',          panelKey: 'kpi' },
  { market: 'derivatives', panelKey: 'kpi' },
  { market: 'bonds',       panelKey: 'yield' },
  { market: 'sentiment',   panelKey: 'sidebar' },
];

async function getTransform(page, panelKey) {
  // RGL writes positions as inline `transform: translate(X, Y)` on each
  // grid item; we read it back to compare before/after reload.
  const handle = page.locator(`.react-grid-item:has(> [class*="bento-card"][class*=""])`).first();
  // Match by data-grid id which RGL exposes via inline class? Simpler: match
  // by the child div's React key — we rendered it with key=panelKey.
  const item = page.locator(`.react-grid-item:has([key="${panelKey}"]), .react-grid-item`).first();
  await item.waitFor({ state: 'attached', timeout: 5000 });
  return item.evaluate((el) => el.style.transform);
}

test.describe('layout persistence', () => {
  for (const { market, panelKey } of TARGETS) {
    test(`${market}: ${panelKey} drag survives reload`, async ({ page }) => {
      // Intercept RTDB snapshot calls via addInitScript so it survives reload
      await page.addInitScript(() => {
        const origFetch = window.fetch;
        window.fetch = (url, ...args) => {
          if (typeof url === 'string' && url.includes('firebaseio.com/marketSnapshots')) {
            if (url.includes('history.json?shallow=true')) {
              return Promise.resolve(new Response(JSON.stringify({ '2026-06-24': true }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            }
            return Promise.resolve(new Response(JSON.stringify({ data: { isLive: true, isCurrent: true, key1: [1, 2], key2: [3, 4] }, fetchedAt: '2026-06-24T12:00:00Z' }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
          return origFetch(url, ...args);
        };
      });

      await page.goto(`${BASE}?market=${market}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const card = page.locator('.react-grid-item').first();
      await card.waitFor({ state: 'visible', timeout: 8000 });

      // Drag the title-row (the only registered drag handle) by ~200px down.
      const titleRow = card.locator('.bento-panel-title-row').first();
      const box = await titleRow.boundingBox();
      if (!box) test.skip();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2 + 240, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(400);

      const afterDrag = await card.evaluate((el) => el.style.transform);

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(4000);

      const cardReloaded = page.locator('.react-grid-item').first();
      await cardReloaded.waitFor({ state: 'visible', timeout: 8000 });
      const afterReload = await cardReloaded.evaluate((el) => el.style.transform);

      expect(afterReload, 'reloaded transform should match dragged transform').toBe(afterDrag);
    });
  }
});
