# Global Macro Market Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Global Macro workspace tab to the hub — 12-country heat table scorecard, ranked growth/inflation bar charts, central bank rate tracker, and debt monitor, sourced from World Bank + FRED APIs.

**Architecture:** Mirrors the Commodities market pattern exactly — root component with sub-tab routing, async hook (mock init → useEffect fetch → silent fallback), four ECharts/table components under `src/markets/globalMacro/`, plus a `/api/globalMacro` server endpoint with 3600s cache. CSS prefix `mac-`, accent teal `#14b8a6`.

**Tech Stack:** React 18, ECharts (echarts-for-react), Express, node-cache, World Bank API (free/no key), FRED API (existing `FRED_API_KEY`), Vitest + @testing-library/react.

---

## File Map

**Create:**
- `src/markets/globalMacro/data/mockGlobalMacroData.js` — static mock for all 4 sub-views
- `src/markets/globalMacro/data/useGlobalMacroData.js` — async hook with mock fallback
- `src/markets/globalMacro/GlobalMacroMarket.jsx` — root, sub-tab routing, status bar, loading spinner
- `src/markets/globalMacro/GlobalMacroMarket.css` — layout, spinner (teal), sub-tabs
- `src/markets/globalMacro/components/MacroScorecard.jsx` — 12×5 heat table
- `src/markets/globalMacro/components/GrowthInflation.jsx` — side-by-side ranked bar charts
- `src/markets/globalMacro/components/CentralBankRates.jsx` — ranked current rates + 5yr history lines
- `src/markets/globalMacro/components/DebtMonitor.jsx` — debt/GDP + current account bars
- `src/markets/globalMacro/components/MacroComponents.css` — shared panel, table, chart styles
- `src/__tests__/globalMacro/useGlobalMacroData.test.js`
- `src/__tests__/globalMacro/GlobalMacroMarket.test.jsx`
- `src/__tests__/globalMacro/MacroScorecard.test.jsx`
- `src/__tests__/globalMacro/GrowthInflation.test.jsx`
- `src/__tests__/globalMacro/CentralBankRates.test.jsx`
- `src/__tests__/globalMacro/DebtMonitor.test.jsx`

**Modify:**
- `server/index.js` — add `/api/globalMacro` endpoint + helper constants after the commodities block
- `src/hub/markets.config.js` — append `{ id: 'globalMacro', label: 'Macro', icon: '🌐' }`
- `src/hub/HubLayout.jsx` — import + wire `GlobalMacroMarket`

---

## Task 1: Mock Data

**Files:**
- Create: `src/markets/globalMacro/data/mockGlobalMacroData.js`

- [ ] **Step 1: Write the file**

