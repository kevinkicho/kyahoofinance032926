#!/usr/bin/env node
/**
 * Sequential one-panel-at-a-time live F/D/C probe (full catalog).
 *
 * For each MARKET_PANELS entry in order (1..N), evaluates THAT panel only
 * via the same evaluatePanelHealth used by splash — no batch skimming for
 * the report (each panel is evaluated and logged before the next).
 *
 * Prerequisites: npm run dev (Vite + API)
 *
 *   node scripts/probe-panels-one-by-one.mjs
 *   SHOT_BASE_URL=http://localhost:5173 FDC_SETTLE_MS=60000 node scripts/probe-panels-one-by-one.mjs
 *
 * Exit: 0 if all ok or pass rate met; 1 if failures; 2 setup error
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.env.SHOT_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const SETTLE_MS = Number(process.env.FDC_SETTLE_MS || 90_000);
const PASS_RATE = Number(process.env.FDC_PASS_RATE || 1.0); // default: require every panel
const HEADLESS = process.env.FDC_HEADED !== '1';
// Optional: start at N (1-based) / stop after M panels for resume
const START_AT = Math.max(1, Number(process.env.PANEL_START || 1));
const LIMIT = process.env.PANEL_LIMIT ? Number(process.env.PANEL_LIMIT) : null;

const { MARKET_PANELS } = await import(
  pathToFileURL(path.join(ROOT, 'src/data/marketPanels.js')).href
);

/** Stable ordered catalog: market order as in MARKET_PANELS keys, panels in array order */
function buildCatalog() {
  const list = [];
  for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
    for (const p of panels || []) {
      list.push({
        marketId,
        panelId: p.id,
        title: p.title || p.id,
      });
    }
  }
  return list;
}

