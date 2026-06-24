# Government API Panel Implementation Plan

## Phase 0: Tab Renaming

### Rename "EIA" → "Energy" and "BLS" → "Labor"

These are label-only changes (the internal `id` stays the same to avoid breaking routes, imports, and storage keys).

| File | Change |
|------|--------|
| `src/hub/markets.config.js` | Line 16: `label: 'BLS'` → `label: 'Labor'` |
| `src/hub/markets.config.js` | Line 17: `label: 'EIA'` → `label: 'Energy'` |
| `src/hub/markets.config.js` | Line 39: `subTabs: ['Labor Market', 'Prices', 'Trends']` → `subTabs: ['Labor Market', 'Prices', 'Trends', 'Productivity', 'Wages']` |
| `src/hub/markets.config.js` | Line 40: `subTabs: ['Electricity', 'Emissions', 'Energy Overview']` → `subTabs: ['Electricity', 'Emissions', 'Energy Overview', 'Petroleum', 'Natural Gas', 'Outlook']` |
| `src/hub/markets.config.js` | Line 39: `keywords: ['CPI', 'Non-farm Payrolls', 'Unemployment']` → add `'JOLTS', 'Productivity', 'Wages'` |
| `src/hub/markets.config.js` | Line 40: `keywords: ['Energy', 'Oil Production', 'EIA']` → add `'Petroleum', 'Natural Gas', 'STEO', 'Coal'` |
| `src/data/marketPanels.js` | Update panel titles for bls and eia sections |
| `src/markets/bls/BlsMarket.jsx` | Update `DataFooter` source text |
| `src/markets/eia/EiaMarket.jsx` | Update `DataFooter` source text |

**Effort: ~15 minutes**

---

## Phase 1: Energy Tab (formerly EIA) — New Panels

### Current panels (3): Energy Overview, Electricity, CO₂ Emissions

### New panels to add:

| # | Panel | Data Source | What It Shows | Chart Type | Effort | Backend Changes |
|---|-------|-------------|---------------|------------|--------|-----------------|
| 1 | **Petroleum Prices** | EIA API `petroleum/pri/` | WTI, Brent, gasoline, diesel, heating oil spot/futures prices | Multi-line | Low | Add EIA petroleum queries to `server/routes/eia.js` |
| 2 | **Natural Gas Prices** | EIA API `natural-gas/pri/` | Henry Hub spot & futures, natural gas storage | Multi-line + bar | Low | Add EIA NG queries |
| 3 | **Short-Term Energy Outlook** | EIA API `steo/` | 18-month WTI/Brent/NG/coal price + supply/demand projections | Multi-line | Medium | New STEO fetch + parse |
| 4 | **Coal Production & Prices** | EIA API `coal/` | Coal production, consumption, prices, exports | Multi-line | Low | Add EIA coal queries |
| 5 | **International Energy** | EIA API `international/` | Energy production/consumption by country | Bar | Low | Add EIA international queries |
| 6 | **CO₂ Emissions by Fuel** | EIA API `co2-emissions/` | CO2 by fuel type (coal, petroleum, NG) | Stacked bar | Low | Already have CO2 endpoint, add fuel breakdown |
| 7 | **Nuclear Outages** | EIA API `nuclear-outages/` | Nuclear plant generator outages — grid risk | Timeline/bar | Low | Add EIA nuclear queries |
| 8 | **State Energy Data** | EIA API `seds/` | Energy consumption/production by state | Table/map | Medium | Add SEDS queries |

### Updated panel list for Energy tab:
```
{ id: 'kpi', title: 'Energy Overview' },
{ id: 'electricity', title: 'Electricity' },
{ id: 'emissions', title: 'CO₂ Emissions' },
{ id: 'petroleum', title: 'Petroleum' },
{ id: 'natural-gas', title: 'Natural Gas' },
{ id: 'outlook', title: 'Short-Term Energy Outlook' },
{ id: 'coal', title: 'Coal' },
{ id: 'international', title: 'International Energy' },
{ id: 'emissions-by-fuel', title: 'CO₂ by Fuel' },
{ id: 'nuclear', title: 'Nuclear Outages' },
{ id: 'state-energy', title: 'State Energy Data' },
```

