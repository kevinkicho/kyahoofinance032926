import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { makeCachedRouteHandler } from '../lib/routeFactory.js';
import { yf } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';
import { fetchFredHistory, fetchFredLatest } from '../lib/fred.js';

const router = Router();

// Convert a Yahoo ETF quote to a 10Y EM yield proxy. A true 10Y government
// yield requires paid data (Bloomberg/Refinitiv), so we use the ETF trailing
// dividend yield. A 0/absent yield is not a real read (some EM sovereign ETFs
// report no dividend yield) — treat it as unknown so the panel shows "—"
// rather than a misleading 0.00%.
export function emYieldFromEtfQuote(etfQuote) {
  const y = etfQuote?.trailingAnnualDividendYield;
  if (y == null || y <= 0) return null;
  return y * 100;
}

// Build the TED spread payload only if the last observation is recent (<= 30
// days). TEDRATE (LIBOR-based) was discontinued when LIBOR ended; FRED still
// returns its final historical points, so without a recency gate a stale
// number would be presented as a live credit signal. Returns null otherwise.
export function buildTedSpread(tedRaw, now = Date.now()) {
  if (!Array.isArray(tedRaw) || tedRaw.length === 0) return null;
  const last = tedRaw[tedRaw.length - 1];
  const daysOld = last?.date
    ? Math.round((now - new Date(last.date).getTime()) / 86400000)
    : Infinity;
  if (daysOld > 30) return null;
  return {
    dates:  tedRaw.map(p => p.date),
    values: tedRaw.map(p => Math.round(p.value * 100) / 100),
    latest: last?.value != null ? Math.round(last.value * 100) / 100 : null,
  };
}

function dateToMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');
}

