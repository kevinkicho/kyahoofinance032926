# Progressive load, status honesty & durable cache (Firestore?)

**Last reviewed: 2026-08-04.** Companion to [`DATA_PIPELINE.md`](./DATA_PIPELINE.md).

---

## 1. Diagnosis: flash page, status signals, panel availability

### What was wrong (root causes, not surface polish)

| Symptom | Root cause |
|---------|------------|
| Splash “everything green” | Mounted **all markets** off-screen; health bridge + shells made F/D/C `ok` without true UI |
| Splash blocked forever / felt broken | Waited on full panel F/D/C evaluation of 233 panels |
| Topbar dots wrong | Same: operational `ok` (incl. bridge) treated as verified green |
| Bottom-bar chips wrong | Disk key aliases (`commodities` vs `commodities_enhanced`); ignored live session |
| Equity heatmap blank | Height chain 0 + treemap samples not extracted + auto-disable greying |
| “Refresh no effect” | Footer ▶ hit hub bag while heatmap uses local `/api/stocks` path |
| Incomplete panels forever | Cross-market deps (edgar, treasuryTIC, …) still loading or missing cache |

### Probe evidence (local)

- Operational F/D/C can hit **233/233 ok** after settle (`reports/live-fdc.json`) while true UI was ~**97 uiOk / 111 bridge** (`panel-one-by-one.json`).
- Remaining fetch fails are mostly **waiting for cross-market** (satellites in later wave batches).

### Honesty model (current contract)

| Surface | Green means | Amber | Grey | Red |
|---------|-------------|-------|------|-----|
| Splash (default **progressive**) | Market **payload present** | — | fetching | error |
| Splash (`?verify=1` F/D/C) | **True UI** | bridge-only | pending paint | fetch fail |
| Topbar dropdown | True UI on **open** tab | bridge | closed tab / painting | fetch fail |
| Footer chips | Live / same-day session+disk | stale | loading | error |
| In-app panels | Paint when data arrives | loading badge | — | empty after load |

### Progressive splash (default)

1. **Do not** mount all 18 market grids behind the overlay (avoids thrash / false paint).
2. **Enter anytime** (button ready immediately).
3. **Auto-enter ~3s** after first market has data (cancel by… just entering earlier).
4. Wave continues **after** enter; open a tab → panels fill as that market’s payload lands.
5. Full F/D/C catalog: open with `?verify=1` or `?fdc=1` (for probes).

This is **not real-time streaming**. It is **one cache-first wave** (batched), then manual ▶.

---

## 2. Cache layers you already have

```text
Upstream APIs
  → Express /api/*
      → Node memory cache
      → disk server/datacache/{market}-YYYY-MM-DD.json
      → GCS MARKET_CACHE_BUCKET (shared across Cloud Run)
  → Browser DataProvider wave (cache-first GET, no ?refresh)
      → localStorage slim snapshot (today only)
      → IndexedDB equities daily (heatmap path)
  → RTDB marketSnapshots (nightly history / time-travel)
```

**You already avoid “refresh everything from FRED/Yahoo every click”** when:

- Today’s disk/GCS hit exists, and
- Client does **not** pass `?refresh=true` / `X-Cache-Bypass`.

Big upstream cost happens on: cold GCS miss, hollow reject, force-live ▶, warm jobs, nightly snapshot job.

### Last-good bag (implemented)

When **today’s** bag is missing or hollow, market routes serve the **latest non-hollow disk/GCS bag** before hitting upstream (cache-first, no `?refresh`):

| Flag | Meaning |
|------|---------|
| `isCurrent: true` | Same calendar day bag |
| `isStale: true` / `isCurrent: false` | Prior-day (or older) last-good bag |
| `fetchedOn` | Day of the bag actually served |
| `_cacheSource` | `daily_file` · `prior_day` · `gcs_prior` · `memory` · `prior_day_error_fallback` |

**No mock numbers.** Empty panels only when there is no real prior bag and digests cannot paint KPIs.

Firestore stays **meta + digest only** — not full market JSON.

---

## 3. Should you use Firestore for market data?

### Short answer

**Do not store full market JSON bags in Firestore as the primary cache.**  
Use **GCS + disk** for bulk payloads (already). Use Firestore only for **small metadata / indexes / optional panel KPI snapshots** if you want a queryable catalog.

### Why not bulk market docs

| Constraint | Impact |
|------------|--------|
| **1 MiB / document** | Equities quotes + bonds FRED history routinely approach or exceed this |
| **Write/read cost** | Full-wave write of ~40 markets × large docs = real $ vs GCS object GETs |
| **Not a blob store** | Sharding one market across N docs is complex and easy to get wrong |
| **You already have GCS** | Same durability, cheaper for large JSON, already wired |

### Organized Firestore layout (implemented schema v2)

Think in **layers**, not “dump the API response”:

