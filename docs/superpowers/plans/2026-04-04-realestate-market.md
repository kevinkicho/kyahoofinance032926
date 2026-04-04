# Real Estate Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Real Estate Market module with four sub-views: Price Index (multi-market housing price trends), REIT Screen (major REITs table), Affordability Map (price-to-income + mortgage), and Cap Rate Monitor (property-type cap rates over time).

**Architecture:** Mock-data-first — a synchronous `useRealEstateData` hook returns static datasets. Four sub-tab components consume it. `RealEstateMarket.jsx` owns tab state and passes slices down as props, mirroring the Bonds Market pattern exactly.

**Tech Stack:** React 18, Vite 5, ECharts via echarts-for-react, Vitest + @testing-library/react, CSS class-namespaced `.re-`

---

### Task 1: Mock Data + useRealEstateData Hook

**Files:**
- Create: `src/markets/realEstate/data/mockRealEstateData.js`
- Create: `src/markets/realEstate/data/useRealEstateData.js`
- Create: `src/__tests__/realEstate/useRealEstateData.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/realEstate/useRealEstateData.test.js
import { describe, it, expect } from 'vitest';
import { useRealEstateData } from '../../markets/realEstate/data/useRealEstateData';

describe('useRealEstateData', () => {
  it('returns priceIndexData with expected markets', () => {
    const { priceIndexData } = useRealEstateData();
    expect(Object.keys(priceIndexData)).toEqual(
      expect.arrayContaining(['US', 'UK', 'DE', 'AU'])
    );
  });

  it('each market has matching dates and values arrays', () => {
    const { priceIndexData } = useRealEstateData();
    for (const market of Object.keys(priceIndexData)) {
      const { dates, values } = priceIndexData[market];
      expect(dates.length).toBeGreaterThan(0);
      expect(values.length).toBe(dates.length);
    }
  });

  it('reitData has at least 8 entries with required fields', () => {
    const { reitData } = useRealEstateData();
    expect(reitData.length).toBeGreaterThanOrEqual(8);
    expect(reitData[0]).toMatchObject({
      ticker: expect.any(String),
      name: expect.any(String),
      sector: expect.any(String),
      dividendYield: expect.any(Number),
      pFFO: expect.any(Number),
      ytdReturn: expect.any(Number),
      marketCap: expect.any(Number),
    });
  });

  it('affordabilityData has required fields per market', () => {
    const { affordabilityData } = useRealEstateData();
    expect(affordabilityData.length).toBeGreaterThan(0);
    expect(affordabilityData[0]).toMatchObject({
      city: expect.any(String),
      country: expect.any(String),
      priceToIncome: expect.any(Number),
      mortgageToIncome: expect.any(Number),
      medianPrice: expect.any(Number),
      yoyChange: expect.any(Number),
    });
  });

  it('capRateData has dates array and at least 3 property types', () => {
    const { capRateData } = useRealEstateData();
    expect(capRateData.dates.length).toBeGreaterThan(0);
    const types = Object.keys(capRateData).filter(k => k !== 'dates');
    expect(types.length).toBeGreaterThanOrEqual(3);
    types.forEach(t => {
      expect(capRateData[t].length).toBe(capRateData.dates.length);
    });
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useRealEstateData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/realEstate/useRealEstateData.test.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create mock data file**

```js
// src/markets/realEstate/data/mockRealEstateData.js

// House Price Index — quarterly, normalized to 100 at 2015 Q1
export const priceIndexData = {
  US: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [152, 148, 158, 163, 170, 182, 195, 200, 210, 215, 208, 202, 198, 204, 210, 215, 220, 226, 228, 231],
  },
  UK: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [138, 133, 141, 148, 155, 165, 173, 178, 183, 186, 182, 175, 170, 168, 170, 173, 176, 180, 182, 185],
  },
  DE: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [145, 144, 149, 154, 160, 168, 175, 180, 186, 188, 182, 172, 163, 158, 156, 158, 161, 165, 167, 170],
  },
  AU: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [142, 137, 142, 150, 160, 175, 188, 196, 200, 197, 188, 180, 182, 190, 198, 205, 210, 215, 218, 222],
  },
  CA: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [148, 143, 152, 162, 175, 192, 205, 210, 215, 210, 195, 182, 178, 183, 190, 196, 200, 205, 207, 210],
  },
  JP: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [112, 110, 112, 114, 116, 119, 122, 124, 127, 130, 132, 134, 136, 139, 142, 145, 148, 151, 153, 156],
  },
};

