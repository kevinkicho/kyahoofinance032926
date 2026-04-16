# Project Memory — Yahoo Finance Clone with Data Provenance

## Goal
Build a financial dashboard app with complete data provenance transparency. Every data point must show its source, timestamp down to seconds with UTC offset, and provide clickable links to verify data via the original API. Never display mock/deceptive data.

## Key Rules
- Never use "Live" label for REST API data — only "LIVE" for real-time streaming, "FETCHED" for fetched data, "NO DATA" or "PENDING" otherwise
- Never display mock/deceptive data — show "—" or empty state if no data
- Every data value should be hoverable/clickable to reveal source (FRED series ID, API endpoint URL), timestamp, and link to reproduce
- All timestamps show down to seconds (YYYY-MM-DD HH:MM:SS) with UTC offset indicator
- Data footers at bottom of each panel show provenance badge (FETCHED/NO DATA/PENDING), data source name, timestamp, and clickable popover showing full API call history
- Popovers should be click-to-open (not hover), auto-position to avoid overflow, and all links inside must be clickable
- "Fetch JSON" links should include the API key so users can reproduce queries in browser
- Data should NOT auto-fetch on every tab visit — only fetch when user clicks the play/refresh button or enables auto-refresh
- The Provenance Audit panel on /analytics should cross-reference all endpoints' _sources against FRED, with Verify buttons
- Every major data value in every panel across every tab should be wrapped in MetricValue so users can click to see source info
- **Charts are clickable**: when a user clicks data points/bars/lines in any ECharts chart, a ChartSourcePopover shows provenance info (source, endpoint, FRED series, Fetch JSON links)

## Architecture

### Core Provenance Infrastructure
- `src/components/MetricValue/MetricValue.jsx` — SERIES_MAP with ~180+ entries, click-to-open popover showing source, series ID, value, timestamp (local + UTC offset + UTC), FRED Series Page link, Fetch JSON link. Smart positioning that flips above/below.
- `src/components/MetricValue/MetricValue.css` — Styling for MetricValue root and popover
- `src/components/DataFooter/DataFooter.jsx` — SOURCE_META dictionary with ~130+ entries, per-source provenance popover. Click-to-open with expandable API Call History entries. stopPropagation on mouse/touch events. Smart positioning.
- `src/components/DataFooter/DataFooter.css` — Styling for DataFooter
- `src/components/SafeECharts/SafeECharts.jsx` — Modified to accept `sourceInfo` prop. When provided, clicking any chart element opens a ChartSourcePopover. Merges click handler with existing onEvents.
- `src/components/SafeECharts/ChartSourcePopover.jsx` — Portal-based popover that appears near the click point. Shows chart title, source, endpoint URL, FRED series IDs with Series Page and Fetch JSON links.
- `src/hooks/useDataStatus.js` — Shared hook: fetchLog, logFetch(), isLive, lastUpdated
- `src/utils/fetchWithRetry.js` — cache: 'no-store'

### Analytics
- `src/markets/analytics/AnalyticsMarket.jsx` — ProvenanceAudit, MARKET_ENDPOINTS, ENDPOINT_SERIES_MAP (all 12+ endpoints), verifyFRED()

### Hub/Layout
- `src/hub/HubLayout.jsx` — autoRefresh default false, refreshKey state, handleRefresh callback
- `src/hub/MarketTabBar.jsx` — ▶ refresh button + On/Off toggle, onRefresh prop
- `src/hub/MarketTabBar.css` — .hub-refresh-btn styling added

### Server Routes (all modified — _sources added, silent catches fixed, thresholds fixed)
- `server/routes/bonds.js`, `fx.js`, `credit.js`, `insurance.js`, `commodities.js`, `commoditiesEnhanced.js`, `crypto.js`, `derivatives.js`, `realEstate.js`, `sentiment.js`, `calendar.js`, `globalMacro.js`, `equityDeepDive.js`
- `server/lib/fetch.js` — User-Agent, Accept, redirect following, HTTP error handling
- `server/lib/cache.js` — readDailyCache, writeDailyCache

### Data Hooks (all modified — mock data removed, fetchLog/refetch added, thresholds fixed, refreshKey added)
- `src/markets/bonds/data/useBondsData.js`, `fx/data/useFXData.js`, `commodities/data/useCommoditiesData.js`, `crypto/data/useCryptoData.js`, `credit/data/useCreditData.js`, `insurance/data/useInsuranceData.js`, `derivatives/data/useDerivativesData.js`, `realEstate/data/useRealEstateData.js`, `sentiment/data/useSentimentData.js`, `calendar/data/useCalendarData.js`, `globalMacro/data/useGlobalMacroData.js`, `equitiesDeepDive/data/useEquityDeepDiveData.js`, `equitiesDeepDive/data/useInstitutionalData.js`, `alerts/data/useAlertsData.js`

---

## Discoveries (important for future work)

