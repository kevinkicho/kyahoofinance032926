# `<BentoCard>`

Canonical card wrapper for every panel that lives inside a `<BentoWrapper>` grid. Replaces the per-tab `<div className="X-bento-card">…</div>` boilerplate that used to be duplicated across 18 dashboards.

**Lives at:** `src/components/BentoCard/BentoCard.jsx`
**Companion CSS:** `src/components/BentoCard/BentoCard.css` (auto-imported)
**Card-base CSS:** `src/components/BentoWrapper.css` (provides `.bento-card { background, border, radius, … }` for every alias)

## Quick start

```jsx
import BentoCard from '../../../components/BentoCard/BentoCard';

<BentoWrapper layout={LAYOUT} storageKey="bonds-layout-v3">
  <BentoCard
    key="yield"                  // REQUIRED — also the layout `i`
    title="Yield Curve"
    subtitle="US Treasury · sovereign rates"
    accent="bonds"
    source="FRED / Yahoo Finance"
    timestamp={lastUpdated}
    isLive={isLive}
    isCurrent={isCurrent}
    fetchedOn={fetchedOn}
    fetchLog={fetchLog}
    error={error}
  >
    <YieldCurve {...} />
  </BentoCard>
</BentoWrapper>
```

The consumer passes `key="yield"` directly on the JSX call site (React's reserved key prop). `react-grid-layout` matches each layout slot's `i` to the child's React `key`. **Do not** pass `id` — there is no such prop.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `title` | string | required | Bold first line of the title row |
| `subtitle` | string | — | Second line in muted color (omitted if absent) |
| `accent` | string | — | Hover accent preset; one of the 18 tab IDs (see palette below) |
| `accentColor` | string | — | Raw CSS color escape hatch (overrides `accent`) |
| `source` | string | — | DataFooter passthrough |
| `timestamp` | string | — | DataFooter passthrough |
| `isLive` | boolean | — | DataFooter passthrough |
| `isCurrent` | boolean | — | DataFooter passthrough |
| `fetchedOn` | string | — | DataFooter passthrough |
| `fetchLog` | array | — | DataFooter passthrough |
| `error` | string | — | DataFooter passthrough |
| `bare` | boolean | `false` | Skip outer chrome entirely; render children alone |
| `titleActions` | ReactNode | — | Right-side slot in the title row (refresh button, badge, etc.) |
| `className` | string | `''` | Additional modifier classes appended to root |
| `contentClassName` | string | `''` | Additional classes for the content wrapper (e.g. tab-specific scroll/padding) |
| `noFooter` | boolean | `false` | Suppress `<DataFooter>` for panels that don't have provenance |
| `footer` | ReactNode | — | Custom footer JSX (overrides DataFooter and `noFooter`) |

## Accent palette

Set `accent="<id>"` to use one of the per-tab presets. Each maps to a CSS custom property `--bento-accent-color`, which the generic `:hover` rule applies as `border-color`. Adding a new tab = adding one line each in `BentoCard.jsx` (the `ACCENTS` set) and `BentoCard.css` (the `.bento-card--<id>` rule).

| accent | color |
| --- | --- |
| `bonds` | `#10b981` |
| `fx` | `#6366f1` |
| `equities` | `#3b82f6` |
| `derivatives` | `#f59e0b` |
| `realEstate` | `#14b8a6` |
| `insurance` | `#8b5cf6` |
| `commodities` | `#eab308` |
| `globalMacro` | `#06b6d4` |
| `equitiesDeepDive` | `#2563eb` |
| `crypto` | `#f97316` |
| `credit` | `#ef4444` |
| `sentiment` | `#a855f7` |
| `calendar` | `#84cc16` |
| `bls` | `#0ea5e9` |
| `eia` | `#d946ef` |
| `alerts` | `#f43f5e` |
| `watchlist` | `#22c55e` |
| `analytics` | `#94a3b8` |

For a one-off color, use `accentColor="#ff0000"` instead of adding a new accent. Use the palette only for tab-level conventions.

## Migration recipe (from per-tab `*-bento-card` divs)

**Before:**
```jsx
<div key="yield" className="bonds-bento-card">
  <div className="bonds-panel-title-row bento-panel-title-row">
    <span className="bonds-panel-title">Yield Curve</span>
    <span className="bonds-panel-subtitle">{countryCount} countries · sovereign rates</span>
  </div>
  <div className="bonds-panel-content bento-panel-content" onMouseDown={stopDrag}>
    <YieldCurve {...} />
  </div>
  <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive}
              fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
</div>
```

**After:**
```jsx
<BentoCard
  key="yield"
  title="Yield Curve"
  subtitle={`${countryCount} countries · sovereign rates`}
  accent="bonds"
  source="FRED / Yahoo Finance"
  timestamp={lastUpdated}
  isLive={isLive}
  isCurrent={isCurrent}
  fetchedOn={fetchedOn}
  fetchLog={fetchLog}
  error={error}
>
  <YieldCurve {...} />
</BentoCard>
```

LOC delta: ~12 → ~13 (similar length per panel) but **the structure is owned by the component**, not duplicated. Hover accent, drag handle wiring, footer contract, content drag-cancel are all centralized.

## Edge cases

**Card with side actions in title row** — pass via `titleActions`:
```jsx
<BentoCard
  key="watchlist"
  title="My Tickers"
  accent="watchlist"
  titleActions={<button onClick={addTicker}>+ Add</button>}
  ...
>
  ...
</BentoCard>
```

**Card without provenance** (sub-card already wrapped in another BentoCard) — `bare`:
```jsx
<BentoCard bare>
  <MarketKpiStrip kpis={items} />
</BentoCard>
```

**Card whose body needs an explicit DataFooter override or none at all:**
```jsx
<BentoCard key="alerts" title="Active Alerts" accent="alerts" noFooter>
  <ActiveAlerts {...} />
</BentoCard>
```

## Constraints (do not break)

- The root element must keep the class `bento-card` so the multi-selector base in `BentoWrapper.css` styles it. This is built in; don't override the className via `className`.
- The title row must keep the class `bento-panel-title-row` so `react-grid-layout`'s `draggableHandle` selector finds it. This is built in.
- The content wrapper must stop `mousedown` propagation so clicks inside the panel don't trigger drag. Built in.

These are the three points of contact with `BentoWrapper`; touching them breaks drag.

## Status

**Production.** As of 2026-05-03, **all 18 tabs use BentoCard for their default-view panels** (157 of 157 panels). Phases 1–6 of `docs/plans/bentocard-migration.md` are complete:

- Phase 1: BLS pilot (3 cards)
- Phase 2: alerts, watchlist, eia, calendar (19 cards)
- Phase 3: credit, sentiment, crypto, insurance (35 cards)
- Phase 4: commodities, derivatives, realEstate, equitiesDeepDive, globalMacro, bonds (64 cards) + 5 sub-component cases deferred
- Phase 5: fx, analytics, equities (20 cards) + 8 more sub-component cases deferred
- Phase 6: 13 deferred sub-component cards refactored, ~233 LOC of duplicate CSS removed

### Migration recipe (for future panels)

When adding a new panel:

1. Use `<BentoCard>` directly with the canonical `accent="<tab>"` prop. Don't add a per-tab `*-bento-card` class unless you need a tab-specific border accent.
2. Pass `title` (and optional `subtitle`) as props — never as a `<div className="X-panel-title-row">` child.
3. If your panel embeds a sub-component that needs its own title (DetailPanel, InsiderTrading, etc.), the sub-component should return JUST its content. Title and footer come from the parent's `<BentoCard>`.
4. If the panel needs a custom footer (refresh button, action toolbar), use the `footer` prop with arbitrary JSX. If the panel has no provenance, use `noFooter`.
5. Drag handles and drag-cancel are built-in. Don't add `onMouseDown` handlers.

### Two cards remain `bare`-ish for special reasons

- `equities` tab — sub-tab-driven views (Heatmap, BarRace, ListView, DataHubView, ML Explorer, Portfolio, Radar) are full-frame replacements that don't fit the bento grid. They're rendered as raw `<div className="eq-bento-card">` because they own their entire frame including chrome. Migrating them would require splitting each view into a "content" and "frame" component, which is out of scope.
- `fx.carry` — uses `--carry` modifier class for a special wider layout. Now wraps content in BentoCard but retains the modifier class via `className=`.
