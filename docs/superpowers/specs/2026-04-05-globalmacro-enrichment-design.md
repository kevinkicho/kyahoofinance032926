# Global Macro Enrichment — Design Spec

**Date:** 2026-04-05
**Type:** Market enrichment (sub-project 8 of market-by-market density pass)

---

## Goal

Add KPI strips to all 4 Global Macro sub-tabs. No new server data needed — all KPIs derivable from existing data. No side panels needed since components already use multi-chart/multi-column layouts.

---

## Current State

- **MacroScorecard**: Heat-mapped table (12 countries × 6 metrics). No KPI strip.
- **GrowthInflation**: Two horizontal bar charts side-by-side (GDP + CPI). No KPI strip.
- **CentralBankRates**: Ranked bar chart + 5yr line history stacked. No KPI strip.
- **DebtMonitor**: Two vertical bar charts (debt + current account). No KPI strip.

Data: World Bank + FRED policy rates.

---

## No New Server Data

All KPIs can be computed client-side from existing props.

---

## Enriched Sub-Tab Designs

### 1. MacroScorecard — KPI strip

- KPI: Avg G7 GDP, Avg EM GDP, Lowest CPI (country), Highest Debt (country)
- Existing table (full width, unchanged)

### 2. GrowthInflation — KPI strip

- KPI: Fastest Growing (country + %), Lowest CPI (country + %), # Above 2% Target, G7−EM GDP Gap
- Existing two-column layout (unchanged)

### 3. CentralBankRates — KPI strip

- KPI: Highest Rate (country), Lowest Rate (country), Avg Rate, # Countries Rate ≤ 2%
- Existing two-row layout (unchanged)

### 4. DebtMonitor — KPI strip

- KPI: Highest Debt (country), Largest Surplus (country), # Above 90% Debt, Avg Debt/GDP
- Existing two-column layout (unchanged)

---

## Files Modified

### CSS (1 file)
- `src/markets/globalMacro/components/MacroComponents.css` — Add KPI strip classes

### Components (4 files)
- `src/markets/globalMacro/components/MacroScorecard.jsx` — Add KPI strip
- `src/markets/globalMacro/components/GrowthInflation.jsx` — Add KPI strip
- `src/markets/globalMacro/components/CentralBankRates.jsx` — Add KPI strip
- `src/markets/globalMacro/components/DebtMonitor.jsx` — Add KPI strip

---

## Accent Color

Teal `#14b8a6` — unchanged from current Global Macro market.
