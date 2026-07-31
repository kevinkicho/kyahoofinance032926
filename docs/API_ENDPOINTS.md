# API Endpoint Inventory

Last updated: 2026-07-30

Agent-facing map of API routes, frontend usage, and optional RTDB history.
Architecture overview: [`README.md`](./README.md).

## Production (canonical)

| Item | Value |
|---|---|
| Host | **Firebase App Hosting** (Cloud Run) |
| URL | https://kyahoofinance032926--kfinance032926.us-central1.hosted.app |
| API | Same-origin `/api/*` (no `VITE_API_BASE_URL` on App Hosting) |
| Cache | Local `server/datacache` + GCS `MARKET_CACHE_BUCKET` |

`src/lib/api.js` returns `/api/...` for same-origin deploys. Set `VITE_API_BASE_URL`
only when the SPA is hosted separately from the API.

## Sources Of Truth

Keep these files aligned when adding or renaming routes:

| File | Purpose |
|---|---|
| `src/hub/DataProvider.jsx` | Frontend `MARKET_ENDPOINTS`; live fetch + optional historical RTDB. |
| `shared/api-routing.json` | Canonical market → path map. |
| `server/index.js` | Express mount table on App Hosting. |
| `functions/src/lib/snapshotMarkets.ts` | Nightly RTDB snapshot market list (scheduler). |
| `docs/API_ENDPOINTS.md` | Human/agent-facing route inventory. |

## Frontend Market Endpoints

These are fetched by `DataProvider` and exposed through `useMarketData(id)`.

| Market id | Endpoint | Primary consumers | Main data |
|---|---|---|---|
| `analytics` | `/api/rate-limits` | `AnalyticsMarket` KPI fallback | Minimal rate-limit stub; detailed analytics uses `/api/analytics`. |
| `equities` | `/api/equities` | Equities tab, alerts, sidebar | Global equity universe, heatmap/list/race data, index context. |
| `bonds` | `/api/bonds` | Bonds tab, sidebar, alerts, watchlist, global macro enrichments | Yield curves, spreads, TIPS, breakevens, Treasury fiscal data. |
| `fx` | `/api/fx` | FX tab, global KPI strip, commodities FX enrichment, watchlist | Spot FX, DXY, REER, rate differentials. |
| `derivatives` | `/api/derivatives` | Derivatives tab, watchlist | VIX term structure, vol surface, skew, options/gamma proxies. |
| `realEstate` | `/api/realEstate` | Real Estate tab | Case-Shiller, mortgage rates, REITs, housing context. |
| `insurance` | `/api/insurance` | Insurance tab | Insurer prices, HY OAS context, combined-ratio/cat-bond proxies. |
| `commodities` | `/api/commoditiesEnhanced` | Commodities tab, real estate context, alerts, watchlist | Yahoo futures, EIA/FRED/World Bank shapes, futures curves, commodities metadata. |
| `globalMacro` | `/api/globalMacro` | Macro tab | Country scorecards, growth/inflation/rates, OECD/FRED/IMF/WB derived series. |
| `watchlist` | `/api/watchlist` | Watchlist tab | GET stub plus POST quote batch for user tickers. |
| `equitiesDeepDive` | `/api/equityDeepDive` | Equity+ tab, equities ML explorer, watchlist | Sector ETFs, factors, earnings, shorts, ERP, institutions/insiders. |
| `institutional` | `/api/institutional` | Equity+ enrichment | 13F / institutional holdings where available. |
| `crypto` | `/api/crypto` | Crypto tab, alerts, watchlist | CoinGecko, DeFiLlama, mempool.space, Alternative.me, Bybit-derived crypto data. |
| `credit` | `/api/credit` | Credit tab, sentiment risk dashboard, alerts, watchlist | IG/HY/EM spreads, ETFs, default/charge-off/loan context. |
| `sentiment` | `/api/sentiment` | Sentiment tab, commodities COT enrichment, alerts, watchlist | Fear & Greed, FSI, CFTC, margin debt, consumer credit, cross-asset returns. |
| `calendar` | `/api/calendar` | Calendar tab | Economic events, central banks, earnings, key releases, auctions, options expiry. |
| `imf` | `/api/imf` | IMF tab, macro enrichment | IMF WEO/IFS/COFER data. |
| `worldbank` | `/api/worldbank` | World Bank tab, macro/insurance enrichments | WDI/GFDD indicators. |
| `bls` | `/api/bls` | BLS tab, macro enrichments | Labor, CPI/PPI, JOLTS series. |
| `eia` | `/api/eia` | EIA tab | Electricity sales/prices and emissions. |
| `census` | `/api/census` | Census tab, real estate | Housing, construction, retail, durable goods, trade via Census/FRED mirrors. |
| `bea` | `/api/bea` | Macro tab | BEA saving/income cycle data. |
| `eurostat` | `/api/eurostat` | Macro tab | Euro-area macro series. |
| `oecd` | `/api/oecd` | Macro tab | OECD CLI direct feed. |
| `edgar` | `/api/edgar` | Equity+/Insurance enrichments | SEC concept snapshots and testable EDGAR summary. |
| `universeUpdates` | `/api/universeUpdates` | Equities data hub / analytics | IPO/universe-update candidates. |
| `nyfed` | `/api/nyfed` | Macro/Credit enrichments | SOFR/RRP/dealer survey style NY Fed data. |
| `fdic` | `/api/fdic` | Credit / banking enrichments | Bank aggregate data. |
| `ecb` | `/api/ecb` | Macro tab | ECB rates, HICP, M3. |
| `treasuryTIC` | `/api/treasuryTIC` | Bonds/Macro enrichments | TIC foreign-holdings and flow data. |
| `treasuryAuctions` | `/api/treasuryAuctions` | Bonds/Calendar enrichments | Treasury auction calendar/results. |
| `treasuryDTS` | `/api/treasuryDTS` | Macro liquidity panels | Treasury daily cash balance. |
| `fedSEP` | `/api/fed/sep` | Macro tab | FOMC SEP projections. |
| `fedGDPNow` | `/api/fed/gdpnow` | Macro tab | Atlanta Fed GDPNow. |
| `fedInflationNowcast` | `/api/fed/inflation-nowcast` | Macro tab | Cleveland Fed inflation nowcast. |
| `fedNewsSentiment` | `/api/fed/news-sentiment` | Sentiment tab | Fed/news sentiment enrichment. |
| `msrb` | `/api/msrb` | Credit / municipal context | MSRB municipal data summary. |
| `fema` | `/api/fema` | Insurance tab | OpenFEMA disaster declarations. |
| `usgs` | `/api/usgs` | Insurance catastrophe context | Recent significant earthquakes. |
| `edgarInsurerRatios` | `/api/edgar/insurer-ratios` | Insurance tab | US P&C insurer ratio facts from SEC EDGAR. |
| `usda` | `/api/usda` | Commodities tab | USDA NASS ag prices. |
| `censusTrade` | `/api/censusTrade` | Commodities tab | US trade balance by bloc. |
| `eiaPetroleum` | `/api/eiaPetroleum` | Commodities tab | Petroleum, gasoline, natural gas, crude stock companion series. |

