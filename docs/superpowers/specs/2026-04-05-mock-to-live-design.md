# Mock-to-Live Data Replacement — Design Spec

**Date:** 2026-04-05
**Type:** Data quality upgrade (cross-market)

---

## Goal

Replace 6 mock-only data segments across 3 markets (Equity Deep-Dive, Real Estate, Crypto) with live API data. No new market tabs or components — only server-side changes to compute real data where hardcoded constants currently exist. The existing `anyReplaced` hook guards and component rendering require no changes because data shapes are preserved.

---

## Scope

| Market | Mock Data | Live Source | Shape Change |
|---|---|---|---|
| Equity+ | Factor scores (20 stocks) | Yahoo Finance `quoteSummary` + `chart` | Same shape, computed values |
| Equity+ | Earnings calendar | Yahoo Finance `quoteSummary` calendarEvents/earningsTrend | Same shape; `beatRates` stays null |
| Equity+ | Short interest (20 stocks) | Yahoo Finance `quoteSummary` defaultKeyStatistics + `quote` | Same shape, live values |
| Real Estate | Affordability data | FRED (MSPUS, MEHOINUSA672N) + existing mortgage rates | Simplified to US national metrics |
| Real Estate | Cap rate data | Computed from already-fetched REIT dividend yields | Relabeled "Implied Yield by Sector" |
| Crypto | Funding rates | Bybit public v5 API (no auth) | Same shape; `openInterestHistory` drops to null |

---

## What stays mock (no free API)

- Earnings `beatRates` (historical beat data is proprietary)
- Crypto `openInterestHistory` (no free historical OI source)
- All Credit mock segments (EM sovereign, CLO, default rates)
- All Bonds mock segments (duration ladder, rating distribution)
- Insurance reinsurance pricing

---

## Market 1: Equity Deep-Dive (`/api/equityDeepDive`)

### Current state

Lines 1462–1535 of `server/index.js`: three `EQ_MOCK_*` constants hardcoded with 20 stocks. The endpoint fetches live sector ETF data but passes mock constants through unchanged for factorData, earningsData, and shortData.

### Factor tickers (same 20 as mock)

```js
const EQ_FACTOR_TICKERS = [
  'NVDA','MSFT','AAPL','AVGO','META','GOOGL','JPM','V','LLY','UNH',
  'WMT','PG','AMZN','HD','CAT','HON','XOM','CVX','TSLA','INTC',
];
```

### Short interest tickers (same 20 as mock)

```js
const EQ_SHORT_TICKERS = [
  'CVNA','GME','CHWY','RIVN','PLUG','LCID','BYND','CLSK','UPST','MARA',
  'NKLA','OPEN','SPCE','SAVA','LAZR','IONQ','ARRY','XPEV','WOLF',
];
```

(19 tickers — BioAtla `BYSI` may be delisted; use 19 and the component handles fewer.)

### Live computation: factorData

For each of the 20 factor tickers, fetch in parallel:
1. `yf.quoteSummary(ticker, { modules: ['defaultKeyStatistics', 'financialData'] })`
2. `yf.chart(ticker, { period1: 90daysAgo, interval: '1d' })` (for momentum + vol)

Extract per stock:
- `forwardPE` from `defaultKeyStatistics.forwardPE` (fallback: `financialData.currentPrice / financialData.revenuePerShare`)
- `returnOnEquity` from `financialData.returnOnEquity` (decimal, e.g., 0.35 = 35%)
- `closes` array from chart data

Compute per stock:
```js
valueFwd    = forwardPE > 0 ? 1 / forwardPE : 0  // inverse PE, higher = better value
momentum3m  = (closes.at(-1) / closes[0] - 1) * 100  // 3-month return %
roe         = returnOnEquity * 100  // as percentage
realizedVol = stddev(logReturns(closes)) * Math.sqrt(252) * 100  // annualized %
```

Then percentile-rank each metric across the 20 stocks (0–100):
```js
function percentileRank(arr, idx) {
  const val = arr[idx];
  const count = arr.filter(v => v < val).length;
  return Math.round(count / (arr.length - 1) * 100);
}
```

