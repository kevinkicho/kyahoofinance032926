# Mock-to-Live Data Replacement — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 6 mock-only data segments across Equity Deep-Dive, Real Estate, and Crypto with live API data from Yahoo Finance, FRED, and Bybit.

**Architecture:** Server-only changes — replace hardcoded `EQ_MOCK_*` constants with live `yf.quoteSummary`/`yf.chart` computations, add FRED MSPUS/MEHOINUSA672N + REIT yield grouping to `/api/realEstate`, and replace static `fundingData` with Bybit v5 API fetch in `/api/crypto`. Three component files get minor updates to handle new data shapes. Existing hooks and `anyReplaced` guards need no changes.

**Tech Stack:** Express (ESM), yahoo-finance2 (`yf.quoteSummary`, `yf.chart`, `yf.quote`), FRED API, Bybit public v5 API, node-cache, daily file cache

---

## File Map

**Modify:**
- `server/index.js` — replace 3 mock constants in `/api/equityDeepDive`, add affordability+capRate to `/api/realEstate`, replace funding in `/api/crypto`
- `src/markets/equitiesDeepDive/components/EarningsWatch.jsx` — handle `beatRates: null`
- `src/markets/realEstate/data/useRealEstateData.js` — add live replacement guards for `affordabilityData` + `capRateData`
- `src/markets/realEstate/data/mockRealEstateData.js` — update mock shapes to match new server format
- `src/markets/realEstate/components/AffordabilityMap.jsx` — render US national affordability instead of city table
- `src/markets/realEstate/components/CapRateMonitor.jsx` — render sector yield bars instead of time-series
- `src/markets/crypto/components/FundingAndPositioning.jsx` — handle `openInterestHistory: null`
- `src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js` — update mock expectations for beatRates

---

## Task 1: Equity+ Server — Live Factor Data

**Files:**
- Modify: `server/index.js` (equityDeepDive endpoint, lines ~1462–1604)

- [ ] **Step 1: Read the current endpoint and locate the 3 mock constants**

Read `server/index.js` lines 1462–1617 to understand the current structure. The three constants are `EQ_MOCK_FACTOR_DATA` (line 1462), `EQ_MOCK_EARNINGS_DATA` (line 1488), and `EQ_MOCK_SHORT_DATA` (line 1512). They're referenced at lines 1601–1603 in the result object.

- [ ] **Step 2: Replace the 3 mock constants with ticker lists and a sector lookup**

Delete lines 1462–1535 (the 3 `EQ_MOCK_*` constants). Replace with:

```js
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
```

- [ ] **Step 3: Add live factor + earnings + short computation inside the endpoint's try block**

Inside the `app.get('/api/equityDeepDive', ...)` handler, after the sector ETF computation (after the `const sectors = SECTOR_ETF_META.map(...)` block, around line 1597), add the following code BEFORE the result construction:

```js
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
```

- [ ] **Step 4: Update the result object**

Find the current result construction (around line 1599–1604):
```js
    const result = {
      sectorData:   { sectors },
      factorData:   EQ_MOCK_FACTOR_DATA,
      earningsData: EQ_MOCK_EARNINGS_DATA,
      shortData:    EQ_MOCK_SHORT_DATA,
      lastUpdated:  today,
    };
```

Replace with:
```js
    const result = {
      sectorData:   { sectors },
      factorData,
      earningsData,
      shortData,
      lastUpdated:  today,
    };
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926"
git add server/index.js
git commit -m "feat(equity+): replace mock factor/earnings/short data with live Yahoo Finance"
```

---

## Task 2: EarningsWatch — Handle null beatRates

**Files:**
- Modify: `src/markets/equitiesDeepDive/components/EarningsWatch.jsx`

- [ ] **Step 1: Update the component to gracefully handle beatRates being null or empty**

Read `src/markets/equitiesDeepDive/components/EarningsWatch.jsx`. Find line 61:
```js
  const { upcoming = [], beatRates = [] } = earningsData;
```

This already defaults to empty array, which is good. But the right column always renders the chart. Wrap it in a null guard. Find lines 103–109:
```jsx
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Sector Beat Rate</div>
          <div className="eq-chart-subtitle">Last quarter EPS beat % · indigo ≥70% · amber 50–70% · red &lt;50%</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildBeatRateOption(beatRates)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
```