// Major REITs
export const reitData = [
  { ticker: 'PLD',  name: 'Prologis',          sector: 'Industrial',   dividendYield: 3.2, pFFO: 18.4, ytdReturn:  8.2, marketCap: 102 },
  { ticker: 'AMT',  name: 'American Tower',     sector: 'Cell Towers',  dividendYield: 3.8, pFFO: 22.1, ytdReturn: -2.1, marketCap:  88 },
  { ticker: 'EQIX', name: 'Equinix',            sector: 'Data Centers', dividendYield: 2.1, pFFO: 28.5, ytdReturn:  5.4, marketCap:  72 },
  { ticker: 'SPG',  name: 'Simon Property',     sector: 'Retail',       dividendYield: 5.6, pFFO: 12.8, ytdReturn:  4.1, marketCap:  48 },
  { ticker: 'WELL', name: 'Welltower',          sector: 'Healthcare',   dividendYield: 2.4, pFFO: 24.2, ytdReturn: 12.3, marketCap:  58 },
  { ticker: 'AVB',  name: 'AvalonBay',          sector: 'Residential',  dividendYield: 3.5, pFFO: 19.6, ytdReturn:  3.8, marketCap:  28 },
  { ticker: 'BXP',  name: 'Boston Properties',  sector: 'Office',       dividendYield: 6.8, pFFO:  9.4, ytdReturn: -8.5, marketCap:  11 },
  { ticker: 'PSA',  name: 'Public Storage',     sector: 'Self-Storage', dividendYield: 4.1, pFFO: 16.2, ytdReturn:  1.2, marketCap:  50 },
  { ticker: 'O',    name: 'Realty Income',      sector: 'Net Lease',    dividendYield: 6.0, pFFO: 13.5, ytdReturn: -1.8, marketCap:  44 },
  { ticker: 'VICI', name: 'VICI Properties',    sector: 'Gaming',       dividendYield: 5.5, pFFO: 14.0, ytdReturn:  2.9, marketCap:  32 },
];

// Affordability by city
export const affordabilityData = [
  { city: 'Hong Kong',   country: 'HK', priceToIncome: 18.8, mortgageToIncome: 92.4, medianPrice: 1_280_000, yoyChange:  -4.2 },
  { city: 'Sydney',      country: 'AU', priceToIncome: 13.2, mortgageToIncome: 74.5, medianPrice:   980_000, yoyChange:   5.1 },
  { city: 'Vancouver',   country: 'CA', priceToIncome: 12.6, mortgageToIncome: 71.8, medianPrice:   920_000, yoyChange:   2.3 },
  { city: 'London',      country: 'UK', priceToIncome: 11.0, mortgageToIncome: 65.2, medianPrice:   720_000, yoyChange:   1.8 },
  { city: 'Auckland',    country: 'NZ', priceToIncome: 10.8, mortgageToIncome: 63.1, medianPrice:   680_000, yoyChange:  -1.5 },
  { city: 'Toronto',     country: 'CA', priceToIncome: 10.5, mortgageToIncome: 61.4, medianPrice:   850_000, yoyChange:   3.2 },
  { city: 'Singapore',   country: 'SG', priceToIncome:  9.8, mortgageToIncome: 57.2, medianPrice: 1_100_000, yoyChange:   2.8 },
  { city: 'Los Angeles', country: 'US', priceToIncome:  9.2, mortgageToIncome: 56.8, medianPrice:   820_000, yoyChange:   4.5 },
  { city: 'New York',    country: 'US', priceToIncome:  8.9, mortgageToIncome: 54.1, medianPrice:   750_000, yoyChange:   3.1 },
  { city: 'Munich',      country: 'DE', priceToIncome:  8.5, mortgageToIncome: 50.3, medianPrice:   620_000, yoyChange:  -5.8 },
  { city: 'Paris',       country: 'FR', priceToIncome:  8.2, mortgageToIncome: 48.7, medianPrice:   580_000, yoyChange:  -3.2 },
  { city: 'Tokyo',       country: 'JP', priceToIncome:  7.8, mortgageToIncome: 30.2, medianPrice:   480_000, yoyChange:   6.2 },
  { city: 'Chicago',     country: 'US', priceToIncome:  5.4, mortgageToIncome: 33.5, medianPrice:   320_000, yoyChange:   2.8 },
  { city: 'Berlin',      country: 'DE', priceToIncome:  5.1, mortgageToIncome: 30.8, medianPrice:   280_000, yoyChange:  -4.1 },
  { city: 'Houston',     country: 'US', priceToIncome:  4.2, mortgageToIncome: 26.4, medianPrice:   260_000, yoyChange:   1.5 },
];