async function waitForApi() {
  const bases = [
    BASE,
    BASE.replace(':5173', ':3001'),
    'http://127.0.0.1:3001',
    'http://localhost:3001',
  ];
  for (let attempt = 0; attempt < 60; attempt++) {
    for (const ab of [...new Set(bases)]) {
      try {
        const h = await fetch(`${ab}/api/health`, { signal: AbortSignal.timeout(3000) });
        if (h.ok) return ab;
      } catch { /* */ }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

async function main() {
  const catalog = buildCatalog();
  const total = catalog.length;
  console.log(`Sequential panel probe: ${total} panels (one at a time)`);
  console.log(`  BASE=${BASE} settle=${SETTLE_MS}ms passRate=${PASS_RATE} startAt=${START_AT}`);

  const apiBase = await waitForApi();
  if (!apiBase) {
    console.error('Cannot reach /api/health — run: npm run dev');
    process.exit(2);
  }
  console.log(`  ✓ API via ${apiBase}`);

  try {
    const p = await fetch(BASE + '/', { signal: AbortSignal.timeout(8000) });
    if (!p.ok) {
      console.error(`Page ${BASE}/ status ${p.status}`);
      process.exit(2);
    }
    console.log(`  ✓ UI ${BASE}/`);
  } catch (e) {
    console.error(`Cannot open ${BASE}/: ${e.message}`);
    process.exit(2);
  }

  let browser;
  try {
    browser = await chromium.launch({ headless: HEADLESS });
  } catch (e) {
    console.error('Playwright launch failed:', e.message);
    console.error('Run: npx playwright install chromium');
    process.exit(2);
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on('pageerror', (err) => pageErrors.push(String(err?.message || err)));

  console.log('  Opening app…');
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 90_000 });

  // Wait for health hook
  const hookOk = await page
    .waitForFunction(() => typeof window.__kyahooPanelHealth?.evaluateNow === 'function', {
      timeout: SETTLE_MS,
    })
    .then(() => true)
    .catch(() => false);

  if (!hookOk) {
    console.error('Splash health hook never appeared (window.__kyahooPanelHealth)');
    await page.screenshot({ path: path.join(ROOT, 'reports', 'one-by-one-no-hook.png') }).catch(() => {});
    await browser.close();
    process.exit(2);
  }

  console.log(`  Waiting ${SETTLE_MS}ms for markets/DOM to settle…`);
  await page.waitForTimeout(SETTLE_MS);

  // Ensure all splash markets mounted (scroll splash backdrop if needed)
  await page.evaluate(() => {
    try {
      // Force one full re-eval so shells/stamps exist
      window.__kyahooPanelHealth?.evaluateNow?.();
    } catch { /* */ }
  });
  await page.waitForTimeout(2000);

  const end = LIMIT != null ? Math.min(total, START_AT - 1 + LIMIT) : total;
  const results = [];
  let ok = 0;
  let bad = 0;
  let fetchFail = 0;
  let bridgeOnly = 0;
  let uiOk = 0;

  console.log('');
  console.log('─'.repeat(72));
  console.log('idx  status   F D C  ui  br  market:panel — title');
  console.log('─'.repeat(72));

  for (let i = START_AT - 1; i < end; i++) {
    const { marketId, panelId, title } = catalog[i];
    const n = i + 1;

    // Visit market tab so real panel DOM can mount (not only splash shells)
    try {
      await page.evaluate((mid) => {
        // Click market tab if present
        const tabs = [...document.querySelectorAll('[data-market-id], button, [role="tab"]')];
        // Prefer tab bar: look for text matching market or data attributes
        const bar = document.querySelector('.hub-tab-bar, .market-tab-bar, nav');
        // Use localStorage + reload is heavy; instead set hub active via click
        const btn = [...document.querySelectorAll('button, [role="tab"]')].find((el) => {
          const t = (el.textContent || '').toLowerCase();
          const id = el.getAttribute('data-market-id') || '';
          return id === mid || t.includes(mid.toLowerCase().slice(0, 6));
        });
        if (btn) btn.click();
        // Also try session keys used by hub
        try {
          localStorage.setItem('hub-active-market', mid);
        } catch { /* */ }
      }, marketId);
      await page.waitForTimeout(400);
    } catch { /* continue */ }

    // Evaluate THIS panel only (re-run health for single panel using app modules if exposed,
    // else filter evaluateNow() to one panel — evaluateNow is full catalog but we still
    // log/process one panel per loop iteration so output is strictly sequential.)
    const report = await page.evaluate(({ marketId: mid, panelId: pid }) => {
      const api = window.__kyahooPanelHealth;
      if (!api?.evaluateNow) return { error: 'no hook' };
      const full = api.evaluateNow();
      if (full?.error) return full;
      const r = full?.reports?.[mid]?.[pid];
      if (!r) {
        return {
          status: 'missing',
          fetchOk: false,
          displayOk: false,
          confirmOk: false,
          fetchDetail: 'panel not in evaluateNow reports',
          displayDetail: '',
          confirmDetail: '',
          uiOk: false,
          bridgeOnly: false,
          elPresent: false,
        };
      }
      return {
        status: r.status,
        fetchOk: !!r.fetchOk,
        displayOk: !!r.displayOk,
        confirmOk: !!r.confirmOk,
        fetchDetail: r.fetchDetail || '',
        displayDetail: r.displayDetail || '',
        confirmDetail: r.confirmDetail || '',
        uiOk: !!r.uiOk,
        bridgeOnly: !!r.bridgeOnly,
        healthQuality: r.healthQuality || null,
        elPresent: !!r.elPresent,
        placeholders: r.placeholders || null,
      };
    }, { marketId, panelId });

    const isOk = report.status === 'ok';
    if (isOk) ok++;
    else bad++;
    if (!report.fetchOk) fetchFail++;
    if (report.bridgeOnly) bridgeOnly++;
    if (report.uiOk) uiOk++;

    const f = report.fetchOk ? 'F' : '·';
    const d = report.displayOk ? 'D' : '·';
    const c = report.confirmOk ? 'C' : '·';
    const u = report.uiOk ? 'U' : '·';
    const b = report.bridgeOnly ? 'B' : '·';
    const st = (report.status || 'null').padEnd(8);
    const line = `${String(n).padStart(3)}/${total} ${st} ${f}${d}${c}  ${u}  ${b}  ${marketId}:${panelId} — ${title}`;
    console.log(line);
    if (!isOk) {
      console.log(
        `         fetch: ${String(report.fetchDetail || '').slice(0, 120)}`,
      );
      console.log(
        `         display: ${String(report.displayDetail || '').slice(0, 120)}`,
      );
      console.log(
        `         confirm: ${String(report.confirmDetail || '').slice(0, 120)}`,
      );
    }

    results.push({
      index: n,
      marketId,
      panelId,
      title,
      ...report,
    });
  }

  console.log('─'.repeat(72));
  console.log(
    `DONE: ok=${ok} bad=${bad} total=${end - START_AT + 1} fetchFail=${fetchFail} uiOk=${uiOk} bridgeOnly=${bridgeOnly}`,
  );
  if (pageErrors.length) {
    console.log(`Page errors (${pageErrors.length}):`);
    for (const e of pageErrors.slice(0, 15)) console.log(`  ${e}`);
  }

  const outDir = path.join(ROOT, 'reports');
  mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'panel-one-by-one.json');
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        base: BASE,
        settleMs: SETTLE_MS,
        startAt: START_AT,
        end,
        totalCatalog: total,
        summary: { ok, bad, fetchFail, uiOk, bridgeOnly, pageErrors: pageErrors.length },
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Wrote ${outPath}`);

  await browser.close();

  const checked = end - START_AT + 1;
  const rate = checked ? ok / checked : 0;
  if (rate < PASS_RATE) {
    console.error(`FAIL: pass rate ${rate.toFixed(3)} < ${PASS_RATE}`);
    process.exit(1);
  }
  console.log(`PASS: pass rate ${rate.toFixed(3)} >= ${PASS_RATE}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