---

## Phase 2: Labor Tab (formerly BLS) — New Panels

### Current panels (2): Key Labor Market Indicators, Trends (3-Year)

### New panels to add:

| # | Panel | Data Source | What It Shows | Chart Type | Effort | Backend Changes |
|---|-------|-------------|---------------|------------|--------|-----------------|
| 1 | **JOLTS** | BLS API (JTS series) | Job openings, quits, hires, layoffs | Multi-line | Low | Add JOLTS series to `server/routes/bls.js` |
| 2 | **Productivity** | BLS API (PRS series) | Labor productivity, unit labor costs, output per hour | Multi-line | Low | Add productivity series |
| 3 | **Wage Growth** | BLS API (CES series) | Avg hourly earnings by industry, wage growth % | Multi-line | Low | Already have avgHourlyEarnings, add industry breakdown |
| 4 | **Employment by Industry** | BLS API (CES supersector) | Nonfarm payrolls by supersector (goods, services, govt) | Stacked bar | Low | Add supersector series |
| 5 | **Unemployment Duration** | BLS API (LNS series) | Unemployed by duration (<5w, 5-14w, 15-26w, 27w+) | Stacked bar | Low | Add duration series |
| 6 | **Labor Force Flows** | BLS API (LNS series) | Flows between employed, unemployed, not-in-labor-force | Sankey/bar | Medium | Add flow series |
| 7 | **State Unemployment** | BLS API (LA series) | Unemployment rate by state | Table/map | Medium | Add state-level series |
| 8 | **Union Membership** | BLS API (LU series) | Union membership rate, covered workers | Line | Low | Add union series |
| 9 | **Mass Layoffs** | BLS API (ML series) | Mass layoff events by industry | Bar | Low | Add mass layoff series |
| 10 | **CPI Components** | BLS API (CU series) | CPI by component (food, energy, shelter, medical, transport) | Multi-line | Low | Already have CPI, add component breakdown |
| 11 | **PPI by Industry** | BLS API (PCU series) | PPI by industry (final demand, intermediate, services) | Multi-line | Low | Already have PPI, add industry breakdown |
| 12 | **Employment Cost Index** | BLS API (CI series) | ECI — wages & salaries, benefits, total compensation | Multi-line | Low | Add ECI series |
| 13 | **Real Earnings** | BLS API (CES + CPI) | Real avg hourly earnings (nominal earnings / CPI) | Line | Low | Computed from existing series |
| 14 | **OECD Labor Comparison** | OECD LFS (#169) | Employment, unemployment, wages across OECD countries | Multi-line | Medium | New OECD fetch |

### Updated panel list for Labor tab:
```
{ id: 'kpi', title: 'Key Labor Market Indicators' },
{ id: 'trends', title: 'Trends (3-Year)' },
{ id: 'jolts', title: 'JOLTS' },
{ id: 'productivity', title: 'Productivity' },
{ id: 'wage-growth', title: 'Wage Growth' },
{ id: 'employment-by-industry', title: 'Employment by Industry' },
{ id: 'unemployment-duration', title: 'Unemployment Duration' },
{ id: 'labor-flows', title: 'Labor Force Flows' },
{ id: 'state-unemployment', title: 'State Unemployment' },
{ id: 'union-membership', title: 'Union Membership' },
{ id: 'mass-layoffs', title: 'Mass Layoffs' },
{ id: 'cpi-components', title: 'CPI Components' },
{ id: 'ppi-by-industry', title: 'PPI by Industry' },
{ id: 'eci', title: 'Employment Cost Index' },
{ id: 'real-earnings', title: 'Real Earnings' },
{ id: 'oecd-labor', title: 'OECD Labor Comparison' },
```

---

## Phase 3: Equities Tab — New Panels

### Current panels (8): Key Indices, Equity Heatmap, Market Summary, ML Explorer, Portfolio Tracker, Factor Radar, Universe Expansion Queue, SEC Fundamentals

### New panels to add:

| # | Panel | Data Source | What It Shows | Chart Type | Effort | Backend Changes |
|---|-------|-------------|---------------|------------|--------|-----------------|
| 1 | **SEC EDGAR Filing Activity** | SEC EDGAR API (#31) | Filing count by type (10-K, 10-Q, 8-K) — corporate disclosure pulse | Bar | Low | New route `server/routes/sec.js` |
| 2 | **SEC XBRL Aggregated** | SEC XBRL API (#33) | Aggregate revenue, net income, assets across all filers | Multi-line | Medium | Add to sec route |
| 3 | **World Bank Market Cap/GDP** | World Bank API (#160) | Stock market cap as % of GDP by country | Bar | Low | Add to globalMacro route, share with equities |
| 4 | **BIS Debt vs Equity** | BIS API (#128) | Equity vs debt securities issuance mix by country | Stacked bar | Medium | New BIS route or add to existing |
| 5 | **ECB Securities Issues** | ECB SDMX SEC (#58) | Euro-area equity/debt securities issuance | Bar | Medium | Add to ECB route |
| 6 | **Sector Concentration** | SEC 13F + XBRL | Herfindahl index by sector, top holdings concentration | Bar | Medium | Computed from SEC data |
| 7 | **IPO Activity** | SEC EDGAR (S-1 filings) | IPO count, proceeds by month | Bar | Medium | Filter EDGAR for S-1 filings |
| 8 | **Buyback Activity** | SEC XBRL | Share buyback expenditure by sector | Bar | Medium | XBRL concept `treasuryStockValue` |
| 9 | **Dividend Trends** | SEC XBRL | Dividend payments by sector, dividend yield trend | Multi-line | Medium | XBRL concept `commonStockDividendPerShare` |
| 10 | **Global Index Comparison** | Yahoo + ECB + BOJ + PBOC | Major world index performance (S&P, STOXX, NIKKEI, HSI, CSI 300) | Multi-line | Low | Already have index data, just new panel |
| 11 | **Sector Weight Drift** | SEC 13F | How sector weights in S&P 500 change over time | Stacked area | Medium | Computed from 13F data |
| 12 | **SEC Filing Deadlines** | SEC EDGAR calendar | Upcoming filing deadlines (10-Q, 10-K, 8-K) | Table | Low | Calendar data from SEC |

### Updated panel list for Equities tab:
```
{ id: 'kpi', title: 'Key Indices' },
{ id: 'heatmap', title: 'Equity Heatmap' },
{ id: 'summary', title: 'Market Summary' },
{ id: 'ml-explorer', title: 'ML Explorer' },
{ id: 'portfolio', title: 'Portfolio Tracker' },
{ id: 'radar', title: 'Factor Radar' },
{ id: 'universe-updates', title: 'Universe Expansion Queue' },
{ id: 'sec-fundamentals', title: 'SEC Fundamentals' },
{ id: 'sec-filings', title: 'SEC Filing Activity' },
{ id: 'sec-xbrl', title: 'SEC XBRL Aggregated' },
{ id: 'market-cap-gdp', title: 'Market Cap vs GDP' },
{ id: 'debt-vs-equity', title: 'Debt vs Equity Issuance' },
{ id: 'ecb-securities', title: 'Euro Area Securities' },
{ id: 'sector-concentration', title: 'Sector Concentration' },
{ id: 'ipo-activity', title: 'IPO Activity' },
{ id: 'buybacks', title: 'Buyback Activity' },
{ id: 'dividends', title: 'Dividend Trends' },
{ id: 'global-indices', title: 'Global Index Comparison' },
{ id: 'sector-drift', title: 'Sector Weight Drift' },
{ id: 'filing-deadlines', title: 'SEC Filing Deadlines' },
```

---

## Phase 4: Bonds Tab — New Panels

### Current panels (17): KPI, Yield Curve, Spread Monitor, Credit Spreads, Real Yields, Credit Ratings, Curve Spreads, Fed Balance Sheet, M2, CPI Components, Debt-to-GDP, Breakeven Inflation, Duration Ladder, Foreign Holders, Money Market, Treasury Auctions, Macro Indicators

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **ECB Yield Curves** | ECB SDMX IR + YC (#55, #61) | Multi-line (DE/FR/IT/ES vs US) | Medium |
| 2 | **BOJ JGB Curve** | BOJ Stat Search (#79) | Line (2y/5y/10y/20y/30y) | Medium |
| 3 | **UK Gilt Auction Monitor** | UK DMO (#78) | Bar + table (bid-to-cover, issuance) | Medium |
| 4 | **Global Central Bank Policy Rates** | BIS (#132) + ECB + BOE + BOJ | Horizontal bar (G20 ladder) | Low |
| 5 | **Treasury Avg Interest Cost** | Treasury Fiscal Data (#36) | Line (weighted-avg on marketable debt) | Low |
| 6 | **Sovereign CDS Proxy** | FRED + ECB | Area (peripheral EU yield spreads) | Low |
| 7 | **BIS International Debt Securities** | BIS (#128) | Stacked bar (by issuer country) | Medium |
| 8 | **Eurostat Govt Debt/Deficit** | Eurostat (#68) | Bar (EU country debt/GDP) | Low |
| 9 | **Treasury Cash Balance** | Treasury Fiscal Data (#40) | Line (daily TGA cash balance) | Low |
| 10 | **SOFR Rate + Volume** | FRED (SOFR, SOFRVOL) | Line (daily reference rate + volume) | Low |

---

## Phase 5: FX Tab — New Panels

### Current panels (8): KPI, FX Dashboard, Rate Matrix, Top Movers, DXY Tracker, Carry Map, Currency Correlation, REER Chart

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **Treasury Reporting Rates** | Treasury Fiscal Data (#37) | Table (150+ currencies vs USD) | Low |
| 2 | **ECB FX Reference Rates** | ECB SDMX EXR (#52) | Multi-line (EUR crosses) | Low |
| 3 | **BIS Effective Exchange Rates** | BIS (#133) | Multi-line (NEER/REER broad+narrow) | Low |
| 4 | **Bank of Canada Valet Rates** | BoC Valet (#94-95) | Line (CAD/USD + 30 crosses) | Low |
| 5 | **RBA AUD Exchange Rates** | RBA (#105) | Multi-line (AUD crosses) | Low |
| 6 | **BCB BRL Exchange Rates** | BCB SGS (#117) | Line (BRL/USD) | Low |
| 7 | **RBI INR Exchange Rates** | RBI (#112) | Line (INR crosses) | Low |
| 8 | **Triennial FX Turnover** | BIS (#138) | Bar (by instrument/currency pair) | Low |
| 9 | **IMF COFER** | IMF (#146) | Donut (reserve currency composition) | Low |
| 10 | **PBOC RMB Central Parity** | PBOC (#87) | Line (USD/CNY central parity) | Low |

---

## Phase 6: Derivatives Tab — New Panels

### Current panels (5): KPI, VIX Term Structure, Vol Surface, Options Flow, Gamma Exposure

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **BIS OTC Derivatives** | BIS (#129) | Bar (notional by risk category) | Medium |
| 2 | **BIS Exchange-Traded Derivatives** | BIS (#130) | Bar (ETD by asset class) | Medium |
| 3 | **CFTC Disaggregated COT** | CFTC (#29) | Multi-line (producer/swap/MM/other) | Low |
| 4 | **CFTC TFF (Financial Futures)** | CFTC (#30) | Multi-line (dealer/AM/leveraged) | Low |
| 5 | **ESMA MiFIR Instruments** | ESMA (#69) | Table (instrument counts by type) | Medium |
| 6 | **ECB Securities Issues** | ECB SEC (#58) | Stacked bar (debt + equity issuance) | Medium |
| 7 | **CFTC Swaps Report** | CFTC Swaps Report | Bar (IR swaps, CDS notional outstanding) | Medium |
| 8 | **OCC Bank Derivatives** | OCC Quarterly Report | Bar (top 5 banks by notional) | Medium |

---

## Phase 7: Real Estate Tab — New Panels

### Current panels (16): Key Metrics, Case-Shiller, REIT ETF, REIT Performance, Distress, Mortgage Rates, CRE Delinquencies, Cap Rates, Affordability, Supply & Demand, HUD Rental, Affordability Stack, Census Housing/Trade/Trends

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **FHFA House Price Index** | FHFA HPI (#46) | Multi-line (national/state/metro) | Low |
| 2 | **Census Building Permits** | Census (#16) | Bar (by region) | Low |
| 3 | **BIS Residential Property Prices** | BIS (#134) | Multi-line (50+ countries) | Medium |
| 4 | **BIS Debt Service Ratios** | BIS (#135) | Bar (household DSR cross-border) | Medium |
| 5 | **Census Housing Vacancies** | Census (#12) | Line (homeowner + rental vacancy) | Low |
| 6 | **Census Quarterly Workforce** | Census (#15) | Table (employment/wages by metro) | Medium |
| 7 | **World Bank Home Ownership** | World Bank | Bar (home ownership rate by country) | Low |
| 8 | **ECB Housing Market** | ECB SDMX | Euro-area house price indices | Multi-line | Medium |

---

## Phase 8: Insurance Tab — New Panels

### Current panels (13): KPI, HY OAS, Cat Losses, Combined Ratio, Combined Ratio by Line, Reinsurance, Reserves, Cat Bonds, Sector ETF, Catastrophes, Insurance Penetration, Combined Ratios (EDGAR), Cat Exposure

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **USGS Mineral Commodities** | USGS (#51) | Table (critical mineral production) | Low |
| 2 | **EIA Nuclear Outages** | EIA (#23) | Timeline/bar (grid insurance risk) | Low |
| 3 | **ECB Supervisory Banking** | ECB SSI (#59) | Table (EU bank capital/NPLs) | Medium |
| 4 | **FDIC Bank Failures** | FDIC (#44) | Table (failure history) | Low |
| 5 | **World Bank Financial Access** | IMF FAS (#144) | Bar (insurance penetration) | Low |
| 6 | **BIS Credit-to-GDP Gaps** | BIS (#136) | Line (credit cycle early warning) | Medium |
| 7 | **NOAA Climate Data** | NOAA | Natural disaster frequency by type | Bar | Medium |
| 8 | **OECD Insurance Statistics** | OECD | Insurance premium volume by country | Bar | Medium |

---

## Phase 9: Commodities Tab — New Panels

### Current panels (19): Market Summary, Prices, Futures Curve, Sector Performance, Supply & Demand, COT, Commodity FX, USDA Ag, Petroleum & NG, Curve Board, Strategic Materials Grid, Criticality, Battery, Precious Metals, Regime, Energy Stack, Material Detail, Exposure Matrix, Trade Balance

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **EIA Short-Term Energy Outlook** | EIA STEO (#22) | Multi-line (18mo projections) | Medium |
| 2 | **EIA Coal Production & Prices** | EIA Coal (#21) | Multi-line | Low |
| 3 | **EIA International Energy** | EIA International (#24) | Bar (by country) | Low |
| 4 | **EIA CO2 Emissions** | EIA (#26) | Stacked bar (by fuel/sector) | Low |
| 5 | **FAO Food Price Indices** | FAO (#181) | Multi-line (cereals/meat/dairy/sugar) | Low |
| 6 | **OPEC Oil Production** | OPEC (#184) | Bar (by member country) | Low |
| 7 | **IEA Oil Market Report** | IEA (#182) | Line (supply/demand balance) | Medium |
| 8 | **RBA Commodity Price Index** | RBA (#107) | Multi-line (bulk/base metals/rural) | Low |
| 9 | **BCB Commodity Index** | BCB (via #117) | Line | Low |
| 10 | **USGS Mineral Summaries** | USGS (#51) | Table (production, reserves, prices) | Low |
| 11 | **World Bank Commodity Prices** | World Bank (pink sheet) | Multi-line (46 commodity prices) | Low |

---

## Phase 10: Macro Tab — New Panels

### Current panels (6): KPI, Scorecard, Central Bank Rates, Debt Monitor, Growth & Inflation, Economic Activity

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **IMF World Economic Outlook** | IMF WEO (#139) | Table/bar (GDP/inflation forecasts) | Low |
| 2 | **IMF IFS Multi-Series** | IMF IFS (#140) | Multi-line (30K+ series) | Medium |
| 3 | **IMF Direction of Trade** | IMF DOTS (#142) | Sankey/bar (bilateral trade flows) | Medium |
| 4 | **World Bank WDI Scatter** | World Bank (#152) | Scatter (1400+ indicators) | Low |
| 5 | **OECD Economic Outlook** | OECD (#167) | Table (projections) | Low |
| 6 | **OECD Main Economic Indicators** | OECD MEI (#168) | Multi-line (confidence/leading) | Low |
| 7 | **UN Comtrade** | UN Comtrade (#177) | Table (global trade flows) | Medium |
| 8 | **ILO Labour Statistics** | ILO (#179) | Bar (employment/wages by country) | Low |
| 9 | **BIS Global Liquidity** | BIS (#137) | Multi-line (cross-border credit) | Medium |
| 10 | **BIS Credit-to-GDP Gaps** | BIS (#136) | Bar (40+ countries) | Medium |
| 11 | **World Bank External Debt** | World Bank (#156) | Bar | Low |
| 12 | **World Bank Real Interest Rates** | World Bank (#158) | Bar | Low |
| 13 | **China NBS Macro Dashboard** | NBS China (#89) | Multi-line (GDP/CPI/PPI/IP/PMI) | Medium |
| 14 | **Japan METI Industrial Production** | METI (#82) | Multi-line | Medium |
| 15 | **India MOSPI GDP/CPI** | MOSPI (#116) | Multi-line | Medium |
| 16 | **Brazil IBGE IPCA/INPC** | IBGE (#124) | Multi-line | Low |
| 17 | **Eurostat GDP** | Eurostat (#63) | Multi-line (EU country GDP) | Low |
| 18 | **ECB Balance of Payments** | ECB BOP (#56) | Multi-line (euro area BOP) | Low |
| 19 | **Treasury Monthly Statement** | Treasury Fiscal Data (#38) | Bar (revenue/spending/deficit) | Low |
| 20 | **US National Debt** | Treasury Fiscal Data (#35) | Line (debt to the penny) | Low |

---

## Phase 11: Equity+ Tab — New Panels

### Current panels (7): KPI, Sector Rotation, Factor Rankings, Earnings Watch, Short Interest, Insider Trading, Institutional Holdings

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **SEC EDGAR Filing Activity** | SEC EDGAR (#31) | Bar (filing count by type) | Low |
| 2 | **SEC XBRL Aggregated Facts** | SEC XBRL (#33) | Multi-line (revenue/income/assets) | Medium |
| 3 | **World Bank Market Cap/GDP** | World Bank (#160) | Bar (by country) | Low |
| 4 | **BIS Debt Securities** | BIS (#128) | Stacked bar (equity vs debt mix) | Medium |
| 5 | **ECB Securities Issues** | ECB SEC (#58) | Bar (euro-area issuance) | Medium |
| 6 | **SEC 13F Holdings** | SEC 13F Data Sets | Top institutional holdings changes | Table | Medium |
| 7 | **SEC Form D Offerings** | SEC Form D Data | Private placement activity | Bar | Medium |

---

## Phase 12: Crypto Tab — New Panels

### Current panels (6): KPI, Coin Market Overview, Fear & Greed, DeFi Chains, Funding & Positioning, On-Chain Metrics

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **World Bank Digital Indicators** | World Bank (#163) | Bar (internet users % — adoption proxy) | Low |
| 2 | **BIS Global Liquidity** | BIS (#137) | Line (macro driver for crypto) | Medium |
| 3 | **IMF COFER** | IMF (#146) | Donut (fiat vs crypto context) | Low |
| 4 | **ECB Monetary Aggregates** | ECB BSI (#54) | Line (CBDC context) | Low |
| 5 | **World Bank Remittances** | World Bank | Bar (remittance flows — stablecoin use case) | Low |
| 6 | **BIS CBDC Tracker** | BIS | Bar (CBDC projects by country/status) | Low |

---

## Phase 13: Credit Tab — New Panels

### Current panels (5): KPI, IG/HY Dashboard, EM Bonds, Loan Market, Default Watch

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **ECB Government Finance** | ECB GFS (#57) | Bar (EU debt/deficit by country) | Low |
| 2 | **Eurostat Govt Debt/Deficit** | Eurostat (#68) | Bar | Low |
| 3 | **BIS Total Credit** | BIS (#131) | Multi-line (by country) | Medium |
| 4 | **BIS Debt Service Ratios** | BIS (#135) | Bar (corporate + household) | Medium |
| 5 | **BIS International Debt Securities** | BIS (#128) | Stacked bar | Medium |
| 6 | **IMF Government Finance** | IMF GFS (#143) | Table | Medium |
| 7 | **World Bank External Debt** | World Bank (#156) | Bar | Low |
| 8 | **World Bank Bank Capital Ratio** | World Bank (#161) | Bar | Low |
| 9 | **FDIC Summary** | FDIC (#45) | Table (industry aggregates) | Low |
| 10 | **FDIC Institution Directory** | FDIC (#43) | Table (searchable bank directory) | Low |
| 11 | **ECB Supervisory Banking** | ECB SSI (#59) | Table (NPL ratios, capital) | Medium |
| 12 | **TED Spread** | FRED (TEDRATE) | Line (LIBOR - T-bill) | Low |

---

## Phase 14: Sentiment Tab — New Panels

### Current panels (6): KPI, Fear & Greed, CFTC Positioning, Risk Dashboard, Cross-Asset Returns, Correlation Matrix

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **Eurostat Business/Consumer Confidence** | Eurostat (#66) | Multi-line (EU surveys) | Low |
| 2 | **OECD Business Confidence** | OECD MEI (#168) | Multi-line (OECD countries) | Low |
| 3 | **BIS Central Bank Policy Rates** | BIS (#132) | Bar (hawkish/dovish count) | Low |
| 4 | **BIS Credit-to-GDP Gaps** | BIS (#136) | Line (early warning) | Medium |
| 5 | **FRED Series Search** | FRED Search (#2) | Table (trending series) | Low |
| 6 | **FRED Release Calendar** | FRED Releases (#4) | Table (upcoming releases) | Low |
| 7 | **ECB Financial Market Data** | ECB FM (#60) | Multi-line (stock indices, bond yields) | Low |
| 8 | **OECD Leading Indicators** | OECD MEI (#168) | Multi-line (CLI by country) | Low |
| 9 | **TGA Cash Balance** | Treasury Fiscal Data (#40) | Line (liquidity proxy) | Low |
| 10 | **VIX Futures Positioning** | CFTC TFF (#30) | Multi-line (who's long/short vol) | Low |

---

## Phase 15: Calendar Tab — New Panels

### Current panels (5): KPI, Economic Calendar, Central Bank Schedule, Earnings Season, Key Releases

### New panels:

| # | Panel | Data Source | Chart | Effort |
|---|-------|-------------|-------|--------|
| 1 | **FRED Release Calendar** | FRED Releases (#4) | Table (all FRED releases) | Low |
| 2 | **BLS Release Schedule** | BLS (#7) | Table (CPI/PPI/employment) | Low |
| 3 | **BEA Release Calendar** | BEA (#9) | Table (GDP/income/trade) | Low |
| 4 | **Census Release Schedule** | Census EITS (#11) | Table (retail/housing/durables) | Low |
| 5 | **EIA Weekly Petroleum Status** | EIA (#18) | Table | Low |
| 6 | **USDA WASDE Calendar** | USDA NASS (#47) | Table | Low |
| 7 | **ECB Policy Meeting Calendar** | ECB (#52-61) | Table | Low |
| 8 | **BOE MPC Meeting Calendar** | BOE (#74) | Table | Low |
| 9 | **IMF WEO Release Calendar** | IMF (#139) | Table | Low |
| 10 | **OPEC Meeting Calendar** | OPEC (#184) | Table | Low |
| 11 | **Treasury Auction Calendar** | Treasury Fiscal Data (#41) | Table | Low |
| 12 | **SEC Filing Deadline Calendar** | SEC EDGAR | Table (10-Q, 10-K, 8-K deadlines) | Low |

---

## Summary: All New Panels by Tab

| Tab | Current | New | Total |
|-----|---------|-----|-------|
| Energy (was EIA) | 3 | 8 | 11 |
| Labor (was BLS) | 2 | 14 | 16 |
| Equities | 8 | 12 | 20 |
| Bonds | 17 | 10 | 27 |
| FX | 8 | 10 | 18 |
| Derivatives | 5 | 8 | 13 |
| Real Estate | 16 | 8 | 24 |
| Insurance | 13 | 8 | 21 |
| Commodities | 19 | 11 | 30 |
| Macro | 6 | 20 | 26 |
| Equity+ | 7 | 7 | 14 |
| Crypto | 6 | 6 | 12 |
| Credit | 5 | 12 | 17 |
| Sentiment | 6 | 10 | 16 |
| Calendar | 5 | 12 | 17 |
| **Total** | **126** | **156** | **282** |

## Effort Distribution

| Effort | Count | Typical Work |
|--------|-------|-------------|
| **Low** | ~100 | Single-endpoint fetch, table/bar/line display, existing server pattern |
| **Medium** | ~56 | Multi-endpoint aggregation, SDMX parsing, cross-source joins, new server route |
| **High** | 0 | No proposals require new infrastructure |

## Implementation Order (Recommended)

1. **Phase 0** — Tab renaming (15 min, unblocks everything)
2. **Phases 1-2** — Energy + Labor panels (already have EIA/BLS routes, just add queries)
3. **Phases 4-5** — Bonds + FX (FRED + Treasury + ECB, low effort, high value)
4. **Phase 10** — Macro (IMF + World Bank + OECD, already have some patterns)
5. **Phase 13** — Credit (FDIC + BIS, mostly low effort)
6. **Phase 14** — Sentiment (Eurostat + OECD, low effort)
7. **Phase 15** — Calendar (all low effort, just release date tables)
8. **Phase 3** — Equities (SEC EDGAR/XBRL, medium effort, new route needed)
9. **Phases 6-9** — Derivatives + Real Estate + Insurance + Commodities (mix of low/medium)
10. **Phases 11-12** — Equity+ + Crypto (smallest scope)