// Cap rates by property type — quarterly
export const capRateData = {
  dates:       ['Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
  Industrial:  [3.8, 4.1, 4.5, 4.9, 5.0, 5.1, 5.2, 5.2, 5.1, 5.0, 5.0, 4.9],
  Multifamily: [4.2, 4.6, 5.0, 5.3, 5.5, 5.6, 5.7, 5.7, 5.6, 5.5, 5.4, 5.3],
  Retail:      [5.8, 6.0, 6.3, 6.6, 6.8, 6.9, 7.0, 7.0, 6.9, 6.8, 6.7, 6.6],
  Office:      [5.5, 5.9, 6.4, 6.9, 7.2, 7.5, 7.8, 8.0, 8.1, 8.2, 8.2, 8.3],
  Hotel:       [6.8, 7.0, 7.2, 7.4, 7.5, 7.5, 7.4, 7.3, 7.2, 7.1, 7.0, 6.9],
};
```

- [ ] **Step 4: Create the hook**

```js
// src/markets/realEstate/data/useRealEstateData.js
import { priceIndexData, reitData, affordabilityData, capRateData } from './mockRealEstateData';

export function useRealEstateData() {
  return {
    priceIndexData,
    reitData,
    affordabilityData,
    capRateData,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/realEstate/useRealEstateData.test.js`
Expected: 6/6 PASS

- [ ] **Step 6: Commit**

```bash
git add src/markets/realEstate/data/mockRealEstateData.js src/markets/realEstate/data/useRealEstateData.js src/__tests__/realEstate/useRealEstateData.test.js
git commit -m "feat(realestate): mock data and useRealEstateData hook"
```

---

### Task 2: CSS Files

**Files:**
- Create: `src/markets/realEstate/components/REComponents.css`
- Create: `src/markets/realEstate/RealEstateMarket.css`

No tests needed for CSS.

- [ ] **Step 1: Create REComponents.css**

```css
/* src/markets/realEstate/components/REComponents.css */
.re-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
.re-panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.re-panel-title    { font-size: 16px; font-weight: 600; color: #e2e8f0; }
.re-panel-subtitle { font-size: 11px; color: #64748b; flex: 1; }
.re-panel-footer   { margin-top: 12px; font-size: 10px; color: #475569; flex-shrink: 0; }
.re-chart-wrap     { flex: 1; min-height: 0; }

/* REIT Screen table */
.reit-scroll { overflow: auto; flex: 1; }
.reit-table  { border-collapse: collapse; min-width: 100%; }
.reit-th {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}
.reit-th:first-child,
.reit-th:nth-child(2),
.reit-th:nth-child(3) { text-align: left; }
.reit-th.sorted { color: #f97316; }
.reit-row { transition: background 0.1s; }
.reit-row:hover { background: #1e293b; }
.reit-cell {
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}
.reit-cell:first-child { text-align: left; font-weight: 600; color: #f97316; }
.reit-cell:nth-child(2) { text-align: left; color: #e2e8f0; }
.reit-cell:nth-child(3) {
  text-align: left;
  font-size: 10px;
  color: #64748b;
}
.reit-positive { color: #22c55e; }
.reit-negative { color: #ef4444; }

/* Affordability table */
.afford-scroll { overflow: auto; flex: 1; }
.afford-table  { border-collapse: collapse; min-width: 100%; }
.afford-th {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 14px;
  border: 1px solid #0f172a;
  text-align: right;
  white-space: nowrap;
}
.afford-th:first-child { text-align: left; }
.afford-cell {
  padding: 8px 14px;
  border: 1px solid #0f172a;
  text-align: right;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}
.afford-cell:first-child { text-align: left; font-weight: 500; color: #e2e8f0; }
.afford-bar-cell { padding: 8px 14px; border: 1px solid #0f172a; min-width: 120px; }
.afford-bar-wrap { height: 8px; background: #0f172a; border-radius: 4px; overflow: hidden; }
.afford-bar      { height: 100%; border-radius: 4px; transition: width 0.3s; }
```

- [ ] **Step 2: Create RealEstateMarket.css**

```css
/* src/markets/realEstate/RealEstateMarket.css */
.re-market {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #0a0f1a;
}

.re-sub-tabs {
  display: flex;
  align-items: center;
  background: #0d1117;
  border-bottom: 1px solid #1e293b;
  padding: 0 16px;
  height: 38px;
  flex-shrink: 0;
}
.re-sub-tab {
  padding: 0 14px;
  height: 100%;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #475569;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.re-sub-tab:hover  { color: #94a3b8; }
.re-sub-tab.active { color: #f97316; border-bottom-color: #f97316; }

.re-status-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 3px 20px;
  background: #0d1117;
  border-bottom: 1px solid #0f172a;
  font-size: 10px;
  color: #475569;
  flex-shrink: 0;
}
.re-status-live { color: #f97316; }

.re-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/markets/realEstate/components/REComponents.css src/markets/realEstate/RealEstateMarket.css
git commit -m "feat(realestate): CSS for real estate market layout and components"
```

---

### Task 3: PriceIndex Component

**Files:**
- Create: `src/markets/realEstate/components/PriceIndex.jsx`
- Create: `src/__tests__/realEstate/PriceIndex.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/realEstate/PriceIndex.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceIndex from '../../markets/realEstate/components/PriceIndex';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockData = {
  US: { dates: ['Q1 22', 'Q2 22', 'Q3 22'], values: [200, 210, 205] },
  UK: { dates: ['Q1 22', 'Q2 22', 'Q3 22'], values: [175, 180, 176] },
};

describe('PriceIndex', () => {
  it('renders the panel title', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByText('Price Index')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders market count in subtitle', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByText(/2 markets/i)).toBeInTheDocument();
  });

  it('renders baseline note in footer', () => {
    render(<PriceIndex priceIndexData={mockData} />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/realEstate/PriceIndex.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement PriceIndex**

```jsx
// src/markets/realEstate/components/PriceIndex.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './REComponents.css';

const MARKET_COLORS = {
  US: '#60a5fa', UK: '#34d399', DE: '#f472b6',
  AU: '#fbbf24', CA: '#a78bfa', JP: '#fb923c',
};

export default function PriceIndex({ priceIndexData }) {
  const option = useMemo(() => {
    const markets = Object.keys(priceIndexData);
    // Use the dates from the first market (all share the same quarterly dates)
    const dates = priceIndexData[markets[0]]?.dates ?? [];
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) =>
          `<b>${params[0].axisValue}</b><br/>` +
          params.map(p => `${p.seriesName}: <b>${p.value}</b>`).join('<br/>'),
      },
      legend: {
        data: markets,
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: '#64748b', fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: markets.map(m => ({
        name: m,
        type: 'line',
        smooth: true,
        data: priceIndexData[m].values,
        itemStyle: { color: MARKET_COLORS[m] || '#94a3b8' },
        lineStyle: { width: 2 },
        symbol: 'none',
      })),
    };
  }, [priceIndexData]);

  const marketCount = Object.keys(priceIndexData).length;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Price Index</span>
        <span className="re-panel-subtitle">{marketCount} markets · quarterly · indexed to 100 at 2015 Q1</span>
      </div>
      <div className="re-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="re-panel-footer">
        Index base = 100 · Q1 2015 · Source: national statistical agencies
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/realEstate/PriceIndex.test.jsx`
Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/markets/realEstate/components/PriceIndex.jsx src/__tests__/realEstate/PriceIndex.test.jsx
git commit -m "feat(realestate): PriceIndex multi-market housing index chart"
```

---

### Task 4: REITScreen Component

**Files:**
- Create: `src/markets/realEstate/components/REITScreen.jsx`
- Create: `src/__tests__/realEstate/REITScreen.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/realEstate/REITScreen.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import REITScreen from '../../markets/realEstate/components/REITScreen';

const mockData = [
  { ticker: 'PLD',  name: 'Prologis',         sector: 'Industrial', dividendYield: 3.2, pFFO: 18.4, ytdReturn:  8.2, marketCap: 102 },
  { ticker: 'BXP',  name: 'Boston Properties', sector: 'Office',     dividendYield: 6.8, pFFO:  9.4, ytdReturn: -8.5, marketCap:  11 },
  { ticker: 'WELL', name: 'Welltower',         sector: 'Healthcare', dividendYield: 2.4, pFFO: 24.2, ytdReturn: 12.3, marketCap:  58 },
];

describe('REITScreen', () => {
  it('renders the panel title', () => {
    render(<REITScreen reitData={mockData} />);
    expect(screen.getByText('REIT Screen')).toBeInTheDocument();
  });

  it('renders all ticker symbols', () => {
    render(<REITScreen reitData={mockData} />);
    expect(screen.getByText('PLD')).toBeInTheDocument();
    expect(screen.getByText('BXP')).toBeInTheDocument();
    expect(screen.getByText('WELL')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<REITScreen reitData={mockData} />);
    expect(screen.getByText('Yield')).toBeInTheDocument();
    expect(screen.getByText('P/FFO')).toBeInTheDocument();
    expect(screen.getByText('YTD')).toBeInTheDocument();
  });

  it('shows positive YTD return in green', () => {
    const { container } = render(<REITScreen reitData={mockData} />);
    const positiveCells = container.querySelectorAll('.reit-positive');
    expect(positiveCells.length).toBeGreaterThan(0);
  });

  it('shows negative YTD return in red', () => {
    const { container } = render(<REITScreen reitData={mockData} />);
    const negativeCells = container.querySelectorAll('.reit-negative');
    expect(negativeCells.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/realEstate/REITScreen.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement REITScreen**

```jsx
// src/markets/realEstate/components/REITScreen.jsx
import React, { useState } from 'react';
import './REComponents.css';

const COLUMNS = [
  { key: 'ticker',        label: 'Ticker',  numeric: false },
  { key: 'name',          label: 'Name',    numeric: false },
  { key: 'sector',        label: 'Sector',  numeric: false },
  { key: 'marketCap',     label: 'Mkt Cap', numeric: true,  fmt: v => `$${v}B`             },
  { key: 'dividendYield', label: 'Yield',   numeric: true,  fmt: v => `${v.toFixed(1)}%`   },
  { key: 'pFFO',          label: 'P/FFO',   numeric: true,  fmt: v => `${v.toFixed(1)}x`   },
  { key: 'ytdReturn',     label: 'YTD',     numeric: true,  fmt: v => `${v > 0 ? '+' : ''}${v.toFixed(1)}%` },
];

export default function REITScreen({ reitData }) {
  const [sortKey, setSortKey]   = useState('marketCap');
  const [sortAsc, setSortAsc]   = useState(false);

  const sorted = [...reitData].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? av - bv : bv - av;
  });

  function handleSort(key) {
    if (key === sortKey) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">REIT Screen</span>
        <span className="re-panel-subtitle">{reitData.length} REITs · click column headers to sort</span>
      </div>
      <div className="reit-scroll">
        <table className="reit-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th
                  key={col.key}
                  className={`reit-th${sortKey === col.key ? ' sorted' : ''}`}
                  onClick={() => handleSort(col.key)}
                >
                  {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.ticker} className="reit-row">
                {COLUMNS.map(col => {
                  const val = row[col.key];
                  const display = col.fmt ? col.fmt(val) : val;
                  const colorClass = col.key === 'ytdReturn'
                    ? (val >= 0 ? 'reit-positive' : 'reit-negative')
                    : '';
                  return (
                    <td key={col.key} className={`reit-cell ${colorClass}`}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="re-panel-footer">
        Mkt Cap in $B · Yield = forward dividend yield · P/FFO = price / funds from operations · YTD = year-to-date return
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/realEstate/REITScreen.test.jsx`
Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add src/markets/realEstate/components/REITScreen.jsx src/__tests__/realEstate/REITScreen.test.jsx
git commit -m "feat(realestate): REITScreen sortable table with yield/P-FFO/YTD"
```

---

### Task 5: AffordabilityMap Component

**Files:**
- Create: `src/markets/realEstate/components/AffordabilityMap.jsx`
- Create: `src/__tests__/realEstate/AffordabilityMap.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/realEstate/AffordabilityMap.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AffordabilityMap from '../../markets/realEstate/components/AffordabilityMap';

const mockData = [
  { city: 'Hong Kong',   country: 'HK', priceToIncome: 18.8, mortgageToIncome: 92.4, medianPrice: 1_280_000, yoyChange: -4.2 },
  { city: 'Sydney',      country: 'AU', priceToIncome: 13.2, mortgageToIncome: 74.5, medianPrice:   980_000, yoyChange:  5.1 },
  { city: 'Houston',     country: 'US', priceToIncome:  4.2, mortgageToIncome: 26.4, medianPrice:   260_000, yoyChange:  1.5 },
];

describe('AffordabilityMap', () => {
  it('renders the panel title', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('Affordability Map')).toBeInTheDocument();
  });

  it('renders all city names', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('Hong Kong')).toBeInTheDocument();
    expect(screen.getByText('Sydney')).toBeInTheDocument();
    expect(screen.getByText('Houston')).toBeInTheDocument();
  });

  it('renders Price/Income column header', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText(/Price\/Income/i)).toBeInTheDocument();
  });

  it('renders YoY change with sign', () => {
    render(<AffordabilityMap affordabilityData={mockData} />);
    expect(screen.getByText('+5.1%')).toBeInTheDocument();
    expect(screen.getByText('-4.2%')).toBeInTheDocument();
  });

  it('renders affordability bar for each row', () => {
    const { container } = render(<AffordabilityMap affordabilityData={mockData} />);
    const bars = container.querySelectorAll('.afford-bar');
    expect(bars.length).toBe(mockData.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/realEstate/AffordabilityMap.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement AffordabilityMap**

```jsx
// src/markets/realEstate/components/AffordabilityMap.jsx
import React from 'react';
import './REComponents.css';

// Max P/I in dataset used to scale the bar (set to 20 to cover Hong Kong 18.8)
const MAX_PTI = 20;

function ptiColor(pti) {
  if (pti >= 12) return '#ef4444';
  if (pti >= 8)  return '#f97316';
  if (pti >= 5)  return '#facc15';
  return '#22c55e';
}

export default function AffordabilityMap({ affordabilityData }) {
  const sorted = [...affordabilityData].sort((a, b) => b.priceToIncome - a.priceToIncome);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Affordability Map</span>
        <span className="re-panel-subtitle">Price-to-income ratio by city · sorted least affordable first</span>
      </div>
      <div className="afford-scroll">
        <table className="afford-table">
          <thead>
            <tr>
              <th className="afford-th">City</th>
              <th className="afford-th">Price/Income</th>
              <th className="afford-th">P/I Bar</th>
              <th className="afford-th">Mortgage/Income</th>
              <th className="afford-th">Median Price</th>
              <th className="afford-th">YoY</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const barPct = Math.min((row.priceToIncome / MAX_PTI) * 100, 100);
              const color  = ptiColor(row.priceToIncome);
              return (
                <tr key={row.city}>
                  <td className="afford-cell">{row.city}</td>
                  <td className="afford-cell">{row.priceToIncome.toFixed(1)}×</td>
                  <td className="afford-bar-cell">
                    <div className="afford-bar-wrap">
                      <div className="afford-bar" style={{ width: `${barPct}%`, backgroundColor: color }} />
                    </div>
                  </td>
                  <td className="afford-cell">{row.mortgageToIncome.toFixed(1)}%</td>
                  <td className="afford-cell">${row.medianPrice.toLocaleString()}</td>
                  <td className={`afford-cell${row.yoyChange >= 0 ? ' reit-positive' : ' reit-negative'}`}>
                    {row.yoyChange >= 0 ? '+' : ''}{row.yoyChange.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="re-panel-footer">
        Red ≥ 12× · Orange ≥ 8× · Yellow ≥ 5× · Green &lt; 5× · Mortgage/Income = % of gross household income
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/realEstate/AffordabilityMap.test.jsx`
Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add src/markets/realEstate/components/AffordabilityMap.jsx src/__tests__/realEstate/AffordabilityMap.test.jsx
git commit -m "feat(realestate): AffordabilityMap price-to-income table with color bars"
```

---

### Task 6: CapRateMonitor Component

**Files:**
- Create: `src/markets/realEstate/components/CapRateMonitor.jsx`

No unit test needed — pure ECharts chart component.

- [ ] **Step 1: Implement CapRateMonitor**

```jsx
// src/markets/realEstate/components/CapRateMonitor.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './REComponents.css';

const TYPE_COLORS = {
  Industrial:  '#34d399',
  Multifamily: '#60a5fa',
  Retail:      '#fbbf24',
  Office:      '#f87171',
  Hotel:       '#a78bfa',
};

export default function CapRateMonitor({ capRateData }) {
  const { dates, ...types } = capRateData;

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value?.toFixed(2)}%</b>`).join('<br/>'),
    },
    legend: {
      data: Object.keys(types),
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { top: 40, right: 20, bottom: 30, left: 55 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: Object.entries(types).map(([name, data]) => ({
      name,
      type: 'line',
      smooth: false,
      data,
      itemStyle: { color: TYPE_COLORS[name] || '#94a3b8' },
      lineStyle: { width: 2 },
      symbol: 'none',
    })),
  }), [capRateData]);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Cap Rate Monitor</span>
        <span className="re-panel-subtitle">Capitalization rates by property type · quarterly</span>
      </div>
      <div className="re-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="re-panel-footer">
        Cap rate = NOI / property value · Rising cap rates = falling valuations
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/realEstate/components/CapRateMonitor.jsx
git commit -m "feat(realestate): CapRateMonitor property-type cap rate line chart"
```

---

### Task 7: RealEstateMarket Root Component + Full Test Run

**Files:**
- Modify: `src/markets/realEstate/RealEstateMarket.jsx`
- Create: `src/__tests__/realEstate/RealEstateMarket.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/realEstate/RealEstateMarket.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RealEstateMarket from '../../markets/realEstate/RealEstateMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('RealEstateMarket', () => {
  it('renders Price Index tab by default', () => {
    render(<RealEstateMarket />);
    expect(screen.getByText('Price Index')).toBeInTheDocument();
  });

  it('renders all 4 sub-tabs', () => {
    render(<RealEstateMarket />);
    expect(screen.getByRole('button', { name: 'Price Index'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REIT Screen'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Affordability Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cap Rate Monitor'  })).toBeInTheDocument();
  });

  it('switches to REIT Screen on click', () => {
    render(<RealEstateMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'REIT Screen' }));
    expect(screen.getByText(/REIT Screen/i)).toBeInTheDocument();
  });

  it('switches to Affordability Map on click', () => {
    render(<RealEstateMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Affordability Map' }));
    expect(screen.getByText(/price-to-income/i)).toBeInTheDocument();
  });

  it('switches to Cap Rate Monitor on click', () => {
    render(<RealEstateMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Cap Rate Monitor' }));
    expect(screen.getByText(/capitalization rates/i)).toBeInTheDocument();
  });

  it('shows mock data status', () => {
    render(<RealEstateMarket />);
    expect(screen.getByText(/mock data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/realEstate/RealEstateMarket.test.jsx`
Expected: FAIL (stub renders placeholder)

- [ ] **Step 3: Replace RealEstateMarket.jsx**

```jsx
// src/markets/realEstate/RealEstateMarket.jsx
import React, { useState } from 'react';
import { useRealEstateData } from './data/useRealEstateData';
import PriceIndex       from './components/PriceIndex';
import REITScreen       from './components/REITScreen';
import AffordabilityMap from './components/AffordabilityMap';
import CapRateMonitor   from './components/CapRateMonitor';
import './RealEstateMarket.css';

const SUB_TABS = [
  { id: 'price-index',       label: 'Price Index'       },
  { id: 'reit-screen',       label: 'REIT Screen'       },
  { id: 'affordability-map', label: 'Affordability Map' },
  { id: 'cap-rate-monitor',  label: 'Cap Rate Monitor'  },
];

export default function RealEstateMarket() {
  const [activeTab, setActiveTab] = useState('price-index');
  const { priceIndexData, reitData, affordabilityData, capRateData, isLive, lastUpdated } = useRealEstateData();

  return (
    <div className="re-market">
      <div className="re-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`re-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="re-status-bar">
        <span className={isLive ? 're-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="re-content">
        {activeTab === 'price-index'       && <PriceIndex       priceIndexData={priceIndexData} />}
        {activeTab === 'reit-screen'       && <REITScreen       reitData={reitData} />}
        {activeTab === 'affordability-map' && <AffordabilityMap affordabilityData={affordabilityData} />}
        {activeTab === 'cap-rate-monitor'  && <CapRateMonitor   capRateData={capRateData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run RealEstateMarket test**

Run: `npx vitest run src/__tests__/realEstate/RealEstateMarket.test.jsx`
Expected: 6/6 PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: ALL tests pass (no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/markets/realEstate/RealEstateMarket.jsx src/__tests__/realEstate/RealEstateMarket.test.jsx
git commit -m "feat(realestate): RealEstateMarket root component wiring all sub-tabs"
```

---

## Self-Review

**Spec coverage:**
- [x] Price Index multi-market trend chart → Task 3
- [x] REIT Screen sortable table → Task 4
- [x] Affordability Map with P/I bars → Task 5
- [x] Cap Rate Monitor by property type → Task 6
- [x] Mock data hook → Task 1
- [x] CSS namespaced `.re-` → Task 2
- [x] Root component with tab switching → Task 7
- [x] Full test suite run → Task 7 Step 5

**Placeholder scan:** No TBDs or incomplete sections.

**Type consistency:**
- `useRealEstateData` returns `{ priceIndexData, reitData, affordabilityData, capRateData, isLive, lastUpdated }` — named identically in every consuming component.
- `RealEstateMarket` prop names match component prop names: `priceIndexData`, `reitData`, `affordabilityData`, `capRateData`.
- `priceIndexData[market]` shape is `{ dates, values }` — consistent between mockData, hook, and PriceIndex component.
- `capRateData` destructured as `{ dates, ...types }` in CapRateMonitor — matches the mock shape exactly.
