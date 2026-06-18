// Core UI smoke tests. These deliberately avoid asserting on upstream-data
// outcomes (those are unreliable without API keys). They verify that the
// shell — tabs, theme, currency, search, refresh toggle — works.
import { test, expect } from '@playwright/test';

test.describe('App shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('renders the market tab bar with all 18 tabs', async ({ page }) => {
    const tabs = page.getByRole('tab');
    await expect(tabs.first()).toBeVisible();
    await expect(tabs).toHaveCount(18);

    // Spot-check a handful that span the list so a reorder is caught.
    await expect(page.getByRole('tab', { name: /Equities market/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Bonds market/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Crypto market/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /Analytics market/i })).toBeVisible();
  });

  test('clicking a tab marks it active and updates the URL', async ({ page }) => {
    const bondsTab = page.getByRole('tab', { name: /Bonds market/i });
    await bondsTab.click();
    await expect(bondsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/[?&]market=bonds/);
  });

  test('keyboard shortcut 2 jumps to the second tab', async ({ page }) => {
    // Make sure a textbox isn't focused (shortcut is gated on that).
    await page.locator('body').click();
    await page.keyboard.press('2');
    await expect(page.getByRole('tab', { name: /Bonds market/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('theme toggle flips data-theme on <html> and persists to localStorage', async ({ page }) => {
    const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    await page.getByRole('button', { name: /Switch to (light|dark) mode/i }).click();
    const flipped = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(flipped).not.toBe(initial);
    const stored = await page.evaluate(() => localStorage.getItem('hub-theme'));
    expect(stored).toBe(flipped);
  });

  test('currency picker updates selection', async ({ page }) => {
    const select = page.getByRole('combobox', { name: 'Currency' });
    await expect(select).toBeVisible();
    await select.selectOption('EUR');
    await expect(select).toHaveValue('EUR');
  });

  test('search input filters market results', async ({ page }) => {
    const search = page.getByRole('combobox', { name: /Search markets/i });
    await search.fill('bonds');
    // Results popover wires aria-expanded=true once matches exist.
    await expect(search).toHaveAttribute('aria-expanded', 'true');
  });

  test('auto-refresh toggle switches between On and Off', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /(Enable|Disable) auto-refresh/i });
    const before = await toggle.textContent();
    await toggle.click();
    const after = await toggle.textContent();
    expect(after).not.toBe(before);
    expect(['On', 'Off']).toContain(after?.trim());
  });

  test('console stays free of uncaught errors during navigation', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
    });

    // Visit a few tabs that exercise different code paths.
    for (const name of ['Bonds', 'FX', 'Crypto', 'Calendar', 'Analytics']) {
      await page.getByRole('tab', { name: new RegExp(`${name} market`, 'i') }).click();
      await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {});
    }

    // Filter out the noise we already know about and don't care to fail on:
    //   - 503/404 from API routes when API keys are missing
    //   - React DevTools recommendation
    //   - vite HMR ping noise
    const ignore = [
      /Failed to load resource.*4\d\d/,
      /Failed to load resource.*5\d\d/,
      /React DevTools/,
      /\[vite\]/,
      /favicon/,
    ];
    const significant = errors.filter((e) => !ignore.some((re) => re.test(e)));
    expect(significant, significant.join('\n')).toEqual([]);
  });
});

test.describe('Empty-state rendering (no API keys)', () => {
  test('Bonds tab renders without crashing when fetch fails', async ({ page }) => {
    await page.goto('/?market=bonds');
    // The "no-mock" policy: when no data, panels render "—" rather than fake values.
    // Here we just verify the tab renders SOMETHING (heading + at least one panel)
    // and didn't throw.
    await expect(page.getByRole('tab', { name: /Bonds market/i })).toHaveAttribute('aria-selected', 'true');
    // BondsMarket wraps content in role="region" aria-label="Bonds".
    await expect(page.getByRole('region', { name: /Bonds/i }).first()).toBeVisible();
  });

  test('Watchlist tab shows the empty-state copy when no tickers are saved', async ({ page }) => {
    // Clear any saved watchlist before navigating so we get the empty state.
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('hub-watchlist-tickers');
      localStorage.removeItem('hub-watchlist-metrics');
    });
    await page.goto('/?market=watchlist');
    await expect(page.getByText(/No tickers added yet/i)).toBeVisible();
  });
});

test.describe('User Profile Dropdown', () => {
  test('opens profile menu on click and displays options', async ({ page }) => {
    await page.goto('/');
    const profileBtn = page.getByRole('button', { name: 'User profile menu' });
    await expect(profileBtn).toBeVisible();

    // Verify it initially shows "Not signed in" title/tooltip
    await expect(profileBtn).toHaveAttribute('title', 'Not signed in');

    // Clicking the profile button should open the dropdown
    await profileBtn.click();

    // The dropdown should now be visible and contain Guest User options
    const guestUserText = page.getByText('Guest User');
    await expect(guestUserText).toBeVisible();
    await expect(page.getByText('Not signed in')).toBeVisible();

    const signInBtn = page.getByRole('button', { name: 'Sign In with Google' });
    await expect(signInBtn).toBeVisible();
  });
});
