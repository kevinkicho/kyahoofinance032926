/**
 * Panel coverage spec.
 *
 * Strict counterpart to data-binding-audit.spec.js. Drives the registry in
 * tests/panel-registry.js — for every market tab, navigates, lets the data
 * wave land, and asserts that:
 *
 *   1. every registered panel exists in the DOM
 *   2. it is not stuck on PENDING / NO DATA
 *   3. it has rendered content (chart canvas/svg, OR ≥ minValues meaningful
 *      text values that aren't all em-dash placeholders)
 *   4. no UNREGISTERED panel exists (forces newly-added panels to be
 *      registered, which is the whole point — coverage grows with the app
 *      instead of decaying behind it)
 *
 * Run with the dev/start server up:
 *   npm run test:coverage
 *
 * Knobs:
 *   COVERAGE_SETTLE_MS=8000   override per-tab data-wave wait
 *   COVERAGE_STRICT=0         soft-warn on extras instead of failing
 *   COVERAGE_ONLY=bonds,fx    restrict to a subset of markets
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PANEL_REGISTRY, SOFT_EXTRA_MARKETS } from './panel-registry.js';

const SETTLE_MS = Number(process.env.COVERAGE_SETTLE_MS || 7000);
const STRICT = process.env.COVERAGE_STRICT !== '0';
const ONLY = (process.env.COVERAGE_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);

const REPORT_PATH = path.resolve('test-results', 'panel-coverage.json');

const MARKETS = Object.keys(PANEL_REGISTRY).filter(m => ONLY.length === 0 || ONLY.includes(m));

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .trim();
}

// Run inside the page. Returns a per-tab snapshot of every bento card on
// screen with enough metadata for the assertion layer to make decisions.
async function collectPanels(page) {
  return page.$$eval('[class*="bento-card"]', (cards) => {
    function decode(s) {
      const t = document.createElement('textarea');
      t.innerHTML = s || '';
      return t.value.trim();
    }
    return cards.map((card) => {
      const titleEl = card.querySelector('.bento-panel-title-row, [class*="panel-title-row"]');
      // Title row often contains both title + subtitle spans. Prefer the
      // first span/dedicated title element; fall back to the row's text.
      let title = '';
      const titleSpan = titleEl?.querySelector('[class*="panel-title"]:not([class*="subtitle"])');
      if (titleSpan) title = titleSpan.textContent || '';
      else if (titleEl) title = titleEl.textContent || '';
      title = decode(title).slice(0, 100);

      const badge = card.querySelector('.df-fetched, .df-static, .df-pending, .df-no-data');
      const badgeText = badge?.textContent?.trim() || null;

      const valueEls = Array.from(card.querySelectorAll('[class*="value"], [class*="num"], td, .bento-panel-content span'));
      const values = valueEls.map(el => (el.textContent || '').trim());
      const meaningful = values.filter(v => v && v !== '—' && v !== '-' && v !== 'N/A' && !/^\.+$/.test(v));

      const hasCanvas = !!card.querySelector('canvas');
      const svgEls = Array.from(card.querySelectorAll('svg'));
      const hasChartSvg = svgEls.some(svg => {
        const r = svg.getBoundingClientRect();
        return r.width > 20 && r.height > 20;
      });

      return {
        title,
        badge: badgeText,
        valueCount: values.length,
        meaningfulCount: meaningful.length,
        hasCanvas,
        hasChartSvg,
      };
    });
  });
}

function panelHasContent(panel, minValues) {
  if (panel.badge === 'PENDING' || panel.badge === 'NO DATA') return false;
  if (panel.hasCanvas || panel.hasChartSvg) return true;
  return panel.meaningfulCount >= (minValues ?? 1);
}

function matchesEntry(entry, panelTitle) {
  const decoded = decodeEntities(panelTitle);
  if (entry.titlePattern) return entry.titlePattern.test(decoded);
  return decoded === entry.title;
}

// One Playwright test per market tab so the report breaks out by tab and
// failures don't cascade across markets.
for (const market of MARKETS) {
  test(`panel coverage · ${market}`, async ({ page }, testInfo) => {
    test.setTimeout(SETTLE_MS + 25_000);
    const expected = PANEL_REGISTRY[market]?.panels || [];

    await page.goto(`/?market=${market}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(SETTLE_MS);

    const panels = await collectPanels(page);

    const result = {
      market,
      total: panels.length,
      expected: expected.length,
      missing: [],            // registered, not found
      empty: [],              // registered, found but no content
      stalePending: [],       // registered, found with PENDING/NO DATA badge
      extras: [],             // unregistered panels in the DOM
      ok: [],                 // registered + rendered
    };

    const consumed = new Set();

    for (const entry of expected) {
      const matchedIdxs = panels
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => matchesEntry(entry, p.title));
      const need = entry.count ?? 1;

      if (matchedIdxs.length < need) {
        result.missing.push({ title: entry.title || String(entry.titlePattern), need, found: matchedIdxs.length });
        continue;
      }

      let satisfied = 0;
      for (const { p, i } of matchedIdxs) {
        if (consumed.has(i)) continue;
        if (p.badge === 'PENDING' || p.badge === 'NO DATA') {
          result.stalePending.push({ title: p.title, badge: p.badge });
          consumed.add(i);
          continue;
        }
        if (!panelHasContent(p, entry.minValues)) {
          result.empty.push({ title: p.title, valueCount: p.valueCount, meaningfulCount: p.meaningfulCount, hasChart: p.hasCanvas || p.hasChartSvg });
          consumed.add(i);
          continue;
        }
        result.ok.push({ title: p.title });
        consumed.add(i);
        satisfied++;
        if (satisfied >= need) break;
      }

      if (satisfied < need) {
        result.missing.push({ title: entry.title || String(entry.titlePattern), need, found: satisfied, note: 'matched panels existed but failed content checks' });
      }
    }

    // Anything unconsumed and titled is an unregistered extra.
    for (let i = 0; i < panels.length; i++) {
      if (consumed.has(i)) continue;
      const p = panels[i];
      if (!p.title || p.title === '(untitled)') continue;
      result.extras.push({ title: p.title, badge: p.badge, hasChart: p.hasCanvas || p.hasChartSvg, meaningfulCount: p.meaningfulCount });
    }

    // Persist per-tab artifact for inspection (overwrites cumulative file
    // each test; the all-tabs aggregate is built by an afterAll hook below).
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    const perTabPath = REPORT_PATH.replace('.json', `-${market}.json`);
    fs.writeFileSync(perTabPath, JSON.stringify(result, null, 2));
    await testInfo.attach(`panel-coverage-${market}.json`, { path: perTabPath, contentType: 'application/json' });

    // Hard assertions.
    expect(result.missing, `missing panels on "${market}": ${JSON.stringify(result.missing)}`).toEqual([]);
    expect(result.empty, `empty panels on "${market}": ${JSON.stringify(result.empty)}`).toEqual([]);
    expect(result.stalePending, `PENDING/NO DATA panels on "${market}": ${JSON.stringify(result.stalePending)}`).toEqual([]);

    const isSoft = !STRICT || SOFT_EXTRA_MARKETS.has(market);
    if (result.extras.length) {
      const msg = `unregistered panels on "${market}" (add to tests/panel-registry.js): ${result.extras.map(e => e.title).join(', ')}`;
      if (isSoft) console.warn(`[coverage] ${msg}`);
      else expect(result.extras, msg).toEqual([]);
    }
  });
}

// Aggregate all per-tab JSONs into a single report at the end.
test.afterAll(async () => {
  try {
    const dir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(dir)) return;
    const parts = fs.readdirSync(dir)
      .filter(f => f.startsWith('panel-coverage-') && f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    if (!parts.length) return;
    fs.writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), settleMs: SETTLE_MS, strict: STRICT, tabs: parts }, null, 2));

    const lines = [];
    lines.push('# Panel coverage report');
    lines.push(`Generated ${new Date().toISOString()} · settle=${SETTLE_MS}ms · strict=${STRICT}`);
    lines.push('');
    lines.push('| Market | Registered | Rendered | Missing | Empty | Pending | Extras |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const r of parts) {
      lines.push(`| ${r.market} | ${r.expected} | ${r.ok.length} | ${r.missing.length} | ${r.empty.length} | ${r.stalePending.length} | ${r.extras.length} |`);
    }
    lines.push('');
    for (const r of parts) {
      const issues = r.missing.length + r.empty.length + r.stalePending.length + r.extras.length;
      lines.push(`## ${r.market} — ${issues === 0 ? '✓ all panels rendered' : `⚠ ${issues} issue(s)`}`);
      if (r.missing.length)      lines.push(`  Missing:  ${r.missing.map(x => x.title).join(', ')}`);
      if (r.empty.length)        lines.push(`  Empty:    ${r.empty.map(x => x.title).join(', ')}`);
      if (r.stalePending.length) lines.push(`  Pending:  ${r.stalePending.map(x => `${x.title}[${x.badge}]`).join(', ')}`);
      if (r.extras.length)       lines.push(`  Extras:   ${r.extras.map(x => x.title).join(', ')}`);
      lines.push('');
    }
    fs.writeFileSync(REPORT_PATH.replace('.json', '.md'), lines.join('\n'));
  } catch (e) {
    console.warn('[coverage] aggregate report failed:', e?.message);
  }
});
