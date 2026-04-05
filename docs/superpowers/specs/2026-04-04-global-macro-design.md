# Global Macro Dashboard — Design Spec

**Date:** 2026-04-04  
**Accent color:** Teal `#14b8a6`  
**Sub-project:** 8 of N  

---

## Goal

Add a Global Macro workspace to the Global Market Hub — a new top-level tab giving analysts a cross-country view of the macro forces that drive all other asset classes: growth, inflation, central bank policy, and sovereign debt.

---

## Architecture

Mirrors the Commodities market pattern exactly:

```
src/markets/globalMacro/
  GlobalMacroMarket.jsx        — root, sub-tab routing, status bar, loading spinner
  GlobalMacroMarket.css        — layout, spinner (teal #14b8a6), status bar
  data/
    mockGlobalMacroData.js     — static mock for all 4 sub-views
    useGlobalMacroData.js      — async hook: useState mock → useEffect fetch → silent fallback
  components/
    MacroScorecard.jsx         — 12×5 heat table (GDP, CPI, Rate, Unemp, Debt/GDP)
    GrowthInflation.jsx        — side-by-side ranked bar charts
    CentralBankRates.jsx       — current rates ranked + 5-year history lines
    DebtMonitor.jsx            — debt/GDP bars + current account surplus/deficit
    MacroComponents.css        — shared panel, table, chart styles

src/__tests__/globalMacro/
  useGlobalMacroData.test.js
  GlobalMacroMarket.test.jsx
  MacroScorecard.test.jsx
  GrowthInflation.test.jsx
  CentralBankRates.test.jsx
  DebtMonitor.test.jsx
```

**Modified files:**
- `src/hub/markets.config.js` — add `{ id: 'globalMacro', label: 'Macro', icon: '🌐' }`
- `src/hub/HubLayout.jsx` — import + wire `GlobalMacroMarket`
- `server/index.js` — add `/api/globalMacro` endpoint

---

## Country Universe (12)

| Flag | Country | Code | Region |
|------|---------|------|--------|
| 🇺🇸 | United States | US | G7 |
| 🇪🇺 | Euro Area | EA | G7 |
| 🇬🇧 | United Kingdom | GB | G7 |
| 🇯🇵 | Japan | JP | G7 |
| 🇨🇦 | Canada | CA | G7 |
| 🇨🇳 | China | CN | EM |
| 🇮🇳 | India | IN | EM |
| 🇧🇷 | Brazil | BR | EM |
| 🇰🇷 | South Korea | KR | EM |
| 🇦🇺 | Australia | AU | Advanced |
| 🇲🇽 | Mexico | MX | EM |
| 🇸🇪 | Sweden | SE | Advanced |

---

## Data Sources

### World Bank API (free, no key required)

Base URL: `https://api.worldbank.org/v2/country/{codes}/indicator/{indicator}?format=json&mrv=8&per_page=200`

| Indicator ID | Description | Used In |
|---|---|---|
| `NY.GDP.MKTP.KD.ZG` | GDP growth (annual %) | Scorecard, Growth & Inflation |
| `FP.CPI.TOTL.ZG` | CPI inflation (annual %) | Scorecard, Growth & Inflation |
| `SL.UEM.TOTL.ZS` | Unemployment rate (%) | Scorecard |
| `GC.DOB.TOTL.GD.ZS` | Government debt (% of GDP) | Scorecard, Debt Monitor |
| `BN.CAB.XOKA.GD.ZS` | Current account balance (% of GDP) | Debt Monitor |

Fetch all 12 country codes in one request: `US;XC;GB;JP;CA;CN;IN;BR;KR;AU;MX;SE`  
Note: Euro Area uses World Bank code `XC`.

### FRED (existing `FRED_API_KEY`)

Policy rates — monthly, most recent value used as "current rate":

| Country | FRED Series ID |
|---------|---------------|
| 🇺🇸 USA | `FEDFUNDS` |
| 🇪🇺 Euro Area | `ECBDFR` |
| 🇬🇧 UK | `IRSTCB01GBM156N` |
| 🇯🇵 Japan | `IRSTCB01JPM156N` |
| 🇨🇦 Canada | `IRSTCB01CAM156N` |
| 🇦🇺 Australia | `IRSTCB01AUM156N` |
| 🇸🇪 Sweden | `IRSTCB01SEM156N` |

5-year history fetched for all 7 FRED series (for the CentralBankRates history chart).

### Mock (current values, updated in mockGlobalMacroData.js)

Policy rates for countries not on FRED — hardcoded current values only (no history):

| Country | Current Rate | Central Bank |
|---------|-------------|--------------|
| 🇨🇳 China | 3.45% | PBoC |
| 🇮🇳 India | 6.50% | RBI |
| 🇧🇷 Brazil | 10.50% | BCB (SELIC) |
| 🇰🇷 South Korea | 3.50% | BoK |
| 🇲🇽 Mexico | 11.00% | Banxico |

Server cache: 3600s (World Bank data is annual; daily refresh is sufficient).

---

## Sub-view 1: Macro Scorecard

12-row × 5-column heat table. Each cell shows the latest value and is background-colored based on "healthy" thresholds.

**Columns:** Country | GDP Growth% | CPI Inflation% | Policy Rate | Unemployment% | Debt/GDP%

**Color thresholds:**

