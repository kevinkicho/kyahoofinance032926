# Bonds Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Bonds Market module with four sub-views: Yield Curve (multi-country), Credit Matrix (rating heatmap), Spread Monitor (IG/HY/EM time series), and Duration Ladder (maturity bar chart).

**Architecture:** Mock-data-first — a synchronous `useBondsData` hook returns static datasets shaped like FRED API responses. Four sub-tab components consume the hook's output. `BondsMarket.jsx` owns tab state and passes slices of data down as props, mirroring the FX Market pattern exactly.

**Tech Stack:** React 18, Vite 5, ECharts via echarts-for-react, Vitest + @testing-library/react, CSS modules (class-namespaced `.bonds-`)

---

### Task 1: Mock Data + useBondsData Hook

**Files:**
- Create: `src/markets/bonds/data/mockBondsData.js`
- Create: `src/markets/bonds/data/useBondsData.js`
- Create: `src/__tests__/bonds/useBondsData.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/bonds/useBondsData.test.js
import { describe, it, expect } from 'vitest';
import { useBondsData } from '../../markets/bonds/data/useBondsData';

describe('useBondsData', () => {
  it('returns yieldCurveData with expected countries', () => {
    const { yieldCurveData } = useBondsData();
    expect(Object.keys(yieldCurveData)).toEqual(
      expect.arrayContaining(['US', 'DE', 'JP', 'GB'])
    );
  });

  it('each country has all 7 tenor keys', () => {
    const { yieldCurveData } = useBondsData();
    const tenors = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
    for (const country of Object.keys(yieldCurveData)) {
      expect(Object.keys(yieldCurveData[country])).toEqual(tenors);
    }
  });

  it('creditRatingsData has at least 10 entries with required fields', () => {
    const { creditRatingsData } = useBondsData();
    expect(creditRatingsData.length).toBeGreaterThanOrEqual(10);
    expect(creditRatingsData[0]).toMatchObject({
      country: expect.any(String),
      name: expect.any(String),
      sp: expect.any(String),
      moodys: expect.any(String),
      fitch: expect.any(String),
      region: expect.any(String),
    });
  });

  it('spreadData has parallel arrays of equal length', () => {
    const { spreadData } = useBondsData();
    const len = spreadData.dates.length;
    expect(len).toBeGreaterThan(0);
    expect(spreadData.IG.length).toBe(len);
    expect(spreadData.HY.length).toBe(len);
    expect(spreadData.EM.length).toBe(len);
  });

  it('durationLadderData percentages sum to ~100', () => {
    const { durationLadderData } = useBondsData();
    const total = durationLadderData.reduce((s, d) => s + d.pct, 0);
    expect(total).toBeCloseTo(100, 0);
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useBondsData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/bonds/useBondsData.test.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create mock data file**

```js
// src/markets/bonds/data/mockBondsData.js

export const yieldCurveData = {
  US: { '3m': 5.25, '6m': 5.10, '1y': 4.85, '2y': 4.60, '5y': 4.35, '10y': 4.20, '30y': 4.40 },
  DE: { '3m': 3.80, '6m': 3.70, '1y': 3.50, '2y': 3.20, '5y': 2.85, '10y': 2.65, '30y': 2.90 },
  JP: { '3m': 0.08, '6m': 0.12, '1y': 0.20, '2y': 0.35, '5y': 0.52, '10y': 0.72, '30y': 1.85 },
  GB: { '3m': 5.15, '6m': 5.00, '1y': 4.75, '2y': 4.40, '5y': 4.15, '10y': 4.25, '30y': 4.70 },
  IT: { '3m': 3.90, '6m': 3.80, '1y': 3.65, '2y': 3.55, '5y': 3.70, '10y': 4.05, '30y': 4.60 },
  FR: { '3m': 3.82, '6m': 3.72, '1y': 3.52, '2y': 3.28, '5y': 3.00, '10y': 3.10, '30y': 3.55 },
  CN: { '3m': 1.75, '6m': 1.85, '1y': 1.95, '2y': 2.05, '5y': 2.25, '10y': 2.35, '30y': 2.60 },
  AU: { '3m': 4.35, '6m': 4.28, '1y': 4.15, '2y': 4.00, '5y': 3.95, '10y': 4.30, '30y': 4.75 },
};

