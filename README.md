# Global Market Hub

Multi-market financial dashboard (React 18 + Vite 5 + Express). Equities heatmap,
bonds, FX, derivatives, real estate, insurance, commodities, macro, crypto,
credit, sentiment, calendar, labor (BLS), energy (EIA), Census, IMF, World Bank,
and more — bento grids with data from Yahoo Finance, FRED, CoinGecko, and
government APIs.

![Market Hub Tour](screenshots/market_hub_tour.gif)

## Getting started

```bash
# 1. install (also installs git hooks via npm prepare → .githooks)
npm install
cd server && npm install && cd ..

# 2. configure API keys (interactive — creates .env from .env.example)
npm run setup

# 3. launch backend + Vite (local dashboard)
npm run dev          # dashboard on port 5173, API on 3001
# or: npm run start:dev

# 4. quality gate before any push
npm run preflight
```

**DataProvider** fetches market `/api/*` once on load (cache-first). Further
updates only when you press **topbar ▶** (all markets) or a **panel footer ▶**
(that market). No auto-polling — this is not a real-time streaming app.
Panel shells stay mounted; empty sources show waiting/empty states, not fake numbers.

**Panel health (F/D/C):** each panel is operationally **ok** when **fetch**
(placeholder streams), **display**, and **confirm** all pass. The health bridge
can complete D/C from fetch samples when UI stamps lag — splash splits
**UI ok** vs **bridge-only**. Prefer `uiOk` / false-green probes for product quality.
Independent modules live under `src/panels/`. Splash can score every catalog panel (~233).

**Docs:** [`docs/README.md`](docs/README.md) · [`AGENTS.md`](AGENTS.md) ·
[`PROJECT_MEMORY.md`](PROJECT_MEMORY.md) · [`docs/API_ETIQUETTE.md`](docs/API_ETIQUETTE.md) ·
[`docs/PANEL_HEALTH_CHRONIC_REVIEW.md`](docs/PANEL_HEALTH_CHRONIC_REVIEW.md)

### API keys

Free tiers in `.env` (gitignored). Skip any and matching panels degrade.

