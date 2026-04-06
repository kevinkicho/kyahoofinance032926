# Insurance Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sub-project 6 — Insurance Market with four sub-views: Cat Bond Spreads, Combined Ratio Monitor, Reserve Adequacy, and Reinsurance Pricing.

**Architecture:** Replaces the existing stub at `src/markets/insurance/InsuranceMarket.jsx`. Follows the exact same pattern as Derivatives, Bonds, and Real Estate markets: root component owns tab state, a synchronous mock-data hook returns static datasets, and each sub-view is a focused component file. Accent color: Sky Blue `#0ea5e9`.

**Tech Stack:** React 18, Vite 5, ECharts via `echarts-for-react`, Vitest + @testing-library/react

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `src/markets/insurance/InsuranceMarket.jsx` | Root component — tab state, hook call, sub-view routing |
| Create | `src/markets/insurance/InsuranceMarket.css` | Sub-tab nav + status bar + layout (`.ins-` namespace) |
| Create | `src/markets/insurance/data/mockInsuranceData.js` | All static mock datasets |
| Create | `src/markets/insurance/data/useInsuranceData.js` | Synchronous hook, re-exports mock data + metadata |
| Create | `src/markets/insurance/components/CatBondSpreads.jsx` | Cat bond spread table |
| Create | `src/markets/insurance/components/CombinedRatioMonitor.jsx` | Combined ratio line chart (ECharts) |
| Create | `src/markets/insurance/components/ReserveAdequacy.jsx` | Reserve adequacy bar chart (ECharts) |
| Create | `src/markets/insurance/components/ReinsurancePricing.jsx` | Reinsurance pricing table |
| Create | `src/markets/insurance/components/InsComponents.css` | Shared panel/table/chart styles (`.ins-` namespace) |
| Create | `src/__tests__/insurance/InsuranceMarket.test.jsx` | Smoke tests: tab render, tab switching, mock data status |
| Create | `src/__tests__/insurance/CatBondSpreads.test.jsx` | Table content + CSS class assertions |
| Create | `src/__tests__/insurance/ReinsurancePricing.test.jsx` | Table content + CSS class assertions |
| Create | `src/__tests__/insurance/useInsuranceData.test.js` | Data shape / contract tests |

> **ECharts rule:** CombinedRatioMonitor and ReserveAdequacy are pure ECharts — no HTML table to assert against. They are covered only through InsuranceMarket smoke tests (tab-switch renders without crashing). Do not create dedicated test files for them.

---

### Task 1: Mock Data

**Files:**
- Create: `src/markets/insurance/data/mockInsuranceData.js`

- [ ] **Step 1: Write the failing test for data shape**

File: `src/__tests__/insurance/useInsuranceData.test.js`

```js
import { describe, it, expect } from 'vitest';
import { useInsuranceData } from '../../markets/insurance/data/useInsuranceData';

describe('useInsuranceData', () => {
  it('returns catBondSpreads array with required fields', () => {
    const { catBondSpreads } = useInsuranceData();
    expect(Array.isArray(catBondSpreads)).toBe(true);
    expect(catBondSpreads.length).toBeGreaterThanOrEqual(8);
    expect(catBondSpreads[0]).toMatchObject({
      name:         expect.any(String),
      peril:        expect.any(String),
      sponsor:      expect.any(String),
      spread:       expect.any(Number),
      rating:       expect.any(String),
      trigger:      expect.any(String),
      maturity:     expect.any(String),
      notional:     expect.any(Number),
      expectedLoss: expect.any(Number),
    });
  });

  it('returns combinedRatioData with quarters and lines', () => {
    const { combinedRatioData } = useInsuranceData();
    expect(Array.isArray(combinedRatioData.quarters)).toBe(true);
    expect(combinedRatioData.quarters.length).toBeGreaterThan(0);
    expect(typeof combinedRatioData.lines).toBe('object');
    const lineNames = Object.keys(combinedRatioData.lines);
    expect(lineNames.length).toBeGreaterThanOrEqual(4);
    lineNames.forEach(k => {
      expect(combinedRatioData.lines[k].length).toBe(combinedRatioData.quarters.length);
    });
  });

  it('returns reserveAdequacyData with lines, reserves, required, adequacy arrays of equal length', () => {
    const { reserveAdequacyData } = useInsuranceData();
    const len = reserveAdequacyData.lines.length;
    expect(len).toBeGreaterThanOrEqual(5);
    expect(reserveAdequacyData.reserves.length).toBe(len);
    expect(reserveAdequacyData.required.length).toBe(len);
    expect(reserveAdequacyData.adequacy.length).toBe(len);
  });

  it('returns reinsurancePricing array with required fields', () => {
    const { reinsurancePricing } = useInsuranceData();
    expect(Array.isArray(reinsurancePricing)).toBe(true);
    expect(reinsurancePricing.length).toBeGreaterThanOrEqual(8);
    expect(reinsurancePricing[0]).toMatchObject({
      peril:       expect.any(String),
      layer:       expect.any(String),
      rol:         expect.any(Number),
      rolChange:   expect.any(Number),
      rpl:         expect.any(Number),
      rplChange:   expect.any(Number),
      capacity:    expect.stringMatching(/^(Ample|Adequate|Tight|Very Tight)$/),
      renewalDate: expect.any(String),
    });
  });

  it('returns isLive false and lastUpdated string', () => {
    const { isLive, lastUpdated } = useInsuranceData();
    expect(isLive).toBe(false);
    expect(typeof lastUpdated).toBe('string');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/insurance/useInsuranceData.test.js
```

