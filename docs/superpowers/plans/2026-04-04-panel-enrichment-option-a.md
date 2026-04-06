# Panel Enrichment — Option A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fill four currently-sparse panels with live or computed data: FX TopMovers gets 1W/1M change columns + 7-day sparklines + CFTC COT positioning; Bonds DurationLadder gets Treasury avg interest rates per bucket; Derivatives VolSurface gets ATM 1M IV vs 30d realized vol premium row.

**Architecture:** Tasks 1 & 2 are sequential (both touch TopMovers.jsx). Tasks 3 & 4 are independent but run after 1 & 2 for merge simplicity. FX data stays client-side (Frankfurter, CFTC). Treasury rates and vol premium are server-side (Express `/api/bonds` and `/api/derivatives`).

**Tech Stack:** React 18, Vitest + @testing-library/react, Express, yahoo-finance2, node `https` module (`fetchJSON` helper), Frankfurter public API, CFTC Socrata API, US Treasury Fiscal Data API.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `src/markets/fx/data/useFXData.js` | Modify | Add 2 new Frankfurter fetches (7d all-currencies range, 30d single-date snapshot); compute `changes1w`, `changes1m`, `sparklines` |
| `src/markets/fx/components/TopMovers.jsx` | Modify (Task 1) | Add 1W/1M columns + inline SVG sparkline; add COT column (Task 2) |
| `src/markets/fx/components/FXComponents.css` | Modify | New column CSS for 1W, 1M, sparkline, COT |
| `src/markets/fx/FXMarket.jsx` | Modify (Task 2) | Import `useCOTData`; pass `cotData` + new change props to TopMovers |
| `src/markets/fx/data/useCOTData.js` | Create | Hook: fetch CFTC Socrata, compute net speculative % per currency |
| `server/index.js` | Modify (Task 3+4) | Add Treasury avg rates to `/api/bonds`; add vol premium calc to `/api/derivatives` |
| `src/markets/bonds/data/useBondsData.js` | Modify (Task 3) | Add `treasuryRates` state + setter |
| `src/markets/bonds/BondsMarket.jsx` | Modify (Task 3) | Pass `treasuryRates` to DurationLadder |
| `src/markets/bonds/components/DurationLadder.jsx` | Modify (Task 3) | Render avg rate pills per bucket when data present |
| `src/markets/bonds/components/BondsComponents.css` | Modify (Task 3) | New `.dur-rate-pill` styles |
| `src/markets/derivatives/data/useDerivativesData.js` | Modify (Task 4) | Add `volPremium` state + setter |
| `src/markets/derivatives/DerivativesMarket.jsx` | Modify (Task 4) | Pass `volPremium` to VolSurface |
| `src/markets/derivatives/components/VolSurface.jsx` | Modify (Task 4) | Render vol premium stats row when data present |
| `src/markets/derivatives/components/DerivComponents.css` | Modify (Task 4) | New `.vol-premium-row` styles |
| `src/__tests__/fx/useFXData.test.js` | Modify (Task 1) | Add describe block for new fields; update mock to handle 5 fetches |
| `src/__tests__/fx/TopMovers.test.jsx` | Create (Task 1) | Tests for 1W/1M columns, sparklines |
| `src/__tests__/fx/useCOTData.test.js` | Create (Task 2) | Tests for CFTC fetch, net spec % calc |
| `src/__tests__/bonds/DurationLadder.test.jsx` | Create (Task 3) | Tests for backward compat + rate pills |
| `src/__tests__/derivatives/VolSurface.test.jsx` | Create (Task 4) | Tests for backward compat + vol premium row |

---

## Task 1: FX TopMovers — 1W/1M Change Columns + Sparklines

**Files:**
- Modify: `src/markets/fx/data/useFXData.js`
- Modify: `src/markets/fx/components/TopMovers.jsx`
- Modify: `src/markets/fx/components/FXComponents.css`
- Modify: `src/markets/fx/FXMarket.jsx` (pass new props)
- Modify: `src/__tests__/fx/useFXData.test.js`
- Create: `src/__tests__/fx/TopMovers.test.jsx`

### Context

`useFXData.js` currently runs 3 Frankfurter fetches in a `Promise.all`:
- `[0]` `/v1/latest?base=USD` → `spotRates`
- `[1]` `/v1/{yesterday}?base=USD` → `prevRates`  
- `[2]` `/v1/{30d-ago}..{today}?base=USD&symbols=EUR,GBP,JPY,CAD,SEK,CHF` → `history` (DXY only)

`TopMovers.jsx` receives `changes` (24h, negated so positive = currency strengthened) and renders 17 currencies sorted by absolute move.

`FXMarket.jsx` currently: `<TopMovers changes={changes} />`.

**Frankfurter 7d range format:**
```
GET /v1/2025-03-27..2025-04-03?base=USD&symbols=EUR,GBP,JPY,...
→ { rates: { '2025-03-27': { EUR: 0.91, JPY: 151.0, ... }, '2025-03-28': {...}, ... } }
```
Only business days are returned (4–5 dates for a 7-day window).

**Sparkline convention:** plot negated % change from day 1 of the 7d window → up = currency strengthened (same sign as `changePct` in the UI).

- [ ] **Step 1: Write the failing TopMovers tests**

