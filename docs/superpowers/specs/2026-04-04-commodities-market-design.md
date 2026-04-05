# Commodities Market — Design Spec

**Date:** 2026-04-04  
**Accent color:** Gold `#ca8a04`  
**Sub-project:** 7 of N

---

## Goal

Add a Commodities market to the Global Market Hub — a new top-level tab with 4 sub-views covering live prices, the WTI futures curve, a sector performance heatmap, and an EIA-powered supply/demand monitor.

---

## Architecture

Mirrors the Insurance market pattern exactly:

```
src/markets/commodities/
  CommoditiesMarket.jsx        — root, sub-tab routing, status bar, loading spinner
  CommoditiesMarket.css        — layout, spinner (gold #ca8a04), status bar
  data/
    mockCommoditiesData.js     — static mock for all 4 sub-views
    useCommoditiesData.js      — async hook: useState mock → useEffect fetch → silent fallback
  components/
    PriceDashboard.jsx         — grouped table (Energy / Metals / Agriculture)
    FuturesCurve.jsx           — WTI forward curve ECharts line + contango/backwardation pill
    SectorHeatmap.jsx          — 12×3 performance grid, color-coded cells
    SupplyDemand.jsx           — 3 EIA panels (crude stocks, nat gas, production)
    CommodComponents.css       — shared panel, table, pill styles

src/__tests__/commodities/
  useCommoditiesData.test.js
  CommoditiesMarket.test.jsx
  PriceDashboard.test.jsx
  FuturesCurve.test.jsx
  SectorHeatmap.test.jsx
  SupplyDemand.test.jsx
```

**Modified files:**
- `src/hub/markets.config.js` — add `{ id: 'commodities', label: 'Commodities', icon: '🛢️' }`
- `src/hub/HubLayout.jsx` — import + wire `CommoditiesMarket`
- `server/index.js` — add `/api/commodities` endpoint; read `process.env.EIA_API_KEY`

**New env var already added to `.env`:** `EIA_API_KEY`

---

## Data Sources

| Data | Source | Method |
|---|---|---|
| 12 commodity spot prices | Yahoo Finance | `yf.quote([...12 tickers])` |
| 30d price history (sparkline, 1w%, 1m%) | Yahoo Finance | `yf.chart(ticker, { period1, interval:'1d' })` × 12 in parallel |
| WTI futures curve (8 months) | Yahoo Finance | `yf.quote([...8 contract tickers])` |
| US crude oil weekly stocks (260wks) | EIA API v2 | `https://api.eia.gov/v2/petroleum/stoc/wstk/data/` |
| Natural gas weekly storage (260wks) | EIA API v2 | `https://api.eia.gov/v2/natural-gas/stor/wkly/data/` |
| US crude production (52wks) | EIA API v2 | `https://api.eia.gov/v2/petroleum/sum/sndw/data/` |

Server: 900s cache, `EIA_API_KEY` from env.

---

## Commodity Universe (12 tickers)

| Ticker | Name | Sector | Unit |
|---|---|---|---|
| `CL=F` | WTI Crude | Energy | $/bbl |
| `BZ=F` | Brent Crude | Energy | $/bbl |
| `NG=F` | Natural Gas | Energy | $/MMBtu |
| `RB=F` | Gasoline | Energy | $/gal |
| `GC=F` | Gold | Metals | $/oz |
| `SI=F` | Silver | Metals | $/oz |
| `HG=F` | Copper | Metals | $/lb |
| `PL=F` | Platinum | Metals | $/oz |
| `ZW=F` | Wheat | Agriculture | ¢/bu |
| `ZC=F` | Corn | Agriculture | ¢/bu |
| `ZS=F` | Soybeans | Agriculture | ¢/bu |
| `KC=F` | Coffee | Agriculture | ¢/lb |

---

## Sub-view 1: Price Dashboard

Grouped table, three sections: **Energy / Metals / Agriculture**.

**Columns:** Commodity | Price | 1d% | 1w% | 1m% | 30d Sparkline (inline SVG)

- `change1d` — from `yf.quote()` `regularMarketChangePercent`
- `change1w` — `(closes[-1] - closes[-6]) / closes[-6] * 100` from 30d history
- `change1m` — `(closes[-1] - closes[0]) / closes[0] * 100` from 30d history
- Sparkline — 20-point subsample of closes, rendered as inline SVG polyline

Green for positive, red for negative. Price displayed in gold accent.

**Server data shape:**
```json
{
  "priceDashboardData": [
    {
      "sector": "Energy",
      "commodities": [
        { "ticker": "CL=F", "name": "WTI Crude", "unit": "$/bbl",
          "price": 82.14, "change1d": 0.82, "change1w": -2.10, "change1m": -4.31,
          "sparkline": [84.2, 83.8, 83.1, 82.5, 82.9, 82.1, ...] }
      ]
    }
  ]
}
```

---

## Sub-view 2: Futures Curve

WTI Crude Oil forward curve — 8 contract months plotted as an ECharts line chart.

