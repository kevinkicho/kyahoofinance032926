import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT_FILE = path.resolve(__dirname, '..', '.server-port');
const PORT = readFileSync(PORT_FILE, 'utf8').trim();
const BASE = `http://localhost:5173/kyahoofinance032926`;

const TABS = [
  'equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const report = [];

for (const tab of TABS) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message.slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });

  try {
    await page.goto(`${BASE}/?market=${tab}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(8000);

    const audit = await page.evaluate(() => {
      const items = document.querySelectorAll('.react-grid-item, [class*="bento-card"]');
      const panels = Array.from(items).map(el => {
        const title = el.querySelector('.bento-panel-title')?.textContent?.trim() || '(no title)';
    const hasDataFooter = !!el.querySelector('[class*="df-root"]');
    const metricValues = el.querySelectorAll('[class*="metric-value"], [class*="MetricValue"], [class*="mv-"]');
    const metricValueCount = metricValues.length;
    const hasProvenance = Array.from(metricValues).some(mv => {
      const text = mv.textContent || '';
      return text.includes('FRED') || text.includes('Yahoo') || text.includes('BIS') ||
             text.includes('IMF') || text.includes('World Bank') || text.includes('ECB') ||
             text.includes('Frankfurter') || text.includes('CFTC') || text.includes('EIA') ||
             text.includes('BLS') || text.includes('SEC') || text.includes('FDIC') ||
             text.includes('Census') || text.includes('Fed') || text.includes('OECD');
    });
    const charts = el.querySelectorAll('canvas, svg');
    const chartCount = charts.length;
    const hasSourceInfo = Array.from(charts).some(c => {
      const parent = c.closest('[class*="source-info"], [class*="sourceInfo"]');
      return !!parent;
    });
        const body = (el.querySelector('.bento-panel-content')?.textContent || '').replace(/\s+/g, ' ').trim();
        const isEmpty = /no .{0,20}data|temporarily unavailable|not configured/i.test(body) || body.length < 10;
        const hasData = !isEmpty && (chartCount > 0 || body.length > 20);
        return {
          title,
          hasDataFooter,
          metricValueCount,
          hasProvenance,
          chartCount,
          hasSourceInfo,
          isEmpty,
          hasData,
          bodyPeek: body.slice(0, 80),
        };
      });
      return panels;
    });

    report.push({
      tab,
      ok: true,
      panels: audit,
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors: pageErrors.slice(0, 5),
    });
  } catch (e) {
    report.push({
      tab,
      ok: false,
      error: e.message.slice(0, 200),
      panels: [],
      consoleErrors: consoleErrors.slice(0, 10),
      pageErrors: pageErrors.slice(0, 5),
    });
  }
}

await browser.close();

// Print report
let totalExpected = 0, totalFound = 0, totalData = 0, totalEmpty = 0;
let totalNoFooter = 0, totalNoProvenance = 0, totalNoSourceInfo = 0;

for (const r of report) {
  const status = r.ok ? '✓' : '✗';
  const found = r.panels.length;
  const dataBound = r.panels.filter(p => p.hasData).length;
  const empty = r.panels.filter(p => p.isEmpty).length;
  const noFooter = r.panels.filter(p => !p.hasDataFooter).length;
  const noProvenance = r.panels.filter(p => p.metricValueCount > 0 && !p.hasProvenance).length;
  const noSourceInfo = r.panels.filter(p => p.chartCount > 0 && !p.hasSourceInfo).length;

  totalFound += found;
  totalData += dataBound;
  totalEmpty += empty;
  totalNoFooter += noFooter;
  totalNoProvenance += noProvenance;
  totalNoSourceInfo += noSourceInfo;

  console.log(`${status} ${r.tab.padEnd(20)} panels=${found} data=${dataBound} empty=${empty} noFooter=${noFooter} noProvenance=${noProvenance} noSourceInfo=${noSourceInfo}`);
  if (!r.ok) console.log(`   ERROR: ${r.error}`);
  if (r.pageErrors.length) console.log(`   pageErrors: ${r.pageErrors.join('; ')}`);
  if (r.consoleErrors.length) console.log(`   consoleErrors: ${r.consoleErrors.length}`);

  // Detail for panels missing critical features
  for (const p of r.panels) {
    const issues = [];
    if (!p.hasDataFooter) issues.push('noFooter');
    if (p.metricValueCount > 0 && !p.hasProvenance) issues.push('noProvenance');
    if (p.chartCount > 0 && !p.hasSourceInfo) issues.push('noSourceInfo');
    if (issues.length) {
      console.log(`   ⚠ ${p.title}: ${issues.join(', ')}`);
    }
  }
}

console.log(`\n=== PANEL HEALTH SUMMARY ===`);
console.log(`Tabs: ${report.filter(r => r.ok).length}/${TABS.length} OK`);
console.log(`Panels found: ${totalFound}`);
console.log(`Data-bound: ${totalData}`);
console.log(`Empty: ${totalEmpty}`);
console.log(`Missing DataFooter: ${totalNoFooter}`);
console.log(`Missing MetricValue provenance: ${totalNoProvenance}`);
console.log(`Missing chart sourceInfo: ${totalNoSourceInfo}`);

const md = ['# Panel Health Audit Report\n', `${new Date().toISOString()}\n`];
for (const r of report) {
  md.push(`## ${r.tab}`);
  if (!r.ok) { md.push(`> ERROR: ${r.error}\n`); continue; }
  const dataBound = r.panels.filter(p => p.hasData).length;
  const empty = r.panels.filter(p => p.isEmpty).length;
  md.push(`Panels: ${r.panels.length} total, ${dataBound} data-bound, ${empty} empty\n`);
  md.push('| Panel | DataFooter | MetricValues | Provenance | Charts | SourceInfo | Status |');
  md.push('|---|---|---|---|---|---|---|');
  for (const p of r.panels) {
    const status = p.hasData ? '✓ data' : p.isEmpty ? '✗ empty' : '?';
    md.push(`| ${p.title} | ${p.hasDataFooter ? '✓' : '✗'} | ${p.metricValueCount} | ${p.hasProvenance ? '✓' : p.metricValueCount > 0 ? '✗' : '-'} | ${p.chartCount} | ${p.hasSourceInfo ? '✓' : p.chartCount > 0 ? '✗' : '-'} | ${status} |`);
  }
  if (r.pageErrors.length) md.push(`\nPage errors: ${r.pageErrors.join('; ')}`);
  if (r.consoleErrors.length) md.push(`\nConsole errors: ${r.consoleErrors.length}`);
  md.push('');
}
writeFileSync(path.resolve(__dirname, '..', 'test-results', 'panel-health.md'), md.join('\n'));
console.log(`\nFull report: test-results/panel-health.md`);
