# Insurance Market Enrichment — Design Spec

**Date:** 2026-04-05
**Type:** Market enrichment (sub-project 6 of market-by-market density pass)

---

## Goal

Transform all 4 Insurance sub-tabs from sparse single-chart/table views into dense dashboards with KPI strips and secondary panels. Add FRED HY OAS 1-year history for cat bond spread context.

---

## Current State

- **CatBondSpreads**: Table (10 rows, 9 columns). Just a table.
- **CombinedRatioMonitor**: Line chart (4 lines, 8 quarters). Just one chart.
- **ReserveAdequacy**: Horizontal bar chart (5 lines). Just one chart.
- **ReinsurancePricing**: Table (9 rows, 8 columns). Just a table.

Data: Yahoo Finance (PGR/ALL/TRV/HIG quarterlies), FRED HY/IG OAS latest, reinsurer quotes (RNR/ACGL/AXS).

---

## New Server Data

Extend `/api/insurance` to add FRED BAMLH0A0HYM2 252-day history for HY OAS context chart.

---

## Enriched Sub-Tab Designs

### 1. CatBondSpreads — KPI strip + spread-by-peril bars

- KPI: Avg Spread, Highest Spread (bond name), Total Notional, Avg Expected Loss
- Table (wide, ~70%) + Avg Spread by Peril horizontal bars (narrow, ~30%)

### 2. CombinedRatioMonitor — KPI strip + latest quarter bars

- KPI: Latest Auto CR, Latest Homeowners CR, Best Line, Industry Avg
- Chart (wide) + Latest Quarter bars (narrow, horizontal bars per line with 100% baseline marked)

### 3. ReserveAdequacy — KPI strip + adequacy list

- KPI: Avg Adequacy, Most Adequate, Least Adequate, Total Reserves
- Chart (wide) + Adequacy list panel (narrow, each line's % with color indicator)

### 4. ReinsurancePricing — KPI strip + ROL change bars + HY OAS chart

- KPI: Avg ROL, Hardest Market (highest ROL), Tight/Very Tight count, Avg ROL Change
- Table (full width)
- HY OAS 1yr chart at bottom (FRED daily — credit conditions drive reinsurance pricing)

---

## Accent Color

Sky Blue `#0ea5e9` — unchanged.
