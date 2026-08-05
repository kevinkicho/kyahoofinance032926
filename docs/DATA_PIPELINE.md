# Data Pipeline

How a number gets from a public API into a panel.

**Last reviewed: 2026-07-30.** Index: [`README.md`](./README.md).

External APIs → **App Hosting Express** (`server/`) → disk/GCS cache →
DataProvider → `useMarketData` → market panel → DataFooter / panel health.

---

## 1. Overview

```mermaid
flowchart LR
    subgraph EXT["External APIs"]
        FRED["FRED"]
        YF["Yahoo"]
        GOV["EIA / BLS / IMF / …"]
    end

    subgraph SRV["App Hosting · Express"]
        ROUTES["/api/*"]
        DISK["disk datacache"]
        GCS["GCS bucket"]
        MEM["NodeCache"]
    end

    subgraph OPT["Optional"]
        FN["Functions snapshots"]
        RTDB["RTDB latest/history"]
    end

    subgraph CLI["Browser"]
        DP["DataProvider"]
        HOOK["useMarketData"]
        PANELS["Dashboards"]
        HEALTH["Panel health"]
    end

    EXT --> ROUTES
    ROUTES <--> DISK
    ROUTES <--> GCS
    ROUTES <--> MEM
    ROUTES --> DP
    FN --> ROUTES
    FN --> RTDB
    DP --> HOOK --> PANELS
    PANELS --> HEALTH
```

Historical date picker can read RTDB `history/` when a past date is selected.

---

## 2. External sources (summary)

| Source | Auth | Used by (examples) |
| --- | --- | --- |
| FRED | `FRED_API_KEY` | bonds, fx, credit, sentiment, commodities, real estate, calendar, … |
| Yahoo Finance | none | equities, futures, options, REITs, ETFs |
| EIA / BLS | API keys | eia, bls, commodities energy |
| IMF / World Bank | none | imf, worldbank, macro enrichments |
| CoinGecko, DeFiLlama, CFTC, Treasury, … | mostly none | crypto, sentiment, bonds calendar |

Provenance catalog: `src/hub/dataSources.js` (DataFooter).

---

## 3. Express routes

Mounted in `server/index.js`. Inventory: [`API_ENDPOINTS.md`](API_ENDPOINTS.md).
Align with `src/hub/DataProvider.jsx` and `shared/api-routing.json`.

Typical response shape:

```jsonc
{
  "lastUpdated": "…",
  "fetchedOn": "YYYY-MM-DD",
  "isLive": true,
  "isCurrent": true,
  "_sources": [{ "name": "FRED", "url": "…", "items": "…" }]
}
```

---

## 4. Caching & serve policy (hardened)

```mermaid
flowchart TB
    REQ["GET /api/market"] --> POL{"MARKET_SERVE_MODE"}
    POL --> BEST["readBestAvailableCache\ntoday → prior → GCS"]
    BEST -- hit --> OUT["200 + isStale flags"]
    BEST -- miss --> UP{"allow upstream?"}
    UP -- bootstrap --> FETCH["Upstream fan-out"]
    UP -- cache mode --> DEG["degraded / empty"]
    FETCH --> WRITE["write disk+GCS if non-hollow"]
    WRITE --> OUT
    WARM["postdeploy warm ?refresh=1"] --> FETCH
    UI["DataProvider cache-first"] --> REQ
    OP["Operator ▶ refresh=true"] --> FETCH
```

| Mode (`MARKET_SERVE_MODE`) | User GET with bag | User GET miss | Operator ▶ |
|----------------------------|-------------------|---------------|------------|
| `cache_bootstrap` (default) | Serve bag, **no upstream** | Upstream once (bootstrap) | Upstream |
| `cache` | Serve bag | Degraded (no upstream) | Upstream |

- **Write path:** post-deploy warm (`?refresh=true`) + operator ▶. Hollow live never overwrites a good prior bag.
- **No mock values** — only real written bags or honest empty/degraded.
- **GCS:** [`SHARED_CACHE.md`](./SHARED_CACHE.md). Firestore = meta/digest only.
- Policy code: `server/lib/marketServePolicy.js` + `routeFactory.js`.

