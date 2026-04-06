# Commodities Market Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all 5 Commodities sub-tabs into dense, "one-glimpse-get-all" dashboards with new FRED series, Gold futures curve, DBC ETF, additional tickers, and KPI strips.

**Architecture:** Server adds FRED commodity history fetches (WTI/Brent/Gold/NatGas daily, PPI monthly, Dollar Index daily), Gold futures curve (same pattern as WTI), DBC ETF quote + 1yr chart, and 6 additional Yahoo commodity tickers. Each sub-tab component gets a KPI strip + additional chart panels in a multi-column grid layout. All new fetches run inside existing `Promise.allSettled` with daily disk cache.

**Tech Stack:** React 18 + ECharts (via echarts-for-react) + FRED API + Yahoo Finance (yahoo-finance2) + existing Vite 5 build

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/index.js` | Modify | Add FRED fetches, Gold futures, DBC ETF, expand COMMODITY_META |
| `src/markets/commodities/data/mockCommoditiesData.js` | Modify | Add mock exports for all new data fields |
| `src/markets/commodities/data/useCommoditiesData.js` | Modify | Add state/guard/return for new fields |
| `src/markets/commodities/CommoditiesMarket.jsx` | Modify | Destructure + pass new props |
| `src/markets/commodities/components/CommodComponents.css` | Modify | Add KPI strip, layout grid, chart panel styles |
| `src/markets/commodities/components/PriceDashboard.jsx` | Modify | KPI strip + DBC chart + WTI/Brent overlay |
| `src/markets/commodities/components/FuturesCurve.jsx` | Modify | KPI strip + Gold curve side-by-side + Dollar/WTI overlay |
| `src/markets/commodities/components/SectorHeatmap.jsx` | Modify | KPI strip + sector bars + PPI chart |
| `src/markets/commodities/components/SupplyDemand.jsx` | Modify | KPI strip + Gold chart + 3-col top row |
| `src/markets/commodities/components/CotPositioning.jsx` | Modify | KPI strip + net positioning trend chart |

---

### Task 1: Server — Expand COMMODITY_META + Add FRED/Gold Futures/DBC Fetches

**Files:**
- Modify: `server/index.js` (~lines 1263–1524)

- [ ] **Step 1: Expand COMMODITY_META with 6 new tickers**

In `server/index.js`, find the `COMMODITY_META` object (line 1263) and add 6 new entries. The updated object should be:

```js
const COMMODITY_META = {
  'CL=F': { name: 'WTI Crude',   sector: 'Energy',      unit: '$/bbl'   },
  'BZ=F': { name: 'Brent Crude', sector: 'Energy',      unit: '$/bbl'   },
  'NG=F': { name: 'Natural Gas', sector: 'Energy',      unit: '$/MMBtu' },
  'RB=F': { name: 'Gasoline',    sector: 'Energy',      unit: '$/gal'   },
  'HO=F': { name: 'Heating Oil', sector: 'Energy',      unit: '$/gal'   },
  'GC=F': { name: 'Gold',        sector: 'Metals',      unit: '$/oz'    },
  'SI=F': { name: 'Silver',      sector: 'Metals',      unit: '$/oz'    },
  'HG=F': { name: 'Copper',      sector: 'Metals',      unit: '$/lb'    },
  'PL=F': { name: 'Platinum',    sector: 'Metals',      unit: '$/oz'    },
  'PA=F': { name: 'Palladium',   sector: 'Metals',      unit: '$/oz'    },
  'ZW=F': { name: 'Wheat',       sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZC=F': { name: 'Corn',        sector: 'Agriculture', unit: '\u00a2/bu' },
  'ZS=F': { name: 'Soybeans',    sector: 'Agriculture', unit: '\u00a2/bu' },
  'KC=F': { name: 'Coffee',      sector: 'Agriculture', unit: '\u00a2/lb' },
  'CT=F': { name: 'Cotton',      sector: 'Agriculture', unit: '\u00a2/lb' },
  'SB=F': { name: 'Sugar',       sector: 'Agriculture', unit: '\u00a2/lb' },
  'LE=F': { name: 'Live Cattle', sector: 'Livestock',   unit: '\u00a2/lb' },
  'LBS=F':{ name: 'Lumber',      sector: 'Livestock',   unit: '$/MBF'   },
};
const COMMODITY_TICKERS = Object.keys(COMMODITY_META);
const COMM_SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture', 'Livestock'];
```

Note: `Livestock` is a new sector. `COMM_SECTORS_ORDER` must include it. Lumber is grouped with Livestock for "Other/Real Assets" since there's no better match with only 2 items.

- [ ] **Step 2: Add Gold futures ticker helper**

Right after the existing `futuresTickerToLabel` function (line ~1303), add a Gold futures helper. COMEX Gold trades Feb, Apr, Jun, Aug, Oct, Dec (codes: G, J, M, Q, V, Z):

```js
const GOLD_FUTURES_MONTHS = ['G','J','M','Q','V','Z']; // Feb,Apr,Jun,Aug,Oct,Dec
function getGoldFuturesTickers(numMonths = 8) {
  const tickers = [];
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1; // 1-indexed, current month
  // Find next valid gold futures month
  const validMonths = [2,4,6,8,10,12]; // Feb,Apr,Jun,Aug,Oct,Dec
  let startMonth = validMonths.find(m => m > month);
  if (!startMonth) { startMonth = validMonths[0]; year++; }
  let mIdx = validMonths.indexOf(startMonth);
  for (let i = 0; i < numMonths; i++) {
    const m = validMonths[mIdx];
    const code = FUTURES_MONTH_CODES[m - 1];
    const yr = String(year).slice(-2);
    tickers.push(`GC${code}${yr}.CMX`);
    mIdx++;
    if (mIdx >= validMonths.length) { mIdx = 0; year++; }
  }
  return tickers;
}

function goldFuturesTickerToLabel(ticker) {
  const code = ticker[2];
  const yr = ticker.slice(3, 5);
  return `${FUTURES_MONTH_NAMES[code] || '?'} '${yr}`;
}
```

- [ ] **Step 3: Add FRED commodity fetches + Gold futures + DBC ETF inside the try block**

After the existing section `// 6. CFTC COT positioning...` block (which ends around line 1503), and before the `const result = {` line (line 1505), insert these new sections:

```js
    // 7. FRED commodity price histories + indicators
    let fredCommodities = null;
    if (FRED_API_KEY) {
      try {
        const [wtiHist, goldHist, brentHist, natGasHist, ppiHist, dollarHist, gasRetailVal] = await Promise.all([
          fetchFredHistory('DCOILWTICO', 252).catch(() => []),
          fetchFredHistory('GOLDAMGBD228NLBM', 252).catch(() => []),
          fetchFredHistory('DCOILBRENTEU', 252).catch(() => []),
          fetchFredHistory('DHHNGSP', 252).catch(() => []),
          fetchFredHistory('WPUFD49207', 36).catch(() => []),
          fetchFredHistory('DTWEXBGS', 252).catch(() => []),
          fetchFredLatest('GASREGW').catch(() => null),
        ]);
        const toSeries = (hist) => hist.length >= 10 ? {
          dates: hist.map(p => p.date),
          values: hist.map(p => Math.round(p.value * 100) / 100),
        } : null;
        fredCommodities = {
          wtiHistory:    toSeries(wtiHist),
          goldHistory:   toSeries(goldHist),
          brentHistory:  toSeries(brentHist),
          natGasHistory: toSeries(natGasHist),
          ppiCommodity:  ppiHist.length >= 6 ? {
            dates: ppiHist.map(p => p.date.slice(0, 7)),
            values: ppiHist.map(p => Math.round(p.value * 10) / 10),
          } : null,
          dollarIndex:   toSeries(dollarHist),
          gasRetail:     gasRetailVal != null ? Math.round(gasRetailVal * 1000) / 1000 : null,
        };
      } catch { /* use null */ }
    }

    // 8. Gold futures curve (COMEX, bi-monthly contracts)
    let goldFuturesCurve = null;
    try {
      const goldTickers = getGoldFuturesTickers(8);
      const goldQuotes = await yf.quote(goldTickers);
      const goldArr = Array.isArray(goldQuotes) ? goldQuotes : [goldQuotes];
      const goldMap = {};
      goldArr.filter(q => q).forEach(q => { goldMap[q.symbol] = q; });
      const validGold = goldTickers
        .map(t => ({ ticker: t, label: goldFuturesTickerToLabel(t), price: goldMap[t]?.regularMarketPrice ?? null }))
        .filter(f => f.price != null);
      if (validGold.length >= 3) {
        goldFuturesCurve = {
          labels:    validGold.map(f => f.label),
          prices:    validGold.map(f => Math.round(f.price * 100) / 100),
          commodity: 'Gold',
          unit:      '$/oz',
          spotPrice: quotesMap['GC=F']?.regularMarketPrice ?? validGold[0]?.price ?? null,
        };
      }
    } catch (e) {
      console.warn('Gold futures curve failed:', e.message);
    }

    // 9. DBC (broad commodity ETF) quote + 1yr chart
    let dbcEtf = null;
    try {
      const dbcQuote = await yf.quote(['DBC']);
      const dbcArr = Array.isArray(dbcQuote) ? dbcQuote : [dbcQuote];
      const dq = dbcArr.find(q => q?.symbol === 'DBC');
      if (dq?.regularMarketPrice) {
        const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
        const histEnd = new Date().toISOString().split('T')[0];
        let dbcHistory = null;
        try {
          const chart = await yf.chart('DBC', { period1: histStart, period2: histEnd, interval: '1d' });
          const quotes = (chart.quotes || []).filter(q => q.close != null);
          if (quotes.length >= 20) {
            dbcHistory = {
              dates: quotes.map(q => q.date.toISOString().split('T')[0]),
              closes: quotes.map(q => Math.round(q.close * 100) / 100),
            };
          }
        } catch { /* no history */ }
        dbcEtf = {
          price: Math.round(dq.regularMarketPrice * 100) / 100,
          changePct: Math.round((dq.regularMarketChangePercent ?? 0) * 100) / 100,
          ytd: dq.ytdReturn != null ? Math.round(dq.ytdReturn * 1000) / 10 : null,
          history: dbcHistory,
        };
      }
    } catch { /* use null */ }
```

- [ ] **Step 4: Update the result object**

Change the existing `const result = { ... }` (line ~1505) to include all new fields:

```js
    const result = {
      priceDashboardData,
      sectorHeatmapData,
      futuresCurveData:    futuresCurveData    ?? null,
      supplyDemandData:    supplyDemandData    ?? null,
      cotData:             cotData             ?? null,
      fredCommodities:     fredCommodities     ?? null,
      goldFuturesCurve:    goldFuturesCurve    ?? null,
      dbcEtf:              dbcEtf              ?? null,
      lastUpdated: today,
    };
```

- [ ] **Step 5: Verify server starts**

Run: `cd server && node index.js`
Expected: Server starts on port 4000 without errors. Hit `http://localhost:4000/api/commodities` and verify the response includes `fredCommodities`, `goldFuturesCurve`, and `dbcEtf` fields (they may be null if no FRED key, but the response shape should be correct).

- [ ] **Step 6: Commit**

```bash
git add server/index.js
git commit -m "feat(commodities): expand tickers + add FRED histories, Gold futures, DBC ETF to server"
```

---

### Task 2: Mock Data + Hook — Add State for All New Fields

**Files:**
- Modify: `src/markets/commodities/data/mockCommoditiesData.js`
- Modify: `src/markets/commodities/data/useCommoditiesData.js`

- [ ] **Step 1: Add mock exports for new data fields**

Append these exports to the end of `mockCommoditiesData.js` (after the existing `cotData` export at line ~107):

```js
// --- New enrichment data (mock) ---

const MOCK_DATES_DAILY = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-01-02');
  d.setDate(d.getDate() + i);
  return d.toISOString().split('T')[0];
});

const MOCK_DATES_MONTHLY = [
  '2023-07','2023-08','2023-09','2023-10','2023-11','2023-12',
  '2024-01','2024-02','2024-03','2024-04','2024-05','2024-06',
  '2024-07','2024-08','2024-09','2024-10','2024-11','2024-12',
  '2025-01','2025-02','2025-03','2025-04','2025-05','2025-06',
  '2025-07','2025-08','2025-09','2025-10','2025-11','2025-12',
  '2026-01','2026-02','2026-03',
];

export const fredCommodities = {
  wtiHistory: {
    dates: MOCK_DATES_DAILY,
    values: MOCK_DATES_DAILY.map((_, i) => 78 + Math.sin(i / 8) * 6 + Math.random() * 2),
  },
  goldHistory: {
    dates: MOCK_DATES_DAILY,
    values: MOCK_DATES_DAILY.map((_, i) => 2100 + i * 3.5 + Math.sin(i / 5) * 40),
  },
  brentHistory: {
    dates: MOCK_DATES_DAILY,
    values: MOCK_DATES_DAILY.map((_, i) => 82 + Math.sin(i / 8) * 5 + Math.random() * 2),
  },
  natGasHistory: {
    dates: MOCK_DATES_DAILY,
    values: MOCK_DATES_DAILY.map((_, i) => 1.8 + Math.sin(i / 10) * 0.4 + Math.random() * 0.1),
  },
  ppiCommodity: {
    dates: MOCK_DATES_MONTHLY,
    values: [248.1,249.3,250.8,251.2,252.4,253.1,254.8,255.2,256.1,257.3,258.4,259.2,260.1,261.4,262.8,263.1,264.2,265.4,266.1,267.3,268.8,269.4,270.1,271.2,272.4,273.1,274.2,275.4,276.1,277.3,278.4,279.2,280.1],
  },
  dollarIndex: {
    dates: MOCK_DATES_DAILY,
    values: MOCK_DATES_DAILY.map((_, i) => 104 - Math.sin(i / 12) * 3 + Math.random()),
  },
  gasRetail: 3.421,
};

export const goldFuturesCurve = {
  labels: ["Jun '26", "Aug '26", "Oct '26", "Dec '26", "Feb '27", "Apr '27", "Jun '27", "Aug '27"],
  prices: [2314.0, 2328.5, 2342.8, 2356.1, 2370.4, 2384.2, 2398.1, 2412.5],
  commodity: 'Gold',
  unit: '$/oz',
  spotPrice: 2314.0,
};

export const dbcEtf = {
  price: 22.84,
  changePct: -0.32,
  ytd: -4.2,
  history: {
    dates: MOCK_DATES_DAILY,
    closes: MOCK_DATES_DAILY.map((_, i) => 23.8 - i * 0.02 + Math.sin(i / 7) * 0.4),
  },
};
```

- [ ] **Step 2: Update the hook to import + manage new state**

Replace the entire contents of `useCommoditiesData.js` with:

```js
// src/markets/commodities/data/useCommoditiesData.js
import { useState, useEffect } from 'react';
import {
  priceDashboardData  as mockPriceDashboardData,
  futuresCurveData    as mockFuturesCurveData,
  sectorHeatmapData   as mockSectorHeatmapData,
  supplyDemandData    as mockSupplyDemandData,
  cotData             as mockCotData,
  fredCommodities     as mockFredCommodities,
  goldFuturesCurve    as mockGoldFuturesCurve,
  dbcEtf              as mockDbcEtf,
} from './mockCommoditiesData';

const SERVER = '';

export function useCommoditiesData() {
  const [priceDashboardData,  setPriceDashboardData]  = useState(mockPriceDashboardData);
  const [futuresCurveData,    setFuturesCurveData]    = useState(mockFuturesCurveData);
  const [sectorHeatmapData,   setSectorHeatmapData]   = useState(mockSectorHeatmapData);
  const [supplyDemandData,    setSupplyDemandData]    = useState(mockSupplyDemandData);
  const [cotData,             setCotData]             = useState(mockCotData);
  const [fredCommodities,     setFredCommodities]     = useState(mockFredCommodities);
  const [goldFuturesCurve,    setGoldFuturesCurve]    = useState(mockGoldFuturesCurve);
  const [dbcEtf,              setDbcEtf]              = useState(mockDbcEtf);
  const [isLive,              setIsLive]              = useState(false);
  const [lastUpdated,         setLastUpdated]         = useState('Mock data — Dec 2025');
  const [isLoading,           setIsLoading]           = useState(true);
  const [fetchedOn,           setFetchedOn]           = useState(null);
  const [isCurrent,           setIsCurrent]           = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    fetch(`${SERVER}/api/commodities`, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.priceDashboardData?.length >= 3)              { setPriceDashboardData(data.priceDashboardData); anyReplaced = true; }
        if (data.futuresCurveData?.prices?.length >= 4)        { setFuturesCurveData(data.futuresCurveData); anyReplaced = true; }
        if (data.sectorHeatmapData?.commodities?.length >= 4)  { setSectorHeatmapData(data.sectorHeatmapData); anyReplaced = true; }
        if (data.supplyDemandData?.crudeStocks?.periods?.length){ setSupplyDemandData(data.supplyDemandData); anyReplaced = true; }
        if (data.cotData?.commodities?.length >= 2)            { setCotData(data.cotData); anyReplaced = true; }
        if (data.fredCommodities?.wtiHistory?.dates?.length >= 10) { setFredCommodities(data.fredCommodities); anyReplaced = true; }
        if (data.goldFuturesCurve?.prices?.length >= 3)        { setGoldFuturesCurve(data.goldFuturesCurve); anyReplaced = true; }
        if (data.dbcEtf?.price)                                { setDbcEtf(data.dbcEtf); anyReplaced = true; }
        if (anyReplaced) setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, []);

  return {
    priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
    fredCommodities, goldFuturesCurve, dbcEtf,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  };
}
```

- [ ] **Step 3: Verify app builds**

Run: `npm run build`
Expected: Build succeeds. No import errors.

- [ ] **Step 4: Commit**

```bash
git add src/markets/commodities/data/mockCommoditiesData.js src/markets/commodities/data/useCommoditiesData.js
git commit -m "feat(commodities): add mock data + hook state for FRED histories, Gold futures, DBC ETF"
```

---

### Task 3: CSS — Add Dense-Layout Styles

**Files:**
- Modify: `src/markets/commodities/components/CommodComponents.css`

- [ ] **Step 1: Add KPI strip, layout grid, and chart panel styles**

Append to the end of `CommodComponents.css` (after the existing COT styles at line ~136):

```css
/* ── Shared dense-dashboard layout ──────────── */
.com-kpi-strip {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.com-kpi-pill {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  min-width: 120px;
}
.com-kpi-label {
  font-size: 9px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.com-kpi-value {
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', 'Cascadia Code', monospace;
  color: var(--text-primary);
}
.com-kpi-value.positive { color: #22c55e; }
.com-kpi-value.negative { color: #ef4444; }
.com-kpi-sub {
  font-size: 9px;
  color: var(--text-dim);
}

.com-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.com-wide-narrow {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.com-three-col {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.com-chart-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.com-chart-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
  flex-shrink: 0;
}
.com-mini-chart {
  flex: 1;
  min-height: 0;
}

/* Sector performance bars (Heatmap enrichment) */
.com-sector-bars { display: flex; flex-direction: column; gap: 6px; }
.com-sector-bar-row { display: flex; align-items: center; gap: 8px; }
.com-sector-bar-name { font-size: 11px; color: var(--text-secondary); width: 80px; flex-shrink: 0; text-align: right; }
.com-sector-bar-wrap { flex: 1; height: 14px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; position: relative; }
.com-sector-bar-fill { height: 100%; border-radius: 3px; position: absolute; top: 0; }
.com-sector-bar-center { position: absolute; top: 0; left: 50%; width: 1px; height: 100%; background: var(--text-dim); }
.com-sector-bar-val { font-size: 11px; font-weight: 600; width: 55px; text-align: right; }
.com-sector-bar-val.positive { color: #22c55e; }
.com-sector-bar-val.negative { color: #ef4444; }
```

- [ ] **Step 2: Verify no CSS syntax errors**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/markets/commodities/components/CommodComponents.css
git commit -m "feat(commodities): add dense-layout CSS — KPI strip, grid layouts, chart panels, sector bars"
```

---

### Task 4: CommoditiesMarket Shell — Pass New Props

**Files:**
- Modify: `src/markets/commodities/CommoditiesMarket.jsx`

- [ ] **Step 1: Update destructuring and pass new props to sub-tab components**

Replace the entire `CommoditiesMarket.jsx` with:

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
  const {
    priceDashboardData, futuresCurveData, sectorHeatmapData, supplyDemandData, cotData,
    fredCommodities, goldFuturesCurve, dbcEtf,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useCommoditiesData();

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
          {isLive ? '● Live · Yahoo Finance / EIA / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="com-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="com-content">
        {activeTab === 'price-dashboard' && <PriceDashboard priceDashboardData={priceDashboardData} dbcEtf={dbcEtf} fredCommodities={fredCommodities} />}
        {activeTab === 'futures-curve'   && <FuturesCurve   futuresCurveData={futuresCurveData} goldFuturesCurve={goldFuturesCurve} fredCommodities={fredCommodities} />}
        {activeTab === 'sector-heatmap'  && <SectorHeatmap  sectorHeatmapData={sectorHeatmapData} fredCommodities={fredCommodities} />}
        {activeTab === 'supply-demand'   && <SupplyDemand   supplyDemandData={supplyDemandData} fredCommodities={fredCommodities} />}
        {activeTab === 'cot'             && <CotPositioning cotData={cotData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds. The new props (`dbcEtf`, `fredCommodities`, `goldFuturesCurve`) are passed but not yet consumed by the components — that's fine, React ignores unused props.

- [ ] **Step 3: Commit**

```bash
git add src/markets/commodities/CommoditiesMarket.jsx
git commit -m "feat(commodities): pass new data props (FRED, Gold futures, DBC) to sub-tab components"
```

---

### Task 5: PriceDashboard Enrichment — KPI Strip + DBC Chart + WTI/Brent Overlay

**Files:**
- Modify: `src/markets/commodities/components/PriceDashboard.jsx`

- [ ] **Step 1: Rewrite PriceDashboard with dense layout**

Replace the entire `PriceDashboard.jsx` with:

```jsx
// src/markets/commodities/components/PriceDashboard.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
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

const SECTOR_ICONS = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾', Livestock: '🐄' };

export default function PriceDashboard({ priceDashboardData, dbcEtf, fredCommodities }) {
  const { colors } = useTheme();

  // KPI computations
  const allCommodities = priceDashboardData.flatMap(s => s.commodities);
  const wti  = allCommodities.find(c => c.ticker === 'CL=F');
  const gold = allCommodities.find(c => c.ticker === 'GC=F');
  const best1m = allCommodities.reduce((best, c) => (c.change1m != null && (best == null || c.change1m > best.change1m) ? c : best), null);

  // DBC 1yr line chart option
  const dbcOption = dbcEtf?.history?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    grid: { top: 8, right: 8, bottom: 24, left: 40, containLabel: false },
    xAxis: {
      type: 'category',
      data: dbcEtf.history.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(dbcEtf.history.dates.length / 5) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
    },
    series: [{
      type: 'line',
      data: dbcEtf.history.closes,
      smooth: true,
      symbol: 'none',
      itemStyle: { color: '#ca8a04' },
      lineStyle: { color: '#ca8a04', width: 2 },
      areaStyle: { color: 'rgba(202,138,4,0.08)' },
    }],
  } : null;

  // WTI vs Brent overlay option
  const wtiH = fredCommodities?.wtiHistory;
  const brentH = fredCommodities?.brentHistory;
  const overlayOption = wtiH?.dates?.length >= 10 && brentH?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: ['WTI', 'Brent'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 8, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: wtiH.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(wtiH.dates.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
    },
    series: [
      { name: 'WTI', type: 'line', data: wtiH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ca8a04' }, itemStyle: { color: '#ca8a04' } },
      { name: 'Brent', type: 'line', data: brentH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#60a5fa' }, itemStyle: { color: '#60a5fa' } },
    ],
  } : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Price Dashboard</span>
        <span className="com-panel-subtitle">Live commodity prices · Updated on load</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        <div className="com-kpi-pill">
          <span className="com-kpi-label">WTI Crude</span>
          <span className="com-kpi-value">${wti?.price?.toFixed(2) ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(wti?.change1d)}`}>{fmtPct(wti?.change1d)} today</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold</span>
          <span className="com-kpi-value">${gold?.price?.toLocaleString() ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(gold?.change1d)}`}>{fmtPct(gold?.change1d)} today</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">DBC Index</span>
          <span className="com-kpi-value">${dbcEtf?.price?.toFixed(2) ?? '—'}</span>
          <span className={`com-kpi-sub ${pctClass(dbcEtf?.ytd)}`}>YTD {dbcEtf?.ytd != null ? `${dbcEtf.ytd > 0 ? '+' : ''}${dbcEtf.ytd.toFixed(1)}%` : '—'}</span>
        </div>
        {best1m && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Best 1M Performer</span>
            <span className="com-kpi-value" style={{ color: '#ca8a04' }}>{best1m.name}</span>
            <span className="com-kpi-sub com-up">{fmtPct(best1m.change1m)}</span>
          </div>
        )}
      </div>

      {/* Main content: table (wide) + DBC chart (narrow) */}
      <div className="com-wide-narrow" style={{ marginBottom: 12 }}>
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
        {dbcOption && (
          <div className="com-chart-panel">
            <div className="com-chart-title">DBC Commodity ETF — 1 Year</div>
            <div className="com-mini-chart">
              <ReactECharts option={dbcOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom chart: WTI vs Brent */}
      {overlayOption && (
        <div className="com-chart-panel" style={{ height: 180, flexShrink: 0 }}>
          <div className="com-chart-title">WTI vs Brent Crude — 1 Year (FRED daily)</div>
          <div className="com-mini-chart">
            <ReactECharts option={overlayOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">Prices: Yahoo Finance futures · History: FRED DCOILWTICO/DCOILBRENTEU · DBC: Invesco DB Commodity Index</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build + visual check**

Run: `npm run build`
Expected: Build succeeds. Start dev server with `npm run dev` and open Commodities → Price Dashboard. Should show KPI strip, table (left) + DBC chart (right), and WTI/Brent overlay at bottom.

- [ ] **Step 3: Commit**

```bash
git add src/markets/commodities/components/PriceDashboard.jsx
git commit -m "feat(commodities): PriceDashboard dense layout — KPI strip, DBC chart, WTI/Brent overlay"
```

---

### Task 6: FuturesCurve Enrichment — KPI Strip + Gold Curve + Dollar/WTI Overlay

**Files:**
- Modify: `src/markets/commodities/components/FuturesCurve.jsx`

- [ ] **Step 1: Rewrite FuturesCurve with side-by-side WTI + Gold + overlay**

Replace the entire `FuturesCurve.jsx` with:

```jsx
// src/markets/commodities/components/FuturesCurve.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CommodComponents.css';

function buildCurveOption(labels, prices, accentColor, unit, colors) {
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        return `${p.name}<br/><span style="color:${accentColor}">$${p.value.toFixed(2)}</span>`;
      },
    },
    grid: { top: 12, right: 16, bottom: 32, left: 52, containLabel: false },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 10, formatter: v => `$${v}` },
    },
    series: [{
      type: 'line',
      data: prices,
      smooth: false,
      symbol: 'circle',
      symbolSize: 6,
      itemStyle: { color: accentColor },
      lineStyle: { color: accentColor, width: 2 },
    }],
  };
}

function spreadPct(prices) {
  if (!prices || prices.length < 2) return null;
  return Math.round((prices[prices.length - 1] / prices[0] - 1) * 1000) / 10;
}

function structureLabel(spread) {
  if (spread == null) return '';
  return spread > 0 ? 'Contango' : spread < 0 ? 'Backwardation' : 'Flat';
}

export default function FuturesCurve({ futuresCurveData, goldFuturesCurve, fredCommodities }) {
  const { colors } = useTheme();
  const wti = futuresCurveData || {};
  const gold = goldFuturesCurve || {};

  const wtiSpread  = spreadPct(wti.prices);
  const goldSpread = spreadPct(gold.prices);

  const wtiOption  = wti.labels?.length >= 2  ? buildCurveOption(wti.labels, wti.prices, '#ca8a04', wti.unit, colors) : null;
  const goldOption = gold.labels?.length >= 2 ? buildCurveOption(gold.labels, gold.prices, '#f59e0b', gold.unit, colors) : null;

  // Dollar Index vs WTI overlay (dual Y-axis)
  const dollarH = fredCommodities?.dollarIndex;
  const wtiH    = fredCommodities?.wtiHistory;
  const dualOption = dollarH?.dates?.length >= 10 && wtiH?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: ['WTI ($/bbl)', 'Dollar Index'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 48, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: wtiH.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(wtiH.dates.length / 6) },
    },
    yAxis: [
      {
        type: 'value',
        position: 'left',
        axisLine: { show: false },
        splitLine: { lineStyle: { color: colors.cardBg } },
        axisLabel: { color: '#ca8a04', fontSize: 9, formatter: v => `$${v}` },
      },
      {
        type: 'value',
        position: 'right',
        axisLine: { show: false },
        splitLine: { show: false },
        axisLabel: { color: '#60a5fa', fontSize: 9 },
      },
    ],
    series: [
      { name: 'WTI ($/bbl)', type: 'line', yAxisIndex: 0, data: wtiH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ca8a04' }, itemStyle: { color: '#ca8a04' } },
      { name: 'Dollar Index', type: 'line', yAxisIndex: 1, data: dollarH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#60a5fa' }, itemStyle: { color: '#60a5fa' } },
    ],
  } : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Futures Curves</span>
        <span className="com-panel-subtitle">Forward contract pricing — term structure</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        <div className="com-kpi-pill">
          <span className="com-kpi-label">WTI Spot</span>
          <span className="com-kpi-value">${wti.spotPrice?.toFixed(2) ?? '—'}</span>
          <span className="com-kpi-sub">{structureLabel(wtiSpread)} {wtiSpread != null ? `(${wtiSpread > 0 ? '+' : ''}${wtiSpread.toFixed(1)}%)` : ''}</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold Spot</span>
          <span className="com-kpi-value">${gold.spotPrice?.toLocaleString() ?? '—'}</span>
          <span className="com-kpi-sub">{structureLabel(goldSpread)} {goldSpread != null ? `(${goldSpread > 0 ? '+' : ''}${goldSpread.toFixed(1)}%)` : ''}</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">WTI Contracts</span>
          <span className="com-kpi-value">{wti.labels?.length ?? 0}</span>
          <span className="com-kpi-sub">months forward</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold Contracts</span>
          <span className="com-kpi-value">{gold.labels?.length ?? 0}</span>
          <span className="com-kpi-sub">months forward</span>
        </div>
      </div>

      {/* Two curves side by side */}
      <div className="com-two-col" style={{ marginBottom: 12 }}>
        {wtiOption && (
          <div className="com-chart-panel">
            <div className="com-chart-title">WTI Crude Oil — {wti.labels?.length} Months ({wti.unit})</div>
            <div className="com-mini-chart">
              <ReactECharts option={wtiOption} style={{ height: '100%', width: '100%' }} />
            </div>
            {wtiSpread != null && (
              <span className={`com-curve-pill ${wtiSpread > 0 ? 'com-contango' : 'com-backwardation'}`} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                {wtiSpread > 0 ? '▲ Contango' : '▼ Backwardation'} · {Math.abs(wtiSpread).toFixed(1)}%
              </span>
            )}
          </div>
        )}
        {goldOption && (
          <div className="com-chart-panel">
            <div className="com-chart-title">Gold — {gold.labels?.length} Months ({gold.unit})</div>
            <div className="com-mini-chart">
              <ReactECharts option={goldOption} style={{ height: '100%', width: '100%' }} />
            </div>
            {goldSpread != null && (
              <span className={`com-curve-pill ${goldSpread > 0 ? 'com-contango' : 'com-backwardation'}`} style={{ marginTop: 4, alignSelf: 'flex-start' }}>
                {goldSpread > 0 ? '▲ Contango' : '▼ Backwardation'} · {Math.abs(goldSpread).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dollar vs WTI overlay */}
      {dualOption && (
        <div className="com-chart-panel" style={{ height: 170, flexShrink: 0 }}>
          <div className="com-chart-title">Dollar Index vs WTI — 1 Year (FRED daily, inverse correlation)</div>
          <div className="com-mini-chart">
            <ReactECharts option={dualOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">Source: CME futures (Yahoo Finance) · FRED DCOILWTICO / DTWEXBGS</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/markets/commodities/components/FuturesCurve.jsx
git commit -m "feat(commodities): FuturesCurve dense layout — KPI strip, Gold curve, Dollar/WTI overlay"
```

---

### Task 7: SectorHeatmap Enrichment — KPI Strip + Sector Bars + PPI Chart

**Files:**
- Modify: `src/markets/commodities/components/SectorHeatmap.jsx`

- [ ] **Step 1: Rewrite SectorHeatmap with dense layout**

Replace the entire `SectorHeatmap.jsx` with:

```jsx
// src/markets/commodities/components/SectorHeatmap.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
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

const SECTORS_ORDER = ['Energy', 'Metals', 'Agriculture', 'Livestock'];
const SECTOR_ICONS  = { Energy: '⚡', Metals: '⚙️', Agriculture: '🌾', Livestock: '🐄' };

export default function SectorHeatmap({ sectorHeatmapData, fredCommodities }) {
  const { colors } = useTheme();
  const { commodities = [], columns = [] } = sectorHeatmapData;
  const colKeys = ['d1', 'w1', 'm1'];

  // KPI computations
  const best1d  = commodities.reduce((b, c) => (c.d1 != null && (b == null || c.d1 > b.d1) ? c : b), null);
  const worst1d = commodities.reduce((w, c) => (c.d1 != null && (w == null || c.d1 < w.d1) ? c : w), null);
  const ppi = fredCommodities?.ppiCommodity;
  const ppiYoy = ppi?.values?.length >= 13
    ? Math.round((ppi.values[ppi.values.length - 1] / ppi.values[ppi.values.length - 13] - 1) * 1000) / 10
    : null;

  // Sector avg 1d% for bars
  const sectorAvgs = SECTORS_ORDER.map(sector => {
    const rows = commodities.filter(c => c.sector === sector);
    if (rows.length === 0) return null;
    const avg = rows.reduce((s, c) => s + (c.d1 || 0), 0) / rows.length;
    return { sector, avg: Math.round(avg * 100) / 100 };
  }).filter(Boolean);
  const maxAbsAvg = Math.max(...sectorAvgs.map(s => Math.abs(s.avg)), 1);

  // PPI chart option
  const ppiOption = ppi?.dates?.length >= 6 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    grid: { top: 8, right: 8, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: ppi.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(ppi.dates.length / 6) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [{
      type: 'line',
      data: ppi.values,
      smooth: true,
      symbol: 'none',
      itemStyle: { color: '#ca8a04' },
      lineStyle: { color: '#ca8a04', width: 2 },
      areaStyle: { color: 'rgba(202,138,4,0.08)' },
    }],
  } : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Sector Performance Heatmap</span>
        <span className="com-panel-subtitle">% change by commodity and time horizon</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        {best1d && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Best Today</span>
            <span className="com-kpi-value" style={{ color: '#ca8a04' }}>{best1d.name}</span>
            <span className="com-kpi-sub com-up">{fmtPct(best1d.d1)}</span>
          </div>
        )}
        {worst1d && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Worst Today</span>
            <span className="com-kpi-value" style={{ color: '#ca8a04' }}>{worst1d.name}</span>
            <span className="com-kpi-sub com-down">{fmtPct(worst1d.d1)}</span>
          </div>
        )}
        <div className="com-kpi-pill">
          <span className="com-kpi-label">PPI Commodity YoY</span>
          <span className={`com-kpi-value ${ppiYoy != null ? (ppiYoy >= 0 ? 'positive' : 'negative') : ''}`}>
            {ppiYoy != null ? `${ppiYoy > 0 ? '+' : ''}${ppiYoy.toFixed(1)}%` : '—'}
          </span>
          <span className="com-kpi-sub">FRED WPUFD49207</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Retail Gas</span>
          <span className="com-kpi-value">${fredCommodities?.gasRetail?.toFixed(3) ?? '—'}</span>
          <span className="com-kpi-sub">US avg $/gal</span>
        </div>
      </div>

      {/* Main: heatmap table (wide) + sector bars (narrow) */}
      <div className="com-wide-narrow" style={{ marginBottom: 12 }}>
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
                if (rows.length === 0) return null;
                return (
                  <React.Fragment key={sector}>
                    <tr className="com-sector-row">
                      <td colSpan={columns.length + 1}>{SECTOR_ICONS[sector] || ''} {sector}</td>
                    </tr>
                    {rows.map(c => (
                      <tr key={c.ticker} className="com-row">
                        <td className="com-cell">{c.name}</td>
                        {colKeys.map(k => (
                          <td key={k} className={`com-cell ${heatClass(c[k])}`} style={{ fontWeight: 500 }}>
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
        <div className="com-chart-panel">
          <div className="com-chart-title">Sector Avg 1d%</div>
          <div className="com-sector-bars" style={{ marginTop: 8 }}>
            {sectorAvgs.map(s => {
              const pct = Math.abs(s.avg) / maxAbsAvg * 50;
              const isPos = s.avg >= 0;
              return (
                <div key={s.sector} className="com-sector-bar-row">
                  <span className="com-sector-bar-name">{s.sector}</span>
                  <div className="com-sector-bar-wrap">
                    <div className="com-sector-bar-center" />
                    <div
                      className="com-sector-bar-fill"
                      style={{
                        width: `${pct}%`,
                        left: isPos ? '50%' : `${50 - pct}%`,
                        background: isPos ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`com-sector-bar-val ${isPos ? 'positive' : 'negative'}`}>
                    {s.avg >= 0 ? '+' : ''}{s.avg.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PPI chart */}
      {ppiOption && (
        <div className="com-chart-panel" style={{ height: 170, flexShrink: 0 }}>
          <div className="com-chart-title">PPI Commodity Index — 3 Year (FRED monthly)</div>
          <div className="com-mini-chart">
            <ReactECharts option={ppiOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">Colors: green = positive returns · red = negative · PPI: FRED WPUFD49207 · Gas: FRED GASREGW</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/markets/commodities/components/SectorHeatmap.jsx
git commit -m "feat(commodities): SectorHeatmap dense layout — KPI strip, sector bars, PPI chart"
```

---

### Task 8: SupplyDemand Enrichment — KPI Strip + Gold Chart + 3-Column Layout

**Files:**
- Modify: `src/markets/commodities/components/SupplyDemand.jsx`

- [ ] **Step 1: Rewrite SupplyDemand with KPI strip + 3-column top row + Gold chart**

Replace the entire `SupplyDemand.jsx` with:

```jsx
// src/markets/commodities/components/SupplyDemand.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CommodComponents.css';

function buildStocksOption(title, periods, values, avg5yr, colors) {
  const avgLine = avg5yr != null ? Array(values.length).fill(avg5yr) : null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: avgLine ? {
      data: [title, '5yr Avg'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    } : undefined,
    grid: { top: avgLine ? 24 : 10, right: 8, bottom: 28, left: 48, containLabel: false },
    xAxis: {
      type: 'category',
      data: periods,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: {
        color: colors.textMuted, fontSize: 9,
        formatter: (v) => v ? v.slice(5) : v,
        interval: Math.floor(periods.length / 6),
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
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
        lineStyle: { color: colors.textDim, width: 1, type: 'dashed' },
      }] : []),
    ],
  };
}

function buildGoldOption(dates, values, colors) {
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>$${params[0].value.toFixed(2)}/oz`,
    },
    grid: { top: 10, right: 8, bottom: 28, left: 52, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(dates.length / 5) },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
    },
    series: [{
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'none',
      itemStyle: { color: '#f59e0b' },
      lineStyle: { color: '#f59e0b', width: 2 },
      areaStyle: { color: 'rgba(245,158,11,0.08)' },
    }],
  };
}

export default function SupplyDemand({ supplyDemandData, fredCommodities }) {
  const { colors } = useTheme();
  if (!supplyDemandData) return null;
  const {
    crudeStocks     = { periods: [], values: [], avg5yr: null },
    natGasStorage   = { periods: [], values: [], avg5yr: null },
    crudeProduction = { periods: [], values: [] },
  } = supplyDemandData;

  // KPI computations
  const crudeLatest = crudeStocks.values.length ? crudeStocks.values[crudeStocks.values.length - 1] : null;
  const crudeDelta  = crudeStocks.avg5yr != null && crudeLatest != null
    ? Math.round((crudeLatest - crudeStocks.avg5yr) * 10) / 10
    : null;
  const gasLatest   = natGasStorage.values.length ? natGasStorage.values[natGasStorage.values.length - 1] : null;
  const gasDelta    = natGasStorage.avg5yr != null && gasLatest != null
    ? Math.round(gasLatest - natGasStorage.avg5yr)
    : null;

  const goldH = fredCommodities?.goldHistory;
  const goldOption = goldH?.dates?.length >= 10 ? buildGoldOption(goldH.dates, goldH.values, colors) : null;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Supply &amp; Demand Monitor</span>
        <span className="com-panel-subtitle">EIA weekly data + FRED gold history</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Crude Stocks</span>
          <span className="com-kpi-value">{crudeLatest != null ? `${crudeLatest.toFixed(1)}M` : '—'}</span>
          <span className={`com-kpi-sub ${crudeDelta != null ? (crudeDelta >= 0 ? 'com-up' : 'com-down') : ''}`}>
            {crudeDelta != null ? `${crudeDelta >= 0 ? '+' : ''}${crudeDelta.toFixed(1)}M vs 5yr avg` : '—'}
          </span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Nat Gas Storage</span>
          <span className="com-kpi-value">{gasLatest != null ? `${gasLatest.toLocaleString()} Bcf` : '—'}</span>
          <span className={`com-kpi-sub ${gasDelta != null ? (gasDelta >= 0 ? 'com-up' : 'com-down') : ''}`}>
            {gasDelta != null ? `${gasDelta >= 0 ? '+' : ''}${gasDelta.toLocaleString()} vs 5yr avg` : '—'}
          </span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Crude Production</span>
          <span className="com-kpi-value">
            {crudeProduction.values.length ? `${crudeProduction.values[crudeProduction.values.length - 1].toFixed(1)}M` : '—'}
          </span>
          <span className="com-kpi-sub">bbl/day</span>
        </div>
        <div className="com-kpi-pill">
          <span className="com-kpi-label">Gold (FRED)</span>
          <span className="com-kpi-value" style={{ color: '#f59e0b' }}>
            {goldH?.values?.length ? `$${goldH.values[goldH.values.length - 1].toLocaleString()}` : '—'}
          </span>
          <span className="com-kpi-sub">London Fix $/oz</span>
        </div>
      </div>

      {/* Three-column top row */}
      <div className="com-three-col" style={{ marginBottom: 12 }}>
        <div className="com-chart-panel">
          <div className="com-chart-title">US Crude Oil Stocks (M bbl)</div>
          <div className="com-mini-chart">
            <ReactECharts
              option={buildStocksOption('Crude Stocks', crudeStocks.periods, crudeStocks.values, crudeStocks.avg5yr, colors)}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        <div className="com-chart-panel">
          <div className="com-chart-title">Natural Gas Storage (Bcf)</div>
          <div className="com-mini-chart">
            <ReactECharts
              option={buildStocksOption('Nat Gas', natGasStorage.periods, natGasStorage.values, natGasStorage.avg5yr, colors)}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        {goldOption ? (
          <div className="com-chart-panel">
            <div className="com-chart-title">Gold Price — 1 Year (FRED)</div>
            <div className="com-mini-chart">
              <ReactECharts option={goldOption} style={{ height: '100%', width: '100%' }} />
            </div>
          </div>
        ) : (
          <div className="com-chart-panel">
            <div className="com-chart-title">Gold Price</div>
            <div className="com-mini-chart" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textDim }}>
              No FRED data available
            </div>
          </div>
        )}
      </div>

      {/* Bottom: crude production full-width */}
      <div className="com-chart-panel" style={{ height: 170, flexShrink: 0 }}>
        <div className="com-chart-title">US Crude Production (M bbl/day) — 52 Weeks</div>
        <div className="com-mini-chart">
          <ReactECharts
            option={buildStocksOption('Production', crudeProduction.periods, crudeProduction.values, null, colors)}
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>

      <div className="com-panel-footer">Source: EIA API v2 · FRED GOLDAMGBD228NLBM · Crude stocks released Wednesdays · Nat gas released Thursdays</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/markets/commodities/components/SupplyDemand.jsx
git commit -m "feat(commodities): SupplyDemand dense layout — KPI strip, Gold chart, 3-column grid"
```

---

### Task 9: CotPositioning Enrichment — KPI Strip + Net Trend Chart

**Files:**
- Modify: `src/markets/commodities/components/CotPositioning.jsx`

- [ ] **Step 1: Rewrite CotPositioning with KPI strip + net trend overlay**

Replace the entire `CotPositioning.jsx` with:

```jsx
// src/markets/commodities/components/CotPositioning.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CommodComponents.css';

function fmtK(v) { return v != null ? `${(v / 1000).toFixed(0)}K` : '—'; }

function buildHistoryOption(history, name, colors) {
  const dates = history.map(h => h.date.slice(5));
  const values = history.map(h => h.noncommNet);
  return {
    animation: false,
    backgroundColor: 'transparent',
    grid: { top: 8, right: 8, bottom: 24, left: 52 },
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>Net: ${fmtK(params[0].value)} contracts`,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.border } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => fmtK(v) },
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

function buildTrendOption(commodities, colors) {
  // Find common dates across all commodities (use the one with most history)
  const primary = commodities.reduce((a, b) => (a.history?.length || 0) >= (b.history?.length || 0) ? a : b);
  const dates = (primary.history || []).map(h => h.date.slice(5));
  const seriesColors = ['#ca8a04', '#f59e0b', '#10b981', '#60a5fa'];
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: commodities.map(c => c.name),
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 8, bottom: 24, left: 52, containLabel: false },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => fmtK(v) },
    },
    series: commodities.map((c, i) => ({
      name: c.name,
      type: 'line',
      data: (c.history || []).map(h => h.noncommNet),
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 2, color: seriesColors[i % seriesColors.length] },
      itemStyle: { color: seriesColors[i % seriesColors.length] },
    })),
  };
}

export default function CotPositioning({ cotData }) {
  const { colors } = useTheme();
  if (!cotData?.commodities?.length) return null;

  const wti  = cotData.commodities.find(c => c.name === 'WTI Crude Oil');
  const gold = cotData.commodities.find(c => c.name === 'Gold');

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">COT Positioning</span>
        <span className="com-panel-subtitle">CFTC Commitments of Traders · speculative vs commercial</span>
      </div>

      {/* KPI Strip */}
      <div className="com-kpi-strip">
        {wti && (
          <>
            <div className="com-kpi-pill">
              <span className="com-kpi-label">WTI Spec Net</span>
              <span className={`com-kpi-value ${wti.latest.noncommNet >= 0 ? 'positive' : 'negative'}`}>
                {fmtK(wti.latest.noncommNet)}
              </span>
              <span className={`com-kpi-sub ${wti.latest.netChange >= 0 ? 'com-up' : 'com-down'}`}>
                {wti.latest.netChange >= 0 ? '+' : ''}{fmtK(wti.latest.netChange)} wk
              </span>
            </div>
          </>
        )}
        {gold && (
          <>
            <div className="com-kpi-pill">
              <span className="com-kpi-label">Gold Spec Net</span>
              <span className={`com-kpi-value ${gold.latest.noncommNet >= 0 ? 'positive' : 'negative'}`}>
                {fmtK(gold.latest.noncommNet)}
              </span>
              <span className={`com-kpi-sub ${gold.latest.netChange >= 0 ? 'com-up' : 'com-down'}`}>
                {gold.latest.netChange >= 0 ? '+' : ''}{fmtK(gold.latest.netChange)} wk
              </span>
            </div>
          </>
        )}
        {wti && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">WTI Open Interest</span>
            <span className="com-kpi-value">{fmtK(wti.latest.totalOI)}</span>
            <span className="com-kpi-sub">total contracts</span>
          </div>
        )}
        {gold && (
          <div className="com-kpi-pill">
            <span className="com-kpi-label">Gold Open Interest</span>
            <span className="com-kpi-value">{fmtK(gold.latest.totalOI)}</span>
            <span className="com-kpi-sub">total contracts</span>
          </div>
        )}
      </div>

      {/* Existing commodity panels */}
      <div className="cot-grid" style={{ marginBottom: 12 }}>
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
                <span className="com-kpi-label">Wk Change</span>
                <span className={`cot-metric-value ${c.latest.netChange >= 0 ? 'green' : 'red'}`}>
                  {c.latest.netChange >= 0 ? '+' : ''}{fmtK(c.latest.netChange)}
                </span>
              </div>
            </div>
            {c.history?.length > 2 && (
              <div style={{ height: 140 }}>
                <ReactECharts option={buildHistoryOption(c.history, c.name, colors)} style={{ height: '100%', width: '100%' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Net positioning trend overlay */}
      {cotData.commodities.length >= 2 && cotData.commodities[0].history?.length > 2 && (
        <div className="com-chart-panel" style={{ height: 170, flexShrink: 0 }}>
          <div className="com-chart-title">Net Speculative Positioning — 12 Week Trend</div>
          <div className="com-mini-chart">
            <ReactECharts option={buildTrendOption(cotData.commodities, colors)} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="com-panel-footer">
        CFTC Commitments of Traders · Weekly · Non-commercial = speculative positioning
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/markets/commodities/components/CotPositioning.jsx
git commit -m "feat(commodities): CotPositioning dense layout — KPI strip, net positioning trend chart"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Server: expanded COMMODITY_META (6 new tickers), FRED fetches, Gold futures, DBC ETF — Task 1
- ✅ Mock data + hook — Task 2
- ✅ CSS dense-layout styles — Task 3
- ✅ Market shell props — Task 4
- ✅ PriceDashboard: KPI strip, DBC chart, WTI/Brent overlay — Task 5
- ✅ FuturesCurve: KPI strip, Gold curve, Dollar/WTI overlay — Task 6
- ✅ SectorHeatmap: KPI strip, sector bars, PPI chart — Task 7
- ✅ SupplyDemand: KPI strip, Gold chart, 3-col layout — Task 8
- ✅ CotPositioning: KPI strip, net trend chart — Task 9

**Placeholder scan:** No TBD/TODO/placeholder content found.

**Type consistency:**
- `fredCommodities` shape consistent across Tasks 1→2→5→6→7→8
- `goldFuturesCurve` shape consistent across Tasks 1→2→6
- `dbcEtf` shape consistent across Tasks 1→2→5
- `priceDashboardData` includes Livestock sector via COMM_SECTORS_ORDER update — SectorHeatmap also updated to include 'Livestock' in SECTORS_ORDER
- All `colors` references use `useTheme()` pattern — no shadowing issues
