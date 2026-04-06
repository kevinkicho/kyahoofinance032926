# Real Estate Market Enrichment — Design Spec

**Date:** 2026-04-05
**Type:** Market enrichment (sub-project 1 of market-by-market density pass)

---

## Goal

Transform every Real Estate sub-tab from sparse single-chart views into dense, "one-glimpse-get-all" dashboards. Add new FRED series, Case-Shiller metro indices, REIT ETF data, and housing supply indicators.

---

## New Data Sources (Server)

All from FRED (already have `fetchFredHistory` / `fetchFredLatest` helpers + `FRED_API_KEY`).

### New FRED Series

| Series ID | Name | Frequency | Use |
|---|---|---|---|
| `CSUSHPISA` | Case-Shiller National Home Price Index | Monthly | National price trend |
| `SFXRSA` | Case-Shiller San Francisco | Monthly | Metro comparison |
| `NYXRSA` | Case-Shiller New York | Monthly | Metro comparison |
| `LXXRSA` | Case-Shiller Los Angeles | Monthly | Metro comparison |
| `MIXRSA` | Case-Shiller Miami | Monthly | Metro comparison |
| `CHXRSA` | Case-Shiller Chicago | Monthly | Metro comparison |
| `HOUST` | Housing Starts (Total) | Monthly | Supply indicator |
| `PERMIT` | Building Permits | Monthly | Leading indicator |
| `MSACSR` | Monthly Supply of Houses | Monthly | Inventory months |
| `ACTLISCOUUS` | Active Listings Count | Monthly | Inventory level |
| `RHORUSQ156N` | Homeownership Rate | Quarterly | Structural metric |
| `CUSR0000SEHA` | CPI Rent of Primary Residence | Monthly | Rent inflation |
| `DGS10` | 10-Year Treasury | Daily | Spread context (already used by bonds) |

### New Yahoo Tickers

| Ticker | Name | Use |
|---|---|---|
| `VNQ` | Vanguard Real Estate ETF | Sector performance proxy, 1yr chart |
| `XLRE` | S&P Real Estate Select Sector | Alternative sector proxy |

### Server Changes

Add to `/api/realEstate` response (inside existing `try` block, using `Promise.allSettled`):

```js
// New data fields returned alongside existing ones:
{
  // Existing
  reitData, priceIndexData, mortgageRates, affordabilityData, capRateData,

  // New
  caseShillerData: {
    national: { dates: [...], values: [...] },  // CSUSHPISA, 60 points
    metros: {
      'San Francisco': { latest: 320.5, yoy: 4.2 },
      'New York':      { latest: 285.1, yoy: 3.1 },
      'Los Angeles':   { latest: 370.2, yoy: 5.8 },
      'Miami':         { latest: 410.3, yoy: 8.1 },
      'Chicago':       { latest: 190.4, yoy: 2.5 },
    }
  },
  supplyData: {
    housingStarts:  { dates: [...], values: [...] },  // HOUST, 36 months
    permits:        { dates: [...], values: [...] },  // PERMIT, 36 months
    monthsSupply:   latest number,                     // MSACSR
    activeListings: latest number,                     // ACTLISCOUUS
  },
  homeownershipRate: latest number,                    // RHORUSQ156N
  rentCpi: { dates: [...], values: [...] },            // CUSR0000SEHA, 36 months
  reitEtf: {                                           // VNQ
    price: number, changePct: number, ytd: number,
    history: { dates: [...], closes: [...] }            // 252 trading days
  },
  treasury10y: number,                                  // DGS10 latest (for cap rate spread)
}
```

### Mock Data Updates

Add matching mock exports for all new fields in `mockRealEstateData.js`. Follow existing patterns (reasonable static numbers, 20-36 data points for time series).

### Hook Updates

`useRealEstateData.js` — add state + guard + return for each new field. Guard pattern: check a meaningful field quality (e.g., `caseShillerData?.national?.dates?.length >= 20`).

---

## Enriched Sub-Tab Designs

### 1. Price Index (currently: 1 chart)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: US Latest | US YoY% | Peak-to-Current% | Fastest-Growing     │
├───────────────────────────────────────────┬─────────────────────────┤
│                                           │ Metro Price Indices    │
│   Multi-country BIS line chart            │ ┌─ SF ────── 320.5 ─┐ │
│   (existing, keep as-is)                  │ ├─ NY ────── 285.1 ─┤ │
│                                           │ ├─ LA ────── 370.2 ─┤ │
│                                           │ ├─ Miami ─── 410.3 ─┤ │
│                                           │ └─ Chicago ─ 190.4 ─┘ │
│                                           │ + YoY% badges         │
├───────────────────────────────────────────┴─────────────────────────┤
│ Case-Shiller National trend (area chart, 5yr)                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: 4 pills computed from `priceIndexData` (US latest value, YoY from last 4 quarters, max value vs current, fastest country by recent growth)
- Existing multi-country chart: unchanged, takes ~60% width
- Metro panel: 5 horizontal bars from `caseShillerData.metros` with YoY% badges
- Case-Shiller national area chart: `caseShillerData.national` — small area chart below

