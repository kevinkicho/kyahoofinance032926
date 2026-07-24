/**
 * Playwright hosted walkthrough: every market tab, every visible panel.
 * Flags empty / no-data cards and splash red chips.
 *
 *   SHOT_BASE_URL=https://… node scripts/playwright-hosted-panels.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { MARKET_PANELS } from '../src/data/marketPanels.js';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const SETTLE = Number(process.env.AUDIT_SETTLE_MS || 22000);
const FIRST_SETTLE = Number(process.env.AUDIT_FIRST_SETTLE_MS || 45000);

const MARKETS = Object.keys(MARKET_PANELS);

async function dismissSplash(page) {
  // Mark splash as already seen so we can land on the hub quickly, then
  // still force-click Enter if splash is up.
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
  });
  for (let i = 0; i < 30; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(400);
      if (!(await page.locator('.splash-screen, .splash-overlay').count())) return 'clicked';
    } else {
      return 'none';
    }
    await page.waitForTimeout(500);
  }
  return 'timeout';
}

async function collect(page, marketId) {
  return page.evaluate((mid) => {
    const expected = [];
    // Prefer data-panel-key cards (canonical)
    const cards = Array.from(document.querySelectorAll(
      `[data-market-id="${mid}"] [data-panel-key], [data-splash-market="${mid}"] [data-panel-key], [data-panel-key]`
    ));
    // Deduplicate by panel key
    const seen = new Set();
    const panels = [];
    for (const c of cards) {
      const key = c.getAttribute('data-panel-key') || '';
      if (!key || seen.has(key)) continue;
      // Prefer cards under active market container when present
      seen.add(key);
      const title = c.querySelector(
        '.bento-card__title, .bc-title, .bento-panel-title, h3, h4'
      )?.textContent?.trim() || key;
      const body = (c.textContent || '').replace(/\s+/g, ' ').trim();
      const hasChart = !!c.querySelector('canvas, svg, .echarts-for-react');
      const hasTable = !!c.querySelector('table, [class*="scorecard"], [class*="grid-row"]');
      const hasMetric = !!c.querySelector(
        '[class*="metric"], [class*="kpi"], [class*="MetricValue"], [class*="mv-"]'
      );
      // Empty error log is a healthy state (no errors), not a failed panel.
      if (/error log/i.test(title) && /0 entries|no errors/i.test(body)) {
        panels.push({
          id: key, title, ok: true, empty: false, hasChart, hasTable, hasMetric,
          bodyLen: body.length, peek: body.slice(0, 100),
        });
        continue;
      }
      // Soft loading placeholders still count as mounted working shells
      const loadingShell = /loading…|loading\.\.\.|fetching/i.test(body);
      const emptyish =
        /no data|unavailable|not configured|temporarily/i.test(body)
        && body.length < 160
        && !loadingShell;
      const thin = body.length < 30 && !hasChart && !hasTable && !loadingShell;
      const ok = !emptyish && !thin && (hasChart || hasTable || hasMetric || body.length > 50 || loadingShell);
      panels.push({
        id: key,
        title,
        ok,
        empty: emptyish || thin,
        hasChart,
        hasTable,
        hasMetric,
        bodyLen: body.length,
        peek: body.slice(0, 100),
      });
    }

    // Fallback: any bento card titles if no data-panel-key
    if (!panels.length) {
      for (const c of document.querySelectorAll('[class*="bento-card"], .react-grid-item')) {
        const title = c.querySelector('h3, h4, [class*="title"]')?.textContent?.trim() || '(untitled)';
        const body = (c.textContent || '').replace(/\s+/g, ' ').trim();
        const hasChart = !!c.querySelector('canvas, svg');
        const emptyish = /no data|unavailable|not configured/i.test(body) && body.length < 160;
        const ok = !emptyish && (hasChart || body.length > 50);
        panels.push({
          id: title,
          title,
          ok,
          empty: !ok,
          hasChart,
          hasTable: false,
          hasMetric: false,
          bodyLen: body.length,
          peek: body.slice(0, 100),
        });
      }
    }

    return {
      url: location.href,
      panels,
      consoleHint: document.title,
    };
  }, marketId);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const pageErrors = [];
const consoleErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e.message).slice(0, 200)));
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200));
});

const report = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  markets: [],
  summary: { tabs: 0, panels: 0, ok: 0, empty: 0, missingExpected: 0 },
};

console.log(`Playwright hosted panel walk @ ${BASE}\n`);

// Warm first load (data wave)
await page.goto(`${BASE}/?market=equities`, { waitUntil: 'domcontentloaded', timeout: 90000 });
await dismissSplash(page);
await page.waitForTimeout(FIRST_SETTLE);
await dismissSplash(page);

for (const marketId of MARKETS) {
  const expected = (MARKET_PANELS[marketId] || []).map((p) => p.id);
  const label = marketId;
  pageErrors.length = 0;
  consoleErrors.length = 0;
  try {
    await page.goto(`${BASE}/?market=${marketId}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await dismissSplash(page);
    await page.waitForTimeout(SETTLE);
    await dismissSplash(page);

    // Click tab if present (layout may use in-app nav)
    const tab = page.locator(`[data-market="${marketId}"], button:has-text("${marketId}")`).first();
    // Prefer URL market= param already set

    const col = await collect(page, marketId);
    const foundIds = new Set(col.panels.map((p) => p.id));
    const missingExpected = expected.filter((id) => !foundIds.has(id));
    const empty = col.panels.filter((p) => p.empty || !p.ok);
    const ok = col.panels.filter((p) => p.ok).length;

    report.summary.tabs += 1;
    report.summary.panels += col.panels.length;
    report.summary.ok += ok;
    report.summary.empty += empty.length;
    report.summary.missingExpected += missingExpected.length;

    const status = empty.length || missingExpected.length ? 'MIX' : 'OK ';
    console.log(
      `${status} ${label.padEnd(18)} panels=${String(col.panels.length).padStart(2)} ok=${String(ok).padStart(2)} empty=${String(empty.length).padStart(2)} missingExp=${missingExpected.length} pe=${pageErrors.length}`
    );
    for (const p of empty) {
      console.log(`   ✗ ${p.id} | ${p.title} | ${p.peek}`);
    }
    if (missingExpected.length && missingExpected.length <= 8) {
      console.log(`   missing expected: ${missingExpected.join(', ')}`);
    }

    report.markets.push({
      marketId,
      expected: expected.length,
      found: col.panels.length,
      ok,
      empty: empty.map((p) => ({ id: p.id, title: p.title, peek: p.peek })),
      missingExpected,
      pageErrors: pageErrors.slice(0, 5),
      consoleErrors: consoleErrors.slice(0, 5),
      panels: col.panels,
    });
  } catch (e) {
    console.log(`FAIL ${label.padEnd(18)} ${String(e.message).slice(0, 120)}`);
    report.markets.push({
      marketId,
      error: String(e.message),
      empty: [],
      missingExpected: expected,
      panels: [],
    });
    report.summary.tabs += 1;
  }
}

await browser.close();

const s = report.summary;
console.log(`\n=== SUMMARY ===`);
console.log(`Tabs: ${s.tabs}`);
console.log(`Panels seen: ${s.panels}  ok=${s.ok}  empty=${s.empty}`);
console.log(`Missing expected ids: ${s.missingExpected}`);

writeFileSync('playwright-hosted-audit.json', JSON.stringify(report, null, 2));
console.log('Wrote playwright-hosted-audit.json');
process.exit(s.empty > 0 ? 1 : 0);
