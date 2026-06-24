import { test, expect } from '@playwright/test';

const BASE = '/kyahoofinance032926/';

test.setTimeout(60000);

test('Panel Trace Inspector renders in Analytics tab', async ({ page }) => {
  await page.goto(`${BASE}?market=analytics`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(10000);

  // Check for Panel Trace Inspector title
  const body = await page.textContent('body');
  const hasPanelTrace = body?.includes('Panel Trace Inspector');
  console.log('Has Panel Trace Inspector:', hasPanelTrace);

  // Look for trace table
  const traceRows = await page.locator('.pti-row').count();
  console.log('Trace rows:', traceRows);

  // Look for market selector
  const marketSelect = await page.locator('.pti-market-select').count();
  console.log('Market selector present:', marketSelect > 0);

  // Take screenshot
  await page.screenshot({ path: 'test-results/panel-trace.png', fullPage: true });

  expect(hasPanelTrace).toBeTruthy();
});