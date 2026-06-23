# Implementation Plan: Comprehensive Panel Diagnostics & Data Pipeline Hardening

## Problem Statement

The current Panel Trace Inspector catches **null fields** and **wrong data shapes** in API responses, but it misses three critical failure modes:

1. **Conditionally hidden panels** — RealEstate and Insurance dashboards use dynamic layouts where panels are only added if their chart option is truthy. When data is missing, the panel doesn't exist in the DOM at all — the inspector can't trace what it can't see.

2. **Silently swallowed backend errors** — Every field in every route is wrapped in `let X = null; try {…} catch {warn}`. The HTTP response stays `200 OK` with `X: null`. The frontend sees "no data" rather than "fetch failed", so no error path is triggered.

3. **Fallback defaults that mask nulls** — Market.jsx prop-wiring functions apply `d.field || {}` / `d.field || []` defaults that convert backend `null` into non-null placeholders. The FX market is the worst: it silently substitutes hardcoded static exchange rates, painting a fully-populated dashboard with 0% changes that looks live.

### Audit Summary

| Issue | Scope |
|-------|-------|
| Conditional-layout hidden panels | 2 markets (insurance, realEstate) — 27 panels can be hidden |
| shapeCheck coverage | 8/72 panels (11%) — 64 panels can't detect shape errors |
| Structural guards that pass on missing data | 10/18 guards short-circuit to `true` when array field is absent |
| needsLiveRepair coverage | ~12/21 markets; 1 casing bug (`equityDeepDive` vs `equitiesDeepDive`) |
| Silent null-on-catch in routes | 124 fields across all routes silently become null |
| Fallback defaults masking nulls | 14 defaults in Bonds, critical static fallback in FX |

---

## Phase 1: Fix Existing Bugs (Immediate)

### 1.1 Fix `needsLiveRepair` casing bug
**File:** `src/hub/DataProvider.jsx:266-269` + `:315-318`

The primary check uses `id === 'equitiesDeepDive'` (correct), but the critical-fields check uses `id === 'equityDeepDive'` (missing `s` — dead code). Merge both checks into the correct branch.

```js
if (id === 'equitiesDeepDive') {
  const factors = data.factorData?.inFavor || {};
  const hasFactorSignal = Object.values(factors).some(v => typeof v === 'number' && Number.isFinite(v) && v !== 0);
  const primaryFail = !data.sectorData?.sectors?.length || (!hasFactorSignal && !data.factorData?.stocks?.length);
  const criticalFields = ['equityRiskPremium', 'spPE', 'buffettIndicator'];
  return primaryFail || criticalFields.some(f => data[f] == null);
}
```

### 1.2 Fix admin SDK `databaseURL` (already done)
**File:** `functions/src/index.ts:160-163`

`admin.initializeApp()` → `admin.initializeApp({ databaseURL: ... })` to fix the 500 on `/api/admin/diagnostics-report` when deployed via gcloud.

### 1.3 Expand `needsLiveRepair` to all remaining markets
**File:** `src/hub/DataProvider.jsx`

Add checks for: `crypto` (ethGas, fundingData, onChainData), `credit` (delinquencyRates, commercialPaper), `eia`, `bls`, `census`, `imf`, `worldbank`, `sentiment` (riskData, returnsData, cftcData), `equities`, `analytics`, `watchlist`.

For markets with no critical fields (analytics, watchlist), return `false` explicitly.

---

## Phase 2: Expand Panel Trace Inspector (Short-term)

### 2.1 Add DOM Visibility Audit
**New component:** `PanelVisibilityAudit.jsx`
**New backend endpoint:** `GET /api/analytics/panel-audit/:market`

The inspector currently traces API field presence but can't detect panels that are **hidden from the layout** by conditional rendering. The visibility audit:

1. **Frontend side:** Uses Playwright-style DOM inspection (or a runtime `MutationObserver`) to check which BentoCard keys are actually rendered in the DOM for each market. Compare against the full expected panel list from `panelRegistry.js`.

2. **Reports:** For each panel:
   - `expected`: true (from registry)
   - `rendered`: true/false (from DOM)
   - `reason`: "data present" | "option memo returned null" | "conditional layout excluded" | "cross-market data missing"

3. **UI:** A new BentoCard in the Analytics tab: "Panel Visibility Audit" — select a market, see which panels are rendered vs hidden, and why.

**Implementation approach:**
- Add a `usePanelVisibilityReport(marketId)` hook that scans the DOM for `[data-panel-key]` attributes
- Add `data-panel-key={panel.id}` to every BentoCard in every market dashboard
- The hook returns `{ rendered: Set<string>, hidden: Array<{key, reason}> }`
- The audit card shows a table: Panel | Expected | Rendered | Reason

### 2.2 Add `shapeCheck` to all 72 panels
**File:** `src/data/panelRegistry.js`

Currently only 8/72 panels have shapeCheck. Add shape validation for all remaining panels. Group by pattern:

- **Chart data pattern** (dates + values arrays): `spreadHistory`, `fedBalanceSheetHistory`, `m2HistoryData`, `cpiComponents`, `debtToGdpHistory`, `dxyHistory`, `caseShillerData`, `reitEtf`, `foreclosureData`, `mbaApplications`, `creDelinquencies`, `existingHomeSales`, `vixTermStructure`, `skewHistory`, `fredVixHistory`, `imfWEO`, `scorecardData`
- **Object-with-keys pattern**: `macroData`, `treasuryRates`, `tipsYields`, `mortgageRates`, `supplyData`, `affordabilityData`, `capRateData`, `reitData`, `combinedRatioData`, `factorData`, `sectorData`, `earningsData`, `shortData`, `insiderData`, `spreadData`, `emBondData`, `loanData`, `defaultData`, `fearGreedData`, `cftcData`, `riskData`, `returnsData`, `coinMarketData`, `fearGreedData`, `defiData`, `fundingData`, `onChainData`
- **Array-of-objects pattern**: `priceDashboardData`, `sectorHeatmapData`, `cotData`, `calendarEvents`, `earnings`, `centralBanks`, `auctionData`, `reitData`
- **Cross-market pattern**: panels that depend on `useMarketData(otherMarket)` — `foreign-holders` (treasuryTIC), `money-market` (nyfed), `auctions` (treasuryAuctions), `catastrophes` (fema/usgs), `insurer-ratios` (edgar), `census-housing` (census)

Create reusable shapeCheck factories:
```js
const chartDataShape = (minDates = 2) => (val) => { ... };
const objectKeysShape = (minKeys = 1) => (val) => { ... };
const arrayOfObjectsShape = (minItems = 1) => (val) => { ... };
const crossMarketShape = (val, ctxData) => { ... };
```

### 2.3 Add frontend-computed field tracing
**File:** `src/markets/analytics/PanelTraceInspector.jsx`

Currently the inspector only checks top-level API fields. Many panel data fields are computed by `mapV2ToLegacy` or normalizers in the frontend. Add:

1. **Normalizer awareness:** For each panel, check both the raw API field AND the frontend-computed prop. If the API field is null but the frontend prop has data, note "data from normalizer fallback". If both are null, note "no data from any source".

2. **Cross-market awareness:** For panels that use `useMarketData(otherMarket)`, check if the other market's data is loaded. If not, report "cross-market dependency not loaded: treasuryTIC".

3. **Fallback detection:** For panels where `Market.jsx` applies `d.field || default`, detect when the default is being used (field is null in API but non-null in props). Mark as "MASKED BY FALLBACK" — this is the most insidious failure mode.

### 2.4 Add "Backend Error Surfacing" trace
**File:** `server/routes/*.js` + `functions/src/routes/*.js`

Instead of silently swallowing errors to null, add an `_errors` object to each route response:

```js
// In each route handler, alongside the existing response:
const errors = {};
// In each catch block:
catch (e) { console.warn('[Bonds] spreadHistory:', e.message); errors.spreadHistory = e.message; }
// In the response:
res.json({ ...result, _errors: errors });
```

The Panel Trace Inspector reads `_errors` and shows the actual upstream error message for each null field, instead of just "NULL". This transforms "field is null" from a mystery into "FRED returned HTTP 403 for WALCL (Akamai WAF block)".

**Scope:** Add `_errors` collection to all 44 routes. This is a mechanical change — add an `errors` object, populate it in each catch block, include it in the response.

---

## Phase 3: Fix Structural Guards (Medium-term)

### 3.1 Fix guards that short-circuit to `true` on missing data
**File:** `src/hub/DataProvider.jsx:423-453`

10 of 18 guards use `Array.isArray(x) ? x.length >= N : true` — when the field is absent (not an array), the guard passes. Fix by changing the fallback to `false`:

```js
// Before:
commodities: d => Array.isArray(d.cotData) ? d.cotData.length >= 2 : true,
// After:
commodities: d => Array.isArray(d.cotData) ? d.cotData.length >= 2 : (d.priceDashboardData?.length > 0 || d.sectorHeatmapData?.commodities?.length > 0),
```

For each guard, identify the minimum viable data that means "this market has real data" and require it. Markets where the guard should be stricter:

| Market | Current (passes when) | Fixed (should pass when) |
|--------|----------------------|--------------------------|
| commodities | cotData.length >= 2 OR true | priceDashboardData?.length > 0 OR sectorHeatmapData?.commodities?.length > 0 |
| sentiment | currencies.length >= 4 OR true | fearGreedData != null OR riskData != null OR cftcData?.length > 0 |
| globalMacro | scorecardData.length >= 8 OR true | scorecardData?.length >= 8 OR growthInflationData?.length > 0 |
| crypto | coins.length >= 10 OR true | coinMarketData?.coins?.length >= 5 |
| equitiesDeepDive | sectors.length >= 8 OR true | sectorData?.sectors?.length >= 5 |
| insurance | combinedRatioData.length >= 2 OR true | combinedRatioData != null OR hyOAS != null |
| realEstate | reitData.length >= 2 OR true | reitData?.length >= 2 OR caseShillerData?.dates?.length > 0 |
| fx | fredFxRates.length >= 2 OR true | spotRates != null && Object.keys(spotRates).length >= 3 |
| imf | countries.length >= 5 OR true | countries?.length >= 5 OR reserves != null |
| worldbank | countries.length >= 5 OR true | countries?.length >= 5 |

