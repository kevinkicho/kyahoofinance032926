# Panel health chronic incomplete review

**Date:** 2026-07-31  
**Symptom:** Splash / health UI shows ~90–110 incomplete of ~233 panels for months, even when `/api/*` returns HTTP 200.  
**Audience:** agents + maintainers.  
**Status:** **P0 sprint landed 2026-07-31.** Offline fetch gate improved **189 → ~224 / 233** pass (remaining: equities + watchlist without Yahoo cache). Live splash should be much closer to ≥90% after one warm boot caches equities.

---

## Executive summary

This is **not primarily a “network failure” problem**.

Incomplete panels are produced by a **stack of independent systems** that all must pass for splash **ok**:

1. **HTTP / wave** — market payload arrives (often always-200, including hollow shells)  
2. **Fetch gate (F)** — placeholder fill ≥ **85%** of *required* slots, with **strict numeric density** rules  
3. **Display gate (D)** — DOM has metric stamps / chart series / dense table cells  
4. **Confirm gate (C)** — fetch samples match display stamps/text  

Splash **incomplete** = everything that is not pure `ok` or pure `loading`.

**Offline score against today’s disk cache (2026-07-31):**

| Metric | Value |
|--------|------:|
| Total panels | 233 |
| Fetch gate pass | **189** |
| Fetch gate fail | **44** |
| Markets with 0 fetch fails (cache present) | bonds, commodities, credit, bls, eia |

**Typical live splash incomplete (~99)** ≈ those **~44 fetch fails** + **~40–60 display/confirm fails** (unmounted panels, plain-text numbers, chart paint lag, confirm mismatch).

Recovery agent + mass ▶ **cannot** fix wrong paths, bag-density false negatives, or unmounted panels. Refetching a 200 hollow or mis-scored payload is a no-op.

---

## Architecture (what “ok” means)

### Layered model (2026-08 rework)

Product health is **three fact layers + one presentation policy** — not a single overloaded `status === 'ok'`.

```text
L0  Market plane     HubFooter / DataProvider  — bag wave + disk freshness
L1  Panel data       placeholders/contracts    — fill rate (no DOM)
L2  Panel paint      DOM classify + confirm    — true_ui | bridge shell | painting
──  Presentation     hub/lib/health/present.js — chips/dots from L1+L2 + visibility
```

| Product green | Rule |
|---------------|------|
| Splash chip `ui` / topbar `ok` | L1 data ready **and** L2 `paint === true_ui` (natural, not bridge) |
| Topbar only | + **tab visible** (closed tab never green) |
| Bridge | Always amber — diagnostic only, never product green |
| Footer chips | L0 only (not panel F/D/C) |

```text
External APIs
  → Express /api/*  (often HTTP 200 + null fields or degraded shell)
  → disk datacache + memory
  → DataProvider wave (cache-first; ▶ force-live)
  → markets[id].data
  → evaluatePanelHealth
        F: panelPlaceholders fill ≥ 0.85          → L1 dataState
        D: classifyPanelDisplay(DOM) + bridge tag → L2 paintState / paintVia
        C: confirmDisplayMatchesFetch
        attachHealthLayers() → report.health
  → present.toSplashChip / toTopbarDot
  → SplashScreen countStatuses (okUi / okBridge / dataReady)
  → usePanelHealth dots (closed tab: paint n/a; never green from splash alone)
```

