# Agent fetch orchestration

Routes declare upstream sources; an orchestrator decides which to call,
in what order, with what retries/backoff. The AI recovery planner (Ollama)
proposes the plan from live state; a deterministic fallback runs when
Ollama is down or unconfigured.

**Source:** `server/lib/agentFetch.js` (orchestrator) ·
`server/routes/agentRecover.js` (`POST /api/agent/recover-plan` with
`budgets.mode: 'fetch_plan'`).

## Why

Hardcoded retry ladders and per-route `trackApiCall` calls cannot react to
live throttle / circuit / budget state. The recovery agent already
decides *which market* to refetch; this extends the same pattern to *which
upstream source within a route* and *how* to retry it.

## How it works

```
Route declares sources: [{ source, fetcher }]
  → runFetchPlan({ sources, _errors, baseUrl })
      → buildFetchObservation(sources)          // budget + throttle + circuits
      → requestAiPlan(observation) → POST /api/agent/recover-plan?mode=fetch_plan
         (Ollama when configured, else local fallback)
      → normalize + clamp plan (hard caps)
      → execute: fetch_source | skip_source | reset_circuit
      → return { results, plan, planner }
```

## Hard safety caps (never overridden by the AI plan)

| Cap | Value | Why |
|-----|-------|-----|
| `HARD_MAX_TOTAL_MS` | 30s | one route cannot stall the server |
| `HARD_MAX_RETRIES` | 4 | bounded retry fan-out |
| `HARD_MAX_CALLS` | 12 | bounded total upstream calls |
| `HARD_MAX_BACKOFF_MS` | 8s | bounded per-step wait |
| `checkApiBudget` | per-source | daily free-tier cap enforced regardless of plan |

The AI plan is **normalized and clamped** before execution: unknown
tools/sources are dropped, out-of-range values are clamped, and the
budget/circuit checks always run inside `executeFetchAction`. A bad plan
cannot runaway or bypass the daily cap.

## Deterministic fallback (always available)

When `OLLAMA_API_KEY` is unset, the plan request errors, or the AI plan
is invalid, `defaultPlan(sources)` runs each declared source once with 2
retries and 800ms backoff, skipping budget-blocked sources. This mirrors
the prior hardcoded behavior — routes keep working offline.

## Pilot: FX CFTC COT

`server/routes/fx.js` was the first route to opt in. Its COT, Frankfurter,
FRED, and IMF COFER sources all go through `runFetchPlan` — the agent
decides order/retries based on the live CFTC budget and any open circuit
on `publicreporting.cftc.gov`. REER / rate-differentials / DXY stay inline
because they derive composite shapes from partial FRED settlements (not
a single fetcher return). The `_sources.__fetchPlanner` field on the
response records whether the `ai` or `default` planner ran.

## Factory-level opt-in

`server/lib/routeFactory.js` (used by bonds, credit, commodities-legacy,
globalMacro, realEstate) accepts an optional `fetchSources(req)` config.
When present, the factory runs the declared sources through `runFetchPlan`
before calling `fetchDataFn(req, _errors, fetched)`. Routes that don't
declare `fetchSources` keep their existing inline behavior — no big-bang
rewrite. The response carries `_fetchPlanner: 'ai' | 'default'` when
orchestrated.

### Migration status

| Route | Status | Sources | Notes |
|-------|--------|---------|-------|
| `fx.js` | ✅ orchestrated | Frankfurter, FRED, CFTC Socrata, IMF COFER | REER/rate-diff/DXY inline (composite shapes) |
| `crypto.js` | ✅ orchestrated | CoinGecko, Alternative.me, DefiLlama, Mempool.space, Etherscan, Bybit | All 6 sources via `runFetchPlan` |
| `equities.js` | ✅ orchestrated | Frankfurter, Yahoo Finance | FX first (Yahoo depends on USD rates), then quote+index bundle |
| `routeFactory.js` | ✅ opt-in seam | — | `fetchSources` config wired; existing routes unchanged until they declare sources |
| Other routes | opt-in | — | Adopt when touching a route or when distinct upstream sources make it worthwhile |

## Adding a route

**Via the factory** (preferred for routes already using
`makeCachedRouteHandler`): declare `fetchSources` and read `fetched` in
your `fetchDataFn`:
```js
router.get('/', makeCachedRouteHandler({
  marketName: 'credit',
  cacheKey: 'credit_data',
  fetchSources: (req) => [
    { source: 'FRED', fetcher: () => fetchCreditSpreads() },
    { source: 'Yahoo Finance', fetcher: () => fetchCreditETFs() },
  ],
  fetchDataFn: async (req, _errors, fetched) => {
    const spreads = fetched?.results?.FRED ?? null;
    const etfs = fetched?.results?.['Yahoo Finance'] ?? null;
    return { spreads, etfs, lastUpdated: ... };
  },
}));
```

**Standalone** (for routes not on the factory, like `fx.js`):
```js
const { results, planner } = await runFetchPlan({
  sources: [{ source: 'CFTC Socrata', fetcher: () => fetchCOTHistory() }],
  _errors, baseUrl,
  useAi: !!process.env.OLLAMA_API_KEY,
});
const cotHistory = results['CFTC Socrata'] ?? null;
```

`_errors` is populated automatically on failure. Use the `planner` field
to surface `ai` vs `default` in `_sources` / `_fetchPlanner` if useful.

## Related

- `docs/RECOVERY_AGENT.md` — panel-level recovery (which market to refetch)
- `docs/HOUSEKEEP_AGENT.md` — offline test-gap advisor
- `KNOWN_LIMITATIONS.md` — rate-limit counters + opt-in hard-block env