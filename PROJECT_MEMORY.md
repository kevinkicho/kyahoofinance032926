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
| Health placeholders | `src/data/panelPlaceholders.js` |
| Health eval | `src/hub/lib/panelHealthEval.js`, `src/hooks/usePanelHealth.js` |
| Equity universe | `src/data/stockUniverse.js` |
| IPO queue | `/api/universeUpdates` — exclude tickers already in universe |
| Heatmap size | `src/components/HeatmapView/heatmapSizeControl.js` |

---

## Panel health (do not regress)

- Green = **open tab mounted** + **fetchOk** + **displayOk** + **confirmOk**.
- No free-pass from splash cache, bus alone, or bare catalog bags (`fred`, `yahoo`, …).
- Prefer leaf paths in placeholders (`fred.copper.value`, not `fred`).
- Display prefers metric stamps / chart series, not chrome digits.
- Inactive tabs: at best **pending**, never green without DOM.

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
