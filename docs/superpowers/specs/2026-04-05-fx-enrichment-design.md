# FX Market Enrichment — Design Spec

**Date:** 2026-04-05
**Type:** Market enrichment (sub-project 3 of market-by-market density pass)

---

## Goal

Transform every FX sub-tab from sparse single-chart/table views into dense dashboards. Add KPI strips, secondary panels (strength bars, rate bars, component breakdowns), and FRED bilateral rate histories for 1-year context charts.

---

## Current State

- **RateMatrix**: 8×8 cross-rate grid with 24h% colors. Just a table.
- **CarryMap**: Interest rate differential matrix with static central bank rates. Just a table.
- **DXYTracker**: Single DXY proxy chart (30-day, 7 lines). Just one chart.
- **TopMovers**: Ranked list of 17 currencies with bars, 1w%, 1m%, sparklines, COT. Already decent density.

Data sources: Frankfurter API (client-side, ECB rates), CFTC COT (client-side), static central bank rates.

---

## New Data Sources (Server)

### New `/api/fx` Endpoint

Create a new server endpoint that provides FRED bilateral exchange rate histories for 1-year context charts. All from FRED (already have helpers + `FRED_API_KEY`).

| Series ID | Name | Frequency | Use |
|---|---|---|---|
| `DEXUSEU` | EUR/USD | Daily | 1yr EUR/USD chart |
| `DEXJPUS` | USD/JPY | Daily | 1yr USD/JPY chart |
| `DEXUSUK` | GBP/USD | Daily | 1yr GBP/USD chart |
| `DEXSZUS` | USD/CHF | Daily | 1yr USD/CHF chart |
| `DEXCAUS` | USD/CAD | Daily | 1yr USD/CAD chart |
| `DEXUSAL` | AUD/USD | Daily | 1yr AUD/USD chart |
| `DTWEXBGS` | Trade-Weighted Dollar | Daily | 1yr DXY context |

### Server Response Shape

```js
{
  fredFxRates: {
    eurUsd:  { dates: [...], values: [...] },  // 252 points
    usdJpy:  { dates: [...], values: [...] },
    gbpUsd:  { dates: [...], values: [...] },
    usdChf:  { dates: [...], values: [...] },
    usdCad:  { dates: [...], values: [...] },
    audUsd:  { dates: [...], values: [...] },
    dollarIndex: { dates: [...], values: [...] },  // DTWEXBGS
  }
}
```

### Mock Data + Hook

New mock data file `mockFxData.js` for fallback. New hook or extension of `useFXData` to fetch from `/api/fx`.

---

## Enriched Sub-Tab Designs

### 1. Rate Matrix (currently: just a table)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: EUR/USD | USD/JPY | Strongest 24h | Weakest 24h               │
├───────────────────────────────────────────┬─────────────────────────┤
│  Cross-Rate Matrix (existing 8x8 table)  │ USD Strength Bars       │
│                                           │ (horizontal bars for    │
│                                           │  each currency vs USD,  │
│                                           │  sorted by 24h change)  │
└───────────────────────────────────────────┴─────────────────────────┘
```

**Components:**
- KPI strip: EUR/USD spot rate, USD/JPY spot rate, strongest currency (most positive 24h change vs USD), weakest currency
- Existing matrix: unchanged, placed in ~70% width
- USD Strength panel: horizontal bars showing 24h% change for each of 8 currencies, sorted by magnitude, centered at 0

### 2. Carry Map (currently: just a table)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: Highest Carry | Lowest Carry | Avg G7 Rate | Rate Range       │
├───────────────────────────────────────────┬─────────────────────────┤
│  Carry Matrix (existing table)            │ Central Bank Rate Bars  │
│                                           │ (horizontal bars,       │
│                                           │  sorted by rate level)  │
└───────────────────────────────────────────┴─────────────────────────┘
```

**Components:**
- KPI strip: highest carry pair name + spread, lowest carry pair, avg G7 rate, rate range (max - min)
- Existing carry matrix: unchanged, ~70% width
- Rate bars: sorted horizontal bars for each currency's policy rate, gold accent color

### 3. DXY Tracker (currently: 1 chart)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: DXY Proxy | 30d Change% | Strongest Component | Weakest       │
├───────────────────────────────────────────┬─────────────────────────┤
│  DXY Proxy Chart (existing, 30d)         │ Component Breakdown     │
│                                           │ (weight + 30d % change  │
│                                           │  for each of 6 curs)   │
├───────────────────────────────────────────┴─────────────────────────┤
│ EUR/USD + USD/JPY 1yr overlay (FRED daily bilateral rates)          │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: DXY proxy level, 30d change%, strongest/weakest component currency
- Existing DXY chart: placed in ~65% width
- Component breakdown: list of 6 currencies with weight %, 30d change %, colored bars
- FRED 1yr chart: dual-line EUR/USD + USD/JPY from `fredFxRates`

### 4. Top Movers (already decent — add KPI strip + G10 vs EM chart)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: Strongest | Weakest | Avg Magnitude | # Moving >0.3%          │
├─────────────────────────────────────────────────────────────────────┤
│  Top Movers List (existing)                                         │
├─────────────────────────────────────────────────────────────────────┤
│ G10 vs EM avg performance bars (grouped horizontal bars)            │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: strongest currency + % change, weakest currency + % change, avg absolute magnitude, count of currencies moving >0.3%
- Existing movers list: kept as-is
- G10 vs EM bars: simple comparison — avg 24h% for G10 currencies vs EM currencies, horizontal diverging bars

---

## Files Modified

### Server (1 file)
- `server/index.js` — Add `/api/fx` endpoint with FRED bilateral rate fetches

### Mock Data (1 new file)
- `src/markets/fx/data/mockFxData.js` — Mock for FRED FX rates

### Hook (1 file)
- `src/markets/fx/data/useFXData.js` — Add fetch from `/api/fx` for FRED rates

### Components (4 files, all modified)
- `src/markets/fx/components/RateMatrix.jsx` — Add KPI strip + USD strength bars
- `src/markets/fx/components/CarryMap.jsx` — Add KPI strip + central bank rate bars
- `src/markets/fx/components/DXYTracker.jsx` — Add KPI strip + component breakdown + FRED 1yr chart
- `src/markets/fx/components/TopMovers.jsx` — Add KPI strip + G10/EM comparison

### CSS (1 file)
- `src/markets/fx/components/FXComponents.css` — New styles for KPI strips, panels, bars

### Market Shell (1 file)
- `src/markets/fx/FXMarket.jsx` — Pass new FRED data props

---

## Accent Color

Amber `#f59e0b` — unchanged from current FX market.

---

## Task Batching Strategy

1. Server: Add `/api/fx` endpoint with FRED bilateral rates
2. Mock + Hook: Add mock data + extend useFXData
3. CSS: Add dense-layout styles
4. FXMarket shell: pass new props
5. RateMatrix enrichment: KPI strip + USD strength bars
6. CarryMap enrichment: KPI strip + central bank rate bars
7. DXYTracker enrichment: KPI strip + component breakdown + FRED 1yr chart
8. TopMovers enrichment: KPI strip + G10/EM bars

---

## Performance Notes

- FRED calls in `/api/fx` use `Promise.allSettled` with daily disk cache
- Client-side computations (KPI strips, strength bars) are derived from existing data — no new fetches
- Only the DXY Tracker bottom chart needs FRED server data; all other enrichments are pure client-side
