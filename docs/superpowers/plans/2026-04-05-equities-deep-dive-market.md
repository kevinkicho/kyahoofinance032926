# Equities Deep-Dive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Equity+ tab to the Global Market Hub with sector rotation tracking, factor rankings, earnings watch, and short interest intelligence.

**Architecture:** Mirrors the Global Macro pattern exactly — `src/markets/equitiesDeepDive/` root + sub-tab routing + async hook (useState mock init → useEffect fetch → silent fallback) + 4 ECharts/table components + `/api/equityDeepDive` server endpoint. CSS prefix `eq-`, accent indigo `#6366f1`.

**Tech Stack:** React 18, ECharts (echarts-for-react), Express, node-cache, yahoo-finance2 (existing), Vitest + @testing-library/react.

---

## File Map

**Create:**
- `src/markets/equitiesDeepDive/data/mockEquityDeepDiveData.js`
- `src/markets/equitiesDeepDive/data/useEquityDeepDiveData.js`
- `src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.jsx`
- `src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.css`
- `src/markets/equitiesDeepDive/components/SectorRotation.jsx`
- `src/markets/equitiesDeepDive/components/FactorRankings.jsx`
- `src/markets/equitiesDeepDive/components/EarningsWatch.jsx`
- `src/markets/equitiesDeepDive/components/ShortInterest.jsx`
- `src/markets/equitiesDeepDive/components/EquityComponents.css`
- `src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js`
- `src/__tests__/equitiesDeepDive/EquitiesDeepDiveMarket.test.jsx`
- `src/__tests__/equitiesDeepDive/SectorRotation.test.jsx`
- `src/__tests__/equitiesDeepDive/FactorRankings.test.jsx`
- `src/__tests__/equitiesDeepDive/EarningsWatch.test.jsx`
- `src/__tests__/equitiesDeepDive/ShortInterest.test.jsx`

**Modify:**
- `server/index.js` — add `/api/equityDeepDive` endpoint after globalMacro block
- `src/hub/markets.config.js` — append `{ id: 'equitiesDeepDive', label: 'Equity+', icon: '🔍' }`
- `src/hub/HubLayout.jsx` — import + wire `EquitiesDeepDiveMarket`

---

## Task 1: Mock Data

**Files:**
- Create: `src/markets/equitiesDeepDive/data/mockEquityDeepDiveData.js`

- [ ] **Step 1: Write the file**

