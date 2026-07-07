# Change Log

This file tracks user-visible dashboard and data-contract changes. For exact diffs, use `git log`.

## 2026-07-07

### Performance & Reliability Optimizations (Phase 1)
- **Lazy Tab Mounting**: Implemented dynamic tab rendering in `HubLayout.jsx` that defers mounting of market components until their first click, cutting initial DOM node weight and context listener footprints.
- **Stale Context Prevention**: Replaced object-spreading identity issues in `getMarket` context accessor, preventing cascaded global React re-renders on every market tick.
- **Auto-Refresh Fix**: Rectified stale closure and interval resetting bugs in `App.jsx` where toggling auto-refresh did not clear or register timers correctly.
- **Node Server Uncaught Error Handler**: Added global logging error catchers for `uncaughtException` and `unhandledRejection` to protect the Node development server from hard crashes.

### Asynchronous Caching & Admin Hardening (Phase 2)
- **Async Caching Layer**: Converted local caching functions (`readDailyCacheAsync`, `writeDailyCacheAsync`, `readLatestCacheAsync`) to use Node's promise-based asynchronous `fs.promises` library, preventing event loop blocks.
- **Dynamic Administrative Verification**: Replaced hardcoded client-side admin email strings with server-side configurable authorization values via `process.env.ADMIN_EMAIL` and a dynamic `/api/admin/config` public configuration endpoint.

### Backend Modularity & Unit Testing (Phase 3)
- **Route Controller Factory**: Created `routeFactory.js` middleware wrapper to abstract standard cache-check, timeout loops, and fallback loading operations across Express controllers.
- **Express Route Testing**: Added comprehensive controller-level fallback and cache operations unit test suites for `globalMacro.test.js`, `commodities.test.js`, and `credit.test.js`.

### Frontend Code Modularization & Quality Gates (Phase 4)
- **DataProvider God Module Split**: Extracted stateless logical blocks (Firebase RTDB networking, structural quality validation guards, alerts evaluation, cache serialization) from the 765-line `DataProvider.jsx` file into clean helper modules under `src/hub/lib/`.
- **Vitest Scope & Thresholds Config**: Pinned Vitest scanner root scope strictly to the project folder, installed `@vitest/coverage-v8`, and set a strict 40% code coverage requirement across statements, branches, functions, and lines.

### Code Quality & Security Cleanup (Phase 5)
- **Consolidated Error Boundaries**: Created a single unified `ErrorBoundary.jsx` component supporting `"global"` and `"tab"` display variants, refactoring out local duplicate class definitions in `App.jsx` and `HubLayout.jsx`.
- **Externalized Ticker Map**: Moved the 350-line hardcoded static stock mapping out of `stocks.js` into an external `tickerMap.json` data configuration file read synchronously at server boot.
- **Dropdown Lifecycle Optimization**: Extracted inline `PanelDropdownItems` rendering functions to file-scope inside `MarketTabBar.jsx` to prevent redundant dropdown unmounting during state updates, and replaced global namespace `window` assignments with standard CustomEvent dispatches.

## 2026-06-23

### Security Hardening

- **Admin auth bypass fixed** — `server/routes/admin.js` now verifies Firebase ID tokens via Google's identity toolkit REST API (no firebase-admin SDK needed in local dev). The previous code accepted any non-empty `Authorization` header and hardcoded the admin email.
- **SSRF protection** — Admin refresh/diagnose endpoints derive internal URLs from socket address or `LIVE_FUNCTIONS_BASE`/`ADMIN_REFRESH_BASE_URL` env vars, never from client-controllable `req.get('host')`/`req.protocol`.
- **Rate limiting on admin endpoints** — Per-IP rate limiter (20 requests / 15 min) added to both server and Firebase Functions admin routes.
- **Ollama DoS protection** — Dev-only `/api/ollama-extraction` endpoint now caps request body at 2MB.

### Data Pipeline Hardening

- **`needsLiveRepair` expanded to all 21 markets** — Previously only 4 markets had stale-snapshot detection. Now 10 markets have critical-field lists that force a live fetch when any field is null in the RTDB snapshot. Fixed a casing bug where `equityDeepDive` (missing `s`) was dead code.
- **10 structural guards hardened** — Guards for commodities, sentiment, globalMacro, crypto, equitiesDeepDive, insurance, realEstate, fx, imf, worldbank no longer short-circuit to `true` when their primary array field is absent. Each now requires minimum viable data from alternative fields.
- **FX static fallback masking fixed** — When live FX rates are unavailable, the dashboard now shows a warning banner instead of silently rendering hardcoded static rates with 0% changes.
- **Admin SDK databaseURL** — `admin.initializeApp()` now includes `databaseURL` to fix 500 on `/api/admin/diagnostics-report` when deployed via gcloud.

### Panel Fixes