Create `src/__tests__/fx/TopMovers.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopMovers from '../../markets/fx/components/TopMovers';

const BASE_CHANGES = { EUR: -0.5, GBP: 0.3, JPY: 0.1 };

describe('TopMovers', () => {
  it('renders rows for currencies present in changes', () => {
    render(<TopMovers changes={BASE_CHANGES} />);
    expect(screen.getByText('EUR')).toBeInTheDocument();
    expect(screen.getByText('GBP')).toBeInTheDocument();
  });

  it('sorts by absolute change magnitude', () => {
    render(<TopMovers changes={BASE_CHANGES} />);
    const codes = screen.getAllByText(/^(EUR|GBP|JPY)$/).map(el => el.textContent);
    // EUR: changePct = +0.5, GBP: -0.3, JPY: -0.1 → EUR first
    expect(codes[0]).toBe('EUR');
  });

  describe('with 1W/1M data', () => {
    it('shows positive 1W value with + prefix', () => {
      render(
        <TopMovers
          changes={BASE_CHANGES}
          changes1w={{ EUR: 1.2, GBP: -0.8, JPY: 0.5 }}
          changes1m={{ EUR: 3.5, GBP: -2.1, JPY: 1.0 }}
        />
      );
      expect(screen.getByText('+1.200%')).toBeInTheDocument();
    });

    it('shows negative 1W value without + prefix', () => {
      render(
        <TopMovers
          changes={BASE_CHANGES}
          changes1w={{ EUR: 1.2, GBP: -0.8, JPY: 0.5 }}
          changes1m={{ EUR: 3.5, GBP: -2.1, JPY: 1.0 }}
        />
      );
      expect(screen.getByText('-0.800%')).toBeInTheDocument();
    });

    it('shows dash for missing 1W currency', () => {
      render(
        <TopMovers
          changes={{ JPY: 0.2 }}
          changes1w={{}}
          changes1m={{}}
        />
      );
      const dashes = screen.getAllByText('—');
      expect(dashes.length).toBeGreaterThanOrEqual(2); // 1W + 1M both missing
    });
  });

  describe('with sparklines', () => {
    it('renders SVG when sparkline data provided for a currency', () => {
      const sparklines = { EUR: [-0.1, 0.2, 0.3, 0.5, 0.4] };
      const { container } = render(
        <TopMovers changes={BASE_CHANGES} sparklines={sparklines} />
      );
      expect(container.querySelector('svg')).toBeTruthy();
    });

    it('renders no SVG when sparklines is empty', () => {
      const { container } = render(
        <TopMovers changes={BASE_CHANGES} sparklines={{}} />
      );
      expect(container.querySelector('svg')).toBeFalsy();
    });

    it('renders no SVG when sparkline has fewer than 2 points', () => {
      const { container } = render(
        <TopMovers changes={BASE_CHANGES} sparklines={{ EUR: [0.5] }} />
      );
      expect(container.querySelector('svg')).toBeFalsy();
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/__tests__/fx/TopMovers.test.jsx
```
Expected: FAIL — `TopMovers.test.jsx` not found / components missing new props.

- [ ] **Step 3: Add 5-fetch logic to useFXData.js**

Replace the contents of `src/markets/fx/data/useFXData.js` with:

```javascript
import { useState, useEffect } from 'react';
import { exchangeRates } from '../../../utils/constants';

const DXY_SYMBOLS = 'EUR,GBP,JPY,CAD,SEK,CHF';
const MOVER_SYMBOLS = 'EUR,GBP,JPY,CNY,CHF,AUD,CAD,SEK,NOK,NZD,HKD,SGD,INR,KRW,MXN,BRL,ZAR';
const HISTORY_DAYS = 30;

function getDateStr(daysAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export function useFXData() {
  const fallback = { USD: 1, ...exchangeRates };
  const [spotRates,   setSpotRates]   = useState(fallback);
  const [prevRates,   setPrevRates]   = useState(fallback);
  const [history,     setHistory]     = useState({});
  const [changes1w,   setChanges1w]   = useState({});
  const [changes1m,   setChanges1m]   = useState({});
  const [sparklines,  setSparklines]  = useState({});
  const [isLive,      setIsLive]      = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLoading,   setIsLoading]   = useState(true);

  useEffect(() => {
    const today      = getDateStr(0);
    const yesterday  = getDateStr(1);
    const startDate  = getDateStr(HISTORY_DAYS);
    const sevenAgo   = getDateStr(7);
    const thirtyAgo  = getDateStr(HISTORY_DAYS);

    Promise.all([
      fetch('https://api.frankfurter.dev/v1/latest?base=USD')
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${yesterday}?base=USD`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${startDate}..${today}?base=USD&symbols=${DXY_SYMBOLS}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${sevenAgo}..${today}?base=USD&symbols=${MOVER_SYMBOLS}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(`https://api.frankfurter.dev/v1/${thirtyAgo}?base=USD&symbols=${MOVER_SYMBOLS}`)
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    ])
      .then(([latest, prev, hist, weekHist, month30]) => {
        let spot = fallback;
        if (latest?.rates) {
          spot = { USD: 1, ...latest.rates };
          setSpotRates(spot);
          setIsLive(true);
          setLastUpdated(latest.date || today);
        }
        if (prev?.rates)  setPrevRates({ USD: 1, ...prev.rates });
        if (hist?.rates)  setHistory(hist.rates);

        // 1W changes and sparklines from 7-day range
        if (weekHist?.rates) {
          const sortedDates = Object.keys(weekHist.rates).sort();
          if (sortedDates.length >= 2) {
            const firstRates = weekHist.rates[sortedDates[0]];
            const lastRates  = weekHist.rates[sortedDates[sortedDates.length - 1]];
            const w = {};
            const sparks = {};
            Object.keys(lastRates).forEach(code => {
              const base = firstRates[code];
              if (!base) return;
              // Negate: positive = currency strengthened vs USD
              w[code] = -((lastRates[code] - base) / base * 100);
              sparks[code] = sortedDates
                .map(d => {
                  const rate = weekHist.rates[d]?.[code];
                  return rate != null ? -((rate - base) / base * 100) : null;
                })
                .filter(v => v != null);
            });
            setChanges1w(w);
            setSparklines(sparks);
          }
        }

        // 1M changes from 30-day single-date snapshot
        if (month30?.rates) {
          const m = {};
          Object.keys(spot).forEach(code => {
            if (code === 'USD') return;
            const prev30 = month30.rates[code] || spot[code];
            if (prev30) m[code] = -((spot[code] - prev30) / prev30 * 100);
          });
          setChanges1m(m);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  // 24h changes: positive = currency strengthened vs USD
  const changes = Object.keys(spotRates).reduce((acc, code) => {
    if (code === 'USD') return { ...acc, [code]: 0 };
    const prev = prevRates[code] || spotRates[code];
    acc[code] = prev ? -((spotRates[code] - prev) / prev * 100) : 0;
    return acc;
  }, {});

  return { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, isLive, lastUpdated, isLoading };
}
```

- [ ] **Step 4: Add inline SVG sparkline helper + update TopMovers.jsx**

Replace the contents of `src/markets/fx/components/TopMovers.jsx` with:

```jsx
// src/markets/fx/components/TopMovers.jsx
import React, { useMemo } from 'react';
import './FXComponents.css';

const MOVER_CURRENCIES = [
  'EUR', 'GBP', 'JPY', 'CNY', 'CHF', 'AUD', 'CAD', 'SEK',
  'NOK', 'NZD', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR',
];

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
      <polyline
        points={pts}
        fill="none"
        stroke={isUp ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
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
        changePct:  -(changes[c]),
        change1w:   changes1w[c]  ?? null,
        change1m:   changes1m[c]  ?? null,
        spark:      sparklines[c] ?? null,
        cotPct:     cotData[c]    ?? null,
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
  }, [changes, changes1w, changes1m, sparklines, cotData]);

  const maxAbs = movers.length > 0
    ? Math.max(...movers.map(m => Math.abs(m.changePct)))
    : 1;

  function fmtPct(val, digits = 3) {
    if (val == null) return '—';
    return (val >= 0 ? '+' : '') + val.toFixed(digits) + '%';
  }

  return (
    <div className="fx-panel">
      <div className="fx-panel-header">
        <span className="fx-panel-title">Top Movers</span>
        <span className="fx-panel-subtitle">
          vs USD · sorted by 24h magnitude · green = currency strengthened
        </span>
      </div>
      <div className="movers-list">
        {movers.map((m, i) => {
          const is24hPos  = m.changePct >= 0;
          const is1wPos   = m.change1w  != null && m.change1w  >= 0;
          const is1mPos   = m.change1m  != null && m.change1m  >= 0;
          const barPct    = maxAbs > 0 ? Math.abs(m.changePct) / maxAbs * 100 : 0;
          const cotClass  = m.cotPct == null ? '' : m.cotPct > 5 ? 'flow-bullish' : m.cotPct < -5 ? 'flow-bearish' : 'flow-neutral';

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
    </div>
  );
}
```

- [ ] **Step 5: Add CSS for new columns in FXComponents.css**

Append to `src/markets/fx/components/FXComponents.css`:

```css
/* TopMovers — 1W / 1M change columns */
.mover-1w,
.mover-1m {
  font-size: 11px;
  font-weight: 500;
  min-width: 60px;
  text-align: right;
  color: #64748b;
}
.mover-1w.positive, .mover-1m.positive { color: #22c55e; }
.mover-1w.negative, .mover-1m.negative { color: #ef4444; }

/* TopMovers — inline SVG sparkline */
.mover-spark {
  min-width: 52px;
  display: flex;
  align-items: center;
}

/* TopMovers — COT positioning column (added in Task 2) */
.mover-cot {
  font-size: 11px;
  font-weight: 500;
  min-width: 64px;
  text-align: right;
}
```

- [ ] **Step 6: Update FXMarket.jsx to pass new props**

In `src/markets/fx/FXMarket.jsx`, update the destructure and the TopMovers line:

Change:
```jsx
const { spotRates, prevRates, changes, history, isLive, lastUpdated, isLoading } = useFXData();
```
To:
```jsx
const { spotRates, prevRates, changes, changes1w, changes1m, sparklines, history, isLive, lastUpdated, isLoading } = useFXData();
```

Change:
```jsx
{activeTab === 'top-movers'  && <TopMovers changes={changes} />}
```
To:
```jsx
{activeTab === 'top-movers'  && <TopMovers changes={changes} changes1w={changes1w} changes1m={changes1m} sparklines={sparklines} />}
```

- [ ] **Step 7: Update useFXData.test.js — extend mock to handle 5 fetches**

In `src/__tests__/fx/useFXData.test.js`, update the mock inside the outer `beforeEach` to add the 7d range response, and add a new `describe` block. Replace the entire file with:

```javascript
import { renderHook, waitFor } from '@testing-library/react';
import { useFXData } from '../../markets/fx/data/useFXData';

const WEEK_RATES = {
  '2025-03-28': { EUR: 0.90, GBP: 0.77, JPY: 148.0, CAD: 1.33, SEK: 10.2, CHF: 0.87,
                  AUD: 1.55, CNY: 7.25, NOK: 10.8, NZD: 1.69, HKD: 7.78, SGD: 1.34,
                  INR: 83.5, KRW: 1350, MXN: 17.0, BRL: 5.05, ZAR: 18.2 },
  '2025-03-31': { EUR: 0.91, GBP: 0.78, JPY: 149.0, CAD: 1.34, SEK: 10.3, CHF: 0.88,
                  AUD: 1.56, CNY: 7.26, NOK: 10.9, NZD: 1.70, HKD: 7.79, SGD: 1.35,
                  INR: 83.6, KRW: 1355, MXN: 17.1, BRL: 5.06, ZAR: 18.3 },
  '2025-04-01': { EUR: 0.92, GBP: 0.79, JPY: 150.0, CAD: 1.35, SEK: 10.4, CHF: 0.89,
                  AUD: 1.57, CNY: 7.27, NOK: 11.0, NZD: 1.71, HKD: 7.80, SGD: 1.36,
                  INR: 83.7, KRW: 1360, MXN: 17.2, BRL: 5.07, ZAR: 18.4 },
};

describe('useFXData', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      // 7-day mover range (symbols includes BRL)
      if (url.includes('..') && url.includes('BRL')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ base: 'USD', rates: WEEK_RATES }),
        });
      }
      // 30-day DXY history range
      if (url.includes('..')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            rates: {
              '2024-12-16': { EUR: 0.91, GBP: 0.78, JPY: 149.0, CAD: 1.34, SEK: 10.3, CHF: 0.88 },
              '2024-12-17': { EUR: 0.93, GBP: 0.80, JPY: 152.0, CAD: 1.36, SEK: 10.5, CHF: 0.90 },
            },
          }),
        });
      }
      // Latest endpoint
      if (url.includes('/latest')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            base: 'USD',
            date: '2025-04-03',
            rates: { EUR: 0.93, GBP: 0.80, JPY: 152.0, CAD: 1.36, SEK: 10.5, CHF: 0.90,
                     AUD: 1.58, CNY: 7.28, NOK: 11.1, NZD: 1.72, HKD: 7.81, SGD: 1.37,
                     INR: 83.8, KRW: 1365, MXN: 17.3, BRL: 5.08, ZAR: 18.5 },
          }),
        });
      }
      // Single-date fallback (yesterday and 30d-ago snapshot)
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          base: 'USD',
          date: '2025-04-02',
          rates: { EUR: 0.91, GBP: 0.78, JPY: 149.0, CAD: 1.34, SEK: 10.3, CHF: 0.88,
                   AUD: 1.55, CNY: 7.25, NOK: 10.8, NZD: 1.69, HKD: 7.78, SGD: 1.34,
                   INR: 83.5, KRW: 1350, MXN: 17.0, BRL: 5.05, ZAR: 18.2 },
        }),
      });
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('starts with static fallback rates before fetch resolves', () => {
    const { result } = renderHook(() => useFXData());
    expect(result.current.spotRates.USD).toBe(1);
    expect(typeof result.current.spotRates.EUR).toBe('number');
  });

  it('sets isLive true after successful fetch', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
  });

  it('updates spotRates from API response', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.spotRates.EUR).toBe(0.93);
    expect(result.current.spotRates.JPY).toBe(152.0);
  });

  it('computes a changes object with one key per currency', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(typeof result.current.changes.EUR).toBe('number');
    expect(result.current.changes.USD).toBe(0);
  });

  it('computes non-zero changes when spot and prev rates differ', async () => {
    const { result } = renderHook(() => useFXData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // EUR: spot=0.93, prev=0.91 → negated change = -((0.93-0.91)/0.91*100) ≈ -2.198%
    expect(result.current.changes.EUR).toBeCloseTo(-2.198, 1);
  });

  describe('changes1w and sparklines from 7d range', () => {
    it('computes changes1w for EUR from 7d range', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      // EUR: first=0.90, last=0.92 → negated = -((0.92-0.90)/0.90*100) ≈ -2.222%
      expect(result.current.changes1w.EUR).toBeCloseTo(-2.222, 1);
    });

    it('returns sparklines array with length equal to number of dates', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      expect(result.current.sparklines.EUR).toHaveLength(3);
    });

    it('sparklines first value is 0 (normalized from base)', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      expect(result.current.sparklines.EUR[0]).toBe(0);
    });
  });

  describe('changes1m from 30d single-date snapshot', () => {
    it('computes changes1m for EUR using single-date snapshot', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLive).toBe(true));
      // EUR: spot=0.93, month30=0.91 → negated = -((0.93-0.91)/0.91*100) ≈ -2.198%
      expect(result.current.changes1m.EUR).toBeCloseTo(-2.198, 1);
    });
  });

  describe('on network error', () => {
    beforeEach(() => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    });
    afterEach(() => vi.restoreAllMocks());

    it('keeps static fallback and isLive false', async () => {
      const { result } = renderHook(() => useFXData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isLive).toBe(false);
      expect(result.current.spotRates.USD).toBe(1);
    });
  });
});
```

- [ ] **Step 8: Run all tests**

```
npx vitest run src/__tests__/fx/
```
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/markets/fx/data/useFXData.js \
        src/markets/fx/components/TopMovers.jsx \
        src/markets/fx/components/FXComponents.css \
        src/markets/fx/FXMarket.jsx \
        src/__tests__/fx/useFXData.test.js \
        src/__tests__/fx/TopMovers.test.jsx
git commit -m "feat(fx): TopMovers 1W/1M columns, 7-day sparklines via Frankfurter"
```