1. **Root cause of "Missing" false positives**: Over 50 conditions across 14 data hook files used strict thresholds (>= 20, >= 12, etc.) that silently discarded valid-but-short datasets. ALL changed to simple truthy checks.
2. **Server-side strict thresholds**: realEstate.js had 14 thresholds, bonds.js had 3. All changed to > 0.
3. **Stale daily cache**: After code fixes, must delete `server/datacache/*.json` so next request fetches fresh data.
4. **Property name mismatches**: Server sent `rate30y`/`rate15y` (lowercase y) but dashboard checked `rate30Y`/`rate15Y` (uppercase Y). Server sent `impliedYield` but dashboard read `capRate`. Fixed.
5. **Missing state variables**: `reinsurancePricing` referenced but never declared. `useCallback` missing from alerts import. Fixed.
6. **Treasury Fiscal Data API 404**: Replaced with FRED equivalents (GFDEBTN, TB3MS, GS10, GS30).
7. **fetchJSON had no User-Agent**: Many government APIs reject requests without it. Added.
8. **50+ silent error catches**: All replaced with `console.warn`.
9. **Only bonds route had _sources**: Added to all 15+ route files.
10. **Popover click-through bug**: Fixed with `stopPropagation()` on mouse/touch events.
11. **Popover overflow**: Fixed by measuring rendered height and flipping above the trigger.
12. **SOURCE_DESCRIPTIONS keys didn't match**: Replaced with actual server-side keys in SOURCE_META.

---

## Completed Work

### 13 of 16 Tabs Fully Integrated with MetricValue + DataFooter + Chart SourceInfo:

**Bonds, FX, Commodities, Crypto, Credit, Insurance, Derivatives, Real Estate, Sentiment, Calendar, Global Macro, Equities Deep Dive, Alerts** — All have:
- `<DataFooter>` on every panel with source attribution, fetch log, and clickable popover
- `<MetricValue>` on every numeric data value (KPIs, table cells, sidebar metrics)
- `sourceInfo` prop on every `<SafeECharts>` chart (clickable provenance popover)
- Mock data completely removed
- Manual refresh system (▶ button + auto-refresh toggle)

### Specific Integration Details:

**Bonds**: 8 DataFooters, all yield/spread/CPI/macro values wrapped, 5 charts with sourceInfo, sub-component charts (SpreadMonitor, BreakevenMonitor, DurationLadder) covered

**FX**: 7 DataFooters, all rates/changes/differentials/COT values wrapped, 4 charts with sourceInfo. Top Movers currency codes clickable. RateMatrix sub-component KPIs and cross-rates wrapped.

**Commodities**: 5+ DataFooters, commodity prices table ALL cells wrapped (price, 1d/1w/1m%), SectorHeatmap table+heatmap cells wrapped, KPIs wrapped, all sub-component charts with sourceInfo (FuturesCurve, SupplyDemand, CotPositioning)

**Crypto**: 7 DataFooters, all KPIs wrapped, sub-components covered (CoinMarketOverview, FundingAndPositioning, DefiChains table values all wrapped, CycleIndicators, OnChainMetrics charts with sourceInfo)

**Credit**: 9 DataFooters, all values wrapped, sub-components covered (LoanMarket CLO table, IgHyDashboard ETF table, EmBonds table, DefaultWatch table values all wrapped, charts with sourceInfo)

**Insurance**: 9 DataFooters, all values wrapped, sub-components covered (ReinsurancePricing ROL/RPL table + KPIs, CatBondSpreads table + KPIs), 3 charts with sourceInfo

**Real Estate**: 10 DataFooters, all values wrapped (median home price, foreclosure, delinquency, REIT change, cap rate, affordability, supply/demand), 5 charts with sourceInfo, sub-component charts (REITScreen, PriceIndex) covered

**Derivatives**: 6 DataFooters, all values wrapped (contango%, ATM IV, VIX percentile, term spread, gamma exposure), 4 charts with sourceInfo, OptionsFlow sub-component table (strike, volume, OI, premium) wrapped

**Sentiment**: 6 DataFooters, all values wrapped (put/call ratio, cross-asset returns, risk signals, margin debt, consumer credit), 2 charts with sourceInfo, sub-components covered (FearGreed gauge/history, RiskDashboard charts, CftcPositioning, CrossAssetReturns table)

**Calendar**: 7 DataFooters, all values wrapped (event counts, surprise values, CB rates, earnings EPS/mktCap/dividends, release counts/previous values), sub-components covered (EconomicCalendar, CentralBankSchedule, EarningsSeason, KeyReleases)

**Global Macro**: 7 DataFooters, all values wrapped (per-country GDP/CPI/rate/unemp/debt, CFNAI, yield spread), charts with sourceInfo, sub-components covered (MacroScorecard KPIs + table, CentralBankRates, DebtMonitor, GrowthInflation, EconomicActivity)

**Equities Deep Dive**: 8 DataFooters, all values wrapped (SPY perf, factor scores, short interest, upcoming/institution counts, EPS estimates, institution AUM), 4 charts with sourceInfo, sub-components covered (EarningsWatch EPS, FactorRankings all 5 scores, InstitutionalHoldings, SectorRotation, ShortInterest charts)

