/**
 * Global Stock Universe — Data Acquisition Script  (ES Module, yahoo-finance2 v3)
 * ─────────────────────────────────────────────────────────────────────────────
 * Downloads 5-year daily OHLCV + fundamentals for every stock in the universe.
 *
 * Usage (run from project root):
 *   node scripts/fetch-universe.js               all markets, resume by default
 *   node scripts/fetch-universe.js --no-resume   re-fetch everything
 *   node scripts/fetch-universe.js --market USA  single market
 *   node scripts/fetch-universe.js --test        fetch first 5 tickers only
 *
 * Output:
 *   data/stocks/<TICKER>.json   one file per stock (history + summary)
 *   data/manifest.json          progress index
 */

import YahooFinance from 'yahoo-finance2';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const DELAY_MS      = 1600;   // ms between tickers (polite crawl)
const MAX_RETRIES   = 3;
const DATA_DIR      = path.join(__dirname, '..', 'data', 'stocks');
const MANIFEST_PATH = path.join(__dirname, '..', 'data', 'manifest.json');
const HISTORY_YEARS = 5;

const args          = process.argv.slice(2);
const RESUME        = !args.includes('--no-resume');
const TEST_MODE     = args.includes('--test');
const TARGET        = (() => { const i = args.indexOf('--market'); return i >= 0 ? args[i+1]?.toLowerCase() : null; })();

// ─── Full ticker universe ─────────────────────────────────────────────────────