## RTDB Snapshot Coverage

Scheduled refresh and admin refresh write these to:

```text
marketSnapshots/{id}/latest
marketSnapshots/{id}/history/{YYYY-MM-DD}
```

`functions/src/lib/snapshotMarkets.ts` includes every DataProvider endpoint above plus:

| Snapshot id | Endpoint | Notes |
|---|---|---|
| `analytics` | `/api/analytics` | Full Analytics dashboard data. |
| `rateLimits` | `/api/rate-limits` | Diagnostics disabled. |
| `cacheStatus` | `/api/cache/status` | Diagnostics disabled. |
| `universeUpdates` | `/api/universeUpdates` | Diagnostics disabled. |

**Live UI loads** call App Hosting `/api/*` (disk/GCS cache first).  
`USE_RTDB_SEED` defaults **off** (`VITE_USE_RTDB_SEED=true` only for offline demos).  
**Historical** topbar playback may still read RTDB `history/YYYY-MM-DD` when a past date is selected.

## Additional Mounted Routes

These routes exist but are not always fetched by `DataProvider`.

| Route | Method | Used by | Notes |
|---|---|---|---|
| `/api/health` | GET | Health checks / manual verification | Function liveness. |
| `/api/cache/status` | GET | Hub footer, snapshots | Minimal cache status in Functions production. |
| `/api/analytics` | GET | Analytics force-live and RTDB scheduled snapshots | Main analytics payload. |
| `/api/analytics/cache/:market` | GET | Analytics cache detail drawer | Inspect cached market shape. |
| `/api/analytics/endpoint/:path` | GET | Analytics endpoint detail drawer | Endpoint latency/error history. |
| `/api/analytics/correlations` | GET | Analytics future use | Simultaneous anomaly view. |
| `/api/analytics/cache/:market` | DELETE | Analytics admin | Clear one market cache. |
| `/api/analytics/reset-counters` | POST | Analytics admin | Reset API counters. |
| `/api/admin/refresh-all` | POST | Topbar play/refresh button | Admin-only; verifies Firebase ID token. |
| `/api/admin/diagnostics-report` | GET | Analytics diagnostics | Read saved diagnostics. |
| `/api/admin/diagnose` | GET | Analytics diagnostics | Run active endpoint diagnostics and save report. |
| `/api/stocks` | POST | Portfolio tracker, detail tools | Batch Yahoo quote fetch. |
| `/api/stocks/factors` | GET | Equity tools | Stock factor metadata. |
| `/api/stocks/stats` | GET | Equity tools | Stock stats. |
| `/api/summary/:ticker` | GET | Equity detail panel, ML explorer | Single-ticker summary. Region query may be supplied. |
| `/api/history/:ticker` | GET | Equity detail panel, index sticky tooltip | OHLC history; supports `period`. |
| `/api/snapshot` | GET | Bulk ticker tools | Bulk market snapshot. |
| `/api/fred/batch` | GET | Generic FRED consumers | Batch FRED proxy. |
| `/api/fred/observations` | GET | `MetricValue`, `DataFooter`, chart source popovers | Source verification for FRED series. |
| `/api/edgar/concepts/:ticker` | GET | Equity/insurance future drilldowns | SEC company concepts. |
| `/api/commodities/v2` | GET | Alias | Same router as `/api/commoditiesEnhanced`. |
| `/api/commoditiesEnhanced/commodity/:key` | GET | Manual metadata lookup | Commodity source metadata. |
| `/api/commoditiesEnhanced/coverage` | GET | Manual coverage lookup | Commodity catalog coverage. |

