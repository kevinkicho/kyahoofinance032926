# Equities Deep-Dive Dashboard — Design Spec

**Date:** 2026-04-05  
**Accent color:** Indigo `#6366f1`  
**Sub-project:** 9 of N  

---

## Goal

Add an Equities Deep-Dive workspace to the Global Market Hub — a new top-level tab providing analytical depth beyond the existing Equities treemap: sector rotation tracking, factor-based stock rankings, an earnings watch calendar, and short interest intelligence.

---

## Architecture

Mirrors the Global Macro pattern exactly:

```
src/markets/equitiesDeepDive/
  EquitiesDeepDiveMarket.jsx        — root, sub-tab routing, status bar, loading spinner
  EquitiesDeepDiveMarket.css        — layout, spinner (indigo #6366f1), status bar
  data/
    mockEquityDeepDiveData.js       — static mock for all 4 sub-views
    useEquityDeepDiveData.js        — async hook: useState mock → useEffect fetch → silent fallback
  components/
    SectorRotation.jsx              — ETF heat table + rotation scatter chart
    FactorRankings.jsx              — factor score heat table + factor-in-favor bars
    EarningsWatch.jsx               — upcoming earnings calendar + sector beat/miss chart
    ShortInterest.jsx               — most shorted bars + squeeze candidates bubble chart
    EquityComponents.css            — shared panel, table, chart styles

src/__tests__/equitiesDeepDive/
  useEquityDeepDiveData.test.js
  EquitiesDeepDiveMarket.test.jsx
  SectorRotation.test.jsx
  FactorRankings.test.jsx
  EarningsWatch.test.jsx
  ShortInterest.test.jsx
```

**Modified files:**
- `src/hub/markets.config.js` — add `{ id: 'equitiesDeepDive', label: 'Equity+', icon: '🔍' }`
- `src/hub/HubLayout.jsx` — import + wire `EquitiesDeepDiveMarket`
- `server/index.js` — add `/api/equityDeepDive` endpoint

---

## Sector ETF Universe (12)

| Ticker | Sector | Color |
|--------|--------|-------|
| XLK | Technology | #3b82f6 |
| XLF | Financials | #10b981 |
| XLV | Health Care | #ec4899 |
| XLE | Energy | #f97316 |
| XLI | Industrials | #8b5cf6 |
| XLC | Communication | #06b6d4 |
| XLY | Consumer Disc. | #f59e0b |
| XLP | Consumer Staples | #84cc16 |
| XLRE | Real Estate | #fb923c |
| XLB | Materials | #a78bfa |
| XLU | Utilities | #94a3b8 |
| SPY | S&P 500 (benchmark) | #e2e8f0 |

---

## Data Sources

### Live — Yahoo Finance (`yahoo-finance2`)

`yf.quote(ETF_TICKERS)` — current price + 1D change for all 12 ETFs  
`yf.chart(ticker, { period1: 1yr, interval: '1d' })` — daily closes for multi-timeframe returns (1W/1M/3M/1Y)

Server cache: 300s (intraday data, refresh every 5 min)

### Mock — embedded in server constants + `mockEquityDeepDiveData.js`

- **Factor Rankings** — PE/beta from mock, momentum partially live
- **Earnings Watch** — 14-day calendar + sector beat rates (no clean free API)
- **Short Interest** — top shorted + squeeze candidates (FINRA data requires file download, not API)

---

## Sub-view 1: Sector Rotation

Two panels side by side (`eq-two-col`).

**Left panel — Performance Heat Table:**  
12 rows (11 sector ETFs + SPY benchmark) × 5 columns (1D% / 1W% / 3M% / 1Y%).  
Each cell color-coded: deep green >+3%, light green +1–3%, neutral -1–+1%, light red -3–-1%, deep red <-3%.  
Row for SPY is visually separated (dashed top border) as the benchmark.

**Right panel — Rotation Scatter Chart:**  
ECharts scatter. X-axis = 1M return %, Y-axis = 3M return %. Reference lines at X=0 and Y=0 create four quadrants:
- Top-right: **Leading** (positive 1M + positive 3M)
- Top-left: **Improving** (negative 1M + positive 3M)
- Bottom-left: **Lagging** (negative 1M + negative 3M)
- Bottom-right: **Weakening** (positive 1M + negative 3M)

Each ETF rendered as a labeled dot (ticker code). SPY shown as a diamond reference point.

**Server data shape:**
```json
{
  "sectorData": {
    "sectors": [
      {
        "code": "XLK", "name": "Technology",
        "perf1d": 0.8, "perf1w": 2.1, "perf1m": 5.3, "perf3m": 12.1, "perf1y": 28.4
      }
    ]
  }
}
```

---

## Sub-view 2: Factor Rankings

Two panels stacked vertically (`eq-two-row`).

**Top panel — Factor In Favor:**  
Horizontal bar chart showing 4 factor return scores (Value, Momentum, Quality, Low-Vol) for the current month. Bars colored indigo if positive, red if negative. Shows which factor strategy is currently "working."

