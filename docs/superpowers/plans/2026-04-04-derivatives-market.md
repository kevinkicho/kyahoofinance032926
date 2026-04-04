# Derivatives Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Derivatives Market module with four sub-views: Vol Surface (implied volatility heatmap), VIX Term Structure (futures curve), Options Flow (unusual activity table), and Fear & Greed (composite sentiment gauge with 7 sub-indicators).

**Architecture:** Mock-data-first — a synchronous `useDerivativesData` hook returns static datasets. Four sub-tab components consume it. `DerivativesMarket.jsx` owns tab state and passes slices down as props, mirroring the Real Estate pattern exactly.

**Tech Stack:** React 18, Vite 5, ECharts via echarts-for-react, Vitest + @testing-library/react, CSS class-namespaced `.deriv-`

---

### Task 1: Mock Data + useDerivativesData Hook

**Files:**
- Create: `src/markets/derivatives/data/mockDerivativesData.js`
- Create: `src/markets/derivatives/data/useDerivativesData.js`
- Create: `src/__tests__/derivatives/useDerivativesData.test.js`

- [ ] **Step 1: Write the failing test**

```js
// src/__tests__/derivatives/useDerivativesData.test.js
import { describe, it, expect } from 'vitest';
import { useDerivativesData } from '../../markets/derivatives/data/useDerivativesData';

describe('useDerivativesData', () => {
  it('returns volSurfaceData with strikes and expiries arrays', () => {
    const { volSurfaceData } = useDerivativesData();
    expect(Array.isArray(volSurfaceData.strikes)).toBe(true);
    expect(Array.isArray(volSurfaceData.expiries)).toBe(true);
    expect(volSurfaceData.strikes.length).toBeGreaterThan(0);
  });

  it('volSurfaceData grid has rows matching expiries count', () => {
    const { volSurfaceData } = useDerivativesData();
    expect(volSurfaceData.grid.length).toBe(volSurfaceData.expiries.length);
    volSurfaceData.grid.forEach(row => {
      expect(row.length).toBe(volSurfaceData.strikes.length);
    });
  });

  it('vixTermStructure has dates and values arrays of equal length', () => {
    const { vixTermStructure } = useDerivativesData();
    expect(vixTermStructure.dates.length).toBeGreaterThan(0);
    expect(vixTermStructure.values.length).toBe(vixTermStructure.dates.length);
  });

  it('optionsFlow has at least 8 entries with required fields', () => {
    const { optionsFlow } = useDerivativesData();
    expect(optionsFlow.length).toBeGreaterThanOrEqual(8);
    expect(optionsFlow[0]).toMatchObject({
      ticker: expect.any(String),
      strike: expect.any(Number),
      expiry: expect.any(String),
      type: expect.stringMatching(/^(C|P)$/),
      volume: expect.any(Number),
      openInterest: expect.any(Number),
      premium: expect.any(Number),
      sentiment: expect.stringMatching(/^(bullish|bearish|neutral)$/),
    });
  });

  it('fearGreedData has score 0-100 and 7 indicators', () => {
    const { fearGreedData } = useDerivativesData();
    expect(fearGreedData.score).toBeGreaterThanOrEqual(0);
    expect(fearGreedData.score).toBeLessThanOrEqual(100);
    expect(fearGreedData.indicators.length).toBe(7);
    fearGreedData.indicators.forEach(ind => {
      expect(ind).toMatchObject({
        name: expect.any(String),
        value: expect.any(Number),
        score: expect.any(Number),
        label: expect.any(String),
      });
    });
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useDerivativesData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/derivatives/useDerivativesData.test.js`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Create mock data file**

