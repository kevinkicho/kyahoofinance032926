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

# 3. launch backend + Vite
npm start            # → http://localhost:5173

# 4. quality gate before any push
npm run preflight
```

**DataProvider** fetches market `/api/*` once on load (cache-first). Further
updates only when you press **topbar ▶** (all markets) or a **panel footer ▶**
(that market). No auto-polling — this is not a real-time streaming app.
Panel shells stay mounted; empty sources show waiting/empty states, not fake numbers.

**Docs:** [`docs/README.md`](docs/README.md) · [`AGENTS.md`](AGENTS.md) · [`PROJECT_MEMORY.md`](PROJECT_MEMORY.md)

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
| `npm start` | Express + Vite on 5173 |
| `npm run setup` | Interactive `.env` walkthrough |
| `npm test` | Vitest unit suite |
| `npm run preflight` | **Required before push** — secrets + workflow lint + vitest |
| `npm run preflight:full` | Preflight + production build + functions build |
| `npm run lint:workflows` | Blocks invalid GHA patterns (`secrets.X != ''`) |
| `npm run api:health` | Strict hosted API probe |
| `npm run postdeploy:warm` | Warm priority `/api/*` after App Hosting deploy |
| `npm run test:validate` | Playwright crawl + screenshots |
| `npm run test:coverage` | Strict per-panel coverage (`tests/panel-registry.js`) |

Agents: [`AGENTS.md`](AGENTS.md). CI detail: [`docs/CI_PREFLIGHT_GUIDE.md`](docs/CI_PREFLIGHT_GUIDE.md).

**Stale local cache after code changes:**

```bash
del server\datacache\*.json     # Windows
rm  server/datacache/*.json     # mac/linux
```

---

## Markets (21 tabs)

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
| 14 | Alerts | Client-side rules over other markets (no dedicated fetch) |
| 15 | Watchlist | Yahoo quotes + metric shortcuts |
| 16 | Analytics | Server metrics, cache, panel diagnostics |
| 17–21 | IMF, World Bank, BLS, EIA, Census | Government APIs (some via FRED) |

Panel-level inventory: [`docs/PANELS.md`](docs/PANELS.md). Intentional gaps: [`KNOWN_LIMITATIONS.md`](KNOWN_LIMITATIONS.md).

---

## Architecture (current)

```
External APIs → server/ Express (/api/*) on App Hosting Cloud Run
             → disk datacache + optional GCS (MARKET_CACHE_BUCKET)
             → browser DataProvider (wave fetch)
             → useMarketData(id) → BentoCard dashboards
             → panel health: fetch + display + confirm
```

| Concern | Where |
|---------|--------|
| Production | **Firebase App Hosting** (same-origin `/api/*`) |
| Market routes | `server/routes/*`, `shared/api-routing.json` |
| Client fetch | `src/hub/DataProvider.jsx` |
| Panel catalog | `src/data/marketPanels.js` |
| Health | `src/hub/lib/panelHealthEval.js`, `src/hooks/usePanelHealth.js` |
| Equity universe | `src/data/stockUniverse.js` |
| Heatmap size | `src/components/HeatmapView/heatmapSizeControl.js` |
| Nightly history | Functions `refreshMarketSnapshots` → RTDB (optional; not primary live UI) |

Green panel health means the **open tab** shows real metrics in the DOM — not a
splash cache free-pass. Details: [`docs/DATA_PIPELINE.md`](docs/DATA_PIPELINE.md),
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

Deploy ops: [`docs/DEPLOY.md`](docs/DEPLOY.md). Shared cache: [`docs/SHARED_CACHE.md`](docs/SHARED_CACHE.md).

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Always run `npm run preflight` before push.
Do not commit secrets; do not use `secrets.X != ''` in GitHub Actions.

## Notes

- Project notes: [`NOTES.md`](NOTES.md)
- Layout keys: [`docs/layout-keys.md`](docs/layout-keys.md)
- Bento chrome: [`docs/components/BentoCard.md`](docs/components/BentoCard.md)
