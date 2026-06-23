# Panel Reference

Every tab in the Hub, every panel inside it, and what each is for. Use this as the canonical "what does this thing do" lookup. For the data flow that powers them, see [`DATA_PIPELINE.md`](DATA_PIPELINE.md).

Panel keys (e.g. `kpi`, `yield`, `metrics`) are the `key` props on bento children — they map to layout positions in `BentoWrapper` and to `localStorage` slots when a user drags them.

| Tab | Endpoint | Source(s) |
|---|---|---|
| [Equities](#equities) | `/api/stocks` (per-ticker) | Yahoo Finance, FRED |
| [Bonds](#bonds) | `/api/bonds` | FRED, Treasury Fiscal Data, ECB |
| [FX](#fx) | `/api/fx` | Frankfurter, FRED, BIS |
| [Derivatives](#derivatives) | `/api/derivatives` | Yahoo Finance, CBOE |
| [Real Estate](#real-estate) | `/api/realEstate` (+ `/api/census`) | Yahoo Finance, FRED, Census |
| [Insurance](#insurance) | `/api/insurance` | Yahoo Finance, FRED |
| [Commodities](#commodities) | `/api/commoditiesEnhanced` (`/api/commodities/v2` alias) + satellite endpoints | EIA, FRED, USDA, Census Trade, World Bank, Yahoo Finance, CFTC via Sentiment |
| [Macro](#macro) | `/api/globalMacro` (+ `/api/imf`, `/api/worldbank`) | FRED, World Bank, IMF, BIS, OECD |
| [Equity+](#equity-plus) | `/api/equityDeepDive` | Yahoo Finance, FRED, SEC EDGAR |
| [Crypto](#crypto) | `/api/crypto` | CoinGecko, Mempool, DefiLlama, Alternative.me, Etherscan |
| [Credit](#credit) | `/api/credit` | FRED, Yahoo Finance |
| [Sentiment](#sentiment) | `/api/sentiment` | Alternative.me, Yahoo Finance, FRED, CFTC |
| [Calendar](#calendar) | `/api/calendar` | FRED, Yahoo Finance, Treasury Fiscal Data, Econdb |
| [BLS](#bls) | `/api/bls` | BLS (FRED fallback) |
| [EIA](#eia) | `/api/eia` | EIA |
| [Alerts](#alerts) | federated (sentiment/bonds/credit/...) | derived |
| [Watchlist](#watchlist) | `/api/watchlist` (POST quotes) | Yahoo Finance |
| [Analytics](#analytics) | `/api/rate-limits`, `/api/cache/status`, `/api/analytics` | server introspection |

---

## Equities

**Purpose:** snapshot of US equity indices, sector heatmap, and a per-ticker drill-down. Default landing tab.

| Sub-view | Panel `key` | What it shows | Why look at it |
|---|---|---|---|
| Heatmap (default) | `kpi` | S&P 500 / NASDAQ / Dow / Russell 2000 — live quotes, % change, points | Index pulse at a glance |
| Heatmap | `heatmap` | 825 equities tiled by sector or by market, color = % change | Find rotation winners/losers |
| Heatmap | `summary` | Global Market Cap (USD), equities tracked, regions | Coverage scope |
| List | `list-main` | Sortable table of all 825 tickers — price, change, market cap, P/E, dividend | Scan/filter the universe |
| List | `detail-sidebar` | Selected ticker's full Yahoo quote | One-click drill-down |
| Bar Race | `race` | Animated bar race of top movers over time | Visual intuition for leaders |
| Portfolio | `portfolio` | User-defined ticker bag with weights | Tracks against benchmark |
| Radar | `radar` | Per-ticker factor radar (value/momentum/quality/low-vol) | Style exposure check |
| ML Explorer | `ml-explorer` | Composite ML score per ticker | Long/short candidate ideas |
| Data Hub | (full-page) | Raw stock data table for export | CSV/JSON download |

**Drill-down**: click any ticker → loads `/api/summary/:t` (fundamentals, analysts) and `/api/history/:t` (5y price).

---

## Bonds

**Purpose:** US Treasury yield curve + global rates + credit spreads + breakevens. The macro fixed-income workspace.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Key Metrics) | US 10Y · US 2Y · Fed Funds · 10Y-2Y curve · IG OAS · HY OAS · 5Y BE | Single-row macro pulse |
| `yield` (Yield Curve) | All-country yield curve (3M–30Y) with US highlighted | Curve shape vs world |
| `metrics` (Key Metrics sidebar) | US tenors · curve spreads · TIPS yields · macro (unemp/GDP/PCE/debt) · breakevens · Fed Funds · credit spreads | Searchable detail rail |
| `credit` (Credit Spreads) | IG / HY / EM / BBB OAS history | Risk-on/off pricing |
| `realYield` (TIPS Real Yields) | 5Y / 10Y / 30Y TIPS history | Real-rates regime |
| `ratings` (Credit Ratings) | Sovereign ratings matrix — S&P / Moody's / Fitch | Cross-country credit |
| `curvespreads` (Curve Spreads) | 2s10s / 10s3m / 5s30s history (5y30y computed from DGS5/DGS30) | Recession indicator |
| `fed` (Fed Balance Sheet) | WALCL series | QE/QT regime |
| `m2` (M2 Money Supply) | M2SL history | Liquidity gauge |
| `cpi` (CPI Components) | CPI YoY / Core / Food / Energy | Inflation breakdown |
| `debtgdp` (Debt-to-GDP) | Federal debt / GDP ratio history | Solvency |
| `breakevens` (Breakeven Inflation) | 5Y / 10Y / 5Y5Y forward | Market inflation expectations |
| `duration` (Duration Ladder) | US Treasury debt by maturity bucket — bar chart + table + Fed Funds Futures sub-chart | Treasury composition |
| `macro` (Macro Indicators) | Unemp / GDP / PCE / Fed BS / M2 / federal debt | Macro at-a-glance |

---

## FX

**Purpose:** spot rates, COT positioning, central-bank rate differentials, dollar regime.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (FX Key Metrics) | EUR/USD · USD/JPY · GBP/USD · USD/CHF · DXY · G10 avg | Pulse of major pairs |
| `sidebar` (FX Dashboard) | Key pairs with sparklines, change% | Quick scan |
| `movers` (Top Movers vs USD) | Largest 1-day moves with sparkline + COT % | Volatility hunting |
| `dxy` (DXY Dollar Index) | Trade-weighted dollar history (DTWEXBGS) | Dollar regime |
| `cot` (CFTC COT Positioning) | Net spec positioning per currency | Crowded trades |
| `corr` (Currency Correlation) | 30-day correlation matrix across G10 | Diversification check |
| `ratediff` (Rate Differentials) | Fed-ECB-BoE-BoJ rate spreads | Carry & FX direction |
| `reer` (Real Effective Exchange Rates) | BIS REER for US/EU/JP/GB/CN | Real FX vs trade partners |
| `carry` (Carry Map) | All G10 long/short pairs ranked by interest-rate differential | Carry-trade scan |

---

## Derivatives

**Purpose:** vol surface + term structure + skew + flow. Equity-vol workspace.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Derivatives Key Metrics) | VIX · VVIX · SKEW · Put/Call ratio | Vol pulse |
| `metrics` (Key Metrics sidebar) | VIX percentile · spot/3M spread · gamma · realized vol | Detail |
| `vixterm` (VIX Term Structure) | Spot · 1M · 3M · 6M VIX | Contango/backwardation |
| `vix1y` (VIX 1Y History) | VIX history (FRED VIXCLS) | Long-vol regime |
| `skew` (CBOE SKEW) | SKEW index history | Tail-risk pricing |
| `volsurf` (Vol Surface) | SPY/QQQ implied vol surface | Strike/expiry skew |
| `flow` (Options Flow) | Unusual options activity (proxied) | Smart-money signal |
| `gamma` (Gamma Exposure) | Dealer gamma estimate | Pinning / volatility regime |
| `volprem` (Vol Premium) | Implied vs realized | Long/short vol carry |

---

## Real Estate

**Purpose:** US housing + REITs + Census housing/trade indicators.

| Panel `key` | What it shows | Why |
|---|---|---|
| `metrics` (Key Metrics sidebar) | Case-Shiller · Median Price · 30Y/15Y mortgage · Housing Starts · Existing Sales · Homeownership · Rental Vacancy · Foreclosure / Delinquency · CRE Delinq · Commodities (gold/oil) | Whole-tab summary |
| `shiller` (Case-Shiller Index) | National HPI history (FRED CSUSHPISA) | Home price trend |
| `reitetf` (REIT ETF VNQ) | VNQ price + history | REIT regime |
| `reitperf` (REIT Performance) | 8 individual REITs · price · change · yield | Sector rotation |
| `foreclosure` (Distress Indicators) | Foreclosure rate (DRSREACBS) + delinquency rate (DRSFRWBS) | Stress signals |
| `mba` (Mortgage Rates / "MBA Applications" proxy) | 30Y + 15Y mortgage rate (real MBA index needs paid feed) | Demand proxy |
| `cre` (CRE Delinquencies) | Commercial RE delinquency rate (DRCLACBS) | CRE stress |
| `caprate` (Cap Rates by Sector) | Implied cap rate per sector | Valuation by property type |
| `afford` (Affordability Index) | Median price · median income · price/income · mortgage/income · 30Y rate · YoY change (FRED MSPUS / MEHOINUSA672N) | Where buying makes sense |
| `supply` (Supply & Demand) | Housing starts · building permits · months' supply · active listings (FRED HOUST / PERMIT / MSACSR / ACTLISCOUUS) | Market balance |
| `census-housing` | Housing Starts · Building Permits · New Home Sales · Construction Spending KPI grid | Census release |
| `census-trade` | Retail Sales · Durable Goods · Trade Balance KPI grid | Consumer & trade pulse |
| `census-trends-housing` | 4 sparklines for housing-side series | Long-trend view |
| `census-trends-trade` | 3 sparklines for trade/retail series | Long-trend view |

---

## Insurance

**Purpose:** insurer financials + cat-bond spreads + sector ETF.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Insurance Key Metrics) | Combined Ratio · 4 insurer prices · HY OAS · KIE ETF | Sector pulse |
| `crhist` (Industry Combined Ratio) | Quarterly combined-ratio history (avg of insurers) | Underwriting cycle |
| `crline` (Combined Ratio by Line) | Per-insurer ratio breakdown | Outlier detection |
| `reserveAdequacy` | Reserves vs required by line | Capital adequacy |
| `hyoas` (HY OAS Spread) | High-yield spread history | Investment-income context |
| `catbonds` (Cat Bond Spreads) | SHRX/ILS ETF + HY/IG OAS proxies | Cat-bond market pulse |
| `catloss` (Cat Losses) | Annual catastrophe loss history | Loss-cost trends |
| `etfs` (Sector ETF KIE) | Insurance sector ETF data | Market view |

---

## Commodities

**Purpose:** broad commodity pulse + futures curve + supply/demand + COT + strategic materials intelligence.

| Panel `key` | What it shows | Why |
|---|---|---|
| `sidebar` (Market Summary) | Key prices, DBC, gold/oil ratio, contango, COT net | Single-screen pulse |
| `prices` (Commodity Prices) | Yahoo futures: energy, precious metals, copper, grains, softs, livestock | Full table/chart view |
| `futures` (Futures Curve) | WTI + Gold term structure, DXY/WTI overlay, seasonality | Contango / backwardation |
| `sector` (Sector Performance) | Energy / Metals / Agriculture / Livestock heatmap with d1/w1/m1 and PPI context | Sector rotation |
| `supply` (Supply & Demand Monitor) | Crude stocks · Nat gas storage · Crude production · Gasoline / Distillate stocks (EIA) | Fundamentals |
| `cot` (COT Positioning) | CFTC commodities — Gold / Crude net positioning | Speculative crowding |
| `comfx` (Commodity FX vs USD) | CAD · AUD · NOK · BRL · CLP · ZAR | Commodity-bloc currencies |
| `usda-ag` (US Ag Commodity Prices) | USDA NASS ag price series | Physical ag input context |
| `eia-petrol` (Petroleum & Natural Gas) | EIA gasoline, Henry Hub, crude stocks | Energy physical market |
| `us-trade` (US Trade Balance) | Census trade by bloc | Commodity demand/import context |
| `physical-pressure` | Combined EIA/USDA/Census pressure table | Physical tightness summary |
| `materials-grid` | Strategic materials periodic grid | Critical-mineral map |
| `criticality` | Criticality/import reliance leaderboard | Supply vulnerability ranking |
| `battery-chain` | Lithium/graphite/nickel/cobalt/manganese/copper/vanadium | EV/grid supply chain |
| `precious-complex` | Precious metals, PGM rows, ratios | Monetary vs industrial precious metals |
| `regime` | Commodity regime classifier | Inflation/growth/safe-haven read |
| `energy-stack` | Crude, Brent, gas, heating oil, crude inventory | Energy complex at a glance |
| `curve-board` | WTI/Gold curve structure summary | Inventory tightness proxy |
| `material-detail` | Selected strategic material facts | Drilldown from periodic grid |
| `exposure-matrix` | Materials vs EV/grid/defense/chips/solar/nuclear | Sector dependency map |

---

## Macro

**Purpose:** global growth, inflation, rates, debt — with merged IMF + World Bank + OECD content.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Macro Key Metrics) | US/EU/CN GDP · Fed rate · DXY · Avg CPI | Global pulse |
| `sidebar` (Quick Indicators) | GDP / CPI flag chart · 12 countries | Compare countries |
| `scorecard` (Country Scorecard) | GDP / CPI / Rate / Unemp / Debt for 12 countries | Click row → drill-down |
| `gdp` (GDP Growth) | Bar chart sorted by GDP growth | Growth ranking |
| `cpi` (CPI Inflation) | Bar chart sorted by CPI YoY | Inflation ranking |
| `rates` (Policy Rates) | Bar chart of policy rates | Hawks vs doves |
| `debt` (Debt / GDP) | Bar chart of public debt | Solvency |
| `cxstrength` (Currency Strength) | DXY + RER deltas | Dollar/world FX |
| `activity` (Economic Activity / CFNAI) | CFNAI 3-mo MA + label (Recession/Below/Near/Above trend) | US-cycle indicator |
| `cli` (OECD Leading Indicators) | OECD CLI per country (FRED `[CC]LOLITOAASTSAM`) | 6-9 month forward signal |
| `imf-reserves` (International Reserves) | IMF IFS reserve balances by country (USD bn) | FX-firepower / dedollarization |
| `imf-cofer` (COFER Currency Shares) | Donut chart: USD/EUR/JPY/GBP/CNY/CHF share of global FX reserves | Dollar dominance |
| `wb-trade` (Trade Openness) | (Exports + Imports) / GDP · World Bank | Globalization gauge |
| `wb-dev` (GDP per Capita vs Growth) | Bubble scatter — capita vs growth, bubble = population | Convergence story |

---

## Equity+

**Purpose:** sector rotation, factor scoring, earnings calendar, short interest, institutional + insider activity.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Equity+ Key Metrics) | Ranked sector ETF perf bar chart (1M vs SPY) · factor rotation diverging bars · summary KPIs (leader/laggard/SPY/beating count) | Top-down rotation |
| `sidebar` (Equity+ Summary) | Sector perf · top factors · short interest · earnings · institutions · insider activity | Right-rail digest |
| `valuation` (Key Metrics) | S&P P/E · Buffett · ERP · Sector best/worst · Top factor · Short interest stats | Valuation regime |
| `etf` (ETF Performance) | 12 sector ETFs ranked by 1-month perf with SPY reference line | Rotation visual |
| `factor-favor` (Factor In Favor) | Bar chart of factor avg composite scores | Style regime |
| `sector-beat` (Sector Beat Rate) | % of names beating EPS estimates by sector | Earnings quality |
| `shorted` (Most Shorted) | Top tickers by short float % + days-to-cover | Short squeeze candidates |
| `scores` (Stock Factor Scores) | Top 10 stocks by composite (value/momentum/quality/composite heat-map) | Best names by style |
| `earnings` (Upcoming Earnings) | Next 10 earnings dates with EPS estimate + dir | Calendar hunting |
| `institutions` (Top Institutions) | Top 6 13F holders by total AUM | Smart-money map |
| `insider` (Insider Trading) | Buys / Sells / Net per ticker (Form 4 filings) | Insider conviction |

---

## Crypto

**Purpose:** majors, dominance, on-chain, DeFi, sentiment.

| Panel `key` | What it shows | Why |
|---|---|---|
| `coins` (Top Coins) | Top 20 coins · price · 24h change · mcap · vol | Pulse |
| `dominance` (BTC Dominance) | BTC % of total crypto mcap | Risk regime |
| `feargreed` (Crypto Fear & Greed) | Alternative.me crypto FNG | Sentiment |
| `gas` (ETH Gas) | Etherscan slow/avg/fast gwei | On-chain congestion |
| `defi` (DeFi TVL) | DefiLlama TVL by protocol/chain | DeFi health |
| `mempool` (Bitcoin Mempool) | Mempool fees · difficulty · hashrate | Network stress |
| `exchanges` (Top Exchanges) | Top exchange volumes | Liquidity map |

---

## Credit

**Purpose:** IG / HY / EM credit spreads, default rates, CLO tranche pricing.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Credit Key Metrics) | IG OAS · HY OAS · EM Spread · Default Rate · CP Rate (clickable for FRED series) | Credit pulse |
| `key-metrics` (Key Metrics sidebar) | Credit spreads · Default Watch · Short-term rates | Detail rail |
| `credit-spreads` (Credit Spreads chart) | IG / HY / EM / BBB history | Risk-on/off |
| `summary` (Spread Summary) | Latest spreads with day/week change | Movement focus |
| `cloTranches` (CLO Tranches) | AAA → B tranche spread + yield ladder | Securitisation pricing |
| `loanData` (Loan Market) | BKLN NAV + leveraged-loan indices | Floating-rate market |
| `defaultData` (Default Watch) | HY default rate · loan default · distressed ratio · CCC % | Distress signals |
| `delinquency` (Delinquency Rates) | Consumer/CRE delinquency | Household + CRE stress |
| `lendingStandards` (Lending Standards) | SLOOS C&I tightening | Banker risk appetite |
| `commercialPaper` (Commercial Paper) | CP rates | Short-term funding |
| `excessReserves` | Excess reserves at depository institutions | Banking liquidity |

---

## Sentiment

**Purpose:** cross-asset risk-on/off + Fear & Greed + CFTC + leverage.

| Panel `key` | What it shows | Why |
|---|---|---|
| `sidebar` (Market Snapshot) | F&G score · risk metrics · leverage · key signals | One-screen mood |
| `key-metrics` | Stress (FSI), top derived signals | Detail |
| `fear-greed` (Fear & Greed Index) | 252-day F&G history with markers; falls back to score gauge if alternative.me history blocked | Crowd mood |
| `cross-asset` (Cross-Asset Returns) | SPY/QQQ/EEM/TLT/GLD/UUP/USO/BTC 1d change | Daily risk dispersion |
| `cftc` (CFTC Positioning) | Net spec % per currency / equity index / rate / commodity (4 mini bar charts) | Crowded longs/shorts |
| `risk-dashboard` (Risk Dashboard) | 7 signals: Yield Curve · HY · IG · VIX · Gold/USD · EM vs US · FSI — risk-on / off / neutral; VVIX + Margin Debt + FSI sub-charts | Composite risk regime |
| `leverage` (Leverage Metrics) | Margin Debt + Consumer Credit (FRED BOGZ1FL663067003Q + TOTALSL) | Risk-appetite proxy |

---

## Calendar

**Purpose:** what's about to move markets — central banks, earnings, releases, auctions, dividends.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Calendar Key Metrics) | Today high-impact count · next CB meeting · earnings count this week | Pulse |
| `summary` (Calendar Summary) | Compact week ahead | Plan day |
| `econ` (Economic Calendar) | FRED + Econdb event list (today + next 30d) | Macro releases |
| `cb` (Central Banks) | Fed/ECB/BoE/BoJ next meetings + days-until + last rate | Rate decisions |
| `earnings` (Earnings Season) | Next 9 earnings dates with EPS est + last quarter | Single-name catalysts |
| `releases` (Key US Releases) | Top FRED releases with frequency | Macro reads |
| `treasury` (Treasury Auctions) | Upcoming Bill auctions (date · type · offering amount) | Liquidity drains |
| `optionsExpiry` (Options Expiry) | Next monthly expiries (3rd Fridays) | OPEX dynamics |
| `dividends` (Dividend Calendar) | Top names' next ex-dates | Income calendar |

---

## BLS

**Purpose:** labor market + prices. 10 BLS series via BLS API or FRED fallback.

| Panel `key` | What it shows | Why |
|---|---|---|
| `kpi` (Key Labor Market Indicators) | Unemployment · Labor Participation · Employment-Pop Ratio · Nonfarm Payrolls · Avg Hourly Earnings · Avg Weekly Hours · CPI · PPI · Job Openings · Unemployed Persons — KPI grid with sparklines + MoM change | Labor + price pulse |
| `trends-top` (Trends — Labor) | First half of series, 3y mini-chart per | Long-trend view |
| `trends-bottom` (Trends — Prices & Jobs) | Second half of series | Long-trend view |

---

## EIA

**Purpose:** US energy: electricity sales by sector + CO₂ emissions.

| Panel `key` | What it shows | Why |
|---|---|---|
| `electricity-residential` | Residential electricity retail sales + price | Demand pulse |
| `electricity-commercial` | Commercial sales + price | Sector demand |
| `electricity-industrial` | Industrial sales + price | Industrial demand |
| `co2-total` | Total US CO₂ emissions | National decarb trend |
| `co2-bysector` | CO₂ by sector (transport / electric / industrial / residential / commercial) | Where emissions concentrate |

---

## Alerts

**Purpose:** federated rule-based alerts across all markets — surfaces threshold breaches without you having to scan each tab.

| Panel `key` | What it shows | Why |
|---|---|---|
| `active` (Active Alerts) | Currently-firing rules (e.g. "VIX > 25", "HY OAS > 500bps") | Triage |
| `rules` (Alert Rules) | All rules with current value + threshold + status | Tune thresholds |
| `sidebar` (Alerts Sidebar) | Markets-with-alerts overview | Where to look |

---

## Watchlist

**Purpose:** user-defined ticker bag with live quotes (POST → `/api/watchlist`).

| Sub-tab | Panel `key` | What it shows |
|---|---|---|
| My Tickers | `kpi` | KPI strip — count, leaders, laggards, total return |
| My Tickers | `tickers-table` | Full table — price, change, mcap, P/E, dividend |
| My Metrics | `kpi` | Same KPI |
| My Metrics | `metrics-table` | Custom metrics view — earnings yield, momentum, etc. |

Tickers persisted to localStorage. Adding a ticker triggers a `POST /api/watchlist` with the array → server batch-fetches Yahoo quotes.

---

## Analytics

**Purpose:** server introspection — API call rates, cache hit rates, route performance, data freshness.

| Panel `key` | What it shows |
|---|---|
| `kpi` (Analytics Key Metrics) | Endpoints tracked · last fetch · cache hit % · hot/exhausted limits |
| `provenance` (Provenance Audit) | Cross-reference each market's `_sources` with FRED — verify what's reaching the UI |
| `server` (Server) | PID · Node version · platform · CPUs · memory · env detected |
| `apiUsage` (API Usage) | Calls/day per source vs limit |
| `health` (Data Source Health) | Calls/limit % per source — visual health |
| `routes` (Endpoint Metrics) | Avg / p50 / max latency · err % per route |
| `freshness` (Data Freshness) | Per-market: when fetched · age · size · keys |
| `errors` (Error Log) | Recent errors |
| `memCache` (Memory Cache) | In-memory cache stats |
| `fileCache` (File Cache) | Daily cache files |
| `expressRoutes` (Express Routes) | All registered routes |
| `coverage-matrix` (Endpoint Coverage Matrix) | DataProvider endpoint status, source counts, keys, fetched time | Agent/debug coverage map |

---

## Cross-cutting features

**DataFooter** — every panel has a footer showing `FETCHED / NO DATA / PENDING` plus the source name. Click it to open a popover listing every API call that produced this panel's data, with FRED series IDs, "Open in FRED" links, and a copyable raw JSON URL for verification.

**MetricValue** — every numeric value rendered in the app is clickable. The popover shows the FRED series ID (or other source), provenance trail, and an "Open source" link. This makes every chart number traceable back to its origin.

**BentoWrapper** — every panel is a draggable, resizable bento card. Drag the title row, drop anywhere; resize from the bottom-right corner. Position + size persisted to `localStorage` per market with a versioned key (`<market>-layout-vN`).

**Currency converter** — top-bar dropdown converts every USD value in the app to the selected currency on the fly using FX rates from the FX route.

**Theme** — light/dark toggle in top bar. CSS vars drive all colors.

**Time travel** — snapshot date selector replays the dashboard with cached data from any prior day. Powered by daily JSON snapshots in `server/datacache/`.

---

## When a panel says "PENDING" / "NO DATA" / em-dashes

| Symptom | Most-likely cause |
|---|---|
| `PENDING` (grey) — never resolves | DataProvider's wave hasn't reached this market yet (rare). Hard refresh. |
| `NO DATA` (red) | The route fetched but the validator rejected the shape, or upstream returned 4xx/5xx. Click the badge → see actual fetch log. |
| `FETCHED` but values are em-dashes | The route succeeded but a specific FRED/Yahoo series within it failed — usually a transient upstream 5xx. The page recovers on next refresh. |
| Whole tab missing | Likely missing API key (`FRED`/`EIA`/`BLS`). Run `npm run setup`. |

For a programmatic check, run `npm run test:validate` — it will dump every empty panel into `test-results/validate.md`.
