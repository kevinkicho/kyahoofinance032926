# Global Macro Finance Dashboard

An interactive global equity dashboard for exploring market cap, fundamentals, and historical price performance — built with React 18, ECharts, and an Express backend powered by yahoo-finance2.

## Features

### Visualization Modes
- **Heatmap** — ECharts treemap with zoom, pan, and drill-down across 350+ real global stocks
- **Bar Race** — animated horizontal bar chart of the top 30 stocks by market cap, colored by region or sector
- **List View** — sortable table with sector chips, region indicators, and snapshot % change column

### Ranking & Grouping
- **Rank by metric** — resize/reorder cells by Market Cap, Revenue, Net Income, P/E Ratio, or Dividend Yield; `#N` labels update live for every metric
- **Group by** — view by market, add sector sub-brackets within each market, or dissolve borders for a global sector view
- **Rank-based color palette** — 20 distinct vivid colors (gold = #1, cycling through rainbow) when Perf. Colors is off

### Time Travel & History
- **Timeline scrubber** — drag or click to navigate any date from 2020 to today; month/quarter/year tick marks; event dots
- **Playback controls** — play at 1×/2×/4× speed; stop; jump to Live
- **Historical snapshot** — market caps rescale to reflect actual closing prices on the chosen date; ranks reorder accordingly
- **Perf. Colors toggle** — overlays green/red by `snapshot price vs. today's price` for every stock that has data
- **Hover comparison modal** — hovering any stock shows D-1, 1W, 1M, 1Y, YTD % changes + a 6-point sparkline; hold hover 1.5 s to auto-load full details into the sidebar
- **News strip** — 40+ annotated market events (Fed hikes, earnings, crises) shown as expandable chips below the scrubber

### Detail Panel (Sidebar)
- Click any stock (or hold hover 1.5 s) to open the detail panel
- **Chart tab** — 1-year price chart with area fill from live yahoo-finance2 history
- **Fundamentals tab** — revenue, margins, cash flow, debt ratios from quoteSummary
- **Analysts tab** — consensus rating + target price
- **Fair Value tab** — scenario-adjusted DCF estimate with a range bar
- **Macro indicators** — live FRED data (M1, M2, CPI, Fed Funds, unemployment, GDP)
- **FX rates panel** — live ECB rates via Frankfurter API, ⓘ panel shows all crosses

### Crypto
- 15 major crypto assets (BTC, ETH, XRP, BNB, SOL, DOGE, ADA, TRX, AVAX, LINK, DOT, LTC, UNI, POL, ATOM) included as a dedicated region
- Historical prices tracked the same way as equities

### Other
- **Live FX rates** — Frankfurter (ECB data) converts all values to 10+ currencies in real time
- **ML Engine** — macro scenario sliders (rate, inflation, risk appetite, Gini) dynamically reprice sectors
- **Portfolio view** — track a custom portfolio against the global universe
- **Radar view** — multi-axis stock comparison
- **Data Hub** — inspect and manage local data cache

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, ECharts (echarts-for-react) |
| Backend | Express 4, yahoo-finance2 v3 (ES module) |
| Data | yahoo-finance2 historical + quoteSummary, Frankfurter API (FX), FRED |
| Styling | Plain CSS with CSS variables |

## Getting Started

### 1. Install dependencies

```bash
# Frontend
npm install

# Backend
cd server && npm install
```

### 2. Start the backend (port 3001)

```bash
cd server && node index.js
```

### 3. Start the frontend (port 5173)

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 4. (Optional) Pre-fetch all stock data

Downloads 5 years of history + fundamentals for all tickers (~52 MB, ~21 minutes):

```bash
node scripts/fetch-universe.js
```

The script resumes from where it left off if interrupted. Data is saved to `data/stocks/` and excluded from git.

## Data Sources

- **Stock universe** — `src/data/stockUniverse.js` — 350+ hand-curated stocks across 50 exchanges with approximate 2025 fundamentals (USD billions)
- **Live quotes** — yahoo-finance2 (unofficial scraper, personal/demo use only)
- **Historical prices** — `data/stocks/<TICKER>.json` — pre-fetched OHLCV data (gitignored, ~52 MB)
- **Extended price history** — `prices/` — 4,047-ticker OHLCV dataset (gitignored, ~220 MB), parallel-array format (`t`, `o`, `h`, `l`, `c`, `a`, `v`)
- **FX rates** — [Frankfurter API](https://frankfurter.dev/) (ECB reference rates, updated daily)
- **Macro indicators** — FRED (M1, M2, CPI, Fed Funds Rate, Unemployment, GDP)

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Header/          # View toggles, ranking bar, group-by, perf colors
│   │   ├── HeatmapView/     # ECharts treemap + hover modal + rank palette
│   │   ├── BarRaceView/     # Animated top-30 bar chart
│   │   ├── ListView/        # Sortable table with snapshot % change column
│   │   ├── TimeBar/         # Timeline scrubber, playback, events strip
│   │   ├── DetailPanel/     # Chart, fundamentals, analysts, fair value tabs
│   │   ├── PortfolioView/   # Portfolio tracker
│   │   ├── RadarView/       # Multi-stock radar chart
│   │   ├── ModelExplorer/   # ML macro engine UI
│   │   ├── DataHub/         # Data cache inspector
│   │   ├── Sidebar/         # Detail panel + macro indicators + FX rates
│   │   └── TimeTravel/      # Historical era selector
│   ├── data/
│   │   ├── stockUniverse.js # 350+ real stocks across 50 markets + 15 crypto
│   │   └── marketEvents.js  # 40+ annotated macro events with tags
│   └── utils/
│       ├── constants.js             # FX fallback + currency symbols + region suffixes
│       ├── useFrankfurterRates.js   # Live FX hook
│       ├── dataHelpers.js           # Detail panel data generator
│       └── mlEngine.js              # Macro regression engine
├── server/
│   └── index.js             # Express API — quotes, history, summary, snapshot, FRED
├── scripts/
│   └── fetch-universe.js    # Bulk data acquisition script
├── data/stocks/             # gitignored — pre-fetched JSON cache (~52 MB)
└── prices/                  # gitignored — worlddatamap OHLCV dataset (~220 MB)
```

## Notes

- yahoo-finance2 is an unofficial scraper. For personal/demo use only.
- `prices/` and `data/stocks/` are excluded from git due to size. Re-generate locally with `node scripts/fetch-universe.js`.
- Stocks without local data (e.g. some mid-cap tickers) fall back to era-multiplier estimates for historical mode.
- To represent ~80% of global market cap (~$104 T of $130 T), approximately 300–500 tickers are needed across US, China, Japan, Europe, UK, and India. The current universe covers roughly half; expanding the `stockUniverse.js` and running the fetch script fills the gap.
