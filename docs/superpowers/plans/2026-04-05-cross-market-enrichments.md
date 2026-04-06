# Cross-Market Enrichments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 3 new data segments to existing market endpoints: BTC on-chain metrics (Crypto), TIPS breakeven inflation (Bonds), and COT commodity positioning (Commodities).

**Architecture:** Each enrichment follows the same pattern: add API calls to the existing `Promise.allSettled` block in `server/index.js`, add mock data + hook guard in the client data layer, add a new presentation component. No new market tabs — these are additions to existing views.

**Tech Stack:** React 18, ECharts (via echarts-for-react), Vitest + React Testing Library, Express server with FRED/mempool.space/CFTC Socrata APIs.

---

## File Map

### Crypto On-Chain
- Modify: `server/index.js` — add mempool.space calls inside `/api/crypto` endpoint (~line 1844)
- Modify: `src/markets/crypto/data/mockCryptoData.js` — add `onChainData` export
- Modify: `src/markets/crypto/data/useCryptoData.js` — add `onChainData` state + guard
- Create: `src/markets/crypto/components/OnChainMetrics.jsx` — metric cards + hashrate chart
- Modify: `src/markets/crypto/components/CryptoComponents.css` — on-chain styles
- Modify: `src/markets/crypto/CryptoMarket.jsx` — render OnChainMetrics in Market Overview
- Modify: `src/__tests__/crypto/useCryptoData.test.js` — add onChainData guard test

### Bonds Breakevens
- Modify: `server/index.js` — add FRED breakeven calls inside `/api/bonds` endpoint (~line 489)
- Modify: `src/markets/bonds/data/mockBondsData.js` — add `breakevensData` export
- Modify: `src/markets/bonds/data/useBondsData.js` — add `breakevensData` state + guard
- Create: `src/markets/bonds/components/BreakevenMonitor.jsx` — pills + history chart
- Modify: `src/markets/bonds/components/BondsComponents.css` — breakeven styles
- Modify: `src/markets/bonds/BondsMarket.jsx` — add 5th sub-tab
- Modify: `src/__tests__/bonds/useBondsData.test.js` — add breakevensData guard test

### Commodities COT
- Modify: `server/index.js` — add CFTC COT call inside `/api/commodities` endpoint (~line 1287)
- Modify: `src/markets/commodities/data/mockCommoditiesData.js` — add `cotData` export
- Modify: `src/markets/commodities/data/useCommoditiesData.js` — add `cotData` state + guard
- Create: `src/markets/commodities/components/CotPositioning.jsx` — side-by-side panels + bar charts
- Modify: `src/markets/commodities/components/CommodComponents.css` — COT styles
- Modify: `src/markets/commodities/CommoditiesMarket.jsx` — add 5th sub-tab
- Modify: `src/__tests__/commodities/useCommoditiesData.test.js` — add cotData guard test

---

### Task 1: Crypto — Server-side mempool.space calls

**Files:**
- Modify: `server/index.js:1844-1969` (inside `/api/crypto` endpoint)

- [ ] **Step 1: Add mempool.space fetch calls to the Promise.allSettled block**

In `server/index.js`, find the `Promise.allSettled` call at line 1844 that currently fetches `[cgCoinsUrl, cgGlobalUrl, fngUrl, defiProtocolsUrl, defiChainsUrl]`. Add 4 mempool.space calls to the same block:

```js
    const mempoolFeesUrl     = 'https://mempool.space/api/v1/fees/recommended';
    const mempoolDiffUrl     = 'https://mempool.space/api/v1/difficulty-adjustment';
    const mempoolStatsUrl    = 'https://mempool.space/api/mempool';
    const mempoolHashrateUrl = 'https://mempool.space/api/v1/mining/hashrate/1m';

    const [cgCoins, cgGlobal, fng, defiProtocols, defiChains, mempoolFees, mempoolDiff, mempoolStats, mempoolHashrate] = await Promise.allSettled([
      fetchJson(cgCoinsUrl),
      fetchJson(cgGlobalUrl),
      fetchJson(fngUrl),
      fetchJson(defiProtocolsUrl),
      fetchJson(defiChainsUrl),
      fetchJson(mempoolFeesUrl),
      fetchJson(mempoolDiffUrl),
      fetchJson(mempoolStatsUrl),
      fetchJson(mempoolHashrateUrl),
    ]);
```

- [ ] **Step 2: Build onChainData from mempool results**

After the existing `fundingData` block (around line 1961), add:

```js
    // 5. BTC on-chain metrics from mempool.space
    let onChainData = null;
    try {
      const fees = mempoolFees.status === 'fulfilled' ? mempoolFees.value : null;
      const diff = mempoolDiff.status === 'fulfilled' ? mempoolDiff.value : null;
      const stats = mempoolStats.status === 'fulfilled' ? mempoolStats.value : null;
      const hr = mempoolHashrate.status === 'fulfilled' ? mempoolHashrate.value : null;

      if (fees || diff || stats || hr) {
        onChainData = {
          fees: fees ? {
            fastest:  fees.fastestFee,
            halfHour: fees.halfHourFee,
            hour:     fees.hourFee,
            economy:  fees.economyFee,
            minimum:  fees.minimumFee,
          } : null,
          mempool: stats ? {
            count: stats.count,
            vsize: Math.round((stats.vsize || 0) / 1e6 * 10) / 10,
          } : null,
          difficulty: diff ? {
            progressPercent:      Math.round((diff.progressPercent ?? 0) * 10) / 10,
            difficultyChange:     Math.round((diff.difficultyChange ?? 0) * 10) / 10,
            remainingBlocks:      diff.remainingBlocks ?? null,
            estimatedRetargetDate: diff.estimatedRetargetDate
              ? new Date(diff.estimatedRetargetDate * 1000).toISOString().split('T')[0]
              : null,
          } : null,
          hashrate: hr?.hashrates ? {
            current: hr.currentHashrate
              ? Math.round(hr.currentHashrate / 1e18 * 10) / 10
              : null,
            history: hr.hashrates.map(h => ({
              timestamp: h.timestamp,
              avgHashrate: Math.round(h.avgHashrate / 1e18 * 10) / 10,
            })),
          } : null,
        };
      }
    } catch { /* use null — mock fallback on client */ }
```

