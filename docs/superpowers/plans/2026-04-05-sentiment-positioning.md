# Sentiment & Positioning (Sub-project 12) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Sentiment & Positioning 🎭 market tab (violet #7c3aed, `sent-` prefix) with 4 sub-views — Fear & Greed (cross-asset composite), CFTC Positioning (11 futures markets), Risk Dashboard (6 live signals), and Cross-Asset Returns (8-ETF heatmap) — while simultaneously removing the Fear & Greed sub-tab from Derivatives.

**Architecture:** Single `/api/sentiment` Express endpoint fetches CFTC Socrata API, FRED (VIXCLS/BAMLH0A0HYM2/BAMLC0A0CM/T10Y2Y), Alternative.me Fear & Greed, and Yahoo Finance (8 ETFs) in parallel via `Promise.allSettled`. Two-tier cache: daily file cache wraps 300s node-cache. `useSentimentData` hook uses the `anyReplaced` pattern with mock fallback. Fear & Greed component, fearGreedData state, vixHistory state, and vixHistory FRED fetch are removed from the Derivatives tab.

**Tech Stack:** React 18, ECharts (echarts-for-react), Express, node-cache, daily file cache, FRED API (key from env), yahoo-finance2, Alternative.me (no key), CFTC Socrata API (no key)

---

## File Map

**Create:**
- `src/markets/sentiment/data/mockSentimentData.js`
- `src/markets/sentiment/data/useSentimentData.js`
- `src/markets/sentiment/SentimentMarket.jsx`
- `src/markets/sentiment/SentimentMarket.css`
- `src/markets/sentiment/components/SentimentComponents.css`
- `src/markets/sentiment/components/FearGreed.jsx`
- `src/markets/sentiment/components/CftcPositioning.jsx`
- `src/markets/sentiment/components/RiskDashboard.jsx`
- `src/markets/sentiment/components/CrossAssetReturns.jsx`
- `src/__tests__/sentiment/useSentimentData.test.js`

**Modify:**
- `server/index.js` — add `/api/sentiment` + `'sentiment'` in CACHEABLE_MARKETS + remove fearGreedData/vixHistory from `/api/derivatives`
- `src/markets/derivatives/DerivativesMarket.jsx` — remove Fear & Greed sub-tab
- `src/markets/derivatives/data/useDerivativesData.js` — remove fearGreedData + vixHistory
- `src/hub/markets.config.js` — add sentiment market
- `src/hub/HubLayout.jsx` — import SentimentMarket
- `vite.config.js` — add `/api/sentiment` proxy

**Delete:**
- `src/markets/derivatives/components/FearGreed.jsx`

---

## Task 1: Derivatives Cleanup

**Files:**
- Modify: `src/markets/derivatives/DerivativesMarket.jsx`
- Modify: `src/markets/derivatives/data/useDerivativesData.js`
- Delete: `src/markets/derivatives/components/FearGreed.jsx`
- Modify: `server/index.js` (derivatives endpoint portion only)

- [ ] **Step 1: Update DerivativesMarket.jsx**

Replace the entire file with:

```jsx
// src/markets/derivatives/DerivativesMarket.jsx
import React, { useState } from 'react';
import { useDerivativesData } from './data/useDerivativesData';
import VolSurface       from './components/VolSurface';
import VIXTermStructure from './components/VIXTermStructure';
import OptionsFlow      from './components/OptionsFlow';
import './DerivativesMarket.css';

const SUB_TABS = [
  { id: 'vol-surface',        label: 'Vol Surface'        },
  { id: 'vix-term-structure', label: 'VIX Term Structure' },
  { id: 'options-flow',       label: 'Options Flow'       },
];

export default function DerivativesMarket() {
  const [activeTab, setActiveTab] = useState('vol-surface');
  const { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useDerivativesData();

  if (isLoading) {
    return (
      <div className="deriv-market deriv-loading">
        <div className="deriv-loading-spinner" />
        <span className="deriv-loading-text">Loading derivatives data…</span>
      </div>
    );
  }

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
          {isLive ? '● Live · Yahoo Finance / CBOE' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="deriv-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="deriv-content">
        {activeTab === 'vol-surface'        && <VolSurface       volSurfaceData={volSurfaceData} volPremium={volPremium} />}
        {activeTab === 'vix-term-structure' && <VIXTermStructure vixTermStructure={vixTermStructure} vixEnrichment={vixEnrichment} />}
        {activeTab === 'options-flow'       && <OptionsFlow      optionsFlow={optionsFlow} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update useDerivativesData.js**

Replace the entire file with:

```js
// src/markets/derivatives/data/useDerivativesData.js
import { useState, useEffect } from 'react';
import {
  volSurfaceData  as mockVolSurfaceData,
  vixTermStructure as mockVixTermStructure,
  optionsFlow     as mockOptionsFlow,
} from './mockDerivativesData';

const SERVER = '';

export function useDerivativesData() {
  const [volSurfaceData,   setVolSurfaceData]   = useState(mockVolSurfaceData);
  const [vixTermStructure, setVixTermStructure] = useState(mockVixTermStructure);
  const [optionsFlow,      setOptionsFlow]      = useState(mockOptionsFlow);
  const [vixEnrichment,    setVixEnrichment]    = useState(null);
  const [volPremium,       setVolPremium]       = useState(null);
  const [isLive,           setIsLive]           = useState(false);
  const [lastUpdated,      setLastUpdated]      = useState('Mock data — Apr 2025');
  const [isLoading,        setIsLoading]        = useState(true);
  const [fetchedOn,        setFetchedOn]        = useState(null);
  const [isCurrent,        setIsCurrent]        = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${SERVER}/api/derivatives`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.vixTermStructure?.dates?.length)           setVixTermStructure(data.vixTermStructure);
        if (data.optionsFlow?.length >= 4)                  setOptionsFlow(data.optionsFlow);
        if (data.volSurfaceData?.grid?.length)              setVolSurfaceData(data.volSurfaceData);
        if (data.vixEnrichment?.vvix != null || data.vixEnrichment?.vixPercentile != null) {
          setVixEnrichment(data.vixEnrichment);
        }
        if (data.volPremium?.atm1mIV != null) setVolPremium(data.volPremium);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment, volPremium, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 3: Delete FearGreed.jsx**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
rm src/markets/derivatives/components/FearGreed.jsx
```

- [ ] **Step 4: Strip fearGreedData and vixHistory from /api/derivatives in server/index.js**

In `server/index.js`, find the `/api/derivatives` handler (line ~603). Make three targeted edits:

**Edit A** — Remove the entire fearGreedData block (lines ~683–731). Find and remove:
```js
    let spyClosesCache = [];

    // 3. Fear & Greed — compute from VIX + SPY momentum + TLT + FRED HY OAS
    let fearGreedData = null;
    try {
      ...
    } catch { /* use mock */ }
```
(Everything from `let spyClosesCache = [];` through the closing `} catch { /* use mock */ }` of the fearGreedData block.)

**Edit B** — Remove the vixHistory block (lines ~733–745). Find and remove:
```js
    // 5. VIX history from FRED (VIXCLS daily, last 252 trading days)
    let vixHistory = null;
    if (FRED_API_KEY) {
      try {
        const vixHistRaw = await fetchFredHistory('VIXCLS', 270);
        if (vixHistRaw.length >= 30) {
          vixHistory = vixHistRaw.slice(-252).map(p => ({
            date: p.date,
            value: Math.round(p.value * 10) / 10,
          }));
        }
      } catch { /* use null */ }
    }
```

**Edit C** — Remove `fearGreedData` and `vixHistory` from the result object. Find:
```js
    const result = {
      vixTermStructure,
      optionsFlow,
      fearGreedData,
      volSurfaceData,
      vixEnrichment,
      vixHistory,
      volPremium,
      lastUpdated: today,
    };
```
Change to:
```js
    const result = {
      vixTermStructure,
      optionsFlow,
      volSurfaceData,
      vixEnrichment,
      volPremium,
      lastUpdated: today,
    };
```

- [ ] **Step 5: Commit**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
git add src/markets/derivatives/DerivativesMarket.jsx
git add src/markets/derivatives/data/useDerivativesData.js
git add server/index.js
git rm src/markets/derivatives/components/FearGreed.jsx
git commit -m "refactor(derivatives): remove Fear & Greed sub-tab — moves to Sentiment"
```

---

## Task 2: Mock Data

**Files:**
- Create: `src/markets/sentiment/data/mockSentimentData.js`

- [ ] **Step 1: Write the mock data file**

```js
// src/markets/sentiment/data/mockSentimentData.js

export const fearGreedData = {
  score: 52,
  label: 'Neutral',
  altmeScore: 58,
  history: Array.from({ length: 252 }, (_, i) => ({
    date: (() => { const d = new Date('2025-07-01'); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0]; })(),
    value: Math.round(35 + 25 * Math.sin(i / 40) + 8 * Math.sin(i / 12)),
  })),
  indicators: [
    { name: 'Alt.me F&G',    value: 58,   signal: 'neutral', percentile: null },
    { name: 'VIX Level',     value: 18.4, signal: 'neutral', percentile: 42 },
    { name: 'HY Spread',     value: 342,  signal: 'risk-on', percentile: 38 },
    { name: 'Yield Curve',   value: 0.12, signal: 'neutral', percentile: null },
    { name: 'SPY Momentum',  value: 1.8,  signal: 'neutral', percentile: null },
  ],
};

