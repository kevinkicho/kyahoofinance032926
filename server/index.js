import { config as dotenvConfig } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
dotenvConfig({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env') });
import express from 'express';
import cors from 'cors';
import NodeCache from 'node-cache';
import YahooFinance from 'yahoo-finance2';
import https from 'https';
import fs from 'fs';

const __dirname  = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.join(__dirname, '..', 'data', 'stocks');
const PRICES_DIR = path.join(__dirname, '..', 'prices');
const CACHE_DIR  = path.join(__dirname, 'datacache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

// ── Daily file-cache helpers ─────────────────────────────────────────────────
// Each market gets one JSON file per day: datacache/{market}-YYYY-MM-DD.json
// This survives server restarts and eliminates repeat calls to Yahoo/FRED
// within the same calendar day.

function todayStr() { return new Date().toISOString().split('T')[0]; }

function readDailyCache(market) {
  try {
    const fp = path.join(CACHE_DIR, `${market}-${todayStr()}.json`);
    if (fs.existsSync(fp)) return JSON.parse(fs.readFileSync(fp, 'utf8'));
  } catch { /* skip */ }
  return null;
}

function writeDailyCache(market, data) {
  try {
    fs.writeFileSync(path.join(CACHE_DIR, `${market}-${todayStr()}.json`), JSON.stringify(data), 'utf8');
  } catch (e) { console.warn(`[datacache] write failed for ${market}:`, e.message); }
}

function readLatestCache(market) {
  try {
    const files = fs.readdirSync(CACHE_DIR)
      .filter(f => f.startsWith(`${market}-`) && f.endsWith('.json'))
      .sort().reverse();
    if (!files.length) return null;
    const fetchedOn = files[0].slice(market.length + 1, -5); // strip "{market}-" and ".json"
    return { data: JSON.parse(fs.readFileSync(path.join(CACHE_DIR, files[0]), 'utf8')), fetchedOn };
  } catch { return null; }
}

// Delete cache files older than 7 days on startup
(function cleanOldCaches() {
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    fs.readdirSync(CACHE_DIR).forEach(f => {
      const m = f.match(/-(\d{4}-\d{2}-\d{2})\.json$/);
      if (m && m[1] < cutoffStr) fs.unlinkSync(path.join(CACHE_DIR, f));
    });
  } catch { /* best-effort */ }
})();

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

// Crypto tickers — Yahoo Finance requires the -USD suffix for quotes
const CRYPTO_TICKERS = new Set([
  'BTC','ETH','XRP','BNB','SOL','DOGE','ADA','TRX','AVAX','LINK','DOT','LTC','UNI','POL','ATOM',
]);
const cryptoYahoo  = (t) => CRYPTO_TICKERS.has(t) ? `${t}-USD` : t;
const cryptoStrip  = (sym) => sym.endsWith('-USD') ? sym.slice(0, -4) : sym;

// Exchange suffix map: stockUniverse region name → Yahoo exchange suffix
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
  'Nasdaq Nordic':           'ST',   // try ST, then HE, CO
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
  'Tadawul (UAE/Gulf)':      'AE',
};

// Nordic has mixed suffixes — try all three for fallback
const NORDIC_SUFFIXES = ['ST', 'HE', 'CO'];

// Build candidate file paths for a ticker + region
function resolveCandidates(ticker, region) {
  const suffix = REGION_SUFFIX[region];
  const candidates = [];

  const tryBoth = (sfx) => {
    // data/stocks uses underscore: 7203_T.json
    candidates.push({ dir: DATA_DIR,   name: `${ticker}_${sfx}.json`, format: 'ohlcv' });
    // prices uses dot: 7203.T.json
    candidates.push({ dir: PRICES_DIR, name: `${ticker}.${sfx}.json`, format: 'compact' });
  };

  if (suffix) {
    tryBoth(suffix);
    if (region === 'Nasdaq Nordic') NORDIC_SUFFIXES.filter(s => s !== suffix).forEach(tryBoth);
  }
  // Bare ticker fallback (US stocks, or tickers already containing the exchange)
  candidates.push({ dir: DATA_DIR,   name: `${ticker}.json`, format: 'ohlcv' });
  candidates.push({ dir: PRICES_DIR, name: `${ticker}.json`, format: 'compact' });

  return candidates;
}

// Read first existing candidate file; return { data, format }
function readBestFile(ticker, region) {
  for (const c of resolveCandidates(ticker, region)) {
    const fullPath = path.join(c.dir, c.name);
    if (fs.existsSync(fullPath)) {
      try {
        return { data: JSON.parse(fs.readFileSync(fullPath, 'utf8')), format: c.format };
      } catch { /* try next */ }
    }
  }
  return null;
}

// Convert prices/ compact parallel-array format → [{date,open,high,low,close,volume}]
function adaptCompact(compact, cutoffDate) {
  const result = [];
  for (let i = 0; i < (compact.t?.length || 0); i++) {
    const date = new Date(compact.t[i] * 1000).toISOString().split('T')[0];
    if (cutoffDate && date < cutoffDate) continue;
    result.push({
      date,
      open:   compact.o?.[i],
      high:   compact.h?.[i],
      low:    compact.l?.[i],
      close:  compact.c?.[i],
      volume: compact.v?.[i],
    });
  }
  return result;
}

function periodCutoff(period) {
  const d = new Date();
  if (period === '5y') d.setFullYear(d.getFullYear() - 5);
  else if (period === '3y') d.setFullYear(d.getFullYear() - 3);
  else if (period === '3m') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

// ── Snapshot index (lazy-built for time travel) ──────────────────────────────
// Structure: { AAPL: [{date,close}, ...], ... } — all 351 curated tickers
let snapshotIndex = null;
let snapshotBuilding = false;

async function buildSnapshotIndex() {
  if (snapshotIndex || snapshotBuilding) return;
  snapshotBuilding = true;
  console.log('Building snapshot index from data/stocks/ …');
  const index = {};
  if (!fs.existsSync(DATA_DIR)) { snapshotBuilding = false; return; }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
      const ticker = raw.ticker || file.replace('.json', '');
      if (raw.history?.length) {
        index[ticker] = raw.history.map(d => ({ date: d.date, close: d.close }));
      }
    } catch { /* skip bad files */ }
  }
  snapshotIndex = index;
  snapshotBuilding = false;
  console.log(`Snapshot index ready: ${Object.keys(index).length} tickers`);
}

const app = express();
const port = 3001;
const cache = new NodeCache({ stdTTL: 900 }); // 15 min default

app.use(cors());
app.use(express.json());

// --- Helper: read data/stocks/ ohlcv-format file by bare ticker ---
function readLocalData(ticker) {
  const p = path.join(DATA_DIR, `${ticker}.json`);
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { /* ignore */ }
  return null;
}

// --- Helper: fetch a URL as JSON ---
function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), dataDir: DATA_DIR });
});

// Cache status — shows which markets have today's data vs are serving stale files
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto','credit','sentiment','calendar'];
app.get('/api/cache/status', (_req, res) => {
  const today = todayStr();
  const status = {};
  for (const market of CACHEABLE_MARKETS) {
    const latest = readLatestCache(market);
    status[market] = latest
      ? { fetchedOn: latest.fetchedOn, isCurrent: latest.fetchedOn === today }
      : { fetchedOn: null, isCurrent: false };
  }
  res.json({ today, status });
});