Expected: FAIL — module not found

- [ ] **Step 3: Create mock data**

File: `src/markets/insurance/data/mockInsuranceData.js`

```js
export const catBondSpreads = [
  { name: 'Kilimanjaro Re 2025-1', peril: 'US Hurricane',    sponsor: 'Swiss Re',      spread: 620, rating: 'BB',  trigger: 'Indemnity',    maturity: 'Jan 2028', notional: 300, expectedLoss: 2.1 },
  { name: 'Limestone Re 2025-A',   peril: 'US Hurricane',    sponsor: 'State Farm',    spread: 580, rating: 'BB-', trigger: 'Parametric',   maturity: 'Jun 2027', notional: 250, expectedLoss: 1.8 },
  { name: 'Montoya Re 2025-2',     peril: 'California EQ',   sponsor: 'Allianz',       spread: 840, rating: 'B+',  trigger: 'Indemnity',    maturity: 'Apr 2028', notional: 200, expectedLoss: 3.2 },
  { name: 'Cranberry Re 2025-1',   peril: 'Florida Hurricane',sponsor: 'Citizens',     spread: 710, rating: 'BB-', trigger: 'Indemnity',    maturity: 'Jun 2027', notional: 175, expectedLoss: 2.6 },
  { name: 'Resilience Re 2024-A',  peril: 'EU Windstorm',    sponsor: 'Munich Re',     spread: 390, rating: 'BB+', trigger: 'Industry Loss',maturity: 'Dec 2026', notional: 400, expectedLoss: 1.2 },
  { name: 'Nakama Re 2025-1',      peril: 'Japan Typhoon',   sponsor: 'Sompo',         spread: 450, rating: 'BB',  trigger: 'Parametric',   maturity: 'Sep 2027', notional: 150, expectedLoss: 1.5 },
  { name: 'Sichuan Re 2025-A',     peril: 'China EQ',        sponsor: 'PICC',          spread: 760, rating: 'B+',  trigger: 'Parametric',   maturity: 'Mar 2028', notional: 120, expectedLoss: 2.9 },
  { name: 'Torino Re 2024-2',      peril: 'EU Flood',        sponsor: 'Generali',      spread: 310, rating: 'BBB-',trigger: 'Industry Loss',maturity: 'Nov 2026', notional: 350, expectedLoss: 0.9 },
  { name: 'Bonfire Re 2025-1',     peril: 'Wildfire',        sponsor: 'Travelers',     spread: 920, rating: 'B',   trigger: 'Indemnity',    maturity: 'Aug 2028', notional: 100, expectedLoss: 3.8 },
  { name: 'Helios Re 2025-A',      peril: 'Multi-Peril',     sponsor: 'AIG',           spread: 540, rating: 'BB-', trigger: 'Indemnity',    maturity: 'Jun 2028', notional: 500, expectedLoss: 2.0 },
];

export const combinedRatioData = {
  quarters: ['Q1 23', 'Q2 23', 'Q3 23', 'Q4 23', 'Q1 24', 'Q2 24', 'Q3 24', 'Q4 24'],
  lines: {
    'Auto':        [98.2, 101.5,  99.8, 103.2, 105.1, 102.8, 100.4,  97.6],
    'Homeowners':  [88.4,  92.1, 115.2,  89.3,  94.8, 118.5,  91.2,  86.7],
    'Commercial':  [94.2,  96.8,  97.1,  95.4,  93.8,  96.2,  94.7,  92.1],
    'Specialty':   [82.1,  85.4,  83.2,  81.8,  84.6,  86.1,  83.8,  80.4],
  },
};

export const reserveAdequacyData = {
  lines:    ['Auto Liability', 'Workers Comp', 'General Liability', 'Commercial Property', 'Medical Malpractice'],
  reserves: [12400, 8900, 15200, 7800, 11300],
  required: [11800, 9200, 16100, 7400, 12800],
  adequacy: [105.1, 96.7, 94.4, 105.4, 88.3],
};

export const reinsurancePricing = [
  { peril: 'US Hurricane',      layer: '$100M xs $50M',   rol: 12.4, rolChange: +8.2,  rpl: 2.8, rplChange: +5.1,  capacity: 'Ample',      renewalDate: 'Jun 2025' },
  { peril: 'US Hurricane',      layer: '$200M xs $150M',  rol:  7.8, rolChange: +6.4,  rpl: 2.1, rplChange: +3.8,  capacity: 'Adequate',   renewalDate: 'Jun 2025' },
  { peril: 'California EQ',     layer: '$200M xs $100M',  rol: 18.6, rolChange: +15.3, rpl: 4.2, rplChange: +12.8, capacity: 'Tight',      renewalDate: 'Jan 2026' },
  { peril: 'Florida Hurricane', layer: '$150M xs $50M',   rol: 14.2, rolChange: +9.8,  rpl: 3.4, rplChange: +7.2,  capacity: 'Tight',      renewalDate: 'Jun 2025' },
  { peril: 'EU Windstorm',      layer: '€100M xs €50M',   rol:  6.2, rolChange: +2.1,  rpl: 1.8, rplChange: +1.4,  capacity: 'Ample',      renewalDate: 'Jan 2026' },
  { peril: 'Japan Typhoon',     layer: '¥20B xs ¥10B',    rol:  9.4, rolChange: +4.2,  rpl: 2.6, rplChange: +3.1,  capacity: 'Adequate',   renewalDate: 'Apr 2025' },
  { peril: 'Wildfire',          layer: '$50M xs $25M',    rol: 22.8, rolChange: +18.6, rpl: 5.8, rplChange: +14.2, capacity: 'Very Tight', renewalDate: 'Jan 2026' },
  { peril: 'Cyber',             layer: '$25M xs $10M',    rol: 16.4, rolChange: +11.2, rpl: 4.6, rplChange: +8.8,  capacity: 'Tight',      renewalDate: 'Jan 2026' },
  { peril: 'Marine',            layer: '$75M xs $25M',    rol:  5.8, rolChange: +1.6,  rpl: 1.4, rplChange: +0.9,  capacity: 'Ample',      renewalDate: 'Jan 2026' },
];
```

