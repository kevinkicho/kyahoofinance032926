# Real Estate Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform every Real Estate sub-tab from sparse single-chart views into dense "one-glimpse-get-all" dashboards with KPI strips, multiple panels, and new FRED/Yahoo data.

**Architecture:** Server adds 13 new FRED series + VNQ/XLRE Yahoo tickers to `/api/realEstate` via `Promise.allSettled`. Mock data provides fallback. Each sub-tab component is enriched independently with KPI strips, secondary charts, and detail panels. No new files created — all changes go into existing component files.

**Tech Stack:** React 18, ECharts (echarts-for-react), FRED API, Yahoo Finance (yahoo-finance2), CSS custom properties

---

## Shared Layout CSS Classes

These classes are used across all enriched sub-tabs and defined once in `REComponents.css`:

```css
/* Shared dense-layout classes used by all enriched sub-tabs */
.re-kpi-strip {
  display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; flex-shrink: 0;
}
.re-kpi-pill {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: 6px; padding: 6px 12px; display: flex; flex-direction: column; min-width: 120px;
}
.re-kpi-label { font-size: 9px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.re-kpi-value { font-size: 16px; font-weight: 700; font-family: monospace; color: var(--text-primary); }
.re-kpi-sub { font-size: 9px; color: var(--text-dim); }
.re-two-col {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1; min-height: 0;
}
.re-three-col {
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; flex: 1; min-height: 0;
}
.re-chart-panel {
  background: var(--bg-card); border: 1px solid var(--border-subtle);
  border-radius: 6px; padding: 8px; display: flex; flex-direction: column; overflow: hidden;
}
.re-chart-title {
  font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 4px; flex-shrink: 0;
}
.re-mini-chart { flex: 1; min-height: 0; }
```

---

### Task 1: Server — Add New FRED Series + Yahoo ETF to /api/realEstate

**Files:**
- Modify: `server/index.js` (inside the `/api/realEstate` handler, after existing section 5 "Cap rates")

This task adds 6 new data sections to the response object. All calls use existing `fetchFredHistory` (returns `[{date, value}]` sorted asc) and `fetchFredLatest` (returns a number or null) helpers, plus `yf.quote` and `yf.chart` for VNQ.

- [ ] **Step 1: Add Case-Shiller + supply + rent + homeownership + VNQ fetches**

Insert after the existing section 5 (cap rates, ~line 961) and before the `const result = {` line (~line 963):

```js
    // 6. Case-Shiller metro price indices
    let caseShillerData = null;
    if (FRED_API_KEY) {
      try {
        const csMetros = {
          national:       'CSUSHPISA',
          'San Francisco':'SFXRSA',
          'New York':     'NYXRSA',
          'Los Angeles':  'LXXRSA',
          'Miami':        'MIXRSA',
          'Chicago':      'CHXRSA',
        };
        const csResults = await Promise.allSettled(
          Object.entries(csMetros).map(async ([name, sid]) => {
            const hist = await fetchFredHistory(sid, 60);
            return [name, hist];
          })
        );
        const natHist = csResults[0]?.status === 'fulfilled' ? csResults[0].value[1] : [];
        const metros = {};
        csResults.slice(1).forEach(r => {
          if (r.status === 'fulfilled' && r.value[1].length >= 2) {
            const pts = r.value[1];
            const latest = pts[pts.length - 1].value;
            const yr = pts.length >= 13 ? pts[pts.length - 13].value : pts[0].value;
            metros[r.value[0]] = {
              latest: Math.round(latest * 10) / 10,
              yoy: Math.round((latest / yr - 1) * 1000) / 10,
            };
          }
        });
        if (natHist.length >= 12) {
          caseShillerData = {
            national: {
              dates: natHist.map(p => p.date.slice(0, 7)),
              values: natHist.map(p => Math.round(p.value * 10) / 10),
            },
            metros,
          };
        }
      } catch { /* use null */ }
    }

    // 7. Housing supply indicators
    let supplyData = null;
    if (FRED_API_KEY) {
      try {
        const [startsHist, permitsHist, monthsSupplyVal, listingsVal] = await Promise.all([
          fetchFredHistory('HOUST', 36).catch(() => []),
          fetchFredHistory('PERMIT', 36).catch(() => []),
          fetchFredLatest('MSACSR').catch(() => null),
          fetchFredLatest('ACTLISCOUUS').catch(() => null),
        ]);
        if (startsHist.length >= 6 || permitsHist.length >= 6) {
          supplyData = {
            housingStarts: { dates: startsHist.map(p => p.date.slice(0, 7)), values: startsHist.map(p => Math.round(p.value)) },
            permits:       { dates: permitsHist.map(p => p.date.slice(0, 7)), values: permitsHist.map(p => Math.round(p.value)) },
            monthsSupply:  monthsSupplyVal != null ? Math.round(monthsSupplyVal * 10) / 10 : null,
            activeListings: listingsVal != null ? Math.round(listingsVal) : null,
          };
        }
      } catch { /* use null */ }
    }

    // 8. Homeownership rate + Rent CPI
    let homeownershipRate = null;
    let rentCpi = null;
    if (FRED_API_KEY) {
      try {
        const [hoRate, rentHist] = await Promise.all([
          fetchFredLatest('RHORUSQ156N').catch(() => null),
          fetchFredHistory('CUSR0000SEHA', 36).catch(() => []),
        ]);
        homeownershipRate = hoRate != null ? Math.round(hoRate * 10) / 10 : null;
        if (rentHist.length >= 6) {
          rentCpi = {
            dates: rentHist.map(p => p.date.slice(0, 7)),
            values: rentHist.map(p => Math.round(p.value * 10) / 10),
          };
        }
      } catch { /* use null */ }
    }

    // 9. REIT ETF (VNQ) price + 1yr history
    let reitEtf = null;
    try {
      const vnqQuote = await yf.quote(['VNQ']);
      const vnqArr = Array.isArray(vnqQuote) ? vnqQuote : [vnqQuote];
      const vq = vnqArr.find(q => q?.symbol === 'VNQ');
      if (vq?.regularMarketPrice) {
        const histStart = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d.toISOString().split('T')[0]; })();
        const histEnd = new Date().toISOString().split('T')[0];
        let vnqHistory = null;
        try {
          const chart = await yf.chart('VNQ', { period1: histStart, period2: histEnd, interval: '1d' });
          const quotes = (chart.quotes || []).filter(q => q.close != null);
          if (quotes.length >= 20) {
            vnqHistory = {
              dates: quotes.map(q => q.date.toISOString().split('T')[0]),
              closes: quotes.map(q => Math.round(q.close * 100) / 100),
            };
          }
        } catch { /* no history */ }
        reitEtf = {
          price: Math.round(vq.regularMarketPrice * 100) / 100,
          changePct: Math.round((vq.regularMarketChangePercent ?? 0) * 100) / 100,
          ytd: vq.ytdReturn != null ? Math.round(vq.ytdReturn * 1000) / 10 : null,
          history: vnqHistory,
        };
      }
    } catch { /* use null */ }

    // 10. 10Y Treasury for cap rate spread
    let treasury10y = null;
    if (FRED_API_KEY) {
      try { treasury10y = await fetchFredLatest('DGS10'); } catch { /* null */ }
    }
```