router.get('/', makeCachedRouteHandler({
  marketName: 'credit',
  cacheKey: 'credit_data',
  cacheTtl: 300,
  fetchDataFn: async (req, _errors) => {
    const FRED_API_KEY = process.env.FRED_API_KEY || '';
    const CREDIT_SPREAD_SERIES = {
      IG:  'BAMLC0A0CM',
      HY:  'BAMLH0A0HYM2',
      EM:  'BAMLEMCBPIOAS',
      BBB: 'BAMLC0A4CBBB',
      CCC: 'BAMLH0A3HYC',
    };
    // Bank charge-off / delinquency series (quarterly %, FDIC-insured banks).
    // These power the Default Rates panel — Moody's HY TTM defaults are not free.
    const CHARGEOFF_SERIES = {
      commercial: 'DRALACBN',   // C&I loan charge-off rate
      consumer:   'DRSFRMACBS', // SFR mortgage charge-off (consumer housing credit)
      cards:      'CORCCACBS',  // Credit-card charge-off rate
    };
    const EXTRA_DEFAULT_SERIES = {
      cardDelinq: 'DRCCLACBS', // Credit-card delinquency rate
      ciDelinq:   'DRBLACBS',  // C&I loan delinquency rate
    };

    let spreadData = null;
    let chargeoffData = null;
    let extraDefaultSeries = {};
    let delinquencyRates = null;
    let lendingStandards = null;
    let commercialPaper  = null;
    let excessReserves   = null;
    let tedSpread        = null;

    if (FRED_API_KEY) {
      trackApiCall('FRED');
      const [spreadResults, chargeoffResults, extraDefaultResults, delinqResults, lendingStdResult, cpRateResults, excessResResult] = await Promise.all([
        Promise.allSettled(
          // Daily BAML OAS series — pull ~3 months so short outages still
          // leave enough points for the KPI strip + history charts.
          Object.entries(CREDIT_SPREAD_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, FRED_API_KEY, 66)]
          )
        ),
        Promise.allSettled(
          Object.entries(CHARGEOFF_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, FRED_API_KEY, 24)]
          )
        ),
        Promise.allSettled(
          Object.entries(EXTRA_DEFAULT_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, FRED_API_KEY, 24)]
          )
        ),
        Promise.allSettled([
          fetchFredHistory('DRSFRWBS',   FRED_API_KEY, 24).then(d => ['sfrMortgage', d]),
          fetchFredHistory('DRSFRMACBS', FRED_API_KEY, 24).then(d => ['sfrMortgageChargeoff', d]),
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
      spreadResults.forEach(r => {
        if (r.status === 'fulfilled') raw[r.value[0]] = r.value[1];
        else if (r.status === 'rejected') _errors.spreadData = r.reason?.message || 'FRED spread fetch failed';
      });

      // Keep last ~60 trading days for charts; KPIs only need the latest print.
      const igArr  = (raw.IG  || []).slice(-60);
      const hyArr  = (raw.HY  || []).slice(-60);
      const emArr  = (raw.EM  || []).slice(-60);
      const bbbArr = (raw.BBB || []).slice(-60);
      const cccArr = (raw.CCC || []).slice(-60);

      // Any series with ≥1 observation is enough for Key Metrics. Previously
      // we required ≥6 points on IG/HY; a partial FRED batch left spreadData
      // null, then an all-null shell blocked cache merge from restoring values.
      const anchorArr =
        (igArr.length  ? igArr  : null) ||
        (hyArr.length  ? hyArr  : null) ||
        (emArr.length  ? emArr  : null) ||
        (bbbArr.length ? bbbArr : null);

      if (anchorArr) {
        // FRED reports BAML OAS series in *percent* (e.g. 0.81 = 81 bps).
        // The dashboard formats these with a "bps" suffix, so multiply by 100
        // before rounding. Without ×100 we silently rendered 81 bps as "1 bps".
        const toBps = v => (v == null || !Number.isFinite(Number(v)) ? null : Math.round(Number(v) * 100));
        const byDate = (arr) => {
          const m = new Map();
          (arr || []).forEach(p => { if (p?.date != null) m.set(p.date, p.value); });
          return m;
        };
        const igMap = byDate(igArr);
        const hyMap = byDate(hyArr);
        const emMap = byDate(emArr);
        const bbbMap = byDate(bbbArr);
        const cccMap = byDate(cccArr);
        const latestOf = (arr) => (arr?.length ? toBps(arr.at(-1).value) : null);

        spreadData = {
          current: {
            igSpread:  latestOf(igArr),
            hySpread:  latestOf(hyArr),
            emSpread:  latestOf(emArr),
            bbbSpread: latestOf(bbbArr),
            cccSpread: latestOf(cccArr),
          },
          history: {
            // Align all series to the anchor date grid (not equal-length arrays)
            dates: anchorArr.map(p => dateToMonthLabel(p.date)),
            IG:    anchorArr.map(p => (igMap.has(p.date)  ? toBps(igMap.get(p.date))  : null)),
            HY:    anchorArr.map(p => (hyMap.has(p.date)  ? toBps(hyMap.get(p.date))  : null)),
            EM:    anchorArr.map(p => (emMap.has(p.date)  ? toBps(emMap.get(p.date))  : null)),
            BBB:   anchorArr.map(p => (bbbMap.has(p.date) ? toBps(bbbMap.get(p.date)) : null)),
            CCC:   anchorArr.map(p => (cccMap.has(p.date) ? toBps(cccMap.get(p.date)) : null)),
          },
          etfs: [],
        };
      }

      const coRaw = {};
      chargeoffResults.forEach(r => { if (r.status === 'fulfilled') coRaw[r.value[0]] = r.value[1]; });
      extraDefaultResults.forEach(r => {
        if (r.status === 'fulfilled') extraDefaultSeries[r.value[0]] = r.value[1];
      });

      const toQLabel = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00Z');
        const q = Math.ceil((d.getUTCMonth() + 1) / 3);
        return `Q${q}-${String(d.getUTCFullYear()).slice(2)}`;
      };
      const packSeries = (arr, n = 12) => (arr || []).slice(-n).map(p => ({
        date: p.date,
        label: toQLabel(p.date),
        value: Math.round(Number(p.value) * 100) / 100,
      }));

      const coCommercial = packSeries(coRaw.commercial, 12);
      const coConsumer   = packSeries(coRaw.consumer, 12);
      const coCards      = packSeries(coRaw.cards, 12);
      const coAnchor     = coCommercial.length ? coCommercial
        : (coConsumer.length ? coConsumer : coCards);

      // Accept even a single quarter — charge-offs feed the Default Rates panel.
      if (coAnchor.length >= 1) {
        chargeoffData = {
          dates:      coAnchor.map(p => p.label),
          commercial: coCommercial.length ? coAnchor.map(a => {
            const hit = coCommercial.find(p => p.date === a.date);
            return hit ? hit.value : null;
          }) : coAnchor.map(() => null),
          consumer:   coConsumer.length ? coAnchor.map(a => {
            const hit = coConsumer.find(p => p.date === a.date) || coConsumer.find(p => p.label === a.label);
            return hit ? hit.value : null;
          }) : coAnchor.map(() => null),
          cards:      coCards.length ? coAnchor.map(a => {
            const hit = coCards.find(p => p.date === a.date) || coCards.find(p => p.label === a.label);
            return hit ? hit.value : null;
          }) : coAnchor.map(() => null),
          // raw packed series for peak / prev lookups
          _commercial: coCommercial,
          _consumer: coConsumer,
          _cards: coCards,
        };
      }

      const delinqRaw = {};
      delinqResults.forEach(r => { if (r.status === 'fulfilled') delinqRaw[r.value[0]] = r.value[1]; });

      const delinqArr = [];
      const sfr = delinqRaw.sfrMortgage || [];
      const sfrChargeoff = delinqRaw.sfrMortgageChargeoff || [];
      const allLoans = delinqRaw.allLoans || [];
      if (sfr.length > 0) {
        const latest = sfr[sfr.length - 1];
        delinqArr.push({ type: 'SFR Mortgage Delinquency', rate: Math.round(latest.value * 100) / 100, series: 'DRSFRWBS', history: { dates: sfr.map(p => p.date), values: sfr.map(p => Math.round(p.value * 100) / 100) } });
      }
      if (sfrChargeoff.length > 0) {
        const latest = sfrChargeoff[sfrChargeoff.length - 1];
        delinqArr.push({ type: 'Mortgage Charge-Off Rate', rate: Math.round(latest.value * 100) / 100, series: 'DRSFRMACBS', history: { dates: sfrChargeoff.map(p => p.date), values: sfrChargeoff.map(p => Math.round(p.value * 100) / 100) } });
      }
      if (allLoans.length > 0) {
        const latest = allLoans[allLoans.length - 1];
        delinqArr.push({ type: 'All Loans Delinquency', rate: Math.round(latest.value * 100) / 100, series: 'DRALACBS', history: { dates: allLoans.map(p => p.date), values: allLoans.map(p => Math.round(p.value * 100) / 100) } });
      }
      delinquencyRates = delinqArr.length > 0 ? delinqArr : null;

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
        const fin = cpRaw.financial3m    != null ? Math.round(cpRaw.financial3m    * 100) / 100 : null;
        const non = cpRaw.nonfinancial3m != null ? Math.round(cpRaw.nonfinancial3m * 100) / 100 : null;
        // .rate = average of whichever series came back (used by KPI strip + Key Metrics panel)
        const cpAvg = (fin != null && non != null) ? Math.round((fin + non) / 2 * 100) / 100
                    : (fin ?? non);
        commercialPaper = {
          financial3m:    fin,
          nonfinancial3m: non,
          rate:           cpAvg,
          volume:         null,
          history:        { dates: [], values: [] },
        };
      }

      const excessRaw = excessResResult[0]?.status === 'fulfilled' ? excessResResult[0].value : [];
      excessReserves = excessRaw.length >= 4 ? {
        dates:  excessRaw.map(p => p.date),
        values: excessRaw.map(p => Math.round(p.value * 10) / 10),
      } : null;
    }

    // TED Spread (LIBOR - T-bill) — classic credit stress indicator.
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const tedRaw = await fetchFredHistory('TEDRATE', FRED_API_KEY, 252);
        if (tedRaw?.length > 0) {
          // TEDRATE (LIBOR-based) was discontinued when LIBOR ended; FRED
          // still returns its final historical points. Only ship it as a
          // live read if the last observation is recent — otherwise the
          // panel would show a stale number as a current credit signal.
          const next = buildTedSpread(tedRaw);
          if (next) tedSpread = next;
          else console.warn('[Credit] TEDRATE stale — omitting tedSpread');
        }
      } catch (e) { console.warn('[Credit] TEDRATE:', e.message || e); _errors.tedSpread = e.message; }
    }

    // Moody's seasoned Aaa vs Baa corporate bond yields, plus the derived
    // Baa-Aaa spread. The spread is a classic credit-cycle gauge: it
    // widens in stress (investors demand more compensation for lower
    // rated paper) and tightens in benign environments. FRED reports both
    // series in *percent*; convert to bps for the spread to keep units
    // consistent with the rest of the credit panel.
    let creditQuality = null;
    if (FRED_API_KEY) {
      try {
        trackApiCall('FRED');
        const [aaaRes, baaRes] = await Promise.all([
          fetchFredHistory('DAAA', FRED_API_KEY, 261).catch(() => null),  // ~1y daily
          fetchFredHistory('DBAA', FRED_API_KEY, 261).catch(() => null),
        ]);
        if (aaaRes?.length && baaRes?.length) {
          // Inner-join on date so the spread is well-defined for each point.
          const baaByDate = new Map(baaRes.map(p => [p.date, p.value]));
          const aligned = aaaRes
            .filter(p => baaByDate.has(p.date) && p.value != null && baaByDate.get(p.date) != null)
            .map(p => ({ date: p.date, aaa: p.value, baa: baaByDate.get(p.date) }));
          if (aligned.length) {
            const last = aligned[aligned.length - 1];
            creditQuality = {
              dates: aligned.map(p => p.date),
              aaaPct: aligned.map(p => Math.round(p.aaa * 100) / 100),
              baaPct: aligned.map(p => Math.round(p.baa * 100) / 100),
              spreadBps: aligned.map(p => Math.round((p.baa - p.aaa) * 100)),
              latest: {
                date:      last.date,
                aaaPct:    Math.round(last.aaa * 100) / 100,
                baaPct:    Math.round(last.baa * 100) / 100,
                spreadBps: Math.round((last.baa - last.aaa) * 100),
              },
            };
          }
        }
      } catch (e) { console.warn('[Credit] DAAA/DBAA:', e.message || e); _errors.creditQuality = e.message; }
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
    } catch (e) { console.warn('[Credit]', e.message || e); _errors.spreadData = e.message; }

    if (spreadData) spreadData.etfs = etfs;

    const EM_BOND_TICKERS = {
      BRZ:  { country: 'Brazil',         code: 'BR', region: 'Latin America', rating: 'BB-', debtGdp: 78,  yahooETF: 'EWZ'  },
      MEX:  { country: 'Mexico',         code: 'MX', region: 'Latin America', rating: 'BBB',  debtGdp: 53,  yahooETF: 'EWW'  },
      TUR:  { country: 'Turkey',         code: 'TR', region: 'EMEA',           rating: 'B+',   debtGdp: 35,  yahooETF: 'TUR'  },
      ZAF:  { country: 'South Africa',   code: 'ZA', region: 'EMEA',           rating: 'BB-',  debtGdp: 72,  yahooETF: 'EZA'  },
      IDN:  { country: 'Indonesia',      code: 'ID', region: 'Asia-Pacific',   rating: 'BBB',  debtGdp: 39,  yahooETF: 'EIDO' },
      IND:  { country: 'India',          code: 'IN', region: 'Asia-Pacific',   rating: 'BBB-', debtGdp: 83,  yahooETF: 'INDA' },
      CHN:  { country: 'China',          code: 'CN', region: 'Asia-Pacific',   rating: 'A+',   debtGdp: 83,  yahooETF: 'MCHI' },
      KOR:  { country: 'South Korea',   code: 'KR', region: 'Asia-Pacific',   rating: 'AA-',  debtGdp: 54,  yahooETF: 'EWY'  },
      RUS:  { country: 'Russia',         code: 'RU', region: 'EMEA',           rating: 'NR',   debtGdp: 20,  yahooETF: null   },
      POL:  { country: 'Poland',         code: 'PL', region: 'EMEA',           rating: 'A-',   debtGdp: 50,  yahooETF: 'EPOL' },
      COL:  { country: 'Colombia',       code: 'CO', region: 'Latin America', rating: 'BB+',  debtGdp: 56,  yahooETF: 'GXG'  },
      CHL:  { country: 'Chile',          code: 'CL', region: 'Latin America', rating: 'A-',   debtGdp: 38,  yahooETF: 'ECH'  },
      HUN:  { country: 'Hungary',        code: 'HU', region: 'EMEA',           rating: 'BBB',  debtGdp: 71,  yahooETF: 'EWH'  },
      MYS:  { country: 'Malaysia',       code: 'MY', region: 'Asia-Pacific',   rating: 'A-',   debtGdp: 65,  yahooETF: 'EWM'  },
      PHL:  { country: 'Philippines',    code: 'PH', region: 'Asia-Pacific',   rating: 'BBB+', debtGdp: 57,  yahooETF: 'EPHE' },
      EGY:  { country: 'Egypt',          code: 'EG', region: 'EMEA',           rating: 'B+',   debtGdp: 90,  yahooETF: 'EGPT' },
    };