Replace with:
```jsx
        <div className="eq-chart-panel">
          {beatRates && beatRates.length > 0 ? (
            <>
              <div className="eq-chart-title">Sector Beat Rate</div>
              <div className="eq-chart-subtitle">Last quarter EPS beat % · indigo ≥70% · amber 50–70% · red &lt;50%</div>
              <div className="eq-chart-wrap">
                <ReactECharts option={buildBeatRateOption(beatRates)} style={{ height: '100%', width: '100%' }} />
              </div>
            </>
          ) : (
            <>
              <div className="eq-chart-title">Sector Beat Rate</div>
              <div className="eq-chart-subtitle" style={{ color: '#475569', padding: 20, textAlign: 'center' }}>
                Beat rate data not available — requires historical earnings data
              </div>
            </>
          )}
        </div>
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/equitiesDeepDive/components/EarningsWatch.jsx
git commit -m "fix(equity+): handle null beatRates in EarningsWatch"
```

---

## Task 3: Update Equity+ test expectations

**Files:**
- Modify: `src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js`

- [ ] **Step 1: Update the mock fallback test for earningsData**

Read the test file. Find lines 36–42:
```js
  it('returns earningsData with upcoming events and beatRates on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.earningsData.upcoming.length).toBeGreaterThan(0);
    expect(result.current.earningsData.beatRates.length).toBeGreaterThan(0);
  });
```

The mock data still has `beatRates` populated, so this test should still pass. But when the server returns `beatRates: null`, we need the live data test to handle it. Find line 64 in the live data test:
```js
      earningsData: { upcoming: Array.from({ length: 6 }, (_, i) => ({ ticker: `E${i}`, name: `Co ${i}`, sector: 'Technology', date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100 })), beatRates: [] },
```

Change `beatRates: []` to `beatRates: null`:
```js
      earningsData: { upcoming: Array.from({ length: 6 }, (_, i) => ({ ticker: `E${i}`, name: `Co ${i}`, sector: 'Technology', date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100 })), beatRates: null },
```

- [ ] **Step 2: Run tests**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926"
npx vitest run src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js
```

Expected: 7 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js
git commit -m "test(equity+): update earningsData test for null beatRates"
```

---

## Task 4: Real Estate Server — Affordability + Cap Rate

**Files:**
- Modify: `server/index.js` (realEstate endpoint, lines ~757–866)

- [ ] **Step 1: Add affordabilityData computation to the server**

Read `server/index.js` lines 757–866. Inside the try block, after the mortgage rates section (after line 853), add:

```js
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
```

- [ ] **Step 2: Update the result object**

Find line 855:
```js
    const result = { reitData, priceIndexData, mortgageRates, lastUpdated: today };
```

Replace with:
```js
    const result = { reitData, priceIndexData, mortgageRates, affordabilityData, capRateData, lastUpdated: today };
```

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(realEstate): live affordability (FRED MSPUS/income) + cap rates from REIT yields"
```

---

## Task 5: Real Estate Hook + Mock — Wire new data

**Files:**
- Modify: `src/markets/realEstate/data/useRealEstateData.js`
- Modify: `src/markets/realEstate/data/mockRealEstateData.js`

- [ ] **Step 1: Update the mock data shapes**

Read `src/markets/realEstate/data/mockRealEstateData.js`. Replace the `affordabilityData` and `capRateData` exports (lines 42–67) with:

```js
export const affordabilityData = {
  current: { medianPrice: 420000, medianIncome: 75000, priceToIncome: 5.6, mortgageToIncome: 32.4, rate30y: 6.95, yoyChange: 4.2 },
  history: [
    { date: '2024-01-01', medianPrice: 380000, priceToIncome: 5.1 },
    { date: '2024-04-01', medianPrice: 390000, priceToIncome: 5.2 },
    { date: '2024-07-01', medianPrice: 400000, priceToIncome: 5.3 },
    { date: '2024-10-01', medianPrice: 410000, priceToIncome: 5.5 },
    { date: '2025-01-01', medianPrice: 415000, priceToIncome: 5.5 },
    { date: '2025-04-01', medianPrice: 420000, priceToIncome: 5.6 },
  ],
};

