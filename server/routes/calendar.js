import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

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

    trackApiCall('EconDB');
    if (FRED_API_KEY) trackApiCall('FRED');
    trackApiCall('Yahoo Finance');
    trackApiCall('Treasury Fiscal Data');
    const [econResult, cbRatesResult, earningsResult, releasesResult,
           treasuryResult, dividendResult] = await Promise.allSettled([
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

      Promise.allSettled(
        Object.entries(CB_SCHEDULE).map(async ([bank, cfg]) => {
          let rate = null;
          let previousRate = null;
          if (cfg.fredSeries && FRED_API_KEY) {
            try {
              const hist = await fetchFredHistory(cfg.fredSeries, FRED_API_KEY, 3);
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
                  return { name: info.name, date: d.date, category: info.category, previousValue: null };
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 20);
            })
        : Promise.resolve([]),

      fetchJSON('https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/upcoming_auctions?sort=-auction_date&page[size]=20')
        .then(data => {
          const rows = data?.data || [];
          return rows
            .filter(r => r.auction_date)
            .map(r => ({
              date:   (r.auction_date || '').split('T')[0],
              type:   r.security_type || r.security_desc || '',
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
            amount: cal?.dividendDate ? null : null,
          });
        });
        entries.sort((a, b) => a.exDate.localeCompare(b.exDate));
        return entries.length > 0 ? entries : null;
      }),
    ]);

    const result = {
      economicEvents:   econResult.status === 'fulfilled' ? econResult.value : [],
      centralBanks:     cbRatesResult.status === 'fulfilled' ? cbRatesResult.value : [],
      earningsSeason:   earningsResult.status === 'fulfilled' ? earningsResult.value : [],
      keyReleases:      releasesResult.status === 'fulfilled' ? releasesResult.value : [],
      treasuryAuctions: treasuryResult.status === 'fulfilled' ? treasuryResult.value : null,
      optionsExpiry,
      dividendCalendar: dividendResult.status === 'fulfilled' ? dividendResult.value : null,
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
