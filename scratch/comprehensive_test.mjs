import { exec } from 'child_process';
import { chromium } from 'playwright';

const PORT = 4400;
const BASE = `http://localhost:${PORT}/kyahoofinance032926/`;

(async () => {
  const server = exec(`npx vite preview --host 0.0.0.0 --port ${PORT}`, { cwd: '/mnt/c/Users/kevin/Workspace/kyahoofinance032926' });
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try { const res = await fetch(BASE); if (res.ok) { ready = true; break; } } catch {}
  }
  if (!ready) { console.error('Server failed'); server.kill(); process.exit(1); }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });

  // Clear everything
  await page.goto(BASE);
  await page.evaluate(() => { sessionStorage.clear(); localStorage.clear(); });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(25000);

  console.log('=== TEST 1: Layout Persistence ===');
  // Check if heatmap layout BentoWrapper renders with correct sizes
  const layoutCheck = await page.evaluate(() => {
    const items = document.querySelectorAll('.react-grid-item');
    return Array.from(items).slice(0, 6).map(el => ({
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
      key: el.firstElementChild?.getAttribute('data-panel-key') || el.firstElementChild?.getAttribute('panel-key') || 'unknown',
    }));
  });
  console.log('Layout items:', JSON.stringify(layoutCheck));
  const layoutOK = layoutCheck.some(i => i.w > 500);
  console.log(layoutOK ? 'PASS: Layout has wide panels' : 'FAIL: All panels collapsed to narrow columns');

  console.log('\n=== TEST 2: Heatmap Zoom-Fit ===');
  // Check if heatmap canvas exists and breadcrumb button is clickable
  const heatmapExists = await page.locator('canvas').count();
  const breadcrumbBtn = page.locator('button', { hasText: 'Global Market' }).first();
  const breadcrumbExists = await breadcrumbBtn.isVisible().catch(() => false);
  console.log(`Heatmap canvas: ${heatmapExists > 0 ? 'YES' : 'NO'}`);
  console.log(`Breadcrumb button: ${breadcrumbExists ? 'YES' : 'NO'}`);
  if (breadcrumbExists) {
    await breadcrumbBtn.click();
    await page.waitForTimeout(500);
    console.log('PASS: Breadcrumb clicked without error');
  } else {
    console.log('INFO: Breadcrumb not visible (might need zoom first)');
  }

  console.log('\n=== TEST 3: SEC Filing Activity ===');
  const filingsBody = await page.evaluate(() => {
    const card = document.querySelector('[data-panel-key="sec-filings"]');
    if (!card) return 'PANEL NOT FOUND';
    return card.textContent.substring(0, 500);
  });
  console.log('SEC Filings content:', filingsBody.substring(0, 200));
  const hasEDGARLinks = filingsBody.includes('sec.gov');
  const hasFilingDates = /\d{4}-\d{2}-\d{2}/.test(filingsBody);
  const hasTickers = filingsBody.includes('AAPL') || filingsBody.includes('MSFT');
  console.log(`EDGAR links: ${hasEDGARLinks ? 'YES' : 'NO'}`);
  console.log(`Filing dates: ${hasFilingDates ? 'YES' : 'NO'}`);
  console.log(`Ticker names: ${hasTickers ? 'YES' : 'NO'}`);

  console.log('\n=== TEST 4: SEC Mega-Cap Fundamentals ===');
  const fundamentalsBody = await page.evaluate(() => {
    const card = document.querySelector('[data-panel-key="sec-fundamentals"]');
    if (!card) return 'PANEL NOT FOUND';
    return card.textContent.substring(0, 500);
  });
  console.log('SEC Fundamentals content:', fundamentalsBody.substring(0, 200));
  const hasMultipleTickers = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'].filter(t => fundamentalsBody.includes(t));
  const hasROA = fundamentalsBody.includes('ROA');
  const hasROE = fundamentalsBody.includes('ROE');
  console.log(`Tickers found: ${hasMultipleTickers.length} (${hasMultipleTickers.join(', ')})`);
  console.log(`ROA column: ${hasROA ? 'YES' : 'NO'}`);
  console.log(`ROE column: ${hasROE ? 'YES' : 'NO'}`);

  console.log('\n=== TEST 5: Panel Health Dropdown ===');
  const fxTab = page.locator('[role="tab"]', { hasText: 'FX' }).first();
  await fxTab.hover();
  await page.waitForTimeout(2000);
  const fxDots = await page.evaluate(() =>
    Array.from(document.querySelectorAll('.panel-dropdown-status-dot')).map(d => d.getAttribute('data-status'))
  );
  const fxOk = fxDots.filter(s => s === 'ok').length;
  const fxTotal = fxDots.length;
  console.log(`FX: ${fxOk}/${fxTotal} ok`);

  await page.screenshot({ path: 'screenshots/comprehensive_test.png', fullPage: false });

  await browser.close();
  server.kill();
})();
