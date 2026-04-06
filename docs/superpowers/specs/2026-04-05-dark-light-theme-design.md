# Dark/Light Theme Toggle — Design Spec

**Date:** 2026-04-05
**Type:** App-level feature

---

## Goal

Add a dark/light theme toggle to the Global Market Hub. The app is currently hardcoded to dark mode with ~355 hex colors across 36 CSS files and ~357 hardcoded colors in 46 JSX files (ECharts chart options). Convert to CSS custom properties for CSS, and a React context for ECharts JS colors.

---

## Architecture

### Theme Data Attribute

Set `data-theme="dark"` or `data-theme="light"` on `<html>`. CSS variables respond to this attribute. Default: `dark` (current look).

### CSS Custom Properties

Define in `src/index.css`:

```css
:root, [data-theme="dark"] {
  --bg-deep:       #0a0f1a;
  --bg-primary:    #0f172a;
  --bg-card:       #1e293b;
  --text-bright:   #f8fafc;
  --text-primary:  #e2e8f0;
  --text-secondary:#94a3b8;
  --text-muted:    #64748b;
  --text-dim:      #475569;
  --border-color:  #334155;
  --border-subtle: #1e293b;
  --tooltip-bg:    #1e293b;
  --tooltip-border:#334155;
}

[data-theme="light"] {
  --bg-deep:       #f8fafc;
  --bg-primary:    #ffffff;
  --bg-card:       #f1f5f9;
  --text-bright:   #0f172a;
  --text-primary:  #1e293b;
  --text-secondary:#64748b;
  --text-muted:    #94a3b8;
  --text-dim:      #cbd5e1;
  --border-color:  #e2e8f0;
  --border-subtle: #f1f5f9;
  --tooltip-bg:    #ffffff;
  --tooltip-border:#e2e8f0;
}
```

### Color Mapping (CSS files)

| Hardcoded hex | CSS variable |
|---|---|
| `#0a0f1a`, `#0d1117`, `#111827` | `var(--bg-deep)` |
| `#0f172a` | `var(--bg-primary)` |
| `#1e293b` (as background) | `var(--bg-card)` |
| `#1e293b` (as border) | `var(--border-subtle)` |
| `#f8fafc` | `var(--text-bright)` |
| `#e2e8f0`, `#f1f5f9` (as text) | `var(--text-primary)` |
| `#e2e8f0` (as border) | `var(--border-color)` |
| `#94a3b8`, `#9ca3af` | `var(--text-secondary)` |
| `#64748b`, `#6b7280` | `var(--text-muted)` |
| `#475569` | `var(--text-dim)` |
| `#334155` | `var(--border-color)` |
| `#1f2937` | `var(--border-subtle)` |

**Not changed:** Market accent colors (`#f59e0b`, `#10b981`, `#f43f5e`, `#a78bfa`, etc.), green/red signal colors (`#22c55e`, `#ef4444`), blue accent (`#3b82f6`). These work in both themes.

### Theme Context (for ECharts)

New file `src/hub/ThemeContext.jsx`:

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const DARK_COLORS = {
  bg: '#0f172a', cardBg: '#1e293b', text: '#e2e8f0',
  textSecondary: '#94a3b8', textMuted: '#64748b', textDim: '#475569',
  border: '#334155', tooltipBg: '#1e293b', tooltipBorder: '#334155',
};

const LIGHT_COLORS = {
  bg: '#ffffff', cardBg: '#f1f5f9', text: '#1e293b',
  textSecondary: '#64748b', textMuted: '#94a3b8', textDim: '#cbd5e1',
  border: '#e2e8f0', tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0',
};

