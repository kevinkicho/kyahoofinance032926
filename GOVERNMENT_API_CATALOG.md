# Government & Intergovernmental Free Data API Catalog
## Financial Markets, Economics & Derivatives

Compiled: June 2026

---

## Table of Contents
1. [United States](#1-united-states)
2. [European Union / Eurozone](#2-european-union--eurozone)
3. [United Kingdom](#3-united-kingdom)
4. [Japan](#4-japan)
5. [China](#5-china)
6. [Canada](#6-canada)
7. [Australia](#7-australia)
8. [India](#8-india)
9. [Brazil](#9-brazil)
10. [International Organizations](#10-international-organizations)

---

## 1. United States

### 1.1 Federal Reserve Economic Data (FRED) — St. Louis Fed
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 1 | `https://api.stlouisfed.org/fred/series/observations` | GDP, inflation, employment, interest rates, money supply, trade data — 800K+ series | Daily/Monthly/Quarterly/Annual | Yes (free) |
| 2 | `https://api.stlouisfed.org/fred/series/search` | Search FRED series by keyword | On-demand | Yes (free) |
| 3 | `https://api.stlouisfed.org/fred/category` | Get category metadata for series | On-demand | Yes (free) |
| 4 | `https://api.stlouisfed.org/fred/releases` | All economic data releases with dates | On-demand | Yes (free) |
| 5 | `https://api.stlouisfed.org/fred/tags` | Search/filter series by tags | On-demand | Yes (free) |
| 6 | `https://api.stlouisfed.org/fred/series/vintagedates` | Real-time vintage dates (revision history) | On-demand | Yes (free) |

### 1.2 Bureau of Labor Statistics (BLS)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 7 | `https://api.bls.gov/publicAPI/v2/timeseries/data/` | CPI, PPI, employment, unemployment, wages, productivity | Monthly/Quarterly | Yes (free, v2) |
| 8 | `https://api.bls.gov/publicAPI/v1/timeseries/data/` | Same data, v1 (lower limits, no key needed) | Monthly/Quarterly | No |

### 1.3 Bureau of Economic Analysis (BEA)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 9 | `https://apps.bea.gov/api/data` | GDP, NIPA tables, personal income, international trade, fixed assets | Quarterly/Annual | Yes (free) |
| 10 | `https://apps.bea.gov/api/data?&method=GETDATASETLIST` | List all available BEA datasets | On-demand | Yes (free) |

### 1.4 US Census Bureau
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 11 | `https://api.census.gov/data/timeseries/eits/` | Economic Indicators (retail, construction, housing, trade, services) | Monthly/Quarterly | Yes (free) |
| 12 | `https://api.census.gov/data/` | Decennial Census, ACS, population estimates, business patterns | Varies | Yes (free) |
| 13 | `https://api.census.gov/data/timeseries/intltrade/` | International trade data (imports/exports by commodity/country) | Monthly | Yes (free) |
| 14 | `https://api.census.gov/data/` | Economic Census (establishments, sales, payroll by industry) | Every 5 years | Yes (free) |
| 15 | `https://api.census.gov/data/` | Quarterly Workforce Indicators (employment, wages, hires) | Quarterly | Yes (free) |
| 16 | `https://api.census.gov/data/` | Building Permits Survey | Monthly | Yes (free) |
| 17 | `https://api.census.gov/data/` | Annual Survey of Manufactures | Annual | Yes (free) |

### 1.5 Energy Information Administration (EIA)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 18 | `https://api.eia.gov/v2/petroleum/pri/` | Petroleum prices (crude oil, gasoline, diesel, heating oil spot/futures) | Daily/Weekly/Monthly | Yes (free) |
| 19 | `https://api.eia.gov/v2/natural-gas/pri/` | Natural gas spot & futures prices, Henry Hub | Daily/Weekly/Monthly | Yes (free) |
| 20 | `https://api.eia.gov/v2/electricity/` | Electricity generation, sales, prices by sector/state | Monthly/Annual | Yes (free) |
| 21 | `https://api.eia.gov/v2/coal/` | Coal production, consumption, prices, exports/imports | Monthly/Annual | Yes (free) |
| 22 | `https://api.eia.gov/v2/steo/` | Short-Term Energy Outlook (18-month projections) | Monthly | Yes (free) |
| 23 | `https://api.eia.gov/v2/nuclear-outages/` | Nuclear plant generator outages (from NRC) | Daily | Yes (free) |
| 24 | `https://api.eia.gov/v2/international/` | International energy data by country | Annual | Yes (free) |
| 25 | `https://api.eia.gov/v2/seds/` | State Energy Data System (consumption, production, prices by state) | Annual | Yes (free) |
| 26 | `https://api.eia.gov/v2/co2-emissions/` | CO2 emissions by fuel, state, sector | Annual | Yes (free) |

### 1.6 Commodity Futures Trading Commission (CFTC)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 27 | `https://publicreporting.cftc.gov/resource/` | Commitments of Traders (COT) — legacy, disaggregated, financial futures | Weekly | No |
| 28 | `https://www.cftc.gov/dea/newcot/deafut.txt` | COT Legacy Futures-Only (comma delimited text) | Weekly | No |
| 29 | `https://www.cftc.gov/dea/newcot/c_disagg.txt` | COT Disaggregated Futures+Options (comma delimited) | Weekly | No |
| 30 | `https://www.cftc.gov/dea/newcot/FinFutWk.txt` | Traders in Financial Futures (TFF) — currencies, treasuries, equities | Weekly | No |

### 1.7 Securities and Exchange Commission (SEC)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 31 | `https://data.sec.gov/submissions/CIK##########.json` | EDGAR filing history for any company (by CIK) | Real-time | No |
| 32 | `https://data.sec.gov/api/xbrl/companyfacts/CIK##########.json` | XBRL financial statement data (10-Q, 10-K, 8-K) | Quarterly/Annual | No |
| 33 | `https://data.sec.gov/api/xbrl/frames/us-gaap/...` | Aggregated XBRL facts across all filers (by concept/period) | Quarterly/Annual | No |
| 34 | `https://www.sec.gov/Archives/edgar/daily-index/xbrl/companyfacts.zip` | Bulk XBRL data (all companies, nightly) | Daily (bulk) | No |

### 1.8 US Treasury — Fiscal Data
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 35 | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny` | US national debt to the penny | Daily | No |
| 36 | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/avg_interest_rates` | Average interest rates on US Treasury securities | Monthly | No |
| 37 | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/od/rates_of_exchange` | Treasury reporting rates of exchange (150+ currencies) | Monthly/Quarterly | No |
| 38 | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_1` | Monthly Treasury Statement — revenue, spending, deficit | Monthly | No |
| 39 | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/debt/tror` | Treasury Report on Receivables | Quarterly | No |
| 40 | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/dts/deposits_withdrawals_operating_cash` | Daily Treasury Statement — cash operations | Daily | No |
| 41 | `https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/auctions_query` | Treasury security auction results | Weekly | No |

### 1.9 Federal Deposit Insurance Corporation (FDIC)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 42 | `https://banks.data.fdic.gov/api/` | Bank financial reports (Call Reports), balance sheets, income | Quarterly | No |
| 43 | `https://banks.data.fdic.gov/api/Institution` | Institution directory — all FDIC-insured banks | Quarterly | No |
| 44 | `https://banks.data.fdic.gov/api/Failures` | Bank failure and assistance data | As needed | No |
| 45 | `https://banks.data.fdic.gov/api/Summary` | Aggregate banking industry statistics | Quarterly | No |

### 1.10 Federal Housing Finance Agency (FHFA)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 46 | `https://www.fhfa.gov/Data/Data-API` | House Price Index (HPI) — national, state, metro | Monthly/Quarterly | No |

### 1.11 USDA — National Agricultural Statistics Service (NASS)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 47 | `https://quickstats.nass.usda.gov/api/` | Crop production, livestock, prices, stocks, acreage | Monthly/Quarterly/Annual | Yes (free) |
| 48 | `https://apps.fas.usda.gov/export-sales/` | Agricultural export sales data | Weekly | No |

### 1.12 Bureau of Transportation Statistics (BTS)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 49 | `https://www.bts.gov/transborder` | Transborder freight data (US-Canada, US-Mexico trade by mode) | Monthly | No |

### 1.13 US Geological Survey (USGS)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 50 | `https://earthquake.usgs.gov/fdsnws/event/1/query` | Earthquake data (relevant to commodity/insurance risk) | Real-time | No |
| 51 | `https://minerals.usgs.gov/minerals/` | Mineral commodity summaries (production, prices, reserves) | Annual | No |

---

## 2. European Union / Eurozone

### 2.1 European Central Bank (ECB) — SDMX API
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 52 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/EXR/` | Euro foreign exchange reference rates (USD, JPY, GBP, CNY, etc.) | Daily | No |
| 53 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/ICP/` | Harmonised Index of Consumer Prices (HICP) — inflation | Monthly | No |
| 54 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/BSI/` | Monetary aggregates (M1, M2, M3), bank lending, deposits | Monthly | No |
| 55 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/IR/` | Interest rates — ECB policy rates, Euribor, government bond yields | Daily/Monthly | No |
| 56 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/BOP/` | Balance of payments — euro area | Monthly/Quarterly | No |
| 57 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/GFS/` | Government finance statistics — debt, deficit | Quarterly/Annual | No |
| 58 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/SEC/` | Securities issues statistics (debt, equity) | Quarterly | No |
| 59 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/SSI/` | Supervisory banking data (capital ratios, NPLs, profitability) | Quarterly | No |
| 60 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/FM/` | Financial market data — stock indices, bond yields, swaps | Daily | No |
| 61 | `https://data.ecb.europa.eu/api/sdmx/2.1/data/YC/` | Euro area yield curves (spot, forward, par) | Daily | No |

### 2.2 Eurostat
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 62 | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/` | GDP, employment, trade, industry, prices — all EU countries | Monthly/Quarterly/Annual | No |
| 63 | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/nama_10_gdp` | GDP and main components (by country) | Quarterly/Annual | No |
| 64 | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/prc_hicp_manr` | HICP — monthly inflation rates by country | Monthly | No |
| 65 | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/une_rt_m` | Unemployment rates by country | Monthly | No |
| 66 | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ei_bsco_m` | Business and consumer confidence surveys | Monthly | No |
| 67 | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/sts_10_mr` | Industrial production, turnover, orders | Monthly | No |
| 68 | `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/gov_10dd_edpt1` | Government debt and deficit by country | Quarterly/Annual | No |

### 2.3 European Securities and Markets Authority (ESMA)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 69 | `https://registers.esma.europa.eu/` | Financial instruments reference data (MiFIR/MiFID II) | Daily | No |

### 2.4 European Banking Authority (EBA)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 70 | `https://www.eba.europa.eu/risk-analysis-and-data` | EU banking stress test data, risk indicators, transparency | Quarterly/Annual | No |

### 2.5 Deutsche Bundesbank
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 71 | `https://www.bundesbank.de/dynamic/statistics/api/` | German bond yields, money market rates, exchange rates | Daily/Monthly | No |
| 72 | `https://www.bundesbank.de/statistics/time-series-databases` | German GDP, inflation, trade, banking data | Monthly/Quarterly/Annual | No |

### 2.6 Banque de France
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 73 | `https://webstat.banque-france.fr/api/` | French interest rates, exchange rates, monetary aggregates | Daily/Monthly | No |

---

## 3. United Kingdom

### 3.1 Bank of England
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 74 | `https://www.bankofengland.co.uk/boeapps/database/` | Bank Rate, gilt yields, inflation, money supply, credit | Daily/Monthly | No |
| 75 | `https://www.bankofengland.co.uk/boeapps/database/fromshowcolumns.asp` | UK GDP, employment, trade, public sector finances | Monthly/Quarterly | No |
| 76 | `https://www.bankofengland.co.uk/statistics/` | Sterling monetary aggregates (M4), bank lending | Monthly | No |

### 3.2 UK Office for National Statistics (ONS)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 77 | `https://api.ons.gov.uk/timeseries/` | UK GDP, CPI, RPI, employment, trade, production | Monthly/Quarterly | No |

### 3.3 UK Debt Management Office (DMO)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 78 | `https://www.dmo.gov.uk/data/` | UK gilt auction results, debt issuance | Weekly/Monthly | No |

---

## 4. Japan

### 4.1 Bank of Japan (BOJ)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 79 | `https://www.stat-search.boj.or.jp/` | BOJ policy rate, money market rates, JGB yields, monetary base | Daily/Monthly | No |
| 80 | `https://www.stat-search.boj.or.jp/ssi/cgi-bin/famecgi2?cgi=graph` | Corporate goods price index (CGPI), CPI | Monthly | No |
| 81 | `https://www.boj.or.jp/en/statistics/` | Money supply (M2, M3), bank lending, balance of payments | Monthly | No |

### 4.2 Ministry of Economy, Trade and Industry (METI)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 82 | `https://www.meti.go.jp/english/statistics/` | Industrial production, tertiary industry activity, machinery orders | Monthly | No |

### 4.3 Ministry of Finance (MOF) Japan
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 83 | `https://www.mof.go.jp/english/statistics/` | Trade statistics (exports/imports), balance of payments | Monthly | No |
| 84 | `https://www.mof.go.jp/english/policy/jgbs/` | JGB auction results, government debt | Monthly/Quarterly | No |

### 4.4 Statistics Bureau of Japan
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 85 | `https://www.stat.go.jp/english/data/` | CPI, labour force, population, family income/expenditure | Monthly/Quarterly | No |

---

## 5. China

### 5.1 People's Bank of China (PBOC)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 86 | `https://www.pbc.gov.cn/en/` | PBOC policy rates, reserve requirements, money supply (M2) | Monthly | No |
| 87 | `https://www.pbc.gov.cn/en/` | RMB exchange rate (central parity), foreign reserves | Daily/Monthly | No |
| 88 | `https://www.pbc.gov.cn/en/` | Aggregate financing to the real economy (AFRE), loan data | Monthly | No |

### 5.2 National Bureau of Statistics (NBS) China
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 89 | `https://data.stats.gov.cn/english/` | GDP, CPI, PPI, industrial production, retail sales, PMI | Monthly/Quarterly/Annual | No |
| 90 | `https://data.stats.gov.cn/english/` | Fixed asset investment, real estate development, trade | Monthly | No |

### 5.3 State Administration of Foreign Exchange (SAFE)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 91 | `https://www.safe.gov.cn/en/` | China foreign exchange reserves, balance of payments | Monthly/Quarterly | No |
| 92 | `https://www.safe.gov.cn/en/` | External debt, cross-border capital flows | Quarterly | No |

### 5.4 National Development and Reform Commission (NDRC)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 93 | `https://en.ndrc.gov.cn/` | Macroeconomic data, price monitoring, fixed asset investment | Monthly/Annual | No |

---

## 6. Canada

### 6.1 Bank of Canada — Valet API
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 94 | `https://www.bankofcanada.ca/valet/observations/FXCADUSD/json` | Daily CAD/USD exchange rate | Daily | No |
| 95 | `https://www.bankofcanada.ca/valet/observations/` | All daily exchange rates (30+ currency pairs) | Daily | No |
| 96 | `https://www.bankofcanada.ca/valet/observations/AVG.INTWO/json` | Money market yields (T-bills, commercial paper) | Daily | No |
| 97 | `https://www.bankofcanada.ca/valet/observations/V39062/json` | Canadian bond yields (2yr, 5yr, 10yr, 30yr) | Daily | No |
| 98 | `https://www.bankofcanada.ca/valet/observations/CPI_TRIM,CPI_MEDIAN,CPI_COMMON/json` | Core inflation measures (trim, median, common) | Monthly | No |
| 99 | `https://www.bankofcanada.ca/valet/observations/V41690973/json` | Bank of Canada policy interest rate | 8x/year | No |
| 100 | `https://www.bankofcanada.ca/valet/observations/V39079/json` | Canadian effective exchange rate (CEER) | Monthly | No |
| 101 | `https://www.bankofcanada.ca/valet/observations/V36726/json` | Commodity price index (BCPI) | Monthly | No |

### 6.2 Statistics Canada
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 102 | `https://www150.statcan.gc.ca/t1/tbl1/en/sbv.action` | GDP, CPI, employment, trade, retail sales, manufacturing | Monthly/Quarterly | No |
| 103 | `https://www150.statcan.gc.ca/n1/en/type/data` | Full StatCan data tables via API | Varies | No |

---

## 7. Australia

### 7.1 Reserve Bank of Australia (RBA)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 104 | `https://www.rba.gov.au/statistics/tables/` | Cash rate target, bond yields, exchange rates | Daily/Monthly | No |
| 105 | `https://www.rba.gov.au/statistics/frequency/exchange-rates.html` | AUD exchange rates (USD, JPY, EUR, GBP, CNY, etc.) | Daily | No |
| 106 | `https://www.rba.gov.au/statistics/frequency/fin-agg/` | Financial aggregates (money supply, credit) | Monthly | No |
| 107 | `https://www.rba.gov.au/statistics/frequency/commodity-prices/` | Index of commodity prices (bulk, base metals, rural) | Monthly | No |
| 108 | `https://www.rba.gov.au/statistics/balance-sheet/` | RBA balance sheet | Weekly | No |

### 7.2 Australian Bureau of Statistics (ABS)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 109 | `https://api.data.abs.gov.au/` | GDP, CPI, employment, trade, building approvals | Monthly/Quarterly | No |
| 110 | `https://www.abs.gov.au/statistics/economy/price-indexes-and-inflation` | Consumer Price Index (CPI) | Monthly/Quarterly | No |

---

## 8. India

### 8.1 Reserve Bank of India (RBI)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 111 | `https://data.rbi.org.in/` | RBI policy rates, money supply, bank credit, inflation | Weekly/Monthly | No |
| 112 | `https://data.rbi.org.in/` | Exchange rates (INR vs major currencies) | Daily | No |
| 113 | `https://data.rbi.org.in/` | Foreign exchange reserves, balance of payments | Weekly/Monthly | No |
| 114 | `https://data.rbi.org.in/` | Government securities yields, call money rates | Daily | No |
| 115 | `https://data.rbi.org.in/` | Industrial production index (IIP) | Monthly | No |

### 8.2 Ministry of Statistics and Programme Implementation (MOSPI)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 116 | `https://www.mospi.gov.in/` | GDP, CPI, WPI, employment, consumer expenditure | Monthly/Quarterly/Annual | No |

---

## 9. Brazil

### 9.1 Banco Central do Brasil (BCB)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 117 | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados` | Selic rate, CDI, exchange rates (BRL/USD, EUR, etc.) | Daily | No |
| 118 | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados` | IPCA (Brazilian CPI) | Monthly | No |
| 119 | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados` | Selic target rate | As announced | No |
| 120 | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.10813/dados` | Brazilian government bond yields | Daily | No |
| 121 | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.24364/dados` | Foreign exchange reserves | Daily | No |
| 122 | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.2076/dados` | Industrial production | Monthly | No |
| 123 | `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados` | Money supply (M1, M2, M3, M4) | Monthly | No |

### 9.2 Instituto Brasileiro de Geografia e Estatística (IBGE)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 124 | `https://servicodados.ibge.gov.br/api/v3/` | IPCA, INPC, PNAD (employment), GDP | Monthly/Quarterly | No |

---

## 10. International Organizations

### 10.1 Bank for International Settlements (BIS)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 125 | `https://stats.bis.org/api/v2/` | BIS statistics API — banking, debt, derivatives, credit | Quarterly | No |
| 126 | `https://stats.bis.org/statx/srs/` | Locational banking statistics (cross-border bank claims) | Quarterly | No |
| 127 | `https://stats.bis.org/statx/srs/` | Consolidated banking statistics (bank exposures by country) | Quarterly | No |
| 128 | `https://stats.bis.org/statx/srs/` | International debt securities | Quarterly | No |
| 129 | `https://stats.bis.org/statx/srs/` | OTC derivatives statistics (notional amounts, gross market values) | Semi-annual | No |
| 130 | `https://stats.bis.org/statx/srs/` | Exchange-traded derivatives statistics | Quarterly | No |
| 131 | `https://stats.bis.org/statx/srs/` | Credit to the non-financial sector (total credit) | Quarterly | No |
| 132 | `https://stats.bis.org/statx/srs/` | Central bank policy rates | Monthly | No |
| 133 | `https://stats.bis.org/statx/srs/` | Effective exchange rates (broad, narrow indices) | Monthly | No |
| 134 | `https://stats.bis.org/statx/srs/` | Residential property prices (selected countries) | Quarterly | No |
| 135 | `https://stats.bis.org/statx/srs/` | Debt service ratios (DSR) for households and corporates | Quarterly | No |
| 136 | `https://stats.bis.org/statx/srs/` | Credit-to-GDP gaps | Quarterly | No |
| 137 | `https://stats.bis.org/statx/srs/` | Global liquidity indicators | Quarterly | No |
| 138 | `https://stats.bis.org/statx/srs/` | Triennial Central Bank Survey (FX turnover, OTC derivatives) | Every 3 years | No |

### 10.2 International Monetary Fund (IMF)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 139 | `https://www.imf.org/external/datamapper/api/v1/` | World Economic Outlook (GDP, inflation, unemployment, debt) | Semi-annual | No |
| 140 | `https://data.imf.org/api/` | International Financial Statistics (IFS) — 30K+ series | Monthly/Quarterly | No |
| 141 | `https://data.imf.org/api/` | Balance of Payments (BOP) statistics | Quarterly/Annual | No |
| 142 | `https://data.imf.org/api/` | Direction of Trade Statistics (DOTS) | Monthly/Quarterly | No |
| 143 | `https://data.imf.org/api/` | Government Finance Statistics (GFS) | Annual | No |
| 144 | `https://data.imf.org/api/` | Financial Access Survey (FAS) | Annual | No |
| 145 | `https://data.imf.org/api/` | Consumer Price Index (CPI) data | Monthly | No |
| 146 | `https://data.imf.org/api/` | Currency Composition of Official FX Reserves (COFER) | Quarterly | No |
| 147 | `https://data.imf.org/api/` | Coordinated Portfolio Investment Survey (CPIS) | Semi-annual | No |
| 148 | `https://data.imf.org/api/` | Coordinated Direct Investment Survey (CDIS) | Annual | No |
| 149 | `https://www.imf.org/external/np/fin/data/rms_sdrv.aspx` | SDR valuation and exchange rates | Daily | No |
| 150 | `https://www.imf.org/en/Publications/SPROLLS/world-economic-outlook-databases` | World Economic Outlook database (full historical) | Semi-annual | No |
| 151 | `https://www.imf.org/en/Publications/SPROLLS/global-financial-stability-report` | Global Financial Stability Report data | Semi-annual | No |

### 10.3 World Bank
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 152 | `https://api.worldbank.org/v2/country/all/indicator/` | World Development Indicators (WDI) — 1400+ indicators | Annual | No |
| 153 | `https://api.worldbank.org/v2/country/all/indicator/NY.GDP.MKTP.CD` | GDP (current USD) for all countries | Annual | No |
| 154 | `https://api.worldbank.org/v2/country/all/indicator/FP.CPI.TOTL.ZG` | Consumer price inflation (annual %) for all countries | Annual | No |
| 155 | `https://api.worldbank.org/v2/country/all/indicator/BN.CAB.XOKA.GD.ZS` | Current account balance (% of GDP) | Annual | No |
| 156 | `https://api.worldbank.org/v2/country/all/indicator/DT.DOD.DECT.CD` | External debt stocks | Annual | No |
| 157 | `https://api.worldbank.org/v2/country/all/indicator/GC.DOD.TOTL.GD.ZS` | Central government debt (% of GDP) | Annual | No |
| 158 | `https://api.worldbank.org/v2/country/all/indicator/FR.INR.RINR` | Real interest rate (%) | Annual | No |
| 159 | `https://api.worldbank.org/v2/country/all/indicator/NY.GSR.NFCW.CD` | Gross savings | Annual | No |
| 160 | `https://api.worldbank.org/v2/country/all/indicator/CM.MKT.LCAP.GD.ZS` | Market capitalization of listed companies (% of GDP) | Annual | No |
| 161 | `https://api.worldbank.org/v2/country/all/indicator/FB.BNK.CAPA.ZS` | Bank capital to assets ratio | Annual | No |
| 162 | `https://api.worldbank.org/v2/country/all/indicator/PA.NUS.FCRF` | Official exchange rate (LCU per USD, period average) | Annual | No |
| 163 | `https://api.worldbank.org/v2/country/all/indicator/IT.NET.USER.ZS` | Individuals using the Internet (% of population) | Annual | No |
| 164 | `https://api.worldbank.org/v2/country/all/indicator/SL.UEM.TOTL.ZS` | Unemployment (% of total labor force) | Annual | No |
| 165 | `https://datacatalogapi.worldbank.org/` | World Bank Data Catalog API | On-demand | No |

### 10.4 Organisation for Economic Co-operation and Development (OECD)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 166 | `https://sdmx.oecd.org/public/rest/data/` | OECD.Stat — GDP, inflation, employment, trade, productivity | Monthly/Quarterly/Annual | No |
| 167 | `https://sdmx.oecd.org/public/rest/data/OECD.ECO.MAD,DSD_EO@...` | Economic Outlook (projections for GDP, inflation, unemployment) | Semi-annual | No |
| 168 | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_MEI@...` | Main Economic Indicators (MEI) — leading indicators, business confidence | Monthly | No |
| 169 | `https://sdmx.oecd.org/public/rest/data/OECD.ELS.EMP,DSD_LFS@...` | Labour Force Statistics — employment, unemployment | Monthly/Quarterly | No |
| 170 | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.NAD,DSD_NAMAIN1@...` | National Accounts — GDP components, investment, savings | Quarterly/Annual | No |
| 171 | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.CPI,DSD_PRICES@...` | Consumer Price Index (CPI) — all OECD countries | Monthly | No |
| 172 | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.FIN,DSD_FINSTAT@...` | Financial statistics — interest rates, exchange rates, stock markets | Monthly | No |
| 173 | `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TP,DSD_TRADE@...` | International trade statistics | Monthly | No |
| 174 | `https://sdmx.oecd.org/public/rest/data/OECD.ECO.CBA,DSD_NAAG@...` | Agricultural policy indicators | Annual | No |
| 175 | `https://sdmx.oecd.org/public/rest/data/OECD.ENV.EPI,DSD_EPI@...` | Environmental policy indicators | Annual | No |

### 10.5 United Nations
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 176 | `https://unstats.un.org/SDGAPI/v1/sdg/` | UN Sustainable Development Goals (SDG) indicators | Annual | No |
| 177 | `https://comtrade.un.org/api/` | UN Comtrade — international trade statistics (6M+ records) | Monthly/Annual | No |
| 178 | `https://data.un.org/ws/rest/data/` | UN Data API — national accounts, energy, industry, population | Annual | No |

### 10.6 International Labour Organization (ILO)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 179 | `https://www.ilo.org/ilostat/` | ILOSTAT — employment, unemployment, wages, labour costs | Monthly/Quarterly/Annual | No |

### 10.7 Food and Agriculture Organization (FAO)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 180 | `https://fenixservices.fao.org/faostat/api/v1/` | FAOSTAT — food prices, production, trade, food security | Monthly/Annual | No |
| 181 | `https://fenixservices.fao.org/faostat/api/v1/en/QAQ` | Food price indices, agricultural commodity prices | Monthly | No |

### 10.8 International Energy Agency (IEA)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 182 | `https://api.iea.org/` | Oil market report, energy statistics, renewables, CO2 | Monthly/Annual | Yes (free) |
| 183 | `https://www.iea.org/data-and-statistics` | Energy balances, prices, emissions by country | Annual | No |

### 10.9 Organization of the Petroleum Exporting Countries (OPEC)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 184 | `https://asb.opec.org/` | OPEC oil production, prices, reserves | Monthly/Annual | No |
| 185 | `https://www.opec.org/opec_web/en/data_publications/335.htm` | Monthly Oil Market Report (MOMR) data | Monthly | No |

### 10.10 Institute of International Finance (IIF)
| # | Endpoint / Base URL | Description | Frequency | API Key? |
|---|---------------------|-------------|-----------|----------|
| 186 | `https://www.iif.com/Research/Capital-Flows-and-Asset-Allocation` | Capital flows to emerging markets, global debt monitor | Monthly | No |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| United States | 51 |
| EU / Eurozone | 22 |
| United Kingdom | 5 |
| Japan | 7 |
| China | 8 |
| Canada | 10 |
| Australia | 7 |
| India | 6 |
| Brazil | 8 |
| International Organizations | 62 |
| **Total** | **186** |

### Key Notes
- **API Key Required**: ~20% of endpoints (mostly US agencies: FRED, BLS, BEA, Census, EIA, USDA). All keys are free.
- **No API Key Required**: ~80% of endpoints (ECB, BIS, IMF, World Bank, OECD, Bank of Canada, RBA, etc.)
- **Derivatives-specific**: CFTC COT (futures/options positions), BIS OTC/exchange-traded derivatives, ESMA MiFIR data
- **Exchange Rates**: Treasury (150+ currencies), ECB (EUR crosses), Bank of Canada, RBA, RBI, BCB, IMF SDR
- **Interest Rates**: FRED, ECB, BOE, BOJ, PBOC, Bank of Canada, RBA, RBI, BCB, BIS
- **Best for bulk/macro**: FRED (800K+ series), World Bank (1400+ indicators), IMF IFS, OECD.Stat