---

## 5. DataProvider & refresh policy

`src/hub/DataProvider.jsx` wave-fetches registered markets (batches of 4, ~250ms gap).
Optional localStorage slim snapshot can paint first; `/api/*` overwrites.

**This is not a real-time streaming app.** Data does not auto-poll after load.

| Trigger | Behavior |
| --- | --- |
| App load | **One** wave, cache-first (no `?refresh`) — server does not fan out if bag exists |
| Topbar ▶ | Force-live rebuild (`?refresh=true` + `X-Cache-Bypass`) — only rebuild path for full catalog |
| BentoCard footer ▶ | Force-live for **that market only** |
| Post-deploy warm | Staged `?refresh=true` rebuild into disk/GCS (primary write path) |

No interval auto-refresh. No background revalidate after the first wave.

**Concurrency / reliability**

- One full-wave **mutex** (`fetchPromiseRef`). Concurrent topbar ▶ waiters
  join; any force-live request is drained by the runner (may run a second
  force-live wave, never overlapping waves).
- Panel ▶ uses **per-market serialization** + generation so rapid clicks do not
  apply stale responses out of order.
- Empty primary tabs get **one** cache-first then force-live retry after the
  main wave — only if the client still has no usable data (no re-hit of painted
  markets).
- Failed or empty HTTP bodies **preserve prior payload** (`applyResult`).

| Setting | Typical | Role |
| --- | --- | --- |
| timeout | 120s | Cold FRED fan-outs on App Hosting |
| retries | 1 | Avoid storms |
| batchConcurrency | 4 | Rate-limit friendly (force-live) |
| batchDelayMs | 250 | Smooth bursts |

### Live vs current

- **`isLive`** — payload passes `hasNonNullData` + market `STRUCTURAL_GUARDS`.
- **`isCurrent`** — `fetchedOn === today` (false when serving older cache).

### Federated

| Id | Inputs | Notes |
| --- | --- | --- |
| `alerts` | sentiment, bonds, credit, crypto, commodities, fx | Client rules; no dedicated route |

Some commodities panels also read `sentiment` / `fx` via `useMarketData`.

### Client persistence

1. **localStorage** slim snapshot (idle save).
2. **IndexedDB** full per-market day archive when enabled.

---

## 6. Cross-market reads

Panels may call `useMarketData(otherId)` instead of duplicating backend work
(e.g. commodities COT from sentiment, macro from imf/worldbank). Dependent
panels stay empty until the source market lands.

---

## 7. `useMarketData` + DataFooter

```js
const { data, isLoading, isLive, isCurrent, lastUpdated, fetchedOn, error,
        provenance, refetch } = useMarketData('bonds');
```

Currency conversion is **at render** via `CurrencyContext` where panels need it.
Every panel should expose provenance through DataFooter / MetricValue.

---

## 8. Verification scripts

| Command | Role |
| --- | --- |
| `npm run test:regress` | API shape against live server |
| `npm run test:validate` | Playwright tab/panel crawl |
| `npm run test:audit` | Cache / freshness audit |
| `npm run test:persist` | Bento layout persist |

Default push gate remains `npm run preflight` (Vitest + secrets + workflow lint).

---

## 9. Cache layers (summary)

| Layer | Where | Survives restart |
| --- | --- | --- |
| HTTP Cache-Control | Response headers | n/a |
| NodeCache | Server memory | no |
| Daily JSON | `server/datacache/` (+ GCS) | yes |
| Browser snapshot | localStorage / IndexedDB | yes |

Clear poisoned disk cache: delete `server/datacache/*.json`.

---

## 10. Adding a market

1. Route under `server/routes/`, mount in `server/index.js`.
2. Register in `MARKET_ENDPOINTS` / `shared/api-routing.json`.
3. Structural guard if needed; sources in `dataSources.js`.
4. Tab in `markets.config.js` + market component + `docs/PANELS.md`.
5. Snapshot list in `functions/src/lib/snapshotMarkets.ts` if RTDB should cover it.
6. `npm run preflight` (+ validate if UI-heavy).
