# Known Limitations

Intentional constraints (not bugs). **Last reviewed: 2026-07-30.**  
Update this file when you change any of these behaviors.

Doc map: [`docs/README.md`](docs/README.md).

---

## Panel status badges (DataFooter)

| Badge | Meaning |
|---|---|
| **FETCHED** | Live or same-day successful payload |
| **LOADING** | Request in flight |
| **STALE** | Serving prior cache (`isCurrent: false`) |
| **NO DATA** | Fetch finished empty/error |
| **UNAVAIL** | Missing key / not configured |
| **WAITING** | Shell mounted; first fetch not finished |

**Tab health dots** (separate): green only when fetch + display + confirm pass on
the **mounted** tab. Inactive tabs must not stay green from splash cache alone.

After App Hosting deploys: `npm run postdeploy:warm`.

`npm run preflight` does **not** prove live secrets, env protection, or hosted
cache warm state — those need Actions and/or post-deploy warm.

---

## Shared GCS cache

Production: `MARKET_CACHE_BUCKET=kfinance032926-market-cache`. See
[`docs/SHARED_CACHE.md`](docs/SHARED_CACHE.md). Locally, cache is disk-only unless
the env var is set.

---

## Rate-limit counters

`server/lib/rateLimits.js` tracks upstream call counts (disk + optional GCS
max-merge). Counters are **diagnostic only** — they do not hard-block traffic.
Free-tier daily caps (approximate) are listed in that file under `KNOWN_LIMITS`.

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

| Env var | Missing behavior |
|---|---|
| `FRED_API_KEY` | FRED-backed series skipped; `census` may 503 |
| `EIA_API_KEY` | EIA series skipped |
| `BLS_API_KEY` | `bls` may 503; macro employment series skipped |

Startup logs which keys are missing (`warnOnMissingKeys` in `server/index.js`).

---

## Caching

| Layer | Notes |
|-------|--------|
| Daily files `server/datacache/` | Hollow/sparse payloads rejected; pruned after 7 days; prior-day fallback sets `isCurrent: false` |
| In-process NodeCache | Per-route TTL; lost on restart |
| Client IndexedDB / localStorage | Optional paint/persist; unavailable in some private WebViews |

---

## FX conversion

`CurrencyProvider` uses Frankfurter (with retry). On failure, static rates from
`src/utils/constants.js` (hand-maintained; can drift). Conversion is **explicit
at render** in panels that need it — not a recursive rewrite of every number.

FX dashboard may show a static-rate banner when live rates are unavailable;
changes display as 0% in that mode.

---

## Upstream / response shape

- Many routes catch upstream errors and return `field: null` with HTTP 200 and
  `console.warn`. Panel Trace (Analytics) shows null fields; it does not always
  surface the raw upstream error string.
- Real Estate / Insurance may **omit** panels from the layout when data fails a
  truthiness check (hidden, not empty shell).
- CFTC COT history in FX uses a fixed `$limit`; large expansions can truncate.
- Public `/api/*` is open by design. Admin routes (`/api/admin/*`) require a
  Firebase ID token and per-IP rate limits.

---

## Tests vs production

- Unit: Vitest (`npm test` / preflight).
- UI smoke: Playwright scripts (`test:validate`, `test:coverage`, etc.) — not in
  default preflight.
- Hosted cold start and third-party outages are not fully covered by local gates.
