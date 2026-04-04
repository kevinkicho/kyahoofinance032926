# Global Market Hub — Design Spec
**Date:** 2026-04-04  
**Status:** Approved  
**Audience:** Analyst / researcher tracking cross-market signals and macro patterns

---

## Overview

Redesign the existing equity-only dashboard into a multi-market analytical hub. The top level switches between 6 asset class workspaces — each with tailored, domain-specific visualizations. Equities migrates unchanged as Market 1; five new markets are added incrementally.

---

## Goals

- Give analysts a single app to monitor equities, bonds, FX, derivatives, real estate, and insurance
- Each market workspace feels purpose-built for that asset class (not a generic template)
- Clean market switching with minimal friction
- Mock data first; architecture designed so swapping in real APIs is a one-file change per market

---

## Non-Goals

- Cross-market correlation alerts or signal engine (out of scope for this design)
- Real-time data for all markets on day one (bonds/derivatives/real estate/insurance start with mock data)
- Mobile layout (desktop-first)

---

## Navigation Architecture

**Top tab bar** (Option C from brainstorm) — markets as top-level tabs across the full width of the app, with per-market sub-tabs rendered below.

```
┌─────────────────────────────────────────────────────────────────────┐
│  📈 Equities │ 🏛️ Bonds │ 💱 FX │ 📊 Derivatives │ 🏠 Real Estate │ 🛡️ Insurance │  💱 USD ▾  │
├─────────────────────────────────────────────────────────────────────┤
│  Heatmap │ List │ Bar Race │ Portfolio │ Radar │ ML Explorer         │  (equities sub-tabs)
├─────────────────────────────────────────────────────────────────────┤
│                                                              │       │
│                   Market Workspace                           │ Sidebar│
│                                                              │       │
└─────────────────────────────────────────────────────────────────────┘
```

**Shared hub state** (lives above all markets):
- `activeMarket` — which tab is selected
- `currency` — USD/EUR/etc., applies across all markets
- `snapshotDate` — time-travel date; equities uses it for real price snapshots. Other markets store it but their initial implementations ignore it (time travel for bonds/FX/etc. is a future enhancement).

Everything else (selected ticker, view mode, scenario sliders, etc.) lives inside each market's own component.

**Sidebar:** The existing `Sidebar` component is equities-specific and moves into `src/markets/equities/`. Each market renders its own right-hand panel. For new markets in the initial build, the sidebar is a simple detail panel showing the selected item's key metrics — no scenario sliders or FX rate tables. Those are equities-only features.

---

## File Structure

```
src/
  hub/
    MarketTabBar.jsx       ← top-level market tab bar component
    HubLayout.jsx          ← shell: renders tab bar + active market
  markets/
    equities/              ← existing code moves here, minimal changes
      EquitiesMarket.jsx   ← was App.jsx (equities state + logic)
      components/          ← existing HeatmapView, ListView, BarRaceView, etc.
      data/                ← existing stockUniverse.js, marketEvents.js, mockData.js
    bonds/
      BondsMarket.jsx
      components/
        YieldCurve.jsx
        CreditMatrix.jsx
        SpreadMonitor.jsx
        DurationLadder.jsx
      data/
        mockBondsData.js   ← shaped like FRED API response
        useBondsData.js    ← hook: returns mock now, real FRED API later
    fx/
      FXMarket.jsx
      components/
        RateMatrix.jsx
        CarryMap.jsx
        DXYTracker.jsx
        TopMovers.jsx
      data/
        useFXData.js       ← wraps existing useFrankfurterRates + adds history
    derivatives/
      DerivativesMarket.jsx
      components/
        VolSurface.jsx
        OpenInterestMap.jsx
        PutCallRatio.jsx
        FearGauge.jsx
      data/
        mockDerivativesData.js
        useDerivativesData.js
    realEstate/
      RealEstateMarket.jsx
      components/
        PriceIndex.jsx
        REITScreen.jsx
        AffordabilityMap.jsx
        TransactionVol.jsx
      data/
        mockRealEstateData.js
        useRealEstateData.js
    insurance/
      InsuranceMarket.jsx
      components/
        RiskMatrix.jsx
        LossRatioMonitor.jsx
        CatEventTracker.jsx
        CompanyScreen.jsx
      data/
        mockInsuranceData.js
        useInsuranceData.js
  App.jsx                  ← thin shell (~30 lines): renders HubLayout
  index.css                ← unchanged
  utils/                   ← unchanged (constants, dataHelpers, etc.)
```

---