| Indicator | Deep Green | Light Green | Neutral | Light Red | Deep Red |
|---|---|---|---|---|---|
| GDP Growth% | > +3% | +1 to +3% | 0 to +1% | -1 to 0% | < -1% |
| CPI Inflation% | 1–2% (on target) | 2–3% | 3–4% | 4–6% | > 6% or < 0% (deflation) |
| Policy Rate | < 1% | 1–3% | 3–5% | 5–8% | > 8% |
| Unemployment% | < 4% | 4–6% | 6–8% | 8–10% | > 10% |
| Debt/GDP% | < 40% | 40–60% | 60–90% | 90–120% | > 120% |

**Server data shape:**
```json
{
  "scorecardData": [
    {
      "code": "US", "name": "United States", "flag": "🇺🇸", "region": "G7",
      "gdp": 2.8, "cpi": 3.2, "rate": 5.25, "unemp": 3.7, "debt": 122.0
    }
  ]
}
```

---

## Sub-view 2: Growth & Inflation

Two ECharts horizontal bar charts side by side, each showing all 12 countries ranked.

**Left panel — GDP Growth:** Countries sorted highest to lowest. Bars teal `#14b8a6` for positive, red `#ef4444` for negative. Reference line at 0%.

**Right panel — CPI Inflation:** Countries sorted highest to lowest. Color scale: green if 1–3% (on target), amber if 3–5%, red if > 5% or < 0%.

**Latest year label** shown in panel subtitle (e.g., "2023 annual data — World Bank").

**Server data shape:**
```json
{
  "growthInflationData": {
    "year": 2023,
    "countries": [
      { "code": "IN", "name": "India", "flag": "🇮🇳", "gdp": 8.2, "cpi": 5.7 }
    ]
  }
}
```

---

## Sub-view 3: Central Bank Rates

Two panels stacked vertically.

**Top panel — Current Rates Ranked:** Horizontal bar chart, all 12 countries sorted highest to lowest current policy rate. Bars colored: green < 3%, amber 3–6%, red > 6%. Width proportional to rate. Shows global rate dispersion at a glance.

**Bottom panel — 5-Year Rate History:** Multi-line ECharts chart. One line per country for the 7 FRED-covered countries (US, EU, UK, JP, CA, AU, SE). X-axis = monthly dates (60 months), Y-axis = rate %. Reference dashed line at 2% (approximate neutral rate). Line for each country uses a distinct color from a fixed palette.

**Server data shape:**
```json
{
  "centralBankData": {
    "current": [
      { "code": "BR", "name": "Brazil", "flag": "🇧🇷", "rate": 10.50, "bank": "BCB", "isLive": false }
    ],
    "history": {
      "dates": ["2020-01", "2020-02", "..."],
      "series": [
        { "code": "US", "name": "United States", "flag": "🇺🇸", "values": [1.75, 1.75, "..."] }
      ]
    }
  }
}
```

---

## Sub-view 4: Debt Monitor

Two ECharts panels side by side.

**Left panel — Government Debt (% of GDP):** Vertical bar chart, all 12 countries. Color thresholds per Maastricht criteria: green < 60%, amber 60–90%, red > 90%. Reference lines at 60% (Maastricht limit) and 100%.

**Right panel — Current Account Balance (% of GDP):** Vertical bar chart, positive = surplus (teal), negative = deficit (red). Reference line at 0%. Countries sorted by value (largest surplus to largest deficit). Shows which economies are capital exporters vs importers.

**Server data shape:**
```json
{
  "debtData": {
    "year": 2023,
    "countries": [
      { "code": "JP", "name": "Japan", "flag": "🇯🇵", "debt": 261.3, "currentAccount": 3.5 }
    ]
  }
}
```

---

## Hook Shape (`useGlobalMacroData`)

```javascript
return {
  scorecardData,       // array of 12 country objects
  growthInflationData, // { year, countries[] }
  centralBankData,     // { current[], history: { dates[], series[] } }
  debtData,            // { year, countries[] }
  isLive,
  lastUpdated,
  isLoading,
};
```

Live data guards:
- `scorecardData`: update if `data.scorecardData?.length >= 8`
- `growthInflationData`: update if `data.growthInflationData?.countries?.length >= 8`
- `centralBankData`: update if `data.centralBankData?.current?.length >= 8`
- `debtData`: update if `data.debtData?.countries?.length >= 8`

---

## Hub Integration

`markets.config.js`:
```javascript
{ id: 'globalMacro', label: 'Macro', icon: '🌐' }
```

`HubLayout.jsx`:
```javascript
import GlobalMacroMarket from '../markets/globalMacro/GlobalMacroMarket';
// add to MARKET_COMPONENTS: globalMacro: GlobalMacroMarket
```

---

## Tests (target ~30 new tests across 6 files)

| File | Tests |
|---|---|
| `useGlobalMacroData.test.js` | mock fallback shapes, live data sets state, isLive flag, guard thresholds |
| `GlobalMacroMarket.test.jsx` | 4 tabs render, tab switching, loading state, mock status bar |
| `MacroScorecard.test.jsx` | 12 country rows, column headers, heat class on GDP > 3%, heat class on CPI > 6% |
| `GrowthInflation.test.jsx` | renders 2 chart instances, panel titles, year in subtitle |
| `CentralBankRates.test.jsx` | renders 2 chart instances, ranked bar title, history chart title |
| `DebtMonitor.test.jsx` | renders 2 chart instances, debt panel title, current account panel title, null data graceful |