export const creditRatingsData = [
  { country: 'AU', name: 'Australia',      sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Asia-Pacific' },
  { country: 'DE', name: 'Germany',        sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Europe'       },
  { country: 'NL', name: 'Netherlands',    sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Europe'       },
  { country: 'CA', name: 'Canada',         sp: 'AAA',  moodys: 'Aaa',  fitch: 'AA+',  region: 'Americas'     },
  { country: 'SE', name: 'Sweden',         sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Europe'       },
  { country: 'US', name: 'United States',  sp: 'AA+',  moodys: 'Aaa',  fitch: 'AA+',  region: 'Americas'     },
  { country: 'GB', name: 'United Kingdom', sp: 'AA',   moodys: 'Aa3',  fitch: 'AA-',  region: 'Europe'       },
  { country: 'FR', name: 'France',         sp: 'AA-',  moodys: 'Aa2',  fitch: 'AA-',  region: 'Europe'       },
  { country: 'JP', name: 'Japan',          sp: 'A+',   moodys: 'A1',   fitch: 'A',    region: 'Asia-Pacific' },
  { country: 'CN', name: 'China',          sp: 'A+',   moodys: 'A1',   fitch: 'A+',   region: 'Asia-Pacific' },
  { country: 'IT', name: 'Italy',          sp: 'BBB',  moodys: 'Baa3', fitch: 'BBB',  region: 'Europe'       },
  { country: 'BR', name: 'Brazil',         sp: 'BB',   moodys: 'Ba1',  fitch: 'BB',   region: 'Americas'     },
];

export const spreadData = {
  dates: ['Apr-24','May-24','Jun-24','Jul-24','Aug-24','Sep-24','Oct-24','Nov-24','Dec-24','Jan-25','Feb-25','Mar-25'],
  IG:    [112, 108, 115, 120, 118, 106, 102, 98,  105, 110, 108, 104],
  HY:    [345, 330, 360, 385, 370, 340, 325, 310, 340, 360, 355, 342],
  EM:    [410, 395, 425, 455, 440, 405, 388, 372, 395, 420, 415, 398],
};

export const durationLadderData = [
  { bucket: '0–2y',  amount: 8420, pct: 34.2 },
  { bucket: '2–5y',  amount: 5980, pct: 24.3 },
  { bucket: '5–10y', amount: 6250, pct: 25.4 },
  { bucket: '10y+',  amount: 3950, pct: 16.1 },
];
```

- [ ] **Step 4: Create the hook**

```js
// src/markets/bonds/data/useBondsData.js
import { yieldCurveData, creditRatingsData, spreadData, durationLadderData } from './mockBondsData';

export function useBondsData() {
  return {
    yieldCurveData,
    creditRatingsData,
    spreadData,
    durationLadderData,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/bonds/useBondsData.test.js`
Expected: 6/6 PASS

- [ ] **Step 6: Commit**

```bash
git add src/markets/bonds/data/mockBondsData.js src/markets/bonds/data/useBondsData.js src/__tests__/bonds/useBondsData.test.js
git commit -m "feat(bonds): mock data and useBondsData hook"
```

---

### Task 2: CSS Files (BondsComponents.css + BondsMarket.css)

**Files:**
- Create: `src/markets/bonds/components/BondsComponents.css`
- Create: `src/markets/bonds/BondsMarket.css`

No tests needed for CSS files.

- [ ] **Step 1: Create BondsComponents.css**

```css
/* src/markets/bonds/components/BondsComponents.css */
.bonds-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
.bonds-panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.bonds-panel-title    { font-size: 16px; font-weight: 600; color: #e2e8f0; }
.bonds-panel-subtitle { font-size: 11px; color: #64748b; flex: 1; }
.bonds-panel-footer   { margin-top: 12px; font-size: 10px; color: #475569; flex-shrink: 0; }
.bonds-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #475569;
  font-size: 13px;
}
.bonds-chart-wrap { flex: 1; min-height: 0; }

/* Credit Matrix table */
.credit-scroll { overflow: auto; flex: 1; }
.credit-table  { border-collapse: collapse; min-width: 100%; }
.credit-th, .credit-row-header {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 14px;
  border: 1px solid #0f172a;
  text-align: center;
  white-space: nowrap;
}
.credit-row-header { text-align: left; }
.credit-corner     { text-align: left; font-size: 10px; }
.credit-cell {
  padding: 8px 14px;
  border: 1px solid #0f172a;
  text-align: center;
  min-width: 72px;
  font-size: 12px;
  font-weight: 500;
}
.credit-region { font-size: 10px; color: #64748b; font-weight: 400; margin-left: 4px; }

/* Duration Ladder legend */
.duration-legend {
  display: flex;
  gap: 20px;
  padding: 8px 20px 4px;
  font-size: 10px;
  color: #64748b;
  flex-shrink: 0;
}
```

- [ ] **Step 2: Create BondsMarket.css**

```css
/* src/markets/bonds/BondsMarket.css */
.bonds-market {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #0a0f1a;
}

.bonds-sub-tabs {
  display: flex;
  align-items: center;
  background: #0d1117;
  border-bottom: 1px solid #1e293b;
  padding: 0 16px;
  height: 38px;
  flex-shrink: 0;
}
.bonds-sub-tab {
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
.bonds-sub-tab:hover  { color: #94a3b8; }
.bonds-sub-tab.active { color: #10b981; border-bottom-color: #10b981; }

.bonds-status-bar {
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
.bonds-status-live { color: #10b981; }

.bonds-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/markets/bonds/components/BondsComponents.css src/markets/bonds/BondsMarket.css
git commit -m "feat(bonds): CSS for bonds market layout and components"
```

---

### Task 3: YieldCurve Component

**Files:**
- Create: `src/markets/bonds/components/YieldCurve.jsx`
- Create: `src/__tests__/bonds/YieldCurve.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/bonds/YieldCurve.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import YieldCurve from '../../markets/bonds/components/YieldCurve';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const mockData = {
  US: { '3m': 5.25, '6m': 5.10, '1y': 4.85, '2y': 4.60, '5y': 4.35, '10y': 4.20, '30y': 4.40 },
  DE: { '3m': 3.80, '6m': 3.70, '1y': 3.50, '2y': 3.20, '5y': 2.85, '10y': 2.65, '30y': 2.90 },
};

describe('YieldCurve', () => {
  it('renders panel title', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByText('Yield Curve')).toBeInTheDocument();
  });

  it('renders the echarts chart', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders country count in subtitle', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByText(/2 countries/i)).toBeInTheDocument();
  });

  it('renders tenor axis labels in footer', () => {
    render(<YieldCurve yieldCurveData={mockData} />);
    expect(screen.getByText(/3m.*30y/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/bonds/YieldCurve.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement YieldCurve**

```jsx
// src/markets/bonds/components/YieldCurve.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

const TENORS = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
const COUNTRY_COLORS = {
  US: '#60a5fa', DE: '#34d399', JP: '#f472b6',
  GB: '#a78bfa', IT: '#fb923c', FR: '#facc15',
  CN: '#f87171', AU: '#4ade80',
};

export default function YieldCurve({ yieldCurveData }) {
  const option = useMemo(() => {
    const countries = Object.keys(yieldCurveData);
    return {
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: (params) =>
        params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>')
      },
      legend: {
        data: countries,
        top: 0,
        textStyle: { color: '#94a3b8', fontSize: 11 },
      },
      grid: { top: 40, right: 20, bottom: 30, left: 50 },
      xAxis: {
        type: 'category',
        data: TENORS,
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: countries.map(c => ({
        name: c,
        type: 'line',
        smooth: true,
        data: TENORS.map(t => yieldCurveData[c]?.[t] ?? null),
        itemStyle: { color: COUNTRY_COLORS[c] || '#94a3b8' },
        lineStyle: { width: 2 },
        symbol: 'circle',
        symbolSize: 5,
      })),
    };
  }, [yieldCurveData]);

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
      <div className="bonds-panel-footer">
        X-axis: 3m → 30y · Y-axis: yield % · Hover for details
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/bonds/YieldCurve.test.jsx`
Expected: 4/4 PASS

- [ ] **Step 5: Commit**

```bash
git add src/markets/bonds/components/YieldCurve.jsx src/__tests__/bonds/YieldCurve.test.jsx
git commit -m "feat(bonds): YieldCurve multi-country ECharts component"
```

---

### Task 4: CreditMatrix Component

**Files:**
- Create: `src/markets/bonds/components/CreditMatrix.jsx`
- Create: `src/__tests__/bonds/CreditMatrix.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/bonds/CreditMatrix.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CreditMatrix from '../../markets/bonds/components/CreditMatrix';

const mockData = [
  { country: 'DE', name: 'Germany',       sp: 'AAA', moodys: 'Aaa',  fitch: 'AAA', region: 'Europe'   },
  { country: 'US', name: 'United States', sp: 'AA+', moodys: 'Aaa',  fitch: 'AA+', region: 'Americas' },
  { country: 'IT', name: 'Italy',         sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', region: 'Europe'   },
];

describe('CreditMatrix', () => {
  it('renders the panel title', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    expect(screen.getByText('Credit Matrix')).toBeInTheDocument();
  });

  it('renders all three agency column headers', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    expect(screen.getByText("S&P")).toBeInTheDocument();
    expect(screen.getByText("Moody's")).toBeInTheDocument();
    expect(screen.getByText("Fitch")).toBeInTheDocument();
  });

  it('renders country names', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    expect(screen.getByText('Germany')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('Italy')).toBeInTheDocument();
  });

  it('renders rating values in cells', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    // AAA appears at least once (Germany S&P and Fitch)
    const aaaCells = screen.getAllByText('AAA');
    expect(aaaCells.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the legend', () => {
    render(<CreditMatrix creditRatingsData={mockData} />);
    expect(screen.getByText(/AAA/)).toBeInTheDocument();
    expect(screen.getByText(/BBB/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/bonds/CreditMatrix.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement CreditMatrix**

```jsx
// src/markets/bonds/components/CreditMatrix.jsx
import React from 'react';
import './BondsComponents.css';

const RATING_TIER = {
  'AAA': 0, 'Aaa': 0,
  'AA+': 1, 'AA': 1, 'AA-': 1, 'Aa1': 1, 'Aa2': 1, 'Aa3': 1,
  'A+': 2, 'A': 2, 'A-': 2, 'A1': 2, 'A2': 2, 'A3': 2,
  'BBB+': 3, 'BBB': 3, 'BBB-': 3, 'Baa1': 3, 'Baa2': 3, 'Baa3': 3,
  'BB+': 4, 'BB': 4, 'BB-': 4, 'Ba1': 4, 'Ba2': 4, 'Ba3': 4,
  'B+': 5, 'B': 5, 'B-': 5, 'B1': 5, 'B2': 5, 'B3': 5,
  'CCC': 6, 'Caa1': 6, 'Caa2': 6, 'Caa3': 6,
};

const TIER_STYLE = [
  { bg: 'rgba(16,185,129,0.40)',  color: '#6ee7b7', label: 'AAA' },
  { bg: 'rgba(34,197,94,0.28)',   color: '#86efac', label: 'AA'  },
  { bg: 'rgba(132,204,22,0.22)',  color: '#bef264', label: 'A'   },
  { bg: 'rgba(245,158,11,0.28)',  color: '#fcd34d', label: 'BBB' },
  { bg: 'rgba(249,115,22,0.28)',  color: '#fdba74', label: 'BB'  },
  { bg: 'rgba(239,68,68,0.28)',   color: '#fca5a5', label: 'B'   },
  { bg: 'rgba(239,68,68,0.50)',   color: '#fca5a5', label: 'CCC' },
];

function ratingStyle(rating) {
  const tier = RATING_TIER[rating] ?? null;
  if (tier == null) return {};
  const { bg, color } = TIER_STYLE[tier];
  return { backgroundColor: bg, color };
}

export default function CreditMatrix({ creditRatingsData }) {
  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Credit Matrix</span>
        <span className="bonds-panel-subtitle">Sovereign ratings by S&amp;P · Moody's · Fitch</span>
      </div>
      <div className="credit-scroll">
        <table className="credit-table">
          <thead>
            <tr>
              <th className="credit-th credit-corner">Country</th>
              <th className="credit-th">S&amp;P</th>
              <th className="credit-th">Moody's</th>
              <th className="credit-th">Fitch</th>
            </tr>
          </thead>
          <tbody>
            {creditRatingsData.map(row => (
              <tr key={row.country}>
                <td className="credit-row-header">
                  {row.name}
                  <span className="credit-region">({row.region})</span>
                </td>
                {['sp', 'moodys', 'fitch'].map(agency => (
                  <td key={agency} className="credit-cell" style={ratingStyle(row[agency])}>
                    {row[agency]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bonds-panel-footer">
        {TIER_STYLE.map(t => (
          <span key={t.label} style={{ color: t.color, marginRight: 12 }}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/bonds/CreditMatrix.test.jsx`
Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add src/markets/bonds/components/CreditMatrix.jsx src/__tests__/bonds/CreditMatrix.test.jsx
git commit -m "feat(bonds): CreditMatrix sovereign rating heatmap"
```

---

### Task 5: SpreadMonitor Component

**Files:**
- Create: `src/markets/bonds/components/SpreadMonitor.jsx`

No unit test needed — component is purely ECharts (same rationale as DXYTracker).

- [ ] **Step 1: Implement SpreadMonitor**

```jsx
// src/markets/bonds/components/SpreadMonitor.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

const SERIES_CONFIG = [
  { key: 'IG', label: 'Investment Grade (IG)', color: '#60a5fa' },
  { key: 'HY', label: 'High Yield (HY)',       color: '#f472b6' },
  { key: 'EM', label: 'Emerging Mkt (EM)',      color: '#fbbf24' },
];

export default function SpreadMonitor({ spreadData }) {
  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value} bps</b>`).join('<br/>'),
    },
    legend: {
      data: SERIES_CONFIG.map(s => s.label),
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { top: 40, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: 'category',
      data: spreadData.dates,
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: 'bps',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: SERIES_CONFIG.map(({ key, label, color }) => ({
      name: label,
      type: 'line',
      smooth: false,
      data: spreadData[key],
      itemStyle: { color },
      lineStyle: { width: 2 },
      areaStyle: { color, opacity: 0.06 },
      symbol: 'none',
    })),
  }), [spreadData]);

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Spread Monitor</span>
        <span className="bonds-panel-subtitle">Credit spreads over US Treasuries · basis points (bps)</span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="bonds-panel-footer">
        IG = investment-grade corporate · HY = high-yield · EM = emerging market sovereign
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/bonds/components/SpreadMonitor.jsx
git commit -m "feat(bonds): SpreadMonitor IG/HY/EM time-series chart"
```

---

### Task 6: DurationLadder Component

**Files:**
- Create: `src/markets/bonds/components/DurationLadder.jsx`

No unit test needed — component is purely ECharts.

- [ ] **Step 1: Implement DurationLadder**

```jsx
// src/markets/bonds/components/DurationLadder.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

export default function DurationLadder({ durationLadderData }) {
  const option = useMemo(() => {
    const buckets  = durationLadderData.map(d => d.bucket);
    const amounts  = durationLadderData.map(d => d.amount);
    const pcts     = durationLadderData.map(d => d.pct);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const i = params[0].dataIndex;
          return `<b>${buckets[i]}</b><br/>` +
            `Amount: <b>$${amounts[i].toLocaleString()}M</b><br/>` +
            `Weight: <b>${pcts[i]}%</b>`;
        },
      },
      grid: { top: 20, right: 80, bottom: 30, left: 80 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '${value}M' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        data: buckets,
        inverse: true,
        axisLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 500 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [{
        type: 'bar',
        data: amounts,
        itemStyle: {
          color: (params) => {
            const colors = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 11,
          formatter: (params) => `${pcts[params.dataIndex]}%`,
        },
      }],
    };
  }, [durationLadderData]);

  const totalAmount = durationLadderData.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Duration Ladder</span>
        <span className="bonds-panel-subtitle">
          Portfolio allocation by maturity bucket · Total: ${totalAmount.toLocaleString()}M
        </span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="bonds-panel-footer">
        Maturity buckets: 0–2y (short), 2–5y (medium), 5–10y (long), 10y+ (ultra-long)
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/bonds/components/DurationLadder.jsx
git commit -m "feat(bonds): DurationLadder maturity allocation bar chart"
```

---

### Task 7: BondsMarket Root Component + Full Test Run

**Files:**
- Modify: `src/markets/bonds/BondsMarket.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/bonds/BondsMarket.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BondsMarket from '../../markets/bonds/BondsMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('BondsMarket', () => {
  it('renders the Yield Curve tab by default', () => {
    render(<BondsMarket />);
    expect(screen.getByText('Yield Curve')).toBeInTheDocument();
  });

  it('renders all 4 sub-tabs', () => {
    render(<BondsMarket />);
    expect(screen.getByRole('button', { name: 'Yield Curve'   })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Credit Matrix' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spread Monitor'})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duration Ladder'})).toBeInTheDocument();
  });

  it('switches to Credit Matrix on tab click', () => {
    render(<BondsMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Credit Matrix' }));
    expect(screen.getByText(/sovereign ratings/i)).toBeInTheDocument();
  });

  it('switches to Spread Monitor on tab click', () => {
    render(<BondsMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Spread Monitor' }));
    expect(screen.getByText(/credit spreads/i)).toBeInTheDocument();
  });

  it('switches to Duration Ladder on tab click', () => {
    render(<BondsMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Duration Ladder' }));
    expect(screen.getByText(/maturity bucket/i)).toBeInTheDocument();
  });

  it('shows mock data status (not live)', () => {
    render(<BondsMarket />);
    expect(screen.getByText(/mock data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/bonds/BondsMarket.test.jsx`
Expected: FAIL (BondsMarket is a stub)

- [ ] **Step 3: Implement BondsMarket.jsx**

```jsx
// src/markets/bonds/BondsMarket.jsx
import React, { useState } from 'react';
import { useBondsData } from './data/useBondsData';
import YieldCurve     from './components/YieldCurve';
import CreditMatrix   from './components/CreditMatrix';
import SpreadMonitor  from './components/SpreadMonitor';
import DurationLadder from './components/DurationLadder';
import './BondsMarket.css';

const SUB_TABS = [
  { id: 'yield-curve',      label: 'Yield Curve'    },
  { id: 'credit-matrix',    label: 'Credit Matrix'  },
  { id: 'spread-monitor',   label: 'Spread Monitor' },
  { id: 'duration-ladder',  label: 'Duration Ladder'},
];

export default function BondsMarket() {
  const [activeTab, setActiveTab] = useState('yield-curve');
  const { yieldCurveData, creditRatingsData, spreadData, durationLadderData, isLive, lastUpdated } = useBondsData();

  return (
    <div className="bonds-market">
      <div className="bonds-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`bonds-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bonds-status-bar">
        <span className={isLive ? 'bonds-status-live' : ''}>
          {isLive ? '● Live (FRED)' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="bonds-content">
        {activeTab === 'yield-curve'     && <YieldCurve     yieldCurveData={yieldCurveData} />}
        {activeTab === 'credit-matrix'   && <CreditMatrix   creditRatingsData={creditRatingsData} />}
        {activeTab === 'spread-monitor'  && <SpreadMonitor  spreadData={spreadData} />}
        {activeTab === 'duration-ladder' && <DurationLadder durationLadderData={durationLadderData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run BondsMarket test**

Run: `npx vitest run src/__tests__/bonds/BondsMarket.test.jsx`
Expected: 6/6 PASS

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: all tests PASS (no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/markets/bonds/BondsMarket.jsx src/__tests__/bonds/BondsMarket.test.jsx
git commit -m "feat(bonds): BondsMarket root component wiring all sub-tabs"
```

---

## Self-Review

**Spec coverage:**
- [x] Yield Curve multi-country chart → Task 3
- [x] Credit Matrix rating heatmap → Task 4
- [x] Spread Monitor IG/HY/EM time series → Task 5
- [x] Duration Ladder maturity bar chart → Task 6
- [x] Mock data hook → Task 1
- [x] CSS namespacing (`.bonds-`) → Task 2
- [x] Root component with tab switching → Task 7
- [x] Full test suite run → Task 7 Step 5

**Placeholder scan:** No TBDs or incomplete sections.

**Type consistency:**
- `useBondsData` returns `{ yieldCurveData, creditRatingsData, spreadData, durationLadderData, isLive, lastUpdated }` — all named identically in every task that consumes them.
- `YieldCurve` accepts `{ yieldCurveData }`, `CreditMatrix` accepts `{ creditRatingsData }`, `SpreadMonitor` accepts `{ spreadData }`, `DurationLadder` accepts `{ durationLadderData }` — consistent with BondsMarket.jsx prop names.
