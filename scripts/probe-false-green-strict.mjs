/**
 * Stricter live false-green probe.
 * Substance is measured on .bento-panel-content only (ignore footer dates/stamps).
 * Dropdown data-status=ok (green dot only) vs empty content body = FALSE GREEN.
 *
 *   node scripts/probe-false-green-strict.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';
import { MARKET_PANELS } from '../src/data/marketPanels.js';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const MARKETS = (process.env.PROBE_MARKETS
  || 'bonds,fx,derivatives,equities,realEstate,insurance,credit,globalMacro,crypto,commodities,calendar,bls,eia')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const FIRST = Number(process.env.PROBE_FIRST_SETTLE_MS || 22000);
const SETTLE = Number(process.env.PROBE_SETTLE_MS || 15000);

async function dismiss(page) {
  await page.addInitScript(() => {
    try { sessionStorage.setItem('hub-splash-seen', '1'); } catch { /* ignore */ }
  });
  for (let i = 0; i < 25; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      await btn.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(300);
    } else return;
    await page.waitForTimeout(300);
  }
}

async function openDropdown(page, marketId) {
  const tabSel = `button.market-tab[data-market="${marketId}"]`;
  const tab = page.locator(tabSel);
  if ((await tab.getAttribute('aria-selected')) !== 'true') {
    await tab.click();
    await page.waitForTimeout(1500);
  }
  const wrapper = page.locator('.market-tab-wrapper').filter({ has: page.locator(tabSel) });
  await wrapper.hover();
  await page.waitForTimeout(2200);
  if (!(await page.locator('.market-panel-dropdown-item').count())) {
    const box = await wrapper.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await wrapper.dispatchEvent('mouseenter');
    await page.waitForTimeout(1800);
  }
}

async function main() {
  console.log(`[strict] base=${BASE}`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1000 } });
  const out = [];
  let first = true;

  for (const mid of MARKETS) {
    await page.goto(`${BASE}/?market=${encodeURIComponent(mid)}`, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    await dismiss(page);
    await page.waitForTimeout(first ? FIRST : SETTLE);
    first = false;
    await openDropdown(page, mid);

    const row = await page.evaluate(({ expected }) => {
      function classEl(el) {
        if (!el) return { present: false, status: 'missing' };
        const content = el.querySelector('.bento-panel-content') || el;
        const body = (content.textContent || '').replace(/\s+/g, ' ').trim();
        const hasChart = !!content.querySelector('canvas, svg, .echarts-for-react, [data-series-samples]');
        const hasMetric = !!content.querySelector('[data-metric-value], [data-metric-display], [class*="metric"], [class*="kpi"]');
        const hasTable = !!content.querySelector('table');
        const bodyNums = /\d/.test(body);
        const emptyMsg = /\bno data\b|\bunavailable\b|\bnot available\b|\bno .* scheduled\b/i.test(body)
          && body.length < 240;
        const hollow = !hasChart && !hasMetric && !hasTable && (!bodyNums || body.length < 24);
        let status = 'ok';
        if (emptyMsg || hollow) status = 'empty';
        else if (!bodyNums && !hasChart) status = 'thin';
        return {
          present: true,
          status,
          bodyLen: body.length,
          hasChart,
          hasMetric,
          peek: body.slice(0, 90),
        };
      }

      const byId = {};
      for (const p of expected) {
        byId[p.id] = {
          title: p.title,
          ...classEl(document.querySelector(`[data-panel-key="${p.id}"]`)),
        };
      }

      const dropdown = [...document.querySelectorAll('.market-panel-dropdown-item')].map((btn) => ({
        title: btn.querySelector('.panel-dropdown-title')?.textContent?.trim() || '',
        status: btn.querySelector('.panel-dropdown-status-dot')?.getAttribute('data-status') || 'unknown',
      }));

      const falseGreen = [];
      for (const d of dropdown) {
        const looksOk = d.status === 'ok';
        if (!looksOk) continue;
        const exp = expected.find((p) => p.title === d.title);
        if (!exp) continue;
        const r = byId[exp.id];
        if (!r?.present || r.status === 'empty' || r.status === 'thin') {
          falseGreen.push({
            id: exp.id,
            title: d.title,
            dom: r?.status || 'missing',
            dot: d.status,
            peek: r?.peek || '',
          });
        }
      }

      const missing = expected.filter((p) => !byId[p.id]?.present).map((p) => p.id);
      const empty = expected.filter((p) => byId[p.id]?.status === 'empty').map((p) => p.id);
      const thin = expected.filter((p) => byId[p.id]?.status === 'thin').map((p) => p.id);
      const ok = expected.filter((p) => byId[p.id]?.status === 'ok').map((p) => p.id);

      return {
        expected: expected.length,
        dropdownN: dropdown.length,
        dropdownOk: dropdown.filter((d) => d.status === 'ok').length,
        ok: ok.length,
        empty: empty.length,
        thin: thin.length,
        missing: missing.length,
        missingIds: missing,
        emptyIds: empty,
        thinIds: thin,
        falseGreen,
        sampleBad: falseGreen.slice(0, 8),
      };
    }, { expected: MARKET_PANELS[mid] || [] });

    out.push({ market: mid, ...row });
    const flag = row.falseGreen.length ? 'FALSE-GREEN' : (row.missing + row.empty ? 'GAP' : 'ok');
    console.log(
      `[${flag}] ${mid.padEnd(14)} dropdownOk=${row.dropdownOk}/${row.dropdownN} ` +
      `content ok=${row.ok} empty=${row.empty} thin=${row.thin} miss=${row.missing} ` +
      `falseGreen=${row.falseGreen.length}`
    );
    if (row.falseGreen.length) {
      console.log(`    FG: ${row.falseGreen.map((f) => `${f.id}[${f.dom}]`).join(', ')}`);
    }
    if (row.missingIds.length) console.log(`    missing: ${row.missingIds.join(', ')}`);
    if (row.emptyIds.length) console.log(`    empty: ${row.emptyIds.join(', ')}`);
  }

  await browser.close();
  const summary = {
    base: BASE,
    at: new Date().toISOString(),
    totalFalseGreen: out.reduce((s, r) => s + r.falseGreen.length, 0),
    totalEmpty: out.reduce((s, r) => s + r.empty, 0),
    totalMissing: out.reduce((s, r) => s + r.missing, 0),
    markets: out,
  };
  writeFileSync('live-false-green-strict.json', JSON.stringify(summary, null, 2));
  console.log('\n=== TOTAL false-green (strict content) ===', summary.totalFalseGreen);
  console.log('empty panels:', summary.totalEmpty, 'missing:', summary.totalMissing);
  console.log('wrote live-false-green-strict.json');
  if (summary.totalFalseGreen > 0) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
