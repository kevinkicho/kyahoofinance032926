# Macro Events Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 13th market tab — Calendar (rose `#f43f5e`, `cal-` prefix) — with 4 sub-views: Economic Calendar, Central Bank Schedule, Earnings Season, Key Releases.

**Architecture:** Single `/api/calendar` endpoint with `Promise.allSettled` fetching Econdb (economic events), static central bank schedule + FRED rates, yahoo-finance2 calendarEvents (earnings batch), and FRED releases/dates (key US releases). Same two-tier cache. Client follows the established pattern: mock fallback, `anyReplaced` guards, `isLive` flag.

**Tech Stack:** Express (ESM), Econdb API (no auth), yahoo-finance2, FRED API (existing key), React 18, ECharts

---

## File Map

**Create:**
- `src/markets/calendar/CalendarMarket.jsx` — root component with 4 sub-tabs
- `src/markets/calendar/CalendarMarket.css` — rose accent layout styles
- `src/markets/calendar/components/EconomicCalendar.jsx` — event table with country filter
- `src/markets/calendar/components/CentralBankSchedule.jsx` — 4 bank cards + timeline
- `src/markets/calendar/components/EarningsSeason.jsx` — week-grouped earnings table
- `src/markets/calendar/components/KeyReleases.jsx` — categorized release timeline
- `src/markets/calendar/components/CalendarComponents.css` — shared component styles
- `src/markets/calendar/data/mockCalendarData.js` — mock data for all 4 segments
- `src/markets/calendar/data/useCalendarData.js` — hook with anyReplaced pattern
- `src/__tests__/calendar/useCalendarData.test.js` — 8 tests

**Modify:**
- `server/index.js` — add `/api/calendar` endpoint + 'calendar' to CACHEABLE_MARKETS
- `src/hub/markets.config.js` — add calendar entry
- `src/hub/HubLayout.jsx` — add CalendarMarket import + registration
- `vite.config.js` — add `/api/calendar` proxy

---

## Task 1: Mock Data

**Files:**
- Create: `src/markets/calendar/data/mockCalendarData.js`

- [ ] **Step 1: Create the mock data file with all 4 segments**

```js
// src/markets/calendar/data/mockCalendarData.js

export const economicEvents = [
  { date: '2026-04-07', country: 'US', event: 'Consumer Credit', actual: null, expected: 15.0, previous: 18.1, importance: 2 },
  { date: '2026-04-08', country: 'US', event: 'NFIB Small Business Optimism', actual: null, expected: 100.7, previous: 100.7, importance: 2 },
  { date: '2026-04-10', country: 'US', event: 'CPI YoY', actual: null, expected: 2.6, previous: 2.8, importance: 3 },
  { date: '2026-04-10', country: 'US', event: 'CPI MoM', actual: null, expected: 0.1, previous: 0.2, importance: 3 },
  { date: '2026-04-10', country: 'DE', event: 'CPI YoY Final', actual: null, expected: 2.2, previous: 2.3, importance: 2 },
  { date: '2026-04-11', country: 'US', event: 'PPI MoM', actual: null, expected: 0.2, previous: 0.0, importance: 2 },
  { date: '2026-04-11', country: 'GB', event: 'GDP MoM', actual: null, expected: 0.1, previous: -0.1, importance: 3 },
  { date: '2026-04-14', country: 'CN', event: 'Trade Balance (USD)', actual: null, expected: 74.0, previous: 170.5, importance: 2 },
  { date: '2026-04-15', country: 'US', event: 'Retail Sales MoM', actual: null, expected: 0.4, previous: 0.2, importance: 3 },
  { date: '2026-04-16', country: 'US', event: 'Housing Starts', actual: null, expected: 1410, previous: 1501, importance: 2 },
  { date: '2026-04-17', country: 'US', event: 'Initial Jobless Claims', actual: null, expected: 223, previous: 219, importance: 2 },
  { date: '2026-04-17', country: 'EU', event: 'ECB Interest Rate Decision', actual: null, expected: 2.50, previous: 2.65, importance: 3 },
  { date: '2026-04-22', country: 'US', event: 'Existing Home Sales', actual: null, expected: 4.14, previous: 4.26, importance: 2 },
  { date: '2026-04-25', country: 'US', event: 'Durable Goods Orders MoM', actual: null, expected: 1.0, previous: 0.9, importance: 2 },
  { date: '2026-04-29', country: 'US', event: 'CB Consumer Confidence', actual: null, expected: 93.0, previous: 92.9, importance: 3 },
  { date: '2026-04-30', country: 'US', event: 'GDP QoQ Advance', actual: null, expected: 2.3, previous: 2.4, importance: 3 },
  { date: '2026-04-30', country: 'EU', event: 'GDP QoQ Flash', actual: null, expected: 0.2, previous: 0.2, importance: 3 },
  { date: '2026-05-01', country: 'US', event: 'ISM Manufacturing PMI', actual: null, expected: 49.5, previous: 50.3, importance: 3 },
  { date: '2026-05-02', country: 'US', event: 'Nonfarm Payrolls', actual: null, expected: 195, previous: 228, importance: 3 },
  { date: '2026-05-02', country: 'US', event: 'Unemployment Rate', actual: null, expected: 4.2, previous: 4.1, importance: 3 },
];

export const centralBanks = [
  { bank: 'Fed',  rate: 4.50, nextMeeting: '2026-05-06', daysUntil: 31, previousRate: 4.50 },
  { bank: 'ECB',  rate: 2.65, nextMeeting: '2026-04-16', daysUntil: 11, previousRate: 2.90 },
  { bank: 'BOE',  rate: 4.50, nextMeeting: '2026-05-07', daysUntil: 32, previousRate: 4.50 },
  { bank: 'BOJ',  rate: 0.50, nextMeeting: '2026-04-30', daysUntil: 25, previousRate: 0.50 },
];

export const earningsSeason = [
  { ticker: 'JPM',  name: 'JPMorgan Chase', date: '2026-04-11', epsEst: 4.61, epsPrev: 4.44, marketCapB: 680 },
  { ticker: 'WFC',  name: 'Wells Fargo',    date: '2026-04-11', epsEst: 1.24, epsPrev: 1.20, marketCapB: 220 },
  { ticker: 'BAC',  name: 'Bank of America', date: '2026-04-14', epsEst: 0.86, epsPrev: 0.83, marketCapB: 315 },
  { ticker: 'GS',   name: 'Goldman Sachs',  date: '2026-04-14', epsEst: 9.85, epsPrev: 11.58, marketCapB: 175 },
  { ticker: 'UNH',  name: 'UnitedHealth',   date: '2026-04-15', epsEst: 7.28, epsPrev: 6.91, marketCapB: 540 },
  { ticker: 'NFLX', name: 'Netflix',        date: '2026-04-15', epsEst: 5.68, epsPrev: 5.35, marketCapB: 320 },
  { ticker: 'TSLA', name: 'Tesla',          date: '2026-04-22', epsEst: 0.52, epsPrev: 0.45, marketCapB: 850 },
  { ticker: 'MSFT', name: 'Microsoft',      date: '2026-04-29', epsEst: 3.22, epsPrev: 3.30, marketCapB: 3100 },
  { ticker: 'META', name: 'Meta Platforms',  date: '2026-04-30', epsEst: 5.28, epsPrev: 4.71, marketCapB: 1500 },
  { ticker: 'AAPL', name: 'Apple',          date: '2026-04-30', epsEst: 1.65, epsPrev: 2.18, marketCapB: 3200 },
  { ticker: 'AMZN', name: 'Amazon',         date: '2026-05-01', epsEst: 1.38, epsPrev: 1.29, marketCapB: 2100 },
  { ticker: 'NVDA', name: 'NVIDIA',         date: '2026-05-21', epsEst: 0.89, epsPrev: 0.82, marketCapB: 2800 },
];

export const keyReleases = [
  { name: 'CPI',                     date: '2026-04-10', category: 'inflation',  previousValue: '2.8% YoY' },
  { name: 'PPI',                     date: '2026-04-11', category: 'inflation',  previousValue: '0.0% MoM' },
  { name: 'Retail Sales',            date: '2026-04-15', category: 'consumer',   previousValue: '0.2% MoM' },
  { name: 'Housing Starts',          date: '2026-04-16', category: 'housing',    previousValue: '1,501K' },
  { name: 'Industrial Production',   date: '2026-04-17', category: 'growth',     previousValue: '0.7% MoM' },
  { name: 'PCE Price Index',         date: '2026-04-25', category: 'inflation',  previousValue: '2.5% YoY' },
  { name: 'GDP (Advance)',           date: '2026-04-30', category: 'growth',     previousValue: '2.4% QoQ' },
  { name: 'Employment Situation',    date: '2026-05-02', category: 'employment', previousValue: '228K / 4.1%' },
  { name: 'ISM Manufacturing',       date: '2026-05-01', category: 'growth',     previousValue: '50.3' },
  { name: 'Consumer Confidence',     date: '2026-04-29', category: 'sentiment',  previousValue: '92.9' },
];
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926"
git add src/markets/calendar/data/mockCalendarData.js
git commit -m "feat(calendar): mock data for all 4 segments"
```

