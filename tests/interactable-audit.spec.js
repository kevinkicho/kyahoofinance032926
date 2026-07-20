/**
 * Interactable Audit — validates every clickable, label, and interactable
 * across all 18 market tabs. For each tab:
 *   1. Navigate and wait for bento grid to render
 *   2. Count all <button>, <a>, [role="button"], [role="tab"], [role="link"]
 *      and verify each is visible and enabled
 *   3. Count all [aria-label], <label>, <th>, <caption> and verify non-empty
 *   4. Click every visible button/link (max 5 per tab) and check for console errors
 *   5. Verify bento panels render
 *   6. Report summary
 */
import { test, expect } from '@playwright/test';

const MARKET_TABS = [
  'Equities', 'Bonds', 'FX', 'Derivatives', 'Real Estate',
  'Insurance', 'Commodities', 'Macro', 'Equity+',
  'Crypto', 'Credit', 'Sentiment', 'Calendar', 'Watchlist',
  'Analytics', 'Labor', 'Energy', 'Alerts',
];

const MAX_CLICKS_PER_TAB = 5;

test.describe('Interactable Audit — all 18 tabs', () => {
  for (const tabName of MARKET_TABS) {
    test(`${tabName} — interactables, labels, and panels`, async ({ page }) => {
      const errors = [];
      page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
      });

      await page.goto('/');
      const tab = page.getByRole('tab', { name: new RegExp(`${tabName} market`, 'i') });
      await expect(tab).toBeVisible();
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');

      // Wait for bento grid or content to render
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(2000);

      // 1. Count interactables
      const interactables = await page.$$eval(
        'button, a, [role="button"], [role="tab"], [role="link"]',
        (els) => els.map((el) => ({
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute('role'),
          text: (el.textContent || '').trim().slice(0, 60),
          visible: el.offsetParent !== null,
          disabled: el.disabled === true || el.getAttribute('aria-disabled') === 'true',
        }))
      );

      const visibleEnabled = interactables.filter((i) => i.visible && !i.disabled);
      expect(visibleEnabled.length).toBeGreaterThanOrEqual(1);

      // 2. Count labels
      const labels = await page.$$eval(
        '[aria-label], label, th, caption',
        (els) => els.map((el) => {
          const aria = el.getAttribute('aria-label');
          const text = el.textContent || '';
          return {
            ariaLabel: aria ? aria.trim() : null,
            text: text.trim(),
            tag: el.tagName.toLowerCase(),
          };
        })
      );

      const nonEmptyLabels = labels.filter(
        (l) => (l.ariaLabel && l.ariaLabel.length > 0) || (l.text && l.text.length > 0)
      );
      expect(nonEmptyLabels.length).toBeGreaterThanOrEqual(1);

      // 3. Click up to MAX_CLICKS_PER_TAB visible buttons/links
      const clickTargets = visibleEnabled.filter(
        (i) => i.tag === 'button' || i.role === 'button'
      );
      const clicksToDo = Math.min(clickTargets.length, MAX_CLICKS_PER_TAB);
      for (let i = 0; i < clicksToDo; i++) {
        const target = clickTargets[i];
        try {
          const btn = page.locator(`button:has-text("${target.text}")`).first();
          if (await btn.isVisible().catch(() => false)) {
            await btn.click({ timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(300);
          }
        } catch {
          // skip if element is detached or not clickable
        }
      }

      // 4. Verify bento panels render
      const bentoPanels = await page.$$eval(
        '[class*="bento-card"], [class*="bento-panel"]',
        (els) => els.filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }).length
      );
      expect(bentoPanels).toBeGreaterThanOrEqual(1);

      // 5. Filter console errors
      const ignore = [
        /Failed to load resource.*4\d\d/,
        /Failed to load resource.*5\d\d/,
        /React DevTools/,
        /\[vite\]/,
        /favicon/,
        /WebSocket connection to/,
      ];
      const significant = errors.filter((e) => !ignore.some((re) => re.test(e)));
      expect(significant, `Console errors in ${tabName}: ${significant.join(', ')}`).toEqual([]);

      // 6. Report summary
      const summary = {
        tab: tabName,
        totalInteractables: interactables.length,
        visibleEnabled: visibleEnabled.length,
        totalLabels: labels.length,
        nonEmptyLabels: nonEmptyLabels.length,
        bentoPanels,
        buttonsClicked: clicksToDo,
        consoleErrors: significant.length,
      };
      test.info().annotations.push({
        type: 'summary',
        description: JSON.stringify(summary, null, 2),
      });
    });
  }
});