```javascript
// src/markets/globalMacro/data/mockGlobalMacroData.js

// Generates 60 monthly labels: 2020-01 … 2024-12
const HISTORY_DATES = Array.from({ length: 60 }, (_, i) => {
  const year  = 2020 + Math.floor(i / 12);
  const month = String((i % 12) + 1).padStart(2, '0');
  return `${year}-${month}`;
});

// Piecewise-constant rate history: pivots = [[startIndex, rate], ...]
// Each pivot applies from its index until the next pivot.
function makeRateHistory(pivots) {
  return HISTORY_DATES.map((_, i) => {
    let rate = pivots[0][1];
    for (const [start, value] of pivots) {
      if (i >= start) rate = value;
    }
    return rate;
  });
}

// ---------------------------------------------------------------------------
// scorecardData — 12 countries, 5 macro indicators (latest annual, ~2023)
// ---------------------------------------------------------------------------
export const scorecardData = [
  { code: 'US', name: 'United States',  flag: '🇺🇸', region: 'G7',       gdp:  2.8, cpi:  3.2, rate:  5.25, unemp:  3.7, debt: 122.0 },
  { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', region: 'G7',       gdp:  0.4, cpi:  2.8, rate:  3.75, unemp:  6.1, debt:  91.0 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'G7',       gdp:  0.1, cpi:  6.7, rate:  5.25, unemp:  4.2, debt:  98.6 },
  { code: 'JP', name: 'Japan',          flag: '🇯🇵', region: 'G7',       gdp:  1.9, cpi:  3.3, rate: -0.10, unemp:  2.4, debt: 261.3 },
  { code: 'CA', name: 'Canada',         flag: '🇨🇦', region: 'G7',       gdp:  1.1, cpi:  3.9, rate:  5.00, unemp:  5.4, debt: 106.4 },
  { code: 'CN', name: 'China',          flag: '🇨🇳', region: 'EM',       gdp:  4.9, cpi:  0.2, rate:  3.45, unemp:  5.2, debt:  83.6 },
  { code: 'IN', name: 'India',          flag: '🇮🇳', region: 'EM',       gdp:  8.2, cpi:  5.7, rate:  6.50, unemp:  3.1, debt:  83.1 },
  { code: 'BR', name: 'Brazil',         flag: '🇧🇷', region: 'EM',       gdp:  2.9, cpi:  4.8, rate: 10.50, unemp:  8.1, debt:  87.6 },
  { code: 'KR', name: 'South Korea',    flag: '🇰🇷', region: 'EM',       gdp:  1.4, cpi:  3.6, rate:  3.50, unemp:  2.7, debt:  53.8 },
  { code: 'AU', name: 'Australia',      flag: '🇦🇺', region: 'Advanced', gdp:  2.0, cpi:  5.6, rate:  4.35, unemp:  3.9, debt:  55.3 },
  { code: 'MX', name: 'Mexico',         flag: '🇲🇽', region: 'EM',       gdp:  3.2, cpi:  5.2, rate: 11.00, unemp:  2.8, debt:  54.2 },
  { code: 'SE', name: 'Sweden',         flag: '🇸🇪', region: 'Advanced', gdp: -0.2, cpi:  5.9, rate:  4.00, unemp:  8.5, debt:  31.4 },
];

// ---------------------------------------------------------------------------
// growthInflationData — same GDP/CPI values, sorted by the component
// ---------------------------------------------------------------------------
export const growthInflationData = {
  year: 2023,
  countries: scorecardData.map(c => ({
    code: c.code, name: c.name, flag: c.flag, gdp: c.gdp, cpi: c.cpi,
  })),
};

// ---------------------------------------------------------------------------
// centralBankData — current rates (all 12) + 5-year history (7 FRED countries)
// ---------------------------------------------------------------------------
export const centralBankData = {
  current: [
    { code: 'US', name: 'United States',  flag: '🇺🇸', rate:  5.25, bank: 'Fed',      isLive: false },
    { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', rate:  3.75, bank: 'ECB',      isLive: false },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', rate:  5.25, bank: 'BoE',      isLive: false },
    { code: 'JP', name: 'Japan',          flag: '🇯🇵', rate: -0.10, bank: 'BoJ',      isLive: false },
    { code: 'CA', name: 'Canada',         flag: '🇨🇦', rate:  5.00, bank: 'BoC',      isLive: false },
    { code: 'CN', name: 'China',          flag: '🇨🇳', rate:  3.45, bank: 'PBoC',     isLive: false },
    { code: 'IN', name: 'India',          flag: '🇮🇳', rate:  6.50, bank: 'RBI',      isLive: false },
    { code: 'BR', name: 'Brazil',         flag: '🇧🇷', rate: 10.50, bank: 'BCB',      isLive: false },
    { code: 'KR', name: 'South Korea',    flag: '🇰🇷', rate:  3.50, bank: 'BoK',      isLive: false },
    { code: 'AU', name: 'Australia',      flag: '🇦🇺', rate:  4.35, bank: 'RBA',      isLive: false },
    { code: 'MX', name: 'Mexico',         flag: '🇲🇽', rate: 11.00, bank: 'Banxico',  isLive: false },
    { code: 'SE', name: 'Sweden',         flag: '🇸🇪', rate:  4.00, bank: 'Riksbank', isLive: false },
  ],
  history: {
    dates: HISTORY_DATES,
    series: [
      // Pivots encode the global rate hiking cycle 2022-2023
      { code: 'US', name: 'United States',  flag: '🇺🇸', values: makeRateHistory([[0,1.75],[3,0.25],[26,0.50],[28,1.00],[29,1.75],[30,2.50],[32,3.25],[34,4.00],[35,4.50],[37,4.75],[38,5.00],[41,5.50],[51,5.25],[53,4.75],[58,4.50]]) },
      { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', values: makeRateHistory([[0,0.00],[30,0.50],[32,1.25],[35,2.50],[37,3.00],[38,3.50],[40,4.00],[53,3.75],[55,3.50],[58,3.00]]) },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', values: makeRateHistory([[0,0.75],[1,0.10],[25,0.25],[26,0.50],[28,1.00],[30,1.75],[32,2.25],[34,3.00],[35,3.50],[36,4.00],[38,4.25],[40,4.50],[43,5.25],[53,5.00],[55,4.75]]) },
      { code: 'JP', name: 'Japan',          flag: '🇯🇵', values: makeRateHistory([[0,-0.10],[51,0.10]]) },
      { code: 'CA', name: 'Canada',         flag: '🇨🇦', values: makeRateHistory([[0,1.75],[3,0.25],[26,0.50],[28,1.50],[30,2.50],[33,4.25],[36,4.50],[39,5.00],[52,4.75],[54,4.50],[57,4.25]]) },
      { code: 'AU', name: 'Australia',      flag: '🇦🇺', values: makeRateHistory([[0,0.75],[3,0.25],[28,0.85],[29,1.35],[30,1.85],[32,2.85],[34,3.10],[36,3.35],[38,3.60],[40,4.10],[42,4.35]]) },
      { code: 'SE', name: 'Sweden',         flag: '🇸🇪', values: makeRateHistory([[0,0.00],[26,0.25],[30,0.75],[32,1.75],[35,2.50],[36,3.00],[38,3.50],[40,4.00],[54,3.75],[57,3.50]]) },
    ],
  },
};

// ---------------------------------------------------------------------------
// debtData — government debt % GDP + current account % GDP (latest ~2023)
// ---------------------------------------------------------------------------
export const debtData = {
  year: 2023,
  countries: [
    { code: 'US', name: 'United States',  flag: '🇺🇸', debt: 122.0, currentAccount: -3.0 },
    { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', debt:  91.0, currentAccount:  2.2 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', debt:  98.6, currentAccount: -2.7 },
    { code: 'JP', name: 'Japan',          flag: '🇯🇵', debt: 261.3, currentAccount:  3.5 },
    { code: 'CA', name: 'Canada',         flag: '🇨🇦', debt: 106.4, currentAccount: -1.4 },
    { code: 'CN', name: 'China',          flag: '🇨🇳', debt:  83.6, currentAccount:  1.5 },
    { code: 'IN', name: 'India',          flag: '🇮🇳', debt:  83.1, currentAccount: -1.5 },
    { code: 'BR', name: 'Brazil',         flag: '🇧🇷', debt:  87.6, currentAccount: -2.8 },
    { code: 'KR', name: 'South Korea',    flag: '🇰🇷', debt:  53.8, currentAccount:  2.3 },
    { code: 'AU', name: 'Australia',      flag: '🇦🇺', debt:  55.3, currentAccount: -1.8 },
    { code: 'MX', name: 'Mexico',         flag: '🇲🇽', debt:  54.2, currentAccount: -0.4 },
    { code: 'SE', name: 'Sweden',         flag: '🇸🇪', debt:  31.4, currentAccount:  5.5 },
  ],
};
```

