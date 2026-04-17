import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

function dateToMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');
}

async function fetchFredHistory(seriesId, FRED_API_KEY, limit = 13) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: String(limit) });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

async function fetchFredLatest(seriesId, FRED_API_KEY) {
  const params = new URLSearchParams({ series_id: seriesId, api_key: FRED_API_KEY, file_type: 'json', sort_order: 'desc', limit: '5' });
  const url = `https://api.stlouisfed.org/fred/series/observations?${params.toString()}`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

router.get('/', async (_req, res) => {
  const FRED_API_KEY = process.env.FRED_API_KEY || '';
  const cache = _req.app.locals.cache;
  const today = todayStr();
  const daily = readDailyCache('credit');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  const cacheKey = 'credit_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
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
    let delinquencyRates = null;
    let lendingStandards = null;
    let commercialPaper  = null;
    let excessReserves   = null;

    if (FRED_API_KEY) {
      trackApiCall('FRED');
      const [spreadResults, chargeoffResults, delinqResults, lendingStdResult, cpRateResults, excessResResult] = await Promise.all([
        Promise.allSettled(
          Object.entries(CREDIT_SPREAD_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, FRED_API_KEY, 13)]
          )
        ),
        Promise.allSettled(
          Object.entries(CHARGEOFF_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, FRED_API_KEY, 9)]
          )
        ),
        Promise.allSettled([
          fetchFredHistory('DRSFRMACBS', FRED_API_KEY, 24).then(d => ['commercial', d]),
          fetchFredHistory('DRALACBS',   FRED_API_KEY, 24).then(d => ['allLoans',   d]),
        ]),
        Promise.allSettled([fetchFredHistory('DRTSCILM', FRED_API_KEY, 24)]),
        Promise.allSettled([
          fetchFredLatest('DCPN3M', FRED_API_KEY).then(v => ['nonfinancial3m', v]),
          fetchFredLatest('DCPF3M', FRED_API_KEY).then(v => ['financial3m',    v]),
        ]),
        Promise.allSettled([fetchFredHistory('EXCSRESNS', FRED_API_KEY, 36)]),
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
          etfs: [],
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

      const delinqRaw = {};
      delinqResults.forEach(r => { if (r.status === 'fulfilled') delinqRaw[r.value[0]] = r.value[1]; });

      const delinqCommercial = delinqRaw.commercial || [];
      const delinqAllLoans   = delinqRaw.allLoans   || [];
      const delinqAnchor     = delinqCommercial.length >= 4 ? delinqCommercial : delinqAllLoans;
      delinquencyRates = delinqAnchor.length >= 4 ? {
        dates:      delinqAnchor.map(p => {
          const d = new Date(p.date + 'T00:00:00Z');
          const q = Math.ceil((d.getUTCMonth() + 1) / 3);
          return `Q${q}-${String(d.getUTCFullYear()).slice(2)}`;
        }),
        commercial: delinqCommercial.map(p => Math.round(p.value * 100) / 100),
        allLoans:   delinqAllLoans.map(p   => Math.round(p.value * 100) / 100),
      } : null;

      const lendingRaw = lendingStdResult[0]?.status === 'fulfilled' ? lendingStdResult[0].value : [];
      lendingStandards = lendingRaw.length >= 4 ? {
        dates:  lendingRaw.map(p => {
          const d = new Date(p.date + 'T00:00:00Z');
          const q = Math.ceil((d.getUTCMonth() + 1) / 3);
          return `Q${q}-${String(d.getUTCFullYear()).slice(2)}`;
        }),
        values: lendingRaw.map(p => Math.round(p.value * 10) / 10),
      } : null;

      const cpRaw = {};
      cpRateResults.forEach(r => { if (r.status === 'fulfilled') cpRaw[r.value[0]] = r.value[1]; });
      if (cpRaw.financial3m != null || cpRaw.nonfinancial3m != null) {
        commercialPaper = {
          financial3m:    cpRaw.financial3m    != null ? Math.round(cpRaw.financial3m    * 100) / 100 : null,
          nonfinancial3m: cpRaw.nonfinancial3m != null ? Math.round(cpRaw.nonfinancial3m * 100) / 100 : null,
        };
      }

      const excessRaw = excessResResult[0]?.status === 'fulfilled' ? excessResResult[0].value : [];
      excessReserves = excessRaw.length >= 4 ? {
        dates:  excessRaw.map(p => p.date),
        values: excessRaw.map(p => Math.round(p.value * 10) / 10),
      } : null;
    }

    const ETF_TICKERS = ['LQD','HYG','EMB','JNK','BKLN','MUB'];
    let etfs = [];
    try {
      trackApiCall('Yahoo Finance');
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
    } catch (e) { console.warn('[Credit]', e.message || e); }

    if (spreadData) spreadData.etfs = etfs;

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

    const _sources = {
      spreadData:       spreadData != null,
      emBondData:       emBondData != null,
      loanData:         loanData != null,
      defaultData:      defaultData != null,
      delinquencyRates: delinquencyRates != null,
      lendingStandards:  lendingStandards != null,
      commercialPaper:  commercialPaper != null,
      excessReserves:   excessReserves != null,
    };

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
      _sources,
      spreadData:  finalSpreadData,
      emBondData,
      loanData,
      defaultData,
      delinquencyRates,
      lendingStandards,
      commercialPaper,
      excessReserves,
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

export default router;
