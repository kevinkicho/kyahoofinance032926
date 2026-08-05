# Documentation index

**Last reviewed:** 2026-07-30

Prefer **running code** over any older note.

---

## Canonical

| Doc | Audience | Purpose |
|-----|----------|---------|
| [`../AGENTS.md`](../AGENTS.md) | AI agents | Preflight / push gates |
| [`../README.md`](../README.md) | Humans | Setup, scripts, market overview |
| [`DEPLOY.md`](./DEPLOY.md) | Agents + ops | App Hosting, warm, RTDB scheduler |
| [`DATA_PIPELINE.md`](./DATA_PIPELINE.md) | Agents | How data reaches panels |
| [`API_ENDPOINTS.md`](./API_ENDPOINTS.md) | Agents | Market id → `/api/*` |
| [`PANELS.md`](./PANELS.md) | Agents + UX | Panel inventory |
| [`PANEL_MODULES.md`](./PANEL_MODULES.md) | Agents | Per-panel modules + manifest |
| [`RECOVERY_AGENT.md`](./RECOVERY_AGENT.md) | Agents | AI/local panel recovery (not fixed retry trees) |
| [`HOUSEKEEP_AGENT.md`](./HOUSEKEEP_AGENT.md) | Agents | Offline Ollama housekeep advisor |
| [`TEST_HEALTH_SUITE.md`](./TEST_HEALTH_SUITE.md) | Agents | Regression pack for panel health |
| [`PANEL_HEALTH_CHRONIC_REVIEW.md`](./PANEL_HEALTH_CHRONIC_REVIEW.md) | Agents + humans | Root-cause review: ~100 incomplete for months |
| [`API_ETIQUETTE.md`](./API_ETIQUETTE.md) | Agents | Upstream rate limits, circuits, probe:fdc |
| [`SHARED_CACHE.md`](./SHARED_CACHE.md) | Ops | GCS shared market cache |
| [`PROGRESSIVE_LOAD_AND_FIRESTORE.md`](./PROGRESSIVE_LOAD_AND_FIRESTORE.md) | Agents + humans | Progressive enter, status honesty, Firestore design |
| [`CONTRACTS.md`](./CONTRACTS.md) | Agents | Market contracts + panel slices |
| [`../shared/contracts/`](../shared/contracts/) | Agents | Contract JSON + auto-builder |
| [`CI_PREFLIGHT_GUIDE.md`](./CI_PREFLIGHT_GUIDE.md) | Agents | Local gates vs Actions |
| [`../KNOWN_LIMITATIONS.md`](../KNOWN_LIMITATIONS.md) | Agents | Intentional constraints |
| [`../PROJECT_MEMORY.md`](../PROJECT_MEMORY.md) | Agents | Short conventions |
| [`components/BentoCard.md`](./components/BentoCard.md) | Agents | Bento panel chrome |
| [`layout-keys.md`](./layout-keys.md) | Agents | Bento `storageKey` bumps |

---

## Architecture (one paragraph)

**Firebase App Hosting** (Cloud Run Express in `server/`) serves the SPA and
**`/api/*`**. The browser **DataProvider** wave-fetches markets on load/refresh.
Daily JSON lives on **disk** and optional **GCS** (`MARKET_CACHE_BUCKET`).
Functions + RTDB hold **nightly snapshots** / historical dates — not the primary
live path. Panel health is **fetch + display + confirm**
(`src/hub/lib/panelHealthEval.js`).

---

## When docs disagree

1. Running code (`server/`, `src/hub/DataProvider.jsx`, `apphosting.yaml`)
2. This index + `AGENTS.md` + `DEPLOY.md`
3. `KNOWN_LIMITATIONS.md`
4. Everything else

Update canonical docs in the same change set when deploy, cache, or health rules change.