```js
// src/markets/derivatives/data/mockDerivativesData.js

// SPX implied volatility surface
// strikes = moneyness % of spot (80 = 20% OTM put, 100 = ATM, 120 = 20% OTM call)
export const volSurfaceData = {
  strikes: [80, 85, 90, 95, 100, 105, 110, 115, 120],
  expiries: ['1W', '2W', '1M', '2M', '3M', '6M', '1Y', '2Y'],
  // grid[expiry_index][strike_index] = implied vol %
  grid: [
    [38.2, 32.1, 26.5, 21.8, 18.2, 19.5, 22.1, 25.8, 29.4], // 1W
    [35.8, 30.2, 25.1, 20.9, 17.8, 18.9, 21.4, 24.7, 28.1], // 2W
    [32.4, 27.8, 23.2, 19.5, 16.9, 17.8, 20.2, 23.1, 26.5], // 1M
    [30.1, 26.2, 22.1, 18.8, 16.2, 17.1, 19.4, 22.2, 25.3], // 2M
    [28.5, 25.0, 21.2, 18.1, 15.8, 16.5, 18.8, 21.5, 24.2], // 3M
    [26.2, 23.4, 20.1, 17.4, 15.2, 15.9, 17.8, 20.4, 22.8], // 6M
    [24.8, 22.2, 19.4, 17.0, 15.0, 15.6, 17.2, 19.6, 21.8], // 1Y
    [23.5, 21.2, 18.8, 16.6, 14.8, 15.4, 16.8, 19.0, 21.0], // 2Y
  ],
};

// VIX futures term structure
export const vixTermStructure = {
  dates:  ['Spot', 'Apr-25', 'May-25', 'Jun-25', 'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25'],
  values: [18.4, 19.2, 20.1, 21.0, 21.8, 22.3, 22.9, 23.4, 23.8, 24.2],
  // previousClose for comparison
  prevValues: [16.2, 17.1, 18.2, 19.3, 20.2, 20.8, 21.5, 22.1, 22.6, 23.1],
};

// Unusual options activity
export const optionsFlow = [
  { ticker: 'SPY',  strike: 520,  expiry: '16 May 25', type: 'P', volume: 45200, openInterest: 12400, premium: 8.20,  sentiment: 'bearish' },
  { ticker: 'NVDA', strike: 950,  expiry: '20 Jun 25', type: 'C', volume: 38900, openInterest:  8200, premium: 24.50, sentiment: 'bullish' },
  { ticker: 'QQQ',  strike: 440,  expiry: '16 May 25', type: 'P', volume: 32100, openInterest: 15600, premium: 6.80,  sentiment: 'bearish' },
  { ticker: 'AAPL', strike: 200,  expiry: '18 Apr 25', type: 'C', volume: 28400, openInterest:  6100, premium: 3.40,  sentiment: 'bullish' },
  { ticker: 'TSLA', strike: 250,  expiry: '16 May 25', type: 'C', volume: 25800, openInterest:  9800, premium: 12.60, sentiment: 'bullish' },
  { ticker: 'SPY',  strike: 500,  expiry: '20 Jun 25', type: 'P', volume: 22400, openInterest: 18900, premium: 15.30, sentiment: 'bearish' },
  { ticker: 'IWM',  strike: 195,  expiry: '16 May 25', type: 'P', volume: 19600, openInterest:  7200, premium: 4.10,  sentiment: 'bearish' },
  { ticker: 'META', strike: 580,  expiry: '20 Jun 25', type: 'C', volume: 17200, openInterest:  4800, premium: 18.90, sentiment: 'bullish' },
  { ticker: 'GLD',  strike: 185,  expiry: '18 Apr 25', type: 'C', volume: 15800, openInterest:  3200, premium: 2.80,  sentiment: 'bullish' },
  { ticker: 'XLE',  strike: 85,   expiry: '16 May 25', type: 'P', volume: 14200, openInterest:  5600, premium: 1.95,  sentiment: 'bearish' },
  { ticker: 'AMZN', strike: 200,  expiry: '20 Jun 25', type: 'C', volume: 13900, openInterest:  4100, premium: 8.70,  sentiment: 'bullish' },
  { ticker: 'TLT',  strike: 90,   expiry: '16 May 25', type: 'C', volume: 12400, openInterest:  6800, premium: 2.20,  sentiment: 'neutral' },
];

// Fear & Greed composite (0 = extreme fear, 100 = extreme greed)
export const fearGreedData = {
  score: 38,
  label: 'Fear',
  indicators: [
    { name: 'VIX Level',          value: 18.4, score: 35, label: 'Fear'         },
    { name: 'Put/Call Ratio',      value:  1.18, score: 28, label: 'Fear'         },
    { name: 'Market Momentum',     value: -2.4, score: 32, label: 'Fear'         },
    { name: 'Safe Haven Demand',   value:  3.8, score: 25, label: 'Extreme Fear' },
    { name: 'Junk Bond Demand',    value:  1.2, score: 52, label: 'Neutral'      },
    { name: 'Market Breadth',      value: 42.1, score: 41, label: 'Fear'         },
    { name: 'Stock Price Strength',value: 18.0, score: 55, label: 'Neutral'      },
  ],
};
```

