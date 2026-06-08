// US Treasury TIC — Major Foreign Holders of Treasury Securities.
//
// Treasury Fiscal Data does NOT expose TIC; the data only ships as a
// fixed-width / tab-delimited text file at ticdata.treasury.gov.
// `mfhhis01.txt` carries the current 12-month rolling table (older data
// is in `mfhhis02.txt`, `mfhhis03.txt`, ...).
//
// Format (tab-delimited, with leading whitespace lines for the header):
//   <empty>\tDec\tNov\tOct\tSep\t...\tJan\t<empty>
//   Country\t2025\t2025\t2025\t...\t2025\t
//   <empty>\t-----\t-----\t...\t
//   <country name>\t<value>\t<value>\t...\t<value>
import https from 'https';
import { Router } from 'express';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const TIC_URL = 'https://ticdata.treasury.gov/Publish/mfhhis01.txt';

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'kyahoofinance-researcher (Educational Sandbox)' } }, (res) => {
      if (res.statusCode >= 400) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve(body));
    }).on('error', reject);
  });
}

async function fetchMFH() {
  trackApiCall('Treasury TIC');
  const text = await fetchText(TIC_URL);
  const lines = text.split('\n');

  // Locate header rows: first line whose tab-split has month abbreviations,
  // followed by a year row, followed by the divider, followed by data.
  let monthIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const cells = lines[i].split('\t').map(s => s.trim());
    if (cells.some(c => /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$/i.test(c))) {
      monthIdx = i; break;
    }
  }
  if (monthIdx < 0) return [];
  const months = lines[monthIdx].split('\t').map(s => s.trim());
  const years  = (lines[monthIdx + 1] || '').split('\t').map(s => s.trim());
  // Build column → period (e.g. "2025-12")
  const monthMap = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
  const periodPerCol = months.map((m, i) => {
    if (!monthMap[m]) return null;
    const y = years[i] || '';
    return /^\d{4}$/.test(y) ? `${y}-${monthMap[m]}` : null;
  });

  // Data rows start a few lines below the divider. Skip blank lines.
  // The file concatenates multiple sub-tables (Total Securities, T-Bills,
  // Bonds & Notes, etc.) — each ends with a "Grand Total" row. Stop at
  // the first Grand Total so we only return the headline "Total Securities"
  // section.
  const out = [];
  for (let i = monthIdx + 3; i < lines.length; i++) {
    const cells = lines[i].split('\t').map(s => s.trim());
    if (cells.length < 5) continue;
    // Country names sometimes carry stray quote chars from the file's
    // CSV-ish quoting around values that contain commas (e.g. "China, Mainland").
    const country = cells[0].replace(/^"|"$/g, '');
    if (!country) continue;
    if (/^Grand Total/i.test(country)) break;
    if (/^Total/i.test(country) || /^Of which/i.test(country)) continue;
    const series = [];
    for (let c = 1; c < cells.length; c++) {
      const period = periodPerCol[c];
      if (!period) continue;
      const v = cells[c].replace(/,/g, '');
      const num = v === '' || v === '-' ? null : Number(v);
      if (Number.isNaN(num)) continue;
      series.push({ period, holdingsB: num });
    }
    if (series.length) out.push({ country, history: series });
  }
  return out;
}

router.get('/', async (_req, res) => {
  const cached = readDailyCache('treasuryTIC');
  if (cached) return res.json(cached);

  const today = todayStr();
  let parsed = null;
  try { parsed = await fetchMFH(); } catch (e) { console.warn('[TIC] MFH:', e.message); }

  let latest = null, history = null;
  if (parsed && parsed.length) {
    // For each country, pick the latest period observation.
    latest = parsed
      .map(c => {
        const last = c.history[0]; // history is left-to-right newest-first per the file's column order
        return { country: c.country, period: last?.period, holdingsB: last?.holdingsB };
      })
      .filter(r => r.holdingsB != null)
      .sort((a, b) => b.holdingsB - a.holdingsB);
    // 12-month history for top 10 holders
    const top10 = new Set(latest.slice(0, 10).map(r => r.country));
    history = {};
    for (const c of parsed) {
      if (top10.has(c.country)) {
        history[c.country] = c.history.slice().reverse(); // chronological order
      }
    }
  }

  const _sources = { treasuryTIC: !!(latest && latest.length) };
  const isLive = _sources.treasuryTIC;

  const result = {
    latest,
    history,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('treasuryTIC', result);
  else {
    const fallback = readLatestCache('treasuryTIC');
    if (fallback) return res.json({ ...fallback.data, isCurrent: false, fetchedOn: fallback.fetchedOn });
  }
  res.json(result);
});

export default router;