Then update the `result` object:

```js
    const result = { reitData, priceIndexData, mortgageRates, affordabilityData, capRateData, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, lastUpdated: today };
```

- [ ] **Step 2: Run the server locally and test the endpoint**

Run: `cd server && node index.js`
Then: `curl http://localhost:3001/api/realEstate | jq 'keys'`
Expected: Response includes `caseShillerData`, `supplyData`, `homeownershipRate`, `rentCpi`, `reitEtf`, `treasury10y` alongside existing fields.

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(realEstate): add Case-Shiller, supply, rent CPI, VNQ, treasury to /api/realEstate"
```

---

### Task 2: Mock Data + Hook — Wire New Fields

**Files:**
- Modify: `src/markets/realEstate/data/mockRealEstateData.js`
- Modify: `src/markets/realEstate/data/useRealEstateData.js`

- [ ] **Step 1: Add mock exports for all new fields**

Append to the end of `src/markets/realEstate/data/mockRealEstateData.js`:

```js
export const caseShillerData = {
  national: {
    dates: ['2020-01','2020-04','2020-07','2020-10','2021-01','2021-04','2021-07','2021-10','2022-01','2022-04','2022-07','2022-10','2023-01','2023-04','2023-07','2023-10','2024-01','2024-04','2024-07','2024-10'],
    values: [218.5,221.3,228.1,237.0,248.2,260.4,272.1,278.5,285.0,293.4,296.8,291.2,285.4,290.1,296.8,300.5,305.2,312.8,318.4,322.1],
  },
  metros: {
    'San Francisco': { latest: 320.5, yoy: 4.2 },
    'New York':      { latest: 285.1, yoy: 3.1 },
    'Los Angeles':   { latest: 370.2, yoy: 5.8 },
    'Miami':         { latest: 410.3, yoy: 8.1 },
    'Chicago':       { latest: 190.4, yoy: 2.5 },
  },
};

export const supplyData = {
  housingStarts: {
    dates: ['2022-01','2022-04','2022-07','2022-10','2023-01','2023-04','2023-07','2023-10','2024-01','2024-04','2024-07','2024-10'],
    values: [1638,1724,1552,1434,1321,1420,1452,1410,1380,1420,1460,1420],
  },
  permits: {
    dates: ['2022-01','2022-04','2022-07','2022-10','2023-01','2023-04','2023-07','2023-10','2024-01','2024-04','2024-07','2024-10'],
    values: [1899,1695,1528,1512,1339,1491,1541,1460,1489,1440,1396,1380],
  },
  monthsSupply: 4.2,
  activeListings: 1120000,
};

export const homeownershipRate = 65.6;

export const rentCpi = {
  dates: ['2022-01','2022-04','2022-07','2022-10','2023-01','2023-04','2023-07','2023-10','2024-01','2024-04','2024-07','2024-10'],
  values: [359.8,366.2,373.1,379.8,386.5,392.1,397.4,402.1,406.8,410.2,413.5,416.8],
};

export const reitEtf = {
  price: 82.45,
  changePct: -0.32,
  ytd: 3.8,
  history: {
    dates: Array.from({ length: 20 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (20 - i) * 7); return d.toISOString().split('T')[0]; }),
    closes: [78.2,79.5,80.1,81.3,79.8,78.5,80.2,81.8,82.5,83.1,81.4,80.2,79.8,81.5,82.3,83.0,81.8,82.1,82.8,82.45],
  },
};

export const treasury10y = 4.35;
```

- [ ] **Step 2: Update the hook to wire new fields**

Replace `src/markets/realEstate/data/useRealEstateData.js` with:

```js
import { useState, useEffect } from 'react';
import {
  priceIndexData     as mockPriceIndexData,
  reitData           as mockReitData,
  affordabilityData  as mockAffordabilityData,
  capRateData        as mockCapRateData,
  caseShillerData    as mockCaseShillerData,
  supplyData         as mockSupplyData,
  homeownershipRate  as mockHomeownershipRate,
  rentCpi            as mockRentCpi,
  reitEtf            as mockReitEtf,
  treasury10y        as mockTreasury10y,
} from './mockRealEstateData';

const SERVER = '';

