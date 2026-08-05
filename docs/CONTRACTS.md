# Market contracts

**Last reviewed: 2026-08-04.**

Contracts describe what a market bag *must* contain, which panels bind to which
fields, and which keys belong in a progressive **digest**.

## Layout

| Path | Role |
|------|------|
| `shared/contracts/equities.v1.json` | Hand-authored (explicit) |
| `shared/contracts/bonds.v1.json` | Hand-authored (explicit) |
| `shared/contracts/buildContracts.js` | Auto-build + `slicePanelPayload` |
| `shared/contracts/index.js` | Merged registry + validation |

Auto contracts are built from:

1. `shared/api-routing.json` — primary path + deps  
2. `src/data/panelFieldMap.js` — panel → field bindings  

Explicit JSON **wins** over auto for the same `marketId`.

## Client / server usage

| API | Purpose |
|-----|---------|
| `getMarketContract(id)` | Read contract |
| `validateAgainstContract(id, data)` | Shallow required-field check |
| `extractContractDigestFields(id, data)` | KPI slice for digests |
| `slicePanelPayload(market, panel, data, fieldMap)` | One-panel field bag |
| `GET /api/panel/:marketId/:panelId` | Cached slim panel slice |
| `GET /api/cache/digest/:marketId` | Firestore/disk digest KPI |
| `usePanelSlice` + `PanelSlot` | Progressive ctx `__slice` when bag empty |
| `createBridgePanel` | Falls back to `ProgressiveSlicePreview` |
| `placeholdersFromFieldMap` | Auto fetch-gate slots from field map |

## Adding a market

1. Ensure `api-routing.json` has `primary` + `deps`.  
2. Add panel field map entries for each panel.  
3. Optionally author `shared/contracts/{id}.v1.json` and register in `EXPLICIT_CONTRACTS`.  
4. Run `npm test -- src/__tests__/contracts.test.js`.

## Design rules

- Digests never include multi-year series (`role: "series"` skipped).  
- Full bags stay on disk/GCS; contracts only describe them.  
- Cross-market panels list deps; slice API can hydrate deps from their caches.

## Progressive UI

| Layer | Behavior |
|-------|----------|
| `GET /api/panel/:m/:p` | Slim field slice from disk cache |
| `PanelSlot` + `usePanelSlice` | Injects `__slice` while bag loading |
| `ProgressiveSlicePreview` | Renders KPI grids / quote tables from slice |
| `DigestKpiBar` | Market-level digest KPIs under tab bar |
| Prefetch | Active tab panel slices warmed on switch |

## Staged warm

```bash
# Full staged warm (default)
npm run postdeploy:warm

# Core only (deps + equities/bonds/fx/credit)
WARM_STAGE=1 npm run postdeploy:warm
```

Server boot warm order: **deps → core tabs → remaining tabs**.
