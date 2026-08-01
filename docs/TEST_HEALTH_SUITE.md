# Health / regression test suite

Automated coverage for failures we hit while extracting panels and debugging local `npm run dev`.

## Quick commands

```bash
# Full unit suite (CI / preflight)
npm test

# Focused regression pack (fast feedback for this class of bugs)
npm run test:health

# Optional: live server shape checks (app must already be running)
npm run test:regress

# AI housekeeping (Ollama Cloud) — advisors, not a hard gate
npm run housekeep:dry      # collectors + test:health, no cloud
npm run housekeep:tests    # + Ollama Cloud analysis (needs OLLAMA_API_KEY)

# Panel inventory probes
npm run probe:panels       # offline fetch-gate vs disk cache (~233)
npm run probe:fdc          # LIVE F+D+C via Playwright (needs npm run dev)
```

See `docs/HOUSEKEEP_AGENT.md`, [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md), and [Cloud](https://docs.ollama.com/cloud).

## What `test:health` covers

| Area | Files | Catches |
|------|--------|---------|
| Layout keys | `regression/layoutKeys.test.js` | Empty shells when React keys are `.0:$kpi` |
| Catalog parity | `regression/panelCatalogParity.test.js` | MARKET_PANELS ↔ registry ↔ manifest drift |
| Placeholder health | `regression/placeholderHealthRegression.test.js` | False F✗ on date axes / ratings / auctions |
| DataProvider wave | `regression/dataProviderWave.test.jsx` | Stuck `isLoading` / mutex drop |
| MarketPanelGrid | `regression/marketPanelGrid.test.jsx` | Missing `data-panel-key` after extraction |
| Hooks order | `regression/hooksOrderGuard.test.js` | Early return before hooks (hub crash) |
| Panel health core | `panelHealthEval.test.js`, `panelHealthSignal.test.js` | 3-gate rules / false greens |
| Apply / guards | `dataProviderApplyResult.test.js`, `dataProviderChaos.test.js` | Hollow payloads / structural guards |
| Server stability | `server/__tests__/networkErrors.test.js` | ECONNRESET must not be “fatal” class |
| Fetch resilience | `server/__tests__/fetchJsonResilience.test.js` | HTML-as-JSON (Census) |
| Recovery agent | `regression/recoveryAgent.test.js`, `server/__tests__/agentRecover.test.js` | Dynamic plan/tools (not fixed retry trees) |

## Failure classes → tests

| Production symptom | Root cause | Test |
|--------------------|------------|------|
| Splash: 0/18 markets forever | Wave discarded + mutex no restart | `dataProviderWave.test.jsx` |
| All bento cards empty shells | Layout key normalize | `layoutKeys.test.js` + `marketPanelGrid.test.jsx` |
| “Something went wrong in Market Hub” | Hooks after early return | `hooksOrderGuard.test.js` |
| 122 incomplete with data on screen | Date/ratings placeholders | `placeholderHealthRegression.test.js` |
| `npm run dev` dies mid-session | Uncaught ECONNRESET | `networkErrors.test.js` |
| Census spam + hollow trade panels | HTML 200 body | `fetchJsonResilience.test.js` |
| Yahoo one symbol blanks heatmap | Quote chunk validation | (route-level; equities uses `validateResult: false`) |
| Incomplete after wave, fixed tree retries fail | Need observation-driven recovery | `recoveryAgent.test.js` + live `/api/agent/recover-plan` |

## Adding a regression

1. Write the smallest unit test under `src/__tests__/regression/` or `server/__tests__/`.
2. Name the file/case after the user-visible symptom.
3. Add a one-line row to the table above.
4. Ensure `npm run test:health` includes the file (glob already covers `regression/**` and server health tests via script).

## Not covered here (still use e2e / manual)

- Full splash DOM confirm against every market (Playwright `test:panels` / `test:coverage`)
- Live FRED rate limits / IMF DNS outages (environment)
- Visual layout drag persistence across browsers