const UNIVERSE = [
  { market: 'USA (NYSE & NASDAQ)',   tickers: ['AAPL','MSFT','NVDA','GOOGL','AMZN','META','BRK-B','WMT','TSLA','LLY','AVGO','JPM','V','XOM','UNH','MA','ORCL','ABBV','PG','COST','JNJ','HD','BAC','NFLX','KO','MRK','CRM','AMD','CSCO','GE'] },
  { market: 'Euronext (Europe)',      tickers: ['MC.PA','ASML.AS','OR.PA','RMS.PA','SAN.PA','TTE.PA','SU.PA','AIR.PA','AI.PA','BNP.PA','CS.PA','EL.PA','DG.PA','STLA','IFX.DE','ENGI.PA','BN.PA','RI.PA','ML.PA','NOKIA.HE'] },
  { market: 'Shanghai (China)',       tickers: ['600519.SS','601398.SS','601939.SS','601288.SS','601988.SS','601857.SS','600028.SS','601318.SS','600036.SS','601628.SS','601088.SS','600900.SS','601166.SS','601601.SS','601888.SS','601012.SS','600030.SS','600104.SS','600000.SS','600050.SS'] },
  { market: 'Japan Exchange',         tickers: ['7203.T','8306.T','6861.T','6758.T','9432.T','8035.T','9984.T','4063.T','9983.T','7974.T','6098.T','8058.T','7741.T','4519.T','6902.T','8031.T','7267.T','8053.T','6178.T','4502.T'] },
  { market: 'Shenzhen (China)',       tickers: ['300750.SZ','002594.SZ','000858.SZ','000333.SZ','002475.SZ','000651.SZ','002415.SZ','000001.SZ','000568.SZ','000776.SZ','300124.SZ','002714.SZ','300059.SZ','300014.SZ','002230.SZ'] },
  { market: 'Hong Kong (Hang Seng)', tickers: ['0700.HK','9988.HK','0941.HK','0005.HK','2318.HK','1299.HK','0883.HK','3690.HK','1810.HK','9618.HK','0388.HK','0016.HK','9999.HK','0175.HK','0027.HK'] },
  { market: 'NSE (India)',            tickers: ['RELIANCE.NS','TCS.NS','HDFCBANK.NS','BHARTIARTL.NS','ICICIBANK.NS','INFY.NS','SBIN.NS','ITC.NS','LT.NS','HINDUNILVR.NS','BAJFINANCE.NS','KOTAKBANK.NS','MARUTI.NS','ADANIENT.NS','WIPRO.NS','AXISBANK.NS','SUNPHARMA.NS','ASIANPAINT.NS','NTPC.NS','NESTLEIND.NS'] },
  { market: 'LSE (UK)',               tickers: ['AZN.L','SHEL.L','HSBA.L','ULVR.L','BP.L','RIO.L','GSK.L','BATS.L','REL.L','DGE.L','NG.L','BARC.L','BA.L','LLOY.L','NWG.L','PRU.L','STAN.L','IMB.L','VOD.L','LGEN.L'] },
  { market: 'Tadawul (Saudi Arabia)', tickers: ['2222.SR','1180.SR','1020.SR','2010.SR','4200.SR','2350.SR','4280.SR','1211.SR','1050.SR','2380.SR','4030.SR','2160.SR','4321.SR'] },
  { market: 'TSX (Canada)',           tickers: ['RY.TO','TD.TO','SHOP.TO','BAM.TO','CNR.TO','CP.TO','ENB.TO','TRI.TO','CNQ.TO','BMO.TO','SU.TO','BNS.TO','MFC.TO','ABX.TO'] },
  { market: 'BSE (India)',            tickers: ['HCLTECH.NS','TECHM.NS','M&M.NS','BAJAJFINSV.NS','TITAN.NS','ONGC.NS','ULTRACEMCO.NS','POWERGRID.NS','HINDALCO.NS','CIPLA.NS','DRREDDY.NS','EICHERMOT.NS','BPCL.NS','VEDL.NS'] },
  { market: 'DAX (Germany)',          tickers: ['SAP.DE','SIE.DE','ALV.DE','DTE.DE','VOW3.DE','BMW.DE','MBG.DE','BAS.DE','RWE.DE','DB1.DE','MRK.DE','HEI.DE','BAYN.DE','MTX.DE'] },
  { market: 'KRX (South Korea)',      tickers: ['005930.KS','000660.KS','207940.KS','005380.KS','068270.KS','000270.KS','012330.KS','035420.KS','051910.KS','035720.KS','096770.KS','003550.KS','030200.KS','028260.KS','017670.KS'] },
  { market: 'SIX (Switzerland)',      tickers: ['NOVN.SW','ROG.SW','NESN.SW','UBSG.SW','ABBN.SW','SREN.SW','ZURN.SW','LONN.SW','GIVN.SW','SCMN.SW'] },
  { market: 'Nasdaq Nordic',          tickers: ['NOVO-B.CO','ATCO-B.ST','VOLV-B.ST','ASSA-B.ST','DSV.CO','SAND.ST','HM-B.ST','NESTE.HE','ERIC-B.ST'] },
  { market: 'TWSE (Taiwan)',          tickers: ['2330.TW','2454.TW','2317.TW','6505.TW','2308.TW','2382.TW','2303.TW','1301.TW','2881.TW','2886.TW'] },
  { market: 'ASX (Australia)',        tickers: ['BHP.AX','CBA.AX','CSL.AX','NAB.AX','WES.AX','ANZ.AX','MQG.AX','WBC.AX','FMG.AX','GMG.AX','WOW.AX','TCL.AX','ALL.AX','QBE.AX'] },
  { market: 'JSE (South Africa)',     tickers: ['NPN.JO','CFR.JO','AGL.JO','SBK.JO','FSR.JO','MTN.JO','SOL.JO'] },
  { market: 'B3 (Brazil)',            tickers: ['VALE3.SA','PETR4.SA','ITUB4.SA','BBDC4.SA','B3SA3.SA','WEGE3.SA','ABEV3.SA','BBAS3.SA','SUZB3.SA'] },
  { market: 'BME (Spain)',            tickers: ['ITX.MC','IBE.MC','SAN.MC','BBVA.MC','TEF.MC','REP.MC','ACS.MC'] },
  { market: 'SGX (Singapore)',        tickers: ['D05.SI','U11.SI','O39.SI','Z74.SI','G13.SI','S68.SI'] },
  { market: 'Borsa Italiana',         tickers: ['ENEL.MI','ENI.MI','ISP.MI','UCG.MI','STM.MI','LDO.MI','PRY.MI'] },
  { market: 'SET (Thailand)',         tickers: ['PTT.BK','PTTEP.BK','GULF.BK','ADVANC.BK','CPALL.BK','SCB.BK','AOT.BK'] },
  { market: 'BMV (Mexico)',           tickers: ['AMXL.MX','WALMEX.MX','FEMSAUBD.MX','GMEXICOB.MX','GFNORTEO.MX','CEMEXCPO.MX'] },
  { market: 'IDX (Indonesia)',        tickers: ['BBCA.JK','BBRI.JK','TLKM.JK','ASII.JK','BMRI.JK'] },
  { market: 'Bursa Malaysia',         tickers: ['MAY.KL','PBK.KL','CIMB.KL','TENAGA.KL','PCHEM.KL'] },
  { market: 'OSL (Norway)',           tickers: ['EQNR.OL','DNB.OL','MOWI.OL','ORK.OL'] },
  { market: 'WSE (Poland)',           tickers: ['PKN.WA','PKO.WA','PZU.WA','KGH.WA','LPP.WA'] },
  { market: 'TASE (Israel)',          tickers: ['NICE','CHKP'] },
  { market: 'ASX extra',             tickers: [] },
  { market: 'ADX (Abu Dhabi)',        tickers: ['IHC.AD','FAB.AD','ETISALAT.AD'] },
  { market: 'B3 extra',              tickers: ['MELI'] },
  { market: 'KASE (Kazakhstan)',      tickers: ['KSPI'] },
  { market: 'HOSE (Vietnam)',         tickers: ['VIC.VN','VNM.VN','VCB.VN'] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));
const pad   = (n, w) => String(n).padStart(w, ' ');