- `value`    = percentileRank of `valueFwd` (high inverse-PE = high value)
- `momentum` = percentileRank of `momentum3m`
- `quality`  = percentileRank of `roe`
- `lowVol`   = percentileRank of inverse `realizedVol` (low vol = high score)
- `composite` = `Math.round((value + momentum + quality + lowVol) / 4)`

`inFavor` field:
```js
const avgByFactor = { value, momentum, quality, lowVol };
// Each is the average score minus 50 (baseline), rounded to 1 decimal
```

### Live computation: earningsData

From the same `quoteSummary` calls (add `'calendarEvents', 'earningsTrend'` to modules), extract:
- `calendarEvents.earnings.earningsDate[0]` → next earnings date (ISO string)
- `earningsTrend.trend` → find entry where `period === '0q'` (current quarter), then `earningsEstimate.avg` → EPS estimate
- `defaultKeyStatistics.trailingEps` → previous EPS
- `defaultKeyStatistics.marketCap` → `marketCapB`

Filter: only include stocks where `earningsDate` is within 45 days from now and in the future.
Sort by `earningsDate` ascending.

`beatRates`: set to `null` — no free API. Component must handle `earningsData.beatRates == null`.

**Response shape:**
```js
earningsData: {
  upcoming: [{ ticker, name, sector, date, epsEst, epsPrev, marketCapB }],
  beatRates: null,
}
```

### Live computation: shortData

For each of the 19 short tickers, fetch:
1. `yf.quoteSummary(ticker, { modules: ['defaultKeyStatistics'] })`
2. `yf.quote(tickers)` (batch call for all 19)

