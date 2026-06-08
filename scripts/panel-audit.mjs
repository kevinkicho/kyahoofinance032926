// Per-panel data-binding audit. Walks every market tab and reports each
// BentoCard's title, badge state, and whether it actually has content (chart
// or numeric data) inside it. Output: /tmp/panel-audit.json + console table.
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = process.env.SHOT_BASE_URL || 'http://localhost:5173';
const SETTLE = Number(process.env.AUDIT_SETTLE_MS || 14000);

const MARKETS = [
  'equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
];

async function auditTab(page, market) {
  const errs = [];
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('pageerror', e => errs.push(`pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error') errs.push(`console.error: ${m.text().slice(0, 200)}`); });

  await page.goto(`${BASE}/?market=${market}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(SETTLE);

  const panels = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[class*="bento-card"]'));
    return cards.map(c => {
      // Title — check several selectors used across BentoCard variants.
      const titleEl = c.querySelector('.bento-card__title') ||
                      c.querySelector('.bc-title') ||
                      c.querySelector('[class*="bento"][class*="title"]') ||
                      c.querySelector('h3, h4');
      const title = titleEl?.textContent?.trim() || '(untitled)';

      // Badge state from DataFooter pills.
      const badge = c.querySelector('.df-fetched, .df-static, .df-pending, .df-no-data, .df-error');
      const badgeText = badge?.textContent?.trim() || 'NONE';
      const badgeKind =
        badge?.classList.contains('df-fetched') ? 'fetched'
        : badge?.classList.contains('df-static') ? 'static'
        : badge?.classList.contains('df-pending') ? 'pending'
        : badge?.classList.contains('df-no-data') ? 'no-data'
        : badge?.classList.contains('df-error') ? 'error'
        : 'none';

      // Content checks
      const hasChart = !!c.querySelector('canvas, svg.echarts-svg, .echarts-for-react');
      const hasTable = !!c.querySelector('table, [class*="grid-template"], [class*="scorecard-row"]');
      const hasMetric = !!c.querySelector('[class*="metric"], [class*="kpi"], [class*="value"]');
      const hasErrorMsg = !!c.querySelector('[class*="error"], [class*="empty"]');
      const errorText = c.querySelector('[class*="error-text"], [class*="empty-msg"], [class*="no-data-msg"]')?.textContent?.trim() || '';

      // Body text length (excluding title) — proxy for whether panel has content.
      const cloned = c.cloneNode(true);
      cloned.querySelectorAll('.bento-card__title, .bc-title, [class*="bento"][class*="title"], h3, h4, .bento-card__footer, [class*="footer"], [class*="df-"]').forEach(el => el.remove());
      const bodyText = cloned.textContent?.trim().replace(/\s+/g, ' ') || '';

      return {
        title,
        badge: badgeText,
        badgeKind,
        hasChart, hasTable, hasMetric,
        bodyChars: bodyText.length,
        bodyPreview: bodyText.slice(0, 80),
        suspicious: bodyText.length < 30 && !hasChart, // panel that has no chart and almost no text
      };
    });
  });

  return { market, panels, errors: errs };
}

async function main() {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 4200 } });
  const page = await ctx.newPage();

  // Health gate
  try {
    const r = await page.goto(`${BASE}/api/health`, { timeout: 5000 });
    if (!r?.ok()) throw new Error(`health ${r?.status()}`);
  } catch (e) {
    console.error(`Dev server unreachable at ${BASE}: ${e.message}`);
    await browser.close();
    process.exit(2);
  }

  const all = [];
  for (const m of MARKETS) {
    const t0 = Date.now();
    try {
      const result = await auditTab(page, m);
      const ms = Date.now() - t0;
      const counts = result.panels.reduce((acc, p) => {
        acc[p.badgeKind] = (acc[p.badgeKind] || 0) + 1;
        if (p.suspicious) acc.suspicious++;
        return acc;
      }, { fetched: 0, static: 0, pending: 0, 'no-data': 0, error: 0, none: 0, suspicious: 0 });
      console.log(`[${m.padEnd(20)}] panels=${result.panels.length}  fetched=${counts.fetched} static=${counts.static} pending=${counts.pending} nodata=${counts['no-data']} err=${counts.error} sus=${counts.suspicious} jsErr=${result.errors.length} ${ms}ms`);
      all.push({ market: m, ms, counts, ...result });
    } catch (e) {
      console.log(`[${m.padEnd(20)}] FAIL ${e.message}`);
      all.push({ market: m, error: e.message });
    }
  }

  writeFileSync('/tmp/panel-audit.json', JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE, markets: all }, null, 2));
  console.log('\nSaved: /tmp/panel-audit.json');

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