### 2. REIT Screen (currently: just a table)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: VNQ Price +YTD% | Total Mkt Cap | Avg Yield | Best Performer │
├───────────────────────────────────┬─────────────────────────────────┤
│  Sector Performance Bars          │  VNQ 1-Year Line Chart         │
│  (avg YTD return by sector,      │  (252 daily closes)            │
│   horizontal bars, colored)      │                                 │
├───────────────────────────────────┴─────────────────────────────────┤
│  REIT Table (existing, add price + 1d% columns)                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: VNQ price/YTD from `reitEtf`, sum of marketCap, avg dividendYield, best ytdReturn REIT
- Sector bars: Group REITs by sector, avg ytdReturn per sector, horizontal bar chart
- VNQ chart: Simple line chart from `reitEtf.history`
- Table: Add `price` and `changePct` columns (data already returned by server, just not displayed)

### 3. Affordability (already good — add supply indicators)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ Mortgage Banner (existing)                                          │
├────────────────────┬────────────────────┬───────────────────────────┤
│ Price/Income cards │ Supply Indicators  │ Median Price + P/I Chart  │
│ (existing 4 cards) │ Starts: 1.42M     │ (existing combo chart)    │
│                    │ Permits: 1.38M     │                           │
│                    │ Months Supply: 4.2 │                           │
│                    │ Active Listings: 1.1M                          │
├────────────────────┴────────────────────┴───────────────────────────┤
│ Housing Starts + Permits Trend (dual line chart, 3yr)               │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- Keep mortgage banner, KPI cards, and history chart
- Add supply indicator cards: `supplyData.housingStarts` latest, permits latest, monthsSupply, activeListings
- Add starts + permits trend chart: dual-line from `supplyData` time series

### 4. Cap Rate Monitor (currently: 1 bar chart)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: Avg Yield | 10Y Treasury | Spread | Homeownership Rate       │
├───────────────────────────────────┬─────────────────────────────────┤
│  Sector Yield Bars                │  Sector Detail Cards           │
│  (existing, add 10Y ref line)    │  yield, spread, #REITs, avgCap │
│                                   │  (scrollable grid)             │
├───────────────────────────────────┴─────────────────────────────────┤
│ Rent CPI Trend (area chart, 3yr)                                    │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: avg yield from `capRateData`, `treasury10y`, spread = avg yield - treasury, `homeownershipRate`
- Existing bar chart: add `markLine` at 10Y treasury rate for visual spread reference
- Sector cards: For each sector in `capRateData`, show yield, spread to 10Y, count of REITs in that sector (from `reitData`), avg market cap
- Rent CPI chart: `rentCpi` area chart showing rent inflation trend

---

## Files Modified

### Server (1 file)
- `server/index.js` — Add FRED fetches + Yahoo VNQ/XLRE to `/api/realEstate`

### Mock Data (1 file)
- `src/markets/realEstate/data/mockRealEstateData.js` — Add exports for all new fields

### Hook (1 file)
- `src/markets/realEstate/data/useRealEstateData.js` — Add state/guard/return for new fields

### Components (4 files, all modified)
- `src/markets/realEstate/components/PriceIndex.jsx` — Add KPI strip, metro panel, Case-Shiller chart
- `src/markets/realEstate/components/REITScreen.jsx` — Add KPI strip, sector bars, VNQ chart, table columns
- `src/markets/realEstate/components/AffordabilityMap.jsx` — Add supply cards + starts/permits chart
- `src/markets/realEstate/components/CapRateMonitor.jsx` — Add KPI strip, treasury line, sector cards, rent CPI chart

### CSS (1 file)
- `src/markets/realEstate/components/REComponents.css` — New styles for KPI strips, metro panels, sector cards, supply cards

### Market Shell (1 file)
- `src/markets/realEstate/RealEstateMarket.jsx` — Pass new data props to components

---

## Accent Color

Orange `#f97316` — unchanged from current Real Estate market.

---

## Task Batching Strategy

1. Server: Add all new FRED/Yahoo fetches to `/api/realEstate`
2. Mock + Hook: Add mock data + hook state for all new fields
3. PriceIndex enrichment: KPI strip + metro panel + Case-Shiller chart
4. REITScreen enrichment: KPI strip + sector bars + VNQ chart + table columns
5. Affordability enrichment: supply cards + starts/permits chart
6. CapRate enrichment: KPI strip + treasury line + sector cards + rent CPI chart

---

## Performance Notes

- All new FRED calls are inside existing `Promise.allSettled` — no sequential blocking
- Daily disk cache means new series only fetched once per day
- VNQ 252-day history is a single `yf.chart()` call
- Mock fallback ensures UI never breaks if new APIs fail