| File | Role |
|------|------|
| `src/hub/lib/health/types.js` | Fact model (`factsFromReport`, `attachHealthLayers`) |
| `src/hub/lib/health/panelData.js` | **L1 pure** — placeholders / field map / contract (no DOM) |
| `src/hub/lib/health/panelPaint.js` | **L2** — display + confirm; bridge tagged |
| `src/hub/lib/health/present.js` | **Single** presentation policy (`toTopbarDot`, `toSplashChip`, counts) |
| `src/hub/lib/health/index.js` | Public re-exports |
| `src/hub/DataProvider.jsx` | Wave, applyResult, recovery hook (L0) |
| `src/data/panelPlaceholders.js` | Required slots per `marketId:panelId` (L1 primary) |
| `shared/contracts/` | Market/panel contracts — L1 annotation + soft fallback |
| `src/hub/lib/panelHealthUtils.js` | `placeholderValueOk`, `bagDensityOk`, substance |
| `src/hub/lib/panelHealthEval.js` | Orchestrates L1+L2 + thin re-exports of present |
| `src/hub/lib/panelHealthSignal.js` | DOM helpers + `derivePanelSignal` → `toTopbarDot` |
| `src/hub/lib/panelHealthStamp.js` | Hidden metric bridge (operator / D/C lag only) |
| `src/hub/SplashScreen.jsx` | Progressive enter; verify mode full scan |
| `shared/api-routing.json` | Market → `/api/*` |

### Offline L1 scoring

```js
import { evaluatePanelData, evaluateAllMarketsDataOnly } from './hub/lib/health/index.js';
// No document required — cache warm / CI / progressive digests
const l1 = evaluatePanelData({ marketId, panelId, marketCtx, allMarkets });
// l1.fetchOk, l1.dataState, l1.placeholders, l1.contract, l1.source
```

### Shells and progressive splash (2026-08)

| Mode | L1 | L2 / shells |
|------|----|-------------|
| Consumer progressive splash | `evaluateAllMarkets({ dataOnly: true })` | **none** |
| Operator / `?verify=1` | full eval | `createShell: true` |
| Open tab (consumer) | full L1 | natural DOM only (`createShell: false`) |
| Open tab (operator) | full L1 | shells allowed for unmounted panels |

Explicit market contracts (`equities.v1`, `bonds.v1`, …): panel `requiredFields` are a **hard AND** with placeholders — missing contract roots fail L1 even if some slots filled.

### Splash counting quirk (historical)

```js
// countStatuses: anything not ok/loading → incomplete (bad)
if (status === 'ok') ok++
else if (status === 'loading') loading++
else {
  bad++  // "incomplete"
  if (fetchOk && !displayOk) pending++   // paint
  else if (!fetchOk) fetchFail++         // data
}
// confirm-only fail (F✓ D✓ C✗) lands in bad but neither pending nor fetchFail
```

**Fixed (flash-page presentation):** market borders and panel dots no longer
treat `status === 'ok'` or `ctx.data` as full green. Use:

- `panelChipKind` → `ui` (green) | `bridge` (amber) | `pending` | `null` | …
- `marketSplashKind` → `ok` only if **every** panel is true UI; else `bridge` /
  `partial` / `error` / loading
- Progress bar: green segment = `okUi`, amber = `okBridge`

Payload-only market load status is still used only for “fetching markets…” /
ready-to-enter gating, not for the green market border.

---

## Failure taxonomy (why ~100 incomplete)

### Class A — Fetch gate false negatives on *good* data (P0, code bug)

**Smoking gun:** `bagDensityOk` / `placeholderValueOk` for catalog roots.

For path `fundingData` / `returnsData` / `earningsData` / `foreclosureData`:

- Payload has **many numeric leaves**
- Top-level shape is a **wrapper** with one dense child + one null/meta sibling  
- Density rule requires **≥2 top-level keys** (or 50% of keys) with numbers  

Examples from live cache (2026-07-31):

| Panel | Payload reality | Health result |
|-------|-----------------|---------------|
| `crypto:funding` | `fundingData.rates[]` full; `openInterestHistory: null` | **F✗** (nums=6, ok=false) |
| `sentiment:cross-asset` | `returnsData.assets[]` full; `asOf` string | **F✗** (nums=24, ok=false) |
| `equitiesDeepDive:earnings` | `upcoming[]` full; `beatRates: null` | **F✗** (nums=12, ok=false) |
| `realEstate:foreclosure` | series present | **F✗** unless both child keys dense |
| `insurance:combined-ratios` | edgar ratios map dense | **F✗** under bag rules |

This class alone can keep **~5–15 panels** red forever while the UI looks fine. It has looked like “flaky data” for months.

