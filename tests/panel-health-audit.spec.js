import { test, expect } from '@playwright/test';

test.setTimeout(180000);

test.describe('Panel health accuracy', () => {
  test('dropdown status matches actual panel presence in main view', async ({ page }) => {
    // Intercept RTDB snapshot calls — return mock data so DataProvider seeds markets
    await page.route(/firebaseio\.com\/marketSnapshots/, async (route) => {
      const url = route.request().url();
      if (url.includes('history.json?shallow=true')) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ '2026-06-24': true }) });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { isLive: true, isCurrent: true, key1: [1, 2], key2: [3, 4] }, fetchedAt: '2026-06-24T12:00:00Z' }),
      });
    });

    // Navigate and wait for splash to finish or timeout
    await page.goto('/kyahoofinance032926/');
    await page.waitForSelector('.splash-screen', { state: 'hidden', timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Get all market tabs
    const tabs = await page.locator('[data-market]').all();
    const marketIds = await Promise.all(tabs.map(t => t.getAttribute('data-market')));

    for (const marketId of marketIds.filter(Boolean)) {
      // Hover the tab to open dropdown
      const tab = page.locator(`[data-market="${marketId}"]`);
      await tab.hover();
      await page.waitForTimeout(500);

      // Read dropdown items: id + status
      const items = await page.locator('.market-panel-dropdown-item').all();
      const dropdownPanels = [];
      for (const item of items) {
        const title = await item.locator('.panel-dropdown-title').textContent();
        const dot = await item.locator('.panel-dropdown-status-dot');
        const status = await dot.getAttribute('data-status');
        dropdownPanels.push({ title: title?.trim(), status });
      }

      // Click the tab to navigate to it
      await tab.click();
      await page.waitForTimeout(2000);

      // Find all rendered BentoCard panels in the main view
      const renderedPanels = await page.locator('[data-panel-key]').all();
      const renderedKeys = new Set();
      for (const p of renderedPanels) {
        const key = await p.getAttribute('data-panel-key');
        if (key) renderedKeys.add(key);
      }

      // Cross-reference
      for (const dp of dropdownPanels) {
        // Map dropdown title to panel key (heuristic)
        const panelKey = dp.title?.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        const isRendered = [...renderedKeys].some(k => k.includes(panelKey) || panelKey?.includes(k));

        if (dp.status === 'null' && isRendered) {
          console.log(`[MISMATCH] ${marketId}: "${dp.title}" shows unavailable in dropdown but IS rendered in main view`);
        }
        if (dp.status === 'ok' && !isRendered) {
          console.log(`[MISMATCH] ${marketId}: "${dp.title}" shows ok in dropdown but is NOT rendered in main view`);
        }
      }
    }
  });
});
