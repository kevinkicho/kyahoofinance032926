# Global Macro Stock Visualizer

An interactive treemap dashboard for exploring global equity markets across 50+ stock exchanges — built with React 18, ECharts, and an Express backend powered by yahoo-finance2.

## Features

- **Interactive Treemap** — ECharts treemap with zoom, pan, and drill-down across 350+ real global stocks
- **Rank by metric** — resize cells by Market Cap, Revenue, Net Income, P/E Ratio, or Dividend Yield
- **Group by** — view stocks by market, add sector sub-brackets within each market, or dissolve all borders and compare sectors globally
- **Live FX rates** — Frankfurter (ECB data) converts all values to any of 10+ currencies in real time
- **Detail panel** — click any stock to see historical price chart, fundamentals, analyst consensus, and fair value estimate
- **Local data cache** — 351 tickers × 5 years of OHLCV + quoteSummary fundamentals pre-fetched and served instantly
- **Sector hover tooltips** — hover over any market or sector group header for an aggregated summary (total market cap, sector breakdown, top holdings)
- **ML Engine** — macro scenario sliders (rate, inflation, risk appetite, Gini) dynamically reprice sectors using a regression model
- **Time Travel** — explore historical market eras (Dot-com, GFC, COVID crash, AI boom)
- **Portfolio view** — track a custom portfolio against the global universe
- **Radar view** — multi-axis stock comparison tool
- **Data Hub** — inspect and manage local data cache

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, ECharts (via echarts-for-react) |
| Backend | Express 4, yahoo-finance2 v3 (ES module) |
| Data | yahoo-finance2 historical + quoteSummary, Frankfurter API (FX) |
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

Downloads 5 years of history + fundamentals for all 351 tickers (~52 MB, ~21 minutes):

```bash
node scripts/fetch-universe.js
```

The script resumes from where it left off if interrupted. Data is saved to `data/stocks/` and excluded from git.

## Data Sources

- **Stock universe** — `src/data/stockUniverse.js` — 351 hand-curated stocks across 50 exchanges with approximate 2025 fundamentals (USD billions)
- **Live quotes** — yahoo-finance2 (unofficial scraper, personal/demo use only)
- **Historical prices** — `data/stocks/<TICKER>.json` — pre-fetched OHLCV data (gitignored, ~52 MB)
- **Extended price history** — `prices/` — 4,047-ticker OHLCV dataset from a companion project (gitignored, ~220 MB), parallel-array format (`t`, `o`, `h`, `l`, `c`, `a`, `v`)
- **FX rates** — [Frankfurter API](https://frankfurter.dev/) (ECB reference rates, updated daily)
- **Macro indicators** — FRED (M1, M2, CPI, Fed Funds Rate, Unemployment, GDP)

## Cross-listing Note

Several numeric ticker symbols appear in multiple exchanges (e.g. `000100.KS` is a Korean stock, `000100.SZ` is a different Chinese company). The exchange suffix is the authoritative disambiguator. The app's stock universe selects one primary listing per company.

## Project Structure

```
├── src/
│   ├── components/
│   │   ├── Header/          # View toggles, ranking bar, group-by buttons
│   │   ├── HeatmapView/     # ECharts treemap with sector grouping
│   │   ├── ListView/        # Sortable table view
│   │   ├── DetailPanel/     # Chart, fundamentals, analysts, fair value tabs
│   │   ├── PortfolioView/   # Portfolio tracker
│   │   ├── RadarView/       # Multi-stock radar chart
│   │   ├── ModelExplorer/   # ML macro engine UI
│   │   ├── DataHub/         # Data cache inspector
│   │   ├── Sidebar/         # Detail panel + macro indicators + FX rates
│   │   └── TimeTravel/      # Historical era selector
│   ├── data/
│   │   └── stockUniverse.js # 351 real stocks across 50 markets
│   └── utils/
│       ├── constants.js         # Static FX fallback + currency symbols
│       ├── useFrankfurterRates.js # Live FX hook
│       ├── dataHelpers.js       # Detail panel data generator
│       └── mlEngine.js          # Macro regression engine
├── server/
│   └── index.js             # Express API — quotes, history, summary, FRED
├── scripts/
│   └── fetch-universe.js    # Bulk data acquisition script
├── data/stocks/             # gitignored — pre-fetched JSON cache (~52 MB)
└── prices/                  # gitignored — worlddatamap OHLCV dataset (~220 MB)
```

## Notes

- yahoo-finance2 is an unofficial scraper. For personal/demo use only.
- The `prices/` dataset and `data/stocks/` are excluded from git due to size. Re-generate locally with `node scripts/fetch-universe.js`.
