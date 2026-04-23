# Known Limitations

This document tracks behavior that is intentional-but-constrained, not bugs.
Grounded in actual code paths as of the current `main`. When you change or
remove one of the items below, please update this file in the same PR.

---

## 1. Mock / synthetic data

Some UI still displays deterministic mock data rather than live market data.
Look for these as LIVE vs. (Mock) pills render differently.

- **`src/utils/dataHelpers.js` — `getExtendedDetails(tickerInfo, rates)`**
  Generates deterministic mock details for equities (P/E, volume,
  change %, etc.) seeded off the ticker symbol. Used by
  `src/markets/equities/EquitiesMarket.jsx` to fill out the detail panel.
- **Sidebar macro indicators** (`src/components/Sidebar/Sidebar.jsx`) show
  a `(Mock)` label whenever `macroLive` is false — i.e. the `/api/macro`
  call failed or is unresolved. Values are not served from a defined mock
  set; they will simply be blank until the macro route responds.

## 2. External-API rate limits (free tiers)

Enumerated in `server/lib/rateLimits.js` (`KNOWN_LIMITS`, requests/day):

| Source | Daily cap |
|---|---|
| Yahoo Finance | 2,000 |
| FRED | 172,800 |
| CoinGecko | 30 |
| Alternative.me | 100 |
| CFTC Socrata | 1,000 |
| DefiLlama | 300 |
| Mempool.space | 300 |
| Etherscan | 100 |
| EIA | 1,000 |
| World Bank | 500 |
| EconDB | 500 |
| Treasury Fiscal Data | 1,000 |
| Bybit | 600 |

The counter is **in-memory only** (`counters` object in `rateLimits.js`).
Consequences:

- Restarting the server resets all counts to 0, so the dashboard
  (`/api/analytics`) will under-report until the next UTC midnight.
- Running multiple server processes double-counts inconsistently.
- The counter **does not enforce** the cap — it only tracks what was
  fired. Hitting a remote 429 is handled per-route via catch-blocks that
  return `isCurrent: false` with the most recent cached snapshot.

## 3. Caching layers & staleness

Three caches, each with different failure modes:

### Server: `server/datacache/<market>-YYYY-MM-DD.json`
- Populated by `writeDailyCache`, read by `readDailyCache` and
  `readLatestCache` (`server/lib/cache.js`).
- Quality gates: cache is discarded if the JSON string is **< 200 bytes**
  or if **< 15 % of leaf values are non-null** (depth 4). This means a
  genuinely sparse response (e.g. a tiny new indicator) can be
  mis-flagged as "stale" and refused.
- `cleanOldCaches()` deletes files **older than 7 days**. Disk is
  bounded but snapshots don't survive past that window.
- When today's cache is missing, most routes fall back to the latest
  prior snapshot and return `isCurrent: false`.

### Server: in-process `node-cache` (`req.app.locals.cache`)
- TTL is per-route; evaporates on restart. Not a durable store.

### Client: IndexedDB (`src/utils/snapshotDB.js`)
- Database name `hub-snapshots`, object store `snapshots`, schema v1.
- Rejects with `IndexedDB unavailable` in environments without the API
  (private Safari windows historically, some WebViews, SSR).
- No size eviction; relies on the browser's storage quota.

## 4. Required environment variables

Routes silently degrade or return 503 when these are absent:

| Env var | Consumers | Missing behavior |
|---|---|---|
| `FRED_API_KEY` | `commodities`, `insurance`, `derivatives`, `census` | `census` returns 503; others skip FRED-backed series but still return partial data |
| `EIA_API_KEY` | `commodities`, `eia` | Skips EIA-backed series |
| `BLS_API_KEY` | `bls` | Returns 503 |

There is no startup check that warns when these are unset.

## 5. Upstream-API fragility (swallowed errors)

The IMF (`server/routes/imf.js`) sub-fetchers `fetchWEOIndicator`,
`fetchIFSData`, and `fetchCOFER` each wrap their network/parse logic in
`try/catch` and return `{}` / `null` on failure with only a
`console.warn`. The route still responds, but silently with fewer
indicators. The WEO path has a static snapshot fallback (added in
`92cc84b`); IFS and COFER do not.

Other routes follow the same pattern (warn + partial response); see any
`.catch(e => { console.warn(...); return null; })` block in `server/routes/`.

## 6. FX rates

`src/utils/useFrankfurterRates.js`:

- Primary: `api.frankfurter.dev/v1/latest?base=USD`.
- On any fetch failure or malformed payload, silently falls back to the
  **static `exchangeRates` table in `src/utils/constants.js`**, which is
  hand-maintained and drifts from the market over time.
- There is no retry — a single failed load keeps the app on static
  rates for the session.

## 7. Browser baseline

`src/utils/fetchWithRetry.js` uses **`AbortSignal.any()`**, which requires:

- Chrome / Edge ≥ 116 (Aug 2023)
- Firefox ≥ 124 (Mar 2024)
- Safari ≥ 17.4 (Mar 2024)
- Node ≥ 20.3 (server-side consumers are Node 24)

Older browsers will throw `TypeError: AbortSignal.any is not a function`
on the first `fetchWithRetry` call.

## 8. Retry / timeout semantics

`fetchWithRetry(url, opts)`:

- `retries` is zeroed in `NODE_ENV=test` so tests don't wait through
  backoffs. Production retry math is `backoff * (attempt + 1)`.
- `totalTimeout` (default 30 s) is a hard ceiling across **all**
  attempts, enforced via the combined abort signal. When it fires, the
  thrown error message is literally `'Total timeout exceeded'` — not an
  `AbortError` — so upstream error handlers matching `err.name` must be
  updated accordingly.

## 9. CFTC COT history

`server/routes/fx.js` — `fetchCOTHistory` queries
`publicreporting.cftc.gov/resource/jun7-fc8e.json` with `$limit=400`.
That's enough for ~8 contracts × 52 weeks, but if CFTC adds contracts or
widens the window it silently truncates.

## 10. Not covered

- No structured monitoring / alerting on cache fallback frequency. The
  only signal that the app is serving stale data is `isCurrent: false`
  in the JSON payload.
- No end-to-end tests; coverage is unit/component (Vitest + RTL) only.
- No CSP, rate limiting, or auth on the server — intended for local /
  trusted-network use.
