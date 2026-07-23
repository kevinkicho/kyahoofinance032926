// Federal Reserve System data — regional banks + Board.
//
// Sub-routes (all key-less, no rate limits):
//   GET /sep                — FOMC Summary of Economic Projections
//                              (Federal Reserve Board; HTML scrape of the
//                              latest fomcprojtablYYYYMMDD.htm page)
//   GET /gdpnow              — Atlanta Fed real-time GDP nowcast
//                              (XLSX: GDPTrackingModelDataAndForecasts.xlsx)
//   GET /inflation-nowcast   — Cleveland Fed monthly CPI/PCE nowcast
//                              (HTML scrape of the indicators-and-data page)
//   GET /news-sentiment      — SF Fed Daily News Sentiment Index
//                              (XLSX: news_sentiment_data.xlsx)
//
// Several other Fed banks publish data only via FRED already (Chicago CFNAI,
// Dallas Trimmed-Mean PCE, Kansas City KCFSI, etc.); those are reachable via
// the existing /api/fred route. NY Fed Markets data (SOFR/RRP/dealer survey)
// has its own /api/nyfed route. NY Fed SCE and Philly Fed SPF publish XLSX
// but their download pages are JS-rendered, so the canonical URLs aren't
// stable enough to wire here yet.
import { Router } from 'express';
import xlsx from 'xlsx';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchHtml, fetchBuffer } from '../lib/fetchBinary.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────
// FOMC SEP — Summary of Economic Projections (Federal Reserve Board)
// ─────────────────────────────────────────────────────────────────────────
const FOMC_CALENDAR_URL = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';

function stripTags(s) { return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }

async function findLatestSEPPage() {
  const html = await fetchHtml(FOMC_CALENDAR_URL);
  // Page lists every projection release as fomcprojtablYYYYMMDD.htm. Pick
  // the highest YYYYMMDD that's already in the past (don't try future-dated).
  const dates = [...html.matchAll(/fomcprojtabl(\d{8})\.htm/g)].map(m => m[1]).sort();
  const today = todayStr().replace(/-/g, '');
  const past = dates.filter(d => d <= today);
  if (!past.length) return null;
  const latest = past[past.length - 1];
  return { date: latest, url: `https://www.federalreserve.gov/monetarypolicy/fomcprojtabl${latest}.htm` };
}

function parseSEPTable1(html) {
  // Table 1 is headed by `xt1` ids. Capture the data rows: each has a
  // `<th class="stub" ...>VARIABLE</th>` followed by 12 `<td class="data">N</td>`
  // cells (4 medians, 4 central tendencies, 4 ranges across 2025/2026/2027/Longer).
  const t1 = html.match(/<table[^>]*aria-labelledby="xt1[^"]*"[\s\S]*?<\/table>/);
  if (!t1) return null;
  const block = t1[0];
  const yearHeaders = [...block.matchAll(/headers="xt1a2"[^>]*>([^<]+)</g)].map(m => m[1].trim());
  const rows = [];
  // Match only top-level variable rows (skip "March projection" continuation rows)
  const rowRegex = /<tr>\s*<th class="stub"[^>]*>([^<]+)<\/th>([\s\S]*?)<\/tr>/g;
  for (const m of block.matchAll(rowRegex)) {
    const variable = stripTags(m[1]);
    const cells = [...m[2].matchAll(/class="data"[^>]*>([^<]+)</g)].map(c => c[1].trim());
    if (cells.length >= 12) {
      rows.push({
        variable,
        median:           { current: parseFloat(cells[0]),  next: parseFloat(cells[1]),  twoOut: parseFloat(cells[2]),  longerRun: parseFloat(cells[3])  },
        centralTendency:  { current: cells[4], next: cells[5], twoOut: cells[6], longerRun: cells[7] },
        range:            { current: cells[8], next: cells[9], twoOut: cells[10], longerRun: cells[11] },
      });
    }
  }
  return { yearHeaders, rows };
}

