# Known Limitations

This document tracks behavior that is intentional-but-constrained, not bugs.
Grounded in actual code paths as of the current `main`. When you change or
remove one of the items below, please update this file in the same PR.

---

## 1. Mock / synthetic data

The app follows a strict "no mock data" policy. When live data is unavailable,
panels display "—" or empty states rather than fabricated numbers.

- **`src/utils/dataHelpers.js` — `getExtendedDetails(tickerInfo, rates)`**
  Returns `null`. Previously generated deterministic fake prices/P/E/volume
  for the equities detail panel; now returns `null` so the UI shows "—"
  until live Yahoo Finance data arrives. The `EquitiesMarket` detail panel
  only populates after a successful `/api/stocks` or `/api/summary/:ticker` call.
- **Sidebar macro indicators** (`src/components/Sidebar/Sidebar.jsx`) show
  a `(Mock)` label whenever `macroLive` is false — i.e. the `/api/macro`
  call failed or is unresolved. Values default to `null` (rendering "—")
  until the macro route responds.
- **Institutional holdings** (`server/routes/institutional.js`) returns
  curated 13F snapshot data, not live SEC EDGAR data. The `_sources`
  field reports `{ secEdgar: false, curated: true }`.
- **Insurance cat bonds & reinsurance** and **credit CLO/EM/default data**
  include algorithmically generated or hardcoded values where no free API
  source exists. These are flagged in `_sources` accordingly.

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
| FRED Economic Events | 500 |
| Treasury Fiscal Data | 1,000 |
| Bybit | 600 |
| BLS | 500 |
| ECB (Frankfurter) | 86,400 |
| BIS | 1,000 |
| IMF WEO | 50 |
| IMF IFS | 50 |
| IMF COFER | 50 |
| SEC EDGAR | 1,000 |
| OECD | 500 |
| Econdb | 1,000 |

The counter persists to `server/datacache/rate-limits-YYYY-MM-DD.json`
(debounced 2 s) and reloads on boot, so restarts no longer zero the
counts within the same UTC day. Remaining caveats:

- Running multiple server processes races on the shared file; last
  write wins. Not safe for horizontally-scaled deployments.
- The counter **does not enforce** the cap — it only tracks what was
  fired. Hitting a remote 429 is handled per-route via catch-blocks that
  return `isCurrent: false` with the most recent cached snapshot.
- Counts between the last debounced flush and a hard kill are lost
  (worst case ~2 s of activity).

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
| `FRED_API_KEY` | `bonds`, `commodities`, `credit`, `derivatives`, `equityDeepDive`, `fx`, `globalMacro`, `insurance`, `macro`, `realEstate`, `sentiment`, `census` | `census` returns 503; others skip FRED-backed series but still return partial data |
| `EIA_API_KEY` | `commodities`, `eia` | Skips EIA-backed series |
| `BLS_API_KEY` | `bls`, `globalMacro` | `bls` returns 503; `globalMacro` skips employment series |

The server now logs a yellow warning at startup listing any missing
keys and which routes will be degraded (`warnOnMissingKeys` in
`server/index.js`).

## 5. Upstream-API fragility (swallowed errors)

The IMF (`server/routes/imf.js`) sub-fetchers `fetchWEOIndicator`,
`fetchIFSData`, and `fetchCOFER` each wrap their network/parse logic in
`try/catch` and return `{}` / `null` on failure with only a
`console.warn`. The route still responds, but silently with fewer
indicators. The WEO path has a static snapshot fallback; **IFS and COFER
now also have static snapshot fallbacks** (`server/dataSources/ifsCofeSnapshot.js`).
When live IMF API calls fail, the route serves recent-quarter estimates
from the snapshot, with `_sources.imfIFS_snapshot` and
`_sources.imfCOFER_snapshot` set to `true`.

Other routes follow the same pattern (warn + partial response); see any
`.catch(e => { console.warn(...); return null; })` block in `server/routes/`.

## 6. FX rates