export function useRealEstateData() {
  const [priceIndexData,    setPriceIndexData]    = useState(mockPriceIndexData);
  const [reitData,          setReitData]          = useState(mockReitData);
  const [affordabilityData, setAffordabilityData] = useState(mockAffordabilityData);
  const [capRateData,       setCapRateData]       = useState(mockCapRateData);
  const [mortgageRates,     setMortgageRates]     = useState(null);
  const [caseShillerData,   setCaseShillerData]   = useState(mockCaseShillerData);
  const [supplyData,        setSupplyData]        = useState(mockSupplyData);
  const [homeownershipRate, setHomeownershipRate] = useState(mockHomeownershipRate);
  const [rentCpi,           setRentCpi]           = useState(mockRentCpi);
  const [reitEtf,           setReitEtf]           = useState(mockReitEtf);
  const [treasury10y,       setTreasury10y]       = useState(mockTreasury10y);
  const [isLive,            setIsLive]            = useState(false);
  const [lastUpdated,       setLastUpdated]       = useState('Mock data — Apr 2025');
  const [isLoading,         setIsLoading]         = useState(true);
  const [fetchedOn,         setFetchedOn]         = useState(null);
  const [isCurrent,         setIsCurrent]         = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    fetch(`${SERVER}/api/realEstate`, { signal: controller.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        let anyReplaced = false;
        if (data.reitData?.length) { setReitData(data.reitData); anyReplaced = true; }
        if (data.priceIndexData && Object.keys(data.priceIndexData).length >= 2) {
          setPriceIndexData(prev => ({ ...prev, ...data.priceIndexData }));
          anyReplaced = true;
        }
        if (data.mortgageRates?.rate30y) setMortgageRates(data.mortgageRates);
        if (data.affordabilityData?.current?.medianPrice) { setAffordabilityData(data.affordabilityData); anyReplaced = true; }
        if (data.capRateData?.length >= 3) { setCapRateData(data.capRateData); anyReplaced = true; }
        if (data.caseShillerData?.national?.dates?.length >= 12) setCaseShillerData(data.caseShillerData);
        if (data.supplyData?.housingStarts?.values?.length >= 6) setSupplyData(data.supplyData);
        if (data.homeownershipRate != null) setHomeownershipRate(data.homeownershipRate);
        if (data.rentCpi?.dates?.length >= 6) setRentCpi(data.rentCpi);
        if (data.reitEtf?.price != null) setReitEtf(data.reitEtf);
        if (data.treasury10y != null) setTreasury10y(data.treasury10y);
        setIsLive(anyReplaced);
        if (anyReplaced) setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
        if (data.fetchedOn) setFetchedOn(data.fetchedOn);
        setIsCurrent(!!data.isCurrent);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); setIsLoading(false); });
  }, []);

  return { priceIndexData, reitData, affordabilityData, capRateData, mortgageRates, caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y, isLive, lastUpdated, isLoading, fetchedOn, isCurrent };
}
```

- [ ] **Step 3: Update RealEstateMarket.jsx to destructure and pass new props**

Replace `src/markets/realEstate/RealEstateMarket.jsx` with:

```jsx
import React, { useState } from 'react';
import { useRealEstateData } from './data/useRealEstateData';
import PriceIndex       from './components/PriceIndex';
import REITScreen       from './components/REITScreen';
import AffordabilityMap from './components/AffordabilityMap';
import CapRateMonitor   from './components/CapRateMonitor';
import './RealEstateMarket.css';

const SUB_TABS = [
  { id: 'price-index',       label: 'Price Index'       },
  { id: 'reit-screen',       label: 'REIT Screen'       },
  { id: 'affordability-map', label: 'Affordability Map' },
  { id: 'cap-rate-monitor',  label: 'Cap Rate Monitor'  },
];

