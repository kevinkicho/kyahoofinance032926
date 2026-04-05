# Cross-Market Enrichments — Design Spec

**Date:** 2026-04-05
**Type:** Data quality upgrade (3 existing markets)

---

## Goal

Add 3 new data segments to existing market endpoints: BTC on-chain metrics (Crypto), TIPS breakeven inflation (Bonds), and COT commodity positioning (Commodities). No new market tabs — server-side additions + new component sections in existing views.

---

## Scope

| Market | Enrichment | Live Source | New Component |
|---|---|---|---|
| Crypto | BTC on-chain metrics | mempool.space public API (no auth) | OnChainMetrics.jsx in Market Overview |
| Bonds | TIPS breakevens + real yields | FRED (T5YIE, T10YIE, T5YIFR, DFII5, DFII10) | BreakevenMonitor.jsx as 5th sub-tab |
| Commodities | COT positioning (WTI + Gold) | CFTC Socrata jun7-fc8e (reuse existing) | CotPositioning.jsx as 5th sub-tab |

### Dropped

- **FX intervention signals** — no reliable free API. FRED only has indirect lagged proxies (BOGMBASE, TIC data with 45-day lag). Not worth building.

---

## Enrichment 1: Crypto — BTC On-Chain Metrics

### Server changes (`/api/crypto` endpoint)

Add to the existing `Promise.allSettled` block:

```js
// mempool.space — no auth, no CORS (server-side)
const mempoolFees = fetchJson('https://mempool.space/api/v1/fees/recommended');
const mempoolDiff = fetchJson('https://mempool.space/api/v1/difficulty-adjustment');
const mempoolStats = fetchJson('https://mempool.space/api/mempool');
const mempoolHashrate = fetchJson('https://mempool.space/api/v1/mining/hashrate/1m');
```

Extract and shape:
```js
onChainData: {
  fees: { fastest, halfHour, hour, economy, minimum },  // sat/vB
  mempool: { count, vsize },  // tx count, virtual size in vMB
  difficulty: { progressPercent, difficultyChange, remainingBlocks, estimatedRetargetDate },
  hashrate: { current, history: [{ timestamp, avgHashrate }] },  // TH/s, 30-day
}
```

### Client changes

**New file:** `src/markets/crypto/components/OnChainMetrics.jsx`

Renders within the "Market Overview" sub-tab (add below existing content). Layout:
- 4 metric cards in a row: Recommended Fee (sat/vB), Mempool Size (vMB), Hashrate (EH/s), Next Difficulty
- Below: hashrate trend mini-chart (30-day, ECharts area)

**Hook update:** `useCryptoData.js` — add `onChainData` state with mock fallback. Guard: `data.onChainData?.fees?.fastest != null`

**Mock update:** `mockCryptoData.js` — add `onChainData` export with sample values.

---

## Enrichment 2: Bonds — TIPS Breakevens

### Server changes (`/api/bonds` endpoint)

Add to the existing `Promise.allSettled` block:

```js
// TIPS breakevens + real yields
const breakevens = Promise.all([
  fetchFredHistory('T5YIE', 130),    // 5yr breakeven, ~6mo daily
  fetchFredHistory('T10YIE', 130),   // 10yr breakeven
  fetchFredHistory('T5YIFR', 130),   // 5yr/5yr forward
  fetchFredLatest('DFII5'),          // 5yr real yield
  fetchFredLatest('DFII10'),         // 10yr real yield
]);
```

Shape:
```js
breakevensData: {
  current: { be5y, be10y, forward5y5y, real5y, real10y },
  history: {
    dates: [...],
    be5y: [...],
    be10y: [...],
    forward5y5y: [...],
  },
}
```

### Client changes

**New file:** `src/markets/bonds/components/BreakevenMonitor.jsx`

Add as 5th sub-tab in BondsMarket (after Duration Ladder). Layout:
- Top: 5 metric pills (5Y BE, 10Y BE, 5Y5Y Fwd, 5Y Real, 10Y Real)
- Chart: 6-month history of 3 breakeven series (dual-axis: left = breakevens %, right = could show real yields)
- Footer: "Breakeven = Nominal − TIPS real yield · Forward = market's expected avg inflation 5–10yr out"