`src/hub/CurrencyContext.jsx` provides FX rates globally via React context,
backed by `src/utils/useFrankfurterRates.js`:

- Primary: `api.frankfurter.dev/v1/latest?base=USD`, routed through
  `fetchWithRetry` (2 retries, 8 s per attempt, 20 s total budget).
- On ultimate failure or malformed payload, falls back to the **static
  `exchangeRates` table in `src/utils/constants.js`**, which is
  hand-maintained and drifts from the market over time.
- Rates are fetched once on mount and shared via `CurrencyProvider` context.
  No background refresh if the session outlives the ECB daily publication.
- `useCurrency()` hook provides `{ currency, setCurrency, rates, currentRate,
  currentSymbol, convert, convertAndFormat, ratesLive }` to all markets.
- **Conversion happens at render time, in the panel that owns the value.**
  Markets that display currency-denominated numbers (bonds, crypto, credit,
  insurance, globalMacro country-detail) call `useCurrency().convert(value)`
  or `convertAndFormat(value, 'USD', decimals)` explicitly. There is
  intentionally NO automatic provider-level conversion, because at the
  provider layer we cannot distinguish currency fields from yields,
  percentages, ratios, indices, or counts. A previous experiment that
  recursively rewrote every numeric field via `convert()` was removed
  for that reason (see commit history).
- Independence from `DataProvider`: `CurrencyProvider` wraps `DataProvider`
  in the React tree, but uses its own `useFrankfurterRates` fetch — so
  there is no circular dependency on the FX market's wave fetch.

## 7. Browser baseline

`src/utils/fetchWithRetry.js` uses `AbortSignal.any()` with a **runtime
polyfill** that adds `AbortSignal.any` if missing. This extends support to:

- Chrome / Edge ≥ 93 (Jul 2021)
- Firefox ≥ 100 (May 2022)
- Safari ≥ 15.4 (Mar 2022)
- Node ≥ 16.14 (server-side consumers are Node 24)

Browsers older than these cutoffs will still fail with
`TypeError: AbortSignal.any is not a function`.

## 8. Retry / timeout semantics

`fetchWithRetry(url, opts)`:

- `retries` is zeroed in `NODE_ENV=test` so tests don't wait through
  backoffs. Production retry math is `backoff * (attempt + 1)`.
- `totalTimeout` (default 30 s) is a hard ceiling across **all**
  attempts, enforced via the combined abort signal. When it fires, the
  thrown error is a `DOMException` with `name === 'AbortError'` and
  `message === 'Total timeout exceeded'`, so upstream handlers that
  match `err.name === 'AbortError'` will behave correctly.

## 9. CFTC COT history

`server/routes/fx.js` — `fetchCOTHistory` queries
`publicreporting.cftc.gov/resource/jun7-fc8e.json` with `$limit=400`.
That's enough for ~8 contracts × 52 weeks, but if CFTC adds contracts or
widens the window it silently truncates.

## 10. Not covered

- No structured monitoring / alerting on cache fallback frequency. The
  only signal that the app is serving stale data is `isCurrent: false`
  in the JSON payload.
- **Radar view** (new) is in early implementation; may have layout or data
  binding inconsistencies across different screen sizes. Its scatter plot
  uses raw `flatData` fields which may be null for some tickers—these are
  rendered at the origin (0,0).
- **Calendar Econdb gap**: The Calendar view is not currently wired to
  Econdb; only a subset of manually curated or FRED-based events are displayed.
  Economic events from FRED have no consensus/expected values (expected is
  always null) because the FRED releases API provides dates but not survey
  estimates.
- **Watchlist My Metrics**: Live values depend on the `DataProvider` context.
  If a particular market hasn't been fetched yet (i.e. the user has not visited
  the market or clicked the play button), corresponding metrics display "—".
- No end-to-end tests; coverage is unit/component (Vitest + RTL) only.
- No CSP, rate limiting, or auth on the server — intended for local /
  trusted-network use.
