/**
 * fetchNewStocks.js
 * Fetches 5 years of Yahoo Finance history + summary for every ticker in
 * stockUniverse.js that doesn't already have a file in data/stocks/.
 *
 * Usage:
 *   node fetchNewStocks.js           ← fetch missing stocks
 *   node fetchNewStocks.js --dry-run ← list what would be fetched, no network calls
 *   node fetchNewStocks.js --force   ← re-fetch even if file already exists
 *
 * Output files: data/stocks/<TICKER>_<SUFFIX>.json  (or <TICKER>.json for US/Crypto)
 * Format matches existing files: { ticker, fetchedAt, historyRows, history, summary }
 */

import YahooFinance from 'yahoo-finance2';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { stockUniverseData } from './src/data/stockUniverse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.join(__dirname, 'data', 'stocks');
const DRY_RUN    = process.argv.includes('--dry-run');
const FORCE      = process.argv.includes('--force');
const DELAY_MS   = 700; // ms between Yahoo requests — stay under rate limit

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Same suffix map as server/index.js
const REGION_SUFFIX = {
  'Japan Exchange':          'T',
  'Shanghai (China)':        'SS',
  'Shenzhen (China)':        'SZ',
  'Hong Kong (Hang Seng)':   'HK',
  'KRX (South Korea)':       'KS',
  'TWSE (Taiwan)':           'TW',
  'NSE (India)':             'NS',
  'BSE (India)':             'BO',
  'LSE (UK)':                'L',
  'Tadawul (Saudi Arabia)':  'SR',
  'TSX (Canada)':            'TO',
  'DAX (Germany)':           'F',
  'SIX (Switzerland)':       'SW',
  'Nasdaq Nordic':           'ST',   // also tries HE, CO
  'ASX (Australia)':         'AX',
  'B3 (Brazil)':             'SA',
  'BME (Spain)':             'MC',
  'SGX (Singapore)':         'SG',
  'JSE (South Africa)':      'JO',
  'Borsa Italiana':          'MI',
  'SET (Thailand)':          'BK',
  'BMV (Mexico)':            'MX',
  'IDX (Indonesia)':         'JK',
  'Bursa Malaysia':          'KL',
  'PSE (Philippines)':       'PS',
  'WSE (Poland)':            'WA',
  'TASE (Israel)':           'TA',
  'OSL (Norway)':            'OL',
  'Euronext (Europe)':       'PA',
  'ADX (Abu Dhabi)':         'AE',
  'DFM (Dubai)':             'AE',
  'QSE (Qatar)':             'QA',
  'KSE (Kuwait)':            'KW',
  'EGX (Egypt)':             'CA',
  'BCS (Chile)':             'SN',
  'BVL (Peru)':              'LM',
  'Casablanca (Morocco)':    'CS',
  'NGX (Nigeria)':           'LG',
  'BCBA (Argentina)':        'BA',
  'KASE (Kazakhstan)':       'KZ',
  'HOSE (Vietnam)':          'VN',
  'DSE (Bangladesh)':        'DH',
  'PSX (Pakistan)':          'KA',
  'NSE (Kenya)':             'NR',
  'ZSE (Zimbabwe)':          'ZW',
  'BVM (Luxembourg)':        'LU',
  'VSE (Austria)':           'VI',
  'NZX (New Zealand)':       'NZ',
  'BVC (Colombia)':          'CL',
  // Crypto and US have no suffix
};