**Bottom panel — Stock Factor Heat Table:**  
20 stocks × 5 columns (Value / Momentum / Quality / Low-Vol / Composite). Each factor score is a percentile (1–100). Cells colored green (score > 70), neutral (30–70), red (< 30). Stocks sorted by Composite score descending.

Factor definitions:
- **Value** = inverse P/E rank (lower P/E → higher score)
- **Momentum** = 12-month price return rank
- **Quality** = net income margin rank
- **Low-Vol** = inverse beta rank

**Server data shape:**
```json
{
  "factorData": {
    "inFavor": { "value": 12.3, "momentum": 28.1, "quality": 8.4, "lowVol": -2.1 },
    "stocks": [
      {
        "ticker": "MSFT", "name": "Microsoft", "sector": "Technology",
        "value": 42, "momentum": 88, "quality": 91, "lowVol": 65, "composite": 72
      }
    ]
  }
}
```

---

## Sub-view 3: Earnings Watch

Two panels side by side (`eq-two-col`).

**Left panel — Upcoming Earnings (14 days):**  
Compact table. Columns: Date | Company | Ticker | EPS Est | Prior EPS | Direction arrow (▲ if est > prior, ▼ if est < prior). Grouped by date. Companies sorted by market cap within each date. Color: estimate row background subtle indigo; date header rows dark separator.

**Right panel — Sector Beat Rate (last quarter):**  
Horizontal bar chart. One row per sector (8 sectors). Each bar shows % of companies that beat EPS consensus. Color: green ≥ 70%, amber 50–70%, red < 50%. Reference line at 50%. Label shows beat count "N/M companies."

**Server data shape:**
```json
{
  "earningsData": {
    "upcoming": [
      {
        "ticker": "AAPL", "name": "Apple", "sector": "Technology",
        "date": "2026-04-24", "epsEst": 1.65, "epsPrev": 2.18,
        "marketCapB": 3200
      }
    ],
    "beatRates": [
      { "sector": "Technology", "beatCount": 25, "totalCount": 32, "beatRate": 78.1 }
    ]
  }
}
```

---

## Sub-view 4: Short Interest

Two panels side by side (`eq-two-col`).

**Left panel — Most Shorted (Top 20):**  
Horizontal bar chart, 20 stocks sorted highest short float % first. Bar color: red > 20%, amber 10–20%, green < 10%. X-axis = short float %. Shows days-to-cover as tooltip.

**Right panel — Squeeze Candidates:**  
ECharts bubble/scatter chart. X-axis = short float %, Y-axis = 1W return %, bubble size = market cap (B). Only stocks with short float > 10%. Reference lines at X=15% (high short) and Y=0%. Labeled by ticker.

**Server data shape:**
```json
{
  "shortData": {
    "mostShorted": [
      {
        "ticker": "GME", "name": "GameStop", "sector": "Consumer Disc.",
        "shortFloat": 24.5, "daysToCover": 3.2, "marketCapB": 8.2, "perf1w": 8.4
      }
    ]
  }
}
```

---

## Hook Shape (`useEquityDeepDiveData`)

```javascript
return {
  sectorData,    // { sectors: [] }
  factorData,    // { inFavor: {}, stocks: [] }
  earningsData,  // { upcoming: [], beatRates: [] }
  shortData,     // { mostShorted: [] }
  isLive,
  lastUpdated,
  isLoading,
};
```

Live data guards:
- `sectorData`: update if `data.sectorData?.sectors?.length >= 8`
- `factorData`: update if `data.factorData?.stocks?.length >= 10`
- `earningsData`: update if `data.earningsData?.upcoming?.length >= 5`
- `shortData`: update if `data.shortData?.mostShorted?.length >= 10`

---

## Hub Integration

`markets.config.js`:
```javascript
{ id: 'equitiesDeepDive', label: 'Equity+', icon: '🔍' }
```

`HubLayout.jsx`:
```javascript
import EquitiesDeepDiveMarket from '../markets/equitiesDeepDive/EquitiesDeepDiveMarket';
// add to MARKET_COMPONENTS: equitiesDeepDive: EquitiesDeepDiveMarket
```

---

## Tests (target ~32 new tests across 6 files)

| File | Tests |
|---|---|
| `useEquityDeepDiveData.test.js` | mock fallback shapes, live data replaces state, isLive flag, guard thresholds (7 tests) |
| `EquitiesDeepDiveMarket.test.jsx` | 4 tabs render, tab switching, loading state, status bar (6 tests) |
| `SectorRotation.test.jsx` | 2 chart instances, heat table title, scatter title, null guard, SPY present (5 tests) |
| `FactorRankings.test.jsx` | 2 chart instances, factor-in-favor title, factor table title, null guard (5 tests) |
| `EarningsWatch.test.jsx` | 2 chart instances, upcoming title, beat rate title, null guard (5 tests) |
| `ShortInterest.test.jsx` | 2 chart instances, most shorted title, squeeze title, null guard, color threshold (5 tests) |