- [ ] **Step 4: Create the hook**

```js
// src/markets/derivatives/data/useDerivativesData.js
import { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData } from './mockDerivativesData';

export function useDerivativesData() {
  return {
    volSurfaceData,
    vixTermStructure,
    optionsFlow,
    fearGreedData,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/__tests__/derivatives/useDerivativesData.test.js`
Expected: 6/6 PASS

- [ ] **Step 6: Commit**

```bash
git add src/markets/derivatives/data/mockDerivativesData.js src/markets/derivatives/data/useDerivativesData.js src/__tests__/derivatives/useDerivativesData.test.js
git commit -m "feat(derivatives): mock data and useDerivativesData hook"
```

---

### Task 2: CSS Files

**Files:**
- Create: `src/markets/derivatives/components/DerivComponents.css`
- Create: `src/markets/derivatives/DerivativesMarket.css`

No tests needed for CSS.

- [ ] **Step 1: Create DerivComponents.css**

```css
/* src/markets/derivatives/components/DerivComponents.css */
.deriv-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
.deriv-panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.deriv-panel-title    { font-size: 16px; font-weight: 600; color: #e2e8f0; }
.deriv-panel-subtitle { font-size: 11px; color: #64748b; flex: 1; }
.deriv-panel-footer   { margin-top: 12px; font-size: 10px; color: #475569; flex-shrink: 0; }
.deriv-chart-wrap     { flex: 1; min-height: 0; }

/* Options Flow table */
.flow-scroll { overflow: auto; flex: 1; }
.flow-table  { border-collapse: collapse; min-width: 100%; }
.flow-th {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  white-space: nowrap;
}
.flow-th:first-child,
.flow-th:nth-child(2),
.flow-th:nth-child(3) { text-align: left; }
.flow-row:hover { background: #1e293b; }
.flow-cell {
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}
.flow-cell:first-child { text-align: left; font-weight: 600; color: #e2e8f0; }
.flow-cell:nth-child(2) { text-align: right; }
.flow-call   { color: #22c55e; font-weight: 600; }
.flow-put    { color: #ef4444; font-weight: 600; }
.flow-bullish { color: #22c55e; }
.flow-bearish { color: #ef4444; }
.flow-neutral { color: #94a3b8; }

/* Fear & Greed */
.fg-layout {
  display: flex;
  flex: 1;
  gap: 24px;
  min-height: 0;
  overflow: hidden;
}
.fg-gauge-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 260px;
  flex-shrink: 0;
}
.fg-score {
  font-size: 64px;
  font-weight: 700;
  line-height: 1;
  margin-bottom: 4px;
}
.fg-label {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
}
.fg-indicators {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fg-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #1e293b;
  border-radius: 6px;
}
.fg-row-name  { font-size: 12px; color: #94a3b8; min-width: 160px; }
.fg-row-bar-wrap {
  flex: 1;
  height: 6px;
  background: #0f172a;
  border-radius: 3px;
  overflow: hidden;
}
.fg-row-bar   { height: 100%; border-radius: 3px; transition: width 0.4s; }
.fg-row-score { font-size: 12px; font-weight: 500; min-width: 32px; text-align: right; color: #e2e8f0; }
.fg-row-label { font-size: 10px; min-width: 88px; text-align: right; }
```

- [ ] **Step 2: Create DerivativesMarket.css**

```css
/* src/markets/derivatives/DerivativesMarket.css */
.deriv-market {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #0a0f1a;
}

.deriv-sub-tabs {
  display: flex;
  align-items: center;
  background: #0d1117;
  border-bottom: 1px solid #1e293b;
  padding: 0 16px;
  height: 38px;
  flex-shrink: 0;
}
.deriv-sub-tab {
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
.deriv-sub-tab:hover  { color: #94a3b8; }
.deriv-sub-tab.active { color: #a78bfa; border-bottom-color: #a78bfa; }

.deriv-status-bar {
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
.deriv-status-live { color: #a78bfa; }

.deriv-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/markets/derivatives/components/DerivComponents.css src/markets/derivatives/DerivativesMarket.css
git commit -m "feat(derivatives): CSS for derivatives market layout and components"
```

