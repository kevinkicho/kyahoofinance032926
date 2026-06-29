# Panel Data Shape Bug Fixes — Implementation Plan

## Overview

Audit found 10 critical data shape mismatches between backend (server/routes/) and frontend (src/markets/) that cause panels to never render or show "—" values. Each fix is isolated to one file.

---

## Fix 1: `existingHomeSales` always null (realEstate.js)

**Root cause:** `fetchFredHistory` returns a plain array, but the code checks `.status === 'fulfilled'` as if it were a `PromiseSettledResult`.

**File:** `server/routes/realEstate.js` lines 516-526

**Change:**
```js
// Before (broken):
const [exhoHist, rrvResult, fhfaResult] = await Promise.all([
  fetchFredHistory('EXHOSLUSM495S', FRED_API_KEY, 24),
  fetchFredLatest('RRVRUSQ156N', FRED_API_KEY),
  fetchFredHistory('USSTHPI', FRED_API_KEY, 20),
]);
if (exhoHist.status === 'fulfilled' && exhoHist.value.length > 0) {

// After:
const [exhoHist, rrvResult, fhfaResult] = await Promise.all([
  fetchFredHistory('EXHOSLUSM495S', FRED_API_KEY, 24).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
  fetchFredLatest('RRVRUSQ156N', FRED_API_KEY).catch(e => { console.warn('[RealEstate]', e.message || e); return null; }),
  fetchFredHistory('USSTHPI', FRED_API_KEY, 20).catch(e => { console.warn('[RealEstate]', e.message || e); return []; }),
]);
if (exhoHist?.length > 0) {
  existingHomeSales = {
    dates: exhoHist.map(p => p.date.slice(0, 7)),
    values: exhoHist.map(p => Math.round(p.value * 100) / 100),
  };
}
```

**Risk:** Low. Only affects the `existingHomeSales` data path.

---

## Fix 2: `gammaExposure.total` doesn't exist (DerivativesDashboard.jsx)

**Root cause:** Server returns `gammaExposure` as an array of `{strike, value}` objects. Frontend checks `gammaExposure?.total != null` which is always undefined.

**File:** `src/markets/derivatives/components/DerivativesDashboard.jsx` lines 273, 293

**Change:**
```js
// Before:
{gammaExposure?.total != null && (
  ...
  <MetricValue value={gammaExposure.total} ... />
  <MetricValue value={gammaExposure.callExposure} ... />
  <MetricValue value={gammaExposure.putExposure} ... />
  <MetricValue value={gammaExposure.netGamma} ... />
)}

// After:
const gexTotal = gammaExposure?.reduce((s, g) => s + Math.abs(g.value), 0) ?? null;
const gexCall = gammaExposure?.filter(g => g.value > 0).reduce((s, g) => s + g.value, 0) ?? null;
const gexPut = gammaExposure?.filter(g => g.value < 0).reduce((s, g) => s + Math.abs(g.value), 0) ?? null;
const gexNet = (gexCall ?? 0) - (gexPut ?? 0);

{gammaExposure?.length > 0 && (
  ...
  <MetricValue value={gexTotal} ... />
  <MetricValue value={gexCall} ... />
  <MetricValue value={gexPut} ... />
  <MetricValue value={gexNet} ... />
)}
```

**Risk:** Low. Only affects the Gamma Exposure panel.

---

## Fix 3: `emBondData.history` doesn't exist (CreditDashboard.jsx)

**Root cause:** Server returns `emBondData` as `{countries, regions}`, no `history` field. Frontend reads `emBondData?.history?.dates`.

**File:** `src/markets/credit/components/CreditDashboard.jsx` lines 88-99

**Change:** Use `spreadData.history.EM` for EM spread history instead:
```js
// Before:
const emOption = useMemo(() => {
  if (!emBondData?.history?.dates?.length) return null;
  return {
    xAxis: { data: emBondData.history.dates },
    series: [{ data: emBondData.history.values }],
  };
}, [emBondData]);

// After:
const emOption = useMemo(() => {
  const hist = spreadData?.history;
  if (!hist?.EM?.length) return null;
  return {
    xAxis: { data: hist.dates },
    series: [{ data: hist.EM }],
  };
}, [spreadData]);
```

**Risk:** Low. Changes data source from `emBondData` to `spreadData.history`.

---

## Fix 4: `reitEtf.values` vs `reitEtf.history.closes` (RealEstateDashboard.jsx)

**Root cause:** Server returns `reitEtf.history` as `{dates, closes}`. Frontend reads `reitEtf.dates` and `reitEtf.values`.

**File:** `src/markets/realEstate/components/RealEstateDashboard.jsx` lines 271, 278

**Change:**
```js
// Before:
{reitEtf?.dates?.length > 0 && (
  ...
  data: reitEtf.values,
)}

// After:
{reitEtf?.history?.dates?.length > 0 && (
  ...
  data: reitEtf.history.closes,
)}
```

**Risk:** Low. Only affects the REIT ETF chart panel.

---

