/**
 * Data-binding audit. Walks every market tab, waits for the data wave to
 * land, and reports panels that are stuck PENDING / NO DATA, plus panels
 * with no rendered value (empty `<MetricValue>`s, missing charts, all-em-dash
 * tables). Output is a structured JSON report so it can be diffed in CI
 * against a known-good snapshot — and so the user doesn't have to walk the
 * UI by hand each time.
 *
 * Usage (after `npm start` is running on :5173):
 *   npx playwright test tests/data-binding-audit.spec.js --reporter=list
 *
 * Override the per-tab settle time with AUDIT_SETTLE_MS=8000 if your local
 * data wave is slower.
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const SETTLE_MS = Number(process.env.AUDIT_SETTLE_MS || 6000);

// All markets that own a tab in the Hub. Keep in sync with markets.config.js;
// IMF / WorldBank / Census were merged out and are intentionally absent.
const MARKETS = [
  'equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
];

const REPORT_PATH = path.resolve('test-results', 'data-binding-audit.json');

function summarise(audit) {
  const lines = [];
  lines.push('# Data-binding audit\n');
  lines.push(`Generated ${new Date().toISOString()} · settle=${SETTLE_MS}ms\n`);
  for (const tab of audit) {
    const flagCount = tab.pending.length + tab.noData.length + tab.emptyValues.length;
    lines.push(`## ${tab.market} — ${flagCount === 0 ? '✓ clean' : `⚠ ${flagCount} issue(s)`}`);
    if (tab.error) lines.push(`  ! navigation error: ${tab.error}`);
    if (tab.pending.length) lines.push(`  PENDING badges: ${tab.pending.map(p => p.title).join(', ')}`);
    if (tab.noData.length) lines.push(`  NO DATA badges: ${tab.noData.map(p => p.title).join(', ')}`);
    if (tab.emptyValues.length) lines.push(`  Panels with all-empty values: ${tab.emptyValues.map(p => p.title).join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

test.describe('data-binding audit', () => {
  test('every market binds its panels', async ({ page }) => {
    test.setTimeout(MARKETS.length * (SETTLE_MS + 8_000));
    const audit = [];

    for (const market of MARKETS) {
      const result = { market, pending: [], noData: [], emptyValues: [], error: null };
      try {
        await page.goto(`/?market=${market}`, { waitUntil: 'domcontentloaded' });
        // Let the central DataProvider's fetch wave run.
        await page.waitForTimeout(SETTLE_MS);

        // Each bento card hosts one DataFooter — pull the badge + the
        // panel title from the same card so we can name what's broken.
        const panels = await page.$$eval('[class*="bento-card"]', (cards) => {
          return cards.map((card) => {
            const titleEl = card.querySelector('[class*="panel-title"], .bento-panel-title, [class*="-title-row"]');
            const title = titleEl?.textContent?.trim() || '(untitled)';
            const badge = card.querySelector('.df-fetched, .df-static, .df-pending');
            const status = badge?.textContent?.trim() || null;
            // Heuristic for "all values are em-dash". We sample any text
            // that looks like a numeric placeholder.
            const valueEls = Array.from(card.querySelectorAll('[class*="value"], [class*="num"], td, .bento-panel-content span'));
            const values = valueEls.map(el => el.textContent?.trim() || '');
            const meaningful = values.filter(v => v && v !== '—' && v !== '-' && v !== 'N/A' && v.length > 0);
            const allEmpty = values.length > 0 && meaningful.length / values.length < 0.15;
            return { title: title.slice(0, 80), status, valueCount: values.length, meaningfulCount: meaningful.length, allEmpty };
          });
        });

        for (const p of panels) {
          if (p.status === 'PENDING') result.pending.push(p);
          else if (p.status === 'NO DATA') result.noData.push(p);
          else if (p.allEmpty && p.valueCount > 3) result.emptyValues.push(p);
        }
      } catch (err) {
        result.error = String(err?.message || err);
      }
      audit.push(result);
    }

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, JSON.stringify(audit, null, 2));
    fs.writeFileSync(REPORT_PATH.replace('.json', '.md'), summarise(audit));

    // Soft assertion — log everything, fail only if a tab errored hard.
    // The PENDING/NO DATA counts are advisory and tracked in the report.
    const navErrors = audit.filter(a => a.error);
    const totalIssues = audit.reduce((s, a) => s + a.pending.length + a.noData.length + a.emptyValues.length, 0);
    console.log(`Audit summary: ${totalIssues} panel issue(s) across ${audit.length} tabs. Report: ${REPORT_PATH}`);
    expect(navErrors, `Navigation errors: ${navErrors.map(e => `${e.market}: ${e.error}`).join('; ')}`).toEqual([]);
  });
});
