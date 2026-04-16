import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './MetricValue.css';

const FRED_BASE = 'https://fred.stlouisfed.org/series';
const FRED_API_BASE = '/api/fred/observations';

function formatTimestampUTC(ts) {
  if (!ts) return null;
  const d = new Date(ts.replace ? ts.replace(' ', 'T') : ts);
  if (isNaN(d.getTime())) return ts;
  const offsetMin = -d.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const tz = `UTC${sign}${String(absH).padStart(2, '0')}:${String(absM).padStart(2, '0')}`;
  const utc = d.toISOString().replace('T', ' ').replace(/\.\d+Z$/, '') + ' UTC';
  return { utc, tz, local: ts };
}

const SERIES_MAP = {
  '3m': { id: 'DGS3MO', source: 'FRED', name: '3-Month Treasury Bill' },
  '6m': { id: 'DGS6MO', source: 'FRED', name: '6-Month Treasury Bill' },
  '1y': { id: 'DGS1', source: 'FRED', name: '1-Year Treasury' },
  '2y': { id: 'DGS2', source: 'FRED', name: '2-Year Treasury' },
  '5y': { id: 'DGS5', source: 'FRED', name: '5-Year Treasury' },
  '7y': { id: 'DGS7', source: 'FRED', name: '7-Year Treasury' },
  '10y': { id: 'DGS10', source: 'FRED', name: '10-Year Treasury' },
  '20y': { id: 'DGS20', source: 'FRED', name: '20-Year Treasury' },
  '30y': { id: 'DGS30', source: 'FRED', name: '30-Year Treasury' },
  't10y2y': { id: 'T10Y2Y', source: 'FRED', name: '10Y-2Y Spread' },
  't10y3m': { id: 'T10Y3M', source: 'FRED', name: '10Y-3M Spread' },
  't5yie': { id: 'T5YIE', source: 'FRED', name: '5Y Breakeven Inflation' },
  't10yie': { id: 'T10YIE', source: 'FRED', name: '10Y Breakeven Inflation' },
  'dfii10': { id: 'DFII10', source: 'FRED', name: '10Y TIPS Real Yield' },
  'tips5y': { id: 'DFII5', source: 'FRED', name: '5Y TIPS Real Yield' },
  'tips10y': { id: 'DFII10', source: 'FRED', name: '10Y TIPS Real Yield' },
  'tips30y': { id: 'DFII30', source: 'FRED', name: '30Y TIPS Real Yield' },
  'fedBalanceSheet': { id: 'WALCL', source: 'FRED', name: 'Fed Balance Sheet' },
  'm2': { id: 'M2SL', source: 'FRED', name: 'M2 Money Supply' },
  'federalDebt': { id: 'GFDEBTN', source: 'FRED', name: 'Federal Debt' },
  'surplusDeficit': { id: 'FYFSD', source: 'FRED', name: 'Federal Surplus/Deficit' },
  'unemployment': { id: 'UNRATE', source: 'FRED', name: 'Unemployment Rate' },
  'laborParticipation': { id: 'CIVPART', source: 'FRED', name: 'Labor Participation Rate' },
  'gdp': { id: 'GDP', source: 'FRED', name: 'GDP Growth Rate' },
  'pce': { id: 'PCEPI', source: 'FRED', name: 'PCE Inflation' },
  'tb3ms': { id: 'TB3MS', source: 'FRED', name: '3-Month T-Bill Secondary Market' },
  'creditRatings': { id: '/api/bonds', source: 'S&P / Moody\'s / Fitch', name: 'Sovereign Credit Ratings', url: '/api/bonds' },
  'creditAaaAa': { id: '/api/bonds', source: 'S&P / Moody\'s / Fitch', name: 'AAA/AA Rated Count', url: '/api/bonds' },
  'creditInvGrade': { id: '/api/bonds', source: 'S&P / Moody\'s / Fitch', name: 'Investment Grade Count', url: '/api/bonds' },
  'debtToGdp': { id: 'GFDEBTN/GDP', source: 'FRED', name: 'Debt-to-GDP Ratio' },
  'cpiAll': { id: 'CPIAUCSL', source: 'FRED', name: 'CPI All Items' },
  'cpiCore': { id: 'CPILFESL', source: 'FRED', name: 'CPI Core (Less Food & Energy)' },
  'fxEUR': { id: 'DEXUSEU', source: 'FRED', name: 'EUR/USD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxJPY': { id: 'DEXJPUS', source: 'FRED', name: 'USD/JPY Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxGBP': { id: 'DEXUSUK', source: 'FRED', name: 'GBP/USD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxCHF': { id: 'DEXSZUS', source: 'FRED', name: 'USD/CHF Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxAUD': { id: 'DEXALUS', source: 'FRED', name: 'AUD/USD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'fxCAD': { id: 'DEXCAUS', source: 'FRED', name: 'USD/CAD Exchange Rate', url: 'https://api.frankfurter.dev/v1/latest?base=USD' },
  'dxy': { id: 'DTWEXBGS', source: 'FRED', name: 'Trade Weighted U.S. Dollar Index', url: '/api/fx' },
  'vix': { id: 'VIXCLS', source: 'FRED', name: 'CBOE Volatility Index (VIX)' },
  'vvix': { id: 'VIXCLS', source: 'CBOE', name: 'VVIX (VIX of VIX)', url: '/api/derivatives' },
  'skew': { id: 'SKEW', source: 'FRED', name: 'CBOE SKEW Index' },
  'putCallRatio': { id: 'CBOE', source: 'CBOE', name: 'CBOE Put/Call Ratio', url: '/api/derivatives' },
  'caseShiller': { id: 'CSUSHPISA', source: 'FRED', name: 'Case-Shiller National Home Price Index' },
  'mortgage30y': { id: 'MORTGAGE30US', source: 'FRED', name: '30-Year Fixed Mortgage Rate' },
  'mortgage15y': { id: 'MORTGAGE15US', source: 'FRED', name: '15-Year Fixed Mortgage Rate' },
  'housingStarts': { id: 'HOUST', source: 'FRED', name: 'Housing Starts' },
  'homeownershipRate': { id: 'RSAHORUSQ156S', source: 'FRED', name: 'Homeownership Rate' },
  'rentalVacancy': { id: 'RRVRUSQ156N', source: 'FRED', name: 'Rental Vacancy Rate' },
  'existingHomeSales': { id: 'EXHOSLUSM495S', source: 'FRED', name: 'Existing Home Sales' },
  'hyOAS': { id: 'BAMLH0A0HYM2', source: 'FRED', name: 'ICE BofA US High Yield OAS' },
  'igOAS': { id: 'BAMLC0A0CM', source: 'FRED', name: 'ICE BofA US Corporate IG OAS' },
  'emOAS': { id: 'BAMLEMCBPIOAS', source: 'FRED', name: 'ICE BofA EM Sovereign OAS' },
  'delinquencyRate': { id: 'DRSFRWBS', source: 'FRED', name: 'Delinquency Rate on Business Loans' },
  'commercialPaper': { id: 'CPN3M', source: 'FRED', name: '3-Month Commercial Paper Rate' },
  'excessReserves': { id: 'EXCSRESNW', source: 'FRED', name: 'Excess Reserves of Depository Institutions' },
  'fearGreed': { id: 'FNFEAR', source: 'Alternative.me', name: 'Crypto Fear & Greed Index', url: 'https://api.alternative.me/fng/?limit=1' },
  'marginDebt': { id: 'ANEDBI', source: 'FRED', name: 'Margin Debt (Debit Balances)' },
  'consumerCredit': { id: 'TOTALSL', source: 'FRED', name: 'Total Consumer Credit Outstanding' },
  'financialStressIndex': { id: 'STLFSI4', source: 'FRED', name: 'St. Louis Financial Stress Index' },
  'gold': { id: 'GOLDAMGBD228NLBM', source: 'FRED', name: 'Gold Fixing Price (London)' },
  'wti': { id: 'POILWTIUSDM', source: 'FRED', name: 'Crude Oil WTI Price' },
  'brent': { id: 'POILBREUSDM', source: 'FRED', name: 'Crude Oil Brent Price' },
  'natgas': { id: 'PNGASUSUSDM', source: 'FRED', name: 'Henry Hub Natural Gas Price' },
  'silver': { id: 'SLVPRUSD', source: 'FRED', name: 'Silver Price' },
  'copper': { id: 'PCOPPUSDM', source: 'FRED', name: 'Copper Price' },
  'cotCommodities': { id: 'CFTC', source: 'CFTC', name: 'CFTC Commitments of Traders', url: '/api/commodities' },
  'fedFunds': { id: 'FEDFUNDS', source: 'FRED', name: 'Federal Funds Effective Rate' },
  'spPE': { id: 'SP500', source: 'FRED', name: 'S&P 500 P/E Ratio' },
  'equityRiskPremium': { id: 'SP500', source: 'FRED/Damodaran', name: 'Equity Risk Premium', url: '/api/equityDeepDive' },
  'buffettIndicator': { id: 'GFDEBTN/GDP', source: 'FRED', name: 'Buffett Indicator (Market Cap/GDP)', url: '/api/equityDeepDive' },
  'oecdCli': { id: 'OECDCLI', source: 'OECD/FRED', name: 'OECD Composite Leading Indicator', url: '/api/globalMacro' },
  'reer': { id: 'RNBQATNB', source: 'BIS/FRED', name: 'Real Effective Exchange Rate', url: '/api/fx' },
  'coinMarketData': { id: 'CoinGecko', source: 'CoinGecko', name: 'Crypto Market Data', url: 'https://api.coingecko.com/api/v3/coins/markets' },
  'btcDominance': { id: 'CoinGecko', source: 'CoinGecko', name: 'BTC Market Dominance', url: 'https://api.coingecko.com/api/v3/global' },
  'ethGas': { id: 'mempool.space', source: 'mempool.space', name: 'Ethereum Gas Price', url: 'https://mempool.space/api/v1/fees/recommended' },
  'defiTvl': { id: 'DeFiLlama', source: 'DeFiLlama', name: 'Total Value Locked', url: 'https://api.llama.fi/protocols' },
  'fundingRate': { id: 'Bybit', source: 'Bybit', name: 'Perpetual Funding Rate', url: '/api/crypto' },
  'reitETF': { id: 'VNQ', source: 'Yahoo Finance', name: 'Vanguard Real Estate ETF (VNQ)', url: '/api/realEstate' },
  'capRate': { id: 'REAL_ESTATE', source: 'Yahoo/FRED', name: 'Implied Cap Rate by Sector', url: '/api/realEstate' },
  'cpiBreakdown': { id: 'CPIAUCSL', source: 'FRED/BLS', name: 'CPI Breakdown by Component', url: '/api/globalMacro' },
  'fedRate': { id: 'FEDFUNDS', source: 'FRED', name: 'Federal Funds Rate (Fed)' },
  'ecbRate': { id: 'ECBDFR', source: 'ECB/FRED', name: 'ECB Deposit Facility Rate' },
  'boeRate': { id: 'BOERUKM', source: 'BOE/FRED', name: 'Bank of England Rate' },
  'bojRate': { id: 'IRSTCI01JPM156N', source: 'FRED', name: 'BOJ Policy Rate' },
  'alertVix': { id: 'VIXCLS', source: 'FRED', name: 'VIX Spike Alert', url: '/api/derivatives' },
  'alertCurve': { id: 'T10Y2Y', source: 'FRED', name: 'Yield Curve Inversion Alert', url: '/api/bonds' },
  'alertHY': { id: 'BAMLH0A0HYM2', source: 'FRED', name: 'HY Spread Alert', url: '/api/credit' },
  'alertFear': { id: 'FNFEAR', source: 'Alternative.me', name: 'Fear & Greed Alert', url: '/api/sentiment' },
  'alertGreed': { id: 'FNFEAR', source: 'Alternative.me', name: 'Extreme Greed Alert', url: '/api/sentiment' },
  'alertBTC': { id: 'CoinGecko', source: 'CoinGecko', name: 'BTC Large Move Alert', url: '/api/crypto' },
  'alertGold': { id: 'GOLDAMGBD228NLBM', source: 'FRED', name: 'Gold Move Alert', url: '/api/commodities' },
  'alertDXY': { id: 'DTWEXBGS', source: 'FRED', name: 'Dollar Strength Alert', url: '/api/fx' },
  'insuranceCombinedRatio': { id: 'INSURANCE', source: 'FRED / A.M. Best', name: 'Industry Combined Ratio', url: '/api/insurance' },
  'insuranceAvgCombinedRatio': { id: 'INSURANCE', source: 'FRED / A.M. Best', name: 'Avg Combined Ratio', url: '/api/insurance' },
  'reinsurerChange': { id: 'INSURANCE', source: 'Yahoo Finance', name: 'Reinsurer Stock Change', url: '/api/insurance' },
  'sp500Perf': { id: 'SP500', source: 'FRED', name: 'S&P 500 1-Month Performance' },
  'avgFactorScore': { id: 'SP500', source: 'Yahoo Finance', name: 'Avg Factor Composite Score', url: '/api/equityDeepDive' },
  'avgShortInterest': { id: 'SP500', source: 'Yahoo Finance', name: 'Avg Short Interest Float %', url: '/api/equityDeepDive' },
  'sovereignMaxSpread': { id: 'IRLTLT01DEM156N', source: 'FRED', name: 'Steepest Sovereign Curve Spread (30Y-3M)' },
  'defaultRate': { id: 'DRSFRWBS', source: 'FRED', name: 'Default Rate on Business Loans' },
  'spreadSummary': { id: 'BAMLH0A0HYM2', source: 'FRED', name: 'Credit Spread Summary', url: '/api/credit' },
  'emYield': { id: 'FRED', source: 'FRED', name: 'EM Sovereign 10Y Yield', url: '/api/credit' },
  'commercialPaperVolume': { id: 'CPN3M', source: 'FRED', name: 'Commercial Paper Outstanding Volume', url: '/api/credit' },
  'cloYield': { id: 'BAMLH0A0HYM2', source: 'FRED', name: 'CLO Tranche Yield', url: '/api/credit' },
  'defaultRateByCategory': { id: 'DRSFRWBS', source: 'FRED', name: 'Default Rate by Category', url: '/api/credit' },
  'stablecoinMcap': { id: 'CoinGecko', source: 'CoinGecko', name: 'Stablecoin Market Cap', url: 'https://api.coingecko.com/api/v3/global' },
  'topExchanges': { id: 'CoinGecko', source: 'CoinGecko', name: 'Top Crypto Exchange Volume', url: 'https://api.coingecko.com/api/v3/exchanges' },
  'onChainData': { id: 'Blockchain', source: 'Various', name: 'On-Chain Metrics', url: '/api/crypto' },
  'crossAssetReturn': { id: 'FRED', source: 'FRED', name: 'Cross-Asset 1-Day Return', url: '/api/sentiment' },
  'riskSignal': { id: 'FRED', source: 'FRED', name: 'Risk Signal Value', url: '/api/sentiment' },
  'contangoPct': { id: 'VIXCLS', source: 'FRED', name: 'VIX Futures Contango %', url: '/api/derivatives' },
  'atmImpliedVol': { id: 'VIXCLS', source: 'CBOE', name: 'ATM 1-Month Implied Volatility', url: '/api/derivatives' },
  'vixPercentile': { id: 'VIXCLS', source: 'FRED', name: 'VIX Percentile (1Y)', url: '/api/derivatives' },
  'gammaExposure': { id: 'CBOE', source: 'CBOE/SpotGamma', name: 'Dealer Gamma Exposure', url: '/api/derivatives' },
  'cfnai': { id: 'CFNAI', source: 'Chicago Fed/FRED', name: 'Chicago Fed National Activity Index', url: '/api/globalMacro' },
  'yieldSpread': { id: 'T10Y2Y', source: 'FRED', name: '10Y-2Y Yield Spread', url: '/api/globalMacro' },
  'ecoTotalEvents': { id: 'Econdb', source: 'Econdb', name: 'Total Economic Events', url: '/api/calendar' },
  'ecoBiggestSurprise': { id: 'Econdb', source: 'Econdb', name: 'Biggest Economic Surprise', url: '/api/calendar' },
  'ecoActual': { id: 'FRED', source: 'FRED/Econdb', name: 'Actual Economic Value', url: '/api/calendar' },
  'earnTotalReports': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Total Earnings Reports', url: '/api/calendar' },
  'earnAvgEps': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Average EPS Estimate', url: '/api/calendar' },
  'krTotalReleases': { id: 'FRED', source: 'FRED', name: 'Total Key Releases', url: '/api/calendar' },
  'treasAuctionAmount': { id: 'US Treasury', source: 'US Treasury', name: 'Treasury Auction Amount', url: '/api/calendar' },
  'dbcEtf': { id: 'DBC', source: 'Yahoo Finance', name: 'Invesco DB Commodity ETF (DBC)', url: '/api/commodities' },
  'goldOilRatio': { id: 'GOLDAMGBD228NLBM', source: 'FRED', name: 'Gold/Oil Ratio', url: '/api/commodities' },
  'contangoIndicator': { id: 'POILWTIUSDM', source: 'FRED/CME', name: 'WTI Contango Spread', url: '/api/commodities' },
  'commodityCurrencies': { id: 'DEXCAUS', source: 'FRED', name: 'Commodity Currency Rates', url: '/api/commodities' },
  'cotNetChange': { id: 'CFTC', source: 'CFTC', name: 'COT Net Change Week-over-Week', url: '/api/commodities' },
  'cotSpecNet': { id: 'CFTC', source: 'CFTC', name: 'COT Speculator Net Positioning', url: '/api/commodities' },
  'cotCommNet': { id: 'CFTC', source: 'CFTC', name: 'COT Commercial Net Positioning', url: '/api/commodities' },
  'cotTotalOI': { id: 'CFTC', source: 'CFTC', name: 'COT Total Open Interest', url: '/api/commodities' },
  'sectorHeatmap': { id: 'FRED/Yahoo', source: 'FRED / Yahoo Finance', name: 'Commodity Sector Performance', url: '/api/commodities' },
  'gasRetail': { id: 'APUS12A74714', source: 'BLS/EIA', name: 'Retail Gas Price ($/gal)', url: '/api/commodities' },
  'ppiYoy': { id: 'WPSID62', source: 'FRED', name: 'PPI Commodity YoY %', url: '/api/commodities' },
  'fxChange': { id: 'DEXUSEU', source: 'FRED', name: 'FX Daily Change', url: '/api/fx' },
  'rateDifferential': { id: 'FEDFUNDS', source: 'FRED', name: 'Rate Differential vs Fed', url: '/api/fx' },
  'cotPositioning': { id: 'CFTC', source: 'CFTC', name: 'COT Net Positioning % of OI', url: '/api/fx' },
  'fxMover': { id: 'DEXUSEU', source: 'FRED/Frankfurter', name: 'FX Top Mover Daily Change', url: '/api/fx' },
  'ecoExpected': { id: 'Econdb', source: 'Econdb/FRED', name: 'Expected (Consensus) Macro Value', url: '/api/calendar' },
  'ecoPrevious': { id: 'Econdb', source: 'Econdb/FRED', name: 'Previous Period Macro Value', url: '/api/calendar' },
  'ecoSurprise': { id: 'Econdb', source: 'Econdb', name: 'Economic Surprise (Actual − Expected)', url: '/api/calendar' },
  'earnEpsEst': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'EPS Estimate', url: '/api/calendar' },
  'earnEpsPrev': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Previous EPS', url: '/api/calendar' },
  'earnMktCap': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Market Cap', url: '/api/calendar' },
  'divAmount': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Dividend Amount', url: '/api/calendar' },
  'krPreviousValue': { id: 'FRED', source: 'FRED', name: 'Previous Release Value', url: '/api/calendar' },
  'medianHomePrice': { id: 'MSPUS', source: 'FRED', name: 'Median Home Price', url: '/api/realEstate' },
  'foreclosureRate': { id: 'HOUST', source: 'FRED', name: 'Foreclosure Rate', url: '/api/realEstate' },
  'creDelinquencyRate': { id: 'DRSFRWBS', source: 'FRED', name: 'CRE Delinquency Rate', url: '/api/realEstate' },
  'reitPerformance': { id: 'VNQ', source: 'Yahoo Finance', name: 'REIT Daily Change', url: '/api/realEstate' },
  'affordabilityIndex': { id: 'REAL_ESTATE', source: 'FRED', name: 'Housing Affordability Index', url: '/api/realEstate' },
  'supplyDemand': { id: 'POILWTIUSDM', source: 'EIA/FRED', name: 'Supply/Demand Metrics', url: '/api/commodities' },
  'insuranceCombinedRatioByLine': { id: 'INSURANCE', source: 'NAIC', name: 'Combined Ratio by Line', url: '/api/insurance' },
  'reinsuranceRate': { id: 'INSURANCE', source: 'FRED/Server', name: 'Reinsurance Rate', url: '/api/insurance' },
  'reserveAdequacy': { id: 'INSURANCE', source: 'NAIC', name: 'Reserve Adequacy Ratio', url: '/api/insurance' },
  'catBondSpread': { id: 'INSURANCE', source: 'Yahoo Finance', name: 'Cat Bond Spread', url: '/api/insurance' },
  'insuranceSectorEtf': { id: 'XLF', source: 'Yahoo Finance', name: 'Insurance Sector ETF', url: '/api/insurance' },
  'factorValue': { id: 'SP500', source: 'Yahoo Finance', name: 'Value Factor Score', url: '/api/equityDeepDive' },
  'factorMomentum': { id: 'SP500', source: 'Yahoo Finance', name: 'Momentum Factor Score', url: '/api/equityDeepDive' },
  'factorQuality': { id: 'SP500', source: 'Yahoo Finance', name: 'Quality Factor Score', url: '/api/equityDeepDive' },
  'factorComposite': { id: 'SP500', source: 'Yahoo Finance', name: 'Composite Factor Score', url: '/api/equityDeepDive' },
  'earningsEpsEst': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'EPS Estimate', url: '/api/equityDeepDive' },
  'institutionTotalValue': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Institution Portfolio Value', url: '/api/equityDeepDive' },
  'ecoUpcoming': { id: 'Econdb', source: 'Econdb', name: 'Upcoming Economic Events', url: '/api/calendar' },
  'ecoReleased': { id: 'Econdb', source: 'Econdb', name: 'Released Economic Events', url: '/api/calendar' },
  'cbRateChange': { id: 'FEDFUNDS', source: 'FRED', name: 'Central Bank Rate Change (bps)', url: '/api/calendar' },
  'dividendAmount': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Dividend Amount', url: '/api/calendar' },
  'krCategoryCount': { id: 'FRED', source: 'FRED', name: 'Release Category Count', url: '/api/calendar' },
  'wtiSpot': { id: 'POILWTIUSDM', source: 'FRED/CME', name: 'WTI Crude Oil Spot Price', url: '/api/commodities' },
  'goldSpot': { id: 'GOLDAMGBD228NLBM', source: 'FRED', name: 'Gold Spot Price', url: '/api/commodities' },
  'wtiContango': { id: 'POILWTIUSDM', source: 'CME', name: 'WTI Contango/Backwardation', url: '/api/commodities' },
  'goldContango': { id: 'GOLDAMGBD228NLBM', source: 'CME', name: 'Gold Contango/Backwardation', url: '/api/commodities' },
  'crudeStocks': { id: 'WTCSWW', source: 'EIA/FRED', name: 'Crude Oil Stocks', url: '/api/commodities' },
  'gasStorage': { id: 'NGN1021S', source: 'EIA/FRED', name: 'Natural Gas Storage', url: '/api/commodities' },
  'crudeProduction': { id: 'WCRFP2', source: 'EIA/FRED', name: 'US Crude Production', url: '/api/commodities' },
  'goldFRED': { id: 'GOLDAMGBD228NLBM', source: 'FRED', name: 'Gold Price (FRED)', url: '/api/commodities' },
  'g7Gdp': { id: 'GDP', source: 'FRED', name: 'G7 Average GDP Growth', url: '/api/globalMacro' },
  'emGdp': { id: 'GDP', source: 'FRED/World Bank', name: 'EM Average GDP Growth', url: '/api/globalMacro' },
  'globalCpi': { id: 'CPIAUCSL', source: 'FRED', name: 'Global Average CPI', url: '/api/globalMacro' },
  'highRate': { id: 'FEDFUNDS', source: 'FRED', name: 'Highest Policy Rate', url: '/api/globalMacro' },
  'lowRate': { id: 'FEDFUNDS', source: 'FRED', name: 'Lowest Policy Rate', url: '/api/globalMacro' },
  'debtAbove90': { id: 'GFDEBTN', source: 'FRED', name: 'Countries with Debt >90% GDP', url: '/api/globalMacro' },
  'm2GrowthYoY': { id: 'M2SL', source: 'FRED', name: 'M2 Money Supply YoY Growth', url: '/api/globalMacro' },
  'commodityPrice': { id: 'POILWTIUSDM', source: 'Yahoo Finance / EIA / FRED', name: 'Commodity Price', url: '/api/commodities' },
  'commodityChange': { id: 'POILWTIUSDM', source: 'Yahoo Finance / EIA / FRED', name: 'Commodity Change %', url: '/api/commodities' },
  'optionsStrike': { id: 'CBOE', source: 'CBOE / Yahoo Finance', name: 'Options Strike Price', url: '/api/derivatives' },
  'optionsVolume': { id: 'CBOE', source: 'CBOE', name: 'Options Volume', url: '/api/derivatives' },
  'optionsOI': { id: 'CBOE', source: 'CBOE', name: 'Open Interest', url: '/api/derivatives' },
  'optionsPremium': { id: 'CBOE', source: 'CBOE / Yahoo Finance', name: 'Options Premium', url: '/api/derivatives' },
  'fundingRate8h': { id: 'Bybit', source: 'Bybit', name: '8h Funding Rate', url: '/api/crypto' },
  'openInterestCrypto': { id: 'CoinGecko', source: 'CoinGecko', name: 'Crypto Open Interest', url: '/api/crypto' },
  'tvlChain': { id: 'DeFiLlama', source: 'DeFiLlama', name: 'Chain TVL', url: '/api/crypto' },
  'cloSpread': { id: 'BAMLH0A0HYM2', source: 'FRED', name: 'CLO Tranche Spread (bps)', url: '/api/credit' },
  'cloLtv': { id: 'BAMLH0A0HYM2', source: 'FRED / LeveragedLoans.com', name: 'CLO LTV %', url: '/api/credit' },
  'igHyEtf': { id: 'LQD', source: 'Yahoo Finance', name: 'IG/HY ETF Price', url: '/api/credit' },
  'igHyYield': { id: 'BAMLC0A0CM', source: 'FRED', name: 'IG/HY ETF Yield', url: '/api/credit' },
  'igHyDuration': { id: 'BAMLC0A0CM', source: 'FRED', name: 'IG/HY ETF Duration', url: '/api/credit' },
  'emBondSpread': { id: 'BAMLEMCBPIOAS', source: 'FRED', name: 'EM Bond Spread (bps)', url: '/api/credit' },
  'emBondYield': { id: 'FRED', source: 'FRED', name: 'EM 10Y Yield', url: '/api/credit' },
  'emDebtGdp': { id: 'GFDEBTN', source: 'FRED / World Bank', name: 'EM Debt/GDP', url: '/api/credit' },
  'defaultIndicatorValue': { id: 'DRSFRWBS', source: 'FRED', name: 'Default Indicator Value', url: '/api/credit' },
  'reinsRateOnLine': { id: 'INSURANCE', source: 'FRED / Reinsurance', name: 'Rate on Line %', url: '/api/insurance' },
  'catBondNotional': { id: 'INSURANCE', source: 'Yahoo Finance', name: 'Cat Bond Notional ($M)', url: '/api/insurance' },
  'catBondExpectedLoss': { id: 'INSURANCE', source: 'FRED', name: 'Cat Bond Expected Loss %', url: '/api/insurance' },
  'fxCrossRate': { id: 'DEXUSEU', source: 'FRED / Frankfurter', name: 'FX Cross Rate', url: '/api/fx' },
  'fxChangePct': { id: 'DEXUSEU', source: 'FRED / Frankfurter', name: 'FX 24h Change %', url: '/api/fx' },
  'sectorPerformance': { id: 'FRED', source: 'Yahoo Finance / FRED', name: 'Sector Performance %', url: '/api/commodities' },
  'cryptoPrice': { id: 'CoinGecko', source: 'CoinGecko', name: 'Crypto Price', url: '/api/crypto' },
  'cryptoChange': { id: 'CoinGecko', source: 'CoinGecko', name: 'Crypto Change %', url: '/api/crypto' },
  'cryptoMktCap': { id: 'CoinGecko', source: 'CoinGecko', name: 'Crypto Market Cap', url: '/api/crypto' },
  'cryptoVolume': { id: 'CoinGecko', source: 'CoinGecko', name: 'Crypto 24h Volume', url: '/api/crypto' },
  'defaultRateValue': { id: 'DRSFRWBS', source: 'FRED', name: 'Default Rate Value', url: '/api/credit' },
  'defaultRatePrev': { id: 'DRSFRWBS', source: 'FRED', name: 'Default Rate Previous', url: '/api/credit' },
  'defaultRatePeak': { id: 'DRSFRWBS', source: 'FRED', name: 'Default Rate Peak', url: '/api/credit' },
  'crossAssetReturnPct': { id: 'FRED', source: 'FRED', name: 'Cross-Asset Return %', url: '/api/sentiment' },
  'factorLowVol': { id: 'SP500', source: 'Yahoo Finance', name: 'Low Volatility Factor Score', url: '/api/equityDeepDive' },
  'watchlistPrice': { id: 'Yahoo Finance', source: 'Yahoo Finance', name: 'Stock Price', url: '/api/watchlist' },
  'consumerSentiment': { id: 'UMCSENT', source: 'FRED', name: 'Consumer Sentiment Index', url: '/api/globalMacro' },
  'tradeBalance': { id: 'BOPGSTB', source: 'FRED', name: 'US Trade Balance', url: '/api/globalMacro' },
  'lowestCpi': { id: 'CPIAUCSL', source: 'FRED / World Bank', name: 'Lowest CPI Country', url: '/api/globalMacro' },
  'highestDebt': { id: 'GFDEBTN', source: 'FRED / World Bank', name: 'Highest Debt/GDP Country', url: '/api/globalMacro' },
  'avgEmGdp': { id: 'GDP', source: 'FRED / World Bank', name: 'Average EM GDP Growth', url: '/api/globalMacro' },
};

export function getSeriesInfo(key) {
  return SERIES_MAP[key] || null;
}

export function seriesUrl(seriesId) {
  return `${FRED_BASE}/${seriesId}`;
}

export function seriesApiUrl(seriesId) {
  const params = new URLSearchParams({ series_id: seriesId, file_type: 'json', sort_order: 'desc', limit: '5' });
  return `${FRED_API_BASE}?${params.toString()}`;
}

export default function MetricValue({ value, format, seriesKey, timestamp, className }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState(null);
  const rootRef = useRef(null);
  const popoverRef = useRef(null);
  const [measured, setMeasured] = useState(false);

  const info = seriesKey ? SERIES_MAP[seriesKey] : null;

  const open = useCallback(() => {
    if (!info) return;
    const rect = rootRef.current.getBoundingClientRect();
    const popoverWidth = Math.max(rect.width + 60, 280);
    const viewportWidth = window.innerWidth;
    const left = Math.max(8, Math.min(rect.left, viewportWidth - popoverWidth - 8));
    const below = rect.bottom + 4;
    const above = rect.top - 4;
    setPos({ below, above, left, width: popoverWidth });
    setShow(true);
    setMeasured(false);
  }, [info]);

  const close = useCallback(() => {
    setShow(false);
  }, []);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    if (show) {
      close();
    } else {
      open();
    }
  }, [show, open, close]);

  useEffect(() => {
    if (!show) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') close();
    };
    const handleClickOutside = (e) => {
      if (popoverRef.current && popoverRef.current.contains(e.target)) return;
      if (rootRef.current && rootRef.current.contains(e.target)) return;
      close();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [show, close]);

  useEffect(() => {
    if (!show || !pos || !popoverRef.current || measured) return;
    const el = popoverRef.current;
    const pH = el.offsetHeight;
    const viewportH = window.innerHeight;
    const fitsBelow = (pos.below + pH) <= viewportH - 8;
    const fitsAbove = pos.above - pH >= 8;
    let top;
    if (fitsBelow) {
      top = pos.below;
    } else if (fitsAbove) {
      top = pos.above - pH;
    } else {
      top = Math.max(8, viewportH - pH - 8);
    }
    el.style.top = `${top}px`;
    setMeasured(true);
  }, [show, pos, measured]);

  const formatted = value != null ? (format ? format(value) : `${value}`) : '\u2014';

  const isFRED = info && info.source === 'FRED';
  const tsInfo = formatTimestampUTC(timestamp);

  return (
    <>
      <span
        className={`mv-root${info ? ' mv-clickable' : ''}${className ? ' ' + className : ''}`}
        ref={rootRef}
        onClick={handleClick}
      >
        {formatted}
      </span>
      {show && pos && info && createPortal(
        <div
          ref={popoverRef}
          className="mv-popover"
          style={{ left: pos.left, width: pos.width }}
        >
          <div className="mv-popover-header">
            <div className="mv-name">{info.name}</div>
            <button className="mv-close" onClick={close} aria-label="Close">✕</button>
          </div>
          <table className="mv-table">
            <tbody>
              <tr><td className="mv-label">Source</td><td>{info.source}</td></tr>
              <tr><td className="mv-label">Series ID</td><td className="mv-mono">{info.id}</td></tr>
              <tr><td className="mv-label">Value</td><td className="mv-mono">{formatted}</td></tr>
              {tsInfo && (
                <tr><td className="mv-label">Updated</td><td>
                  <div>{tsInfo.local} <span className="mv-tz">{tsInfo.tz}</span></div>
                  <div className="mv-utc">{tsInfo.utc}</div>
                </td></tr>
              )}
            </tbody>
          </table>
          <div className="mv-links">
            {isFRED && (
              <>
                <a href={seriesUrl(info.id)} target="_blank" rel="noopener noreferrer">FRED Series Page</a>
                <a href={seriesApiUrl(info.id)} target="_blank" rel="noopener noreferrer">Fetch JSON</a>
              </>
            )}
            {!isFRED && info.url && (
              <a href={info.url} target="_blank" rel="noopener noreferrer">Fetch JSON</a>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}