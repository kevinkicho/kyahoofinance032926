import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const CB_SCHEDULE = {
  Fed: { dates: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'], fredSeries: 'FEDFUNDS', fredReleaseId: 13 },
  ECB: { dates: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'], fredSeries: 'ECBDFR', cadence: { dayOfWeek: 4, weekOfMonth: 3, months: [1,3,4,6,7,9,10,12] } },
  BOE: { dates: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'], fredSeries: 'BOERUKQ', cadence: { dayOfWeek: 4, weekOfMonth: 1, months: [2,3,5,6,8,9,11,12] } },
  BOJ: { dates: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'], fredSeries: null, cadence: { dayOfWeek: 3, weekOfMonth: 3, months: [1,3,4,6,7,9,10,12] } },
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

  const daily = readDailyCache('calendar');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

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
              fetchJSON(`https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&limit=200`),
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
              seriesVals[rid] = {
                actual: validObs.length > 0 ? parseFloat(validObs[0].value) : null,
                previous: validObs.length > 1 ? parseFloat(validObs[1].value) : null,
              };
            }
            return upcoming.map(d => {
              const info = MAJOR_FRED_RELEASES[d.release_id];
              const vals = seriesVals[String(d.release_id)] || {};
              return {
                date: d.date,
                country: 'US',
                event: info.name,
                actual: vals.actual ?? null,
                expected: null, // FRED API doesn't routinely provide consensus
                previous: vals.previous ?? null,
                importance: 2,
                source: 'FRED'
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
            if (cfg.fredSeries && FRED_API_KEY) {
              try {
                const hist = await fetchFredHistory(cfg.fredSeries, FRED_API_KEY, 3);
                if (hist.length >= 1) rate = hist.at(-1).value;
                if (hist.length >= 2) previousRate = hist.at(-2).value;
              } catch (e) { console.warn('[Calendar]', e.message || e); }
            }
            const FALLBACK_RATES = { Fed: 4.50, ECB: 2.65, BOE: 4.50, BOJ: 0.50 };
            const FALLBACK_PREV  = { Fed: 4.50, ECB: 2.90, BOE: 4.50, BOJ: 0.25 };
            if (rate == null) rate = FALLBACK_RATES[bank] ?? null;
            if (previousRate == null) previousRate = FALLBACK_PREV[bank] ?? null;
            const dates = dynamicDates[bank] || cfg.dates;
            const nextMeeting = dates.find(d => d >= todayDate) || dates.at(-1);
            const daysUntil = nextMeeting ? Math.round((new Date(nextMeeting) - todayDateObj) / 86400000) : null;
            return { bank, rate, nextMeeting, daysUntil, previousRate, dateSource: sources[bank] || 'staticFallback' };
          })
        );
        return results.filter(r => r.status === 'fulfilled').map(r => r.value);
      })(),

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

      FRED_API_KEY
        ? fetchJSON(`https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&limit=200`)
            .then(data => {
              const dates = data?.release_dates || [];
              const majorIds = Object.keys(MAJOR_FRED_RELEASES).map(Number);
              return dates
                .filter(d => majorIds.includes(d.release_id) && d.date >= today)
                .map(d => {
                  const info = MAJOR_FRED_RELEASES[d.release_id];
                   return { name: info.name, date: d.date, category: info.category, previousValue: info.previousValue ?? null };
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 20);
            })
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
    const result = {
      economicEvents:   [
        ...(econResult.status === 'fulfilled' ? econResult.value : []),
        ...(econdbResult.status === 'fulfilled' ? econdbResult.value : []),
      ].sort((a, b) => a.date.localeCompare(b.date)),
      centralBanks:     cbRatesResult.status === 'fulfilled' ? cbRatesResult.value : [],
      earningsSeason:   earningsResult.status === 'fulfilled' ? earningsResult.value : [],
      keyReleases:      releasesResult.status === 'fulfilled' ? releasesResult.value : [],
      treasuryAuctions: treasuryResult.status === 'fulfilled' ? treasuryResult.value : null,
      optionsExpiry,
      dividendCalendar: dividendResult.status === 'fulfilled' ? dividendResult.value : null,
      _sources: {
        econEvents:        hasData(econResult.status === 'fulfilled' ? econResult.value : null) || hasData(econdbResult.status === 'fulfilled' ? econdbResult.value : null),
        centralBankRates:  hasData(cbRatesResult.status === 'fulfilled' ? cbRatesResult.value : null),
        centralBankDateSources: cbRatesResult.status === 'fulfilled'
          ? Object.fromEntries((cbRatesResult.value || []).map(cb => [cb.bank, cb.dateSource || 'staticFallback']))
          : {},
        earnings:          hasData(earningsResult.status === 'fulfilled' ? earningsResult.value : null),
        fredReleases:      hasData(releasesResult.status === 'fulfilled' ? releasesResult.value : null),
        treasuryAuctions:  hasData(treasuryResult.status === 'fulfilled' ? treasuryResult.value : null),
        dividends:         hasData(dividendResult.status === 'fulfilled' ? dividendResult.value : null),
        econdb:            hasData(econdbResult.status === 'fulfilled' ? econdbResult.value : null),
      },
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

export default router;