**Fix direction:** treat catalog roots as filled when **any major child array/map** passes density (or count nested filled rows), not when 50% of *wrapper keys* are non-null. Add unit fixtures with the real shapes above.

---

### Class B — Placeholder path / type mismatches (P0)

Data exists under a **different key** or is **non-numeric by design**.

| Panel | Placeholder | Actual / issue |
|-------|-------------|----------------|
| `calendar:treasury` | `treasuryAuctions` / `auctions` on calendar primary | Calendar auctions often empty/stringy; **dep** `treasuryAuctions` market holds real data — need `crossMarket` |
| `calendar:options` | `optionsExpiry` | `[{date, type}]` strings only → always F✗ |
| `globalMacro:gdpnow` | `fedGDPNow.currentQuarter` | String `"25:Q2"` → always F✗; use `latest.gdp` / `evolution` |
| `globalMacro:imf-*`, `fx:imf-cofer` | crossMarket `imf` | **No imf disk cache** when DNS fails; waits forever or empty |
| `alerts:*` | `alerts` / `rules` | Empty alerts = healthy “All Clear”; rules are string metadata |
| `analytics:*` (14) | was wrong primary `/api/rate-limits` | Fixed primary → `/api/analytics`; still live-only, no market cache file |
| `insurance:etfs` | `sectorETF.price` | Often **array** of holdings, not `.price` scalar |
| `fx:reer` / `bis-reer` | `reer` | Present in cache today (OK); fails when FRED series null |
| `derivatives:vix1y` | `fredVixHistory` | Often null / FRED 403 |

---

### Class C — Missing durable market caches (P0/P1)

| Market | Disk cache today | Effect |
|--------|------------------|--------|
| **equities** | **absent** (until first successful write after recent fix) | 6 panels F✗ offline; Yahoo-dependent every cold boot |
| **imf** | **absent** (DNS `ENOTFOUND dataservices.imf.org` in logs) | IMF panels + cross-market wait |
| **watchlist** | none | 3 panels; empty quotes on Yahoo fail |
| **analytics** | none (computed live) | 14 panels if wave/order or shape wrong |
| **alerts** | federated only | 3 panels; shape not numeric |

Many other markets **do** cache well (bonds 20/20, commodities 21/21, credit 18/18).

---

### Class D — Display / confirm (paint) (P1)

Even when F✓:

| Cause | Notes |
|-------|------|
| Panel never mounts | e.g. equities **portfolio** only after view visit |
| Plain text numbers | No `MetricValue` / chart stamps → D fails without stamp bridge |
| Stamp bridge only after F✓ | Class A/B blocks the bridge |
| Confirm mismatch | Formatted % vs raw samples; hollow marks |
| Splash counts paint as incomplete | Correct for strict product, harsh for “is data loaded?” |

Recent stamp bridge (`panelHealthStamp.js`) helps **only after** F passes.

---

### Class E — Always-200 / degraded shells (P1)

Server returns 200 with sparse nulls or `_degraded` so SPA wave completes.  
`hasNonNullData` may keep soft-fail payloads. Splash market row looks loaded; panel chips stay incomplete.

Documented in `KNOWN_LIMITATIONS.md` (null fields + 200).

---

### Class F — Env / upstream (ongoing)

| Issue | Evidence |
|-------|----------|
| `CENSUS-API-KEY` vs `CENSUS_API_KEY` | Log: Census HTML “Missing Key” — **alias fix + .env mirror applied** |
| IMF DNS | `ENOTFOUND dataservices.imf.org` — environment/network, not React |
| FRED 400 series | e.g. insurance `NPORCT` does not exist |
| Yahoo QuoteSummary warnings | fundamentals submodules empty since 2024 |

---

## Evidence from your last dev log

From `New Text Document (3).txt` (2026-07-31 ~15:27):

- Warmup + wave: almost all routes **200** (many 1–8ms = cache hit).  
- **IMF** all WEO failed → static snapshot.  
- **Census trade** “Missing Key” HTML.  
- Recovery: `POST /api/agent/recover-plan` **200** (~7.6s) — agent ran; cannot fix Class A/B.  
- Equities live Yahoo ~1–2s; no durable cache file at probe time.

