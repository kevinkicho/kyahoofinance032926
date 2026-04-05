# Commodities Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Sub-project 7 — a Commodities market tab with Price Dashboard, Futures Curve, Sector Heatmap, and Supply & Demand Monitor (EIA live data).

**Architecture:** New `src/markets/commodities/` module mirroring the Insurance market pattern. New `/api/commodities` Express endpoint fetching Yahoo Finance (12 tickers + WTI futures chain) and EIA API v2 (crude stocks, nat gas storage, crude production). Accent color: gold `#ca8a04`.

**Tech Stack:** React 18, ECharts (echarts-for-react), Vite 5, Express, yahoo-finance2, node-cache, EIA API v2, Vitest, @testing-library/react

---

## File Map

**Create:**
- `src/markets/commodities/CommoditiesMarket.jsx`
- `src/markets/commodities/CommoditiesMarket.css`
- `src/markets/commodities/data/mockCommoditiesData.js`
- `src/markets/commodities/data/useCommoditiesData.js`
- `src/markets/commodities/components/PriceDashboard.jsx`
- `src/markets/commodities/components/FuturesCurve.jsx`
- `src/markets/commodities/components/SectorHeatmap.jsx`
- `src/markets/commodities/components/SupplyDemand.jsx`
- `src/markets/commodities/components/CommodComponents.css`
- `src/__tests__/commodities/useCommoditiesData.test.js`
- `src/__tests__/commodities/CommoditiesMarket.test.jsx`
- `src/__tests__/commodities/PriceDashboard.test.jsx`
- `src/__tests__/commodities/FuturesCurve.test.jsx`
- `src/__tests__/commodities/SectorHeatmap.test.jsx`
- `src/__tests__/commodities/SupplyDemand.test.jsx`

**Modify:**
- `src/hub/markets.config.js` — add commodities entry
- `src/hub/HubLayout.jsx` — import + wire CommoditiesMarket
- `server/index.js` — add `/api/commodities` endpoint and update console.log

---

### Task 1: Mock Data

