// Visit every market tab via Playwright, wait for the data wave to land,
// and screenshot the full page. Output goes to `test-results/screenshots/`.
//
// Run with the dev server up:
//   npm start                                     # in another terminal
//   node scripts/screenshot-tabs.mjs              # uses .server-port if 5173 isn't free
//
// Env knobs:
//   SHOT_SETTLE_MS=8000   override per-tab settle wait
//   SHOT_BASE_URL=http://localhost:5173
//   SHOT_ONLY=bls,bonds   limit to a comma-separated subset
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SETTLE_MS = Number(process.env.SHOT_SETTLE_MS || 7000);
const ONLY = (process.env.SHOT_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);

function resolveBaseUrl() {
  if (process.env.SHOT_BASE_URL) return process.env.SHOT_BASE_URL;
  const portFile = path.resolve(__dirname, '..', '.server-port');
  if (existsSync(portFile)) {
    const port = readFileSync(portFile, 'utf8').trim();
    if (port) return `http://localhost:${port}`;
  }
  return 'http://localhost:5173';
}

const BASE_URL = resolveBaseUrl();
const OUT_DIR = path.resolve(__dirname, '..', 'test-results', 'screenshots');

const MARKETS = [
  'equities', 'bonds', 'fx', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
].filter(m => ONLY.length === 0 || ONLY.includes(m));

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await context.newPage();

  // Fail fast if the dev server isn't reachable.
  try {
    const res = await page.goto(`${BASE_URL}/api/health`, { timeout: 5000 });
    if (!res || !res.ok()) throw new Error(`health check returned ${res?.status()}`);
  } catch (e) {
    console.error(`[screenshot-tabs] dev server unreachable at ${BASE_URL}: ${e.message}`);
    console.error(`Run \`npm start\` first.`);
    await browser.close();
    process.exit(2);
  }

  const summary = [];

  for (const market of MARKETS) {
    const t0 = Date.now();
    let pendingCount = 0;
    let noDataCount = 0;
    let panelCount = 0;
    let consoleErrors = 0;
    const errors = [];

    page.removeAllListeners('pageerror');
    page.removeAllListeners('console');
    page.on('pageerror', (err) => { consoleErrors++; errors.push(err.message); });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors++;
        errors.push(msg.text());
      }
    });

    try {
      await page.goto(`${BASE_URL}/?market=${market}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(SETTLE_MS);

      const stats = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="bento-card"], [class*="bento-panel"]');
        let pending = 0, nodata = 0;
        for (const c of cards) {
          const badge = c.querySelector('.df-fetched, .df-static, .df-pending, .df-no-data');
          const t = badge?.textContent?.trim();
          if (t === 'PENDING') pending++;
          else if (t === 'NO DATA') nodata++;
        }
        return { panelCount: cards.length, pending, nodata };
      });
      panelCount = stats.panelCount;
      pendingCount = stats.pending;
      noDataCount = stats.nodata;

      const outPath = path.join(OUT_DIR, `${market}.png`);
      await page.screenshot({ path: outPath, fullPage: true });

      const ms = Date.now() - t0;
      const status =
        pendingCount === 0 && noDataCount === 0 && consoleErrors === 0 ? 'ok'
        : (pendingCount > 0 || noDataCount > 0) ? 'partial'
        : 'js-error';
      console.log(`[${status.padEnd(7)}] ${market.padEnd(20)} panels=${panelCount} pending=${pendingCount} nodata=${noDataCount} jsErrors=${consoleErrors} ${ms}ms`);
      summary.push({ market, status, panelCount, pendingCount, noDataCount, consoleErrors, ms, errors: errors.slice(0, 3), screenshot: outPath });
    } catch (e) {
      const ms = Date.now() - t0;
      console.log(`[fail   ] ${market.padEnd(20)} ${e.message} ${ms}ms`);
      summary.push({ market, status: 'fail', error: e.message, ms });
    }
  }

  writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl: BASE_URL, settleMs: SETTLE_MS, results: summary }, null, 2));

  await browser.close();

  const fails = summary.filter(s => s.status === 'fail').length;
  const partial = summary.filter(s => s.status === 'partial').length;
  const jsErrors = summary.filter(s => s.status === 'js-error').length;
  const ok = summary.filter(s => s.status === 'ok').length;

  console.log('');
  console.log(`Summary: ${ok} ok · ${partial} partial · ${jsErrors} js-error · ${fails} failed`);
  console.log(`Screenshots: ${OUT_DIR}`);
  process.exit(fails > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
