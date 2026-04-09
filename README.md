# Global Market Hub

A comprehensive multi-market financial dashboard built with React 18 + Vite 5. Covers 15 asset classes with unified "one-look" dashboards, live data from Yahoo Finance, FRED, CoinGecko, and more. Includes a 350+ stock global equity heatmap with historical playback.

---

## Markets

| # | Market | Dashboard View | Accent | Live Data Sources |
|---|--------|----------------|--------|-------------------|
| 1 | **Equities** | Heatmap + Bar Race + List + Portfolio + Radar + ML Explorer + Data Hub | Blue | Yahoo Finance (350+ stocks), Frankfurter FX |
| 2 | **Bonds** | Yield Curve (8 countries), Credit Spreads, Duration Ladder, Breakevens, History Charts | Green `#10b981` | FRED (9 US tenors, intl 10yr, IG/HY/EM spreads, TIPS breakevens, DGS10 252d) |
| 3 | **FX** | Rate Matrix, Carry Map, DXY Tracker, Top Movers | Amber `#f59e0b` | FRED (7 bilateral rates, DXY), Frankfurter API |
| 4 | **Derivatives** | Vol Surface (SPX), VIX Term Structure, Options Flow | Purple `#a78bfa` | Yahoo (VIX term, SPY/QQQ options), FRED (VIXCLS 252d) |
| 5 | **Real Estate** | Price Index, REIT Screen, Affordability, Cap Rates, Mortgage Rates | Orange `#f97316` | Yahoo (REITs, VNQ), FRED (Case-Shiller, HOUST, MSPUS, BIS prices) |
| 6 | **Insurance** | Cat Bond Spreads, Combined Ratio, Reserve Adequacy, Reinsurance | Sky Blue `#0ea5e9` | Yahoo (PGR/ALL/TRV/HIG quarterlies), FRED (HY OAS 252d) |
| 7 | **Commodities** | Price Dashboard, Futures Curve, Sector Heatmap, Supply/Demand, COT Positioning | Gold `#ca8a04` | Yahoo (18 tickers, WTI/Gold futures), FRED (WTI, Gold, Brent, PPI), EIA, CFTC Socrata |
| 8 | **Global Macro** | Unified Scorecard (12 countries), Growth/Inflation, Central Bank Rates, Debt Monitor | Teal `#14b8a6` | World Bank, FRED (policy rates) |
| 9 | **Equity+** | Sector Rotation, Factor Rankings, Earnings Watch, Short Interest | Indigo `#6366f1` | Yahoo Finance (12 sector ETFs, quoteSummary, chart) |
| 10 | **Crypto** | Market Overview, Fear & Greed, DeFi TVL, Funding Rates, On-Chain Metrics | Amber `#f59e0b` | CoinGecko (top 20 + global), DeFiLlama (TVL), Alternative.me (F&G), Bybit (funding), mempool.space (on-chain) |
| 11 | **Credit** | IG/HY Spreads, EM Bonds, Loan Market, Default Watch | Cyan `#06b6d4` | FRED (5 spread series), Yahoo (LQD, HYG, EMB, JNK, BKLN, MUB) |
| 12 | **Sentiment** | Fear & Greed, CFTC Positioning, Risk Dashboard, Cross-Asset Returns | Violet `#7c3aed` | Alternative.me (252d), FRED (VIX, HY, YC), CFTC Socrata, Yahoo (8 ETFs) |
| 13 | **Calendar** | Economic Calendar, Central Banks, Earnings Season, Key Releases | Rose `#f43f5e` | Econdb, FRED (releases/dates), Yahoo (calendarEvents, 30 tickers) |
| 14 | **Alerts** | Active Alerts, Alert Rules | Red `#ef4444` | Aggregates 6 market endpoints, 8 anomaly rules (VIX spike, curve inversion, HY stress, F&G extremes, BTC/Gold/DXY moves) |
| 15 | **Watchlist** | My Tickers, My Metrics | Gold `#eab308` | Yahoo Finance (live quotes per ticker), cross-market metric shortcuts |

## Unified Dashboard Architecture

All 15 markets now use a **"one-look" unified dashboard** pattern — no more tab switching to see all data. Each dashboard shows:

- **KPI Strip** — 4-6 key metrics at the top (accent-colored values)
- **2-Column Grid** — Charts and tables in responsive 2-column layout
- **Compact Tables** — Mini-tables for rates, spreads, metrics
- **Historical Charts** — FRED/Yahoo time series where available

