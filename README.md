# Global Market Hub

A comprehensive multi-market financial dashboard built with React 18 + Vite 5. Covers 16 market views (15 asset classes + analytics dashboard) with unified "one-look" dashboards, live data from Yahoo Finance, FRED, CoinGecko, and more. Includes a 350+ stock global equity heatmap with historical playback.

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
| 16 | **Analytics** | API Usage, Endpoint Metrics, Data Freshness, Rate Limits, Cache Files | Slate `#94a3b8` | Server-side endpoint tracker, rate limit counters, file cache metadata |

---

## Data Shown Per Market Tab

### 1. Equities
**Sidebar:**
- Key Metrics: S&P 500, Nasdaq 100, Dow Jones, Russell 2000 prices with % change
- Market Stats: Total market cap, advancers/decliners, new highs/lows
- VIX Level: Current value with fear/greed indicator
- Fed Funds: Current rate, next meeting expectation

**Main Panels:**
- **Heatmap**: 350+ global stocks colored by % change, sized by market cap, grouped by sector/region
- **Bar Race**: Animated top 30 stocks with historical playback
- **List View**: Sortable table with ticker, name, sector, region, market cap, % change
- **Detail Panel**: On-click expansion with chart, fundamentals, analysts, fair value

### 2. Bonds
**Sidebar:**
- Yield Curve: US 3M, 2Y, 5Y, 10Y, 30Y with steepest/flattest indicators
- Spread Indicators: 2s10s, 10s3s, 5s30s spread values
- Credit Spreads: IG OAS, HY OAS, EM OAS current values
- Breakevens: 5Y, 10Y inflation expectations
- Fed Funds: Current rate + futures curve

**Main Panels:**
- **Yield Curve**: Multi-country comparison (US, DE, JP, GB, IT, FR, etc.)
- **Credit Spreads**: 12-month IG/HY/EM/BBB spread history
- **Spread History**: 2s10s, 10s3s, 5s30s time series (252 days)
- **CPI Components**: All Items, Core, Food, Energy YoY% (60 months)
- **Debt-to-GDP**: US federal debt trajectory (20 years quarterly)
- **Real Yields**: TIPS 5Y/10Y history
- **Breakevens**: 5Y, 10Y, 5Y5Y forward inflation expectations

### 3. FX
**Sidebar:**
- Key Pairs: EUR/USD, USD/JPY, GBP/USD, USD/CHF with % change
- Movers: Top 12 currency movers vs USD
- Averages: G10 avg, EM avg change
- Rate Differentials: Fed vs ECB, BOE, BOJ spreads
- COT Positioning: Net speculative positions as % of OI

**Main Panels:**
- **Top Movers Table**: Currency, % change, 1W sparkline
- **DXY Chart**: Dollar Index 1-year history
- **COT Positioning Chart**: Net positioning history for major pairs (52 weeks)
- **Currency Correlation Matrix**: 30-day rolling correlation heatmap (G10)
- **REER Chart**: Real Effective Exchange Rates (US, EU, JP, GB, CN)
- **Rate Differentials Table**: Central bank rate spreads

### 4. Derivatives
**Sidebar:**
- VIX: Spot, VVIX, contango/backwardation %
- Volatility: Put/Call ratio, ATM 1M IV, VIX percentile
- Term Spread: 1M-3M VIX spread with state indicator
- SKEW Index: Tail risk premium with interpretation
- Gamma Exposure: Total GEX, call/put gamma, net gamma

**Main Panels:**
- **VIX Term Structure**: 9D, 1M, 3M, 6M futures vs previous close
- **VIX History**: 252-day spot VIX chart
- **SKEW Index History**: 252-day SKEW with neutral reference line
- **Vol Surface Heatmap**: SPX implied vol by strike/expiry
- **Options Flow**: Recent large block trades
- **Vol Premium**: ATM IV vs realized vol spread
- **Gamma Exposure Table**: Total, call, put, net gamma ($B)