**Alerts**: 1 DataFooter, alert values wrapped with ALERT_SERIES map

**Analytics**: ProvenanceAudit panel fetches all 12+ endpoints on demand, lists received/missing sources with Verify buttons. DataFooter imported but NOT rendered (dead import).

### SERIES_MAP: ~180+ entries covering all tabs and sub-components
### SOURCE_META: ~130+ entries covering all server _sources keys across all routes
### Charts with sourceInfo: ~86 SafeECharts instances

---

## REMAINING WORK (3 tabs not yet integrated)

### 1. Equities (Main) Tab — `src/markets/equities/EquitiesMarket.jsx`
**Status: NOT INTEGRATED**

This is the most complex tab. It uses a different architecture from other tabs (no separate Dashboard component; all UI is inline in EquitiesMarket.jsx). It has:
- **No `<MetricValue>` import or usage** — All numeric data (S&P 500 price, P/E ratio, market cap, change %, volume, sector performance) rendered as raw formatted strings
- **No `<DataFooter>` usage** — Uses custom `<div className="eq-panel-footer">` with inline text like `Data as of {dataTimestamp}` instead of the standardized DataFooter component
- **Charts** — ECharts treemap (HeatmapView.jsx), bar race (BarRaceView.jsx) — no sourceInfo prop
- **DetailPanel.jsx** — Has its own local `DataFooter` component (minimal, no fetch log or FRED links), displays stock fundamentals, analyst targets, fair value model — all unwrapped
- **ListView.jsx** — Table of stocks with price, change, change% — all unwrapped
- **HeatmapView.jsx** — ECharts treemap with tooltip formatters — these can't use MetricValue but the panel should have DataFooter + the chart should have sourceInfo

To integrate this tab:
1. Add `import MetricValue from '../../components/MetricValue/MetricValue'` and `import DataFooter from '../../components/DataFooter/DataFooter'`
2. Replace custom `eq-panel-footer` divs with `<DataFooter>` components
3. Wrap prices, change%, P/E, market cap, volume values with `<MetricValue>`
4. Add `sourceInfo` to HeatmapView and BarRaceView SafeECharts
5. Update DetailPanel.jsx — replace local DataFooter with shared DataFooter, wrap fundamentals/targets/fair-value outputs with MetricValue
6. Update ListView.jsx — wrap price, change, change% with MetricValue
7. Need `useDataStatus` or equivalent hook to provide `fetchLog`, `isLive`, `lastUpdated` to the tab
8. The equities tab has its own data flow (Yahoo Finance API, possibly WebSocket for live prices) — may need new SERIES_MAP entries like `sp500Price`, `stockPE`, `stockMarketCap`, etc.

### 2. Watchlist Tab — `src/markets/watchlist/WatchlistMarket.jsx`
**Status: NOT INTEGRATED**

Simpler tab — displays user's watchlist of stocks with price, change, change%. Has:
- **No `<MetricValue>` import or usage** — All 3 numeric columns rendered as raw formatted strings
- **No `<DataFooter>` usage** — No footer at all
- **No charts** — Just a table of watched tickers

To integrate:
1. Add MetricValue and DataFooter imports
2. Wrap price, change, change% with `<MetricValue seriesKey="watchlistPrice">`
3. Add `<DataFooter>` at the bottom
4. Need `fetchLog`, `isLive`, `lastUpdated` — may need `useDataStatus` hook integration

### 3. Analytics Tab — `src/markets/analytics/AnalyticsMarket.jsx`
**Status: PARTIALLY INTEGRATED (dead import)**

The ProvenanceAudit panel is fully built and working. But:
- **DataFooter imported but never rendered** (line 3: `import DataFooter from...` but no `<DataFooter>` JSX)
- Just need to add a `<DataFooter>` at the bottom of the analytics page

---

## Environment
- `.env` — FRED_API_KEY and VITE_FRED_API_KEY
- After any code changes, always: `Remove-Item -Path "server/datacache/*.json" -ErrorAction SilentlyContinue`
- Build command: `npx vite build`
- No automated test suite

## Key Files Quick Reference

| Purpose | Path |
|---|---|
| MetricValue component | `src/components/MetricValue/MetricValue.jsx` |
| DataFooter component | `src/components/DataFooter/DataFooter.jsx` |
| SafeECharts (chart wrapper) | `src/components/SafeECharts/SafeECharts.jsx` |
| ChartSourcePopover | `src/components/SafeECharts/ChartSourcePopover.jsx` |
| Shared data hook | `src/hooks/useDataStatus.js` |
| Hub layout | `src/hub/HubLayout.jsx` |
| Tab bar | `src/hub/MarketTabBar.jsx` |
| Server fetch lib | `server/lib/fetch.js` |
| Server cache | `server/lib/cache.js` |
| Provenance Audit | `src/markets/analytics/AnalyticsMarket.jsx` |