```javascript
// src/markets/equitiesDeepDive/data/mockEquityDeepDiveData.js

export const sectorData = {
  sectors: [
    { code: 'XLK',  name: 'Technology',        perf1d:  0.8, perf1w:  2.1, perf1m:  5.3, perf3m: 12.1, perf1y: 28.4 },
    { code: 'XLF',  name: 'Financials',         perf1d:  0.3, perf1w:  0.8, perf1m:  2.1, perf3m:  8.4, perf1y: 18.2 },
    { code: 'XLV',  name: 'Health Care',        perf1d: -0.2, perf1w: -0.5, perf1m:  1.2, perf3m:  3.1, perf1y:  8.4 },
    { code: 'XLE',  name: 'Energy',             perf1d:  1.2, perf1w:  3.4, perf1m: -2.1, perf3m: -5.3, perf1y:  2.1 },
    { code: 'XLI',  name: 'Industrials',        perf1d:  0.5, perf1w:  1.2, perf1m:  3.4, perf3m:  9.2, perf1y: 15.3 },
    { code: 'XLC',  name: 'Communication',      perf1d:  0.9, perf1w:  1.8, perf1m:  4.2, perf3m: 10.1, perf1y: 22.8 },
    { code: 'XLY',  name: 'Consumer Disc.',     perf1d:  0.6, perf1w:  1.5, perf1m:  3.8, perf3m:  7.6, perf1y: 14.2 },
    { code: 'XLP',  name: 'Consumer Staples',   perf1d: -0.1, perf1w:  0.2, perf1m:  0.8, perf3m:  2.1, perf1y:  5.3 },
    { code: 'XLRE', name: 'Real Estate',        perf1d: -0.3, perf1w: -0.8, perf1m: -1.2, perf3m: -3.4, perf1y: -2.1 },
    { code: 'XLB',  name: 'Materials',          perf1d:  0.4, perf1w:  0.9, perf1m:  2.3, perf3m:  5.8, perf1y: 10.4 },
    { code: 'XLU',  name: 'Utilities',          perf1d: -0.2, perf1w: -0.4, perf1m:  0.5, perf3m:  1.2, perf1y:  3.8 },
    { code: 'SPY',  name: 'S&P 500',            perf1d:  0.5, perf1w:  1.3, perf1m:  3.2, perf3m:  8.1, perf1y: 18.9 },
  ],
};

export const factorData = {
  inFavor: { value: 12.3, momentum: 28.1, quality: 8.4, lowVol: -2.1 },
  stocks: [
    { ticker: 'NVDA',  name: 'NVIDIA',          sector: 'Technology',       value: 15, momentum: 98, quality: 82, lowVol: 12, composite: 52 },
    { ticker: 'MSFT',  name: 'Microsoft',        sector: 'Technology',       value: 42, momentum: 88, quality: 91, lowVol: 65, composite: 72 },
    { ticker: 'AAPL',  name: 'Apple',            sector: 'Technology',       value: 38, momentum: 82, quality: 88, lowVol: 58, composite: 67 },
    { ticker: 'AVGO',  name: 'Broadcom',         sector: 'Technology',       value: 45, momentum: 79, quality: 85, lowVol: 52, composite: 65 },
    { ticker: 'META',  name: 'Meta',             sector: 'Communication',    value: 55, momentum: 91, quality: 78, lowVol: 35, composite: 65 },
    { ticker: 'GOOGL', name: 'Alphabet',         sector: 'Communication',    value: 60, momentum: 75, quality: 86, lowVol: 60, composite: 70 },
    { ticker: 'JPM',   name: 'JPMorgan',         sector: 'Financials',       value: 72, momentum: 68, quality: 82, lowVol: 55, composite: 69 },
    { ticker: 'V',     name: 'Visa',             sector: 'Financials',       value: 55, momentum: 72, quality: 94, lowVol: 75, composite: 74 },
    { ticker: 'LLY',   name: 'Eli Lilly',        sector: 'Health Care',      value: 20, momentum: 85, quality: 88, lowVol: 48, composite: 60 },
    { ticker: 'UNH',   name: 'UnitedHealth',     sector: 'Health Care',      value: 65, momentum: 55, quality: 90, lowVol: 72, composite: 71 },
    { ticker: 'WMT',   name: 'Walmart',          sector: 'Consumer Staples', value: 48, momentum: 78, quality: 85, lowVol: 82, composite: 73 },
    { ticker: 'PG',    name: 'P&G',              sector: 'Consumer Staples', value: 52, momentum: 62, quality: 89, lowVol: 88, composite: 73 },
    { ticker: 'AMZN',  name: 'Amazon',           sector: 'Consumer Disc.',   value: 35, momentum: 80, quality: 75, lowVol: 40, composite: 58 },
    { ticker: 'HD',    name: 'Home Depot',       sector: 'Consumer Disc.',   value: 58, momentum: 65, quality: 82, lowVol: 62, composite: 67 },
    { ticker: 'CAT',   name: 'Caterpillar',      sector: 'Industrials',      value: 62, momentum: 72, quality: 78, lowVol: 58, composite: 68 },
    { ticker: 'HON',   name: 'Honeywell',        sector: 'Industrials',      value: 65, momentum: 58, quality: 85, lowVol: 70, composite: 70 },
    { ticker: 'XOM',   name: 'ExxonMobil',       sector: 'Energy',           value: 78, momentum: 45, quality: 72, lowVol: 62, composite: 64 },
    { ticker: 'CVX',   name: 'Chevron',          sector: 'Energy',           value: 80, momentum: 42, quality: 75, lowVol: 65, composite: 66 },
    { ticker: 'TSLA',  name: 'Tesla',            sector: 'Consumer Disc.',   value:  8, momentum: 62, quality: 55, lowVol: 15, composite: 35 },
    { ticker: 'INTC',  name: 'Intel',            sector: 'Technology',       value: 85, momentum: 22, quality: 45, lowVol: 52, composite: 51 },
  ],
};

export const earningsData = {
  upcoming: [
    { ticker: 'JPM',  name: 'JPMorgan Chase',   sector: 'Financials',      date: '2026-04-11', epsEst: 4.61, epsPrev: 4.44, marketCapB: 680 },
    { ticker: 'WFC',  name: 'Wells Fargo',       sector: 'Financials',      date: '2026-04-11', epsEst: 1.24, epsPrev: 1.20, marketCapB: 220 },
    { ticker: 'BAC',  name: 'Bank of America',   sector: 'Financials',      date: '2026-04-14', epsEst: 0.86, epsPrev: 0.83, marketCapB: 315 },
    { ticker: 'GS',   name: 'Goldman Sachs',     sector: 'Financials',      date: '2026-04-14', epsEst: 9.85, epsPrev: 11.58, marketCapB: 175 },
    { ticker: 'UNH',  name: 'UnitedHealth',      sector: 'Health Care',     date: '2026-04-15', epsEst: 7.28, epsPrev: 6.91, marketCapB: 540 },
    { ticker: 'JNJ',  name: 'Johnson & Johnson', sector: 'Health Care',     date: '2026-04-15', epsEst: 2.58, epsPrev: 2.71, marketCapB: 390 },
    { ticker: 'NFLX', name: 'Netflix',           sector: 'Communication',   date: '2026-04-15', epsEst: 5.68, epsPrev: 5.35, marketCapB: 320 },
    { ticker: 'TSLA', name: 'Tesla',             sector: 'Consumer Disc.',  date: '2026-04-22', epsEst: 0.52, epsPrev: 0.45, marketCapB: 850 },
    { ticker: 'AAPL', name: 'Apple',             sector: 'Technology',      date: '2026-04-30', epsEst: 1.65, epsPrev: 2.18, marketCapB: 3200 },
  ],
  beatRates: [
    { sector: 'Technology',        beatCount: 25, totalCount: 32, beatRate: 78.1 },
    { sector: 'Financials',        beatCount: 18, totalCount: 24, beatRate: 75.0 },
    { sector: 'Health Care',       beatCount: 14, totalCount: 20, beatRate: 70.0 },
    { sector: 'Industrials',       beatCount: 16, totalCount: 24, beatRate: 66.7 },
    { sector: 'Communication',     beatCount: 10, totalCount: 16, beatRate: 62.5 },
    { sector: 'Consumer Disc.',    beatCount: 12, totalCount: 20, beatRate: 60.0 },
    { sector: 'Consumer Staples',  beatCount:  9, totalCount: 16, beatRate: 56.3 },
    { sector: 'Energy',            beatCount:  7, totalCount: 16, beatRate: 43.8 },
  ],
};

export const shortData = {
  mostShorted: [
    { ticker: 'CVNA',  name: 'Carvana',           sector: 'Consumer Disc.',   shortFloat: 28.4, daysToCover: 4.2, marketCapB:  32, perf1w:  3.8 },
    { ticker: 'GME',   name: 'GameStop',           sector: 'Consumer Disc.',   shortFloat: 24.5, daysToCover: 3.2, marketCapB:   8, perf1w:  8.4 },
    { ticker: 'CHWY',  name: 'Chewy',              sector: 'Consumer Disc.',   shortFloat: 22.1, daysToCover: 2.8, marketCapB:  14, perf1w:  1.2 },
    { ticker: 'RIVN',  name: 'Rivian',             sector: 'Consumer Disc.',   shortFloat: 20.8, daysToCover: 2.1, marketCapB:  18, perf1w: -2.4 },
    { ticker: 'PLUG',  name: 'Plug Power',         sector: 'Industrials',      shortFloat: 19.6, daysToCover: 1.8, marketCapB:   4, perf1w: -3.8 },
    { ticker: 'LCID',  name: 'Lucid Group',        sector: 'Consumer Disc.',   shortFloat: 18.9, daysToCover: 2.4, marketCapB:   7, perf1w: -1.5 },
    { ticker: 'BYND',  name: 'Beyond Meat',        sector: 'Consumer Staples', shortFloat: 18.2, daysToCover: 3.1, marketCapB:   1, perf1w: -0.8 },
    { ticker: 'CLSK',  name: 'CleanSpark',         sector: 'Technology',       shortFloat: 17.5, daysToCover: 1.5, marketCapB:   3, perf1w:  5.2 },
    { ticker: 'UPST',  name: 'Upstart',            sector: 'Financials',       shortFloat: 16.8, daysToCover: 2.2, marketCapB:   5, perf1w:  6.8 },
    { ticker: 'MARA',  name: 'Marathon Digital',   sector: 'Technology',       shortFloat: 16.2, daysToCover: 1.8, marketCapB:   5, perf1w:  4.1 },
    { ticker: 'NKLA',  name: 'Nikola',             sector: 'Industrials',      shortFloat: 15.8, daysToCover: 1.2, marketCapB:   1, perf1w: -5.2 },
    { ticker: 'OPEN',  name: 'Opendoor',           sector: 'Real Estate',      shortFloat: 15.2, daysToCover: 2.8, marketCapB:   3, perf1w:  2.1 },
    { ticker: 'SPCE',  name: 'Virgin Galactic',    sector: 'Industrials',      shortFloat: 14.1, daysToCover: 1.5, marketCapB:   2, perf1w: -3.4 },
    { ticker: 'SAVA',  name: 'Cassava Sciences',   sector: 'Health Care',      shortFloat: 13.8, daysToCover: 4.5, marketCapB:   1, perf1w:  1.8 },
    { ticker: 'LAZR',  name: 'Luminar',            sector: 'Technology',       shortFloat: 13.2, daysToCover: 2.1, marketCapB:   3, perf1w: -1.2 },
    { ticker: 'IONQ',  name: 'IonQ',               sector: 'Technology',       shortFloat: 12.8, daysToCover: 1.8, marketCapB:   5, perf1w:  9.2 },
    { ticker: 'ARRY',  name: 'Array Technologies', sector: 'Industrials',      shortFloat: 12.1, daysToCover: 2.4, marketCapB:   4, perf1w:  3.5 },
    { ticker: 'XPEV',  name: 'XPeng',              sector: 'Consumer Disc.',   shortFloat: 11.8, daysToCover: 2.2, marketCapB:  14, perf1w:  2.8 },
    { ticker: 'WOLF',  name: 'Wolfspeed',          sector: 'Technology',       shortFloat: 11.2, daysToCover: 1.9, marketCapB:   2, perf1w: -4.1 },
    { ticker: 'BYSI',  name: 'BioAtla',            sector: 'Health Care',      shortFloat: 10.8, daysToCover: 3.2, marketCapB:   1, perf1w:  0.4 },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/equitiesDeepDive/data/mockEquityDeepDiveData.js
git commit -m "feat(equityDeepDive): mock data — sector, factor, earnings, short interest"
```

---

## Task 2: Data Hook + Tests

**Files:**
- Create: `src/markets/equitiesDeepDive/data/useEquityDeepDiveData.js`
- Create: `src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js`

- [ ] **Step 1: Write the failing tests**