**Tickers computed dynamically** on the server starting from next calendar month:
- Format: `CL{MonthCode}{YY}.NYM` (e.g., `CLM26.NYM` = June 2026)
- Month codes: F=Jan, G=Feb, H=Mar, J=Apr, K=May, M=Jun, N=Jul, Q=Aug, U=Sep, V=Oct, X=Nov, Z=Dec

**Chart:** x-axis = contract month labels, y-axis = USD/bbl. Line color gold `#ca8a04`.

**Pill below chart:**
- **Contango** (last price > first price) — curve slopes up, market expects higher future prices
- **Backwardation** (last price < first price) — curve slopes down, near-term supply tight

**Server data shape:**
```json
{
  "futuresCurveData": {
    "labels": ["Jun '26", "Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26", "Dec '26", "Jan '27"],
    "prices": [82.14, 81.82, 81.54, 81.28, 81.05, 80.84, 80.65, 80.48],
    "commodity": "WTI Crude Oil",
    "spotPrice": 82.14
  }
}
```

---

## Sub-view 3: Sector Heatmap

Performance grid — 12 rows (one per commodity) × 3 columns (1d%, 1w%, 1m%).

**Layout:** Rows grouped by sector with sector headers (Energy / Metals / Agriculture). Each cell shows the % value and is background-colored on a green→neutral→red scale using the same thresholds as the FX Carry Map.

**Color thresholds:**
- > +2%: deep green
- 0 to +2%: light green
- -0.5 to 0: neutral
- -2 to -0.5%: light red
- < -2%: deep red

**Server data shape:**
```json
{
  "sectorHeatmapData": {
    "commodities": [
      { "ticker": "CL=F", "name": "WTI Crude", "sector": "Energy",
        "d1": 0.82, "w1": -2.10, "m1": -4.31 }
    ],
    "columns": ["1d%", "1w%", "1m%"]
  }
}
```

---

## Sub-view 4: Supply & Demand Monitor

Three panels showing EIA weekly data:

### Panel 1: US Crude Oil Stocks
- 52 weeks of weekly crude inventory (millions of barrels)
- ECharts area chart: current year as gold line, 5-year average as dashed gray reference
- 5yr avg computed from all 260 weeks returned

### Panel 2: Natural Gas Storage
- 52 weeks of weekly nat gas storage (Bcf)
- Same area chart pattern: current line + 5yr avg dashed

### Panel 3: US Crude Production
- 52 weeks of weekly crude output (million barrels/day)
- Line chart only (no 5yr avg — trend is more informative)

**EIA API routes:**
```
Crude stocks:     GET https://api.eia.gov/v2/petroleum/stoc/wstk/data/
                  ?api_key=KEY&frequency=weekly&data[0]=value
                  &facets[duoarea][]=NUS&facets[product][]=EPC0
                  &sort[0][column]=period&sort[0][direction]=asc&length=260

Nat gas storage:  GET https://api.eia.gov/v2/natural-gas/stor/wkly/data/
                  ?api_key=KEY&frequency=weekly&data[0]=value
                  &facets[duoarea][]=NUS
                  &sort[0][column]=period&sort[0][direction]=asc&length=260

Crude production: GET https://api.eia.gov/v2/petroleum/sum/sndw/data/
                  ?api_key=KEY&frequency=weekly&data[0]=value
                  &facets[duoarea][]=NUS&facets[product][]=EPC0
                  &sort[0][column]=period&sort[0][direction]=asc&length=52
```

**Server data shape:**
```json
{
  "supplyDemandData": {
    "crudeStocks":    { "periods": ["2025-04-07", ...], "values": [455.2, ...], "avg5yr": 432.1 },
    "natGasStorage":  { "periods": ["2025-04-07", ...], "values": [1821, ...],  "avg5yr": 1742 },
    "crudeProduction":{ "periods": ["2025-04-07", ...], "values": [13.1, ...]  }
  }
}
```

---

## Hook Shape (`useCommoditiesData`)

```javascript
return {
  priceDashboardData,   // array of { sector, commodities[] }
  futuresCurveData,     // { labels, prices, commodity, spotPrice }
  sectorHeatmapData,    // { commodities[], columns[] }
  supplyDemandData,     // { crudeStocks, natGasStorage, crudeProduction }
  isLive,
  lastUpdated,
  isLoading,
};
```

---

## Hub Integration

`markets.config.js`:
```javascript
{ id: 'commodities', label: 'Commodities', icon: '🛢️' }
```

`HubLayout.jsx`:
```javascript
import CommoditiesMarket from '../markets/commodities/CommoditiesMarket';
// add to MARKET_COMPONENTS: commodities: CommoditiesMarket
```

---

## Tests (target ~30 new tests across 6 files)

| File | Tests |
|---|---|
| `useCommoditiesData.test.js` | mock fallback shapes, live data sets state, isLive flag |
| `CommoditiesMarket.test.jsx` | 4 tabs render, tab switching, loading state, mock status |
| `PriceDashboard.test.jsx` | sector headers, commodity rows, % coloring |
| `FuturesCurve.test.jsx` | renders chart, contango/backwardation pill logic |
| `SectorHeatmap.test.jsx` | all 12 rows, column headers, cell color class |
| `SupplyDemand.test.jsx` | 3 panels render, null data handled gracefully |