- [ ] **Step 2: Run tests to verify baseline still passes**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -4`
Expected: `233 passed (233)` (no regressions; mock file has no tests yet)

- [ ] **Step 3: Commit**

```bash
git add src/markets/globalMacro/data/mockGlobalMacroData.js
git commit -m "feat(globalMacro): add mock data for all 4 sub-views"
```

---

## Task 2: Data Hook + Tests

**Files:**
- Create: `src/markets/globalMacro/data/useGlobalMacroData.js`
- Create: `src/__tests__/globalMacro/useGlobalMacroData.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// src/__tests__/globalMacro/useGlobalMacroData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useGlobalMacroData } from '../../markets/globalMacro/data/useGlobalMacroData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useGlobalMacroData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns scorecardData with 12 countries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.scorecardData).toHaveLength(12);
    expect(result.current.scorecardData[0]).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      flag: expect.any(String),
      gdp:  expect.any(Number),
    });
  });

  it('returns growthInflationData with year and 12 countries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.growthInflationData.year).toBeGreaterThan(2000);
    expect(result.current.growthInflationData.countries).toHaveLength(12);
  });

  it('returns centralBankData with 12 current rates and 7 history series on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.centralBankData.current).toHaveLength(12);
    expect(result.current.centralBankData.history.series).toHaveLength(7);
    expect(result.current.centralBankData.history.dates).toHaveLength(60);
  });

  it('returns debtData with 12 countries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.debtData.countries).toHaveLength(12);
    expect(result.current.debtData.countries[0]).toMatchObject({
      code: expect.any(String),
      debt: expect.any(Number),
      currentAccount: expect.any(Number),
    });
  });

  it('sets isLive true and replaces data when server responds with sufficient data', async () => {
    const liveData = {
      scorecardData: Array.from({ length: 10 }, (_, i) => ({
        code: `C${i}`, name: `Country ${i}`, flag: '🏳️', region: 'G7',
        gdp: 2.0, cpi: 3.0, rate: 4.0, unemp: 5.0, debt: 80.0,
      })),
      growthInflationData: {
        year: 2024,
        countries: Array.from({ length: 10 }, (_, i) => ({ code: `C${i}`, name: `Country ${i}`, flag: '🏳️', gdp: 2.0, cpi: 3.0 })),
      },
      centralBankData: {
        current: Array.from({ length: 10 }, (_, i) => ({ code: `C${i}`, name: `Country ${i}`, flag: '🏳️', rate: 4.0, bank: 'CB', isLive: true })),
        history: { dates: ['2020-01'], series: [{ code: 'US', name: 'United States', flag: '🇺🇸', values: [1.75] }] },
      },
      debtData: {
        year: 2024,
        countries: Array.from({ length: 10 }, (_, i) => ({ code: `C${i}`, name: `Country ${i}`, flag: '🏳️', debt: 80.0, currentAccount: 1.0 })),
      },
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.lastUpdated).toBe('2026-04-04');
    expect(result.current.scorecardData[0].code).toBe('C0');
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/globalMacro/useGlobalMacroData.test.js 2>&1 | tail -8`
Expected: FAIL — `useGlobalMacroData` not found

- [ ] **Step 3: Write the hook**

```javascript
// src/markets/globalMacro/data/useGlobalMacroData.js
import { useState, useEffect } from 'react';
import {
  scorecardData       as mockScorecardData,
  growthInflationData as mockGrowthInflationData,
  centralBankData     as mockCentralBankData,
  debtData            as mockDebtData,
} from './mockGlobalMacroData';

const SERVER = '';

export function useGlobalMacroData() {
  const [scorecardData,       setScorecardData]       = useState(mockScorecardData);
  const [growthInflationData, setGrowthInflationData] = useState(mockGrowthInflationData);
  const [centralBankData,     setCentralBankData]     = useState(mockCentralBankData);
  const [debtData,            setDebtData]            = useState(mockDebtData);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — 2023');
  const [isLoading,           setIsLoading]           = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/globalMacro`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.scorecardData?.length >= 8)                           setScorecardData(data.scorecardData);
        if (data.growthInflationData?.countries?.length >= 8)          setGrowthInflationData(data.growthInflationData);
        if (data.centralBankData?.current?.length >= 8)                setCentralBankData(data.centralBankData);
        if (data.debtData?.countries?.length >= 8)                     setDebtData(data.debtData);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { scorecardData, growthInflationData, centralBankData, debtData, isLive, lastUpdated, isLoading };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/globalMacro/useGlobalMacroData.test.js 2>&1 | tail -6`
Expected: `6 passed (6)`

- [ ] **Step 5: Commit**

```bash
git add src/markets/globalMacro/data/useGlobalMacroData.js src/__tests__/globalMacro/useGlobalMacroData.test.js
git commit -m "feat(globalMacro): data hook with mock fallback + 6 tests"
```

---

## Task 3: Root Component + Tests

**Files:**
- Create: `src/markets/globalMacro/GlobalMacroMarket.jsx`
- Create: `src/markets/globalMacro/GlobalMacroMarket.css`
- Create: `src/__tests__/globalMacro/GlobalMacroMarket.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/globalMacro/GlobalMacroMarket.test.jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalMacroMarket from '../../markets/globalMacro/GlobalMacroMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('GlobalMacroMarket', () => {
  it('renders all 4 sub-tabs after loading', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Scorecard'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Growth & Inflation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Central Bank Rates' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Debt Monitor'    })).toBeInTheDocument();
  });

  it('shows Scorecard tab by default', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByText(/macro scorecard/i)).toBeInTheDocument();
  });

  it('switches to Growth & Inflation tab on click', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Growth & Inflation' }));
    expect(screen.getByText(/growth & inflation/i)).toBeInTheDocument();
  });

  it('switches to Central Bank Rates tab on click', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Central Bank Rates' }));
    expect(screen.getByText(/policy rates/i)).toBeInTheDocument();
  });

  it('switches to Debt Monitor tab on click', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Debt Monitor' }));
    expect(screen.getByText(/debt monitor/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<GlobalMacroMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/globalMacro/GlobalMacroMarket.test.jsx 2>&1 | tail -8`
Expected: FAIL — `GlobalMacroMarket` not found

- [ ] **Step 3: Write GlobalMacroMarket.jsx**

```jsx
// src/markets/globalMacro/GlobalMacroMarket.jsx
import React, { useState } from 'react';
import { useGlobalMacroData } from './data/useGlobalMacroData';
import MacroScorecard    from './components/MacroScorecard';
import GrowthInflation   from './components/GrowthInflation';
import CentralBankRates  from './components/CentralBankRates';
import DebtMonitor       from './components/DebtMonitor';
import './GlobalMacroMarket.css';

const SUB_TABS = [
  { id: 'scorecard',     label: 'Scorecard'           },
  { id: 'growth',        label: 'Growth & Inflation'  },
  { id: 'central-banks', label: 'Central Bank Rates'  },
  { id: 'debt',          label: 'Debt Monitor'        },
];

export default function GlobalMacroMarket() {
  const [activeTab, setActiveTab] = useState('scorecard');
  const { scorecardData, growthInflationData, centralBankData, debtData, isLive, lastUpdated, isLoading } = useGlobalMacroData();

  if (isLoading) {
    return (
      <div className="mac-market mac-loading">
        <div className="mac-loading-spinner" />
        <span className="mac-loading-text">Loading macro data…</span>
      </div>
    );
  }

  return (
    <div className="mac-market">
      <div className="mac-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`mac-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mac-status-bar">
        <span className={isLive ? 'mac-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="mac-content">
        {activeTab === 'scorecard'     && <MacroScorecard   scorecardData={scorecardData} />}
        {activeTab === 'growth'        && <GrowthInflation  growthInflationData={growthInflationData} />}
        {activeTab === 'central-banks' && <CentralBankRates centralBankData={centralBankData} />}
        {activeTab === 'debt'          && <DebtMonitor      debtData={debtData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write GlobalMacroMarket.css**

```css
/* src/markets/globalMacro/GlobalMacroMarket.css */
.mac-market {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
  background: #0a0f1a;
}
.mac-sub-tabs {
  display: flex;
  align-items: center;
  background: #0d1117;
  border-bottom: 1px solid #1e293b;
  padding: 0 16px;
  height: 38px;
  flex-shrink: 0;
}
.mac-sub-tab {
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
.mac-sub-tab:hover  { color: #94a3b8; }
.mac-sub-tab.active { color: #14b8a6; border-bottom-color: #14b8a6; }
.mac-status-bar {
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
.mac-status-live { color: #14b8a6; }
.mac-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.mac-loading {
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.mac-loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #1e293b;
  border-top-color: #14b8a6;
  border-radius: 50%;
  animation: mac-spin 0.7s linear infinite;
}
@keyframes mac-spin {
  to { transform: rotate(360deg); }
}
.mac-loading-text { font-size: 12px; color: #64748b; }
```

Note: MacroScorecard, GrowthInflation, CentralBankRates, DebtMonitor don't exist yet — create stub files so JSX imports resolve:

```javascript
// src/markets/globalMacro/components/MacroScorecard.jsx
export default function MacroScorecard() { return null; }
```

```javascript
// src/markets/globalMacro/components/GrowthInflation.jsx
export default function GrowthInflation() { return null; }
```

```javascript
// src/markets/globalMacro/components/CentralBankRates.jsx
export default function CentralBankRates() { return null; }
```

```javascript
// src/markets/globalMacro/components/DebtMonitor.jsx
export default function DebtMonitor() { return null; }
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/globalMacro/GlobalMacroMarket.test.jsx 2>&1 | tail -6`
Expected: `6 passed (6)`

- [ ] **Step 6: Commit**

```bash
git add src/markets/globalMacro/GlobalMacroMarket.jsx src/markets/globalMacro/GlobalMacroMarket.css \
  src/markets/globalMacro/components/MacroScorecard.jsx \
  src/markets/globalMacro/components/GrowthInflation.jsx \
  src/markets/globalMacro/components/CentralBankRates.jsx \
  src/markets/globalMacro/components/DebtMonitor.jsx \
  src/__tests__/globalMacro/GlobalMacroMarket.test.jsx
git commit -m "feat(globalMacro): root component, CSS, loading spinner + 6 tests"
```

---

## Task 4: MacroScorecard + CSS + Tests

**Files:**
- Modify: `src/markets/globalMacro/components/MacroScorecard.jsx` (replace stub)
- Create: `src/markets/globalMacro/components/MacroComponents.css`
- Create: `src/__tests__/globalMacro/MacroScorecard.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/globalMacro/MacroScorecard.test.jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MacroScorecard from '../../markets/globalMacro/components/MacroScorecard';
import { scorecardData } from '../../markets/globalMacro/data/mockGlobalMacroData';

describe('MacroScorecard', () => {
  it('renders panel title', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    expect(screen.getByText(/macro scorecard/i)).toBeInTheDocument();
  });

  it('renders all 5 column headers', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    expect(screen.getByText(/gdp/i)).toBeInTheDocument();
    expect(screen.getByText(/cpi/i)).toBeInTheDocument();
    expect(screen.getByText(/policy rate/i)).toBeInTheDocument();
    expect(screen.getByText(/unemp/i)).toBeInTheDocument();
    expect(screen.getByText(/debt/i)).toBeInTheDocument();
  });

  it('renders all 12 country names', () => {
    render(<MacroScorecard scorecardData={scorecardData} />);
    ['United States','Euro Area','United Kingdom','Japan','Canada',
     'China','India','Brazil','South Korea','Australia','Mexico','Sweden'].forEach(name => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('applies mac-heat-dg to India GDP (8.2 > 3)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dg').length).toBeGreaterThan(0);
  });

  it('applies mac-heat-dr to UK CPI (6.7 > 6)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dr').length).toBeGreaterThan(0);
  });

  it('applies mac-heat-dr to Japan debt (261.3 > 120)', () => {
    const { container } = render(<MacroScorecard scorecardData={scorecardData} />);
    expect(container.querySelectorAll('.mac-heat-dr').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/globalMacro/MacroScorecard.test.jsx 2>&1 | tail -8`
Expected: FAIL (stub renders null)

- [ ] **Step 3: Write MacroComponents.css**

```css
/* src/markets/globalMacro/components/MacroComponents.css */
.mac-panel {
  display: flex;
  flex-direction: column;
  flex: 1;
  padding: 20px;
  overflow: hidden;
}
.mac-panel-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 16px;
  flex-shrink: 0;
}
.mac-panel-title    { font-size: 16px; font-weight: 600; color: #e2e8f0; }
.mac-panel-subtitle { font-size: 11px; color: #64748b; flex: 1; }
.mac-panel-footer   { margin-top: 12px; font-size: 10px; color: #475569; flex-shrink: 0; }
.mac-scroll         { overflow: auto; flex: 1; }
.mac-chart-wrap     { flex: 1; min-height: 0; }

/* Shared table */
.mac-table { border-collapse: collapse; min-width: 100%; }
.mac-th {
  background: #1e293b;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  white-space: nowrap;
}
.mac-th:first-child { text-align: left; }
.mac-row:hover { background: #1e293b; }
.mac-cell {
  padding: 8px 12px;
  border: 1px solid #0f172a;
  text-align: right;
  font-size: 12px;
  color: #cbd5e1;
  white-space: nowrap;
}
.mac-cell:first-child { text-align: left; font-weight: 600; color: #e2e8f0; }

/* Heat cell colors */
.mac-heat-dg  { background: #14532d; color: #86efac; }
.mac-heat-lg  { background: #1a3a28; color: #4ade80; }
.mac-heat-neu { background: #1e293b; color: #94a3b8; }
.mac-heat-lr  { background: #3b1a1a; color: #f87171; }
.mac-heat-dr  { background: #7f1d1d; color: #fca5a5; }

/* Two-column side-by-side chart layout */
.mac-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}
.mac-chart-panel {
  display: flex;
  flex-direction: column;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
}
.mac-chart-title {
  font-size: 12px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 4px;
  flex-shrink: 0;
}
.mac-chart-subtitle {
  font-size: 10px;
  color: #475569;
  margin-bottom: 8px;
  flex-shrink: 0;
}

/* Stacked layout for CentralBankRates */
.mac-two-row {
  display: grid;
  grid-template-rows: 1fr 1fr;
  gap: 16px;
  flex: 1;
  overflow: hidden;
}
```

- [ ] **Step 4: Write MacroScorecard.jsx**

```jsx
// src/markets/globalMacro/components/MacroScorecard.jsx
import React from 'react';
import './MacroComponents.css';

function gdpHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v > 3)    return 'mac-heat-dg';
  if (v > 1)    return 'mac-heat-lg';
  if (v >= 0)   return 'mac-heat-neu';
  if (v >= -1)  return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function cpiHeat(v) {
  if (v == null)        return 'mac-heat-neu';
  if (v < 0 || v > 6)  return 'mac-heat-dr';
  if (v > 4)            return 'mac-heat-lr';
  if (v > 3)            return 'mac-heat-neu';
  if (v > 2)            return 'mac-heat-lg';
  if (v >= 1)           return 'mac-heat-dg';
  return 'mac-heat-neu'; // 0–1%: below target
}

function rateHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 1)    return 'mac-heat-dg';
  if (v < 3)    return 'mac-heat-lg';
  if (v < 5)    return 'mac-heat-neu';
  if (v < 8)    return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function unempHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 4)    return 'mac-heat-dg';
  if (v < 6)    return 'mac-heat-lg';
  if (v < 8)    return 'mac-heat-neu';
  if (v < 10)   return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function debtHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 40)   return 'mac-heat-dg';
  if (v < 60)   return 'mac-heat-lg';
  if (v < 90)   return 'mac-heat-neu';
  if (v < 120)  return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function fmt1(v) { return v != null ? v.toFixed(1) + '%' : '—'; }
function fmtRate(v) { return v != null ? v.toFixed(2) + '%' : '—'; }

export default function MacroScorecard({ scorecardData = [] }) {
  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Macro Scorecard</span>
        <span className="mac-panel-subtitle">12 countries · latest annual data · World Bank + central banks</span>
      </div>
      <div className="mac-scroll">
        <table className="mac-table">
          <thead>
            <tr>
              <th className="mac-th" style={{ textAlign: 'left' }}>Country</th>
              <th className="mac-th">GDP Growth%</th>
              <th className="mac-th">CPI Inflation%</th>
              <th className="mac-th">Policy Rate</th>
              <th className="mac-th">Unemp%</th>
              <th className="mac-th">Debt/GDP%</th>
            </tr>
          </thead>
          <tbody>
            {scorecardData.map(c => (
              <tr key={c.code} className="mac-row">
                <td className="mac-cell">{c.flag} {c.name}</td>
                <td className={`mac-cell ${gdpHeat(c.gdp)}`}  style={{ fontWeight: 500 }}>{fmt1(c.gdp)}</td>
                <td className={`mac-cell ${cpiHeat(c.cpi)}`}  style={{ fontWeight: 500 }}>{fmt1(c.cpi)}</td>
                <td className={`mac-cell ${rateHeat(c.rate)}`} style={{ fontWeight: 500 }}>{fmtRate(c.rate)}</td>
                <td className={`mac-cell ${unempHeat(c.unemp)}`} style={{ fontWeight: 500 }}>{fmt1(c.unemp)}</td>
                <td className={`mac-cell ${debtHeat(c.debt)}`}  style={{ fontWeight: 500 }}>{fmt1(c.debt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mac-panel-footer">
        Color: green = favorable · red = concerning · thresholds per IMF/Maastricht guidelines
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/globalMacro/MacroScorecard.test.jsx 2>&1 | tail -6`
Expected: `6 passed (6)`

- [ ] **Step 6: Commit**

```bash
git add src/markets/globalMacro/components/MacroScorecard.jsx \
  src/markets/globalMacro/components/MacroComponents.css \
  src/__tests__/globalMacro/MacroScorecard.test.jsx
git commit -m "feat(globalMacro): MacroScorecard heat table + CSS + 6 tests"
```

---

## Task 5: GrowthInflation + Tests

**Files:**
- Modify: `src/markets/globalMacro/components/GrowthInflation.jsx` (replace stub)
- Create: `src/__tests__/globalMacro/GrowthInflation.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/globalMacro/GrowthInflation.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import GrowthInflation from '../../markets/globalMacro/components/GrowthInflation';
import { growthInflationData } from '../../markets/globalMacro/data/mockGlobalMacroData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('GrowthInflation', () => {
  it('renders panel title', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/growth & inflation/i)).toBeInTheDocument();
  });

  it('renders year in subtitle', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/2023/)).toBeInTheDocument();
  });

  it('renders GDP chart panel title', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/gdp growth/i)).toBeInTheDocument();
  });

  it('renders CPI chart panel title', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getByText(/cpi inflation/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<GrowthInflation growthInflationData={growthInflationData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/globalMacro/GrowthInflation.test.jsx 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write GrowthInflation.jsx**

```jsx
// src/markets/globalMacro/components/GrowthInflation.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './MacroComponents.css';

function buildGdpOption(countries) {
  const sorted = [...countries].sort((a, b) => b.gdp - a.gdp);
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.name}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.gdp,
        itemStyle: { color: c.gdp >= 0 ? '#14b8a6' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed' },
        label: { show: false },
      },
    }],
  };
}

function buildCpiOption(countries) {
  const sorted = [...countries].sort((a, b) => b.cpi - a.cpi);
  const barColor = (v) => {
    if (v < 0 || v > 5) return '#ef4444';
    if (v > 3)          return '#f59e0b';
    return '#14b8a6';
  };
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}%`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.name}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.cpi,
        itemStyle: { color: barColor(c.cpi) },
      })),
      markLine: {
        data: [{ xAxis: 2 }],
        symbol: 'none',
        lineStyle: { color: '#14b8a6', type: 'dashed', width: 1 },
        label: { show: true, formatter: '2% target', color: '#14b8a6', fontSize: 9 },
      },
    }],
  };
}

export default function GrowthInflation({ growthInflationData }) {
  if (!growthInflationData) return null;
  const { year = '', countries = [] } = growthInflationData;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Growth &amp; Inflation</span>
        <span className="mac-panel-subtitle">{year} annual data — World Bank</span>
      </div>
      <div className="mac-two-col">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">GDP Growth (%)</div>
          <div className="mac-chart-subtitle">Ranked highest to lowest · teal = positive · red = contraction</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildGdpOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">CPI Inflation (%)</div>
          <div className="mac-chart-subtitle">Ranked highest to lowest · teal = on target (1–3%) · amber = elevated · red = high</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildCpiOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/globalMacro/GrowthInflation.test.jsx 2>&1 | tail -6`
Expected: `5 passed (5)`

- [ ] **Step 5: Commit**

```bash
git add src/markets/globalMacro/components/GrowthInflation.jsx \
  src/__tests__/globalMacro/GrowthInflation.test.jsx
git commit -m "feat(globalMacro): GrowthInflation dual bar charts + 5 tests"
```

---

## Task 6: CentralBankRates + Tests

**Files:**
- Modify: `src/markets/globalMacro/components/CentralBankRates.jsx` (replace stub)
- Create: `src/__tests__/globalMacro/CentralBankRates.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/globalMacro/CentralBankRates.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CentralBankRates from '../../markets/globalMacro/components/CentralBankRates';
import { centralBankData } from '../../markets/globalMacro/data/mockGlobalMacroData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('CentralBankRates', () => {
  it('renders panel title', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getByText(/policy rates/i)).toBeInTheDocument();
  });

  it('renders current rates panel title', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getByText(/current rates/i)).toBeInTheDocument();
  });

  it('renders rate history panel title', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getByText(/5-year history/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<CentralBankRates centralBankData={centralBankData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null centralBankData gracefully', () => {
    expect(() => render(<CentralBankRates centralBankData={null} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/globalMacro/CentralBankRates.test.jsx 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write CentralBankRates.jsx**

```jsx
// src/markets/globalMacro/components/CentralBankRates.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './MacroComponents.css';

const HISTORY_COLORS = {
  US: '#14b8a6', EA: '#3b82f6', GB: '#a855f7',
  JP: '#f59e0b', CA: '#ef4444', AU: '#22c55e', SE: '#fb923c',
};

function barColor(rate) {
  if (rate == null) return '#475569';
  if (rate < 0)    return '#14b8a6';
  if (rate < 3)    return '#14b8a6';
  if (rate < 6)    return '#f59e0b';
  return '#ef4444';
}

function buildRankedOption(current) {
  const sorted = [...current].sort((a, b) => (b.rate ?? -99) - (a.rate ?? -99));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(2)}%`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.name}`),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.rate,
        itemStyle: { color: barColor(c.rate) },
      })),
    }],
  };
}

