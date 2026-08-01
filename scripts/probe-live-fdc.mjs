#!/usr/bin/env node
/**
 * Live F/D/C probe for all MARKET_PANELS (~233).
 *
 * Opens the app in Chromium (Playwright), waits for splash health to settle,
 * then reads window.__kyahooPanelHealth.evaluateNow() which runs the same
 * evaluateAllMarkets / countStatuses as the splash UI.
 *
 * Prerequisites:
 *   npm run dev   # or any server at BASE_URL
 *
 * Usage:
 *   npm run probe:fdc
 *   node scripts/probe-live-fdc.mjs
 *   SHOT_BASE_URL=http://localhost:5173 node scripts/probe-live-fdc.mjs
 *
 * Exit codes:
 *   0 — okCount / total >= PASS_RATE (default 0.85) and fetchFail <= MAX_FETCH_FAIL
 *   1 — below thresholds
 *   2 — browser/setup failure
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Prefer localhost — on some Windows setups Vite binds in a way that 127.0.0.1 fails.
const BASE = (process.env.SHOT_BASE_URL || process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:5173')
  .replace(/\/$/, '');
const SETTLE_MS = Number(process.env.FDC_SETTLE_MS || 55_000);
const PASS_RATE = Number(process.env.FDC_PASS_RATE || 0.85);
const MAX_FETCH_FAIL = Number(process.env.FDC_MAX_FETCH_FAIL || 25);
const HEADLESS = process.env.FDC_HEADED !== '1';

function summarize(counts, reports) {
  const byMarket = {};
  const incomplete = [];
  for (const [mid, panels] of Object.entries(reports || {})) {
    let ok = 0;
    let bad = 0;
    for (const [pid, r] of Object.entries(panels || {})) {
      if (r?.status === 'ok') ok++;
      else {
        bad++;
        incomplete.push({
          marketId: mid,
          panelId: pid,
          status: r?.status,
          fetchOk: !!r?.fetchOk,
          displayOk: !!r?.displayOk,
          confirmOk: !!r?.confirmOk,
          fetchDetail: r?.fetchDetail,
          displayDetail: r?.displayDetail,
        });
      }
    }
    byMarket[mid] = { ok, bad, total: ok + bad };
  }
  return { byMarket, incomplete };
}

async function main() {
  console.log(`🔍 Live F/D/C probe → ${BASE}`);
  console.log(`   settle=${SETTLE_MS}ms passRate>=${PASS_RATE} maxFetchFail=${MAX_FETCH_FAIL} headless=${HEADLESS}`);

  // Quick reachability: API on 3001 and/or Vite proxy on 5173
  const apiBases = [
    BASE,
    BASE.replace(':5173', ':3001').replace('localhost', '127.0.0.1'),
    'http://127.0.0.1:3001',
    'http://localhost:3001',
  ];
  let apiOk = false;
  for (const ab of [...new Set(apiBases)]) {
    try {
      const h = await fetch(`${ab}/api/health`, { signal: AbortSignal.timeout(4000) });
      if (h.ok) {
        console.log(`  ✓ /api/health ok via ${ab}`);
        apiOk = true;
        break;
      }
    } catch { /* try next */ }
  }
  if (!apiOk) {
    console.error('  ❌ Cannot reach /api/health on 5173 or 3001 — run: npm run dev');
    process.exit(2);
  }
  // Soft-check page origin (Vite)
  try {
    const p = await fetch(BASE + '/', { signal: AbortSignal.timeout(5000) });
    if (!p.ok) console.warn(`  ⚠ page ${BASE}/ status ${p.status}`);
    else console.log(`  ✓ page ${BASE}/ reachable`);
  } catch (e) {
    console.error(`  ❌ Cannot open ${BASE}/ — ${e.message}`);
    process.exit(2);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
  } catch (e) {
    console.error('Playwright chromium launch failed:', e.message);
    console.error('Run: npx playwright install chromium');
    process.exit(2);
  }

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));

  try {
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
  } catch (e) {
    console.error('Navigation failed:', e.message);
    await browser.close();
    process.exit(2);
  }

  // Wait for probe hook (splash mounted)
  const start = Date.now();
  let last = null;
  while (Date.now() - start < SETTLE_MS) {
    last = await page.evaluate(() => {
      const h = window.__kyahooPanelHealth;
      if (!h?.evaluateNow) return null;
      try {
        return h.evaluateNow();
      } catch (e) {
        return { error: String(e?.message || e) };
      }
    });
    if (last?.counts && last.counts.total > 0) {
      const { ok, total, loading } = last.counts;
      const rate = total ? ok / total : 0;
      const elapsed = Date.now() - start;
      // Only early-exit when we already meet the pass bar (and paint has had time).
      if (loading === 0 && total >= 200 && rate >= PASS_RATE && elapsed > 20_000) break;
      // Soft progress log every ~10s
      if (elapsed > 0 && Math.floor(elapsed / 10_000) !== Math.floor((elapsed - 1500) / 10_000)) {
        console.log(`  … ${elapsed}ms ok=${ok}/${total} (${(rate * 100).toFixed(1)}%) loading=${loading}`);
      }
    }
    await page.waitForTimeout(1500);
  }

  await browser.close();

  if (!last || last.error || !last.counts) {
    console.error('❌ No health probe data. Splash may not have mounted __kyahooPanelHealth.');
    console.error(last);
    process.exit(2);
  }

  const counts = last.counts;
  const { byMarket, incomplete } = summarize(counts, last.reports);
  const rate = counts.total ? counts.ok / counts.total : 0;
  const fetchFail = counts.fetchFail ?? incomplete.filter((i) => !i.fetchOk).length;

  const report = {
    base: BASE,
    at: last.at || new Date().toISOString(),
    counts,
    rate,
    passRate: PASS_RATE,
    byMarket,
    incomplete: incomplete.slice(0, 120),
    incompleteTotal: incomplete.length,
    pageErrors: pageErrors.slice(0, 20),
  };

  mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
  const outPath = path.join(ROOT, 'reports', 'live-fdc.json');
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log('\n=== Live F/D/C summary ===');
  console.log(JSON.stringify({
    total: counts.total,
    ok: counts.ok,
    incomplete: counts.bad,
    loading: counts.loading,
    fetchFail: counts.fetchFail,
    paintPending: counts.pending,
    rate: Math.round(rate * 1000) / 10 + '%',
  }, null, 2));

  console.log('\nBy market (incomplete):');
  Object.entries(byMarket)
    .filter(([, s]) => s.bad > 0)
    .sort((a, b) => b[1].bad - a[1].bad)
    .forEach(([m, s]) => console.log(`  ${m}: ok=${s.ok} bad=${s.bad}`));

  console.log(`\nWrote ${path.relative(ROOT, outPath)}`);

  const pass = rate >= PASS_RATE && fetchFail <= MAX_FETCH_FAIL;
  if (pass) {
    console.log(`\n✅ PASS rate=${(rate * 100).toFixed(1)}% (need ≥${PASS_RATE * 100}%) fetchFail=${fetchFail} (max ${MAX_FETCH_FAIL})`);
    process.exit(0);
  }
  console.log(`\n❌ FAIL rate=${(rate * 100).toFixed(1)}% (need ≥${PASS_RATE * 100}%) fetchFail=${fetchFail} (max ${MAX_FETCH_FAIL})`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