export const cftcData = {
  asOf: '2026-04-01',
  currencies: [
    { code: 'EUR', name: 'Euro',         netPct:  12.4, longK: 184, shortK: 128, oiK: 452 },
    { code: 'JPY', name: 'Yen',          netPct: -18.2, longK:  92, shortK: 174, oiK: 473 },
    { code: 'GBP', name: 'Sterling',     netPct:   8.1, longK: 142, shortK: 108, oiK: 418 },
    { code: 'CAD', name: 'Canadian $',   netPct:  -6.3, longK:  28, shortK:  42, oiK: 220 },
    { code: 'CHF', name: 'Swiss Franc',  netPct:   4.2, longK:  18, shortK:  14, oiK:  96 },
    { code: 'AUD', name: 'Aussie $',     netPct:  -9.8, longK:  48, shortK:  82, oiK: 388 },
  ],
  equities: [
    { code: 'ES', name: 'E-Mini S&P 500',  netPct:  14.2, longK: 284, shortK: 198, oiK: 1202 },
    { code: 'NQ', name: 'E-Mini Nasdaq',   netPct:   8.6, longK: 128, shortK:  96, oiK:  498 },
  ],
  rates: [
    { code: 'ZN', name: '10-Yr T-Notes',   netPct: -22.4, longK: 482, shortK: 768, oiK: 2842 },
  ],
  commodities: [
    { code: 'GC', name: 'Gold',            netPct:  32.8, longK: 284, shortK: 142, oiK: 1284 },
    { code: 'CL', name: 'Crude Oil',       netPct:  18.4, longK: 542, shortK: 348, oiK: 2642 },
  ],
};

export const riskData = {
  overallScore: 58,
  overallLabel: 'Neutral',
  signals: [
    { name: 'Yield Curve',      value:  0.12, signal: 'neutral',  description: 'Flat — uncertain',             fmt: '0.12%'  },
    { name: 'HY Credit Spread', value:  342,  signal: 'risk-on',  description: 'Compressed — risk-on',         fmt: '342bps' },
    { name: 'IG Credit Spread', value:   98,  signal: 'risk-on',  description: 'Tight — confidence',           fmt: '98bps'  },
    { name: 'VIX',              value:  18.4, signal: 'neutral',  description: 'Moderate uncertainty',         fmt: '18.4'   },
    { name: 'Gold vs USD',      value:   1.2, signal: 'neutral',  description: 'Mixed signals',                fmt: '+1.2%'  },
    { name: 'EM vs US Equities',value:  -0.8, signal: 'neutral',  description: 'Mixed',                        fmt: '-0.8%'  },
  ],
};