---

## Why unit tests stayed green for two months

| Covered | Blind |
|---------|--------|
| Layout keys, catalog parity | Full splash F/D/C on real wave |
| Date axes / ratings fill | Wrapper bag-density false negatives |
| Wave mutex / applyResult | Equities/IMF missing disk day after day |
| Network HTML-as-JSON | Non-numeric catalogs (alerts, options) |
| Recovery plan shape | “Refetch” on structural catalog bugs |

`npm run test:health` is **necessary but not sufficient**. Offline `scripts/probe-cache-fetch-fail.mjs` against `server/datacache` is the right gate for Class A/B.

---

## Prioritized path to ≥90% ok (local + keys)

### P0 — do these first (expected +30–50 panels)

1. **Fix `bagDensityOk` for catalog wrappers**  
   - File: `src/hub/lib/panelHealthUtils.js`  
   - Accept dense nested `rates` / `assets` / `upcoming` / `foreclosures` even if sibling keys are null.  
   - Tests: fundingData, returnsData, earningsData, foreclosureData fixtures from real cache.

2. **Retarget non-numeric placeholders**  
   - `calendar:options`, `globalMacro:gdpnow`, `alerts:*`, `calendar:treasury` (+ crossMarket treasuryAuctions).  
   - File: `src/data/panelPlaceholders.js` (+ small `placeholderValueOk` exceptions if needed).

3. **Equities + IMF always write cache** (in progress / ensure)  
   - Equities write on success; serve disk on cold.  
   - IMF write snapshot payload even when DNS fails (so crossMarket resolves).

4. **Splash honesty**  
   - Market chip not “ok” on `_degraded` / empty substance.  
   - Incomplete subtitle already splits data vs paint — keep and fix confirm-only bucket.

5. **View-gated panels**  
   - Mount for splash health **or** exclude from splash totals until visited (`equities:portfolio`).

### P1 — push into low-to-mid 90s

6. Optional `required:false` or better fallbacks for known flaky FRED: `fredVixHistory`, reer when null, foreclosure.  
7. Watchlist: soft-fallback quotes from equities universe on Yahoo fail.  
8. Insurance etfs/reserves path fixes.  
9. MetricValue adoption on high-traffic panels (stamps without bridge).  
10. CI budget: fail `probe-cache-fetch-fail` if fetchFail > N (e.g. 15) with warm cache fixture.

### P2 — hygiene

11. Recovery agent: skip refetch when observation classifies “catalog_type” / bag-density issues.  
12. Align functions copy of placeholders fill rate with src (0.85).  
13. Document intentional incomplete panels in `KNOWN_LIMITATIONS.md`.

---

## What will *not* get you to 100%

| Item | Why |
|------|-----|
| IMF DNS blocked | No live WEO; snapshot only |
| Missing FRED series | 400 “series does not exist” |
| Empty user watchlist / no alerts | Valid empty product states if not coded as healthy |
| Hosted cold start without warm | Separate ops path (`postdeploy:warm`) |

Aim for **≥90% ok** under normal local dev with keys + warm disk cache; treat remaining as intentional or upstream.

---

## Recommended next implementation sprint (ordered)

1. `bagDensityOk` nested-density fix + 4 regression tests  
2. Placeholder retargets: gdpnow, options, treasury crossMarket, alerts healthy-empty  
3. Force IMF snapshot cache write + verify `imf-YYYY-MM-DD.json` after one boot  
4. Splash: exclude unmounted view-gated panels from incomplete total **or** force-mount  
5. Run `node scripts/probe-cache-fetch-fail.mjs` + live splash; target fetchFail ≤ 15, incomplete ≤ 30  

---

## Related docs

- `docs/TEST_HEALTH_SUITE.md` — unit pack  
- `docs/RECOVERY_AGENT.md` — runtime recovery (fetch only)  
- `docs/HOUSEKEEP_AGENT.md` — offline Ollama advisor  
- `KNOWN_LIMITATIONS.md` — intentional constraints  
- `reports/cache-fetch-fail.json` — latest offline fetch-fail inventory  
