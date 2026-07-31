# `<BentoCard>`

Card wrapper for panels inside `<BentoWrapper>`.

**Source:** `src/components/BentoCard/BentoCard.jsx`  
**CSS:** `src/components/BentoCard/BentoCard.css`  
**Base styles:** `src/components/BentoWrapper.css` (`.bento-card`)

## Quick start

```jsx
import BentoCard from '../../../components/BentoCard/BentoCard';

<BentoWrapper layout={LAYOUT} storageKey="bonds-layout-v3">
  <BentoCard
    key="yield"
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

Pass React `key` matching layout `i`. Do not pass a separate `id` prop.

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `title` | string | required | Title row first line |
| `subtitle` | string | — | Muted second line |
| `accent` | string | — | Tab accent preset |
| `accentColor` | string | — | Overrides `accent` |
| `source` / `timestamp` / `isLive` / `isCurrent` / `fetchedOn` / `fetchLog` / `error` | — | — | DataFooter |
| `bare` | boolean | `false` | Children only, no chrome |
| `titleActions` | ReactNode | — | Right-side title slot |
| `className` / `contentClassName` | string | `''` | Extra classes |
| `noFooter` | boolean | `false` | Hide DataFooter |
| `footer` | ReactNode | — | Custom footer |

## Accent palette

Set `accent="<tabId>"`. Presets live in `BentoCard.jsx` / `BentoCard.css`
(`.bento-card--<id>`). One-off color: `accentColor="#ff0000"`.

## Patterns

**Title actions:**

```jsx
<BentoCard key="watchlist" title="My Tickers" accent="watchlist"
  titleActions={<button onClick={addTicker}>+ Add</button>} …>
  …
</BentoCard>
```

**No provenance:** `noFooter` or `bare` for nested chrome-free content.

## Constraints (do not break)

- Root class `bento-card` (BentoWrapper base styles).
- Title row class `bento-panel-title-row` (drag handle).
- Content stops `mousedown` propagation (drag cancel).

## New panels

1. Use `<BentoCard accent="<tab>">` — avoid per-tab wrapper classes unless needed.
2. Pass `title` / `subtitle` as props, not custom title-row markup.
3. Subcomponents return body only; chrome stays on BentoCard.
4. Custom actions → `footer` or `titleActions`; no provenance → `noFooter`.
5. Drag is built in — do not add competing `onMouseDown` handlers.

**Exceptions:** equities multi-view modes (heatmap/list/etc.) own their own frame;
`fx.carry` may keep a layout modifier via `className`.