---

## Task 2: Hook + Tests

**Files:**
- Create: `src/markets/calendar/data/useCalendarData.js`
- Create: `src/__tests__/calendar/useCalendarData.test.js`

- [ ] **Step 1: Create the hook**

```js
// src/markets/calendar/data/useCalendarData.js
import { useState, useEffect } from 'react';
import {
  economicEvents  as mockEconomicEvents,
  centralBanks    as mockCentralBanks,
  earningsSeason  as mockEarningsSeason,
  keyReleases     as mockKeyReleases,
} from './mockCalendarData';

const SERVER = '';

export function useCalendarData() {
  const [economicEvents,  setEconomicEvents]  = useState(mockEconomicEvents);
  const [centralBanks,    setCentralBanks]    = useState(mockCentralBanks);
  const [earningsSeason,  setEarningsSeason]  = useState(mockEarningsSeason);
  const [keyReleases,     setKeyReleases]     = useState(mockKeyReleases);
  const [isLive,          setIsLive]          = useState(false);
  const [lastUpdated,     setLastUpdated]     = useState('Mock data — Apr 2026');
  const [isLoading,       setIsLoading]       = useState(true);
  const [fetchedOn,       setFetchedOn]       = useState(null);
  const [isCurrent,       setIsCurrent]       = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/calendar`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.economicEvents?.length >= 5) { setEconomicEvents(data.economicEvents); anyReplaced = true; }
        if (data.centralBanks?.length >= 3)   { setCentralBanks(data.centralBanks);     anyReplaced = true; }
        if (data.earningsSeason?.length >= 5)  { setEarningsSeason(data.earningsSeason); anyReplaced = true; }
        if (data.keyReleases?.length >= 3)    { setKeyReleases(data.keyReleases);       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { economicEvents, centralBanks, earningsSeason, keyReleases, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 2: Create the test file**

```js
// src/__tests__/calendar/useCalendarData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCalendarData } from '../../markets/calendar/data/useCalendarData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCalendarData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns mock economicEvents on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.economicEvents.length).toBeGreaterThanOrEqual(10);
    expect(result.current.economicEvents[0]).toMatchObject({
      date: expect.any(String), country: expect.any(String), event: expect.any(String),
    });
  });

  it('returns mock centralBanks on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.centralBanks).toHaveLength(4);
    expect(result.current.centralBanks[0]).toMatchObject({
      bank: expect.any(String), rate: expect.any(Number), nextMeeting: expect.any(String),
    });
  });

  it('returns mock earningsSeason on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.earningsSeason.length).toBeGreaterThanOrEqual(8);
    expect(result.current.earningsSeason[0]).toMatchObject({
      ticker: expect.any(String), date: expect.any(String),
    });
  });

  it('returns mock keyReleases on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.keyReleases.length).toBeGreaterThanOrEqual(8);
    expect(result.current.keyReleases[0]).toMatchObject({
      name: expect.any(String), date: expect.any(String), category: expect.any(String),
    });
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true when server responds with valid data', async () => {
    const liveData = {
      economicEvents: Array.from({ length: 8 }, (_, i) => ({
        date: '2026-04-10', country: 'US', event: `Event${i}`,
        actual: null, expected: i, previous: i - 1, importance: 3,
      })),
      centralBanks: [
        { bank: 'Fed', rate: 4.50, nextMeeting: '2026-05-06', daysUntil: 31, previousRate: 4.50 },
        { bank: 'ECB', rate: 2.65, nextMeeting: '2026-04-16', daysUntil: 11, previousRate: 2.90 },
        { bank: 'BOE', rate: 4.50, nextMeeting: '2026-05-07', daysUntil: 32, previousRate: 4.50 },
      ],
      earningsSeason: Array.from({ length: 6 }, (_, i) => ({
        ticker: `T${i}`, name: `Co${i}`, date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100,
      })),
      keyReleases: Array.from({ length: 5 }, (_, i) => ({
        name: `Release${i}`, date: '2026-04-10', category: 'inflation', previousValue: '2.8%',
      })),
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.economicEvents).toHaveLength(8);
    expect(result.current.lastUpdated).toBe('2026-04-05');
  });

  it('guard: does not apply economicEvents when length < 5', async () => {
    const liveData = {
      economicEvents: [{ date: '2026-04-10', country: 'US', event: 'CPI', actual: null, expected: 2.6, previous: 2.8, importance: 3 }],
      centralBanks: [], earningsSeason: [], keyReleases: [],
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.economicEvents.length).toBeGreaterThanOrEqual(10); // mock untouched
    expect(result.current.isLive).toBe(false);
  });

  it('exposes fetchedOn and isCurrent', async () => {
    const liveData = {
      economicEvents: Array.from({ length: 8 }, (_, i) => ({
        date: '2026-04-10', country: 'US', event: `Ev${i}`, actual: null, expected: i, previous: i, importance: 3,
      })),
      centralBanks: [
        { bank: 'Fed', rate: 4.50, nextMeeting: '2026-05-06', daysUntil: 31, previousRate: 4.50 },
        { bank: 'ECB', rate: 2.65, nextMeeting: '2026-04-16', daysUntil: 11, previousRate: 2.90 },
        { bank: 'BOE', rate: 4.50, nextMeeting: '2026-05-07', daysUntil: 32, previousRate: 4.50 },
      ],
      earningsSeason: Array.from({ length: 6 }, (_, i) => ({
        ticker: `T${i}`, name: `Co${i}`, date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100,
      })),
      keyReleases: Array.from({ length: 5 }, (_, i) => ({
        name: `R${i}`, date: '2026-04-10', category: 'growth', previousValue: '2.4%',
      })),
      fetchedOn: '2026-04-05', isCurrent: true,
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchedOn).toBe('2026-04-05');
    expect(result.current.isCurrent).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926"
npx vitest run src/__tests__/calendar/useCalendarData.test.js
```

Expected: 8 tests passing.

- [ ] **Step 4: Commit**

```bash
git add src/markets/calendar/data/useCalendarData.js src/__tests__/calendar/useCalendarData.test.js
git commit -m "feat(calendar): useCalendarData hook + 8 tests"
```

---

## Task 3: CSS Styles

**Files:**
- Create: `src/markets/calendar/CalendarMarket.css`
- Create: `src/markets/calendar/components/CalendarComponents.css`

- [ ] **Step 1: Create CalendarMarket.css**

```css
/* src/markets/calendar/CalendarMarket.css */
.cal-market { display: flex; flex-direction: column; height: 100%; background: #0f172a; }
.cal-market.cal-loading { align-items: center; justify-content: center; gap: 12px; }
.cal-loading-spinner {
  width: 36px; height: 36px; border: 3px solid #1e293b;
  border-top-color: #f43f5e; border-radius: 50%;
  animation: cal-spin 0.8s linear infinite;
}
@keyframes cal-spin { to { transform: rotate(360deg); } }
.cal-loading-text { font-size: 12px; color: #64748b; }

.cal-sub-tabs {
  display: flex; gap: 2px; padding: 8px 12px 0;
  border-bottom: 1px solid #1e293b; background: #0f172a;
}
.cal-sub-tab {
  padding: 6px 14px; font-size: 12px; color: #64748b; background: none;
  border: none; border-bottom: 2px solid transparent; cursor: pointer;
}
.cal-sub-tab:hover { color: #e2e8f0; }
.cal-sub-tab.active { color: #f43f5e; border-bottom-color: #f43f5e; }

.cal-status-bar {
  display: flex; align-items: center; gap: 12px; padding: 4px 14px;
  font-size: 10px; color: #475569; border-bottom: 1px solid #1e293b;
}
.cal-status-live { color: #f43f5e; }
.cal-content { flex: 1; overflow: auto; }

.cal-stale-badge {
  background: #4c0519; color: #fda4af; border: 1px solid #be123c;
  border-radius: 10px; padding: 1px 8px; font-size: 10px; font-weight: 500;
}
```

- [ ] **Step 2: Create CalendarComponents.css**

```css
/* src/markets/calendar/components/CalendarComponents.css */

/* ── Shared panel ──────────────────────────────────────────────────────────── */
.cal-panel {
  margin: 10px; padding: 0; background: #0f172a; border: 1px solid #1e293b;
  border-radius: 10px; overflow: hidden;
}
.cal-panel-header {
  display: flex; flex-wrap: wrap; align-items: baseline; gap: 8px;
  padding: 10px 14px; border-bottom: 1px solid #1e293b;
}
.cal-panel-title { font-size: 13px; font-weight: 600; color: #f1f5f9; }
.cal-panel-subtitle { font-size: 10px; color: #475569; }
.cal-panel-footer { padding: 6px 14px; font-size: 9px; color: #334155; border-top: 1px solid #1e293b; }

/* ── Filter pills ──────────────────────────────────────────────────────────── */
.cal-filter-bar { display: flex; gap: 4px; padding: 8px 14px; flex-wrap: wrap; }
.cal-filter-pill {
  padding: 3px 10px; font-size: 10px; border-radius: 10px; cursor: pointer;
  background: #1e293b; color: #94a3b8; border: 1px solid #334155;
}
.cal-filter-pill:hover { background: #334155; }
.cal-filter-pill.active { background: #f43f5e; color: #fff; border-color: #f43f5e; }

/* ── Event table ───────────────────────────────────────────────────────────── */
.cal-table { width: 100%; border-collapse: collapse; font-size: 11px; }
.cal-table th {
  text-align: left; padding: 6px 10px; font-weight: 600; color: #64748b;
  font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px;
  border-bottom: 1px solid #1e293b; background: #0f172a; position: sticky; top: 0;
}
.cal-table td { padding: 5px 10px; color: #cbd5e1; border-bottom: 1px solid #0f172a; }
.cal-table tr:hover td { background: #1e293b; }
.cal-table .cal-upcoming { opacity: 1; }
.cal-table .cal-released td { opacity: 0.6; }
.cal-surprise-pos { color: #34d399; font-weight: 600; }
.cal-surprise-neg { color: #f87171; font-weight: 600; }
.cal-surprise-na  { color: #475569; }

/* ── Country flag ──────────────────────────────────────────────────────────── */
.cal-flag { margin-right: 4px; }

/* ── Central bank cards ────────────────────────────────────────────────────── */
.cal-cb-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px 14px; }
.cal-cb-card {
  background: #1e293b; border-radius: 10px; padding: 14px 16px;
  border: 1px solid #334155;
}
.cal-cb-bank { font-size: 14px; font-weight: 700; color: #f1f5f9; margin-bottom: 6px; }
.cal-cb-rate { font-size: 22px; font-weight: 700; font-family: monospace; color: #e2e8f0; margin-bottom: 4px; }
.cal-cb-next { font-size: 10px; color: #94a3b8; }
.cal-cb-countdown { font-size: 11px; color: #f43f5e; font-weight: 600; margin-top: 4px; }
.cal-cb-decision {
  display: inline-block; padding: 2px 8px; border-radius: 8px;
  font-size: 9px; font-weight: 700; margin-top: 6px;
}
.cal-cb-hold { background: #334155; color: #94a3b8; }
.cal-cb-hike { background: #7f1d1d; color: #fca5a5; }
.cal-cb-cut  { background: #14532d; color: #86efac; }

/* ── Timeline ──────────────────────────────────────────────────────────────── */
.cal-timeline { padding: 12px 14px; border-top: 1px solid #1e293b; }
.cal-timeline-title { font-size: 11px; color: #64748b; margin-bottom: 8px; }
.cal-timeline-row {
  display: flex; align-items: center; gap: 8px; padding: 3px 0;
  font-size: 10px; color: #94a3b8;
}
.cal-timeline-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.cal-dot-fed { background: #3b82f6; }
.cal-dot-ecb { background: #facc15; }
.cal-dot-boe { background: #ef4444; }
.cal-dot-boj { background: #e2e8f0; }

/* ── Earnings season ───────────────────────────────────────────────────────── */
.cal-week-group { margin-bottom: 2px; }
.cal-week-header {
  padding: 6px 14px; font-size: 11px; font-weight: 600; color: #64748b;
  background: #0f172a; border-bottom: 1px solid #1e293b;
}
.cal-week-current { color: #f43f5e; border-left: 3px solid #f43f5e; }

/* ── Key releases ──────────────────────────────────────────────────────────── */
.cal-release-list { padding: 8px 14px; }
.cal-release-item {
  display: flex; align-items: center; gap: 12px; padding: 6px 0;
  border-bottom: 1px solid #1e293b; font-size: 11px;
}
.cal-release-date { min-width: 70px; color: #64748b; font-family: monospace; font-size: 10px; }
.cal-release-name { color: #e2e8f0; font-weight: 500; flex: 1; }
.cal-release-prev { color: #64748b; font-size: 10px; }
.cal-cat-badge {
  display: inline-block; padding: 1px 7px; border-radius: 8px;
  font-size: 9px; font-weight: 600; margin-left: 6px;
}
.cal-cat-inflation  { background: #7f1d1d; color: #fca5a5; }
.cal-cat-employment { background: #1e3a5f; color: #93c5fd; }
.cal-cat-growth     { background: #14532d; color: #86efac; }
.cal-cat-consumer   { background: #78350f; color: #fcd34d; }
.cal-cat-housing    { background: #7c2d12; color: #fdba74; }
.cal-cat-sentiment  { background: #3b0764; color: #c4b5fd; }
```

- [ ] **Step 3: Commit**

```bash
git add src/markets/calendar/CalendarMarket.css src/markets/calendar/components/CalendarComponents.css
git commit -m "feat(calendar): rose accent CSS for market + components"
```

---

## Task 4: EconomicCalendar Component

**Files:**
- Create: `src/markets/calendar/components/EconomicCalendar.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/markets/calendar/components/EconomicCalendar.jsx
import React, { useState, useMemo } from 'react';
import './CalendarComponents.css';

function countryFlag(cc) {
  if (!cc || cc.length !== 2) return '';
  return String.fromCodePoint(...[...cc.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

const REGION_FILTERS = [
  { id: 'all',  label: 'All',   codes: null },
  { id: 'us',   label: 'US',    codes: ['US'] },
  { id: 'eu',   label: 'Europe', codes: ['EU','DE','FR','GB','IT','ES'] },
  { id: 'asia', label: 'Asia',  codes: ['CN','JP','KR','IN','AU'] },
];

export default function EconomicCalendar({ economicEvents }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!economicEvents?.length) return [];
    const f = REGION_FILTERS.find(r => r.id === filter);
    if (!f || !f.codes) return economicEvents;
    return economicEvents.filter(e => f.codes.includes(e.country));
  }, [economicEvents, filter]);

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Economic Calendar</span>
        <span className="cal-panel-subtitle">High-importance macro releases · next 30 days · Econdb</span>
      </div>
      <div className="cal-filter-bar">
        {REGION_FILTERS.map(r => (
          <button
            key={r.id}
            className={`cal-filter-pill${filter === r.id ? ' active' : ''}`}
            onClick={() => setFilter(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div style={{ overflow: 'auto', maxHeight: 480 }}>
        <table className="cal-table">
          <thead>
            <tr>
              <th>Date</th>
              <th></th>
              <th>Event</th>
              <th>Actual</th>
              <th>Expected</th>
              <th>Previous</th>
              <th>Surprise</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => {
              const surprise = e.actual != null && e.expected != null ? Math.round((e.actual - e.expected) * 100) / 100 : null;
              return (
                <tr key={i} className={e.actual != null ? 'cal-released' : 'cal-upcoming'}>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{e.date}</td>
                  <td><span className="cal-flag">{countryFlag(e.country)}</span></td>
                  <td style={{ fontWeight: 500 }}>{e.event}</td>
                  <td style={{ fontFamily: 'monospace' }}>{e.actual ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{e.expected ?? '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{e.previous ?? '—'}</td>
                  <td className={surprise > 0 ? 'cal-surprise-pos' : surprise < 0 ? 'cal-surprise-neg' : 'cal-surprise-na'}>
                    {surprise != null ? (surprise > 0 ? '+' : '') + surprise : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="cal-panel-footer">
        Released events shown at reduced opacity · Surprise = Actual − Expected
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/calendar/components/EconomicCalendar.jsx
git commit -m "feat(calendar): EconomicCalendar event table with country filter"
```

---

## Task 5: CentralBankSchedule Component

**Files:**
- Create: `src/markets/calendar/components/CentralBankSchedule.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/markets/calendar/components/CentralBankSchedule.jsx
import React from 'react';
import './CalendarComponents.css';

const BANK_FLAGS = { Fed: '🇺🇸', ECB: '🇪🇺', BOE: '🇬🇧', BOJ: '🇯🇵' };
const BANK_DOTS  = { Fed: 'cal-dot-fed', ECB: 'cal-dot-ecb', BOE: 'cal-dot-boe', BOJ: 'cal-dot-boj' };

// Static 2026 meeting schedules for the timeline
const ALL_MEETINGS = {
  Fed: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'],
  ECB: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'],
  BOE: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'],
  BOJ: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'],
};

function decisionBadge(rate, previousRate) {
  if (previousRate == null || rate == null) return null;
  const diff = Math.round((rate - previousRate) * 100);
  if (diff > 0) return <span className="cal-cb-decision cal-cb-hike">HIKE +{diff}bp</span>;
  if (diff < 0) return <span className="cal-cb-decision cal-cb-cut">CUT {diff}bp</span>;
  return <span className="cal-cb-decision cal-cb-hold">HOLD</span>;
}

export default function CentralBankSchedule({ centralBanks }) {
  if (!centralBanks?.length) return null;

  const today = new Date().toISOString().split('T')[0];

  // Build future timeline (next 6 months of meetings across all banks)
  const timelineEntries = [];
  Object.entries(ALL_MEETINGS).forEach(([bank, dates]) => {
    dates.filter(d => d >= today).slice(0, 3).forEach(d => {
      timelineEntries.push({ bank, date: d });
    });
  });
  timelineEntries.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Central Bank Schedule</span>
        <span className="cal-panel-subtitle">Policy rate decisions · Fed / ECB / BOE / BOJ · FRED live rates</span>
      </div>
      <div className="cal-cb-grid">
        {centralBanks.map(cb => (
          <div key={cb.bank} className="cal-cb-card">
            <div className="cal-cb-bank">{BANK_FLAGS[cb.bank] || ''} {cb.bank}</div>
            <div className="cal-cb-rate">{cb.rate != null ? cb.rate.toFixed(2) : '—'}%</div>
            <div className="cal-cb-next">Next: {cb.nextMeeting}</div>
            <div className="cal-cb-countdown">{cb.daysUntil != null ? `${cb.daysUntil} days` : ''}</div>
            {decisionBadge(cb.rate, cb.previousRate)}
          </div>
        ))}
      </div>
      <div className="cal-timeline">
        <div className="cal-timeline-title">Upcoming Meetings</div>
        {timelineEntries.slice(0, 12).map((e, i) => (
          <div key={i} className="cal-timeline-row">
            <span className={`cal-timeline-dot ${BANK_DOTS[e.bank] || ''}`} />
            <span style={{ minWidth: 80, fontFamily: 'monospace' }}>{e.date}</span>
            <span>{e.bank}</span>
          </div>
        ))}
      </div>
      <div className="cal-panel-footer">
        Dates from 2026 published schedules · Rates from FRED (BOJ rate approximate)
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/calendar/components/CentralBankSchedule.jsx
git commit -m "feat(calendar): CentralBankSchedule cards + timeline"
```

---

## Task 6: EarningsSeason Component

**Files:**
- Create: `src/markets/calendar/components/EarningsSeason.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/markets/calendar/components/EarningsSeason.jsx
import React, { useMemo } from 'react';
import './CalendarComponents.css';

function weekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7)); // Monday
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const fmt = d2 => `${d2.toLocaleString('en-US', { month: 'short' })} ${d2.getDate()}`;
  return `${fmt(mon)}–${fmt(fri)}`;
}

function isCurrentWeek(dateStr) {
  const now = new Date();
  const d = new Date(dateStr + 'T00:00:00');
  const nowMon = new Date(now); nowMon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const dMon = new Date(d); dMon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return nowMon.toISOString().split('T')[0] === dMon.toISOString().split('T')[0];
}

export default function EarningsSeason({ earningsSeason }) {
  const grouped = useMemo(() => {
    if (!earningsSeason?.length) return [];
    const groups = {};
    earningsSeason.forEach(e => {
      const wk = weekLabel(e.date);
      if (!groups[wk]) groups[wk] = { label: wk, isCurrent: isCurrentWeek(e.date), entries: [] };
      groups[wk].entries.push(e);
    });
    return Object.values(groups);
  }, [earningsSeason]);

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Earnings Season</span>
        <span className="cal-panel-subtitle">Mega-cap earnings dates · next 60 days · Yahoo Finance calendarEvents</span>
      </div>
      {grouped.map(g => (
        <div key={g.label} className="cal-week-group">
          <div className={`cal-week-header${g.isCurrent ? ' cal-week-current' : ''}`}>
            {g.isCurrent ? '▸ ' : ''}{g.label}
          </div>
          <table className="cal-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Company</th>
                <th>EPS Est</th>
                <th>Prior EPS</th>
                <th>Mkt Cap ($B)</th>
              </tr>
            </thead>
            <tbody>
              {g.entries.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'monospace', fontSize: 10, color: '#64748b' }}>{e.date}</td>
                  <td style={{ fontWeight: 700, color: '#f43f5e' }}>{e.ticker}</td>
                  <td>{e.name}</td>
                  <td style={{ fontFamily: 'monospace' }}>{e.epsEst != null ? `$${e.epsEst.toFixed(2)}` : '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{e.epsPrev != null ? `$${e.epsPrev.toFixed(2)}` : '—'}</td>
                  <td style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{e.marketCapB != null ? `$${e.marketCapB.toLocaleString()}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="cal-panel-footer">
        30 mega-cap stocks tracked · EPS estimates from Yahoo Finance earningsTrend
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/calendar/components/EarningsSeason.jsx
git commit -m "feat(calendar): EarningsSeason week-grouped table"
```

---

## Task 7: KeyReleases Component

**Files:**
- Create: `src/markets/calendar/components/KeyReleases.jsx`

- [ ] **Step 1: Create the component**

```jsx
// src/markets/calendar/components/KeyReleases.jsx
import React from 'react';
import './CalendarComponents.css';

const CAT_CSS = {
  inflation:  'cal-cat-inflation',
  employment: 'cal-cat-employment',
  growth:     'cal-cat-growth',
  consumer:   'cal-cat-consumer',
  housing:    'cal-cat-housing',
  sentiment:  'cal-cat-sentiment',
};

export default function KeyReleases({ keyReleases }) {
  if (!keyReleases?.length) return null;

  return (
    <div className="cal-panel">
      <div className="cal-panel-header">
        <span className="cal-panel-title">Key US Releases</span>
        <span className="cal-panel-subtitle">Scheduled macro data releases · FRED releases/dates</span>
      </div>
      <div className="cal-release-list">
        {keyReleases.map((r, i) => (
          <div key={i} className="cal-release-item">
            <span className="cal-release-date">{r.date}</span>
            <span className="cal-release-name">
              {r.name}
              <span className={`cal-cat-badge ${CAT_CSS[r.category] || ''}`}>{r.category}</span>
            </span>
            {r.previousValue && <span className="cal-release-prev">Prev: {r.previousValue}</span>}
          </div>
        ))}
      </div>
      <div className="cal-panel-footer">
        Dates from FRED release schedule · Previous values shown where available · No consensus forecasts (proprietary)
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/calendar/components/KeyReleases.jsx
git commit -m "feat(calendar): KeyReleases categorized timeline"
```

---

## Task 8: CalendarMarket Root + Hub Wiring

**Files:**
- Create: `src/markets/calendar/CalendarMarket.jsx`
- Modify: `src/hub/markets.config.js`
- Modify: `src/hub/HubLayout.jsx`
- Modify: `vite.config.js`

- [ ] **Step 1: Create CalendarMarket.jsx**

```jsx
// src/markets/calendar/CalendarMarket.jsx
import React, { useState } from 'react';
import { useCalendarData } from './data/useCalendarData';
import EconomicCalendar    from './components/EconomicCalendar';
import CentralBankSchedule from './components/CentralBankSchedule';
import EarningsSeason      from './components/EarningsSeason';
import KeyReleases         from './components/KeyReleases';
import './CalendarMarket.css';

const SUB_TABS = [
  { id: 'economic',      label: 'Economic Calendar'  },
  { id: 'central-banks', label: 'Central Banks'      },
  { id: 'earnings',      label: 'Earnings Season'    },
  { id: 'releases',      label: 'Key Releases'       },
];

export default function CalendarMarket() {
  const [activeTab, setActiveTab] = useState('economic');
  const { economicEvents, centralBanks, earningsSeason, keyReleases, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCalendarData();

  if (isLoading) {
    return (
      <div className="cal-market cal-loading">
        <div className="cal-loading-spinner" />
        <span className="cal-loading-text">Loading calendar data…</span>
      </div>
    );
  }

  return (
    <div className="cal-market">
      <div className="cal-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`cal-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="cal-status-bar">
        <span className={isLive ? 'cal-status-live' : ''}>
          {isLive ? '● Live · Econdb / FRED / Yahoo Finance' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="cal-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="cal-content">
        {activeTab === 'economic'      && <EconomicCalendar    economicEvents={economicEvents} />}
        {activeTab === 'central-banks' && <CentralBankSchedule centralBanks={centralBanks} />}
        {activeTab === 'earnings'      && <EarningsSeason      earningsSeason={earningsSeason} />}
        {activeTab === 'releases'      && <KeyReleases         keyReleases={keyReleases} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add to markets.config.js**

In `src/hub/markets.config.js`, add before the closing `];`:
```js
  { id: 'calendar', label: 'Calendar', icon: '📅' },
```

- [ ] **Step 3: Add to HubLayout.jsx**

Add import after the SentimentMarket import (line 15):
```js
import CalendarMarket from '../markets/calendar/CalendarMarket';
```

Add to MARKET_COMPONENTS object (after `sentiment: SentimentMarket,`):
```js
  calendar:          CalendarMarket,
```

- [ ] **Step 4: Add proxy to vite.config.js**

In `vite.config.js`, add after the `/api/sentiment` proxy line (line 184):
```js
      '/api/calendar':     { target: 'http://localhost:3001', changeOrigin: true },
```

- [ ] **Step 5: Commit**

```bash
git add src/markets/calendar/CalendarMarket.jsx src/hub/markets.config.js src/hub/HubLayout.jsx vite.config.js
git commit -m "feat(calendar): CalendarMarket root + hub wiring + vite proxy"
```

---

## Task 9: Server Endpoint

**Files:**
- Modify: `server/index.js` — add `/api/calendar` endpoint and 'calendar' to CACHEABLE_MARKETS

- [ ] **Step 1: Add 'calendar' to CACHEABLE_MARKETS**

Find line 237:
```js
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto','credit','sentiment'];
```

Replace with:
```js
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto','credit','sentiment','calendar'];
```

- [ ] **Step 2: Add the /api/calendar endpoint**

Before the `app.listen(port, ...)` line (line 2602), add the complete endpoint:

```js
// --- Macro Events Calendar ---
const CB_SCHEDULE = {
  Fed: { dates: ['2026-01-28','2026-03-18','2026-05-06','2026-06-17','2026-07-29','2026-09-16','2026-11-04','2026-12-16'], fredSeries: 'FEDFUNDS' },
  ECB: { dates: ['2026-01-22','2026-03-05','2026-04-16','2026-06-04','2026-07-16','2026-09-10','2026-10-29','2026-12-17'], fredSeries: 'ECBDFR' },
  BOE: { dates: ['2026-02-05','2026-03-19','2026-05-07','2026-06-18','2026-08-06','2026-09-17','2026-11-05','2026-12-17'], fredSeries: 'BOERUKQ' },
  BOJ: { dates: ['2026-01-22','2026-03-12','2026-04-30','2026-06-18','2026-07-16','2026-09-17','2026-10-29','2026-12-17'], fredSeries: null },
};

const EARNINGS_CAL_TICKERS = [
  'AAPL','MSFT','NVDA','AMZN','META','GOOGL','JPM','GS','BAC','WFC',
  'XOM','CVX','UNH','LLY','JNJ','PG','WMT','HD','COST','NFLX',
  'TSLA','V','MA','AVGO','CRM','ORCL','ADBE','AMD','INTC','PEP',
];
const EARNINGS_CAL_META = {
  AAPL: 'Apple', MSFT: 'Microsoft', NVDA: 'NVIDIA', AMZN: 'Amazon', META: 'Meta',
  GOOGL: 'Alphabet', JPM: 'JPMorgan', GS: 'Goldman Sachs', BAC: 'Bank of America',
  WFC: 'Wells Fargo', XOM: 'ExxonMobil', CVX: 'Chevron', UNH: 'UnitedHealth',
  LLY: 'Eli Lilly', JNJ: 'J&J', PG: 'P&G', WMT: 'Walmart', HD: 'Home Depot',
  COST: 'Costco', NFLX: 'Netflix', TSLA: 'Tesla', V: 'Visa', MA: 'Mastercard',
  AVGO: 'Broadcom', CRM: 'Salesforce', ORCL: 'Oracle', ADBE: 'Adobe',
  AMD: 'AMD', INTC: 'Intel', PEP: 'PepsiCo',
};

const MAJOR_FRED_RELEASES = {
  10:  { name: 'CPI', category: 'inflation' },
  46:  { name: 'PPI', category: 'inflation' },
  53:  { name: 'GDP', category: 'growth' },
  50:  { name: 'Employment Situation', category: 'employment' },
  103: { name: 'Retail Sales', category: 'consumer' },
  13:  { name: 'PCE Price Index', category: 'inflation' },
  82:  { name: 'Consumer Confidence', category: 'sentiment' },
  14:  { name: 'Industrial Production', category: 'growth' },
  205: { name: 'Housing Starts', category: 'housing' },
  58:  { name: 'ISM Manufacturing', category: 'growth' },
};

app.get('/api/calendar', async (req, res) => {
  const cacheKey = 'calendar_data';
  const today = todayStr();

  const daily = readDailyCache('calendar');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const plus30d = (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split('T')[0]; })();
    const plus60d = (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().split('T')[0]; })();

    const [econResult, cbRatesResult, earningsResult, releasesResult] = await Promise.allSettled([
      // 1. Econdb economic calendar
      fetchJSON(`https://www.econdb.com/api/calendar/events/?date_from=${today}&date_to=${plus30d}&importance=2&format=json`)
        .then(data => {
          const events = Array.isArray(data) ? data : (data?.results || []);
          return events
            .filter(e => e.importance >= 2)
            .slice(0, 50)
            .map(e => ({
              date: (e.date || '').split('T')[0],
              country: e.country || e.iso || '',
              event: e.event || e.indicator || '',
              actual: e.actual ?? null,
              expected: e.consensus ?? e.forecast ?? null,
              previous: e.previous ?? null,
              importance: e.importance || 2,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
        }),

      // 2. Central bank rates from FRED
      Promise.allSettled(
        Object.entries(CB_SCHEDULE).map(async ([bank, cfg]) => {
          let rate = null;
          let previousRate = null;
          if (cfg.fredSeries && FRED_API_KEY) {
            try {
              const hist = await fetchFredHistory(cfg.fredSeries, 3);
              if (hist.length >= 1) rate = hist.at(-1).value;
              if (hist.length >= 2) previousRate = hist.at(-2).value;
            } catch { /* use null */ }
          }
          if (bank === 'BOJ' && rate == null) { rate = 0.50; previousRate = 0.25; }
          const nowDate = today;
          const nextMeeting = cfg.dates.find(d => d >= nowDate) || cfg.dates.at(-1);
          const daysUntil = nextMeeting ? Math.round((new Date(nextMeeting) - new Date(nowDate)) / 86400000) : null;
          return { bank, rate, nextMeeting, daysUntil, previousRate };
        })
      ).then(results => results.filter(r => r.status === 'fulfilled').map(r => r.value)),

      // 3. Earnings season from Yahoo Finance
      Promise.allSettled(
        EARNINGS_CAL_TICKERS.map(t =>
          yf.quoteSummary(t, { modules: ['calendarEvents', 'defaultKeyStatistics'] })
            .then(d => ({ ticker: t, ...d }))
        )
      ).then(results => {
        const now = new Date();
        const limit = new Date(now); limit.setDate(limit.getDate() + 60);
        const entries = [];
        results.forEach(r => {
          if (r.status !== 'fulfilled') return;
          const s = r.value;
          const ed = s.calendarEvents?.earnings?.earningsDate?.[0];
          if (!ed) return;
          const edDate = new Date(ed);
          if (edDate < now || edDate > limit) return;
          entries.push({
            ticker: s.ticker,
            name: EARNINGS_CAL_META[s.ticker] || s.ticker,
            date: typeof ed === 'string' ? ed.split('T')[0] : edDate.toISOString().split('T')[0],
            epsEst: s.calendarEvents?.earnings?.earningsAverage ?? null,
            epsPrev: s.defaultKeyStatistics?.trailingEps ?? null,
            marketCapB: s.defaultKeyStatistics?.marketCap ? Math.round(s.defaultKeyStatistics.marketCap / 1e9) : null,
          });
        });
        entries.sort((a, b) => a.date.localeCompare(b.date));
        return entries;
      }),

      // 4. Key FRED releases
      FRED_API_KEY
        ? fetchJSON(`https://api.stlouisfed.org/fred/releases/dates?api_key=${FRED_API_KEY}&file_type=json&include_release_dates_with_no_data=true&limit=200`)
            .then(data => {
              const dates = data?.release_dates || [];
              const majorIds = Object.keys(MAJOR_FRED_RELEASES).map(Number);
              return dates
                .filter(d => majorIds.includes(d.release_id) && d.date >= today)
                .map(d => {
                  const info = MAJOR_FRED_RELEASES[d.release_id];
                  return { name: info.name, date: d.date, category: info.category, previousValue: null };
                })
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 20);
            })
        : Promise.resolve([]),
    ]);

    const result = {
      economicEvents: econResult.status === 'fulfilled' ? econResult.value : [],
      centralBanks:   cbRatesResult.status === 'fulfilled' ? cbRatesResult.value : [],
      earningsSeason: earningsResult.status === 'fulfilled' ? earningsResult.value : [],
      keyReleases:    releasesResult.status === 'fulfilled' ? releasesResult.value : [],
      lastUpdated: today,
    };

    writeDailyCache('calendar', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Calendar API error:', error);
    const fallback = readLatestCache('calendar');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926"
git add server/index.js
git commit -m "feat(calendar): /api/calendar endpoint — Econdb + FRED + Yahoo + CB schedule"
```

---

## Task 10: Run Full Test Suite

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd "C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926"
npx vitest run
```

Expected: >= 324 tests passing (316 existing + 8 new calendar tests), 0 failing.

- [ ] **Step 2: Fix any failures and commit**

If any tests fail, read the failure, fix the source file, re-run, then commit:
```bash
git add <affected files>
git commit -m "fix: <description of fix>"
```

---

## Self-Review

**Spec coverage:**
- ✅ Economic Calendar (Econdb API, table, country filter, surprise) → Tasks 1, 4, 9
- ✅ Central Bank Schedule (static dates + FRED rates, cards + timeline) → Tasks 1, 5, 9
- ✅ Earnings Season (yahoo-finance2 calendarEvents batch, week-grouped) → Tasks 1, 6, 9
- ✅ Key Releases (FRED releases/dates, categorized timeline) → Tasks 1, 7, 9
- ✅ Hook with anyReplaced guards → Task 2
- ✅ 8 tests → Task 2
- ✅ CSS (rose #f43f5e, cal- prefix) → Task 3
- ✅ Hub wiring (markets.config, HubLayout, vite proxy) → Task 8
- ✅ CACHEABLE_MARKETS updated → Task 9
- ✅ Two-tier cache → Task 9

**Type consistency:**
- `economicEvents[].{date, country, event, actual, expected, previous, importance}` — mock, hook, component, server all match ✅
- `centralBanks[].{bank, rate, nextMeeting, daysUntil, previousRate}` — all match ✅
- `earningsSeason[].{ticker, name, date, epsEst, epsPrev, marketCapB}` — all match ✅
- `keyReleases[].{name, date, category, previousValue}` — all match ✅

**Placeholder scan:** No TBD, TODO, or "implement later" found ✅
