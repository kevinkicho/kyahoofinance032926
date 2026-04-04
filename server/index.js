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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR   = path.join(__dirname, '..', 'data', 'stocks');
const PRICES_DIR = path.join(__dirname, '..', 'prices');

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
  IG: 'BAMLC0A0CM', HY: 'BAMLH0A0HYM2', EM: 'BAMLEMCBPIOAS',
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
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

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
    const igArr = (spreadRaw.IG  || []).slice(-12);
    const hyArr = (spreadRaw.HY  || []).slice(-12);
    const emArr = (spreadRaw.EM  || []).slice(-12);
    const anchorArr = igArr.length === 12 ? igArr : (hyArr.length === 12 ? hyArr : []);
    const spreadData = anchorArr.length === 12 ? {
      dates: anchorArr.map(p => dateToMonthLabel(p.date)),
      IG:    igArr.length === 12 ? igArr.map(p => Math.round(p.value)) : anchorArr.map(() => null),
      HY:    hyArr.length === 12 ? hyArr.map(p => Math.round(p.value)) : anchorArr.map(() => null),
      EM:    emArr.length === 12 ? emArr.map(p => Math.round(p.value)) : anchorArr.map(() => null),
    } : null;

    const result = {
      yieldCurveData,
      spreadData,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, 900);
    res.json(result);
  } catch (error) {
    console.error('Bonds API error:', error);
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
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // 1. VIX term structure
    const vixQuotes = await yf.quote(VIX_TICKERS).catch(() => []);
    const vixArr = Array.isArray(vixQuotes) ? vixQuotes : [vixQuotes];
    const vixTermStructure = VIX_LABELS.length === vixArr.length && vixArr.every(q => q?.regularMarketPrice) ? {
      dates:      VIX_LABELS,
      values:     vixArr.map(q => Math.round(q.regularMarketPrice * 10) / 10),
      prevValues: vixArr.map(q => Math.round((q.regularMarketPreviousClose ?? q.regularMarketPrice) * 10) / 10),
    } : null;

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

    // 3. Fear & Greed — compute from VIX + SPY momentum + TLT + FRED HY OAS
    let fearGreedData = null;
    try {
      const vixValue = vixArr.find(q => q.symbol === '^VIX')?.regularMarketPrice;
      if (vixValue == null || isNaN(vixValue)) throw new Error('VIX price unavailable');
      const [spyHist, tltHist] = await Promise.all([
        yf.historical('^GSPC', { period1: (() => { const d = new Date(); d.setDate(d.getDate() - 180); return d.toISOString().split('T')[0]; })(), period2: new Date().toISOString().split('T')[0], interval: '1d' }),
        yf.historical('TLT',   { period1: (() => { const d = new Date(); d.setDate(d.getDate() - 30);  return d.toISOString().split('T')[0]; })(), period2: new Date().toISOString().split('T')[0], interval: '1d' }),
      ]);

      let hyOasLatest = null;
      if (FRED_API_KEY) {
        try { hyOasLatest = await fetchFredLatest('BAMLH0A0HYM2'); } catch {}
      }

      // SPY: current price vs 125-day SMA
      const spyCloses = spyHist.map(d => d.close).filter(Boolean);
      const spyCurrent = spyCloses[spyCloses.length - 1];
      const sma125 = spyCloses.slice(-125).reduce((s, v) => s + v, 0) / Math.min(125, spyCloses.length);
      const spyPctAbove = ((spyCurrent - sma125) / sma125) * 100;

      // TLT vs SPY 20-day return
      const tltCloses = tltHist.map(d => d.close).filter(Boolean);
      const tlt20 = tltCloses.length >= 21 ? ((tltCloses[tltCloses.length - 1] - tltCloses[tltCloses.length - 21]) / tltCloses[tltCloses.length - 21]) * 100 : 0;
      const spy20start = spyCloses.length >= 20 ? spyCloses[spyCloses.length - 21] : spyCloses[0];
      const spy20 = ((spyCurrent - spy20start) / spy20start) * 100;
      const tltRelPerf = tlt20 - spy20; // positive = bonds outperforming = fear

      // SPY options put/call ratio
      let pcr = 1.0; // neutral default
      if (optionsFlow) {
        const spyPuts  = optionsFlow.filter(r => r.ticker === 'SPY' && r.type === 'P').reduce((s, r) => s + r.volume, 0);
        const spyCalls = optionsFlow.filter(r => r.ticker === 'SPY' && r.type === 'C').reduce((s, r) => s + r.volume, 0);
        if (spyCalls > 0) pcr = spyPuts / spyCalls;
      }

      const indicators = [
        { name: 'VIX Level',          value: Math.round(vixValue * 10) / 10,       score: vixScore(vixValue),            label: scoreLabel(vixScore(vixValue)) },
        { name: 'Put/Call Ratio',      value: Math.round(pcr * 100) / 100,          score: pcrScore(pcr),                 label: scoreLabel(pcrScore(pcr)) },
        { name: 'Market Momentum',     value: Math.round(spyPctAbove * 10) / 10,    score: momentumScore(spyPctAbove),    label: scoreLabel(momentumScore(spyPctAbove)) },
        { name: 'Safe Haven Demand',   value: Math.round(tltRelPerf * 10) / 10,     score: safeHavenScore(tltRelPerf),    label: scoreLabel(safeHavenScore(tltRelPerf)) },
        { name: 'Junk Bond Demand',    value: hyOasLatest ?? 350,                   score: hyOasLatest ? junkBondScore(hyOasLatest) : 50, label: scoreLabel(hyOasLatest ? junkBondScore(hyOasLatest) : 50) },
        { name: 'Market Breadth',      value: 42.1, score: 41, label: 'Fear' },    // no free breadth API
        { name: 'Stock Price Strength',value: 18.0, score: 55, label: 'Neutral' }, // no free 52wk high data
      ];
      const avgScore = Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
      fearGreedData = { score: avgScore, label: scoreLabel(avgScore), indicators };
    } catch { /* use mock */ }

    // 4. Vol surface from SPY options
    let volSurfaceData = null;
    try {
      const spyQuote = await yf.quote('SPY');
      if (!spyQuote?.regularMarketPrice) throw new Error('SPY price unavailable');
      volSurfaceData = await buildVolSurface(spyQuote.regularMarketPrice);
    } catch { /* use mock */ }

    const result = {
      vixTermStructure,
      optionsFlow,
      fearGreedData,
      volSurfaceData,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, 900);
    res.json(result);
  } catch (error) {
    console.error('Derivatives API error:', error);
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
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

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

    const result = { reitData, priceIndexData, lastUpdated: new Date().toISOString().split('T')[0] };
    cache.set(cacheKey, result, 900);
    res.json(result);
  } catch (error) {
    console.error('Real Estate API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Insurance Dashboard ---
const INSURER_TICKERS = ['PGR', 'ALL', 'TRV', 'HIG'];
const INSURER_NAMES = { PGR: 'Progressive', ALL: 'Allstate', TRV: 'Travelers', HIG: 'Hartford' };

app.get('/api/insurance', async (req, res) => {
  const cacheKey = 'insurance_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

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
    lastUpdated: new Date().toISOString().split('T')[0],
  };

  cache.set(cacheKey, result, 900);
  res.json(result);
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

// Kick off index build at startup (non-blocking)
buildSnapshotIndex();

app.listen(port, () => {
  const files = fs.existsSync(DATA_DIR) ? fs.readdirSync(DATA_DIR).length : 0;
  console.log(`Global Macro Backend running at http://localhost:${port}`);
  console.log(`  Local data cache: ${files} tickers in ${DATA_DIR}`);
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro  /api/insurance  /api/summary/:t  /api/history/:t`);
});