```javascript
// src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useEquityDeepDiveData } from '../../markets/equitiesDeepDive/data/useEquityDeepDiveData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useEquityDeepDiveData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns sectorData with 12 sectors on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sectorData.sectors).toHaveLength(12);
    expect(result.current.sectorData.sectors[0]).toMatchObject({
      code: expect.any(String),
      name: expect.any(String),
      perf1d: expect.any(Number),
      perf1m: expect.any(Number),
    });
  });

  it('returns factorData with inFavor and 20 stocks on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.factorData.stocks).toHaveLength(20);
    expect(result.current.factorData.inFavor).toMatchObject({
      value: expect.any(Number),
      momentum: expect.any(Number),
    });
  });

  it('returns earningsData with upcoming events and beatRates on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.earningsData.upcoming.length).toBeGreaterThan(0);
    expect(result.current.earningsData.beatRates.length).toBeGreaterThan(0);
  });

  it('returns shortData with 20 mostShorted entries on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.shortData.mostShorted).toHaveLength(20);
    expect(result.current.shortData.mostShorted[0]).toMatchObject({
      ticker: expect.any(String),
      shortFloat: expect.any(Number),
    });
  });

  it('sets isLive true and replaces sectorData when server responds with sufficient data', async () => {
    const liveData = {
      sectorData: {
        sectors: Array.from({ length: 10 }, (_, i) => ({
          code: `X${i}`, name: `Sector ${i}`,
          perf1d: 0.5, perf1w: 1.0, perf1m: 2.0, perf3m: 5.0, perf1y: 12.0,
        })),
      },
      factorData:   { inFavor: { value: 10, momentum: 20, quality: 5, lowVol: -1 }, stocks: Array.from({ length: 12 }, (_, i) => ({ ticker: `T${i}`, name: `Stock ${i}`, sector: 'Technology', value: 50, momentum: 50, quality: 50, lowVol: 50, composite: 50 })) },
      earningsData: { upcoming: Array.from({ length: 6 }, (_, i) => ({ ticker: `E${i}`, name: `Co ${i}`, sector: 'Technology', date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100 })), beatRates: [] },
      shortData:    { mostShorted: Array.from({ length: 12 }, (_, i) => ({ ticker: `S${i}`, name: `Short ${i}`, sector: 'Technology', shortFloat: 15, daysToCover: 2, marketCapB: 5, perf1w: 1 })) },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.lastUpdated).toBe('2026-04-05');
    expect(result.current.sectorData.sectors[0].code).toBe('X0');
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('guard: does not apply live sectorData when sectors length < 8', async () => {
    const liveData = {
      sectorData: { sectors: [{ code: 'SPY', name: 'S&P 500', perf1d: 0.5, perf1w: 1.3, perf1m: 3.2, perf3m: 8.1, perf1y: 18.9 }] },
      factorData:   { inFavor: {}, stocks: [] },
      earningsData: { upcoming: [], beatRates: [] },
      shortData:    { mostShorted: [] },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useEquityDeepDiveData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.sectorData.sectors).toHaveLength(12);
    expect(result.current.isLive).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write the hook**

```javascript
// src/markets/equitiesDeepDive/data/useEquityDeepDiveData.js
import { useState, useEffect } from 'react';
import {
  sectorData    as mockSectorData,
  factorData    as mockFactorData,
  earningsData  as mockEarningsData,
  shortData     as mockShortData,
} from './mockEquityDeepDiveData';

const SERVER = '';

