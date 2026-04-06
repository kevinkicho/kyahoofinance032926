# Data Enrichment Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 sets of live data to fill empty panel space across Bonds, Derivatives, and Real Estate markets — all from FRED/Yahoo Finance which are already wired.

**Architecture:** Each task extends an existing server endpoint with new FRED series IDs or Yahoo tickers, adds a state field to the hook, and renders the data in the component. The server cache key for each endpoint must be invalidated after changes (done automatically since TTL is 900s; no code change needed). All additions are additive — no existing behavior changes.

**Tech Stack:** React 18 + Vite 5, ECharts (echarts-for-react), Express + node-cache + FRED API + yahoo-finance2, Vitest + @testing-library/react

---

## File Structure

### Files Modified (no new files):

**Task 1 — BBB Spread:**
- `server/index.js` — add `BBB` to `SPREAD_SERIES`, add `BBB` to spreadData builder
- `src/markets/bonds/data/mockBondsData.js` — add `BBB` array to `spreadData` export
- `src/markets/bonds/components/SpreadMonitor.jsx` — add BBB as 4th series in SERIES_CONFIG
- `src/__tests__/bonds/SpreadMonitor.test.jsx` — new test file (doesn't exist yet — create it)

**Task 2 — Yield Curve Spread Indicators:**
- `server/index.js` — add 5 new FRED series to `/api/bonds`, return as `spreadIndicators`
- `src/markets/bonds/data/mockBondsData.js` — add `spreadIndicators` export
- `src/markets/bonds/data/useBondsData.js` — add `spreadIndicators` state
- `src/markets/bonds/BondsMarket.jsx` — pass `spreadIndicators` to YieldCurve
- `src/markets/bonds/components/YieldCurve.jsx` — render stat pills below chart
- `src/__tests__/bonds/YieldCurve.test.jsx` — add spread indicator rendering tests

**Task 3 — Live Mortgage Rates:**
- `server/index.js` — add MORTGAGE30US/15US fetch to `/api/realEstate`, return as `mortgageRates`
- `src/markets/realEstate/data/useRealEstateData.js` — add `mortgageRates` state
- `src/markets/realEstate/RealEstateMarket.jsx` — pass `mortgageRates` to AffordabilityMap
- `src/markets/realEstate/components/AffordabilityMap.jsx` — render mortgage rate banner
- `src/__tests__/realEstate/AffordabilityMap.test.jsx` — add mortgage banner tests

**Task 4 — VIX Percentile + VVIX:**
- `server/index.js` — add `^VVIX` quote + `^VIX` 252d history to `/api/derivatives`, return `vixEnrichment`
- `src/markets/derivatives/data/useDerivativesData.js` — add `vixEnrichment` state
- `src/markets/derivatives/DerivativesMarket.jsx` — pass `vixEnrichment` to VIXTermStructure
- `src/markets/derivatives/components/VIXTermStructure.jsx` — render VVIX + percentile stats below chart
- `src/__tests__/derivatives/VIXTermStructure.test.jsx` — new test file (create)

**Task 5 — Fear & Greed History Chart:**
- `server/index.js` — add VIXCLS 252-day fetch to `/api/derivatives`, return `vixHistory`
- `src/markets/derivatives/data/useDerivativesData.js` — add `vixHistory` state
- `src/markets/derivatives/DerivativesMarket.jsx` — pass `vixHistory` to FearGreed
- `src/markets/derivatives/components/FearGreed.jsx` — add ECharts line chart below the gauge

---

## Task 1: BBB Spread in SpreadMonitor

**Files:**
- Modify: `server/index.js` (around line 323, `SPREAD_SERIES` object and spreadData builder ~line 395)
- Modify: `src/markets/bonds/data/mockBondsData.js` (line 27, `spreadData` export)
- Modify: `src/markets/bonds/components/SpreadMonitor.jsx` (line 5, `SERIES_CONFIG`)
- Create: `src/__tests__/bonds/SpreadMonitor.test.jsx`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/bonds/SpreadMonitor.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SpreadMonitor from '../../markets/bonds/components/SpreadMonitor';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockData = {
  dates: ['Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25'],
  IG:  [112, 108, 115, 120, 118, 106, 102,  98, 105, 110, 108, 104],
  HY:  [345, 330, 360, 385, 370, 340, 325, 310, 340, 360, 355, 342],
  EM:  [410, 395, 425, 455, 440, 405, 388, 372, 395, 420, 415, 398],
  BBB: [185, 178, 192, 205, 198, 182, 175, 168, 180, 195, 190, 185],
};

describe('SpreadMonitor', () => {
  it('renders the panel title', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByText('Spread Monitor')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders BBB series label in legend', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByText(/BBB/i)).toBeInTheDocument();
  });

  it('renders all 4 series labels', () => {
    render(<SpreadMonitor spreadData={mockData} />);
    expect(screen.getByText(/Investment Grade/i)).toBeInTheDocument();
    expect(screen.getByText(/High Yield/i)).toBeInTheDocument();
    expect(screen.getByText(/Emerging/i)).toBeInTheDocument();
    expect(screen.getByText(/BBB/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd C:\Users\kevin\OneDrive\Desktop\kyahoofinance032926
npx vitest run src/__tests__/bonds/SpreadMonitor.test.jsx
```

Expected: FAIL — `BBB` not in SERIES_CONFIG, so no "BBB" text rendered.

- [ ] **Step 3: Add BBB to mockBondsData.js**

In `src/markets/bonds/data/mockBondsData.js`, the `spreadData` export (line 27) currently has `dates`, `IG`, `HY`, `EM`. Add `BBB`:

```js
export const spreadData = {
  dates: ['Apr-24','May-24','Jun-24','Jul-24','Aug-24','Sep-24','Oct-24','Nov-24','Dec-24','Jan-25','Feb-25','Mar-25'],
  IG:    [112, 108, 115, 120, 118, 106, 102, 98,  105, 110, 108, 104],
  HY:    [345, 330, 360, 385, 370, 340, 325, 310, 340, 360, 355, 342],
  EM:    [410, 395, 425, 455, 440, 405, 388, 372, 395, 420, 415, 398],
  BBB:   [185, 178, 192, 205, 198, 182, 175, 168, 180, 195, 190, 185],
};
```

- [ ] **Step 4: Add BBB to SERIES_CONFIG in SpreadMonitor.jsx**

In `src/markets/bonds/components/SpreadMonitor.jsx`, the `SERIES_CONFIG` array (line 5):

```js
const SERIES_CONFIG = [
  { key: 'IG',  label: 'Investment Grade (IG)', color: '#60a5fa' },
  { key: 'HY',  label: 'High Yield (HY)',       color: '#f472b6' },
  { key: 'EM',  label: 'Emerging Mkt (EM)',      color: '#fbbf24' },
  { key: 'BBB', label: 'BBB-Rated (Crossover)',  color: '#a78bfa' },
];
```

- [ ] **Step 5: Add BBB to server/index.js SPREAD_SERIES and spreadData builder**

In `server/index.js`, the `SPREAD_SERIES` object (line 323):

```js
const SPREAD_SERIES = {
  IG:  'BAMLC0A0CM',
  HY:  'BAMLH0A0HYM2',
  EM:  'BAMLEMCBPIOAS',
  BBB: 'BAMLC0A4CBBB',
};
```

In the same file, the `spreadData` builder inside `/api/bonds` (around line 390–400). The existing code builds `igArr`, `hyArr`, `emArr`. Add `bbbArr`:

```js
const igArr  = (spreadRaw.IG  || []).slice(-12);
const hyArr  = (spreadRaw.HY  || []).slice(-12);
const emArr  = (spreadRaw.EM  || []).slice(-12);
const bbbArr = (spreadRaw.BBB || []).slice(-12);
const anchorArr = igArr.length === 12 ? igArr : (hyArr.length === 12 ? hyArr : []);
const spreadData = anchorArr.length === 12 ? {
  dates: anchorArr.map(p => dateToMonthLabel(p.date)),
  IG:    igArr.length  === 12 ? igArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
  HY:    hyArr.length  === 12 ? hyArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
  EM:    emArr.length  === 12 ? emArr.map(p  => Math.round(p.value))  : anchorArr.map(() => null),
  BBB:   bbbArr.length === 12 ? bbbArr.map(p => Math.round(p.value))  : anchorArr.map(() => null),
} : null;
```

- [ ] **Step 6: Run the test to confirm it passes**

```bash
npx vitest run src/__tests__/bonds/SpreadMonitor.test.jsx
```

Expected: PASS — 4 tests passing.

- [ ] **Step 7: Run the full test suite to confirm no regressions**

```bash
npx vitest run
```

Expected: All tests pass (152+ passing, 0 failing).

- [ ] **Step 8: Commit**

```bash
git add server/index.js src/markets/bonds/data/mockBondsData.js src/markets/bonds/components/SpreadMonitor.jsx src/__tests__/bonds/SpreadMonitor.test.jsx
git commit -m "feat(bonds): add BBB crossover spread series to SpreadMonitor"
```

---

## Task 2: Spread Indicators Below YieldCurve (T10Y2Y, Breakeven Inflation)

**Files:**
- Modify: `server/index.js` (inside `/api/bonds` handler, after the existing intl yields block)
- Modify: `src/markets/bonds/data/mockBondsData.js` (add `spreadIndicators` export)
- Modify: `src/markets/bonds/data/useBondsData.js` (add `spreadIndicators` state, return it)
- Modify: `src/markets/bonds/BondsMarket.jsx` (destructure `spreadIndicators`, pass to YieldCurve)
- Modify: `src/markets/bonds/components/YieldCurve.jsx` (accept `spreadIndicators` prop, render stat pills)
- Modify: `src/__tests__/bonds/YieldCurve.test.jsx` (add spread indicator tests)

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/bonds/YieldCurve.test.jsx`:

```jsx
const mockSpreadIndicators = {
  t10y2y: 0.42,
  t10y3m: -0.15,
  t5yie: 2.31,
  t10yie: 2.28,
  dfii10: 1.92,
};

describe('YieldCurve — spreadIndicators', () => {
  it('renders T10Y-2Y spread value', () => {
    render(<YieldCurve yieldCurveData={mockData} spreadIndicators={mockSpreadIndicators} />);
    expect(screen.getByText(/10Y-2Y/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.42/)).toBeInTheDocument();
  });

  it('renders breakeven inflation label', () => {
    render(<YieldCurve yieldCurveData={mockData} spreadIndicators={mockSpreadIndicators} />);
    expect(screen.getByText(/Breakeven/i)).toBeInTheDocument();
  });

  it('renders without spreadIndicators (graceful null handling)', () => {
    render(<YieldCurve yieldCurveData={mockData} spreadIndicators={null} />);
    expect(screen.getByText('Yield Curve')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
npx vitest run src/__tests__/bonds/YieldCurve.test.jsx
```

Expected: FAIL — YieldCurve doesn't yet accept or render `spreadIndicators`.

- [ ] **Step 3: Add spreadIndicators to mockBondsData.js**

Append to `src/markets/bonds/data/mockBondsData.js`:

```js
export const spreadIndicators = {
  t10y2y:  0.42,   // 10yr – 2yr spread bps converted to %, positive = normal, negative = inverted
  t10y3m: -0.15,   // 10yr – 3m spread
  t5yie:   2.31,   // 5yr breakeven inflation rate
  t10yie:  2.28,   // 10yr breakeven inflation rate
  dfii10:  1.92,   // 10yr TIPS real yield
};
```

- [ ] **Step 4: Fetch spread indicators in server/index.js**

Inside the `/api/bonds` handler in `server/index.js`, after the existing `// 3. Credit spread history` block (around line 383), add:

```js
// 4. Spread indicators — T10Y2Y, T10Y3M, breakeven inflation, TIPS real yield
const SPREAD_INDICATOR_SERIES = {
  t10y2y: 'T10Y2Y',
  t10y3m: 'T10Y3M',
  t5yie:  'T5YIE',
  t10yie: 'T10YIE',
  dfii10: 'DFII10',
};
const indicatorEntries = await Promise.allSettled(
  Object.entries(SPREAD_INDICATOR_SERIES).map(async ([key, sid]) => [key, await fetchFredLatest(sid)])
);
const spreadIndicators = {};
indicatorEntries.forEach(r => {
  if (r.status === 'fulfilled' && r.value[1] != null) spreadIndicators[r.value[0]] = r.value[1];
});
```

Then in the `result` object returned by `/api/bonds`, add `spreadIndicators`:

```js
const result = {
  yieldCurveData,
  spreadData,
  spreadIndicators: Object.keys(spreadIndicators).length >= 3 ? spreadIndicators : null,
  lastUpdated: new Date().toISOString().split('T')[0],
};
```

- [ ] **Step 5: Add spreadIndicators to useBondsData.js**

In `src/markets/bonds/data/useBondsData.js`:

Add to imports:
```js
import {
  yieldCurveData as mockYieldCurveData,
  creditRatingsData,
  spreadData as mockSpreadData,
  durationLadderData,
  spreadIndicators as mockSpreadIndicators,
} from './mockBondsData';
```

Add state after `spreadData` state:
```js
const [spreadIndicators, setSpreadIndicators] = useState(mockSpreadIndicators);
```

Add to `.then(data => {...})` block, after `setSpreadData`:
```js
if (data.spreadIndicators && Object.keys(data.spreadIndicators).length >= 3) {
  setSpreadIndicators(data.spreadIndicators);
}
```

Add to return object:
```js
return { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, isLive, lastUpdated, isLoading };
```

- [ ] **Step 6: Pass spreadIndicators through BondsMarket.jsx**

In `src/markets/bonds/BondsMarket.jsx`, destructure `spreadIndicators`:
```js
const { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, isLive, lastUpdated, isLoading } = useBondsData();
```

Pass to YieldCurve:
```js
{activeTab === 'yield-curve' && <YieldCurve yieldCurveData={yieldCurveData} spreadIndicators={spreadIndicators} />}
```

- [ ] **Step 7: Render spread indicator stat pills in YieldCurve.jsx**

In `src/markets/bonds/components/YieldCurve.jsx`, accept and render `spreadIndicators`:

```jsx
export default function YieldCurve({ yieldCurveData, spreadIndicators }) {
  // ... existing option useMemo ...

  const countryCount = Object.keys(yieldCurveData).length;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Yield Curve</span>
        <span className="bonds-panel-subtitle">{countryCount} countries · sovereign benchmark rates</span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {spreadIndicators && (
        <div className="yc-indicators">
          <div className={`yc-pill ${spreadIndicators.t10y2y >= 0 ? 'yc-pill-pos' : 'yc-pill-neg'}`}>
            <span className="yc-pill-label">10Y−2Y</span>
            <span className="yc-pill-value">{spreadIndicators.t10y2y?.toFixed(2)}%</span>
          </div>
          <div className={`yc-pill ${spreadIndicators.t10y3m >= 0 ? 'yc-pill-pos' : 'yc-pill-neg'}`}>
            <span className="yc-pill-label">10Y−3M</span>
            <span className="yc-pill-value">{spreadIndicators.t10y3m?.toFixed(2)}%</span>
          </div>
          <div className="yc-pill">
            <span className="yc-pill-label">5Y Breakeven</span>
            <span className="yc-pill-value">{spreadIndicators.t5yie?.toFixed(2)}%</span>
          </div>
          <div className="yc-pill">
            <span className="yc-pill-label">10Y Breakeven</span>
            <span className="yc-pill-value">{spreadIndicators.t10yie?.toFixed(2)}%</span>
          </div>
          <div className="yc-pill">
            <span className="yc-pill-label">TIPS 10Y Real</span>
            <span className="yc-pill-value">{spreadIndicators.dfii10?.toFixed(2)}%</span>
          </div>
        </div>
      )}
      <div className="bonds-panel-footer">
        X-axis: 3m → 30y · Y-axis: yield % · Hover for details
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add CSS for stat pills to BondsComponents.css**

In `src/markets/bonds/components/BondsComponents.css`, append:

```css
.yc-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px 4px;
}
.yc-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 10px;
  min-width: 80px;
}
.yc-pill-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.yc-pill-value {
  font-size: 13px;
  font-weight: 600;
  color: #e2e8f0;
}
.yc-pill-pos .yc-pill-value { color: #4ade80; }
.yc-pill-neg .yc-pill-value { color: #f87171; }
```

- [ ] **Step 9: Run the tests to confirm they pass**

```bash
npx vitest run src/__tests__/bonds/YieldCurve.test.jsx
```

Expected: All tests pass including the 3 new ones.

- [ ] **Step 10: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (0 failing).

- [ ] **Step 11: Commit**

```bash
git add server/index.js src/markets/bonds/data/mockBondsData.js src/markets/bonds/data/useBondsData.js src/markets/bonds/BondsMarket.jsx src/markets/bonds/components/YieldCurve.jsx src/markets/bonds/components/BondsComponents.css src/__tests__/bonds/YieldCurve.test.jsx
git commit -m "feat(bonds): add spread indicators row to YieldCurve (T10Y2Y, breakeven inflation, TIPS real yield)"
```

---

## Task 3: Live Mortgage Rates in AffordabilityMap

**Files:**
- Modify: `server/index.js` (inside `/api/realEstate` handler)
- Modify: `src/markets/realEstate/data/useRealEstateData.js` (add `mortgageRates` state)
- Modify: `src/markets/realEstate/RealEstateMarket.jsx` (pass `mortgageRates` to AffordabilityMap)
- Modify: `src/markets/realEstate/components/AffordabilityMap.jsx` (render mortgage banner)
- Modify: `src/__tests__/realEstate/AffordabilityMap.test.jsx` (add mortgage rate tests)

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/realEstate/AffordabilityMap.test.jsx` (append after the existing describe block):

```jsx
describe('AffordabilityMap — mortgage rates', () => {
  it('renders mortgage rate banner when mortgageRates provided', () => {
    render(<AffordabilityMap affordabilityData={mockData} mortgageRates={{ rate30y: 6.82, rate15y: 6.15, asOf: '2026-04-03' }} />);
    expect(screen.getByText(/30-Year Fixed/i)).toBeInTheDocument();
    expect(screen.getByText(/6\.82%/)).toBeInTheDocument();
  });

  it('renders 15-year rate in banner', () => {
    render(<AffordabilityMap affordabilityData={mockData} mortgageRates={{ rate30y: 6.82, rate15y: 6.15, asOf: '2026-04-03' }} />);
    expect(screen.getByText(/15-Year Fixed/i)).toBeInTheDocument();
    expect(screen.getByText(/6\.15%/)).toBeInTheDocument();
  });

  it('renders without mortgage rates (null is acceptable)', () => {
    render(<AffordabilityMap affordabilityData={mockData} mortgageRates={null} />);
    expect(screen.getByText('Affordability Map')).toBeInTheDocument();
    expect(screen.queryByText(/30-Year Fixed/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm the tests fail**

```bash
npx vitest run src/__tests__/realEstate/AffordabilityMap.test.jsx
```

Expected: FAIL — AffordabilityMap doesn't accept `mortgageRates` prop yet.

- [ ] **Step 3: Fetch mortgage rates in server/index.js**

Inside the `/api/realEstate` handler in `server/index.js`, after the `// 2. House price indices` block (around line 660), add:

```js
// 3. Mortgage rates from FRED
let mortgageRates = null;
if (FRED_API_KEY) {
  try {
    const [rate30, rate15] = await Promise.all([
      fetchFredHistory('MORTGAGE30US', 2),
      fetchFredHistory('MORTGAGE15US', 2),
    ]);
    const latest30 = rate30[rate30.length - 1];
    const latest15 = rate15[rate15.length - 1];
    if (latest30 && latest15) {
      mortgageRates = {
        rate30y: Math.round(latest30.value * 100) / 100,
        rate15y: Math.round(latest15.value * 100) / 100,
        asOf: latest30.date,
      };
    }
  } catch { /* use null */ }
}
```

Then add `mortgageRates` to the result:

```js
const result = { reitData, priceIndexData, mortgageRates, lastUpdated: new Date().toISOString().split('T')[0] };
```

- [ ] **Step 4: Add mortgageRates to useRealEstateData.js**

In `src/markets/realEstate/data/useRealEstateData.js`:

Add state after `isLoading`:
```js
const [mortgageRates, setMortgageRates] = useState(null);
```

In `.then(data => {...})`, after `setIsLive(true)`:
```js
if (data.mortgageRates?.rate30y) setMortgageRates(data.mortgageRates);
```

Add to return:
```js
return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, isLive, lastUpdated, isLoading };
```

- [ ] **Step 5: Pass mortgageRates through RealEstateMarket.jsx**

In `src/markets/realEstate/RealEstateMarket.jsx`, destructure `mortgageRates`:
```js
const { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, isLive, lastUpdated, isLoading } = useRealEstateData();
```

Pass to AffordabilityMap:
```js
{activeTab === 'affordability-map' && <AffordabilityMap affordabilityData={affordabilityData} mortgageRates={mortgageRates} />}
```

- [ ] **Step 6: Render mortgage rate banner in AffordabilityMap.jsx**

In `src/markets/realEstate/components/AffordabilityMap.jsx`, accept the new prop and render a banner above the table:

```jsx
export default function AffordabilityMap({ affordabilityData, mortgageRates }) {
  const sorted = [...affordabilityData].sort((a, b) => b.priceToIncome - a.priceToIncome);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Affordability Map</span>
        <span className="re-panel-subtitle">Price-to-income ratio by city · sorted least affordable first</span>
      </div>
      {mortgageRates && (
        <div className="afford-mortgage-banner">
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">30-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate30y.toFixed(2)}%</span>
          </div>
          <div className="afford-mortgage-divider" />
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">15-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate15y.toFixed(2)}%</span>
          </div>
          <span className="afford-mortgage-source">FRED · as of {mortgageRates.asOf}</span>
        </div>
      )}
      <div className="afford-scroll">
        {/* ... existing table ... */}
      </div>
      <div className="re-panel-footer">
        Red ≥ 12× · Orange ≥ 8× · Yellow ≥ 5× · Green &lt; 5× · Mortgage/Income = % of gross household income
      </div>
    </div>
  );
}
```

Keep the existing table JSX inside `afford-scroll` exactly as-is. Only the banner and prop signature change.

- [ ] **Step 7: Add CSS for mortgage banner to REComponents.css**

In `src/markets/realEstate/components/REComponents.css`, append:

```css
.afford-mortgage-banner {
  display: flex;
  align-items: center;
  gap: 16px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 8px 16px;
  margin: 0 0 8px 0;
  flex-wrap: wrap;
}
.afford-mortgage-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.afford-mortgage-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.afford-mortgage-rate {
  font-size: 18px;
  font-weight: 700;
  color: #60a5fa;
}
.afford-mortgage-divider {
  width: 1px;
  height: 32px;
  background: #334155;
}
.afford-mortgage-source {
  font-size: 10px;
  color: #475569;
  margin-left: auto;
}
```

- [ ] **Step 8: Run the tests**

```bash
npx vitest run src/__tests__/realEstate/AffordabilityMap.test.jsx
```

Expected: All tests pass.

- [ ] **Step 9: Run the full suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add server/index.js src/markets/realEstate/data/useRealEstateData.js src/markets/realEstate/RealEstateMarket.jsx src/markets/realEstate/components/AffordabilityMap.jsx src/markets/realEstate/components/REComponents.css src/__tests__/realEstate/AffordabilityMap.test.jsx
git commit -m "feat(realEstate): show live FRED mortgage rates banner in AffordabilityMap"
```

---

## Task 4: VIX Percentile + VVIX in VIXTermStructure

**Files:**
- Modify: `server/index.js` (inside `/api/derivatives`, VIX term structure block)
- Modify: `src/markets/derivatives/data/useDerivativesData.js` (add `vixEnrichment` state)
- Modify: `src/markets/derivatives/DerivativesMarket.jsx` (pass `vixEnrichment` to VIXTermStructure)
- Modify: `src/markets/derivatives/components/VIXTermStructure.jsx` (render stat row)
- Create: `src/__tests__/derivatives/VIXTermStructure.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/derivatives/VIXTermStructure.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VIXTermStructure from '../../markets/derivatives/components/VIXTermStructure';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockVixTS = {
  dates:      ['9D', '1M', '3M', '6M'],
  values:     [14.2, 16.8, 18.5, 20.1],
  prevValues: [13.9, 16.2, 17.9, 19.6],
};

const mockEnrichment = {
  vvix: 92.4,
  vixPercentile: 28,
};

describe('VIXTermStructure', () => {
  it('renders panel title', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={null} />);
    expect(screen.getByText('VIX Term Structure')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={null} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders VVIX value when enrichment provided', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={mockEnrichment} />);
    expect(screen.getByText(/VVIX/i)).toBeInTheDocument();
    expect(screen.getByText(/92\.4/)).toBeInTheDocument();
  });

  it('renders VIX percentile when enrichment provided', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={mockEnrichment} />);
    expect(screen.getByText(/Percentile/i)).toBeInTheDocument();
    expect(screen.getByText(/28/)).toBeInTheDocument();
  });

  it('renders without enrichment (null is acceptable)', () => {
    render(<VIXTermStructure vixTermStructure={mockVixTS} vixEnrichment={null} />);
    expect(screen.queryByText(/VVIX/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to confirm failures**

```bash
npx vitest run src/__tests__/derivatives/VIXTermStructure.test.jsx
```

Expected: FAIL — VIXTermStructure doesn't accept `vixEnrichment` prop.

- [ ] **Step 3: Fetch VVIX and compute VIX percentile in server/index.js**

Inside the `/api/derivatives` handler, after the `// 1. VIX term structure` block (around line 490), add:

```js
// 1b. VVIX + VIX 252-day percentile
let vixEnrichment = null;
try {
  const [vvixQuote, vixHistory] = await Promise.all([
    yf.quote('^VVIX').catch(() => null),
    yf.historical('^VIX', {
      period1: (() => { const d = new Date(); d.setDate(d.getDate() - 365); return d.toISOString().split('T')[0]; })(),
      period2: new Date().toISOString().split('T')[0],
      interval: '1d',
    }).catch(() => []),
  ]);

  const vvix = vvixQuote?.regularMarketPrice ?? null;
  const vixCloses = vixHistory.map(d => d.close).filter(Boolean);
  const currentVix = vixArr.find(q => q?.symbol === '^VIX')?.regularMarketPrice ?? null;

  let vixPercentile = null;
  if (currentVix != null && vixCloses.length >= 20) {
    const below = vixCloses.filter(v => v <= currentVix).length;
    vixPercentile = Math.round((below / vixCloses.length) * 100);
  }

  if (vvix != null || vixPercentile != null) {
    vixEnrichment = { vvix, vixPercentile };
  }
} catch { /* use null */ }
```

Add `vixEnrichment` to the result object (around line 584):

```js
const result = {
  vixTermStructure,
  optionsFlow,
  fearGreedData,
  volSurfaceData,
  vixEnrichment,
  lastUpdated: new Date().toISOString().split('T')[0],
};
```

- [ ] **Step 4: Add vixEnrichment to useDerivativesData.js**

In `src/markets/derivatives/data/useDerivativesData.js`:

Add state:
```js
const [vixEnrichment, setVixEnrichment] = useState(null);
```

In `.then(data => {...})`:
```js
if (data.vixEnrichment?.vvix != null || data.vixEnrichment?.vixPercentile != null) {
  setVixEnrichment(data.vixEnrichment);
}
```

Add to return:
```js
return { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, isLive, lastUpdated, isLoading };
```

- [ ] **Step 5: Pass vixEnrichment through DerivativesMarket.jsx**

In `src/markets/derivatives/DerivativesMarket.jsx`:

```js
const { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, isLive, lastUpdated, isLoading } = useDerivativesData();
```

```jsx
{activeTab === 'vix-term-structure' && <VIXTermStructure vixTermStructure={vixTermStructure} vixEnrichment={vixEnrichment} />}
```

- [ ] **Step 6: Render enrichment stats in VIXTermStructure.jsx**

In `src/markets/derivatives/components/VIXTermStructure.jsx`, accept and render `vixEnrichment`:

```jsx
export default function VIXTermStructure({ vixTermStructure, vixEnrichment }) {
  const { dates, values, prevValues } = vixTermStructure;

  const isContango = values[values.length - 1] > values[0];
  const structureLabel = isContango
    ? 'Contango (normal — market calm)'
    : 'Backwardation (elevated near-term fear)';

  const option = useMemo(() => ({
    // ... existing option object unchanged ...
  }), [vixTermStructure]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">VIX Term Structure</span>
        <span className="deriv-panel-subtitle">{structureLabel}</span>
      </div>
      <div className="deriv-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {vixEnrichment && (
        <div className="vix-enrichment-row">
          {vixEnrichment.vvix != null && (
            <div className="vix-enrich-pill">
              <span className="vix-enrich-label">VVIX</span>
              <span className="vix-enrich-value">{vixEnrichment.vvix.toFixed(1)}</span>
            </div>
          )}
          {vixEnrichment.vixPercentile != null && (
            <div className="vix-enrich-pill">
              <span className="vix-enrich-label">VIX Percentile (252d)</span>
              <span className="vix-enrich-value">{vixEnrichment.vixPercentile}th</span>
            </div>
          )}
        </div>
      )}
      <div className="deriv-panel-footer">
        Spot VIX + 9 futures expirations · Dashed = previous close · Contango = upward slope
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add CSS for enrichment row to DerivComponents.css**

In `src/markets/derivatives/components/DerivComponents.css`, append:

```css
.vix-enrichment-row {
  display: flex;
  gap: 12px;
  padding: 6px 12px 4px;
  flex-wrap: wrap;
}
.vix-enrich-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 14px;
  min-width: 90px;
}
.vix-enrich-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vix-enrich-value {
  font-size: 14px;
  font-weight: 600;
  color: #a78bfa;
}
```

- [ ] **Step 8: Run the tests**

```bash
npx vitest run src/__tests__/derivatives/VIXTermStructure.test.jsx
```

Expected: 5 tests pass.

- [ ] **Step 9: Run the full suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 10: Commit**

```bash
git add server/index.js src/markets/derivatives/data/useDerivativesData.js src/markets/derivatives/DerivativesMarket.jsx src/markets/derivatives/components/VIXTermStructure.jsx src/markets/derivatives/components/DerivComponents.css src/__tests__/derivatives/VIXTermStructure.test.jsx
git commit -m "feat(derivatives): add VVIX + VIX 252d percentile stats to VIXTermStructure"
```

---

## Task 5: Fear & Greed History Chart (VIXCLS from FRED)

**Files:**
- Modify: `server/index.js` (inside `/api/derivatives`, after Fear & Greed block)
- Modify: `src/markets/derivatives/data/useDerivativesData.js` (add `vixHistory` state)
- Modify: `src/markets/derivatives/DerivativesMarket.jsx` (pass `vixHistory` to FearGreed)
- Modify: `src/markets/derivatives/components/FearGreed.jsx` (add ECharts line chart)
- Modify: `src/__tests__/derivatives/FearGreed.test.jsx` (add history chart tests)

- [ ] **Step 1: Write the failing tests**

Add to `src/__tests__/derivatives/FearGreed.test.jsx` (append after existing describe block):

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FearGreed from '../../markets/derivatives/components/FearGreed';

vi.mock('echarts-for-react', () => ({ default: ({ 'data-testid': tid }) => <div data-testid={tid || 'echarts-mock'} /> }));

const mockHistory = [
  { date: '2025-10-01', value: 22.3 },
  { date: '2025-10-02', value: 20.1 },
  { date: '2025-10-03', value: 18.7 },
];

describe('FearGreed — history chart', () => {
  it('renders history chart when vixHistory provided', () => {
    render(<FearGreed fearGreedData={mockData} vixHistory={mockHistory} />);
    expect(screen.getByTestId('vix-history-chart')).toBeInTheDocument();
  });

  it('renders VIX history section label', () => {
    render(<FearGreed fearGreedData={mockData} vixHistory={mockHistory} />);
    expect(screen.getByText(/VIX History/i)).toBeInTheDocument();
  });

  it('renders without history (null is acceptable)', () => {
    render(<FearGreed fearGreedData={mockData} vixHistory={null} />);
    expect(screen.queryByTestId('vix-history-chart')).not.toBeInTheDocument();
  });
});
```

Note: The `mockData` const is already defined in the existing describe block at the top of the test file — reuse it.

- [ ] **Step 2: Update echarts mock at top of FearGreed.test.jsx**

The existing test file imports `FearGreed` but has no echarts mock. Since FearGreed will now use ReactECharts, add the mock at the top of the test file (before the existing describe):

```jsx
import { vi } from 'vitest';
vi.mock('echarts-for-react', () => ({
  default: (props) => <div data-testid={props['data-testid'] || 'echarts-mock'} />,
}));
```

- [ ] **Step 3: Run to confirm failures**

```bash
npx vitest run src/__tests__/derivatives/FearGreed.test.jsx
```

Expected: FAIL — FearGreed doesn't accept `vixHistory`, no history chart rendered.

- [ ] **Step 4: Fetch VIXCLS history in server/index.js**

Inside the `/api/derivatives` handler, after the `// 3. Fear & Greed` block (around line 574), add:

```js
// 5. VIX history from FRED (VIXCLS daily, last 252 trading days)
let vixHistory = null;
if (FRED_API_KEY) {
  try {
    const vixHistRaw = await fetchFredHistory('VIXCLS', 270); // fetch ~270 to get ~252 valid
    if (vixHistRaw.length >= 30) {
      vixHistory = vixHistRaw.slice(-252).map(p => ({
        date: p.date,
        value: Math.round(p.value * 10) / 10,
      }));
    }
  } catch { /* use null */ }
}
```

Add `vixHistory` to the result object:

```js
const result = {
  vixTermStructure,
  optionsFlow,
  fearGreedData,
  volSurfaceData,
  vixEnrichment,
  vixHistory,
  lastUpdated: new Date().toISOString().split('T')[0],
};
```

- [ ] **Step 5: Add vixHistory to useDerivativesData.js**

In `src/markets/derivatives/data/useDerivativesData.js`:

Add state:
```js
const [vixHistory, setVixHistory] = useState(null);
```

In `.then(data => {...})`:
```js
if (data.vixHistory?.length >= 30) setVixHistory(data.vixHistory);
```

Add to return:
```js
return { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, vixHistory, isLive, lastUpdated, isLoading };
```

- [ ] **Step 6: Pass vixHistory through DerivativesMarket.jsx**

In `src/markets/derivatives/DerivativesMarket.jsx`:

```js
const { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, vixHistory, isLive, lastUpdated, isLoading } = useDerivativesData();
```

```jsx
{activeTab === 'fear-greed' && <FearGreed fearGreedData={fearGreedData} vixHistory={vixHistory} />}
```

- [ ] **Step 7: Add history chart to FearGreed.jsx**

In `src/markets/derivatives/components/FearGreed.jsx`, add ReactECharts import and vixHistory rendering:

```jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

// ... existing scoreColor, scoreLabelColor functions ...

export default function FearGreed({ fearGreedData, vixHistory }) {
  const { score, label, indicators } = fearGreedData;
  const mainColor = scoreColor(score);

  const historyOption = useMemo(() => {
    if (!vixHistory?.length) return null;
    const dates  = vixHistory.map(p => p.date.slice(5)); // MM-DD
    const values = vixHistory.map(p => p.value);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) => `${params[0].axisValue}: <b>${params[0].value}</b>` },
      grid: { top: 10, right: 10, bottom: 30, left: 45 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 9, interval: Math.floor(dates.length / 8) },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        name: 'VIX',
        nameTextStyle: { color: '#64748b', fontSize: 9 },
        axisLabel: { color: '#64748b', fontSize: 10 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [{
        type: 'line',
        data: values,
        itemStyle: { color: '#a78bfa' },
        lineStyle: { width: 1.5 },
        areaStyle: { color: '#a78bfa', opacity: 0.07 },
        symbol: 'none',
      }],
    };
  }, [vixHistory]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Fear &amp; Greed</span>
        <span className="deriv-panel-subtitle">Composite sentiment index · 0 = extreme fear · 100 = extreme greed</span>
      </div>
      <div className="fg-layout">
        <div className="fg-gauge-wrap">
          <div className="fg-score" style={{ color: mainColor }}>{score}</div>
          <div className="fg-label" style={{ color: mainColor }}>{label}</div>
        </div>
        <div className="fg-indicators">
          {indicators.map(ind => (
            <div key={ind.name} className="fg-row">
              <span className="fg-row-name">{ind.name}</span>
              <div className="fg-row-bar-wrap">
                <div
                  className="fg-row-bar"
                  style={{ width: `${ind.score}%`, backgroundColor: scoreColor(ind.score) }}
                />
              </div>
              <span className="fg-row-score">{ind.score}</span>
              <span className="fg-row-label" style={{ color: scoreLabelColor(ind.label) }}>
                {ind.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      {vixHistory?.length > 0 && historyOption && (
        <div className="fg-history-wrap">
          <div className="fg-history-title">VIX History (252 trading days)</div>
          <ReactECharts
            data-testid="vix-history-chart"
            option={historyOption}
            style={{ height: 100, width: '100%' }}
          />
        </div>
      )}
      <div className="deriv-panel-footer">
        0–25 Extreme Fear · 26–45 Fear · 46–55 Neutral · 56–75 Greed · 76–100 Extreme Greed
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Add CSS for history chart to DerivComponents.css**

In `src/markets/derivatives/components/DerivComponents.css`, append:

```css
.fg-history-wrap {
  padding: 4px 12px 0;
}
.fg-history-title {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 2px;
}
```

- [ ] **Step 9: Run the tests**

```bash
npx vitest run src/__tests__/derivatives/FearGreed.test.jsx
```

Expected: All tests pass (existing 5 + new 3 = 8 passing).

- [ ] **Step 10: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests pass (0 failing).

- [ ] **Step 11: Commit**

```bash
git add server/index.js src/markets/derivatives/data/useDerivativesData.js src/markets/derivatives/DerivativesMarket.jsx src/markets/derivatives/components/FearGreed.jsx src/markets/derivatives/components/DerivComponents.css src/__tests__/derivatives/FearGreed.test.jsx
git commit -m "feat(derivatives): add 252-day VIX history chart to Fear & Greed panel"
```

---

## Self-Review

**Spec coverage:**
1. ✅ BBB spread — Task 1 (SpreadMonitor, SERIES_CONFIG, mock, server)
2. ✅ T10Y2Y + Breakeven indicators — Task 2 (YieldCurve stat pills, FRED series, mock, hook, CSS)
3. ✅ Live mortgage rates — Task 3 (AffordabilityMap banner, MORTGAGE30US/15US, CSS)
4. ✅ VIX percentile + VVIX — Task 4 (VIXTermStructure enrichment row, server computation, CSS)
5. ✅ Fear & Greed history chart — Task 5 (VIXCLS ECharts chart, FRED fetch, CSS)

**Placeholder scan:** No TBDs, all code is complete, all CSS classes defined, all test assertions use concrete values.

**Type consistency:**
- `spreadIndicators`: server returns `{t10y2y, t10y3m, t5yie, t10yie, dfii10}`, mock matches, component reads same keys ✅
- `mortgageRates`: server returns `{rate30y, rate15y, asOf}`, component reads same keys ✅
- `vixEnrichment`: server returns `{vvix, vixPercentile}`, component reads same keys ✅
- `vixHistory`: server returns `[{date, value}]`, component reads same keys ✅
- `spreadData.BBB`: added in mock, server, and SERIES_CONFIG simultaneously ✅
