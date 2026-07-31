/**
 * Live hosted probe: expected panels (MARKET_PANELS) vs actual DOM.
 * Flags false-ok candidates: missing or empty cards that signalling
 * might still paint as ready.
 *
 *   node scripts/probe-live-panel-signal.mjs
 *   SHOT_BASE_URL=https://… PROBE_MARKETS=bonds,credit node scripts/probe-live-panel-signal.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { MARKET_PANELS } from '../src/data/marketPanels.js';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const SETTLE = Number(process.env.PROBE_SETTLE_MS || 18000);
const FIRST_SETTLE = Number(process.env.PROBE_FIRST_SETTLE_MS || 28000);
const MARKETS = (process.env.PROBE_MARKETS || Object.keys(MARKET_PANELS).join(',')).split(',').map(s => s.trim()).filter(Boolean);

async function dismissSplash(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
  });
  for (let i = 0; i < 25; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(350);
      if (!(await page.locator('.splash-screen, .splash-overlay').count())) return 'clicked';
    } else {
      return 'none';
    }
    await page.waitForTimeout(400);
  }
  return 'timeout';
}

async function auditMarket(page, marketId, expected) {
  return page.evaluate(({ mid, expectedPanels }) => {
    const root =
      document.querySelector(`[data-market-id="${mid}"]`) ||
      document.querySelector(`[data-splash-market="${mid}"]`) ||
      document.body;

    const allKeys = [...root.querySelectorAll('[data-panel-key]')].map(el => el.getAttribute('data-panel-key'));
    const uniqueKeys = [...new Set(allKeys.filter(Boolean))];

    function classify(el) {
      if (!el) return { present: false, status: 'missing' };
      const disabled =
        el.getAttribute('data-panel-disabled') === '1' ||
        el.classList.contains('bento-card--disabled') ||
        !!el.querySelector('[data-panel-disabled="1"], .bento-card--disabled, [data-panel-empty="1"]');
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const hasChart = !!el.querySelector('canvas, svg, .echarts-for-react, [data-series-samples]');
      const hasMetric = !!el.querySelector('[data-metric-value], [data-metric-display], [class*="metric"], [class*="kpi"]');
      const hasNumbers = /\d/.test(text);
      const emptyMsg = /\bno data\b|\bunavailable\b|\bnot available\b|\bno .* scheduled\b/i.test(text) && text.length < 220;
      const thin = text.length < 40 && !hasChart && !hasMetric;
      let status = 'ok';
      if (disabled || emptyMsg) status = 'empty';
      else if (thin && !hasNumbers) status = 'empty';
      else if (!hasNumbers && !hasChart) status = 'thin';
      return {
        present: true,
        status,
        disabled,
        hasChart,
        hasMetric,
        hasNumbers,
        bodyLen: text.length,
        peek: text.slice(0, 90),
      };
    }

    const byId = {};
    for (const p of expectedPanels) {
      const scoped = root.querySelector(`[data-panel-key="${p.id}"]`);
      const any = document.querySelector(`[data-panel-key="${p.id}"]`);
      const el = scoped || any;
      byId[p.id] = {
        title: p.title,
        ...classify(el),
        scoped: !!scoped,
      };
    }

    // Extra DOM keys not in catalog
    const extras = uniqueKeys.filter(k => !expectedPanels.some(p => p.id === k));

    // Dropdown dots if openable — best effort
    const dots = [...document.querySelectorAll(`.market-panel-dropdown [data-status], .panel-dropdown-status-dot`)].map(d => ({
      status: d.getAttribute('data-status'),
      title: d.closest('button')?.querySelector('.panel-dropdown-title')?.textContent?.trim() || '',
    }));

    return {
      marketId: mid,
      expected: expectedPanels.length,
      mountedUnique: uniqueKeys.length,
      byId,
      extras,
      dots,
      uniqueKeys,
    };
  }, { mid: marketId, expectedPanels: expected });
}

async function hoverOpenDropdown(page, marketId) {
  // Click/hover the market tab so dropdown paints dots
  const tab = page.locator(`.market-tab-wrapper[data-market="${marketId}"], button.market-tab[data-market="${marketId}"], .market-tab-wrapper`).filter({ hasText: new RegExp(marketId, 'i') }).first();
  // Prefer role/label via markets — try several selectors
  const wrappers = page.locator('.market-tab-wrapper');
  const n = await wrappers.count();
  for (let i = 0; i < n; i++) {
    const w = wrappers.nth(i);
    const txt = (await w.innerText().catch(() => '')).toLowerCase();
    // Match by clicking active market first
    if (i === 0) continue;
  }
  // Click the active tab area then hover for dropdown
  const active = page.locator('.market-tab.active, .market-tab[aria-selected="true"]').first();
  if (await active.count()) {
    await active.hover().catch(() => {});
    await page.waitForTimeout(400);
  }
}

async function main() {
  console.log(`[probe] base=${BASE}`);
  console.log(`[probe] markets=${MARKETS.join(',')} settle=${SETTLE}ms first=${FIRST_SETTLE}ms`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const results = [];
  let first = true;

  for (const mid of MARKETS) {
    const expected = MARKET_PANELS[mid] || [];
    const pageErrors = [];
    const onErr = (e) => pageErrors.push(String(e?.message || e).slice(0, 160));
    page.on('pageerror', onErr);

    await page.goto(`${BASE}/?market=${encodeURIComponent(mid)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    const splash = await dismissSplash(page);
    await page.waitForTimeout(first ? FIRST_SETTLE : SETTLE);
    first = false;

    // Ensure tab selected
    const tabBtn = page.locator(`button.market-tab, .market-tab`).filter({ hasText: /./ }).first();
    // Try click market by label from MARKETS config is hard; URL param should select.

    const audit = await auditMarket(page, mid, expected);

    // Hover tab dropdown for this market if we can find it
    let dropdown = [];
    try {
      const wrappers = page.locator('.market-tab-wrapper');
      const count = await wrappers.count();
      for (let i = 0; i < count; i++) {
        const w = wrappers.nth(i);
        // open dropdown
        await w.hover({ force: true }).catch(() => {});
        await page.waitForTimeout(250);
        const items = await w.locator('.panel-dropdown-status-dot, .market-panel-dropdown-item').evaluateAll((els) =>
          els.map((el) => {
            if (el.classList.contains('panel-dropdown-status-dot')) {
              return {
                status: el.getAttribute('data-status'),
                title: el.closest('button')?.querySelector('.panel-dropdown-title')?.textContent?.trim() || '',
              };
            }
            return {
              status: el.querySelector('.panel-dropdown-status-dot')?.getAttribute('data-status') || 'unknown',
              title: el.querySelector('.panel-dropdown-title')?.textContent?.trim() || el.textContent?.trim()?.slice(0, 40) || '',
            };
          })
        );
        if (items.length) {
          // Deduplicate by title
          const seen = new Set();
          dropdown = items.filter((it) => {
            const k = it.title || Math.random();
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          // Match if many of expected titles appear
          const hit = expected.filter((p) => dropdown.some((d) => d.title === p.title)).length;
          if (hit >= Math.min(3, expected.length)) break;
        }
      }
    } catch { /* ignore dropdown scrape */ }

    page.off('pageerror', onErr);

    const missing = [];
    const empty = [];
    const thin = [];
    const ok = [];
    for (const p of expected) {
      const r = audit.byId[p.id];
      if (!r?.present) missing.push(p);
      else if (r.status === 'empty') empty.push({ ...p, peek: r.peek });
      else if (r.status === 'thin') thin.push({ ...p, peek: r.peek });
      else ok.push(p);
    }

    // False signal: dropdown says ok/verified for missing/empty panel titles
    const falseGreen = [];
    for (const d of dropdown) {
      if (d.status !== 'ok') continue;
      const exp = expected.find((p) => p.title === d.title);
      if (!exp) continue;
      const r = audit.byId[exp.id];
      if (!r?.present || r.status === 'empty' || r.status === 'thin') {
        falseGreen.push({ title: d.title, id: exp.id, dom: r?.status || 'missing', peek: r?.peek });
      }
    }

    const row = {
      market: mid,
      splash,
      expected: expected.length,
      ok: ok.length,
      empty: empty.length,
      thin: thin.length,
      missing: missing.length,
      mountedUnique: audit.mountedUnique,
      missingIds: missing.map((p) => p.id),
      emptyIds: empty.map((p) => p.id),
      thinIds: thin.map((p) => p.id),
      falseGreen,
      dropdownOk: dropdown.filter((d) => d.status === 'ok').length,
      dropdownTotal: dropdown.length,
      pageErrors: pageErrors.slice(0, 5),
      extras: audit.extras.slice(0, 8),
    };
    results.push(row);

    const flag = row.missing + row.empty + row.falseGreen.length > 0 ? '⚠' : '✓';
    console.log(
      `${flag} ${mid.padEnd(16)} expected=${row.expected} ok=${row.ok} empty=${row.empty} thin=${row.thin} missing=${row.missing}` +
      ` dropdown=${row.dropdownOk}/${row.dropdownTotal} falseGreen=${row.falseGreen.length}` +
      (row.pageErrors.length ? ` errors=${row.pageErrors.length}` : '')
    );
    if (row.missingIds.length) console.log(`    missing: ${row.missingIds.join(', ')}`);
    if (row.emptyIds.length) console.log(`    empty:   ${row.emptyIds.join(', ')}`);
    if (row.falseGreen.length) {
      console.log(`    FALSE GREEN: ${row.falseGreen.map((f) => `${f.id}(${f.dom})`).join(', ')}`);
    }
  }

  await browser.close();

  const summary = {
    base: BASE,
    at: new Date().toISOString(),
    markets: results.length,
    totalExpected: results.reduce((s, r) => s + r.expected, 0),
    totalOk: results.reduce((s, r) => s + r.ok, 0),
    totalEmpty: results.reduce((s, r) => s + r.empty, 0),
    totalThin: results.reduce((s, r) => s + r.thin, 0),
    totalMissing: results.reduce((s, r) => s + r.missing, 0),
    totalFalseGreen: results.reduce((s, r) => s + r.falseGreen.length, 0),
    marketsWithFalseGreen: results.filter((r) => r.falseGreen.length).map((r) => r.market),
    marketsWithMissing: results.filter((r) => r.missing > 0).map((r) => r.market),
    results,
  };

  const outPath = 'live-panel-signal-probe.json';
  writeFileSync(outPath, JSON.stringify(summary, null, 2));
  console.log('\n=== SUMMARY ===');
  console.log(`expected ${summary.totalExpected} · ok ${summary.totalOk} · empty ${summary.totalEmpty} · thin ${summary.totalThin} · missing ${summary.totalMissing}`);
  console.log(`false-green (dropdown ok but panel missing/empty): ${summary.totalFalseGreen}`);
  if (summary.marketsWithFalseGreen.length) {
    console.log(`false-green markets: ${summary.marketsWithFalseGreen.join(', ')}`);
  }
  if (summary.marketsWithMissing.length) {
    console.log(`missing markets: ${summary.marketsWithMissing.join(', ')}`);
  }
  console.log(`wrote ${outPath}`);

  // Non-zero if severe: lots of missing or any false green
  if (summary.totalFalseGreen > 0 || summary.totalMissing > 20) {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
