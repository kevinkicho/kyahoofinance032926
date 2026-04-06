# Commodities Market Enrichment — Design Spec

**Date:** 2026-04-05
**Type:** Market enrichment (sub-project 2 of market-by-market density pass)

---

## Goal

Transform every Commodities sub-tab from sparse single-chart/table views into dense, "one-glimpse-get-all" dashboards. Add new FRED commodity series (longer history), a broad commodity ETF (DBC), Gold futures curve, and FRED-based indicators (commodity PPI, dollar index proxy).

---

## New Data Sources (Server)

### New FRED Series

| Series ID | Name | Frequency | Use |
|---|---|---|---|
| `DCOILWTICO` | WTI Spot Price | Daily | 1-year crude price history chart |
| `GOLDAMGBD228NLBM` | Gold London Fix | Daily | 1-year gold history chart |
| `DCOILBRENTEU` | Brent Europe Spot | Daily | Brent overlay on crude chart |
| `DHHNGSP` | Henry Hub Nat Gas Spot | Daily | Nat Gas history overlay |
| `WPUFD49207` | PPI Commodity Index | Monthly | Commodity inflation indicator |
| `DTWEXBGS` | Trade-Weighted Dollar | Daily | Dollar strength context (inverse correlation) |
| `GASREGW` | US Regular Gasoline Weekly Avg | Weekly | Retail gas context |

### New Yahoo Tickers

| Ticker | Name | Use |
|---|---|---|
| `DBC` | Invesco DB Commodity ETF | Broad commodity index proxy, 1yr chart |
| `HO=F` | Heating Oil | Additional energy commodity |
| `PA=F` | Palladium | Additional precious metal |
| `CT=F` | Cotton | Additional agriculture |
| `SB=F` | Sugar | Additional agriculture |
| `LE=F` | Live Cattle | Livestock sector addition |
| `LBS=F` | Lumber | Additional commodity |

### Gold Futures Curve

Same approach as WTI — fetch 8 contract months of `GC=F` forward months using COMEX gold futures ticker pattern (GCM26, GCQ26, etc.).

### Server Changes

Add to `/api/commodities` response (inside existing `try` block, using `Promise.allSettled`):

```js
// New data fields returned alongside existing ones:
{
  // Existing
  priceDashboardData, sectorHeatmapData, futuresCurveData, supplyDemandData, cotData,

  // New
  fredCommodities: {
    wtiHistory:    { dates: [...], values: [...] },  // DCOILWTICO, 252 points
    goldHistory:   { dates: [...], values: [...] },  // GOLDAMGBD228NLBM, 252 points
    brentHistory:  { dates: [...], values: [...] },  // DCOILBRENTEU, 252 points
    natGasHistory: { dates: [...], values: [...] },  // DHHNGSP, 252 points
    ppiCommodity:  { dates: [...], values: [...] },  // WPUFD49207, 36 months
    dollarIndex:   { dates: [...], values: [...] },  // DTWEXBGS, 252 points
    gasRetail:     latest number,                     // GASREGW
  },
  goldFuturesCurve: {
    labels:    [...],     // "Aug '26", "Oct '26", etc.
    prices:    [...],     // 8 contract month prices
    commodity: 'Gold',
    unit:      '$/oz',
    spotPrice: number,    // GC=F spot
  },
  dbcEtf: {
    price: number, changePct: number, ytd: number,
    history: { dates: [...], closes: [...] },  // 252 trading days
  },
}
```

### Mock Data Updates

Add matching mock exports for all new fields in `mockCommoditiesData.js`. Follow existing patterns.

### Hook Updates

`useCommoditiesData.js` — add state + guard + return for each new field.

---

## Enriched Sub-Tab Designs

### 1. Price Dashboard (currently: just a table)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: WTI Price | Gold Price | DBC Index +YTD% | Best Performer    │
├───────────────────────────────────────────┬─────────────────────────┤
│                                           │ DBC 1-Year Line Chart  │
│   Commodity Price Table (existing,        │ (252 daily closes)     │
│   now with 16 commodities instead of 12) │                         │
│   + new Livestock sector row              │                         │
├───────────────────────────────────────────┴─────────────────────────┤
│ WTI vs Brent 1yr overlay chart (dual line, FRED daily)             │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: WTI price + 1d%, Gold price + 1d%, DBC price + YTD% from `dbcEtf`, best 1m% performer
- Existing table: expanded with 4 new tickers (HO=F, PA=F, CT=F, SB=F) + Livestock sector (LE=F, LBS=F)
- DBC chart: line chart from `dbcEtf.history`
- WTI vs Brent chart: dual-line from `fredCommodities.wtiHistory` + `brentHistory`

### 2. Futures Curve (currently: 1 chart)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: WTI Spot | Contango/Back % | Gold Spot | Gold Contango/Back  │
├───────────────────────────────────┬─────────────────────────────────┤
│  WTI Futures Curve               │  Gold Futures Curve             │
│  (existing chart, kept as-is)    │  (new chart, same style)        │
├───────────────────────────────────┴─────────────────────────────────┤
│ Dollar Index vs WTI overlay (dual axis, 1yr, FRED)                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: WTI spot + spread to back month, Gold spot + spread to back month
- Existing WTI futures curve: placed in left half
- Gold futures curve: new chart in right half from `goldFuturesCurve`
- Dollar vs WTI: `fredCommodities.dollarIndex` inverted vs `wtiHistory`, dual Y-axis