// Nordic stocks may be on Stockholm (.ST), Copenhagen (.CO), or Helsinki (.HE)
const NORDIC_FALLBACKS = ['CO', 'HE'];
// Euronext "PA" covers French stocks; Dutch stocks are ".AS", Belgian are ".BR"
const EURONEXT_FALLBACKS = ['AS', 'BR', 'DE', 'L'];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Build list: { ticker, yahooTicker, filename, region }
function buildTickerList() {
  const list = [];
  for (const region of stockUniverseData) {
    const suffix = REGION_SUFFIX[region.name] || null;
    for (const stock of (region.children || [])) {
      const ticker = stock.name;
      if (!ticker) continue;

      // US stocks and Crypto: no suffix
      if (!suffix || region.name === 'Crypto') {
        list.push({
          ticker,
          yahooTicker: ticker,
          filename: `${ticker}.json`,
          region: region.name,
          fallbackSuffixes: [],
        });
      } else {
        const safeTicker = ticker.replace(/\//g, '-'); // BT/A → BT-A for filename
        list.push({
          ticker,
          yahooTicker: `${ticker}.${suffix}`,
          filename: `${safeTicker}_${suffix}.json`,
          region: region.name,
          fallbackSuffixes: region.name === 'Nasdaq Nordic'   ? NORDIC_FALLBACKS
                          : region.name === 'Euronext (Europe)' ? EURONEXT_FALLBACKS
                          : [],
        });
      }
    }
  }
  return list;
}

async function fetchOne(yahooTicker) {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 5);

  const [history, summary] = await Promise.all([
    yf.historical(yahooTicker, {
      period1: start.toISOString().split('T')[0],
      period2: end.toISOString().split('T')[0],
      interval: '1d',
    }),
    yf.quoteSummary(yahooTicker, {
      modules: [
        'financialData', 'defaultKeyStatistics', 'earningsTrend',
        'recommendationTrend', 'majorHoldersBreakdown',
        'incomeStatementHistory', 'cashflowStatementHistory', 'balanceSheetHistory',
      ],
    }).catch(() => null), // summary is nice-to-have; don't fail the whole fetch
  ]);

  const rows = history.map(d => ({
    date:   d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
    open:   d.open,
    high:   d.high,
    low:    d.low,
    close:  d.close,
    volume: d.volume,
  }));

  return { rows, summary };
}

async function main() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const allTickers = buildTickerList();
  const toFetch = FORCE
    ? allTickers
    : allTickers.filter(t => !fs.existsSync(path.join(DATA_DIR, t.filename)));

  const existing = allTickers.length - toFetch.length;

  console.log(`\n📊 Stock universe: ${allTickers.length} total`);
  console.log(`✅ Already have:   ${existing} files`);
  console.log(`🔄 To fetch:       ${toFetch.length} stocks`);
  if (DRY_RUN) {
    console.log('\n--- DRY RUN (no requests will be made) ---');
    toFetch.forEach((t, i) => console.log(`  ${String(i+1).padStart(3)}. ${t.yahooTicker.padEnd(20)} → ${t.filename}`));
    return;
  }
  console.log(`⏱  Estimated time: ~${Math.ceil(toFetch.length * DELAY_MS / 60000)} min\n`);

  let ok = 0, failed = 0;
  const failures = [];

  for (let i = 0; i < toFetch.length; i++) {
    const { ticker, yahooTicker, filename, region, fallbackSuffixes } = toFetch[i];
    const label = `[${String(i+1).padStart(3)}/${toFetch.length}]`;

    // Try primary Yahoo ticker, then fallbacks (for Nordic)
    const attempts = [yahooTicker, ...fallbackSuffixes.map(sfx => `${ticker}.${sfx}`)];
    let saved = false;

    for (const attempt of attempts) {
      try {
        process.stdout.write(`${label} ${attempt.padEnd(22)} `);
        const { rows, summary } = await fetchOne(attempt);

        if (rows.length === 0) {
          process.stdout.write(`⚠  0 rows returned\n`);
          continue;
        }

        const outFile = path.join(DATA_DIR, filename);
        fs.writeFileSync(outFile, JSON.stringify({
          ticker: attempt,   // use the working Yahoo ticker
          fetchedAt: new Date().toISOString(),
          historyRows: rows.length,
          history: rows,
          summary: summary || null,
        }, null, 0)); // compact — these files can be large

        process.stdout.write(`✓  ${rows.length} rows → ${filename}\n`);
        ok++;
        saved = true;
        break;
      } catch (err) {
        const msg = err.message?.split('\n')[0] || String(err);
        process.stdout.write(`✗  ${msg.slice(0, 60)}\n`);
        if (attempt !== attempts[attempts.length - 1]) {
          process.stdout.write(`${label} ${'↩ trying'.padEnd(22)} `);
        }
      }
    }

    if (!saved) {
      failed++;
      failures.push({ ticker: yahooTicker, region });
    }

    await sleep(DELAY_MS);
  }

  console.log('\n' + '─'.repeat(60));
  console.log(`✅ Fetched:  ${ok}`);
  console.log(`❌ Failed:   ${failed}`);
  if (failures.length) {
    console.log('\nFailed tickers (may not be on Yahoo Finance):');
    failures.forEach(f => console.log(`  ${f.ticker.padEnd(25)} [${f.region}]`));
  }
  console.log('\nDone. Run the app to see the expanded universe!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
