import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR   = path.join(__dirname, '..', '..', 'data', 'stocks');
export const PRICES_DIR = path.join(__dirname, '..', '..', 'prices');

// Exchange suffix map: stockUniverse region name → Yahoo exchange suffix
export const REGION_SUFFIX = {
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
export const NORDIC_SUFFIXES = ['ST', 'HE', 'CO'];

// Build candidate file paths for a ticker + region
export function resolveCandidates(ticker, region) {
  const suffix = REGION_SUFFIX[region];
  const candidates = [];

  const tryBoth = (sfx) => {
    candidates.push({ dir: DATA_DIR,   name: `${ticker}_${sfx}.json`, format: 'ohlcv' });
    candidates.push({ dir: PRICES_DIR, name: `${ticker}.${sfx}.json`, format: 'compact' });
  };

  if (suffix) {
    tryBoth(suffix);
    if (region === 'Nasdaq Nordic') NORDIC_SUFFIXES.filter(s => s !== suffix).forEach(tryBoth);
  }
  candidates.push({ dir: DATA_DIR,   name: `${ticker}.json`, format: 'ohlcv' });
  candidates.push({ dir: PRICES_DIR, name: `${ticker}.json`, format: 'compact' });

  return candidates;
}

// Read first existing candidate file; return { data, format }
export function readBestFile(ticker, region) {
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
export function adaptCompact(compact, cutoffDate) {
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

export function periodCutoff(period) {
  const d = new Date();
  if (period === '5y') d.setFullYear(d.getFullYear() - 5);
  else if (period === '3y') d.setFullYear(d.getFullYear() - 3);
  else if (period === '3m') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

export function readLocalData(ticker) {
  const p = path.join(DATA_DIR, `${ticker}.json`);
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { /* ignore */ }
  return null;
}

// ── Snapshot index (lazy-built for time travel) ──────────────────────────────
export let snapshotIndex = null;
export let snapshotBuilding = false;

export async function buildSnapshotIndex() {
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
