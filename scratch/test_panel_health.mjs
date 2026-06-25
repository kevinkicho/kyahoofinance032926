import { exec } from 'child_process';
import { chromium } from 'playwright';

const PORT = 4186;
const BASE = `http://localhost:${PORT}/kyahoofinance032926/`;

(async () => {
  const server = exec(`npx vite preview --host 0.0.0.0 --port ${PORT}`, { cwd: '/mnt/c/Users/kevin/Workspace/kyahoofinance032926' });

  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 1000));
    try { const res = await fetch(BASE); if (res.ok) { ready = true; break; } } catch {}
  }
  if (!ready) { console.error('Server failed'); server.kill(); process.exit(1); }
  console.log(`Server ready on port ${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1200 } });

  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // ── Test 1: Equities tab is active, hover over Equities → should show real status ──
  const eqTab = page.locator('[role="tab"]', { hasText: 'Equities' }).first();
  if (await eqTab.isVisible()) { await eqTab.click(); await page.waitForTimeout(3000); }

  // Hover over Equities tab to open dropdown
  await eqTab.hover();
  await page.waitForTimeout(1500);

  // Check panel health dots in dropdown
  const eqDots = await page.evaluate(() => {
    const dots = document.querySelectorAll('.panel-dropdown-status-dot');
    return Array.from(dots).map(d => ({
      status: d.getAttribute('data-status'),
      label: d.nextElementSibling?.textContent || '',
    }));
  });
  console.log('\n─── Equities panel health (active tab, hovered) ───');
  eqDots.forEach(d => console.log(`  ${d.status === 'ok' ? '🟢' : d.status === 'null' ? '🔴' : d.status === 'stale' ? '🟠' : '⚪'} ${d.label} (${d.status})`));

  const eqOkCount = eqDots.filter(d => d.status === 'ok').length;
  const eqNullCount = eqDots.filter(d => d.status === 'null').length;
  console.log(`  Summary: ${eqOkCount} ok, ${eqNullCount} null, ${eqDots.length} total`);

  // ── Test 2: Hover over Bonds tab (non-active) → should show data context status ──
  // Move mouse away first
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);

  const bondsTab = page.locator('[role="tab"]', { hasText: 'Bonds' }).first();
  if (await bondsTab.isVisible()) {
    await bondsTab.hover();
    await page.waitForTimeout(1500);

    const bondsDots = await page.evaluate(() => {
      const dots = document.querySelectorAll('.panel-dropdown-status-dot');
      return Array.from(dots).map(d => ({
        status: d.getAttribute('data-status'),
        label: d.nextElementSibling?.textContent || '',
      }));
    });
    console.log('\n─── Bonds panel health (non-active, hovered) ───');
    bondsDots.forEach(d => console.log(`  ${d.status === 'ok' ? '🟢' : d.status === 'null' ? '🔴' : d.status === 'stale' ? '🟠' : '⚪'} ${d.label} (${d.status})`));

    const bondsOkCount = bondsDots.filter(d => d.status === 'ok').length;
    const bondsLoadingCount = bondsDots.filter(d => d.status === 'loading').length;
    const bondsUnknownCount = bondsDots.filter(d => d.status === 'unknown').length;
    console.log(`  Summary: ${bondsOkCount} ok, ${bondsLoadingCount} loading, ${bondsUnknownCount} unknown, ${bondsDots.length} total`);
  }

  // Move away again
  await page.mouse.move(0, 0);
  await page.waitForTimeout(500);

  // ── Test 3: Hover over Equities again → should show DOM-based status ──
  await eqTab.hover();
  await page.waitForTimeout(1500);

  const eqDots2 = await page.evaluate(() => {
    const dots = document.querySelectorAll('.panel-dropdown-status-dot');
    return Array.from(dots).map(d => ({
      status: d.getAttribute('data-status'),
      label: d.nextElementSibling?.textContent || '',
    }));
  });
  console.log('\n─── Equities panel health (second hover, active) ───');
  eqDots2.forEach(d => console.log(`  ${d.status === 'ok' ? '🟢' : d.status === 'null' ? '🔴' : d.status === 'stale' ? '🟠' : '⚪'} ${d.label} (${d.status})`));

  // Verify: Equities panels should NOT all be 'unknown' — they should show real status
  const allUnknown = eqDots2.every(d => d.status === 'unknown');
  console.log(`\n─── Verification ───`);
  console.log(`  All unknown (BAD): ${allUnknown}`);
  console.log(`  Has real status (GOOD): ${!allUnknown}`);

  // Verify: at least some panels show 'ok' for Equities (it's the active tab)
  const hasOk = eqDots2.some(d => d.status === 'ok');
  console.log(`  Has 'ok' panels: ${hasOk}`);

  await page.screenshot({ path: 'screenshots/panel_health_test.png', fullPage: false });

  await browser.close();
  server.kill();
})();
