# Dark/Light Theme Toggle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dark/light theme toggle to the Global Market Hub, converting ~700 hardcoded hex colors across ~80 files to theme-aware CSS variables and React context colors.

**Architecture:** CSS custom properties on `:root` / `[data-theme="light"]` handle all CSS-based colors. A React `ThemeContext` provides a `colors` object for ECharts chart option builders. A toggle button in MarketTabBar persists preference to localStorage.

**Tech Stack:** React 18 Context API, CSS custom properties, localStorage, ECharts (echarts-for-react)

---

## Global Color Mapping

This mapping is referenced by all tasks. When replacing colors, use context to determine which variable fits:

| Hardcoded | As background | As border | As text |
|---|---|---|---|
| `#0a0f1a`, `#0d1117`, `#111827` | `var(--bg-deep)` / `colors.bgDeep` | — | — |
| `#0f172a` | `var(--bg-primary)` / `colors.bg` | — | — |
| `#1e293b` | `var(--bg-card)` / `colors.cardBg` | `var(--border-subtle)` / `colors.cardBg` | — |
| `#1f2937` | — | `var(--border-subtle)` | — |
| `#f8fafc` | — | — | `var(--text-bright)` |
| `#e2e8f0`, `#f1f5f9` | — | `var(--border-color)` | `var(--text-primary)` / `colors.text` |
| `#94a3b8`, `#9ca3af` | — | — | `var(--text-secondary)` / `colors.textSecondary` |
| `#64748b`, `#6b7280` | — | — | `var(--text-muted)` / `colors.textMuted` |
| `#475569` | — | — | `var(--text-dim)` / `colors.textDim` |
| `#334155` | — | `var(--border-color)` / `colors.border` | — |

**Never change:** accent colors (`#f59e0b`, `#10b981`, `#a78bfa`, `#f43f5e`, `#ca8a04`, `#0ea5e9`, `#14b8a6`, `#6366f1`, `#06b6d4`, `#7c3aed`, `#f97316`, `#3b82f6`), signal colors (`#22c55e`, `#ef4444`, `#10b981` as green, `#ef4444` as red), or transparent backgrounds.

---

### Task 1: Theme Infrastructure

**Files:**
- Modify: `src/index.css`
- Create: `src/hub/ThemeContext.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Replace `:root` in index.css with theme variables**

In `src/index.css`, replace the existing `:root` block (lines 1-10) with:

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
  --accent-color:  #3b82f6;
  --color-green:   #22c55e;
  --color-red:     #ef4444;
  --sidebar-width: 300px;
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
  --accent-color:  #3b82f6;
  --color-green:   #16a34a;
  --color-red:     #dc2626;
  --sidebar-width: 300px;
}
```

Also replace the hardcoded colors in `body` and `.hub-layout` in the same file:
- `body { background-color: var(--bg-primary); color: var(--text-primary); }` (already uses var for bg)
- `.hub-layout { background: var(--bg-deep); }` (currently `#0a0f1a`)
- `.market-placeholder { color: var(--text-dim); }` (currently `#334155`)
- `.market-placeholder-title { color: var(--text-dim); }` (currently `#475569`)
- `.market-placeholder-desc { color: var(--text-dim); }` (currently `#334155`)
- `.tooltip-title { color: var(--text-primary); }` (currently `#333`)

- [ ] **Step 2: Create ThemeContext.jsx**

Create `src/hub/ThemeContext.jsx`:

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const DARK = {
  bg: '#0f172a', bgDeep: '#0a0f1a', cardBg: '#1e293b',
  text: '#e2e8f0', textSecondary: '#94a3b8', textMuted: '#64748b', textDim: '#475569',
  border: '#334155', borderSubtle: '#1e293b',
  tooltipBg: '#1e293b', tooltipBorder: '#334155',
};

const LIGHT = {
  bg: '#ffffff', bgDeep: '#f8fafc', cardBg: '#f1f5f9',
  text: '#1e293b', textSecondary: '#64748b', textMuted: '#94a3b8', textDim: '#cbd5e1',
  border: '#e2e8f0', borderSubtle: '#f1f5f9',
  tooltipBg: '#ffffff', tooltipBorder: '#e2e8f0',
};