- [ ] **Step 4: Create the hook**

File: `src/markets/insurance/data/useInsuranceData.js`

```js
import {
  catBondSpreads,
  combinedRatioData,
  reserveAdequacyData,
  reinsurancePricing,
} from './mockInsuranceData';

export function useInsuranceData() {
  return {
    catBondSpreads,
    combinedRatioData,
    reserveAdequacyData,
    reinsurancePricing,
    isLive: false,
    lastUpdated: 'Mock data — Apr 2025',
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/__tests__/insurance/useInsuranceData.test.js
```

Expected: 5 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/markets/insurance/data/mockInsuranceData.js src/markets/insurance/data/useInsuranceData.js src/__tests__/insurance/useInsuranceData.test.js
git commit -m "feat(insurance): mock data + useInsuranceData hook"
```

---

### Task 2: CatBondSpreads Component

**Files:**
- Create: `src/markets/insurance/components/CatBondSpreads.jsx`
- Create: `src/markets/insurance/components/InsComponents.css`
- Create: `src/__tests__/insurance/CatBondSpreads.test.jsx`

- [ ] **Step 1: Write the failing test**

File: `src/__tests__/insurance/CatBondSpreads.test.jsx`

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CatBondSpreads from '../../markets/insurance/components/CatBondSpreads';

const mockData = [
  { name: 'Kilimanjaro Re 2025-1', peril: 'US Hurricane', sponsor: 'Swiss Re',   spread: 620, rating: 'BB',  trigger: 'Indemnity',  maturity: 'Jan 2028', notional: 300, expectedLoss: 2.1 },
  { name: 'Montoya Re 2025-2',     peril: 'California EQ', sponsor: 'Allianz',   spread: 840, rating: 'B+',  trigger: 'Indemnity',  maturity: 'Apr 2028', notional: 200, expectedLoss: 3.2 },
  { name: 'Resilience Re 2024-A',  peril: 'EU Windstorm',  sponsor: 'Munich Re', spread: 390, rating: 'BB+', trigger: 'Industry Loss', maturity: 'Dec 2026', notional: 400, expectedLoss: 1.2 },
];

describe('CatBondSpreads', () => {
  it('renders the panel title', () => {
    render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(screen.getByText('Cat Bond Spreads')).toBeInTheDocument();
  });

  it('renders all bond names', () => {
    render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(screen.getByText('Kilimanjaro Re 2025-1')).toBeInTheDocument();
    expect(screen.getByText('Montoya Re 2025-2')).toBeInTheDocument();
    expect(screen.getByText('Resilience Re 2024-A')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(screen.getByText('Bond')).toBeInTheDocument();
    expect(screen.getByText('Spread (bps)')).toBeInTheDocument();
    expect(screen.getByText('Rating')).toBeInTheDocument();
    expect(screen.getByText('Expected Loss %')).toBeInTheDocument();
  });

  it('applies ins-spread-high class for spread > 700', () => {
    const { container } = render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(container.querySelectorAll('.ins-spread-high').length).toBeGreaterThan(0);
  });

  it('applies ins-spread-low class for spread < 500', () => {
    const { container } = render(<CatBondSpreads catBondSpreads={mockData} />);
    expect(container.querySelectorAll('.ins-spread-low').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/insurance/CatBondSpreads.test.jsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create InsComponents.css**

File: `src/markets/insurance/components/InsComponents.css`

```css
/* src/markets/insurance/components/InsComponents.css */
.ins-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
.ins-panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.ins-panel-title    { font-size: 16px; font-weight: 600; color: #e2e8f0; }
.ins-panel-subtitle { font-size: 11px; color: #64748b; flex: 1; }
.ins-panel-footer   { margin-top: 12px; font-size: 10px; color: #475569; flex-shrink: 0; }
.ins-chart-wrap     { flex: 1; min-height: 0; }

/* Shared table styles */
.ins-scroll { overflow: auto; flex: 1; }
.ins-table  { border-collapse: collapse; min-width: 100%; }
.ins-th {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  white-space: nowrap;
}
.ins-th:first-child,
.ins-th:nth-child(2),
.ins-th:nth-child(3) { text-align: left; }
.ins-row:hover { background: #1e293b; }
.ins-cell {
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}
.ins-cell:first-child { text-align: left; font-weight: 600; color: #e2e8f0; }
.ins-cell:nth-child(2),
.ins-cell:nth-child(3) { text-align: left; }

/* Cat Bond spread coloring */
.ins-spread-high { color: #ef4444; font-weight: 600; }
.ins-spread-mid  { color: #f59e0b; font-weight: 600; }
.ins-spread-low  { color: #22c55e; font-weight: 600; }

/* Reinsurance capacity coloring */
.ins-capacity-ample     { color: #22c55e; }
.ins-capacity-adequate  { color: #84cc16; }
.ins-capacity-tight     { color: #f97316; }
.ins-capacity-verytight { color: #ef4444; font-weight: 600; }

/* ROL change coloring */
.ins-change-up   { color: #ef4444; }
.ins-change-down { color: #22c55e; }
```

- [ ] **Step 4: Create CatBondSpreads.jsx**

File: `src/markets/insurance/components/CatBondSpreads.jsx`

```jsx
import React from 'react';
import './InsComponents.css';

function spreadClass(spread) {
  if (spread > 700) return 'ins-spread-high';
  if (spread >= 500) return 'ins-spread-mid';
  return 'ins-spread-low';
}

export default function CatBondSpreads({ catBondSpreads }) {
  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Cat Bond Spreads</span>
        <span className="ins-panel-subtitle">Catastrophe bond market · spread over risk-free rate (bps)</span>
      </div>
      <div className="ins-scroll">
        <table className="ins-table">
          <thead>
            <tr>
              <th className="ins-th">Bond</th>
              <th className="ins-th">Peril</th>
              <th className="ins-th">Sponsor</th>
              <th className="ins-th">Spread (bps)</th>
              <th className="ins-th">Rating</th>
              <th className="ins-th">Trigger</th>
              <th className="ins-th">Maturity</th>
              <th className="ins-th">Notional ($M)</th>
              <th className="ins-th">Expected Loss %</th>
            </tr>
          </thead>
          <tbody>
            {catBondSpreads.map((row, i) => (
              <tr key={i} className="ins-row">
                <td className="ins-cell">{row.name}</td>
                <td className="ins-cell">{row.peril}</td>
                <td className="ins-cell">{row.sponsor}</td>
                <td className={`ins-cell ${spreadClass(row.spread)}`}>{row.spread}</td>
                <td className="ins-cell">{row.rating}</td>
                <td className="ins-cell">{row.trigger}</td>
                <td className="ins-cell">{row.maturity}</td>
                <td className="ins-cell">{row.notional}</td>
                <td className="ins-cell">{row.expectedLoss.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ins-panel-footer">
        bps = basis points above risk-free · Indemnity = actual losses trigger · Parametric = index/model trigger · Industry Loss = market-wide loss trigger
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/__tests__/insurance/CatBondSpreads.test.jsx
```

Expected: 5 tests passing

- [ ] **Step 6: Commit**

```bash
git add src/markets/insurance/components/CatBondSpreads.jsx src/markets/insurance/components/InsComponents.css src/__tests__/insurance/CatBondSpreads.test.jsx
git commit -m "feat(insurance): CatBondSpreads component + InsComponents.css"
```

---

### Task 3: CombinedRatioMonitor Component

**Files:**
- Create: `src/markets/insurance/components/CombinedRatioMonitor.jsx`

> No dedicated test file — pure ECharts component. Covered by InsuranceMarket smoke test in Task 6.

- [ ] **Step 1: Create CombinedRatioMonitor.jsx**

File: `src/markets/insurance/components/CombinedRatioMonitor.jsx`

```jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './InsComponents.css';

const LINE_COLORS = ['#0ea5e9', '#a78bfa', '#f59e0b', '#22c55e'];

export default function CombinedRatioMonitor({ combinedRatioData }) {
  const { quarters, lines } = combinedRatioData;
  const lineNames = Object.keys(lines);

  const series = lineNames.map((name, i) => ({
    name,
    type: 'line',
    data: lines[name],
    smooth: true,
    lineStyle: { color: LINE_COLORS[i % LINE_COLORS.length], width: 2 },
    itemStyle: { color: LINE_COLORS[i % LINE_COLORS.length] },
    symbol: 'circle',
    symbolSize: 5,
  }));

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      formatter: (params) =>
        params[0].axisValue + '<br/>' +
        params.map(p => `${p.seriesName}: ${p.value.toFixed(1)}`).join('<br/>'),
    },
    legend: {
      data: lineNames,
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 0,
    },
    grid: { left: 60, right: 20, top: 40, bottom: 40 },
    xAxis: {
      type: 'category',
      data: quarters,
      axisLabel: { color: '#64748b', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      name: 'Combined Ratio (%)',
      nameTextStyle: { color: '#64748b', fontSize: 10 },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#1e293b' } },
      markLine: { silent: true },
    },
    series: [
      ...series,
      {
        type: 'line',
        markLine: {
          silent: true,
          data: [{ yAxis: 100 }],
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1 },
          label: { formatter: '100% breakeven', color: '#ef4444', fontSize: 10 },
        },
        data: [],
      },
    ],
  };

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Combined Ratio Monitor</span>
        <span className="ins-panel-subtitle">Loss ratio + expense ratio by line · below 100% = underwriting profit</span>
      </div>
      <div className="ins-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="ins-panel-footer">
        Combined Ratio = Loss Ratio + Expense Ratio · &lt;100% = underwriting profit · &gt;100% = underwriting loss
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/insurance/components/CombinedRatioMonitor.jsx
git commit -m "feat(insurance): CombinedRatioMonitor ECharts component"
```

---

### Task 4: ReserveAdequacy Component

**Files:**
- Create: `src/markets/insurance/components/ReserveAdequacy.jsx`

> No dedicated test file — pure ECharts component. Covered by InsuranceMarket smoke test in Task 6.

- [ ] **Step 1: Create ReserveAdequacy.jsx**

File: `src/markets/insurance/components/ReserveAdequacy.jsx`

```jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './InsComponents.css';

function adequacyColor(pct) {
  if (pct >= 105) return '#22c55e';
  if (pct >= 100) return '#84cc16';
  if (pct >= 95)  return '#f59e0b';
  return '#ef4444';
}

export default function ReserveAdequacy({ reserveAdequacyData }) {
  const { lines, reserves, required, adequacy } = reserveAdequacyData;

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const idx = params[0].dataIndex;
        return `${lines[idx]}<br/>Reserves: $${reserves[idx].toLocaleString()}M<br/>Required: $${required[idx].toLocaleString()}M<br/>Adequacy: ${adequacy[idx].toFixed(1)}%`;
      },
    },
    legend: {
      data: ['Held Reserves ($M)', 'Required Reserves ($M)'],
      textStyle: { color: '#94a3b8', fontSize: 11 },
      top: 0,
    },
    grid: { left: 160, right: 20, top: 40, bottom: 20 },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 11, formatter: '${value}M' },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: lines,
      axisLabel: { color: '#94a3b8', fontSize: 11 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      {
        name: 'Held Reserves ($M)',
        type: 'bar',
        data: reserves.map((v, i) => ({ value: v, itemStyle: { color: adequacyColor(adequacy[i]) } })),
        barMaxWidth: 24,
        label: { show: true, position: 'right', formatter: (p) => `${adequacy[p.dataIndex].toFixed(1)}%`, color: '#94a3b8', fontSize: 10 },
      },
      {
        name: 'Required Reserves ($M)',
        type: 'bar',
        data: required,
        barMaxWidth: 24,
        itemStyle: { color: '#1e293b', borderColor: '#475569', borderWidth: 1 },
      },
    ],
  };

  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Reserve Adequacy</span>
        <span className="ins-panel-subtitle">Held vs required reserves by line · % label = adequacy ratio</span>
      </div>
      <div className="ins-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      <div className="ins-panel-footer">
        Adequacy Ratio = Held ÷ Required · ≥105% oversupply · 100–104% adequate · 95–99% watch · &lt;95% deficient
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/insurance/components/ReserveAdequacy.jsx
git commit -m "feat(insurance): ReserveAdequacy ECharts component"
```

---

### Task 5: ReinsurancePricing Component

**Files:**
- Create: `src/markets/insurance/components/ReinsurancePricing.jsx`
- Create: `src/__tests__/insurance/ReinsurancePricing.test.jsx`

- [ ] **Step 1: Write the failing test**

File: `src/__tests__/insurance/ReinsurancePricing.test.jsx`

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReinsurancePricing from '../../markets/insurance/components/ReinsurancePricing';

const mockData = [
  { peril: 'US Hurricane',  layer: '$100M xs $50M',  rol: 12.4, rolChange: +8.2,  rpl: 2.8, rplChange: +5.1,  capacity: 'Ample',      renewalDate: 'Jun 2025' },
  { peril: 'California EQ', layer: '$200M xs $100M', rol: 18.6, rolChange: +15.3, rpl: 4.2, rplChange: +12.8, capacity: 'Tight',      renewalDate: 'Jan 2026' },
  { peril: 'Wildfire',      layer: '$50M xs $25M',   rol: 22.8, rolChange: +18.6, rpl: 5.8, rplChange: +14.2, capacity: 'Very Tight', renewalDate: 'Jan 2026' },
  { peril: 'Marine',        layer: '$75M xs $25M',   rol:  5.8, rolChange: +1.6,  rpl: 1.4, rplChange: +0.9,  capacity: 'Ample',      renewalDate: 'Jan 2026' },
];

describe('ReinsurancePricing', () => {
  it('renders the panel title', () => {
    render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(screen.getByText('Reinsurance Pricing')).toBeInTheDocument();
  });

  it('renders all peril names', () => {
    render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(screen.getByText('US Hurricane')).toBeInTheDocument();
    expect(screen.getByText('California EQ')).toBeInTheDocument();
    expect(screen.getByText('Wildfire')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(screen.getByText('Peril')).toBeInTheDocument();
    expect(screen.getByText('Layer')).toBeInTheDocument();
    expect(screen.getByText('ROL %')).toBeInTheDocument();
    expect(screen.getByText('Capacity')).toBeInTheDocument();
  });

  it('applies ins-capacity-ample for Ample rows', () => {
    const { container } = render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(container.querySelectorAll('.ins-capacity-ample').length).toBeGreaterThan(0);
  });

  it('applies ins-capacity-verytight for Very Tight rows', () => {
    const { container } = render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(container.querySelectorAll('.ins-capacity-verytight').length).toBeGreaterThan(0);
  });

  it('applies ins-change-up for positive ROL changes', () => {
    const { container } = render(<ReinsurancePricing reinsurancePricing={mockData} />);
    expect(container.querySelectorAll('.ins-change-up').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/insurance/ReinsurancePricing.test.jsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create ReinsurancePricing.jsx**

File: `src/markets/insurance/components/ReinsurancePricing.jsx`

```jsx
import React from 'react';
import './InsComponents.css';

function capacityClass(capacity) {
  const map = {
    'Ample':      'ins-capacity-ample',
    'Adequate':   'ins-capacity-adequate',
    'Tight':      'ins-capacity-tight',
    'Very Tight': 'ins-capacity-verytight',
  };
  return map[capacity] || '';
}

function fmtChange(v) {
  return v >= 0 ? `+${v.toFixed(1)}%` : `${v.toFixed(1)}%`;
}

export default function ReinsurancePricing({ reinsurancePricing }) {
  return (
    <div className="ins-panel">
      <div className="ins-panel-header">
        <span className="ins-panel-title">Reinsurance Pricing</span>
        <span className="ins-panel-subtitle">Treaty reinsurance market · rate-on-line and risk-adjusted premium at latest renewal</span>
      </div>
      <div className="ins-scroll">
        <table className="ins-table">
          <thead>
            <tr>
              <th className="ins-th">Peril</th>
              <th className="ins-th">Layer</th>
              <th className="ins-th">ROL %</th>
              <th className="ins-th">ROL Chg</th>
              <th className="ins-th">RPL %</th>
              <th className="ins-th">RPL Chg</th>
              <th className="ins-th">Capacity</th>
              <th className="ins-th">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {reinsurancePricing.map((row, i) => (
              <tr key={i} className="ins-row">
                <td className="ins-cell">{row.peril}</td>
                <td className="ins-cell">{row.layer}</td>
                <td className="ins-cell">{row.rol.toFixed(1)}%</td>
                <td className={`ins-cell ${row.rolChange >= 0 ? 'ins-change-up' : 'ins-change-down'}`}>
                  {fmtChange(row.rolChange)}
                </td>
                <td className="ins-cell">{row.rpl.toFixed(1)}%</td>
                <td className={`ins-cell ${row.rplChange >= 0 ? 'ins-change-up' : 'ins-change-down'}`}>
                  {fmtChange(row.rplChange)}
                </td>
                <td className={`ins-cell ${capacityClass(row.capacity)}`}>{row.capacity}</td>
                <td className="ins-cell">{row.renewalDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="ins-panel-footer">
        ROL = Rate-on-Line (premium ÷ limit) · RPL = Risk-adjusted Premium Level · Chg = YoY change at renewal
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/__tests__/insurance/ReinsurancePricing.test.jsx
```

Expected: 6 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/markets/insurance/components/ReinsurancePricing.jsx src/__tests__/insurance/ReinsurancePricing.test.jsx
git commit -m "feat(insurance): ReinsurancePricing component + tests"
```

---

### Task 6: InsuranceMarket Root Component

**Files:**
- Modify: `src/markets/insurance/InsuranceMarket.jsx`
- Create: `src/markets/insurance/InsuranceMarket.css`
- Create: `src/__tests__/insurance/InsuranceMarket.test.jsx`

- [ ] **Step 1: Write the failing test**

File: `src/__tests__/insurance/InsuranceMarket.test.jsx`

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InsuranceMarket from '../../markets/insurance/InsuranceMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('InsuranceMarket', () => {
  it('renders Cat Bond Spreads tab by default', () => {
    render(<InsuranceMarket />);
    expect(screen.getAllByText('Cat Bond Spreads').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', () => {
    render(<InsuranceMarket />);
    expect(screen.getByRole('button', { name: 'Cat Bond Spreads'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Combined Ratio'         })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reserve Adequacy'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reinsurance Pricing'    })).toBeInTheDocument();
  });

  it('switches to Combined Ratio on click', () => {
    render(<InsuranceMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Combined Ratio' }));
    expect(screen.getByText(/combined ratio monitor/i)).toBeInTheDocument();
  });

  it('switches to Reserve Adequacy on click', () => {
    render(<InsuranceMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Reserve Adequacy' }));
    expect(screen.getByText(/reserve adequacy/i)).toBeInTheDocument();
  });

  it('switches to Reinsurance Pricing on click', () => {
    render(<InsuranceMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Reinsurance Pricing' }));
    expect(screen.getByText(/treaty reinsurance market/i)).toBeInTheDocument();
  });

  it('shows mock data status', () => {
    render(<InsuranceMarket />);
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/insurance/InsuranceMarket.test.jsx
```

Expected: FAIL — stub component renders placeholder, not sub-tabs

- [ ] **Step 3: Create InsuranceMarket.css**

File: `src/markets/insurance/InsuranceMarket.css`

```css
/* src/markets/insurance/InsuranceMarket.css */
.ins-market {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #0a0f1a;
}
.ins-sub-tabs {
  display: flex;
  align-items: center;
  background: #0d1117;
  border-bottom: 1px solid #1e293b;
  padding: 0 16px;
  height: 38px;
  flex-shrink: 0;
}
.ins-sub-tab {
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
.ins-sub-tab:hover  { color: #94a3b8; }
.ins-sub-tab.active { color: #0ea5e9; border-bottom-color: #0ea5e9; }
.ins-status-bar {
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
.ins-status-live { color: #0ea5e9; }
.ins-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
```

- [ ] **Step 4: Replace InsuranceMarket.jsx stub**

File: `src/markets/insurance/InsuranceMarket.jsx`

```jsx
import React, { useState } from 'react';
import { useInsuranceData } from './data/useInsuranceData';
import CatBondSpreads       from './components/CatBondSpreads';
import CombinedRatioMonitor from './components/CombinedRatioMonitor';
import ReserveAdequacy      from './components/ReserveAdequacy';
import ReinsurancePricing   from './components/ReinsurancePricing';
import './InsuranceMarket.css';

const SUB_TABS = [
  { id: 'cat-bond-spreads',      label: 'Cat Bond Spreads'    },
  { id: 'combined-ratio',        label: 'Combined Ratio'      },
  { id: 'reserve-adequacy',      label: 'Reserve Adequacy'    },
  { id: 'reinsurance-pricing',   label: 'Reinsurance Pricing' },
];

export default function InsuranceMarket() {
  const [activeTab, setActiveTab] = useState('cat-bond-spreads');
  const { catBondSpreads, combinedRatioData, reserveAdequacyData, reinsurancePricing, isLive, lastUpdated } = useInsuranceData();

  return (
    <div className="ins-market">
      <div className="ins-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`ins-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="ins-status-bar">
        <span className={isLive ? 'ins-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="ins-content">
        {activeTab === 'cat-bond-spreads'    && <CatBondSpreads       catBondSpreads={catBondSpreads} />}
        {activeTab === 'combined-ratio'      && <CombinedRatioMonitor combinedRatioData={combinedRatioData} />}
        {activeTab === 'reserve-adequacy'    && <ReserveAdequacy      reserveAdequacyData={reserveAdequacyData} />}
        {activeTab === 'reinsurance-pricing' && <ReinsurancePricing   reinsurancePricing={reinsurancePricing} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run src/__tests__/insurance/InsuranceMarket.test.jsx
```

Expected: 6 tests passing

- [ ] **Step 6: Run full suite to confirm nothing is broken**

```bash
npx vitest run
```

Expected: all existing 134 tests + ~17 new insurance tests passing, no regressions

- [ ] **Step 7: Commit**

```bash
git add src/markets/insurance/InsuranceMarket.jsx src/markets/insurance/InsuranceMarket.css src/__tests__/insurance/InsuranceMarket.test.jsx
git commit -m "feat(insurance): InsuranceMarket root component — all 4 sub-tabs wired"
```

---

## Self-Review

**Spec coverage:**
- Cat Bond Spreads ✓ Task 2
- Combined Ratio Monitor ✓ Task 3
- Reserve Adequacy ✓ Task 4
- Reinsurance Pricing ✓ Task 5
- Root component + tab routing ✓ Task 6
- Mock data + hook ✓ Task 1

**Placeholder scan:** No TBDs, all code blocks complete.

**Type consistency:**
- `catBondSpreads` prop name matches hook return key and component prop throughout Tasks 1, 2, 6 ✓
- `combinedRatioData` matches throughout Tasks 1, 3, 6 ✓
- `reserveAdequacyData` matches throughout Tasks 1, 4, 6 ✓
- `reinsurancePricing` matches throughout Tasks 1, 5, 6 ✓
- CSS classes `ins-capacity-verytight` (no space, camelCase-style) consistent across InsComponents.css and ReinsurancePricing test ✓
