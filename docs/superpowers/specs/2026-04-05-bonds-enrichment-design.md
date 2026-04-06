# Bonds Market Enrichment — Design Spec

**Date:** 2026-04-05
**Type:** Market enrichment (sub-project 3 of market-by-market density pass)

---

## Goal

Transform 4 of 5 Bonds sub-tabs from sparse single-chart/table views into dense dashboards with KPI strips and secondary panels. Add FRED DGS10 1-year history for yield context. BreakevenMonitor already dense — no changes.

---

## Current State

- **YieldCurve**: Multi-line chart (8 countries × 7 tenors) + 5 indicator pills at bottom. Just a chart + pills.
- **CreditMatrix**: Color-coded rating table (12 rows × 4 cols). Just a table + legend.
- **SpreadMonitor**: Area+line chart (4 series × 12 months). Just a chart + legend.
- **DurationLadder**: Horizontal bar chart (4 buckets) + optional rate pills at bottom. Chart + optional pills.
- **BreakevenMonitor**: 5 KPI pills + 3-line history chart. Already dense — skip.

Data: FRED (21+ series), fiscaldata.treasury.gov, mock fallback for creditRatingsData/durationLadderData.

---

## New Server Data

Extend `/api/bonds` to add FRED DGS10 252-day history for 10Y yield context chart.

### Updated Response Shape (addition only)

```js
{
  // ... existing fields
  fredYieldHistory: { dates: [...], values: [...] },  // 252 daily DGS10 points
}
```

---

## Enriched Sub-Tab Designs

### 1. YieldCurve — KPI strip + steepness bars + 10Y history

- KPI: US 10Y yield, 10Y−2Y Spread (green/red), 10Y−3M Spread (green/red), Steepest Curve (country name)
- Chart (~70% width) + US yield steepness bars (narrow, ~30% — bar per tenor showing level, highlight 2Y and 10Y)
- FRED 10Y 1yr area chart at bottom
- Remove existing bottom indicator pills (promoted to KPI strip)

### 2. CreditMatrix — KPI strip + rating distribution bars

- KPI: # AAA/AA Rated, # Investment Grade (≥BBB), Lowest Rated Country, Modal Rating
- Table (~70%) + Rating distribution horizontal bars (~30%, count per tier: AAA, AA, A, BBB, BB, B)

### 3. SpreadMonitor — KPI strip + latest spread bars

- KPI: IG Spread (latest bps), HY Spread (latest bps), Widest Spread (series name), HY−IG Gap (bps)
- Area chart (~70%) + Latest spread horizontal bars (~30%, one bar per series sorted by value)

### 4. DurationLadder — KPI strip + rate panel

- KPI: Total Portfolio ($B), Largest Bucket (name + %), Weighted Avg Maturity (approx midpoint), Short/Long Ratio
- Bar chart (~70%) + Treasury rate comparison panel (~30%, each bucket with rate value + bar)
- Remove existing bottom rate pills (promoted to side panel)

### 5. BreakevenMonitor — no changes

Already has 5 KPI pills + history chart. Dense enough.

---

## Files Modified

### Server (1 file)
- `server/index.js` — Extend `/api/bonds` to return `fredYieldHistory`

### Mock Data (1 file)
- `src/markets/bonds/data/mockBondsData.js` — Add mock `fredYieldHistory`

### Hook (1 file)
- `src/markets/bonds/data/useBondsData.js` — Add state for `fredYieldHistory`

### Components (4 files, all modified)
- `src/markets/bonds/components/YieldCurve.jsx` — KPI strip + steepness bars + 10Y history
- `src/markets/bonds/components/CreditMatrix.jsx` — KPI strip + distribution bars
- `src/markets/bonds/components/SpreadMonitor.jsx` — KPI strip + latest spread bars
- `src/markets/bonds/components/DurationLadder.jsx` — KPI strip + rate panel

### CSS (1 file)
- `src/markets/bonds/components/BondsComponents.css` — Dense-layout styles

### Market Shell (1 file)
- `src/markets/bonds/BondsMarket.jsx` — Pass new prop

---

## Accent Color

Green `#10b981` — unchanged from current Bonds market.
