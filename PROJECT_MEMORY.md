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
  → panel health: fetch + display + confirm

Optional: Functions refreshMarketSnapshots → RTDB latest/history
         (date picker / nightly history — not primary live UI)
```

## Refresh policy (not a real-time app)

| Trigger | What runs |
|---------|-----------|
| **App load** | One DataProvider wave, **cache-first** (no `?refresh` unless `VITE_FORCE_LIVE`) |
| **Topbar ▶** | Same full wave with **force live** (`?refresh=true`) for every market |
| **BentoCard footer ▶** | **One market** force-live (`refetchSingle`) |

- **No** interval auto-refresh and **no** background revalidate after the first wave.
- Data stays until the user presses a play control (or leaves historical mode).

| Concern | Where |
|---------|--------|
| Market endpoints | `src/hub/DataProvider.jsx`, `shared/api-routing.json` |
| Panel catalog | `src/data/marketPanels.js` |
| Independent panels | `src/panels/` (`definePanel`, `PanelSlot`, `MarketPanelGrid`, `registry`) — every market tab is composition-only; bodies via module or `ctx.__render` |
| Health regressions | `npm run test:health` — layout keys, catalog parity, wave mutex, placeholders, server stability (see `docs/TEST_HEALTH_SUITE.md`) |
| AI housekeep | `npm run housekeep` — Ollama `/api/chat` (cloud: `OLLAMA_API_KEY` + `https://ollama.com`); API https://github.com/ollama/ollama/blob/main/docs/api.md — `docs/HOUSEKEEP_AGENT.md` |

| Panel modules / paths | `src/panels/manifest.js`, `src/panels/README.md`, `docs/PANEL_MODULES.md` |
| Health placeholders | `src/data/panelPlaceholders.js` (fill ≥ 0.85; cross-market waits pending) |
| Health signal colors | `src/hub/lib/panelHealthSignal.js` |
| Health eval | `src/hub/lib/panelHealthEval.js`, `src/hooks/usePanelHealth.js` |
| Equity universe | `src/data/stockUniverse.js` |
| IPO queue | `/api/universeUpdates` — exclude tickers already in universe |
| Heatmap size | `src/components/HeatmapView/heatmapSizeControl.js` |

---

## Panel health (do not regress)

Source of truth for **dot colors**: `src/hub/lib/panelHealthSignal.js` (`derivePanelSignal`).

| Dot | Meaning |
|-----|---------|
| Green | Active **visible** tab + fetch + display + confirm |
| Grey pending | Fetch ready, tab closed **or** open tab still painting |
| Amber loading | Market still loading |
| Red | Fetch failed after load, **or** open tab settled empty/disabled |

- Closed / `display:none` visited tabs are **not** visible — never green, never red for “no DOM”.
- Splash seed demoted on Enter; health re-eval is **not** a data re-fetch.
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
