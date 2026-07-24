/**
 * Hosted panel DOM audit — checks splash chips + mounted bento cards.
 * Usage: SHOT_BASE_URL=https://… node scripts/audit-hosted-panels.mjs
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.env.SHOT_BASE_URL
  || 'https://kyahoofinance032926--kfinance032926.us-central1.hosted.app';
const SETTLE = Number(process.env.AUDIT_SETTLE_MS || 28000);
const MARKETS = [
  'equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
];

async function dismissSplash(page) {
  for (let i = 0; i < 90; i++) {
    const btn = page.locator('.splash-enter-btn');
    if (await btn.count()) {
      const enabled = await btn.first().isEnabled().catch(() => false);
      if (enabled) {
        await btn.first().click().catch(() => {});
        await page.waitForTimeout(600);
        return 'clicked';
      }
      // Soft-timeout may not have fired yet — force when button exists
      if (i > 50) {
        await btn.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(600);
        return 'force';
      }
    } else {
      return 'none';
    }
    await page.waitForTimeout(1000);
  }
  return 'timeout';
}

async function collectPanels(page) {
  return page.evaluate(() => {
    // Splash chips (strict F/D/C health)
    const chips = Array.from(document.querySelectorAll('.splash-panel-chip'));
    if (chips.length) {
      return chips.map((c) => {
        const st = c.className.match(/splash-panel-chip--(\w+)/)?.[1] || 'unknown';
        const label = c.querySelector('.splash-panel-chip-label')?.textContent?.trim()
          || c.textContent?.trim() || '';
        return {
          title: label,
          status: st,
          kind: 'splash',
          hasData: st === 'ok',
          isEmpty: st === 'error' || st === 'bad' || st === 'loading',
          bodyPeek: (c.getAttribute('title') || label).slice(0, 120),
        };
      });
    }

    // Market grid cards
    const cards = Array.from(document.querySelectorAll(
      '[data-panel-key], .bento-card, [class*="bento-card"]'
    ));
    return cards.map((c) => {
      const key = c.getAttribute('data-panel-key') || '';
      const title = key
        || c.querySelector('.bento-card__title, .bc-title, .bento-panel-title, h3, h4')?.textContent?.trim()
        || '(untitled)';
      const body = (c.textContent || '').replace(/\s+/g, ' ').trim();
      const hasChart = !!c.querySelector('canvas, svg');
      const badge = c.querySelector('.df-fetched, .df-static, .df-pending, .df-no-data, .df-error');
      const badgeKind = badge?.classList.contains('df-fetched') ? 'fetched'
        : badge?.classList.contains('df-static') ? 'static'
        : badge?.classList.contains('df-pending') ? 'pending'
        : badge?.classList.contains('df-no-data') ? 'no-data'
        : badge?.classList.contains('df-error') ? 'error'
        : 'none';
      const emptyish = /no data|unavailable|not configured|temporarily/i.test(body)
        && body.length < 120;
      const thin = body.length < 25 && !hasChart;
      const ok = !emptyish && !thin && (hasChart || body.length > 40 || badgeKind === 'fetched' || badgeKind === 'static');
      return {
        title,
        status: emptyish || badgeKind === 'error' || badgeKind === 'no-data' ? 'bad'
          : thin || badgeKind === 'pending' ? 'thin'
          : ok ? 'ok' : 'unknown',
        kind: 'card',
        hasData: ok,
        isEmpty: emptyish || badgeKind === 'error' || badgeKind === 'no-data',
        hasChart,
        badgeKind,
        bodyPeek: body.slice(0, 100),
      };
    });
  });
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const all = [];

console.log(`Auditing hosted panels at ${BASE}`);
console.log(`Settle ${SETTLE}ms per tab\n`);

for (const market of MARKETS) {
  const errs = [];
  page.removeAllListeners('pageerror');
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 160)));
  try {
    await page.goto(`${BASE}/?market=${market}`, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const splash = await dismissSplash(page);
    await page.waitForTimeout(SETTLE);
    // Ensure we left splash for card-level checks
    await dismissSplash(page);
    await page.waitForTimeout(1500);

    const panels = await collectPanels(page);
    const ok = panels.filter((p) => p.hasData || p.status === 'ok').length;
    const bad = panels.filter((p) => p.isEmpty || p.status === 'bad' || p.status === 'error').length;
    const thin = panels.filter((p) => p.status === 'thin' || p.status === 'loading').length;
    console.log(
      `${market.padEnd(18)} splash=${splash.padEnd(7)} n=${String(panels.length).padStart(3)} ok=${String(ok).padStart(3)} bad=${String(bad).padStart(3)} thin=${String(thin).padStart(3)} errs=${errs.length}`
    );
    for (const p of panels.filter((p) => p.isEmpty || p.status === 'bad' || p.status === 'error')) {
      console.log(`  ✗ ${p.title} [${p.status}/${p.kind}] ${p.bodyPeek}`);
    }
    all.push({ market, splash, panels, errs, ok, bad, thin });
  } catch (e) {
    console.log(`${market.padEnd(18)} FAIL ${String(e.message).slice(0, 140)}`);
    all.push({ market, panels: [], errs: [String(e.message)], ok: 0, bad: 0, thin: 0 });
  }
}

await browser.close();

const totalN = all.reduce((s, m) => s + m.panels.length, 0);
const totalOk = all.reduce((s, m) => s + m.ok, 0);
const totalBad = all.reduce((s, m) => s + m.bad, 0);
const totalThin = all.reduce((s, m) => s + m.thin, 0);
console.log(`\n=== DOM PANEL SUMMARY ===`);
console.log(`Tabs: ${all.length}`);
console.log(`Panels/chips seen: ${totalN}`);
console.log(`OK: ${totalOk}`);
console.log(`BAD: ${totalBad}`);
console.log(`THIN/loading: ${totalThin}`);

const out = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  summary: { totalN, totalOk, totalBad, totalThin },
  markets: all,
};
writeFileSync('panel-dom-audit.json', JSON.stringify(out, null, 2));
console.log('Wrote panel-dom-audit.json');
process.exit(totalBad > 0 ? 1 : 0);
