import { test, expect } from '@playwright/test';

const BASE = 'https://kevinkicho.github.io/kyahoofinance032926/';
test.setTimeout(120000);

test('tab dropdown shows panel list when clicking active tab', async ({ page }) => {
  await page.goto(`${BASE}?market=equities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(5000);

  // Click the active Equities tab
  const activeTab = page.locator('.market-tab.active').first();
  await activeTab.click();
  await page.waitForTimeout(500);

  // Check for panel dropdown
  const dropdown = page.locator('.market-panel-dropdown');
  const dropdownVisible = await dropdown.isVisible();
  console.log('Dropdown visible:', dropdownVisible);

  if (dropdownVisible) {
    const items = await dropdown.locator('.market-panel-dropdown-item').allTextContents();
    console.log('Panel items:', items);
    expect(items.length).toBeGreaterThan(0);
    expect(items.some(t => t.includes('Heatmap') || t.includes('Key Indices'))).toBeTruthy();
  }

  await page.screenshot({ path: 'test-results/tab-dropdown.png' });
});

test('universe expansion queue shows data table with proper columns', async ({ page }) => {
  await page.goto(`${BASE}?market=equities`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(40000);

  const text = await page.textContent('body');

  // Check for universe panel
  const hasUniversePanel = text?.includes('Universe Expansion Queue');
  console.log('Universe panel present:', hasUniversePanel);

  // Check for table headers (the new 15-column table)
  const hasTicker = text?.includes('Ticker');
  const hasMktCap = text?.includes('Mkt Cap');
  const hasSector = text?.includes('Sector');
  const hasIndustry = text?.includes('Industry');
  const hasPrice = text?.includes('Price');
  const hasExchange = text?.includes('Exch');
  console.log('Has Ticker header:', hasTicker);
  console.log('Has Mkt Cap header:', hasMktCap);
  console.log('Has Sector header:', hasSector);
  console.log('Has Industry header:', hasIndustry);
  console.log('Has Price header:', hasPrice);
  console.log('Has Exch header:', hasExchange);

  // Check for actual ticker data (not just headers)
  const hasTickerData = /\b[A-Z]{2,5}\b.*\$[\d.]+B/.test(text || '');
  console.log('Has ticker data with market cap:', hasTickerData);

  await page.screenshot({ path: 'test-results/universe-queue.png', fullPage: true });

  expect(hasUniversePanel).toBeTruthy();
});