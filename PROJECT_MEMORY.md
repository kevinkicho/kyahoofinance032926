# Project memory (current)

Short agent-oriented conventions. **Last reviewed: 2026-07-30.**  
Deploy / preflight: `AGENTS.md`, `docs/README.md`.

---

## Goal

Multi-market financial hub with **honest data**: no mock numbers as “live”.
Attribute values (MetricValue / DataFooter / SafeECharts `sourceInfo`). Empty →
“—” or empty shell.

---

## Hard rules

| Rule | Detail |
|------|--------|
| Preflight | Before push: `npm run preflight`. Agents: `AGENTS.md`. |
| No deceptive data | No fabricated prices as live; use empty states. |
| Provenance | Prefer MetricValue + DataFooter; charts pass `sourceInfo`. |
| Production | **Firebase App Hosting** Express (`server/`), same-origin `/api/*`. |
| Secrets | Never commit keys/PEMs/SA JSON; no `secrets.X != ''` in GHA. |

### Badge vocabulary (DataFooter)

| Badge | Meaning |
|-------|---------|
| **FETCHED** | Successful same-day / live payload |
| **LOADING** | In flight |
| **STALE** | Older cache (`isCurrent: false`) |
| **NO DATA** | Empty or failed after fetch |
| **UNAVAIL** | Missing key / not configured |
| **WAITING** | Shell mounted, first fetch not done |

Prefer **FETCHED** over “Live streaming” for REST snapshots.

---

## Architecture

```
External APIs
  → server/ Express (/api/*) on App Hosting
  → disk datacache + optional GCS MARKET_CACHE_BUCKET
  → browser DataProvider (wave fetch)
  → useMarketData(id) → BentoCard dashboards
  → panel health: L1 data + L2 paint → present (see hub/lib/health/)

Optional: Functions refreshMarketSnapshots → RTDB latest/history
         (date picker / nightly history — not primary live UI)
```

## Refresh policy (not a real-time app)

| Trigger | What runs |
|---------|-----------|
| **App load** | One DataProvider wave, **cache-first** (no `?refresh`); server serves bag with **no upstream** if present |
| **Topbar ▶** | Force rebuild (`?refresh=true` + bypass) — only catalog-wide upstream stampede |
| **BentoCard footer ▶** | **One market** force-live (`refetchSingle`) — equities **/api/equities only** |
| **Postdeploy warm** | Staged `?refresh=true` write into disk/GCS (primary builder) |
| **Serve policy** | `MARKET_SERVE_MODE=cache_bootstrap` (prod default) or `cache` |

- **No** interval auto-refresh and **no** background revalidate after the first wave.
- Progressive: digest KPI bar while bag loads (`DigestKpiBar` + `/api/cache/digest/:id`).
- **Consumer** default; **Operator** mode (⚙ settings) for recovery + verify splash (`?verify=1`).
- Contracts: `shared/contracts/` (explicit equities/bonds + auto from routing/field map).
- Panel slice API: `GET /api/panel/:marketId/:panelId` (cache field-map slice).

| Concern | Where |
|---------|--------|
| Market endpoints | `src/hub/DataProvider.jsx`, `shared/api-routing.json` |
| Panel catalog | `src/data/marketPanels.js` |
| Independent panels | `src/panels/` (`definePanel`, `PanelSlot`, `MarketPanelGrid`, `registry`) — every market tab is composition-only; bodies via module or `ctx.__render` |
| Health regressions | `npm run test:health` — layout keys, catalog parity, wave mutex, placeholders, server stability (see `docs/TEST_HEALTH_SUITE.md`) |
| AI housekeep | `npm run housekeep` — Ollama `/api/chat` (cloud: `OLLAMA_API_KEY` + `https://ollama.com`); API https://github.com/ollama/ollama/blob/main/docs/api.md — `docs/HOUSEKEEP_AGENT.md` |

| Panel modules / paths | `src/panels/manifest.js`, `src/panels/README.md`, `docs/PANEL_MODULES.md` |
| Health placeholders | `src/data/panelPlaceholders.js` (fill ≥ 0.85; cross-market waits pending) |
| Health layers + presentation | `src/hub/lib/health/` (`panelData` L1, `panelPaint` L2, `present`, `types`) |
| Health signal / DOM helpers | `src/hub/lib/panelHealthSignal.js` (`derivePanelSignal` → `toTopbarDot`) |
| Health eval orchestrator | `src/hub/lib/panelHealthEval.js`, `src/hooks/usePanelHealth.js` |
| Equity universe | `src/data/stockUniverse.js` |
| IPO queue | `/api/universeUpdates` — exclude tickers already in universe |
| Heatmap size | `src/components/HeatmapView/heatmapSizeControl.js` |

---

## Panel health (do not regress)

**Layered model** — single presentation policy in `src/hub/lib/health/present.js`:

| Layer | Question | Source |
|-------|----------|--------|
| L0 market plane | Is the bag here / fresh? | DataProvider + HubFooter |
| L1 panel data | Enough structured data to render? | placeholders / contracts (`dataState`) |
| L2 panel paint | True UI on screen? | DOM + confirm (`paintState` / `paintVia`) |

Source of truth for **dot colors**: `toTopbarDot` (also `derivePanelSignal` re-export).

| Dot | Meaning |
|-----|---------|
| Green | Active **visible** tab + L1 ready + L2 **true_ui** (not bridge) |
| Amber bridge | Open tab, data ok only via health-bridge stamps |
| Grey pending | Fetch ready, tab closed **or** open tab still painting |
| Amber loading | Market still loading |
| Red | Fetch failed after load, **or** open tab settled empty/disabled |

- Product green **never** from bridge-only or closed tab.
- Closed / `display:none` visited tabs are **not** visible — never green, never red for “no DOM”.
- Health shells (`createShell`) only in **operator / verify** — consumer progressive uses L1 `dataOnly`.
- Explicit contracts (equities/bonds) are a **hard L1 AND** with placeholders.
- L1 slots: rich hand inventory → field map → contract paths → simple hand (paths only, **no mock values**).
- Last-good bag: today miss → prior disk/GCS with `isStale` / `fetchedOn` (not Firestore bulk).
- Splash seed demoted on Enter; health re-eval is **not** a data re-fetch.
- KPIs: `okUi` / `okBridge` / `dataReady` (not a single “ok/incomplete” ratio).
- Panel ids collide (`kpi`, …) — lookup is always scoped to `[data-market-id]`.
- No free-pass from splash cache, bus alone, or bare catalog bags.

---

## Equities heatmap

- Permanent names: `stockUniverse.js`.
- Discovery queue is ephemeral (Finnhub IPOs via RTDB rolling window).
- Size control: share-of-parent prune + pixel `visibleMin` (not membership).

---

## Local ops

```bash
npm start
npm run preflight
npm run postdeploy:warm   # after App Hosting ship

# After route shape changes, clear stale daily cache:
# Windows: del server\datacache\*.json
# Unix:    rm server/datacache/*.json
```

Full doc map: [`docs/README.md`](docs/README.md).
