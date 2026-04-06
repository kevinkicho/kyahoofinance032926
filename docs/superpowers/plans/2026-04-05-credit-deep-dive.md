# Credit Deep-Dive (Sub-project 11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Credit Deep-Dive 🏦 market tab with 4 sub-views covering IG/HY spreads, EM sovereign bonds, the leveraged loan / CLO market, and default-rate monitoring.

**Architecture:** Follows the exact same pattern as all 10 existing market tabs — mock data → hook (anyReplaced) → root component → 4 panel components — with a new Express endpoint `/api/credit` that reuses the already-defined `fetchFredLatest` / `fetchFredHistory` helpers and `yf.quote` for ETF proxies. Cyan `#06b6d4` accent, `credit-` CSS prefix.

**Tech Stack:** React 18, ECharts (echarts-for-react), Express, node-cache, daily file cache, FRED API (key from env), yahoo-finance2

---

## File Map

**Create:**
- `src/markets/credit/data/mockCreditData.js`
- `src/markets/credit/data/useCreditData.js`
- `src/markets/credit/CreditMarket.jsx`
- `src/markets/credit/CreditMarket.css`
- `src/markets/credit/components/CreditComponents.css`
- `src/markets/credit/components/IgHyDashboard.jsx`
- `src/markets/credit/components/EmBonds.jsx`
- `src/markets/credit/components/LoanMarket.jsx`
- `src/markets/credit/components/DefaultWatch.jsx`
- `src/__tests__/credit/useCreditData.test.js`

**Modify:**
- `server/index.js` — add `/api/credit` endpoint + add `'credit'` to `CACHEABLE_MARKETS`
- `src/hub/markets.config.js` — add `{ id: 'credit', label: 'Credit', icon: '🏦' }`
- `src/hub/HubLayout.jsx` — import CreditMarket, add to MARKET_COMPONENTS
- `vite.config.js` — add `/api/credit` proxy

---

## Task 1: Mock Data

**Files:**
- Create: `src/markets/credit/data/mockCreditData.js`

- [ ] **Step 1: Write the mock data file**

```js
// src/markets/credit/data/mockCreditData.js

export const spreadData = {
  current: {
    igSpread:  98,   // bps BAMLC0A0CM
    hySpread:  342,  // bps BAMLH0A0HYM2
    emSpread:  285,  // bps BAMLEMCBPIOAS
    bbbSpread: 138,  // bps BAMLC0A4CBBB
    cccSpread: 842,  // bps BAMLH0A3HYC
  },
  history: {
    dates: ['Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
    IG:  [ 92, 94, 96, 98,102, 99, 97, 95, 96, 98,100, 98],
    HY:  [312,318,324,330,358,345,338,332,336,340,348,342],
    EM:  [262,268,274,278,298,292,286,280,284,288,292,285],
    BBB: [128,130,132,135,142,139,136,133,135,137,140,138],
  },
  etfs: [
    { ticker: 'LQD',  name: 'iShares IG Corp Bond',  price: 107.42, change1d: -0.18, yieldPct: 5.18, durationYr: 8.4 },
    { ticker: 'HYG',  name: 'iShares HY Corp Bond',  price:  78.24, change1d:  0.12, yieldPct: 7.82, durationYr: 3.6 },
    { ticker: 'EMB',  name: 'iShares EM USD Bond',   price:  88.64, change1d: -0.24, yieldPct: 7.14, durationYr: 7.2 },
    { ticker: 'JNK',  name: 'SPDR HY Bond',          price:  94.18, change1d:  0.08, yieldPct: 7.94, durationYr: 3.4 },
    { ticker: 'BKLN', name: 'Invesco Sr Loan ETF',   price:  21.84, change1d:  0.02, yieldPct: 8.64, durationYr: 0.4 },
    { ticker: 'MUB',  name: 'iShares Natl Muni Bond', price: 106.82, change1d: -0.08, yieldPct: 3.42, durationYr: 6.8 },
  ],
};

export const emBondData = {
  countries: [
    { country: 'Brazil',       code: 'BZ', spread: 210, rating: 'BB',  change1m:  -8, yld10y: 7.2, debtGdp:  88 },
    { country: 'Mexico',       code: 'MX', spread: 180, rating: 'BBB', change1m: -12, yld10y: 6.8, debtGdp:  54 },
    { country: 'Indonesia',    code: 'ID', spread: 165, rating: 'BBB', change1m:  -6, yld10y: 6.5, debtGdp:  39 },
    { country: 'South Africa', code: 'ZA', spread: 285, rating: 'BB',  change1m:   4, yld10y: 9.8, debtGdp:  74 },
    { country: 'India',        code: 'IN', spread: 142, rating: 'BBB', change1m:  -4, yld10y: 7.0, debtGdp:  84 },
    { country: 'Turkey',       code: 'TR', spread: 342, rating: 'B+',  change1m:  18, yld10y:12.4, debtGdp:  32 },
    { country: 'Philippines',  code: 'PH', spread: 128, rating: 'BBB', change1m:  -8, yld10y: 5.8, debtGdp:  58 },
    { country: 'Colombia',     code: 'CO', spread: 248, rating: 'BB+', change1m:   6, yld10y: 8.4, debtGdp:  58 },
    { country: 'Egypt',        code: 'EG', spread: 624, rating: 'B-',  change1m: -22, yld10y:18.2, debtGdp:  96 },
    { country: 'Nigeria',      code: 'NG', spread: 512, rating: 'B-',  change1m:  14, yld10y:15.8, debtGdp:  38 },
    { country: 'Saudi Arabia', code: 'SA', spread:  68, rating: 'A+',  change1m:  -2, yld10y: 4.6, debtGdp:  26 },
    { country: 'Chile',        code: 'CL', spread:  98, rating: 'A',   change1m:  -4, yld10y: 5.2, debtGdp:  40 },
  ],
  regions: [
    { region: 'Latin America', avgSpread: 184, change1m:  -3 },
    { region: 'Asia EM',       avgSpread: 145, change1m:  -6 },
    { region: 'EMEA',          avgSpread: 248, change1m:   8 },
    { region: 'Frontier',      avgSpread: 568, change1m:  -4 },
  ],
};

export const loanData = {
  cloTranches: [
    { tranche: 'AAA', spread: 145, yield: 6.82, rating: 'AAA', ltv: 65 },
    { tranche: 'AA',  spread: 210, yield: 7.47, rating: 'AA',  ltv: 72 },
    { tranche: 'A',   spread: 290, yield: 8.27, rating: 'A',   ltv: 78 },
    { tranche: 'BBB', spread: 420, yield: 9.57, rating: 'BBB', ltv: 83 },
    { tranche: 'BB',  spread: 720, yield:12.07, rating: 'BB',  ltv: 89 },
    { tranche: 'B',   spread:1050, yield:15.37, rating: 'B',   ltv: 94 },
    { tranche: 'Equity', spread: null, yield: 18.5, rating: 'NR', ltv: 100 },
  ],
  indices: [
    { name: 'BKLN NAV',                value: 21.84, change1d:  0.02, spread: 312 },
    { name: 'CS Lev Loan 100 Index',   value: 96.42, change1d:  0.08, spread: 318 },
    { name: 'LL New Issue Vol ($B YTD)',value: 142,   change1d: null,  spread: null },
    { name: 'Avg Loan Price',           value: 96.8,  change1d:  0.04, spread: null },
  ],
  priceHistory: {
    dates: ['Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
    bkln:  [21.42,   21.54,   21.68,   21.72,   21.78,   21.84],
  },
};

export const defaultData = {
  rates: [
    { category: 'HY Default Rate (TTM)',       value: 3.8, prev: 4.2, peak: 14.0, unit: '%' },
    { category: 'Loan Default Rate (TTM)',      value: 2.4, prev: 2.8, peak: 10.8, unit: '%' },
    { category: 'HY Distressed Ratio',         value: 8.2, prev: 9.1, peak: 42.0, unit: '%' },
    { category: 'Loans Trading <80c',          value: 5.1, prev: 5.8, peak: 28.0, unit: '%' },
    { category: 'CCC/Split-B % of HY Index',   value:12.4, prev:12.8, peak: 22.0, unit: '%' },
  ],
  chargeoffs: {
    dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
    commercial: [1.42, 1.38, 1.44, 1.52, 1.48, 1.44, 1.40, 1.36],
    consumer:   [3.84, 3.92, 4.08, 4.22, 4.18, 4.10, 4.02, 3.94],
  },
  defaultHistory: {
    dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
    hy:   [4.8, 4.6, 4.4, 4.2, 4.0, 3.9, 3.8, 3.8],
    loan: [3.4, 3.2, 3.0, 2.8, 2.6, 2.5, 2.4, 2.4],
  },
};
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
git add src/markets/credit/data/mockCreditData.js
git commit -m "feat(credit): mock data for all 4 sub-views"
```