```text
┌─────────────────────────────────────────────────────────────┐
│  Firestore (small, queryable)                               │
│  marketMeta/{id}        pointer: day, bytes, gcsPath        │
│  marketDigest/{id}      KPI slice (curve points, top coins) │
│  fieldInventory/{id}    which keys filled vs hollow         │
│  dailyRollup/{date}     board: which markets ok that day    │
└─────────────────────────────────────────────────────────────┘
              │ points to
              ▼
┌─────────────────────────────────────────────────────────────┐
│  GCS + disk (large, opaque)                                 │
│  market-cache/{id}-{date}.json   full panel payload         │
└─────────────────────────────────────────────────────────────┘
```

| Doc | What we store | What we deliberately drop |
|-----|---------------|---------------------------|
| **marketMeta** | freshness, size, GCS URI, fill ratio | series history, quote maps |
| **marketDigest** | latest rates, sample quotes (≤12), top coins | 2000-point FRED arrays |
| **fieldInventory** | filledKeys / hollowKeys lists | values themselves |
| **dailyRollup** | per-day map of market → ok/bytes | payloads |

**Digest rules** (`server/lib/marketDigest.js`):

1. Prefer **latest scalars** over full time series.  
2. Cap arrays (top 8–12).  
3. Cap total digest JSON (~48 KiB).  
4. Market-specific extractors for bonds / equities / crypto / fx / credit / sentiment; generic fallback elsewhere.

| Collection | Contents | Size | Benefit |
|------------|----------|------|---------|
| `marketMeta/{marketId}` | pointer + freshness + gcsPath | ~1 KB | Footer / ops without GCS list |
| `marketDigest/{marketId}` | structured KPI digest JSON | ≪ 50 KB | Progressive KPI / future splash seed |
| `fieldInventory/{marketId}` | hollow vs filled keys | tiny | Diagnose sparse panels |
| `dailyRollup/{YYYY-MM-DD}` | markets board for that day | tiny | “What warmed today?” |
| (future) `userPrefs/{uid}` | layout prefs | tiny | UX |
| (future) `panelHealth/{date}` | F/D/C aggregates | small | Trends |

**Do not** put full `quotes{}` (500+ tickers) or multi-year FRED histories in Firestore.

### Recommended architecture (no double system)

```text
Scheduler / postdeploy warm / first request
  → Express builds market payload
  → write disk + GCS (bulk)          [KEEP]
  → write marketMeta/* to Firestore  [ADD — optional]
  → (optional) write kpiSnap/*       [ADD — optional]

Browser
  → GET /api/{market}  (server reads disk/GCS first — already)
  → never required to read Firestore for full panels
```

Firestore becomes an **index**, not a second copy of Yahoo/FRED history.

### If you still want client-side “instant paint”

Prefer in this order:

1. **Server cache-first** (already) + progressive enter (splash change).  
2. **GCS** warm on schedule.  
3. **localStorage / IDB** for today’s slim client seed (already partial).  
4. **RTDB latest** only for history (already).  
5. Firestore **kpiSnap** only if KPI strip must paint before `/api/*` returns.

---

## 4. What “record so we don’t refresh big data” actually means

| Goal | Right tool |
|------|------------|
| Don’t re-hit FRED every page load | Disk/GCS same-day cache (existing) |
| Don’t re-hit FRED on every Cloud Run instance | GCS shared bucket (existing) |
| Don’t force-live on app open | DataProvider cache-first wave (existing) + progressive enter |
| Know freshness without downloading bags | Firestore `marketMeta` or `/api/cache/status` (existing) |
| Time travel | RTDB history (existing) |
| User layouts | Firestore or localStorage |

**Avoid:** client writing full market bags to Firestore on every load.

---

## 5. Implementation status

| Item | Status |
|------|--------|
| Progressive splash (default) | Implemented — Enter anytime; auto-enter after first market |
| Verify splash F/D/C | `?verify=1` or `?fdc=1` |
| Panel loading not disabled mid-wave | BentoCard `data-panel-loading` + EmptyPanelBody loading |
| Footer chip honesty + tooltips | Implemented (session + disk + API provenance + meta bytes/GCS) |
| Topbar true-UI green only | Implemented |
| Wave order **deps before tabs** | Implemented (`buildWaveMarketIdsFromRouting`) |
| Firestore `marketMeta/{id}` on cache write | Implemented (`server/lib/firestoreMeta.js`) |
| `/api/cache/status` merges Firestore meta | Implemented |
| Bulk market JSON in Firestore | **Not done (by design)** |

### Firestore ops (production)

```bash
gcloud services enable firestore.googleapis.com --project=kfinance032926
SA="firebase-app-hosting-compute@kfinance032926.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding kfinance032926 \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user"
```

| Env | Effect |
|-----|--------|
| `FIRESTORE_MARKET_META=true` | Force enable |
| `FIRESTORE_MARKET_META=0` | Force disable |
| default | On when Cloud Run (`K_SERVICE`) |

DataProvider still loads **full** markets from `/api/*` (disk/GCS), never from Firestore bags.

---

## 6. Probe commands

```bash
# Progressive UI (default)
# open app — enter immediately

# Full catalog F/D/C (mounts all markets)
# open http://localhost:5173/?verify=1
npm run probe:fdc
```