- [ ] **Step 3: Add onChainData to the result object**

Change the result object (currently around line 1963) to include `onChainData`:

```js
    const result = {
      coinMarketData: { coins, globalStats },
      fearGreedData,
      defiData,
      fundingData,
      onChainData,
      lastUpdated: today,
    };
```

- [ ] **Step 4: Run server to verify it starts without errors**

Run: `cd server && node index.js`
Expected: Server starts on port 3001 without crash. Ctrl+C to stop.

- [ ] **Step 5: Commit**

```bash
git add server/index.js
git commit -m "feat(crypto): add mempool.space on-chain metrics to /api/crypto"
```

---

### Task 2: Crypto — Mock data + hook + test

**Files:**
- Modify: `src/markets/crypto/data/mockCryptoData.js`
- Modify: `src/markets/crypto/data/useCryptoData.js`
- Modify: `src/__tests__/crypto/useCryptoData.test.js`

- [ ] **Step 1: Add onChainData mock export to mockCryptoData.js**

At the end of `src/markets/crypto/data/mockCryptoData.js`, add:

```js
export const onChainData = {
  fees: { fastest: 12, halfHour: 8, hour: 5, economy: 3, minimum: 1 },
  mempool: { count: 24500, vsize: 142.3 },
  difficulty: { progressPercent: 62.4, difficultyChange: 3.2, remainingBlocks: 1248, estimatedRetargetDate: '2026-04-18' },
  hashrate: {
    current: 642.8,
    history: [
      { timestamp: 1711900000, avgHashrate: 610.2 },
      { timestamp: 1712500000, avgHashrate: 615.8 },
      { timestamp: 1713100000, avgHashrate: 620.4 },
      { timestamp: 1713700000, avgHashrate: 618.9 },
      { timestamp: 1714300000, avgHashrate: 625.1 },
      { timestamp: 1714900000, avgHashrate: 630.6 },
      { timestamp: 1715500000, avgHashrate: 634.2 },
      { timestamp: 1716100000, avgHashrate: 638.7 },
      { timestamp: 1716700000, avgHashrate: 640.1 },
      { timestamp: 1717300000, avgHashrate: 642.8 },
    ],
  },
};
```

- [ ] **Step 2: Update useCryptoData.js to include onChainData**

In `src/markets/crypto/data/useCryptoData.js`:

1. Add `onChainData as mockOnChainData` to the import from `./mockCryptoData`.
2. Add state: `const [onChainData, setOnChainData] = useState(mockOnChainData);`
3. Add guard inside the `.then(data => {` block: `if (data.onChainData?.fees?.fastest != null) { setOnChainData(data.onChainData); anyReplaced = true; }`
4. Add `onChainData` to the return object.

Full updated file:

```js
// src/markets/crypto/data/useCryptoData.js
import { useState, useEffect } from 'react';
import {
  coinMarketData as mockCoinMarketData,
  fearGreedData  as mockFearGreedData,
  defiData       as mockDefiData,
  fundingData    as mockFundingData,
  onChainData    as mockOnChainData,
} from './mockCryptoData';

const SERVER = '';

export function useCryptoData() {
  const [coinMarketData, setCoinMarketData] = useState(mockCoinMarketData);
  const [fearGreedData,  setFearGreedData]  = useState(mockFearGreedData);
  const [defiData,       setDefiData]       = useState(mockDefiData);
  const [fundingData,    setFundingData]    = useState(mockFundingData);
  const [onChainData,    setOnChainData]    = useState(mockOnChainData);
  const [isLive,         setIsLive]         = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState('Mock data — 2026');
  const [isLoading,      setIsLoading]      = useState(true);
  const [fetchedOn,      setFetchedOn]      = useState(null);
  const [isCurrent,      setIsCurrent]      = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(`${SERVER}/api/crypto`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.coinMarketData?.coins?.length >= 10)       { setCoinMarketData(data.coinMarketData); anyReplaced = true; }
        if (data.fearGreedData?.history?.length >= 7)       { setFearGreedData(data.fearGreedData);   anyReplaced = true; }
        if (data.defiData?.protocols?.length >= 5)          { setDefiData(data.defiData);             anyReplaced = true; }
        if (data.fundingData?.rates?.length >= 3)           { setFundingData(data.fundingData);       anyReplaced = true; }
        if (data.onChainData?.fees?.fastest != null)        { setOnChainData(data.onChainData);       anyReplaced = true; }
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });

    return () => { clearTimeout(timer); controller.abort(); };
  }, []);

  return { coinMarketData, fearGreedData, defiData, fundingData, onChainData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 3: Add onChainData guard test to useCryptoData.test.js**

Append this test to `src/__tests__/crypto/useCryptoData.test.js`, inside the `describe` block:

```js
  it('guard: does not apply onChainData when fees.fastest is null', async () => {
    const liveData = {
      coinMarketData: { coins: Array.from({ length: 12 }, (_, i) => ({ id: `coin${i}`, symbol: `C${i}`, name: `Coin ${i}`, price: 100, change24h: 1, change7d: 2, change30d: 5, marketCapB: 10, volumeB: 1, dominance: 1 })), globalStats: {} },
      fearGreedData: { value: 50, label: 'Neutral', history: Array.from({ length: 10 }, () => 50), correlations: [] },
      defiData: { protocols: Array.from({ length: 6 }, (_, i) => ({ name: `P${i}`, category: 'DEX', chain: 'ETH', tvlB: 5, change1d: 0, change7d: 0 })), chains: [] },
      fundingData: { rates: Array.from({ length: 4 }, (_, i) => ({ symbol: `F${i}`, rate8h: 0.01, rateAnnualized: 10, openInterestB: 1, exchange: 'X' })), openInterestHistory: null },
      onChainData: { fees: { fastest: null, halfHour: null, hour: null, economy: null, minimum: null }, mempool: null, difficulty: null, hashrate: null },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    // Should keep mock onChainData (fastest = 12) because live has fastest = null
    expect(result.current.onChainData.fees.fastest).toBe(12);
  });
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/crypto/useCryptoData.test.js`
Expected: All 9 tests pass (8 existing + 1 new).

- [ ] **Step 5: Commit**

```bash
git add src/markets/crypto/data/mockCryptoData.js src/markets/crypto/data/useCryptoData.js src/__tests__/crypto/useCryptoData.test.js
git commit -m "feat(crypto): add onChainData mock, hook guard, and test"
```

---

### Task 3: Crypto — OnChainMetrics component + wiring

**Files:**
- Create: `src/markets/crypto/components/OnChainMetrics.jsx`
- Modify: `src/markets/crypto/components/CryptoComponents.css`
- Modify: `src/markets/crypto/CryptoMarket.jsx`

- [ ] **Step 1: Create OnChainMetrics.jsx**

Create `src/markets/crypto/components/OnChainMetrics.jsx`:

```jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CryptoComponents.css';

function buildHashrateOption(history) {
  const dates = history.map(h => {
    const d = new Date(h.timestamp * 1000);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const values = history.map(h => h.avgHashrate);
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 10, right: 12, bottom: 24, left: 48 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>${params[0].value} EH/s`,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v}` },
    },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      showSymbol: false,
      lineStyle: { color: '#f59e0b', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.25)' }, { offset: 1, color: 'rgba(245,158,11,0.02)' }] } },
    }],
  };
}