This consolidation reduces cognitive load and enables instant cross-comparison across asset classes.

## App-Level Features

- **Dark / Light Theme** — toggle in the tab bar, persisted to localStorage
- **PNG Export** — capture any market view as a high-res PNG screenshot
- **CSV / JSON Export** — download raw market data in either format
- **Global Search** — search across all 15 markets with keyboard navigation
- **Multi-Monitor Mode** — pop out any market into its own browser window
- **Currency Picker** — display values in USD, EUR, GBP, JPY, CNY, and 5 more
- **URL Routing** — `?market=bonds` in the URL, shareable links, browser back/forward
- **Tab Persistence** — last-viewed market restored on page refresh
- **Auto-Refresh** — toggle 5-minute polling for all market data
- **Toast Notifications** — visual feedback for exports, errors, and data events
- **Keyboard Shortcuts** — `1`–`9`/`0` switch tabs, arrows prev/next, `Ctrl+E` export, `Ctrl+K` search
- **Print-Friendly** — `@media print` stylesheet hides chrome, maximizes content
- **Loading Skeletons** — shimmer placeholders during lazy-load and data fetch
- **Error Boundaries** — per-market crash isolation with retry button

## Infrastructure

- **Backend Modularization** — `server/index.js` is a thin orchestrator (130 lines), 15 route files in `server/routes/`, 5 lib modules
- **HTTP Cache Headers** — `Cache-Control` on all API routes (15min market data, 5min health/status)
- **Fetch Retry** — `fetchWithRetry` with exponential backoff + AbortController timeout in all data hooks
- **Rate Limit Monitoring** — `/api/rate-limits` endpoint tracking 13 free API sources
- **Responsive CSS** — breakpoints at 1024px, 768px, and 480px with progressive grid collapse
- **Accessibility** — ARIA roles/labels on all tab bars, skip-to-content link, combobox search
- **Docker Deployment** — multi-stage `Dockerfile`, `docker-compose.yml`, SPA catch-all
- **Bundle Analysis** — `rollup-plugin-visualizer` generates `dist/bundle-stats.html` on build

## Architecture

### Frontend
- **React 18** with Vite 5 (HMR, fast builds)
- **ECharts** via `echarts-for-react` — all charts use `animation: false`, `backgroundColor: 'transparent'`
- **CSS Variables** — 12 semantic variables in `:root` / `[data-theme]` for theming
- **ThemeContext** — `useTheme()` hook provides `{ theme, colors, toggle }`
- **ToastContext** — `useToast()` hook for notification management

### Backend
- **Express 4** on port 3001, modularized into 15 route files + 5 lib modules
- **yahoo-finance2** — quotes, options chains, historical prices, calendar events
- **FRED API** — 40+ economic series
- **Two-tier cache** — in-memory `node-cache` (15 min TTL) wraps file-based daily cache in `server/datacache/`
- **Fallback** — on error, serves latest cached data with `isCurrent: false`

### Data Hooks
Each market has an async hook (`useState` + `useEffect` + `fetchWithRetry`) that:
1. Initializes with mock data
2. Fetches `/api/*` with retry logic (2 retries, exponential backoff) + AbortController timeout
3. Upgrades to live data on success (`isLive: true`)
4. Falls back silently to mock on failure
5. Supports auto-refresh polling via `useInterval` (5min when enabled)

## Global Equity Dashboard

### Visualization Modes
- **Heatmap** — ECharts treemap across 350+ real global stocks with zoom, pan, drill-down
- **Bar Race** — animated top-30 horizontal bar chart, colored by region or sector
- **List View** — sortable table with sector chips, region indicators, snapshot % change

### Ranking & Grouping
- Rank by Market Cap, Revenue, Net Income, P/E, or Dividend Yield
- Group by Market, Sector-in-Market, or Global Sector
- 20-color rank palette or green/red performance coloring

### Time Travel
- Drag timeline scrubber from 2020 to today
- Playback at 1x/2x/4x speed
- Market caps rescale to historical closing prices
- 40+ annotated macro events (Fed hikes, earnings, crises)
- Hover comparison modal: D-1, 1W, 1M, 1Y, YTD returns + sparkline

