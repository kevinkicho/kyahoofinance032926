# Known Limitations

Intentional constraints (not bugs). **Last reviewed: 2026-08-02.**  
Update this file when you change any of these behaviors.

Doc map: [`docs/README.md`](docs/README.md).

---

## Shared GCS cache

Locally, cache is disk-only. The GCS shared cache is enabled only when
`MARKET_CACHE_BUCKET` is set (production). See
[`docs/SHARED_CACHE.md`](docs/SHARED_CACHE.md).

---

## Rate-limit counters

`server/lib/rateLimits.js` tracks upstream call counts (disk + optional GCS
max-merge). Counters are **diagnostic by default** — they do not hard-block
traffic unless an operator opts in via env. Free-tier daily caps
(approximate) are listed in that file under `KNOWN_LIMITS`.

Opt-in hard-block: `checkApiBudget(source)` returns `{ hardBlock, used,
limit, pct, remaining, threshold, enforce }`; routes that opt in skip the
upstream fetch and serve a cached/degraded shell when `hardBlock === true`.
Gated by `ENFORCE_RATE_LIMITS=1` (global) or per-source
`ENFORCE_RATE_LIMIT_<SOURCE>=1` / `RATE_LIMIT_HEADROOM_<SOURCE>=0.9`. The
FX CFTC COT fetch is the reference implementation. See JSDoc on
`checkApiBudget` for full details.

---

## Data policy gaps (not live market data)

| Area | Behavior |
|------|----------|
| Missing live payload | Show "—" / empty shell — never invent prices as live |
| Equities detail extras | `getExtendedDetails` returns `null` until Yahoo summary arrives |
| Institutional holdings | Curated 13F snapshot; `_sources` marks `curated: true` |
| Insurance cat/reinsurance, credit CLO/EM/default shells | Hardcoded or algorithmic where no free API exists; flagged in `_sources` |
| IMF WEO/IFS/COFER | Live first; static snapshots if IMF fails |

---

## Required env keys

Keys are configured in `.env` for this workspace. Routes degrade gracefully
when a key is absent (fresh clone, CI without injected secrets). Fallback:

| Env var | Behavior when absent |
|---|---|
| `FRED_API_KEY` | FRED-backed series skipped; `census` may 503 |
| `EIA_API_KEY` | EIA series skipped |
| `BLS_API_KEY` | `bls` may 503; macro employment series fall back to FRED mirrors |

Startup logs which keys are missing (`warnOnMissingKeys` in `server/index.js`).

---

## Caching & serve policy

| Layer | Notes |
|-------|--------|
| Daily files `server/datacache/` | Hollow/sparse payloads rejected; pruned after 7 days; prior-day fallback sets `isStale` |
| In-process NodeCache | Per-route TTL; lost on restart |
| GCS `MARKET_CACHE_BUCKET` | Shared last-good bags across Cloud Run instances |
| Client IndexedDB / localStorage | Optional paint/persist; unavailable in some private WebViews |

| Env | Default | Behavior |
|-----|---------|----------|
| `MARKET_SERVE_MODE` | `cache_bootstrap` | User GET with bag → **no upstream**. Miss → bootstrap live. `cache` = miss returns degraded until warm. |
| `MARKET_CACHE_ONLY=1` | off | All requests refuse upstream (except still allow force refresh policy override only if not set with cacheOnly query) |

Operator ▶ and postdeploy warm use `?refresh=true` — that is the intentional rebuild path.

---

## FX conversion

`CurrencyProvider` uses Frankfurter (with retry). On failure, static rates
from `src/utils/constants.js` (hand-maintained; can drift). FX dashboard may
show a static-rate banner when live rates are unavailable; changes display
as 0% in that mode.

---

## Upstream / response shape

- Many routes catch upstream errors and return `field: null` with HTTP 200.
  Routes that populate `_errors[field]` now have those raw error strings
  forwarded by the `/api/analytics/panel-trace/:market` route (as
  `panels[].error` and top-level `errors` / `errorKind` / `rateLimited`).
  **Still limited:** routes that only `console.warn` (no `_errors` entry)
  surface nothing in Panel Trace — adding `_errors[field]` in those catch
  blocks is the path to full coverage.
- Public `/api/*` is open by design. Admin routes (`/api/admin/*`) require a
  Firebase ID token and per-IP rate limits.

---

## Tests vs production

- Unit: Vitest (`npm test` / preflight). GitHub Actions workflow **CI** runs the
  same preflight on PR/push to `master`.
- UI smoke: Playwright scripts (`test:validate`, `test:coverage`, etc.) —
  not in default preflight.
- Hosted cold start and third-party outages are not fully covered by local
  gates. Warm with `npm run postdeploy:warm` after deploy (requires
  `WARM_TOKEN` in production for `POST /api/warm`).

## Health: operational ok vs true UI

Panel health still reports `status: ok` when fetch + display + confirm pass,
including **health-bridge** stamps (hidden metrics for splash completeness).
Reports also expose:

| Field | Meaning |
|-------|---------|
| `uiOk` | Real visible metrics/chart/table (not bridge-only) |
| `bridgeOnly` / `healthQuality: 'bridge'` | F/D/C ok only via bridge |
| `countStatuses().okUi` / `.okBridge` | Splash KPI split |
| `panelChipKind` / `marketSplashKind` | Flash-page colors (green = true UI only) |

**Flash page (SplashScreen):** chips and market borders use `panelChipKind` /
`marketSplashKind` — full green is **true UI only**; bridge is amber; market
borders follow panel tallies, not “`ctx.data` arrived”. Operational `status: ok`
alone no longer paints full green.

**Topbar dropdown dots:** `derivePanelSignal` requires **true UI** (`uiOk`) for
green. Bridge-only operational ok is **amber** (`color: bridge`), never green.
Closed tabs stay grey when fetch is ok (open tab to verify). Popover shows a
fourth gate: True UI.

**True UI promotion:** `stampVisiblePaintedMetrics` turns already-visible body
numbers (tables/KPIs without `MetricValue`) into metric stamps so paint counts
as real UI across the catalog — not only large chart panels. SafeECharts forces
a measure box after a short timeout so charts are not stuck blank at 0×0.

Use `uiOk` / false-green probes for product quality; bridge ok is operational.

## Freshness flags

| Flag | Meaning |
|------|---------|
| `isLive: true` | Payload assembled from upstream this request (`_cacheSource: live` / merge) |
| `isLive: false` + `isCurrent: true` | Same-day daily_file or memory cache hit |
| `isCurrent: false` | Prior-day merge / degraded |

## Cloud Functions vs App Hosting

Live market `/api/*` is **App Hosting** (`server/`). The Functions `api` export is a
**thin proxy** to App Hosting for legacy clients; do not re-add local market route
trees under `functions/src/routes` for serving. Snapshots pull App Hosting HTTP.
Preflight runs `scripts/check-functions-proxy.mjs`.