const ThemeContext = createContext({ theme: 'dark', colors: DARK_COLORS, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('hub-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hub-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const colors = theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return <ThemeContext.Provider value={{ theme, colors, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { return useContext(ThemeContext); }
```

### Toggle Button

Add a sun/moon toggle in `MarketTabBar.jsx`, right side (next to currency picker):

```jsx
const { theme, toggle } = useTheme();
// ...
<button className="hub-theme-toggle" onClick={toggle} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
  {theme === 'dark' ? '☀️' : '🌙'}
</button>
```

### ECharts Chart Updates

Each chart component that builds ECharts options needs to:
1. Call `const { colors } = useTheme();` 
2. Replace hardcoded hex values in option objects with `colors.xxx`

Common patterns to replace:
- `backgroundColor: '#1e293b'` → `backgroundColor: colors.cardBg`
- `backgroundColor: 'transparent'` → keep as-is
- `textStyle: { color: '#e2e8f0' }` → `textStyle: { color: colors.text }`
- `borderColor: '#334155'` → `borderColor: colors.border`
- `axisLabel: { color: '#64748b' }` → `axisLabel: { color: colors.textMuted }`
- `splitLine: { lineStyle: { color: '#1e293b' } }` → `splitLine: { lineStyle: { color: colors.cardBg } }`
- Tooltip `backgroundColor`/`borderColor`/`textStyle.color` → use `colors.tooltipBg`, `colors.tooltipBorder`, `colors.text`

Market accent colors in chart series (line colors, bar colors) stay hardcoded — they're the same in both themes.

---

## Files Modified

### Infrastructure (3 files)
- `src/index.css` — replace `:root` with theme variables
- `src/hub/ThemeContext.jsx` — NEW: context + provider + hook
- `src/App.jsx` — wrap with `ThemeProvider`

### Toggle UI (2 files)
- `src/hub/MarketTabBar.jsx` — add toggle button
- `src/hub/MarketTabBar.css` — toggle button styles

### CSS Refactoring (36 files)
Replace hardcoded hex colors with CSS variables in all CSS files listed in the color mapping above.

### ECharts Chart Updates (~30+ JSX files with chart options)
Add `useTheme()` import and replace hardcoded colors in ECharts option objects. The components with the most chart color references:

**High (10+ refs):** SectorRotation, ShortInterest, CentralBankRates, DebtMonitor, GrowthInflation, HeatmapView, CycleIndicators, DefaultWatch, AffordabilityMap
**Medium (5-9 refs):** VolSurface, VIXTermStructure, DXYTracker, SpreadMonitor, YieldCurve, FuturesCurve, SupplyDemand, IgHyDashboard, EmBonds, BarRaceView, FactorRankings, EarningsWatch, FearGreed, CftcPositioning, ReserveAdequacy, CombinedRatioMonitor, LoanMarket
**Low (1-4 refs):** BreakevenMonitor, OnChainMetrics, CotPositioning, DefiChains, FundingAndPositioning, CoinMarketOverview, PriceIndex, CapRateMonitor, CrossAssetReturns

---

## Task Batching Strategy

Given the volume (~80 files), batch by logical group:
1. Infrastructure: ThemeContext, CSS variables, App wrapper, toggle button
2. CSS batch 1: Hub shell + shared components (~15 CSS files)
3. CSS batch 2: All 13 market CSS files + component CSS files (~25 CSS files)
4. ECharts batch 1: Bonds, Derivatives, FX, Crypto components
5. ECharts batch 2: Commodities, GlobalMacro, RealEstate, Equities components
6. ECharts batch 3: Credit, Sentiment, Calendar, Insurance + shared components

---

## Tests

No new test files needed. Existing hook tests should continue passing since theme changes are CSS/visual only. The ThemeContext is simple enough to not need dedicated tests — it's a thin wrapper around useState + localStorage.

---

## Performance Notes

- CSS custom properties are resolved by the browser at paint time — no JS overhead
- Theme toggle triggers a single `data-theme` attribute change; CSS cascade handles the rest
- ECharts components re-render on theme change via context — same as any state change
- localStorage read is synchronous and only happens once on mount