### Detail Panel
- Click any stock in heatmap for live Yahoo Finance data
- Tabs: Chart (1yr area), Fundamentals, Analysts, Fair Value
- Macro indicators from FRED (M1, M2, CPI, Fed Funds, unemployment, GDP)
- Live FX rates via Frankfurter API

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, ECharts (`echarts-for-react`), `html2canvas`, PapaParse |
| Backend | Express 4, `yahoo-finance2`, `node-cache` |
| Data | Yahoo Finance, FRED API, CoinGecko, DeFiLlama, Bybit, CFTC Socrata, Econdb, EIA, mempool.space, Frankfurter, World Bank |
| Styling | Plain CSS with CSS variables (dark/light themes), responsive breakpoints |
| Tests | Vitest 4, @testing-library/react — 325 tests across 51 files |
| Deploy | Docker (multi-stage Node 20 alpine), docker-compose |

## Getting Started

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install
```

### 2. Configure environment

```bash
# Add FRED API key (required for most markets)
echo "FRED_API_KEY=your_key_here" > server/.env
```

### 3. Start the app

```bash
# Both frontend (port 5173) and backend (port 3001)
npm start

# Or separately:
npm run dev          # Frontend only
cd server && node index.js  # Backend only
```

Open [http://localhost:5173](http://localhost:5173)

### 4. Run tests

```bash
npx vitest run
```

### 5. Build for production

```bash
npm run build
# Bundle analysis available at dist/bundle-stats.html
```

### 6. Docker deployment

```bash
docker-compose up --build
# Serves at http://localhost:3001
```

### 7. (Optional) Pre-fetch equity data

Downloads 5 years of history + fundamentals for 350+ tickers (~52 MB, ~21 minutes):

```bash
node scripts/fetch-universe.js
```

## Project Structure

```
src/
  hub/                          # Hub shell, routing, tab bar, theme, footer
    HubLayout.jsx               # Market routing + URL sync + exports + keyboard shortcuts
    MarketTabBar.jsx             # Tabs + search + theme + export + refresh + pop-out + currency
    markets.config.js            # Market definitions + search index (15 markets)
    ThemeContext.jsx            # Dark/light theme provider
    ToastContext.jsx            # Toast notification provider
    HubFooter.jsx               # Clock + cache status + data source attribution
    MarketSkeleton.jsx           # Shimmer loading placeholder
  hooks/
    useInterval.js               # Reusable polling interval hook
  markets/
    equities/                   # Global equity heatmap + all views
    bonds/                      # Unified dashboard (yield curve, spreads, breakevens)
    fx/                         # Unified dashboard (rate matrix, carry, movers)
    derivatives/                # Unified dashboard (vol surface, VIX term, options)
    realEstate/                 # Unified dashboard (price index, REIT, affordability)
    insurance/                  # Unified dashboard (cat bonds, combined ratio)
    commodities/                # Unified dashboard (prices, futures, COT)
    globalMacro/                # Unified dashboard (scorecard, growth, rates, debt)
    equitiesDeepDive/           # Unified dashboard (sectors, factors, earnings, shorts)
    crypto/                     # Unified dashboard (market, F&G, DeFi, funding)
    credit/                     # Unified dashboard (IG/HY spreads, EM, loans)
    sentiment/                  # Unified dashboard (F&G, CFTC, risk, returns)
    calendar/                   # Unified dashboard (economic, earnings, releases)
    alerts/                     # Active alerts + alert rules
    watchlist/                  # My tickers + my metrics
  components/                   # Shared: HeatmapView, DetailPanel, Sidebar, etc.
  utils/                        # FX rates, fetchWithRetry, data helpers, constants
  __tests__/                    # 325 tests across 51 files
server/
  index.js                      # Express orchestrator (130 lines)
  routes/                       # 15 route modules (bonds, fx, crypto, etc.)
  lib/                          # 5 shared modules (cache, fetch, yahoo, stocks, rateLimits)
  datacache/                    # gitignored — daily JSON file cache
```

## Notes

- `yahoo-finance2` is an unofficial scraper — for personal/educational use only
- `server/datacache/`, `data/stocks/`, and `prices/` are gitignored
- All markets work with mock data if the server is unavailable
- FRED API key is free at [fred.stlouisfed.org/docs/api](https://fred.stlouisfed.org/docs/api/api_key.html)

## Recent Updates

- **Unified Dashboards** — Consolidated all 15 markets from multi-tab layouts to single-page "one-look" views
- **Bug Fixes** — Fixed data structure mismatches in Bonds, Credit, Crypto, Real Estate, Commodities, Sentiment dashboards
- **Heatmap Selection** — Restored click-to-select functionality in equities heatmap for detail panel
- **Test Coverage** — 325 tests passing across 51 files