| Key | Powers | Signup |
|---|---|---|
| `FRED_API_KEY` | bonds, macro, credit, fx, sentiment, real estate, insurance, calendar | [FRED](https://fred.stlouisfed.org/docs/api/api_key.html) |
| `EIA_API_KEY` | commodities supply/demand, eia tab | [EIA](https://www.eia.gov/opendata/register.php) |
| `BLS_API_KEY` | bls tab (optional — falls back to FRED) | [BLS](https://data.bls.gov/registrationEngine/) |

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `npm run start:dev` | Local Vite + API: dashboard on 5173, Express on 3001 |
| `npm start` | Express API only (`node server/index.js`, port 3001 / `$PORT`) |
| `npm run setup` | Interactive `.env` walkthrough |
| `npm test` | Vitest unit suite |
| `npm run test:health` | Focused health/regression pack (gates + recovery + etiquette) |
| `npm run probe:panels` | Offline fetch-gate score vs `server/datacache` (~233 panels) |
| `npm run probe:fdc` | **Live F/D/C** for all panels (Playwright + splash; needs `npm run dev`) |
| `npm run housekeep:dry` | Collectors + `test:health` (no Ollama) |
| `npm run preflight` | **Required before push** — secrets + workflow lint + vitest |
| `npm run preflight:full` | Preflight + production build + functions build |
| `npm run lint:workflows` | Blocks invalid GHA patterns (`secrets.X != ''`) |
| `npm run api:health` | Strict hosted API probe |
| `npm run postdeploy:warm` | Warm priority `/api/*` after App Hosting deploy |
| `npm run test:validate` | Playwright crawl + screenshots |
| `npm run test:coverage` | Strict per-panel coverage (`tests/panel-registry.js`) |

**Live F/D/C check** (after `npm run dev`):

```bash
npm run probe:fdc
# report → reports/live-fdc.json
# Browser console on splash: window.__kyahooPanelHealth.evaluateNow()
```

Use `http://localhost:5173` (not `127.0.0.1` on some Windows setups).  
Env: `FDC_PASS_RATE` (default 0.85), `FDC_SETTLE_MS`, `SHOT_BASE_URL`.

Agents: [`AGENTS.md`](AGENTS.md). CI detail: [`docs/CI_PREFLIGHT_GUIDE.md`](docs/CI_PREFLIGHT_GUIDE.md).  
API etiquette (FRED 120/min, IMF circuit): [`docs/API_ETIQUETTE.md`](docs/API_ETIQUETTE.md).

**Stale local cache after code changes:**

```bash
del server\datacache\*.json     # Windows
rm  server/datacache/*.json     # mac/linux
```

---

## Markets (18 tabs)

| # | Market | Sources (summary) |
|---|--------|-------------------|
| 1 | Equities | Yahoo (static universe + quotes), Frankfurter FX; heatmap size Auto/Dense/Sparse |
| 2 | Bonds | FRED yields, spreads, breakevens |
| 3 | FX | FRED + Frankfurter |
| 4 | Derivatives | Yahoo VIX/options, FRED |
| 5 | Real Estate | Yahoo REITs, FRED housing |
| 6 | Insurance | Yahoo insurers, FRED; some panels limited free data |
| 7 | Commodities | Yahoo futures, FRED, EIA, USDA, Census |
| 8 | Global Macro | World Bank, FRED |
| 9 | Equity+ | Yahoo sector/factor/earnings/insider |
| 10 | Crypto | CoinGecko, DeFiLlama, Bybit, mempool |
| 11 | Credit | FRED spreads, Yahoo credit ETFs |
| 12 | Sentiment | Fear & Greed, CFTC, FRED, Yahoo |
| 13 | Calendar | FRED releases, Yahoo earnings |
| 14 | Labor (BLS) | BLS (FRED fallback) |
| 15 | Energy (EIA) | EIA |
| 16 | Alerts | Client-side rules over other markets (no dedicated fetch) |
| 17 | Watchlist | Yahoo quotes + metric shortcuts |
| 18 | Analytics | Server metrics, cache, panel diagnostics |

Backend-only dependency markets (not tabs, fetched by other tabs):
IMF, World Bank, Census, BEA, Treasury Fiscal Data.

Panel-level inventory: [`docs/PANELS.md`](docs/PANELS.md). Intentional gaps: [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

---

## Architecture (current)

```
External APIs → server/ Express (/api/*) on App Hosting Cloud Run
             → disk datacache + optional GCS (MARKET_CACHE_BUCKET)
             → FRED throttle / IMF circuit (etiquette)
             → browser DataProvider (wave fetch; force-live demotes when FRED hot)
             → useMarketData(id) → MarketPanelGrid / src/panels/*
             → panel health: fetch + display + confirm (+ health bridge stamps)
```

| Concern | Where |
|---------|--------|
| Production | **Firebase App Hosting** (same-origin `/api/*`) |
| Market routes | `server/routes/*`, `shared/api-routing.json` |
| Client fetch | `src/hub/DataProvider.jsx` |
| Panel catalog | `src/data/marketPanels.js` |
| Independent panels | `src/panels/` (`definePanel`, registry, per-market modules) |
| Health | `src/hub/lib/panelHealthEval.js`, `panelHealthStamp.js`, `usePanelHealth.js` |
| Placeholders | `src/data/panelPlaceholders.js` |
| Recovery agent | `src/hub/lib/recoveryAgent.js`, `POST /api/agent/recover-plan` |
| Equity universe | `src/data/stockUniverse.js` |
| Heatmap size | `src/components/HeatmapView/heatmapSizeControl.js` |
| Nightly history | Functions `refreshMarketSnapshots` → RTDB (optional; not primary live UI) |

Green panel health means **fetch + display + confirm** all pass for that panel
(splash can score the full catalog). Open-tab dots still require a visible tab
for green UI chrome. Details: [`docs/DATA_PIPELINE.md`](docs/DATA_PIPELINE.md),
[`docs/TEST_HEALTH_SUITE.md`](docs/TEST_HEALTH_SUITE.md),
[`PROJECT_MEMORY.md`](PROJECT_MEMORY.md).

### App features (high level)

- Bento grids (`BentoWrapper` + `BentoCard`), layout in `localStorage`
- Dark/light theme, PNG/CSV export, global search, multi-monitor pop-outs
- Panel health dots on market tabs (honest 3-gate status)
- Equities: heatmap, bar race, list, detail panel; density Auto/Dense/Sparse

### Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, ECharts, react-grid-layout |
| Backend | Express on App Hosting (Cloud Run) |
| Cache | Daily disk + optional GCS |
| Tests | Vitest + Playwright validate/coverage |
| Deploy | Push `master` → App Hosting; then `npm run postdeploy:warm` |

**Production URL:** https://kyahoofinance032926--kfinance032926.us-central1.hosted.app  

Deploy ops: [`docs/DEPLOY.md`](docs/DEPLOY.md). Shared cache: [`docs/SHARED_CACHE.md`](docs/SHARED_CACHE.md).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Always run `npm run preflight` before push.
Do not commit secrets; do not use `secrets.X != ''` in GitHub Actions.

## Notes

- Project notes: [`NOTES.md`](NOTES.md)
- Layout keys: [`docs/layout-keys.md`](docs/layout-keys.md)
- Bento chrome: [`docs/components/BentoCard.md`](docs/components/BentoCard.md)