const ThemeContext = createContext({ theme: 'dark', colors: DARK, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('hub-theme') || 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('hub-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const colors = theme === 'dark' ? DARK : LIGHT;

  return (
    <ThemeContext.Provider value={{ theme, colors, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() { return useContext(ThemeContext); }
```

- [ ] **Step 3: Wrap App with ThemeProvider**

Replace `src/App.jsx` with:

```jsx
// src/App.jsx
import React from 'react';
import './index.css';
import { ThemeProvider } from './hub/ThemeContext';
import HubLayout from './hub/HubLayout';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '40px', color: '#f87171', fontFamily: 'monospace', background: 'var(--bg-primary)', minHeight: '100vh' }}>
          <h2 style={{ marginBottom: 12 }}>Something went wrong</h2>
          <pre style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: 'var(--text-secondary)' }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 20, padding: '8px 16px', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 6, cursor: 'pointer' }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <HubLayout />
      </ErrorBoundary>
    </ThemeProvider>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass (no behavioral changes).

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/hub/ThemeContext.jsx src/App.jsx
git commit -m "feat(theme): add ThemeContext, CSS variables, ThemeProvider wrapper"
```

---

### Task 2: Toggle Button in MarketTabBar

**Files:**
- Modify: `src/hub/MarketTabBar.jsx`
- Modify: `src/hub/MarketTabBar.css`

- [ ] **Step 1: Add toggle button to MarketTabBar.jsx**

Replace `src/hub/MarketTabBar.jsx` with:

```jsx
import React from 'react';
import { MARKETS } from './markets.config';
import { currencySymbols } from '../utils/constants';
import { useTheme } from './ThemeContext';
import './MarketTabBar.css';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'HKD', 'INR', 'CAD', 'AUD', 'BRL'];

export default function MarketTabBar({ activeMarket, setActiveMarket, currency, setCurrency }) {
  const { theme, toggle } = useTheme();

  return (
    <div className="market-tab-bar">
      <nav className="market-tabs">
        {MARKETS.map(m => (
          <button
            key={m.id}
            className={`market-tab${activeMarket === m.id ? ' active' : ''}`}
            onClick={() => setActiveMarket(m.id)}
          >
            <span className="market-tab-icon">{m.icon}</span>
            <span className="market-tab-label">{m.label}</span>
          </button>
        ))}
      </nav>
      <button
        className="hub-theme-toggle"
        onClick={toggle}
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
      </button>
      <div className="hub-currency-picker">
        <label className="hub-currency-label">Currency</label>
        <select
          className="hub-currency-select"
          value={currency}
          onChange={e => setCurrency(e.target.value)}
        >
          {CURRENCIES.map(c => (
            <option key={c} value={c}>{currencySymbols[c] || c} {c}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add toggle button styles and convert MarketTabBar.css to variables**

Replace `src/hub/MarketTabBar.css` with:

```css
.market-tab-bar {
  display: flex;
  align-items: center;
  background: var(--bg-deep);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0 16px;
  height: 44px;
  flex-shrink: 0;
  z-index: 10;
}
.market-tabs {
  display: flex;
  align-items: stretch;
  height: 100%;
  flex: 1;
  gap: 0;
}
.market-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
}
.market-tab:hover { color: var(--text-secondary); }
.market-tab.active { color: var(--text-primary); border-bottom-color: #3b82f6; }
.market-tab-icon { font-size: 14px; line-height: 1; }
.hub-theme-toggle {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  cursor: pointer;
  color: var(--text-secondary);
  margin-left: 8px;
  transition: background 0.15s, border-color 0.15s;
  line-height: 1;
}
.hub-theme-toggle:hover { background: var(--bg-card); border-color: var(--text-muted); }
.hub-currency-picker { display: flex; align-items: center; gap: 6px; margin-left: 8px; }
.hub-currency-label { color: var(--text-dim); font-size: 11px; font-weight: 500; }
.hub-currency-select {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 11px;
  padding: 3px 6px;
  cursor: pointer;
  outline: none;
}
.hub-currency-select:focus { border-color: #3b82f6; }
```

- [ ] **Step 3: Convert HubFooter.css to variables**

Replace `src/hub/HubFooter.css` with:

```css
.hub-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 6px 16px;
  background: var(--bg-deep);
  border-top: 1px solid var(--border-subtle);
  font-size: 11px;
  color: var(--text-muted);
}

.hub-footer-time {
  color: var(--text-secondary);
  white-space: nowrap;
}

.hub-footer-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.hub-badge {
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
}

.hub-badge-fresh {
  background: #064e3b;
  color: #6ee7b7;
  border: 1px solid #065f46;
}

.hub-badge-stale {
  background: #78350f;
  color: #fcd34d;
  border: 1px solid #92400e;
}

.hub-badge-none {
  background: var(--bg-card);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/hub/MarketTabBar.jsx src/hub/MarketTabBar.css src/hub/HubFooter.css
git commit -m "feat(theme): add toggle button in MarketTabBar, convert hub CSS to variables"
```

---

### Task 3: CSS Refactoring — All 13 Market Shell CSS Files

**Files:** All `*Market.css` files in `src/markets/*/`

For each file listed below, read it and replace every hardcoded hex color that appears in the Global Color Mapping table with the corresponding CSS variable. Do NOT change accent colors, green/red signal colors, or `transparent`.

**The mapping rules (applied to CSS `background`, `border`, `color` properties):**
- `#0f172a` as background → `var(--bg-primary)` ; as text color in `.crypto-th` sticky bg → `var(--bg-primary)`
- `#0a0f1a` / `#0d1117` / `#111827` as background → `var(--bg-deep)`
- `#1e293b` as background → `var(--bg-card)` ; as border-color → `var(--border-subtle)` ; as gap/separator → `var(--border-subtle)`
- `#1f2937` as border → `var(--border-subtle)`
- `#e2e8f0` / `#f1f5f9` as text color → `var(--text-primary)` ; as border → `var(--border-color)`
- `#f8fafc` as text → `var(--text-bright)`
- `#94a3b8` / `#9ca3af` as text → `var(--text-secondary)`
- `#64748b` / `#6b7280` as text → `var(--text-muted)`
- `#475569` as text → `var(--text-dim)`
- `#334155` as border → `var(--border-color)` ; as background → `var(--border-color)`

**Files to process (13 market shells):**
1. `src/markets/bonds/BondsMarket.css`
2. `src/markets/fx/FXMarket.css`
3. `src/markets/derivatives/DerivativesMarket.css`
4. `src/markets/realEstate/RealEstateMarket.css`
5. `src/markets/insurance/InsuranceMarket.css`
6. `src/markets/commodities/CommoditiesMarket.css`
7. `src/markets/globalMacro/GlobalMacroMarket.css`
8. `src/markets/equitiesDeepDive/EquitiesDeepDiveMarket.css`
9. `src/markets/crypto/CryptoMarket.css`
10. `src/markets/credit/CreditMarket.css`
11. `src/markets/sentiment/SentimentMarket.css`
12. `src/markets/calendar/CalendarMarket.css`

Note: There is no `EquitiesMarket.css` — the equities market uses shared components.

- [ ] **Step 1: Read each file, apply the mapping, write back**

For each of the 12 files, read the file, apply all color replacements per the mapping, and write the updated content. Work through each file one at a time.

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/*/\*Market.css
git commit -m "feat(theme): convert all 12 market shell CSS files to CSS variables"
```

---

### Task 4: CSS Refactoring — All Market Component CSS Files

**Files:** All component CSS files inside `src/markets/*/components/`

Apply the same mapping rules from Task 3 to these files:

1. `src/markets/bonds/components/BondsComponents.css`
2. `src/markets/fx/components/FXComponents.css`
3. `src/markets/fx/components/RateMatrix.css`
4. `src/markets/derivatives/components/DerivComponents.css`
5. `src/markets/realEstate/components/REComponents.css`
6. `src/markets/insurance/components/InsComponents.css`
7. `src/markets/commodities/components/CommodComponents.css`
8. `src/markets/globalMacro/components/MacroComponents.css`
9. `src/markets/equitiesDeepDive/components/EquityComponents.css`
10. `src/markets/crypto/components/CryptoComponents.css`
11. `src/markets/credit/components/CreditComponents.css`
12. `src/markets/sentiment/components/SentimentComponents.css`
13. `src/markets/calendar/components/CalendarComponents.css`

- [ ] **Step 1: Read each file, apply the mapping, write back**

For each of the 13 files, read it and replace hardcoded hex colors per the Global Color Mapping. These are larger files with more occurrences — be thorough.

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/*/components/*.css
git commit -m "feat(theme): convert all 13 market component CSS files to CSS variables"
```

---

### Task 5: CSS Refactoring — Shared Component CSS Files

**Files:** CSS files in `src/components/*/`

Apply the same mapping rules to these shared component files:

1. `src/components/Header/Header.css`
2. `src/components/ListView/ListView.css`
3. `src/components/DetailPanel/DetailPanel.css`
4. `src/components/DataHub/DataHub.css`
5. `src/components/TimeBar/TimeBar.css`
6. `src/components/TimeTravel/TimeTravel.css`
7. `src/components/PortfolioView/PortfolioView.css`
8. `src/components/RadarView/RadarView.css`
9. `src/components/ModelExplorer/ModelExplorer.css`
10. `src/components/Sidebar/Sidebar.css`
11. `src/components/Sidebar/ScenarioController.css`
12. `src/components/Sidebar/CountryMacro.css`

- [ ] **Step 1: Read each file, apply the mapping, write back**

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/*/*.css
git commit -m "feat(theme): convert all shared component CSS files to CSS variables"
```

---

### Task 6: ECharts Theme — Bonds, Derivatives, FX Charts

**Files:** JSX components that build ECharts options in bonds, derivatives, and fx markets.

For each file below:
1. Add `import { useTheme } from '../../../hub/ThemeContext';` at the top (adjust path depth as needed — bonds/derivatives/fx components are at `src/markets/X/components/Y.jsx`, so the import path is `'../../../hub/ThemeContext'`)
2. Inside the default export function component, add `const { colors } = useTheme();` as the first line
3. Pass `colors` as a parameter to any chart option builder function calls
4. In the chart builder functions, add `colors` as a parameter and replace hardcoded hex colors:
   - `'#1e293b'` (as bg/split) → `colors.cardBg`
   - `'#e2e8f0'` (text) → `colors.text`
   - `'#94a3b8'` (text) → `colors.textSecondary`
   - `'#64748b'` (axis labels) → `colors.textMuted`
   - `'#475569'` (dim text) → `colors.textDim`
   - `'#334155'` (borders/lines) → `colors.border`
   - `'#0f172a'` (bg) → `colors.bg`
   - tooltip `backgroundColor: '#1e293b'` → `backgroundColor: colors.tooltipBg`
   - tooltip `borderColor: '#334155'` → `borderColor: colors.tooltipBorder`
   - tooltip `textStyle: { color: '#e2e8f0' }` → `textStyle: { color: colors.text }`
   - `'transparent'` → keep as `'transparent'`
   - Accent/series colors (greens, reds, purples, blues used for data) → keep hardcoded

**Files:**
1. `src/markets/bonds/components/YieldCurve.jsx`
2. `src/markets/bonds/components/SpreadMonitor.jsx`
3. `src/markets/bonds/components/DurationLadder.jsx`
4. `src/markets/bonds/components/BreakevenMonitor.jsx`
5. `src/markets/derivatives/components/VolSurface.jsx`
6. `src/markets/derivatives/components/VIXTermStructure.jsx`
7. `src/markets/fx/components/DXYTracker.jsx`

- [ ] **Step 1: Update each file**

Read each file, add the `useTheme` import and `colors` destructuring, update chart builder functions to accept and use `colors`.

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/bonds/components/*.jsx src/markets/derivatives/components/*.jsx src/markets/fx/components/DXYTracker.jsx
git commit -m "feat(theme): theme-aware ECharts in bonds, derivatives, fx"
```

---

### Task 7: ECharts Theme — Crypto, Commodities, Calendar Charts

**Files:** Same pattern as Task 6. Import path is `'../../../hub/ThemeContext'`.

1. `src/markets/crypto/components/CoinMarketOverview.jsx`
2. `src/markets/crypto/components/CycleIndicators.jsx`
3. `src/markets/crypto/components/DefiChains.jsx`
4. `src/markets/crypto/components/FundingAndPositioning.jsx`
5. `src/markets/crypto/components/OnChainMetrics.jsx`
6. `src/markets/commodities/components/FuturesCurve.jsx`
7. `src/markets/commodities/components/SupplyDemand.jsx`
8. `src/markets/commodities/components/CotPositioning.jsx`
9. `src/markets/calendar/components/EconomicCalendar.jsx`
10. `src/markets/calendar/components/EarningsSeason.jsx`

Apply the same color replacement pattern from Task 6. For components that have inline style objects with hardcoded colors (not just ECharts), replace those too using `colors.xxx`.

- [ ] **Step 1: Update each file**

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/crypto/components/*.jsx src/markets/commodities/components/*.jsx src/markets/calendar/components/*.jsx
git commit -m "feat(theme): theme-aware ECharts in crypto, commodities, calendar"
```

---

### Task 8: ECharts Theme — Sentiment, Credit, Insurance Charts

**Files:**

1. `src/markets/sentiment/components/FearGreed.jsx`
2. `src/markets/sentiment/components/CftcPositioning.jsx`
3. `src/markets/sentiment/components/CrossAssetReturns.jsx`
4. `src/markets/credit/components/IgHyDashboard.jsx`
5. `src/markets/credit/components/EmBonds.jsx`
6. `src/markets/credit/components/LoanMarket.jsx`
7. `src/markets/credit/components/DefaultWatch.jsx`
8. `src/markets/insurance/components/CombinedRatioMonitor.jsx`
9. `src/markets/insurance/components/ReserveAdequacy.jsx`

Same pattern as Tasks 6-7.

- [ ] **Step 1: Update each file**

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/sentiment/components/*.jsx src/markets/credit/components/*.jsx src/markets/insurance/components/*.jsx
git commit -m "feat(theme): theme-aware ECharts in sentiment, credit, insurance"
```

---

### Task 9: ECharts Theme — GlobalMacro, RealEstate, Equities Charts

**Files:**

1. `src/markets/globalMacro/components/GrowthInflation.jsx`
2. `src/markets/globalMacro/components/CentralBankRates.jsx`
3. `src/markets/globalMacro/components/DebtMonitor.jsx`
4. `src/markets/realEstate/components/PriceIndex.jsx`
5. `src/markets/realEstate/components/AffordabilityMap.jsx`
6. `src/markets/realEstate/components/CapRateMonitor.jsx`
7. `src/markets/equitiesDeepDive/components/SectorRotation.jsx`
8. `src/markets/equitiesDeepDive/components/FactorRankings.jsx`
9. `src/markets/equitiesDeepDive/components/EarningsWatch.jsx`
10. `src/markets/equitiesDeepDive/components/ShortInterest.jsx`

Same pattern as Tasks 6-8.

- [ ] **Step 1: Update each file**

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/markets/globalMacro/components/*.jsx src/markets/realEstate/components/*.jsx src/markets/equitiesDeepDive/components/*.jsx
git commit -m "feat(theme): theme-aware ECharts in globalMacro, realEstate, equities"
```

---

### Task 10: ECharts Theme — Shared Components + Final Sweep

**Files:**

1. `src/components/HeatmapView/HeatmapView.jsx`
2. `src/components/BarRaceView/BarRaceView.jsx`
3. `src/components/ListView/ListView.jsx`
4. `src/components/DetailPanel/DetailPanel.jsx`
5. `src/components/Header/Header.jsx`
6. `src/components/DataHub/DataHub.jsx`
7. `src/components/Sidebar/Sidebar.jsx`
8. `src/markets/equities/EquitiesMarket.jsx`

For shared components, the import path to ThemeContext is `'../../hub/ThemeContext'`.

After updating all files, do a final sweep: search the entire `src/` directory for any remaining hardcoded occurrences of `#0f172a`, `#1e293b`, `#e2e8f0`, `#94a3b8`, `#64748b`, `#334155`, `#475569` in both `.css` and `.jsx` files. Fix any stragglers.

- [ ] **Step 1: Update each file**

- [ ] **Step 2: Final sweep**

Run: `grep -rn '#0f172a\|#1e293b\|#e2e8f0\|#94a3b8\|#64748b\|#334155\|#475569' src/ --include='*.css' --include='*.jsx' | grep -v node_modules | grep -v 'ThemeContext'`

Fix any remaining hardcoded colors that should be variables.

- [ ] **Step 3: Run full tests**

Run: `npx vitest run`
Expected: All 329 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/*/*.jsx src/markets/equities/EquitiesMarket.jsx
git commit -m "feat(theme): theme-aware shared components + final color sweep"
```

---

## Self-Review

**Spec coverage:**
- CSS variables defined: Task 1 ✓
- ThemeContext + ThemeProvider: Task 1 ✓
- App wrapper: Task 1 ✓
- Toggle button: Task 2 ✓
- localStorage persistence: Task 1 (ThemeContext) ✓
- CSS refactoring (36 files): Tasks 3-5 ✓
- ECharts refactoring (~36 JSX files): Tasks 6-10 ✓
- Final sweep: Task 10 ✓

**Placeholder scan:** No TBDs or vague steps. CSS tasks give explicit mapping rules. ECharts tasks give explicit replacement patterns.

**Type consistency:** `colors` object property names (`bg`, `cardBg`, `text`, `textSecondary`, `textMuted`, `textDim`, `border`, `tooltipBg`, `tooltipBorder`, `bgDeep`, `borderSubtle`) are consistent between ThemeContext definition (Task 1) and usage in Tasks 6-10.