export const returnsData = {
  asOf: '2026-04-04',
  assets: [
    { ticker: 'SPY',     label: 'S&P 500',    category: 'US Equity',    ret1d:  0.42, ret1w:  1.24, ret1m:  3.18, ret3m:  5.84 },
    { ticker: 'QQQ',     label: 'Nasdaq 100', category: 'US Equity',    ret1d:  0.68, ret1w:  1.82, ret1m:  4.24, ret3m:  7.12 },
    { ticker: 'EEM',     label: 'EM Equities',category: 'Global',       ret1d: -0.24, ret1w:  0.42, ret1m:  2.14, ret3m:  3.28 },
    { ticker: 'TLT',     label: 'Long Bonds', category: 'Fixed Income', ret1d:  0.18, ret1w: -0.84, ret1m: -1.42, ret3m: -3.18 },
    { ticker: 'GLD',     label: 'Gold',       category: 'Real Assets',  ret1d:  0.84, ret1w:  2.14, ret1m:  6.42, ret3m: 12.84 },
    { ticker: 'UUP',     label: 'US Dollar',  category: 'Real Assets',  ret1d: -0.12, ret1w: -0.48, ret1m: -1.84, ret3m: -2.42 },
    { ticker: 'USO',     label: 'Crude Oil',  category: 'Real Assets',  ret1d: -1.24, ret1w: -2.84, ret1m: -4.18, ret3m: -8.42 },
    { ticker: 'BTC-USD', label: 'Bitcoin',    category: 'Crypto',       ret1d:  2.84, ret1w:  4.24, ret1m:  8.42, ret3m: 18.24 },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
git add src/markets/sentiment/data/mockSentimentData.js
git commit -m "feat(sentiment): mock data for all 4 sub-views"
```

---

## Task 3: Hook

**Files:**
- Create: `src/markets/sentiment/data/useSentimentData.js`

- [ ] **Step 1: Write the hook**

```js
// src/markets/sentiment/data/useSentimentData.js
import { useState, useEffect } from 'react';
import {
  fearGreedData as mockFearGreedData,
  cftcData      as mockCftcData,
  riskData      as mockRiskData,
  returnsData   as mockReturnsData,
} from './mockSentimentData';

const SERVER = '';

export function useSentimentData() {
  const [fearGreedData, setFearGreedData] = useState(mockFearGreedData);
  const [cftcData,      setCftcData]      = useState(mockCftcData);
  const [riskData,      setRiskData]      = useState(mockRiskData);
  const [returnsData,   setReturnsData]   = useState(mockReturnsData);
  const [isLive,        setIsLive]        = useState(false);
  const [lastUpdated,   setLastUpdated]   = useState('Mock data — 2026');
  const [isLoading,     setIsLoading]     = useState(true);
  const [fetchedOn,     setFetchedOn]     = useState(null);
  const [isCurrent,     setIsCurrent]     = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/sentiment`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.fearGreedData?.history?.length >= 30) { setFearGreedData(data.fearGreedData); anyReplaced = true; }
        if (data.cftcData?.currencies?.length >= 4)    { setCftcData(data.cftcData);           anyReplaced = true; }
        if (data.riskData?.signals?.length >= 4)       { setRiskData(data.riskData);           anyReplaced = true; }
        if (data.returnsData?.assets?.length >= 6)     { setReturnsData(data.returnsData);     anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { fearGreedData, cftcData, riskData, returnsData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/sentiment/data/useSentimentData.js
git commit -m "feat(sentiment): useSentimentData hook with anyReplaced pattern"
```

---

## Task 4: Tests

**Files:**
- Create: `src/__tests__/sentiment/useSentimentData.test.js`

- [ ] **Step 1: Write tests**

```js
// src/__tests__/sentiment/useSentimentData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSentimentData } from '../../markets/sentiment/data/useSentimentData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSentimentData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns fearGreedData with 252-entry history on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fearGreedData.history.length).toBeGreaterThanOrEqual(30);
    expect(result.current.fearGreedData.score).toBeGreaterThanOrEqual(0);
    expect(result.current.fearGreedData.indicators).toHaveLength(5);
  });

  it('returns cftcData with 6 currencies and correct groups on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cftcData.currencies).toHaveLength(6);
    expect(result.current.cftcData.equities).toHaveLength(2);
    expect(result.current.cftcData.rates).toHaveLength(1);
    expect(result.current.cftcData.commodities).toHaveLength(2);
    expect(result.current.cftcData.currencies[0]).toMatchObject({
      code: expect.any(String), netPct: expect.any(Number),
    });
  });

  it('returns riskData with 6 signals of correct shape on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.riskData.signals).toHaveLength(6);
    expect(result.current.riskData.signals[0]).toMatchObject({
      name: expect.any(String),
      value: expect.any(Number),
      signal: expect.stringMatching(/^(risk-on|neutral|risk-off)$/),
    });
  });

  it('returns returnsData with 8 assets all having ret1d and ret1m on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.returnsData.assets).toHaveLength(8);
    result.current.returnsData.assets.forEach(a => {
      expect(typeof a.ret1d).toBe('number');
      expect(typeof a.ret1m).toBe('number');
    });
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true and replaces data when server responds with valid payload', async () => {
    const liveData = {
      fearGreedData: {
        score: 62, label: 'Greed', altmeScore: 65,
        history: Array.from({ length: 35 }, (_, i) => ({ date: `2026-03-${String(i+1).padStart(2,'0')}`, value: 55 + i })),
        indicators: [
          { name: 'Alt.me F&G', value: 65, signal: 'greed', percentile: null },
          { name: 'VIX Level',  value: 14, signal: 'greed', percentile: 28 },
          { name: 'HY Spread',  value: 310, signal: 'greed', percentile: 32 },
          { name: 'Yield Curve',value: 0.4, signal: 'neutral', percentile: null },
          { name: 'SPY Momentum',value: 3.2, signal: 'greed', percentile: null },
        ],
      },
      cftcData: {
        asOf: '2026-04-01',
        currencies: Array.from({ length: 5 }, (_, i) => ({ code: `C${i}`, name: `Cur${i}`, netPct: i * 5, longK: 100, shortK: 80, oiK: 400 })),
        equities:   [{ code: 'ES', name: 'S&P', netPct: 12, longK: 200, shortK: 160, oiK: 1000 }],
        rates:      [{ code: 'ZN', name: 'T-Note', netPct: -10, longK: 400, shortK: 520, oiK: 2000 }],
        commodities:[{ code: 'GC', name: 'Gold', netPct: 28, longK: 250, shortK: 130, oiK: 1200 }],
      },
      riskData: {
        overallScore: 64, overallLabel: 'Risk-On',
        signals: Array.from({ length: 6 }, (_, i) => ({ name: `Sig${i}`, value: 100 + i, signal: 'risk-on', description: 'ok', fmt: `${100+i}` })),
      },
      returnsData: {
        asOf: '2026-04-04',
        assets: Array.from({ length: 7 }, (_, i) => ({ ticker: `T${i}`, label: `Asset${i}`, category: 'US Equity', ret1d: 0.5, ret1w: 1.0, ret1m: 2.0, ret3m: 5.0 })),
      },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.fearGreedData.score).toBe(62);
    expect(result.current.lastUpdated).toBe('2026-04-05');
  });

  it('guard: does not apply cftcData when currencies.length < 4', async () => {
    const liveData = {
      fearGreedData: { score: 50, label: 'Neutral', altmeScore: 50, history: [], indicators: [] },
      cftcData: {
        asOf: '2026-04-01',
        currencies: [{ code: 'EUR', name: 'Euro', netPct: 5, longK: 100, shortK: 80, oiK: 400 }],
        equities: [], rates: [], commodities: [],
      },
      riskData:    { overallScore: 50, overallLabel: 'Neutral', signals: [] },
      returnsData: { asOf: '2026-04-04', assets: [] },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cftcData.currencies).toHaveLength(6); // mock untouched
    expect(result.current.isLive).toBe(false);
  });

  it('exposes fetchedOn and isCurrent', async () => {
    const liveData = {
      fearGreedData: {
        score: 55, label: 'Neutral', altmeScore: 55,
        history: Array.from({ length: 35 }, (_, i) => ({ date: `2026-03-${String(i+1).padStart(2,'0')}`, value: 50 })),
        indicators: Array.from({ length: 5 }, (_, i) => ({ name: `I${i}`, value: 50, signal: 'neutral', percentile: null })),
      },
      cftcData: {
        asOf: '2026-04-01',
        currencies: Array.from({ length: 5 }, (_, i) => ({ code: `C${i}`, name: `Cur${i}`, netPct: 5, longK: 100, shortK: 80, oiK: 400 })),
        equities: [], rates: [], commodities: [],
      },
      riskData: { overallScore: 55, overallLabel: 'Neutral', signals: Array.from({ length: 5 }, (_, i) => ({ name: `S${i}`, value: 50, signal: 'neutral', description: 'ok', fmt: '50' })) },
      returnsData: { asOf: '2026-04-04', assets: Array.from({ length: 7 }, (_, i) => ({ ticker: `T${i}`, label: `A${i}`, category: 'US Equity', ret1d: 0.5, ret1w: 1.0, ret1m: 2.0, ret3m: 5.0 })) },
      fetchedOn: '2026-04-05', isCurrent: true,
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchedOn).toBe('2026-04-05');
    expect(result.current.isCurrent).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
npx vitest run src/__tests__/sentiment/useSentimentData.test.js
```

Expected: 8 tests passing.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/sentiment/useSentimentData.test.js
git commit -m "test(sentiment): useSentimentData hook tests — 8 passing"
```

---

## Task 5: Root Component + CSS + Stubs

**Files:**
- Create: `src/markets/sentiment/SentimentMarket.css`
- Create: `src/markets/sentiment/components/SentimentComponents.css`
- Create: `src/markets/sentiment/SentimentMarket.jsx`
- Create (stubs): `src/markets/sentiment/components/FearGreed.jsx`
- Create (stubs): `src/markets/sentiment/components/CftcPositioning.jsx`
- Create (stubs): `src/markets/sentiment/components/RiskDashboard.jsx`
- Create (stubs): `src/markets/sentiment/components/CrossAssetReturns.jsx`

- [ ] **Step 1: Write SentimentMarket.css**

```css
/* src/markets/sentiment/SentimentMarket.css */
.sent-market { display: flex; flex-direction: column; height: 100%; background: #0f172a; }
.sent-market.sent-loading { align-items: center; justify-content: center; gap: 12px; }
.sent-loading-spinner {
  width: 36px; height: 36px; border: 3px solid #1e293b;
  border-top-color: #7c3aed; border-radius: 50%;
  animation: sent-spin 0.8s linear infinite;
}
@keyframes sent-spin { to { transform: rotate(360deg); } }
.sent-loading-text { font-size: 12px; color: #64748b; }

.sent-sub-tabs {
  display: flex; gap: 2px; padding: 8px 12px 0;
  border-bottom: 1px solid #1e293b; background: #0f172a;
}
.sent-sub-tab {
  padding: 6px 14px; font-size: 12px; color: #64748b; background: none;
  border: none; border-bottom: 2px solid transparent; cursor: pointer;
}
.sent-sub-tab:hover { color: #e2e8f0; }
.sent-sub-tab.active { color: #7c3aed; border-bottom-color: #7c3aed; }

.sent-status-bar {
  display: flex; align-items: center; gap: 12px; padding: 4px 14px;
  font-size: 10px; color: #475569; border-bottom: 1px solid #1e293b;
}
.sent-status-live { color: #7c3aed; }
.sent-content { flex: 1; overflow: hidden; }

.sent-stale-badge {
  background: #2e1065; color: #c4b5fd; border: 1px solid #6d28d9;
  border-radius: 10px; padding: 1px 8px; font-size: 10px; font-weight: 500;
}
```

- [ ] **Step 2: Write SentimentComponents.css**

```css
/* src/markets/sentiment/components/SentimentComponents.css */

.sent-panel { display: flex; flex-direction: column; height: 100%; background: #0f172a; overflow: hidden; }
.sent-panel-header { display: flex; align-items: center; gap: 12px; padding: 10px 14px 8px; border-bottom: 1px solid #1e293b; flex-shrink: 0; }
.sent-panel-title { font-size: 13px; font-weight: 600; color: #e2e8f0; }
.sent-panel-subtitle { font-size: 10px; color: #64748b; }

.sent-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; flex: 1; background: #1e293b; overflow: hidden; }
.sent-two-row { display: grid; grid-template-rows: 1fr 1fr; gap: 1px; flex: 1; background: #1e293b; overflow: hidden; }

.sent-chart-panel { display: flex; flex-direction: column; background: #0f172a; padding: 8px 12px 4px; overflow: hidden; }
.sent-chart-title { font-size: 11px; font-weight: 600; color: #e2e8f0; margin-bottom: 2px; flex-shrink: 0; }
.sent-chart-subtitle { font-size: 9px; color: #64748b; margin-bottom: 4px; flex-shrink: 0; }
.sent-chart-wrap { flex: 1; min-height: 0; }

.sent-scroll { flex: 1; min-height: 0; overflow-y: auto; }

.sent-pos { color: #34d399; }
.sent-neg { color: #f87171; }
.sent-neu { color: #94a3b8; }

/* Signal badges */
.sent-badge {
  display: inline-block; font-size: 9px; font-weight: 700; padding: 2px 7px;
  border-radius: 10px; font-family: monospace; text-transform: uppercase;
}
.sent-badge-on  { background: #064e3b; color: #34d399; }
.sent-badge-off { background: #450a0a; color: #f87171; }
.sent-badge-neu { background: #1e293b; color: #94a3b8; }

/* CFTC bars */
.sent-cftc-section { padding: 6px 0; }
.sent-cftc-section-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .06em; padding: 4px 12px 2px; }

/* Risk card grid */
.sent-risk-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px 12px; flex: 1; overflow-y: auto; }
.sent-risk-card { background: #1e293b; border-radius: 8px; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.sent-risk-name { font-size: 11px; font-weight: 600; color: #e2e8f0; }
.sent-risk-value { font-size: 14px; font-weight: 700; color: #e2e8f0; font-family: monospace; }
.sent-risk-desc { font-size: 10px; color: #64748b; }

/* Returns heatmap */
.sent-returns-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 11px; }
.sent-returns-th {
  padding: 5px 10px; text-align: right; font-size: 9px; color: #64748b;
  text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #1e293b;
  position: sticky; top: 0; z-index: 1; background: #0f172a; white-space: nowrap;
}
.sent-returns-th:first-child { text-align: left; }
.sent-returns-td { padding: 5px 10px; text-align: right; font-family: monospace; font-size: 11px; }
.sent-returns-td:first-child { text-align: left; color: #e2e8f0; }
.sent-returns-row { border-bottom: 1px solid #0f172a; }
.sent-returns-row:hover { background: #1e293b; }
.sent-category-sep td { padding: 3px 10px; font-size: 9px; color: #475569; text-transform: uppercase; letter-spacing: .06em; background: #0f172a; }

/* Overall score display */
.sent-score-display { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; border-top: 1px solid #1e293b; flex-shrink: 0; }
.sent-score-value { font-size: 28px; font-weight: 700; }
.sent-score-label { font-size: 11px; color: #94a3b8; margin-top: 2px; }
```

- [ ] **Step 3: Write SentimentMarket.jsx**

```jsx
// src/markets/sentiment/SentimentMarket.jsx
import React, { useState } from 'react';
import { useSentimentData } from './data/useSentimentData';
import FearGreed        from './components/FearGreed';
import CftcPositioning  from './components/CftcPositioning';
import RiskDashboard    from './components/RiskDashboard';
import CrossAssetReturns from './components/CrossAssetReturns';
import './SentimentMarket.css';

const SUB_TABS = [
  { id: 'feargreed', label: 'Fear & Greed'       },
  { id: 'cftc',      label: 'CFTC Positioning'   },
  { id: 'risk',      label: 'Risk Dashboard'      },
  { id: 'returns',   label: 'Cross-Asset Returns' },
];

export default function SentimentMarket() {
  const [activeTab, setActiveTab] = useState('feargreed');
  const { fearGreedData, cftcData, riskData, returnsData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useSentimentData();

  if (isLoading) {
    return (
      <div className="sent-market sent-loading">
        <div className="sent-loading-spinner" />
        <span className="sent-loading-text">Loading sentiment data…</span>
      </div>
    );
  }

  return (
    <div className="sent-market">
      <div className="sent-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`sent-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="sent-status-bar">
        <span className={isLive ? 'sent-status-live' : ''}>
          {isLive ? '● Live · FRED / CFTC / Alternative.me / Yahoo' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="sent-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="sent-content">
        {activeTab === 'feargreed' && <FearGreed        fearGreedData={fearGreedData} />}
        {activeTab === 'cftc'      && <CftcPositioning  cftcData={cftcData} />}
        {activeTab === 'risk'      && <RiskDashboard    riskData={riskData} />}
        {activeTab === 'returns'   && <CrossAssetReturns returnsData={returnsData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write the 4 stub components**

`src/markets/sentiment/components/FearGreed.jsx`:
```jsx
import React from 'react';
import './SentimentComponents.css';
export default function FearGreed({ fearGreedData }) {
  return <div className="sent-panel"><div className="sent-panel-header"><span className="sent-panel-title">Fear &amp; Greed</span></div></div>;
}
```

`src/markets/sentiment/components/CftcPositioning.jsx`:
```jsx
import React from 'react';
import './SentimentComponents.css';
export default function CftcPositioning({ cftcData }) {
  return <div className="sent-panel"><div className="sent-panel-header"><span className="sent-panel-title">CFTC Positioning</span></div></div>;
}
```

`src/markets/sentiment/components/RiskDashboard.jsx`:
```jsx
import React from 'react';
import './SentimentComponents.css';
export default function RiskDashboard({ riskData }) {
  return <div className="sent-panel"><div className="sent-panel-header"><span className="sent-panel-title">Risk Dashboard</span></div></div>;
}
```

`src/markets/sentiment/components/CrossAssetReturns.jsx`:
```jsx
import React from 'react';
import './SentimentComponents.css';
export default function CrossAssetReturns({ returnsData }) {
  return <div className="sent-panel"><div className="sent-panel-header"><span className="sent-panel-title">Cross-Asset Returns</span></div></div>;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/markets/sentiment/
git commit -m "feat(sentiment): root SentimentMarket + CSS + stub sub-components"
```

---

## Task 6: Hub Wiring

**Files:**
- Modify: `src/hub/markets.config.js`
- Modify: `src/hub/HubLayout.jsx`
- Modify: `vite.config.js`

- [ ] **Step 1: Add sentiment to markets.config.js**

Read the current file. Add after the credit entry:
```js
{ id: 'sentiment', label: 'Sentiment', icon: '🎭' },
```

- [ ] **Step 2: Update HubLayout.jsx**

Read the current file. Add after the CreditMarket import:
```jsx
import SentimentMarket from '../markets/sentiment/SentimentMarket';
```

Add to MARKET_COMPONENTS object after `credit: CreditMarket,`:
```jsx
sentiment: SentimentMarket,
```

- [ ] **Step 3: Add proxy to vite.config.js**

Read the current file. Add after `/api/credit`:
```js
'/api/sentiment':    { target: 'http://localhost:3001', changeOrigin: true },
```

- [ ] **Step 4: Commit**

```bash
git add src/hub/markets.config.js src/hub/HubLayout.jsx vite.config.js
git commit -m "feat(sentiment): wire SentimentMarket into HubLayout + proxy"
```

---

## Task 7: FearGreed Component

**Files:**
- Modify: `src/markets/sentiment/components/FearGreed.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/sentiment/components/FearGreed.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './SentimentComponents.css';

function scoreColor(score) {
  if (score <= 25) return '#ef4444';
  if (score <= 45) return '#f97316';
  if (score <= 55) return '#facc15';
  if (score <= 75) return '#a78bfa';
  return '#7c3aed';
}

function signalColor(signal) {
  if (signal === 'greed') return '#7c3aed';
  if (signal === 'fear')  return '#f97316';
  return '#94a3b8';
}

function buildGaugeOption(score) {
  const color = scoreColor(score);
  return {
    animation: false,
    backgroundColor: 'transparent',
    series: [{
      type: 'gauge',
      startAngle: 200, endAngle: -20,
      min: 0, max: 100,
      radius: '88%',
      pointer: { show: true, length: '55%', width: 4, itemStyle: { color } },
      progress: { show: true, width: 10, itemStyle: { color } },
      axisLine: { lineStyle: { width: 10, color: [[1, '#1e293b']] } },
      axisTick: { show: false },
      splitLine: { show: false },
      axisLabel: { show: false },
      detail: {
        valueAnimation: false,
        formatter: `{value}`,
        color,
        fontSize: 28,
        fontWeight: 700,
        offsetCenter: [0, '20%'],
      },
      data: [{ value: score }],
    }],
  };
}

function buildHistoryOption(history) {
  const dates  = history.map(h => h.date.slice(5));
  const values = history.map(h => h.value);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}: ${params[0].value}`,
    },
    grid: { top: 8, right: 8, bottom: 20, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: '#475569', fontSize: 9, interval: Math.floor(dates.length / 6) },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'value', min: 0, max: 100,
      axisLabel: { color: '#64748b', fontSize: 9 },
      splitLine: { lineStyle: { color: '#1e293b' } },
    },
    visualMap: {
      show: false, type: 'continuous', min: 0, max: 100,
      inRange: { color: ['#ef4444', '#f97316', '#facc15', '#a78bfa', '#7c3aed'] },
    },
    series: [{
      type: 'line', data: values,
      lineStyle: { width: 1.5 }, symbol: 'none',
      areaStyle: { color: { type:'linear', x:0, y:0, x2:0, y2:1, colorStops:[{offset:0,color:'rgba(124,58,237,0.3)'},{offset:1,color:'rgba(124,58,237,0.02)'}] } },
    }],
  };
}

export default function FearGreed({ fearGreedData }) {
  if (!fearGreedData) return null;
  const { score = 50, label = 'Neutral', altmeScore, history = [], indicators = [] } = fearGreedData;
  const color = scoreColor(score);
  const gaugeOption = useMemo(() => buildGaugeOption(score), [score]);
  const historyOption = useMemo(() => buildHistoryOption(history), [history]);

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Fear &amp; Greed</span>
        <span className="sent-panel-subtitle">Cross-asset composite · Alt.me + FRED VIX/HY/YC + SPY momentum</span>
      </div>
      <div className="sent-two-col">
        {/* Left: gauge + score + indicators */}
        <div className="sent-chart-panel">
          <div className="sent-chart-wrap" style={{ maxHeight: 200, flexShrink: 0 }}>
            <ReactECharts option={gaugeOption} style={{ height: 200, width: '100%' }} />
          </div>
          <div style={{ textAlign: 'center', marginTop: 4, marginBottom: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color }}>{label}</div>
            {altmeScore != null && <div style={{ fontSize: 10, color: '#64748b' }}>Alt.me raw: {altmeScore}</div>}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {indicators.map(ind => (
              <div key={ind.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #1e293b' }}>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{ind.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {ind.percentile != null && <span style={{ fontSize: 9, color: '#475569' }}>{ind.percentile}th pct</span>}
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: signalColor(ind.signal) }}>
                    {typeof ind.value === 'number' ? (ind.value > 100 ? `${Math.round(ind.value)}bps` : ind.value.toFixed(ind.value > 10 ? 1 : 2)) : ind.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: 252-day history */}
        <div className="sent-chart-panel">
          <div className="sent-chart-title">252-Day Fear &amp; Greed History</div>
          <div className="sent-chart-subtitle">Alternative.me daily score · 0 = Extreme Fear · 100 = Extreme Greed</div>
          <div className="sent-chart-wrap">
            <ReactECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/sentiment/components/FearGreed.jsx
git commit -m "feat(sentiment): FearGreed — composite gauge + indicator breakdown + 252d history"
```

---

## Task 8: CftcPositioning Component

**Files:**
- Modify: `src/markets/sentiment/components/CftcPositioning.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/sentiment/components/CftcPositioning.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './SentimentComponents.css';

function buildBarOption(items) {
  const sorted = [...items].sort((a, b) => b.netPct - a.netPct);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: '#1e293b', borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => {
        const item = items.find(i => i.code === params[0].name || i.name === params[0].name);
        return `${params[0].name}: ${params[0].value > 0 ? '+' : ''}${params[0].value}% net<br/>Long: ${item?.longK}K · Short: ${item?.shortK}K · OI: ${item?.oiK}K`;
      },
    },
    grid: { top: 4, right: 60, bottom: 4, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLine: { lineStyle: { color: '#1e293b' } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(i => i.code),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10 },
    },
    series: [{
      type: 'bar', barMaxWidth: 20,
      data: sorted.map(i => ({
        value: i.netPct,
        itemStyle: { color: i.netPct >= 0 ? '#34d399' : '#f87171' },
      })),
      label: {
        show: true, position: 'right',
        formatter: p => `${p.value >= 0 ? '+' : ''}${p.value}%`,
        color: '#94a3b8', fontSize: 9,
      },
    }],
  };
}

function Section({ title, items, height = 180 }) {
  if (!items?.length) return null;
  return (
    <div className="sent-cftc-section">
      <div className="sent-cftc-section-label">{title}</div>
      <ReactECharts option={buildBarOption(items)} style={{ height, width: '100%' }} />
    </div>
  );
}

export default function CftcPositioning({ cftcData }) {
  if (!cftcData) return null;
  const { currencies = [], equities = [], rates = [], commodities = [], asOf } = cftcData;

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">CFTC Positioning</span>
        <span className="sent-panel-subtitle">
          Net speculative position as % of open interest · green = net long · red = net short
          {asOf && <> · as of {asOf}</>}
        </span>
      </div>
      <div className="sent-two-col">
        <div style={{ overflowY: 'auto', background: '#0f172a', padding: '4px 0' }}>
          <Section title="Currencies" items={currencies} height={200} />
        </div>
        <div style={{ overflowY: 'auto', background: '#0f172a', padding: '4px 0' }}>
          <Section title="Equity Index Futures" items={equities} height={100} />
          <Section title="Rates" items={rates} height={80} />
          <Section title="Commodities" items={commodities} height={100} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/sentiment/components/CftcPositioning.jsx
git commit -m "feat(sentiment): CftcPositioning — grouped cross-asset net spec positioning bars"
```

---

## Task 9: RiskDashboard Component

**Files:**
- Modify: `src/markets/sentiment/components/RiskDashboard.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/sentiment/components/RiskDashboard.jsx
import React from 'react';
import './SentimentComponents.css';

function badgeClass(signal) {
  if (signal === 'risk-on')  return 'sent-badge sent-badge-on';
  if (signal === 'risk-off') return 'sent-badge sent-badge-off';
  return 'sent-badge sent-badge-neu';
}

function badgeLabel(signal) {
  if (signal === 'risk-on')  return 'Risk-On';
  if (signal === 'risk-off') return 'Risk-Off';
  return 'Neutral';
}

function scoreColor(score) {
  if (score >= 65) return '#7c3aed';
  if (score >= 50) return '#a78bfa';
  if (score >= 35) return '#94a3b8';
  return '#f87171';
}

export default function RiskDashboard({ riskData }) {
  if (!riskData) return null;
  const { signals = [], overallScore = 50, overallLabel = 'Neutral' } = riskData;
  const color = scoreColor(overallScore);

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Risk Dashboard</span>
        <span className="sent-panel-subtitle">Cross-asset risk-on / risk-off signals · FRED + Yahoo Finance</span>
      </div>
      <div className="sent-risk-grid">
        {signals.map(sig => (
          <div key={sig.name} className="sent-risk-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span className="sent-risk-name">{sig.name}</span>
              <span className={badgeClass(sig.signal)}>{badgeLabel(sig.signal)}</span>
            </div>
            <div className="sent-risk-value">{sig.fmt}</div>
            <div className="sent-risk-desc">{sig.description}</div>
          </div>
        ))}
      </div>
      <div className="sent-score-display">
        <div className="sent-score-value" style={{ color }}>{overallScore}</div>
        <div className="sent-score-label">Overall Risk Appetite Score · {overallLabel}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/sentiment/components/RiskDashboard.jsx
git commit -m "feat(sentiment): RiskDashboard — 6 signal cards + overall risk appetite score"
```

---

## Task 10: CrossAssetReturns Component

**Files:**
- Modify: `src/markets/sentiment/components/CrossAssetReturns.jsx`

- [ ] **Step 1: Write the full component**

```jsx
// src/markets/sentiment/components/CrossAssetReturns.jsx
import React from 'react';
import './SentimentComponents.css';

function retColor(v) {
  if (v == null) return '#1e293b';
  if (v >  5)  return 'rgba(124,58,237,0.85)';
  if (v >  2)  return 'rgba(52,211,153,0.75)';
  if (v >  0)  return 'rgba(52,211,153,0.35)';
  if (v > -2)  return 'rgba(248,113,113,0.35)';
  if (v > -5)  return 'rgba(248,113,113,0.65)';
  return 'rgba(239,68,68,0.85)';
}

function fmtRet(v) {
  if (v == null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

const CATEGORY_ORDER = ['US Equity', 'Global', 'Fixed Income', 'Real Assets', 'Crypto'];

export default function CrossAssetReturns({ returnsData }) {
  if (!returnsData) return null;
  const { assets = [], asOf } = returnsData;

  // Group by category in defined order
  const grouped = CATEGORY_ORDER.map(cat => ({
    category: cat,
    assets: assets.filter(a => a.category === cat),
  })).filter(g => g.assets.length > 0);

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Cross-Asset Returns</span>
        <span className="sent-panel-subtitle">
          Total return by timeframe · Yahoo Finance
          {asOf && <> · as of {asOf}</>}
        </span>
      </div>
      <div className="sent-scroll">
        <table className="sent-returns-table">
          <thead>
            <tr>
              <th className="sent-returns-th" style={{ textAlign: 'left' }}>Asset</th>
              <th className="sent-returns-th">1 Day</th>
              <th className="sent-returns-th">1 Week</th>
              <th className="sent-returns-th">1 Month</th>
              <th className="sent-returns-th">3 Month</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(({ category, assets: catAssets }) => (
              <React.Fragment key={category}>
                <tr className="sent-category-sep">
                  <td colSpan={5}>{category}</td>
                </tr>
                {catAssets.map(a => (
                  <tr key={a.ticker} className="sent-returns-row">
                    <td className="sent-returns-td">
                      <strong>{a.label}</strong>
                      <span style={{ fontSize: 9, color: '#64748b', marginLeft: 6 }}>{a.ticker}</span>
                    </td>
                    {[a.ret1d, a.ret1w, a.ret1m, a.ret3m].map((v, i) => (
                      <td
                        key={i}
                        className="sent-returns-td"
                        style={{ background: retColor(v), color: v == null ? '#475569' : v >= 0 ? '#e2e8f0' : '#fca5a5' }}
                      >
                        {fmtRet(v)}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/sentiment/components/CrossAssetReturns.jsx
git commit -m "feat(sentiment): CrossAssetReturns — 8-asset × 4-timeframe color-coded heatmap"
```

---

## Task 11: Server Endpoint `/api/sentiment`

**Files:**
- Modify: `server/index.js`

Key facts:
- Server is ESM (`"type": "module"`) — never use `require()`
- `import https from 'https'` is already at the top of the file
- External HTTP calls use an inline `fetchJson` helper (same pattern as crypto endpoint)
- `fetchFredLatest(seriesId)` and `fetchFredHistory(seriesId, limit)` are already defined
- `todayStr()`, `readDailyCache()`, `writeDailyCache()`, `readLatestCache()`, `cache` are already defined
- `FRED_API_KEY` is already defined from env
- `yf` is already imported from yahoo-finance2
- Insert this endpoint AFTER the `/api/credit` handler and BEFORE the `// --- Quote Summary` comment

- [ ] **Step 1: Add 'sentiment' to CACHEABLE_MARKETS**

Find:
```js
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto','credit'];
```
Change to:
```js
const CACHEABLE_MARKETS = ['bonds','derivatives','realEstate','insurance','commodities','globalMacro','equityDeepDive','crypto','credit','sentiment'];
```

- [ ] **Step 2: Insert /api/sentiment endpoint**

Insert this block after the closing `});` of `/api/credit` and before the next comment/endpoint:

```js
// ── /api/sentiment ────────────────────────────────────────────────────────────
// Fear & Greed (Alt.me + FRED + Yahoo) + CFTC positioning + Risk signals + Cross-asset returns
app.get('/api/sentiment', async (_req, res) => {
  const today = todayStr();
  const daily = readDailyCache('sentiment');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });
  const cacheKey = 'sentiment_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    const fetchJson = (url) => new Promise((resolve, reject) => {
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 kyahoofinance' } }, (r) => {
        let d = '';
        r.on('data', c => d += c);
        r.on('end', () => { try { resolve(JSON.parse(d)); } catch(e) { reject(e); } });
      }).on('error', reject);
    });

    // date helpers
    const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; };

    const RETURN_TICKERS = ['SPY','QQQ','EEM','TLT','GLD','UUP','USO','BTC-USD'];
    const RETURN_LABELS  = ['S&P 500','Nasdaq 100','EM Equities','Long Bonds','Gold','US Dollar','Crude Oil','Bitcoin'];
    const RETURN_CATS    = ['US Equity','US Equity','Global','Fixed Income','Real Assets','Real Assets','Real Assets','Crypto'];

    const CFTC_MARKETS = {
      currencies:  [
        { code: 'EUR', name: 'Euro',          needle: 'EURO FX' },
        { code: 'JPY', name: 'Yen',           needle: 'JAPANESE YEN' },
        { code: 'GBP', name: 'Sterling',      needle: 'BRITISH POUND' },
        { code: 'CAD', name: 'Canadian $',    needle: 'CANADIAN DOLLAR' },
        { code: 'CHF', name: 'Swiss Franc',   needle: 'SWISS FRANC' },
        { code: 'AUD', name: 'Aussie $',      needle: 'AUSTRALIAN DOLLAR' },
      ],
      equities: [
        { code: 'ES',  name: 'E-Mini S&P 500', needle: 'E-MINI S&P 500' },
        { code: 'NQ',  name: 'E-Mini Nasdaq',  needle: 'E-MINI NASDAQ-100' },
      ],
      rates: [
        { code: 'ZN',  name: '10-Yr T-Notes',  needle: '10-YEAR U.S. TREASURY NOTES' },
      ],
      commodities: [
        { code: 'GC',  name: 'Gold',           needle: 'GOLD - COMMODITY EXCHANGE' },
        { code: 'CL',  name: 'Crude Oil',      needle: 'CRUDE OIL, LIGHT SWEET' },
      ],
    };

    const cftcUrl = 'https://publicreporting.cftc.gov/resource/jun7-fc8e.json' +
      '?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,' +
      'noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all' +
      '&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=50';

    const period1 = daysAgo(95);

    // Fire all fetches in parallel
    const [
      altmeResult,
      vixHistResult,
      hyHistResult,
      igLatestResult,
      ycLatestResult,
      cftcResult,
      ...yahooResults
    ] = await Promise.allSettled([
      fetchJson('https://api.alternative.me/fng/?limit=252'),
      FRED_API_KEY ? fetchFredHistory('VIXCLS', 270)        : Promise.resolve([]),
      FRED_API_KEY ? fetchFredHistory('BAMLH0A0HYM2', 270)  : Promise.resolve([]),
      FRED_API_KEY ? fetchFredLatest('BAMLC0A0CM')          : Promise.resolve(null),
      FRED_API_KEY ? fetchFredLatest('T10Y2Y')              : Promise.resolve(null),
      fetchJson(cftcUrl),
      ...RETURN_TICKERS.map(t => yf.historical(t, { period1, period2: today, interval: '1d' })),
    ]);

    // ── Fear & Greed ───────────────────────────────────────────────────────────
    const altme    = altmeResult.status    === 'fulfilled' ? altmeResult.value    : null;
    const vixHist  = vixHistResult.status  === 'fulfilled' ? vixHistResult.value  : [];
    const hyHist   = hyHistResult.status   === 'fulfilled' ? hyHistResult.value   : [];
    const igLatest = igLatestResult.status === 'fulfilled' ? igLatestResult.value : null;
    const ycLatest = ycLatestResult.status === 'fulfilled' ? ycLatestResult.value : null;

    const altmeScore  = altme?.data?.[0]?.value != null ? Number(altme.data[0].value) : 50;
    const altmeHistory = (altme?.data || []).map(d => ({
      date:  d.timestamp ? new Date(Number(d.timestamp) * 1000).toISOString().split('T')[0] : d.date,
      value: Number(d.value),
    })).reverse(); // oldest first

    const vixCloses   = vixHist.slice(-252).map(p => p.value).filter(Boolean);
    const hyCloses    = hyHist.slice(-252).map(p => p.value).filter(Boolean);
    const currentVix  = vixCloses.at(-1) ?? null;
    const currentHy   = hyCloses.at(-1)  ?? null;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    const vixPercentile  = currentVix != null && vixCloses.length > 20
      ? Math.round(vixCloses.filter(v => v <= currentVix).length / vixCloses.length * 100)
      : 50;
    const hyPercentile   = currentHy != null && hyCloses.length > 20
      ? Math.round(hyCloses.filter(v => v <= currentHy).length / hyCloses.length * 100)
      : 50;

    // Yahoo SPY for momentum: already in yahooResults[0]
    const spyHist    = yahooResults[0].status === 'fulfilled' ? yahooResults[0].value : [];
    const spyCloses  = spyHist.map(d => d.close).filter(Boolean);
    const spy1mReturn = spyCloses.length >= 2
      ? Math.round(((spyCloses.at(-1) / spyCloses[0]) - 1) * 1000) / 10
      : 0;

    const vixSignal      = 100 - vixPercentile;
    const hySignal       = 100 - hyPercentile;
    const ycVal          = ycLatest ?? 0;
    const ycSignal       = clamp(Math.round((ycVal + 1) / 2 * 100), 0, 100);
    const momentumSignal = clamp(Math.round((spy1mReturn + 10) / 20 * 100), 0, 100);

    const composite = Math.round(
      altmeScore * 0.30 + vixSignal * 0.25 + hySignal * 0.20 + momentumSignal * 0.15 + ycSignal * 0.10
    );

    function scoreLabel(s) {
      if (s <= 25) return 'Extreme Fear';
      if (s <= 45) return 'Fear';
      if (s <= 55) return 'Neutral';
      if (s <= 75) return 'Greed';
      return 'Extreme Greed';
    }
    function indSignal(s) {
      return s >= 60 ? 'greed' : s <= 40 ? 'fear' : 'neutral';
    }

    const fearGreedData = {
      score:      composite,
      label:      scoreLabel(composite),
      altmeScore,
      history:    altmeHistory.slice(-252),
      indicators: [
        { name: 'Alt.me F&G',   value: altmeScore,    signal: indSignal(altmeScore),    percentile: null },
        { name: 'VIX Level',    value: currentVix != null ? Math.round(currentVix * 10) / 10 : null, signal: indSignal(vixSignal),  percentile: vixPercentile },
        { name: 'HY Spread',    value: currentHy  != null ? Math.round(currentHy)  : null,           signal: indSignal(hySignal),   percentile: hyPercentile },
        { name: 'Yield Curve',  value: ycLatest  != null ? Math.round(ycLatest * 100) / 100 : null,  signal: indSignal(ycSignal)   },
        { name: 'SPY Momentum', value: spy1mReturn,   signal: indSignal(momentumSignal) },
      ],
    };

    // ── CFTC Positioning ──────────────────────────────────────────────────────
    const cftcRows = cftcResult.status === 'fulfilled' ? cftcResult.value : [];
    function parseCftcGroup(defs) {
      const asOf = cftcRows[0]?.report_date_as_yyyy_mm_dd ?? null;
      return {
        asOf,
        items: defs.map(def => {
          const row = cftcRows.find(r => r.market_and_exchange_names?.includes(def.needle));
          if (!row) return { ...def, netPct: 0, longK: 0, shortK: 0, oiK: 0 };
          const long  = parseFloat(row.noncomm_positions_long_all)  || 0;
          const short = parseFloat(row.noncomm_positions_short_all) || 0;
          const oi    = parseFloat(row.open_interest_all)            || 1;
          return {
            code:   def.code,
            name:   def.name,
            netPct: Math.round((long - short) / oi * 100 * 10) / 10,
            longK:  Math.round(long  / 1000),
            shortK: Math.round(short / 1000),
            oiK:    Math.round(oi    / 1000),
          };
        }),
      };
    }

    const currParsed = parseCftcGroup(CFTC_MARKETS.currencies);
    const cftcData = {
      asOf:        currParsed.asOf,
      currencies:  currParsed.items,
      equities:    parseCftcGroup(CFTC_MARKETS.equities).items,
      rates:       parseCftcGroup(CFTC_MARKETS.rates).items,
      commodities: parseCftcGroup(CFTC_MARKETS.commodities).items,
    };

    // ── Risk Dashboard ─────────────────────────────────────────────────────────
    // GLD = RETURN_TICKERS[4], UUP = [5], EEM = [2], SPY = [0]
    function get1mReturn(idx) {
      const hist = yahooResults[idx].status === 'fulfilled' ? yahooResults[idx].value : [];
      const closes = hist.map(d => d.close).filter(Boolean);
      if (closes.length < 2) return null;
      return Math.round(((closes.at(-1) / closes[0]) - 1) * 1000) / 10;
    }

    const gldRet  = get1mReturn(4);
    const uupRet  = get1mReturn(5);
    const eemRet  = get1mReturn(2);
    const spyRet  = spy1mReturn; // already computed

    const goldVsUsd   = gldRet != null && uupRet != null ? Math.round((gldRet - uupRet) * 10) / 10 : null;
    const emVsUs      = eemRet != null ? Math.round((eemRet - spyRet) * 10) / 10 : null;
    const igSpread    = igLatest ?? null;
    const hySpread    = currentHy ?? null;
    const vixValue    = currentVix ?? null;
    const yieldCurve  = ycLatest ?? null;

    function riskSignal(name, value) {
      if (name === 'Yield Curve')      return value == null ? 'neutral' : value > 0.5 ? 'risk-on' : value < -0.5 ? 'risk-off' : 'neutral';
      if (name === 'HY Credit Spread') return value == null ? 'neutral' : value < 350 ? 'risk-on' : value > 500 ? 'risk-off' : 'neutral';
      if (name === 'IG Credit Spread') return value == null ? 'neutral' : value < 100 ? 'risk-on' : value > 150 ? 'risk-off' : 'neutral';
      if (name === 'VIX')             return value == null ? 'neutral' : value < 15 ? 'risk-on' : value > 25 ? 'risk-off' : 'neutral';
      if (name === 'Gold vs USD')     return value == null ? 'neutral' : value > 2 ? 'risk-off' : value < -2 ? 'risk-on' : 'neutral';
      if (name === 'EM vs US Equities') return value == null ? 'neutral' : value > 2 ? 'risk-on' : value < -2 ? 'risk-off' : 'neutral';
      return 'neutral';
    }
    function riskDesc(name, value, signal) {
      if (name === 'Yield Curve')      return signal === 'risk-on' ? 'Normal — growth expected' : signal === 'risk-off' ? 'Inverted — recession signal' : 'Flat — uncertain';
      if (name === 'HY Credit Spread') return signal === 'risk-on' ? 'Compressed — risk-on' : signal === 'risk-off' ? 'Wide — stress signal' : 'Elevated — caution';
      if (name === 'IG Credit Spread') return signal === 'risk-on' ? 'Tight — confidence' : signal === 'risk-off' ? 'Wide — risk-off' : 'Moderate';
      if (name === 'VIX')             return signal === 'risk-on' ? 'Low vol — complacency' : signal === 'risk-off' ? 'Elevated fear' : 'Moderate uncertainty';
      if (name === 'Gold vs USD')     return signal === 'risk-off' ? 'Gold bid — safe haven' : signal === 'risk-on' ? 'Dollar bid — risk appetite' : 'Mixed signals';
      if (name === 'EM vs US Equities') return signal === 'risk-on' ? 'EM outperforming — global risk-on' : signal === 'risk-off' ? 'EM lagging — flight to quality' : 'Mixed';
      return '';
    }
    function riskFmt(name, value) {
      if (value == null) return '—';
      if (name === 'HY Credit Spread' || name === 'IG Credit Spread') return `${Math.round(value)}bps`;
      if (name === 'Yield Curve') return `${value.toFixed(2)}%`;
      if (name === 'VIX') return value.toFixed(1);
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    }

    const rawSignals = [
      { name: 'Yield Curve',       value: yieldCurve },
      { name: 'HY Credit Spread',  value: hySpread },
      { name: 'IG Credit Spread',  value: igSpread },
      { name: 'VIX',               value: vixValue },
      { name: 'Gold vs USD',       value: goldVsUsd },
      { name: 'EM vs US Equities', value: emVsUs },
    ];

    const signals = rawSignals.map(s => {
      const sig = riskSignal(s.name, s.value);
      return { name: s.name, value: s.value, signal: sig, description: riskDesc(s.name, s.value, sig), fmt: riskFmt(s.name, s.value) };
    });

    const scoreMap = { 'risk-on': 100, neutral: 50, 'risk-off': 0 };
    const overallScore = Math.round(signals.reduce((sum, s) => sum + scoreMap[s.signal], 0) / signals.length);
    const overallLabel = overallScore >= 65 ? 'Risk-On' : overallScore <= 35 ? 'Risk-Off' : 'Neutral';

    const riskData = { overallScore, overallLabel, signals };

    // ── Cross-Asset Returns ────────────────────────────────────────────────────
    const assets = RETURN_TICKERS.map((ticker, idx) => {
      const hist   = yahooResults[idx].status === 'fulfilled' ? yahooResults[idx].value : [];
      const closes = hist.map(d => d.close).filter(Boolean);
      const pct = (a, b) => a != null && b != null && b !== 0 ? Math.round((a / b - 1) * 10000) / 100 : null;
      return {
        ticker,
        label:    RETURN_LABELS[idx],
        category: RETURN_CATS[idx],
        ret1d:  closes.length >= 2  ? pct(closes.at(-1), closes.at(-2))  : null,
        ret1w:  closes.length >= 6  ? pct(closes.at(-1), closes.at(-6))  : null,
        ret1m:  closes.length >= 22 ? pct(closes.at(-1), closes.at(-22)) : null,
        ret3m:  closes.length >= 2  ? pct(closes.at(-1), closes[0])      : null,
      };
    });

    const returnsData = { asOf: today, assets };

    const result = { fearGreedData, cftcData, riskData, returnsData, lastUpdated: today };

    writeDailyCache('sentiment', result);
    cache.set(cacheKey, result, 300);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('Sentiment API error:', error);
    const fallback = readLatestCache('sentiment');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(sentiment): /api/sentiment endpoint — FRED + CFTC + Alt.me + Yahoo returns"
```

---

## Task 12: Run All Tests

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd C:/Users/kevin/OneDrive/Desktop/kyahoofinance032926
npx vitest run
```

Expected: ≥ 324 tests passing (316 existing + 8 new sentiment tests), 0 failing.

- [ ] **Step 2: Fix any failures and commit**

If any tests fail, read the failure carefully, fix the source file, re-run, then commit:
```bash
git add <affected files>
git commit -m "fix(sentiment): <description of fix>"
```

---

## Self-Review

**Spec coverage:**
- ✅ Fear & Greed composite (Alt.me + FRED VIX/HY/YC + SPY momentum, 5 indicators) → Tasks 7, 11
- ✅ CFTC: 6 currencies + 2 equity futures + 1 rates + 2 commodities → Tasks 8, 11
- ✅ Risk Dashboard: 6 signals + overall score → Tasks 9, 11
- ✅ Cross-Asset Returns: 8 assets × 4 timeframes → Tasks 10, 11
- ✅ Derivatives cleanup (FearGreed.jsx deleted, useDerivativesData trimmed, server trimmed) → Task 1
- ✅ Violet #7c3aed accent + sent- prefix → Tasks 5, 7-10
- ✅ No mocks as permanent data — all signals computed from live sources → Task 11
- ✅ 8 tests → Task 4
- ✅ Hub wiring → Task 6
- ✅ CACHEABLE_MARKETS updated → Task 11

**Type consistency:**
- `fearGreedData.history` — array of `{date, value}` ✅ consistent mock → hook guard → component
- `cftcData.currencies` — array of `{code, name, netPct, longK, shortK, oiK}` ✅
- `riskData.signals` — array of `{name, value, signal, description, fmt}` ✅
- `returnsData.assets` — array of `{ticker, label, category, ret1d, ret1w, ret1m, ret3m}` ✅
- `signal` values: `'risk-on' | 'neutral' | 'risk-off'` (Risk Dashboard) vs `'greed' | 'neutral' | 'fear'` (Fear & Greed indicators) — different enums, correctly used in separate components ✅
