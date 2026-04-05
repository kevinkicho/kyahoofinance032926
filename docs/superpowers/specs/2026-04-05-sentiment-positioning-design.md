# Sentiment & Positioning — Design Spec

**Date:** 2026-04-05
**Sub-project:** 12
**Accent:** Violet `#7c3aed`
**CSS prefix:** `sent-`
**Icon:** 🎭

---

## Goal

Add a Sentiment & Positioning market tab with four sub-views covering cross-asset Fear & Greed, CFTC speculative positioning, a risk-on/risk-off signal dashboard, and a cross-asset returns heatmap. All data is live — no permanent mock data. Simultaneously trim the Derivatives tab from 4 to 3 sub-tabs by migrating Fear & Greed out.

---

## Architecture

Single `/api/sentiment` Express endpoint (matches all 11 existing market tabs). Fetches all data sources in parallel via `Promise.allSettled`. Two-tier cache: daily file cache (`readDailyCache`/`writeDailyCache`) wraps in-memory node-cache (300s TTL). The `useSentimentData` hook uses the standard `anyReplaced` pattern with mock fallback for server failures.

---

## Files Created

```
src/markets/sentiment/
  SentimentMarket.jsx
  SentimentMarket.css
  data/
    mockSentimentData.js
    useSentimentData.js
  components/
    SentimentComponents.css
    FearGreed.jsx
    CftcPositioning.jsx
    RiskDashboard.jsx
    CrossAssetReturns.jsx
src/__tests__/sentiment/
  useSentimentData.test.js
```

## Files Modified

- `server/index.js` — add `/api/sentiment` endpoint + `'sentiment'` in `CACHEABLE_MARKETS` + remove Fear & Greed / vixHistory from `/api/derivatives`
- `src/markets/derivatives/DerivativesMarket.jsx` — remove Fear & Greed sub-tab
- `src/markets/derivatives/data/useDerivativesData.js` — remove `fearGreedData` + `vixHistory`
- `src/hub/markets.config.js` — add sentiment market
- `src/hub/HubLayout.jsx` — import SentimentMarket
- `vite.config.js` — add `/api/sentiment` proxy

## Files Deleted

- `src/markets/derivatives/components/FearGreed.jsx` — migrated to Sentiment (new richer version)

---

## Sub-Tab 1: Fear & Greed (enhanced)

**Layout:** Left column: large gauge + current score/label + 1-week-ago comparison. Right column: 5-indicator breakdown pills stacked + 252-day history area chart.

**Data sources:**
| Indicator | Source | FRED Series / API |
|---|---|---|
| F&G Score (raw) | Alternative.me | `https://api.alternative.me/fng/?limit=252` |
| VIX level + 252d percentile | FRED | `VIXCLS` (252 obs) |
| HY Spread + 252d percentile | FRED | `BAMLH0A0HYM2` (252 obs) |
| Yield Curve | FRED | `T10Y2Y` (latest) |
| SPY 1-month momentum | Yahoo Finance | `yf.chart('SPY', {period1, interval:'1d'})` — 21 trading days |

**Composite score computation (server-side):**
```
vixSignal     = 100 - vixPercentile          // high VIX = fear → low score
hySignal      = 100 - hySpreadPercentile     // wide spread = fear → low score
ycSignal      = clamp((t10y2y + 1) / 2 * 100, 0, 100)  // inverted curve = fear
momentumSignal = clamp((spy1mReturn + 10) / 20 * 100, 0, 100)
altmeSignal   = alternativeMeScore           // 0-100 directly

composite = (altmeSignal*0.30 + vixSignal*0.25 + hySignal*0.20 + momentumSignal*0.15 + ycSignal*0.10)
```

**Response shape for `fearGreedData`:**
```js
{
  score: number,             // composite 0–100
  label: string,             // 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed'
  altmeScore: number,        // raw Alternative.me score
  history: [{ date, value }], // 252 days of Alternative.me score
  indicators: [
    { name: 'Alt.me F&G',   value: number, signal: 'fear'|'neutral'|'greed' },
    { name: 'VIX Level',    value: number, signal, percentile: number },
    { name: 'HY Spread',    value: number, signal, percentile: number },
    { name: 'Yield Curve',  value: number, signal },   // T10Y2Y in %
    { name: 'SPY Momentum', value: number, signal },   // 1m return %
  ],
}
```

---

## Sub-Tab 2: CFTC Positioning

**Layout:** Three sections (Currencies | Equity & Rates | Commodities), each with a horizontal bar chart showing net speculative position as % of open interest. Positive = net long (green), negative = net short (red). "As of [date]" badge since COT is weekly.