export default function RealEstateMarket() {
  const [activeTab, setActiveTab] = useState('price-index');
  const {
    priceIndexData, reitData, affordabilityData, capRateData, mortgageRates,
    caseShillerData, supplyData, homeownershipRate, rentCpi, reitEtf, treasury10y,
    isLive, lastUpdated, isLoading, fetchedOn, isCurrent,
  } = useRealEstateData();

  if (isLoading) {
    return (
      <div className="re-market re-loading">
        <div className="re-loading-spinner" />
        <span className="re-loading-text">Loading real estate data…</span>
      </div>
    );
  }

  return (
    <div className="re-market">
      <div className="re-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`re-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="re-status-bar">
        <span className={isLive ? 're-status-live' : ''}>
          {isLive ? '● Live · Yahoo Finance / BIS / FRED' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
        {!isCurrent && fetchedOn && <span className="re-stale-badge">Stale · fetched {fetchedOn}</span>}
      </div>
      <div className="re-content">
        {activeTab === 'price-index'       && <PriceIndex priceIndexData={priceIndexData} caseShillerData={caseShillerData} />}
        {activeTab === 'reit-screen'       && <REITScreen reitData={reitData} reitEtf={reitEtf} />}
        {activeTab === 'affordability-map' && <AffordabilityMap affordabilityData={affordabilityData} mortgageRates={mortgageRates} supplyData={supplyData} />}
        {activeTab === 'cap-rate-monitor'  && <CapRateMonitor capRateData={capRateData} reitData={reitData} treasury10y={treasury10y} homeownershipRate={homeownershipRate} rentCpi={rentCpi} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass (no behavioral changes — just added state and props).

- [ ] **Step 5: Commit**

```bash
git add src/markets/realEstate/data/mockRealEstateData.js src/markets/realEstate/data/useRealEstateData.js src/markets/realEstate/RealEstateMarket.jsx
git commit -m "feat(realEstate): add mock + hook wiring for Case-Shiller, supply, rent, VNQ, treasury"
```

---

### Task 3: CSS — Add Shared Dense Layout Classes

**Files:**
- Modify: `src/markets/realEstate/components/REComponents.css`

- [ ] **Step 1: Append shared layout classes to REComponents.css**

Append to the end of `src/markets/realEstate/components/REComponents.css` (after line 124):

```css
/* ── Shared dense-dashboard layout ─────────────��─ */
.re-kpi-strip {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.re-kpi-pill {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  min-width: 120px;
}
.re-kpi-label {
  font-size: 9px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.re-kpi-value {
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', 'Cascadia Code', monospace;
  color: var(--text-primary);
}
.re-kpi-value.positive { color: #22c55e; }
.re-kpi-value.negative { color: #ef4444; }
.re-kpi-sub {
  font-size: 9px;
  color: var(--text-dim);
}

.re-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.re-wide-narrow {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.re-chart-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.re-chart-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
  flex-shrink: 0;
}
.re-mini-chart {
  flex: 1;
  min-height: 0;
}

/* Metro bars (Price Index sub-tab) */
.re-metro-list { display: flex; flex-direction: column; gap: 6px; }
.re-metro-row { display: flex; align-items: center; gap: 8px; }
.re-metro-name { font-size: 11px; color: var(--text-secondary); width: 90px; flex-shrink: 0; }
.re-metro-bar { flex: 1; height: 14px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; }
.re-metro-bar-fill { height: 100%; border-radius: 3px; background: #f97316; }
.re-metro-val { font-size: 11px; font-weight: 600; color: var(--text-primary); width: 50px; text-align: right; }
.re-metro-yoy { font-size: 10px; width: 50px; text-align: right; }
.re-metro-yoy.positive { color: #22c55e; }
.re-metro-yoy.negative { color: #ef4444; }

/* Sector performance bars (REIT Screen sub-tab) */
.re-sector-bars { display: flex; flex-direction: column; gap: 4px; }
.re-sector-row { display: flex; align-items: center; gap: 6px; }
.re-sector-name { font-size: 10px; color: var(--text-secondary); width: 80px; flex-shrink: 0; text-align: right; }
.re-sector-bar-wrap { flex: 1; height: 12px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; position: relative; }
.re-sector-bar-fill { height: 100%; border-radius: 3px; position: absolute; top: 0; }
.re-sector-bar-center { position: absolute; top: 0; left: 50%; width: 1px; height: 100%; background: var(--text-dim); }
.re-sector-val { font-size: 10px; font-weight: 600; width: 50px; text-align: right; }
.re-sector-val.positive { color: #22c55e; }
.re-sector-val.negative { color: #ef4444; }

/* Supply indicator cards (Affordability sub-tab) */
.re-supply-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.re-supply-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px 12px;
}
.re-supply-label { font-size: 9px; color: var(--text-muted); }
.re-supply-value { font-size: 16px; font-weight: 700; font-family: monospace; color: var(--text-primary); }

/* Sector detail cards (Cap Rate sub-tab) */
.re-sector-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  overflow-y: auto;
}
.re-sector-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px 10px;
}
.re-sector-card-name { font-size: 11px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
.re-sector-card-row { display: flex; justify-content: space-between; font-size: 10px; }
.re-sector-card-label { color: var(--text-muted); }
.re-sector-card-val { color: var(--text-secondary); font-weight: 600; }
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/realEstate/components/REComponents.css
git commit -m "feat(realEstate): add dense-layout CSS classes for enriched sub-tabs"
```

---

### Task 4: Enrich PriceIndex — KPI Strip + Metro Panel + Case-Shiller Chart

**Files:**
- Modify: `src/markets/realEstate/components/PriceIndex.jsx`

- [ ] **Step 1: Replace PriceIndex.jsx with enriched version**

Replace the entire file `src/markets/realEstate/components/PriceIndex.jsx` with:

```jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

const MARKET_COLORS = {
  US: '#60a5fa', UK: '#34d399', DE: '#f472b6',
  AU: '#fbbf24', CA: '#a78bfa', JP: '#fb923c',
};

function buildBisOption(priceIndexData, colors) {
  const markets = Object.keys(priceIndexData);
  const dates = priceIndexData[markets[0]]?.dates ?? [];
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) =>
        `<b>${params[0].axisValue}</b><br/>` +
        params.map(p => `${p.seriesName}: <b>${p.value}</b>`).join('<br/>'),
    },
    legend: { data: markets, top: 0, textStyle: { color: colors.textSecondary, fontSize: 11 } },
    grid: { top: 40, right: 20, bottom: 30, left: 50 },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textMuted, fontSize: 10, rotate: 30 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 11 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: markets.map(m => ({
      name: m, type: 'line', smooth: true,
      data: priceIndexData[m].values,
      itemStyle: { color: MARKET_COLORS[m] || colors.textSecondary },
      lineStyle: { width: 2 }, symbol: 'none',
    })),
  };
}

function buildCaseShillerOption(national, colors) {
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>Index: <b>${p[0].value}</b>`,
    },
    grid: { top: 8, right: 16, bottom: 24, left: 48 },
    xAxis: {
      type: 'category', data: national.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(national.dates.length / 6) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: national.values, symbol: 'none',
      lineStyle: { color: '#f97316', width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,22,0.3)' }, { offset: 1, color: 'rgba(249,115,22,0)' }] } },
    }],
  };
}

