# Derivatives Market Enrichment — Design Spec

**Date:** 2026-04-05
**Type:** Market enrichment (sub-project 5 of market-by-market density pass)

---

## Goal

Transform all 3 Derivatives sub-tabs from sparse single-chart/table views into dense dashboards. Add KPI strips, secondary panels, and a FRED VIX 1-year history chart.

---

## Current State

- **VolSurface**: SPX IV heatmap + 3 vol premium pills (ATM 1M IV, 30d Realized, IV Premium). Just a heatmap + footer pills.
- **VIXTermStructure**: VIX futures curve chart + 2 enrichment pills (VVIX, VIX Percentile). Just one chart + footer pills.
- **OptionsFlow**: Unusual activity table (12 rows). Just a table.

Data sources: Yahoo Finance (VIX futures, SPY/QQQ options, SPY vol surface), server-side.

---

## New Server Data

### Extend `/api/derivatives` Endpoint

Add to the existing endpoint:

| Data | Source | Use |
|---|---|---|
| `vixHistory` | Yahoo `^VIX` historical (already fetched for percentile, just not returned) | Day change bars context |
| `fredVixHistory` | FRED `VIXCLS` 252-day | 1yr VIX chart on VIXTermStructure |

### Updated Response Shape (additions only)

```js
{
  // ... existing fields (vixTermStructure, optionsFlow, volSurfaceData, vixEnrichment, volPremium)
  fredVixHistory: { dates: [...], values: [...] },  // 252 daily VIXCLS points
}
```

---

## Enriched Sub-Tab Designs

### 1. Vol Surface (currently: heatmap + 3 pills)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: ATM 1M IV | 30d Realized | IV Premium | 25Δ Skew              │
├───────────────────────────────────────────┬─────────────────────────┤
│ Vol Surface Heatmap (existing)            │ Skew Profile (1M)       │
│                                           │ (line: IV at each       │
│                                           │  strike for 1M expiry)  │
└───────────────────────────────────────────┴─────────────────────────┘
```

**Components:**
- KPI strip: ATM 1M IV, 30d Realized Vol, IV Premium (replaces footer pills), 25Δ skew (90% IV − 110% IV for 1M)
- Existing heatmap: placed in ~70% width
- Skew profile chart: line chart showing IV at each strike for the 1M expiry row, with ATM marked

### 2. VIX Term Structure (currently: chart + 2 pills)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: VIX Spot | Contango % | VVIX | VIX Percentile (252d)          │
├───────────────────────────────────────────┬─────────────────────────┤
│ VIX Term Structure Chart (existing)       │ Day Change Bars          │
│                                           │ (change from prev close  │
│                                           │  for each tenor)         │
├───────────────────────────────────────────┴─────────────────────────┤
│ VIX 1-Year History (FRED VIXCLS daily)                               │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: VIX spot, contango/backwardation %, VVIX, VIX percentile (replaces footer pills)
- Existing chart: placed in ~70% width
- Day change bars: horizontal bars showing (current − prevClose) for each VIX tenor, centered at 0
- FRED VIX 1yr chart: area chart from `fredVixHistory`

### 3. Options Flow (currently: just a table)

**New layout:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ KPI: Total Volume | Put/Call Ratio | Top Ticker | Avg Vol/OI        │
├─────────────────────────────────────────────────────────────────────┤
│ Options Flow Table (existing, full width)                            │
├─────────────────────────────────────────────────────────────────────┤
│ Call vs Put Volume Summary + Sentiment Breakdown                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Components:**
- KPI strip: total volume across all rows, put/call volume ratio, top ticker by volume, avg vol/OI
- Existing table: full width (already dense with 9 columns)
- Bottom panel: aggregated call volume vs put volume bars + bullish/bearish/neutral counts

---

## Files Modified

### Server (1 file)
- `server/index.js` — Extend `/api/derivatives` to return `fredVixHistory`

### Mock Data (1 file)
- `src/markets/derivatives/data/mockDerivativesData.js` — Add mock `fredVixHistory`

### Hook (1 file)
- `src/markets/derivatives/data/useDerivativesData.js` — Add state for `fredVixHistory`

### Components (3 files, all modified)
- `src/markets/derivatives/components/VolSurface.jsx` — KPI strip + skew profile
- `src/markets/derivatives/components/VIXTermStructure.jsx` — KPI strip + day change bars + VIX history
- `src/markets/derivatives/components/OptionsFlow.jsx` — KPI strip + call/put summary

### CSS (1 file)
- `src/markets/derivatives/components/DerivComponents.css` — Dense-layout styles

### Market Shell (1 file)
- `src/markets/derivatives/DerivativesMarket.jsx` — Pass new props

---

## Accent Color

Purple `#a78bfa` — unchanged from current Derivatives market.

---

## Task Batching Strategy

1. Server: Extend `/api/derivatives` with FRED VIX history
2. Mock + Hook: Add mock data + extend useDerivativesData
3. CSS: Add dense-layout styles
4. Shell: Pass new props
5. VolSurface enrichment: KPI strip + skew profile chart
6. VIXTermStructure enrichment: KPI strip + day change bars + FRED VIX chart
7. OptionsFlow enrichment: KPI strip + call/put summary