---

## Task 2: Hook

**Files:**
- Create: `src/markets/credit/data/useCreditData.js`

- [ ] **Step 1: Write the hook**

```js
// src/markets/credit/data/useCreditData.js
import { useState, useEffect } from 'react';
import {
  spreadData   as mockSpreadData,
  emBondData   as mockEmBondData,
  loanData     as mockLoanData,
  defaultData  as mockDefaultData,
} from './mockCreditData';

const SERVER = '';

export function useCreditData() {
  const [spreadData,  setSpreadData]  = useState(mockSpreadData);
  const [emBondData,  setEmBondData]  = useState(mockEmBondData);
  const [loanData,    setLoanData]    = useState(mockLoanData);
  const [defaultData, setDefaultData] = useState(mockDefaultData);
  const [isLive,      setIsLive]      = useState(false);
  const [lastUpdated, setLastUpdated] = useState('Mock data — 2026');
  const [isLoading,   setIsLoading]   = useState(true);
  const [fetchedOn,   setFetchedOn]   = useState(null);
  const [isCurrent,   setIsCurrent]   = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/credit`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.spreadData?.history?.dates?.length >= 6)  { setSpreadData(data.spreadData);   anyReplaced = true; }
        if (data.emBondData?.countries?.length >= 5)        { setEmBondData(data.emBondData);   anyReplaced = true; }
        if (data.loanData?.cloTranches?.length >= 4)        { setLoanData(data.loanData);       anyReplaced = true; }
        if (data.defaultData?.rates?.length >= 3)           { setDefaultData(data.defaultData); anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { spreadData, emBondData, loanData, defaultData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/credit/data/useCreditData.js
git commit -m "feat(credit): useCreditData hook with anyReplaced pattern"
```

---

## Task 3: Tests

**Files:**
- Create: `src/__tests__/credit/useCreditData.test.js`

- [ ] **Step 1: Write the test file**

```js
// src/__tests__/credit/useCreditData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreditData } from '../../markets/credit/data/useCreditData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCreditData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns spreadData with current spreads and 12-month history on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.spreadData.current).toMatchObject({
      igSpread:  expect.any(Number),
      hySpread:  expect.any(Number),
      emSpread:  expect.any(Number),
      bbbSpread: expect.any(Number),
      cccSpread: expect.any(Number),
    });
    expect(result.current.spreadData.history.dates).toHaveLength(12);
    expect(result.current.spreadData.etfs).toHaveLength(6);
  });

  it('returns emBondData with 12 countries and 4 regions on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.emBondData.countries).toHaveLength(12);
    expect(result.current.emBondData.regions).toHaveLength(4);
    expect(result.current.emBondData.countries[0]).toMatchObject({
      country: expect.any(String),
      spread:  expect.any(Number),
      rating:  expect.any(String),
    });
  });

  it('returns loanData with 7 CLO tranches on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loanData.cloTranches).toHaveLength(7);
    expect(result.current.loanData.cloTranches[0]).toMatchObject({
      tranche: expect.any(String),
      yield:   expect.any(Number),
    });
  });

  it('returns defaultData with rates and charge-off history on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.defaultData.rates.length).toBeGreaterThanOrEqual(3);
    expect(result.current.defaultData.chargeoffs.dates.length).toBeGreaterThan(0);
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true and replaces spreadData when server responds', async () => {
    const liveData = {
      spreadData: {
        current: { igSpread: 95, hySpread: 330, emSpread: 275, bbbSpread: 132, cccSpread: 820 },
        history: { dates: Array.from({length:8},(_,i)=>`M${i}`), IG: Array.from({length:8},()=>95), HY: Array.from({length:8},()=>330), EM: Array.from({length:8},()=>275), BBB: Array.from({length:8},()=>132) },
        etfs: Array.from({length:3},(_, i)=>({ ticker:`E${i}`, name:`ETF${i}`, price:100, change1d:0.1, yieldPct:5, durationYr:5 })),
      },
      emBondData: { countries: Array.from({length:6},(_, i)=>({ country:`C${i}`, code:`C${i}`, spread:200, rating:'BB', change1m:-5, yld10y:7, debtGdp:60 })), regions: [] },
      loanData: { cloTranches: Array.from({length:5},(_, i)=>({ tranche:`T${i}`, spread:200+i*100, yield:7+i, rating:'A', ltv:70+i })), indices: [], priceHistory: { dates: [], bkln: [] } },
      defaultData: { rates: Array.from({length:4},(_, i)=>({ category:`Cat${i}`, value:3, prev:4, peak:10, unit:'%' })), chargeoffs: { dates:[], commercial:[], consumer:[] }, defaultHistory: { dates:[], hy:[], loan:[] } },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.lastUpdated).toBe('2026-04-05');
    expect(result.current.spreadData.current.igSpread).toBe(95);
  });

  it('guard: does not apply spreadData when history.dates length < 6', async () => {
    const liveData = {
      spreadData: { current: { igSpread:95, hySpread:330, emSpread:275, bbbSpread:132, cccSpread:820 }, history: { dates: ['Jan','Feb'], IG:[95,95], HY:[330,330], EM:[275,275], BBB:[132,132] }, etfs: [] },
      emBondData: { countries: [], regions: [] },
      loanData: { cloTranches: [], indices: [], priceHistory: { dates:[], bkln:[] } },
      defaultData: { rates: [], chargeoffs: { dates:[], commercial:[], consumer:[] }, defaultHistory: { dates:[], hy:[], loan:[] } },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.spreadData.history.dates).toHaveLength(12);
    expect(result.current.isLive).toBe(false);
  });

  it('exposes fetchedOn and isCurrent', async () => {
    const liveData = {
      spreadData: { current: { igSpread:95, hySpread:330, emSpread:275, bbbSpread:132, cccSpread:820 }, history: { dates: Array.from({length:8},(_,i)=>`M${i}`), IG:Array.from({length:8},()=>95), HY:Array.from({length:8},()=>330), EM:Array.from({length:8},()=>275), BBB:Array.from({length:8},()=>132) }, etfs:[] },
      emBondData: { countries: Array.from({length:6},(_, i)=>({ country:`C${i}`, code:`C${i}`, spread:200, rating:'BB', change1m:0, yld10y:7, debtGdp:60 })), regions:[] },
      loanData: { cloTranches: Array.from({length:5},(_, i)=>({ tranche:`T${i}`, spread:200, yield:7, rating:'A', ltv:70 })), indices:[], priceHistory:{dates:[],bkln:[]} },
      defaultData: { rates: Array.from({length:4},(_, i)=>({ category:`C${i}`, value:3, prev:4, peak:10, unit:'%' })), chargeoffs:{dates:[],commercial:[],consumer:[]}, defaultHistory:{dates:[],hy:[],loan:[]} },
      fetchedOn: '2026-04-05', isCurrent: true,
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchedOn).toBe('2026-04-05');
    expect(result.current.isCurrent).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
npx vitest run src/__tests__/credit/useCreditData.test.js
```

Expected: 8 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/credit/useCreditData.test.js
git commit -m "test(credit): useCreditData hook tests — 8 passing"
```

---

## Task 4: Root Component + CSS

**Files:**
- Create: `src/markets/credit/CreditMarket.css`
- Create: `src/markets/credit/components/CreditComponents.css`
- Create: `src/markets/credit/CreditMarket.jsx`
- Create stub: `src/markets/credit/components/IgHyDashboard.jsx`
- Create stub: `src/markets/credit/components/EmBonds.jsx`
- Create stub: `src/markets/credit/components/LoanMarket.jsx`
- Create stub: `src/markets/credit/components/DefaultWatch.jsx`

- [ ] **Step 1: Write CreditMarket.css**

```css
/* src/markets/credit/CreditMarket.css */
.credit-market { display: flex; flex-direction: column; height: 100%; background: #0f172a; }
.credit-market.credit-loading { align-items: center; justify-content: center; gap: 12px; }
.credit-loading-spinner {
  width: 36px; height: 36px; border: 3px solid #1e293b;
  border-top-color: #06b6d4; border-radius: 50%;
}
.credit-loading-text { font-size: 12px; color: #64748b; }

.credit-sub-tabs {
  display: flex; gap: 2px; padding: 8px 12px 0;
  border-bottom: 1px solid #1e293b; background: #0f172a;
}
.credit-sub-tab {
  padding: 6px 14px; font-size: 12px; color: #64748b; background: none;
  border: none; border-bottom: 2px solid transparent; cursor: pointer;
}
.credit-sub-tab:hover { color: #e2e8f0; }
.credit-sub-tab.active { color: #06b6d4; border-bottom-color: #06b6d4; }

.credit-status-bar {
  display: flex; align-items: center; gap: 12px; padding: 4px 14px;
  font-size: 10px; color: #475569; border-bottom: 1px solid #1e293b;
}
.credit-status-live { color: #06b6d4; }
.credit-content { flex: 1; overflow: hidden; }

.credit-stale-badge {
  background: #164e63; color: #67e8f9; border: 1px solid #0e7490;
  border-radius: 10px; padding: 1px 8px; font-size: 10px; font-weight: 500;
}
```

- [ ] **Step 2: Write CreditComponents.css**

```css
/* src/markets/credit/components/CreditComponents.css */

.credit-panel { display: flex; flex-direction: column; height: 100%; background: #0f172a; overflow: hidden; }
.credit-panel-header { display: flex; align-items: center; gap: 12px; padding: 10px 14px 8px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.credit-panel-title { font-size: 13px; font-weight: 600; color: #e2e8f0; }
.credit-panel-subtitle { font-size: 10px; color: #64748b; }

.credit-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; flex: 1; background: #1e293b; overflow: hidden; }
.credit-two-row { display: grid; grid-template-rows: 1fr 1fr; gap: 1px; flex: 1; background: #1e293b; overflow: hidden; }
.credit-three-row { display: grid; grid-template-rows: auto 1fr 1fr; gap: 1px; flex: 1; background: #1e293b; overflow: hidden; }

.credit-chart-panel { display: flex; flex-direction: column; background: #0f172a; padding: 8px 12px 4px; overflow: hidden; }
.credit-chart-title { font-size: 11px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; flex-shrink: 0; }
.credit-chart-subtitle { font-size: 9px; color: #64748b; margin-bottom: 4px; flex-shrink: 0; }
.credit-chart-wrap { flex: 1; min-height: 0; }

.credit-scroll { flex: 1; min-height: 0; overflow-y: auto; }

.credit-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; }
.credit-th {
  padding: 4px 8px; text-align: right; font-size: 9px; color: #64748b;
  text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #1e293b;
  position: sticky; top: 0; z-index: 1; background: #0f172a; white-space: nowrap;
}
.credit-th:first-child, .credit-th:nth-child(2) { text-align: left; }
.credit-row { border-bottom: 1px solid #0f172a; }
.credit-row:hover { background: #1e293b; }
.credit-cell { padding: 4px 8px; color: #e2e8f0; text-align: right; }
.credit-cell:first-child, .credit-cell:nth-child(2) { text-align: left; }
.credit-muted { color: #64748b; font-size: 10px; }
.credit-num { font-family: monospace; }

.credit-pos { color: #34d399; }
.credit-neg { color: #f87171; }
.credit-neu { color: #94a3b8; }

.credit-stats-row { display: flex; gap: 6px; padding: 6px 12px; border-bottom: 1px solid #1e293b; flex-shrink: 0; flex-wrap: wrap; }
.credit-stat-pill { display: flex; flex-direction: column; align-items: center; background: #1e293b; border-radius: 6px; padding: 4px 10px; min-width: 80px; }
.credit-stat-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
.credit-stat-value { font-size: 12px; font-weight: 600; color: #e2e8f0; }
.credit-stat-value.cyan { color: #06b6d4; }
.credit-stat-value.green { color: #34d399; }
.credit-stat-value.red { color: #f87171; }

.credit-rating-badge {
  display: inline-block; font-size: 9px; font-weight: 700; padding: 1px 5px;
  border-radius: 3px; font-family: monospace;
}
.credit-rating-ig  { background: #164e63; color: #67e8f9; }
.credit-rating-hy  { background: #422006; color: #fdba74; }
.credit-rating-em  { background: #1e1b4b; color: #a5b4fc; }
.credit-rating-nr  { background: #1e293b; color: #64748b; }
```

- [ ] **Step 3: Write CreditMarket.jsx**

```jsx
// src/markets/credit/CreditMarket.jsx
import React, { useState } from 'react';
import { useCreditData } from './data/useCreditData';
import IgHyDashboard from './components/IgHyDashboard';
import EmBonds       from './components/EmBonds';
import LoanMarket    from './components/LoanMarket';
import DefaultWatch  from './components/DefaultWatch';
import './CreditMarket.css';

const SUB_TABS = [
  { id: 'ighy',    label: 'IG / HY Dashboard' },
  { id: 'em',      label: 'EM Bonds'          },
  { id: 'loans',   label: 'Loan Market'       },
  { id: 'default', label: 'Default Watch'     },
];

export default function CreditMarket() {
  const [activeTab, setActiveTab] = useState('ighy');
  const { spreadData, emBondData, loanData, defaultData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCreditData();

  if (isLoading) {
    return (
      <div className="credit-market credit-loading">
        <div className="credit-loading-spinner" />
        <span className="credit-loading-text">Loading credit data…</span>
      </div>
    );
  }

  return (
    <div className="credit-market">
      <div className="credit-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`credit-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="credit-status-bar">
        <span className={isLive ? 'credit-status-live' : ''}>
          {isLive ? '● Live · FRED / Yahoo Finance' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="credit-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="credit-content">
        {activeTab === 'ighy'    && <IgHyDashboard spreadData={spreadData} />}
        {activeTab === 'em'      && <EmBonds       emBondData={emBondData} />}
        {activeTab === 'loans'   && <LoanMarket    loanData={loanData} />}
        {activeTab === 'default' && <DefaultWatch  defaultData={defaultData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the 4 stub components**

`src/markets/credit/components/IgHyDashboard.jsx`:
```jsx
import React from 'react';
import './CreditComponents.css';
export default function IgHyDashboard({ spreadData }) {
  return <div className="credit-panel"><div className="credit-panel-header"><span className="credit-panel-title">IG / HY Dashboard</span></div></div>;
}
```

`src/markets/credit/components/EmBonds.jsx`:
```jsx
import React from 'react';
import './CreditComponents.css';
export default function EmBonds({ emBondData }) {
  return <div className="credit-panel"><div className="credit-panel-header"><span className="credit-panel-title">EM Bonds</span></div></div>;
}
```

`src/markets/credit/components/LoanMarket.jsx`:
```jsx
import React from 'react';
import './CreditComponents.css';
export default function LoanMarket({ loanData }) {
  return <div className="credit-panel"><div className="credit-panel-header"><span className="credit-panel-title">Loan Market</span></div></div>;
}
```

`src/markets/credit/components/DefaultWatch.jsx`:
```jsx
import React from 'react';
import './CreditComponents.css';
export default function DefaultWatch({ defaultData }) {
  return <div className="credit-panel"><div className="credit-panel-header"><span className="credit-panel-title">Default Watch</span></div></div>;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/markets/credit/
git commit -m "feat(credit): root CreditMarket + CSS + stub sub-components"
```

---

## Task 5: Hub Wiring

**Files:**
- Modify: `src/hub/markets.config.js`
- Modify: `src/hub/HubLayout.jsx`
- Modify: `vite.config.js`

- [ ] **Step 1: Add credit to markets.config.js**

In `src/hub/markets.config.js`, add after the crypto entry:
```js
  { id: 'credit', label: 'Credit', icon: '🏦' },
```

Full file:
```js
// src/hub/markets.config.js
export const MARKETS = [
  { id: 'equities',         label: 'Equities',    icon: '📈' },
  { id: 'bonds',            label: 'Bonds',        icon: '🏛️' },
  { id: 'fx',               label: 'FX',           icon: '💱' },
  { id: 'derivatives',      label: 'Derivatives',  icon: '📊' },
  { id: 'realEstate',       label: 'Real Estate',  icon: '🏠' },
  { id: 'insurance',        label: 'Insurance',    icon: '🛡️' },
  { id: 'commodities',      label: 'Commodities',  icon: '🛢️' },
  { id: 'globalMacro',      label: 'Macro',        icon: '🌐' },
  { id: 'equitiesDeepDive', label: 'Equity+',      icon: '🔍' },
  { id: 'crypto',           label: 'Crypto',       icon: '🪙' },
  { id: 'credit',           label: 'Credit',       icon: '🏦' },
];

export const DEFAULT_MARKET = 'equities';
```

- [ ] **Step 2: Update HubLayout.jsx**

Add after the CryptoMarket import:
```jsx
import CreditMarket from '../markets/credit/CreditMarket';
```

Add to MARKET_COMPONENTS:
```jsx
credit: CreditMarket,
```

- [ ] **Step 3: Add /api/credit proxy to vite.config.js**

In the proxy object, add after `/api/crypto`:
```js
'/api/credit':       { target: 'http://localhost:3001', changeOrigin: true },
```

- [ ] **Step 4: Commit**

```bash
git add src/hub/markets.config.js src/hub/HubLayout.jsx vite.config.js
git commit -m "feat(credit): wire CreditMarket into HubLayout + proxy"
```

---

## Task 6: IgHyDashboard Component

**Files:**
- Modify: `src/markets/credit/components/IgHyDashboard.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/credit/components/IgHyDashboard.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CreditComponents.css';

function spreadTrend(cur, prev) {
  if (cur == null || prev == null) return { text: '—', cls: 'credit-neu' };
  const d = cur - prev;
  return { text: `${d >= 0 ? '+' : ''}${d}bps`, cls: d > 0 ? 'credit-neg' : d < 0 ? 'credit-pos' : 'credit-neu' };
}

function ratingClass(r) {
  if (!r) return 'credit-rating-nr';
  const u = r.toUpperCase();
  if (u.startsWith('A') || u === 'BBB+' || u === 'BBB') return 'credit-rating-ig';
  if (u.startsWith('B')) return 'credit-rating-hy';
  return 'credit-rating-nr';
}

function buildSpreadHistoryOption(history) {
  const { dates = [], IG = [], HY = [], BBB = [] } = history;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value}bps`).join('<br/>')}`,
    },
    legend: { data: ['IG','HY','BBB'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9, interval: Math.floor(dates.length / 5) },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      { name: 'IG',  type: 'line', data: IG,  lineStyle: { color: '#06b6d4', width: 2 }, symbol: 'none', itemStyle: { color: '#06b6d4' } },
      { name: 'HY',  type: 'line', data: HY,  lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'none', itemStyle: { color: '#f59e0b' } },
      { name: 'BBB', type: 'line', data: BBB, lineStyle: { color: '#818cf8', width: 2, type: 'dashed' }, symbol: 'none', itemStyle: { color: '#818cf8' } },
    ],
  };
}

export default function IgHyDashboard({ spreadData }) {
  if (!spreadData) return null;
  const { current = {}, history = {}, etfs = [] } = spreadData;

  const spreads = [
    { label: 'IG Spread',  value: current.igSpread,  series: 'IG',  prev: (history.IG  || []).at(-2) },
    { label: 'HY Spread',  value: current.hySpread,  series: 'HY',  prev: (history.HY  || []).at(-2) },
    { label: 'BBB Spread', value: current.bbbSpread, series: 'BBB', prev: (history.BBB || []).at(-2) },
    { label: 'EM Spread',  value: current.emSpread,  series: 'EM',  prev: null },
    { label: 'CCC Spread', value: current.cccSpread, series: 'CCC', prev: null },
  ];

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">IG / HY Dashboard</span>
        <span className="credit-panel-subtitle">OAS spreads in bps · FRED · rising spread = wider = more risk premium</span>
      </div>
      <div className="credit-stats-row">
        {spreads.map(s => {
          const trend = spreadTrend(s.value, s.prev);
          return (
            <div key={s.label} className="credit-stat-pill">
              <span className="credit-stat-label">{s.label}</span>
              <span className="credit-stat-value cyan">{s.value != null ? `${s.value}bps` : '—'}</span>
              {s.prev != null && <span style={{ fontSize: 9, color: trend.cls === 'credit-pos' ? '#34d399' : trend.cls === 'credit-neg' ? '#f87171' : '#64748b' }}>{trend.text} MoM</span>}
            </div>
          );
        })}
      </div>
      <div className="credit-two-col">
        <div className="credit-chart-panel">
          <div className="credit-chart-title">12-Month Spread History</div>
          <div className="credit-chart-subtitle">IG · HY · BBB OAS in basis points · cyan narrows = compression</div>
          <div className="credit-chart-wrap">
            <ReactECharts option={buildSpreadHistoryOption(history)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="credit-chart-panel">
          <div className="credit-chart-title">Credit ETF Monitor</div>
          <div className="credit-chart-subtitle">LQD · HYG · EMB · JNK · BKLN · MUB — price · 1d Δ · yield · duration</div>
          <div className="credit-scroll">
            <table className="credit-table">
              <thead>
                <tr>
                  <th className="credit-th" style={{ textAlign: 'left' }}>ETF</th>
                  <th className="credit-th" style={{ textAlign: 'left' }}>Name</th>
                  <th className="credit-th">Price</th>
                  <th className="credit-th">1d Δ%</th>
                  <th className="credit-th">Yield</th>
                  <th className="credit-th">Dur (yr)</th>
                </tr>
              </thead>
              <tbody>
                {etfs.map(e => {
                  const chCls = e.change1d > 0.05 ? 'credit-pos' : e.change1d < -0.05 ? 'credit-neg' : 'credit-neu';
                  return (
                    <tr key={e.ticker} className="credit-row">
                      <td className="credit-cell"><strong>{e.ticker}</strong></td>
                      <td className="credit-cell credit-muted">{e.name}</td>
                      <td className="credit-cell credit-num">${e.price?.toFixed(2)}</td>
                      <td className={`credit-cell credit-num ${chCls}`}>{e.change1d >= 0 ? '+' : ''}{e.change1d?.toFixed(2)}%</td>
                      <td className="credit-cell credit-num">{e.yieldPct?.toFixed(2)}%</td>
                      <td className="credit-cell credit-num">{e.durationYr?.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/credit/components/IgHyDashboard.jsx
git commit -m "feat(credit): IgHyDashboard — spread pills + history chart + ETF table"
```

---

## Task 7: EmBonds Component

**Files:**
- Modify: `src/markets/credit/components/EmBonds.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/credit/components/EmBonds.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CreditComponents.css';

function ratingClass(r) {
  if (!r) return 'credit-rating-nr';
  const u = r.toUpperCase();
  if (u.startsWith('AA') || u.startsWith('A') || u === 'BBB+' || u === 'BBB' || u === 'BBB-') return 'credit-rating-ig';
  if (u.startsWith('B')) return 'credit-rating-hy';
  return 'credit-rating-nr';
}

function fmtChange(v) {
  if (v == null) return { text: '—', cls: 'credit-neu' };
  const cls = v < -5 ? 'credit-pos' : v > 5 ? 'credit-neg' : 'credit-neu';
  return { text: `${v >= 0 ? '+' : ''}${v}bps`, cls };
}

function buildRegionOption(regions) {
  const sorted = [...regions].sort((a, b) => b.avgSpread - a.avgSpread);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].name}: ${params[0].value}bps avg spread`,
    },
    grid: { top: 8, right: 64, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}bps` },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(r => r.region),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map((r, i) => ({
        value: r.avgSpread,
        itemStyle: { color: i === 0 ? '#f87171' : i === 1 ? '#f59e0b' : i === 2 ? '#06b6d4' : '#818cf8' },
      })),
      label: {
        show: true, position: 'right',
        formatter: p => `${p.value}bps`,
        color: '#94a3b8', fontSize: 9,
      },
    }],
  };
}

export default function EmBonds({ emBondData }) {
  if (!emBondData) return null;
  const { countries = [], regions = [] } = emBondData;

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">EM Bonds</span>
        <span className="credit-panel-subtitle">Sovereign spreads · EMBI · 10yr yield · debt/GDP · FRED / Bloomberg proxies</span>
      </div>
      <div className="credit-two-col">
        <div className="credit-chart-panel">
          <div className="credit-chart-title">Sovereign Spread by Country</div>
          <div className="credit-chart-subtitle">EMBI spread (bps) · rating · 10yr yield · debt/GDP · 1m change</div>
          <div className="credit-scroll">
            <table className="credit-table">
              <thead>
                <tr>
                  <th className="credit-th" style={{ textAlign: 'left' }}>Country</th>
                  <th className="credit-th" style={{ textAlign: 'center' }}>Rtg</th>
                  <th className="credit-th">Spread</th>
                  <th className="credit-th">1m Δ</th>
                  <th className="credit-th">10yr Yld</th>
                  <th className="credit-th">Debt/GDP</th>
                </tr>
              </thead>
              <tbody>
                {[...countries].sort((a, b) => a.spread - b.spread).map(c => {
                  const ch = fmtChange(c.change1m);
                  return (
                    <tr key={c.code} className="credit-row">
                      <td className="credit-cell"><strong>{c.country}</strong></td>
                      <td className="credit-cell" style={{ textAlign: 'center' }}>
                        <span className={`credit-rating-badge ${ratingClass(c.rating)}`}>{c.rating}</span>
                      </td>
                      <td className="credit-cell credit-num">{c.spread}bps</td>
                      <td className={`credit-cell credit-num ${ch.cls}`}>{ch.text}</td>
                      <td className="credit-cell credit-num">{c.yld10y?.toFixed(1)}%</td>
                      <td className="credit-cell credit-num">{c.debtGdp}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="credit-chart-panel">
          <div className="credit-chart-title">EM Region Spread Comparison</div>
          <div className="credit-chart-subtitle">Average EMBI spread by region · red = widest · blue = tightest</div>
          <div className="credit-chart-wrap">
            <ReactECharts option={buildRegionOption(regions)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/credit/components/EmBonds.jsx
git commit -m "feat(credit): EmBonds — sovereign spread table + region bar chart"
```

---

## Task 8: LoanMarket Component

**Files:**
- Modify: `src/markets/credit/components/LoanMarket.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/credit/components/LoanMarket.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CreditComponents.css';

function trancheColor(tranche) {
  const t = tranche?.toUpperCase();
  if (t === 'AAA') return '#06b6d4';
  if (t === 'AA')  return '#38bdf8';
  if (t === 'A')   return '#818cf8';
  if (t === 'BBB') return '#a78bfa';
  if (t === 'BB')  return '#f59e0b';
  if (t === 'B')   return '#fb923c';
  return '#f87171'; // Equity / NR
}

function buildCloOption(tranches) {
  const withSpread = tranches.filter(t => t.spread != null);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].name}: ${params[0].value}bps spread · ${tranches.find(t=>t.tranche===params[0].name)?.yield?.toFixed(1)}% yield`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: withSpread.map(t => t.tranche),
      axisLabel: { color: '#94a3b8', fontSize: 10 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}bps` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'bar',
      data: withSpread.map(t => ({ value: t.spread, itemStyle: { color: trancheColor(t.tranche) } })),
      label: { show: true, position: 'top', formatter: p => `${p.value}`, color: '#94a3b8', fontSize: 9 },
      barMaxWidth: 48,
    }],
  };
}

function buildBklnOption(priceHistory) {
  const { dates = [], bkln = [] } = priceHistory;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}: $${params[0].value?.toFixed(2)}`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `$${v.toFixed(1)}` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [{
      type: 'line', data: bkln,
      lineStyle: { color: '#06b6d4', width: 2 },
      areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[{offset:0,color:'rgba(6,182,212,0.25)'},{offset:1,color:'rgba(6,182,212,0.02)'}] } },
      symbol: 'circle', symbolSize: 4, itemStyle: { color: '#06b6d4' },
    }],
  };
}