### 5. Real Estate
**Sidebar:**
- Key Prices: Gold, WTI Oil, Natural Gas with 1D change
- Ratios & ETFs: Gold/Oil ratio, DBC ETF % change, contango %
- Positioning: COT net long/short for major commodities

**Main Panels:**
- **Case-Shiller Chart**: National + major metros (SF, NYC, LA, Miami, Chicago)
- **Home Prices Table**: Regional Case-Shiller indices with YoY change
- **Foreclosure & Delinquency Chart**: 12-month history
- **MBA Applications Chart**: Purchase vs refi index
- **CRE Delinquencies Chart**: Commercial RE loan delinquencies
- **REIT Screen Table**: Top REITs with sector, dividend yield, P/FFO, YTD return
- **Affordability**: Median price, price-to-income, mortgage-to-income
- **Housing Supply**: Housing starts, permits, months supply, active listings

### 6. Insurance
**Sidebar:**
- Combined Ratio: Industry average with profitability indicator
- Reinsurers: PGR, ALL, TRV, HIG with % change
- HY OAS Spread: Current value

**Main Panels:**
- **HY OAS History Chart**: 252-day high-yield spread
- **Combined Ratio by Line**: Auto, home, commercial, etc. profitability
- **Reinsurance Rates**: By category (property, casualty, etc.)
- **Reserve Adequacy Table**: Insurer reserves vs required
- **Cat Bond Spreads**: ILS market spreads
- **Natural Cat Losses Chart**: NPORCT annual losses
- **Industry Combined Ratio History**: Quarterly trend with 100% breakeven line
- **Sector ETFs**: KIE with 52-week range

### 7. Commodities
**Sidebar:**
- Key Prices: Gold, WTI Oil, Natural Gas with 1D change
- Ratios & ETFs: Gold/Oil ratio, DBC ETF % change, contango %
- Positioning: COT net long/short for major commodities

**Main Panels:**
- **Energy Table**: Crude, natural gas, gasoline prices
- **Metals Table**: Gold, silver, copper prices
- **Gold Price Chart**: 252-day history
- **WTI Oil Chart**: 252-day history
- **Natural Gas Chart**: 252-day history
- **Agriculture Table**: Corn, soybeans, wheat prices
- **Sector Performance Table**: Energy, metals, agriculture % changes
- **COT Positioning Table**: Net long/short positions by commodity
- **Supply/Demand Table**: Surplus/deficit by commodity
- **Commodity FX Table**: CAD, AUD, NOK, BRL rates vs USD
- **Gold Futures Curve**: Term structure by expiry

### 8. Global Macro
**Sidebar:**
- GDP Growth: US, EU, China, Japan real GDP YoY
- Inflation: CPI by country with central bank target comparison
- Central Bank Rates: Fed, ECB, BOE, BOE, SNB, RBA, BOC, BOJ
- Debt/GDP: Government debt ratios

**Main Panels:**
- **Country Scorecards**: 12 countries with growth, inflation, rates, currency, equity
- **GDP Growth Chart**: Multi-country comparison
- **Inflation Chart**: CPI trends by country
- **Policy Rate Chart**: Central bank rates history
- **Debt Monitor**: Government debt-to-GDP trends
- **Currency Strength Matrix**: Relative performance

### 9. Equities+ (Deep Dive)
**Sidebar:**
- Sector Performance: 11 GICS sectors with % change
- Factor Returns: Value, growth, momentum, quality, low vol
- Earnings Surprise: Latest beat/miss rates
- Short Interest: Highest short interest stocks

**Main Panels:**
- **Sector Rotation Chart**: Performance heatmap by sector/time
- **Factor Rankings Table**: Factor exposures sorted by return
- **Earnings Calendar**: Upcoming earnings with expected surprise
- **Short Interest Table**: Highest short interest with days to cover
- **Institutional Ownership**: Top holders by stock
- **Insider Trading**: Recent insider buys/sells