function buildHistoryOption(history) {
  const { dates = [], series = [] } = history;
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
    },
    legend: {
      data: series.map(s => s.name),
      textStyle: { color: '#64748b', fontSize: 9 },
      top: 0, right: 0,
      itemWidth: 12, itemHeight: 8,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 36, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: {
        color: '#64748b', fontSize: 9,
        interval: Math.floor(dates.length / 8),
        formatter: v => v ? v.slice(0, 7) : v,
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [
      ...series.map(s => ({
        name: s.name,
        type: 'line',
        data: s.values,
        symbol: 'none',
        smooth: false,
        lineStyle: { color: HISTORY_COLORS[s.code] || '#94a3b8', width: 1.5 },
        itemStyle: { color: HISTORY_COLORS[s.code] || '#94a3b8' },
      })),
      {
        name: 'Neutral',
        type: 'line',
        data: Array(dates.length).fill(2),
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        silent: true,
      },
    ],
  };
}

export default function CentralBankRates({ centralBankData }) {
  if (!centralBankData) return null;
  const { current = [], history = { dates: [], series: [] } } = centralBankData;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Policy Rates</span>
        <span className="mac-panel-subtitle">Current rates + 5-year history · FRED + central bank sources</span>
      </div>
      <div className="mac-two-row">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Current Rates — Ranked</div>
          <div className="mac-chart-subtitle">Highest to lowest · green &lt;3% · amber 3–6% · red &gt;6%</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildRankedOption(current)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">5-Year Rate History</div>
          <div className="mac-chart-subtitle">G7 + Australia + Sweden · dashed line = 2% neutral rate</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildHistoryOption(history)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/globalMacro/CentralBankRates.test.jsx 2>&1 | tail -6`
Expected: `5 passed (5)`

- [ ] **Step 5: Commit**

```bash
git add src/markets/globalMacro/components/CentralBankRates.jsx \
  src/__tests__/globalMacro/CentralBankRates.test.jsx
git commit -m "feat(globalMacro): CentralBankRates ranked + history charts + 5 tests"
```

---

## Task 7: DebtMonitor + Tests

**Files:**
- Modify: `src/markets/globalMacro/components/DebtMonitor.jsx` (replace stub)
- Create: `src/__tests__/globalMacro/DebtMonitor.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/globalMacro/DebtMonitor.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DebtMonitor from '../../markets/globalMacro/components/DebtMonitor';
import { debtData } from '../../markets/globalMacro/data/mockGlobalMacroData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('DebtMonitor', () => {
  it('renders panel title', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getByText(/debt monitor/i)).toBeInTheDocument();
  });

  it('renders government debt panel', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getByText(/government debt/i)).toBeInTheDocument();
  });

  it('renders current account panel', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getByText(/current account/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<DebtMonitor debtData={debtData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null debtData gracefully', () => {
    expect(() => render(<DebtMonitor debtData={null} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/globalMacro/DebtMonitor.test.jsx 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write DebtMonitor.jsx**

```jsx
// src/markets/globalMacro/components/DebtMonitor.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './MacroComponents.css';

function debtBarColor(v) {
  if (v < 60)  return '#14b8a6';
  if (v < 90)  return '#f59e0b';
  return '#ef4444';
}

function buildDebtOption(countries) {
  const sorted = [...countries].sort((a, b) => (b.debt ?? 0) - (a.debt ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}% of GDP`,
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.code}`),
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.debt,
        itemStyle: { color: debtBarColor(c.debt ?? 0) },
      })),
      markLine: {
        data: [{ yAxis: 60 }, { yAxis: 100 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: true, color: '#64748b', fontSize: 9 },
      },
    }],
  };
}

function buildCurrentAcctOption(countries) {
  const sorted = [...countries].sort((a, b) => (b.currentAccount ?? 0) - (a.currentAccount ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${params[0].value?.toFixed(1)}% of GDP`,
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: sorted.map(c => `${c.flag} ${c.code}`),
      axisLine: { lineStyle: { color: '#1e293b' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.currentAccount,
        itemStyle: { color: (c.currentAccount ?? 0) >= 0 ? '#14b8a6' : '#ef4444' },
      })),
      markLine: {
        data: [{ yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

export default function DebtMonitor({ debtData }) {
  if (!debtData) return null;
  const { year = '', countries = [] } = debtData;

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Debt Monitor</span>
        <span className="mac-panel-subtitle">{year} data — World Bank · Maastricht reference lines at 60% and 100%</span>
      </div>
      <div className="mac-two-col">
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Government Debt (% of GDP)</div>
          <div className="mac-chart-subtitle">Green &lt;60% · amber 60–90% · red &gt;90% (Maastricht criteria)</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildDebtOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="mac-chart-panel">
          <div className="mac-chart-title">Current Account Balance (% of GDP)</div>
          <div className="mac-chart-subtitle">Teal = surplus · red = deficit · sorted surplus to deficit</div>
          <div className="mac-chart-wrap">
            <ReactECharts option={buildCurrentAcctOption(countries)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
      <div className="mac-panel-footer">Source: World Bank · Annual data · Current account: positive = capital exporter</div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/globalMacro/DebtMonitor.test.jsx 2>&1 | tail -6`
Expected: `5 passed (5)`

- [ ] **Step 5: Commit**

```bash
git add src/markets/globalMacro/components/DebtMonitor.jsx \
  src/__tests__/globalMacro/DebtMonitor.test.jsx
git commit -m "feat(globalMacro): DebtMonitor debt + current account charts + 5 tests"
```

---

## Task 8: Server Endpoint

**Files:**
- Modify: `server/index.js` — append globalMacro block after the commodities endpoint (after line ~1195)

- [ ] **Step 1: Write a smoke test for the endpoint shape**

Add this to `src/__tests__/globalMacro/useGlobalMacroData.test.js` (append to existing file):

```javascript
  it('guard: does not apply live data when scorecardData length < 8', async () => {
    const liveData = {
      scorecardData: [{ code: 'US', name: 'United States', flag: '🇺🇸', region: 'G7', gdp: 2.8, cpi: 3.2, rate: 5.25, unemp: 3.7, debt: 122.0 }],
      growthInflationData: { year: 2023, countries: [] },
      centralBankData: { current: [], history: { dates: [], series: [] } },
      debtData: { year: 2023, countries: [] },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useGlobalMacroData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // scorecardData guard (< 8) prevents replacement — should keep 12-country mock
    expect(result.current.scorecardData).toHaveLength(12);
    expect(result.current.isLive).toBe(true); // fetch succeeded even if guards blocked
  });
```

Run: `npx vitest run src/__tests__/globalMacro/useGlobalMacroData.test.js 2>&1 | tail -6`
Expected: `7 passed (7)`

- [ ] **Step 2: Add the server endpoint**

In `server/index.js`, after the commodities block (after `// --- Commodities Market Data ---` section, around line 1195), add:

```javascript
// --- Global Macro Market Data ---
const MACRO_COUNTRIES = [
  { code: 'US', wbCode: 'US', name: 'United States',  flag: '🇺🇸', region: 'G7'       },
  { code: 'EA', wbCode: 'XC', name: 'Euro Area',      flag: '🇪🇺', region: 'G7'       },
  { code: 'GB', wbCode: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'G7'       },
  { code: 'JP', wbCode: 'JP', name: 'Japan',          flag: '🇯🇵', region: 'G7'       },
  { code: 'CA', wbCode: 'CA', name: 'Canada',         flag: '🇨🇦', region: 'G7'       },
  { code: 'CN', wbCode: 'CN', name: 'China',          flag: '🇨🇳', region: 'EM'       },
  { code: 'IN', wbCode: 'IN', name: 'India',          flag: '🇮🇳', region: 'EM'       },
  { code: 'BR', wbCode: 'BR', name: 'Brazil',         flag: '🇧🇷', region: 'EM'       },
  { code: 'KR', wbCode: 'KR', name: 'South Korea',   flag: '🇰🇷', region: 'EM'       },
  { code: 'AU', wbCode: 'AU', name: 'Australia',      flag: '🇦🇺', region: 'Advanced' },
  { code: 'MX', wbCode: 'MX', name: 'Mexico',         flag: '🇲🇽', region: 'EM'       },
  { code: 'SE', wbCode: 'SE', name: 'Sweden',         flag: '🇸🇪', region: 'Advanced' },
];
const MACRO_WB_CODES = MACRO_COUNTRIES.map(c => c.wbCode).join(';');

const MACRO_FRED_RATES = {
  US: { id: 'FEDFUNDS',         name: 'United States',  flag: '🇺🇸', bank: 'Fed'      },
  EA: { id: 'ECBDFR',           name: 'Euro Area',      flag: '🇪🇺', bank: 'ECB'      },
  GB: { id: 'IRSTCB01GBM156N',  name: 'United Kingdom', flag: '🇬🇧', bank: 'BoE'      },
  JP: { id: 'IRSTCB01JPM156N',  name: 'Japan',          flag: '🇯🇵', bank: 'BoJ'      },
  CA: { id: 'IRSTCB01CAM156N',  name: 'Canada',         flag: '🇨🇦', bank: 'BoC'      },
  AU: { id: 'IRSTCB01AUM156N',  name: 'Australia',      flag: '🇦🇺', bank: 'RBA'      },
  SE: { id: 'IRSTCB01SEM156N',  name: 'Sweden',         flag: '🇸🇪', bank: 'Riksbank' },
};

const MACRO_MOCK_RATES = {
  CN: { rate:  3.45, name: 'China',       flag: '🇨🇳', bank: 'PBoC'    },
  IN: { rate:  6.50, name: 'India',       flag: '🇮🇳', bank: 'RBI'     },
  BR: { rate: 10.50, name: 'Brazil',      flag: '🇧🇷', bank: 'BCB'     },
  KR: { rate:  3.50, name: 'South Korea', flag: '🇰🇷', bank: 'BoK'     },
  MX: { rate: 11.00, name: 'Mexico',      flag: '🇲🇽', bank: 'Banxico' },
};

async function fetchWBIndicator(indicator) {
  const url = `https://api.worldbank.org/v2/country/${MACRO_WB_CODES}/indicator/${indicator}?format=json&mrv=8&per_page=200`;
  const json = await fetchJSON(url);
  const rows = Array.isArray(json) && json[1] ? json[1] : [];
  const result = { values: {}, year: null };
  for (const row of rows) {
    const cc = row.country?.id;
    if (!cc || row.value == null) continue;
    if (!result.values[cc]) {
      result.values[cc] = Math.round(row.value * 10) / 10;
      if (!result.year) result.year = parseInt(row.date, 10);
    }
  }
  return result;
}

async function fetchFredLatestRate(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=1`;
  const data = await fetchJSON(url);
  const obs = (data?.observations || []).find(o => o.value !== '.');
  return obs ? Math.round(parseFloat(obs.value) * 100) / 100 : null;
}

async function fetchFredRateHistory5yr(seriesId) {
  const start = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 5); return d.toISOString().split('T')[0]; })();
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=${start}&frequency=m`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date.slice(0, 7), value: Math.round(parseFloat(o.value) * 100) / 100 }));
}

app.get('/api/globalMacro', async (req, res) => {
  const cacheKey = 'globalMacro_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // 1. World Bank indicators (5 requests in parallel, each with silent catch)
    const [gdpRes, cpiRes, unempRes, debtRes, caRes] = await Promise.all([
      fetchWBIndicator('NY.GDP.MKTP.KD.ZG').catch(() => ({ values: {}, year: null })),
      fetchWBIndicator('FP.CPI.TOTL.ZG').catch(()    => ({ values: {}, year: null })),
      fetchWBIndicator('SL.UEM.TOTL.ZS').catch(()    => ({ values: {}, year: null })),
      fetchWBIndicator('GC.DOB.TOTL.GD.ZS').catch(() => ({ values: {}, year: null })),
      fetchWBIndicator('BN.CAB.XOKA.GD.ZS').catch(() => ({ values: {}, year: null })),
    ]);
    const wbYear = gdpRes.year || cpiRes.year || new Date().getFullYear() - 2;

    // 2. FRED current rates for 7 countries
    const fredCurrentMap = {};
    if (FRED_API_KEY) {
      const fredResults = await Promise.allSettled(
        Object.entries(MACRO_FRED_RATES).map(async ([code, meta]) => ({
          code, rate: await fetchFredLatestRate(meta.id).catch(() => null),
        }))
      );
      fredResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value.rate != null) fredCurrentMap[r.value.code] = r.value.rate;
      });
    }

    // 3. FRED 5-year rate histories for 7 countries
    const fredHistoryMap = {};
    if (FRED_API_KEY) {
      const histResults = await Promise.allSettled(
        Object.entries(MACRO_FRED_RATES).map(async ([code, meta]) => ({
          code, meta,
          obs: await fetchFredRateHistory5yr(meta.id).catch(() => []),
        }))
      );
      histResults.forEach(r => {
        if (r.status === 'fulfilled' && r.value.obs.length >= 2) fredHistoryMap[r.value.code] = r.value;
      });
    }

    // 4. Build scorecardData
    const scorecardData = MACRO_COUNTRIES.map(c => {
      const rate = fredCurrentMap[c.code] ?? MACRO_MOCK_RATES[c.code]?.rate ?? null;
      return {
        code:   c.code,
        name:   c.name,
        flag:   c.flag,
        region: c.region,
        gdp:    gdpRes.values[c.wbCode]   ?? null,
        cpi:    cpiRes.values[c.wbCode]   ?? null,
        rate:   rate,
        unemp:  unempRes.values[c.wbCode] ?? null,
        debt:   debtRes.values[c.wbCode]  ?? null,
      };
    });

    // 5. Build growthInflationData
    const growthInflationData = {
      year: wbYear,
      countries: MACRO_COUNTRIES.map(c => ({
        code: c.code, name: c.name, flag: c.flag,
        gdp: gdpRes.values[c.wbCode] ?? null,
        cpi: cpiRes.values[c.wbCode] ?? null,
      })),
    };

    // 6. Build centralBankData
    const allCurrentRates = MACRO_COUNTRIES.map(c => {
      const fredMeta = MACRO_FRED_RATES[c.code];
      const mockMeta = MACRO_MOCK_RATES[c.code];
      const rate   = fredCurrentMap[c.code] ?? mockMeta?.rate ?? null;
      const isLive = fredMeta ? (fredCurrentMap[c.code] != null) : false;
      return { code: c.code, name: c.name, flag: c.flag, rate, bank: fredMeta?.bank ?? mockMeta?.bank ?? '', isLive };
    });

    // Align history dates across all FRED series
    const allDates = new Set();
    Object.values(fredHistoryMap).forEach(({ obs }) => obs.forEach(o => allDates.add(o.date)));
    const sortedDates = [...allDates].sort();
    const histSeries = Object.entries(fredHistoryMap).map(([code, { meta, obs }]) => {
      const obsMap = Object.fromEntries(obs.map(o => [o.date, o.value]));
      return {
        code,
        name:   meta.name,
        flag:   meta.flag,
        values: sortedDates.map(d => obsMap[d] ?? null),
      };
    });

    const centralBankData = {
      current: allCurrentRates,
      history: { dates: sortedDates, series: histSeries },
    };

    // 7. Build debtData
    const debtData = {
      year: wbYear,
      countries: MACRO_COUNTRIES.map(c => ({
        code:           c.code,
        name:           c.name,
        flag:           c.flag,
        debt:           debtRes.values[c.wbCode] ?? null,
        currentAccount: caRes.values[c.wbCode]   ?? null,
      })),
    };

    const result = {
      scorecardData,
      growthInflationData,
      centralBankData,
      debtData,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, 3600);
    res.json(result);
  } catch (error) {
    console.error('GlobalMacro API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 3: Run full test suite to verify no regressions**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -6`
Expected: all previously passing tests still pass + 7 globalMacro hook tests

- [ ] **Step 4: Commit**

```bash
git add server/index.js src/__tests__/globalMacro/useGlobalMacroData.test.js
git commit -m "feat(globalMacro): /api/globalMacro endpoint — World Bank + FRED + guard test"
```

---

## Task 9: Hub Wiring

**Files:**
- Modify: `src/hub/markets.config.js`
- Modify: `src/hub/HubLayout.jsx`

- [ ] **Step 1: Add globalMacro to markets config**

In `src/hub/markets.config.js`, add to the `MARKETS` array after `commodities`:

```javascript
{ id: 'globalMacro', label: 'Macro', icon: '🌐' }
```

Full file after edit:

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
  { id: 'globalMacro', label: 'Macro',       icon: '🌐' },
];

export const DEFAULT_MARKET = 'equities';
```

- [ ] **Step 2: Wire GlobalMacroMarket into HubLayout**

In `src/hub/HubLayout.jsx`, add the import after the CommoditiesMarket import:

```javascript
import GlobalMacroMarket from '../markets/globalMacro/GlobalMacroMarket';
```

Add to `MARKET_COMPONENTS`:

```javascript
globalMacro: GlobalMacroMarket,
```

Full file after edit:

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
import GlobalMacroMarket from '../markets/globalMacro/GlobalMacroMarket';

const MARKET_COMPONENTS = {
  equities:    EquitiesMarket,
  bonds:       BondsMarket,
  fx:          FXMarket,
  derivatives: DerivativesMarket,
  realEstate:  RealEstateMarket,
  insurance:   InsuranceMarket,
  commodities: CommoditiesMarket,
  globalMacro: GlobalMacroMarket,
};

export default function HubLayout() {
  const [activeMarket, setActiveMarket]   = useState(DEFAULT_MARKET);
  const [currency, setCurrency]           = useState('USD');
  const [snapshotDate, setSnapshotDate]   = useState(null);

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

- [ ] **Step 3: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1 | tail -6`
Expected: all tests pass (at least 265+ with ~32 new globalMacro tests)

- [ ] **Step 4: Commit**

```bash
git add src/hub/markets.config.js src/hub/HubLayout.jsx
git commit -m "feat(globalMacro): wire Macro tab into hub — markets.config + HubLayout"
```