Green accent (matches Bonds `#10b981`).

**Hook update:** `useBondsData.js` — add `breakevensData` state. Guard: `data.breakevensData?.history?.dates?.length >= 20`

**Mock update:** `mockBondsData.js` — add `breakevensData` export.

---

## Enrichment 3: Commodities — COT Positioning

### Server changes (`/api/commodities` endpoint)

Add to the existing `Promise.allSettled` block. Reuse the same CFTC Socrata endpoint (`jun7-fc8e`) already used in `/api/sentiment`:

```js
// CFTC COT for WTI crude + gold
const cotUrl = `https://publicreporting.cftc.gov/resource/jun7-fc8e.json?$where=market_and_exchange_names like 'CRUDE OIL%25' OR market_and_exchange_names like 'GOLD%25'&$order=report_date_as_yyyy_mm_dd DESC&$limit=24`;
```

Extract per commodity (latest + 12-week history):
```js
cotData: {
  commodities: [
    {
      name: 'WTI Crude Oil',
      latest: { noncommNet, commNet, totalOI, netChange },
      history: [{ date, noncommNet }],  // 12 weeks
    },
    {
      name: 'Gold',
      latest: { noncommNet, commNet, totalOI, netChange },
      history: [{ date, noncommNet }],
    },
  ],
}
```

### Client changes

**New file:** `src/markets/commodities/components/CotPositioning.jsx`

Add as 5th sub-tab in CommoditiesMarket (after Supply & Demand). Layout:
- Two side-by-side panels (WTI + Gold)
- Each: net speculative positioning bar (green/red), commercial vs non-commercial breakdown
- Below each: 12-week net positioning mini-chart (ECharts bar)
- Footer: "CFTC Commitments of Traders · Weekly · Non-commercial = speculative positioning"

Gold accent (matches Commodities `#ca8a04`).

**Hook update:** `useCommoditiesData.js` — add `cotData` state. Guard: `data.cotData?.commodities?.length >= 2`

**Mock update:** `mockCommoditiesData.js` — add `cotData` export.

---

## Files Modified

### Crypto
- `server/index.js` — add mempool.space calls to `/api/crypto`
- `src/markets/crypto/data/mockCryptoData.js` — add `onChainData`
- `src/markets/crypto/data/useCryptoData.js` — add `onChainData` state + guard
- `src/markets/crypto/components/OnChainMetrics.jsx` — NEW
- `src/markets/crypto/components/CryptoComponents.css` — add on-chain styles
- `src/markets/crypto/CryptoMarket.jsx` — render OnChainMetrics in Market Overview

### Bonds
- `server/index.js` — add FRED breakeven calls to `/api/bonds`
- `src/markets/bonds/data/mockBondsData.js` — add `breakevensData`
- `src/markets/bonds/data/useBondsData.js` — add `breakevensData` state + guard
- `src/markets/bonds/components/BreakevenMonitor.jsx` — NEW
- `src/markets/bonds/components/BondsComponents.css` — add breakeven styles
- `src/markets/bonds/BondsMarket.jsx` — add 5th sub-tab

### Commodities
- `server/index.js` — add CFTC COT calls to `/api/commodities`
- `src/markets/commodities/data/mockCommoditiesData.js` — add `cotData`
- `src/markets/commodities/data/useCommoditiesData.js` — add `cotData` state + guard
- `src/markets/commodities/components/CotPositioning.jsx` — NEW
- `src/markets/commodities/components/ComComponents.css` — add COT styles
- `src/markets/commodities/CommoditiesMarket.jsx` — add 5th sub-tab

---

## Tests

No new test files needed — existing hook tests should continue passing since new data segments use the same `anyReplaced` pattern with fallback to mock. Add 1 test per hook for the new data segment guard (3 total).

---

## Performance Notes

- mempool.space: 4 calls, very fast (<200ms each), no rate limit concern for daily cache
- FRED breakevens: 5 calls, same pattern as existing FRED fetches
- CFTC COT: 1 Socrata call (same as sentiment), returns 24 rows (~12 weeks × 2 commodities)
- All behind daily file cache — only fires once per day