export default function OnChainMetrics({ onChainData }) {
  if (!onChainData) return null;
  const { fees, mempool, difficulty, hashrate } = onChainData;

  return (
    <div className="crypto-panel" style={{ marginTop: 1 }}>
      <div className="crypto-panel-header">
        <span className="crypto-panel-title">BTC On-Chain Metrics</span>
        <span className="crypto-panel-subtitle">mempool.space · fees · hashrate · difficulty</span>
      </div>
      <div className="onchain-cards">
        <div className="onchain-card">
          <span className="onchain-card-label">Recommended Fee</span>
          <span className="onchain-card-value amber">{fees?.fastest ?? '—'} <small>sat/vB</small></span>
          <span className="onchain-card-sub">Economy: {fees?.economy ?? '—'} · Min: {fees?.minimum ?? '—'}</span>
        </div>
        <div className="onchain-card">
          <span className="onchain-card-label">Mempool Size</span>
          <span className="onchain-card-value">{mempool?.vsize ?? '—'} <small>vMB</small></span>
          <span className="onchain-card-sub">{mempool?.count?.toLocaleString() ?? '—'} unconfirmed tx</span>
        </div>
        <div className="onchain-card">
          <span className="onchain-card-label">Hashrate</span>
          <span className="onchain-card-value amber">{hashrate?.current ?? '—'} <small>EH/s</small></span>
          <span className="onchain-card-sub">30-day network average</span>
        </div>
        <div className="onchain-card">
          <span className="onchain-card-label">Next Difficulty</span>
          <span className="onchain-card-value">{difficulty?.difficultyChange != null ? `${difficulty.difficultyChange > 0 ? '+' : ''}${difficulty.difficultyChange}%` : '—'}</span>
          <span className="onchain-card-sub">{difficulty?.progressPercent ?? '—'}% · {difficulty?.remainingBlocks?.toLocaleString() ?? '—'} blocks left</span>
        </div>
      </div>
      {hashrate?.history?.length > 2 && (
        <div className="onchain-chart-wrap">
          <div className="crypto-chart-title">Hashrate Trend (30d)</div>
          <ReactECharts option={buildHashrateOption(hashrate.history)} style={{ height: 160, width: '100%' }} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add on-chain CSS styles to CryptoComponents.css**

Append to `src/markets/crypto/components/CryptoComponents.css`:

```css
/* On-chain metrics */
.onchain-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding: 8px 12px; flex-shrink: 0; }
.onchain-card { background: #1e293b; border-radius: 6px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
.onchain-card-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
.onchain-card-value { font-size: 18px; font-weight: 700; color: #e2e8f0; font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; }
.onchain-card-value.amber { color: #f59e0b; }
.onchain-card-value small { font-size: 10px; font-weight: 400; color: #64748b; }
.onchain-card-sub { font-size: 10px; color: #64748b; }
.onchain-chart-wrap { padding: 4px 12px 8px; flex-shrink: 0; }
```

- [ ] **Step 3: Wire OnChainMetrics into CryptoMarket.jsx**

In `src/markets/crypto/CryptoMarket.jsx`:

1. Add import: `import OnChainMetrics from './components/OnChainMetrics';`
2. Destructure `onChainData` from `useCryptoData()` (add to the existing destructuring at line 19).
3. Render inside the Market Overview tab — replace the existing line:
   ```jsx
   {activeTab === 'market'  && <CoinMarketOverview    coinMarketData={coinMarketData} />}
   ```
   with:
   ```jsx
   {activeTab === 'market'  && <>
     <CoinMarketOverview coinMarketData={coinMarketData} />
     <OnChainMetrics onChainData={onChainData} />
   </>}
   ```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/crypto/`
Expected: All 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/markets/crypto/components/OnChainMetrics.jsx src/markets/crypto/components/CryptoComponents.css src/markets/crypto/CryptoMarket.jsx
git commit -m "feat(crypto): OnChainMetrics component with fee cards + hashrate chart"
```

---

### Task 4: Bonds — Server-side FRED breakeven calls

**Files:**
- Modify: `server/index.js:474-521` (inside `/api/bonds` endpoint)

- [ ] **Step 1: Add breakeven FRED calls after spread indicators**

In `server/index.js`, after the spread indicators block (around line 488), before the treasury rates block (line 490), add:

```js
    // 5b. TIPS breakevens + real yields (history + latest)
    let breakevensData = null;
    if (FRED_API_KEY) {
      try {
        const [be5yHist, be10yHist, fwd5y5yHist, real5y, real10y] = await Promise.all([
          fetchFredHistory('T5YIE', 130),
          fetchFredHistory('T10YIE', 130),
          fetchFredHistory('T5YIFR', 130),
          fetchFredLatest('DFII5'),
          fetchFredLatest('DFII10'),
        ]);

        // Align dates across the 3 history series (use be5y as anchor)
        if (be5yHist?.length >= 20) {
          const dates = be5yHist.map(p => p.date);
          const be5yVals = be5yHist.map(p => p.value);

          // Map be10y and fwd5y5y to the same date array
          const be10yMap = {};
          (be10yHist || []).forEach(p => { be10yMap[p.date] = p.value; });
          const fwdMap = {};
          (fwd5y5yHist || []).forEach(p => { fwdMap[p.date] = p.value; });

          const be10yVals = dates.map(d => be10yMap[d] ?? null);
          const fwd5y5yVals = dates.map(d => fwdMap[d] ?? null);

          breakevensData = {
            current: {
              be5y:       be5yVals[be5yVals.length - 1],
              be10y:      be10yVals[be10yVals.length - 1],
              forward5y5y: fwd5y5yVals[fwd5y5yVals.length - 1],
              real5y:     real5y,
              real10y:    real10y,
            },
            history: {
              dates:       dates.map(d => dateToMonthLabel(d)),
              be5y:        be5yVals,
              be10y:       be10yVals,
              forward5y5y: fwd5y5yVals,
            },
          };
        }
      } catch { /* use null — client falls back to mock */ }
    }
```

- [ ] **Step 2: Add breakevensData to the result object**

Change the result object (around line 516) to include `breakevensData`:

```js
    const result = {
      yieldCurveData,
      spreadData,
      spreadIndicators: Object.keys(spreadIndicators).length >= 3 ? spreadIndicators : null,
      treasuryRates,
      breakevensData,
      lastUpdated: today,
    };
```

- [ ] **Step 3: Run server to verify it starts without errors**

Run: `cd server && node index.js`
Expected: Server starts on port 3001 without crash. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(bonds): add TIPS breakevens + real yields to /api/bonds"
```

---

### Task 5: Bonds — Mock data + hook + test

**Files:**
- Modify: `src/markets/bonds/data/mockBondsData.js`
- Modify: `src/markets/bonds/data/useBondsData.js`
- Modify: `src/__tests__/bonds/useBondsData.test.js`

- [ ] **Step 1: Add breakevensData mock to mockBondsData.js**

Append to `src/markets/bonds/data/mockBondsData.js`:

```js
export const breakevensData = {
  current: { be5y: 2.31, be10y: 2.28, forward5y5y: 2.25, real5y: 1.85, real10y: 1.92 },
  history: {
    dates: [
      'Oct-24','Oct-24','Nov-24','Nov-24','Dec-24','Dec-24','Jan-25','Jan-25',
      'Feb-25','Feb-25','Mar-25','Mar-25','Mar-25','Mar-25','Mar-25','Mar-25',
      'Mar-25','Mar-25','Mar-25','Apr-25','Apr-25','Apr-25','Apr-25','Apr-25',
    ],
    be5y:        [2.18,2.20,2.22,2.24,2.19,2.16,2.21,2.25,2.28,2.30,2.32,2.34,2.31,2.29,2.27,2.30,2.32,2.33,2.31,2.30,2.29,2.31,2.32,2.31],
    be10y:       [2.22,2.24,2.25,2.27,2.23,2.20,2.24,2.27,2.29,2.31,2.32,2.33,2.30,2.28,2.27,2.29,2.31,2.32,2.30,2.29,2.28,2.29,2.30,2.28],
    forward5y5y: [2.26,2.28,2.28,2.30,2.27,2.24,2.27,2.29,2.30,2.32,2.32,2.32,2.29,2.27,2.27,2.28,2.30,2.31,2.29,2.28,2.27,2.27,2.28,2.25],
  },
};
```

- [ ] **Step 2: Update useBondsData.js to include breakevensData**

In `src/markets/bonds/data/useBondsData.js`:

1. Add `breakevensData as mockBreakevensData` to the import from `./mockBondsData` (add after `spreadIndicators`).
2. Add state after `spreadIndicators` state: `const [breakevensData, setBreakevensData] = useState(mockBreakevensData);`
3. Inside the `try` block's success path, after the `spreadIndicators` guard (around line 67), add:
   ```js
   if (data.breakevensData?.history?.dates?.length >= 20) {
     setBreakevensData(data.breakevensData);
   }
   ```
4. Add `breakevensData` to the return object.

Full updated return statement:
```js
  return { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, breakevensData, treasuryRates, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
```

- [ ] **Step 3: Add breakevensData guard test to useBondsData.test.js**

Append inside the `describe` block in `src/__tests__/bonds/useBondsData.test.js`:

```js
  it('returns mock breakevensData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { breakevensData } = result.current;
    expect(breakevensData.current.be5y).toBeDefined();
    expect(breakevensData.current.real10y).toBeDefined();
    expect(breakevensData.history.dates.length).toBeGreaterThanOrEqual(20);
  });

  it('guard: does not apply breakevensData when history dates < 20', async () => {
    const liveData = {
      yieldCurveData: { US: { '10y': 4.0 } },
      spreadData: null,
      breakevensData: { current: { be5y: 3.0, be10y: 3.1, forward5y5y: 3.2, real5y: 1.5, real10y: 1.6 }, history: { dates: ['Jan-25'], be5y: [3.0], be10y: [3.1], forward5y5y: [3.2] } },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // Should keep mock breakevensData because live only has 1 date
    expect(result.current.breakevensData.current.be5y).toBe(2.31);
    expect(result.current.breakevensData.history.dates.length).toBeGreaterThanOrEqual(20);
  });
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/bonds/useBondsData.test.js`
Expected: All 8 tests pass (6 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/markets/bonds/data/mockBondsData.js src/markets/bonds/data/useBondsData.js src/__tests__/bonds/useBondsData.test.js
git commit -m "feat(bonds): add breakevensData mock, hook guard, and tests"
```

---

### Task 6: Bonds — BreakevenMonitor component + wiring

**Files:**
- Create: `src/markets/bonds/components/BreakevenMonitor.jsx`
- Modify: `src/markets/bonds/components/BondsComponents.css`
- Modify: `src/markets/bonds/BondsMarket.jsx`

- [ ] **Step 1: Create BreakevenMonitor.jsx**

Create `src/markets/bonds/components/BreakevenMonitor.jsx`:

```jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

function fmt(v) { return v != null ? `${v.toFixed(2)}%` : '—'; }

function buildBreakevenOption(history) {
  const { dates, be5y, be10y, forward5y5y } = history;
  // Subsample to ~40 points max for readability
  const step = dates.length > 40 ? Math.ceil(dates.length / 40) : 1;
  const d = dates.filter((_, i) => i % step === 0 || i === dates.length - 1);
  const s5 = be5y.filter((_, i) => i % step === 0 || i === dates.length - 1);
  const s10 = be10y.filter((_, i) => i % step === 0 || i === dates.length - 1);
  const sf = forward5y5y.filter((_, i) => i % step === 0 || i === dates.length - 1);

  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 28, right: 16, bottom: 28, left: 48 },
    legend: {
      data: ['5Y BE', '10Y BE', '5Y5Y Fwd'],
      top: 0, right: 0,
      textStyle: { color: '#94a3b8', fontSize: 10 },
      itemWidth: 14, itemHeight: 2,
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
    },
    xAxis: {
      type: 'category',
      data: d,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 9, interval: Math.floor(d.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => `${v.toFixed(1)}%` },
    },
    series: [
      { name: '5Y BE',     type: 'line', data: s5, smooth: true, showSymbol: false, lineStyle: { color: '#10b981', width: 2 } },
      { name: '10Y BE',    type: 'line', data: s10, smooth: true, showSymbol: false, lineStyle: { color: '#34d399', width: 2 } },
      { name: '5Y5Y Fwd',  type: 'line', data: sf, smooth: true, showSymbol: false, lineStyle: { color: '#6ee7b7', width: 1.5, type: 'dashed' } },
    ],
  };
}

export default function BreakevenMonitor({ breakevensData }) {
  if (!breakevensData) return null;
  const { current, history } = breakevensData;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">TIPS Breakevens & Real Yields</span>
        <span className="bonds-panel-subtitle">Market-implied inflation expectations · FRED</span>
      </div>
      <div className="be-pills">
        <div className="be-pill">
          <span className="be-pill-label">5Y Breakeven</span>
          <span className="be-pill-value green">{fmt(current?.be5y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">10Y Breakeven</span>
          <span className="be-pill-value green">{fmt(current?.be10y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">5Y5Y Forward</span>
          <span className="be-pill-value green">{fmt(current?.forward5y5y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">5Y Real Yield</span>
          <span className="be-pill-value">{fmt(current?.real5y)}</span>
        </div>
        <div className="be-pill">
          <span className="be-pill-label">10Y Real Yield</span>
          <span className="be-pill-value">{fmt(current?.real10y)}</span>
        </div>
      </div>
      {history?.dates?.length > 5 && (
        <div className="bonds-chart-wrap">
          <ReactECharts option={buildBreakevenOption(history)} style={{ height: '100%', width: '100%' }} />
        </div>
      )}
      <div className="be-footer">
        Breakeven = Nominal − TIPS real yield · Forward = market's expected avg inflation 5–10yr out
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add breakeven CSS styles to BondsComponents.css**

Append to `src/markets/bonds/components/BondsComponents.css`:

```css
/* Breakeven Monitor */
.be-pills { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.be-pill { background: #1e293b; border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 100px; }
.be-pill-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
.be-pill-value { font-size: 16px; font-weight: 700; color: #e2e8f0; font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; }
.be-pill-value.green { color: #10b981; }
.be-footer { margin-top: 8px; font-size: 10px; color: #475569; }
```

- [ ] **Step 3: Wire BreakevenMonitor into BondsMarket.jsx as 5th sub-tab**

In `src/markets/bonds/BondsMarket.jsx`:

1. Add import: `import BreakevenMonitor from './components/BreakevenMonitor';`
2. Add to SUB_TABS array: `{ id: 'breakevens', label: 'Breakevens' },`
3. Destructure `breakevensData` from `useBondsData()`.
4. Add render case in the content section:
   ```jsx
   {activeTab === 'breakevens'     && <BreakevenMonitor breakevensData={breakevensData} />}
   ```

Full updated `BondsMarket.jsx`:

```jsx
import React, { useState } from 'react';
import { useBondsData } from './data/useBondsData';
import YieldCurve        from './components/YieldCurve';
import CreditMatrix      from './components/CreditMatrix';
import SpreadMonitor     from './components/SpreadMonitor';
import DurationLadder    from './components/DurationLadder';
import BreakevenMonitor  from './components/BreakevenMonitor';
import './BondsMarket.css';

const SUB_TABS = [
  { id: 'yield-curve',     label: 'Yield Curve'    },
  { id: 'credit-matrix',   label: 'Credit Matrix'  },
  { id: 'spread-monitor',  label: 'Spread Monitor' },
  { id: 'duration-ladder', label: 'Duration Ladder' },
  { id: 'breakevens',      label: 'Breakevens'     },
];

export default function BondsMarket() {
  const [activeTab, setActiveTab] = useState('yield-curve');
  const { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, breakevensData, treasuryRates, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useBondsData();

  if (isLoading) {
    return (
      <div className="bonds-market bonds-loading">
        <div className="bonds-loading-spinner" />
        <span className="bonds-loading-text">Loading bonds data…</span>
      </div>
    );
  }

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
        {!isCurrent && fetchedOn && <span className="bonds-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="bonds-content">
        {activeTab === 'yield-curve'     && <YieldCurve     yieldCurveData={yieldCurveData} spreadIndicators={spreadIndicators} />}
        {activeTab === 'credit-matrix'   && <CreditMatrix   creditRatingsData={creditRatingsData} />}
        {activeTab === 'spread-monitor'  && <SpreadMonitor  spreadData={spreadData} />}
        {activeTab === 'duration-ladder' && <DurationLadder durationLadderData={durationLadderData} treasuryRates={treasuryRates} />}
        {activeTab === 'breakevens'      && <BreakevenMonitor breakevensData={breakevensData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/bonds/`
Expected: All 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/markets/bonds/components/BreakevenMonitor.jsx src/markets/bonds/components/BondsComponents.css src/markets/bonds/BondsMarket.jsx
git commit -m "feat(bonds): BreakevenMonitor component with 5th sub-tab"
```

---

### Task 7: Commodities — Server-side CFTC COT call

**Files:**
- Modify: `server/index.js:1265-1306` (inside `/api/commodities` endpoint)

- [ ] **Step 1: Add CFTC COT fetch after the EIA supply/demand block**

In `server/index.js`, after the `supplyDemandData` block (around line 1287) and before the result object (line 1289), add:

```js
    // 6. CFTC COT positioning for WTI crude + gold
    let cotData = null;
    try {
      const cotUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$where=market_and_exchange_names like 'CRUDE OIL%25' OR market_and_exchange_names like 'GOLD%25'&$order=report_date_as_yyyy_mm_dd DESC&$limit=24`;
      const cotRaw = await fetchJSON(cotUrl);
      if (Array.isArray(cotRaw) && cotRaw.length > 0) {
        const grouped = {};
        for (const row of cotRaw) {
          const isCrude = /CRUDE OIL/i.test(row.market_and_exchange_names);
          const isGold  = /GOLD/i.test(row.market_and_exchange_names);
          const key = isCrude ? 'WTI Crude Oil' : isGold ? 'Gold' : null;
          if (!key) continue;
          if (!grouped[key]) grouped[key] = [];
          const noncommLong  = parseInt(row.noncomm_positions_long_all || '0');
          const noncommShort = parseInt(row.noncomm_positions_short_all || '0');
          const commLong     = parseInt(row.comm_positions_long_all || '0');
          const commShort    = parseInt(row.comm_positions_short_all || '0');
          const totalOI      = parseInt(row.open_interest_all || '0');
          grouped[key].push({
            date:       row.report_date_as_yyyy_mm_dd,
            noncommNet: noncommLong - noncommShort,
            commNet:    commLong - commShort,
            totalOI,
          });
        }

        const commodities = [];
        for (const name of ['WTI Crude Oil', 'Gold']) {
          const rows = (grouped[name] || []).slice(0, 12);
          if (rows.length === 0) continue;
          const latest = rows[0];
          const prev = rows.length >= 2 ? rows[1] : null;
          commodities.push({
            name,
            latest: {
              noncommNet: latest.noncommNet,
              commNet:    latest.commNet,
              totalOI:    latest.totalOI,
              netChange:  prev ? latest.noncommNet - prev.noncommNet : 0,
            },
            history: rows.map(r => ({ date: r.date, noncommNet: r.noncommNet })),
          });
        }

        if (commodities.length >= 2) {
          cotData = { commodities };
        }
      }
    } catch (e) {
      console.warn('CFTC COT fetch failed:', e.message);
    }
```

- [ ] **Step 2: Add cotData to the result object**

Change the result object (around line 1289) to include `cotData`:

```js
    const result = {
      priceDashboardData,
      sectorHeatmapData,
      futuresCurveData:  futuresCurveData  ?? null,
      supplyDemandData:  supplyDemandData  ?? null,
      cotData:           cotData            ?? null,
      lastUpdated: today,
    };
```

- [ ] **Step 3: Run server to verify it starts without errors**

Run: `cd server && node index.js`
Expected: Server starts on port 3001 without crash. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(commodities): add CFTC COT positioning to /api/commodities"
```

---

### Task 8: Commodities — Mock data + hook + test

**Files:**
- Modify: `src/markets/commodities/data/mockCommoditiesData.js`
- Modify: `src/markets/commodities/data/useCommoditiesData.js`
- Modify: `src/__tests__/commodities/useCommoditiesData.test.js`

- [ ] **Step 1: Add cotData mock to mockCommoditiesData.js**

Append to `src/markets/commodities/data/mockCommoditiesData.js`:

```js
export const cotData = {
  commodities: [
    {
      name: 'WTI Crude Oil',
      latest: { noncommNet: 215400, commNet: -198200, totalOI: 1842000, netChange: 12800 },
      history: [
        { date: '2026-04-01', noncommNet: 215400 },
        { date: '2026-03-25', noncommNet: 202600 },
        { date: '2026-03-18', noncommNet: 198400 },
        { date: '2026-03-11', noncommNet: 210200 },
        { date: '2026-03-04', noncommNet: 205800 },
        { date: '2026-02-25', noncommNet: 195200 },
        { date: '2026-02-18', noncommNet: 188400 },
        { date: '2026-02-11', noncommNet: 192600 },
        { date: '2026-02-04', noncommNet: 201000 },
        { date: '2026-01-28', noncommNet: 208200 },
        { date: '2026-01-21', noncommNet: 198800 },
        { date: '2026-01-14', noncommNet: 194200 },
      ],
    },
    {
      name: 'Gold',
      latest: { noncommNet: 268400, commNet: -245800, totalOI: 524000, netChange: 8200 },
      history: [
        { date: '2026-04-01', noncommNet: 268400 },
        { date: '2026-03-25', noncommNet: 260200 },
        { date: '2026-03-18', noncommNet: 255800 },
        { date: '2026-03-11', noncommNet: 248200 },
        { date: '2026-03-04', noncommNet: 252400 },
        { date: '2026-02-25', noncommNet: 242800 },
        { date: '2026-02-18', noncommNet: 238200 },
        { date: '2026-02-11', noncommNet: 235400 },
        { date: '2026-02-04', noncommNet: 240600 },
        { date: '2026-01-28', noncommNet: 245800 },
        { date: '2026-01-21', noncommNet: 238400 },
        { date: '2026-01-14', noncommNet: 232800 },
      ],
    },
  ],
};
```

- [ ] **Step 2: Update useCommoditiesData.js to include cotData**

In `src/markets/commodities/data/useCommoditiesData.js`:

1. Add `cotData as mockCotData` to the import from `./mockCommoditiesData`.
2. Add state: `const [cotData, setCotData] = useState(mockCotData);`
3. Inside the `.then(data => {` block, add guard: `if (data.cotData?.commodities?.length >= 2) setCotData(data.cotData);`
4. Add `cotData` to the return object.

Full updated file:

```js
// src/markets/commodities/data/useCommoditiesData.js
import { useState, useEffect } from 'react';
import {
  priceDashboardData  as mockPriceDashboardData,
  futuresCurveData    as mockFuturesCurveData,
  sectorHeatmapData   as mockSectorHeatmapData,
  supplyDemandData    as mockSupplyDemandData,
  cotData             as mockCotData,
} from './mockCommoditiesData';

const SERVER = '';

export function useCommoditiesData() {
  const [priceDashboardData,  setPriceDashboardData]  = useState(mockPriceDashboardData);
  const [futuresCurveData,    setFuturesCurveData]    = useState(mockFuturesCurveData);
  const [sectorHeatmapData,   setSectorHeatmapData]   = useState(mockSectorHeatmapData);
  const [supplyDemandData,    setSupplyDemandData]    = useState(mockSupplyDemandData);
  const [cotData,             setCotData]             = useState(mockCotData);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — Dec 2025');
  const [isLoading,           setIsLoading]           = useState(true);
  const [fetchedOn,           setFetchedOn]           = useState(null);
  const [isCurrent,           setIsCurrent]           = useState(false);

  useEffect(() => {
    fetch(`${SERVER}/api/commodities`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.priceDashboardData?.length >= 3)             setPriceDashboardData(data.priceDashboardData);
        if (data.futuresCurveData?.prices?.length >= 4)       setFuturesCurveData(data.futuresCurveData);
        if (data.sectorHeatmapData?.commodities?.length >= 4) setSectorHeatmapData(data.sectorHeatmapData);
        if (data.supplyDemandData?.crudeStocks?.periods?.length) setSupplyDemandData(data.supplyDemandData);
        if (data.cotData?.commodities?.length >= 2)           setCotData(data.cotData);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 3: Add cotData guard test to useCommoditiesData.test.js**

Append inside the `describe` block in `src/__tests__/commodities/useCommoditiesData.test.js`:

```js
  it('returns cotData with 2 commodities on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { cotData } = result.current;
    expect(cotData.commodities).toHaveLength(2);
    expect(cotData.commodities[0].name).toBe('WTI Crude Oil');
    expect(cotData.commodities[1].name).toBe('Gold');
    expect(cotData.commodities[0].history.length).toBeGreaterThanOrEqual(10);
  });

  it('guard: does not apply cotData when commodities length < 2', async () => {
    const liveData = {
      priceDashboardData: [
        { sector: 'Energy', commodities: [{ ticker: 'CL=F', name: 'WTI Crude', unit: '$/bbl', price: 90.0, change1d: 1.5, change1w: 2.0, change1m: 3.0, sparkline: [88, 89, 90] }] },
        { sector: 'Metals', commodities: [{ ticker: 'GC=F', name: 'Gold', unit: '$/oz', price: 2400, change1d: 0.5, change1w: 1.0, change1m: 2.0, sparkline: [2380, 2390, 2400] }] },
        { sector: 'Agriculture', commodities: [{ ticker: 'ZW=F', name: 'Wheat', unit: '¢/bu', price: 550, change1d: -0.5, change1w: -1.0, change1m: -2.0, sparkline: [560, 555, 550] }] },
      ],
      futuresCurveData: { labels: ["Jun '26"], prices: [90.0], commodity: 'WTI', spotPrice: 90.0 },
      sectorHeatmapData: { commodities: [], columns: [] },
      supplyDemandData: null,
      cotData: { commodities: [{ name: 'WTI Crude Oil', latest: { noncommNet: 100, commNet: -80, totalOI: 500, netChange: 5 }, history: [] }] },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCommoditiesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // Should keep mock cotData because live only has 1 commodity (need >= 2)
    expect(result.current.cotData.commodities).toHaveLength(2);
    expect(result.current.cotData.commodities[0].name).toBe('WTI Crude Oil');
    expect(result.current.cotData.commodities[0].history.length).toBeGreaterThanOrEqual(10);
  });
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/commodities/useCommoditiesData.test.js`
Expected: All 8 tests pass (6 existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/markets/commodities/data/mockCommoditiesData.js src/markets/commodities/data/useCommoditiesData.js src/__tests__/commodities/useCommoditiesData.test.js
git commit -m "feat(commodities): add cotData mock, hook guard, and tests"
```

---

### Task 9: Commodities — CotPositioning component + wiring

**Files:**
- Create: `src/markets/commodities/components/CotPositioning.jsx`
- Modify: `src/markets/commodities/components/CommodComponents.css`
- Modify: `src/markets/commodities/CommoditiesMarket.jsx`

- [ ] **Step 1: Create CotPositioning.jsx**

Create `src/markets/commodities/components/CotPositioning.jsx`:

```jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import './CommodComponents.css';

function fmtK(v) { return v != null ? `${(v / 1000).toFixed(0)}K` : '—'; }

function buildHistoryOption(history, name) {
  const dates = history.map(h => h.date.slice(5));
  const values = history.map(h => h.noncommNet);
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 24, left: 52 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1e293b',
      borderColor: '#334155',
      textStyle: { color: '#e2e8f0', fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>Net: ${fmtK(params[0].value)} contracts`,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: '#334155' } },
      axisLabel: { color: '#64748b', fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#1e293b' } },
      axisLabel: { color: '#64748b', fontSize: 9, formatter: v => fmtK(v) },
    },
    series: [{
      type: 'bar',
      data: values.map(v => ({
        value: v,
        itemStyle: { color: v >= 0 ? '#10b981' : '#ef4444' },
      })),
      barWidth: '60%',
    }],
  };
}

export default function CotPositioning({ cotData }) {
  if (!cotData?.commodities?.length) return null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">COT Positioning</span>
        <span className="com-panel-subtitle">CFTC Commitments of Traders · speculative vs commercial</span>
      </div>
      <div className="cot-grid">
        {cotData.commodities.map(c => (
          <div key={c.name} className="cot-commodity">
            <div className="cot-name">{c.name}</div>
            <div className="cot-metrics">
              <div className="cot-metric">
                <span className="cot-metric-label">Spec Net</span>
                <span className={`cot-metric-value ${c.latest.noncommNet >= 0 ? 'green' : 'red'}`}>
                  {fmtK(c.latest.noncommNet)}
                </span>
              </div>
              <div className="cot-metric">
                <span className="cot-metric-label">Comm Net</span>
                <span className={`cot-metric-value ${c.latest.commNet >= 0 ? 'green' : 'red'}`}>
                  {fmtK(c.latest.commNet)}
                </span>
              </div>
              <div className="cot-metric">
                <span className="cot-metric-label">Total OI</span>
                <span className="cot-metric-value">{fmtK(c.latest.totalOI)}</span>
              </div>
              <div className="cot-metric">
                <span className="cot-metric-label">Wk Change</span>
                <span className={`cot-metric-value ${c.latest.netChange >= 0 ? 'green' : 'red'}`}>
                  {c.latest.netChange >= 0 ? '+' : ''}{fmtK(c.latest.netChange)}
                </span>
              </div>
            </div>
            {c.history?.length > 2 && (
              <div style={{ height: 140 }}>
                <ReactECharts option={buildHistoryOption(c.history, c.name)} style={{ height: '100%', width: '100%' }} />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="com-panel-footer">
        CFTC Commitments of Traders · Weekly · Non-commercial = speculative positioning
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add COT CSS styles to CommodComponents.css**

Append to `src/markets/commodities/components/CommodComponents.css`:

```css
/* COT Positioning */
.cot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; overflow: auto; }
.cot-commodity { background: #1e293b; border-radius: 6px; padding: 12px; }
.cot-name { font-size: 13px; font-weight: 600; color: #ca8a04; margin-bottom: 8px; }
.cot-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 8px; }
.cot-metric { display: flex; flex-direction: column; gap: 2px; }
.cot-metric-label { font-size: 9px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
.cot-metric-value { font-size: 14px; font-weight: 700; color: #e2e8f0; font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace; }
.cot-metric-value.green { color: #10b981; }
.cot-metric-value.red { color: #ef4444; }
```

- [ ] **Step 3: Wire CotPositioning into CommoditiesMarket.jsx as 5th sub-tab**

In `src/markets/commodities/CommoditiesMarket.jsx`:

1. Add import: `import CotPositioning from './components/CotPositioning';`
2. Add to SUB_TABS array: `{ id: 'cot', label: 'COT Positioning' },`
3. Destructure `cotData` from `useCommoditiesData()`.
4. Add render case:
   ```jsx
   {activeTab === 'cot'             && <CotPositioning cotData={cotData} />}
   ```

Full updated `CommoditiesMarket.jsx`:

```jsx
// src/markets/commodities/CommoditiesMarket.jsx
import React, { useState } from 'react';
import { useCommoditiesData } from './data/useCommoditiesData';
import PriceDashboard  from './components/PriceDashboard';
import FuturesCurve    from './components/FuturesCurve';
import SectorHeatmap   from './components/SectorHeatmap';
import SupplyDemand    from './components/SupplyDemand';
import CotPositioning  from './components/CotPositioning';
import './CommoditiesMarket.css';

const SUB_TABS = [
  { id: 'price-dashboard', label: 'Price Dashboard' },
  { id: 'futures-curve',   label: 'Futures Curve'   },
  { id: 'sector-heatmap',  label: 'Sector Heatmap'  },
  { id: 'supply-demand',   label: 'Supply & Demand'  },
  { id: 'cot',             label: 'COT Positioning'  },
];

export default function CommoditiesMarket() {
  const [activeTab, setActiveTab] = useState('price-dashboard');
  const { priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData, isLive, lastUpdated, isLoading, fetchedOn, isCurrent } = useCommoditiesData();

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
          {isLive ? '● Live · Yahoo Finance / EIA' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="com-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="com-content">
        {activeTab === 'price-dashboard' && <PriceDashboard priceDashboardData={priceDashboardData} />}
        {activeTab === 'futures-curve'   && <FuturesCurve   futuresCurveData={futuresCurveData} />}
        {activeTab === 'sector-heatmap'  && <SectorHeatmap  sectorHeatmapData={sectorHeatmapData} />}
        {activeTab === 'supply-demand'   && <SupplyDemand   supplyDemandData={supplyDemandData} />}
        {activeTab === 'cot'             && <CotPositioning cotData={cotData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/commodities/`
Expected: All 8 tests pass.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (previous count was 324, now should be 330 — +6 new tests: 1 crypto, 2 bonds, 2 commodities, plus any existing).

- [ ] **Step 6: Commit**

```bash
git add src/markets/commodities/components/CotPositioning.jsx src/markets/commodities/components/CommodComponents.css src/markets/commodities/CommoditiesMarket.jsx
git commit -m "feat(commodities): CotPositioning component with 5th sub-tab"
```

---

## Self-Review

**Spec coverage:**
- Crypto on-chain: Server calls (Task 1) ✓, mock+hook+test (Task 2) ✓, component+wiring (Task 3) ✓
- Bonds breakevens: Server calls (Task 4) ✓, mock+hook+test (Task 5) ✓, component+wiring (Task 6) ✓
- Commodities COT: Server calls (Task 7) ✓, mock+hook+test (Task 8) ✓, component+wiring (Task 9) ✓
- FX intervention: Dropped per spec ✓

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:** Verified property names match across tasks: `onChainData.fees.fastest`, `breakevensData.history.dates`, `cotData.commodities[].latest.noncommNet` — all consistent between server, mock, hook guard, component, and test code.