### 10. Crypto
**Sidebar:**
- BTC/ETH: Price, 24h change, market dominance
- Market: Total cap, stablecoin cap, ETH gas
- Fear & Greed: Current value with classification

**Main Panels:**
- **Top Cryptos Table**: Top 20 by market cap with price, change
- **Fear & Greed Chart**: 252-day history with fear/greed thresholds
- **Funding Rates Table**: Bybit perp funding rates
- **Top Exchanges Table**: Volume by exchange
- **DeFi TVL by Chain**: Total value locked breakdown
- **On-Chain Metrics**: Network stats, hash rate, active addresses

### 11. Credit
**Sidebar:**
- Credit Spreads: IG OAS, HY OAS, EM spread with color coding
- Default Watch: Default rate, delinquency metrics
- Short-Term: Commercial paper rate

**Main Panels:**
- **Credit Spreads Chart**: IG/HY 12-month history
- **Spread Summary Table**: IG, HY, EM, BBB current spreads
- **EM Spread History Chart**: EM sovereign spread
- **EM Yields Table**: Country 10Y yields
- **Commercial Paper Table**: AA 30-day rate, volume
- **CLO Tranches Table**: AAA/AA/A tranche yields
- **Default Rates Table**: By category
- **Delinquency Rates Table**: Consumer credit delinquencies

### 12. Sentiment
**Sidebar:**
- Fear & Greed: Current value with classification (Extreme Fear to Extreme Greed)
- Risk Metrics: VIX level, put/call ratio, HY spread
- Leverage: Margin debt, consumer credit

**Main Panels:**
- **Fear & Greed Chart**: 252-day history with fear/greed zones
- **Financial Stress Index Chart**: St. Louis FSI history
- **Cross-Asset Returns Table**: Equities, bonds, commodities, crypto % change
- **Risk Signals Table**: Multiple indicators with risk-on/risk-off classification
- **Leverage Metrics Table**: Margin debt, consumer credit values

### 13. Calendar
**Sidebar:**
- Today's Events: Economic releases, earnings
- This Week: Key dates summary

**Main Panels:**
- **Economic Calendar Table**: Date, time, event, consensus, previous, impact
- **Central Bank Meetings**: Upcoming FOMC, ECB, BOJ dates
- **Earnings Season**: High-profile earnings calendar
- **Key Releases**: CPI, NFP, GDP, FOMC highlights

### 14. Alerts
**Sidebar:**
- Active Alerts Count: Number of triggered alerts
- Last Check: When alerts were last evaluated

**Main Panels:**
- **Active Alerts Table**: Alert name, condition, current value, threshold, severity
- **Alert Rules Table**: All configured rules with enable/disable toggle

**Alert Rules (Default):**
1. VIX Spike: VIX > 30
2. Curve Inversion: 2s10s < 0
3. HY Stress: HY OAS > 400bps
4. Fear Extreme: F&G < 20
5. Greed Extreme: F&G > 80
6. BTC Move: BTC ±5% in 24h
7. Gold Move: Gold ±3% in 24h
8. DXY Move: DXY ±2% in 24h

### 15. Watchlist
**Sidebar:**
- Quick Metrics: VIX, DXY, 10Y Treasury, BTC, Gold, SPX, HY Spread, Fear & Greed shortcuts