## Fix 5: `fedFundsFutures.effectiveRate` doesn't exist (BondsDashboard.jsx)

**Root cause:** Server returns `fedFundsFutures` as `{m1, m2, ...}`. Frontend reads `fedFundsFutures?.effectiveRate`.

**File:** `src/markets/bonds/components/BondsDashboard.jsx` line 81

**Change:**
```js
// Before:
{ label: 'Fed Funds', rawValue: fedFundsFutures?.effectiveRate, ... }

// After:
{ label: 'Fed Funds', rawValue: fedFundsFutures?.m1, ... }
```

**Risk:** Low. Only affects the Fed Funds KPI pill.

---

## Fix 6: `spreadData.current.ig` should be `igSpread` (BondsDashboard.jsx)

**Root cause:** Server returns `spreadData.current` with keys `{igSpread, hySpread, emSpread}`. Frontend reads `spreadData.current.ig`.

**File:** `src/markets/bonds/components/BondsDashboard.jsx` lines 466-468

**Change:**
```js
// Before:
spreadData.current?.ig
spreadData.current?.hy
spreadData.current?.em

// After:
spreadData.current?.igSpread
spreadData.current?.hySpread
spreadData.current?.emSpread
```

**Risk:** Low. Only affects credit spread display in bonds sidebar.

---

## Fix 7: `macroData.centralBankRates` doesn't exist (BondsDashboard.jsx)

**Root cause:** Server returns `macroData` with fields like `{fedBalanceSheet, m2, ...}`. No `centralBankRates` field exists.

**File:** `src/markets/bonds/components/BondsDashboard.jsx` line 719

**Change:** Either add `centralBankRates` to the server response, or remove the panel. Adding to server is better:
```js
// In server/routes/bonds.js, add to macroData:
macroData.centralBankRates = {
  fedRate: fedFundsFutures?.m1 ?? null,
  ecbRate: ecbData?.policyRate ?? null,
  bojRate: bojData?.rate ?? null,
  boeRate: boeData?.rate ?? null,
};
```

**Risk:** Medium. Requires adding data fetching for ECB/BOJ/BOE rates if not already present.

---

## Fix 8: `fed-risk-mood` and `news-sentiment` missing from LAYOUT (SentimentDashboard.jsx)

**Root cause:** BentoCard keys exist but no corresponding layout entries, causing 1x1 overlapping tiles.

**File:** `src/markets/sentiment/components/SentimentDashboard.jsx` lines 12-25

**Change:** Add to LAYOUT:
```js
{ i: 'news-sentiment', x: 0, y: 10, w: 12, h: 3 },
{ i: 'fed-risk-mood', x: 0, y: 13, w: 12, h: 3 },
```

**Risk:** Low. Only affects Sentiment tab layout.

---

## Fix 9: `_avg5yr` field name mismatch (CommoditiesMarket.jsx)

**Root cause:** Frontend reads `cs._avg5yr` but v2 route stores it as `cs.avg`.

**File:** `src/markets/commodities/CommoditiesMarket.jsx` lines 88, 97, 113

**Change:**
```js
// Before:
cs._avg5yr
ns._avg5yr

// After:
cs.avg
ns.avg
```

**Risk:** Low. Only affects the 5-year average display in commodities.

---

## Fix 10: `spreadData.find` array fallback dead code (CreditDashboard.jsx)

**Root cause:** Fallback code treats `spreadData` as an array, but it's always an object.

**File:** `src/markets/credit/components/CreditDashboard.jsx` lines 61-63, 68-70

**Change:** Remove the array fallback branches:
```js
// Before:
const igSpread = spreadData?.current?.igSpread ?? spreadData?.find?.(s => s.name?.includes('IG'))?.spread;

// After:
const igSpread = spreadData?.current?.igSpread;
```

**Risk:** Low. Removes dead code.

---

## Execution Order

| Step | Fix | File | Est. Time |
|------|-----|------|-----------|
| 1 | Fix 1: existingHomeSales | server/routes/realEstate.js | 5 min |
| 2 | Fix 2: gammaExposure | src/markets/derivatives/... | 5 min |
| 3 | Fix 3: emBondData.history | src/markets/credit/... | 5 min |
| 4 | Fix 4: reitEtf.values | src/markets/realEstate/... | 2 min |
| 5 | Fix 5: fedFundsFutures | src/markets/bonds/... | 2 min |
| 6 | Fix 6: spreadData keys | src/markets/bonds/... | 2 min |
| 7 | Fix 7: centralBankRates | server/routes/bonds.js | 10 min |
| 8 | Fix 8: missing layout keys | src/markets/sentiment/... | 2 min |
| 9 | Fix 9: _avg5yr | src/markets/commodities/... | 2 min |
| 10 | Fix 10: dead code | src/markets/credit/... | 2 min |

Total: ~35 min

## Verification

After each fix, run:
```bash
PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/panel-health-audit.spec.js --reporter=list
```

The audit test cross-references dropdown health status against actual DOM presence for every panel across every tab.