let emBondCountries = [];
    let emBondRegions = {};
    let emYieldDataFetched = false;

    try {
      trackApiCall('Yahoo Finance');
      const embQuote = await yf.quote('EMB').catch(() => null);
      const emSpread = spreadData?.current?.emSpread ?? null;

      const etfTickers = Object.entries(EM_BOND_TICKERS)
        .filter(([, v]) => v.yahooETF)
        .map(([k, v]) => ({ key: k, ticker: v.yahooETF }));
      const etfSymbols = etfTickers.map(e => e.ticker);

      let etfQuotes = {};
      try {
        const etfResults = await Promise.allSettled(etfSymbols.map(t => yf.quote(t)));
        etfResults.forEach((r, i) => {
          if (r.status === 'fulfilled') etfQuotes[etfTickers[i].ticker] = r.value;
        });
      } catch (_) { /* non-fatal */ }

      for (const [key, info] of Object.entries(EM_BOND_TICKERS)) {
        const etfQuote = info.yahooETF ? etfQuotes[info.yahooETF] : null;
        const price = etfQuote?.regularMarketPrice ?? null;
        const change1d = etfQuote?.regularMarketChangePercent ?? null;
        const yld10y = emYieldFromEtfQuote(etfQuote);

        const country = {
          country:   info.country,
          code:      info.code,
          rating:    info.rating,
          spread:    emSpread,
          change1m:  change1d != null ? Math.round(change1d * 10) / 10 : null,
          yld10y,
          debtGdp:   info.debtGdp,
          etfTicker: info.yahooETF,
          etfPrice:  price,
          etfYield,
          dataSource: price != null ? 'Yahoo Finance' : 'no-yahoo-data',
        };

        emBondCountries.push(country);

        if (!emBondRegions[info.region]) {
          emBondRegions[info.region] = { region: info.region, countries: [], avgSpread: 0, count: 0 };
        }
        emBondRegions[info.region].countries.push(country.code);
        if (country.spread != null) {
          emBondRegions[info.region].avgSpread += country.spread;
          emBondRegions[info.region].count++;
        }
      }

      emBondRegions = Object.values(emBondRegions).map(r => ({
        region: r.region,
        avgSpread: r.count > 0 ? Math.round(r.avgSpread / r.count) : null,
      }));

      emYieldDataFetched = true;
    } catch (e) {
      console.warn('[Credit] EM bond yield fetch failed:', e.message || e);
      _errors.emBondData = e.message;
    }

    const emBondData = {
      countries: emBondCountries,
      regions: Object.values(emBondRegions),
      noYahoo: emBondCountries.filter(c => c.dataSource === 'no-yahoo-data').map(c => c.country),
    };

    const igLatest = spreadData?.current?.igSpread ?? null;
    const hyLatest = spreadData?.current?.hySpread ?? null;

    const cloTranches = [];
    if (igLatest != null || hyLatest != null) {
      const igBase = igLatest ?? 100;
      const cloConventions = [
        { tranche: 'AAA',  spreadOffset: -40, rating: 'AAA', ltv: 65 },
        { tranche: 'AA',   spreadOffset:  10, rating: 'AA',  ltv: 72 },
        { tranche: 'A',    spreadOffset:  50, rating: 'A',   ltv: 78 },
        { tranche: 'BBB',  spreadSource: 'bbb', rating: 'BBB', ltv: 83 },
        { tranche: 'BB',   spreadOffset: 380, rating: 'BB',  ltv: 89 },
        { tranche: 'B',    spreadOffset: 710, rating: 'B',   ltv: 94 },
      ];
      for (const c of cloConventions) {
        let spread;
        if (c.spreadSource === 'bbb') {
          spread = spreadData?.current?.bbbSpread ?? null;
        } else {
          spread = Math.round(igBase + c.spreadOffset);
        }
        const yieldBase = c.tranche === 'BBB' || c.tranche === 'BB' || c.tranche === 'B'
          ? (etfs.find(e => e.ticker === 'HYG')?.yieldPct ?? null)
          : (etfs.find(e => e.ticker === 'LQD')?.yieldPct ?? null);
        cloTranches.push({
          tranche: c.tranche,
          spread,
          yield: yieldBase != null ? Math.round((yieldBase + (spread ?? 0) / 100) * 100) / 100 : null,
          rating: c.rating,
          ltv: c.ltv,
        });
      }
    }

    // Only real loan proxies — never ship proprietary/null index shells.
    const bkln = etfs.find(e => e.ticker === 'BKLN');
    const loanIndices = [];
    if (bkln?.price != null) {
      loanIndices.push({
        name: 'BKLN NAV',
        value: bkln.price,
        change1d: bkln.change1d ?? undefined,
      });
    }
    const liveClo = (cloTranches || []).filter(t => t.spread != null || t.yield != null);
    const loanData = (liveClo.length || loanIndices.length)
      ? { cloTranches: liveClo, indices: loanIndices }
      : null;

    // Build defaultData from real FRED bank charge-off / delinquency series.
    // Moody's HY TTM default rates are proprietary — do not ship null placeholders.
    const seriesStats = (packed) => {
      const vals = (packed || []).map(p => (typeof p === 'number' ? p : p?.value))
        .filter(v => typeof v === 'number' && Number.isFinite(v));
      if (!vals.length) return { value: null, prev: null, peak: null };
      return {
        value: vals[vals.length - 1],
        prev: vals.length > 1 ? vals[vals.length - 2] : null,
        peak: Math.round(Math.max(...vals) * 100) / 100,
      };
    };

    const coCommStats = seriesStats(chargeoffData?._commercial?.length
      ? chargeoffData._commercial
      : chargeoffData?.commercial);
    const coConsStats = seriesStats(chargeoffData?._consumer?.length
      ? chargeoffData._consumer
      : chargeoffData?.consumer);
    const coCardStats = seriesStats(chargeoffData?._cards?.length
      ? chargeoffData._cards
      : chargeoffData?.cards);

    const packExtra = (arr) => (arr || []).slice(-12).map(p => ({
      date: p.date,
      value: Math.round(Number(p.value) * 100) / 100,
    }));
    const cardDelinqStats = seriesStats(packExtra(extraDefaultSeries.cardDelinq));
    const ciDelinqStats = seriesStats(packExtra(extraDefaultSeries.ciDelinq));

    // CCC/HY OAS ratio (×100): higher = more stressed credit market. Not a %.
    const cccSpread = spreadData?.current?.cccSpread ?? null;
    const hySpread  = spreadData?.current?.hySpread  ?? null;
    const distressedProxy = (cccSpread != null && hySpread != null && hySpread > 0)
      ? Math.round((cccSpread / hySpread) * 100 * 10) / 10
      : null;

    const rateRows = [
      { category: 'C&I Charge-Off Rate', series: 'DRALACBN', ...coCommStats, unit: '%', source: 'FRED' },
      { category: 'Mortgage Charge-Off Rate', series: 'DRSFRMACBS', ...coConsStats, unit: '%', source: 'FRED' },
      { category: 'Credit Card Charge-Off', series: 'CORCCACBS', ...coCardStats, unit: '%', source: 'FRED' },
      { category: 'Credit Card Delinquency', series: 'DRCCLACBS', ...cardDelinqStats, unit: '%', source: 'FRED' },
      { category: 'C&I Delinquency Rate', series: 'DRBLACBS', ...ciDelinqStats, unit: '%', source: 'FRED' },
      { category: 'HY OAS (stress)', series: 'BAMLH0A0HYM2', value: hySpread, unit: 'bps', source: 'FRED' },
      { category: 'CCC/HY Distress Ratio', series: 'BAMLH0A3HYC/BAMLH0A0HYM2', value: distressedProxy, unit: 'idx', source: 'FRED' },
    ]
      .filter(r => r.value != null)
      .map((r) => {
        const out = { category: r.category, series: r.series, value: r.value, unit: r.unit, source: r.source };
        if (r.prev != null) out.prev = r.prev;
        if (r.peak != null) out.peak = r.peak;
        return out;
      });

    // Trend history for charts: bank charge-offs (real), not proprietary HY defaults.
    const defaultHistory = chargeoffData?.dates?.length
      ? {
          dates: chargeoffData.dates,
          hy: chargeoffData.commercial || [],   // panel legend: use C&I as primary
          loan: chargeoffData.consumer || [],
          commercial: chargeoffData.commercial || [],
          consumer: chargeoffData.consumer || [],
          cards: chargeoffData.cards || [],
        }
      : null;

    // Strip internal packed helpers before shipping to the client
    const chargeoffsPublic = chargeoffData
      ? {
          dates: chargeoffData.dates,
          commercial: chargeoffData.commercial,
          consumer: chargeoffData.consumer,
          cards: chargeoffData.cards,
        }
      : null;

    const defaultData = rateRows.length || chargeoffsPublic
      ? {
          rates: rateRows,
          chargeoffs: chargeoffsPublic,
          defaultHistory,
        }
      : null;

    const _sources = {
      spreadData:       spreadData != null,
      emBondData:       emYieldDataFetched,
      emBondData_countries: emBondCountries.length,
      emBondData_noYahoo: emBondCountries.filter(c => c.dataSource === 'no-yahoo-data').map(c => c.country),
      loanData:         loanData != null,
      cloTranches:      cloTranches.length > 0,
      cloTranches_computed: true,
      yahooCLO:         etfs.some(e => e.yieldPct != null),
      defaultData:      defaultData != null,
      delinquencyRates: delinquencyRates != null,
      delinquencyRates_DRSFRWBS: delinquencyRates?.some(d => d.series === 'DRSFRWBS') ?? false,
      delinquencyRates_DRSFRMACBS: delinquencyRates?.some(d => d.series === 'DRSFRMACBS') ?? false,
      delinquencyRates_DRALACBS: delinquencyRates?.some(d => d.series === 'DRALACBS') ?? false,
      lendingStandards:  lendingStandards != null,
      commercialPaper:  commercialPaper != null,
      excessReserves:   excessReserves != null,
      tedSpread:        tedSpread != null,
    };

    // Prefer real spreadData (or null). Do NOT substitute an all-null shell —
    // mergeWithPreviousCache only fills empty/null fields, and a null shell
    // object would block restoring yesterday's live OAS prints.
    const hasLiveSpreads = !!(
      spreadData?.current &&
      Object.values(spreadData.current).some(v => v != null)
    );
    if (spreadData && etfs?.length) spreadData.etfs = etfs;
    else if (spreadData) spreadData.etfs = spreadData.etfs || [];

    // isLive: true if any of the headline sources came back with data. The
    // route was previously omitting this entirely, which made every panel
    // that gated FETCHED on isLive (e.g. Credit Key Metrics) flip to
    // NO DATA — even though spreads, EM yields and default rates were live.
    const isLive = !!(
      hasLiveSpreads ||
      emYieldDataFetched ||
      loanData ||
      (defaultData?.rates || []).some(r => r?.value != null) ||
      delinquencyRates ||
      lendingStandards ||
      commercialPaper ||
      excessReserves
    );

    const result = {
      _sources: { ..._sources, spreadData: hasLiveSpreads },
      spreadData: hasLiveSpreads ? spreadData : null,
      emBondData,
      loanData,
      defaultData,
      delinquencyRates,
      lendingStandards,
      commercialPaper,
      excessReserves,
      creditQuality,
      tedSpread,
      isLive,
    };
    return result;
  }
}));

export default router;