**Main Panels:**
- **My Tickers**: Custom list of tickers with live quotes, add/remove functionality
- **My Metrics**: Shortcuts to key metrics across markets

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
- **react-grid-layout v2** — bento-box dashboards with draggable/resizable panels, layout persistence via `localStorage`
- **BentoWrapper** — shared component (`src/components/BentoWrapper.jsx`) with `storageKey` prop, `.bento-panel-title-row` drag handle, `.bento-panel-content` drag cancel, responsive breakpoints. Each market tab uses `BentoWrapper` with its own `storageKey` (e.g., `"commodities-layout"`, `"bonds-layout"`, `"macro-layout"`)
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
| Tests | Vitest 4, @testing-library/react — 297 tests across 49 files |
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
    analytics/                  # API usage, endpoint metrics, data freshness, cache inventory
  components/                   # Shared: BentoWrapper, SafeECharts, HeatmapView, DetailPanel, Sidebar, etc.
  utils/                        # FX rates, fetchWithRetry, data helpers, constants
  __tests__/                    # 297 tests across 49 files
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

  - **Bento Grid Layout** — Converting all 15 market dashboards from static sidebar+grid layouts to draggable/resizable bento-box panels using `react-grid-layout`. Panels can be rearranged by dragging the title bar and resized via corner handles. Layout changes persist to `localStorage` per tab, so users don't lose their arrangement when switching markets.
  - **Bento Persistence** — `BentoWrapper` component saves panel positions to `localStorage` via `storageKey` prop. Each market (equities, bonds, commodities, FX, etc.) has its own key. Drag handles use `.bento-panel-title-row`, content areas use `.bento-panel-content` for text selection while preventing accidental panel drags.
  - **All 16 Market Views Converted** — Every tab now uses the bento grid layout: Equities, Bonds, Commodities, FX, Derivatives, Real Estate, Insurance, Global Macro, Equities+ (Deep Dive), Crypto, Credit, Sentiment, Calendar, Alerts, Watchlist, Analytics. Each has its own `storageKey` for localStorage persistence. Calendar and Watchlist use tab-dependent layouts (different bento configs per sub-tab).
  - **CSS Consolidation** — Each market has a single consolidated CSS file. Old split CSS files (MacroComponents, CountryDetailPanel, EquityComponents, InstitutionalHoldings, CryptoComponents, CreditComponents, SentimentComponents, DerivativesMarket, RealEstateMarket, InsuranceMarket, FXMarket, GlobalMacroMarket, CalendarComponents, AlertsMarket) have been deleted. Sub-component CSS imports now point to the single dashboard-level or market-level CSS.
  - **Flex Layout Fix** — All bento dashboards now fill the full viewport height. Fixed a CSS flex chain issue where `main` wasn't a flex container, causing panels to show only ~35% of available space. Added `display: flex; flex-direction: column` to `<main>` and moved `.com-bento-root` flex rules into shared `BentoWrapper.css` for consistent loading order.
  - **BentoWrapper Shared Styles** — Moved core `.com-bento-root` flex rules and card base styles into `BentoWrapper.css` so they're always available regardless of which tab loaded first. This prevents layout breaks when visiting markets in different orders.
  - **Responsive Bento Content** — Panel contents scale to fit card size using CSS container queries (`@container bento-card` and `@container panel-content`). KPI pills, charts, tables, and metrics shrink gracefully when panels are resized smaller, instead of overflowing/scrolling.
  - **Consolidated CSS** — Each market has a single CSS file with bento grid styles, container queries, and resize handle overrides. Market-specific accent colors (gold for commodities, green for bonds, amber for crypto, cyan for credit, etc.) are preserved on hover/border.
  - **ECharts Dimension Safety** — Added `SafeECharts` wrapper that waits for valid container dimensions before rendering, preventing "instance disposed" and zero-dimension errors during tab switching and initial load.
  - **Derivatives Key Fix** — Fixed duplicate React key warning (`SPY`, `QQQ`) in Options Flow by using `${ticker}-${strike}-${expiry}-${type}` composite keys.
  - **Unified Dashboards** — Consolidated all 15 markets from multi-tab layouts to single-page "one-look" views
  - **Bug Fixes** — Fixed data structure mismatches in Bonds, Credit, Crypto, Real Estate, Commodities, Sentiment dashboards
  - **Heatmap Selection** — Restored click-to-select functionality in equities heatmap for detail panel
  - **Test Coverage** — 297 tests passing across 49 files
  - **Analytics Dashboard** — New tab showing API usage stats (external calls per source, rate limit usage), endpoint metrics (calls, avg/max response times, error rates), data freshness (current/stale/no-cache status per market), and cache file inventory. Server-side endpoint tracker middleware records every `/api/*` request. Accessible as the 16th tab.