router.get('/sep', async (_req, res) => {
  const cached = readDailyCache('fed_sep');
  if (cached) return res.json(cached);

  const today = todayStr();
  let release = null, sep = null;
  try {
    trackApiCall('Federal Reserve Board');
    release = await findLatestSEPPage();
    if (release) {
      const html = await fetchHtml(release.url);
      sep = parseSEPTable1(html);
    }
  } catch (e) { console.warn('[Fed SEP]', e.message); }

  const _sources = { fed_sep: !!(sep && sep.rows?.length) };
  const isLive = _sources.fed_sep;
  const result = {
    release,                     // { date: '20250618', url: '...' }
    yearHeaders: sep?.yearHeaders || null,
    projections: sep?.rows || null,
    summary: sep ? {
      releaseDate: release?.date ? `${release.date.slice(0,4)}-${release.date.slice(4,6)}-${release.date.slice(6,8)}` : null,
      variableCount: sep.rows.length,
    } : null,
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };
  if (isLive) writeDailyCache('fed_sep', result);
  else {
    const fb = readLatestCache('fed_sep');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

// ─────────────────────────────────────────────────────────────────────────
// Atlanta Fed GDPNow
// ─────────────────────────────────────────────────────────────────────────
const GDPNOW_XLSX_URL = 'https://www.atlantafed.org/-/media/Project/Atlanta/FRBA/Documents/cqer/researchcq/gdpnow/GDPTrackingModelDataAndForecasts.xlsx';

function jsExcelDateToISO(serial) {
  // Excel epoch = 1899-12-30 (sheetjs handles 1900 leap-year quirk for us).
  if (typeof serial !== 'number') return null;
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  return new Date(ms).toISOString().slice(0, 10);
}

router.get('/gdpnow', async (_req, res) => {
  const cached = readDailyCache('fed_gdpnow');
  if (cached) return res.json(cached);

  const today = todayStr();
  let evolution = null, latest = null, currentQuarter = null, priorQuarters = null;
  try {
    trackApiCall('Atlanta Fed');
    const buf = await fetchBuffer(GDPNOW_XLSX_URL);
    const wb = xlsx.read(buf, { type: 'buffer', cellDates: false });
    // The Atlanta workbook has 50+ sheets; the only one shaped as a clean
    // chronological table of (release date → GDPNow nowcast) is `Table`.
    // Header is row 0: [Date, Major Releases, GDP, PCE, Equipment, ...].
    // Rows 1-2 are the BEA "latest" actuals for the two prior quarters,
    // row 3 is the initial GDPNow for the current quarter, rows 4+ are
    // the post-initial revisions as each major release lands.
    const sheet = wb.Sheets['Table'];
    if (!sheet) throw new Error('Table sheet missing in GDPNow workbook');
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const data = [];
    const seen = new Set();
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r || r.every(c => c == null)) continue;
      const d = typeof r[0] === 'number' ? jsExcelDateToISO(r[0]) : null;
      const event = typeof r[1] === 'string' ? r[1].trim() : null;
      const gdp = typeof r[2] === 'number' ? Math.round(r[2] * 100) / 100 : null;
      if (!event) continue;
      // The Atlanta workbook has hidden duplicate rows further down the sheet
      // (used internally for chart layout). Dedupe by (date, event) so the
      // panel doesn't render the same release twice.
      const key = `${d}|${event}`;
      if (seen.has(key)) continue;
      seen.add(key);
      data.push({ date: d, event, gdp });
    }
    // Split: BEA-latest rows describe completed quarters; the rest belong
    // to the current GDPNow tracking quarter.
    priorQuarters = data.filter(r => /Latest BEA estimate/i.test(r.event));
    const tracking = data.filter(r => !/Latest BEA estimate/i.test(r.event));
    if (tracking.length) {
      // Pull the quarter label out of the "Initial GDPNow" row title
      const initRow = tracking.find(r => /Initial GDPNow/i.test(r.event));
      const m = initRow?.event?.match(/(\d{2}:Q[1-4])/i);
      currentQuarter = m ? m[1] : null;
      evolution = tracking;
      latest = tracking[tracking.length - 1];
    }
  } catch (e) { console.warn('[Fed GDPNow]', e.message); }

  const _sources = { fed_gdpnow: !!(evolution && evolution.length) };
  const isLive = _sources.fed_gdpnow;
  const result = {
    currentQuarter, priorQuarters, evolution, latest,
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };
  if (isLive) writeDailyCache('fed_gdpnow', result);
  else {
    const fb = readLatestCache('fed_gdpnow');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

// ─────────────────────────────────────────────────────────────────────────
// Cleveland Fed Inflation Nowcasting
// ─────────────────────────────────────────────────────────────────────────
const CLEVE_NOWCAST_URL = 'https://www.clevelandfed.org/indicators-and-data/inflation-nowcasting';

function parseClevelandNum(cell) {
  const t = String(cell ?? '').replace(/&nbsp;/gi, ' ').trim();
  if (!t || t === '—' || t === '-') return null;
  const n = parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function classifyClevelandTable(block) {
  // Captions are like "Inflation, year-over-year percent change" (lowercase).
  // Case-sensitive /Year/ missed YoY and labeled every monthly table as mom,
  // which blanked the panel's YoY KPI strip.
  const caption = (block.match(/<caption[^>]*>([\s\S]*?)<\/caption>/i)?.[1] || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  const text = `${caption} ${block.slice(0, 400)}`.toLowerCase();
  if (/quarter/.test(text) || /q\/q|qoq|annualized/.test(caption)) return 'quarterly';
  if (/year-over-year|year over year|\byoy\b|y\/y/.test(text)) return 'yoy';
  if (/month-over-month|month over month|\bmom\b|m\/m/.test(text)) return 'mom';
  // Header-based fallback: Quarter vs Month column stub
  if (/<th[^>]*>\s*quarter\s*<\/th>/i.test(block)) return 'quarterly';
  return 'mom';
}

function parseClevelandTables(html) {
  // Cleveland renders three nowcast tables (monthly month-over-month,
  // monthly year-over-year, quarterly QoQ). Each has the same column
  // header sequence: <th>Month/Quarter</th><th>CPI</th><th>Core CPI</th>
  // <th>PCE</th><th>Core PCE</th><th>Updated</th>. Released measures leave
  // blank cells — parse those as null instead of dropping the whole row.
  const tables = [...html.matchAll(/<table[\s\S]*?<\/table>/gi)];
  const out = [];
  const seenKind = new Set();
  for (const t of tables) {
    const block = t[0];
    if (!/<th[^>]*>\s*CPI\s*<\/th>/i.test(block) || !/<th[^>]*>\s*Core CPI\s*<\/th>/i.test(block)) continue;
    const labelKind = classifyClevelandTable(block);
    // Allow empty <td></td> for already-released series.
    const rowRegex = /<tr>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<td[^>]*>([\s\S]*?)<\/td>(?:\s*<td[^>]*>([\s\S]*?)<\/td>)?\s*<\/tr>/gi;
    const rows = [];
    for (const m of block.matchAll(rowRegex)) {
      const period = String(m[1]).replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
      if (!period || /^note:/i.test(period)) continue;
      const cpi = parseClevelandNum(m[2]);
      const coreCpi = parseClevelandNum(m[3]);
      const pce = parseClevelandNum(m[4]);
      const corePce = parseClevelandNum(m[5]);
      // Skip pure note/empty rows with no measures at all
      if (cpi == null && coreCpi == null && pce == null && corePce == null) continue;
      rows.push({
        period,
        cpi,
        coreCpi,
        pce,
        corePce,
        updated: m[6] ? String(m[6]).replace(/<[^>]+>/g, '').trim() || null : null,
      });
    }
    if (!rows.length) continue;
    // Prefer first occurrence of each kind (page order: MoM, YoY, QoQ)
    if (seenKind.has(labelKind)) continue;
    seenKind.add(labelKind);
    out.push({ kind: labelKind, rows, title: labelKind === 'yoy' ? 'Year-over-Year' : labelKind === 'quarterly' ? 'Quarterly' : 'Month-over-Month' });
  }
  return out;
}

router.get('/inflation-nowcast', async (req, res) => {
  const forceRefresh = req.query?.refresh === 'true' || req.query?.refresh === '1';
  if (!forceRefresh) {
    const cached = readDailyCache('fed_inflation_nowcast');
    // Reject legacy caches that mis-tagged YoY as a second "mom" table
    // (pre-fix: two mom entries, zero yoy → blank YoY KPIs in the UI).
    if (cached?.tables?.length) {
      const kinds = cached.tables.map(t => t.kind);
      const ok = kinds.includes('yoy') || kinds.filter(k => k === 'mom').length <= 1;
      if (ok) return res.json(cached);
    } else if (cached) {
      return res.json(cached);
    }
  }

  const today = todayStr();
  let tables = null, latest = null, byKind = null;
  try {
    trackApiCall('Cleveland Fed');
    const html = await fetchHtml(CLEVE_NOWCAST_URL);
    const parsed = parseClevelandTables(html);
    if (parsed.length) {
      tables = parsed;
      const mom = parsed.find(t => t.kind === 'mom');
      const yoy = parsed.find(t => t.kind === 'yoy');
      const quarterly = parsed.find(t => t.kind === 'quarterly');
      byKind = {
        mom: mom?.rows?.[0] || null,
        yoy: yoy?.rows?.[0] || null,
        quarterly: quarterly?.rows?.[0] || null,
      };
      // Headline latest = YoY (panel KPIs) with MoM fallback
      latest = byKind.yoy || byKind.mom || parsed[0]?.rows?.[0] || null;
    }
  } catch (e) { console.warn('[Fed Cleveland]', e.message); }

  const _sources = { fed_inflation_nowcast: !!(tables && tables.length) };
  const isLive = _sources.fed_inflation_nowcast;
  const result = {
    tables, latest, byKind,
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };
  if (isLive) writeDailyCache('fed_inflation_nowcast', result);
  else {
    const fb = readLatestCache('fed_inflation_nowcast');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

// ─────────────────────────────────────────────────────────────────────────
// SF Fed Daily News Sentiment Index
// ─────────────────────────────────────────────────────────────────────────
const SF_SENTIMENT_URL = 'https://www.frbsf.org/wp-content/uploads/news_sentiment_data.xlsx';

router.get('/news-sentiment', async (_req, res) => {
  const cached = readDailyCache('fed_news_sentiment');
  if (cached) return res.json(cached);

  const today = todayStr();
  let series = null, latest = null;
  try {
    trackApiCall('SF Fed');
    const buf = await fetchBuffer(SF_SENTIMENT_URL);
    const wb = xlsx.read(buf, { type: 'buffer', cellDates: true });
    // SF Fed publishes a "Data" (or first) sheet with two cols: Date, News Sentiment.
    const sheetName = wb.SheetNames.find(n => /data|sentiment/i.test(n)) || wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
    let headerIdx = rows.findIndex(r => Array.isArray(r) && r.some(c => typeof c === 'string' && /date/i.test(c)));
    if (headerIdx < 0) headerIdx = 0;
    const header = rows[headerIdx].map(c => (c == null ? '' : String(c)));
    const dateCol = header.findIndex(c => /date/i.test(c));
    const valCol  = header.findIndex(c => /sentiment|index/i.test(c));
    const out = [];
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const r = rows[i];
      if (!r) continue;
      let d = r[dateCol];
      if (d instanceof Date) d = d.toISOString().slice(0, 10);
      else if (typeof d === 'number') d = jsExcelDateToISO(d);
      else if (typeof d === 'string') d = d.slice(0, 10);
      const v = typeof r[valCol] === 'number' ? r[valCol] : parseFloat(r[valCol]);
      if (d && Number.isFinite(v)) out.push({ date: d, sentiment: Math.round(v * 1000) / 1000 });
    }
    if (out.length) {
      series = out.slice(-365);             // ~1 year of daily values
      latest = series[series.length - 1];
    }
  } catch (e) { console.warn('[Fed SF Sentiment]', e.message); }

  const _sources = { fed_news_sentiment: !!(series && series.length) };
  const isLive = _sources.fed_news_sentiment;
  const result = {
    series, latest,
    _sources, isLive, isCurrent: true, fetchedOn: today, lastUpdated: today,
  };
  if (isLive) writeDailyCache('fed_news_sentiment', result);
  else {
    const fb = readLatestCache('fed_news_sentiment');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