export function useEquityDeepDiveData() {
  const [sectorData,   setSectorData]   = useState(mockSectorData);
  const [factorData,   setFactorData]   = useState(mockFactorData);
  const [earningsData, setEarningsData] = useState(mockEarningsData);
  const [shortData,    setShortData]    = useState(mockShortData);
  const [isLive,       setIsLive]       = useState(false);
  const [lastUpdated,  setLastUpdated]  = useState('Mock data — 2026');
  const [isLoading,    setIsLoading]    = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/equityDeepDive`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.sectorData?.sectors?.length >= 8)       { setSectorData(data.sectorData);     anyReplaced = true; }
        if (data.factorData?.stocks?.length >= 10)       { setFactorData(data.factorData);     anyReplaced = true; }
        if (data.earningsData?.upcoming?.length >= 5)    { setEarningsData(data.earningsData); anyReplaced = true; }
        if (data.shortData?.mostShorted?.length >= 10)   { setShortData(data.shortData);       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { sectorData, factorData, earningsData, shortData, isLive, lastUpdated, isLoading };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js 2>&1 | tail -6`
Expected: `7 passed (7)`

- [ ] **Step 5: Commit**

```bash
git add src/markets/equitiesDeepDive/data/useEquityDeepDiveData.js \
  src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js
git commit -m "feat(equityDeepDive): data hook + 7 tests"
```

---

## Task 3: Root Component + CSS + Stubs + Tests

**Files:**
- Create: `src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.jsx`
- Create: `src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.css`
- Create: `src/markets/equitiesDeepDive/components/SectorRotation.jsx` (stub)
- Create: `src/markets/equitiesDeepDive/components/FactorRankings.jsx` (stub)
- Create: `src/markets/equitiesDeepDive/components/EarningsWatch.jsx` (stub)
- Create: `src/markets/equitiesDeepDive/components/ShortInterest.jsx` (stub)
- Create: `src/__tests__/equitiesDeepDive/EquitiesDeepDiveMarket.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/equitiesDeepDive/EquitiesDeepDiveMarket.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EquitiesDeepDiveMarket from '../../markets/equitiesDeepDive/EquitiesDeepDiveMarket';

vi.mock('../../markets/equitiesDeepDive/data/useEquityDeepDiveData', () => ({
  useEquityDeepDiveData: () => ({
    sectorData:   { sectors: [] },
    factorData:   { inFavor: {}, stocks: [] },
    earningsData: { upcoming: [], beatRates: [] },
    shortData:    { mostShorted: [] },
    isLive:       false,
    lastUpdated:  null,
    isLoading:    false,
  }),
}));

describe('EquitiesDeepDiveMarket', () => {
  it('renders 4 sub-tab buttons', () => {
    render(<EquitiesDeepDiveMarket />);
    expect(screen.getByRole('button', { name: 'Sector Rotation' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Factor Rankings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Earnings Watch'  })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Short Interest'  })).toBeInTheDocument();
  });

  it('shows Sector Rotation view by default', () => {
    render(<EquitiesDeepDiveMarket />);
    expect(screen.getByText(/etf performance/i)).toBeInTheDocument();
  });

  it('switches to Factor Rankings tab on click', () => {
    render(<EquitiesDeepDiveMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Factor Rankings' }));
    expect(screen.getByText(/factor in favor/i)).toBeInTheDocument();
  });

  it('switches to Earnings Watch tab on click', () => {
    render(<EquitiesDeepDiveMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Earnings Watch' }));
    expect(screen.getByText(/upcoming earnings/i)).toBeInTheDocument();
  });

  it('switches to Short Interest tab on click', () => {
    render(<EquitiesDeepDiveMarket />);
    fireEvent.click(screen.getByRole('button', { name: 'Short Interest' }));
    expect(screen.getByText(/most shorted/i)).toBeInTheDocument();
  });

  it('shows mock status bar when not live', () => {
    render(<EquitiesDeepDiveMarket />);
    expect(screen.getByText(/mock data/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write the 4 stub components**

```jsx
// src/markets/equitiesDeepDive/components/SectorRotation.jsx
export default function SectorRotation() {
  return <div className="eq-panel"><div className="eq-chart-title">ETF Performance</div></div>;
}
```

```jsx
// src/markets/equitiesDeepDive/components/FactorRankings.jsx
export default function FactorRankings() {
  return <div className="eq-panel"><div className="eq-chart-title">Factor In Favor</div></div>;
}
```

```jsx
// src/markets/equitiesDeepDive/components/EarningsWatch.jsx
export default function EarningsWatch() {
  return <div className="eq-panel"><div className="eq-chart-title">Upcoming Earnings</div></div>;
}
```

```jsx
// src/markets/equitiesDeepDive/components/ShortInterest.jsx
export default function ShortInterest() {
  return <div className="eq-panel"><div className="eq-chart-title">Most Shorted</div></div>;
}
```

- [ ] **Step 3: Write the root component and CSS**

```css
/* src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.css */
.eq-market { display: flex; flex-direction: column; height: 100%; background: #0f172a; }
.eq-market.eq-loading { align-items: center; justify-content: center; gap: 12px; }
.eq-loading-spinner {
  width: 36px; height: 36px; border: 3px solid #1e293b;
  border-top-color: #6366f1; border-radius: 50%;
  animation: eq-spin 0.8s linear infinite;
}
@keyframes eq-spin { to { transform: rotate(360deg); } }
.eq-loading-text { font-size: 12px; color: #64748b; }

.eq-sub-tabs {
  display: flex; gap: 2px; padding: 8px 12px 0;
  border-bottom: 1px solid #1e293b; background: #0f172a;
}
.eq-sub-tab {
  padding: 6px 14px; font-size: 12px; color: #64748b; background: none;
  border: none; border-bottom: 2px solid transparent; cursor: pointer;
  transition: color 0.15s, border-bottom-color 0.15s;
}
.eq-sub-tab:hover { color: #e2e8f0; }
.eq-sub-tab.active { color: #6366f1; border-bottom-color: #6366f1; }

.eq-status-bar {
  display: flex; align-items: center; gap: 12px; padding: 4px 14px;
  font-size: 10px; color: #475569; border-bottom: 1px solid #1e293b;
}
.eq-status-live { color: #6366f1; }
.eq-content { flex: 1; overflow: hidden; }
```

```jsx
// src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.jsx
import React, { useState } from 'react';
import { useEquityDeepDiveData } from './data/useEquityDeepDiveData';
import SectorRotation from './components/SectorRotation';
import FactorRankings from './components/FactorRankings';
import EarningsWatch  from './components/EarningsWatch';
import ShortInterest  from './components/ShortInterest';
import './EquitiesDeepDiveMarket.css';

const SUB_TABS = [
  { id: 'sectors',  label: 'Sector Rotation' },
  { id: 'factors',  label: 'Factor Rankings' },
  { id: 'earnings', label: 'Earnings Watch'  },
  { id: 'shorts',   label: 'Short Interest'  },
];

// snapshotDate/currency not used — equity analytics are market-session-based, not snapshot-dependent
export default function EquitiesDeepDiveMarket() {
  const [activeTab, setActiveTab] = useState('sectors');
  const { sectorData, factorData, earningsData, shortData, isLive, lastUpdated, isLoading } = useEquityDeepDiveData();

  if (isLoading) {
    return (
      <div className="eq-market eq-loading">
        <div className="eq-loading-spinner" />
        <span className="eq-loading-text">Loading equity data…</span>
      </div>
    );
  }

  return (
    <div className="eq-market">
      <div className="eq-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`eq-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="eq-status-bar">
        <span className={isLive ? 'eq-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="eq-content">
        {activeTab === 'sectors'  && <SectorRotation sectorData={sectorData} />}
        {activeTab === 'factors'  && <FactorRankings factorData={factorData} />}
        {activeTab === 'earnings' && <EarningsWatch  earningsData={earningsData} />}
        {activeTab === 'shorts'   && <ShortInterest  shortData={shortData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/equitiesDeepDive/EquitiesDeepDiveMarket.test.jsx 2>&1 | tail -6`
Expected: `6 passed (6)`

- [ ] **Step 5: Run full suite**

Run: `npm test -- --run 2>&1 | tail -4`
Expected: all previously passing tests still pass

- [ ] **Step 6: Commit**

```bash
git add src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.jsx \
  src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.css \
  src/markets/equitiesDeepDive/components/SectorRotation.jsx \
  src/markets/equitiesDeepDive/components/FactorRankings.jsx \
  src/markets/equitiesDeepDive/components/EarningsWatch.jsx \
  src/markets/equitiesDeepDive/components/ShortInterest.jsx \
  src/__tests__/equitiesDeepDive/EquitiesDeepDiveMarket.test.jsx
git commit -m "feat(equityDeepDive): root component + CSS + 4 stubs + 6 tests"
```

---

## Task 4: SectorRotation + EquityComponents.css + Tests

**Files:**
- Modify: `src/markets/equitiesDeepDive/components/SectorRotation.jsx` (replace stub)
- Create: `src/markets/equitiesDeepDive/components/EquityComponents.css`
- Create: `src/__tests__/equitiesDeepDive/SectorRotation.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/equitiesDeepDive/SectorRotation.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectorRotation from '../../markets/equitiesDeepDive/components/SectorRotation';
import { sectorData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('SectorRotation', () => {
  it('renders panel title', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getByText(/sector rotation/i)).toBeInTheDocument();
  });

  it('renders ETF performance chart title', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getByText(/etf performance/i)).toBeInTheDocument();
  });

  it('renders rotation quadrant chart title', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getByText(/rotation quadrant/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<SectorRotation sectorData={sectorData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null sectorData gracefully', () => {
    expect(() => render(<SectorRotation sectorData={null} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/equitiesDeepDive/SectorRotation.test.jsx 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write EquityComponents.css**

```css
/* src/markets/equitiesDeepDive/components/EquityComponents.css */

/* Panel layout */
.eq-panel { display: flex; flex-direction: column; height: 100%; background: #0f172a; overflow: hidden; }
.eq-panel-header { display: flex; align-items: center; gap: 12px; padding: 10px 14px 8px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.eq-panel-title { font-size: 13px; font-weight: 600; color: #e2e8f0; }
.eq-panel-subtitle { font-size: 10px; color: #64748b; }
.eq-panel-footer { font-size: 9px; color: #475569; padding: 4px 14px; border-top: 1px solid #1e293b; flex-shrink: 0; }

/* Grid layouts */
.eq-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; flex: 1; background: #1e293b; overflow: hidden; }
.eq-two-row { display: grid; grid-template-rows: 1fr 1fr; gap: 1px; flex: 1; background: #1e293b; overflow: hidden; }

/* Chart panels */
.eq-chart-panel { display: flex; flex-direction: column; background: #0f172a; padding: 8px 12px 4px; overflow: hidden; }
.eq-chart-title { font-size: 11px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; flex-shrink: 0; }
.eq-chart-subtitle { font-size: 9px; color: #64748b; margin-bottom: 4px; flex-shrink: 0; }
.eq-chart-wrap { flex: 1; min-height: 0; }

/* Scrollable table area */
.eq-scroll { flex: 1; overflow-y: auto; }

/* Tables */
.eq-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.eq-th {
  padding: 4px 8px; text-align: right; font-size: 9px; color: #64748b;
  text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #1e293b;
  position: sticky; top: 0; background: #0f172a; white-space: nowrap;
}
.eq-th:first-child, .eq-th:nth-child(2) { text-align: left; }
.eq-row { border-bottom: 1px solid #0f172a; }
.eq-row:hover { background: #1e293b; }
.eq-cell { padding: 4px 8px; color: #e2e8f0; text-align: right; }
.eq-cell:first-child, .eq-cell:nth-child(2) { text-align: left; }
.eq-sector { color: #64748b; font-size: 10px; }
.eq-score { font-weight: 600; font-size: 11px; border-radius: 3px; }
.eq-date { color: #64748b; font-size: 10px; white-space: nowrap; }
.eq-name { color: #64748b; font-size: 10px; }
.eq-num { font-family: monospace; }
.eq-muted { color: #64748b; }
.eq-dir { font-size: 12px; }

/* Heat cells — factor scores and sector performance */
.eq-heat-dg { background: #14532d; color: #86efac; }
.eq-heat-lg { background: #166534; color: #bbf7d0; }
.eq-heat-neu { background: #1e293b; color: #94a3b8; }
.eq-heat-lr { background: #7f1d1d; color: #fca5a5; }
.eq-heat-dr { background: #450a0a; color: #fca5a5; }
```

- [ ] **Step 4: Write SectorRotation.jsx (replace stub)**

```jsx
// src/markets/equitiesDeepDive/components/SectorRotation.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function buildRankedOption(sectors) {
  const spy = sectors.find(s => s.code === 'SPY');
  const spyRef = spy?.perf1m ?? 0;
  const etfs = [...sectors]
    .filter(s => s.code !== 'SPY')
    .sort((a, b) => (b.perf1m ?? -99) - (a.perf1m ?? -99));

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
      data: etfs.map(s => s.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: etfs.map(s => ({
        value: s.perf1m,
        itemStyle: { color: (s.perf1m ?? 0) >= spyRef ? '#6366f1' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: spyRef }],
        symbol: 'none',
        lineStyle: { color: '#e2e8f0', type: 'dashed', width: 1 },
        label: { show: true, formatter: 'SPY', color: '#94a3b8', fontSize: 9 },
      },
    }],
  };
}

function buildRotationOption(sectors) {
  const etfs = sectors.filter(s => s.code !== 'SPY');
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: p => `${p.data[2]}<br/>1M: ${p.data[0]?.toFixed(1)}%<br/>3M: ${p.data[1]?.toFixed(1)}%`,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: '1M %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'value',
      name: '3M %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'scatter',
      data: etfs.map(s => [s.perf1m ?? 0, s.perf3m ?? 0, s.code]),
      symbolSize: 14,
      itemStyle: { color: '#6366f1' },
      label: {
        show: true,
        formatter: p => p.data[2],
        position: 'right',
        color: '#94a3b8',
        fontSize: 9,
      },
      markLine: {
        data: [{ xAxis: 0 }, { yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

export default function SectorRotation({ sectorData }) {
  if (!sectorData) return null;
  const { sectors = [] } = sectorData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Sector Rotation</span>
        <span className="eq-panel-subtitle">1M performance vs S&amp;P 500 · rotation quadrant chart</span>
      </div>
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">ETF Performance</div>
          <div className="eq-chart-subtitle">1M return vs SPY benchmark · indigo = outperforming</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildRankedOption(sectors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Rotation Quadrant</div>
          <div className="eq-chart-subtitle">X = 1M · Y = 3M · top-right = Leading · top-left = Improving</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildRotationOption(sectors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/equitiesDeepDive/SectorRotation.test.jsx 2>&1 | tail -6`
Expected: `5 passed (5)`

Run: `npm test -- --run 2>&1 | tail -4`
Expected: all previously passing tests still pass

- [ ] **Step 6: Commit**

```bash
git add src/markets/equitiesDeepDive/components/SectorRotation.jsx \
  src/markets/equitiesDeepDive/components/EquityComponents.css \
  src/__tests__/equitiesDeepDive/SectorRotation.test.jsx
git commit -m "feat(equityDeepDive): SectorRotation dual charts + EquityComponents.css + 5 tests"
```

---

## Task 5: FactorRankings + Tests

**Files:**
- Modify: `src/markets/equitiesDeepDive/components/FactorRankings.jsx` (replace stub)
- Create: `src/__tests__/equitiesDeepDive/FactorRankings.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/equitiesDeepDive/FactorRankings.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FactorRankings from '../../markets/equitiesDeepDive/components/FactorRankings';
import { factorData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('FactorRankings', () => {
  it('renders panel title', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getByText(/factor rankings/i)).toBeInTheDocument();
  });

  it('renders factor in favor chart title', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getByText(/factor in favor/i)).toBeInTheDocument();
  });

  it('renders stock factor scores table title', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getByText(/stock factor scores/i)).toBeInTheDocument();
  });

  it('renders 1 echarts instance', () => {
    render(<FactorRankings factorData={factorData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(1);
  });

  it('handles null factorData gracefully', () => {
    expect(() => render(<FactorRankings factorData={null} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/equitiesDeepDive/FactorRankings.test.jsx 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write FactorRankings.jsx (replace stub)**

```jsx
// src/markets/equitiesDeepDive/components/FactorRankings.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function buildInFavorOption(inFavor) {
  const factors = [
    { name: 'Low-Vol',  value: inFavor.lowVol    ?? 0 },
    { name: 'Quality',  value: inFavor.quality   ?? 0 },
    { name: 'Value',    value: inFavor.value      ?? 0 },
    { name: 'Momentum', value: inFavor.momentum   ?? 0 },
  ];
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
      data: factors.map(f => f.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: factors.map(f => ({
        value: f.value,
        itemStyle: { color: f.value >= 0 ? '#6366f1' : '#ef4444' },
      })),
      markLine: {
        data: [{ xAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

function factorHeat(score) {
  if (score == null || Number.isNaN(score)) return 'eq-heat-neu';
  if (score >= 70) return 'eq-heat-dg';
  if (score >= 50) return 'eq-heat-lg';
  if (score >= 30) return 'eq-heat-neu';
  if (score >= 15) return 'eq-heat-lr';
  return 'eq-heat-dr';
}

export default function FactorRankings({ factorData }) {
  if (!factorData) return null;
  const { inFavor = {}, stocks = [] } = factorData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Factor Rankings</span>
        <span className="eq-panel-subtitle">Percentile scores 1–100 · composite = average of 4 factors</span>
      </div>
      <div className="eq-two-row">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Factor In Favor</div>
          <div className="eq-chart-subtitle">Month-to-date factor return · indigo = positive · which factor is working</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildInFavorOption(inFavor)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Stock Factor Scores</div>
          <div className="eq-chart-subtitle">Top 20 stocks by composite · green ≥ 70 · red ≤ 30</div>
          <div className="eq-scroll">
            <table className="eq-table">
              <thead>
                <tr>
                  <th className="eq-th">Ticker</th>
                  <th className="eq-th">Sector</th>
                  <th className="eq-th">Value</th>
                  <th className="eq-th">Momentum</th>
                  <th className="eq-th">Quality</th>
                  <th className="eq-th">Low-Vol</th>
                  <th className="eq-th">Composite</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map(s => (
                  <tr key={s.ticker} className="eq-row">
                    <td className="eq-cell"><strong>{s.ticker}</strong></td>
                    <td className="eq-cell eq-sector">{s.sector}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.value)}`}>{s.value}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.momentum)}`}>{s.momentum}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.quality)}`}>{s.quality}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.lowVol)}`}>{s.lowVol}</td>
                    <td className={`eq-cell eq-score ${factorHeat(s.composite)}`}><strong>{s.composite}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/equitiesDeepDive/FactorRankings.test.jsx 2>&1 | tail -6`
Expected: `5 passed (5)`

Run: `npm test -- --run 2>&1 | tail -4`
Expected: all previously passing tests still pass

- [ ] **Step 5: Commit**

```bash
git add src/markets/equitiesDeepDive/components/FactorRankings.jsx \
  src/__tests__/equitiesDeepDive/FactorRankings.test.jsx
git commit -m "feat(equityDeepDive): FactorRankings bar + factor table + 5 tests"
```

---

## Task 6: EarningsWatch + Tests

**Files:**
- Modify: `src/markets/equitiesDeepDive/components/EarningsWatch.jsx` (replace stub)
- Create: `src/__tests__/equitiesDeepDive/EarningsWatch.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/equitiesDeepDive/EarningsWatch.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EarningsWatch from '../../markets/equitiesDeepDive/components/EarningsWatch';
import { earningsData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('EarningsWatch', () => {
  it('renders panel title', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getByText(/earnings watch/i)).toBeInTheDocument();
  });

  it('renders upcoming earnings table title', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getByText(/upcoming earnings/i)).toBeInTheDocument();
  });

  it('renders sector beat rate chart title', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getByText(/sector beat rate/i)).toBeInTheDocument();
  });

  it('renders 1 echarts instance', () => {
    render(<EarningsWatch earningsData={earningsData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(1);
  });

  it('handles null earningsData gracefully', () => {
    expect(() => render(<EarningsWatch earningsData={null} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/equitiesDeepDive/EarningsWatch.test.jsx 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write EarningsWatch.jsx (replace stub)**

```jsx
// src/markets/equitiesDeepDive/components/EarningsWatch.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function beatColor(rate) {
  if (rate == null || Number.isNaN(rate)) return '#475569';
  if (rate >= 70) return '#6366f1';
  if (rate >= 50) return '#f59e0b';
  return '#ef4444';
}

function buildBeatRateOption(beatRates) {
  const sorted = [...beatRates].sort((a, b) => (b.beatRate ?? 0) - (a.beatRate ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        return `${params[0].name}: ${params[0].value?.toFixed(1)}% (${item?.beatCount}/${item?.totalCount})`;
      },
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      min: 0, max: 100,
      axisLine: { lineStyle: { color: '#1e293b' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.sector),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(s => ({
        value: s.beatRate,
        itemStyle: { color: beatColor(s.beatRate) },
      })),
      markLine: {
        data: [{ xAxis: 50 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: true, formatter: '50%', color: '#94a3b8', fontSize: 9 },
      },
    }],
  };
}

export default function EarningsWatch({ earningsData }) {
  if (!earningsData) return null;
  const { upcoming = [], beatRates = [] } = earningsData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Earnings Watch</span>
        <span className="eq-panel-subtitle">Next 14 days · EPS estimate vs prior quarter · last quarter beat rates</span>
      </div>
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Upcoming Earnings</div>
          <div className="eq-chart-subtitle">▲ est &gt; prior · ▼ est &lt; prior</div>
          <div className="eq-scroll">
            <table className="eq-table">
              <thead>
                <tr>
                  <th className="eq-th">Date</th>
                  <th className="eq-th">Company</th>
                  <th className="eq-th">EPS Est</th>
                  <th className="eq-th">Prior</th>
                  <th className="eq-th">Dir</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map(e => (
                  <tr key={e.ticker} className="eq-row">
                    <td className="eq-cell eq-date">{e.date}</td>
                    <td className="eq-cell">
                      <strong>{e.ticker}</strong>
                      <span className="eq-name"> {e.name}</span>
                    </td>
                    <td className="eq-cell eq-num">${e.epsEst?.toFixed(2)}</td>
                    <td className="eq-cell eq-num eq-muted">${e.epsPrev?.toFixed(2)}</td>
                    <td className="eq-cell eq-dir">
                      {(e.epsEst ?? 0) >= (e.epsPrev ?? 0) ? '▲' : '▼'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Sector Beat Rate</div>
          <div className="eq-chart-subtitle">Last quarter EPS beat % · indigo ≥70% · amber 50–70% · red &lt;50%</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildBeatRateOption(beatRates)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/equitiesDeepDive/EarningsWatch.test.jsx 2>&1 | tail -6`
Expected: `5 passed (5)`

Run: `npm test -- --run 2>&1 | tail -4`
Expected: all previously passing tests still pass

- [ ] **Step 5: Commit**

```bash
git add src/markets/equitiesDeepDive/components/EarningsWatch.jsx \
  src/__tests__/equitiesDeepDive/EarningsWatch.test.jsx
git commit -m "feat(equityDeepDive): EarningsWatch calendar + beat rate chart + 5 tests"
```

---

## Task 7: ShortInterest + Tests

**Files:**
- Modify: `src/markets/equitiesDeepDive/components/ShortInterest.jsx` (replace stub)
- Create: `src/__tests__/equitiesDeepDive/ShortInterest.test.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
// src/__tests__/equitiesDeepDive/ShortInterest.test.jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShortInterest from '../../markets/equitiesDeepDive/components/ShortInterest';
import { shortData } from '../../markets/equitiesDeepDive/data/mockEquityDeepDiveData';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

describe('ShortInterest', () => {
  it('renders panel title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getByText(/short interest/i)).toBeInTheDocument();
  });

  it('renders most shorted chart title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getByText(/most shorted/i)).toBeInTheDocument();
  });

  it('renders squeeze watch chart title', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getByText(/squeeze watch/i)).toBeInTheDocument();
  });

  it('renders 2 echarts instances', () => {
    render(<ShortInterest shortData={shortData} />);
    expect(screen.getAllByTestId('echarts-mock')).toHaveLength(2);
  });

  it('handles null shortData gracefully', () => {
    expect(() => render(<ShortInterest shortData={null} />)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/equitiesDeepDive/ShortInterest.test.jsx 2>&1 | tail -8`
Expected: FAIL

- [ ] **Step 3: Write ShortInterest.jsx (replace stub)**

```jsx
// src/markets/equitiesDeepDive/components/ShortInterest.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './EquityComponents.css';

function shortBarColor(v) {
  if (v == null || Number.isNaN(v)) return '#475569';
  if (v > 20) return '#ef4444';
  if (v > 10) return '#f59e0b';
  return '#22c55e';
}

function buildShortedOption(mostShorted) {
  const sorted = [...mostShorted].sort((a, b) => (b.shortFloat ?? 0) - (a.shortFloat ?? 0));
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: (params) => {
        const item = sorted[params[0].dataIndex];
        return `${params[0].name}: ${params[0].value?.toFixed(1)}% short · ${item?.daysToCover?.toFixed(1)}d to cover`;
      },
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
      data: sorted.map(s => s.ticker),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(s => ({
        value: s.shortFloat,
        itemStyle: { color: shortBarColor(s.shortFloat) },
      })),
      markLine: {
        data: [{ xAxis: 20 }, { xAxis: 10 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: true, color: '#64748b', fontSize: 9 },
      },
    }],
  };
}

function buildSqueezeOption(mostShorted) {
  const candidates = mostShorted.filter(s => (s.shortFloat ?? 0) > 10);
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: p => `${p.data[3]}<br/>Short Float: ${p.data[0]?.toFixed(1)}%<br/>1W Return: ${p.data[1]?.toFixed(1)}%`,
    },
    grid: { top: 28, right: 8, bottom: 28, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Short Float %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    yAxis: {
      type: 'value',
      name: '1W Return %',
      nameTextStyle: { color: '#64748b', fontSize: 9 },
      axisLine: { lineStyle: { color: '#334155' } },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
    },
    series: [{
      type: 'scatter',
      data: candidates.map(s => [s.shortFloat ?? 0, s.perf1w ?? 0, s.marketCapB ?? 1, s.ticker]),
      symbolSize: d => Math.max(8, Math.min(40, Math.sqrt(d[2] ?? 1) * 3)),
      itemStyle: { color: '#ef4444', opacity: 0.8 },
      label: {
        show: true,
        formatter: p => p.data[3],
        position: 'right',
        color: '#94a3b8',
        fontSize: 9,
      },
      markLine: {
        data: [{ xAxis: 15 }, { yAxis: 0 }],
        symbol: 'none',
        lineStyle: { color: '#475569', type: 'dashed', width: 1 },
        label: { show: false },
      },
    }],
  };
}

export default function ShortInterest({ shortData }) {
  if (!shortData) return null;
  const { mostShorted = [] } = shortData;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Short Interest</span>
        <span className="eq-panel-subtitle">Short float % · squeeze candidates: short &gt;10% + positive 1W momentum</span>
      </div>
      <div className="eq-two-col">
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Most Shorted</div>
          <div className="eq-chart-subtitle">Red &gt;20% · amber 10–20% · green &lt;10%</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildShortedOption(mostShorted)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="eq-chart-panel">
          <div className="eq-chart-title">Squeeze Watch</div>
          <div className="eq-chart-subtitle">X = short float · Y = 1W return · size = market cap · short &gt;10%</div>
          <div className="eq-chart-wrap">
            <ReactECharts option={buildSqueezeOption(mostShorted)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/equitiesDeepDive/ShortInterest.test.jsx 2>&1 | tail -6`
Expected: `5 passed (5)`

Run: `npm test -- --run 2>&1 | tail -4`
Expected: all previously passing tests still pass

- [ ] **Step 5: Commit**

```bash
git add src/markets/equitiesDeepDive/components/ShortInterest.jsx \
  src/__tests__/equitiesDeepDive/ShortInterest.test.jsx
git commit -m "feat(equityDeepDive): ShortInterest ranked bars + squeeze bubble + 5 tests"
```

---

## Task 8: Server Endpoint

**Files:**
- Modify: `server/index.js` — add `/api/equityDeepDive` endpoint after the globalMacro block

- [ ] **Step 1: Append guard test to useEquityDeepDiveData.test.js**

The test in Task 2 already covers the guard. Verify the 7 tests still pass:

Run: `npx vitest run src/__tests__/equitiesDeepDive/useEquityDeepDiveData.test.js 2>&1 | tail -6`
Expected: `7 passed (7)`

- [ ] **Step 2: Add the server endpoint**

In `server/index.js`, after the globalMacro block (after the `// --- Global Macro Market Data ---` section, around line 1340), add:

```javascript
// --- Equity Deep-Dive Market Data ---
const SECTOR_ETF_META = [
  { code: 'XLK',  name: 'Technology'        },
  { code: 'XLF',  name: 'Financials'        },
  { code: 'XLV',  name: 'Health Care'       },
  { code: 'XLE',  name: 'Energy'            },
  { code: 'XLI',  name: 'Industrials'       },
  { code: 'XLC',  name: 'Communication'     },
  { code: 'XLY',  name: 'Consumer Disc.'    },
  { code: 'XLP',  name: 'Consumer Staples'  },
  { code: 'XLRE', name: 'Real Estate'       },
  { code: 'XLB',  name: 'Materials'         },
  { code: 'XLU',  name: 'Utilities'         },
  { code: 'SPY',  name: 'S&P 500'           },
];
const SECTOR_ETF_TICKERS = SECTOR_ETF_META.map(s => s.code);

// Factor, earnings, short data — no clean free API; served from curated mock constants
const EQ_MOCK_FACTOR_DATA = {
  inFavor: { value: 12.3, momentum: 28.1, quality: 8.4, lowVol: -2.1 },
  stocks: [
    { ticker: 'NVDA',  name: 'NVIDIA',          sector: 'Technology',       value: 15, momentum: 98, quality: 82, lowVol: 12, composite: 52 },
    { ticker: 'MSFT',  name: 'Microsoft',        sector: 'Technology',       value: 42, momentum: 88, quality: 91, lowVol: 65, composite: 72 },
    { ticker: 'AAPL',  name: 'Apple',            sector: 'Technology',       value: 38, momentum: 82, quality: 88, lowVol: 58, composite: 67 },
    { ticker: 'AVGO',  name: 'Broadcom',         sector: 'Technology',       value: 45, momentum: 79, quality: 85, lowVol: 52, composite: 65 },
    { ticker: 'META',  name: 'Meta',             sector: 'Communication',    value: 55, momentum: 91, quality: 78, lowVol: 35, composite: 65 },
    { ticker: 'GOOGL', name: 'Alphabet',         sector: 'Communication',    value: 60, momentum: 75, quality: 86, lowVol: 60, composite: 70 },
    { ticker: 'JPM',   name: 'JPMorgan',         sector: 'Financials',       value: 72, momentum: 68, quality: 82, lowVol: 55, composite: 69 },
    { ticker: 'V',     name: 'Visa',             sector: 'Financials',       value: 55, momentum: 72, quality: 94, lowVol: 75, composite: 74 },
    { ticker: 'LLY',   name: 'Eli Lilly',        sector: 'Health Care',      value: 20, momentum: 85, quality: 88, lowVol: 48, composite: 60 },
    { ticker: 'UNH',   name: 'UnitedHealth',     sector: 'Health Care',      value: 65, momentum: 55, quality: 90, lowVol: 72, composite: 71 },
    { ticker: 'WMT',   name: 'Walmart',          sector: 'Consumer Staples', value: 48, momentum: 78, quality: 85, lowVol: 82, composite: 73 },
    { ticker: 'PG',    name: 'P&G',              sector: 'Consumer Staples', value: 52, momentum: 62, quality: 89, lowVol: 88, composite: 73 },
    { ticker: 'AMZN',  name: 'Amazon',           sector: 'Consumer Disc.',   value: 35, momentum: 80, quality: 75, lowVol: 40, composite: 58 },
    { ticker: 'HD',    name: 'Home Depot',       sector: 'Consumer Disc.',   value: 58, momentum: 65, quality: 82, lowVol: 62, composite: 67 },
    { ticker: 'CAT',   name: 'Caterpillar',      sector: 'Industrials',      value: 62, momentum: 72, quality: 78, lowVol: 58, composite: 68 },
    { ticker: 'HON',   name: 'Honeywell',        sector: 'Industrials',      value: 65, momentum: 58, quality: 85, lowVol: 70, composite: 70 },
    { ticker: 'XOM',   name: 'ExxonMobil',       sector: 'Energy',           value: 78, momentum: 45, quality: 72, lowVol: 62, composite: 64 },
    { ticker: 'CVX',   name: 'Chevron',          sector: 'Energy',           value: 80, momentum: 42, quality: 75, lowVol: 65, composite: 66 },
    { ticker: 'TSLA',  name: 'Tesla',            sector: 'Consumer Disc.',   value:  8, momentum: 62, quality: 55, lowVol: 15, composite: 35 },
    { ticker: 'INTC',  name: 'Intel',            sector: 'Technology',       value: 85, momentum: 22, quality: 45, lowVol: 52, composite: 51 },
  ],
};

const EQ_MOCK_EARNINGS_DATA = {
  upcoming: [
    { ticker: 'JPM',  name: 'JPMorgan Chase',   sector: 'Financials',      date: '2026-04-11', epsEst: 4.61, epsPrev: 4.44,  marketCapB: 680 },
    { ticker: 'WFC',  name: 'Wells Fargo',       sector: 'Financials',      date: '2026-04-11', epsEst: 1.24, epsPrev: 1.20,  marketCapB: 220 },
    { ticker: 'BAC',  name: 'Bank of America',   sector: 'Financials',      date: '2026-04-14', epsEst: 0.86, epsPrev: 0.83,  marketCapB: 315 },
    { ticker: 'GS',   name: 'Goldman Sachs',     sector: 'Financials',      date: '2026-04-14', epsEst: 9.85, epsPrev: 11.58, marketCapB: 175 },
    { ticker: 'UNH',  name: 'UnitedHealth',      sector: 'Health Care',     date: '2026-04-15', epsEst: 7.28, epsPrev: 6.91,  marketCapB: 540 },
    { ticker: 'JNJ',  name: 'Johnson & Johnson', sector: 'Health Care',     date: '2026-04-15', epsEst: 2.58, epsPrev: 2.71,  marketCapB: 390 },
    { ticker: 'NFLX', name: 'Netflix',           sector: 'Communication',   date: '2026-04-15', epsEst: 5.68, epsPrev: 5.35,  marketCapB: 320 },
    { ticker: 'TSLA', name: 'Tesla',             sector: 'Consumer Disc.',  date: '2026-04-22', epsEst: 0.52, epsPrev: 0.45,  marketCapB: 850 },
    { ticker: 'AAPL', name: 'Apple',             sector: 'Technology',      date: '2026-04-30', epsEst: 1.65, epsPrev: 2.18,  marketCapB: 3200 },
  ],
  beatRates: [
    { sector: 'Technology',       beatCount: 25, totalCount: 32, beatRate: 78.1 },
    { sector: 'Financials',       beatCount: 18, totalCount: 24, beatRate: 75.0 },
    { sector: 'Health Care',      beatCount: 14, totalCount: 20, beatRate: 70.0 },
    { sector: 'Industrials',      beatCount: 16, totalCount: 24, beatRate: 66.7 },
    { sector: 'Communication',    beatCount: 10, totalCount: 16, beatRate: 62.5 },
    { sector: 'Consumer Disc.',   beatCount: 12, totalCount: 20, beatRate: 60.0 },
    { sector: 'Consumer Staples', beatCount:  9, totalCount: 16, beatRate: 56.3 },
    { sector: 'Energy',           beatCount:  7, totalCount: 16, beatRate: 43.8 },
  ],
};

const EQ_MOCK_SHORT_DATA = {
  mostShorted: [
    { ticker: 'CVNA',  name: 'Carvana',           sector: 'Consumer Disc.',   shortFloat: 28.4, daysToCover: 4.2, marketCapB:  32, perf1w:  3.8 },
    { ticker: 'GME',   name: 'GameStop',           sector: 'Consumer Disc.',   shortFloat: 24.5, daysToCover: 3.2, marketCapB:   8, perf1w:  8.4 },
    { ticker: 'CHWY',  name: 'Chewy',              sector: 'Consumer Disc.',   shortFloat: 22.1, daysToCover: 2.8, marketCapB:  14, perf1w:  1.2 },
    { ticker: 'RIVN',  name: 'Rivian',             sector: 'Consumer Disc.',   shortFloat: 20.8, daysToCover: 2.1, marketCapB:  18, perf1w: -2.4 },
    { ticker: 'PLUG',  name: 'Plug Power',         sector: 'Industrials',      shortFloat: 19.6, daysToCover: 1.8, marketCapB:   4, perf1w: -3.8 },
    { ticker: 'LCID',  name: 'Lucid Group',        sector: 'Consumer Disc.',   shortFloat: 18.9, daysToCover: 2.4, marketCapB:   7, perf1w: -1.5 },
    { ticker: 'BYND',  name: 'Beyond Meat',        sector: 'Consumer Staples', shortFloat: 18.2, daysToCover: 3.1, marketCapB:   1, perf1w: -0.8 },
    { ticker: 'CLSK',  name: 'CleanSpark',         sector: 'Technology',       shortFloat: 17.5, daysToCover: 1.5, marketCapB:   3, perf1w:  5.2 },
    { ticker: 'UPST',  name: 'Upstart',            sector: 'Financials',       shortFloat: 16.8, daysToCover: 2.2, marketCapB:   5, perf1w:  6.8 },
    { ticker: 'MARA',  name: 'Marathon Digital',   sector: 'Technology',       shortFloat: 16.2, daysToCover: 1.8, marketCapB:   5, perf1w:  4.1 },
    { ticker: 'NKLA',  name: 'Nikola',             sector: 'Industrials',      shortFloat: 15.8, daysToCover: 1.2, marketCapB:   1, perf1w: -5.2 },
    { ticker: 'OPEN',  name: 'Opendoor',           sector: 'Real Estate',      shortFloat: 15.2, daysToCover: 2.8, marketCapB:   3, perf1w:  2.1 },
    { ticker: 'SPCE',  name: 'Virgin Galactic',    sector: 'Industrials',      shortFloat: 14.1, daysToCover: 1.5, marketCapB:   2, perf1w: -3.4 },
    { ticker: 'SAVA',  name: 'Cassava Sciences',   sector: 'Health Care',      shortFloat: 13.8, daysToCover: 4.5, marketCapB:   1, perf1w:  1.8 },
    { ticker: 'LAZR',  name: 'Luminar',            sector: 'Technology',       shortFloat: 13.2, daysToCover: 2.1, marketCapB:   3, perf1w: -1.2 },
    { ticker: 'IONQ',  name: 'IonQ',               sector: 'Technology',       shortFloat: 12.8, daysToCover: 1.8, marketCapB:   5, perf1w:  9.2 },
    { ticker: 'ARRY',  name: 'Array Technologies', sector: 'Industrials',      shortFloat: 12.1, daysToCover: 2.4, marketCapB:   4, perf1w:  3.5 },
    { ticker: 'XPEV',  name: 'XPeng',              sector: 'Consumer Disc.',   shortFloat: 11.8, daysToCover: 2.2, marketCapB:  14, perf1w:  2.8 },
    { ticker: 'WOLF',  name: 'Wolfspeed',          sector: 'Technology',       shortFloat: 11.2, daysToCover: 1.9, marketCapB:   2, perf1w: -4.1 },
    { ticker: 'BYSI',  name: 'BioAtla',            sector: 'Health Care',      shortFloat: 10.8, daysToCover: 3.2, marketCapB:   1, perf1w:  0.4 },
  ],
};

app.get('/api/equityDeepDive', async (req, res) => {
  const cacheKey = 'equityDeepDive_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // 1. Fetch live quotes for all 12 sector ETFs
    let quotesMap = {};
    try {
      const raw = await yf.quote(SECTOR_ETF_TICKERS);
      const arr = Array.isArray(raw) ? raw : [raw];
      arr.filter(q => q).forEach(q => { quotesMap[q.symbol] = q; });
    } catch (e) {
      console.warn('Equity ETF quotes failed:', e.message);
    }

    // 2. Fetch 1-year daily history for all ETFs (multi-timeframe returns)
    const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
    const histEnd   = new Date().toISOString().split('T')[0];
    const histResults = await Promise.allSettled(
      SECTOR_ETF_TICKERS.map(ticker =>
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

    // 3. Compute multi-timeframe performance for each ETF
    const perf = (closes, n) => {
      const len = closes.length;
      if (len < n + 1) return null;
      const prev = closes[Math.max(0, len - 1 - n)];
      const curr = closes[len - 1];
      return prev > 0 ? Math.round((curr - prev) / prev * 1000) / 10 : null;
    };

    const sectors = SECTOR_ETF_META.map(s => {
      const q      = quotesMap[s.code];
      const closes = chartMap[s.code] || [];
      return {
        code:   s.code,
        name:   s.name,
        perf1d: q?.regularMarketChangePercent != null ? Math.round(q.regularMarketChangePercent * 100) / 100 : null,
        perf1w: perf(closes, 5),
        perf1m: perf(closes, 21),
        perf3m: perf(closes, 63),
        perf1y: closes.length >= 2 ? perf(closes, closes.length - 1) : null,
      };
    });

    const result = {
      sectorData:   { sectors },
      factorData:   EQ_MOCK_FACTOR_DATA,
      earningsData: EQ_MOCK_EARNINGS_DATA,
      shortData:    EQ_MOCK_SHORT_DATA,
      lastUpdated:  new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    console.error('EquityDeepDive API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 3: Run full test suite**

Run: `npm test -- --run 2>&1 | tail -5`
Expected: all previously passing tests still pass

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(equityDeepDive): /api/equityDeepDive endpoint — live ETF data + mock factor/earnings/short"
```

---

## Task 9: Hub Wiring

**Files:**
- Modify: `src/hub/markets.config.js`
- Modify: `src/hub/HubLayout.jsx`

- [ ] **Step 1: Add equitiesDeepDive to markets config**

In `src/hub/markets.config.js`, add after the `globalMacro` entry:

```javascript
{ id: 'equitiesDeepDive', label: 'Equity+', icon: '🔍' }
```

Full file after edit:

```javascript
// src/hub/markets.config.js
export const MARKETS = [
  { id: 'equities',       label: 'Equities',    icon: '📈' },
  { id: 'bonds',          label: 'Bonds',        icon: '🏛️' },
  { id: 'fx',             label: 'FX',           icon: '💱' },
  { id: 'derivatives',    label: 'Derivatives',  icon: '📊' },
  { id: 'realEstate',     label: 'Real Estate',  icon: '🏠' },
  { id: 'insurance',      label: 'Insurance',    icon: '🛡️' },
  { id: 'commodities',    label: 'Commodities',  icon: '🛢️' },
  { id: 'globalMacro',    label: 'Macro',        icon: '🌐' },
  { id: 'equitiesDeepDive', label: 'Equity+',   icon: '🔍' },
];

export const DEFAULT_MARKET = 'equities';
```

- [ ] **Step 2: Wire EquitiesDeepDiveMarket into HubLayout**

In `src/hub/HubLayout.jsx`, add the import after the GlobalMacroMarket import:

```javascript
import EquitiesDeepDiveMarket from '../markets/equitiesDeepDive/EquitiesDeepDiveMarket';
```

Add to `MARKET_COMPONENTS`:

```javascript
equitiesDeepDive: EquitiesDeepDiveMarket,
```

Full file after edit:

```jsx
import React, { useState } from 'react';
import MarketTabBar from './MarketTabBar';
import { DEFAULT_MARKET } from './markets.config';
import EquitiesMarket        from '../markets/equities/EquitiesMarket';
import BondsMarket           from '../markets/bonds/BondsMarket';
import FXMarket              from '../markets/fx/FXMarket';
import DerivativesMarket     from '../markets/derivatives/DerivativesMarket';
import RealEstateMarket      from '../markets/realEstate/RealEstateMarket';
import InsuranceMarket       from '../markets/insurance/InsuranceMarket';
import CommoditiesMarket     from '../markets/commodities/CommoditiesMarket';
import GlobalMacroMarket     from '../markets/globalMacro/GlobalMacroMarket';
import EquitiesDeepDiveMarket from '../markets/equitiesDeepDive/EquitiesDeepDiveMarket';

const MARKET_COMPONENTS = {
  equities:          EquitiesMarket,
  bonds:             BondsMarket,
  fx:                FXMarket,
  derivatives:       DerivativesMarket,
  realEstate:        RealEstateMarket,
  insurance:         InsuranceMarket,
  commodities:       CommoditiesMarket,
  globalMacro:       GlobalMacroMarket,
  equitiesDeepDive:  EquitiesDeepDiveMarket,
};

export default function HubLayout() {
  const [activeMarket, setActiveMarket] = useState(DEFAULT_MARKET);
  const [currency, setCurrency]         = useState('USD');
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

- [ ] **Step 3: Run full test suite**

Run: `npm test -- --run 2>&1 | tail -5`
Expected: ~299 tests passing (267 + 32 new)

- [ ] **Step 4: Commit and push**

```bash
git add src/hub/markets.config.js src/hub/HubLayout.jsx
git commit -m "feat(equityDeepDive): wire Equity+ tab into hub — markets.config + HubLayout"
git push
```