## Per-Market Workspaces

### 📈 Equities
**Migrates unchanged.** All 7 existing sub-views (Heatmap, List, Bar Race, Portfolio, Radar, ML Explorer, Data Hub) move into `src/markets/equities/`. The only change is that `App.jsx` hands control to `EquitiesMarket.jsx` instead of rendering everything directly.

Default view: **Heatmap**

---

### 🏛️ Bonds
Sovereign and corporate debt analytics.

| Sub-view | Description |
|---|---|
| **Yield Curve** ★ | Multi-country treasury yield curves overlaid on one chart (US, DE, JP, GB, etc.). Hover for exact yield at each maturity. Color-coded by country. Shows normal/inverted/flat visually. |
| **Credit Matrix** | Heatmap of sovereign credit ratings by country × rating agency (S&P, Moody's, Fitch). Color by rating tier. |
| **Spread Monitor** | Corporate vs sovereign spread time series. Investment grade vs high yield. Sort by widest spread. |
| **Duration Ladder** | Bar chart grouping bond issuance by maturity bucket (0–2y, 2–5y, 5–10y, 10y+). Shows refinancing risk concentration. |

**Mock data shape** (matches FRED series format):
```js
// mockBondsData.js
export const yieldCurveData = {
  US: { '3m': 5.25, '6m': 5.10, '1y': 4.85, '2y': 4.60, '5y': 4.35, '10y': 4.20, '30y': 4.40 },
  DE: { '3m': 3.80, '6m': 3.75, '1y': 3.60, '2y': 3.45, '5y': 3.20, '10y': 3.05, '30y': 3.10 },
  // ...
}
```

**Future real API:** FRED (`api.stlouisfed.org/fred/series/observations`) — series IDs like `DGS10` (10-year Treasury), `DGS2` (2-year), etc.

---

### 💱 FX
Currency exchange market. **Data is already live** via Frankfurter.

| Sub-view | Description |
|---|---|
| **Rate Matrix** ★ | Cross-rate grid of major currencies (USD, EUR, GBP, JPY, CNY, CHF, AUD, CAD). Each cell shows 24h % change. Green = base strengthened, red = weakened vs quote. |
| **Carry Map** | Interest rate differential heatmap for carry trade analysis. Pairs sorted by rate spread. |
| **DXY Tracker** | US Dollar Index time series with key event annotations. Benchmark vs EUR, GBP, JPY, CAD, SEK, CHF. |
| **Top Movers** | Ranked list of biggest 24h movers across all tracked pairs. Gainers and losers. |

**Data strategy:** `useFXData.js` extends the existing `useFrankfurterRates` hook and adds historical series fetching from the Frankfurter `/YYYY-MM-DD..YYYY-MM-DD` endpoint.

---

### 📊 Derivatives
Options, futures, and volatility analytics.

| Sub-view | Description |
|---|---|
| **Vol Surface** ★ | Implied volatility smile/surface for a selected underlying. IV plotted by strike (OTM put → ATM → OTM call). Multiple expiries overlaid as separate curves. |
| **Open Interest Map** | Heatmap of open interest by strike × expiry for a selected ticker. Shows where market bets are concentrated. |
| **Put/Call Ratio** | Put/call OI and volume ratio by market and sector. High ratio = bearish sentiment. Time series view. |
| **Fear Gauge** | VIX (equity vol), MOVE (bond vol), and CVIX (FX vol) on one dashboard. Historical percentile bands. |

**Mock data shape:**
```js
// mockDerivativesData.js
export const volSurfaceData = {
  ticker: 'SPY',
  expiries: ['7d', '30d', '60d', '90d'],
  strikes: [-20, -15, -10, -5, 0, 5, 10, 15, 20], // % from ATM
  iv: {
    '30d': [32, 28, 24, 21, 19, 20, 22, 25, 29],
    '90d': [30, 27, 24, 22, 20, 21, 23, 26, 30],
  }
}
```

**Future real API:** Extend `server/index.js` with `/api/options/:ticker` using Yahoo Finance `yfinance` options chain data.

---

### 🏠 Real Estate
Residential, commercial, and REIT market analytics.

| Sub-view | Description |
|---|---|
| **Price Index** ★ | Case-Shiller style home price index by major global city (NYC, SF, London, Tokyo, Sydney, Berlin, etc.). Bar chart sorted by YoY % change. Color intensity by magnitude. |
| **REIT Screen** | Sortable table of major REITs by market cap, dividend yield, NAV premium/discount, and sector (Office, Industrial, Residential, Retail, Healthcare). Click to open in sidebar. |
| **Affordability Map** | Price-to-income ratio by city/region. Red = severely unaffordable (>12×), green = affordable (<5×). Trend arrow showing direction. |
| **Transaction Vol** | Monthly transaction volume (sales count + dollar volume) time series. Signals liquidity and market activity. |

**Mock data shape** (matches FRED CSUSHPINSA format):
```js
export const priceIndexData = [
  { city: 'New York', country: 'US', index: 312.4, yoyChange: 4.2, priceToIncome: 14.1 },
  { city: 'San Francisco', country: 'US', index: 298.1, yoyChange: 2.8, priceToIncome: 16.3 },
  // ...
]
```

**Future real API:** FRED (Case-Shiller index series `CSUSHPINSA`, housing starts `HOUST`) — reuses the same server proxy as bonds.

---

### 🛡️ Insurance
Property & casualty, life, and reinsurance market analytics.

| Sub-view | Description |
|---|---|
| **Risk Matrix** ★ | Combined loss ratio heatmap by line of business (P&C, Life, Reinsurance, Health) × region (US, EU, APAC, LatAm). Green (<100%) = profitable underwriting. Red (>100%) = losses exceeding premiums. |
| **Loss Ratio Monitor** | Time series of combined ratio by major insurer and line of business. Trend lines. Industry average benchmark overlay. |
| **Cat Event Tracker** | Timeline of catastrophic events (hurricanes, earthquakes, wildfires) with estimated insured loss amounts. Sorted by severity. |
| **Company Screen** | Sortable table of major insurers (AIG, Berkshire, Zurich, AXA, etc.) by market cap, combined ratio, ROE, and premium growth. Uses Yahoo Finance data via existing `/api/stocks`. |

**Data strategy:** Insurance has no free real-time API. The initial dataset is a curated static file (`mockInsuranceData.js`) based on publicly available NAIC annual reports and company filings. Company market data is fetched live from Yahoo Finance via the existing `/api/stocks` endpoint.

---

## Build Sequence

Each sub-project gets its own implementation plan. Build in this order:

| # | Sub-project | Rationale |
|---|---|---|
| 1 | **Hub Shell** | Foundation — tab bar, routing, equities migration, shared state |
| 2 | **FX Market** | Quick win — Frankfurter already wired; validates hub architecture |
| 3 | **Bonds Market** | Iconic viz (yield curve); FRED mock data is clean to model |
| 4 | **Real Estate Market** | Reuses FRED proxy from bonds; REIT data from existing Yahoo Finance |
| 5 | **Derivatives Market** | Most complex visualization (vol surface); new server endpoint needed |
| 6 | **Insurance Market** | Curated static data; company screen reuses existing Yahoo Finance |

---

## Hub Shell — Component Design (Sub-project 1)

### `MarketTabBar.jsx`
Props: `activeMarket`, `setActiveMarket`, `currency`, `setCurrency`  
Renders the top-level tab row. Each tab is a `{ id, label, icon }` entry from a static `MARKETS` config array. Active tab highlighted with bottom border. Currency picker floats right.

### `HubLayout.jsx`
Props: `currency`, `setCurrency`, `snapshotDate`, `setSnapshotDate`  
Manages `activeMarket` state. Renders `<MarketTabBar>` + dynamically renders the active market component via a `switch` or lookup map.

### `App.jsx` (after refactor, ~30 lines)
```jsx
function App() {
  return <HubLayout />;
}
```

### Equities migration
`EquitiesMarket.jsx` = current `App.jsx` with three changes:
1. Remove `currency` + `snapshotDate` state — receive as props from `HubLayout`
2. Remove the outer `<Header>` market-switching controls — `MarketTabBar` handles that
3. Keep all equities-specific state (selectedTicker, scenarios, portfolio, rankMetric, etc.)

---

## Testing Strategy

- Unit tests for each market's data hook (`useBondsData`, `useFXData`, etc.) — verify mock data shape matches expected API response format
- Existing tests in `src/__tests__/` continue to pass unchanged
- No end-to-end tests required for initial build

---

## Open Questions (resolved)

| Question | Decision |
|---|---|
| Navigation pattern | Top tab bar (Option C) |
| Workspace structure | Tailored views per market (Option A) |
| Data strategy | Mock data first; architected to match real API shapes |
| Implementation approach | Market Router — each market in `src/markets/{name}/` |
| Build order | Hub Shell → FX → Bonds → Real Estate → Derivatives → Insurance |