### 3.2 Fix FX static fallback masking
**File:** `src/markets/fx/FXMarket.jsx:8-9`

Currently: `const spotRates = d.spotRates || d.frankfurterLatest || fallback;`

When the backend returns null, the hardcoded `exchangeRates` from `constants.js` is used, painting a fully-populated dashboard with 0% changes. Fix:

```js
const spotRates = d.spotRates || d.frankfurterLatest;
const isUsingFallback = !spotRates;
// Pass isUsingFallback to dashboard so it can show a warning banner
```

The dashboard should show "Live rates unavailable — showing stale/static data" when `isUsingFallback` is true, rather than silently rendering static data.

---

## Phase 4: Comprehensive Diagnostic Dashboard (Long-term)

### 4.1 Unified Diagnostic Mode
Add a "Diagnostic Mode" toggle to the Analytics tab that, when enabled, overlays every panel in every market with a colored border:
- 🟢 Green: Data present, shape correct, rendered
- 🟡 Yellow: Data present but shape issue, or using fallback default
- 🔴 Red: Data null, panel hidden, or cross-market dependency missing
- 🔵 Blue: Stale RTDB snapshot (fetchedOn != today)

This gives an at-a-glance view of the entire app's data health without needing to visit each market.

### 4.2 Automated Panel Registry Generation
Instead of manually maintaining `panelRegistry.js`, auto-generate it by scanning:
1. All `BentoCard` keys in all `*Dashboard.jsx` files (static extraction)
2. All conditional layout items in `*Dashboard.jsx` (AST parse the `if (X) layoutItems.push(...)` patterns)
3. All `useMemo` option memos and their guard conditions
4. All `Market.jsx` prop-wiring defaults

This eliminates the manual sync problem — the registry is always up-to-date with the actual panel definitions.

### 4.3 Backend Field Error Registry
Add a `/api/analytics/field-errors` endpoint that aggregates all `_errors` objects from all routes into a single report:

```json
{
  "bonds": { "fedFundsFutures": "FRED HTTP 403 (Akamai WAF)", "ecbYieldCurve": "ECB API timeout" },
  "fx": { "fredFxRates": "FRED HTTP 400: series does not exist", "reer": "BIS API unavailable" },
  ...
}
```

The Panel Trace Inspector reads this and shows the actual error message for each null field, making debugging immediate instead of requiring log inspection.

### 4.4 RTDB Snapshot Freshness Monitor
Add a check in the Panel Trace Inspector that compares the RTDB snapshot's `fetchedAt` against the current time. If the snapshot is >24 hours old, mark all panels as "STALE SNAPSHOT" and auto-trigger `needsLiveRepair`. This prevents the recurring issue where a stale snapshot from days ago keeps panels empty.

### 4.5 Cross-Market Dependency Graph
Some panels depend on data from other markets (e.g., Bonds' Foreign Holders needs treasuryTIC, Insurance's Catastrophes needs fema+usgs). Build a dependency graph in the panel registry:

```js
{ id: 'foreign-holders', dependsOn: 'treasuryTIC', ... }
{ id: 'catastrophes', dependsOn: ['fema', 'usgs'], ... }
```

The inspector checks if all dependencies are loaded and reports "dependency not loaded: fema" when a cross-market panel is empty.

---

## Implementation Priority

| Phase | Effort | Impact |
|-------|--------|--------|
| 1.1 Fix casing bug | 5 min | Unlocks equityDeepDive repair |
| 1.2 Fix admin databaseURL | 1 min | Fixes 500 on diagnostics-report |
| 1.3 Expand needsLiveRepair | 30 min | Prevents stale snapshots for all markets |
| 2.1 DOM Visibility Audit | 2 hrs | Catches hidden panels (realEstate, insurance) |
| 2.2 shapeCheck all panels | 3 hrs | Catches shape mismatches everywhere |
| 2.3 Frontend-computed tracing | 2 hrs | Catches normalizer/fallback masking |
| 2.4 Backend error surfacing | 4 hrs | Replaces "null" with actual error messages |
| 3.1 Fix structural guards | 1 hr | Prevents stale snapshots passing guards |
| 3.2 Fix FX fallback masking | 30 min | Stops silent static-rate rendering |
| 4.1-4.5 Comprehensive diagnostics | 8+ hrs | Full data pipeline observability |

**Total estimated effort:** ~20 hours for Phases 1-3, additional 8+ hours for Phase 4.