---

### Task 3: VolSurface Component

**Files:**
- Create: `src/markets/derivatives/components/VolSurface.jsx`

No unit test needed — pure ECharts heatmap component.

- [ ] **Step 1: Implement VolSurface**

```jsx
// src/markets/derivatives/components/VolSurface.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

export default function VolSurface({ volSurfaceData }) {
  const { strikes, expiries, grid } = volSurfaceData;

  const option = useMemo(() => {
    // Build flat [strike_idx, expiry_idx, vol] array for heatmap
    const data = [];
    expiries.forEach((_, ei) => {
      strikes.forEach((_, si) => {
        data.push([si, ei, grid[ei][si]]);
      });
    });

    const allVols = grid.flat();
    const minVol  = Math.min(...allVols);
    const maxVol  = Math.max(...allVols);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params) => {
          const [si, ei, vol] = params.data;
          return `<b>${expiries[ei]} / ${strikes[si]}%</b><br/>IV: <b>${vol.toFixed(1)}%</b>`;
        },
      },
      grid: { top: 60, right: 100, bottom: 40, left: 60 },
      xAxis: {
        type: 'category',
        data: strikes.map(s => `${s}%`),
        name: 'Strike (% of spot)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: expiries,
        name: 'Expiry',
        nameLocation: 'middle',
        nameGap: 42,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      visualMap: {
        min: minVol,
        max: maxVol,
        calculable: true,
        orient: 'vertical',
        right: 10,
        top: 60,
        textStyle: { color: '#64748b', fontSize: 10 },
        inRange: {
          color: ['#1e3a5f', '#2563eb', '#7c3aed', '#db2777', '#ef4444'],
        },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: true, fontSize: 9, color: '#e2e8f0', formatter: p => p.data[2].toFixed(1) },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    };
  }, [volSurfaceData]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Vol Surface</span>
        <span className="deriv-panel-subtitle">SPX implied volatility · strike % of spot × expiry</span>
      </div>
      <div className="deriv-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="deriv-panel-footer">
        IV % · Volatility smile: OTM puts carry higher IV than ATM (skew) · Darker = lower vol
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/derivatives/components/VolSurface.jsx
git commit -m "feat(derivatives): VolSurface SPX implied volatility heatmap"
```

---

### Task 4: VIXTermStructure Component

**Files:**
- Create: `src/markets/derivatives/components/VIXTermStructure.jsx`

No unit test needed — pure ECharts chart component.

- [ ] **Step 1: Implement VIXTermStructure**

```jsx
// src/markets/derivatives/components/VIXTermStructure.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

export default function VIXTermStructure({ vixTermStructure }) {
  const { dates, values, prevValues } = vixTermStructure;

  const isContango  = values[values.length - 1] > values[0];
  const structureLabel = isContango ? 'Contango (normal — market calm)' : 'Backwardation (elevated near-term fear)';

  const option = useMemo(() => ({
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value?.toFixed(2)}</b>`).join('<br/>'),
    },
    legend: {
      data: ['Current', 'Previous Close'],
      top: 0,
      textStyle: { color: '#94a3b8', fontSize: 11 },
    },
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: 'VIX',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLabel: { color: '#64748b', fontSize: 11 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Current',
        type: 'line',
        data: values,
        itemStyle: { color: '#a78bfa' },
        lineStyle: { width: 2.5 },
        symbol: 'circle',
        symbolSize: 6,
        areaStyle: { color: '#a78bfa', opacity: 0.08 },
      },
      {
        name: 'Previous Close',
        type: 'line',
        data: prevValues,
        itemStyle: { color: '#475569' },
        lineStyle: { width: 1.5, type: 'dashed' },
        symbol: 'none',
      },
    ],
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
      <div className="deriv-panel-footer">
        Spot VIX + 9 futures expirations · Dashed = previous close · Contango = upward slope
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/derivatives/components/VIXTermStructure.jsx
git commit -m "feat(derivatives): VIXTermStructure futures curve with contango/backwardation label"
```

---

### Task 5: OptionsFlow Component

**Files:**
- Create: `src/markets/derivatives/components/OptionsFlow.jsx`
- Create: `src/__tests__/derivatives/OptionsFlow.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/derivatives/OptionsFlow.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OptionsFlow from '../../markets/derivatives/components/OptionsFlow';

