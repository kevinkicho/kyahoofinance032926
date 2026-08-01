# Panel recovery agent

Runtime recovery for incomplete / empty panels. **Not** a hard-coded retry behavior tree: each cycle builds a fresh observation, asks a planner for the next actions, then executes a small tool surface under budgets.

## Flow

```text
Wave complete (or user ▶ / splash Repair / toolbar ✧)
        │
        ▼
 buildRecoveryObservation(markets)   ← fetch-gate only, no secrets
        │
        ▼
 POST /api/agent/recover-plan        ← Ollama when OLLAMA_API_KEY set
   or local observation-scored plan  ← always available
        │
        ▼
 execute tools:
   refetch_market | refetch_deps | wait | evaluate | noop
        │
        ▼
 re-observe → up to maxCycles
```

## Tools

| Tool | Effect |
|------|--------|
| `refetch_market` | Single market via existing `fetchMarket` / soft-apply |
| `refetch_deps` | Batch satellite ids (prefer `forceLive: false`) |
| `wait` | Backoff (rate limits / cold starts) |
| `evaluate` | Re-observe only |
| `noop` / `stop` | End cycle |

## Guardrails

- Max cycles, max fetches / cycle, max force-live per market
- Never blank good data (`applyResult` preserves prior payload)
- No full-wave force-live from the agent (mass ▶ still user-initiated)
- Display/confirm-only failures should not trigger API storms
- Observation sanitizes secret-looking keys; browser never holds `OLLAMA_API_KEY`

## Configuration

| Env | Role |
|-----|------|
| `OLLAMA_API_KEY` | Server-side cloud planner (`.env`) |
| `OLLAMA_MODEL` | Optional model override (default `gpt-oss:120b`) |
| `OLLAMA_HOST` | Default `https://ollama.com` |

Client always falls back to the local scorer if the proxy is down or the key is missing.

## UI

- **Splash:** `Repair incomplete (N)` when F/D/C shows red chips
- **Toolbar ✧:** targeted recovery without mass ▶
- **Mass ▶:** full force-live wave; recovery agent still runs after the wave

## Code map

| Path | Role |
|------|------|
| `src/hub/lib/recoveryObservation.js` | Secret-free observation |
| `src/hub/lib/recoveryAgent.js` | Plan request + execute loop |
| `src/hub/DataProvider.jsx` | Post-wave + `recoverPanels` |
| `server/routes/agentRecover.js` | `POST /api/agent/recover-plan` |
| `src/__tests__/regression/recoveryAgent.test.js` | Unit tests |

## Related

- Offline analysis: `docs/HOUSEKEEP_AGENT.md` / `npm run housekeep`
- Health gates: `docs/TEST_HEALTH_SUITE.md`