## Compatibility Aliases

Functions mounts these aliases in `functions/src/index.ts`:

| Canonical route | Alias |
|---|---|
| `/api/commoditiesEnhanced` | `/api/commodities/v2` |
| `/api/treasuryTIC` | `/api/treasury/tic` |
| `/api/treasuryAuctions` | `/api/treasury/auctions` |
| `/api/treasuryDTS` | `/api/treasury/dts` |
| `/api/censusTrade` | `/api/census-trade` |
| `/api/eiaPetroleum` | `/api/eia-petroleum` |

## Cross-Market Bindings

Several panels intentionally use data from another market context instead of asking the backend for duplicate data.

| Consumer | `useMarketData` inputs | Why |
|---|---|---|
| Commodities COT panel | `sentiment` | CFTC commodity positioning is fetched in Sentiment and normalized into Commodities. |
| Commodities FX panel | `fx` | Commodity-bloc currencies come from FX spot-rate context. |
| Commodities strategic panels | `commodities`, local `src/data/strategicMaterials.js` | Strategic minerals use curated metadata plus live Yahoo/FRED proxies when available. |
| Insurance catastrophe panels | `fema`, `usgs`, `worldbank`, `edgarInsurerRatios` | FEMA/USGS/WB/EDGAR data enrich base insurance payload. |
| Real Estate key metrics | `commodities` | Gold/oil context is shown in real estate valuation context. |
| Watchlist metrics | `derivatives`, `fx`, `bonds`, `crypto`, `commodities`, `credit`, `sentiment`, `equitiesDeepDive` | Cross-market shortcut cards and alert board. |
| Alerts | `sentiment`, `bonds`, `credit`, `crypto`, `commodities`, `fx` | Federated alert rules; no separate backend route. |
| Global Macro panels | `bea`, `eurostat`, `oecd`, `ecb`, `treasuryDTS`, `fedGDPNow` and others | Macro tab composes official-source satellite endpoints. |

## Adding a new endpoint

1. Add/update the route under `server/routes/` and mount in `server/index.js`.
2. Mirror in Functions only if the snapshot job or admin paths need it.
3. Register in `MARKET_ENDPOINTS` / `shared/api-routing.json` if the browser fetches it.
4. Add to `functions/src/lib/snapshotMarkets.ts` if RTDB history should cover it.
5. Wire UI + normalizers; prefer partial empty states over dropping a whole market.
6. Update this file and `docs/PANELS.md` if panels changed.
7. Run `npm run preflight`.
