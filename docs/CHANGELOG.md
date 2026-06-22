# Change Log

This file tracks user-visible dashboard and data-contract changes. For exact diffs, use `git log`.

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