### 3. Sector Heatmap (currently: just a heatmap table)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: Sector Best | Sector Worst | PPI Commodity YoY | Retail Gas  │
├───────────────────────────────────┬─────────────────────────────────┤
│  Heatmap Table (existing,         │ Sector Avg Performance Bars    │
│  now with 16+ commodities)       │  (horizontal bars by sector,   │
│                                   │   avg 1d, 1w, 1m)             │
├───────────────────────────────────┴─────────────────────────────────┤
│ PPI Commodity Index Trend (area chart, 3yr, FRED)                  │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: best 1d% commodity, worst 1d% commodity, PPI YoY from `fredCommodities.ppiCommodity`, gas retail price
- Existing heatmap table: expanded with new commodities
- Sector performance bars: avg of 1d%/1w%/1m% per sector, horizontal bar chart (like RE sector bars)
- PPI commodity chart: area chart from `fredCommodities.ppiCommodity`

### 4. Supply & Demand (already decent — add gold history + nat gas price)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: Crude Stocks | vs 5yr Avg | Nat Gas Storage | vs 5yr Avg     │
├────────────────────┬────────────────────┬───────────────────────────┤
│ Crude Stocks       │ Nat Gas Storage    │ Gold Price 1yr            │
│ (existing chart)   │ (existing chart)   │ (new FRED line chart)     │
├────────────────────┴────────────────────┴───────────────────────────┤
│ Crude Production (existing) + Nat Gas Spot overlay (FRED)           │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: crude stocks latest + delta vs 5yr avg, nat gas storage latest + delta vs 5yr avg
- Existing crude stocks + nat gas storage charts: kept, move to 3-column grid top row
- Gold 1yr chart: `fredCommodities.goldHistory` line chart (third panel)
- Bottom: existing crude production, enhanced with nat gas spot price overlay

### 5. COT Positioning (already decent — add net change trend + broader context)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: WTI Net Position | WTI Change | Gold Net Position | Gold Chg  │
├───────────────────────────────────┬─────────────────────────────────┤
│  WTI Crude Oil Panel              │  Gold Panel                     │
│  (existing metrics + chart)       │  (existing metrics + chart)     │
├───────────────────────────────────┴─────────────────────────────────┤
│ Net Positioning Trend: WTI + Gold overlay (12-week line chart)     │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: WTI noncomm net + week change, Gold noncomm net + week change
- Existing commodity panels: kept as-is
- Net positioning trend chart: dual-line overlay of WTI + Gold noncommNet from `cotData.commodities[].history`

---

## Files Modified

### Server (1 file)
- `server/index.js` — Add FRED fetches + Gold futures + DBC ETF + new commodity tickers to `/api/commodities`

### Mock Data (1 file)
- `src/markets/commodities/data/mockCommoditiesData.js` — Add exports for all new fields

### Hook (1 file)
- `src/markets/commodities/data/useCommoditiesData.js` — Add state/guard/return for new fields

### Components (5 files, all modified)
- `src/markets/commodities/components/PriceDashboard.jsx` — Add KPI strip, DBC chart, WTI/Brent overlay
- `src/markets/commodities/components/FuturesCurve.jsx` — Add KPI strip, Gold curve, Dollar/WTI overlay
- `src/markets/commodities/components/SectorHeatmap.jsx` — Add KPI strip, sector bars, PPI chart
- `src/markets/commodities/components/SupplyDemand.jsx` — Add KPI strip, Gold chart, 3-col layout
- `src/markets/commodities/components/CotPositioning.jsx` — Add KPI strip, net positioning trend chart

### CSS (1 file)
- `src/markets/commodities/components/CommodComponents.css` — New styles for KPI strips, layouts, panels

### Market Shell (1 file)
- `src/markets/commodities/CommoditiesMarket.jsx` — Pass new data props to components

---

## Accent Color

Gold `#ca8a04` — unchanged from current Commodities market.

---

## Task Batching Strategy

1. Server: Add all new FRED/Yahoo/Gold futures fetches + expand COMMODITY_META
2. Mock + Hook: Add mock data + hook state for all new fields
3. CSS: Add dense-layout styles (KPI strip, multi-col grids, chart panels)
4. PriceDashboard enrichment: KPI strip + DBC chart + WTI/Brent overlay
5. FuturesCurve enrichment: KPI strip + Gold curve + Dollar/WTI overlay
6. SectorHeatmap enrichment: KPI strip + sector bars + PPI chart
7. SupplyDemand enrichment: KPI strip + Gold chart + 3-col layout
8. CotPositioning enrichment: KPI strip + net trend chart

---

## Performance Notes

- All new FRED calls are inside existing `Promise.allSettled` — no sequential blocking
- Daily disk cache means new series only fetched once per day
- DBC 252-day history is a single `yf.chart()` call
- Gold futures curve uses same `yf.quote()` pattern as WTI
- New Yahoo tickers (6 additional) added to existing batch quote call
- Mock fallback ensures UI never breaks if new APIs fail