**CFTC Socrata API:** `https://publicreporting.cftc.gov/resource/jun7-fc8e.json`
Query selects: `report_date_as_yyyy_mm_dd`, `market_and_exchange_names`, `noncomm_positions_long_all`, `noncomm_positions_short_all`, `open_interest_all`
Order: `report_date_as_yyyy_mm_dd DESC`, limit: 12 (gets latest report for all markets)

**Market name search strings (exact substrings in `market_and_exchange_names`):**
```js
const CFTC_MARKETS = {
  currencies: [
    { code: 'EUR', needle: 'EURO FX' },
    { code: 'JPY', needle: 'JAPANESE YEN' },
    { code: 'GBP', needle: 'BRITISH POUND' },
    { code: 'CAD', needle: 'CANADIAN DOLLAR' },
    { code: 'CHF', needle: 'SWISS FRANC' },
    { code: 'AUD', needle: 'AUSTRALIAN DOLLAR' },
  ],
  equities: [
    { code: 'ES',  needle: 'E-MINI S&P 500' },
    { code: 'NQ',  needle: 'E-MINI NASDAQ-100' },
  ],
  rates: [
    { code: 'ZN',  needle: '10-YEAR U.S. TREASURY NOTES' },
  ],
  commodities: [
    { code: 'GC',  needle: 'GOLD - COMMODITY EXCHANGE' },
    { code: 'CL',  needle: 'CRUDE OIL, LIGHT SWEET' },
  ],
};
```

**netPct computation:** `Math.round((long - short) / oi * 100 * 10) / 10` (same as existing `useCOTData.js`)

**Response shape for `cftcData`:**
```js
{
  asOf: string,  // report date e.g. '2026-04-01'
  currencies:  [{ code, name, netPct, longK, shortK, oiK }],
  equities:    [{ code, name, netPct, longK, shortK, oiK }],
  rates:       [{ code, name, netPct, longK, shortK, oiK }],
  commodities: [{ code, name, netPct, longK, shortK, oiK }],
}
// longK / shortK / oiK = thousands of contracts
```

---

## Sub-Tab 3: Risk Dashboard

**Layout:** 2×3 signal card grid. Each card shows: signal name, current value, risk-on/neutral/risk-off badge (green/slate/red), brief interpretation line. Below the grid: an overall risk appetite score (average of 6 signal scores) shown as a single colored number + label.

**Signals and thresholds:**
```js
const RISK_SIGNALS = [
  {
    name: 'Yield Curve',
    source: 'FRED T10Y2Y',
    riskOn:  v => v > 0.5,
    riskOff: v => v < -0.5,
    fmt: v => `${v.toFixed(2)}%`,
    desc: v => v > 0.5 ? 'Normal — growth expected' : v < -0.5 ? 'Inverted — recession signal' : 'Flat — uncertain',
  },
  {
    name: 'HY Credit Spread',
    source: 'FRED BAMLH0A0HYM2',
    riskOn:  v => v < 350,
    riskOff: v => v > 500,
    fmt: v => `${Math.round(v)}bps`,
    desc: v => v < 350 ? 'Compressed — risk-on' : v > 500 ? 'Wide — stress signal' : 'Elevated — caution',
  },
  {
    name: 'IG Credit Spread',
    source: 'FRED BAMLC0A0CM',
    riskOn:  v => v < 100,
    riskOff: v => v > 150,
    fmt: v => `${Math.round(v)}bps`,
    desc: v => v < 100 ? 'Tight — confidence' : v > 150 ? 'Wide — risk-off' : 'Moderate',
  },
  {
    name: 'VIX',
    source: 'FRED VIXCLS',
    riskOn:  v => v < 15,
    riskOff: v => v > 25,
    fmt: v => v.toFixed(1),
    desc: v => v < 15 ? 'Low vol — complacency' : v > 25 ? 'Elevated fear' : 'Moderate uncertainty',
  },
  {
    name: 'Gold vs USD',
    source: 'Yahoo GLD/UUP ratio',
    riskOn:  v => v < -2,   // gold underperforming dollar (1m return diff)
    riskOff: v => v > 2,    // gold outperforming dollar
    fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    desc: v => v > 2 ? 'Gold bid — safe haven demand' : v < -2 ? 'Dollar bid — risk appetite' : 'Mixed signals',
  },
  {
    name: 'EM vs US Equities',
    source: 'Yahoo EEM/SPY 1m return diff',
    riskOn:  v => v > 2,    // EM outperforming
    riskOff: v => v < -2,   // EM underperforming
    fmt: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
    desc: v => v > 2 ? 'EM outperforming — global risk-on' : v < -2 ? 'EM lagging — flight to quality' : 'Mixed',
  },
];
```

**Server computation:** Fetch `VIXCLS`, `BAMLH0A0HYM2`, `BAMLC0A0CM`, `T10Y2Y` latest values via `fetchFredLatest`. Fetch GLD and UUP 1-month charts via `yf.chart` to compute 1m return diff. Fetch EEM and SPY 1-month charts similarly.