export default function PriceIndex({ priceIndexData, caseShillerData }) {
  const { colors } = useTheme();

  const bisOption = useMemo(() => buildBisOption(priceIndexData, colors), [priceIndexData, colors]);
  const csOption = useMemo(() => caseShillerData?.national ? buildCaseShillerOption(caseShillerData.national, colors) : null, [caseShillerData, colors]);

  // KPI computations
  const usData = priceIndexData.US;
  const usLatest = usData?.values?.[usData.values.length - 1] ?? null;
  const usYoy = usData?.values?.length >= 5
    ? Math.round((usData.values[usData.values.length - 1] / usData.values[usData.values.length - 5] - 1) * 1000) / 10
    : null;
  const usPeak = usData?.values ? Math.max(...usData.values) : null;
  const peakDiff = usPeak && usLatest ? Math.round((usLatest / usPeak - 1) * 1000) / 10 : null;

  // Fastest-growing country (last 4 quarters)
  let fastest = null;
  for (const [cc, d] of Object.entries(priceIndexData)) {
    if (d.values.length >= 5) {
      const growth = Math.round((d.values[d.values.length - 1] / d.values[d.values.length - 5] - 1) * 1000) / 10;
      if (!fastest || growth > fastest.growth) fastest = { cc, growth };
    }
  }

  const metros = caseShillerData?.metros || {};
  const metroEntries = Object.entries(metros);
  const maxMetroVal = metroEntries.length ? Math.max(...metroEntries.map(([, m]) => m.latest)) : 1;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Price Index</span>
        <span className="re-panel-subtitle">{Object.keys(priceIndexData).length} markets · quarterly · indexed to 100</span>
      </div>

      <div className="re-kpi-strip">
        {usLatest != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">US Index</span>
            <span className="re-kpi-value">{usLatest}</span>
          </div>
        )}
        {usYoy != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">US YoY</span>
            <span className={`re-kpi-value ${usYoy >= 0 ? 'positive' : 'negative'}`}>{usYoy > 0 ? '+' : ''}{usYoy}%</span>
          </div>
        )}
        {peakDiff != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">From Peak</span>
            <span className={`re-kpi-value ${peakDiff >= 0 ? 'positive' : 'negative'}`}>{peakDiff > 0 ? '+' : ''}{peakDiff}%</span>
          </div>
        )}
        {fastest && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Fastest Growing</span>
            <span className="re-kpi-value">{fastest.cc}</span>
            <span className="re-kpi-sub">+{fastest.growth}% YoY</span>
          </div>
        )}
      </div>

      <div className="re-wide-narrow">
        <div className="re-chart-panel">
          <div className="re-chart-title">Global House Price Indices (BIS)</div>
          <div className="re-mini-chart">
            <ReactECharts option={bisOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>

        <div className="re-chart-panel">
          <div className="re-chart-title">US Metro Indices (Case-Shiller)</div>
          {metroEntries.length > 0 ? (
            <div className="re-metro-list" style={{ padding: '8px 0' }}>
              {metroEntries.sort((a, b) => b[1].latest - a[1].latest).map(([name, m]) => (
                <div key={name} className="re-metro-row">
                  <span className="re-metro-name">{name}</span>
                  <div className="re-metro-bar">
                    <div className="re-metro-bar-fill" style={{ width: `${(m.latest / maxMetroVal) * 100}%` }} />
                  </div>
                  <span className="re-metro-val">{m.latest}</span>
                  <span className={`re-metro-yoy ${m.yoy >= 0 ? 'positive' : 'negative'}`}>
                    {m.yoy > 0 ? '+' : ''}{m.yoy}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textDim, fontSize: 11 }}>
              Metro data not available
            </div>
          )}
        </div>
      </div>

      {csOption && (
        <div className="re-chart-panel" style={{ marginTop: 12, height: 140, flexShrink: 0 }}>
          <div className="re-chart-title">Case-Shiller National Home Price Index</div>
          <div className="re-mini-chart">
            <ReactECharts option={csOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="re-panel-footer">
        BIS index base = 100 · Source: national statistical agencies + S&P CoreLogic Case-Shiller
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/realEstate/components/PriceIndex.jsx
git commit -m "feat(realEstate): enrich PriceIndex with KPI strip, metro bars, Case-Shiller chart"
```

---

### Task 5: Enrich REITScreen — KPI Strip + Sector Bars + VNQ Chart

**Files:**
- Modify: `src/markets/realEstate/components/REITScreen.jsx`

- [ ] **Step 1: Replace REITScreen.jsx with enriched version**

Replace the entire file `src/markets/realEstate/components/REITScreen.jsx` with:

```jsx
import React, { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

const COLUMNS = [
  { key: 'ticker',        label: 'Ticker',  numeric: false },
  { key: 'name',          label: 'Name',    numeric: false },
  { key: 'sector',        label: 'Sector',  numeric: false },
  { key: 'price',         label: 'Price',   numeric: true, fmt: v => `$${v?.toFixed(2) ?? '—'}` },
  { key: 'changePct',     label: '1d%',     numeric: true, fmt: v => `${v > 0 ? '+' : ''}${v?.toFixed(1) ?? 0}%` },
  { key: 'marketCap',     label: 'Mkt Cap', numeric: true, fmt: v => `$${v}B` },
  { key: 'dividendYield', label: 'Yield',   numeric: true, fmt: v => `${v?.toFixed(1) ?? '—'}%` },
  { key: 'pFFO',          label: 'P/FFO',   numeric: true, fmt: v => `${v?.toFixed(1) ?? '—'}x` },
  { key: 'ytdReturn',     label: 'YTD',     numeric: true, fmt: v => `${v > 0 ? '+' : ''}${v?.toFixed(1) ?? 0}%` },
];

function buildVnqOption(history, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>$${p[0].value}`,
    },
    grid: { top: 8, right: 12, bottom: 20, left: 40 },
    xAxis: {
      type: 'category', data: history.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(history.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: history.closes, symbol: 'none',
      lineStyle: { color: '#f97316', width: 1.5 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,22,0.25)' }, { offset: 1, color: 'rgba(249,115,22,0)' }] } },
    }],
  };
}

export default function REITScreen({ reitData, reitEtf }) {
  const { colors } = useTheme();
  const [sortKey, setSortKey] = useState('marketCap');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = [...reitData].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
    return sortAsc ? (av ?? 0) - (bv ?? 0) : (bv ?? 0) - (av ?? 0);
  });

  function handleSort(key) {
    if (key === sortKey) setSortAsc(a => !a);
    else { setSortKey(key); setSortAsc(false); }
  }

  // Sector performance
  const sectorPerf = useMemo(() => {
    const groups = {};
    reitData.forEach(r => {
      if (!groups[r.sector]) groups[r.sector] = [];
      groups[r.sector].push(r.ytdReturn ?? 0);
    });
    return Object.entries(groups)
      .map(([sector, returns]) => ({ sector, avg: Math.round(returns.reduce((a, b) => a + b, 0) / returns.length * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg);
  }, [reitData]);

  const maxAbsReturn = Math.max(...sectorPerf.map(s => Math.abs(s.avg)), 1);

  // KPIs
  const totalMktCap = reitData.reduce((s, r) => s + (r.marketCap ?? 0), 0);
  const avgYield = reitData.filter(r => r.dividendYield != null).reduce((s, r, _, a) => s + r.dividendYield / a.length, 0);
  const bestPerf = reitData.reduce((best, r) => (!best || (r.ytdReturn ?? -999) > best.ytdReturn) ? r : best, null);

  const vnqOption = useMemo(
    () => reitEtf?.history ? buildVnqOption(reitEtf.history, colors) : null,
    [reitEtf, colors]
  );

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">REIT Screen</span>
        <span className="re-panel-subtitle">{reitData.length} REITs · click column headers to sort</span>
      </div>

      <div className="re-kpi-strip">
        {reitEtf && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">VNQ</span>
            <span className="re-kpi-value">${reitEtf.price}</span>
            <span className="re-kpi-sub">{reitEtf.ytd != null ? `YTD ${reitEtf.ytd > 0 ? '+' : ''}${reitEtf.ytd}%` : `${reitEtf.changePct > 0 ? '+' : ''}${reitEtf.changePct}%`}</span>
          </div>
        )}
        <div className="re-kpi-pill">
          <span className="re-kpi-label">Total Mkt Cap</span>
          <span className="re-kpi-value">${totalMktCap}B</span>
        </div>
        <div className="re-kpi-pill">
          <span className="re-kpi-label">Avg Yield</span>
          <span className="re-kpi-value">{avgYield.toFixed(1)}%</span>
        </div>
        {bestPerf && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Best Performer</span>
            <span className="re-kpi-value positive">{bestPerf.ticker}</span>
            <span className="re-kpi-sub">+{bestPerf.ytdReturn?.toFixed(1)}% YTD</span>
          </div>
        )}
      </div>

      <div className="re-two-col" style={{ maxHeight: 180, marginBottom: 8 }}>
        <div className="re-chart-panel">
          <div className="re-chart-title">Sector YTD Performance</div>
          <div className="re-sector-bars" style={{ padding: '4px 0' }}>
            {sectorPerf.map(s => (
              <div key={s.sector} className="re-sector-row">
                <span className="re-sector-name">{s.sector}</span>
                <div className="re-sector-bar-wrap">
                  <div className="re-sector-bar-center" />
                  <div
                    className="re-sector-bar-fill"
                    style={{
                      width: `${(Math.abs(s.avg) / maxAbsReturn) * 50}%`,
                      left: s.avg >= 0 ? '50%' : `${50 - (Math.abs(s.avg) / maxAbsReturn) * 50}%`,
                      background: s.avg >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  />
                </div>
                <span className={`re-sector-val ${s.avg >= 0 ? 'positive' : 'negative'}`}>
                  {s.avg > 0 ? '+' : ''}{s.avg}%
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="re-chart-panel">
          <div className="re-chart-title">VNQ 1-Year</div>
          {vnqOption ? (
            <div className="re-mini-chart">
              <ReactECharts option={vnqOption} style={{ height: '100%', width: '100%' }} />
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.textDim, fontSize: 11 }}>
              VNQ history not available
            </div>
          )}
        </div>
      </div>

      <div className="reit-scroll">
        <table className="reit-table">
          <thead>
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className={`reit-th${sortKey === col.key ? ' sorted' : ''}`} onClick={() => handleSort(col.key)}>
                  {col.label} {sortKey === col.key ? (sortAsc ? '↑' : '↓') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => (
              <tr key={row.ticker} className="reit-row">
                {COLUMNS.map(col => {
                  const val = row[col.key];
                  const display = col.fmt ? col.fmt(val) : val;
                  const isChange = col.key === 'ytdReturn' || col.key === 'changePct';
                  const colorClass = isChange ? (val >= 0 ? 'reit-positive' : 'reit-negative') : '';
                  return (
                    <td key={col.key} className={`reit-cell${colorClass ? ` ${colorClass}` : ''}`}>
                      {display}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="re-panel-footer">
        VNQ = Vanguard Real Estate ETF · Mkt Cap in $B · Yield = forward dividend yield · P/FFO = price / funds from operations
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/realEstate/components/REITScreen.jsx
git commit -m "feat(realEstate): enrich REITScreen with KPI strip, sector bars, VNQ chart, extra columns"
```

---

### Task 6: Enrich AffordabilityMap — Supply Cards + Starts/Permits Chart

**Files:**
- Modify: `src/markets/realEstate/components/AffordabilityMap.jsx`

- [ ] **Step 1: Replace AffordabilityMap.jsx with enriched version**

Replace the entire file `src/markets/realEstate/components/AffordabilityMap.jsx` with:

```jsx
// src/markets/realEstate/components/AffordabilityMap.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

function ptiColor(pti) {
  if (pti >= 8) return '#ef4444';
  if (pti >= 6) return '#f97316';
  if (pti >= 4) return '#facc15';
  return '#22c55e';
}

function buildHistoryOption(history, colors) {
  const dates = history.map(h => h.date.slice(0, 7));
  const prices = history.map(h => h.medianPrice / 1000);
  const ptis = history.map(h => h.priceToIncome);
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/>Median Price: $${(params[0]?.value * 1000)?.toLocaleString()}<br/>Price/Income: ${params[1]?.value}×`,
    },
    legend: { data: ['Price ($K)', 'Price/Income'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 50, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textDim, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: [
      { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${v}K` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}×` }, splitLine: { show: false } },
    ],
    series: [
      { name: 'Price ($K)', type: 'bar', data: prices, yAxisIndex: 0, itemStyle: { color: '#f97316' }, barMaxWidth: 20 },
      { name: 'Price/Income', type: 'line', data: ptis, yAxisIndex: 1, lineStyle: { color: '#6366f1', width: 2 }, symbol: 'circle', symbolSize: 4, itemStyle: { color: '#6366f1' } },
    ],
  };
}

function buildSupplyOption(supplyData, colors) {
  const dates = supplyData.housingStarts.dates;
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: { data: ['Housing Starts', 'Building Permits'], textStyle: { color: colors.textSecondary, fontSize: 9 }, top: 2 },
    grid: { top: 28, right: 16, bottom: 24, left: 8, containLabel: true },
    xAxis: {
      type: 'category', data: dates,
      axisLabel: { color: colors.textMuted, fontSize: 9 },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${(v / 1000).toFixed(1)}M` },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [
      { name: 'Housing Starts', type: 'line', data: supplyData.housingStarts.values, symbol: 'none', lineStyle: { color: '#60a5fa', width: 2 }, itemStyle: { color: '#60a5fa' } },
      { name: 'Building Permits', type: 'line', data: supplyData.permits.values, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2 }, itemStyle: { color: '#a78bfa' } },
    ],
  };
}

export default function AffordabilityMap({ affordabilityData, mortgageRates, supplyData }) {
  const { colors } = useTheme();
  if (!affordabilityData) return null;
  const { current, history = [] } = affordabilityData;
  const historyOption = useMemo(() => history.length >= 2 ? buildHistoryOption(history, colors) : null, [history, colors]);
  const supplyOption = useMemo(() => supplyData?.housingStarts?.values?.length >= 4 ? buildSupplyOption(supplyData, colors) : null, [supplyData, colors]);

  const startsLatest = supplyData?.housingStarts?.values?.at(-1);
  const permitsLatest = supplyData?.permits?.values?.at(-1);

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">US Housing Affordability</span>
        <span className="re-panel-subtitle">FRED · Median home price vs median household income + supply indicators</span>
      </div>

      {mortgageRates && (
        <div className="afford-mortgage-banner">
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">30-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate30y.toFixed(2)}%</span>
          </div>
          <div className="afford-mortgage-divider" />
          <div className="afford-mortgage-item">
            <span className="afford-mortgage-label">15-Year Fixed</span>
            <span className="afford-mortgage-rate">{mortgageRates.rate15y.toFixed(2)}%</span>
          </div>
          <span className="afford-mortgage-source">FRED · as of {mortgageRates.asOf}</span>
        </div>
      )}

      {current && (
        <div className="re-two-col">
          <div className="re-chart-panel" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Median Home Price</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>${current.medianPrice?.toLocaleString()}</div>
                {current.yoyChange != null && (
                  <div style={{ fontSize: 10, color: current.yoyChange >= 0 ? '#22c55e' : '#ef4444' }}>
                    {current.yoyChange >= 0 ? '+' : ''}{current.yoyChange}% YoY
                  </div>
                )}
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Median Household Income</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: colors.text, fontFamily: 'monospace' }}>${current.medianIncome?.toLocaleString()}</div>
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Price-to-Income</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: ptiColor(current.priceToIncome), fontFamily: 'monospace' }}>{current.priceToIncome}×</div>
              </div>
              <div style={{ background: colors.cardBg, borderRadius: 8, padding: '8px 12px', border: `1px solid ${colors.borderSubtle}` }}>
                <div style={{ fontSize: 9, color: colors.textMuted }}>Mortgage / Income</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: current.mortgageToIncome > 30 ? '#ef4444' : '#22c55e', fontFamily: 'monospace' }}>{current.mortgageToIncome}%</div>
                <div style={{ fontSize: 9, color: colors.textDim }}>80% LTV · 30yr @ {current.rate30y}%</div>
              </div>
            </div>
            {/* Supply indicators below */}
            {supplyData && (
              <div className="re-supply-grid" style={{ marginTop: 8 }}>
                {startsLatest != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Housing Starts</div>
                    <div className="re-supply-value">{(startsLatest / 1000).toFixed(2)}M</div>
                  </div>
                )}
                {permitsLatest != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Building Permits</div>
                    <div className="re-supply-value">{(permitsLatest / 1000).toFixed(2)}M</div>
                  </div>
                )}
                {supplyData.monthsSupply != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Months Supply</div>
                    <div className="re-supply-value">{supplyData.monthsSupply}</div>
                  </div>
                )}
                {supplyData.activeListings != null && (
                  <div className="re-supply-card">
                    <div className="re-supply-label">Active Listings</div>
                    <div className="re-supply-value">{(supplyData.activeListings / 1e6).toFixed(2)}M</div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="re-chart-panel">
            {historyOption ? (
              <>
                <div className="re-chart-title">Median Home Price + Price/Income Trend</div>
                <div className="re-mini-chart">
                  <ReactECharts option={historyOption} style={{ height: '100%', width: '100%' }} />
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: colors.textDim, fontSize: 11 }}>
                History data not available
              </div>
            )}
          </div>
        </div>
      )}

      {supplyOption && (
        <div className="re-chart-panel" style={{ marginTop: 8, height: 150, flexShrink: 0 }}>
          <div className="re-chart-title">Housing Starts + Building Permits Trend</div>
          <div className="re-mini-chart">
            <ReactECharts option={supplyOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="re-panel-footer">
        Red ≥ 8× · Orange ≥ 6× · Yellow ≥ 4× · Green &lt; 4× · Mortgage/Income = annual payment as % of gross income
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/realEstate/components/AffordabilityMap.jsx
git commit -m "feat(realEstate): enrich Affordability with supply cards + starts/permits chart"
```

---

### Task 7: Enrich CapRateMonitor — KPI Strip + Treasury Line + Sector Cards + Rent CPI

**Files:**
- Modify: `src/markets/realEstate/components/CapRateMonitor.jsx`

- [ ] **Step 1: Replace CapRateMonitor.jsx with enriched version**

Replace the entire file `src/markets/realEstate/components/CapRateMonitor.jsx` with:

```jsx
// src/markets/realEstate/components/CapRateMonitor.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './REComponents.css';

function yieldColor(y) {
  if (y >= 5) return '#f87171';
  if (y >= 4) return '#fbbf24';
  if (y >= 3) return '#34d399';
  return '#6366f1';
}

function buildYieldOption(capRateData, treasury10y, colors) {
  const sorted = [...capRateData].sort((a, b) => a.impliedYield - b.impliedYield);
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis', axisPointer: { type: 'shadow' },
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => {
        const v = params[0].value;
        const spread = treasury10y != null ? (v - treasury10y).toFixed(1) : '—';
        return `${params[0].name}: ${v}%<br/>Spread to 10Y: ${spread}%`;
      },
    },
    grid: { top: 8, right: 60, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${v}%` },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(s => s.sector),
      axisLine: { show: false }, axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [
      {
        type: 'bar', barMaxWidth: 20,
        data: sorted.map(s => ({
          value: s.impliedYield,
          itemStyle: { color: yieldColor(s.impliedYield) },
        })),
        label: { show: true, position: 'right', formatter: p => `${p.value}%`, color: colors.textSecondary, fontSize: 9 },
        markLine: treasury10y != null ? {
          silent: true,
          data: [{ xAxis: treasury10y, label: { formatter: `10Y: ${treasury10y}%`, color: '#60a5fa', fontSize: 9 }, lineStyle: { color: '#60a5fa', type: 'dashed', width: 1.5 } }],
        } : undefined,
      },
    ],
  };
}

function buildRentCpiOption(rentCpi, colors) {
  return {
    animation: false, backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: p => `${p[0].axisValue}<br/>CPI Rent: ${p[0].value}`,
    },
    grid: { top: 8, right: 12, bottom: 20, left: 40 },
    xAxis: {
      type: 'category', data: rentCpi.dates,
      axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(rentCpi.dates.length / 4) },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value', scale: true,
      axisLabel: { color: colors.textMuted, fontSize: 9 },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line', data: rentCpi.values, symbol: 'none',
      lineStyle: { color: '#f97316', width: 1.5 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(249,115,22,0.2)' }, { offset: 1, color: 'rgba(249,115,22,0)' }] } },
    }],
  };
}

export default function CapRateMonitor({ capRateData, reitData, treasury10y, homeownershipRate, rentCpi }) {
  const { colors } = useTheme();

  const yieldOption = useMemo(() => capRateData?.length ? buildYieldOption(capRateData, treasury10y, colors) : null, [capRateData, treasury10y, colors]);
  const rentOption = useMemo(() => rentCpi?.dates?.length >= 4 ? buildRentCpiOption(rentCpi, colors) : null, [rentCpi, colors]);

  const avgYield = capRateData?.length ? Math.round(capRateData.reduce((s, c) => s + c.impliedYield, 0) / capRateData.length * 10) / 10 : null;
  const spread = avgYield != null && treasury10y != null ? Math.round((avgYield - treasury10y) * 10) / 10 : null;

  // Sector detail: count REITs + avg market cap per sector
  const sectorDetail = useMemo(() => {
    if (!capRateData?.length || !reitData?.length) return [];
    return capRateData.map(c => {
      const reits = reitData.filter(r => r.sector === c.sector);
      const avgCap = reits.length ? Math.round(reits.reduce((s, r) => s + (r.marketCap ?? 0), 0) / reits.length) : null;
      return { ...c, count: reits.length, avgCap, spread: treasury10y != null ? Math.round((c.impliedYield - treasury10y) * 10) / 10 : null };
    }).sort((a, b) => b.impliedYield - a.impliedYield);
  }, [capRateData, reitData, treasury10y]);

  if (!yieldOption) return null;

  return (
    <div className="re-panel">
      <div className="re-panel-header">
        <span className="re-panel-title">Cap Rate Monitor</span>
        <span className="re-panel-subtitle">REIT dividend yield as cap rate proxy · spread to 10Y Treasury</span>
      </div>

      <div className="re-kpi-strip">
        {avgYield != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Avg REIT Yield</span>
            <span className="re-kpi-value">{avgYield}%</span>
          </div>
        )}
        {treasury10y != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">10Y Treasury</span>
            <span className="re-kpi-value">{treasury10y}%</span>
          </div>
        )}
        {spread != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Spread</span>
            <span className={`re-kpi-value ${spread >= 0 ? 'positive' : 'negative'}`}>{spread > 0 ? '+' : ''}{spread}%</span>
          </div>
        )}
        {homeownershipRate != null && (
          <div className="re-kpi-pill">
            <span className="re-kpi-label">Homeownership</span>
            <span className="re-kpi-value">{homeownershipRate}%</span>
          </div>
        )}
      </div>

      <div className="re-two-col">
        <div className="re-chart-panel">
          <div className="re-chart-title">Implied Yield by Sector</div>
          <div className="re-mini-chart">
            <ReactECharts option={yieldOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
        <div className="re-chart-panel" style={{ overflow: 'auto' }}>
          <div className="re-chart-title">Sector Detail</div>
          <div className="re-sector-cards">
            {sectorDetail.map(s => (
              <div key={s.sector} className="re-sector-card">
                <div className="re-sector-card-name">{s.sector}</div>
                <div className="re-sector-card-row">
                  <span className="re-sector-card-label">Yield</span>
                  <span className="re-sector-card-val" style={{ color: yieldColor(s.impliedYield) }}>{s.impliedYield}%</span>
                </div>
                {s.spread != null && (
                  <div className="re-sector-card-row">
                    <span className="re-sector-card-label">Spread</span>
                    <span className="re-sector-card-val">{s.spread > 0 ? '+' : ''}{s.spread}%</span>
                  </div>
                )}
                <div className="re-sector-card-row">
                  <span className="re-sector-card-label">REITs</span>
                  <span className="re-sector-card-val">{s.count}</span>
                </div>
                {s.avgCap != null && (
                  <div className="re-sector-card-row">
                    <span className="re-sector-card-label">Avg Cap</span>
                    <span className="re-sector-card-val">${s.avgCap}B</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {rentOption && (
        <div className="re-chart-panel" style={{ marginTop: 8, height: 130, flexShrink: 0 }}>
          <div className="re-chart-title">Rent CPI (Primary Residence)</div>
          <div className="re-mini-chart">
            <ReactECharts option={rentOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}

      <div className="re-panel-footer">
        Dividend yield approximates cap rate · Higher yield = higher risk / lower valuation · Spread = yield − 10Y Treasury
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/realEstate/components/CapRateMonitor.jsx
git commit -m "feat(realEstate): enrich CapRate with KPI strip, treasury line, sector cards, rent CPI"
```

---

## Self-Review

**Spec coverage:**
- Case-Shiller national + 5 metros: Task 1 (server) + Task 2 (mock/hook) + Task 4 (PriceIndex) ✓
- Housing starts + permits + months supply + active listings: Task 1 + Task 2 + Task 6 (Affordability) ✓
- Homeownership rate: Task 1 + Task 2 + Task 7 (CapRate) ✓
- Rent CPI: Task 1 + Task 2 + Task 7 (CapRate) ✓
- VNQ ETF + history: Task 1 + Task 2 + Task 5 (REITScreen) ✓
- 10Y Treasury for spread: Task 1 + Task 2 + Task 7 (CapRate) ✓
- KPI strips on all 4 sub-tabs: Tasks 4, 5, 6, 7 ✓
- Metro panel: Task 4 ✓
- Sector bars: Task 5 ✓
- Supply cards: Task 6 ✓
- Sector detail cards: Task 7 ✓
- Treasury markLine on bar chart: Task 7 ✓

**Placeholder scan:** No TBDs. All tasks have complete code.

**Type consistency:**
- `caseShillerData.national.dates/values` — consistent between server (Task 1), mock (Task 2), and PriceIndex (Task 4)
- `caseShillerData.metros[name].latest/yoy` — consistent between server, mock, and PriceIndex
- `supplyData.housingStarts.dates/values` — consistent between server, mock, Affordability (Task 6)
- `supplyData.monthsSupply/activeListings` — consistent
- `reitEtf.price/changePct/ytd/history.dates/history.closes` — consistent between server, mock, REITScreen (Task 5)
- `treasury10y` — number, consistent
- `homeownershipRate` — number, consistent
- `rentCpi.dates/values` — consistent between server, mock, CapRate (Task 7)
- Props passed in RealEstateMarket.jsx (Task 2 Step 3) match component signatures in Tasks 4-7
