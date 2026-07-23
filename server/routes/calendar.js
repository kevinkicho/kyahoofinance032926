import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr, mergeWithPreviousCache } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { sendCachedOrDegradedSync } from '../lib/marketResponse.js';
import { omitNullFields, filterRowsWithData, computeIsLive, sanitizeMarketPayload } from '../lib/dataHygiene.js';

const router = Router();

// Policy-rate FRED series (must be currently published — BOERUKQ/BOERUKM end ~2016/17).
// Fed: upper target rate (daily). ECB: deposit facility. BOE: SONIA as policy proxy.
// BOJ: OECD immediate-rates / Japan.
const CB_SCHEDULE = {
  Fed: {
    dates: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'],
    fredSeries: 'DFEDTARU',
    fredSeriesAlt: ['DFEDTARL', 'FEDFUNDS'],
    label: 'Fed funds target (upper)',
    fredReleaseId: 13,
  },
  ECB: {
    dates: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'],
    fredSeries: 'ECBDFR',
    fredSeriesAlt: ['ECBMLFR'],
    label: 'ECB deposit facility',
    cadence: { dayOfWeek: 4, weekOfMonth: 3, months: [1,3,4,6,7,9,10,12] },
  },
  BOE: {
    dates: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'],
    fredSeries: 'IUDSOIA', // SONIA (daily) — BOERUK* discontinued
    fredSeriesAlt: ['IRSTCI01GBM156N'],
    label: 'SONIA (BoE policy proxy)',
    cadence: { dayOfWeek: 4, weekOfMonth: 1, months: [2,3,5,6,8,9,11,12] },
  },
  BOJ: {
    dates: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'],
    fredSeries: 'IRSTCI01JPM156N',
    fredSeriesAlt: ['IR3TIB01JPM156N'],
    label: 'Japan immediate rates (OECD)',
    cadence: { dayOfWeek: 3, weekOfMonth: 3, months: [1,3,4,6,7,9,10,12] },
  },
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

const RELEASE_SERIES = {
  10: 'CPIAUCSL', 46: 'PPIACO', 53: 'A191RL1Q225SBEA', 50: 'PAYEMS',
  103: 'RSAFS', 13: 'PCEPI', 82: 'UMCSENT', 14: 'INDPRO',
  205: 'HOUST', 58: 'NAPM',
};

function thirdFriday(year, month) {
  const d = new Date(year, month, 1);
  const day = d.getDay();
  const firstFri = day <= 5 ? (5 - day + 1) : (12 - day + 1);
  return new Date(year, month, firstFri + 14);
}

function nextThreeOptionsExpiries() {
  const results = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  while (results.length < 3) {
    const expiry = thirdFriday(year, month);
    if (expiry >= now) {
      results.push({
        date: expiry.toISOString().split('T')[0],
        type: 'Monthly Options Expiry (3rd Friday)',
      });
    }
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return results;
}

function nthWeekdayOfMonth(year, month, dayOfWeek, weekOfMonth) {
  const first = new Date(Date.UTC(year, month, 1));
  const firstDow = first.getUTCDay();
  let targetDay = dayOfWeek - firstDow;
  if (targetDay < 0) targetDay += 7;
  targetDay += 1 + (weekOfMonth - 1) * 7;
  const d = new Date(Date.UTC(year, month, targetDay));
  if (d.getUTCMonth() !== month) return null;
  return d;
}

function nextBusinessDay(date) {
  const d = new Date(date);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

async function fetchFomcDatesFromFred(FRED_API_KEY) {
  if (!FRED_API_KEY) return null;
  try {
    trackApiCall('FRED');
    const data = await fetchJSON(
      `https://api.stlouisfed.org/fred/releases/dates?release_id=13&api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&limit=50&sort_order=asc&observation_start=${new Date().toISOString().split('T')[0]}`
    );
    const dates = (data?.release_dates || []).map(d => d.date).filter(d => d >= new Date().toISOString().split('T')[0]);
    return dates.length >= 4 ? dates.slice(0, 8) : null;
  } catch (e) {
    console.warn('[Calendar] FRED FOMC schedule fetch failed:', e.message || e);
    return null;
  }
}

function generateCbdDatesFromCadence(cadence, count = 8) {
  const now = new Date();
  let year = now.getUTCFullYear();
  let month = now.getUTCMonth();
  const results = [];
  const maxYear = year + 2;
  while (results.length < count && year <= maxYear) {
    if (cadence.months.includes(month + 1)) {
      const d = nthWeekdayOfMonth(year, month, cadence.dayOfWeek, cadence.weekOfMonth);
      if (d && d >= now) {
        results.push(d.toISOString().split('T')[0]);
      }
    }
    month++;
    if (month > 11) { month = 0; year++; }
  }
  return results.length >= 4 ? results : null;
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

router.get('/', async (req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = req.app.locals.cache;
  const cacheKey = 'calendar_data';
  const today = todayStr();
  const refresh = req.query.refresh === 'true' || req.query.refresh === '1';
  const LIVE_FIELDS = [
    'economicEvents', 'centralBanks', 'earningsSeason', 'keyReleases', 'treasuryAuctions',
  ];

  const daily = refresh ? null : readDailyCache('calendar');
  if (daily) {
    const payload = sanitizeMarketPayload({ ...daily, fetchedOn: today, isCurrent: true });
    // Disk cache from older builds may omit isLive — recompute so panels gate correctly.
    payload.isLive = computeIsLive(payload, LIVE_FIELDS);
    return res.json(payload);
  }

  const cached = refresh ? null : cache.get(cacheKey);
  if (cached) {
    const payload = sanitizeMarketPayload({ ...cached, fetchedOn: today, isCurrent: true });
    payload.isLive = computeIsLive(payload, LIVE_FIELDS);
    return res.json(payload);
  }

  try {
    const plus30d = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })();

    const optionsExpiry = nextThreeOptionsExpiries();

    if (FRED_API_KEY) trackApiCall('FRED');
    trackApiCall('Yahoo Finance');
    trackApiCall('Treasury Fiscal Data');
    trackApiCall('Econdb');
    const [econResult, cbRatesResult, earningsResult, releasesResult,
           treasuryResult, dividendResult, econdbResult] = await Promise.allSettled([
      FRED_API_KEY
        ? (async () => {
            const majorIds = Object.keys(MAJOR_FRED_RELEASES).map(Number);
            const [relData, obsResults] = await Promise.all([
              fetchJSON(`https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&realtime_start=${today}&sort_order=asc&limit=200`),
              Promise.allSettled(
                Object.entries(RELEASE_SERIES).map(async ([rid, sid]) =>
                  fetchJSON(`https://api.stlouisfed.org/fred/series/observations?series_id=${sid}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`)
                    .then(d => [rid, d])
                )
              ),
            ]);
            const upcoming = (relData?.release_dates || [])
              .filter(d => majorIds.includes(d.release_id) && d.date >= today && d.date <= plus30d)
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 30);
            const seriesVals = {};
            for (const entry of obsResults) {
              if (entry.status !== 'fulfilled') continue;
              const [rid, obs] = entry.value;
              const validObs = (obs?.observations || []).filter(o => o.value !== '.');
              // Observations are newest-first from FRED (we requested sort_order=desc).
              // For upcoming releases, latest obs = last print (previous), not "actual".
              const lastPrint = validObs.length > 0 ? parseFloat(validObs[0].value) : null;
              const priorPrint = validObs.length > 1 ? parseFloat(validObs[1].value) : null;
              seriesVals[rid] = {
                lastPrint: Number.isFinite(lastPrint) ? lastPrint : null,
                priorPrint: Number.isFinite(priorPrint) ? priorPrint : null,
                lastActualDate: validObs[0]?.date || null,
              };
            }
            return upcoming.map(d => {
              const info = MAJOR_FRED_RELEASES[d.release_id];
              const vals = seriesVals[String(d.release_id)] || {};
              const released = d.date && d.date <= today;
              return {
                date: d.date,
                country: 'US',
                event: info.name,
                // Only label as actual once the release date has arrived.
                actual: released ? (vals.lastPrint ?? null) : null,
                expected: null, // FRED has no consensus / forecast field
                forecast: null,
                previous: vals.lastPrint ?? null,
                priorPrint: vals.priorPrint ?? null,
                lastPrint: vals.lastPrint ?? null,
                lastActualDate: vals.lastActualDate ?? null,
                category: info.category,
                importance: 2,
                source: 'FRED',
              };
            });
          })()
        : Promise.resolve([]),

      (async () => {
        const dynamicDates = {};
        const sources = {};
        const todayDate = today;
        const todayDateObj = new Date();

        if (FRED_API_KEY) {
          const fomcDates = await fetchFomcDatesFromFred(FRED_API_KEY);
          if (fomcDates) {
            dynamicDates.Fed = fomcDates;
            sources.Fed = 'fredCalendar';
          }
        }

        for (const [bank, cfg] of Object.entries(CB_SCHEDULE)) {
          if (dynamicDates[bank]) continue;
          if (cfg.cadence) {
            const generated = generateCbdDatesFromCadence(cfg.cadence);
            if (generated) {
              dynamicDates[bank] = generated;
              sources[bank] = 'cadenceGenerated';
            }
          }
          if (!dynamicDates[bank]) {
            const future = cfg.dates.filter(d => d >= todayDate);
            if (future.length >= 2) {
              dynamicDates[bank] = future;
              sources[bank] = 'staticFallback';
            }
          }
        }

        const results = await Promise.allSettled(
          Object.entries(CB_SCHEDULE).map(async ([bank, cfg]) => {
            let rate = null;
            let previousRate = null;
            let rateSeries = null;
            let rateAsOf = null;
            if (FRED_API_KEY) {
              const candidates = [cfg.fredSeries, ...(cfg.fredSeriesAlt || [])].filter(Boolean);
              for (const sid of candidates) {
                try {
                  const hist = await fetchFredHistory(sid, FRED_API_KEY, 6);
                  const valid = (hist || []).filter(p => p?.value != null && Number.isFinite(Number(p.value)));
                  if (valid.length >= 1) {
                    rate = Math.round(Number(valid.at(-1).value) * 10000) / 10000;
                    rateAsOf = valid.at(-1).date || null;
                    previousRate = valid.length >= 2
                      ? Math.round(Number(valid.at(-2).value) * 10000) / 10000
                      : null;
                    rateSeries = sid;
                    break;
                  }
                } catch (e) {
                  console.warn(`[Calendar] ${bank} rate ${sid}:`, e.message || e);
                }
              }
            }
            // For Fed, also attach lower target when available so UI can show range.
            let rateLow = null;
            if (bank === 'Fed' && FRED_API_KEY) {
              try {
                const lowHist = await fetchFredHistory('DFEDTARL', FRED_API_KEY, 3);
                if (lowHist?.length) rateLow = Math.round(Number(lowHist.at(-1).value) * 10000) / 10000;
              } catch { /* optional */ }
            }
            const dates = dynamicDates[bank] || cfg.dates;
            const nextMeeting = dates.find(d => d >= todayDate) || dates.at(-1);
            const daysUntil = nextMeeting
              ? Math.round((new Date(`${nextMeeting}T12:00:00`) - new Date(`${todayDate}T12:00:00`)) / 86400000)
              : null;
            return {
              bank,
              rate,
              rateLow,
              rateLabel: cfg.label || null,
              rateSeries,
              rateAsOf,
              nextMeeting,
              daysUntil,
              previousRate,
              dateSource: sources[bank] || 'staticFallback',
            };
          })
        );
        return results.filter(r => r.status === 'fulfilled').map(r => r.value);
      })(),

      // Earnings calendar: quoteSummary for dates/EPS + batch quote for marketCap.
      // marketCap is on the quote/price payload, NOT defaultKeyStatistics (always empty there).
      (async () => {
        const now = new Date();
        const limit = new Date(now); limit.setDate(limit.getDate() + 60);
        const [summaryResults, quotesRaw] = await Promise.all([
          Promise.allSettled(
            EARNINGS_CAL_TICKERS.map(t =>
              yf.quoteSummary(t, { modules: ['calendarEvents', 'defaultKeyStatistics', 'price'] })
                .then(d => ({ ticker: t, ...d }))
            )
          ),
          yf.quote(EARNINGS_CAL_TICKERS).catch(() => null),
        ]);
        const quoteArr = Array.isArray(quotesRaw) ? quotesRaw : (quotesRaw ? [quotesRaw] : []);
        const capByTicker = {};
        for (const q of quoteArr) {
          if (!q?.symbol) continue;
          const cap = q.marketCap ?? q.marketCapRealtime;
          if (cap != null && Number.isFinite(Number(cap))) {
            capByTicker[q.symbol] = Number(cap);
          }
        }
        const entries = [];
        summaryResults.forEach(r => {
          if (r.status !== 'fulfilled') return;
          const s = r.value;
          const ed = s.calendarEvents?.earnings?.earningsDate?.[0];
          if (!ed) return;
          const edDate = new Date(ed);
          if (edDate < now || edDate > limit) return;
          const rawCap =
            capByTicker[s.ticker]
            ?? s.price?.marketCap
            ?? s.defaultKeyStatistics?.marketCap
            ?? null;
          const marketCapB = rawCap != null && Number.isFinite(Number(rawCap))
            ? Math.round(Number(rawCap) / 1e9 * 10) / 10
            : null;
          entries.push({
            ticker: s.ticker,
            name: EARNINGS_CAL_META[s.ticker] || s.ticker,
            date: typeof ed === 'string' ? ed.split('T')[0] : edDate.toISOString().split('T')[0],
            epsEst: s.calendarEvents?.earnings?.earningsAverage ?? null,
            epsPrev: s.defaultKeyStatistics?.trailingEps ?? s.defaultKeyStatistics?.forwardEps ?? null,
            marketCapB,
            marketCap: rawCap != null ? Number(rawCap) : null,
          });
        });
        entries.sort((a, b) => a.date.localeCompare(b.date));
        return entries;
      })(),

      // Key US releases: FRED /releases/dates (bulk) often omits the major
      // release_ids we care about. Query each release calendar individually
      // via /release/dates + attach previous observation values.
      FRED_API_KEY
        ? (async () => {
            const horizon = (() => {
              const d = new Date();
              d.setDate(d.getDate() + 90);
              return d.toISOString().slice(0, 10);
            })();
            const entries = Object.entries(MAJOR_FRED_RELEASES);
            const results = await Promise.allSettled(
              entries.map(async ([rid, info]) => {
                const seriesId = RELEASE_SERIES[rid];
                const [datesJson, obsJson] = await Promise.all([
                  fetchJSON(
                    `https://api.stlouisfed.org/fred/release/dates?release_id=${rid}&api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&realtime_start=${today}&sort_order=asc&limit=8`
                  ),
                  seriesId
                    ? fetchJSON(
                      `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`
                    ).catch(() => null)
                    : Promise.resolve(null),
                ]);
                const validObs = (obsJson?.observations || []).filter((o) => o.value !== '.');
                const lastPrintRaw = validObs.length ? parseFloat(validObs[0].value) : null;
                const priorPrintRaw = validObs.length > 1 ? parseFloat(validObs[1].value) : null;
                const previousValue = Number.isFinite(lastPrintRaw)
                  ? Math.round(lastPrintRaw * 1000) / 1000
                  : null;
                const priorPrint = Number.isFinite(priorPrintRaw)
                  ? Math.round(priorPrintRaw * 1000) / 1000
                  : null;
                const lastActualDate = validObs[0]?.date || null;
                const dates = (datesJson?.release_dates || [])
                  .map((d) => d.date)
                  .filter((d) => d >= today && d <= horizon);
                return dates.map((date) => ({
                  name: info.name,
                  date,
                  category: info.category,
                  // Last published print (used as "Previous" for upcoming releases)
                  previousValue,
                  lastPrint: previousValue,
                  priorPrint,
                  lastActualDate,
                  releaseId: Number(rid),
                  seriesId: seriesId || null,
                  source: 'FRED',
                }));
              })
            );
            const out = [];
            for (const r of results) {
              if (r.status === 'fulfilled' && Array.isArray(r.value)) out.push(...r.value);
              else if (r.status === 'rejected') console.warn('[Calendar] FRED release dates:', r.reason?.message || r.reason);
            }
            out.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
            // Prefer the next 2 dates per release name so the list stays useful.
            const perName = {};
            const capped = [];
            for (const row of out) {
              perName[row.name] = (perName[row.name] || 0) + 1;
              if (perName[row.name] <= 2) capped.push(row);
            }
            return capped.slice(0, 30);
          })()
        : Promise.resolve([]),

      // Treasury Fiscal Data: the `upcoming_auctions` path was deprecated
      // and the v1 base moved to `/fiscal_service/v1/`. `auctions_query`
      // returns historical + recent auctions; we filter to ones with
      // a future-or-today auction_date for the calendar.
      fetchJSON('https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/auctions_query?fields=auction_date,security_type,security_term,offering_amt&sort=-auction_date&page[size]=50')
        .then(data => {
          const rows = data?.data || [];
          const today = new Date().toISOString().slice(0, 10);
          return rows
            .filter(r => r.auction_date && r.auction_date >= today)
            .map(r => ({
              date:   (r.auction_date || '').split('T')[0],
              type:   r.security_type || r.security_term || '',
              amount: r.offering_amt != null ? String(r.offering_amt) : null,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }),

       Promise.allSettled(
         ['AAPL', 'MSFT', 'JNJ', 'JPM', 'XOM'].map(ticker =>
           yf.quoteSummary(ticker, { modules: ['calendarEvents'] })
             .then(d => ({ ticker, cal: d?.calendarEvents }))
         )
       ).then(results => {
         const entries = [];
         results.forEach(r => {
           if (r.status !== 'fulfilled') return;
           const { ticker, cal } = r.value;
           const exDate = cal?.exDividendDate;
           if (!exDate) return;
           const exDateStr = exDate instanceof Date
             ? exDate.toISOString().split('T')[0]
             : typeof exDate === 'string' ? exDate.split('T')[0] : null;
           if (!exDateStr) return;
           entries.push({
             ticker,
             exDate: exDateStr,
             amount: cal?.cashDividends?.amount ?? cal?.cashDividends?.value ?? null,
           });
         });
         entries.sort((a, b) => a.exDate.localeCompare(b.exDate));
         return entries.length > 0 ? entries : null;
       }),
       fetchJSON('https://www.econdb.com/api/economic_events/')
         .then(data => {
           const events = data?.events || [];
           return events
             .filter(e => e.date >= today && e.date <= plus30d)
             .map(e => ({
               date: e.date,
               country: e.country || 'US',
               event: e.event,
               actual: e.actual ?? null,
               expected: e.consensus ?? null,
               previous: e.previous ?? null,
               importance: e.importance || 2,
             }))
             .sort((a, b) => a.date.localeCompare(b.date));
         }),
     ]);

    const hasData = v => v != null && !(Array.isArray(v) && v.length === 0);
    const liveEconomicEvents = [
        ...(econResult.status === 'fulfilled' ? econResult.value : []),
        ...(econdbResult.status === 'fulfilled' ? econdbResult.value : []),
      ].sort((a, b) => a.date.localeCompare(b.date));
    let liveKeyReleases = releasesResult.status === 'fulfilled' ? (releasesResult.value || []) : [];
    if (releasesResult.status === 'rejected') {
      console.warn('[Calendar] key releases fetch failed:', releasesResult.reason?.message || releasesResult.reason);
    }
    // Prefer live macro-event feeds; if those fail, project FRED key-release
    // calendar into economicEvents so the panel still binds real scheduled data.
    const keyAsEvents = (liveKeyReleases || []).map(r => {
      const released = r.date && r.date <= today;
      const lastPrint = r.lastPrint ?? r.previousValue ?? null;
      const priorPrint = r.priorPrint ?? null;
      return {
        date: r.date,
        country: 'US',
        event: r.name,
        // FRED has no consensus; for upcoming releases last print is Previous,
        // not Actual. Only stamp actual after the release date.
        actual: released ? lastPrint : null,
        expected: null,
        consensus: null,
        previous: lastPrint,
        lastPrint,
        priorPrint,
        lastActualDate: r.lastActualDate ?? null,
        importance: 2,
        source: r.source || 'FRED',
        category: r.category,
        seriesId: r.seriesId || null,
        releaseId: r.releaseId ?? null,
      };
    });
    // Also seed keyReleases from the economic-events FRED stream (econResult)
    // when the dedicated release calendar is empty — same underlying schedule.
    if (!liveKeyReleases.length) {
      const fromEcon = (econResult.status === 'fulfilled' ? econResult.value : [])
        .filter((e) => e.country === 'US' && e.source === 'FRED' && e.event)
        .map((e) => ({
          name: e.event,
          date: e.date,
          category: Object.values(MAJOR_FRED_RELEASES).find((m) => m.name === e.event)?.category || 'macro',
          previousValue: e.previous ?? e.lastPrint ?? null,
          lastPrint: e.lastPrint ?? e.previous ?? null,
          priorPrint: e.priorPrint ?? null,
          lastActualDate: e.lastActualDate ?? null,
          seriesId: RELEASE_SERIES[
            Object.entries(MAJOR_FRED_RELEASES).find(([, m]) => m.name === e.event)?.[0]
          ] || null,
          source: 'FRED',
        }));
      if (fromEcon.length) liveKeyReleases = fromEcon;
    }
    // Prefer the richer FRED stream; merge any missing prior/last fields from key releases.
    const byKey = new Map(
      (liveKeyReleases || []).map(r => [`${r.date}|${r.name}`, r]),
    );
    const mergePrints = (ev) => {
      const k = byKey.get(`${ev.date}|${ev.event}`);
      const lastPrint = ev.lastPrint ?? ev.previous ?? k?.lastPrint ?? k?.previousValue ?? null;
      const priorPrint = ev.priorPrint ?? k?.priorPrint ?? null;
      const released = ev.date && ev.date <= today;
      return {
        ...ev,
        lastPrint,
        priorPrint,
        previous: lastPrint,
        actual: ev.actual != null ? ev.actual : (released ? lastPrint : null),
        expected: ev.expected ?? ev.consensus ?? null,
        consensus: ev.consensus ?? ev.expected ?? null,
        lastActualDate: ev.lastActualDate ?? k?.lastActualDate ?? null,
        seriesId: ev.seriesId || k?.seriesId || null,
      };
    };
    const economicEvents = (liveEconomicEvents.length > 0
      ? liveEconomicEvents
      : keyAsEvents
    ).map(mergePrints);
    const keyReleases = liveKeyReleases.length > 0 ? liveKeyReleases : [];
    // When macro calendars are offline, still surface real scheduled items
    // (earnings + treasury auctions) in the economic-events panel so it is
    // never left blank while other real feeds succeeded.
    const earnings = earningsResult.status === 'fulfilled' ? earningsResult.value : [];
    const auctions = treasuryResult.status === 'fulfilled' ? treasuryResult.value : null;
    let filledEvents = economicEvents;
    if (!filledEvents.length) {
      const fromEarnings = (earnings || []).map(e => ({
        date: e.date,
        country: 'US',
        event: `${e.ticker} earnings` + (e.name ? ` (${e.name})` : ''),
        actual: null,
        expected: e.epsEst ?? null,
        previous: e.epsPrev ?? null,
        importance: 1,
        source: 'Yahoo Finance',
      }));
      const fromAuctions = (auctions || []).map(a => ({
        date: a.date,
        country: 'US',
        event: `Treasury auction: ${a.type || 'Security'}`,
        actual: null,
        expected: a.amount ?? null,
        previous: null,
        importance: 2,
        source: 'US Treasury',
      }));
      filledEvents = [...fromEarnings, ...fromAuctions].sort((a, b) => a.date.localeCompare(b.date));
    }

    // Strip null fields and empty datapoints — panels must not bind hollow rows.
    const cleanEvents = filledEvents
      .map((e) => omitNullFields({
        ...e,
        // Prefer lastPrint naming for FRED-backed rows
        lastPrint: e.lastPrint ?? e.previous ?? null,
        priorPrint: e.priorPrint ?? null,
      }))
      .filter((e) => e.date && e.event);

    const rawBanks = cbRatesResult.status === 'fulfilled' ? (cbRatesResult.value || []) : [];
    // Only ship banks with a live rate (no null % placeholders).
    const centralBanks = rawBanks
      .filter((cb) => cb?.bank && cb.rate != null && Number.isFinite(Number(cb.rate)))
      .map((cb) => omitNullFields(cb));

    const cleanEarnings = (earnings || [])
      .filter((e) => e?.ticker && e?.date)
      .map((e) => omitNullFields(e));

    const cleanKeyReleases = (keyReleases || [])
      .filter((r) => r?.date && r?.name)
      .map((r) => omitNullFields(r));

    const cleanAuctions = Array.isArray(auctions)
      ? auctions.filter((a) => a?.date).map((a) => omitNullFields(a))
      : (auctions || null);

    const result = {
      economicEvents: cleanEvents,
      centralBanks,
      earningsSeason: cleanEarnings,
      keyReleases: cleanKeyReleases,
      treasuryAuctions: cleanAuctions,
      optionsExpiry: Array.isArray(optionsExpiry) ? optionsExpiry.filter((o) => o?.date) : optionsExpiry,
      dividendCalendar: dividendResult.status === 'fulfilled' ? dividendResult.value : null,
      _sources: {
        econEvents:        hasData(cleanEvents),
        econEventsFromFredReleases: liveEconomicEvents.length === 0 && keyAsEvents.length > 0,
        econEventsFromEarningsAuctions: liveEconomicEvents.length === 0 && keyAsEvents.length === 0 && cleanEvents.length > 0,
        econEventsFallback: false,
        centralBankRates:  centralBanks.length > 0,
        centralBankDateSources: Object.fromEntries(centralBanks.map(cb => [cb.bank, cb.dateSource || 'staticFallback'])),
        earnings:          cleanEarnings.length > 0,
        fredReleases:      hasData(liveKeyReleases),
        fredReleasesFallback: false,
        treasuryAuctions:  hasData(cleanAuctions),
        dividends:         hasData(dividendResult.status === 'fulfilled' ? dividendResult.value : null),
        econdb:            hasData(econdbResult.status === 'fulfilled' ? econdbResult.value : null),
      },
      lastUpdated: today,
    };

    result.isLive = computeIsLive(result, LIVE_FIELDS);

    const merged = sanitizeMarketPayload(mergeWithPreviousCache('calendar', result));
    // Recompute isLive after merge in case cache restored fields
    merged.isLive = computeIsLive(merged, LIVE_FIELDS);
    writeDailyCache('calendar', merged);
    cache.set(cacheKey, merged, 300);
    res.json({ ...merged, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Calendar API error:', error);
    return sendCachedOrDegradedSync(res, 'calendar', {
      error,
      memoryCache: req.app.locals.cache,
      cacheKey: 'calendar_data',
    });
  }
});

export default router;