// --- Yahoo Finance Stock Proxy (live quotes for price/change) ---
app.post('/api/stocks', async (req, res) => {
  const { tickers } = req.body;
  if (!tickers || !Array.isArray(tickers)) return res.status(400).json({ error: 'Tickers array required' });

  try {
    const cachedData = {};
    const missingTickers = [];
    tickers.forEach(t => {
      const val = cache.get(t);
      if (val) cachedData[t] = val;
      else missingTickers.push(t);
    });

    if (missingTickers.length > 0) {
      // Remap crypto tickers to their Yahoo -USD format (BTC → BTC-USD)
      const yahooTickers = missingTickers.map(cryptoYahoo);
      const chunks = chunkArray(yahooTickers, 100);
      for (const chunk of chunks) {
        try {
          const results = await yf.quote(chunk);
          const arr = Array.isArray(results) ? results : [results];
          arr.forEach(quote => {
            if (!quote) return;
            const originalTicker = cryptoStrip(quote.symbol); // BTC-USD → BTC
            const normalized = {
              ticker: originalTicker,
              name: quote.longName || quote.shortName,
              currency: quote.currency,
              price: quote.regularMarketPrice,
              change: quote.regularMarketChange,
              changePct: quote.regularMarketChangePercent,
              open: quote.regularMarketOpen,
              prevClose: quote.regularMarketPreviousClose,
              dayHigh: quote.regularMarketDayHigh,
              dayLow: quote.regularMarketDayLow,
              bid: quote.bid,
              bidSize: quote.bidSize,
              ask: quote.ask,
              askSize: quote.askSize,
              volume: quote.regularMarketVolume,
              avgVolume: quote.averageDailyVolume3Month,
              marketCap: quote.marketCap,
              weekHigh52: quote.fiftyTwoWeekHigh,
              weekLow52: quote.fiftyTwoWeekLow,
              pe: quote.trailingPE,
              eps: quote.epsTrailingTwelveMonths,
              forwardPE: quote.forwardPE,
              beta: quote.beta,
              dividendYield: quote.dividendYield,
            };
            cache.set(originalTicker, normalized);
            cachedData[originalTicker] = normalized;
          });
        } catch (chunkError) {
          console.error(`Error fetching chunk:`, chunkError.message);
        }
      }
    }
    res.json(cachedData);
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- FRED Macro Indicators ---
const FRED_API_KEY = process.env.FRED_API_KEY || '';

const FRED_SERIES = {
  M1:    'M1SL',
  M2:    'M2SL',
  CPI:   'CPIAUCSL',
  FFR:   'FEDFUNDS',
  UNEMP: 'UNRATE',
  GDP:   'GDP',
  // Credit / bond spread series (ICE BofA OAS)
  IG_OAS:     'BAMLC0A0CM',        // Investment Grade OAS (bps)
  HY_OAS:     'BAMLH0A0HYM2',     // High Yield OAS (bps)
  BAA_SPREAD: 'BAA10Y',            // Baa – 10yr Treasury spread (%)
};

app.get('/api/macro', async (req, res) => {
  const cacheKey = 'fred_macro';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  if (!FRED_API_KEY) {
    console.warn('FRED_API_KEY not set — macro endpoint returning empty');
    return res.json({});
  }

  try {
    const results = {};

    await Promise.allSettled(
      Object.entries(FRED_SERIES).map(async ([key, seriesId]) => {
        try {
          // FRED API: returns { observations: [{date, value}] }
          const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=12`;
          const data = await fetchJSON(url);
          if (data?.observations) {
            const valid = data.observations.filter(d => d.value !== '.');
            results[key] = {
              seriesId,
              latest: parseFloat(valid[0]?.value),
              prev:   parseFloat(valid[1]?.value),
              date:   valid[0]?.date,
            };
          }
        } catch (e) {
          console.warn(`FRED fetch failed for ${seriesId}:`, e.message);
        }
      })
    );

    cache.set(cacheKey, results, 3600);
    res.json(results);
  } catch (error) {
    console.error('FRED API Error:', error);
    res.status(500).json({ error: 'Failed to fetch macro data' });
  }
});

// --- Bonds Market Data ---
const TENOR_SERIES = {
  '3m': 'DGS3MO', '6m': 'DGS6MO', '1y': 'DGS1', '2y': 'DGS2',
  '5y': 'DGS5',  '7y': 'DGS7',  '10y': 'DGS10', '20y': 'DGS20', '30y': 'DGS30',
};
const INTL_10Y = {
  DE: 'IRLTLT01DEM156N', JP: 'IRLTLT01JPM156N', GB: 'IRLTLT01GBM156N',
  IT: 'IRLTLT01ITM156N', FR: 'IRLTLT01FRM156N', AU: 'IRLTLT01AUM156N',
};
const SPREAD_SERIES = {
  IG:  'BAMLC0A0CM',
  HY:  'BAMLH0A0HYM2',
  EM:  'BAMLEMCBPIOAS',
  BBB: 'BAMLC0A4CBBB',
};

async function fetchFredLatest(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

async function fetchFredHistory(seriesId, limit = 13) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

function dateToMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');
}

app.get('/api/bonds', async (req, res) => {
  const cacheKey = 'bonds_data';
  const today = todayStr();

  // 1. Daily disk cache (survives server restarts, refreshes once per day)
  const daily = readDailyCache('bonds');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  // 2. In-memory cache (fast repeat requests within same day)
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  if (!FRED_API_KEY) return res.status(503).json({ error: 'FRED_API_KEY not configured' });

  try {
    // 1. US yield curve — all 9 tenors
    const usEntries = await Promise.allSettled(
      Object.entries(TENOR_SERIES).map(async ([tenor, sid]) => [tenor, await fetchFredLatest(sid)])
    );
    const usYields = {};
    usEntries.forEach(r => { if (r.status === 'fulfilled' && r.value[1] != null) usYields[r.value[0]] = r.value[1]; });

    // Map to display tenors (drop 7y, keep 3m 6m 1y 2y 5y 10y 30y)
    const yieldCurveData = {
      US: {
        '3m': usYields['3m'] ?? null, '6m': usYields['6m'] ?? null,
        '1y': usYields['1y'] ?? null, '2y': usYields['2y'] ?? null,
        '5y': usYields['5y'] ?? null, '10y': usYields['10y'] ?? null,
        '30y': usYields['30y'] ?? null,
      },
    };

    // 2. International 10yr anchors → scale whole mock curve
    const intlEntries = await Promise.allSettled(
      Object.entries(INTL_10Y).map(async ([cc, sid]) => [cc, await fetchFredLatest(sid)])
    );
    intlEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) {
        yieldCurveData[r.value[0]] = { '10y': r.value[1] };
      }
    });

    // 3. Credit spread history — last 12 months
    const spreadEntries = await Promise.allSettled(
      Object.entries(SPREAD_SERIES).map(async ([key, sid]) => [key, await fetchFredHistory(sid, 13)])
    );
    const spreadRaw = {};
    spreadEntries.forEach(r => { if (r.status === 'fulfilled') spreadRaw[r.value[0]] = r.value[1]; });

    // Align dates across series (use IG as anchor, last 12 points)
    const igArr  = (spreadRaw.IG  || []).slice(-12);
    const hyArr  = (spreadRaw.HY  || []).slice(-12);
    const emArr  = (spreadRaw.EM  || []).slice(-12);
    const bbbArr = (spreadRaw.BBB || []).slice(-12);
    const anchorArr = igArr.length === 12 ? igArr : (hyArr.length === 12 ? hyArr : []);
    const spreadData = anchorArr.length === 12 ? {
      dates: anchorArr.map(p => dateToMonthLabel(p.date)),
      IG:    igArr.length  === 12 ? igArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      HY:    hyArr.length  === 12 ? hyArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      EM:    emArr.length  === 12 ? emArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
      BBB:   bbbArr.length === 12 ? bbbArr.map(p => Math.round(p.value))  : anchorArr.map(() => null),
    } : null;

    // 4. Spread indicators — T10Y2Y, T10Y3M, breakeven inflation, TIPS real yield
    const SPREAD_INDICATOR_SERIES = {
      t10y2y: 'T10Y2Y',
      t10y3m: 'T10Y3M',
      t5yie:  'T5YIE',
      t10yie: 'T10YIE',
      dfii10: 'DFII10',
    };
    const indicatorEntries = await Promise.allSettled(
      Object.entries(SPREAD_INDICATOR_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid)])
    );
    const spreadIndicators = {};
    indicatorEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) spreadIndicators[r.value[0]] = r.value[1];
    });

    // 5b. TIPS breakevens + real yields (history + latest)
    let breakevensData = null;
    if (FRED_API_KEY) {
      try {
        const [be5yHist, be10yHist, fwd5y5yHist, real5y, real10y] = await Promise.all([
          fetchFredHistory('T5YIE', 130),
          fetchFredHistory('T10YIE', 130),
          fetchFredHistory('T5YIFR', 130),
          fetchFredLatest('DFII5'),
          fetchFredLatest('DFII10'),
        ]);

        // Align dates across the 3 history series (use be5y as anchor)
        if (be5yHist?.length >= 20) {
          const dates = be5yHist.map(p => p.date);
          const be5yVals = be5yHist.map(p => p.value);

          // Map be10y and fwd5y5y to the same date array
          const be10yMap = {};
          (be10yHist || []).forEach(p => { be10yMap[p.date] = p.value; });
          const fwdMap = {};
          (fwd5y5yHist || []).forEach(p => { fwdMap[p.date] = p.value; });

          const be10yVals = dates.map(d => be10yMap[d] ?? null);
          const fwd5y5yVals = dates.map(d => fwdMap[d] ?? null);

          breakevensData = {
            current: {
              be5y:       be5yVals[be5yVals.length - 1],
              be10y:      be10yVals[be10yVals.length - 1],
              forward5y5y: fwd5y5yVals[fwd5y5yVals.length - 1],
              real5y:     real5y,
              real10y:    real10y,
            },
            history: {
              dates:       dates.map(d => dateToMonthLabel(d)),
              be5y:        be5yVals,
              be10y:       be10yVals,
              forward5y5y: fwd5y5yVals,
            },
          };
        }
      } catch { /* use null — client falls back to mock */ }
    }

    // 5. Treasury avg interest rates (fiscaldata.treasury.gov — no auth needed)
    let treasuryRates = null;
    try {
      const tUrl = 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates' +
        '?filter=security_type_desc:eq:Marketable' +
        '&fields=record_date,security_desc,avg_interest_rate_amt' +
        '&sort=-record_date&page%5Bsize%5D=20';
      const tData = await fetchJSON(tUrl);
      const records = tData?.data || [];
      if (records.length > 0) {
        const latestDate = records[0].record_date;
        const latest = records.filter(r => r.record_date === latestDate);
        const bills = latest.find(r => r.security_desc === 'Treasury Bills');
        const notes = latest.find(r => r.security_desc === 'Treasury Notes');
        const bonds = latest.find(r => r.security_desc === 'Treasury Bonds');
        if (bills || notes || bonds) {
          treasuryRates = {
            '0\u20132y':  bills ? parseFloat(bills.avg_interest_rate_amt) : null,
            '2\u20135y':  notes ? parseFloat(notes.avg_interest_rate_amt) : null,
            '5\u201310y': notes ? parseFloat(notes.avg_interest_rate_amt) : null,
            '10y+':       bonds ? parseFloat(bonds.avg_interest_rate_amt) : null,
          };
        }
      }
    } catch { /* use null */ }

    const result = {
      yieldCurveData,
      spreadData,
      spreadIndicators: Object.keys(spreadIndicators).length >= 3 ? spreadIndicators : null,
      treasuryRates,
      breakevensData,
      lastUpdated: today,
    };

    writeDailyCache('bonds', result);        // persist to disk
    cache.set(cacheKey, result, 900);        // keep in memory too
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Bonds API error:', error);
    // Fallback: serve most recent available cache (any day)
    const fallback = readLatestCache('bonds');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Derivatives Market Data ---
const VIX_TICKERS = ['^VIX9D', '^VIX', '^VIX3M', '^VIX6M'];
const VIX_LABELS  = ['9D', '1M', '3M', '6M'];

function vixScore(vix) {
  return Math.max(0, Math.min(100, Math.round(100 - (vix - 10) * 2.5)));
}
function pcrScore(pcr) {
  return Math.max(0, Math.min(100, Math.round(100 - (pcr - 0.5) * 60)));
}
function momentumScore(pctAboveSma) {
  return Math.max(0, Math.min(100, Math.round(50 + pctAboveSma * 4)));
}
function safeHavenScore(tltRelPerf) {
  return Math.max(0, Math.min(100, Math.round(50 - tltRelPerf * 3)));
}
function junkBondScore(hyOas) {
  return Math.max(0, Math.min(100, Math.round(100 - (hyOas - 200) / 5)));
}
function scoreLabel(s) {
  if (s <= 25) return 'Extreme Fear';
  if (s <= 45) return 'Fear';
  if (s <= 55) return 'Neutral';
  if (s <= 75) return 'Greed';
  return 'Extreme Greed';
}

async function buildVolSurface(spyPrice) {
  const targetDays  = [7, 14, 30, 60, 90, 180, 365, 730];
  const expLabels   = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y', '2Y'];
  const strikePcts  = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];
  const strikes     = [80, 85, 90, 95, 100, 105, 110, 115, 120];

  let expirations;
  try {
    const idx = await yf.options('SPY');
    expirations = idx.expirationDates || [];
  } catch { return null; }

  const now = Math.floor(Date.now() / 1000);
  const grid = [];

  for (const days of targetDays) {
    const target = now + days * 86400;
    const nearest = expirations.reduce((best, d) =>
      Math.abs(d - target) < Math.abs(best - target) ? d : best, expirations[0]);
    try {
      const opts = await yf.options('SPY', { date: nearest });
      const calls = opts.options[0]?.calls || [];
      const row = strikePcts.map(pct => {
        const ts = Math.round(spyPrice * pct);
        const c  = calls.reduce((b, x) => Math.abs(x.strike - ts) < Math.abs((b?.strike ?? Infinity) - ts) ? x : b, null);
        return c?.impliedVolatility ? Math.round(c.impliedVolatility * 1000) / 10 : null;
      });
      grid.push(row);
    } catch {
      grid.push(new Array(9).fill(null));
    }
  }

  // If too many nulls, return null (use mock)
  const total = grid.flat().filter(v => v != null).length;
  if (total < 20) return null;

  return { strikes, expiries: expLabels, grid };
}

app.get('/api/derivatives', async (req, res) => {
  const cacheKey = 'derivatives_data';
  const today = todayStr();

  // 1. Daily disk cache (survives server restarts, refreshes once per day)
  const daily = readDailyCache('derivatives');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  // 2. In-memory cache (fast repeat requests within same day)
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    // 1. VIX term structure
    const vixQuotes = await yf.quote(VIX_TICKERS).catch(() => []);
    const vixArr = Array.isArray(vixQuotes) ? vixQuotes : [vixQuotes];
    const vixTermStructure = VIX_LABELS.length === vixArr.length && vixArr.every(q => q?.regularMarketPrice) ? {
      dates:      VIX_LABELS,
      values:     vixArr.map(q => Math.round(q.regularMarketPrice * 10) / 10),
      prevValues: vixArr.map(q => Math.round((q.regularMarketPreviousClose ?? q.regularMarketPrice) * 10) / 10),
    } : null;

    // 1b. VVIX + VIX 252-day percentile
    let vixEnrichment = null;
    try {
      const [vvixQuote, vixHistory] = await Promise.all([
        yf.quote('^VVIX').catch(() => null),
        yf.historical('^VIX', {
          period1: (() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toISOString().split('T')[0]; })(),
          period2: new Date().toISOString().split('T')[0],
          interval: '1d',
        }).catch(() => []),
      ]);

      const vvix = vvixQuote?.regularMarketPrice ?? null;
      const vixCloses = (vixHistory || []).map(d => d.close).filter(Boolean);
      const currentVix = vixArr.find(q => q?.symbol === '^VIX')?.regularMarketPrice ?? null;

      let vixPercentile = null;
      if (currentVix != null && vixCloses.length >= 20) {
        const below = vixCloses.filter(v => v <= currentVix).length;
        vixPercentile = Math.round((below / vixCloses.length) * 100);
      }

      if (vvix != null || vixPercentile != null) {
        vixEnrichment = { vvix, vixPercentile };
      }
    } catch { /* use null */ }

    // 2. Options flow — top rows by volume from SPY + QQQ nearest expiry
    let optionsFlow = null;
    try {
      const [spyOpts, qqqOpts] = await Promise.all([yf.options('SPY'), yf.options('QQQ')]);

      const rows = [];
      for (const [sym, opts] of [['SPY', spyOpts], ['QQQ', qqqOpts]]) {
        const exp = opts.options[0];
        if (!exp) continue;
        const expLabel = new Date(opts.expirationDates[0] * 1000)
          .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
        for (const [type, arr] of [['C', exp.calls], ['P', exp.puts]]) {
          (arr || [])
            .filter(o => o.volume > 0 && o.openInterest > 0)
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 3)
            .forEach(o => rows.push({
              ticker: sym, strike: o.strike, expiry: expLabel, type,
              volume: o.volume, openInterest: o.openInterest,
              premium: Math.round((o.lastPrice ?? o.ask ?? 0) * 100) / 100,
              sentiment: type === 'C' ? 'bullish' : 'bearish',
            }));
        }
      }
      if (rows.length >= 4) {
        optionsFlow = rows.sort((a, b) => b.volume - a.volume).slice(0, 12);
      }
    } catch { /* use mock */ }

    // 4. Vol surface from SPY options
    let volSurfaceData = null;
    try {
      const spyQuote = await yf.quote('SPY');
      if (!spyQuote?.regularMarketPrice) throw new Error('SPY price unavailable');
      volSurfaceData = await buildVolSurface(spyQuote.regularMarketPrice);
    } catch { /* use mock */ }

    // 6. Vol premium: ATM 1M IV vs 30d realized volatility
    let volPremium = null;
    try {
      const atm1mIV = volSurfaceData?.grid?.[2]?.[4] ?? null;
      const spyHistVol = atm1mIV != null ? await yf.historical('^GSPC', {
        period1: (() => { const d = new Date(); d.setDate(d.getDate() - 45); return d.toISOString().split('T')[0]; })(),
        period2: new Date().toISOString().split('T')[0],
        interval: '1d',
      }).catch(() => []) : [];
      const spyClosesCache = spyHistVol.map(d => d.close).filter(Boolean);
      if (atm1mIV != null && spyClosesCache.length >= 31) {
        const recentCloses = spyClosesCache.slice(-31);
        const logReturns = recentCloses.slice(1).map((c, i) => Math.log(c / recentCloses[i]));
        const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
        const variance = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (logReturns.length - 1);
        const realizedVol30d = Math.round(Math.sqrt(variance * 252) * 100 * 10) / 10;
        const premium = Math.round((atm1mIV - realizedVol30d) * 10) / 10;
        volPremium = { atm1mIV, realizedVol30d, premium };
      }
    } catch { /* use null */ }

    const result = {
      vixTermStructure,
      optionsFlow,
      volSurfaceData,
      vixEnrichment,
      volPremium,
      lastUpdated: today,
    };

    writeDailyCache('derivatives', result);  // persist to disk
    cache.set(cacheKey, result, 900);        // keep in memory too
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Derivatives API error:', error);
    // Fallback: serve most recent available cache (any day)
    const fallback = readLatestCache('derivatives');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Real Estate Market Data ---
const REIT_TICKERS = ['PLD', 'AMT', 'EQIX', 'SPG', 'WELL', 'AVB', 'BXP', 'PSA', 'O', 'VICI'];
const REIT_META = {
  PLD:  { name: 'Prologis',          sector: 'Industrial',   pFFO: 18.4 },
  AMT:  { name: 'American Tower',    sector: 'Cell Towers',  pFFO: 22.1 },
  EQIX: { name: 'Equinix',           sector: 'Data Centers', pFFO: 28.5 },
  SPG:  { name: 'Simon Property',    sector: 'Retail',       pFFO: 12.8 },
  WELL: { name: 'Welltower',         sector: 'Healthcare',   pFFO: 24.2 },
  AVB:  { name: 'AvalonBay',         sector: 'Residential',  pFFO: 19.6 },
  BXP:  { name: 'Boston Properties', sector: 'Office',       pFFO:  9.4 },
  PSA:  { name: 'Public Storage',    sector: 'Self-Storage', pFFO: 16.2 },
  O:    { name: 'Realty Income',     sector: 'Net Lease',    pFFO: 13.5 },
  VICI: { name: 'VICI Properties',   sector: 'Gaming',       pFFO: 14.0 },
};

const BIS_SERIES = {
  US: 'QUSR628BIS', UK: 'QGBR628BIS', DE: 'QDEU628BIS',
  AU: 'QAUS628BIS', CA: 'QCAN628BIS', JP: 'QJPN628BIS',
};

function bisQuarterLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const q = Math.ceil((d.getUTCMonth() + 1) / 3);
  return `Q${q} ${String(d.getUTCFullYear()).slice(2)}`;
}

app.get('/api/realEstate', async (req, res) => {
  const cacheKey = 'realestate_data';
  const today = todayStr();

  // 1. Daily disk cache (survives server restarts, refreshes once per day)
  const daily = readDailyCache('realEstate');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  // 2. In-memory cache (fast repeat requests within same day)
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    // 1. REIT live quotes
    let reitData = null;
    try {
      const quotes = await yf.quote(REIT_TICKERS);
      const arr = Array.isArray(quotes) ? quotes : [quotes];
      reitData = arr
        .filter(q => q?.regularMarketPrice)
        .map(q => {
          const meta = REIT_META[q.symbol] || {};
          const ytdReturn = q.ytdReturn != null
            ? Math.round(q.ytdReturn * 1000) / 10
            : (q.regularMarketChangePercent ? Math.round(q.regularMarketChangePercent * 10) / 10 : 0);
          return {
            ticker:        q.symbol,
            name:          meta.name  || q.shortName || q.symbol,
            sector:        meta.sector || 'REIT',
            dividendYield: q.dividendYield != null ? Math.round(q.dividendYield * 1000) / 10 : null,
            pFFO:          meta.pFFO,
            ytdReturn,
            marketCap:     q.marketCap ? Math.round(q.marketCap / 1e9) : null,
            price:         Math.round(q.regularMarketPrice * 100) / 100,
            changePct:     Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
          };
        });
      if (!reitData.length) reitData = null;
    } catch { /* use mock */ }

    // 2. House price indices from FRED BIS series
    let priceIndexData = null;
    if (FRED_API_KEY) {
      try {
        const bisEntries = await Promise.allSettled(
          Object.entries(BIS_SERIES).map(async ([cc, sid]) => {
            const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${sid}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2020-01-01`;
            const data = await fetchJSON(url);
            const obs = (data?.observations || []).filter(o => o.value !== '.');
            if (!obs.length) return [cc, null];
            // Rebase to Q1 2020 = 100
            const base = parseFloat(obs[0].value);
            if (!base || isNaN(base)) return [cc, null];
            const dated = obs.map(o => ({
              label: bisQuarterLabel(o.date),
              value: Math.round((parseFloat(o.value) / base) * 100 * 10) / 10,
            }));
            return [cc, dated];
          })
        );

        const collected = {};
        bisEntries.forEach(r => {
          if (r.status === 'fulfilled' && r.value[1]) collected[r.value[0]] = r.value[1];
        });

        if (Object.keys(collected).length >= 2) {
          priceIndexData = {};
          for (const [cc, pts] of Object.entries(collected)) {
            priceIndexData[cc] = {
              dates:  pts.map(p => p.label),
              values: pts.map(p => p.value),
            };
          }
        }
      } catch { /* use mock */ }
    }

    // 3. Mortgage rates from FRED
    let mortgageRates = null;
    if (FRED_API_KEY) {
      try {
        const [rate30, rate15] = await Promise.all([
          fetchFredHistory('MORTGAGE30US', 2),
          fetchFredHistory('MORTGAGE15US', 2),
        ]);
        const latest30 = rate30[rate30.length - 1];
        const latest15 = rate15[rate15.length - 1];
        if (latest30 && latest15) {
          mortgageRates = {
            rate30y: Math.round(latest30.value * 100) / 100,
            rate15y: Math.round(latest15.value * 100) / 100,
            asOf: latest30.date,
          };
        }
      } catch { /* use null */ }
    }

    // 4. Affordability metrics from FRED
    let affordabilityData = null;
    if (FRED_API_KEY) {
      try {
        const [mspusHist, incomeResult] = await Promise.all([
          fetchFredHistory('MSPUS', 20),       // median home sales price, ~5yr quarterly
          fetchFredLatest('MEHOINUSA672N'),     // median household income, annual
        ]);
        const medianIncome = incomeResult ?? 75000; // fallback
        if (mspusHist.length >= 2) {
          const latest = mspusHist.at(-1);
          const medianPrice = latest.value;
          const priceToIncome = Math.round(medianPrice / medianIncome * 10) / 10;

          // Monthly mortgage payment (80% LTV, 30yr)
          const rate30 = mortgageRates?.rate30y ?? 7.0;
          const monthlyRate = rate30 / 100 / 12;
          const principal = medianPrice * 0.8;
          const monthlyPayment = monthlyRate > 0
            ? principal * (monthlyRate * Math.pow(1 + monthlyRate, 360)) / (Math.pow(1 + monthlyRate, 360) - 1)
            : principal / 360;
          const mortgageToIncome = Math.round(monthlyPayment * 12 / medianIncome * 1000) / 10;

          // YoY change from quarterly data
          const prevYear = mspusHist.find(p => {
            const d1 = new Date(p.date);
            const d2 = new Date(latest.date);
            return Math.abs((d2 - d1) / (1000 * 60 * 60 * 24) - 365) < 60;
          });
          const yoyChange = prevYear ? Math.round((medianPrice / prevYear.value - 1) * 1000) / 10 : null;

          const history = mspusHist.map(p => ({
            date: p.date,
            medianPrice: Math.round(p.value),
            priceToIncome: Math.round(p.value / medianIncome * 10) / 10,
          }));

          affordabilityData = {
            current: { medianPrice: Math.round(medianPrice), medianIncome: Math.round(medianIncome), priceToIncome, mortgageToIncome, rate30y: rate30, yoyChange },
            history,
          };
        }
      } catch { /* use null */ }
    }

    // 5. Cap rates from REIT dividend yields (proxy)
    let capRateData = null;
    if (reitData?.length) {
      const sectorYields = {};
      reitData.forEach(r => {
        if (r.dividendYield != null && r.sector) {
          if (!sectorYields[r.sector]) sectorYields[r.sector] = [];
          sectorYields[r.sector].push(r.dividendYield);
        }
      });
      const sectors = Object.entries(sectorYields).map(([sector, yields]) => ({
        sector,
        impliedYield: Math.round(yields.reduce((a, b) => a + b, 0) / yields.length * 10) / 10,
      })).sort((a, b) => b.impliedYield - a.impliedYield);
      if (sectors.length >= 3) capRateData = sectors;
    }

    // 6. Case-Shiller metro price indices
    let caseShillerData = null;
    if (FRED_API_KEY) {
      try {
        const csMetros = {
          national:       'CSUSHPISA',
          'San Francisco':'SFXRSA',
          'New York':     'NYXRSA',
          'Los Angeles':  'LXXRSA',
          'Miami':        'MIXRSA',
          'Chicago':      'CHXRSA',
        };
        const csResults = await Promise.allSettled(
          Object.entries(csMetros).map(async ([name, sid]) => {
            const hist = await fetchFredHistory(sid, 60);
            return [name, hist];
          })
        );
        const natHist = csResults[0]?.status === 'fulfilled' ? csResults[0].value[1] : [];
        const metros = {};
        csResults.slice(1).forEach(r => {
          if (r.status === 'fulfilled' && r.value[1].length >= 2) {
            const pts = r.value[1];
            const latest = pts[pts.length - 1].value;
            const yr = pts.length >= 13 ? pts[pts.length - 13].value : pts[0].value;
            metros[r.value[0]] = {
              latest: Math.round(latest * 10) / 10,
              yoy: Math.round((latest / yr - 1) * 1000) / 10,
            };
          }
        });
        if (natHist.length >= 12) {
          caseShillerData = {
            national: {
              dates: natHist.map(p => p.date.slice(0, 7)),
              values: natHist.map(p => Math.round(p.value * 10) / 10),
            },
            metros,
          };
        }
      } catch { /* use null */ }
    }

    // 7. Housing supply indicators
    let supplyData = null;
    if (FRED_API_KEY) {
      try {
        const [startsHist, permitsHist, monthsSupplyVal, listingsVal] = await Promise.all([
          fetchFredHistory('HOUST', 36).catch(() => []),
          fetchFredHistory('PERMIT', 36).catch(() => []),
          fetchFredLatest('MSACSR').catch(() => null),
          fetchFredLatest('ACTLISCOUUS').catch(() => null),
        ]);
        if (startsHist.length >= 6 || permitsHist.length >= 6) {
          supplyData = {
            housingStarts: { dates: startsHist.map(p => p.date.slice(0, 7)), values: startsHist.map(p => Math.round(p.value)) },
            permits:       { dates: permitsHist.map(p => p.date.slice(0, 7)), values: permitsHist.map(p => Math.round(p.value)) },
            monthsSupply:  monthsSupplyVal != null ? Math.round(monthsSupplyVal * 10) / 10 : null,
            activeListings: listingsVal != null ? Math.round(listingsVal) : null,
          };
        }
      } catch { /* use null */ }
    }

    // 8. Homeownership rate + Rent CPI
    let homeownershipRate = null;
    let rentCpi = null;
    if (FRED_API_KEY) {
      try {
        const [hoRate, rentHist] = await Promise.all([
          fetchFredLatest('RHORUSQ156N').catch(() => null),
          fetchFredHistory('CUSR0000SEHA', 36).catch(() => []),
        ]);
        homeownershipRate = hoRate != null ? Math.round(hoRate * 10) / 10 : null;
        if (rentHist.length >= 6) {
          rentCpi = {
            dates: rentHist.map(p => p.date.slice(0, 7)),
            values: rentHist.map(p => Math.round(p.value * 10) / 10),
          };
        }
      } catch { /* use null */ }
    }

    // 9. REIT ETF (VNQ) price + 1yr history
    let reitEtf = null;
    try {
      const vnqQuote = await yf.quote(['VNQ']);
      const vnqArr = Array.isArray(vnqQuote) ? vnqQuote : [vnqQuote];
      const vq = vnqArr.find(q => q?.symbol === 'VNQ');
      if (vq?.regularMarketPrice) {
        const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
        const histEnd = new Date().toISOString().split('T')[0];
        let vnqHistory = null;
        try {
          const chart = await yf.chart('VNQ', { period1: histStart, period2: histEnd, interval: '1d' });
          const quotes = (chart.quotes || []).filter(q => q.close != null);
          if (quotes.length >= 20) {
            vnqHistory = {
              dates: quotes.map(q => q.date.toISOString().split('T')[0]),
              closes: quotes.map(q => Math.round(q.close * 100) / 100),
            };
          }
        } catch { /* no history */ }
        reitEtf = {
          price: Math.round(vq.regularMarketPrice * 100) / 100,
          changePct: Math.round((vq.regularMarketChangePercent ?? 0) * 100) / 100,
          ytd: vq.ytdReturn != null ? Math.round(vq.ytdReturn * 1000) / 10 : null,
          history: vnqHistory,
        };
      }
    } catch { /* use null */ }

    // 10. 10Y Treasury for cap rate spread
    let treasury10y = null;
    if (FRED_API_KEY) {
      try { treasury10y = await fetchFredLatest('DGS10'); } catch { /* null */ }
    }

    const result = { reitData, priceIndexData, mortgageRates, affordabilityData, capRateData, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, lastUpdated: today };
    writeDailyCache('realEstate', result);   // persist to disk
    cache.set(cacheKey, result, 900);        // keep in memory too
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Real Estate API error:', error);
    // Fallback: serve most recent available cache (any day)
    const fallback = readLatestCache('realEstate');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Insurance Dashboard ---
const INSURER_TICKERS = ['PGR', 'ALL', 'TRV', 'HIG'];
const INSURER_NAMES = { PGR: 'Progressive', ALL: 'Allstate', TRV: 'Travelers', HIG: 'Hartford' };

app.get('/api/insurance', async (req, res) => {
  const cacheKey = 'insurance_data';
  const today = todayStr();

  // 1. Daily disk cache (survives server restarts, refreshes once per day)
  const daily = readDailyCache('insurance');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  // 2. In-memory cache (fast repeat requests within same day)
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  // Helper: format quarter label from unix timestamp
  function formatQuarter(unixTs) {
    const d = new Date(unixTs * 1000);
    const month = d.getUTCMonth() + 1; // 1-12
    const q = month <= 3 ? 'Q1' : month <= 6 ? 'Q2' : month <= 9 ? 'Q3' : 'Q4';
    const yr = String(d.getUTCFullYear()).slice(-2);
    return `${q} ${yr}`;
  }

  // 1. Fetch quarterly financials for each insurer
  const summaryResults = await Promise.allSettled(
    INSURER_TICKERS.map(ticker =>
      yf.quoteSummary(ticker, {
        modules: ['incomeStatementHistoryQuarterly', 'balanceSheetHistoryQuarterly']
      }).then(data => ({ ticker, data })).catch(e => { throw e; })
    )
  );

  const successfulSummaries = summaryResults
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  if (successfulSummaries.length === 0) {
    return res.status(500).json({ error: 'Failed to fetch insurer financial data' });
  }

  // Build combinedRatioData
  const allQuarterSets = {};
  const reserveLines = [];
  const reserveReserves = [];
  const reserveRequired = [];
  const reserveAdequacy = [];

  for (const { ticker, data } of successfulSummaries) {
    const name = INSURER_NAMES[ticker] || ticker;

    // Combined ratio from income statement
    const stmts = data?.incomeStatementHistoryQuarterly?.incomeStatementHistory || [];
    const valid = stmts
      .filter(e => e.totalRevenue?.raw && e.totalRevenue.raw !== 0)
      .map(e => ({
        ts: e.endDate?.raw,
        label: formatQuarter(e.endDate?.raw),
        ratio: Math.round(((e.totalRevenue.raw - (e.operatingIncome?.raw || 0)) / e.totalRevenue.raw) * 1000) / 10
      }))
      .sort((a, b) => a.ts - b.ts);

    const last8 = valid.slice(-8);
    allQuarterSets[name] = last8;

    // Reserve adequacy from balance sheet
    const bsStmts = data?.balanceSheetHistoryQuarterly?.balanceSheetStatements || [];
    if (bsStmts.length > 0) {
      const latest = bsStmts[0];
      const reserves = Math.round((latest.totalLiab?.raw || 0) / 1e6);
      const required = Math.round(reserves * 0.90);
      const adequacy = required > 0 ? Math.round((reserves / required) * 1000) / 10 : 0;
      reserveLines.push(name);
      reserveReserves.push(reserves);
      reserveRequired.push(required);
      reserveAdequacy.push(adequacy);
    }
  }

  // Determine unified quarters array (union of all labels, last 8)
  // Use quarters from the insurer with the most entries
  let masterQuarters = [];
  for (const entries of Object.values(allQuarterSets)) {
    if (entries.length > masterQuarters.length) {
      masterQuarters = entries.map(e => e.label);
    }
  }

  // Build lines: align each insurer's data to masterQuarters, pad with nulls
  const combinedLines = {};
  for (const [name, entries] of Object.entries(allQuarterSets)) {
    const labelMap = {};
    entries.forEach(e => { labelMap[e.label] = e.ratio; });
    combinedLines[name] = masterQuarters.map(q => labelMap[q] !== undefined ? labelMap[q] : null);
    // Pad to 8
    while (combinedLines[name].length < 8) combinedLines[name].unshift(null);
  }
  // Pad masterQuarters to 8
  while (masterQuarters.length < 8) masterQuarters.unshift('');

  const combinedRatioData = {
    quarters: masterQuarters,
    lines: combinedLines,
  };

  const reserveAdequacyData = {
    lines: reserveLines,
    reserves: reserveReserves,
    required: reserveRequired,
    adequacy: reserveAdequacy,
  };

  // 2. Fetch reinsurer quotes
  let reinsurers = [];
  try {
    const reinsurerQuotes = await yf.quote(['RNR', 'ACGL', 'AXS']);
    const arr = Array.isArray(reinsurerQuotes) ? reinsurerQuotes : [reinsurerQuotes];
    reinsurers = arr
      .filter(q => q)
      .map(q => ({
        ticker: q.symbol,
        price: q.regularMarketPrice,
        changePct: q.regularMarketChangePercent,
        name: q.shortName,
      }));
  } catch (e) {
    console.warn('Reinsurer quote fetch failed:', e.message);
  }

  // 3. Fetch FRED credit spreads
  let hyOAS = null;
  let igOAS = null;
  if (FRED_API_KEY) {
    const fredBase = `https://api.stlouisfed.org/fred/series/observations?api_key=${FRED_API_KEY}&file_type=json&limit=1&sort_order=desc&series_id=`;
    try {
      const hyData = await fetchJSON(`${fredBase}BAMLH0A0HYM2`);
      const hyVal = parseFloat(hyData?.observations?.[0]?.value);
      hyOAS = isNaN(hyVal) ? null : hyVal;
    } catch (e) {
      console.warn('FRED HY OAS fetch failed:', e.message);
    }
    try {
      const igData = await fetchJSON(`${fredBase}BAMLC0A0CM`);
      const igVal = parseFloat(igData?.observations?.[0]?.value);
      igOAS = isNaN(igVal) ? null : igVal;
    } catch (e) {
      console.warn('FRED IG OAS fetch failed:', e.message);
    }
  }

  const result = {
    combinedRatioData,
    reserveAdequacyData,
    reinsurers,
    hyOAS,
    igOAS,
    lastUpdated: today,
  };

  writeDailyCache('insurance', result);    // persist to disk
  cache.set(cacheKey, result, 900);        // keep in memory too
  res.json({ ...result, fetchedOn: today, isCurrent: true });
});

// --- Commodities Market Data ---
const EIA_API_KEY = process.env.EIA_API_KEY || '';
if (!EIA_API_KEY) console.warn('EIA_API_KEY not set — supply/demand data will use mock fallback');

const COMMODITY_META = {
  'CL=F': { name: 'WTI Crude',   sector: 'Energy',      unit: '$/bbl'   },
  'BZ=F': { name: 'Brent Crude', sector: 'Energy',      unit: '$/bbl'   },
  'NG=F': { name: 'Natural Gas', sector: 'Energy',      unit: '$/MMBtu' },
  'RB=F': { name: 'Gasoline',    sector: 'Energy',      unit: '$/gal'   },
  'HO=F': { name: 'Heating Oil', sector: 'Energy',      unit: '$/gal'   },
  'GC=F': { name: 'Gold',        sector: 'Metals',      unit: '$/oz'    },
  'SI=F': { name: 'Silver',      sector: 'Metals',      unit: '$/oz'    },
  'HG=F': { name: 'Copper',      sector: 'Metals',      unit: '$/lb'    },
  'PL=F': { name: 'Platinum',    sector: 'Metals',      unit: '$/oz'    },
  'PA=F': { name: 'Palladium',   sector: 'Metals',      unit: '$/oz'    },
  'ZW=F': { name: 'Wheat',       sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZC=F': { name: 'Corn',        sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZS=F': { name: 'Soybeans',    sector: 'Agriculture', unit: '\u00a2/bu' },
  'KC=F': { name: 'Coffee',      sector: 'Agriculture', unit: '\u00a2/lb' },
  'CT=F': { name: 'Cotton',      sector: 'Agriculture', unit: '\u00a2/lb' },
  'SB=F': { name: 'Sugar',       sector: 'Agriculture', unit: '\u00a2/lb' },
  'LE=F': { name: 'Live Cattle', sector: 'Livestock',   unit: '\u00a2/lb' },
  'LBS=F':{ name: 'Lumber',      sector: 'Livestock',   unit: '$/MBF'   },
};
const COMMODITY_TICKERS = Object.keys(COMMODITY_META);
const COMM_SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture', 'Livestock'];

const FUTURES_MONTH_CODES = ['F','G','H','J','K','M','N','Q','U','V','X','Z'];
const FUTURES_MONTH_NAMES = { F:'Jan',G:'Feb',H:'Mar',J:'Apr',K:'May',M:'Jun',N:'Jul',Q:'Aug',U:'Sep',V:'Oct',X:'Nov',Z:'Dec' };

function getWTIFuturesTickers(numMonths = 8) {
  const tickers = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 2; // 1-indexed, start next month
  if (month > 12) { month -= 12; year++; }
  for (let i = 0; i < numMonths; i++) {
    const code = FUTURES_MONTH_CODES[month - 1];
    const yr = String(year).slice(-2);
    tickers.push(`CL${code}${yr}.NYM`);
    month++;
    if (month > 12) { month -= 12; year++; }
  }
  return tickers;
}

function futuresTickerToLabel(ticker) {
  const code = ticker[2];
  const yr = ticker.slice(3, 5);
  return `${FUTURES_MONTH_NAMES[code] || '?'} '${yr}`;
}

const GOLD_FUTURES_MONTHS = ['G','J','M','Q','V','Z']; // Feb,Apr,Jun,Aug,Oct,Dec
function getGoldFuturesTickers(numMonths = 8) {
  const tickers = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-indexed, current month
  const validMonths = [2,4,6,8,10,12];
  let startMonth = validMonths.find(m => m > month);
  if (!startMonth) { startMonth = validMonths[0]; year++; }
  let mIdx = validMonths.indexOf(startMonth);
  for (let i = 0; i < numMonths; i++) {
    const m = validMonths[mIdx];
    const code = FUTURES_MONTH_CODES[m - 1];
    const yr = String(year).slice(-2);
    tickers.push(`GC${code}${yr}.CMX`);
    mIdx++;
    if (mIdx >= validMonths.length) { mIdx = 0; year++; }
  }
  return tickers;
}

function goldFuturesTickerToLabel(ticker) {
  const code = ticker[2];
  const yr = ticker.slice(3, 5);
  return `${FUTURES_MONTH_NAMES[code] || '?'} '${yr}`;
}

function buildEIASeries(rows, withAvg) {
  if (!rows || rows.length === 0) return null;
  const last52  = rows.slice(-52);
  const periods = last52.map(r => r.period);
  const values  = last52.map(r => Math.round(r.value * 10) / 10);
  const avg5yr  = withAvg && rows.length >= 10
    ? Math.round(rows.map(r => r.value).reduce((s, v) => s + v, 0) / rows.length * 10) / 10
    : null;
  return { periods, values, avg5yr };
}

async function fetchEIASeries(route, facets, length) {
  if (!EIA_API_KEY) return null;
  const params = new URLSearchParams({
    api_key: EIA_API_KEY,
    frequency: 'weekly',
    'data[0]': 'value',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'asc',
    length: String(length),
  });
  for (const [k, v] of Object.entries(facets)) {
    params.append(`facets[${k}][]`, v);
  }
  const url = `https://api.eia.gov/v2/${route}/data/?${params.toString()}`;
  const json = await fetchJSON(url);
  const rows = json?.response?.data || [];
  return rows.map(r => ({ period: r.period, value: parseFloat(r.value) })).filter(r => !isNaN(r.value));
}

app.get('/api/commodities', async (req, res) => {
  const cacheKey = 'commodities_data';
  const today = todayStr();

  // 1. Daily disk cache (survives server restarts, refreshes once per day)
  const daily = readDailyCache('commodities');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  // 2. In-memory cache (fast repeat requests within same day)
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    // 1. Fetch live quotes for all 12 commodity tickers
    let quotesMap = {};
    try {
      const raw = await yf.quote(COMMODITY_TICKERS);
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.filter(q => q).forEach(q => { quotesMap[q.symbol] = q; });
    } catch (e) {
      console.warn('Commodity quotes failed:', e.message);
    }

    // 2. Fetch 35-day chart history for all 12 tickers (for 1w%, 1m%, sparkline)
    const histStart = (() => { const d = new Date(); d.setDate(d.getDate() - 35); return d.toISOString().split('T')[0]; })();
    const histEnd   = new Date().toISOString().split('T')[0];
    const histResults = await Promise.allSettled(
      COMMODITY_TICKERS.map(ticker =>
        yf.chart(ticker, { period1: histStart, period2: histEnd, interval: '1d' })
          .then(data => ({ ticker, closes: (data.quotes || []).map(q => q.close).filter(v => v != null) }))
      )
    );
    const chartMap = {};
    histResults.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.closes.length >= 2) {
        chartMap[r.value.ticker] = r.value.closes;
      } else if (r.status === 'rejected') {
        console.warn(`Commodity chart fetch failed for ${COMMODITY_TICKERS[i]}:`, r.reason?.message);
      }
    });

    // 3. Build priceDashboardData + sectorHeatmapData
    const sectorGroups = { Energy: [], Metals: [], Agriculture: [], Livestock: [] };
    const heatmapRows  = [];

    for (const ticker of COMMODITY_TICKERS) {
      const meta   = COMMODITY_META[ticker];
      const q      = quotesMap[ticker];
      const closes = chartMap[ticker] || [];

      const price    = q?.regularMarketPrice ?? null;
      const change1d = q?.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 100) / 100 : null;
      const len      = closes.length;
      const change1w = len >= 6  ? Math.round((closes[len-1] - closes[len-6]) / closes[len-6] * 1000) / 10 : null;
      const change1m = len >= 2  ? Math.round((closes[len-1] - closes[0]) / closes[0] * 1000) / 10 : null;

      // Subsample sparkline to max 20 points, always round to 2dp
      const sparklSrc = closes.length > 20
        ? (() => { const step = (closes.length - 1) / 19; return Array.from({ length: 20 }, (_, i) => closes[Math.round(i * step)]); })()
        : closes;
      const sparkline = sparklSrc.map(v => Math.round(v * 100) / 100);

      const row = { ticker, name: meta.name, unit: meta.unit, price, change1d, change1w, change1m, sparkline };
      sectorGroups[meta.sector].push(row);
      heatmapRows.push({ ticker, name: meta.name, sector: meta.sector, d1: change1d, w1: change1w, m1: change1m });
    }

    const priceDashboardData = COMM_SECTORS_ORDER.map(sector => ({ sector, commodities: sectorGroups[sector] }));
    const sectorHeatmapData  = { commodities: heatmapRows, columns: ['1d%', '1w%', '1m%'] };

    // 4. WTI futures curve — fetch 8 contract months
    let futuresCurveData = null;
    try {
      const futureTickers = getWTIFuturesTickers(8);
      const futureQuotes  = await yf.quote(futureTickers);
      const futureArr     = Array.isArray(futureQuotes) ? futureQuotes : [futureQuotes];
      const futureMap     = {};
      futureArr.filter(q => q).forEach(q => { futureMap[q.symbol] = q; });
      const validFutures  = futureTickers
        .map(t => ({ ticker: t, label: futuresTickerToLabel(t), price: futureMap[t]?.regularMarketPrice ?? null }))
        .filter(f => f.price != null);
      if (validFutures.length >= 4) {
        futuresCurveData = {
          labels:    validFutures.map(f => f.label),
          prices:    validFutures.map(f => Math.round(f.price * 100) / 100),
          commodity: 'WTI Crude Oil',
          unit:      '$/bbl',
          spotPrice: quotesMap['CL=F']?.regularMarketPrice ?? validFutures[0]?.price ?? null,
        };
      }
    } catch (e) {
      console.warn('Futures curve fetch failed:', e.message);
    }

    // 5. EIA supply/demand data
    let supplyDemandData = null;
    try {
      const [crudeRows, natGasRows, prodRows] = await Promise.all([
        fetchEIASeries('petroleum/stoc/wstk',  { duoarea: 'NUS', product: 'EPC0' }, 260).catch(() => null),
        fetchEIASeries('natural-gas/stor/wkly', { duoarea: 'NUS' },                  260).catch(() => null),
        fetchEIASeries('petroleum/sum/sndw',    { duoarea: 'NUS', product: 'EPC0' }, 52).catch(() => null),
      ]);

      const crude    = buildEIASeries(crudeRows,  true);
      const natGas   = buildEIASeries(natGasRows, true);
      const prod     = buildEIASeries(prodRows,   false);

      if (crude || natGas || prod) {
        supplyDemandData = {
          crudeStocks:     crude    || { periods: [], values: [], avg5yr: null },
          natGasStorage:   natGas   || { periods: [], values: [], avg5yr: null },
          crudeProduction: prod     || { periods: [], values: [] },
        };
      }
    } catch (e) {
      console.warn('EIA fetch failed:', e.message);
    }

    // 6. CFTC COT positioning for WTI crude + gold
    let cotData = null;
    try {
      const cotUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$where=market_and_exchange_names like 'CRUDE OIL%25' OR market_and_exchange_names like 'GOLD%25'&$order=report_date_as_yyyy_mm_dd DESC&$limit=24`;
      const cotRaw = await fetchJSON(cotUrl);
      if (Array.isArray(cotRaw) && cotRaw.length > 0) {
        const grouped = {};
        for (const row of cotRaw) {
          const isCrude = /CRUDE OIL/i.test(row.market_and_exchange_names);
          const isGold  = /GOLD/i.test(row.market_and_exchange_names);
          const key = isCrude ? 'WTI Crude Oil' : isGold ? 'Gold' : null;
          if (!key) continue;
          if (!grouped[key]) grouped[key] = [];
          const noncommLong  = parseInt(row.noncomm_positions_long_all || '0');
          const noncommShort = parseInt(row.noncomm_positions_short_all || '0');
          const commLong     = parseInt(row.comm_positions_long_all || '0');
          const commShort    = parseInt(row.comm_positions_short_all || '0');
          const totalOI      = parseInt(row.open_interest_all || '0');
          grouped[key].push({
            date:       row.report_date_as_yyyy_mm_dd,
            noncommNet: noncommLong - noncommShort,
            commNet:    commLong - commShort,
            totalOI,
          });
        }

        const commodities = [];
        for (const name of ['WTI Crude Oil', 'Gold']) {
          const rows = (grouped[name] || []).slice(0, 12);
          if (rows.length === 0) continue;
          const latest = rows[0];
          const prev = rows.length >= 2 ? rows[1] : null;
          commodities.push({
            name,
            latest: {
              noncommNet: latest.noncommNet,
              commNet:    latest.commNet,
              totalOI:    latest.totalOI,
              netChange:  prev ? latest.noncommNet - prev.noncommNet : 0,
            },
            history: rows.map(r => ({ date: r.date, noncommNet: r.noncommNet })),
          });
        }

        if (commodities.length >= 2) {
          cotData = { commodities };
        }
      }
    } catch (e) {
      console.warn('CFTC COT fetch failed:', e.message);
    }

    // 7. FRED commodity price histories + indicators
    let fredCommodities = null;
    if (FRED_API_KEY) {
      try {
        const [wtiHist, goldHist, brentHist, natGasHist, ppiHist, dollarHist, gasRetailVal] = await Promise.all([
          fetchFredHistory('DCOILWTICO', 252).catch(() => []),
          fetchFredHistory('GOLDAMGBD228NLBM', 252).catch(() => []),
          fetchFredHistory('DCOILBRENTEU', 252).catch(() => []),
          fetchFredHistory('DHHNGSP', 252).catch(() => []),
          fetchFredHistory('WPUFD49207', 36).catch(() => []),
          fetchFredHistory('DTWEXBGS', 252).catch(() => []),
          fetchFredLatest('GASREGW').catch(() => null),
        ]);
        const toSeries = (hist) => hist.length >= 10 ? {
          dates: hist.map(p => p.date),
          values: hist.map(p => Math.round(p.value * 100) / 100),
        } : null;
        fredCommodities = {
          wtiHistory:    toSeries(wtiHist),
          goldHistory:   toSeries(goldHist),
          brentHistory:  toSeries(brentHist),
          natGasHistory: toSeries(natGasHist),
          ppiCommodity:  ppiHist.length >= 6 ? {
            dates: ppiHist.map(p => p.date.slice(0, 7)),
            values: ppiHist.map(p => Math.round(p.value * 10) / 10),
          } : null,
          dollarIndex:   toSeries(dollarHist),
          gasRetail:     gasRetailVal != null ? Math.round(gasRetailVal * 1000) / 1000 : null,
        };
      } catch { /* use null */ }
    }

    // 8. Gold futures curve (COMEX, bi-monthly contracts)
    let goldFuturesCurve = null;
    try {
      const goldTickers = getGoldFuturesTickers(8);
      const goldQuotes = await yf.quote(goldTickers);
      const goldArr = Array.isArray(goldQuotes) ? goldQuotes : [goldQuotes];
      const goldMap = {};
      goldArr.filter(q => q).forEach(q => { goldMap[q.symbol] = q; });
      const validGold = goldTickers
        .map(t => ({ ticker: t, label: goldFuturesTickerToLabel(t), price: goldMap[t]?.regularMarketPrice ?? null }))
        .filter(f => f.price != null);
      if (validGold.length >= 3) {
        goldFuturesCurve = {
          labels:    validGold.map(f => f.label),
          prices:    validGold.map(f => Math.round(f.price * 100) / 100),
          commodity: 'Gold',
          unit:      '$/oz',
          spotPrice: quotesMap['GC=F']?.regularMarketPrice ?? validGold[0]?.price ?? null,
        };
      }
    } catch (e) {
      console.warn('Gold futures curve failed:', e.message);
    }

    // 9. DBC (broad commodity ETF) quote + 1yr chart
    let dbcEtf = null;
    try {
      const dbcQuote = await yf.quote(['DBC']);
      const dbcArr = Array.isArray(dbcQuote) ? dbcQuote : [dbcQuote];
      const dq = dbcArr.find(q => q?.symbol === 'DBC');
      if (dq?.regularMarketPrice) {
        const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
        const histEnd = new Date().toISOString().split('T')[0];
        let dbcHistory = null;
        try {
          const chart = await yf.chart('DBC', { period1: histStart, period2: histEnd, interval: '1d' });
          const quotes = (chart.quotes || []).filter(q => q.close != null);
          if (quotes.length >= 20) {
            dbcHistory = {
              dates: quotes.map(q => q.date.toISOString().split('T')[0]),
              closes: quotes.map(q => Math.round(q.close * 100) / 100),
            };
          }
        } catch { /* no history */ }
        dbcEtf = {
          price: Math.round(dq.regularMarketPrice * 100) / 100,
          changePct: Math.round((dq.regularMarketChangePercent ?? 0) * 100) / 100,
          ytd: dq.ytdReturn != null ? Math.round(dq.ytdReturn * 1000) / 10 : null,
          history: dbcHistory,
        };
      }
    } catch { /* use null */ }

    const result = {
      priceDashboardData,
      sectorHeatmapData,
      futuresCurveData:    futuresCurveData    ?? null,
      supplyDemandData:    supplyDemandData    ?? null,
      cotData:             cotData             ?? null,
      fredCommodities:     fredCommodities     ?? null,
      goldFuturesCurve:    goldFuturesCurve    ?? null,
      dbcEtf:              dbcEtf              ?? null,
      lastUpdated: today,
    };

    writeDailyCache('commodities', result);  // persist to disk
    cache.set(cacheKey, result, 900);        // keep in memory too
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Commodities API error:', error);
    // Fallback: serve most recent available cache (any day)
    const fallback = readLatestCache('commodities');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Global Macro Market Data ---
const MACRO_COUNTRIES = [
  { code: 'US', wbCode: 'US', name: 'United States',  flag: '🇺🇸', region: 'G7'       },
  { code: 'EA', wbCode: 'XC', name: 'Euro Area',      flag: '🇪🇺', region: 'Advanced' },
  { code: 'GB', wbCode: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'G7'       },
  { code: 'JP', wbCode: 'JP', name: 'Japan',          flag: '🇯🇵', region: 'G7'       },
  { code: 'CA', wbCode: 'CA', name: 'Canada',         flag: '🇨🇦', region: 'G7'       },
  { code: 'CN', wbCode: 'CN', name: 'China',          flag: '🇨🇳', region: 'EM'       },
  { code: 'IN', wbCode: 'IN', name: 'India',          flag: '🇮🇳', region: 'EM'       },
  { code: 'BR', wbCode: 'BR', name: 'Brazil',         flag: '🇧🇷', region: 'EM'       },
  { code: 'KR', wbCode: 'KR', name: 'South Korea',   flag: '🇰🇷', region: 'EM'       },
  { code: 'AU', wbCode: 'AU', name: 'Australia',      flag: '🇦🇺', region: 'Advanced' },
  { code: 'MX', wbCode: 'MX', name: 'Mexico',         flag: '🇲🇽', region: 'EM'       },
  { code: 'SE', wbCode: 'SE', name: 'Sweden',         flag: '🇸🇪', region: 'Advanced' },
];
const MACRO_WB_CODES = MACRO_COUNTRIES.map(c => c.wbCode).join(';');

const MACRO_FRED_RATES = {
  US: { id: 'FEDFUNDS',        name: 'United States',  flag: '🇺🇸', bank: 'Fed'      },
  EA: { id: 'ECBDFR',          name: 'Euro Area',      flag: '🇪🇺', bank: 'ECB'      },
  GB: { id: 'IRSTCB01GBM156N', name: 'United Kingdom', flag: '🇬🇧', bank: 'BoE'      },
  JP: { id: 'IRSTCB01JPM156N', name: 'Japan',          flag: '🇯🇵', bank: 'BoJ'      },
  CA: { id: 'IRSTCB01CAM156N', name: 'Canada',         flag: '🇨🇦', bank: 'BoC'      },
  AU: { id: 'IRSTCB01AUM156N', name: 'Australia',      flag: '🇦🇺', bank: 'RBA'      },
  SE: { id: 'IRSTCB01SEM156N', name: 'Sweden',         flag: '🇸🇪', bank: 'Riksbank' },
};

const MACRO_MOCK_RATES = {
  CN: { rate:  3.45, name: 'China',       flag: '🇨🇳', bank: 'PBoC'    },
  IN: { rate:  6.50, name: 'India',       flag: '🇮🇳', bank: 'RBI'     },
  BR: { rate: 10.50, name: 'Brazil',      flag: '🇧🇷', bank: 'BCB'     },
  KR: { rate:  3.50, name: 'South Korea', flag: '🇰🇷', bank: 'BoK'     },
  MX: { rate: 11.00, name: 'Mexico',      flag: '🇲🇽', bank: 'Banxico' },
};

async function fetchWBIndicator(indicator) {
  const url = `https://api.worldbank.org/v2/country/${MACRO_WB_CODES}/indicator/${indicator}?format=json&mrv=8&per_page=200`;
  const json = await fetchJSON(url);
  const rows = Array.isArray(json) && json[1] ? json[1] : [];
  const result = { values: {}, year: null };
  for (const row of rows) {
    const cc = row.country?.id;
    if (!cc || row.value == null) continue;
    if (!result.values[cc]) {
      result.values[cc] = Math.round(row.value * 10) / 10;
      if (!result.year) result.year = parseInt(row.date, 10);
    }
  }
  return result;
}

async function fetchFredLatestRate(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
  const data = await fetchJSON(url);
  const obs = (data?.observations || []).find(o => o.value !== '.');
  return obs ? Math.round(parseFloat(obs.value) * 100) / 100 : null;
}

async function fetchFredRateHistory5yr(seriesId) {
  const start = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 5); return d.toISOString().split('T')[0]; })();
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${start}&frequency=m`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date.slice(0, 7), value: Math.round(parseFloat(o.value) * 100) / 100 }));
}

app.get('/api/globalMacro', async (req, res) => {
  const cacheKey = 'globalMacro_data';
  const today = todayStr();

  // 1. Daily disk cache (survives server restarts, refreshes once per day)
  const daily = readDailyCache('globalMacro');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  // 2. In-memory cache (fast repeat requests within same day)
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    // 1. World Bank indicators (5 in parallel, each with silent catch)
    const [gdpRes, cpiRes, unempRes, debtRes, caRes] = await Promise.all([
      fetchWBIndicator('NY.GDP.MKTP.KD.ZG').catch(() => ({ values: {}, year: null })),
      fetchWBIndicator('FP.CPI.TOTL.ZG').catch(()    => ({ values: {}, year: null })),
      fetchWBIndicator('SL.UEM.TOTL.ZS').catch(()    => ({ values: {}, year: null })),
      fetchWBIndicator('GC.DOD.TOTL.GD.ZS').catch(() => ({ values: {}, year: null })),
      fetchWBIndicator('BN.CAB.XOKA.GD.ZS').catch(() => ({ values: {}, year: null })),
    ]);
    const wbYear = gdpRes.year || cpiRes.year || new Date().getFullYear() - 2;

    // 2. FRED current rates for 7 countries
    const fredCurrentMap = {};
    if (FRED_API_KEY) {
      const fredResults = await Promise.allSettled(
        Object.entries(MACRO_FRED_RATES).map(async ([code, meta]) => ({
          code, rate: await fetchFredLatestRate(meta.id).catch(() => null),
        }))
      );
      fredResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value.rate != null) fredCurrentMap[r.value.code] = r.value.rate;
      });
    }

    // 3. FRED 5-year rate histories for 7 countries
    const fredHistoryMap = {};
    if (FRED_API_KEY) {
      const histResults = await Promise.allSettled(
        Object.entries(MACRO_FRED_RATES).map(async ([code, meta]) => ({
          code, meta,
          obs: await fetchFredRateHistory5yr(meta.id).catch(() => []),
        }))
      );
      histResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value.obs.length >= 2) fredHistoryMap[r.value.code] = r.value;
      });
    }

    // 4. Build scorecardData
    const scorecardData = MACRO_COUNTRIES.map(c => ({
      code:   c.code,
      name:   c.name,
      flag:   c.flag,
      region: c.region,
      gdp:    gdpRes.values[c.wbCode]   ?? null,
      cpi:    cpiRes.values[c.wbCode]   ?? null,
      rate:   fredCurrentMap[c.code] ?? MACRO_MOCK_RATES[c.code]?.rate ?? null,
      unemp:  unempRes.values[c.wbCode] ?? null,
      debt:   debtRes.values[c.wbCode]  ?? null,
    }));

    // 5. Build growthInflationData
    const growthInflationData = {
      year: wbYear,
      countries: MACRO_COUNTRIES.map(c => ({
        code: c.code, name: c.name, flag: c.flag,
        gdp: gdpRes.values[c.wbCode] ?? null,
        cpi: cpiRes.values[c.wbCode] ?? null,
      })),
    };

    // 6. Build centralBankData
    const allCurrentRates = MACRO_COUNTRIES.map(c => {
      const fredMeta = MACRO_FRED_RATES[c.code];
      const mockMeta = MACRO_MOCK_RATES[c.code];
      const rate   = fredCurrentMap[c.code] ?? mockMeta?.rate ?? null;
      const isLive = fredMeta ? (fredCurrentMap[c.code] != null) : false;
      return { code: c.code, name: c.name, flag: c.flag, rate, bank: fredMeta?.bank ?? mockMeta?.bank ?? '', isLive };
    });

    const allDates = new Set();
    Object.values(fredHistoryMap).forEach(({ obs }) => obs.forEach(o => allDates.add(o.date)));
    const sortedDates = [...allDates].sort();
    const histSeries = Object.entries(fredHistoryMap).map(([code, { meta, obs }]) => {
      const obsMap = Object.fromEntries(obs.map(o => [o.date, o.value]));
      return {
        code, name: meta.name, flag: meta.flag,
        values: sortedDates.map(d => obsMap[d] ?? null),
      };
    });

    const centralBankData = {
      current: allCurrentRates,
      history: { dates: sortedDates, series: histSeries },
    };

    // 7. Build debtData
    const debtData = {
      year: wbYear,
      countries: MACRO_COUNTRIES.map(c => ({
        code:           c.code,
        name:           c.name,
        flag:           c.flag,
        debt:           debtRes.values[c.wbCode] ?? null,
        currentAccount: caRes.values[c.wbCode]   ?? null,
      })),
    };

    const result = {
      scorecardData,
      growthInflationData,
      centralBankData,
      debtData,
      lastUpdated: today,
    };

    writeDailyCache('globalMacro', result);  // persist to disk
    cache.set(cacheKey, result, 3600);       // keep in memory too
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('GlobalMacro API error:', error);
    // Fallback: serve most recent available cache (any day)
    const fallback = readLatestCache('globalMacro');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Equity Deep-Dive Market Data ---
const SECTOR_ETF_META = [
  { code: 'XLK',  name: 'Technology'        },
  { code: 'XLF',  name: 'Financials'        },
  { code: 'XLV',  name: 'Health Care'       },
  { code: 'XLE',  name: 'Energy'            },
  { code: 'XLI',  name: 'Industrials'       },
  { code: 'XLC',  name: 'Communication'     },
  { code: 'XLY',  name: 'Consumer Disc.'    },
  { code: 'XLP',  name: 'Consumer Staples'  },
  { code: 'XLRE', name: 'Real Estate'       },
  { code: 'XLB',  name: 'Materials'         },
  { code: 'XLU',  name: 'Utilities'         },
  { code: 'SPY',  name: 'S&P 500'           },
];
const SECTOR_ETF_TICKERS = SECTOR_ETF_META.map(s => s.code);

const EQ_FACTOR_TICKERS = [
  'NVDA','MSFT','AAPL','AVGO','META','GOOGL','JPM','V','LLY','UNH',
  'WMT','PG','AMZN','HD','CAT','HON','XOM','CVX','TSLA','INTC',
];
const EQ_FACTOR_META = {
  NVDA:  { name: 'NVIDIA',        sector: 'Technology'       },
  MSFT:  { name: 'Microsoft',     sector: 'Technology'       },
  AAPL:  { name: 'Apple',         sector: 'Technology'       },
  AVGO:  { name: 'Broadcom',      sector: 'Technology'       },
  META:  { name: 'Meta',          sector: 'Communication'    },
  GOOGL: { name: 'Alphabet',      sector: 'Communication'    },
  JPM:   { name: 'JPMorgan',      sector: 'Financials'       },
  V:     { name: 'Visa',          sector: 'Financials'       },
  LLY:   { name: 'Eli Lilly',     sector: 'Health Care'      },
  UNH:   { name: 'UnitedHealth',  sector: 'Health Care'      },
  WMT:   { name: 'Walmart',       sector: 'Consumer Staples' },
  PG:    { name: 'P&G',           sector: 'Consumer Staples' },
  AMZN:  { name: 'Amazon',        sector: 'Consumer Disc.'   },
  HD:    { name: 'Home Depot',    sector: 'Consumer Disc.'   },
  CAT:   { name: 'Caterpillar',   sector: 'Industrials'      },
  HON:   { name: 'Honeywell',     sector: 'Industrials'      },
  XOM:   { name: 'ExxonMobil',    sector: 'Energy'           },
  CVX:   { name: 'Chevron',       sector: 'Energy'           },
  TSLA:  { name: 'Tesla',         sector: 'Consumer Disc.'   },
  INTC:  { name: 'Intel',         sector: 'Technology'       },
};

const EQ_SHORT_TICKERS = [
  'CVNA','GME','CHWY','RIVN','PLUG','LCID','BYND','CLSK','UPST','MARA',
  'NKLA','OPEN','SPCE','SAVA','LAZR','IONQ','ARRY','XPEV','WOLF',
];
const EQ_SHORT_META = {
  CVNA: { name: 'Carvana',           sector: 'Consumer Disc.'   },
  GME:  { name: 'GameStop',          sector: 'Consumer Disc.'   },
  CHWY: { name: 'Chewy',            sector: 'Consumer Disc.'   },
  RIVN: { name: 'Rivian',           sector: 'Consumer Disc.'   },
  PLUG: { name: 'Plug Power',       sector: 'Industrials'      },
  LCID: { name: 'Lucid Group',      sector: 'Consumer Disc.'   },
  BYND: { name: 'Beyond Meat',      sector: 'Consumer Staples' },
  CLSK: { name: 'CleanSpark',       sector: 'Technology'       },
  UPST: { name: 'Upstart',          sector: 'Financials'       },
  MARA: { name: 'Marathon Digital',  sector: 'Technology'       },
  NKLA: { name: 'Nikola',           sector: 'Industrials'      },
  OPEN: { name: 'Opendoor',         sector: 'Real Estate'      },
  SPCE: { name: 'Virgin Galactic',  sector: 'Industrials'      },
  SAVA: { name: 'Cassava Sciences', sector: 'Health Care'      },
  LAZR: { name: 'Luminar',          sector: 'Technology'       },
  IONQ: { name: 'IonQ',            sector: 'Technology'       },
  ARRY: { name: 'Array Technologies',sector: 'Industrials'     },
  XPEV: { name: 'XPeng',           sector: 'Consumer Disc.'   },
  WOLF: { name: 'Wolfspeed',       sector: 'Technology'       },
};

app.get('/api/equityDeepDive', async (req, res) => {
  const cacheKey = 'equityDeepDive_data';
  const today = todayStr();

  // 1. Daily disk cache (survives server restarts, refreshes once per day)
  const daily = readDailyCache('equityDeepDive');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  // 2. In-memory cache (fast repeat requests within same day)
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    // 1. Fetch live quotes for all 12 sector ETFs
    let quotesMap = {};
    try {
      const raw = await yf.quote(SECTOR_ETF_TICKERS);
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.filter(q => q).forEach(q => { quotesMap[q.symbol] = q; });
    } catch (e) {
      console.warn('Equity ETF quotes failed:', e.message);
    }

    // 2. Fetch 1-year daily history for all ETFs (multi-timeframe returns)
    const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
    const histEnd   = new Date().toISOString().split('T')[0];
    const histResults = await Promise.allSettled(
      SECTOR_ETF_TICKERS.map(ticker =>
        yf.chart(ticker, { period1: histStart, period2: histEnd, interval: '1d' })
          .then(data => ({ ticker, closes: (data.quotes || []).map(q => q.close).filter(v => v != null) }))
      )
    );
    const chartMap = {};
    histResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value.closes.length >= 2) {
        chartMap[r.value.ticker] = r.value.closes;
      }
    });

    // 3. Compute multi-timeframe performance for each ETF
    const perf = (closes, n) => {
      const len = closes.length;
      if (len < n + 1) return null;
      const prev = closes[Math.max(0, len - 1 - n)];
      const curr = closes[len - 1];
      return prev > 0 ? Math.round((curr - prev) / prev * 1000) / 10 : null;
    };

    const sectors = SECTOR_ETF_META.map(s => {
      const q      = quotesMap[s.code];
      const closes = chartMap[s.code] || [];
      return {
        code:   s.code,
        name:   s.name,
        perf1d: q?.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 100) / 100 : null,
        perf1w: perf(closes, 5),
        perf1m: perf(closes, 21),
        perf3m: perf(closes, 63),
        perf1y: closes.length >= 2 ? perf(closes, closes.length - 1) : null,
      };
    });

    // ── Live Factor Data ──────────────────────────────────────────────────────
    const factor90dAgo = (() => { const d = new Date(); d.setDate(d.getDate() - 95); return d.toISOString().split('T')[0]; })();
    const factorEnd = new Date().toISOString().split('T')[0];

    const [factorSummaries, ...factorCharts] = await Promise.allSettled([
      Promise.allSettled(EQ_FACTOR_TICKERS.map(t =>
        yf.quoteSummary(t, { modules: ['defaultKeyStatistics', 'financialData', 'calendarEvents', 'earningsTrend'] })
          .then(d => ({ ticker: t, ...d }))
      )).then(results => results.map((r, i) => r.status === 'fulfilled' ? r.value : { ticker: EQ_FACTOR_TICKERS[i] })),
      ...EQ_FACTOR_TICKERS.map(t =>
        yf.chart(t, { period1: factor90dAgo, period2: factorEnd, interval: '1d' })
          .then(data => ({ ticker: t, closes: (data.quotes || []).map(q => q.close).filter(v => v != null) }))
      ),
    ]);

    const summaries = factorSummaries.status === 'fulfilled' ? factorSummaries.value : [];
    const factorChartMap = {};
    factorCharts.forEach(r => {
      if (r.status === 'fulfilled' && r.value.closes?.length >= 2) factorChartMap[r.value.ticker] = r.value.closes;
    });

    // Compute raw metrics per stock
    const rawMetrics = EQ_FACTOR_TICKERS.map(ticker => {
      const s = summaries.find(x => x.ticker === ticker) || {};
      const ks = s.defaultKeyStatistics || {};
      const fd = s.financialData || {};
      const closes = factorChartMap[ticker] || [];

      const forwardPE = ks.forwardPE ?? fd.forwardPE ?? null;
      const valueFwd = forwardPE > 0 ? 1 / forwardPE : 0;
      const roe = fd.returnOnEquity != null ? fd.returnOnEquity * 100 : 0;
      const momentum3m = closes.length >= 2 ? (closes.at(-1) / closes[0] - 1) * 100 : 0;

      // 60-day realized vol
      const recent60 = closes.slice(-61);
      let realizedVol = 50;
      if (recent60.length >= 20) {
        const logRets = [];
        for (let i = 1; i < recent60.length; i++) {
          if (recent60[i] > 0 && recent60[i-1] > 0) logRets.push(Math.log(recent60[i] / recent60[i-1]));
        }
        if (logRets.length > 1) {
          const mean = logRets.reduce((a, b) => a + b, 0) / logRets.length;
          const variance = logRets.reduce((a, b) => a + (b - mean) ** 2, 0) / (logRets.length - 1);
          realizedVol = Math.sqrt(variance) * Math.sqrt(252) * 100;
        }
      }

      return { ticker, valueFwd, momentum3m, roe, realizedVol };
    });

    // Percentile rank function
    function pctRank(arr, idx, key, invert = false) {
      const val = arr[idx][key];
      const sorted = arr.map(x => x[key]).sort((a, b) => invert ? b - a : a - b);
      const rank = sorted.indexOf(val);
      return Math.round(rank / Math.max(arr.length - 1, 1) * 100);
    }

    const factorStocks = rawMetrics.map((m, i) => {
      const meta = EQ_FACTOR_META[m.ticker] || {};
      const value    = pctRank(rawMetrics, i, 'valueFwd', false);
      const momentum = pctRank(rawMetrics, i, 'momentum3m', false);
      const quality  = pctRank(rawMetrics, i, 'roe', false);
      const lowVol   = pctRank(rawMetrics, i, 'realizedVol', true); // invert: low vol = high score
      const composite = Math.round((value + momentum + quality + lowVol) / 4);
      return { ticker: m.ticker, name: meta.name || m.ticker, sector: meta.sector || '', value, momentum, quality, lowVol, composite };
    });

    const avgValue    = Math.round((factorStocks.reduce((s, x) => s + x.value, 0) / factorStocks.length - 50) * 10) / 10;
    const avgMomentum = Math.round((factorStocks.reduce((s, x) => s + x.momentum, 0) / factorStocks.length - 50) * 10) / 10;
    const avgQuality  = Math.round((factorStocks.reduce((s, x) => s + x.quality, 0) / factorStocks.length - 50) * 10) / 10;
    const avgLowVol   = Math.round((factorStocks.reduce((s, x) => s + x.lowVol, 0) / factorStocks.length - 50) * 10) / 10;

    const factorData = {
      inFavor: { value: avgValue, momentum: avgMomentum, quality: avgQuality, lowVol: avgLowVol },
      stocks: factorStocks,
    };

    // ── Live Earnings Data ────────────────────────────────────────────────────
    const now = new Date();
    const in45d = new Date(now); in45d.setDate(in45d.getDate() + 45);
    const upcoming = [];

    summaries.forEach(s => {
      const ticker = s.ticker;
      const meta = EQ_FACTOR_META[ticker] || {};
      const ce = s.calendarEvents?.earnings;
      const earningsDate = ce?.earningsDate?.[0] ?? null;
      if (!earningsDate) return;
      const ed = new Date(earningsDate);
      if (ed < now || ed > in45d) return;

      const et = s.earningsTrend?.trend?.find(t => t.period === '0q');
      const epsEst = et?.earningsEstimate?.avg ?? null;
      const epsPrev = s.defaultKeyStatistics?.trailingEps ?? null;
      const marketCapB = s.defaultKeyStatistics?.marketCap
        ? Math.round(s.defaultKeyStatistics.marketCap / 1e9)
        : null;

      upcoming.push({
        ticker,
        name: meta.name || ticker,
        sector: meta.sector || '',
        date: typeof earningsDate === 'string' ? earningsDate.split('T')[0] : ed.toISOString().split('T')[0],
        epsEst: epsEst != null ? Math.round(epsEst * 100) / 100 : null,
        epsPrev: epsPrev != null ? Math.round(epsPrev * 100) / 100 : null,
        marketCapB,
      });
    });
    upcoming.sort((a, b) => a.date.localeCompare(b.date));

    const earningsData = { upcoming, beatRates: null };

    // ── Live Short Data ───────────────────────────────────────────────────────
    const shortSummaryResults = await Promise.allSettled(
      EQ_SHORT_TICKERS.map(t =>
        yf.quoteSummary(t, { modules: ['defaultKeyStatistics'] })
          .then(d => ({ ticker: t, ...d }))
      )
    );
    let shortQuotes = {};
    try {
      const sq = await yf.quote(EQ_SHORT_TICKERS);
      const sqArr = Array.isArray(sq) ? sq : [sq];
      sqArr.filter(q => q).forEach(q => { shortQuotes[q.symbol] = q; });
    } catch { /* proceed with empty quotes */ }

    const mostShorted = [];
    shortSummaryResults.forEach(r => {
      if (r.status !== 'fulfilled') return;
      const s = r.value;
      const ks = s.defaultKeyStatistics || {};
      const q = shortQuotes[s.ticker] || {};
      const meta = EQ_SHORT_META[s.ticker] || {};

      let shortFloat = ks.shortPercentOfFloat;
      if (shortFloat == null) return;
      if (shortFloat < 1) shortFloat = Math.round(shortFloat * 1000) / 10; // decimal to %
      else shortFloat = Math.round(shortFloat * 10) / 10;

      const sharesShort = ks.sharesShort || 0;
      const avgVol = q.averageDailyVolume10Day || ks.averageVolume10days || 1;
      const daysToCover = avgVol > 0 ? Math.round(sharesShort / avgVol * 10) / 10 : null;
      const marketCapB = (ks.marketCap || q.marketCap || 0) / 1e9;
      const perf1w = q.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 10) / 10 : null;

      mostShorted.push({
        ticker: s.ticker,
        name: meta.name || q.shortName || s.ticker,
        sector: meta.sector || '',
        shortFloat,
        daysToCover,
        marketCapB: Math.round(marketCapB),
        perf1w,
      });
    });
    mostShorted.sort((a, b) => (b.shortFloat || 0) - (a.shortFloat || 0));

    const shortData = { mostShorted };

    const result = {
      sectorData:   { sectors },
      factorData,
      earningsData,
      shortData,
      lastUpdated:  today,
    };

    writeDailyCache('equityDeepDive', result); // persist to disk
    cache.set(cacheKey, result, 300);          // keep in memory too
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('EquityDeepDive API error:', error);
    // Fallback: serve most recent available cache (any day)
    const fallback = readLatestCache('equityDeepDive');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── /api/crypto ─────────────────────────────────────────────────────────────
// CoinGecko free API (no key) + DeFiLlama (no key) + Alternative.me F&G
app.get('/api/crypto', async (_req, res) => {
  const today = todayStr();
  const daily = readDailyCache('crypto');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  const cacheKey = 'crypto_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const cgCoinsUrl = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h%2C7d%2C30d';
    const cgGlobalUrl = 'https://api.coingecko.com/api/v3/global';
    const fngUrl = 'https://api.alternative.me/fng/?limit=30';
    const defiProtocolsUrl = 'https://api.llama.fi/protocols';
    const defiChainsUrl = 'https://api.llama.fi/v2/chains';
    const mempoolFeesUrl     = 'https://mempool.space/api/v1/fees/recommended';
    const mempoolDiffUrl     = 'https://mempool.space/api/v1/difficulty-adjustment';
    const mempoolStatsUrl    = 'https://mempool.space/api/mempool';
    const mempoolHashrateUrl = 'https://mempool.space/api/v1/mining/hashrate/1m';

    const fetchJson = (url) => new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 kyahoofinance' } }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });

    const [cgCoins, cgGlobal, fng, defiProtocols, defiChains, mempoolFees, mempoolDiff, mempoolStats, mempoolHashrate] = await Promise.allSettled([
      fetchJson(cgCoinsUrl),
      fetchJson(cgGlobalUrl),
      fetchJson(fngUrl),
      fetchJson(defiProtocolsUrl),
      fetchJson(defiChainsUrl),
      fetchJson(mempoolFeesUrl),
      fetchJson(mempoolDiffUrl),
      fetchJson(mempoolStatsUrl),
      fetchJson(mempoolHashrateUrl),
    ]);

    // ── Build coinMarketData ─────────────────────────────────────────────────
    let coins = [];
    if (cgCoins.status === 'fulfilled' && Array.isArray(cgCoins.value)) {
      const globalData = cgGlobal.status === 'fulfilled' ? cgGlobal.value?.data : null;
      const totalMcap = globalData?.total_market_cap?.usd;
      coins = cgCoins.value.map(c => ({
        id:         c.id,
        symbol:     c.symbol?.toUpperCase(),
        name:       c.name,
        price:      c.current_price,
        change24h:  c.price_change_percentage_24h_in_currency ?? c.price_change_percentage_24h,
        change7d:   c.price_change_percentage_7d_in_currency,
        change30d:  c.price_change_percentage_30d_in_currency,
        marketCapB: c.market_cap != null ? c.market_cap / 1e9 : null,
        volumeB:    c.total_volume != null ? c.total_volume / 1e9 : null,
        dominance:  (totalMcap && c.market_cap) ? (c.market_cap / totalMcap) * 100 : null,
      }));
    }

    let globalStats = {};
    if (cgGlobal.status === 'fulfilled' && cgGlobal.value?.data) {
      const g = cgGlobal.value.data;
      const btcDom = g.market_cap_percentage?.btc ?? 52;
      const ethDom = g.market_cap_percentage?.eth ?? 15;
      globalStats = {
        totalMarketCapT:        g.total_market_cap?.usd != null ? g.total_market_cap.usd / 1e12 : null,
        totalVolumeB:           g.total_volume?.usd != null ? g.total_volume.usd / 1e9 : null,
        btcDominance:           btcDom,
        ethDominance:           ethDom,
        altDominance:           100 - btcDom - ethDom,
        activeCryptocurrencies: g.active_cryptocurrencies,
        marketCapChange24h:     g.market_cap_change_percentage_24h_usd,
      };
    }

    // ── Build fearGreedData ──────────────────────────────────────────────────
    let fearGreedData = { value: 50, label: 'Neutral', history: [], correlations: [] };
    if (fng.status === 'fulfilled' && Array.isArray(fng.value?.data)) {
      const entries = fng.value.data.slice(0, 30).reverse();
      fearGreedData = {
        value:        parseInt(entries[entries.length - 1]?.value ?? '50'),
        label:        entries[entries.length - 1]?.value_classification ?? 'Neutral',
        history:      entries.map(e => parseInt(e.value)),
        correlations: [],
      };
    }

    // ── Build defiData ───────────────────────────────────────────────────────
    let defiData = { protocols: [], chains: [] };
    if (defiProtocols.status === 'fulfilled' && Array.isArray(defiProtocols.value)) {
      const sorted = [...defiProtocols.value]
        .filter(p => p.tvl > 0)
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 15);
      defiData.protocols = sorted.map(p => ({
        name:      p.name,
        category:  p.category ?? 'DeFi',
        chain:     p.chain ?? 'Multi',
        tvlB:      p.tvl / 1e9,
        change1d:  p.change_1d ?? 0,
        change7d:  p.change_7d ?? 0,
      }));
    }
    if (defiChains.status === 'fulfilled' && Array.isArray(defiChains.value)) {
      const sorted = [...defiChains.value]
        .filter(c => c.tvl > 0)
        .sort((a, b) => b.tvl - a.tvl)
        .slice(0, 10);
      defiData.chains = sorted.map(c => ({
        name:      c.name,
        tvlB:      c.tvl / 1e9,
        change7d:  c.change7d ?? 0,
        protocols: c.protocols ?? 0,
      }));
    }

    // 4. Funding rates from Bybit public API (no auth, server-side)
    let fundingData = null;
    try {
      const FUNDING_SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','BNBUSDT','ADAUSDT','DOTUSDT','NEARUSDT'];
      const FUNDING_LABELS  = ['BTC','ETH','SOL','DOGE','AVAX','LINK','BNB','ADA','DOT','NEAR'];
      const bybitData = await fetchJson('https://api.bybit.com/v5/market/tickers?category=linear');
      const tickers = bybitData?.result?.list || [];
      const rates = FUNDING_SYMBOLS.map((sym, idx) => {
        const t = tickers.find(x => x.symbol === sym);
        if (!t) return null;
        const rate8h = parseFloat(t.fundingRate) || 0;
        const lastPrice = parseFloat(t.lastPrice) || 0;
        const openInterestVal = parseFloat(t.openInterest) || 0;
        return {
          symbol: FUNDING_LABELS[idx],
          rate8h,
          rateAnnualized: Math.round(rate8h * 3 * 365 * 100) / 100,
          openInterestB: Math.round(openInterestVal * lastPrice / 1e9 * 10) / 10,
          exchange: 'Bybit',
        };
      }).filter(Boolean);
      if (rates.length >= 3) {
        fundingData = { rates, openInterestHistory: null };
      }
    } catch { /* use null — mock fallback on client */ }
    if (!fundingData) {
      fundingData = {
        rates: [
          { symbol: 'BTC',  rate8h: 0.0001, rateAnnualized: 10.95, openInterestB: 18.0, exchange: 'Bybit' },
          { symbol: 'ETH',  rate8h: 0.0001, rateAnnualized: 10.95, openInterestB:  8.0, exchange: 'Bybit' },
        ],
        openInterestHistory: null,
      };
    }

    // 5. BTC on-chain metrics from mempool.space
    let onChainData = null;
    try {
      const fees = mempoolFees.status === 'fulfilled' ? mempoolFees.value : null;
      const diff = mempoolDiff.status === 'fulfilled' ? mempoolDiff.value : null;
      const stats = mempoolStats.status === 'fulfilled' ? mempoolStats.value : null;
      const hr = mempoolHashrate.status === 'fulfilled' ? mempoolHashrate.value : null;

      if (fees || diff || stats || hr) {
        onChainData = {
          fees: fees ? {
            fastest:  fees.fastestFee,
            halfHour: fees.halfHourFee,
            hour:     fees.hourFee,
            economy:  fees.economyFee,
            minimum:  fees.minimumFee,
          } : null,
          mempool: stats ? {
            count: stats.count,
            vsize: Math.round((stats.vsize || 0) / 1e6 * 10) / 10,
          } : null,
          difficulty: diff ? {
            progressPercent:      Math.round((diff.progressPercent ?? 0) * 10) / 10,
            difficultyChange:     Math.round((diff.difficultyChange ?? 0) * 10) / 10,
            remainingBlocks:      diff.remainingBlocks ?? null,
            estimatedRetargetDate: diff.estimatedRetargetDate
              ? new Date(diff.estimatedRetargetDate * 1000).toISOString().split('T')[0]
              : null,
          } : null,
          hashrate: hr?.hashrates ? {
            current: hr.currentHashrate
              ? Math.round(hr.currentHashrate / 1e18 * 10) / 10
              : null,
            history: hr.hashrates.map(h => ({
              timestamp: h.timestamp,
              avgHashrate: Math.round(h.avgHashrate / 1e18 * 10) / 10,
            })),
          } : null,
        };
      }
    } catch { /* use null — mock fallback on client */ }

    const result = {
      coinMarketData: { coins, globalStats },
      fearGreedData,
      defiData,
      fundingData,
      onChainData,
      lastUpdated: today,
    };

    writeDailyCache('crypto', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Crypto API error:', error);
    const fallback = readLatestCache('crypto');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── /api/credit ──────────────────────────────────────────────────────────────
// FRED credit spreads (IG/HY/EM/BBB/CCC) + bank charge-offs + Yahoo ETF quotes
app.get('/api/credit', async (_req, res) => {
  const today = todayStr();
  const daily = readDailyCache('credit');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  const cacheKey = 'credit_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    // ── FRED spreads ─────────────────────────────────────────────────────────
    const CREDIT_SPREAD_SERIES = {
      IG:  'BAMLC0A0CM',
      HY:  'BAMLH0A0HYM2',
      EM:  'BAMLEMCBPIOAS',
      BBB: 'BAMLC0A4CBBB',
      CCC: 'BAMLH0A3HYC',
    };
    const CHARGEOFF_SERIES = {
      commercial: 'DRALACBN',
      consumer:   'DRSFRMACBS',
    };

    let spreadData = null;
    let chargeoffData = null;

    if (FRED_API_KEY) {
      const [spreadResults, chargeoffResults] = await Promise.all([
        Promise.allSettled(
          Object.entries(CREDIT_SPREAD_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, 13)]
          )
        ),
        Promise.allSettled(
          Object.entries(CHARGEOFF_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, 9)]
          )
        ),
      ]);

      const raw = {};
      spreadResults.forEach(r => { if (r.status === 'fulfilled') raw[r.value[0]] = r.value[1]; });

      const igArr  = (raw.IG  || []).slice(-12);
      const hyArr  = (raw.HY  || []).slice(-12);
      const emArr  = (raw.EM  || []).slice(-12);
      const bbbArr = (raw.BBB || []).slice(-12);
      const cccArr = (raw.CCC || []).slice(-1);

      const anchorArr = igArr.length >= 6 ? igArr : hyArr.length >= 6 ? hyArr : null;

      if (anchorArr) {
        spreadData = {
          current: {
            igSpread:  igArr.length  ? Math.round(igArr.at(-1).value)  : null,
            hySpread:  hyArr.length  ? Math.round(hyArr.at(-1).value)  : null,
            emSpread:  emArr.length  ? Math.round(emArr.at(-1).value)  : null,
            bbbSpread: bbbArr.length ? Math.round(bbbArr.at(-1).value) : null,
            cccSpread: cccArr.length ? Math.round(cccArr.at(-1).value) : null,
          },
          history: {
            dates: anchorArr.map(p => dateToMonthLabel(p.date)),
            IG:    igArr.length  === anchorArr.length ? igArr.map(p  => Math.round(p.value)) : anchorArr.map(() => null),
            HY:    hyArr.length  === anchorArr.length ? hyArr.map(p  => Math.round(p.value)) : anchorArr.map(() => null),
            EM:    emArr.length  === anchorArr.length ? emArr.map(p  => Math.round(p.value)) : anchorArr.map(() => null),
            BBB:   bbbArr.length === anchorArr.length ? bbbArr.map(p => Math.round(p.value)) : anchorArr.map(() => null),
          },
          etfs: [], // populated below by Yahoo Finance
        };
      }

      const coRaw = {};
      chargeoffResults.forEach(r => { if (r.status === 'fulfilled') coRaw[r.value[0]] = r.value[1]; });

      const coCommercial = (coRaw.commercial || []).slice(-8);
      const coConsumer   = (coRaw.consumer   || []).slice(-8);
      const coAnchor     = coCommercial.length >= 4 ? coCommercial : coConsumer;

      if (coAnchor.length >= 4) {
        chargeoffData = {
          dates:      coAnchor.map(p => {
            const d = new Date(p.date + 'T00:00:00Z');
            const q = Math.ceil((d.getUTCMonth() + 1) / 3);
            return `Q${q}-${String(d.getUTCFullYear()).slice(2)}`;
          }),
          commercial: coCommercial.map(p => Math.round(p.value * 100) / 100),
          consumer:   coConsumer.map(p   => Math.round(p.value * 100) / 100),
        };
      }
    }

    // ── Yahoo Finance ETFs ────────────────────────────────────────────────────
    const ETF_TICKERS = ['LQD','HYG','EMB','JNK','BKLN','MUB'];
    let etfs = [];
    try {
      const quotes = await Promise.allSettled(ETF_TICKERS.map(t => yf.quote(t)));
      const ETF_META = {
        LQD:  { name: 'iShares IG Corp Bond',   durationYr: 8.4 },
        HYG:  { name: 'iShares HY Corp Bond',   durationYr: 3.6 },
        EMB:  { name: 'iShares EM USD Bond',    durationYr: 7.2 },
        JNK:  { name: 'SPDR HY Bond',           durationYr: 3.4 },
        BKLN: { name: 'Invesco Sr Loan ETF',    durationYr: 0.4 },
        MUB:  { name: 'iShares Natl Muni Bond', durationYr: 6.8 },
      };
      etfs = quotes.map((r, i) => {
        const ticker = ETF_TICKERS[i];
        const q = r.status === 'fulfilled' ? r.value : null;
        const meta = ETF_META[ticker];
        return {
          ticker,
          name:       meta.name,
          price:      q?.regularMarketPrice ?? null,
          change1d:   q?.regularMarketChangePercent ?? null,
          yieldPct:   q?.trailingAnnualDividendYield != null ? q.trailingAnnualDividendYield * 100 : null,
          durationYr: meta.durationYr,
        };
      });
    } catch { /* ETF fetch failed — leave empty */ }

    if (spreadData) spreadData.etfs = etfs;

    // ── Static EM + loan + default data (no clean free live source) ──────────
    const emBondData = {
      countries: [
        { country: 'Brazil',       code: 'BZ', spread: 210, rating: 'BB',  change1m:  -8, yld10y: 7.2, debtGdp:  88 },
        { country: 'Mexico',       code: 'MX', spread: 180, rating: 'BBB', change1m: -12, yld10y: 6.8, debtGdp:  54 },
        { country: 'Indonesia',    code: 'ID', spread: 165, rating: 'BBB', change1m:  -6, yld10y: 6.5, debtGdp:  39 },
        { country: 'South Africa', code: 'ZA', spread: 285, rating: 'BB',  change1m:   4, yld10y: 9.8, debtGdp:  74 },
        { country: 'India',        code: 'IN', spread: 142, rating: 'BBB', change1m:  -4, yld10y: 7.0, debtGdp:  84 },
        { country: 'Turkey',       code: 'TR', spread: 342, rating: 'B+',  change1m:  18, yld10y:12.4, debtGdp:  32 },
        { country: 'Philippines',  code: 'PH', spread: 128, rating: 'BBB', change1m:  -8, yld10y: 5.8, debtGdp:  58 },
        { country: 'Colombia',     code: 'CO', spread: 248, rating: 'BB+', change1m:   6, yld10y: 8.4, debtGdp:  58 },
        { country: 'Egypt',        code: 'EG', spread: 624, rating: 'B-',  change1m: -22, yld10y:18.2, debtGdp:  96 },
        { country: 'Nigeria',      code: 'NG', spread: 512, rating: 'B-',  change1m:  14, yld10y:15.8, debtGdp:  38 },
        { country: 'Saudi Arabia', code: 'SA', spread:  68, rating: 'A+',  change1m:  -2, yld10y: 4.6, debtGdp:  26 },
        { country: 'Chile',        code: 'CL', spread:  98, rating: 'A',   change1m:  -4, yld10y: 5.2, debtGdp:  40 },
      ],
      regions: [
        { region: 'Latin America', avgSpread: 184, change1m:  -3 },
        { region: 'Asia EM',       avgSpread: 145, change1m:  -6 },
        { region: 'EMEA',          avgSpread: 248, change1m:   8 },
        { region: 'Frontier',      avgSpread: 568, change1m:  -4 },
      ],
    };

    const loanData = {
      cloTranches: [
        { tranche: 'AAA', spread: 145, yield: 6.82, rating: 'AAA', ltv: 65 },
        { tranche: 'AA',  spread: 210, yield: 7.47, rating: 'AA',  ltv: 72 },
        { tranche: 'A',   spread: 290, yield: 8.27, rating: 'A',   ltv: 78 },
        { tranche: 'BBB', spread: 420, yield: 9.57, rating: 'BBB', ltv: 83 },
        { tranche: 'BB',  spread: 720, yield:12.07, rating: 'BB',  ltv: 89 },
        { tranche: 'B',   spread:1050, yield:15.37, rating: 'B',   ltv: 94 },
        { tranche: 'Equity', spread: null, yield:18.5, rating: 'NR', ltv:100 },
      ],
      indices: [
        { name: 'BKLN NAV',                 value: etfs.find(e=>e.ticker==='BKLN')?.price ?? 21.84, change1d: etfs.find(e=>e.ticker==='BKLN')?.change1d ?? 0.02, spread: 312 },
        { name: 'CS Lev Loan 100 Index',    value: 96.42, change1d: 0.08, spread: 318 },
        { name: 'LL New Issue Vol ($B YTD)',  value: 142,   change1d: null, spread: null },
        { name: 'Avg Loan Price',             value: 96.8,  change1d: 0.04, spread: null },
      ],
      priceHistory: {
        dates: ['Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
        bkln:  [21.42, 21.54, 21.68, 21.72, 21.78, 21.84],
      },
    };

    const defaultData = {
      rates: [
        { category: 'HY Default Rate (TTM)',      value: 3.8, prev: 4.2, peak: 14.0, unit: '%' },
        { category: 'Loan Default Rate (TTM)',     value: 2.4, prev: 2.8, peak: 10.8, unit: '%' },
        { category: 'HY Distressed Ratio',        value: 8.2, prev: 9.1, peak: 42.0, unit: '%' },
        { category: 'Loans Trading <80c',         value: 5.1, prev: 5.8, peak: 28.0, unit: '%' },
        { category: 'CCC/Split-B % of HY Index',  value:12.4, prev:12.8, peak: 22.0, unit: '%' },
      ],
      chargeoffs: chargeoffData || {
        dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
        commercial: [1.42, 1.38, 1.44, 1.52, 1.48, 1.44, 1.40, 1.36],
        consumer:   [3.84, 3.92, 4.08, 4.22, 4.18, 4.10, 4.02, 3.94],
      },
      defaultHistory: {
        dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
        hy:   [4.8, 4.6, 4.4, 4.2, 4.0, 3.9, 3.8, 3.8],
        loan: [3.4, 3.2, 3.0, 2.8, 2.6, 2.5, 2.4, 2.4],
      },
    };

    // Merge live spread data over mock if FRED succeeded
    const finalSpreadData = spreadData ?? {
      current: { igSpread: 98, hySpread: 342, emSpread: 285, bbbSpread: 138, cccSpread: 842 },
      history: {
        dates: ['Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
        IG:  [ 92, 94, 96, 98,102, 99, 97, 95, 96, 98,100, 98],
        HY:  [312,318,324,330,358,345,338,332,336,340,348,342],
        EM:  [262,268,274,278,298,292,286,280,284,288,292,285],
        BBB: [128,130,132,135,142,139,136,133,135,137,140,138],
      },
      etfs,
    };

    const result = {
      spreadData:  finalSpreadData,
      emBondData,
      loanData,
      defaultData,
      lastUpdated: today,
    };

    writeDailyCache('credit', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Credit API error:', error);
    const fallback = readLatestCache('credit');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── /api/sentiment ────────────────────────────────────────────────────────────
// Fear & Greed (Alt.me + FRED + Yahoo) + CFTC positioning + Risk signals + Cross-asset returns
app.get('/api/sentiment', async (_req, res) => {
  const today = todayStr();
  const daily = readDailyCache('sentiment');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  const cacheKey = 'sentiment_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const fetchJson = (url) => new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 kyahoofinance' } }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });

    // date helpers
    const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

    const RETURN_TICKERS = ['SPY','QQQ','EEM','TLT','GLD','UUP','USO','BTC-USD'];
    const RETURN_LABELS  = ['S&P 500','Nasdaq 100','EM Equities','Long Bonds','Gold','US Dollar','Crude Oil','Bitcoin'];
    const RETURN_CATS    = ['US Equity','US Equity','Global','Fixed Income','Real Assets','Real Assets','Real Assets','Crypto'];

    const CFTC_MARKETS = {
      currencies:  [
        { code: 'EUR', name: 'Euro',          needle: 'EURO FX' },
        { code: 'JPY', name: 'Yen',           needle: 'JAPANESE YEN' },
        { code: 'GBP', name: 'Sterling',      needle: 'BRITISH POUND' },
        { code: 'CAD', name: 'Canadian $',    needle: 'CANADIAN DOLLAR' },
        { code: 'CHF', name: 'Swiss Franc',   needle: 'SWISS FRANC' },
        { code: 'AUD', name: 'Aussie $',      needle: 'AUSTRALIAN DOLLAR' },
      ],
      equities: [
        { code: 'ES',  name: 'E-Mini S&P 500', needle: 'E-MINI S&P 500' },
        { code: 'NQ',  name: 'E-Mini Nasdaq',  needle: 'E-MINI NASDAQ-100' },
      ],
      rates: [
        { code: 'ZN',  name: '10-Yr T-Notes',  needle: '10-YEAR U.S. TREASURY NOTES' },
      ],
      commodities: [
        { code: 'GC',  name: 'Gold',           needle: 'GOLD - COMMODITY EXCHANGE' },
        { code: 'CL',  name: 'Crude Oil',      needle: 'CRUDE OIL, LIGHT SWEET' },
      ],
    };

    const cftcUrl = 'https://publicreporting.cftc.gov/resource/jun7-fc8e.json' +
      '?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,' +
      'noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all' +
      '&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=50';

    const period1 = daysAgo(95);

    // Fire all fetches in parallel
    const [
      altmeResult,
      vixHistResult,
      hyHistResult,
      igLatestResult,
      ycLatestResult,
      cftcResult,
      ...yahooResults
    ] = await Promise.allSettled([
      fetchJson('https://api.alternative.me/fng/?limit=252'),
      FRED_API_KEY ? fetchFredHistory('VIXCLS', 270)        : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('BAMLH0A0HYM2', 270)  : Promise.resolve([]),
      FRED_API_KEY ? fetchFredLatest('BAMLC0A0CM')          : Promise.resolve(null),
      FRED_API_KEY ? fetchFredLatest('T10Y2Y')              : Promise.resolve(null),
      fetchJson(cftcUrl),
      ...RETURN_TICKERS.map(t => yf.historical(t, { period1, period2: today, interval: '1d' })),
    ]);

    // ── Fear & Greed ───────────────────────────────────────────────────────────
    const altme    = altmeResult.status    === 'fulfilled' ? altmeResult.value    : null;
    const vixHist  = vixHistResult.status  === 'fulfilled' ? vixHistResult.value  : [];
    const hyHist   = hyHistResult.status   === 'fulfilled' ? hyHistResult.value   : [];
    const igLatest = igLatestResult.status === 'fulfilled' ? igLatestResult.value : null;
    const ycLatest = ycLatestResult.status === 'fulfilled' ? ycLatestResult.value : null;

    const altmeScore  = altme?.data?.[0]?.value != null ? Number(altme.data[0].value) : 50;
    const altmeHistory = (altme?.data || []).map(d => ({
      date:  d.timestamp ? new Date(Number(d.timestamp) * 1000).toISOString().split('T')[0] : d.date,
      value: Number(d.value),
    })).reverse(); // oldest first

    const vixCloses   = vixHist.slice(-252).map(p => p.value).filter(Boolean);
    const hyCloses    = hyHist.slice(-252).map(p => p.value).filter(Boolean);
    const currentVix  = vixCloses.at(-1) ?? null;
    const currentHy   = hyCloses.at(-1)  ?? null;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const vixPercentile  = currentVix != null && vixCloses.length > 20
      ? Math.round(vixCloses.filter(v => v <= currentVix).length / vixCloses.length * 100)
      : 50;
    const hyPercentile   = currentHy != null && hyCloses.length > 20
      ? Math.round(hyCloses.filter(v => v <= currentHy).length / hyCloses.length * 100)
      : 50;

    // Yahoo SPY for momentum: already in yahooResults[0]
    const spyHist    = yahooResults[0].status === 'fulfilled' ? yahooResults[0].value : [];
    const spyCloses  = spyHist.map(d => d.close).filter(Boolean);
    const spy1mReturn = spyCloses.length >= 2
      ? Math.round(((spyCloses.at(-1) / spyCloses[0]) - 1) * 1000) / 10
      : 0;

    const vixSignal      = 100 - vixPercentile;
    const hySignal       = 100 - hyPercentile;
    const ycVal          = ycLatest ?? 0;
    const ycSignal       = clamp(Math.round((ycVal + 1) / 2 * 100), 0, 100);
    const momentumSignal = clamp(Math.round((spy1mReturn + 10) / 20 * 100), 0, 100);

    const composite = Math.round(
      altmeScore * 0.30 + vixSignal * 0.25 + hySignal * 0.20 + momentumSignal * 0.15 + ycSignal * 0.10
    );

    function scoreLabel(s) {
      if (s <= 25) return 'Extreme Fear';
      if (s <= 45) return 'Fear';
      if (s <= 55) return 'Neutral';
      if (s <= 75) return 'Greed';
      return 'Extreme Greed';
    }
    function indSignal(s) {
      return s >= 60 ? 'greed' : s <= 40 ? 'fear' : 'neutral';
    }

    const fearGreedData = {
      score:      composite,
      label:      scoreLabel(composite),
      altmeScore,
      history:    altmeHistory.slice(-252),
      indicators: [
        { name: 'Alt.me F&G',   value: altmeScore,    signal: indSignal(altmeScore),    percentile: null },
        { name: 'VIX Level',    value: currentVix != null ? Math.round(currentVix * 10) / 10 : null, signal: indSignal(vixSignal),  percentile: vixPercentile },
        { name: 'HY Spread',    value: currentHy  != null ? Math.round(currentHy)  : null,           signal: indSignal(hySignal),   percentile: hyPercentile },
        { name: 'Yield Curve',  value: ycLatest  != null ? Math.round(ycLatest * 100) / 100 : null,  signal: indSignal(ycSignal)   },
        { name: 'SPY Momentum', value: spy1mReturn,   signal: indSignal(momentumSignal) },
      ],
    };

    // ── CFTC Positioning ──────────────────────────────────────────────────────
    const cftcRows = cftcResult.status === 'fulfilled' ? cftcResult.value : [];
    function parseCftcGroup(defs) {
      const asOf = cftcRows[0]?.report_date_as_yyyy_mm_dd ?? null;
      return {
        asOf,
        items: defs.map(def => {
          const row = cftcRows.find(r => r.market_and_exchange_names?.includes(def.needle));
          if (!row) return { ...def, netPct: 0, longK: 0, shortK: 0, oiK: 0 };
          const long  = parseFloat(row.noncomm_positions_long_all)  || 0;
          const short = parseFloat(row.noncomm_positions_short_all) || 0;
          const oi    = parseFloat(row.open_interest_all)            || 1;
          return {
            code:   def.code,
            name:   def.name,
            netPct: Math.round((long - short) / oi * 100 * 10) / 10,
            longK:  Math.round(long  / 1000),
            shortK: Math.round(short / 1000),
            oiK:    Math.round(oi    / 1000),
          };
        }),
      };
    }

    const currParsed = parseCftcGroup(CFTC_MARKETS.currencies);
    const cftcData = {
      asOf:        currParsed.asOf,
      currencies:  currParsed.items,
      equities:    parseCftcGroup(CFTC_MARKETS.equities).items,
      rates:       parseCftcGroup(CFTC_MARKETS.rates).items,
      commodities: parseCftcGroup(CFTC_MARKETS.commodities).items,
    };

    // ── Risk Dashboard ─────────────────────────────────────────────────────────
    // GLD = RETURN_TICKERS[4], UUP = [5], EEM = [2], SPY = [0]
    function get1mReturn(idx) {
      const hist = yahooResults[idx].status === 'fulfilled' ? yahooResults[idx].value : [];
      const closes = hist.map(d => d.close).filter(Boolean);
      if (closes.length < 2) return null;
      return Math.round(((closes.at(-1) / closes[0]) - 1) * 1000) / 10;
    }

    const gldRet  = get1mReturn(4);
    const uupRet  = get1mReturn(5);
    const eemRet  = get1mReturn(2);
    const spyRet  = spy1mReturn; // already computed

    const goldVsUsd   = gldRet != null && uupRet != null ? Math.round((gldRet - uupRet) * 10) / 10 : null;
    const emVsUs      = eemRet != null ? Math.round((eemRet - spyRet) * 10) / 10 : null;
    const igSpread    = igLatest ?? null;
    const hySpread    = currentHy ?? null;
    const vixValue    = currentVix ?? null;
    const yieldCurve  = ycLatest ?? null;

    function riskSignal(name, value) {
      if (name === 'Yield Curve')      return value == null ? 'neutral' : value > 0.5 ? 'risk-on' : value < -0.5 ? 'risk-off' : 'neutral';
      if (name === 'HY Credit Spread') return value == null ? 'neutral' : value < 350 ? 'risk-on' : value > 500 ? 'risk-off' : 'neutral';
      if (name === 'IG Credit Spread') return value == null ? 'neutral' : value < 100 ? 'risk-on' : value > 150 ? 'risk-off' : 'neutral';
      if (name === 'VIX')             return value == null ? 'neutral' : value < 15 ? 'risk-on' : value > 25 ? 'risk-off' : 'neutral';
      if (name === 'Gold vs USD')     return value == null ? 'neutral' : value > 2 ? 'risk-off' : value < -2 ? 'risk-on' : 'neutral';
      if (name === 'EM vs US Equities') return value == null ? 'neutral' : value > 2 ? 'risk-on' : value < -2 ? 'risk-off' : 'neutral';
      return 'neutral';
    }
    function riskDesc(name, value, signal) {
      if (name === 'Yield Curve')      return signal === 'risk-on' ? 'Normal — growth expected' : signal === 'risk-off' ? 'Inverted — recession signal' : 'Flat — uncertain';
      if (name === 'HY Credit Spread') return signal === 'risk-on' ? 'Compressed — risk-on' : signal === 'risk-off' ? 'Wide — stress signal' : 'Elevated — caution';
      if (name === 'IG Credit Spread') return signal === 'risk-on' ? 'Tight — confidence' : signal === 'risk-off' ? 'Wide — risk-off' : 'Moderate';
      if (name === 'VIX')             return signal === 'risk-on' ? 'Low vol — complacency' : signal === 'risk-off' ? 'Elevated fear' : 'Moderate uncertainty';
      if (name === 'Gold vs USD')     return signal === 'risk-off' ? 'Gold bid — safe haven' : signal === 'risk-on' ? 'Dollar bid — risk appetite' : 'Mixed signals';
      if (name === 'EM vs US Equities') return signal === 'risk-on' ? 'EM outperforming — global risk-on' : signal === 'risk-off' ? 'EM lagging — flight to quality' : 'Mixed';
      return '';
    }
    function riskFmt(name, value) {
      if (value == null) return '—';
      if (name === 'HY Credit Spread' || name === 'IG Credit Spread') return `${Math.round(value)}bps`;
      if (name === 'Yield Curve') return `${value.toFixed(2)}%`;
      if (name === 'VIX') return value.toFixed(1);
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    }

    const rawSignals = [
      { name: 'Yield Curve',       value: yieldCurve },
      { name: 'HY Credit Spread',  value: hySpread },
      { name: 'IG Credit Spread',  value: igSpread },
      { name: 'VIX',               value: vixValue },
      { name: 'Gold vs USD',       value: goldVsUsd },
      { name: 'EM vs US Equities', value: emVsUs },
    ];

    const signals = rawSignals.map(s => {
      const sig = riskSignal(s.name, s.value);
      return { name: s.name, value: s.value, signal: sig, description: riskDesc(s.name, s.value, sig), fmt: riskFmt(s.name, s.value) };
    });

    const scoreMap = { 'risk-on': 100, neutral: 50, 'risk-off': 0 };
    const overallScore = Math.round(signals.reduce((sum, s) => sum + scoreMap[s.signal], 0) / signals.length);
    const overallLabel = overallScore >= 65 ? 'Risk-On' : overallScore <= 35 ? 'Risk-Off' : 'Neutral';

    const riskData = { overallScore, overallLabel, signals };

    // ── Cross-Asset Returns ────────────────────────────────────────────────────
    const assets = RETURN_TICKERS.map((ticker, idx) => {
      const hist   = yahooResults[idx].status === 'fulfilled' ? yahooResults[idx].value : [];
      const closes = hist.map(d => d.close).filter(Boolean);
      const pct = (a, b) => a != null && b != null && b !== 0 ? Math.round((a / b - 1) * 10000) / 100 : null;
      return {
        ticker,
        label:    RETURN_LABELS[idx],
        category: RETURN_CATS[idx],
        ret1d:  closes.length >= 2  ? pct(closes.at(-1), closes.at(-2))  : null,
        ret1w:  closes.length >= 6  ? pct(closes.at(-1), closes.at(-6))  : null,
        ret1m:  closes.length >= 22 ? pct(closes.at(-1), closes.at(-22)) : null,
        ret3m:  closes.length >= 2  ? pct(closes.at(-1), closes[0])      : null,
      };
    });

    const returnsData = { asOf: today, assets };

    const result = { fearGreedData, cftcData, riskData, returnsData, lastUpdated: today };

    writeDailyCache('sentiment', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Sentiment API error:', error);
    const fallback = readLatestCache('sentiment');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Quote Summary: data/stocks/ first (ohlcv format has .summary), then live Yahoo ---
app.get('/api/summary/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const region = req.query.region || '';
  const cacheKey = `summary_${ticker}`;
  const memCached = cache.get(cacheKey);
  if (memCached) return res.json(memCached);

  // Try resolved file (handles exchange suffixes)
  const resolved = readBestFile(ticker, region);
  if (resolved?.data?.summary) {
    cache.set(cacheKey, resolved.data.summary, 1800);
    return res.json(resolved.data.summary);
  }
  // Also try bare ticker in data/stocks/
  const local = readLocalData(ticker);
  if (local?.summary) {
    cache.set(cacheKey, local.summary, 1800);
    return res.json(local.summary);
  }

  // Fall back to live Yahoo
  try {
    const data = await yf.quoteSummary(ticker, {
      modules: ['financialData','defaultKeyStatistics','earningsTrend',
                'recommendationTrend','majorHoldersBreakdown',
                'incomeStatementHistory','cashflowStatementHistory','balanceSheetHistory']
    });
    cache.set(cacheKey, data, 1800);
    res.json(data);
  } catch (error) {
    console.error(`Summary error for ${ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Historical Prices: resolver → data/stocks/ → prices/ → live Yahoo ---
app.get('/api/history/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const period = req.query.period || '1y';
  const region = req.query.region || '';
  const cacheKey = `history_${ticker}_${period}_${region}`;
  const memCached = cache.get(cacheKey);
  if (memCached) return res.json(memCached);

  const cutoffStr = periodCutoff(period);

  // Try resolved file (handles exchange suffixes for Asian/European markets)
  const resolved = readBestFile(ticker, region);
  if (resolved) {
    let rows;
    if (resolved.format === 'ohlcv' && resolved.data?.history?.length) {
      rows = resolved.data.history.filter(d => d.date >= cutoffStr);
    } else if (resolved.format === 'compact' && resolved.data?.t?.length) {
      rows = adaptCompact(resolved.data, cutoffStr);
    }
    if (rows?.length) {
      cache.set(cacheKey, rows, 3600);
      return res.json(rows);
    }
  }

  // Fall back to live Yahoo
  try {
    const end = new Date();
    const start = new Date();
    if (period === '5y') start.setFullYear(start.getFullYear() - 5);
    else if (period === '3y') start.setFullYear(start.getFullYear() - 3);
    else if (period === '3m') start.setMonth(start.getMonth() - 3);
    else start.setFullYear(start.getFullYear() - 1);

    const data = await yf.historical(ticker, {
      period1: start.toISOString().split('T')[0],
      period2: end.toISOString().split('T')[0],
      interval: '1d',
    });

    const result = data.map(d => ({
      date: d.date instanceof Date ? d.date.toISOString().split('T')[0] : String(d.date),
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
      volume: d.volume,
    }));

    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error) {
    console.error(`History error for ${ticker}:`, error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- Snapshot: close prices at a historical date (for time travel treemap) ---
// GET /api/snapshot?date=2022-06-15
// Returns { ticker: closePrice } for all indexed tickers nearest to the requested date
app.get('/api/snapshot', async (req, res) => {
  const { date } = req.query;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date param required (YYYY-MM-DD)' });
  }

  if (!snapshotIndex) {
    buildSnapshotIndex(); // kick off async build
    return res.status(202).json({ building: true, message: 'Index building, retry in a few seconds' });
  }

  const result = {};
  for (const [ticker, series] of Object.entries(snapshotIndex)) {
    if (!series?.length) continue;
    // Binary-search for nearest date
    let lo = 0, hi = series.length - 1, best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (series[mid].date <= date) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    result[ticker] = series[best].close;
  }
  res.json(result);
});

// --- Macro Events Calendar ---
const CB_SCHEDULE = {
  Fed: { dates: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'], fredSeries: 'FEDFUNDS' },
  ECB: { dates: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'], fredSeries: 'ECBDFR' },
  BOE: { dates: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'], fredSeries: 'BOERUKQ' },
  BOJ: { dates: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'], fredSeries: null },
};

const EARNINGS_CAL_TICKERS = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','JPM','GS','BAC','WFC',
  'XOM','CVX','UNH','LLY','JNJ','PG','WMT','HD','COST','NFLX',
  'TSLA','V','MA','AVGO','CRM','ORCL','ADBE','AMD','INTC','PEP',
];
const EARNINGS_CAL_META = {
  AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', AMZN: 'Amazon', META: 'Meta',
  GOOGL: 'Alphabet', JPM: 'JPMorgan', GS: 'Goldman Sachs', BAC: 'Bank of America',
  WFC: 'Wells Fargo', XOM: 'ExxonMobil', CVX: 'Chevron', UNH: 'UnitedHealth',
  LLY: 'Eli Lilly', JNJ: 'J&J', PG: 'P&G', WMT: 'Walmart', HD: 'Home Depot',
  COST: 'Costco', NFLX: 'Netflix', TSLA: 'Tesla', V: 'Visa', MA: 'Mastercard',
  AVGO: 'Broadcom', CRM: 'Salesforce', ORCL: 'Oracle', ADBE: 'Adobe',
  AMD: 'AMD', INTC: 'Intel', PEP: 'PepsiCo',
};

const MAJOR_FRED_RELEASES = {
  10:  { name: 'CPI', category: 'inflation' },
  46:  { name: 'PPI', category: 'inflation' },
  53:  { name: 'GDP', category: 'growth' },
  50:  { name: 'Employment Situation', category: 'employment' },
  103: { name: 'Retail Sales', category: 'consumer' },
  13:  { name: 'PCE Price Index', category: 'inflation' },
  82:  { name: 'Consumer Confidence', category: 'sentiment' },
  14:  { name: 'Industrial Production', category: 'growth' },
  205: { name: 'Housing Starts', category: 'housing' },
  58:  { name: 'ISM Manufacturing', category: 'growth' },
};

app.get('/api/calendar', async (req, res) => {
  const cacheKey = 'calendar_data';
  const today = todayStr();

  const daily = readDailyCache('calendar');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const plus30d = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })();

    const [econResult, cbRatesResult, earningsResult, releasesResult] = await Promise.allSettled([
      // 1. Econdb economic calendar
      fetchJSON(`https://www.econdb.com/api/calendar/events/?date_from=${today}&date_to=${plus30d}&importance=2&format=json`)
        .then(data => {
          const events = Array.isArray(data) ? data : (data?.results || []);
          return events
            .filter(e => e.importance >= 2)
            .slice(0, 50)
            .map(e => ({
              date: (e.date || '').split('T')[0],
              country: e.country || e.iso || '',
              event: e.event || e.indicator || '',
              actual: e.actual ?? null,
              expected: e.consensus ?? e.forecast ?? null,
              previous: e.previous ?? null,
              importance: e.importance || 2,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }),

      // 2. Central bank rates from FRED
      Promise.allSettled(
        Object.entries(CB_SCHEDULE).map(async ([bank, cfg]) => {
          let rate = null;
          let previousRate = null;
          if (cfg.fredSeries && FRED_API_KEY) {
            try {
              const hist = await fetchFredHistory(cfg.fredSeries, 3);
              if (hist.length >= 1) rate = hist.at(-1).value;
              if (hist.length >= 2) previousRate = hist.at(-2).value;
            } catch { /* use null */ }
          }
          if (bank === 'BOJ' && rate == null) { rate = 0.50; previousRate = 0.25; }
          const nowDate = today;
          const nextMeeting = cfg.dates.find(d => d >= nowDate) || cfg.dates.at(-1);
          const daysUntil = nextMeeting ? Math.round((new Date(nextMeeting) - new Date(nowDate)) / 86400000) : null;
          return { bank, rate, nextMeeting, daysUntil, previousRate };
        })
      ).then(results => results.filter(r => r.status === 'fulfilled').map(r => r.value)),

      // 3. Earnings season from Yahoo Finance
      Promise.allSettled(
        EARNINGS_CAL_TICKERS.map(t =>
          yf.quoteSummary(t, { modules: ['calendarEvents', 'defaultKeyStatistics'] })
            .then(d => ({ ticker: t, ...d }))
        )
      ).then(results => {
        const now = new Date();
        const limit = new Date(now); limit.setDate(limit.getDate() + 60);
        const entries = [];
        results.forEach(r => {
          if (r.status !== 'fulfilled') return;
          const s = r.value;
          const ed = s.calendarEvents?.earnings?.earningsDate?.[0];
          if (!ed) return;
          const edDate = new Date(ed);
          if (edDate < now || edDate > limit) return;
          entries.push({
            ticker: s.ticker,
            name: EARNINGS_CAL_META[s.ticker] || s.ticker,
            date: typeof ed === 'string' ? ed.split('T')[0] : edDate.toISOString().split('T')[0],
            epsEst: s.calendarEvents?.earnings?.earningsAverage ?? null,
            epsPrev: s.defaultKeyStatistics?.trailingEps ?? null,
            marketCapB: s.defaultKeyStatistics?.marketCap ? Math.round(s.defaultKeyStatistics.marketCap / 1e9) : null,
          });
        });
        entries.sort((a, b) => a.date.localeCompare(b.date));
        return entries;
      }),

      // 4. Key FRED releases
      FRED_API_KEY
        ? fetchJSON(`https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&limit=200`)
            .then(data => {
              const dates = data?.release_dates || [];
              const majorIds = Object.keys(MAJOR_FRED_RELEASES).map(Number);
              return dates
                .filter(d => majorIds.includes(d.release_id) && d.date >= today)
                .map(d => {
                  const info = MAJOR_FRED_RELEASES[d.release_id];
                  return { name: info.name, date: d.date, category: info.category, previousValue: null };
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 20);
            })
        : Promise.resolve([]),
    ]);

    const result = {
      economicEvents: econResult.status === 'fulfilled' ? econResult.value : [],
      centralBanks:   cbRatesResult.status === 'fulfilled' ? cbRatesResult.value : [],
      earningsSeason: earningsResult.status === 'fulfilled' ? earningsResult.value : [],
      keyReleases:    releasesResult.status === 'fulfilled' ? releasesResult.value : [],
      lastUpdated: today,
    };

    writeDailyCache('calendar', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Calendar API error:', error);
    const fallback = readLatestCache('calendar');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- FX Market Data (FRED bilateral rates) ---
app.get('/api/fx', async (req, res) => {
  const cacheKey = 'fx_data';
  const today = todayStr();

  const daily = readDailyCache('fx');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    let fredFxRates = null;
    if (FRED_API_KEY) {
      try {
        const FRED_FX_SERIES = {
          eurUsd:      'DEXUSEU',
          usdJpy:      'DEXJPUS',
          gbpUsd:      'DEXUSUK',
          usdChf:      'DEXSZUS',
          usdCad:      'DEXCAUS',
          audUsd:      'DEXUSAL',
          dollarIndex: 'DTWEXBGS',
        };
        const entries = Object.entries(FRED_FX_SERIES);
        const results = await Promise.allSettled(
          entries.map(([key, sid]) => fetchFredHistory(sid, 252).then(hist => [key, hist]))
        );
        const rates = {};
        results.forEach(r => {
          if (r.status === 'fulfilled') {
            const [key, hist] = r.value;
            if (hist.length >= 10) {
              rates[key] = {
                dates: hist.map(p => p.date),
                values: hist.map(p => Math.round(p.value * 10000) / 10000),
              };
            }
          }
        });
        if (Object.keys(rates).length >= 3) fredFxRates = rates;
      } catch { /* use null */ }
    }

    const result = {
      fredFxRates: fredFxRates ?? null,
      lastUpdated: today,
    };

    writeDailyCache('fx', result);
    cache.set(cacheKey, result, 900);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('FX API error:', error);
    const fallback = readLatestCache('fx');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Kick off index build at startup (non-blocking)
buildSnapshotIndex();

app.listen(port, () => {
  const files = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).length : 0;
  console.log(`Global Macro Backend running at http://localhost:${port}`);
  console.log(`  Local data cache: ${files} tickers in ${DATA_DIR}`);
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro  /api/insurance  /api/commodities  /api/fx  /api/summary/:t  /api/history/:t`);
});
