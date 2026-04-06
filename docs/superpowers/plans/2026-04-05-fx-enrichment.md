# FX Market Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform all 4 FX sub-tabs into dense dashboards with KPI strips, secondary chart panels, and FRED 1-year bilateral rate histories.

**Architecture:** Add new `/api/fx` server endpoint for FRED bilateral exchange rates (7 series, 252 daily points each). Each sub-tab component gets a KPI strip computed from existing client-side data + additional chart/bar panels. Only DXYTracker needs the FRED server data for its 1-year chart; all other enrichments are pure client-side computations.

**Tech Stack:** React 18 + ECharts (echarts-for-react) + FRED API + Frankfurter API (existing) + Vite 5

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/index.js` | Modify | Add `/api/fx` endpoint with FRED bilateral rates |
| `src/markets/fx/data/mockFxData.js` | Create | Mock fallback for FRED FX rates |
| `src/markets/fx/data/useFXData.js` | Modify | Add FRED rates fetch + state |
| `src/markets/fx/FXMarket.jsx` | Modify | Pass FRED data props to DXYTracker |
| `src/markets/fx/components/FXComponents.css` | Modify | Add KPI strip + panel styles |
| `src/markets/fx/components/RateMatrix.jsx` | Modify | Add KPI strip + USD strength bars |
| `src/markets/fx/components/CarryMap.jsx` | Modify | Add KPI strip + rate bars |
| `src/markets/fx/components/DXYTracker.jsx` | Modify | Add KPI strip + component breakdown + FRED chart |
| `src/markets/fx/components/TopMovers.jsx` | Modify | Add KPI strip + G10/EM bars |

---

### Task 1: Server — Add `/api/fx` Endpoint

**Files:**
- Modify: `server/index.js`

- [ ] **Step 1: Add the `/api/fx` endpoint**

Find the line `console.log(\`  Endpoints:` in `server/index.js` (around line 3030). Just BEFORE the `app.listen(...)` block (which is near the bottom), add the new endpoint. Place it after the last existing endpoint and before the listen call. Insert:

```js
// --- FX Market Data (FRED bilateral rates) ---
app.get('/api/fx', async (req, res) => {
  const cacheKey = 'fx_data';
  const today = todayStr();

  const daily = readDailyCache('fx');
  if (daily) return res.json({ ...daily, fetchedOn: today, isCurrent: true });

  const cached = cache.get(cacheKey);
  if (cached) return res.json({ ...cached, fetchedOn: today, isCurrent: true });

  try {
    let fredFxRates = null;
    if (FRED_API_KEY) {
      try {
        const FRED_FX_SERIES = {
          eurUsd:      'DEXUSEU',
          usdJpy:      'DEXJPUS',
          gbpUsd:      'DEXUSUK',
          usdChf:      'DEXSZUS',
          usdCad:      'DEXCAUS',
          audUsd:      'DEXUSAL',
          dollarIndex: 'DTWEXBGS',
        };
        const entries = Object.entries(FRED_FX_SERIES);
        const results = await Promise.allSettled(
          entries.map(([key, sid]) => fetchFredHistory(sid, 252).then(hist => [key, hist]))
        );
        const rates = {};
        results.forEach(r => {
          if (r.status === 'fulfilled') {
            const [key, hist] = r.value;
            if (hist.length >= 10) {
              rates[key] = {
                dates: hist.map(p => p.date),
                values: hist.map(p => Math.round(p.value * 10000) / 10000),
              };
            }
          }
        });
        if (Object.keys(rates).length >= 3) fredFxRates = rates;
      } catch { /* use null */ }
    }

    const result = {
      fredFxRates: fredFxRates ?? null,
      lastUpdated: today,
    };

    writeDailyCache('fx', result);
    cache.set(cacheKey, result, 900);
    res.json({ ...result, fetchedOn: today, isCurrent: true });
  } catch (error) {
    console.error('FX API error:', error);
    const fallback = readLatestCache('fx');
    if (fallback) return res.json({ ...fallback.data, fetchedOn: fallback.fetchedOn, isCurrent: false });
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

Also update the console.log line that lists endpoints to include `/api/fx`.

Also add `/api/fx` to the Vite proxy if not already covered (check `vite.config.js` — usually it proxies all `/api/*` already).

- [ ] **Step 2: Commit**

```bash
git add server/index.js
git commit -m "feat(fx): add /api/fx endpoint with FRED bilateral exchange rate histories"
```

---

### Task 2: Mock Data + Hook — FRED FX Rates

**Files:**
- Create: `src/markets/fx/data/mockFxData.js`
- Modify: `src/markets/fx/data/useFXData.js`

- [ ] **Step 1: Create mock data file**

Create `src/markets/fx/data/mockFxData.js`:

```js
// src/markets/fx/data/mockFxData.js
const MOCK_DATES = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-01-02');
  d.setDate(d.getDate() + i);
  return d.toISOString().split('T')[0];
});

export const fredFxRates = {
  eurUsd: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 1.08 + Math.sin(i / 10) * 0.03),
  },
  usdJpy: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 150 + Math.sin(i / 8) * 4),
  },
  gbpUsd: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 1.26 + Math.sin(i / 12) * 0.02),
  },
  usdChf: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 0.88 + Math.sin(i / 9) * 0.02),
  },
  usdCad: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 1.36 + Math.sin(i / 11) * 0.03),
  },
  audUsd: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 0.65 + Math.sin(i / 10) * 0.02),
  },
  dollarIndex: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 104 + Math.sin(i / 12) * 3),
  },
};
```

- [ ] **Step 2: Update useFXData to fetch FRED rates**

Add at the top of `useFXData.js`, after the existing imports:

```js
import { fredFxRates as mockFredFxRates } from './mockFxData';
```

Inside the `useFXData` function, add a new state variable after the existing ones:

```js
const [fredFxRates, setFredFxRates] = useState(mockFredFxRates);
```

Add a second `useEffect` that fetches from `/api/fx`:

```js
useEffect(() => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  fetch('/api/fx', { signal: ctrl.signal })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(data => {
      if (data.fredFxRates && Object.keys(data.fredFxRates).length >= 3) {
        setFredFxRates(data.fredFxRates);
      }
    })
    .catch(() => {})
    .finally(() => clearTimeout(timer));
  return () => { ctrl.abort(); clearTimeout(timer); };
}, []);
```

Add `fredFxRates` to the return object:

```js
return { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, fredFxRates, isLive, lastUpdated, isLoading };
```

- [ ] **Step 3: Commit**

```bash
git add src/markets/fx/data/mockFxData.js src/markets/fx/data/useFXData.js
git commit -m "feat(fx): add mock FRED FX rates + hook fetch for /api/fx"
```

---

### Task 3: CSS — Add Dense-Layout Styles

**Files:**
- Modify: `src/markets/fx/components/FXComponents.css`

- [ ] **Step 1: Append dense-layout styles**

Append to end of `FXComponents.css`:

```css
/* ── Shared dense-dashboard layout ──────────── */
.fx-kpi-strip {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.fx-kpi-pill {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  min-width: 120px;
}
.fx-kpi-label {
  font-size: 9px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.fx-kpi-value {
  font-size: 16px;
  font-weight: 700;
  font-family: 'SF Mono', 'Cascadia Code', monospace;
  color: var(--text-primary);
}
.fx-kpi-value.positive { color: #22c55e; }
.fx-kpi-value.negative { color: #ef4444; }
.fx-kpi-sub {
  font-size: 9px;
  color: var(--text-dim);
}

.fx-wide-narrow {
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.fx-two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  flex: 1;
  min-height: 0;
}
.fx-chart-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.fx-chart-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 4px;
  flex-shrink: 0;
}
.fx-mini-chart {
  flex: 1;
  min-height: 0;
}

/* Strength / rate bars */
.fx-bar-list { display: flex; flex-direction: column; gap: 5px; overflow-y: auto; }
.fx-bar-row { display: flex; align-items: center; gap: 8px; }
.fx-bar-name { font-size: 11px; color: var(--text-secondary); width: 36px; flex-shrink: 0; font-weight: 600; }
.fx-bar-wrap { flex: 1; height: 14px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; position: relative; }
.fx-bar-fill { height: 100%; border-radius: 3px; position: absolute; top: 0; }
.fx-bar-center { position: absolute; top: 0; left: 50%; width: 1px; height: 100%; background: var(--text-dim); }
.fx-bar-val { font-size: 11px; font-weight: 600; width: 55px; text-align: right; }
.fx-bar-val.positive { color: #22c55e; }
.fx-bar-val.negative { color: #ef4444; }

/* DXY component breakdown rows */
.fx-comp-list { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; }
.fx-comp-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; }
.fx-comp-code { font-size: 11px; font-weight: 600; color: var(--text-primary); width: 32px; }
.fx-comp-weight { font-size: 10px; color: var(--text-muted); width: 40px; text-align: right; }
.fx-comp-change { font-size: 11px; font-weight: 600; width: 55px; text-align: right; }
.fx-comp-change.positive { color: #22c55e; }
.fx-comp-change.negative { color: #ef4444; }
.fx-comp-bar-wrap { flex: 1; height: 10px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; }
.fx-comp-bar-fill { height: 100%; border-radius: 3px; }

/* G10 vs EM comparison */
.fx-group-bars { display: flex; gap: 16px; align-items: center; justify-content: center; padding: 8px; }
.fx-group-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.fx-group-label { font-size: 10px; color: var(--text-muted); text-transform: uppercase; }
.fx-group-value { font-size: 18px; font-weight: 700; font-family: monospace; }
.fx-group-value.positive { color: #22c55e; }
.fx-group-value.negative { color: #ef4444; }
.fx-group-divider { width: 1px; height: 40px; background: var(--border-color); }
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/fx/components/FXComponents.css
git commit -m "feat(fx): add dense-layout CSS — KPI strip, bar panels, component breakdown, group bars"
```

---

### Task 4: FXMarket Shell — Pass FRED Data

**Files:**
- Modify: `src/markets/fx/FXMarket.jsx`

- [ ] **Step 1: Update destructuring and pass fredFxRates to DXYTracker**

In `FXMarket.jsx`, update the `useFXData()` destructuring to include `fredFxRates`:

```js
const { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, fredFxRates, isLive, lastUpdated, isLoading } = useFXData();
```

Update the DXYTracker rendering to pass `fredFxRates`:

```jsx
{activeTab === 'dxy-tracker' && <DXYTracker history={history} fredFxRates={fredFxRates} />}
```

Also pass `changes` to RateMatrix for strength bars:

```jsx
{activeTab === 'rate-matrix' && <RateMatrix spotRates={spotRates} prevRates={prevRates} changes={changes} />}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/fx/FXMarket.jsx
git commit -m "feat(fx): pass FRED rates + changes props to sub-tab components"
```

---

### Task 5: RateMatrix Enrichment — KPI Strip + USD Strength Bars

**Files:**
- Modify: `src/markets/fx/components/RateMatrix.jsx`

- [ ] **Step 1: Rewrite RateMatrix with dense layout**

Replace the entire `RateMatrix.jsx` with:

```jsx
import React, { useMemo } from 'react';
import './RateMatrix.css';
import './FXComponents.css';

const MATRIX_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD'];

function formatRate(value, quote) {
  return (quote === 'JPY' || quote === 'CNY') ? value.toFixed(2) : value.toFixed(4);
}

export default function RateMatrix({ spotRates, prevRates, changes = {} }) {
  const cells = useMemo(() => {
    const result = {};
    for (const base of MATRIX_CURRENCIES) {
      result[base] = {};
      for (const quote of MATRIX_CURRENCIES) {
        if (base === quote) { result[base][quote] = null; continue; }
        const baseSpot  = spotRates[base];
        const quoteSpot = spotRates[quote];
        const basePrev  = prevRates[base];
        const quotePrev = prevRates[quote];
        const currRate = (baseSpot && quoteSpot) ? quoteSpot / baseSpot : null;
        const prevRate = (basePrev && quotePrev) ? quotePrev / basePrev : null;
        const changePct = (currRate != null && prevRate != null && prevRate !== 0)
          ? ((currRate - prevRate) / prevRate) * 100
          : null;
        result[base][quote] = { rate: currRate, changePct };
      }
    }
    return result;
  }, [spotRates, prevRates]);

  // KPI + strength computations
  const eurUsd = spotRates['EUR'] ? (1 / spotRates['EUR']) : null;
  const usdJpy = spotRates['JPY'] ?? null;
  const currencies = MATRIX_CURRENCIES.filter(c => c !== 'USD' && changes[c] != null);
  const sorted = [...currencies].sort((a, b) => (changes[b] ?? 0) - (changes[a] ?? 0));
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const maxAbs = Math.max(...currencies.map(c => Math.abs(changes[c] || 0)), 0.01);

  return (
    <div className="fx-panel" style={{ padding: 20 }}>
      <div className="fx-panel-header">
        <span className="fx-panel-title">Cross-Rate Matrix</span>
        <span className="fx-panel-subtitle">Rows = base · Columns = quote · color = 24h % change</span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">EUR/USD</span>
          <span className="fx-kpi-value">{eurUsd != null ? eurUsd.toFixed(4) : '—'}</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">USD/JPY</span>
          <span className="fx-kpi-value">{usdJpy != null ? usdJpy.toFixed(2) : '—'}</span>
        </div>
        {strongest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Strongest 24h</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{strongest}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>+{(changes[strongest] ?? 0).toFixed(3)}%</span>
          </div>
        )}
        {weakest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Weakest 24h</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{weakest}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{(changes[weakest] ?? 0).toFixed(3)}%</span>
          </div>
        )}
      </div>

      {/* Main: matrix (wide) + strength bars (narrow) */}
      <div className="fx-wide-narrow">
        <div className="rate-matrix-scroll">
          <table className="rate-matrix-table">
            <thead>
              <tr>
                <th className="rate-matrix-corner">Base ↓ / Quote →</th>
                {MATRIX_CURRENCIES.map(c => (
                  <th key={c} className="rate-matrix-col-header">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="rate-matrix-row-header">{base}</td>
                  {MATRIX_CURRENCIES.map(quote => {
                    if (base === quote) {
                      return <td key={quote} className="rate-matrix-cell rate-matrix-diagonal">—</td>;
                    }
                    const cell = cells[base]?.[quote];
                    if (!cell || cell.rate == null) {
                      return <td key={quote} className="rate-matrix-cell">—</td>;
                    }
                    const { rate, changePct } = cell;
                    const isPositive = changePct != null && changePct >= 0;
                    const isNegative = changePct != null && changePct < 0;
                    return (
                      <td key={quote} className={`rate-matrix-cell${isPositive ? ' positive' : isNegative ? ' negative' : ''}`}>
                        <span className="rate-matrix-rate">{formatRate(rate, quote)}</span>
                        <span className="rate-matrix-change">
                          {changePct == null ? '—' : `${isPositive ? '+' : ''}${changePct.toFixed(2)}%`}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fx-chart-panel">
          <div className="fx-chart-title">USD Strength — 24h % vs USD</div>
          <div className="fx-bar-list" style={{ marginTop: 4 }}>
            {sorted.map(code => {
              const val = changes[code] ?? 0;
              const pct = Math.abs(val) / maxAbs * 50;
              const isPos = val >= 0;
              return (
                <div key={code} className="fx-bar-row">
                  <span className="fx-bar-name">{code}</span>
                  <div className="fx-bar-wrap">
                    <div className="fx-bar-center" />
                    <div
                      className="fx-bar-fill"
                      style={{
                        width: `${pct}%`,
                        left: isPos ? '50%' : `${50 - pct}%`,
                        background: isPos ? '#22c55e' : '#ef4444',
                      }}
                    />
                  </div>
                  <span className={`fx-bar-val ${isPos ? 'positive' : 'negative'}`}>
                    {isPos ? '+' : ''}{val.toFixed(3)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rate-matrix-legend">
        <span className="legend-green">Green = base strengthened vs quote</span>
        <span className="legend-sep">·</span>
        <span className="legend-red">Red = base weakened vs quote</span>
      </div>
    </div>
  );
}
```

Note: The component now imports `FXComponents.css` for the KPI/bar styles, in addition to the existing `RateMatrix.css`.

- [ ] **Step 2: Commit**

```bash
git add src/markets/fx/components/RateMatrix.jsx
git commit -m "feat(fx): RateMatrix dense layout — KPI strip + USD strength bars"
```

---

### Task 6: CarryMap Enrichment — KPI Strip + Central Bank Rate Bars

**Files:**
- Modify: `src/markets/fx/components/CarryMap.jsx`

- [ ] **Step 1: Rewrite CarryMap with dense layout**

Replace the entire `CarryMap.jsx` with:

```jsx
// src/markets/fx/components/CarryMap.jsx
import React, { useMemo } from 'react';
import { CENTRAL_BANK_RATES } from '../data/centralBankRates';
import './FXComponents.css';

const CARRY_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'NZD'];

function carryBg(diff) {
  if (Math.abs(diff) < 0.05) return 'transparent';
  const intensity = Math.min(Math.abs(diff) / 5, 1);
  const alpha = 0.12 + intensity * 0.3;
  return diff > 0
    ? `rgba(34, 197, 94, ${alpha})`
    : `rgba(239, 68, 68, ${alpha})`;
}

export default function CarryMap() {
  const pairs = useMemo(() => {
    const result = {};
    for (const base of CARRY_CURRENCIES) {
      result[base] = {};
      for (const quote of CARRY_CURRENCIES) {
        if (base === quote) { result[base][quote] = null; continue; }
        const baseRate  = CENTRAL_BANK_RATES[base]?.rate ?? 0;
        const quoteRate = CENTRAL_BANK_RATES[quote]?.rate ?? 0;
        result[base][quote] = baseRate - quoteRate;
      }
    }
    return result;
  }, []);

  // KPI computations
  const rates = CARRY_CURRENCIES.map(c => ({ code: c, rate: CENTRAL_BANK_RATES[c]?.rate ?? 0 }));
  const sortedRates = [...rates].sort((a, b) => b.rate - a.rate);
  const maxRate = sortedRates[0]?.rate ?? 0;
  const minRate = sortedRates[sortedRates.length - 1]?.rate ?? 0;
  const g7 = ['USD', 'EUR', 'GBP', 'JPY', 'CAD'];
  const avgG7 = g7.reduce((s, c) => s + (CENTRAL_BANK_RATES[c]?.rate ?? 0), 0) / g7.length;

  // Best/worst carry pairs
  let bestCarry = null, worstCarry = null;
  for (const base of CARRY_CURRENCIES) {
    for (const quote of CARRY_CURRENCIES) {
      if (base === quote) continue;
      const diff = pairs[base]?.[quote];
      if (diff == null) continue;
      if (!bestCarry || diff > bestCarry.diff) bestCarry = { base, quote, diff };
      if (!worstCarry || diff < worstCarry.diff) worstCarry = { base, quote, diff };
    }
  }

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Carry Map</span>
        <span className="fx-panel-subtitle">
          Interest rate differential (long base − short quote). Positive = earn positive carry.
        </span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        {bestCarry && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Highest Carry</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{bestCarry.base}/{bestCarry.quote}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>+{bestCarry.diff.toFixed(2)}%</span>
          </div>
        )}
        {worstCarry && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Lowest Carry</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{worstCarry.base}/{worstCarry.quote}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{worstCarry.diff.toFixed(2)}%</span>
          </div>
        )}
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Avg G7 Rate</span>
          <span className="fx-kpi-value">{avgG7.toFixed(2)}%</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Rate Range</span>
          <span className="fx-kpi-value">{(maxRate - minRate).toFixed(2)}%</span>
          <span className="fx-kpi-sub">{minRate.toFixed(2)}% — {maxRate.toFixed(2)}%</span>
        </div>
      </div>

      {/* Main: carry table (wide) + rate bars (narrow) */}
      <div className="fx-wide-narrow">
        <div className="carry-scroll">
          <table className="fx-table">
            <thead>
              <tr>
                <th className="fx-th fx-corner">Long ↓ / Short →</th>
                {CARRY_CURRENCIES.map(c => (
                  <th key={c} className="fx-th">
                    {c}<br />
                    <span className="fx-rate-hint">{CENTRAL_BANK_RATES[c]?.rate ?? '—'}%</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CARRY_CURRENCIES.map(base => (
                <tr key={base}>
                  <td className="fx-row-header">
                    {base}<br />
                    <span className="fx-rate-hint">{CENTRAL_BANK_RATES[base]?.rate ?? '—'}%</span>
                  </td>
                  {CARRY_CURRENCIES.map(quote => {
                    if (base === quote) {
                      return <td key={quote} className="fx-cell fx-diagonal">—</td>;
                    }
                    const diff = pairs[base][quote];
                    return (
                      <td key={quote} className="fx-cell" style={{ background: carryBg(diff) }}>
                        <span className={`fx-diff ${diff > 0 ? 'positive' : diff < 0 ? 'negative' : ''}`}>
                          {diff >= 0 ? '+' : ''}{diff.toFixed(2)}%
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fx-chart-panel">
          <div className="fx-chart-title">Central Bank Policy Rates</div>
          <div className="fx-bar-list" style={{ marginTop: 4 }}>
            {sortedRates.map(({ code, rate }) => {
              const pct = maxRate > 0 ? (rate / maxRate) * 100 : 0;
              return (
                <div key={code} className="fx-bar-row">
                  <span className="fx-bar-name">{code}</span>
                  <div className="fx-bar-wrap">
                    <div
                      className="fx-bar-fill"
                      style={{ width: `${pct}%`, left: 0, background: '#f59e0b' }}
                    />
                  </div>
                  <span className="fx-bar-val" style={{ color: 'var(--text-primary)' }}>{rate.toFixed(2)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="fx-panel-footer">
        Central bank policy rates (approximate). Green = positive carry. Red = negative carry.
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/fx/components/CarryMap.jsx
git commit -m "feat(fx): CarryMap dense layout — KPI strip + central bank rate bars"
```

---

### Task 7: DXYTracker Enrichment — KPI Strip + Component Breakdown + FRED 1yr Chart

**Files:**
- Modify: `src/markets/fx/components/DXYTracker.jsx`

- [ ] **Step 1: Rewrite DXYTracker with dense layout**

Replace the entire `DXYTracker.jsx` with:

```jsx
// src/markets/fx/components/DXYTracker.jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './FXComponents.css';

const DXY_WEIGHTS = { EUR: 0.576, JPY: 0.136, GBP: 0.119, CAD: 0.091, SEK: 0.042, CHF: 0.036 };
const DXY_COMPONENT_COLORS = {
  EUR: '#10b981', JPY: '#ef4444', GBP: '#f59e0b',
  CAD: '#a855f7', SEK: '#06b6d4', CHF: '#f97316',
};
const DXY_PROXY_COLOR = '#3b82f6';

export default function DXYTracker({ history, fredFxRates }) {
  const { colors } = useTheme();

  const { chartOption, dxyLatest, dxy30dChange, componentChanges } = useMemo(() => {
    const dates = Object.keys(history).sort();
    if (dates.length < 2) return { chartOption: null, dxyLatest: null, dxy30dChange: null, componentChanges: [] };

    const firstRates = history[dates[0]] || {};
    const lastRates = history[dates[dates.length - 1]] || {};
    const currencies = Object.keys(DXY_WEIGHTS);

    // Component 30d changes
    const compChanges = currencies.map(cur => {
      const base = firstRates[cur] || 1;
      const curr = lastRates[cur] || base;
      const changePct = -((curr / base - 1) * 100); // negative because USD strengthening = foreign currency costs more USD
      return { code: cur, weight: DXY_WEIGHTS[cur], changePct: Math.round(changePct * 100) / 100 };
    }).sort((a, b) => b.changePct - a.changePct);

    const componentSeries = currencies.map(cur => ({
      name: cur,
      type: 'line',
      smooth: true,
      symbol: 'none',
      lineStyle: { width: 1.5, opacity: 0.7 },
      itemStyle: { color: DXY_COMPONENT_COLORS[cur] },
      data: dates.map(date => {
        const base = firstRates[cur] || 1;
        const curr = history[date]?.[cur] || base;
        return +((curr / base) * 100).toFixed(3);
      }),
    }));

    const dxyData = dates.map(date => {
      let weighted = 0;
      for (const [cur, weight] of Object.entries(DXY_WEIGHTS)) {
        const base = firstRates[cur] || 1;
        const curr = history[date]?.[cur] || base;
        weighted += weight * (curr / base);
      }
      return +(weighted * 100).toFixed(3);
    });

    const latest = dxyData[dxyData.length - 1];
    const first = dxyData[0];
    const change = first ? Math.round((latest / first - 1) * 1000) / 10 : null;

    const option = {
      animation: false,
      backgroundColor: 'transparent',
      grid: { top: 40, right: 24, bottom: 54, left: 54 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
        formatter: params => {
          const date = params[0]?.axisValue;
          const lines = params.map(p =>
            `<span style="color:${p.color}">●</span> ${p.seriesName}: ${Number(p.value).toFixed(2)}`
          );
          return `<div style="font-size:11px"><b>${date}</b><br/>${lines.join('<br/>')}</div>`;
        },
      },
      legend: {
        data: ['DXY Proxy', ...currencies],
        top: 4,
        textStyle: { color: colors.textSecondary, fontSize: 10 },
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: colors.textMuted, fontSize: 10, rotate: 30 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        name: 'Index (start = 100)',
        nameTextStyle: { color: colors.textMuted, fontSize: 10 },
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: v => v.toFixed(1) },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [
        {
          name: 'DXY Proxy',
          type: 'line',
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 2.5 },
          itemStyle: { color: DXY_PROXY_COLOR },
          data: dxyData,
        },
        ...componentSeries,
      ],
    };

    return { chartOption: option, dxyLatest: latest, dxy30dChange: change, componentChanges: compChanges };
  }, [history, colors]);

  // FRED 1yr chart: EUR/USD + USD/JPY overlay
  const eurH = fredFxRates?.eurUsd;
  const jpyH = fredFxRates?.usdJpy;
  const fredOption = eurH?.dates?.length >= 10 && jpyH?.dates?.length >= 10 ? {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: {
      data: ['EUR/USD', 'USD/JPY'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    },
    grid: { top: 24, right: 48, bottom: 24, left: 44, containLabel: false },
    xAxis: {
      type: 'category',
      data: eurH.dates,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => v ? v.slice(5) : v, interval: Math.floor(eurH.dates.length / 6) },
    },
    yAxis: [
      { type: 'value', position: 'left', axisLine: { show: false }, splitLine: { lineStyle: { color: colors.cardBg } }, axisLabel: { color: '#10b981', fontSize: 9 } },
      { type: 'value', position: 'right', axisLine: { show: false }, splitLine: { show: false }, axisLabel: { color: '#ef4444', fontSize: 9 } },
    ],
    series: [
      { name: 'EUR/USD', type: 'line', yAxisIndex: 0, data: eurH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#10b981' }, itemStyle: { color: '#10b981' } },
      { name: 'USD/JPY', type: 'line', yAxisIndex: 1, data: jpyH.values, smooth: true, symbol: 'none', lineStyle: { width: 2, color: '#ef4444' }, itemStyle: { color: '#ef4444' } },
    ],
  } : null;

  const strongest = componentChanges[0];
  const weakest = componentChanges[componentChanges.length - 1];
  const maxAbsChange = Math.max(...componentChanges.map(c => Math.abs(c.changePct)), 0.1);

  if (!chartOption) {
    return (
      <div className="fx-panel">
        <div className="fx-panel-header">
          <span className="fx-panel-title">DXY Tracker</span>
          <span className="fx-panel-subtitle">30-day USD proxy index</span>
        </div>
        <div className="fx-loading">Loading historical data…</div>
      </div>
    );
  }

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">DXY Tracker</span>
        <span className="fx-panel-subtitle">USD proxy index · DXY-weighted composite + components · 30d</span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">DXY Proxy</span>
          <span className="fx-kpi-value">{dxyLatest != null ? dxyLatest.toFixed(2) : '—'}</span>
          <span className="fx-kpi-sub">base 100</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">30d Change</span>
          <span className={`fx-kpi-value ${dxy30dChange != null ? (dxy30dChange >= 0 ? 'positive' : 'negative') : ''}`}>
            {dxy30dChange != null ? `${dxy30dChange >= 0 ? '+' : ''}${dxy30dChange.toFixed(1)}%` : '—'}
          </span>
        </div>
        {strongest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Strongest Component</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{strongest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>+{strongest.changePct.toFixed(2)}%</span>
          </div>
        )}
        {weakest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Weakest Component</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{weakest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{weakest.changePct.toFixed(2)}%</span>
          </div>
        )}
      </div>

      {/* Main: DXY chart (wide) + component breakdown (narrow) */}
      <div className="fx-wide-narrow" style={{ marginBottom: 12 }}>
        <div style={{ minHeight: 0, display: 'flex' }}>
          <ReactECharts option={chartOption} style={{ height: '100%', width: '100%' }} />
        </div>
        <div className="fx-chart-panel">
          <div className="fx-chart-title">DXY Component Weights + 30d %</div>
          <div className="fx-comp-list" style={{ marginTop: 4 }}>
            {componentChanges.map(c => {
              const barPct = Math.abs(c.changePct) / maxAbsChange * 100;
              const isPos = c.changePct >= 0;
              return (
                <div key={c.code} className="fx-comp-row">
                  <span className="fx-comp-code" style={{ color: DXY_COMPONENT_COLORS[c.code] }}>{c.code}</span>
                  <span className="fx-comp-weight">{(c.weight * 100).toFixed(1)}%</span>
                  <div className="fx-comp-bar-wrap">
                    <div
                      className="fx-comp-bar-fill"
                      style={{ width: `${barPct}%`, background: isPos ? '#22c55e' : '#ef4444' }}
                    />
                  </div>
                  <span className={`fx-comp-change ${isPos ? 'positive' : 'negative'}`}>
                    {isPos ? '+' : ''}{c.changePct.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FRED 1yr chart */}
      {fredOption && (
        <div className="fx-chart-panel" style={{ height: 170, flexShrink: 0 }}>
          <div className="fx-chart-title">EUR/USD + USD/JPY — 1 Year (FRED daily)</div>
          <div className="fx-mini-chart">
            <ReactECharts option={fredOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/fx/components/DXYTracker.jsx
git commit -m "feat(fx): DXYTracker dense layout — KPI strip, component breakdown, FRED 1yr chart"
```

---

### Task 8: TopMovers Enrichment — KPI Strip + G10/EM Comparison

**Files:**
- Modify: `src/markets/fx/components/TopMovers.jsx`

- [ ] **Step 1: Rewrite TopMovers with KPI strip + G10/EM bars**

Replace the entire `TopMovers.jsx` with:

```jsx
// src/markets/fx/components/TopMovers.jsx
import React, { useMemo } from 'react';
import './FXComponents.css';

const MOVER_CURRENCIES = [
  'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD', 'SEK',
  'NOK', 'NZD', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR',
];

const G10 = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'NZD'];
const EM  = ['CNY', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR'];

function Sparkline({ values }) {
  if (!values || values.length < 2) return <span className="mover-spark" />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.001;
  const W = 48, H = 16;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} className="mover-spark">
      <polyline points={pts} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function fmtPct(val, digits = 3) {
  if (val == null) return '—';
  return (val >= 0 ? '+' : '') + val.toFixed(digits) + '%';
}

export default function TopMovers({
  changes,
  changes1w = {},
  changes1m = {},
  sparklines = {},
  cotData = {},
}) {
  const movers = useMemo(() => {
    return MOVER_CURRENCIES
      .filter(c => changes[c] != null)
      .map(c => ({
        code: c,
        changePct: changes[c],
        change1w: changes1w[c] ?? null,
        change1m: changes1m[c] ?? null,
        spark: sparklines[c] ?? null,
        cotPct: cotData[c] ?? null,
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  }, [changes, changes1w, changes1m, sparklines, cotData]);

  const maxAbs = movers.length > 0 ? Math.max(...movers.map(m => Math.abs(m.changePct))) : 1;

  // KPI computations
  const strongest = movers.length ? movers.reduce((best, m) => m.changePct > best.changePct ? m : best, movers[0]) : null;
  const weakest   = movers.length ? movers.reduce((worst, m) => m.changePct < worst.changePct ? m : worst, movers[0]) : null;
  const avgMag    = movers.length ? movers.reduce((s, m) => s + Math.abs(m.changePct), 0) / movers.length : 0;
  const bigMovers = movers.filter(m => Math.abs(m.changePct) > 0.3).length;

  // G10 vs EM avg
  const g10Avg = (() => {
    const g10Movers = movers.filter(m => G10.includes(m.code));
    return g10Movers.length ? g10Movers.reduce((s, m) => s + m.changePct, 0) / g10Movers.length : 0;
  })();
  const emAvg = (() => {
    const emMovers = movers.filter(m => EM.includes(m.code));
    return emMovers.length ? emMovers.reduce((s, m) => s + m.changePct, 0) / emMovers.length : 0;
  })();

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Top Movers</span>
        <span className="fx-panel-subtitle">
          vs USD · sorted by 24h magnitude · green = currency strengthened
        </span>
      </div>

      {/* KPI Strip */}
      <div className="fx-kpi-strip">
        {strongest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Strongest</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{strongest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#22c55e' }}>{fmtPct(strongest.changePct)}</span>
          </div>
        )}
        {weakest && (
          <div className="fx-kpi-pill">
            <span className="fx-kpi-label">Weakest</span>
            <span className="fx-kpi-value" style={{ color: '#f59e0b' }}>{weakest.code}</span>
            <span className="fx-kpi-sub" style={{ color: '#ef4444' }}>{fmtPct(weakest.changePct)}</span>
          </div>
        )}
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Avg Magnitude</span>
          <span className="fx-kpi-value">{avgMag.toFixed(3)}%</span>
        </div>
        <div className="fx-kpi-pill">
          <span className="fx-kpi-label">Big Moves (>0.3%)</span>
          <span className="fx-kpi-value">{bigMovers}</span>
          <span className="fx-kpi-sub">of {movers.length} tracked</span>
        </div>
      </div>

      {/* Movers list */}
      <div className="movers-list">
        {movers.map((m, i) => {
          const is24hPos = m.changePct >= 0;
          const is1wPos  = m.change1w != null && m.change1w >= 0;
          const is1mPos  = m.change1m != null && m.change1m >= 0;
          const barPct   = maxAbs > 0 ? Math.abs(m.changePct) / maxAbs * 100 : 0;
          const cotClass = m.cotPct == null ? '' : m.cotPct > 5 ? 'flow-bullish' : m.cotPct < -5 ? 'flow-bearish' : 'flow-neutral';

          return (
            <div key={m.code} className="mover-row">
              <span className="mover-rank">#{i + 1}</span>
              <span className="mover-code">{m.code}</span>
              <span className="mover-pair">vs USD</span>
              <div className="mover-bar-wrap">
                <div
                  className={`mover-bar ${is24hPos ? 'positive' : 'negative'}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <span className={`mover-pct ${is24hPos ? 'positive' : 'negative'}`}>
                {is24hPos ? '+' : ''}{m.changePct.toFixed(3)}%
              </span>
              <span className={`mover-1w ${m.change1w == null ? '' : is1wPos ? 'positive' : 'negative'}`}>
                {fmtPct(m.change1w)}
              </span>
              <span className={`mover-1m ${m.change1m == null ? '' : is1mPos ? 'positive' : 'negative'}`}>
                {fmtPct(m.change1m)}
              </span>
              <Sparkline values={m.spark} />
              {Object.keys(cotData).length > 0 && (
                <span className={`mover-cot ${cotClass}`}>
                  {m.cotPct == null ? '—' : fmtPct(m.cotPct, 1)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* G10 vs EM comparison */}
      <div className="fx-chart-panel" style={{ flexShrink: 0, marginTop: 12 }}>
        <div className="fx-chart-title">G10 vs Emerging Market Currencies — Avg 24h vs USD</div>
        <div className="fx-group-bars">
          <div className="fx-group-item">
            <span className="fx-group-label">G10 Avg</span>
            <span className={`fx-group-value ${g10Avg >= 0 ? 'positive' : 'negative'}`}>
              {g10Avg >= 0 ? '+' : ''}{g10Avg.toFixed(3)}%
            </span>
          </div>
          <div className="fx-group-divider" />
          <div className="fx-group-item">
            <span className="fx-group-label">EM Avg</span>
            <span className={`fx-group-value ${emAvg >= 0 ? 'positive' : 'negative'}`}>
              {emAvg >= 0 ? '+' : ''}{emAvg.toFixed(3)}%
            </span>
          </div>
          <div className="fx-group-divider" />
          <div className="fx-group-item">
            <span className="fx-group-label">G10 − EM Spread</span>
            <span className={`fx-group-value ${(g10Avg - emAvg) >= 0 ? 'positive' : 'negative'}`}>
              {(g10Avg - emAvg) >= 0 ? '+' : ''}{(g10Avg - emAvg).toFixed(3)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/markets/fx/components/TopMovers.jsx
git commit -m "feat(fx): TopMovers dense layout — KPI strip + G10 vs EM comparison"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Server `/api/fx` endpoint with FRED bilateral rates — Task 1
- ✅ Mock data + hook fetch — Task 2
- ✅ CSS dense-layout styles — Task 3
- ✅ Market shell props — Task 4
- ✅ RateMatrix: KPI strip + USD strength bars — Task 5
- ✅ CarryMap: KPI strip + central bank rate bars — Task 6
- ✅ DXYTracker: KPI strip + component breakdown + FRED 1yr chart — Task 7
- ✅ TopMovers: KPI strip + G10/EM comparison — Task 8

**Placeholder scan:** No TBD/TODO/placeholder content found.

**Type consistency:**
- `fredFxRates` shape consistent across Tasks 1→2→4→7
- `changes` prop consistent across Tasks 4→5
- All `colors` references use `useTheme()` — no shadowing
- DXY component change calculation uses same sign convention as TopMovers (positive = currency strengthened vs USD)