---

## Task 2: FX TopMovers — CFTC COT Speculative Positioning Column

**Files:**
- Create: `src/markets/fx/data/useCOTData.js`
- Modify: `src/markets/fx/FXMarket.jsx`
- Modify: `src/markets/fx/components/TopMovers.jsx` (minor — COT column is already rendered when `cotData` is non-empty, per Task 1 code above)
- Create: `src/__tests__/fx/useCOTData.test.js`

### Context

CFTC Commitments of Traders (COT) is published weekly (Fridays, reporting Tuesday's positions). The Socrata endpoint is CORS-enabled and free.

**API:**
```
GET https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=6
```

Each row is one futures contract for the most recent reporting week. The `market_and_exchange_names` field contains strings like `"EURO FX - CHICAGO MERCANTILE EXCHANGE"`.

**Net speculative %:**
```
netSpecPct = (noncomm_long - noncomm_short) / open_interest * 100
```
Positive = specs net long the foreign currency = bullish on that currency vs USD.

**Mapping (name fragment → currency code):**
- `"EURO FX"` → EUR
- `"JAPANESE YEN"` → JPY
- `"BRITISH POUND"` → GBP
- `"CANADIAN DOLLAR"` → CAD
- `"SWISS FRANC"` → CHF
- `"AUSTRALIAN DOLLAR"` → AUD

Only these 6 currencies appear in IMM FX futures. All others show "—".

- [ ] **Step 1: Write failing useCOTData tests**

Create `src/__tests__/fx/useCOTData.test.js`:

```javascript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCOTData } from '../../markets/fx/data/useCOTData';

const MOCK_CFTC = [
  {
    report_date_as_yyyy_mm_dd: '2025-04-01',
    market_and_exchange_names: 'EURO FX - CHICAGO MERCANTILE EXCHANGE',
    noncomm_positions_long_all:  '200000',
    noncomm_positions_short_all: '80000',
    open_interest_all:           '600000',
  },
  {
    report_date_as_yyyy_mm_dd: '2025-04-01',
    market_and_exchange_names: 'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE',
    noncomm_positions_long_all:  '50000',
    noncomm_positions_short_all: '150000',
    open_interest_all:           '400000',
  },
  {
    report_date_as_yyyy_mm_dd: '2025-04-01',
    market_and_exchange_names: 'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE',
    noncomm_positions_long_all:  '30000',
    noncomm_positions_short_all: '30000',
    open_interest_all:           '200000',
  },
];

describe('useCOTData', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(MOCK_CFTC),
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it('starts with isLive false', () => {
    const { result } = renderHook(() => useCOTData());
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true after successful fetch', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
  });

  it('computes positive netSpecPct for EUR (net long)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // (200000 - 80000) / 600000 * 100 = 20%
    expect(result.current.cotData.EUR).toBeCloseTo(20.0, 1);
  });

  it('computes negative netSpecPct for JPY (net short)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // (50000 - 150000) / 400000 * 100 = -25%
    expect(result.current.cotData.JPY).toBeCloseTo(-25.0, 1);
  });

  it('computes zero netSpecPct for GBP (balanced)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // (30000 - 30000) / 200000 * 100 = 0%
    expect(result.current.cotData.GBP).toBeCloseTo(0.0, 1);
  });

  it('returns undefined for currencies not in CFTC (e.g. SEK)', async () => {
    const { result } = renderHook(() => useCOTData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.cotData.SEK).toBeUndefined();
  });

  describe('on network error', () => {
    beforeEach(() => {
      vi.spyOn(global, 'fetch').mockRejectedValue(new Error('network'));
    });
    afterEach(() => vi.restoreAllMocks());

    it('keeps cotData as empty object and isLive false', async () => {
      const { result } = renderHook(() => useCOTData());
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isLive).toBe(false);
      expect(result.current.cotData).toEqual({});
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```
npx vitest run src/__tests__/fx/useCOTData.test.js
```
Expected: FAIL — `useCOTData` not found.

- [ ] **Step 3: Create useCOTData.js**

Create `src/markets/fx/data/useCOTData.js`:

```javascript
import { useState, useEffect } from 'react';

const CFTC_URL =
  'https://publicreporting.cftc.gov/resource/jun7-fc8e.json' +
  '?$select=report_date_as_yyyy_mm_dd,market_and_exchange_names,' +
  'noncomm_positions_long_all,noncomm_positions_short_all,open_interest_all' +
  '&$order=report_date_as_yyyy_mm_dd%20DESC&$limit=6';

const NAME_MAP = {
  EUR: 'EURO FX',
  JPY: 'JAPANESE YEN',
  GBP: 'BRITISH POUND',
  CAD: 'CANADIAN DOLLAR',
  CHF: 'SWISS FRANC',
  AUD: 'AUSTRALIAN DOLLAR',
};

export function useCOTData() {
  const [cotData,    setCotData]    = useState({});
  const [isLive,     setIsLive]     = useState(false);
  const [isLoading,  setIsLoading]  = useState(true);

  useEffect(() => {
    fetch(CFTC_URL)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(rows => {
        const result = {};
        Object.entries(NAME_MAP).forEach(([code, needle]) => {
          const row = rows.find(r => r.market_and_exchange_names?.includes(needle));
          if (row) {
            const long  = parseFloat(row.noncomm_positions_long_all)  || 0;
            const short = parseFloat(row.noncomm_positions_short_all) || 0;
            const oi    = parseFloat(row.open_interest_all) || 1;
            result[code] = Math.round((long - short) / oi * 100 * 10) / 10;
          }
        });
        setCotData(result);
        setIsLive(true);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { cotData, isLive, isLoading };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```
npx vitest run src/__tests__/fx/useCOTData.test.js
```
Expected: 7 tests pass.

- [ ] **Step 5: Update FXMarket.jsx to wire useCOTData**

In `src/markets/fx/FXMarket.jsx`:

Add import after the `useFXData` import:
```jsx
import { useCOTData } from './data/useCOTData';
```

Inside the `FXMarket` function body, after the `useFXData` destructure line, add:
```jsx
const { cotData } = useCOTData();
```

Change:
```jsx
{activeTab === 'top-movers'  && <TopMovers changes={changes} changes1w={changes1w} changes1m={changes1m} sparklines={sparklines} />}
```
To:
```jsx
{activeTab === 'top-movers'  && <TopMovers changes={changes} changes1w={changes1w} changes1m={changes1m} sparklines={sparklines} cotData={cotData} />}
```

- [ ] **Step 6: Run full fx test suite**

```
npx vitest run src/__tests__/fx/
```
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/markets/fx/data/useCOTData.js \
        src/markets/fx/FXMarket.jsx \
        src/__tests__/fx/useCOTData.test.js
git commit -m "feat(fx): TopMovers CFTC COT net speculative positioning column"
```

---

## Task 3: Bonds DurationLadder — Treasury Avg Interest Rates

**Files:**
- Modify: `server/index.js`
- Modify: `src/markets/bonds/data/useBondsData.js`
- Modify: `src/markets/bonds/BondsMarket.jsx`
- Modify: `src/markets/bonds/components/DurationLadder.jsx`
- Modify: `src/markets/bonds/components/BondsComponents.css`
- Create: `src/__tests__/bonds/DurationLadder.test.jsx`

### Context

The US Treasury Fiscal Data API returns average interest rates by security type. No auth needed, CORS-enabled.

**Endpoint:**
```
GET https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates
  ?filter=security_type_desc:eq:Marketable
  &fields=record_date,security_desc,avg_interest_rate_amt
  &sort=-record_date
  &page[size]=20
```

**Response shape:**
```json
{
  "data": [
    { "record_date": "2025-03-31", "security_desc": "Treasury Bills",  "avg_interest_rate_amt": "4.823" },
    { "record_date": "2025-03-31", "security_desc": "Treasury Notes",  "avg_interest_rate_amt": "3.987" },
    { "record_date": "2025-03-31", "security_desc": "Treasury Bonds",  "avg_interest_rate_amt": "4.421" },
    ...
  ]
}
```

**Bucket mapping:**
- `'0–2y'` ← `"Treasury Bills"` avg rate
- `'2–5y'` ← `"Treasury Notes"` avg rate
- `'5–10y'` ← `"Treasury Notes"` avg rate (same, notes span 2–10y)
- `'10y+'` ← `"Treasury Bonds"` avg rate

Note: bucket keys use en-dash (`–`) matching `durationLadderData[].bucket` in `mockBondsData.js`.

The server uses `fetchJSON(url)` helper (already exists) which does `https.get` and returns parsed JSON. Add a nested `try` block inside the `/api/bonds` handler.

`useBondsData.js` currently returns `durationLadderData` directly from mock (never overwritten). Add `treasuryRates` as a separate field.

`DurationLadder.jsx` currently renders the ECharts horizontal bar chart. Add an optional `treasuryRates` prop — when present, render a row of 4 small pills below the chart showing avg rate for each bucket.

- [ ] **Step 1: Write failing DurationLadder tests**

Create `src/__tests__/bonds/DurationLadder.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DurationLadder from '../../markets/bonds/components/DurationLadder';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const MOCK_DATA = [
  { bucket: '0–2y',  amount: 8420, pct: 34.2 },
  { bucket: '2–5y',  amount: 5980, pct: 24.3 },
  { bucket: '5–10y', amount: 6250, pct: 25.4 },
  { bucket: '10y+',  amount: 3950, pct: 16.1 },
];

describe('DurationLadder', () => {
  it('renders panel title and chart without treasuryRates', () => {
    render(<DurationLadder durationLadderData={MOCK_DATA} />);
    expect(screen.getByText('Duration Ladder')).toBeInTheDocument();
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('does not show rate pills when treasuryRates is null', () => {
    render(<DurationLadder durationLadderData={MOCK_DATA} />);
    expect(document.querySelectorAll('.dur-rate-pill').length).toBe(0);
  });

  it('shows four rate pills when treasuryRates provided', () => {
    const rates = { '0–2y': 4.82, '2–5y': 4.01, '5–10y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    expect(document.querySelectorAll('.dur-rate-pill').length).toBe(4);
  });

  it('shows formatted rate values in pills', () => {
    const rates = { '0–2y': 4.82, '2–5y': 4.01, '5–10y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    expect(screen.getByText('4.82%')).toBeInTheDocument();
    expect(screen.getByText('4.55%')).toBeInTheDocument();
  });

  it('shows bucket label alongside each rate pill', () => {
    const rates = { '0–2y': 4.82, '2–5y': 4.01, '5–10y': 4.01, '10y+': 4.55 };
    render(<DurationLadder durationLadderData={MOCK_DATA} treasuryRates={rates} />);
    expect(screen.getAllByText('0–2y').length).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```
npx vitest run src/__tests__/bonds/DurationLadder.test.jsx
```
Expected: FAIL — `dur-rate-pill` doesn't exist yet.

- [ ] **Step 3: Add Treasury fetch to server/index.js**

Inside the `/api/bonds` handler in `server/index.js`, add a Treasury try block **before** the `result` object construction (after the spread indicators block ending at `}` around line 422):

```javascript
    // 5. Treasury avg interest rates (fiscaldata.treasury.gov — no auth needed)
    let treasuryRates = null;
    try {
      const tUrl = 'https://api.fiscaldata.treasury.gov/services/api/v1/accounting/od/avg_interest_rates' +
        '?filter=security_type_desc:eq:Marketable' +
        '&fields=record_date,security_desc,avg_interest_rate_amt' +
        '&sort=-record_date&page%5Bsize%5D=20';
      const tData = await fetchJSON(tUrl);
      const records = tData?.data || [];
      if (records.length > 0) {
        const latestDate = records[0].record_date;
        const latest = records.filter(r => r.record_date === latestDate);
        const bills = latest.find(r => r.security_desc === 'Treasury Bills');
        const notes = latest.find(r => r.security_desc === 'Treasury Notes');
        const bonds = latest.find(r => r.security_desc === 'Treasury Bonds');
        if (bills || notes || bonds) {
          treasuryRates = {
            '0\u20132y':  bills ? parseFloat(bills.avg_interest_rate_amt) : null,
            '2\u20135y':  notes ? parseFloat(notes.avg_interest_rate_amt) : null,
            '5\u201310y': notes ? parseFloat(notes.avg_interest_rate_amt) : null,
            '10y+':       bonds ? parseFloat(bonds.avg_interest_rate_amt) : null,
          };
        }
      }
    } catch { /* use null */ }
```

Note: `\u2013` is the en-dash character `–` matching the bucket keys in `durationLadderData`.

Then update the `result` object (currently lines ~423-428) to add `treasuryRates`:

Change:
```javascript
    const result = {
      yieldCurveData,
      spreadData,
      spreadIndicators: Object.keys(spreadIndicators).length >= 3 ? spreadIndicators : null,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
```
To:
```javascript
    const result = {
      yieldCurveData,
      spreadData,
      spreadIndicators: Object.keys(spreadIndicators).length >= 3 ? spreadIndicators : null,
      treasuryRates,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
```

- [ ] **Step 4: Update useBondsData.js to add treasuryRates**

In `src/markets/bonds/data/useBondsData.js`:

After the `spreadIndicators` state declarations, add:
```javascript
  const [treasuryRates, setTreasuryRates] = useState(null);
```

Inside the `load()` function, after the `setSpreadIndicators` block, add:
```javascript
        if (data.treasuryRates && Object.values(data.treasuryRates).some(v => v != null)) {
          setTreasuryRates(data.treasuryRates);
        }
```

Update the return statement from:
```javascript
  return { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, isLive, lastUpdated, isLoading };
```
To:
```javascript
  return { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, treasuryRates, isLive, lastUpdated, isLoading };
```

- [ ] **Step 5: Update BondsMarket.jsx to pass treasuryRates**

In `src/markets/bonds/BondsMarket.jsx`:

Change:
```jsx
const { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, isLive, lastUpdated, isLoading } = useBondsData();
```
To:
```jsx
const { yieldCurveData, creditRatingsData, spreadData, spreadIndicators, durationLadderData, treasuryRates, isLive, lastUpdated, isLoading } = useBondsData();
```

Change:
```jsx
{activeTab === 'duration-ladder' && <DurationLadder durationLadderData={durationLadderData} />}
```
To:
```jsx
{activeTab === 'duration-ladder' && <DurationLadder durationLadderData={durationLadderData} treasuryRates={treasuryRates} />}
```

- [ ] **Step 6: Update DurationLadder.jsx to render rate pills**

Replace the contents of `src/markets/bonds/components/DurationLadder.jsx` with:

```jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './BondsComponents.css';

export default function DurationLadder({ durationLadderData, treasuryRates = null }) {
  const option = useMemo(() => {
    const buckets  = durationLadderData.map(d => d.bucket);
    const amounts  = durationLadderData.map(d => d.amount);
    const pcts     = durationLadderData.map(d => d.pct);
    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const i = params[0].dataIndex;
          return `<b>${durationLadderData[i].bucket}</b><br/>` +
            `Amount: <b>$${durationLadderData[i].amount.toLocaleString()}M</b><br/>` +
            `Weight: <b>${durationLadderData[i].pct}%</b>`;
        },
      },
      grid: { top: 20, right: 80, bottom: 30, left: 80 },
      xAxis: {
        type: 'value',
        axisLabel: { color: '#64748b', fontSize: 11, formatter: '${value}M' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      yAxis: {
        type: 'category',
        data: buckets,
        inverse: true,
        axisLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 500 },
        axisLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [{
        type: 'bar',
        data: amounts,
        itemStyle: {
          color: (params) => {
            const colors = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6'];
            return colors[params.dataIndex % colors.length];
          },
          borderRadius: [0, 4, 4, 0],
        },
        label: {
          show: true,
          position: 'right',
          color: '#94a3b8',
          fontSize: 11,
          formatter: (params) => `${pcts[params.dataIndex]}%`,
        },
      }],
    };
  }, [durationLadderData]);

  const totalAmount = durationLadderData.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Duration Ladder</span>
        <span className="bonds-panel-subtitle">
          Portfolio allocation by maturity bucket · Total: ${totalAmount.toLocaleString()}M
        </span>
      </div>
      <div className="bonds-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {treasuryRates && (
        <div className="dur-rates-row">
          {durationLadderData.map(d => {
            const rate = treasuryRates[d.bucket];
            return (
              <div key={d.bucket} className="dur-rate-pill">
                <span className="dur-rate-bucket">{d.bucket}</span>
                <span className="dur-rate-value">
                  {rate != null ? `${rate.toFixed(2)}%` : '—'}
                </span>
                <span className="dur-rate-label">Avg Rate</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="bonds-panel-footer">
        Maturity buckets: 0–2y (short), 2–5y (medium), 5–10y (long), 10y+ (ultra-long)
        {treasuryRates && ' · Avg Rate: US Treasury avg coupon rate by maturity (fiscaldata.treasury.gov)'}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add CSS for rate pills in BondsComponents.css**

Append to `src/markets/bonds/components/BondsComponents.css`:

```css
/* DurationLadder — Treasury avg rate pills */
.dur-rates-row {
  display: flex;
  gap: 10px;
  padding: 6px 12px 4px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.dur-rate-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 14px;
  min-width: 80px;
}
.dur-rate-bucket {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.dur-rate-value {
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
}
.dur-rate-label {
  font-size: 9px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
```

- [ ] **Step 8: Run tests**

```
npx vitest run src/__tests__/bonds/DurationLadder.test.jsx
```
Expected: 5 tests pass.

- [ ] **Step 9: Run full test suite**

```
npx vitest run
```
Expected: all existing tests + new tests pass.

- [ ] **Step 10: Commit**

```bash
git add server/index.js \
        src/markets/bonds/data/useBondsData.js \
        src/markets/bonds/BondsMarket.jsx \
        src/markets/bonds/components/DurationLadder.jsx \
        src/markets/bonds/components/BondsComponents.css \
        src/__tests__/bonds/DurationLadder.test.jsx
git commit -m "feat(bonds): DurationLadder Treasury avg interest rates per bucket"
```

---

## Task 4: Derivatives VolSurface — ATM 1M IV vs 30d Realized Vol Premium

**Files:**
- Modify: `server/index.js`
- Modify: `src/markets/derivatives/data/useDerivativesData.js`
- Modify: `src/markets/derivatives/DerivativesMarket.jsx`
- Modify: `src/markets/derivatives/components/VolSurface.jsx`
- Modify: `src/markets/derivatives/components/DerivComponents.css`
- Create: `src/__tests__/derivatives/VolSurface.test.jsx`

### Context

**ATM 1M IV** is already in the vol surface grid: `volSurfaceData.grid[2][4]` (index 2 = 1M expiry in the 8-expiry array `['1W','1M','3M','6M','9M','1Y','18M','2Y']`; index 4 = 100% strike in the 9-strike array `[80,85,90,95,100,105,110,115,120]`).

**30d Realized Vol** is computed from the last 30 log daily returns of `^GSPC`:
```
logReturn[i] = ln(close[i] / close[i-1])
realizedVol30d = stdev(last 30 log returns) × sqrt(252) × 100
```

The server already fetches `^GSPC` 180 days of history in block 3 (Fear & Greed). To avoid a redundant API call, hoist a `let spyClosesCache = []` variable before block 3 and populate it inside block 3's try. Then a new block 6 computes the vol premium after block 4 (vol surface).

**Vol premium** = ATM 1M IV − realizedVol30d. Positive = options pricing in more volatility than realized (typical; market pays a "vol risk premium"). Negative = realized exceeded implied (unusual, often during rapid sell-offs).

The `volPremium` shape returned from server:
```json
{ "atm1mIV": 22.5, "realizedVol30d": 18.3, "premium": 4.2 }
```

`VolSurface.jsx` already has the vol surface heatmap. Add an optional `volPremium` prop; when present, render a stats row of 3 pills below the heatmap.

- [ ] **Step 1: Write failing VolSurface tests**

Create `src/__tests__/derivatives/VolSurface.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import VolSurface from '../../markets/derivatives/components/VolSurface';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

const MOCK_VOL_DATA = {
  strikes:  [80, 85, 90, 95, 100, 105, 110, 115, 120],
  expiries: ['1W', '1M', '3M', '6M', '9M', '1Y', '18M', '2Y'],
  grid: Array.from({ length: 8 }, () => Array(9).fill(20)),
};
MOCK_VOL_DATA.grid[2][4] = 22.5; // ATM 1M

describe('VolSurface', () => {
  it('renders panel title and chart without volPremium', () => {
    render(<VolSurface volSurfaceData={MOCK_VOL_DATA} />);
    expect(screen.getByText('Vol Surface')).toBeInTheDocument();
    expect(screen.getByTestId('echarts-mock')).toBeInTheDocument();
  });

  it('does not show premium stats when volPremium is null', () => {
    render(<VolSurface volSurfaceData={MOCK_VOL_DATA} />);
    expect(screen.queryByText('ATM 1M IV')).not.toBeInTheDocument();
  });

  describe('with volPremium', () => {
    it('shows ATM 1M IV value', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 22.5, realizedVol30d: 18.3, premium: 4.2 }} />);
      expect(screen.getByText('ATM 1M IV')).toBeInTheDocument();
      expect(screen.getByText('22.5%')).toBeInTheDocument();
    });

    it('shows 30d realized vol value', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 22.5, realizedVol30d: 18.3, premium: 4.2 }} />);
      expect(screen.getByText('30d Realized')).toBeInTheDocument();
      expect(screen.getByText('18.3%')).toBeInTheDocument();
    });

    it('shows positive premium with + prefix', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 22.5, realizedVol30d: 18.3, premium: 4.2 }} />);
      expect(screen.getByText('+4.2%')).toBeInTheDocument();
    });

    it('shows negative premium with - prefix', () => {
      render(<VolSurface volSurfaceData={MOCK_VOL_DATA} volPremium={{ atm1mIV: 15.0, realizedVol30d: 18.0, premium: -3.0 }} />);
      expect(screen.getByText('-3.0%')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run to confirm they fail**

```
npx vitest run src/__tests__/derivatives/VolSurface.test.jsx
```
Expected: FAIL — `volPremium` prop not used yet, stats not rendered.

- [ ] **Step 3: Add vol premium computation to server/index.js**

In `server/index.js`, inside the `/api/derivatives` handler:

**3a.** Before the `// 3. Fear & Greed` block (around line 577), add:

```javascript
    let spyClosesCache = [];
```

**3b.** Inside the Fear & Greed try block, after the line:
```javascript
      const spyCloses = spyHist.map(d => d.close).filter(Boolean);
```
Add:
```javascript
      spyClosesCache = spyCloses;
```

**3c.** After the `// 4. Vol surface` try block (after line ~645), add a new block:

```javascript
    // 6. Vol premium: ATM 1M IV vs 30d realized volatility
    let volPremium = null;
    try {
      const atm1mIV = volSurfaceData?.grid?.[2]?.[4] ?? null;
      if (atm1mIV != null && spyClosesCache.length >= 31) {
        const recentCloses = spyClosesCache.slice(-31);
        const logReturns = recentCloses.slice(1).map((c, i) => Math.log(c / recentCloses[i]));
        const mean = logReturns.reduce((s, v) => s + v, 0) / logReturns.length;
        const variance = logReturns.reduce((s, v) => s + (v - mean) ** 2, 0) / (logReturns.length - 1);
        const realizedVol30d = Math.round(Math.sqrt(variance * 252) * 100 * 10) / 10;
        const premium = Math.round((atm1mIV - realizedVol30d) * 10) / 10;
        volPremium = { atm1mIV, realizedVol30d, premium };
      }
    } catch { /* use null */ }
```

**3d.** Add `volPremium` to the result object (currently around line 647):

Change:
```javascript
    const result = {
      vixTermStructure,
      optionsFlow,
      fearGreedData,
      volSurfaceData,
      vixEnrichment,
      vixHistory,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
```
To:
```javascript
    const result = {
      vixTermStructure,
      optionsFlow,
      fearGreedData,
      volSurfaceData,
      vixEnrichment,
      vixHistory,
      volPremium,
      lastUpdated: new Date().toISOString().split('T')[0],
    };
```

- [ ] **Step 4: Update useDerivativesData.js to add volPremium**

In `src/markets/derivatives/data/useDerivativesData.js`:

After the `vixHistory` state declaration line, add:
```javascript
  const [volPremium,      setVolPremium]      = useState(null);
```

Inside the `.then(data => {...})` block, after the `vixHistory` setter, add:
```javascript
        if (data.volPremium?.atm1mIV != null) setVolPremium(data.volPremium);
```

Update the return statement from:
```javascript
  return { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, vixHistory, isLive, lastUpdated, isLoading };
```
To:
```javascript
  return { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, vixHistory, volPremium, isLive, lastUpdated, isLoading };
```

- [ ] **Step 5: Update DerivativesMarket.jsx to pass volPremium**

In `src/markets/derivatives/DerivativesMarket.jsx`:

Change:
```jsx
const { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, vixHistory, isLive, lastUpdated, isLoading } = useDerivativesData();
```
To:
```jsx
const { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, vixEnrichment, vixHistory, volPremium, isLive, lastUpdated, isLoading } = useDerivativesData();
```

Change:
```jsx
{activeTab === 'vol-surface'        && <VolSurface       volSurfaceData={volSurfaceData} />}
```
To:
```jsx
{activeTab === 'vol-surface'        && <VolSurface       volSurfaceData={volSurfaceData} volPremium={volPremium} />}
```

- [ ] **Step 6: Update VolSurface.jsx to render vol premium stats row**

Replace the contents of `src/markets/derivatives/components/VolSurface.jsx` with:

```jsx
import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

export default function VolSurface({ volSurfaceData, volPremium = null }) {
  const { strikes, expiries, grid } = volSurfaceData;

  const option = useMemo(() => {
    const data = [];
    expiries.forEach((_, ei) => {
      strikes.forEach((_, si) => {
        data.push([si, ei, grid[ei][si]]);
      });
    });

    const allVols = grid.flat();
    const minVol  = Math.min(...allVols);
    const maxVol  = Math.max(...allVols);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params) => {
          const [si, ei, vol] = params.data;
          return `<b>${expiries[ei]} / ${strikes[si]}%</b><br/>IV: <b>${vol.toFixed(1)}%</b>`;
        },
      },
      grid: { top: 60, right: 100, bottom: 40, left: 60 },
      xAxis: {
        type: 'category',
        data: strikes.map(s => `${s}%`),
        name: 'Strike (% of spot)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: expiries,
        name: 'Expiry',
        nameLocation: 'middle',
        nameGap: 42,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      visualMap: {
        min: minVol,
        max: maxVol,
        calculable: true,
        orient: 'vertical',
        right: 10,
        top: 60,
        textStyle: { color: '#64748b', fontSize: 10 },
        inRange: {
          color: ['#1e3a5f', '#2563eb', '#7c3aed', '#db2777', '#ef4444'],
        },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: true, fontSize: 9, color: '#e2e8f0', formatter: p => p.data[2].toFixed(1) },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    };
  }, [volSurfaceData]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Vol Surface</span>
        <span className="deriv-panel-subtitle">SPX implied volatility · strike % of spot × expiry</span>
      </div>
      <div className="deriv-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {volPremium && (
        <div className="vol-premium-row">
          <div className="vol-premium-pill">
            <span className="vol-premium-label">ATM 1M IV</span>
            <span className="vol-premium-value">{volPremium.atm1mIV.toFixed(1)}%</span>
          </div>
          <div className="vol-premium-pill">
            <span className="vol-premium-label">30d Realized</span>
            <span className="vol-premium-value">{volPremium.realizedVol30d.toFixed(1)}%</span>
          </div>
          <div className="vol-premium-pill">
            <span className="vol-premium-label">IV Premium</span>
            <span className={`vol-premium-value ${volPremium.premium >= 0 ? 'vol-premium-pos' : 'vol-premium-neg'}`}>
              {volPremium.premium >= 0 ? '+' : ''}{volPremium.premium.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      <div className="deriv-panel-footer">
        IV % · Volatility smile: OTM puts carry higher IV than ATM (skew) · Darker = lower vol
        {volPremium && ' · Vol Risk Premium = IV − Realized'}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Add CSS for vol premium row in DerivComponents.css**

Append to `src/markets/derivatives/components/DerivComponents.css`:

```css
/* VolSurface — IV vs realized vol premium row */
.vol-premium-row {
  display: flex;
  gap: 12px;
  padding: 6px 12px 4px;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.vol-premium-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 4px 16px;
  min-width: 96px;
}
.vol-premium-label {
  font-size: 10px;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vol-premium-value {
  font-size: 14px;
  font-weight: 600;
  color: #a78bfa;
}
.vol-premium-pos { color: #22c55e; }
.vol-premium-neg { color: #ef4444; }
```

- [ ] **Step 8: Run tests**

```
npx vitest run src/__tests__/derivatives/VolSurface.test.jsx
```
Expected: 5 tests pass.

- [ ] **Step 9: Run full test suite**

```
npx vitest run
```
Expected: all passing, count should now be 170 + (5 TopMovers + 7 useCOTData + 5 DurationLadder + 5 VolSurface) = 192 tests.

- [ ] **Step 10: Commit**

```bash
git add server/index.js \
        src/markets/derivatives/data/useDerivativesData.js \
        src/markets/derivatives/DerivativesMarket.jsx \
        src/markets/derivatives/components/VolSurface.jsx \
        src/markets/derivatives/components/DerivComponents.css \
        src/__tests__/derivatives/VolSurface.test.jsx
git commit -m "feat(derivatives): VolSurface ATM 1M IV vs 30d realized vol premium row"
```

---

## Self-Review

**Spec coverage:**
- FX TopMovers 1W/1M: ✅ Task 1 (useFXData 5 fetches, TopMovers new columns)
- FX TopMovers sparklines: ✅ Task 1 (inline SVG Sparkline component)
- FX TopMovers CFTC COT: ✅ Task 2 (useCOTData, mover-cot column)
- Bonds DurationLadder avg rates: ✅ Task 3 (Treasury API, dur-rate pills)
- Derivatives VolSurface vol premium: ✅ Task 4 (spyClosesCache, block 6, vol-premium-row)

**Placeholder scan:** No TBD, no TODO, all code steps contain complete implementations.

**Type consistency:**
- `changes1w`, `changes1m`, `sparklines` — produced in useFXData, consumed in TopMovers ✅
- `cotData` — produced in useCOTData, consumed in TopMovers ✅
- `treasuryRates` keys use en-dash `–` matching `durationLadderData[].bucket` keys ✅
- `volPremium.atm1mIV` / `.realizedVol30d` / `.premium` — consistent server→hook→component ✅
- `vol-premium-pos` / `vol-premium-neg` CSS classes — defined in DerivComponents.css Task 7, used in VolSurface Task 6 ✅
- `dur-rate-pill` CSS class — defined in BondsComponents.css Task 7, queried in DurationLadder test ✅