**Files:**
- Create: `src/markets/commodities/data/mockCommoditiesData.js`
- Test: `src/__tests__/commodities/useCommoditiesData.test.js` (shape tests only for now)

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/commodities/useCommoditiesData.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCommoditiesData } from '../../markets/commodities/data/useCommoditiesData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCommoditiesData', () => {
  beforeEach(() => { mockFetch.mockReset(); });

  it('returns priceDashboardData with 3 sectors on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.priceDashboardData).toHaveLength(3);
    expect(result.current.priceDashboardData[0]).toMatchObject({
      sector: expect.any(String),
      commodities: expect.any(Array),
    });
    expect(result.current.priceDashboardData[0].commodities).toHaveLength(4);
  });

  it('returns futuresCurveData with labels and prices arrays on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { futuresCurveData } = result.current;
    expect(Array.isArray(futuresCurveData.labels)).toBe(true);
    expect(futuresCurveData.labels.length).toBeGreaterThanOrEqual(6);
    expect(futuresCurveData.prices.length).toBe(futuresCurveData.labels.length);
  });

  it('returns sectorHeatmapData with 12 commodities on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sectorHeatmapData.commodities).toHaveLength(12);
    expect(result.current.sectorHeatmapData.commodities[0]).toMatchObject({
      ticker: expect.any(String),
      name: expect.any(String),
      sector: expect.any(String),
      d1: expect.any(Number),
    });
  });

  it('returns supplyDemandData with crudeStocks, natGasStorage, crudeProduction on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { supplyDemandData } = result.current;
    expect(Array.isArray(supplyDemandData.crudeStocks.periods)).toBe(true);
    expect(Array.isArray(supplyDemandData.natGasStorage.periods)).toBe(true);
    expect(Array.isArray(supplyDemandData.crudeProduction.periods)).toBe(true);
  });

  it('sets isLive true and uses live priceDashboardData when server responds', async () => {
    const liveData = {
      priceDashboardData: [
        { sector: 'Energy', commodities: [{ ticker: 'CL=F', name: 'WTI Crude', unit: '$/bbl', price: 90.0, change1d: 1.5, change1w: 2.0, change1m: 3.0, sparkline: [88, 89, 90] }] },
        { sector: 'Metals', commodities: [{ ticker: 'GC=F', name: 'Gold', unit: '$/oz', price: 2400, change1d: 0.5, change1w: 1.0, change1m: 2.0, sparkline: [2380, 2390, 2400] }] },
        { sector: 'Agriculture', commodities: [{ ticker: 'ZW=F', name: 'Wheat', unit: '¢/bu', price: 550, change1d: -0.5, change1w: -1.0, change1m: -2.0, sparkline: [560, 555, 550] }] },
      ],
      futuresCurveData: { labels: ["Jun '26"], prices: [90.0], commodity: 'WTI Crude Oil', spotPrice: 90.0 },
      sectorHeatmapData: { commodities: [{ ticker: 'CL=F', name: 'WTI Crude', sector: 'Energy', d1: 1.5, w1: 2.0, m1: 3.0 }], columns: ['1d%', '1w%', '1m%'] },
      supplyDemandData: {
        crudeStocks: { periods: ['2026-04-04'], values: [460], avg5yr: 432 },
        natGasStorage: { periods: ['2026-04-04'], values: [1900], avg5yr: 1742 },
        crudeProduction: { periods: ['2026-04-04'], values: [13.2] },
      },
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.priceDashboardData[0].commodities[0].price).toBe(90.0);
    expect(result.current.lastUpdated).toBe('2026-04-04');
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/commodities/useCommoditiesData.test.js`
Expected: FAIL — module not found

- [ ] **Step 3: Create mock data file**

```javascript
// src/markets/commodities/data/mockCommoditiesData.js

export const priceDashboardData = [
  {
    sector: 'Energy',
    commodities: [
      { ticker: 'CL=F', name: 'WTI Crude',   unit: '$/bbl',   price: 82.14, change1d: 0.82,  change1w: -2.10, change1m: -4.31, sparkline: [84.2, 83.8, 83.1, 82.5, 82.9, 82.2, 82.4, 82.1, 82.0, 82.14] },
      { ticker: 'BZ=F', name: 'Brent Crude',  unit: '$/bbl',   price: 86.42, change1d: 0.71,  change1w: -1.93, change1m: -3.88, sparkline: [88.1, 87.6, 87.3, 87.0, 87.2, 86.8, 87.0, 86.6, 86.5, 86.42] },
      { ticker: 'NG=F', name: 'Natural Gas',  unit: '$/MMBtu', price:  1.93, change1d: -1.18, change1w:  3.41, change1m:  8.12, sparkline: [1.78, 1.80, 1.82, 1.85, 1.87, 1.89, 1.91, 1.92, 1.92, 1.93] },
      { ticker: 'RB=F', name: 'Gasoline',     unit: '$/gal',   price:  2.64, change1d: 0.45,  change1w: -0.82, change1m:  1.23, sparkline: [2.61, 2.62, 2.60, 2.63, 2.62, 2.64, 2.63, 2.65, 2.64, 2.64] },
    ],
  },
  {
    sector: 'Metals',
    commodities: [
      { ticker: 'GC=F', name: 'Gold',      unit: '$/oz',  price: 2314.0, change1d: 0.31,  change1w: 1.42,  change1m:  5.21, sparkline: [2198, 2220, 2245, 2268, 2281, 2294, 2301, 2308, 2311, 2314] },
      { ticker: 'SI=F', name: 'Silver',    unit: '$/oz',  price:   27.42, change1d: -0.21, change1w: 2.81,  change1m:  8.34, sparkline: [25.3, 25.6, 25.9, 26.2, 26.5, 26.8, 27.0, 27.2, 27.3, 27.42] },
      { ticker: 'HG=F', name: 'Copper',    unit: '$/lb',  price:    4.12, change1d: -0.48, change1w: -1.23, change1m:  3.41, sparkline: [3.98, 4.00, 4.04, 4.07, 4.10, 4.12, 4.11, 4.13, 4.12, 4.12] },
      { ticker: 'PL=F', name: 'Platinum',  unit: '$/oz',  price:  948.0,  change1d: -0.31, change1w: -0.94, change1m:  2.18, sparkline: [921, 927, 932, 937, 940, 943, 945, 947, 947, 948] },
    ],
  },
  {
    sector: 'Agriculture',
    commodities: [
      { ticker: 'ZW=F', name: 'Wheat',     unit: '¢/bu', price: 562.0,  change1d: -1.12, change1w: -3.21, change1m:  -8.42, sparkline: [612, 601, 591, 583, 577, 572, 569, 566, 564, 562] },
      { ticker: 'ZC=F', name: 'Corn',      unit: '¢/bu', price: 441.0,  change1d:  0.23, change1w: -1.14, change1m:  -4.21, sparkline: [461, 457, 454, 451, 449, 447, 445, 443, 442, 441] },
      { ticker: 'ZS=F', name: 'Soybeans',  unit: '¢/bu', price: 1142.0, change1d:  0.81, change1w:  1.21, change1m:  -2.84, sparkline: [1174, 1167, 1160, 1154, 1150, 1147, 1145, 1143, 1142, 1142] },
      { ticker: 'KC=F', name: 'Coffee',    unit: '¢/lb', price:  228.4, change1d: -0.72, change1w:  2.41, change1m:  12.34, sparkline: [202, 206, 210, 215, 219, 222, 225, 226, 228, 228.4] },
    ],
  },
];

export const futuresCurveData = {
  labels:    ["Jun '26", "Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26", "Dec '26", "Jan '27"],
  prices:    [82.14, 81.82, 81.54, 81.28, 81.05, 80.84, 80.65, 80.48],
  commodity: 'WTI Crude Oil',
  spotPrice: 82.14,
};

export const sectorHeatmapData = {
  commodities: [
    { ticker: 'CL=F', name: 'WTI Crude',   sector: 'Energy',      d1:  0.82, w1: -2.10, m1:  -4.31 },
    { ticker: 'BZ=F', name: 'Brent Crude', sector: 'Energy',      d1:  0.71, w1: -1.93, m1:  -3.88 },
    { ticker: 'NG=F', name: 'Nat Gas',     sector: 'Energy',      d1: -1.18, w1:  3.41, m1:   8.12 },
    { ticker: 'RB=F', name: 'Gasoline',    sector: 'Energy',      d1:  0.45, w1: -0.82, m1:   1.23 },
    { ticker: 'GC=F', name: 'Gold',        sector: 'Metals',      d1:  0.31, w1:  1.42, m1:   5.21 },
    { ticker: 'SI=F', name: 'Silver',      sector: 'Metals',      d1: -0.21, w1:  2.81, m1:   8.34 },
    { ticker: 'HG=F', name: 'Copper',      sector: 'Metals',      d1: -0.48, w1: -1.23, m1:   3.41 },
    { ticker: 'PL=F', name: 'Platinum',    sector: 'Metals',      d1: -0.31, w1: -0.94, m1:   2.18 },
    { ticker: 'ZW=F', name: 'Wheat',       sector: 'Agriculture', d1: -1.12, w1: -3.21, m1:  -8.42 },
    { ticker: 'ZC=F', name: 'Corn',        sector: 'Agriculture', d1:  0.23, w1: -1.14, m1:  -4.21 },
    { ticker: 'ZS=F', name: 'Soybeans',    sector: 'Agriculture', d1:  0.81, w1:  1.21, m1:  -2.84 },
    { ticker: 'KC=F', name: 'Coffee',      sector: 'Agriculture', d1: -0.72, w1:  2.41, m1:  12.34 },
  ],
  columns: ['1d%', '1w%', '1m%'],
};

// 12 weekly data points each — enough for mock display
const CRUDE_PERIODS    = ['2025-10-10','2025-10-17','2025-10-24','2025-10-31','2025-11-07','2025-11-14','2025-11-21','2025-11-28','2025-12-05','2025-12-12','2025-12-19','2025-12-26'];
const NATGAS_PERIODS   = CRUDE_PERIODS;
const PROD_PERIODS     = CRUDE_PERIODS;

export const supplyDemandData = {
  crudeStocks:    { periods: CRUDE_PERIODS,  values: [454.2, 453.8, 455.1, 456.4, 458.2, 457.9, 456.1, 455.4, 454.8, 453.9, 452.8, 453.1], avg5yr: 432.1 },
  natGasStorage:  { periods: NATGAS_PERIODS, values: [3821, 3748, 3672, 3591, 3508, 3421, 3339, 3254, 3168, 3082, 2994, 2908],               avg5yr: 3142 },
  crudeProduction:{ periods: PROD_PERIODS,   values: [13.1, 13.2, 13.1, 13.3, 13.2, 13.3, 13.4, 13.3, 13.2, 13.4, 13.5, 13.4] },
};
```

- [ ] **Step 4: Create useCommoditiesData hook (minimal — makes tests pass)**

```javascript
// src/markets/commodities/data/useCommoditiesData.js
import { useState, useEffect } from 'react';
import {
  priceDashboardData  as mockPriceDashboardData,
  futuresCurveData    as mockFuturesCurveData,
  sectorHeatmapData   as mockSectorHeatmapData,
  supplyDemandData    as mockSupplyDemandData,
} from './mockCommoditiesData';

const SERVER = '';

export function useCommoditiesData() {
  const [priceDashboardData,  setPriceDashboardData]  = useState(mockPriceDashboardData);
  const [futuresCurveData,    setFuturesCurveData]    = useState(mockFuturesCurveData);
  const [sectorHeatmapData,   setSectorHeatmapData]   = useState(mockSectorHeatmapData);
  const [supplyDemandData,    setSupplyDemandData]    = useState(mockSupplyDemandData);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — Apr 2025');
  const [isLoading,           setIsLoading]           = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/commodities`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.priceDashboardData?.length === 3)          setPriceDashboardData(data.priceDashboardData);
        if (data.futuresCurveData?.prices?.length >= 4)     setFuturesCurveData(data.futuresCurveData);
        if (data.sectorHeatmapData?.commodities?.length >= 4) setSectorHeatmapData(data.sectorHeatmapData);
        if (data.supplyDemandData?.crudeStocks?.periods?.length) setSupplyDemandData(data.supplyDemandData);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, isLive, lastUpdated, isLoading };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/commodities/useCommoditiesData.test.js`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/markets/commodities/data/mockCommoditiesData.js src/markets/commodities/data/useCommoditiesData.js src/__tests__/commodities/useCommoditiesData.test.js
git commit -m "feat(commodities): mock data + useCommoditiesData hook with tests"
```

---

### Task 2: CommoditiesMarket Shell

**Files:**
- Create: `src/markets/commodities/CommoditiesMarket.jsx`
- Create: `src/markets/commodities/CommoditiesMarket.css`
- Create: `src/markets/commodities/components/CommodComponents.css`
- Test: `src/__tests__/commodities/CommoditiesMarket.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/commodities/CommoditiesMarket.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CommoditiesMarket from '../../markets/commodities/CommoditiesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('CommoditiesMarket', () => {
  it('renders all 4 sub-tabs after loading', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Price Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Futures Curve'   })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sector Heatmap'  })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Supply & Demand' })).toBeInTheDocument();
  });

  it('shows Price Dashboard tab by default', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/price dashboard/i).length).toBeGreaterThanOrEqual(1);
  });

  it('switches to Futures Curve tab on click', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Futures Curve' }));
    expect(screen.getByText(/WTI Crude Oil/i)).toBeInTheDocument();
  });

  it('switches to Sector Heatmap tab on click', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Sector Heatmap' }));
    expect(screen.getByText(/sector performance/i)).toBeInTheDocument();
  });

  it('switches to Supply & Demand tab on click', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Supply & Demand' }));
    expect(screen.getByText(/crude oil/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<CommoditiesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/commodities/CommoditiesMarket.test.jsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create CommoditiesMarket.css**

```css
/* src/markets/commodities/CommoditiesMarket.css */
.com-market {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #0a0f1a;
}
.com-sub-tabs {
  display: flex;
  align-items: center;
  background: #0d1117;
  border-bottom: 1px solid #1e293b;
  padding: 0 16px;
  height: 38px;
  flex-shrink: 0;
}
.com-sub-tab {
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
.com-sub-tab:hover  { color: #94a3b8; }
.com-sub-tab.active { color: #ca8a04; border-bottom-color: #ca8a04; }
.com-status-bar {
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
.com-status-live { color: #ca8a04; }
.com-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.com-loading {
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.com-loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #1e293b;
  border-top-color: #ca8a04;
  border-radius: 50%;
  animation: com-spin 0.7s linear infinite;
}
@keyframes com-spin {
  to { transform: rotate(360deg); }
}
.com-loading-text { font-size: 12px; color: #64748b; }
```

- [ ] **Step 4: Create CommodComponents.css**

```css
/* src/markets/commodities/components/CommodComponents.css */
.com-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
.com-panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.com-panel-title    { font-size: 16px; font-weight: 600; color: #e2e8f0; }
.com-panel-subtitle { font-size: 11px; color: #64748b; flex: 1; }
.com-panel-footer   { margin-top: 12px; font-size: 10px; color: #475569; flex-shrink: 0; }
.com-chart-wrap     { flex: 1; min-height: 0; }
.com-scroll         { overflow: auto; flex: 1; }

/* Shared table */
.com-table  { border-collapse: collapse; min-width: 100%; }
.com-th {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  white-space: nowrap;
}
.com-th:first-child { text-align: left; }
.com-row:hover { background: #1e293b; }
.com-cell {
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}
.com-cell:first-child { text-align: left; font-weight: 600; color: #e2e8f0; }

/* Sector group header row */
.com-sector-row td {
  background: #0f172a;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 4px 12px;
  border: 1px solid #0f172a;
}

/* Price coloring */
.com-price  { color: #ca8a04; font-weight: 600; }
.com-up     { color: #22c55e; }
.com-down   { color: #ef4444; }
.com-flat   { color: #94a3b8; }

/* Sparkline cell */
.com-spark { width: 80px; height: 28px; display: block; }

/* Futures curve pill */
.com-curve-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 14px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 8px;
}
.com-contango    { color: #f59e0b; }
.com-backwardation { color: #22c55e; }

/* Heatmap cell colors */
.com-heat-dg { background: #14532d; color: #86efac; }
.com-heat-lg { background: #1a3a28; color: #4ade80; }
.com-heat-neu{ background: #1e293b; color: #94a3b8; }
.com-heat-lr { background: #3b1a1a; color: #f87171; }
.com-heat-dr { background: #7f1d1d; color: #fca5a5; }

/* Supply & Demand panels */
.com-sd-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}
.com-sd-panel {
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
}
.com-sd-panel:last-child {
  grid-column: 1 / -1;
}
.com-sd-title {
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.com-sd-subtitle {
  font-size: 10px;
  color: #475569;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.com-sd-chart { flex: 1; min-height: 0; }
```

- [ ] **Step 5: Create placeholder sub-view components (stubs for shell to compile)**

```jsx
// src/markets/commodities/components/PriceDashboard.jsx
import React from 'react';
import './CommodComponents.css';
export default function PriceDashboard({ priceDashboardData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Price Dashboard</span>
        <span className="com-panel-subtitle">Live commodity prices — Energy · Metals · Agriculture</span>
      </div>
      <div className="com-scroll"><div style={{ color: '#475569', fontSize: 12 }}>Loading…</div></div>
    </div>
  );
}
```

```jsx
// src/markets/commodities/components/FuturesCurve.jsx
import React from 'react';
import './CommodComponents.css';
export default function FuturesCurve({ futuresCurveData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">WTI Crude Oil Futures Curve</span>
      </div>
      <div className="com-chart-wrap" />
    </div>
  );
}
```

```jsx
// src/markets/commodities/components/SectorHeatmap.jsx
import React from 'react';
import './CommodComponents.css';
export default function SectorHeatmap({ sectorHeatmapData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Sector Performance Heatmap</span>
      </div>
      <div className="com-scroll" />
    </div>
  );
}
```

```jsx
// src/markets/commodities/components/SupplyDemand.jsx
import React from 'react';
import './CommodComponents.css';
export default function SupplyDemand({ supplyDemandData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Supply & Demand Monitor</span>
      </div>
      <div className="com-sd-grid">
        <div className="com-sd-panel"><div className="com-sd-title">US Crude Oil Stocks</div></div>
        <div className="com-sd-panel"><div className="com-sd-title">Natural Gas Storage</div></div>
        <div className="com-sd-panel"><div className="com-sd-title">US Crude Production</div></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create CommoditiesMarket.jsx**

```jsx
// src/markets/commodities/CommoditiesMarket.jsx
import React, { useState } from 'react';
import { useCommoditiesData } from './data/useCommoditiesData';
import PriceDashboard from './components/PriceDashboard';
import FuturesCurve   from './components/FuturesCurve';
import SectorHeatmap  from './components/SectorHeatmap';
import SupplyDemand   from './components/SupplyDemand';
import './CommoditiesMarket.css';

const SUB_TABS = [
  { id: 'price-dashboard', label: 'Price Dashboard' },
  { id: 'futures-curve',   label: 'Futures Curve'   },
  { id: 'sector-heatmap',  label: 'Sector Heatmap'  },
  { id: 'supply-demand',   label: 'Supply & Demand'  },
];

export default function CommoditiesMarket() {
  const [activeTab, setActiveTab] = useState('price-dashboard');
  const { priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, isLive, lastUpdated, isLoading } = useCommoditiesData();

  if (isLoading) {
    return (
      <div className="com-market com-loading">
        <div className="com-loading-spinner" />
        <span className="com-loading-text">Loading commodities data…</span>
      </div>
    );
  }

  return (
    <div className="com-market">
      <div className="com-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`com-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="com-status-bar">
        <span className={isLive ? 'com-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="com-content">
        {activeTab === 'price-dashboard' && <PriceDashboard priceDashboardData={priceDashboardData} />}
        {activeTab === 'futures-curve'   && <FuturesCurve   futuresCurveData={futuresCurveData} />}
        {activeTab === 'sector-heatmap'  && <SectorHeatmap  sectorHeatmapData={sectorHeatmapData} />}
        {activeTab === 'supply-demand'   && <SupplyDemand   supplyDemandData={supplyDemandData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/commodities/CommoditiesMarket.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 8: Commit**

```bash
git add src/markets/commodities/CommoditiesMarket.jsx src/markets/commodities/CommoditiesMarket.css src/markets/commodities/components/PriceDashboard.jsx src/markets/commodities/components/FuturesCurve.jsx src/markets/commodities/components/SectorHeatmap.jsx src/markets/commodities/components/SupplyDemand.jsx src/markets/commodities/components/CommodComponents.css src/__tests__/commodities/CommoditiesMarket.test.jsx
git commit -m "feat(commodities): market shell, CSS, stub sub-views, shell tests"
```

---

### Task 3: PriceDashboard Component

**Files:**
- Modify: `src/markets/commodities/components/PriceDashboard.jsx`
- Test: `src/__tests__/commodities/PriceDashboard.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/commodities/PriceDashboard.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PriceDashboard from '../../markets/commodities/components/PriceDashboard';
import { priceDashboardData } from '../../markets/commodities/data/mockCommoditiesData';

describe('PriceDashboard', () => {
  it('renders all 3 sector group headers', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    expect(screen.getByText(/energy/i)).toBeInTheDocument();
    expect(screen.getByText(/metals/i)).toBeInTheDocument();
    expect(screen.getByText(/agriculture/i)).toBeInTheDocument();
  });

  it('renders all 12 commodity names', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    ['WTI Crude', 'Brent Crude', 'Natural Gas', 'Gasoline',
     'Gold', 'Silver', 'Copper', 'Platinum',
     'Wheat', 'Corn', 'Soybeans', 'Coffee'].forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('renders column headers', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    expect(screen.getByText('1d%')).toBeInTheDocument();
    expect(screen.getByText('1w%')).toBeInTheDocument();
    expect(screen.getByText('1m%')).toBeInTheDocument();
  });

  it('applies com-up class to positive change1d value', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    // WTI Crude has change1d: 0.82 (positive) — should have com-up class
    const cell = screen.getAllByText(/\+0\.82%/)[0];
    expect(cell.className).toContain('com-up');
  });

  it('applies com-down class to negative change1d value', () => {
    render(<PriceDashboard priceDashboardData={priceDashboardData} />);
    // Natural Gas has change1d: -1.18 (negative) — should have com-down class
    const cell = screen.getAllByText(/-1\.18%/)[0];
    expect(cell.className).toContain('com-down');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/commodities/PriceDashboard.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implement PriceDashboard**

```jsx
// src/markets/commodities/components/PriceDashboard.jsx
import React from 'react';
import './CommodComponents.css';

function fmtPct(v) {
  if (v == null) return '—';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

function pctClass(v) {
  if (v == null) return 'com-flat';
  if (v > 0) return 'com-up';
  if (v < 0) return 'com-down';
  return 'com-flat';
}

function Sparkline({ values }) {
  if (!values || values.length < 2) return <svg className="com-spark" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28, pad = 2;
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg className="com-spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" />
    </svg>
  );
}

const SECTOR_ICONS = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾' };

export default function PriceDashboard({ priceDashboardData }) {
  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Price Dashboard</span>
        <span className="com-panel-subtitle">Live commodity prices — Energy · Metals · Agriculture</span>
      </div>
      <div className="com-scroll">
        <table className="com-table">
          <thead>
            <tr>
              <th className="com-th" style={{ textAlign: 'left' }}>Commodity</th>
              <th className="com-th">Price</th>
              <th className="com-th">1d%</th>
              <th className="com-th">1w%</th>
              <th className="com-th">1m%</th>
              <th className="com-th">30d Trend</th>
            </tr>
          </thead>
          <tbody>
            {priceDashboardData.map(({ sector, commodities }) => (
              <React.Fragment key={sector}>
                <tr className="com-sector-row">
                  <td colSpan={6}>{SECTOR_ICONS[sector] || ''} {sector}</td>
                </tr>
                {commodities.map(c => (
                  <tr key={c.ticker} className="com-row">
                    <td className="com-cell">{c.name}</td>
                    <td className="com-cell com-price">
                      {c.price != null ? c.price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}
                    </td>
                    <td className={`com-cell ${pctClass(c.change1d)}`}>{fmtPct(c.change1d)}</td>
                    <td className={`com-cell ${pctClass(c.change1w)}`}>{fmtPct(c.change1w)}</td>
                    <td className={`com-cell ${pctClass(c.change1m)}`}>{fmtPct(c.change1m)}</td>
                    <td className="com-cell"><Sparkline values={c.sparkline} /></td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <div className="com-panel-footer">Prices: Yahoo Finance futures contracts · Updated on load</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/commodities/PriceDashboard.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/markets/commodities/components/PriceDashboard.jsx src/__tests__/commodities/PriceDashboard.test.jsx
git commit -m "feat(commodities): PriceDashboard grouped table with sparklines"
```

---

### Task 4: FuturesCurve Component

**Files:**
- Modify: `src/markets/commodities/components/FuturesCurve.jsx`
- Test: `src/__tests__/commodities/FuturesCurve.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/commodities/FuturesCurve.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FuturesCurve from '../../markets/commodities/components/FuturesCurve';
import { futuresCurveData } from '../../markets/commodities/data/mockCommoditiesData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('FuturesCurve', () => {
  it('renders the chart', () => {
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('renders commodity name in panel title', () => {
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    expect(screen.getByText(/WTI Crude Oil/i)).toBeInTheDocument();
  });

  it('shows Contango pill when prices slope downward (contango: last > first)', () => {
    // Mock data prices: [82.14, 81.82, ...] → last < first → backwardation? No:
    // contango = future prices HIGHER than spot (upward slope)
    // mock data is downward slope → backwardation
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    expect(screen.getByText(/backwardation/i)).toBeInTheDocument();
  });

  it('shows Contango pill when last price > first price', () => {
    const contangoData = {
      ...futuresCurveData,
      prices: [80.0, 80.5, 81.0, 81.5, 82.0, 82.5, 83.0, 83.5],
    };
    render(<FuturesCurve futuresCurveData={contangoData} />);
    expect(screen.getByText(/contango/i)).toBeInTheDocument();
  });

  it('renders contract month labels from data', () => {
    render(<FuturesCurve futuresCurveData={futuresCurveData} />);
    // The subtitle should mention how many months are shown
    expect(screen.getByText(/8 contract months/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/commodities/FuturesCurve.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implement FuturesCurve**

```jsx
// src/markets/commodities/components/FuturesCurve.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CommodComponents.css';

export default function FuturesCurve({ futuresCurveData }) {
  const { labels = [], prices = [], commodity = 'WTI Crude Oil', spotPrice } = futuresCurveData;

  const isContango = prices.length >= 2 && prices[prices.length - 1] > prices[0];
  const isBackwardation = prices.length >= 2 && prices[prices.length - 1] < prices[0];

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/><span style="color:#ca8a04">$${p.value.toFixed(2)}/bbl</span>`;
      },
    },
    grid: { top: 20, right: 24, bottom: 40, left: 56, containLabel: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: (v) => `$${v}` },
    },
    series: [{
      type: 'line',
      data: prices,
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: '#ca8a04' },
      lineStyle: { color: '#ca8a04', width: 2 },
    }],
  };

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">{commodity} Futures Curve</span>
        <span className="com-panel-subtitle">
          {labels.length} contract months · Spot: {spotPrice != null ? `$${spotPrice.toFixed(2)}/bbl` : '—'}
        </span>
      </div>
      <div className="com-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {(isContango || isBackwardation) && (
        <div style={{ padding: '8px 0 0' }}>
          <span className={`com-curve-pill ${isContango ? 'com-contango' : 'com-backwardation'}`}>
            {isContango
              ? '▲ Contango — market expects higher future prices'
              : '▼ Backwardation — near-term supply tight, spot premium'}
          </span>
        </div>
      )}
      <div className="com-panel-footer">Source: CME WTI Crude Oil futures (Yahoo Finance) · Prices in USD/bbl</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/commodities/FuturesCurve.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/markets/commodities/components/FuturesCurve.jsx src/__tests__/commodities/FuturesCurve.test.jsx
git commit -m "feat(commodities): FuturesCurve ECharts line with contango/backwardation pill"
```

---

### Task 5: SectorHeatmap Component

**Files:**
- Modify: `src/markets/commodities/components/SectorHeatmap.jsx`
- Test: `src/__tests__/commodities/SectorHeatmap.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/commodities/SectorHeatmap.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectorHeatmap from '../../markets/commodities/components/SectorHeatmap';
import { sectorHeatmapData } from '../../markets/commodities/data/mockCommoditiesData';

describe('SectorHeatmap', () => {
  it('renders panel title', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    expect(screen.getByText(/sector performance/i)).toBeInTheDocument();
  });

  it('renders all 12 commodity names', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    ['WTI Crude', 'Brent Crude', 'Nat Gas', 'Gasoline',
     'Gold', 'Silver', 'Copper', 'Platinum',
     'Wheat', 'Corn', 'Soybeans', 'Coffee'].forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('renders column headers 1d%, 1w%, 1m%', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    sectorHeatmapData.columns.forEach(col => {
      expect(screen.getByText(col)).toBeInTheDocument();
    });
  });

  it('applies com-heat-dg class to strongly positive value (Gold m1: +5.21)', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    // Gold m1 = +5.21 → deep green
    const cells = document.querySelectorAll('.com-heat-dg');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('applies com-heat-dr class to strongly negative value (Wheat m1: -8.42)', () => {
    render(<SectorHeatmap sectorHeatmapData={sectorHeatmapData} />);
    const cells = document.querySelectorAll('.com-heat-dr');
    expect(cells.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/commodities/SectorHeatmap.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implement SectorHeatmap**

```jsx
// src/markets/commodities/components/SectorHeatmap.jsx
import React from 'react';
import './CommodComponents.css';

function heatClass(v) {
  if (v == null) return 'com-heat-neu';
  if (v >  2.0) return 'com-heat-dg';
  if (v >  0.0) return 'com-heat-lg';
  if (v > -0.5) return 'com-heat-neu';
  if (v > -2.0) return 'com-heat-lr';
  return 'com-heat-dr';
}

function fmtPct(v) {
  if (v == null) return '—';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}

const SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture'];
const SECTOR_ICONS  = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾' };

export default function SectorHeatmap({ sectorHeatmapData }) {
  const { commodities = [], columns = [] } = sectorHeatmapData;
  const colKeys = ['d1', 'w1', 'm1'];

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Sector Performance Heatmap</span>
        <span className="com-panel-subtitle">% change by commodity and time horizon</span>
      </div>
      <div className="com-scroll">
        <table className="com-table">
          <thead>
            <tr>
              <th className="com-th" style={{ textAlign: 'left' }}>Commodity</th>
              {columns.map(col => <th key={col} className="com-th">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {SECTORS_ORDER.map(sector => {
              const rows = commodities.filter(c => c.sector === sector);
              return (
                <React.Fragment key={sector}>
                  <tr className="com-sector-row">
                    <td colSpan={columns.length + 1}>{SECTOR_ICONS[sector] || ''} {sector}</td>
                  </tr>
                  {rows.map(c => (
                    <tr key={c.ticker} className="com-row">
                      <td className="com-cell">{c.name}</td>
                      {colKeys.map((k, i) => (
                        <td key={i} className={`com-cell ${heatClass(c[k])}`} style={{ fontWeight: 500 }}>
                          {fmtPct(c[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="com-panel-footer">Colors: green = positive returns · red = negative · based on 1d, 1w, 1m % change</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/commodities/SectorHeatmap.test.jsx`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/markets/commodities/components/SectorHeatmap.jsx src/__tests__/commodities/SectorHeatmap.test.jsx
git commit -m "feat(commodities): SectorHeatmap 12×3 color-coded performance grid"
```

---

### Task 6: SupplyDemand Component

**Files:**
- Modify: `src/markets/commodities/components/SupplyDemand.jsx`
- Test: `src/__tests__/commodities/SupplyDemand.test.jsx`

- [ ] **Step 1: Write the failing test**

```javascript
// src/__tests__/commodities/SupplyDemand.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SupplyDemand from '../../markets/commodities/components/SupplyDemand';
import { supplyDemandData } from '../../markets/commodities/data/mockCommoditiesData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('SupplyDemand', () => {
  it('renders panel title', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getByText(/supply & demand/i)).toBeInTheDocument();
  });

  it('renders crude oil stocks panel', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getByText(/crude oil/i)).toBeInTheDocument();
  });

  it('renders natural gas storage panel', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getByText(/natural gas/i)).toBeInTheDocument();
  });

  it('renders crude production panel', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getByText(/production/i)).toBeInTheDocument();
  });

  it('renders 3 echarts instances', () => {
    render(<SupplyDemand supplyDemandData={supplyDemandData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(3);
  });

  it('handles null supplyDemandData gracefully', () => {
    const nullData = {
      crudeStocks:     { periods: [], values: [], avg5yr: null },
      natGasStorage:   { periods: [], values: [], avg5yr: null },
      crudeProduction: { periods: [], values: [] },
    };
    expect(() => render(<SupplyDemand supplyDemandData={nullData} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/commodities/SupplyDemand.test.jsx`
Expected: FAIL

- [ ] **Step 3: Implement SupplyDemand**

```jsx
// src/markets/commodities/components/SupplyDemand.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CommodComponents.css';

function buildStocksOption(title, periods, values, avg5yr, unit) {
  const avgLine = avg5yr != null ? Array(values.length).fill(avg5yr) : null;
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
    },
    legend: avgLine ? {
      data: [title, '5yr Avg'],
      textStyle: { color: '#64748b', fontSize: 10 },
      top: 0, right: 0,
    } : undefined,
    grid: { top: avgLine ? 24 : 10, right: 8, bottom: 28, left: 48, containLabel: false },
    xAxis: {
      type: 'category',
      data: periods,
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9,
        formatter: (v) => v ? v.slice(5) : v, // show MM-DD only
        interval: Math.floor(periods.length / 6),
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    series: [
      {
        name: title,
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#ca8a04' },
        lineStyle: { color: '#ca8a04', width: 2 },
        areaStyle: { color: 'rgba(202,138,4,0.08)' },
      },
      ...(avgLine ? [{
        name: '5yr Avg',
        type: 'line',
        data: avgLine,
        symbol: 'none',
        lineStyle: { color: '#475569', width: 1, type: 'dashed' },
      }] : []),
    ],
  };
}

export default function SupplyDemand({ supplyDemandData }) {
  const { crudeStocks, natGasStorage, crudeProduction } = supplyDemandData;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Supply & Demand Monitor</span>
        <span className="com-panel-subtitle">EIA weekly data — US energy inventory and production</span>
      </div>
      <div className="com-sd-grid">
        <div className="com-sd-panel">
          <div className="com-sd-title">US Crude Oil Stocks</div>
          <div className="com-sd-subtitle">Weekly inventory (million barrels) vs 5-year average</div>
          <div className="com-sd-chart">
            <ReactECharts
              option={buildStocksOption('Crude Stocks', crudeStocks.periods, crudeStocks.values, crudeStocks.avg5yr, 'Mb')}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        <div className="com-sd-panel">
          <div className="com-sd-title">Natural Gas Storage</div>
          <div className="com-sd-subtitle">Weekly storage (Bcf) vs 5-year average</div>
          <div className="com-sd-chart">
            <ReactECharts
              option={buildStocksOption('Nat Gas Storage', natGasStorage.periods, natGasStorage.values, natGasStorage.avg5yr, 'Bcf')}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        <div className="com-sd-panel">
          <div className="com-sd-title">US Crude Oil Production</div>
          <div className="com-sd-subtitle">Weekly output (million barrels/day) — 52-week trend</div>
          <div className="com-sd-chart">
            <ReactECharts
              option={buildStocksOption('Production', crudeProduction.periods, crudeProduction.values, null, 'Mb/d')}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
      </div>
      <div className="com-panel-footer">Source: EIA API v2 · Weekly releases · Crude stocks released Wednesdays · Nat gas released Thursdays</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/commodities/SupplyDemand.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/markets/commodities/components/SupplyDemand.jsx src/__tests__/commodities/SupplyDemand.test.jsx
git commit -m "feat(commodities): SupplyDemand EIA panels with 5yr avg reference lines"
```

---

### Task 7: /api/commodities Server Endpoint

**Files:**
- Modify: `server/index.js` (add endpoint before `app.listen`)

- [ ] **Step 1: Add the commodity metadata and helpers before the endpoint**

Find the line `// --- Quote Summary:` in server/index.js (around line 994). Insert the following block immediately before it:

```javascript
// --- Commodities Market Data ---
const EIA_API_KEY = process.env.EIA_API_KEY;

const COMMODITY_META = {
  'CL=F': { name: 'WTI Crude',   sector: 'Energy',      unit: '$/bbl'   },
  'BZ=F': { name: 'Brent Crude', sector: 'Energy',      unit: '$/bbl'   },
  'NG=F': { name: 'Natural Gas', sector: 'Energy',      unit: '$/MMBtu' },
  'RB=F': { name: 'Gasoline',    sector: 'Energy',      unit: '$/gal'   },
  'GC=F': { name: 'Gold',        sector: 'Metals',      unit: '$/oz'    },
  'SI=F': { name: 'Silver',      sector: 'Metals',      unit: '$/oz'    },
  'HG=F': { name: 'Copper',      sector: 'Metals',      unit: '$/lb'    },
  'PL=F': { name: 'Platinum',    sector: 'Metals',      unit: '$/oz'    },
  'ZW=F': { name: 'Wheat',       sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZC=F': { name: 'Corn',        sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZS=F': { name: 'Soybeans',    sector: 'Agriculture', unit: '\u00a2/bu' },
  'KC=F': { name: 'Coffee',      sector: 'Agriculture', unit: '\u00a2/lb' },
};
const COMMODITY_TICKERS = Object.keys(COMMODITY_META);
const SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture'];

const FUTURES_MONTH_CODES = ['F','G','H','J','K','M','N','Q','U','V','X','Z'];
const FUTURES_MONTH_NAMES = { F:'Jan',G:'Feb',H:'Mar',J:'Apr',K:'May',M:'Jun',N:'Jul',Q:'Aug',U:'Sep',V:'Oct',X:'Nov',Z:'Dec' };

function getWTIFuturesTickers(numMonths = 8) {
  const tickers = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 2; // 1-indexed, start next month
  if (month > 12) { month -= 12; year++; }
  for (let i = 0; i < numMonths; i++) {
    const code = FUTURES_MONTH_CODES[month - 1];
    const yr = String(year).slice(-2);
    tickers.push(`CL${code}${yr}.NYM`);
    month++;
    if (month > 12) { month -= 12; year++; }
  }
  return tickers;
}

function futuresTickerToLabel(ticker) {
  const code = ticker[2];
  const yr = ticker.slice(3, 5);
  return `${FUTURES_MONTH_NAMES[code] || '?'} '${yr}`;
}

async function fetchEIASeries(route, facets, length) {
  if (!EIA_API_KEY) return null;
  const params = new URLSearchParams({
    api_key: EIA_API_KEY,
    frequency: 'weekly',
    'data[0]': 'value',
    'sort[0][column]': 'period',
    'sort[0][direction]': 'asc',
    length: String(length),
  });
  for (const [k, v] of Object.entries(facets)) {
    params.append(`facets[${k}][]`, v);
  }
  const url = `https://api.eia.gov/v2/${route}/data/?${params.toString()}`;
  const json = await fetchJSON(url);
  const rows = json?.response?.data || [];
  return rows.map(r => ({ period: r.period, value: parseFloat(r.value) })).filter(r => !isNaN(r.value));
}

app.get('/api/commodities', async (req, res) => {
  const cacheKey = 'commodities_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // 1. Fetch live quotes for all 12 commodity tickers
    let quotesMap = {};
    try {
      const raw = await yf.quote(COMMODITY_TICKERS);
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.filter(q => q).forEach(q => { quotesMap[q.symbol] = q; });
    } catch (e) {
      console.warn('Commodity quotes failed:', e.message);
    }

    // 2. Fetch 35-day chart history for all 12 tickers (for 1w%, 1m%, sparkline)
    const histStart = (() => { const d = new Date(); d.setDate(d.getDate() - 35); return d.toISOString().split('T')[0]; })();
    const histEnd   = new Date().toISOString().split('T')[0];
    const histResults = await Promise.allSettled(
      COMMODITY_TICKERS.map(ticker =>
        yf.chart(ticker, { period1: histStart, period2: histEnd, interval: '1d' })
          .then(data => ({ ticker, closes: (data.quotes || []).map(q => q.close).filter(v => v != null) }))
      )
    );
    const chartMap = {};
    histResults.forEach(r => {
      if (r.status === 'fulfilled' && r.value.closes.length >= 2) {
        chartMap[r.value.ticker] = r.value.closes;
      }
    });

    // 3. Build priceDashboardData + sectorHeatmapData
    const sectorGroups = { Energy: [], Metals: [], Agriculture: [] };
    const heatmapRows  = [];

    for (const ticker of COMMODITY_TICKERS) {
      const meta   = COMMODITY_META[ticker];
      const q      = quotesMap[ticker];
      const closes = chartMap[ticker] || [];

      const price    = q?.regularMarketPrice ?? null;
      const change1d = q?.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 100) / 100 : null;
      const len      = closes.length;
      const change1w = len >= 6  ? Math.round((closes[len-1] - closes[Math.max(0, len-6)])  / closes[Math.max(0, len-6)]  * 1000) / 10 : null;
      const change1m = len >= 2  ? Math.round((closes[len-1] - closes[0]) / closes[0] * 1000) / 10 : null;

      // Subsample sparkline to max 20 points
      let sparkline = closes;
      if (closes.length > 20) {
        const step = (closes.length - 1) / 19;
        sparkline = Array.from({ length: 20 }, (_, i) => Math.round(closes[Math.round(i * step)] * 100) / 100);
      }

      const row = { ticker, name: meta.name, unit: meta.unit, price, change1d, change1w, change1m, sparkline };
      sectorGroups[meta.sector].push(row);
      heatmapRows.push({ ticker, name: meta.name, sector: meta.sector, d1: change1d, w1: change1w, m1: change1m });
    }

    const priceDashboardData = SECTORS_ORDER.map(sector => ({ sector, commodities: sectorGroups[sector] }));
    const sectorHeatmapData  = { commodities: heatmapRows, columns: ['1d%', '1w%', '1m%'] };

    // 4. WTI futures curve — fetch 8 contract months
    let futuresCurveData = null;
    try {
      const futureTickers = getWTIFuturesTickers(8);
      const futureQuotes  = await yf.quote(futureTickers);
      const futureArr     = Array.isArray(futureQuotes) ? futureQuotes : [futureQuotes];
      const validFutures  = futureTickers
        .map((t, i) => ({ ticker: t, label: futuresTickerToLabel(t), price: futureArr[i]?.regularMarketPrice ?? null }))
        .filter(f => f.price != null);
      if (validFutures.length >= 4) {
        futuresCurveData = {
          labels:    validFutures.map(f => f.label),
          prices:    validFutures.map(f => Math.round(f.price * 100) / 100),
          commodity: 'WTI Crude Oil',
          spotPrice: quotesMap['CL=F']?.regularMarketPrice ?? validFutures[0]?.price ?? null,
        };
      }
    } catch (e) {
      console.warn('Futures curve fetch failed:', e.message);
    }

    // 5. EIA supply/demand data
    let supplyDemandData = null;
    try {
      const [crudeRows, natGasRows, prodRows] = await Promise.all([
        fetchEIASeries('petroleum/stoc/wstk',  { duoarea: 'NUS', product: 'EPC0' }, 260).catch(() => null),
        fetchEIASeries('natural-gas/stor/wkly', { duoarea: 'NUS' },                  260).catch(() => null),
        fetchEIASeries('petroleum/sum/sndw',    { duoarea: 'NUS', product: 'EPC0' }, 52).catch(() => null),
      ]);

      function buildSeries(rows, withAvg) {
        if (!rows || rows.length === 0) return null;
        const last52 = rows.slice(-52);
        const periods = last52.map(r => r.period);
        const values  = last52.map(r => Math.round(r.value * 10) / 10);
        const avg5yr  = withAvg && rows.length >= 10
          ? Math.round(rows.map(r => r.value).reduce((s, v) => s + v, 0) / rows.length * 10) / 10
          : null;
        return { periods, values, avg5yr };
      }

      const crude    = buildSeries(crudeRows,  true);
      const natGas   = buildSeries(natGasRows, true);
      const prod     = buildSeries(prodRows,   false);

      if (crude || natGas || prod) {
        supplyDemandData = {
          crudeStocks:     crude    || { periods: [], values: [], avg5yr: null },
          natGasStorage:   natGas   || { periods: [], values: [], avg5yr: null },
          crudeProduction: prod     || { periods: [], values: [] },
        };
      }
    } catch (e) {
      console.warn('EIA fetch failed:', e.message);
    }

    const result = {
      priceDashboardData,
      sectorHeatmapData,
      ...(futuresCurveData  ? { futuresCurveData  } : {}),
      ...(supplyDemandData  ? { supplyDemandData  } : {}),
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, 900);
    res.json(result);
  } catch (error) {
    console.error('Commodities API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 2: Update the console.log to include the new endpoint**

Find this line in server/index.js:
```javascript
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro  /api/insurance  /api/summary/:t  /api/history/:t`);
```

Replace with:
```javascript
  console.log(`  Endpoints: /api/health  /api/stocks  /api/macro  /api/insurance  /api/commodities  /api/summary/:t  /api/history/:t`);
```

- [ ] **Step 3: Run the full test suite to confirm nothing is broken**

Run: `npx vitest run`
Expected: all existing tests still pass (no regressions)

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(commodities): /api/commodities endpoint — Yahoo Finance + EIA API v2"
```

---

### Task 8: Hub Wiring

**Files:**
- Modify: `src/hub/markets.config.js`
- Modify: `src/hub/HubLayout.jsx`

- [ ] **Step 1: Add commodities to markets config**

In `src/hub/markets.config.js`, add the commodities entry after insurance:

```javascript
// src/hub/markets.config.js
export const MARKETS = [
  { id: 'equities',    label: 'Equities',    icon: '📈' },
  { id: 'bonds',       label: 'Bonds',       icon: '🏛️' },
  { id: 'fx',          label: 'FX',          icon: '💱' },
  { id: 'derivatives', label: 'Derivatives', icon: '📊' },
  { id: 'realEstate',  label: 'Real Estate', icon: '🏠' },
  { id: 'insurance',   label: 'Insurance',   icon: '🛡️' },
  { id: 'commodities', label: 'Commodities', icon: '🛢️' },
];

export const DEFAULT_MARKET = 'equities';
```

- [ ] **Step 2: Import and wire CommoditiesMarket in HubLayout**

In `src/hub/HubLayout.jsx`:

```jsx
import React, { useState } from 'react';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET } from './markets.config';
import EquitiesMarket    from '../markets/equities/EquitiesMarket';
import BondsMarket       from '../markets/bonds/BondsMarket';
import FXMarket          from '../markets/fx/FXMarket';
import DerivativesMarket from '../markets/derivatives/DerivativesMarket';
import RealEstateMarket  from '../markets/realEstate/RealEstateMarket';
import InsuranceMarket   from '../markets/insurance/InsuranceMarket';
import CommoditiesMarket from '../markets/commodities/CommoditiesMarket';

const MARKET_COMPONENTS = {
  equities:    EquitiesMarket,
  bonds:       BondsMarket,
  fx:          FXMarket,
  derivatives: DerivativesMarket,
  realEstate:  RealEstateMarket,
  insurance:   InsuranceMarket,
  commodities: CommoditiesMarket,
};

export default function HubLayout() {
  const [activeMarket, setActiveMarket] = useState(DEFAULT_MARKET);
  const [currency, setCurrency] = useState('USD');
  const [snapshotDate, setSnapshotDate] = useState(null);

  const ActiveMarket = MARKET_COMPONENTS[activeMarket];

  return (
    <div className="hub-layout">
      <MarketTabBar
        activeMarket={activeMarket}
        setActiveMarket={setActiveMarket}
        currency={currency}
        setCurrency={setCurrency}
      />
      <ActiveMarket
        currency={currency}
        setCurrency={setCurrency}
        snapshotDate={snapshotDate}
        setSnapshotDate={setSnapshotDate}
      />
    </div>
  );
}
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: all tests pass (no regressions from hub changes)

- [ ] **Step 4: Commit**

```bash
git add src/hub/markets.config.js src/hub/HubLayout.jsx
git commit -m "feat(commodities): wire CommoditiesMarket into hub tab bar"
```

---

## Final Verification

- [ ] **Run full test suite**

Run: `npx vitest run`
Expected: all prior tests + ~33 new commodities tests pass

- [ ] **Smoke test in browser** (optional, needs `npm run dev` + `node server/index.js`)
  - Commodities tab appears in hub tab bar
  - Loading spinner shows briefly (gold `#ca8a04`)
  - Price Dashboard shows 3 sector groups, 12 commodity rows
  - Futures Curve shows ECharts line + contango/backwardation pill
  - Sector Heatmap shows color-coded grid
  - Supply & Demand shows 3 EIA panels
  - Status bar shows `● Live` if server responds, `○ Mock data` if not