export default function LoanMarket({ loanData }) {
  if (!loanData) return null;
  const { cloTranches = [], indices = [], priceHistory = { dates: [], bkln: [] } } = loanData;

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">Loan Market</span>
        <span className="credit-panel-subtitle">Leveraged loans · CLO tranches · BKLN ETF proxy · Invesco / LCD</span>
      </div>
      <div className="credit-stats-row">
        {indices.map(idx => (
          <div key={idx.name} className="credit-stat-pill">
            <span className="credit-stat-label">{idx.name}</span>
            <span className="credit-stat-value">{idx.value != null ? (idx.spread != null ? `${idx.spread}bps` : idx.value.toFixed(idx.value > 100 ? 0 : 2)) : '—'}</span>
          </div>
        ))}
      </div>
      <div className="credit-two-col">
        <div className="credit-chart-panel">
          <div className="credit-chart-title">CLO Tranche Spreads</div>
          <div className="credit-chart-subtitle">AAA → Equity waterfall · OAS spread (bps) by tranche rating</div>
          <div className="credit-chart-wrap">
            <ReactECharts option={buildCloOption(cloTranches)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="credit-two-row">
          <div className="credit-chart-panel">
            <div className="credit-chart-title">BKLN Price (6-Month)</div>
            <div className="credit-chart-subtitle">Invesco Senior Loan ETF — floating-rate leveraged loan proxy</div>
            <div className="credit-chart-wrap">
              <ReactECharts option={buildBklnOption(priceHistory)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="credit-chart-panel">
            <div className="credit-chart-title">CLO Tranche Details</div>
            <div className="credit-chart-subtitle">Tranche · rating · spread (bps) · yield · attachment (LTV)</div>
            <div className="credit-scroll">
              <table className="credit-table">
                <thead>
                  <tr>
                    <th className="credit-th" style={{ textAlign:'left' }}>Tranche</th>
                    <th className="credit-th" style={{ textAlign:'center' }}>Rating</th>
                    <th className="credit-th">Spread</th>
                    <th className="credit-th">Yield</th>
                    <th className="credit-th">LTV</th>
                  </tr>
                </thead>
                <tbody>
                  {cloTranches.map(t => (
                    <tr key={t.tranche} className="credit-row">
                      <td className="credit-cell"><strong style={{ color: trancheColor(t.tranche) }}>{t.tranche}</strong></td>
                      <td className="credit-cell" style={{ textAlign:'center' }}>
                        <span className={`credit-rating-badge ${t.rating === 'NR' ? 'credit-rating-nr' : t.rating?.startsWith('A') || t.rating?.startsWith('BBB') ? 'credit-rating-ig' : 'credit-rating-hy'}`}>{t.rating}</span>
                      </td>
                      <td className="credit-cell credit-num">{t.spread != null ? `${t.spread}bps` : '—'}</td>
                      <td className="credit-cell credit-num">{t.yield?.toFixed(1)}%</td>
                      <td className="credit-cell credit-num">{t.ltv}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/credit/components/LoanMarket.jsx
git commit -m "feat(credit): LoanMarket — CLO waterfall chart + BKLN price + tranche table"
```

---

## Task 9: DefaultWatch Component

**Files:**
- Modify: `src/markets/credit/components/DefaultWatch.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/credit/components/DefaultWatch.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CreditComponents.css';

function buildDefaultHistoryOption(defaultHistory) {
  const { dates = [], hy = [], loan = [] } = defaultHistory;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(1)}%`).join('<br/>')}`,
    },
    legend: { data: ['HY Default','Loan Default'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      { name: 'HY Default',   type: 'line', data: hy,   lineStyle: { color: '#f59e0b', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#f59e0b' } },
      { name: 'Loan Default', type: 'line', data: loan, lineStyle: { color: '#06b6d4', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#06b6d4' } },
    ],
  };
}

function buildChargeoffOption(chargeoffs) {
  const { dates = [], commercial = [], consumer = [] } = chargeoffs;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params.map(p => `${p.seriesName}: ${p.value?.toFixed(2)}%`).join('<br/>')}`,
    },
    legend: { data: ['C&I Loans','Consumer'], textStyle: { color: '#94a3b8', fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9 },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    series: [
      { name: 'C&I Loans', type: 'line', data: commercial, lineStyle: { color: '#818cf8', width: 2 }, areaStyle: { color: 'rgba(129,140,248,0.1)' }, symbol: 'none' },
      { name: 'Consumer',  type: 'line', data: consumer,   lineStyle: { color: '#f87171', width: 2 }, areaStyle: { color: 'rgba(248,113,113,0.1)' }, symbol: 'none' },
    ],
  };
}

export default function DefaultWatch({ defaultData }) {
  if (!defaultData) return null;
  const { rates = [], chargeoffs = { dates:[], commercial:[], consumer:[] }, defaultHistory = { dates:[], hy:[], loan:[] } } = defaultData;

  return (
    <div className="credit-panel">
      <div className="credit-panel-header">
        <span className="credit-panel-title">Default Watch</span>
        <span className="credit-panel-subtitle">HY/loan default rates · bank charge-offs · distressed ratios · FRED / Moody's</span>
      </div>
      <div className="credit-two-col">
        <div className="credit-two-row">
          <div className="credit-chart-panel">
            <div className="credit-chart-title">Default Rate Trend</div>
            <div className="credit-chart-subtitle">HY bond & leveraged loan TTM default rates (%) — amber = HY · cyan = loans</div>
            <div className="credit-chart-wrap">
              <ReactECharts option={buildDefaultHistoryOption(defaultHistory)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
          <div className="credit-chart-panel">
            <div className="credit-chart-title">Bank Charge-Off Rates</div>
            <div className="credit-chart-subtitle">FRED quarterly charge-off rates (%) — commercial & consumer loans · DRALACBN / DRSFRMACBS</div>
            <div className="credit-chart-wrap">
              <ReactECharts option={buildChargeoffOption(chargeoffs)} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        </div>
        <div className="credit-chart-panel">
          <div className="credit-chart-title">Distressed Debt Indicators</div>
          <div className="credit-chart-subtitle">Current reading · prior period · cycle peak — rising = deterioration</div>
          <div className="credit-scroll">
            <table className="credit-table">
              <thead>
                <tr>
                  <th className="credit-th" style={{ textAlign:'left' }}>Indicator</th>
                  <th className="credit-th">Current</th>
                  <th className="credit-th">Prior</th>
                  <th className="credit-th">Cycle Peak</th>
                  <th className="credit-th">vs Peak</th>
                </tr>
              </thead>
              <tbody>
                {rates.map(r => {
                  const vsPeak = r.peak != null ? ((r.value / r.peak) * 100).toFixed(0) : null;
                  const cls = r.value > r.prev ? 'credit-neg' : r.value < r.prev ? 'credit-pos' : 'credit-neu';
                  return (
                    <tr key={r.category} className="credit-row">
                      <td className="credit-cell">{r.category}</td>
                      <td className={`credit-cell credit-num ${cls}`}><strong>{r.value}{r.unit}</strong></td>
                      <td className="credit-cell credit-num credit-muted">{r.prev}{r.unit}</td>
                      <td className="credit-cell credit-num credit-muted">{r.peak}{r.unit}</td>
                      <td className="credit-cell credit-num credit-muted">{vsPeak ? `${vsPeak}%` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/credit/components/DefaultWatch.jsx
git commit -m "feat(credit): DefaultWatch — default rate trend + charge-offs + distressed table"
```

---

## Task 10: Server Endpoint `/api/credit`

**Files:**
- Modify: `server/index.js`

Key facts about server/index.js:
- Already has `fetchFredLatest(seriesId)` and `fetchFredHistory(seriesId, limit)` helpers (defined around line 390)
- Already has `dateToMonthLabel(dateStr)` helper (defined around line 406)
- Already has `FRED_API_KEY` from env (line 317); endpoint degrades gracefully when key absent
- Add `'credit'` to `CACHEABLE_MARKETS` array (line 237)
- Insert new endpoint AFTER the `/api/crypto` handler, BEFORE `// --- Quote Summary:`

- [ ] **Step 1: Add 'credit' to CACHEABLE_MARKETS**

Find the line:
```js
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto'];
```

Change to:
```js
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto','credit'];
```

- [ ] **Step 2: Insert /api/credit endpoint**

Insert this block after the closing `});` of `/api/crypto` and before `// --- Quote Summary:`:

```js
// ── /api/credit ──────────────────────────────────────────────────────────────
// FRED credit spreads (IG/HY/EM/BBB/CCC) + bank charge-offs + Yahoo ETF quotes
app.get('/api/credit', async (_req, res) => {
  const today = todayStr();
  const daily = readDailyCache('credit');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  const cacheKey = 'credit_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    // ── FRED spreads ─────────────────────────────────────────────────────────
    const CREDIT_SPREAD_SERIES = {
      IG:  'BAMLC0A0CM',
      HY:  'BAMLH0A0HYM2',
      EM:  'BAMLEMCBPIOAS',
      BBB: 'BAMLC0A4CBBB',
      CCC: 'BAMLH0A3HYC',
    };
    const CHARGEOFF_SERIES = {
      commercial: 'DRALACBN',
      consumer:   'DRSFRMACBS',
    };

    let spreadData = null;
    let chargeoffData = null;

    if (FRED_API_KEY) {
      const [spreadResults, chargeoffResults] = await Promise.all([
        Promise.allSettled(
          Object.entries(CREDIT_SPREAD_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, 13)]
          )
        ),
        Promise.allSettled(
          Object.entries(CHARGEOFF_SERIES).map(async ([key, sid]) =>
            [key, await fetchFredHistory(sid, 9)]
          )
        ),
      ]);

      const raw = {};
      spreadResults.forEach(r => { if (r.status === 'fulfilled') raw[r.value[0]] = r.value[1]; });

      const igArr  = (raw.IG  || []).slice(-12);
      const hyArr  = (raw.HY  || []).slice(-12);
      const emArr  = (raw.EM  || []).slice(-12);
      const bbbArr = (raw.BBB || []).slice(-12);
      const cccArr = (raw.CCC || []).slice(-1);

      const anchorArr = igArr.length >= 6 ? igArr : hyArr.length >= 6 ? hyArr : null;

      if (anchorArr) {
        spreadData = {
          current: {
            igSpread:  igArr.length  ? Math.round(igArr.at(-1).value)  : null,
            hySpread:  hyArr.length  ? Math.round(hyArr.at(-1).value)  : null,
            emSpread:  emArr.length  ? Math.round(emArr.at(-1).value)  : null,
            bbbSpread: bbbArr.length ? Math.round(bbbArr.at(-1).value) : null,
            cccSpread: cccArr.length ? Math.round(cccArr.at(-1).value) : null,
          },
          history: {
            dates: anchorArr.map(p => dateToMonthLabel(p.date)),
            IG:    igArr.length  === anchorArr.length ? igArr.map(p  => Math.round(p.value)) : anchorArr.map(() => null),
            HY:    hyArr.length  === anchorArr.length ? hyArr.map(p  => Math.round(p.value)) : anchorArr.map(() => null),
            EM:    emArr.length  === anchorArr.length ? emArr.map(p  => Math.round(p.value)) : anchorArr.map(() => null),
            BBB:   bbbArr.length === anchorArr.length ? bbbArr.map(p => Math.round(p.value)) : anchorArr.map(() => null),
          },
          etfs: [], // populated below by Yahoo Finance
        };
      }

      const coRaw = {};
      chargeoffResults.forEach(r => { if (r.status === 'fulfilled') coRaw[r.value[0]] = r.value[1]; });

      const coCommercial = (coRaw.commercial || []).slice(-8);
      const coConsumer   = (coRaw.consumer   || []).slice(-8);
      const coAnchor     = coCommercial.length >= 4 ? coCommercial : coConsumer;

      if (coAnchor.length >= 4) {
        chargeoffData = {
          dates:      coAnchor.map(p => {
            const d = new Date(p.date + 'T00:00:00Z');
            const q = Math.ceil((d.getUTCMonth() + 1) / 3);
            return `Q${q}-${String(d.getUTCFullYear()).slice(2)}`;
          }),
          commercial: coCommercial.map(p => Math.round(p.value * 100) / 100),
          consumer:   coConsumer.map(p   => Math.round(p.value * 100) / 100),
        };
      }
    }

    // ── Yahoo Finance ETFs ────────────────────────────────────────────────────
    const ETF_TICKERS = ['LQD','HYG','EMB','JNK','BKLN','MUB'];
    let etfs = [];
    try {
      const quotes = await Promise.allSettled(ETF_TICKERS.map(t => yf.quote(t)));
      const ETF_META = {
        LQD:  { name: 'iShares IG Corp Bond',   durationYr: 8.4 },
        HYG:  { name: 'iShares HY Corp Bond',   durationYr: 3.6 },
        EMB:  { name: 'iShares EM USD Bond',    durationYr: 7.2 },
        JNK:  { name: 'SPDR HY Bond',           durationYr: 3.4 },
        BKLN: { name: 'Invesco Sr Loan ETF',    durationYr: 0.4 },
        MUB:  { name: 'iShares Natl Muni Bond', durationYr: 6.8 },
      };
      etfs = quotes.map((r, i) => {
        const ticker = ETF_TICKERS[i];
        const q = r.status === 'fulfilled' ? r.value : null;
        const meta = ETF_META[ticker];
        return {
          ticker,
          name:       meta.name,
          price:      q?.regularMarketPrice ?? null,
          change1d:   q?.regularMarketChangePercent ?? null,
          yieldPct:   q?.trailingAnnualDividendYield != null ? q.trailingAnnualDividendYield * 100 : null,
          durationYr: meta.durationYr,
        };
      });
    } catch { /* ETF fetch failed — leave empty */ }

    if (spreadData) spreadData.etfs = etfs;

    // ── Static EM + loan + default data (no clean free live source) ──────────
    const emBondData = {
      countries: [
        { country: 'Brazil',       code: 'BZ', spread: 210, rating: 'BB',  change1m:  -8, yld10y: 7.2, debtGdp:  88 },
        { country: 'Mexico',       code: 'MX', spread: 180, rating: 'BBB', change1m: -12, yld10y: 6.8, debtGdp:  54 },
        { country: 'Indonesia',    code: 'ID', spread: 165, rating: 'BBB', change1m:  -6, yld10y: 6.5, debtGdp:  39 },
        { country: 'South Africa', code: 'ZA', spread: 285, rating: 'BB',  change1m:   4, yld10y: 9.8, debtGdp:  74 },
        { country: 'India',        code: 'IN', spread: 142, rating: 'BBB', change1m:  -4, yld10y: 7.0, debtGdp:  84 },
        { country: 'Turkey',       code: 'TR', spread: 342, rating: 'B+',  change1m:  18, yld10y:12.4, debtGdp:  32 },
        { country: 'Philippines',  code: 'PH', spread: 128, rating: 'BBB', change1m:  -8, yld10y: 5.8, debtGdp:  58 },
        { country: 'Colombia',     code: 'CO', spread: 248, rating: 'BB+', change1m:   6, yld10y: 8.4, debtGdp:  58 },
        { country: 'Egypt',        code: 'EG', spread: 624, rating: 'B-',  change1m: -22, yld10y:18.2, debtGdp:  96 },
        { country: 'Nigeria',      code: 'NG', spread: 512, rating: 'B-',  change1m:  14, yld10y:15.8, debtGdp:  38 },
        { country: 'Saudi Arabia', code: 'SA', spread:  68, rating: 'A+',  change1m:  -2, yld10y: 4.6, debtGdp:  26 },
        { country: 'Chile',        code: 'CL', spread:  98, rating: 'A',   change1m:  -4, yld10y: 5.2, debtGdp:  40 },
      ],
      regions: [
        { region: 'Latin America', avgSpread: 184, change1m:  -3 },
        { region: 'Asia EM',       avgSpread: 145, change1m:  -6 },
        { region: 'EMEA',          avgSpread: 248, change1m:   8 },
        { region: 'Frontier',      avgSpread: 568, change1m:  -4 },
      ],
    };

    const loanData = {
      cloTranches: [
        { tranche: 'AAA', spread: 145, yield: 6.82, rating: 'AAA', ltv: 65 },
        { tranche: 'AA',  spread: 210, yield: 7.47, rating: 'AA',  ltv: 72 },
        { tranche: 'A',   spread: 290, yield: 8.27, rating: 'A',   ltv: 78 },
        { tranche: 'BBB', spread: 420, yield: 9.57, rating: 'BBB', ltv: 83 },
        { tranche: 'BB',  spread: 720, yield:12.07, rating: 'BB',  ltv: 89 },
        { tranche: 'B',   spread:1050, yield:15.37, rating: 'B',   ltv: 94 },
        { tranche: 'Equity', spread: null, yield:18.5, rating: 'NR', ltv:100 },
      ],
      indices: [
        { name: 'BKLN NAV',                 value: etfs.find(e=>e.ticker==='BKLN')?.price ?? 21.84, change1d: etfs.find(e=>e.ticker==='BKLN')?.change1d ?? 0.02, spread: 312 },
        { name: 'CS Lev Loan 100 Index',    value: 96.42, change1d: 0.08, spread: 318 },
        { name: 'LL New Issue Vol ($B YTD)',  value: 142,   change1d: null, spread: null },
        { name: 'Avg Loan Price',             value: 96.8,  change1d: 0.04, spread: null },
      ],
      priceHistory: {
        dates: ['Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
        bkln:  [21.42, 21.54, 21.68, 21.72, 21.78, 21.84],
      },
    };

    const defaultData = {
      rates: [
        { category: 'HY Default Rate (TTM)',      value: 3.8, prev: 4.2, peak: 14.0, unit: '%' },
        { category: 'Loan Default Rate (TTM)',     value: 2.4, prev: 2.8, peak: 10.8, unit: '%' },
        { category: 'HY Distressed Ratio',        value: 8.2, prev: 9.1, peak: 42.0, unit: '%' },
        { category: 'Loans Trading <80c',         value: 5.1, prev: 5.8, peak: 28.0, unit: '%' },
        { category: 'CCC/Split-B % of HY Index',  value:12.4, prev:12.8, peak: 22.0, unit: '%' },
      ],
      chargeoffs: chargeoffData || {
        dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
        commercial: [1.42, 1.38, 1.44, 1.52, 1.48, 1.44, 1.40, 1.36],
        consumer:   [3.84, 3.92, 4.08, 4.22, 4.18, 4.10, 4.02, 3.94],
      },
      defaultHistory: {
        dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
        hy:   [4.8, 4.6, 4.4, 4.2, 4.0, 3.9, 3.8, 3.8],
        loan: [3.4, 3.2, 3.0, 2.8, 2.6, 2.5, 2.4, 2.4],
      },
    };

    // Merge live spread data over mock if FRED succeeded
    const finalSpreadData = spreadData ?? {
      current: { igSpread: 98, hySpread: 342, emSpread: 285, bbbSpread: 138, cccSpread: 842 },
      history: {
        dates: ['Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
        IG:  [ 92, 94, 96, 98,102, 99, 97, 95, 96, 98,100, 98],
        HY:  [312,318,324,330,358,345,338,332,336,340,348,342],
        EM:  [262,268,274,278,298,292,286,280,284,288,292,285],
        BBB: [128,130,132,135,142,139,136,133,135,137,140,138],
      },
      etfs,
    };

    const result = {
      spreadData:  finalSpreadData,
      emBondData,
      loanData,
      defaultData,
      lastUpdated: today,
    };

    writeDailyCache('credit', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Credit API error:', error);
    const fallback = readLatestCache('credit');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(credit): /api/credit endpoint — FRED spreads + charge-offs + ETF quotes"
```

---

## Task 11: Run All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
npx vitest run
```

Expected: ≥ 316 tests passing (308 existing + 8 new credit tests), 0 failing.

- [ ] **Step 2: Commit any fixes needed, then done**

If any failures: fix source, re-run, commit fixes.

---

## Self-Review

**Spec coverage:**
- ✅ IG/HY Dashboard: spread pills (IG/HY/BBB/EM/CCC) + 12m history chart + ETF table → Task 6
- ✅ EM Bonds: country table sorted by spread + region bar chart → Task 7
- ✅ Loan Market: CLO tranche waterfall + BKLN price chart + tranche table → Task 8
- ✅ Default Watch: default rate trend + bank charge-off area chart + distressed table → Task 9
- ✅ FRED spreads (IG/HY/EM/BBB/CCC) live → Task 10
- ✅ Yahoo Finance ETF quotes (LQD/HYG/EMB/JNK/BKLN/MUB) → Task 10
- ✅ Bank charge-off rates (DRALACBN/DRSFRMACBS) → Task 10
- ✅ Cyan `#06b6d4` accent → Tasks 4, 6-9
- ✅ `credit-` CSS prefix throughout → Tasks 4, 6-9
- ✅ Hub wiring → Task 5
- ✅ CACHEABLE_MARKETS updated → Task 10
- ✅ 8 tests → Task 3

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:** `spreadData.current.igSpread`, `spreadData.history.IG`, `emBondData.countries[].spread`, `loanData.cloTranches[].tranche`, `defaultData.rates[].value` — consistent across mock, hook, server, and components.