Extract:
- `shortPercentOfFloat` → `shortFloat` (as %, multiply by 100 if decimal)
- `sharesShort` / `averageDailyVolume10Day` → `daysToCover`
- `marketCap` → `marketCapB` (divide by 1e9)
- `regularMarketChangePercent` from quote → `perf1w` (1-day proxy; label in component can stay "1W" — it's approximate)

**Also fetch `yf.quote(tickers)` for name and sector:**
- `shortName` → `name`
- Map ticker to sector via a hardcoded lookup (Yahoo's sector field is inconsistent for small-caps)

Sort by `shortFloat` descending. Filter out any with null `shortPercentOfFloat`.

**Response shape (unchanged):**
```js
shortData: {
  mostShorted: [{ ticker, name, sector, shortFloat, daysToCover, marketCapB, perf1w }]
}
```

---

## Market 2: Real Estate (`/api/realEstate`)

### Current state

Server endpoint fetches REIT quotes, BIS price indices, and mortgage rates live. `affordabilityData` and `capRateData` are only in the client mock file — the server never sends them.

### Live computation: affordabilityData

Add to the server endpoint's `Promise.allSettled`:
- `fetchFredLatest('MSPUS')` — median sales price of existing homes (quarterly, in dollars)
- `fetchFredHistory('MSPUS', 20)` — ~5 years of quarterly data for trend
- `fetchFredLatest('MEHOINUSA672N')` — median household income (annual)

Compute:
```js
const priceToIncome = Math.round(medianPrice / medianIncome * 10) / 10;
const monthlyPayment = medianPrice * 0.8 * (monthlyRate * Math.pow(1 + monthlyRate, 360)) /
                       (Math.pow(1 + monthlyRate, 360) - 1);  // 80% LTV, 30yr
const mortgageToIncome = Math.round(monthlyPayment * 12 / medianIncome * 1000) / 10;  // as %
```

**Response shape:**
```js
affordabilityData: {
  current: { medianPrice, medianIncome, priceToIncome, mortgageToIncome, rate30y },
  history: [{ date, medianPrice, priceToIncome }],  // from MSPUS history
}
```

This replaces the city-by-city international array. The component (`AffordabilityMap.jsx`) will need a minor update to render the new shape — a US national affordability card instead of a city table.

### Live computation: capRateData

Already fetching REIT quotes with `dividendYield`. Group by sector:
```js
const sectorYields = {};
reitData.forEach(r => {
  if (r.dividendYield != null) {
    if (!sectorYields[r.sector]) sectorYields[r.sector] = [];
    sectorYields[r.sector].push(r.dividendYield);
  }
});
const capRateData = Object.entries(sectorYields).map(([sector, yields]) => ({
  sector,
  impliedYield: Math.round(yields.reduce((a, b) => a + b, 0) / yields.length * 10) / 10,
}));
```

**Response shape:**
```js
capRateData: [{ sector, impliedYield }]
```

This replaces the quarterly time-series. The component (`CapRateMonitor.jsx`) will need a minor update to render sector bars instead of a time-series chart.

---

## Market 3: Crypto (`/api/crypto`)

### Current state

`fundingData` is a hardcoded constant with 10 perp funding rates + OI history.

### Live computation: fundingData

Replace with Bybit public v5 API (server-side, no auth, no CORS):

```js
const bybitUrl = 'https://api.bybit.com/v5/market/tickers?category=linear';
```

Returns all USDT linear perpetuals. Filter to our symbols:
```js
const FUNDING_SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','DOGEUSDT','AVAXUSDT',
  'LINKUSDT','BNBUSDT','ADAUSDT','DOTUSDT','NEARUSDT'];
```

Extract per symbol:
- `fundingRate` → `rate8h` (as %, multiply by 100)
- `rate8h * 3 * 365` → `rateAnnualized`
- `openInterest` (in coins) * `lastPrice` → `openInterestB` (in billions)
- Exchange: `'Bybit'`

**Response shape (preserved, minus OI history):**
```js
fundingData: {
  rates: [{ symbol, rate8h, rateAnnualized, openInterestB, exchange }],
  openInterestHistory: null,
}
```

The component already handles `openInterestHistory` being null (the chart section has a null guard).

---

## Files Modified

- `server/index.js` — 3 endpoint changes:
  - `/api/equityDeepDive`: replace `EQ_MOCK_FACTOR_DATA`, `EQ_MOCK_EARNINGS_DATA`, `EQ_MOCK_SHORT_DATA` with live computations
  - `/api/realEstate`: add `affordabilityData` + `capRateData` to server response
  - `/api/crypto`: replace hardcoded `fundingData` with Bybit fetch

- `src/markets/equitiesDeepDive/data/useEquityDeepDiveData.js` — no change needed (guards already exist)

- `src/markets/equitiesDeepDive/components/EarningsWatch.jsx` — handle `beatRates: null` gracefully

- `src/markets/realEstate/data/useRealEstateData.js` — add `affordabilityData` and `capRateData` to the live data replacement logic (currently imported directly from mock, never replaced by server data)

- `src/markets/realEstate/components/AffordabilityMap.jsx` — update to render US national affordability metrics instead of city table

- `src/markets/realEstate/components/CapRateMonitor.jsx` — update to render sector yield bars instead of quarterly time-series

- `src/markets/crypto/data/useCryptoData.js` — verify fundingData guard handles the new shape

- `src/markets/crypto/components/FundingPositioning.jsx` — handle `openInterestHistory: null` (likely already handles it)

---

## Tests

Update `src/__tests__/equityDeepDive/useEquityDeepDiveData.test.js`:
- Existing mock fallback tests should still pass (mock data shapes unchanged)
- Add: live data test with `beatRates: null` passes guard

No new test files needed. Existing 315 tests should continue passing.

---

## Performance Notes

The Equity+ endpoint is now the heaviest — 20 `quoteSummary` calls + 20 `chart` calls + 19 `quoteSummary` calls + 19 `quote` calls. All via `Promise.allSettled` in parallel. With the daily file cache, this only runs once per day. The 300s in-memory cache handles repeat requests.

Bybit API is fast (single call returns all tickers). No rate limit concerns for once-daily calls.

FRED MSPUS/MEHOINUSA672N are quarterly/annual — very lightweight.