const mockData = [
  { ticker: 'SPY',  strike: 520, expiry: '16 May 25', type: 'P', volume: 45200, openInterest: 12400, premium: 8.20,  sentiment: 'bearish' },
  { ticker: 'NVDA', strike: 950, expiry: '20 Jun 25', type: 'C', volume: 38900, openInterest:  8200, premium: 24.50, sentiment: 'bullish' },
  { ticker: 'TLT',  strike: 90,  expiry: '16 May 25', type: 'C', volume: 12400, openInterest:  6800, premium: 2.20,  sentiment: 'neutral' },
];

describe('OptionsFlow', () => {
  it('renders the panel title', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Options Flow')).toBeInTheDocument();
  });

  it('renders all ticker symbols', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('SPY')).toBeInTheDocument();
    expect(screen.getByText('NVDA')).toBeInTheDocument();
    expect(screen.getByText('TLT')).toBeInTheDocument();
  });

  it('renders C/P type with appropriate class', () => {
    const { container } = render(<OptionsFlow optionsFlow={mockData} />);
    expect(container.querySelectorAll('.flow-put').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.flow-call').length).toBeGreaterThan(0);
  });

  it('renders sentiment labels with correct class', () => {
    const { container } = render(<OptionsFlow optionsFlow={mockData} />);
    expect(container.querySelectorAll('.flow-bullish').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.flow-bearish').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.flow-neutral').length).toBeGreaterThan(0);
  });

  it('renders column headers', () => {
    render(<OptionsFlow optionsFlow={mockData} />);
    expect(screen.getByText('Volume')).toBeInTheDocument();
    expect(screen.getByText('OI')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/derivatives/OptionsFlow.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement OptionsFlow**

```jsx
// src/markets/derivatives/components/OptionsFlow.jsx
import React from 'react';
import './DerivComponents.css';

function fmtVolume(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  return String(v);
}

export default function OptionsFlow({ optionsFlow }) {
  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Options Flow</span>
        <span className="deriv-panel-subtitle">Unusual options activity · sorted by volume</span>
      </div>
      <div className="flow-scroll">
        <table className="flow-table">
          <thead>
            <tr>
              <th className="flow-th">Ticker</th>
              <th className="flow-th">Strike</th>
              <th className="flow-th">Expiry</th>
              <th className="flow-th">C/P</th>
              <th className="flow-th">Volume</th>
              <th className="flow-th">OI</th>
              <th className="flow-th">Vol/OI</th>
              <th className="flow-th">Premium</th>
              <th className="flow-th">Sentiment</th>
            </tr>
          </thead>
          <tbody>
            {optionsFlow.map((row, i) => {
              const volOI = row.openInterest > 0
                ? (row.volume / row.openInterest).toFixed(2)
                : '—';
              return (
                <tr key={i} className="flow-row">
                  <td className="flow-cell">{row.ticker}</td>
                  <td className="flow-cell">${row.strike}</td>
                  <td className="flow-cell">{row.expiry}</td>
                  <td className={`flow-cell ${row.type === 'C' ? 'flow-call' : 'flow-put'}`}>
                    {row.type}
                  </td>
                  <td className="flow-cell">{fmtVolume(row.volume)}</td>
                  <td className="flow-cell">{fmtVolume(row.openInterest)}</td>
                  <td className="flow-cell">{volOI}</td>
                  <td className="flow-cell">${row.premium.toFixed(2)}</td>
                  <td className={`flow-cell flow-${row.sentiment}`}>{row.sentiment}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="deriv-panel-footer">
        Vol/OI &gt; 1 = volume exceeds open interest (unusual activity) · C = call · P = put
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/derivatives/OptionsFlow.test.jsx`
Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add src/markets/derivatives/components/OptionsFlow.jsx src/__tests__/derivatives/OptionsFlow.test.jsx
git commit -m "feat(derivatives): OptionsFlow unusual activity table"
```

---

### Task 6: FearGreed Component

**Files:**
- Create: `src/markets/derivatives/components/FearGreed.jsx`
- Create: `src/__tests__/derivatives/FearGreed.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/derivatives/FearGreed.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FearGreed from '../../markets/derivatives/components/FearGreed';

const mockData = {
  score: 38,
  label: 'Fear',
  indicators: [
    { name: 'VIX Level',        value: 18.4, score: 35, label: 'Fear'    },
    { name: 'Put/Call Ratio',   value:  1.18, score: 28, label: 'Fear'    },
    { name: 'Market Momentum',  value: -2.4, score: 32, label: 'Fear'    },
    { name: 'Safe Haven Demand',value:  3.8, score: 25, label: 'Extreme Fear' },
    { name: 'Junk Bond Demand', value:  1.2, score: 52, label: 'Neutral' },
    { name: 'Market Breadth',   value: 42.1, score: 41, label: 'Fear'    },
    { name: 'Stock Price Str.', value: 18.0, score: 55, label: 'Neutral' },
  ],
};

describe('FearGreed', () => {
  it('renders the panel title', () => {
    render(<FearGreed fearGreedData={mockData} />);
    expect(screen.getByText('Fear & Greed')).toBeInTheDocument();
  });

  it('renders the composite score', () => {
    render(<FearGreed fearGreedData={mockData} />);
    expect(screen.getByText('38')).toBeInTheDocument();
  });

  it('renders the composite label', () => {
    render(<FearGreed fearGreedData={mockData} />);
    // 'Fear' appears in both composite label and indicator labels
    expect(screen.getAllByText('Fear').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 7 indicator names', () => {
    render(<FearGreed fearGreedData={mockData} />);
    expect(screen.getByText('VIX Level')).toBeInTheDocument();
    expect(screen.getByText('Put/Call Ratio')).toBeInTheDocument();
    expect(screen.getByText('Junk Bond Demand')).toBeInTheDocument();
  });

  it('renders 7 indicator bars', () => {
    const { container } = render(<FearGreed fearGreedData={mockData} />);
    expect(container.querySelectorAll('.fg-row-bar').length).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/derivatives/FearGreed.test.jsx`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement FearGreed**

```jsx
// src/markets/derivatives/components/FearGreed.jsx
import React from 'react';
import './DerivComponents.css';

function scoreColor(score) {
  if (score <= 25) return '#ef4444';
  if (score <= 45) return '#f97316';
  if (score <= 55) return '#facc15';
  if (score <= 75) return '#84cc16';
  return '#22c55e';
}

function scoreLabelColor(label) {
  const l = label.toLowerCase();
  if (l.includes('extreme fear')) return '#ef4444';
  if (l.includes('fear'))         return '#f97316';
  if (l.includes('neutral'))      return '#facc15';
  if (l.includes('greed'))        return '#84cc16';
  if (l.includes('extreme greed'))return '#22c55e';
  return '#94a3b8';
}

export default function FearGreed({ fearGreedData }) {
  const { score, label, indicators } = fearGreedData;
  const mainColor = scoreColor(score);

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
      <div className="deriv-panel-footer">
        0–25 Extreme Fear · 26–45 Fear · 46–55 Neutral · 56–75 Greed · 76–100 Extreme Greed
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/derivatives/FearGreed.test.jsx`
Expected: 5/5 PASS

- [ ] **Step 5: Commit**

```bash
git add src/markets/derivatives/components/FearGreed.jsx src/__tests__/derivatives/FearGreed.test.jsx
git commit -m "feat(derivatives): FearGreed composite sentiment gauge with 7 indicators"
```

---

### Task 7: DerivativesMarket Root Component + Full Test Run

**Files:**
- Modify: `src/markets/derivatives/DerivativesMarket.jsx`
- Create: `src/__tests__/derivatives/DerivativesMarket.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// src/__tests__/derivatives/DerivativesMarket.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DerivativesMarket from '../../markets/derivatives/DerivativesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('DerivativesMarket', () => {
  it('renders Vol Surface tab by default', () => {
    render(<DerivativesMarket />);
    expect(screen.getAllByText('Vol Surface').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', () => {
    render(<DerivativesMarket />);
    expect(screen.getByRole('button', { name: 'Vol Surface'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VIX Term Structure'})).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options Flow'      })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fear & Greed'      })).toBeInTheDocument();
  });

  it('switches to VIX Term Structure on click', () => {
    render(<DerivativesMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'VIX Term Structure' }));
    expect(screen.getByText(/futures curve|contango|backwardation/i)).toBeInTheDocument();
  });

  it('switches to Options Flow on click', () => {
    render(<DerivativesMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Options Flow' }));
    expect(screen.getByText(/unusual options activity/i)).toBeInTheDocument();
  });

  it('switches to Fear & Greed on click', () => {
    render(<DerivativesMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Fear & Greed' }));
    expect(screen.getByText(/composite sentiment/i)).toBeInTheDocument();
  });

  it('shows mock data status', () => {
    render(<DerivativesMarket />);
    expect(screen.getByText(/mock data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/derivatives/DerivativesMarket.test.jsx`
Expected: FAIL (stub renders placeholder)

- [ ] **Step 3: Replace DerivativesMarket.jsx**

```jsx
// src/markets/derivatives/DerivativesMarket.jsx
import React, { useState } from 'react';
import { useDerivativesData } from './data/useDerivativesData';
import VolSurface        from './components/VolSurface';
import VIXTermStructure  from './components/VIXTermStructure';
import OptionsFlow       from './components/OptionsFlow';
import FearGreed         from './components/FearGreed';
import './DerivativesMarket.css';

const SUB_TABS = [
  { id: 'vol-surface',        label: 'Vol Surface'        },
  { id: 'vix-term-structure', label: 'VIX Term Structure' },
  { id: 'options-flow',       label: 'Options Flow'       },
  { id: 'fear-greed',         label: 'Fear & Greed'       },
];

export default function DerivativesMarket() {
  const [activeTab, setActiveTab] = useState('vol-surface');
  const { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, isLive, lastUpdated } = useDerivativesData();

  return (
    <div className="deriv-market">
      <div className="deriv-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`deriv-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="deriv-status-bar">
        <span className={isLive ? 'deriv-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="deriv-content">
        {activeTab === 'vol-surface'        && <VolSurface       volSurfaceData={volSurfaceData} />}
        {activeTab === 'vix-term-structure' && <VIXTermStructure vixTermStructure={vixTermStructure} />}
        {activeTab === 'options-flow'       && <OptionsFlow      optionsFlow={optionsFlow} />}
        {activeTab === 'fear-greed'         && <FearGreed        fearGreedData={fearGreedData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run DerivativesMarket test**

Run: `npx vitest run src/__tests__/derivatives/DerivativesMarket.test.jsx`
Expected: 6/6 PASS

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: ALL tests pass (no regressions)

- [ ] **Step 6: Commit**

```bash
git add src/markets/derivatives/DerivativesMarket.jsx src/__tests__/derivatives/DerivativesMarket.test.jsx
git commit -m "feat(derivatives): DerivativesMarket root component wiring all sub-tabs"
```

---

## Self-Review

**Spec coverage:**
- [x] Vol Surface SPX heatmap → Task 3
- [x] VIX Term Structure with contango/backwardation → Task 4
- [x] Options Flow unusual activity table → Task 5
- [x] Fear & Greed gauge with 7 indicators → Task 6
- [x] Mock data hook → Task 1
- [x] CSS namespaced `.deriv-` → Task 2
- [x] Root component with tab switching → Task 7
- [x] Full test suite run → Task 7 Step 5

**Placeholder scan:** No TBDs or incomplete sections.

**Type consistency:**
- `useDerivativesData` returns `{ volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, isLive, lastUpdated }` — named identically in every component that consumes them.
- `volSurfaceData` shape `{ strikes, expiries, grid }` used consistently in mockData and VolSurface.
- `vixTermStructure` shape `{ dates, values, prevValues }` used consistently in mockData and VIXTermStructure.
- `fearGreedData` shape `{ score, label, indicators[] }` with each indicator `{ name, value, score, label }` — consistent across mockData, hook, test, and FearGreed component.
- `optionsFlow` field `type` matches `/^(C|P)$/` — tests validate this, component uses it for CSS class.
