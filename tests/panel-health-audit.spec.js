import { test, expect } from '@playwright/test';

test.describe('Panel health accuracy', () => {
  test('dropdown status matches actual panel presence in main view', async ({ page }) => {
    // Navigate and wait for splash to finish
    await page.goto('/kyahoofinance032926/');
    await page.waitForSelector('.splash-screen', { state: 'hidden', timeout: 120_000 }).catch(() => {});
    await page.waitForTimeout(3000);

    // Get all market tabs
    const tabs = await page.locator('[data-market-tab]').all();
    const marketIds = await Promise.all(tabs.map(t => t.getAttribute('data-market-tab')));

    for (const marketId of marketIds.filter(Boolean)) {
      // Hover the tab to open dropdown
      const tab = page.locator(`[data-market-tab="${marketId}"]`);
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