async function withRetry(fn, attempt = 1) {
  try {
    return await fn();
  } catch (err) {
    const retryable = err.message?.includes('429') ||
                      err.message?.includes('Too Many') ||
                      err.message?.includes('network');
    if (retryable && attempt <= MAX_RETRIES) {
      const wait = DELAY_MS * Math.pow(2, attempt);
      process.stdout.write(` ⟳ retry ${attempt} (${(wait/1000).toFixed(0)}s)...`);
      await sleep(wait);
      return withRetry(fn, attempt + 1);
    }
    throw err;
  }
}

function loadManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')); }
  catch { return { fetched: [], errors: [], startedAt: null, lastRun: null }; }
}

function saveManifest(m) {
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(m, null, 2));
}

function bytesToKB(bytes) { return (bytes / 1024).toFixed(0) + ' KB'; }

// ─── Fetch one ticker ─────────────────────────────────────────────────────────

async function fetchTicker(ticker) {
  const end   = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - HISTORY_YEARS);

  const period1 = start.toISOString().split('T')[0];
  const period2 = end.toISOString().split('T')[0];

  const [history, summary] = await Promise.allSettled([
    withRetry(() => yf.historical(ticker, { period1, period2, interval: '1d' })),
    withRetry(() => yf.quoteSummary(ticker, {
      modules: ['financialData','defaultKeyStatistics','earningsTrend',
                'recommendationTrend','majorHoldersBreakdown',
                'incomeStatementHistory','cashflowStatementHistory','balanceSheetHistory'],
    })),
  ]);

  const histData = history.status === 'fulfilled' ? history.value.map(d => ({
    date:   d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
    open:   d.open,  high: d.high,
    low:    d.low,   close: d.close,
    volume: d.volume,
  })) : [];

  const sumData = summary.status === 'fulfilled' ? summary.value : null;

  return {
    ticker,
    fetchedAt: new Date().toISOString(),
    historyRows: histData.length,
    history:     histData,
    summary:     sumData,
    errors: {
      history: history.status === 'rejected' ? history.reason?.message : null,
      summary: summary.status === 'rejected' ? summary.reason?.message : null,
    },
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const manifest = loadManifest();
  if (!manifest.startedAt) manifest.startedAt = new Date().toISOString();
  const fetched  = new Set(manifest.fetched || []);

  let allMarkets = UNIVERSE.filter(m => m.tickers.length > 0);
  if (TARGET) {
    allMarkets = allMarkets.filter(m => m.market.toLowerCase().includes(TARGET));
    if (!allMarkets.length) { console.error(`No market matching "${TARGET}"`); process.exit(1); }
  }

  let allTickers = [...new Set(allMarkets.flatMap(m => m.tickers))];
  if (TEST_MODE) allTickers = allTickers.slice(0, 5);

  const todo = RESUME ? allTickers.filter(t => !fetched.has(t)) : allTickers;
  const estMin = Math.round(todo.length * (DELAY_MS / 1000) * 2.2 / 60);

  console.log(`
━━━ Global Stock Universe Fetch ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Tickers total  : ${allTickers.length}
  To fetch now   : ${todo.length}  (${allTickers.length - todo.length} already cached)
  Delay          : ${DELAY_MS}ms between tickers
  Est. time      : ~${estMin} minutes
  Output         : ${DATA_DIR}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);

  if (!todo.length) {
    console.log('✓ All tickers already cached. Use --no-resume to re-fetch.\n');
    return;
  }

  let done = 0, succeeded = 0, errors = 0, totalBytes = 0;

  for (const ticker of todo) {
    done++;
    const pct = ((done / todo.length) * 100).toFixed(1);
    process.stdout.write(`[${pad(done,3)}/${todo.length}] ${pad(pct,5)}%  ${ticker.padEnd(18)}`);

    try {
      const data     = await fetchTicker(ticker);
      const json     = JSON.stringify(data);
      const filePath = path.join(DATA_DIR, `${ticker.replace(/[/.]/g, '_')}.json`);
      fs.writeFileSync(filePath, json);

      totalBytes += json.length;
      succeeded++;
      fetched.add(ticker);
      process.stdout.write(` ✓  ${pad(data.historyRows,4)} days  ${bytesToKB(json.length)}\n`);
    } catch (err) {
      errors++;
      process.stdout.write(` ✗  ${err.message?.slice(0, 55)}\n`);
      if (!manifest.errors) manifest.errors = [];
      manifest.errors.push({ ticker, error: err.message, at: new Date().toISOString() });
    }

    manifest.fetched = [...fetched];
    manifest.lastRun = new Date().toISOString();
    saveManifest(manifest);

    if (done < todo.length) await sleep(DELAY_MS);
  }

  console.log(`
━━━ Done ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✓ Succeeded : ${succeeded}
  ✗ Errors    : ${errors}
  Total data  : ${(totalBytes / 1024 / 1024).toFixed(1)} MB written
  Manifest    : ${MANIFEST_PATH}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