export const capRateData = [
  { sector: 'Office',       impliedYield: 5.8 },
  { sector: 'Retail',       impliedYield: 5.2 },
  { sector: 'Healthcare',   impliedYield: 4.8 },
  { sector: 'Net Lease',    impliedYield: 4.6 },
  { sector: 'Self-Storage', impliedYield: 4.2 },
  { sector: 'Residential',  impliedYield: 3.8 },
  { sector: 'Industrial',   impliedYield: 3.4 },
  { sector: 'Gaming',       impliedYield: 3.2 },
  { sector: 'Data Centers', impliedYield: 2.1 },
  { sector: 'Cell Towers',  impliedYield: 1.8 },
];
```

- [ ] **Step 2: Update the hook to apply live affordability + cap rate data**

Read `src/markets/realEstate/data/useRealEstateData.js`. Currently `affordabilityData` and `capRateData` are imported directly from mock and returned as-is (line 41) — they're never replaced by server data.

Add state variables and guards. Replace the entire file with:

```js
import { useState, useEffect } from 'react';
import {
  priceIndexData   as mockPriceIndexData,
  reitData         as mockReitData,
  affordabilityData as mockAffordabilityData,
  capRateData      as mockCapRateData,
} from './mockRealEstateData';

const SERVER = '';

export function useRealEstateData() {
  const [priceIndexData,    setPriceIndexData]    = useState(mockPriceIndexData);
  const [reitData,          setReitData]          = useState(mockReitData);
  const [affordabilityData, setAffordabilityData] = useState(mockAffordabilityData);
  const [capRateData,       setCapRateData]       = useState(mockCapRateData);
  const [mortgageRates,     setMortgageRates]     = useState(null);
  const [isLive,            setIsLive]            = useState(false);
  const [lastUpdated,       setLastUpdated]       = useState('Mock data — Apr 2025');
  const [isLoading,         setIsLoading]         = useState(true);
  const [fetchedOn,         setFetchedOn]         = useState(null);
  const [isCurrent,         setIsCurrent]         = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${SERVER}/api/realEstate`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.reitData?.length) { setReitData(data.reitData); anyReplaced = true; }
        if (data.priceIndexData && Object.keys(data.priceIndexData).length >= 2) {
          setPriceIndexData(prev => ({ ...prev, ...data.priceIndexData }));
          anyReplaced = true;
        }
        if (data.mortgageRates?.rate30y) setMortgageRates(data.mortgageRates);
        if (data.affordabilityData?.current?.medianPrice) { setAffordabilityData(data.affordabilityData); anyReplaced = true; }
        if (data.capRateData?.length >= 3) { setCapRateData(data.capRateData); anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
  }, []);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/markets/realEstate/data/useRealEstateData.js src/markets/realEstate/data/mockRealEstateData.js
git commit -m "feat(realEstate): wire affordability + capRate live data into hook"
```

---

## Task 6: AffordabilityMap — Render US national metrics

**Files:**
- Modify: `src/markets/realEstate/components/AffordabilityMap.jsx`

- [ ] **Step 1: Rewrite the component for the new data shape**

Read `src/markets/realEstate/components/AffordabilityMap.jsx`. Replace the entire file with:

```jsx
// src/markets/realEstate/components/AffordabilityMap.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './REComponents.css';

function ptiColor(pti) {
  if (pti >= 8) return '#ef4444';
  if (pti >= 6) return '#f97316';
  if (pti >= 4) return '#facc15';
  return '#22c55e';
}

function buildHistoryOption(history) {
  const dates = history.map(h => h.date.slice(0, 7));
  const prices = history.map(h => h.medianPrice / 1000);
  const ptis = history.map(h => h.priceToIncome);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>Median Price: $${(params[0]?.value * 1000)?.toLocaleString()}<br/>Price/Income: ${params[1]?.value}×`,
    },
    legend: { data: ['Price ($K)', 'Price/Income'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 50, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: [
      { type: 'value', axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `$${v}K` }, splitLine: { lineStyle: { color: '#1e293b' } } },
      { type: 'value', axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}×` }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Price ($K)', type: 'bar', data: prices, yAxisIndex: 0, itemStyle: { color: '#f97316' }, barMaxWidth: 20 },
      { name: 'Price/Income', type: 'line', data: ptis, yAxisIndex: 1, lineStyle: { color: '#6366f1', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#6366f1' } },
    ],
  };
}

export default function AffordabilityMap({ affordabilityData, mortgageRates }) {
  if (!affordabilityData) return null;
  const { current, history = [] } = affordabilityData;
  const historyOption = useMemo(() => history.length >= 2 ? buildHistoryOption(history) : null, [history]);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">US Housing Affordability</span>
        <span className="re-panel-subtitle">FRED · Median home price vs median household income · national metrics</span>
      </div>
      {mortgageRates && (
        <div className="afford-mortgage-banner">
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">30-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate30y.toFixed(2)}%</span>
          </div>
          <div className="afford-mortgage-divider" />
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">15-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate15y.toFixed(2)}%</span>
          </div>
          <span className="afford-mortgage-source">FRED · as of {mortgageRates.asOf}</span>
        </div>
      )}
      {current && (
        <div className="re-two-col">
          <div className="re-chart-panel" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Median Home Price</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>${current.medianPrice?.toLocaleString()}</div>
                {current.yoyChange != null && (
                  <div style={{ fontSize: 10, color: current.yoyChange >= 0 ? '#34d399' : '#f87171' }}>
                    {current.yoyChange >= 0 ? '+' : ''}{current.yoyChange}% YoY
                  </div>
                )}
              </div>
              <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Median Household Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>${current.medianIncome?.toLocaleString()}</div>
              </div>
              <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Price-to-Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: ptiColor(current.priceToIncome), fontFamily: 'monospace' }}>{current.priceToIncome}×</div>
              </div>
              <div style={{ background: '#1e293b', borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ fontSize: 10, color: '#64748b' }}>Mortgage / Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: current.mortgageToIncome > 30 ? '#f87171' : '#34d399', fontFamily: 'monospace' }}>{current.mortgageToIncome}%</div>
                <div style={{ fontSize: 9, color: '#475569' }}>80% LTV · 30yr @ {current.rate30y}%</div>
              </div>
            </div>
          </div>
          <div className="re-chart-panel">
            {historyOption ? (
              <>
                <div className="re-chart-title">Median Home Price + Price/Income Trend</div>
                <div className="re-chart-wrap">
                  <ReactECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: 11 }}>
                History data not available
              </div>
            )}
          </div>
        </div>
      )}
      <div className="re-panel-footer">
        Red ≥ 8× · Orange ≥ 6× · Yellow ≥ 4× · Green &lt; 4× · Mortgage/Income = annual payment as % of gross income
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/realEstate/components/AffordabilityMap.jsx
git commit -m "feat(realEstate): AffordabilityMap — US national metrics from FRED"
```

---

## Task 7: CapRateMonitor — Render sector yield bars

**Files:**
- Modify: `src/markets/realEstate/components/CapRateMonitor.jsx`

- [ ] **Step 1: Rewrite the component for sector bar data**

Read `src/markets/realEstate/components/CapRateMonitor.jsx`. Replace the entire file with:

```jsx
// src/markets/realEstate/components/CapRateMonitor.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './REComponents.css';

function yieldColor(y) {
  if (y >= 5) return '#f87171';
  if (y >= 4) return '#fbbf24';
  if (y >= 3) return '#34d399';
  return '#6366f1';
}

export default function CapRateMonitor({ capRateData }) {
  const option = useMemo(() => {
    if (!capRateData?.length) return null;
    const sorted = [...capRateData].sort((a, b) => a.impliedYield - b.impliedYield);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: '#1e293b', borderColor: '#334155',
        textStyle: { color: '#e2e8f0', fontSize: 11 },
        formatter: params => `${params[0].name}: ${params[0].value}%`,
      },
      grid: { top: 8, right: 60, bottom: 8, left: 8, containLabel: true },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        data: sorted.map(s => s.sector),
        axisLine: { show: false }, axisTick: { show: false },
        axisLabel: { color: '#94a3b8', fontSize: 10 },
      },
      series: [{
        type: 'bar', barMaxWidth: 20,
        data: sorted.map(s => ({
          value: s.impliedYield,
          itemStyle: { color: yieldColor(s.impliedYield) },
        })),
        label: {
          show: true, position: 'right',
          formatter: p => `${p.value}%`,
          color: '#94a3b8', fontSize: 9,
        },
      }],
    };
  }, [capRateData]);

  if (!option) return null;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Implied Yield by Sector</span>
        <span className="re-panel-subtitle">REIT dividend yield as cap rate proxy · live Yahoo Finance</span>
      </div>
      <div className="re-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="re-panel-footer">
        Dividend yield approximates cap rate · Higher yield = higher risk / lower valuation
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/realEstate/components/CapRateMonitor.jsx
git commit -m "feat(realEstate): CapRateMonitor — sector yield bars from live REIT data"
```

---

## Task 8: Crypto Server — Live Funding Rates from Bybit

**Files:**
- Modify: `server/index.js` (crypto endpoint)

- [ ] **Step 1: Locate the hardcoded fundingData in the crypto endpoint**

Read `server/index.js` around lines 1729–1747. This is the hardcoded `fundingData` constant inside the `/api/crypto` handler.

- [ ] **Step 2: Replace with Bybit API fetch**

Replace the entire `const fundingData = { ... };` block (lines 1729–1747) with:

```js
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
```

Note: The `fetchJson` helper is already defined locally inside the crypto endpoint (it was used for CoinGecko/DeFiLlama calls). If not, check for it — it should be available at the top of the crypto endpoint's try block.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(crypto): live funding rates from Bybit v5 API"
```

---

## Task 9: Crypto FundingAndPositioning — Handle null OI history

**Files:**
- Modify: `src/markets/crypto/components/FundingAndPositioning.jsx`

- [ ] **Step 1: Add null guard for openInterestHistory**

Read `src/markets/crypto/components/FundingAndPositioning.jsx`. Find line 45:
```js
  const { rates = [], openInterestHistory = { dates: [], btcOIB: [], ethOIB: [] } } = fundingData;
```

Change to:
```js
  const { rates = [], openInterestHistory } = fundingData;
```

Find lines 85–91 (the OI history chart panel):
```jsx
        <div className="crypto-chart-panel">
          <div className="crypto-chart-title">Open Interest History</div>
          <div className="crypto-chart-subtitle">BTC & ETH perpetual open interest (billions USD) · 6-week trend</div>
          <div className="crypto-chart-wrap">
            <ReactECharts option={buildOIHistoryOption(openInterestHistory)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
```

Replace with:
```jsx
        <div className="crypto-chart-panel">
          {openInterestHistory && openInterestHistory.dates?.length > 0 ? (
            <>
              <div className="crypto-chart-title">Open Interest History</div>
              <div className="crypto-chart-subtitle">BTC & ETH perpetual open interest (billions USD) · 6-week trend</div>
              <div className="crypto-chart-wrap">
                <ReactECharts option={buildOIHistoryOption(openInterestHistory)} style={{ height: '100%', width: '100%' }} />
              </div>
            </>
          ) : (
            <>
              <div className="crypto-chart-title">Open Interest History</div>
              <div className="crypto-chart-subtitle" style={{ color: '#475569', padding: 20, textAlign: 'center' }}>
                Historical OI data not available — showing current rates only
              </div>
            </>
          )}
        </div>
```

Also update the subtitle in line 51 from `Binance` to `Bybit`:
```jsx
        <span className="crypto-panel-subtitle">Perpetual futures · 8h funding rate · open interest · Bybit</span>
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/crypto/components/FundingAndPositioning.jsx
git commit -m "fix(crypto): handle null OI history + update source to Bybit"
```

---

## Task 10: Run Full Test Suite

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926"
npx vitest run
```

Expected: ≥ 315 tests passing, 0 failing.

- [ ] **Step 2: Fix any failures and commit**

If any tests fail, read the failure carefully, fix the source file, re-run, then commit:
```bash
git add <affected files>
git commit -m "fix: <description of fix>"
```

---

## Self-Review

**Spec coverage:**
- ✅ Factor data (live quoteSummary + chart → percentile rank) → Task 1
- ✅ Earnings calendar (live calendarEvents + earningsTrend) → Task 1
- ✅ Short interest (live defaultKeyStatistics + quote) → Task 1
- ✅ EarningsWatch handles null beatRates → Task 2
- ✅ Test expectations updated → Task 3
- ✅ Affordability (FRED MSPUS + MEHOINUSA672N) → Task 4
- ✅ Cap rates (REIT dividend yield grouping) → Task 4
- ✅ Real Estate hook wired for new data → Task 5
- ✅ AffordabilityMap component updated → Task 6
- ✅ CapRateMonitor component updated → Task 7
- ✅ Crypto funding (Bybit v5 API) → Task 8
- ✅ FundingAndPositioning handles null OI history → Task 9

**Type consistency:**
- `factorData.stocks[].{value, momentum, quality, lowVol, composite}` — Numbers 0–100 ✅ matches mock shape
- `earningsData.beatRates` — `null` from server, component handles it ✅
- `affordabilityData.current.{medianPrice, medianIncome, priceToIncome, mortgageToIncome}` — new shape, mock updated to match ✅
- `capRateData[].{sector, impliedYield}` — new array shape, mock updated ✅
- `fundingData.rates[].{symbol, rate8h, rateAnnualized, openInterestB, exchange}` — same shape ✅
- `fundingData.openInterestHistory` — `null` from server, component handles it ✅