- **Real Estate: Affordability Index + Supply & Demand panels hidden** — Both panels used `data?.length > 0` to gate conditional layout, but the backend returns objects (not arrays), so `Object.length` was `undefined` and the panels were silently removed from the layout. Fixed: checks now test for nested data presence. Panel bodies rewritten to render the actual object data (median price, price/income ratio, mortgage/income, housing starts, permits, months supply, active listings).
- **Insurance: 3 panels hidden** — Same type-mismatch bug: `combinedRatioData` has `.lines` key but layout checked `.byLine`; `sectorETF` is an object but layout checked `.length`; `reserveAdequacyData` is an object but layout checked `.length`. Fixed.
- **Commodities: Sector Performance w1/m1** — Enhanced route now fetches Yahoo historical chart data and computes weekly/monthly changes. Previously w1/m1 were hardcoded to null.
- **Commodities: PPI Commodity YoY** — Added `WPUFD49207` to FRED_COMMODITIES in the enhanced route so the Sector Performance PPI mini-chart has data.
- **Commodities: Commodity FX panel** — Added Yahoo FX pair fetching (AUDUSD, USDCAD, USDBRL, USDMXN, USDZAR, USDCOP) to the enhanced route. Previously only the legacy route built this.
- **Commodities: Curve Structure Board** — Added `spotPrice` to `futuresCurveData`/`goldFuturesCurve` so `curveSpreadPct()` can compute contango/backwardation. Previously showed "unavailable".
- **FX: Currency Correlation (30D)** — Fixed data shape mismatch: Frankfurter API returns history keyed by date, component expects currency→array. Frontend normalizer now transforms the shape.
- **Equities: Key Indices Asian tickers** — RTDB snapshot was overriding live-fetched quotes, dropping Asian indices (Shanghai, CSI 300, Shenzhen) that were missing from the midnight UTC snapshot. Fixed: live quotes now merge with RTDB instead of being replaced.
- **Bonds: 8 panels showing stale** — `needsLiveRepair` now detects when critical bonds fields (spreadHistory, fedBalanceSheet, M2, CPI, breakevens, durationLadder, macroData) are null in the RTDB snapshot and forces a live fetch.

### Panel Trace Inspector (Analytics Tab)

- **New: Panel Trace Inspector** — Traces data flow from frontend panel → backend field → external API for every panel in 13 markets. Shows field presence, shape, `_sources` flags, and verdict per panel.
- **New: `/api/analytics/panel-trace/:market` endpoint** — Fetches live API data, inspects each field, returns structured trace with shape, count, sample, and source flag.
- **New: `shapeCheck` validation** — 8 panels now validate internal data structure (e.g. FX history must be keyed by currency code, not date). Catches shape mismatches that field-prescence checks miss.
- **New: `SHAPE` status badge** — Fifth status level for panels where the field is present but structured incorrectly.
- **New: `shared/route-list.json`** — Single source of truth for the route list, used by Vite proxy config, Firebase Functions, and server.
- **New: `docs/plans/panel-diagnostics-expansion.md`** — Implementation plan for comprehensive panel diagnostics.

### Route List Dedup

- Extracted canonical route list to `shared/route-list.json` so the Vite dev proxy, Express server, and Firebase Functions all stay in sync. Previously the route list was duplicated in three places with drift.

## 2026-06-22

### API And Data Contract Docs

- Added `docs/API_ENDPOINTS.md` as the current route inventory for future agents.
- Documented DataProvider endpoints, RTDB snapshot coverage, Functions aliases, admin routes, direct ticker routes, and cross-market bindings.
- Refreshed README and data-pipeline docs to describe the current GitHub Pages + Firebase Functions + RTDB setup.

### Commodities Intelligence Expansion

- Added a strategic-materials catalog in `src/data/strategicMaterials.js`.
- Added Commodities panels:
  - Strategic Materials Periodic Grid
  - Criticality Leaderboard
  - Battery Supply Chain
  - Precious Metals Complex
  - Commodity Regime Dashboard
  - Energy Stack
  - Curve Structure Board
  - Strategic Material Detail
  - Material-to-Sector Exposure Matrix
- Strategic-material panels use curated criticality/import-reliance metadata and live futures proxies where available.

### Cross-Market Enrichment Panels

- Added Analytics Endpoint Coverage Matrix.
- Added Calendar Market Catalyst Wall.
- Added Equity+ Earnings Quality & Revision Monitor.
- Added Commodities Physical Supply Pressure.
- Added Watchlist Cross-Market Alert Board.

### Data Confidence And Binding Cleanup

- Added frontend market normalization/view-model layer for high-impact tabs.
- Improved partial snapshot handling so sparse-but-valid endpoints can render available values.
- Reduced console noise from expected sparse data.
- Added version marker / refresh flow to avoid stale GitHub Pages bundles looking broken after deploys.

### Auth And Admin UX

- Admin refresh controls are gated behind Firebase Auth.
- Guest users see simple admin-required messaging instead of technical token errors.
- Admin email is not exposed in guest-facing error copy.

### GitHub Pages/Firebase Configuration

- Moved public frontend configuration into GitHub Actions variables.
- Production frontend points to the external Firebase Functions backend through `VITE_API_BASE_URL`.
- No Firebase Functions deploy is needed for frontend-only panel/layout changes.
