# Independent panels (not tab-owned)

## Goal

Panels should be **independent products**:

- Own file under `src/panels/`
- Own id (`marketId:panelId` or multi-market key)
- Own Body UI and live/disabled rules
- **Reusable** on any tab that lists them in `markets: []`
- **Traceable** from dropdown → module path in one hop

Tabs become **composition roots** only: grid layout + data bag + `<PanelSlot />`.

## Layout

```text
src/panels/
  definePanel.js
  PanelSlot.jsx
  MarketPanelGrid.jsx  # compose all panels for a market
  registry.js          # every MARKET_PANELS entry registered
  manifest.js          # traceability: key → module path
  bonds/*.jsx          # hand-written + bridge modules
  equities/*.jsx       # …one pack per market tab
  …

src/markets/<market>/…Dashboard.jsx   # composition root only
```

Scaffold: `node scripts/scaffold-all-market-panels.mjs`  
Manifest: `node scripts/gen-panel-manifest.mjs`

## Contract

| Field | Purpose |
|-------|---------|
| `key` | Canonical `bonds:yield` |
| `panelId` | Grid key / `data-panel-key` |
| `markets` | Tabs allowed to mount this panel |
| `Body` | React body (no Bento chrome) |
| `isLive` / `getSubtitle` | Pure functions of `ctx` |

Parent always:

```jsx
<PanelSlot key={panel.panelId} panel={panel} accent="bonds" ctx={panelCtx} … />
```

(`key` must be on `PanelSlot`, not buried inside, so `BentoWrapper` matches layout.)

## Reuse example

ECB rates panel:

```js
markets: ['bonds', 'globalMacro'],
```

Both dashboards import the same module; only accent/provenance differ.

## Composition (current state)

Every market dashboard mounts panels via:

```jsx
<MarketPanelGrid marketId="fx" layout={LAYOUT} storageKey="…" accent="fx" ctx={panelCtx} provenance={…} />
```

`panelCtx` supplies:

| Field | Purpose |
|-------|---------|
| `__render(panelId)` | Body JSX (migration bridge; hand-written Bodies ignore this) |
| `__live` / `__subtitle` / `__disabled` | Footer + chrome flags for bridge modules |
| `__noFooter` / `__source` | Optional chrome overrides |
| domain bags | e.g. `ctx.bonds`, `ctx.ecb` for hand-written Bodies |

## Migration policy

1. New panels → always `src/panels/…` + register + MARKET_PANELS.
2. Bridge modules (`ctx.__render`) are valid; move body into the module when touching that panel.
3. Dashboards must not own BentoCard chrome for catalog panels — only layout + data + `__render`.

## Health & catalogs

Keep in the same PR when panel id or data shape changes:

- `src/data/marketPanels.js`
- `src/data/panelPlaceholders.js`
- panel module
- dashboard composition