**Response shape for `riskData`:**
```js
{
  overallScore: number,   // 0–100 (100 = full risk-on)
  overallLabel: string,   // 'Risk-On' | 'Neutral' | 'Risk-Off'
  signals: [
    { name, value, unit, signal: 'risk-on'|'neutral'|'risk-off', description, fmt }
  ]
}
```

---

## Sub-Tab 4: Cross-Asset Returns

**Layout:** Heatmap table — 8 asset rows × 4 timeframe columns (1d / 1w / 1m / 3m). Cells color-coded green (positive) → red (negative). Row headers show asset name + category icon. Category groupings as visual section separators: US Equities | Global | Fixed Income | Real Assets | Crypto.

**Assets:**
```js
const RETURN_ASSETS = [
  { ticker: 'SPY',     label: 'S&P 500',       category: 'US Equity' },
  { ticker: 'QQQ',     label: 'Nasdaq 100',     category: 'US Equity' },
  { ticker: 'EEM',     label: 'EM Equities',    category: 'Global' },
  { ticker: 'TLT',     label: 'Long Bonds',     category: 'Fixed Income' },
  { ticker: 'GLD',     label: 'Gold',           category: 'Real Assets' },
  { ticker: 'UUP',     label: 'US Dollar',      category: 'Real Assets' },
  { ticker: 'USO',     label: 'Crude Oil',      category: 'Real Assets' },
  { ticker: 'BTC-USD', label: 'Bitcoin',        category: 'Crypto' },
];
```

**Return computation (server-side):** Use `yf.chart(ticker, { period1: threeMonthsAgo, interval: '1d' })`. Extract closing prices. Compute:
- `ret1d` = (close[-1] / close[-2] - 1) * 100
- `ret1w` = (close[-1] / close[-6] - 1) * 100
- `ret1m` = (close[-1] / close[-22] - 1) * 100
- `ret3m` = (close[-1] / close[0] - 1) * 100

**Response shape for `returnsData`:**
```js
{
  assets: [
    { ticker, label, category, ret1d, ret1w, ret1m, ret3m }
  ],
  asOf: string,  // date of last close
}
```

---

## Hook: `useSentimentData`

Guards for `anyReplaced` pattern:
- `fearGreedData.history.length >= 30`
- `cftcData.currencies.length >= 4`
- `riskData.signals.length >= 4`
- `returnsData.assets.length >= 6`

Returns: `{ fearGreedData, cftcData, riskData, returnsData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent }`

---

## Mock Data (fallback only)

`mockSentimentData.js` exports realistic static values for all four data shapes. These only display while loading or if the server is unreachable — no intent to leave them as permanent fixtures. All mock data is clearly shaped to match the live response exactly so the anyReplaced guards work correctly.

---

## Derivatives Cleanup

**`DerivativesMarket.jsx`:** Remove `FearGreed` import, remove `{ id: 'fear-greed', label: 'Fear & Greed' }` from `SUB_TABS`, remove `fearGreedData`/`vixHistory` from destructured hook return, remove the `FearGreed` render line.

**`useDerivativesData.js`:** Remove `fearGreedData`/`vixHistory` state + setters. Remove `mockFearGreedData` import. Remove from return value. Keep `vixEnrichment` (used by VIXTermStructure) and `volPremium` (used by VolSurface).

**`server/index.js` `/api/derivatives`:** Remove the Alternative.me fetch and FRED `VIXCLS` 252-day history fetch. Remove `fearGreedData` and `vixHistory` from the response object.

**Delete:** `src/markets/derivatives/components/FearGreed.jsx`

---

## Tests

`src/__tests__/sentiment/useSentimentData.test.js` — 8 tests:
1. Mock fallback: `fearGreedData.history` has ≥ 30 entries
2. Mock fallback: `cftcData.currencies` has 6 entries
3. Mock fallback: `riskData.signals` has 6 entries with correct shape
4. Mock fallback: `returnsData.assets` has 8 entries, all with `ret1d`/`ret1m`
5. `isLive` false on server failure
6. `isLive` true when server responds with valid data
7. Guard: `cftcData` with `currencies.length < 4` not applied
8. `fetchedOn` and `isCurrent` exposed correctly

---

## Hub Registration

```js
// markets.config.js — after credit
{ id: 'sentiment', label: 'Sentiment', icon: '🎭' }
```

```jsx
// HubLayout.jsx
import SentimentMarket from '../markets/sentiment/SentimentMarket';
// MARKET_COMPONENTS:
sentiment: SentimentMarket,
```

```js
// vite.config.js proxy
'/api/sentiment': { target: 'http://localhost:3001', changeOrigin: true },
```

---

## Test Count Target

316 (current) + 8 (new) = **≥ 324 passing**
