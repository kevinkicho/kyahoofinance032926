/**
 * Fast hosted audit — short waits, parallel tabs.
 *   node scripts/fast-live-audit.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { MARKET_PANELS } from '../src/data/marketPanels.js';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const MARKETS = Object.keys(MARKET_PANELS);
const SETTLE = Number(process.env.AUDIT_SETTLE_MS || 6000);
const CONCURRENCY = Number(process.env.AUDIT_CONCURRENCY || 4);
const OUT = 'test-results/live-audit/fast-live-audit.json';

async function dismiss(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch {}
  });
  for (let i = 0; i < 12; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
    } else return;
  }
}

async function openDrop(page, mid) {
  const tab = page.locator(`button.market-tab[data-market="${mid}"]`);
  if ((await tab.getAttribute('aria-selected')) !== 'true') {
    await tab.click().catch(() => {});
    await page.waitForTimeout(400);
  }
  const wrap = page.locator('.market-tab-wrapper').filter({ has: page.locator(`button.market-tab[data-market="${mid}"]`) });
  await wrap.hover().catch(() => {});
  await page.waitForTimeout(700);
  if (!(await page.locator('.market-panel-dropdown-item').count())) {
    await wrap.dispatchEvent('mouseenter').catch(() => {});
    await page.waitForTimeout(700);
  }
}

async function auditOne(context, mid) {
  const expected = MARKET_PANELS[mid] || [];
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 160)));
  const t0 = Date.now();
  try {
    await page.goto(`${BASE}/?market=${encodeURIComponent(mid)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    await dismiss(page);
    await page.waitForTimeout(SETTLE);
    await openDrop(page, mid);

    const snap = await page.evaluate(({ expectedPanels }) => {
      function cls(el) {
        if (!el) return { present: false, status: 'missing' };
        const content = el.querySelector('.bento-panel-content') || el;
        const body = (content.textContent || '').replace(/\s+/g, ' ').trim();
        const hasChart = !!content.querySelector('canvas, svg, .echarts-for-react, [data-series-samples]');
        const hasMetric = !!content.querySelector('[data-metric-value], [data-metric-display], [class*="metric"], [class*="kpi"]');
        const hasTable = !!content.querySelector('table');
        const nums = /\d/.test(body);
        const emptyMsg = /\bno data\b|\bunavailable\b|\bnot available\b/i.test(body) && body.length < 240;
        const hollow = !hasChart && !hasMetric && !hasTable && (!nums || body.length < 28);
        const disabled =
          el.getAttribute('data-panel-disabled') === '1' ||
          el.classList.contains('bento-card--disabled') ||
          !!el.querySelector('[data-panel-empty="1"]');
        let status = 'ok';
        if (disabled) status = 'disabled';
        else if (emptyMsg || hollow) status = 'empty';
        else if (!nums && !hasChart) status = 'thin';
        return { present: true, status, peek: body.slice(0, 80) };
      }

      const byId = {};
      for (const p of expectedPanels) {
        byId[p.id] = { title: p.title, ...cls(document.querySelector(`[data-panel-key="${p.id}"]`)) };
      }

      const drop = [...document.querySelectorAll('.market-panel-dropdown-item')].map((btn) => {
        const title = btn.querySelector('.panel-dropdown-title')?.textContent?.trim() || '';
        const status = btn.querySelector('.panel-dropdown-status-dot')?.getAttribute('data-status') || 'unknown';
        const looksOk = status === 'ok';
        return { title, status, badge, looksOk };
      });
      const byTitle = new Map(drop.map((d) => [d.title, d]));

      const falseSignals = [];
      for (const p of expectedPanels) {
        const r = byId[p.id];
        const d = byTitle.get(p.title);
        r.dropdown = d || null;
        if (d?.looksOk && (!r.present || r.status === 'empty' || r.status === 'thin' || r.status === 'disabled' || r.status === 'missing')) {
          falseSignals.push({ id: p.id, title: p.title, dom: r.status || 'missing', drop: d.status, badge: d.badge, peek: r.peek });
        }
      }

      const counts = {
        ok: expectedPanels.filter((p) => byId[p.id].status === 'ok').length,
        empty: expectedPanels.filter((p) => byId[p.id].status === 'empty').length,
        thin: expectedPanels.filter((p) => byId[p.id].status === 'thin').length,
        disabled: expectedPanels.filter((p) => byId[p.id].status === 'disabled').length,
        missing: expectedPanels.filter((p) => !byId[p.id].present || byId[p.id].status === 'missing').length,
      };
      return {
        counts,
        dropdownN: drop.length,
        dropdownOk: drop.filter((d) => d.looksOk).length,
        falseSignals,
        missingIds: expectedPanels.filter((p) => !byId[p.id].present).map((p) => p.id),
        emptyIds: expectedPanels.filter((p) => byId[p.id].status === 'empty' || byId[p.id].status === 'disabled').map((p) => p.id),
        byId,
      };
    }, { expectedPanels: expected });

    return {
      market: mid,
      expected: expected.length,
      ms: Date.now() - t0,
      pageErrors: pageErrors.slice(0, 5),
      ...snap,
    };
  } finally {
    await page.close().catch(() => {});
  }
}

async function mapPool(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

async function main() {
  console.log(`[fast] ${BASE} settle=${SETTLE}ms concurrency=${CONCURRENCY} markets=${MARKETS.length}`);
  const t0 = Date.now();
  mkdirSync('test-results/live-audit', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });

  const results = await mapPool(MARKETS, CONCURRENCY, async (mid) => {
    const r = await auditOne(context, mid);
    const flag = r.falseSignals.length ? 'FG' : (r.counts.missing || r.counts.empty ? 'GAP' : 'ok');
    console.log(
      `[${flag}] ${mid.padEnd(16)} ${String(r.ms).padStart(5)}ms  ` +
      `ok=${r.counts.ok} empty=${r.counts.empty} thin=${r.counts.thin} miss=${r.counts.missing} ` +
      `drop=${r.dropdownOk}/${r.dropdownN} false=${r.falseSignals.length}` +
      (r.falseSignals.length ? `  ${r.falseSignals.map((f) => f.id).join(',')}` : '') +
      (r.missingIds.length ? `  miss:${r.missingIds.join(',')}` : '')
    );
    return r;
  });

  await browser.close();

  const summary = {
    base: BASE,
    totalMs: Date.now() - t0,
    settleMs: SETTLE,
    concurrency: CONCURRENCY,
    catalog: results.reduce((s, r) => s + r.expected, 0),
    ok: results.reduce((s, r) => s + r.counts.ok, 0),
    empty: results.reduce((s, r) => s + r.counts.empty, 0),
    thin: results.reduce((s, r) => s + r.counts.thin, 0),
    missing: results.reduce((s, r) => s + r.counts.missing, 0),
    falseSignals: results.reduce((s, r) => s + r.falseSignals.length, 0),
    dropdownOk: results.reduce((s, r) => s + r.dropdownOk, 0),
    dropdownN: results.reduce((s, r) => s + r.dropdownN, 0),
    falseDetail: results.flatMap((r) => r.falseSignals.map((f) => ({ market: r.market, ...f }))),
    missingDetail: results.flatMap((r) => r.missingIds.map((id) => ({ market: r.market, id }))),
    emptyDetail: results.flatMap((r) => r.emptyIds.map((id) => ({ market: r.market, id }))),
    markets: results,
  };

  writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log('\n=== FAST AUDIT ===');
  console.log(`time: ${(summary.totalMs / 1000).toFixed(1)}s`);
  console.log(`catalog ${summary.catalog} | ok ${summary.ok} empty ${summary.empty} thin ${summary.thin} miss ${summary.missing}`);
  console.log(`dropdown ${summary.dropdownOk}/${summary.dropdownN} | FALSE SIGNALS ${summary.falseSignals}`);
  if (summary.falseDetail.length) {
    console.log('false greens:');
    for (const f of summary.falseDetail) console.log(`  ${f.market}/${f.id} dom=${f.dom} drop=${f.drop}`);
  }
  if (summary.missingDetail.length) {
    console.log('missing:');
    for (const m of summary.missingDetail) console.log(`  ${m.market}/${m.id}`);
  }
  console.log(`wrote ${OUT}`);
  if (summary.falseSignals > 0) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
