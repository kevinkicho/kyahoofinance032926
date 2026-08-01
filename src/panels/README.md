# Independent panel modules

Panels are **first-class modules**, not blocks trapped inside a tab file.

## Model

```text
src/panels/
  definePanel.js
  PanelSlot.jsx           # BentoCard chrome around a panel Body
  MarketPanelGrid.jsx     # compose all panels for a market
  registry.js             # every MARKET_PANELS entry
  manifest.js             # key → module path (traceability)
  <marketId>/*.jsx        # one file per panel
  <marketId>/index.js     # pack export

Market tab (composition only):
  *Dashboard.jsx / *Market.jsx
    → layout + data bag (panelCtx with __render / __live / …)
    → <MarketPanelGrid marketId="…" layout={…} ctx={panelCtx} />
```

## Why

| Old | New |
|-----|-----|
| 20 BentoCards inlined in one 800-line dashboard | One file per panel under `src/panels/` |
| Hard to find `bonds:foreign-holders` | Key → `src/panels/bonds/foreign-holders.jsx` |
| Not reusable across tabs | `markets: ['bonds', 'globalMacro']` |
| Health / dropdown catalogs desync | Same `panelId` in module, MARKET_PANELS, placeholders |

## Bridge vs hand-written Body

Scaffolded modules prefer `ctx.__render(panelId)` so dashboards can keep
existing body UI during migration without blank panels. Hand-written modules
(e.g. `bonds/yield.jsx`) own their Body and ignore `__render`.

```js
// tab
const panelCtx = {
  bonds: { yieldCurveData, … },
  __render: (id) => bodies[id] ?? null,
  __live: { kpi: true, … },
  __subtitle: { … },
};
```

## Scaffold / manifest

```bash
node scripts/scaffold-all-market-panels.mjs   # create/update bridge modules
node scripts/gen-panel-manifest.mjs           # refresh manifest.js
```

## Local dev (panels need API)

```bash
npm run dev          # Express + Vite (reuses healthy API on 3001 if present)
# or
npm run server       # terminal 1
npm run dev:vite     # terminal 2
```

If panels never leave WAITING/empty: check `http://127.0.0.1:3001/api/health`.
`scripts/start.js` reuses a healthy process when the port is already taken.

## Compose

```jsx
import MarketPanelGrid from '../../panels/MarketPanelGrid';

<MarketPanelGrid
  marketId="bonds"
  layout={LAYOUT}
  storageKey="bonds-layout-v9"
  accent="bonds"
  ctx={panelCtx}
  provenance={{ timestamp, isCurrent, fetchedOn, fetchLog, error }}
/>
```

See `docs/PANEL_MODULES.md`.
