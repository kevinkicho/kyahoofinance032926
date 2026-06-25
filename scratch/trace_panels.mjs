import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const URL = process.argv[2] || 'https://kevinkicho.github.io/kyahoofinance032926/';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
});
const page = await context.newPage();

const logs = [];
page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));

console.log(`Navigating to ${URL}...`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
await page.waitForTimeout(5000);

// Navigate to Analytics tab
await page.evaluate(() => {
  const buttons = document.querySelectorAll('button.market-tab');
  for (const btn of buttons) {
    if (btn.textContent?.toLowerCase().includes('analytics')) {
      btn.click();
      return;
    }
  }
});
await page.waitForTimeout(5000);

// Run Panel Trace Inspector for all markets
const traceResults = await page.evaluate(async () => {
  const select = document.querySelector('select.pti-market-select');
  if (!select) return { error: 'Panel Trace Inspector not found' };

  const markets = Array.from(select.options).map(o => o.value);
  const results = {};

  for (const market of markets) {
    select.value = market;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise(r => setTimeout(r, 500));

    const runBtn = document.querySelector('button.pti-run-btn');
    if (runBtn) {
      runBtn.click();
      await new Promise(r => setTimeout(r, 3000));
    }

    const rows = document.querySelectorAll('tr.pti-row');
    const marketResults = [];
    rows.forEach(row => {
      const title = row.querySelector('.pti-panel-title')?.textContent?.trim() || '';
      const field = row.querySelector('.pti-field-name')?.textContent?.trim() || '';
      const backendEl = row.querySelector('.pti-cell:first-child');
      const backend = backendEl?.querySelector('.pti-shape, .pti-cross-market')?.textContent?.trim() || '';
      const status = row.querySelector('.pti-badge')?.textContent?.trim() || '';
      marketResults.push({ title, field, backend, status });
    });
    results[market] = marketResults;
  }
  return results;
});

if (traceResults.error) {
  console.log(traceResults.error);
} else {
  for (const [market, panels] of Object.entries(traceResults)) {
    const nulls = panels.filter(p => p.status === 'NULL');
    const missing = panels.filter(p => p.status === 'MISSING');
    const shape = panels.filter(p => p.status === 'SHAPE');
    const warns = panels.filter(p => p.status === 'WARN');
    const ok = panels.filter(p => p.status === 'OK');
    console.log(`\n${market}: OK=${ok.length} NULL=${nulls.length} MISSING=${missing.length} SHAPE=${shape.length} WARN=${warns.length}`);
    if (nulls.length) console.log(`  NULL: ${nulls.map(p => p.title).join(', ')}`);
    if (missing.length) console.log(`  MISSING: ${missing.map(p => p.title).join(', ')}`);
    if (shape.length) console.log(`  SHAPE: ${shape.map(p => p.title).join(', ')}`);
    if (warns.length) console.log(`  WARN: ${warns.map(p => p.title).join(', ')}`);
  }
}

const errors = logs.filter(l => l.type === 'error' || l.text.includes('crashed') || l.text.includes('hasNonNullData'));
console.log('\n=== Console Errors ===');
errors.forEach(e => console.log(`[${e.type}] ${e.text?.slice(0, 300)}`));

writeFileSync('/tmp/opencode/panel_trace.json', JSON.stringify({ traceResults, errors: errors.slice(0, 50) }, null, 2));
console.log('\nFull results written to /tmp/opencode/panel_trace.json');

await browser.close();
