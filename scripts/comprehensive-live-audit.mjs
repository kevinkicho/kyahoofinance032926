/**
 * Comprehensive hosted panel audit.
 *
 * For every MARKET_PANELS entry across all markets:
 *  1. Mount market tab (URL)
 *  2. Collect DOM panel keys + content substance (content body only)
 *  3. Open topbar dropdown and read status dots/badges
 *  4. Classify: ok | empty | thin | missing | disabled
 *  5. Flag FALSE SIGNAL: dropdown data-status=ok but DOM missing/empty/thin/disabled
 *  6. Flag SIGNAL GAP: DOM has content but dropdown not ok
 *  7. Capture pageerrors / console errors
 *  8. Two settle passes (early + late) to catch cold vs warm paint
 *
 *   node scripts/comprehensive-live-audit.mjs
 *   PROBE_MARKETS=bonds,fx node scripts/comprehensive-live-audit.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { MARKET_PANELS } from '../src/data/marketPanels.js';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const MARKETS = (process.env.PROBE_MARKETS || Object.keys(MARKET_PANELS).join(','))
  .split(',').map((s) => s.trim()).filter(Boolean);
const EARLY_MS = Number(process.env.AUDIT_EARLY_MS || 10000);
const LATE_MS = Number(process.env.AUDIT_LATE_MS || 22000);
const FIRST_LATE_MS = Number(process.env.AUDIT_FIRST_LATE_MS || 32000);
const OUT_DIR = process.env.AUDIT_OUT_DIR || 'test-results/live-audit';

function emptyResult(marketId, expected) {
  return {
    market: marketId,
    expected: expected.length,
    dropdownN: 0,
    passes: {},
    panels: {},
    falseSignals: [],
    signalGaps: [],
    pageErrors: [],
    consoleErrors: [],
  };
}

async function dismissSplash(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
  });
  for (let i = 0; i < 30; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
      if (!(await page.locator('.splash-screen, .splash-overlay').count())) return 'clicked';
    } else return 'none';
    await page.waitForTimeout(350);
  }
  return 'timeout';
}

async function ensureDropdown(page, marketId, attempts = 4) {
  const tabSel = `button.market-tab[data-market="${marketId}"]`;
  const tab = page.locator(tabSel);
  if (!(await tab.count())) return 0;

  for (let a = 0; a < attempts; a++) {
    if ((await tab.getAttribute('aria-selected')) !== 'true') {
      await tab.click().catch(() => {});
      await page.waitForTimeout(900);
    }
    const wrapper = page.locator('.market-tab-wrapper').filter({ has: page.locator(tabSel) });
    await wrapper.scrollIntoViewIfNeeded().catch(() => {});
    await wrapper.hover().catch(() => {});
    await page.waitForTimeout(900);
    let n = await page.locator('.market-panel-dropdown-item').count();
    if (n > 0) return n;

    const box = await wrapper.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(400);
      await page.mouse.move(box.x + box.width / 2, box.y + box.height + 8);
      await page.waitForTimeout(600);
    }
    await wrapper.dispatchEvent('mouseenter').catch(() => {});
    await page.waitForTimeout(1200);
    n = await page.locator('.market-panel-dropdown-item').count();
    if (n > 0) return n;
  }
  return await page.locator('.market-panel-dropdown-item').count();
}

async function snapshot(page, marketId, expected) {
  return page.evaluate(({ mid, expectedPanels }) => {
    const root =
      document.querySelector(`[data-market-id="${mid}"]`) ||
      document.body;

    function contentBody(el) {
      const c = el.querySelector('.bento-panel-content');
      return ((c || el).textContent || '').replace(/\s+/g, ' ').trim();
    }

    function classifyDom(el) {
      if (!el) {
        return {
          present: false,
          status: 'missing',
          disabled: false,
          hasChart: false,
          hasMetric: false,
          hasTable: false,
          bodyLen: 0,
          peek: '',
        };
      }
      const disabled =
        el.getAttribute('data-panel-disabled') === '1' ||
        el.classList.contains('bento-card--disabled') ||
        !!el.querySelector('[data-panel-disabled="1"], .bento-card--disabled, [data-panel-empty="1"]');
      const content = el.querySelector('.bento-panel-content') || el;
      const body = contentBody(el);
      const hasChart = !!content.querySelector('canvas, svg, .echarts-for-react, [data-series-samples]');
      const hasMetric = !!content.querySelector(
        '[data-metric-value], [data-metric-display], [class*="metric"], [class*="kpi"]'
      );
      const hasTable = !!content.querySelector('table');
      const hasNumbers = /\d/.test(body);
      const emptyMsg =
        /\bno data\b|\bunavailable\b|\bnot available\b|\bno .* scheduled\b|\btemporarily\b/i.test(body) &&
        body.length < 260;
      const hollow = !hasChart && !hasMetric && !hasTable && (!hasNumbers || body.length < 28);

      let status = 'ok';
      if (disabled) status = 'disabled';
      else if (emptyMsg || hollow) status = 'empty';
      else if (!hasNumbers && !hasChart) status = 'thin';

      // Prefer scoped under market root when possible
      return {
        present: true,
        status,
        disabled,
        hasChart,
        hasMetric,
        hasTable,
        bodyLen: body.length,
        peek: body.slice(0, 100),
        bound: el.getAttribute('data-panel-bound') || el.querySelector('[data-panel-bound]')?.getAttribute('data-panel-bound') || null,
      };
    }

    const allKeys = [...new Set(
      [...root.querySelectorAll('[data-panel-key]'), ...document.querySelectorAll('[data-panel-key]')]
        .map((e) => e.getAttribute('data-panel-key'))
        .filter(Boolean)
    )];

    const byId = {};
    for (const p of expectedPanels) {
      const scoped = root.querySelector(`[data-panel-key="${p.id}"]`);
      const any = document.querySelector(`[data-panel-key="${p.id}"]`);
      // Prefer scoped, but if market root is body, any is fine
      const el = scoped || any;
      byId[p.id] = { id: p.id, title: p.title, ...classifyDom(el) };
    }

    const dropdown = [...document.querySelectorAll('.market-panel-dropdown-item')].map((btn) => {
      const title = btn.querySelector('.panel-dropdown-title')?.textContent?.trim() || '';
      const status = btn.querySelector('.panel-dropdown-status-dot')?.getAttribute('data-status') || 'unknown';
      const cls = btn.className || '';
      const looksOk = status === 'ok' || /\bpanel-status-ok\b/.test(cls);
      return { title, status, badge, looksOk, cls: cls.slice(0, 80) };
    });

    // Map dropdown rows to panel ids via title
    const dropdownByTitle = new Map(dropdown.map((d) => [d.title, d]));
    for (const p of expectedPanels) {
      const d = dropdownByTitle.get(p.title);
      byId[p.id].dropdown = d || null;
    }

    const falseSignals = [];
    const signalGaps = [];
    for (const p of expectedPanels) {
      const r = byId[p.id];
      const d = r.dropdown;
      if (d?.looksOk && (!r.present || r.status === 'empty' || r.status === 'thin' || r.status === 'disabled' || r.status === 'missing')) {
        falseSignals.push({
          id: p.id,
          title: p.title,
          dropdownStatus: d.status,
          badge: d.badge,
          dom: r.status,
          peek: r.peek,
        });
      }
      if (r.present && r.status === 'ok' && d && !d.looksOk && d.status !== 'unknown' && d.status !== 'loading') {
        signalGaps.push({
          id: p.id,
          title: p.title,
          dropdownStatus: d.status,
          badge: d.badge,
          dom: r.status,
        });
      }
    }

    const extras = allKeys.filter((k) => !expectedPanels.some((p) => p.id === k));

    return {
      mountedKeys: allKeys,
      byId,
      dropdown,
      dropdownN: dropdown.length,
      dropdownOk: dropdown.filter((d) => d.looksOk).length,
      falseSignals,
      signalGaps,
      extras,
      counts: {
        ok: expectedPanels.filter((p) => byId[p.id].status === 'ok').length,
        empty: expectedPanels.filter((p) => byId[p.id].status === 'empty').length,
        thin: expectedPanels.filter((p) => byId[p.id].status === 'thin').length,
        disabled: expectedPanels.filter((p) => byId[p.id].status === 'disabled').length,
        missing: expectedPanels.filter((p) => !byId[p.id].present || byId[p.id].status === 'missing').length,
      },
    };
  }, { mid: marketId, expectedPanels: expected });
}

function mergePass(target, passName, snap) {
  target.passes[passName] = {
    counts: snap.counts,
    dropdownN: snap.dropdownN,
    dropdownOk: snap.dropdownOk,
    falseSignals: snap.falseSignals,
    signalGaps: snap.signalGaps,
    extras: snap.extras,
    mountedKeys: snap.mountedKeys,
  };
  // Keep late pass as authoritative panel detail
  target.panels = snap.byId;
  target.dropdownN = snap.dropdownN;
  target.falseSignals = snap.falseSignals;
  target.signalGaps = snap.signalGaps;
  target.mountedKeys = snap.mountedKeys;
  target.extras = snap.extras;
  target.counts = snap.counts;
  target.dropdownOk = snap.dropdownOk;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[audit] base=${BASE}`);
  console.log(`[audit] markets=${MARKETS.length}: ${MARKETS.join(',')}`);
  console.log(`[audit] early=${EARLY_MS}ms late=${LATE_MS}ms firstLate=${FIRST_LATE_MS}ms`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1800, height: 1100 } });
  const page = await context.newPage();

  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    markets: [],
  };

  let first = true;
  for (const mid of MARKETS) {
    const expected = MARKET_PANELS[mid] || [];
    const row = emptyResult(mid, expected);
    const pageErrors = [];
    const consoleErrors = [];
    const onPageError = (e) => pageErrors.push(String(e?.message || e).slice(0, 220));
    const onConsole = (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 220));
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);

    console.log(`\n── ${mid} (${expected.length} catalog panels) ──`);
    await page.goto(`${BASE}/?market=${encodeURIComponent(mid)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    });
    const splash = await dismissSplash(page);
    row.splash = splash;

    // EARLY pass
    await page.waitForTimeout(EARLY_MS);
    let dropN = await ensureDropdown(page, mid);
    let snap = await snapshot(page, mid, expected);
    mergePass(row, 'early', snap);
    console.log(
      `  early: content ok=${snap.counts.ok} empty=${snap.counts.empty} thin=${snap.counts.thin} ` +
      `miss=${snap.counts.missing} disabled=${snap.counts.disabled} | dropdown ${snap.dropdownOk}/${snap.dropdownN} ` +
      `false=${snap.falseSignals.length}`
    );

    // LATE pass
    const lateWait = first ? FIRST_LATE_MS - EARLY_MS : LATE_MS - EARLY_MS;
    first = false;
    if (lateWait > 0) await page.waitForTimeout(lateWait);
    dropN = await ensureDropdown(page, mid);
    snap = await snapshot(page, mid, expected);
    mergePass(row, 'late', snap);
    console.log(
      `  late:  content ok=${snap.counts.ok} empty=${snap.counts.empty} thin=${snap.counts.thin} ` +
      `miss=${snap.counts.missing} disabled=${snap.counts.disabled} | dropdown ${snap.dropdownOk}/${snap.dropdownN} ` +
      `false=${snap.falseSignals.length} dropOpen=${dropN}`
    );

    if (snap.falseSignals.length) {
      console.log(`  FALSE SIGNAL: ${snap.falseSignals.map((f) => `${f.id}→${f.dom}`).join(', ')}`);
    }
    if (snap.counts.missing) {
      const miss = expected.filter((p) => !snap.byId[p.id]?.present).map((p) => p.id);
      console.log(`  missing ids: ${miss.join(', ')}`);
    }
    if (snap.counts.empty) {
      const empty = expected.filter((p) => snap.byId[p.id]?.status === 'empty').map((p) => p.id);
      console.log(`  empty ids: ${empty.join(', ')}`);
    }

    page.off('pageerror', onPageError);
    page.off('console', onConsole);
    row.pageErrors = pageErrors.slice(0, 12);
    row.consoleErrors = consoleErrors.slice(0, 12);
    if (row.pageErrors.length) console.log(`  pageErrors: ${row.pageErrors.length}`);

    // Screenshot market page for evidence
    try {
      await page.screenshot({
        path: path.join(OUT_DIR, `${mid}.png`),
        fullPage: false,
      });
    } catch { /* ignore */ }

    report.markets.push(row);
  }

  await browser.close();
  report.finishedAt = new Date().toISOString();

  // Aggregate
  const lateMarkets = report.markets;
  const agg = {
    catalogPanels: lateMarkets.reduce((s, m) => s + m.expected, 0),
    contentOk: lateMarkets.reduce((s, m) => s + (m.counts?.ok || 0), 0),
    contentEmpty: lateMarkets.reduce((s, m) => s + (m.counts?.empty || 0), 0),
    contentThin: lateMarkets.reduce((s, m) => s + (m.counts?.thin || 0), 0),
    contentMissing: lateMarkets.reduce((s, m) => s + (m.counts?.missing || 0), 0),
    contentDisabled: lateMarkets.reduce((s, m) => s + (m.counts?.disabled || 0), 0),
    falseSignals: lateMarkets.reduce((s, m) => s + (m.falseSignals?.length || 0), 0),
    signalGaps: lateMarkets.reduce((s, m) => s + (m.signalGaps?.length || 0), 0),
    dropdownTotal: lateMarkets.reduce((s, m) => s + (m.dropdownN || 0), 0),
    dropdownOk: lateMarkets.reduce((s, m) => s + (m.dropdownOk || 0), 0),
    marketsWithFalseSignal: lateMarkets.filter((m) => m.falseSignals?.length).map((m) => m.market),
    marketsWithMissing: lateMarkets.filter((m) => m.counts?.missing > 0).map((m) => m.market),
    marketsWithEmpty: lateMarkets.filter((m) => m.counts?.empty > 0).map((m) => m.market),
    marketsWithPageErrors: lateMarkets.filter((m) => m.pageErrors?.length).map((m) => m.market),
    falseSignalDetail: lateMarkets.flatMap((m) =>
      (m.falseSignals || []).map((f) => ({ market: m.market, ...f }))
    ),
    missingDetail: lateMarkets.flatMap((m) =>
      Object.values(m.panels || {})
        .filter((p) => !p.present || p.status === 'missing')
        .map((p) => ({ market: m.market, id: p.id, title: p.title }))
    ),
    emptyDetail: lateMarkets.flatMap((m) =>
      Object.values(m.panels || {})
        .filter((p) => p.status === 'empty' || p.status === 'disabled')
        .map((p) => ({ market: m.market, id: p.id, title: p.title, status: p.status, peek: p.peek }))
    ),
  };
  report.summary = agg;

  const jsonPath = path.join(OUT_DIR, 'comprehensive-live-audit.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  // Markdown summary
  const md = [];
  md.push('# Comprehensive live panel audit');
  md.push('');
  md.push(`- **Base:** ${BASE}`);
  md.push(`- **When:** ${report.startedAt} → ${report.finishedAt}`);
  md.push(`- **Catalog panels:** ${agg.catalogPanels}`);
  md.push(`- **Content ok / empty / thin / missing / disabled:** ${agg.contentOk} / ${agg.contentEmpty} / ${agg.contentThin} / ${agg.contentMissing} / ${agg.contentDisabled}`);
  md.push(`- **Dropdown ok/total:** ${agg.dropdownOk}/${agg.dropdownTotal}`);
  md.push(`- **FALSE SIGNALS (dropdown ok, content not):** **${agg.falseSignals}**`);
  md.push(`- **Signal gaps (content ok, dropdown not):** ${agg.signalGaps}`);
  md.push('');
  md.push('## False signals');
  if (!agg.falseSignalDetail.length) md.push('_None detected on late pass._');
  else {
    md.push('| Market | Panel | DOM | Dropdown | Peek |');
    md.push('|--------|-------|-----|----------|------|');
    for (const f of agg.falseSignalDetail) {
      md.push(`| ${f.market} | \`${f.id}\` ${f.title} | ${f.dom} | ${f.dropdownStatus}/${f.badge || '—'} | ${(f.peek || '').replace(/\|/g, '/').slice(0, 60)} |`);
    }
  }
  md.push('');
  md.push('## Missing panels (catalog id not in DOM)');
  if (!agg.missingDetail.length) md.push('_None._');
  else {
    md.push('| Market | Id | Title |');
    md.push('|--------|----|-------|');
    for (const m of agg.missingDetail) {
      md.push(`| ${m.market} | \`${m.id}\` | ${m.title} |`);
    }
  }
  md.push('');
  md.push('## Empty / disabled content');
  if (!agg.emptyDetail.length) md.push('_None._');
  else {
    md.push('| Market | Id | Status | Peek |');
    md.push('|--------|----|--------|------|');
    for (const m of agg.emptyDetail) {
      md.push(`| ${m.market} | \`${m.id}\` | ${m.status} | ${(m.peek || '').replace(/\|/g, '/').slice(0, 70)} |`);
    }
  }
  md.push('');
  md.push('## Per-market late pass');
  md.push('| Market | Catalog | Ok | Empty | Thin | Miss | Dis | Drop ok | False |');
  md.push('|--------|---------|----|-------|------|------|-----|---------|-------|');
  for (const m of lateMarkets) {
    const c = m.counts || {};
    md.push(
      `| ${m.market} | ${m.expected} | ${c.ok ?? '—'} | ${c.empty ?? '—'} | ${c.thin ?? '—'} | ${c.missing ?? '—'} | ${c.disabled ?? '—'} | ${m.dropdownOk ?? 0}/${m.dropdownN ?? 0} | ${m.falseSignals?.length || 0} |`
    );
  }
  md.push('');
  md.push(`Full JSON: \`${jsonPath}\``);
  const mdPath = path.join(OUT_DIR, 'comprehensive-live-audit.md');
  writeFileSync(mdPath, md.join('\n'));

  console.log('\n========== AGGREGATE ==========');
  console.log(JSON.stringify(agg, null, 2).slice(0, 4000));
  console.log(`\nwrote ${jsonPath}`);
  console.log(`wrote ${mdPath}`);

  if (agg.falseSignals > 0 || agg.contentMissing > 10) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
