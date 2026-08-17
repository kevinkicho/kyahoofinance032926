/**
 * Regression: live chips must not stay hardcoded true when the tile
 * paints an empty / unavailable body.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hasWbDebtRows, wbDebtCountryRows } from '../../markets/credit/components/WorldBankDebtPanel.jsx';
import { hasTreasuryCreditHoldings, ticLatestRows as creditTicLatestRows } from '../../markets/credit/components/TreasuryCreditHoldingsPanel.jsx';
import { hasBisPropertyRows } from '../../markets/realEstate/components/BisPropertyPricePanel.jsx';
import { hasMetroCaseShillerRows } from '../../markets/realEstate/components/MetroCaseShillerPanel.jsx';
import { hasHudAffordabilityRows } from '../../markets/realEstate/components/HudAffordabilityPanel.jsx';
import { hasTreasuryTicRows, ticLatestRows as fxTicLatestRows } from '../../markets/fx/components/TreasuryTicPanel.jsx';
import { hasBeaCorporateProfitsRows } from '../../markets/equities/components/BeaCorporateProfitsPanel.jsx';
import { hasWbMarketCapRows } from '../../markets/equities/components/WorldBankMarketCapPanel.jsx';
import { hasSecFundamentalsRows, hasSecFilingActivity, universeUpdateRows, hasUniverseUpdates } from '../../markets/equities/components/EquitiesLiveChips.js';

import {
  hasShillerSeries,
  hasReitPerfRows,
  hasCapRateRows,
  hasAffordabilityStackMetrics,
  hasSupplyMetrics,
  hasFhfaHpiSeries,
  hasReitEtfHistory,
  hasForeclosureSeries,
  hasMbaApplications,
  hasCreDelinquencies,
  hasReMetrics,
  hasCensusHousingContent,
  hasCensusTradeContent,
  hasCensusTrendSeries,
} from '../../markets/realEstate/components/RealEstateHelpers.js';
import {
  hasHyOasSeries,
  hasCombinedRatioHistory,
  hasInsurancePenetrationRows,
  hasInsurerRatioRows,
  hasFemaDeclarationRows,
  hasUsgsEarthquakeRows,
} from '../../markets/insurance/components/InsuranceDashboard.jsx';
import {
  hasInsuranceKpiMetrics,
  hasCatLossSeries,
  hasCombinedRatioByLine,
  hasReinsuranceRateRows,
  hasCatastropheRows,
  hasCatExposureContent,
  hasEcbSupervisoryContent,
  femaDeclarationRows,
  usgsMagBucketRows,
  wbCountryRows,
} from '../../markets/insurance/components/InsuranceLiveChips.js';
import {
  hasCreditKpiMetrics,
  hasKeyMetricsContent,
  hasSpreadHistory,
  hasSpreadSummary,
  hasEmYieldRows,
  hasCpRates,
  hasCloTranches,
  hasDefaultRateRows,
  defaultRateRows,
  hasDelinquencyRows,
  hasTedSpreadSeries,
  hasMuniMarketSummary,
  muniTradeRows,
  muniPrimaryRows,
  hasBankStressContent,
  hasCreditQualitySeries,
  fdicAggregateRows,
  fdicFailureRows,
} from '../../markets/credit/components/CreditLiveChips.js';
import {
  hasElectricityPrices,
  hasElectricitySales,
  hasElectricityPriceTrends,
  hasCo2SectorRows,
  hasPetroleumSeries,
  hasHenryHubSeries,
} from '../../markets/eia/EiaLiveChips.js';
import {
  hasFxKpiMetrics,
  hasFxSpotRates,
  hasFxMovers,
  hasReerSeries,
  hasFxCorrelationHistory,
  hasDxyHistory,
  hasCotHistory,
  cotHistorySeries,
  rateDiffEntries,
  hasRateDiffRows,
} from '../../markets/fx/components/FXLiveChips.js';
import {
  hasSentimentSidebarContent,
  hasSentimentKeyMetrics,
  hasFsiHistory,
  hasCftcCurrencies,
  hasCrossAssetReturns,
  hasRiskDashboardContent,
  hasNewsSentimentSeries,
  hasFedRiskMoodContent,
} from '../../markets/sentiment/components/SentimentLiveChips.js';
import {
  hasBondsKpiMetrics,
  hasBondsMetricsContent,
  hasYieldCurveContent,
  yieldCurveCountries,
  hasCreditRatingsRows,
  hasTreasuryCostRates,
  hasCurveSpreadSeries,
  hasFedBalanceSeries,
  hasM2Series,
  hasDebtGdpSeries,
  hasCpiComponentsSeries,
  hasRealYieldSeries,
  hasCreditSpreadContent,
  hasDurationLadderContent,
  hasMacroIndicatorsContent,
  hasEcbPolicyRatesContent,
  hasGlobalCentralBankRates,
  hasForeignHoldersContent,
  hasMoneyMarketContent,
  hasAuctionContent,
  auctionRows,
} from '../../markets/bonds/components/BondsLiveChips.js';
import {
  hasMacroKpiMetrics,
  hasScorecardRows,
  hasRateBarRows,
  hasDebtBarRows,
  hasMacroSidebarContent,
  hasActivityContent,
  hasCliRows,
  hasWbTradeRows,
  hasWbDevRows,
  hasEcbEurContent,
  hasTgaSeries,
  hasGdpNowEvolution,
  hasFomcSepProjections,
  hasClevelandNowcast,
  hasBeaAccountsRows,
  hasEurostatRows,
  hasOecdDirectRows,
  hasBeaIncomeContent,
  hasImfCoferShares,
  hasGlobalLiquidityContent,
  ecbM3GrowthRows,
  dtsSeriesRows,
} from '../../markets/globalMacro/components/MacroLiveChips.js';
import {
  hasEqdKpiMetrics,
  hasEqdSidebarContent,
  hasEqdValuationContent,
  hasEqdEarningsQuality,
  hasFactorRankingsContent,
  factorStocks,
  earningsUpcoming,
  earningsBeatRates,
  insiderHolderRows,
  insiderTransactionRows,
  institutionRows,
} from '../../markets/equitiesDeepDive/components/EquitiesDeepDiveLiveChips.js';
import {
  hasCalendarKpiMetrics,
  hasCalendarSidebarContent,
  hasEconomicEvents,
  hasCentralBanks,
  hasEarningsSeason,
  hasKeyDataRows,
  hasTreasuryAuctions,
  hasOptionsExpiry,
  hasReleaseImpactRows,
  hasCatalystRows,
} from '../../markets/calendar/CalendarLiveChips.js';
import {
  hasCryptoSidebarContent,
  hasTopCryptos,
  hasOnChainMetrics,
  hasOnChainChart,
  hashrateHistoryPoints,
  coinRows,
  hasStablecoinComposition,
  stablecoinMcapValue,
  exchangeRows,
} from '../../markets/crypto/components/CryptoLiveChips.js';
import {
  hasFaoPriceSeries,
  faoPricePoints,
  hasEiaPetrolSeries,
  eiaPetrolSeriesPoints,
  eiaPetrolLatest,
  eiaPetrolSubtitle,
  hasUsdaAgSeries,
  usdaAgSeriesPoints,
  usdaAgSummaryRows,
  hasUsdaFredSeries,
  usdaFredHistoryPoints,
  usdaAgSubtitle,
  hasUsTradeSeries,
  usTradeBlocPoints,
  usTradeBlocs,
  usTradeSubtitle,
  physicalPressureRows,
  hasPhysicalPressureRows,
  hasCotPositioning,
  cotCommodityRows,
  cotHistoryPoints,
  hasWtiBrentSeries,
  wtiBrentHistoryPoints,
  hasCommodityFxRates,
  commodityFxRows,
  hasSectorHeatmapRows,
  sectorHeatmapRows,
  sectorHeatmapColumns,
  hasPriceDashboardRows,
  priceDashboardGroups,
  priceDashboardCommodities,
  hasDbcEtfQuote,
  sidebarCotRows,
  hasCommoditiesSidebarContent,
} from '../../markets/commodities/components/CommoditiesLiveChips.js';
import {
  hasDerivativesKpiMetrics,
  hasVolPremium,
  hasCftcTffRows,
  hasEcbDerivativesContent,
  ecbM3GrowthRows as derivEcbM3GrowthRows,
  ecbHicpDetailRows as derivEcbHicpDetailRows,
  hasVixTermSeries,
  hasFredVixSeries,
  hasSkewContent,
  hasVolSurfaceGrid,
  volSurfaceHeatmap,
} from '../../markets/derivatives/components/DerivativesLiveChips.js';
import {
  hasBlsSeries,
  hasBlsKpiItems,
  hasBlsTrendsLaborItems,
  hasBlsTrendsPricesItems,
  hasBlsJoltsItems,
  hasBlsProductivityItems,
  hasBlsCpiItems,
  hasBlsPpiItems,
  hasBlsEciItems,
  hasBlsDurationItems,
} from '../../markets/bls/components/BlsLiveChips.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function src(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

describe('credit wb-debt / treasury-credit-holdings live chips', () => {
  it('dashboard does not hardcode live=true', () => {
    const dash = src('markets/credit/components/CreditDashboard.jsx');
    expect(dash).not.toMatch(/'wb-debt':\s*true/);
    expect(dash).not.toMatch(/'treasury-credit-holdings':\s*true/);
    expect(dash).toMatch(/'wb-debt':\s*hasWbDebt/);
    expect(dash).toMatch(/'treasury-credit-holdings':\s*hasTicHoldings/);
  });

  it('hasWbDebtRows is false for empty / sibling-only payloads', () => {
    expect(hasWbDebtRows(null)).toBe(false);
    expect(hasWbDebtRows([])).toBe(false);
    expect(hasWbDebtRows({ US: 2.1 })).toBe(false);
  });

  it('hasWbDebtRows is true when country rows exist', () => {
    expect(hasWbDebtRows([{ code: 'US', name: 'United States', gdpGrowth: 2.1 }])).toBe(true);
  });

  it('hasTreasuryCreditHoldings is false for empty / sibling-only payloads', () => {
    expect(hasTreasuryCreditHoldings(null)).toBe(false);
    expect(hasTreasuryCreditHoldings([])).toBe(false);
    expect(hasTreasuryCreditHoldings({ Japan: 1100 })).toBe(false);
  });

  it('hasTreasuryCreditHoldings is true when holder rows exist', () => {
    expect(hasTreasuryCreditHoldings([{ country: 'Japan', holdingsB: 1100 }])).toBe(true);
  });
});

describe('realEstate hardcoded-live tiles', () => {
  it('dashboard does not hardcode live=true', () => {
    const dash = src('markets/realEstate/components/RealEstateDashboard.jsx');
    expect(dash).not.toMatch(/'bis-property-prices':\s*true/);
    expect(dash).not.toMatch(/'metro-case-shiller':\s*true/);
    expect(dash).not.toMatch(/'hud-affordability-by-metro':\s*true/);
  });

  it('hasBisPropertyRows is false for empty / sibling-only payloads', () => {
    expect(hasBisPropertyRows(null)).toBe(false);
    expect(hasBisPropertyRows({})).toBe(false);
    expect(hasBisPropertyRows({ US: { latest: 312 } })).toBe(false);
    expect(hasBisPropertyRows({ affordabilityData: { index: 98 } })).toBe(false);
  });

  it('hasBisPropertyRows is true when country series exist', () => {
    expect(hasBisPropertyRows({ US: { values: [300, 310] } })).toBe(true);
  });

  it('hasMetroCaseShillerRows is false for national-only / empty', () => {
    expect(hasMetroCaseShillerRows(null)).toBe(false);
    expect(hasMetroCaseShillerRows({ national: { values: [300] } })).toBe(false);
    expect(hasMetroCaseShillerRows({ metros: {} })).toBe(false);
  });

  it('hasMetroCaseShillerRows is true when metro objects exist', () => {
    expect(hasMetroCaseShillerRows({ metros: { 'San Francisco': { latest: 350, yoy: 2.1 } } })).toBe(true);
  });

  it('hasHudAffordabilityRows is false for empty / sibling-only payloads', () => {
    expect(hasHudAffordabilityRows(null)).toBe(false);
    expect(hasHudAffordabilityRows([])).toBe(false);
    expect(hasHudAffordabilityRows({ current: { index: 98 } })).toBe(false);
    expect(hasHudAffordabilityRows([{ city: 'Miami', homeValue: 455000 }])).toBe(false);
  });

  it('hasHudAffordabilityRows is true when rent-to-income rows exist', () => {
    expect(hasHudAffordabilityRows([{ city: 'Miami', ratio: 41.2 }])).toBe(true);
    expect(hasHudAffordabilityRows([{ city: 'Miami', rentToIncome: 0.31 }])).toBe(true);
  });
});

describe('fx treasury-tic live chip', () => {
  it('dashboard does not hardcode live=true', () => {
    const dash = src('markets/fx/components/FXDashboard.jsx');
    expect(dash).not.toMatch(/'treasury-tic':\s*true/);
    expect(dash).toMatch(/'treasury-tic':\s*hasTicHoldings/);
  });

  it('hasTreasuryTicRows is false for empty / sibling-only payloads', () => {
    expect(hasTreasuryTicRows(null)).toBe(false);
    expect(hasTreasuryTicRows([])).toBe(false);
    expect(hasTreasuryTicRows({ Japan: 1100 })).toBe(false);
  });

  it('hasTreasuryTicRows is true when holder rows exist', () => {
    expect(hasTreasuryTicRows([{ country: 'Japan', holdingsB: 1100 }])).toBe(true);
  });
});

describe('equities bea / wb-market-cap live chips', () => {
  it('dashboard does not hardcode live=true', () => {
    const dash = src('markets/equities/EquitiesMarket.jsx');
    expect(dash).not.toMatch(/'bea-corporate-profits':\s*true/);
    expect(dash).not.toMatch(/'wb-market-cap':\s*true/);
    expect(dash).toMatch(/'bea-corporate-profits':\s*hasBeaProfits/);
    expect(dash).toMatch(/'wb-market-cap':\s*hasWbMcap/);
  });

  it('hasBeaCorporateProfitsRows is false for empty / sibling-only payloads', () => {
    expect(hasBeaCorporateProfitsRows(null)).toBe(false);
    expect(hasBeaCorporateProfitsRows({})).toBe(false);
    expect(hasBeaCorporateProfitsRows({ isLive: true })).toBe(false);
    expect(hasBeaCorporateProfitsRows({ gdpComponents: [], savingRate: [], corporateProfits: [] })).toBe(false);
  });

  it('hasBeaCorporateProfitsRows is true when NIPA rows exist', () => {
    expect(hasBeaCorporateProfitsRows({ gdpComponents: [{ period: '2024Q4', value: 2.4 }] })).toBe(true);
    expect(hasBeaCorporateProfitsRows({ savingRate: [{ period: '2024-12', value: 4.1 }] })).toBe(true);
    expect(hasBeaCorporateProfitsRows({ corporateProfits: [{ period: '2024Q4', valueBn: 3100 }] })).toBe(true);
  });

  it('hasWbMarketCapRows is false for empty / sibling-only payloads', () => {
    expect(hasWbMarketCapRows(null)).toBe(false);
    expect(hasWbMarketCapRows({})).toBe(false);
    expect(hasWbMarketCapRows([])).toBe(false);
    expect(hasWbMarketCapRows([{ code: 'US', name: 'United States' }])).toBe(false);
    expect(hasWbMarketCapRows({ US: { mktCapUsd: 50 } })).toBe(false);
  });

  it('hasWbMarketCapRows is true when WDI observations exist', () => {
    expect(hasWbMarketCapRows([{ code: 'US', mktCapUsd: 50.2 }])).toBe(true);
    expect(hasWbMarketCapRows([{ code: 'JP', gdpGrowth: 1.1 }])).toBe(true);
  });
});

describe('realEstate empty-capable tiles (shiller / reitperf / caprate / afford-stack)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/realEstate/components/RealEstateDashboard.jsx');
    expect(dash).not.toMatch(/metrics:\s*!!isLive/);
    expect(dash).not.toMatch(/'census-housing':\s*!!isLive/);
    expect(dash).not.toMatch(/'census-trade':\s*!!isLive/);
    expect(dash).not.toMatch(/'census-trends-housing':\s*!!isLive/);
    expect(dash).not.toMatch(/'census-trends-trade':\s*!!isLive/);
    expect(dash).not.toMatch(/shiller:\s*!!isLive/);
    expect(dash).not.toMatch(/reitperf:\s*!!isLive/);
    expect(dash).not.toMatch(/caprate:\s*!!isLive/);
    expect(dash).not.toMatch(/'afford-stack':\s*!!isLive/);
    expect(dash).not.toMatch(/supply:\s*!!isLive/);
    expect(dash).not.toMatch(/'fhfa-hpi':\s*!!isLive/);
    expect(dash).not.toMatch(/reitetf:\s*!!isLive/);
    expect(dash).not.toMatch(/foreclosure:\s*!!isLive/);
    expect(dash).not.toMatch(/mba:\s*!!isLive/);
    expect(dash).not.toMatch(/cre:\s*!!isLive/);
    expect(dash).not.toMatch(/'hud-afford':\s*!!isLive/);
    expect(dash).toMatch(/shiller:\s*hasShillerSeries/);
    expect(dash).toMatch(/reitperf:\s*hasReitPerfRows/);
    expect(dash).toMatch(/caprate:\s*hasCapRateRows/);
    expect(dash).toMatch(/'afford-stack':\s*hasAffordabilityStackMetrics/);
    expect(dash).toMatch(/supply:\s*hasSupplyMetrics/);
    expect(dash).toMatch(/'fhfa-hpi':\s*hasFhfaHpiSeries/);
    expect(dash).toMatch(/reitetf:\s*hasReitEtfHistory/);
    expect(dash).toMatch(/foreclosure:\s*hasForeclosureSeries/);
    expect(dash).toMatch(/mba:\s*hasMbaApplications/);
    expect(dash).toMatch(/cre:\s*hasCreDelinquencies/);
    expect(dash).toMatch(/'hud-afford':\s*hasHudAffordabilityRows/);
    expect(dash).toMatch(/metrics:\s*hasReMetrics/);
    expect(dash).toMatch(/'census-housing':\s*hasCensusHousingContent/);
    expect(dash).toMatch(/'census-trade':\s*hasCensusTradeContent/);
    expect(dash).toMatch(/'census-trends-housing':\s*hasCensusTrendSeries/);
    expect(dash).toMatch(/'census-trends-trade':\s*hasCensusTrendSeries/);
  });

  it('hasShillerSeries is false for empty / metro-only payloads', () => {
    expect(hasShillerSeries(null)).toBe(false);
    expect(hasShillerSeries({})).toBe(false);
    expect(hasShillerSeries({ isLive: true })).toBe(false);
    expect(hasShillerSeries({ metros: { Miami: { latest: 350 } } })).toBe(false);
    expect(hasShillerSeries({ national: { values: [300] } })).toBe(false);
  });

  it('hasShillerSeries is true when national dates exist', () => {
    expect(hasShillerSeries({ dates: ['2024-01'], values: [310] })).toBe(true);
    expect(hasShillerSeries({ national: { dates: ['2024-01'], values: [310] } })).toBe(true);
  });

  it('hasReitPerfRows is false for empty / sibling-only payloads', () => {
    expect(hasReitPerfRows(null)).toBe(false);
    expect(hasReitPerfRows([])).toBe(false);
    expect(hasReitPerfRows({ VNQ: { changePct: 1.2 } })).toBe(false);
  });

  it('hasReitPerfRows is true when performance rows exist', () => {
    expect(hasReitPerfRows([{ symbol: 'VNQ', changePct: 1.2 }])).toBe(true);
  });

  it('hasCapRateRows is false for empty / sibling-only payloads', () => {
    expect(hasCapRateRows(null)).toBe(false);
    expect(hasCapRateRows([])).toBe(false);
    expect(hasCapRateRows({ office: 6.2 })).toBe(false);
  });

  it('hasCapRateRows is true when sector rows exist', () => {
    expect(hasCapRateRows([{ sector: 'Office', impliedYieldPct: 6.2 }])).toBe(true);
  });

  it('hasAffordabilityStackMetrics is false for empty / label-only stacks', () => {
    expect(hasAffordabilityStackMetrics(null)).toBe(false);
    expect(hasAffordabilityStackMetrics([])).toBe(false);
    expect(hasAffordabilityStackMetrics({ stressLabel: 'Partial' })).toBe(false);
    expect(hasAffordabilityStackMetrics({ isLive: true, price: '400000' })).toBe(false);
  });

  it('hasAffordabilityStackMetrics is true when a painted metric is numeric', () => {
    expect(hasAffordabilityStackMetrics({ price: 400000, stressLabel: 'Partial' })).toBe(true);
    expect(hasAffordabilityStackMetrics({ rate: 6.75 })).toBe(true);
    expect(hasAffordabilityStackMetrics({ annualBurden: 31.2 })).toBe(true);
  });

  it('hasSupplyMetrics is false for empty / sibling-only payloads', () => {
    expect(hasSupplyMetrics(null)).toBe(false);
    expect(hasSupplyMetrics({})).toBe(false);
    expect(hasSupplyMetrics({ housingStarts: { dates: ['2024-01'] } })).toBe(false);
    expect(hasSupplyMetrics({ monthsSupply: '6.1' })).toBe(false);
  });

  it('hasSupplyMetrics is true when a supply series or scalar exists', () => {
    expect(hasSupplyMetrics({ housingStarts: { values: [1400] } })).toBe(true);
    expect(hasSupplyMetrics({ monthsSupply: 6.1 })).toBe(true);
    expect(hasSupplyMetrics({ activeListings: 1200000 })).toBe(true);
  });

  it('hasFhfaHpiSeries is false for empty / sibling-only payloads', () => {
    expect(hasFhfaHpiSeries(null)).toBe(false);
    expect(hasFhfaHpiSeries({})).toBe(false);
    expect(hasFhfaHpiSeries({ latest: { value: 420 } })).toBe(false);
    expect(hasFhfaHpiSeries({ values: [400, 410] })).toBe(false);
  });

  it('hasFhfaHpiSeries is true when FHFA dates exist', () => {
    expect(hasFhfaHpiSeries({ dates: ['2024-01'], values: [420] })).toBe(true);
  });

  it('hasReitEtfHistory is false for empty / sibling-only payloads', () => {
    expect(hasReitEtfHistory(null)).toBe(false);
    expect(hasReitEtfHistory({})).toBe(false);
    expect(hasReitEtfHistory({ isLive: true })).toBe(false);
    expect(hasReitEtfHistory({ price: 92.4, history: { closes: [90, 91] } })).toBe(false);
    expect(hasReitEtfHistory({ history: { dates: [] } })).toBe(false);
  });

  it('hasReitEtfHistory is true when VNQ history dates exist', () => {
    expect(hasReitEtfHistory({ history: { dates: ['2024-01'], closes: [90] } })).toBe(true);
  });

  it('hasForeclosureSeries is false for empty / sibling-only payloads', () => {
    expect(hasForeclosureSeries(null)).toBe(false);
    expect(hasForeclosureSeries({})).toBe(false);
    expect(hasForeclosureSeries({ isLive: true })).toBe(false);
    expect(hasForeclosureSeries({ foreclosures: { dates: ['2024-01'] } })).toBe(false);
    expect(hasForeclosureSeries({ delinquencies: { dates: ['2024-01'] } })).toBe(false);
  });

  it('hasForeclosureSeries is true when a distress series exists', () => {
    expect(hasForeclosureSeries({ foreclosures: { values: [0.4] } })).toBe(true);
    expect(hasForeclosureSeries({ delinquencies: { values: [2.1] } })).toBe(true);
  });

  it('hasMbaApplications is false for empty / sibling-only / refi-only payloads', () => {
    expect(hasMbaApplications(null)).toBe(false);
    expect(hasMbaApplications({})).toBe(false);
    expect(hasMbaApplications({ isLive: true })).toBe(false);
    expect(hasMbaApplications({ purchase: { dates: ['2024-01'] } })).toBe(false);
    expect(hasMbaApplications({ refi: { values: [2100] } })).toBe(false);
  });

  it('hasMbaApplications is true when purchase values exist', () => {
    expect(hasMbaApplications({ purchase: { values: [180] } })).toBe(true);
  });

  it('hasCreDelinquencies is false for empty / sibling-only payloads', () => {
    expect(hasCreDelinquencies(null)).toBe(false);
    expect(hasCreDelinquencies({})).toBe(false);
    expect(hasCreDelinquencies({ isLive: true })).toBe(false);
    expect(hasCreDelinquencies({ dates: ['2024-01'] })).toBe(false);
  });

  it('hasCreDelinquencies is true when CRE delinquency values exist', () => {
    expect(hasCreDelinquencies({ values: [4.2] })).toBe(true);
  });

  it('hasReMetrics is false for empty / sibling-only payloads', () => {
    expect(hasReMetrics()).toBe(false);
    expect(hasReMetrics({})).toBe(false);
    expect(hasReMetrics({ isLive: true })).toBe(false);
    expect(hasReMetrics({ caseShillerData: { metros: { Miami: { latest: 350 } } } })).toBe(false);
    expect(hasReMetrics({ mortgageRates: { asOf: '2024-01-01' } })).toBe(false);
    expect(hasReMetrics({ foreclosureData: { isLive: true } })).toBe(false);
    expect(hasReMetrics({ commoditiesData: { yahoo: { futures: {} } } })).toBe(false);
  });

  it('hasReMetrics is true when a painted metric exists', () => {
    expect(hasReMetrics({ caseShillerData: { values: [310] } })).toBe(true);
    expect(hasReMetrics({ medianHomePrice: { values: [420000] } })).toBe(true);
    expect(hasReMetrics({ mortgageRates: { rate30y: 6.75 } })).toBe(true);
    expect(hasReMetrics({ homeownershipRate: 65.8 })).toBe(true);
    expect(hasReMetrics({ commoditiesData: { gold: { price: 2400 } } })).toBe(true);
  });

  it('hasCensusHousingContent is false for empty / sibling-only payloads', () => {
    expect(hasCensusHousingContent(null)).toBe(false);
    expect(hasCensusHousingContent([])).toBe(false);
    expect(hasCensusHousingContent([{ key: 'housingStarts' }])).toBe(false);
    expect(hasCensusHousingContent([{ key: 'retailSales', latest: { value: 700 } }])).toBe(false);
    expect(hasCensusHousingContent([], [{ key: 'housingStarts' }])).toBe(false);
  });

  it('hasCensusHousingContent is true when a housing card or extra value exists', () => {
    expect(hasCensusHousingContent([{ key: 'housingStarts', latest: { value: 1400 } }])).toBe(true);
    expect(hasCensusHousingContent([], [{ key: 'medianHomePrice', value: 420000 }])).toBe(true);
  });

  it('hasCensusTradeContent is false for empty / sibling-only / housing-only payloads', () => {
    expect(hasCensusTradeContent(null)).toBe(false);
    expect(hasCensusTradeContent([])).toBe(false);
    expect(hasCensusTradeContent([{ key: 'retailSales' }])).toBe(false);
    expect(hasCensusTradeContent([{ key: 'housingStarts', latest: { value: 1400 } }])).toBe(false);
    expect(hasCensusTradeContent([], [{ key: 'retailSales' }])).toBe(false);
  });

  it('hasCensusTradeContent is true when a trade card or extra value exists', () => {
    expect(hasCensusTradeContent([{ key: 'retailSales', latest: { value: 700 } }])).toBe(true);
    expect(hasCensusTradeContent([], [{ key: 'pce', value: 19000 }])).toBe(true);
  });

  it('hasCensusTrendSeries is false for empty / sibling-only payloads', () => {
    expect(hasCensusTrendSeries(null)).toBe(false);
    expect(hasCensusTrendSeries({})).toBe(false);
    expect(hasCensusTrendSeries([])).toBe(false);
  });

  it('hasCensusTrendSeries is true when a filtered series exists', () => {
    expect(hasCensusTrendSeries([{ key: 'housingStarts', history: { values: [1, 2, 3] } }])).toBe(true);
  });
});

describe('insurance empty-capable tiles (hyoas / crhist / penetration / fema / usgs)', () => {
  it('dashboard does not hardcode live on empty-capable tiles', () => {
    const dash = src('markets/insurance/components/InsuranceDashboard.jsx');
    expect(dash).not.toMatch(/hyoas:\s*!!isLive/);
    expect(dash).not.toMatch(/crhist:\s*!!isLive/);
    expect(dash).not.toMatch(/'ins-penetration':\s*!!wbCtx\?\.data\?\.countries\?\.length/);
    expect(dash).not.toMatch(/'combined-ratios':\s*!!insRatiosCtx\?\.data\?\.isLive/);
    expect(dash).not.toMatch(/'fema-disasters':\s*!!femaCtx\?\.data\?\.isLive/);
    expect(dash).not.toMatch(/'usgs-earthquakes':\s*!!usgsCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/hyoas:\s*hasHyOasSeries/);
    expect(dash).toMatch(/crhist:\s*hasCombinedRatioHistory/);
    expect(dash).toMatch(/'ins-penetration':\s*hasInsurancePenetrationRows/);
    expect(dash).toMatch(/'combined-ratios':\s*hasInsurerRatioRows/);
    expect(dash).toMatch(/'fema-disasters':\s*hasFemaDeclarationRows/);
    expect(dash).toMatch(/'usgs-earthquakes':\s*hasUsgsEarthquakeRows/);
  });

  it('hasHyOasSeries is false for empty / sibling-only payloads', () => {
    expect(hasHyOasSeries(null)).toBe(false);
    expect(hasHyOasSeries({})).toBe(false);
    expect(hasHyOasSeries({ isLive: true })).toBe(false);
    expect(hasHyOasSeries({ values: [400, 410] })).toBe(false);
  });

  it('hasHyOasSeries is true when HY OAS dates exist', () => {
    expect(hasHyOasSeries({ dates: ['2024-01'], values: [310] })).toBe(true);
  });

  it('hasCombinedRatioHistory is false for empty / all-null padded series', () => {
    expect(hasCombinedRatioHistory(null)).toBe(false);
    expect(hasCombinedRatioHistory({})).toBe(false);
    expect(hasCombinedRatioHistory({ dates: ['2024Q1'] })).toBe(false);
    expect(hasCombinedRatioHistory({ values: [null, null, null] })).toBe(false);
    expect(hasCombinedRatioHistory({ values: ['92.1'] })).toBe(false);
  });

  it('hasCombinedRatioHistory is true when a numeric combined ratio exists', () => {
    expect(hasCombinedRatioHistory({ values: [null, 92.1] })).toBe(true);
  });

  it('hasInsurancePenetrationRows is false for empty / sibling-only countries', () => {
    expect(hasInsurancePenetrationRows(null)).toBe(false);
    expect(hasInsurancePenetrationRows({})).toBe(false);
    expect(hasInsurancePenetrationRows({ countries: [] })).toBe(false);
    expect(hasInsurancePenetrationRows({ countries: [{ code: 'US', gdpGrowth: 2.1 }] })).toBe(false);
    expect(hasInsurancePenetrationRows({ US: { lifeInsPctGdp: 1.2 } })).toBe(false);
  });

  it('hasInsurancePenetrationRows is true when GFDD premium/GDP fields exist', () => {
    expect(hasInsurancePenetrationRows({ countries: [{ code: 'US', lifeInsPctGdp: 1.2 }] })).toBe(true);
    expect(hasInsurancePenetrationRows({ countries: [{ code: 'DE', nonLifeInsPctGdp: 3.4 }] })).toBe(true);
  });

  it('hasInsurerRatioRows is false for empty / isLive-only payloads', () => {
    expect(hasInsurerRatioRows(null)).toBe(false);
    expect(hasInsurerRatioRows({})).toBe(false);
    expect(hasInsurerRatioRows({ isLive: true })).toBe(false);
    expect(hasInsurerRatioRows({ issuers: [] })).toBe(false);
    expect(hasInsurerRatioRows({ issuers: { PGR: { ticker: 'PGR' } } })).toBe(false);
  });

  it('hasInsurerRatioRows is true when an issuer has latest', () => {
    expect(hasInsurerRatioRows({ issuers: { PGR: { latest: { combinedPct: 92.1 } } } })).toBe(true);
  });

  it('hasFemaDeclarationRows is false for empty / isLive-only payloads', () => {
    expect(hasFemaDeclarationRows(null)).toBe(false);
    expect(hasFemaDeclarationRows({})).toBe(false);
    expect(hasFemaDeclarationRows({ isLive: true, summary: { totalRecent: 0 } })).toBe(false);
    expect(hasFemaDeclarationRows({ declarations: [] })).toBe(false);
  });

  it('hasFemaDeclarationRows is true when declarations exist', () => {
    expect(hasFemaDeclarationRows({ declarations: [{ type: 'Fire', firstDeclared: '2024-01-01' }] })).toBe(true);
  });

  it('hasUsgsEarthquakeRows is false for empty / isLive-only payloads', () => {
    expect(hasUsgsEarthquakeRows(null)).toBe(false);
    expect(hasUsgsEarthquakeRows({})).toBe(false);
    expect(hasUsgsEarthquakeRows({ isLive: true, eventsCount: 0 })).toBe(false);
    expect(hasUsgsEarthquakeRows({ events: [], magBuckets: [] })).toBe(false);
  });

  it('hasUsgsEarthquakeRows is true when events or mag buckets exist', () => {
    expect(hasUsgsEarthquakeRows({ events: [{ mag: 5.1 }] })).toBe(true);
    expect(hasUsgsEarthquakeRows({ magBuckets: [{ range: '5-6', count: 3 }] })).toBe(true);
  });
});


describe('insurance empty-capable tiles (kpi / catloss / crline / reinsrates)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/insurance/components/InsuranceDashboard.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!isLive/);
    expect(dash).not.toMatch(/catloss:\s*!!isLive/);
    expect(dash).not.toMatch(/crline:\s*!!isLive/);
    expect(dash).not.toMatch(/reinsrates:\s*!!isLive/);
    expect(dash).toMatch(/kpi:\s*hasInsuranceKpiMetrics/);
    expect(dash).toMatch(/catloss:\s*hasCatLossSeries/);
    expect(dash).toMatch(/crline:\s*hasCombinedRatioByLine/);
    expect(dash).toMatch(/reinsrates:\s*hasReinsuranceRateRows/);
  });

  it('hasInsuranceKpiMetrics is false for empty / sibling-only payloads', () => {
    expect(hasInsuranceKpiMetrics()).toBe(false);
    expect(hasInsuranceKpiMetrics({})).toBe(false);
    expect(hasInsuranceKpiMetrics({ isLive: true })).toBe(false);
    expect(hasInsuranceKpiMetrics({ industryAvgCombinedRatio: '92.1' })).toBe(false);
    expect(hasInsuranceKpiMetrics({ reinsurers: { isLive: true } })).toBe(false);
    expect(hasInsuranceKpiMetrics({ reinsurers: [] })).toBe(false);
    expect(hasInsuranceKpiMetrics({ reinsurers: [{ ticker: 'RNR' }] })).toBe(false);
    expect(hasInsuranceKpiMetrics({ fredHyOasHistory: { isLive: true } })).toBe(false);
    expect(hasInsuranceKpiMetrics({ fredHyOasHistory: { dates: ['2024-01'] } })).toBe(false);
    expect(hasInsuranceKpiMetrics({ fredHyOasHistory: { values: [null] } })).toBe(false);
    expect(hasInsuranceKpiMetrics({ sectorETF: { isLive: true } })).toBe(false);
    expect(hasInsuranceKpiMetrics({ sectorETF: { symbol: 'SP500' } })).toBe(false);
    expect(hasInsuranceKpiMetrics({ sectorETF: [{ symbol: 'SP500' }] })).toBe(false);
  });

  it('hasInsuranceKpiMetrics is true when a painted KPI pill exists', () => {
    expect(hasInsuranceKpiMetrics({ industryAvgCombinedRatio: 92.1 })).toBe(true);
    expect(hasInsuranceKpiMetrics({ reinsurers: [{ ticker: 'RNR', price: 210 }] })).toBe(true);
    expect(hasInsuranceKpiMetrics({ fredHyOasHistory: { values: [2.83] } })).toBe(true);
    expect(hasInsuranceKpiMetrics({ sectorETF: { symbol: 'SP500', price: 5200 } })).toBe(true);
    expect(hasInsuranceKpiMetrics({ sectorETF: [{ symbol: 'SP500', price: 5200 }] })).toBe(true);
  });

  it('hasCatLossSeries is false for empty / sibling-only payloads', () => {
    expect(hasCatLossSeries(null)).toBe(false);
    expect(hasCatLossSeries({})).toBe(false);
    expect(hasCatLossSeries({ isLive: true })).toBe(false);
    expect(hasCatLossSeries({ dates: ['2024'] })).toBe(false);
    expect(hasCatLossSeries({ values: [] })).toBe(false);
    expect(hasCatLossSeries(null, { isLive: true })).toBe(false);
    expect(hasCatLossSeries(null, { byType: [] })).toBe(false);
    expect(hasCatLossSeries(null, { declarations: [] })).toBe(false);
    expect(hasCatLossSeries(null, { declarations: [{ type: 'Fire' }] })).toBe(false);
  });

  it('hasCatLossSeries is true when FRED values or FEMA proxy series exist', () => {
    expect(hasCatLossSeries({ values: [12.4] })).toBe(true);
    expect(hasCatLossSeries({ values: [10.1, 14.2] })).toBe(true);
    expect(hasCatLossSeries(null, { byType: [{ type: 'Fire', count: 8 }] })).toBe(true);
    expect(hasCatLossSeries(null, { declarations: [{ declarationDate: '2024-01-01' }] })).toBe(true);
  });

  it('hasCombinedRatioByLine is false for empty / sibling-only payloads', () => {
    expect(hasCombinedRatioByLine(null)).toBe(false);
    expect(hasCombinedRatioByLine({})).toBe(false);
    expect(hasCombinedRatioByLine({ isLive: true })).toBe(false);
    expect(hasCombinedRatioByLine({ byLine: [] })).toBe(false);
    expect(hasCombinedRatioByLine({ byLine: [{ line: 'Auto' }] })).toBe(false);
    expect(hasCombinedRatioByLine({ lines: { Auto: [null, null] } })).toBe(false);
    expect(hasCombinedRatioByLine({ lines: { Auto: '92.1' } })).toBe(false);
  });

  it('hasCombinedRatioByLine is true when a line ratio exists', () => {
    expect(hasCombinedRatioByLine({ byLine: [{ line: 'Auto', ratio: 92.1 }] })).toBe(true);
    expect(hasCombinedRatioByLine({ lines: { Auto: [null, 94.2] } })).toBe(true);
  });

  it('hasReinsuranceRateRows is false for empty / sibling-only payloads', () => {
    expect(hasReinsuranceRateRows(null)).toBe(false);
    expect(hasReinsuranceRateRows({})).toBe(false);
    expect(hasReinsuranceRateRows({ isLive: true })).toBe(false);
    expect(hasReinsuranceRateRows([])).toBe(false);
    expect(hasReinsuranceRateRows({ byCategory: [] })).toBe(false);
    expect(hasReinsuranceRateRows(null, { isLive: true })).toBe(false);
    expect(hasReinsuranceRateRows(null, [])).toBe(false);
    expect(hasReinsuranceRateRows(null, [{ ticker: 'RNR' }])).toBe(false);
  });

  it('hasReinsuranceRateRows is true when a proxy row or priced reinsurer exists', () => {
    expect(hasReinsuranceRateRows({ byCategory: [{ ticker: 'RNR' }] })).toBe(true);
    expect(hasReinsuranceRateRows([{ ticker: 'ACGL', price: 96.2 }])).toBe(true);
    expect(hasReinsuranceRateRows(null, [{ ticker: 'RNR', price: 210 }])).toBe(true);
  });
});

describe('credit empty-capable tiles (kpi / spreads / EM / CP / CLO / defaults / TED / muni)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/credit/components/CreditDashboard.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!isLive/);
    expect(dash).not.toMatch(/'key-metrics':\s*!!isLive/);
    expect(dash).not.toMatch(/'credit-spreads':\s*!!isLive/);
    expect(dash).not.toMatch(/'spread-summary':\s*!!isLive/);
    expect(dash).not.toMatch(/'em-yields':\s*!!isLive/);
    expect(dash).not.toMatch(/'cp-rates':\s*!!isLive/);
    expect(dash).not.toMatch(/'clo-tranches':\s*!!isLive/);
    expect(dash).not.toMatch(/'default-rates':\s*!!isLive/);
    expect(dash).not.toMatch(/delinquency:\s*!!isLive/);
    expect(dash).not.toMatch(/'ted-spread':\s*!!isLive/);
    expect(dash).not.toMatch(/'muni-market':\s*!!msrbCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/kpi:\s*hasCreditKpiMetrics/);
    expect(dash).toMatch(/'key-metrics':\s*hasKeyMetricsContent/);
    expect(dash).toMatch(/'credit-spreads':\s*hasSpreadHistory/);
    expect(dash).toMatch(/'spread-summary':\s*hasSpreadSummary/);
    expect(dash).toMatch(/'em-yields':\s*hasEmYieldRows/);
    expect(dash).toMatch(/'cp-rates':\s*hasCpRates/);
    expect(dash).toMatch(/'clo-tranches':\s*hasCloTranches/);
    expect(dash).toMatch(/'default-rates':\s*hasDefaultRateRows/);
    expect(dash).toMatch(/delinquency:\s*hasDelinquencyRows/);
    expect(dash).toMatch(/'ted-spread':\s*hasTedSpreadSeries/);
    expect(dash).toMatch(/'muni-market':\s*hasMuniMarketSummary/);
  });

  it('hasCreditKpiMetrics is false for empty / isLive-only payloads', () => {
    expect(hasCreditKpiMetrics()).toBe(false);
    expect(hasCreditKpiMetrics({})).toBe(false);
    expect(hasCreditKpiMetrics({ spreadData: { isLive: true } })).toBe(false);
    expect(hasCreditKpiMetrics({ spreadData: { current: {} }, defaultData: { rates: [] } })).toBe(false);
    expect(hasCreditKpiMetrics({ commercialPaper: { isLive: true } })).toBe(false);
  });

  it('hasCreditKpiMetrics is true when a painted KPI number exists', () => {
    expect(hasCreditKpiMetrics({ spreadData: { current: { igSpread: 95 } } })).toBe(true);
    expect(hasCreditKpiMetrics({ defaultData: { rates: [{ category: 'C&I Charge-Off', value: 1.2 }] } })).toBe(true);
    expect(hasCreditKpiMetrics({ commercialPaper: { rate: 4.3 } })).toBe(true);
    expect(hasCreditKpiMetrics({ emBondData: { countries: [{ country: 'MX', spread: 210 }] } })).toBe(true);
  });

  it('hasKeyMetricsContent is false for empty / sibling-only payloads', () => {
    expect(hasKeyMetricsContent()).toBe(false);
    expect(hasKeyMetricsContent({ spreadData: { history: { dates: ['2024-01'] } } })).toBe(false);
    expect(hasKeyMetricsContent({ defaultData: { chargeoffs: { dates: ['2024'] } } })).toBe(false);
  });

  it('hasKeyMetricsContent is true when a sidebar metric exists', () => {
    expect(hasKeyMetricsContent({ spreadData: { current: { hySpread: 310 } } })).toBe(true);
    expect(hasKeyMetricsContent({ defaultData: { rates: [{ category: 'Cards', value: 3.1 }] } })).toBe(true);
    expect(hasKeyMetricsContent({ delinquencyRates: [{ type: 'Consumer', rate: 2.4 }] })).toBe(true);
  });

  it('hasSpreadHistory is false for empty / current-only payloads', () => {
    expect(hasSpreadHistory(null)).toBe(false);
    expect(hasSpreadHistory({})).toBe(false);
    expect(hasSpreadHistory({ isLive: true, current: { igSpread: 95 } })).toBe(false);
    expect(hasSpreadHistory({ history: { dates: ['2024-01'], IG: [null, null] } })).toBe(false);
  });

  it('hasSpreadHistory is true when a history series has values', () => {
    expect(hasSpreadHistory({ history: { dates: ['2024-01'], HY: [310] } })).toBe(true);
  });

  it('hasSpreadSummary is false for empty / history-only payloads', () => {
    expect(hasSpreadSummary(null)).toBe(false);
    expect(hasSpreadSummary({})).toBe(false);
    expect(hasSpreadSummary({ history: { dates: ['2024-01'], IG: [95] } })).toBe(false);
    expect(hasSpreadSummary({ current: {} })).toBe(false);
  });

  it('hasSpreadSummary is true when a current OAS exists', () => {
    expect(hasSpreadSummary({ current: { emSpread: 180 } })).toBe(true);
  });

  it('hasEmYieldRows is false for empty / sibling-only payloads', () => {
    expect(hasEmYieldRows(null)).toBe(false);
    expect(hasEmYieldRows({})).toBe(false);
    expect(hasEmYieldRows({ isLive: true })).toBe(false);
    expect(hasEmYieldRows({ countries: [] })).toBe(false);
    expect(hasEmYieldRows({ MX: { yld10y: 9.1 } })).toBe(false);
  });

  it('hasEmYieldRows is true when country rows exist', () => {
    expect(hasEmYieldRows({ countries: [{ country: 'MX', yld10y: 9.1 }] })).toBe(true);
    expect(hasEmYieldRows([{ country: 'BR', etfYield: 6.2 }])).toBe(true);
  });

  it('hasCpRates is false for empty / isLive-only payloads', () => {
    expect(hasCpRates(null)).toBe(false);
    expect(hasCpRates({})).toBe(false);
    expect(hasCpRates({ isLive: true })).toBe(false);
    expect(hasCpRates([])).toBe(false);
  });

  it('hasCpRates is true when a CP rate or volume exists', () => {
    expect(hasCpRates({ rate: 4.3 })).toBe(true);
    expect(hasCpRates({ financial3m: 4.5, nonfinancial3m: 4.2 })).toBe(true);
    expect(hasCpRates({ volume: 1.2e12 })).toBe(true);
  });

  it('hasCloTranches is false for empty / sibling-only payloads', () => {
    expect(hasCloTranches(null)).toBe(false);
    expect(hasCloTranches({})).toBe(false);
    expect(hasCloTranches({ isLive: true })).toBe(false);
    expect(hasCloTranches({ cloTranches: [] })).toBe(false);
    expect(hasCloTranches({ AAA: { spread: 120 } })).toBe(false);
  });

  it('hasCloTranches is true when tranche rows exist', () => {
    expect(hasCloTranches({ cloTranches: [{ tranche: 'AAA', spread: 120 }] })).toBe(true);
    expect(hasCloTranches([{ tranche: 'BBB', yield: 7.1 }])).toBe(true);
  });

  it('hasDefaultRateRows is false for empty / sibling-only payloads', () => {
    expect(hasDefaultRateRows(null)).toBe(false);
    expect(hasDefaultRateRows({})).toBe(false);
    expect(hasDefaultRateRows({ isLive: true, defaultRate: null })).toBe(false);
    expect(hasDefaultRateRows({ rates: [] })).toBe(false);
    expect(hasDefaultRateRows({ chargeoffs: { dates: ['2024'] } })).toBe(false);
  });

  it('hasDefaultRateRows is true when rate rows exist', () => {
    expect(hasDefaultRateRows({ rates: [{ category: 'C&I Charge-Off', value: 1.2 }] })).toBe(true);
  });

  it('hasDelinquencyRows is false for empty / sibling-only payloads', () => {
    expect(hasDelinquencyRows(null)).toBe(false);
    expect(hasDelinquencyRows([])).toBe(false);
    expect(hasDelinquencyRows({ Consumer: 2.4 })).toBe(false);
  });

  it('hasDelinquencyRows is true when delinquency rows exist', () => {
    expect(hasDelinquencyRows([{ type: 'Consumer', rate: 2.4 }])).toBe(true);
  });

  it('hasTedSpreadSeries is false for empty / isLive-only payloads', () => {
    expect(hasTedSpreadSeries(null)).toBe(false);
    expect(hasTedSpreadSeries({})).toBe(false);
    expect(hasTedSpreadSeries({ isLive: true, latest: 0.15 })).toBe(false);
    expect(hasTedSpreadSeries({ dates: ['2024-01'] })).toBe(false);
  });

  it('hasTedSpreadSeries is true when TED values exist', () => {
    expect(hasTedSpreadSeries({ values: [0.15, 0.18], dates: ['2024-01', '2024-02'] })).toBe(true);
  });

  it('hasMuniMarketSummary is false for empty / isLive-only payloads', () => {
    expect(hasMuniMarketSummary(null)).toBe(false);
    expect(hasMuniMarketSummary({})).toBe(false);
    expect(hasMuniMarketSummary({ isLive: true, tradeTypes: [] })).toBe(false);
  });

  it('hasMuniMarketSummary is true when a trade or issuance row paints', () => {
    expect(hasMuniMarketSummary({ tradeTypes: [{ type: 'All', trades: 12000, parM: 410 }] })).toBe(true);
    expect(hasMuniMarketSummary({ primaryMarket: [{ period: 'January', parM: 2100 }] })).toBe(true);
  });
});


describe('credit leftover empty-capable tiles (default-rates remount)', () => {
  it('dashboard does not slice leftover isLive default-rate bags', () => {
    const dash = src('markets/credit/components/CreditDashboard.jsx');
    expect(dash).not.toMatch(/defaultData\?\.rates \|\| \[\]/);
    expect(dash).toMatch(/defaultRateRows\(defaultData\)/);
  });

  it('defaultRateRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => defaultRateRows({ isLive: true })).not.toThrow();
    expect(() => defaultRateRows({ rates: { isLive: true } })).not.toThrow();
    expect(() => defaultRateRows({ rates: true })).not.toThrow();
    expect(defaultRateRows({ isLive: true })).toEqual([]);
    expect(defaultRateRows({ rates: { isLive: true } })).toEqual([]);
    expect(defaultRateRows({ rates: true })).toEqual([]);
    expect(() => defaultRateRows({ rates: { isLive: true } }).slice(0, 10)).not.toThrow();
    const rows = defaultRateRows({
      isLive: true,
      rates: [
        { isLive: true },
        { category: 'C&I Charge-Off', value: 1.2 },
      ],
    });
    expect(rows.map((r) => r.category)).toEqual([undefined, 'C&I Charge-Off']);
    expect(() => rows.slice(0, 10).map((d) => d.value)).not.toThrow();
  });
});

describe('credit leftover empty-capable tiles (bank-stress)', () => {
  it('dashboard does not hardcode leftover bag existence on bank-stress', () => {
    const dash = src('markets/credit/components/CreditDashboard.jsx');
    expect(dash).not.toMatch(/'bank-stress':\s*!!\(fdicCtx\?\.data\?\.aggregate\?\.length \|\| spreadData\)/);
    expect(dash).not.toMatch(/'bank-stress':\s*!!spreadData/);
    expect(dash).toMatch(/'bank-stress':\s*hasBankStressContent\(/);
  });

  it('hasBankStressContent is false for empty / leftover bag-only payloads', () => {
    expect(hasBankStressContent()).toBe(false);
    expect(hasBankStressContent({})).toBe(false);
    expect(hasBankStressContent({ spreadData: { isLive: true } })).toBe(false);
    expect(hasBankStressContent({ spreadData: {} })).toBe(false);
    expect(hasBankStressContent({ spreadData: { current: {}, history: { dates: ['2024-01'], HY: [310] } } })).toBe(false);
    expect(hasBankStressContent({ defaultData: { chargeoffs: { dates: ['2024'] } } })).toBe(false);
    expect(hasBankStressContent({ commercialPaper: { isLive: true, volume: 1e12 } })).toBe(false);
    expect(hasBankStressContent({ fdicData: { aggregate: [{ year: 2024 }] } })).toBe(false);
    expect(hasBankStressContent({ fdicData: { aggregate: [{ depositsB: 18000 }] } })).toBe(false);
    expect(hasBankStressContent({ fdicData: { failures: [] } })).toBe(false);
  });

  it('hasBankStressContent is true when a painted stress metric exists', () => {
    expect(hasBankStressContent({ spreadData: { current: { hySpread: 310 } } })).toBe(true);
    expect(hasBankStressContent({ spreadData: { current: { igSpread: 95 } } })).toBe(true);
    expect(hasBankStressContent({ defaultData: { defaultRate: 2.4 } })).toBe(true);
    expect(hasBankStressContent({ defaultData: { rates: [{ category: 'C&I', value: 1.2 }] } })).toBe(true);
    expect(hasBankStressContent({ commercialPaper: { rate: 4.3 } })).toBe(true);
    expect(hasBankStressContent({
      fdicData: { aggregate: [{ year: 2024, depositsB: 19000 }, { year: 2023, depositsB: 18000 }] },
    })).toBe(true);
    expect(hasBankStressContent({
      fdicData: { failures: [{ name: 'Example Bank', date: '2024-03-01', assets: 2000 }] },
    })).toBe(true);
  });
});


describe('credit leftover empty-capable tiles (credit-quality)', () => {
  it('dashboard does not hardcode leftover dates-only on credit-quality', () => {
    const dash = src('markets/credit/components/CreditDashboard.jsx');
    expect(dash).not.toMatch(/'credit-quality':\s*!!creditQuality\?\.dates\?\.length/);
    expect(dash).toMatch(/'credit-quality':\s*hasCreditQualitySeries\(/);
  });

  it('hasCreditQualitySeries is false for empty / dates-only leftover bags', () => {
    expect(hasCreditQualitySeries()).toBe(false);
    expect(hasCreditQualitySeries(null)).toBe(false);
    expect(hasCreditQualitySeries({})).toBe(false);
    expect(hasCreditQualitySeries({ isLive: true })).toBe(false);
    expect(hasCreditQualitySeries({ dates: ['2024-01'] })).toBe(false);
    expect(hasCreditQualitySeries({ dates: ['2024-01'], aaaPct: [], baaPct: [], spreadBps: [] })).toBe(false);
    expect(hasCreditQualitySeries({ dates: ['2024-01'], aaaPct: [null, null] })).toBe(false);
    expect(hasCreditQualitySeries({ aaaPct: [4.7], baaPct: [5.5] })).toBe(false);
    expect(hasCreditQualitySeries({ latest: { spreadBps: 80 } })).toBe(false);
  });

  it('hasCreditQualitySeries is true when dates and a series paint', () => {
    expect(hasCreditQualitySeries({ dates: ['2024-01'], aaaPct: [4.7] })).toBe(true);
    expect(hasCreditQualitySeries({ dates: ['2024-01'], baaPct: [5.5] })).toBe(true);
    expect(hasCreditQualitySeries({ dates: ['2024-01'], spreadBps: [80] })).toBe(true);
    expect(hasCreditQualitySeries({ dates: ['2024-01'], aaaPct: [null, 4.7] })).toBe(true);
  });
});

describe('eia empty-capable tiles (prices / consumption / trends / co2 / petroleum / natural-gas)', () => {
  it('market does not blanket !!props.isLive on empty-capable tiles', () => {
    const dash = src('markets/eia/EiaMarket.jsx');
    expect(dash).not.toMatch(/Object\.fromEntries\(ids\.map\(\(id\) => \[id, !!props\.isLive\]\)\)/);
    expect(dash).not.toMatch(/prices:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/consumption:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/trends:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/co2:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/petroleum:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/'natural-gas':\s*!!props\.isLive/);
    expect(dash).toMatch(/prices:\s*hasElectricityPrices/);
    expect(dash).toMatch(/consumption:\s*hasElectricitySales/);
    expect(dash).toMatch(/trends:\s*hasElectricityPriceTrends/);
    expect(dash).toMatch(/co2:\s*hasCo2SectorRows/);
    expect(dash).toMatch(/petroleum:\s*hasPetroleumSeries/);
    expect(dash).toMatch(/'natural-gas':\s*hasHenryHubSeries/);
  });

  it('hasElectricityPrices is false for empty / sibling-only payloads', () => {
    expect(hasElectricityPrices(null)).toBe(false);
    expect(hasElectricityPrices({})).toBe(false);
    expect(hasElectricityPrices({ isLive: true })).toBe(false);
    expect(hasElectricityPrices({ residential: { price: { values: [12, 13, 14] } } })).toBe(false);
    expect(hasElectricityPrices({ residential: { latest: {} } })).toBe(false);
  });

  it('hasElectricityPrices is true when a sector latest.price exists', () => {
    expect(hasElectricityPrices({ residential: { latest: { price: 16.2 } } })).toBe(true);
    expect(hasElectricityPrices({ industrial: { latest: { price: 8.4, period: '2024-12' } } })).toBe(true);
  });

  it('hasElectricitySales is false for empty / price-only payloads', () => {
    expect(hasElectricitySales(null)).toBe(false);
    expect(hasElectricitySales({})).toBe(false);
    expect(hasElectricitySales({ isLive: true })).toBe(false);
    expect(hasElectricitySales({ residential: { latest: { price: 16.2 } } })).toBe(false);
    expect(hasElectricitySales({ commercial: { latest: { sales: null } } })).toBe(false);
  });

  it('hasElectricitySales is true when a sector latest.sales exists', () => {
    expect(hasElectricitySales({ commercial: { latest: { sales: 110000 } } })).toBe(true);
  });

  it('hasElectricityPriceTrends is false for empty / all-null / short series', () => {
    expect(hasElectricityPriceTrends(null)).toBe(false);
    expect(hasElectricityPriceTrends({})).toBe(false);
    expect(hasElectricityPriceTrends({ residential: { latest: { price: 16.2 } } })).toBe(false);
    expect(hasElectricityPriceTrends({ residential: { price: { values: [12, 13] } } })).toBe(false);
    expect(hasElectricityPriceTrends({ residential: { price: { values: [null, null, null] } } })).toBe(false);
  });

  it('hasElectricityPriceTrends is true when a sector has a sparkline-capable series', () => {
    expect(hasElectricityPriceTrends({ residential: { price: { values: [12, 13, 14] } } })).toBe(true);
    expect(hasElectricityPriceTrends({ industrial: { price: { values: [null, 8.1, 8.4] } } })).toBe(true);
  });

  it('hasCo2SectorRows is false for empty / Total-only / sibling-only payloads', () => {
    expect(hasCo2SectorRows(null)).toBe(false);
    expect(hasCo2SectorRows({})).toBe(false);
    expect(hasCo2SectorRows({ isLive: true, total: { latest: 4800 } })).toBe(false);
    expect(hasCo2SectorRows({ bySector: [] })).toBe(false);
    expect(hasCo2SectorRows({ bySector: [{ name: 'Total', latest: 4800 }] })).toBe(false);
    expect(hasCo2SectorRows({ bySector: [{ name: 'TT', latest: 4800 }] })).toBe(false);
  });

  it('hasCo2SectorRows is true when a non-total sector row exists', () => {
    expect(hasCo2SectorRows({ bySector: [{ name: 'Electric Power', latest: 1500, unit: 'MMmt' }] })).toBe(true);
  });

  it('hasPetroleumSeries is false for empty / latest-only / single-point payloads', () => {
    expect(hasPetroleumSeries(null)).toBe(false);
    expect(hasPetroleumSeries({})).toBe(false);
    expect(hasPetroleumSeries({ isLive: true })).toBe(false);
    expect(hasPetroleumSeries({ wti: { latest: { value: 78.2 } } })).toBe(false);
    expect(hasPetroleumSeries({ wti: { values: [78.2] } })).toBe(false);
    expect(hasPetroleumSeries({ wti: { values: [null, null] } })).toBe(false);
    expect(hasPetroleumSeries({ jetFuel: { values: [2.1, 2.2] } })).toBe(false);
  });

  it('hasPetroleumSeries is true when a product has a sparkline-capable series', () => {
    expect(hasPetroleumSeries({ wti: { values: [76.1, 78.2] } })).toBe(true);
    expect(hasPetroleumSeries({ gasoline: { values: [null, 3.1, 3.2] } })).toBe(true);
  });

  it('hasHenryHubSeries is false for empty / latest-only payloads', () => {
    expect(hasHenryHubSeries(null)).toBe(false);
    expect(hasHenryHubSeries({})).toBe(false);
    expect(hasHenryHubSeries({ isLive: true })).toBe(false);
    expect(hasHenryHubSeries({ henryHub: { latest: { value: 2.4 } } })).toBe(false);
    expect(hasHenryHubSeries({ henryHub: { values: [] } })).toBe(false);
  });

  it('hasHenryHubSeries is true when Henry Hub values exist', () => {
    expect(hasHenryHubSeries({ henryHub: { values: [2.4], latest: { value: 2.4 } } })).toBe(true);
  });
});

describe('fx empty-capable tiles (kpi / sidebar / movers)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/fx/components/FXDashboard.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!isLive/);
    expect(dash).not.toMatch(/sidebar:\s*!!isLive/);
    expect(dash).not.toMatch(/movers:\s*!!isLive/);
    expect(dash).toMatch(/kpi:\s*hasFxKpiMetrics/);
    expect(dash).toMatch(/sidebar:\s*hasFxSpotRates/);
    expect(dash).toMatch(/movers:\s*hasFxMovers/);
  });

  it('hasFxKpiMetrics is false for empty / sibling-only payloads', () => {
    expect(hasFxKpiMetrics()).toBe(false);
    expect(hasFxKpiMetrics({})).toBe(false);
    expect(hasFxKpiMetrics({ spotRates: { isLive: true } })).toBe(false);
    expect(hasFxKpiMetrics({ spotRates: { USD: 1 } })).toBe(false);
    expect(hasFxKpiMetrics({ changes: { USD: 0 }, dxyHistory: { dates: ['2024-01'] } })).toBe(false);
    expect(hasFxKpiMetrics({ dxyHistory: { values: [] } })).toBe(false);
  });

  it('hasFxKpiMetrics is true when a painted KPI number exists', () => {
    expect(hasFxKpiMetrics({ spotRates: { EUR: 0.92 } })).toBe(true);
    expect(hasFxKpiMetrics({ dxyHistory: { values: [104.2] } })).toBe(true);
    expect(hasFxKpiMetrics({ changes: { GBP: -0.15 } })).toBe(true);
  });

  it('hasFxSpotRates is false for empty / USD-only / sibling-only payloads', () => {
    expect(hasFxSpotRates(null)).toBe(false);
    expect(hasFxSpotRates({})).toBe(false);
    expect(hasFxSpotRates({ isLive: true })).toBe(false);
    expect(hasFxSpotRates({ USD: 1 })).toBe(false);
  });

  it('hasFxSpotRates is true when a non-USD spot rate exists', () => {
    expect(hasFxSpotRates({ EUR: 0.92, USD: 1 })).toBe(true);
    expect(hasFxSpotRates({ JPY: 149.2 })).toBe(true);
  });

  it('hasFxMovers is false for empty / USD-only payloads', () => {
    expect(hasFxMovers(null)).toBe(false);
    expect(hasFxMovers({})).toBe(false);
    expect(hasFxMovers({ isLive: true })).toBe(false);
    expect(hasFxMovers({ USD: 0 })).toBe(false);
  });

  it('hasFxMovers is true when a non-USD 1d change exists', () => {
    expect(hasFxMovers({ EUR: 0.21, USD: 0 })).toBe(true);
    expect(hasFxMovers({ JPY: -0.4 })).toBe(true);
  });
});

describe('sentiment empty-capable tiles (sidebar / key-metrics / FSI / CFTC / cross-asset / risk-dashboard)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/sentiment/components/SentimentDashboard.jsx');
    expect(dash).not.toMatch(/sidebar:\s*!!isLive/);
    expect(dash).not.toMatch(/'key-metrics':\s*!!isLive/);
    expect(dash).not.toMatch(/fsi:\s*!!isLive/);
    expect(dash).not.toMatch(/cftc:\s*!!isLive/);
    expect(dash).not.toMatch(/'cross-asset':\s*!!isLive/);
    expect(dash).not.toMatch(/'risk-dashboard':\s*!!isLive/);
    expect(dash).toMatch(/sidebar:\s*hasSentimentSidebarContent/);
    expect(dash).toMatch(/'key-metrics':\s*hasSentimentKeyMetrics/);
    expect(dash).toMatch(/fsi:\s*hasFsiHistory/);
    expect(dash).toMatch(/cftc:\s*hasCftcCurrencies/);
    expect(dash).toMatch(/'cross-asset':\s*hasCrossAssetReturns/);
    expect(dash).toMatch(/'risk-dashboard':\s*hasRiskDashboardContent/);
  });

  it('hasSentimentSidebarContent is false for empty / sibling-only payloads', () => {
    expect(hasSentimentSidebarContent()).toBe(false);
    expect(hasSentimentSidebarContent({})).toBe(false);
    expect(hasSentimentSidebarContent({ fearGreedData: { isLive: true } })).toBe(false);
    expect(hasSentimentSidebarContent({ riskData: { isLive: true, signals: [] } })).toBe(false);
    expect(hasSentimentSidebarContent({ marginDebt: { dates: ['2024-01'] } })).toBe(false);
  });

  it('hasSentimentSidebarContent is true when a painted sidebar metric exists', () => {
    expect(hasSentimentSidebarContent({ fearGreedData: { value: 42 } })).toBe(true);
    expect(hasSentimentSidebarContent({ riskData: { vix: 18.2 } })).toBe(true);
    expect(hasSentimentSidebarContent({ riskData: { overallLabel: 'Risk-On' } })).toBe(true);
    expect(hasSentimentSidebarContent({ marginDebt: { values: [812000] } })).toBe(true);
  });

  it('hasSentimentKeyMetrics is false for empty / sibling-only payloads', () => {
    expect(hasSentimentKeyMetrics()).toBe(false);
    expect(hasSentimentKeyMetrics({})).toBe(false);
    expect(hasSentimentKeyMetrics({ fearGreedData: { classification: 'Fear' } })).toBe(false);
    expect(hasSentimentKeyMetrics({ riskData: { isLive: true, overallLabel: 'Risk-On' } })).toBe(false);
    expect(hasSentimentKeyMetrics({ fsiHistory: { dates: ['2024-01'] } })).toBe(false);
  });

  it('hasSentimentKeyMetrics is true when a painted key-metrics number exists', () => {
    expect(hasSentimentKeyMetrics({ riskData: { overallScore: 61 } })).toBe(true);
    expect(hasSentimentKeyMetrics({ fearGreedData: { altmeScore: 38 } })).toBe(true);
    expect(hasSentimentKeyMetrics({ riskData: { move: 92.4 } })).toBe(true);
    expect(hasSentimentKeyMetrics({ fsiHistory: { values: [0.12] } })).toBe(true);
  });

  it('hasFsiHistory is false for empty / values-only / sibling-only payloads', () => {
    expect(hasFsiHistory(null)).toBe(false);
    expect(hasFsiHistory({})).toBe(false);
    expect(hasFsiHistory({ isLive: true })).toBe(false);
    expect(hasFsiHistory({ values: [0.12] })).toBe(false);
    expect(hasFsiHistory({ dates: [] })).toBe(false);
  });

  it('hasFsiHistory is true when FSI dates exist', () => {
    expect(hasFsiHistory({ dates: ['2024-01'], values: [0.12] })).toBe(true);
  });

  it('hasCftcCurrencies is false for empty / sibling-only payloads', () => {
    expect(hasCftcCurrencies(null)).toBe(false);
    expect(hasCftcCurrencies({})).toBe(false);
    expect(hasCftcCurrencies({ isLive: true, asOf: '2024-01-02' })).toBe(false);
    expect(hasCftcCurrencies({ currencies: [] })).toBe(false);
  });

  it('hasCftcCurrencies is true when currency rows exist', () => {
    expect(hasCftcCurrencies({ currencies: [{ code: 'EUR', netPctOi: 12 }] })).toBe(true);
  });

  it('hasCrossAssetReturns is false for empty / sibling-only payloads', () => {
    expect(hasCrossAssetReturns(null)).toBe(false);
    expect(hasCrossAssetReturns({})).toBe(false);
    expect(hasCrossAssetReturns({ isLive: true })).toBe(false);
    expect(hasCrossAssetReturns({ assets: [] })).toBe(false);
    expect(hasCrossAssetReturns([])).toBe(false);
  });

  it('hasCrossAssetReturns is true when return rows exist', () => {
    expect(hasCrossAssetReturns({ assets: [{ label: 'SPX', ret1d: 0.4 }] })).toBe(true);
    expect(hasCrossAssetReturns([{ ticker: 'GLD', return: -0.2 }])).toBe(true);
  });

  it('hasRiskDashboardContent is false for empty / sibling-only payloads', () => {
    expect(hasRiskDashboardContent()).toBe(false);
    expect(hasRiskDashboardContent({})).toBe(false);
    expect(hasRiskDashboardContent({ riskData: { isLive: true } })).toBe(false);
    expect(hasRiskDashboardContent({ fsiHistory: { dates: ['2024-01'] } })).toBe(false);
    expect(hasRiskDashboardContent({ vvixHistory: { dates: ['2024-01'], values: [18.2] } })).toBe(false);
    expect(hasRiskDashboardContent({ marginDebt: { values: [812000] } })).toBe(false);
  });

  it('hasRiskDashboardContent is true when a score, signal, or history series exists', () => {
    expect(hasRiskDashboardContent({ riskData: { overallScore: 61 } })).toBe(true);
    expect(hasRiskDashboardContent({ riskData: { signals: [{ name: 'VIX', value: 18.2 }] } })).toBe(true);
    expect(hasRiskDashboardContent({ fsiHistory: { dates: ['2024-01'], values: [0.12] } })).toBe(true);
    expect(hasRiskDashboardContent({ marginDebt: { dates: ['2024-01'], values: [812000] } })).toBe(true);
  });
});

describe('bonds empty-capable tiles (kpi)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/bonds/components/BondsDashboard.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!isLive/);
    expect(dash).toMatch(/kpi:\s*hasBondsKpiMetrics/);
  });

  it('hasBondsKpiMetrics is false for empty / sibling-only payloads', () => {
    expect(hasBondsKpiMetrics()).toBe(false);
    expect(hasBondsKpiMetrics({})).toBe(false);
    expect(hasBondsKpiMetrics({ treasuryRates: { isLive: true } })).toBe(false);
    expect(hasBondsKpiMetrics({ yieldCurveData: { US: {} } })).toBe(false);
    expect(hasBondsKpiMetrics({ spreadData: { history: { dates: ['2024-01'] } } })).toBe(false);
    expect(hasBondsKpiMetrics({ breakevensData: { history: { dates: ['2024-01'] } } })).toBe(false);
    expect(hasBondsKpiMetrics({ fedFundsFutures: { isLive: true } })).toBe(false);
    expect(hasBondsKpiMetrics({ spreadIndicators: { isLive: true } })).toBe(false);
  });

  it('hasBondsKpiMetrics is true when a painted KPI number exists', () => {
    expect(hasBondsKpiMetrics({ treasuryRates: { US10Y: 4.25 } })).toBe(true);
    expect(hasBondsKpiMetrics({ yieldCurveData: { US: { '10y': 4.2 } } })).toBe(true);
    expect(hasBondsKpiMetrics({ treasuryRates: { US2Y: 4.1 } })).toBe(true);
    expect(hasBondsKpiMetrics({ spreadIndicators: { t10y2y: -0.15 } })).toBe(true);
    expect(hasBondsKpiMetrics({ fedFundsFutures: { m1: 5.25 } })).toBe(true);
    expect(hasBondsKpiMetrics({ treasuryRates: { fedFunds: 5.33 } })).toBe(true);
    expect(hasBondsKpiMetrics({ spreadData: { current: { igSpread: 95 } } })).toBe(true);
    expect(hasBondsKpiMetrics({ spreadData: { current: { hy: 310 } } })).toBe(true);
    expect(hasBondsKpiMetrics({ breakevensData: { current: { be5y: 2.31 } } })).toBe(true);
    expect(hasBondsKpiMetrics({
      treasuryRates: { US10Y: 4.25, US2Y: 4.10 },
    })).toBe(true);
  });
});

describe('bonds leftover empty-capable tiles (metrics / ratings / treasury-cost)', () => {
  it('dashboard does not hardcode leftover bag existence on empty-capable tiles', () => {
    const dash = src('markets/bonds/components/BondsDashboard.jsx');
    expect(dash).not.toMatch(/metrics:\s*!!\(macroData && Object\.values\(macroData\)/);
    expect(dash).not.toMatch(/ratings:\s*!!creditRatingsAsOf/);
    expect(dash).not.toMatch(/'treasury-cost':\s*!!treasuryCostCtx\?\.data\?\.latest/);
    expect(dash).toMatch(/metrics:\s*hasBondsMetricsContent\(/);
    expect(dash).toMatch(/ratings:\s*hasCreditRatingsRows\(creditRatingsData\)/);
    expect(dash).toMatch(/'treasury-cost':\s*hasTreasuryCostRates\(treasuryCostCtx\?\.data\?\.latest\)/);
  });

  it('hasBondsMetricsContent is false for empty / leftover bag-only payloads', () => {
    expect(hasBondsMetricsContent()).toBe(false);
    expect(hasBondsMetricsContent({})).toBe(false);
    expect(hasBondsMetricsContent({ macroData: { isLive: true } })).toBe(false);
    expect(hasBondsMetricsContent({ macroData: { centralBankRates: {} } })).toBe(false);
    expect(hasBondsMetricsContent({ yieldCurveData: { US: {} } })).toBe(false);
    expect(hasBondsMetricsContent({ spreadIndicators: { isLive: true } })).toBe(false);
    expect(hasBondsMetricsContent({ tipsYields: {} })).toBe(false);
    expect(hasBondsMetricsContent({ spreadData: { history: { dates: ['2024-01'] } } })).toBe(false);
    expect(hasBondsMetricsContent({ fedFundsFutures: { isLive: true } })).toBe(false);
    expect(hasBondsMetricsContent({ breakevensData: { history: { dates: ['2024-01'] } } })).toBe(false);
  });

  it('hasBondsMetricsContent is true when a painted sidebar number exists', () => {
    expect(hasBondsMetricsContent({ yieldCurveData: { US: { '10y': 4.2 } } })).toBe(true);
    expect(hasBondsMetricsContent({ spreadIndicators: { t10y2y: -0.15 } })).toBe(true);
    expect(hasBondsMetricsContent({ tipsYields: { '10y': 1.8 } })).toBe(true);
    expect(hasBondsMetricsContent({ macroData: { unemployment: 4.1 } })).toBe(true);
    expect(hasBondsMetricsContent({ nationalDebt: 36000000 })).toBe(true);
    expect(hasBondsMetricsContent({ breakevensData: { current: { be5y: 2.31 } } })).toBe(true);
    expect(hasBondsMetricsContent({ fedFundsFutures: { effectiveRate: 5.33 } })).toBe(true);
    expect(hasBondsMetricsContent({ spreadData: { current: { igSpread: 95 } } })).toBe(true);
  });

  it('hasCreditRatingsRows is false for empty / asOf-only leftover payloads', () => {
    expect(hasCreditRatingsRows()).toBe(false);
    expect(hasCreditRatingsRows(null)).toBe(false);
    expect(hasCreditRatingsRows({})).toBe(false);
    expect(hasCreditRatingsRows([])).toBe(false);
    expect(hasCreditRatingsRows({ asOf: '2024-01-01', isLive: true })).toBe(false);
  });

  it('hasCreditRatingsRows is true when a country row exists', () => {
    expect(hasCreditRatingsRows([{ country: 'US', name: 'United States', sp: 'AA+' }])).toBe(true);
  });

  it('hasTreasuryCostRates is false for empty / latest-bag-only payloads', () => {
    expect(hasTreasuryCostRates()).toBe(false);
    expect(hasTreasuryCostRates(null)).toBe(false);
    expect(hasTreasuryCostRates({})).toBe(false);
    expect(hasTreasuryCostRates({ isLive: true })).toBe(false);
    expect(hasTreasuryCostRates({ Bills: {} })).toBe(false);
    expect(hasTreasuryCostRates({ Bills: { rate: null } })).toBe(false);
    expect(hasTreasuryCostRates({ Notes: { rate: '—' } })).toBe(false);
  });

  it('hasTreasuryCostRates is true when a painted rate exists', () => {
    expect(hasTreasuryCostRates({ Bills: { rate: 4.52 } })).toBe(true);
    expect(hasTreasuryCostRates({ Notes: { rate: '3.80' } })).toBe(true);
  });
});

describe('bonds leftover empty-capable tiles (curvespreads / fed / m2 / debtgdp)', () => {
  it('dashboard does not hardcode leftover dates-only on empty-capable tiles', () => {
    const dash = src('markets/bonds/components/BondsDashboard.jsx');
    expect(dash).not.toMatch(/curvespreads:\s*!!\(spreadHistory\?\.dates\?\.length/);
    expect(dash).not.toMatch(/fed:\s*!!\(fedBalanceSheetHistory\?\.dates\?\.length/);
    expect(dash).not.toMatch(/m2:\s*!!\(m2HistoryData\?\.dates\?\.length/);
    expect(dash).not.toMatch(/debtgdp:\s*!!\(debtToGdpHistory\?\.dates\?\.length/);
    expect(dash).toMatch(/curvespreads:\s*hasCurveSpreadSeries\(spreadHistory\)/);
    expect(dash).toMatch(/fed:\s*hasFedBalanceSeries\(fedBalanceSheetHistory\)/);
    expect(dash).toMatch(/m2:\s*hasM2Series\(m2HistoryData\)/);
    expect(dash).toMatch(/debtgdp:\s*hasDebtGdpSeries\(debtToGdpHistory\)/);
  });

  it('hasCurveSpreadSeries is false for empty / dates-only leftover bags', () => {
    expect(hasCurveSpreadSeries()).toBe(false);
    expect(hasCurveSpreadSeries(null)).toBe(false);
    expect(hasCurveSpreadSeries({})).toBe(false);
    expect(hasCurveSpreadSeries({ isLive: true })).toBe(false);
    expect(hasCurveSpreadSeries({ dates: ['2024-01'] })).toBe(false);
    expect(hasCurveSpreadSeries({ dates: ['2024-01'], t10y2y: [], t10y3m: [], t5y30y: [] })).toBe(false);
    expect(hasCurveSpreadSeries({ dates: ['2024-01'], t10y2y: [null, null] })).toBe(false);
    expect(hasCurveSpreadSeries({ t10y2y: [0.12], t10y3m: [-1.1] })).toBe(false);
    expect(hasCurveSpreadSeries({ latest: { t5y30y: 0.45 } })).toBe(false);
  });

  it('hasCurveSpreadSeries is true when dates and a series paint', () => {
    expect(hasCurveSpreadSeries({ dates: ['2024-01'], t10y2y: [0.12] })).toBe(true);
    expect(hasCurveSpreadSeries({ dates: ['2024-01'], t10y3m: [-1.1] })).toBe(true);
    expect(hasCurveSpreadSeries({ dates: ['2024-01'], t5y30y: [0.45] })).toBe(true);
    expect(hasCurveSpreadSeries({ dates: ['2024-01'], t10y2y: [null, 0.12] })).toBe(true);
  });

  it('hasFedBalanceSeries / hasM2Series / hasDebtGdpSeries are false for dates-only leftover bags', () => {
    expect(hasFedBalanceSeries()).toBe(false);
    expect(hasM2Series(null)).toBe(false);
    expect(hasDebtGdpSeries({})).toBe(false);
    expect(hasFedBalanceSeries({ isLive: true })).toBe(false);
    expect(hasM2Series({ dates: ['2024-01'] })).toBe(false);
    expect(hasDebtGdpSeries({ dates: ['2024-01'], values: [] })).toBe(false);
    expect(hasFedBalanceSeries({ dates: ['2024-01'], values: [null, null] })).toBe(false);
    expect(hasM2Series({ values: [21.4] })).toBe(false);
    expect(hasDebtGdpSeries({ latest: 123 })).toBe(false);
  });

  it('hasFedBalanceSeries / hasM2Series / hasDebtGdpSeries are true when dates and values paint', () => {
    expect(hasFedBalanceSeries({ dates: ['2024-01'], values: [7.2] })).toBe(true);
    expect(hasM2Series({ dates: ['2024-01'], values: [21.4] })).toBe(true);
    expect(hasDebtGdpSeries({ dates: ['2024-01'], values: [123] })).toBe(true);
    expect(hasFedBalanceSeries({ dates: ['2024-01'], values: [null, 7.2] })).toBe(true);
  });
});

describe('bonds leftover empty-capable tiles (cpi / realYield)', () => {
  it('panels do not hardcode leftover dates-only on empty-capable tiles', () => {
    const cpi = src('panels/bonds/cpi.jsx');
    const real = src('panels/bonds/realYield.jsx');
    expect(cpi).not.toMatch(/isLive:\s*\(ctx\)\s*=>\s*!!ctx\?\.bonds\?\.cpiComponents\?\.dates\?\.length/);
    expect(real).not.toMatch(/isLive:\s*\(ctx\)\s*=>\s*!!ctx\?\.bonds\?\.realYieldHistory\?\.dates\?\.length/);
    expect(cpi).toMatch(/hasCpiComponentsSeries\(ctx\?\.bonds\?\.cpiComponents\)/);
    expect(real).toMatch(/hasRealYieldSeries\(ctx\?\.bonds\?\.realYieldHistory\)/);
  });

  it('hasCpiComponentsSeries is false for empty / dates-only leftover bags', () => {
    expect(hasCpiComponentsSeries()).toBe(false);
    expect(hasCpiComponentsSeries(null)).toBe(false);
    expect(hasCpiComponentsSeries({})).toBe(false);
    expect(hasCpiComponentsSeries({ isLive: true })).toBe(false);
    expect(hasCpiComponentsSeries({ dates: ['2024-01'] })).toBe(false);
    expect(hasCpiComponentsSeries({ dates: ['2024-01'], all: [], core: [], food: [], energy: [] })).toBe(false);
    expect(hasCpiComponentsSeries({ dates: ['2024-01'], all: [null, null] })).toBe(false);
    expect(hasCpiComponentsSeries({ all: [3.2], core: [3.1] })).toBe(false);
    expect(hasCpiComponentsSeries({ latest: { all: 3.2 } })).toBe(false);
  });

  it('hasCpiComponentsSeries is true when dates and a series paint', () => {
    expect(hasCpiComponentsSeries({ dates: ['2024-01'], all: [3.2] })).toBe(true);
    expect(hasCpiComponentsSeries({ dates: ['2024-01'], core: [3.1] })).toBe(true);
    expect(hasCpiComponentsSeries({ dates: ['2024-01'], food: [2.4] })).toBe(true);
    expect(hasCpiComponentsSeries({ dates: ['2024-01'], energy: [-1.2] })).toBe(true);
    expect(hasCpiComponentsSeries({ dates: ['2024-01', '2024-02'], all: [null, 3.2] })).toBe(true);
  });

  it('hasRealYieldSeries is false for empty / dates-only leftover bags', () => {
    expect(hasRealYieldSeries()).toBe(false);
    expect(hasRealYieldSeries(null)).toBe(false);
    expect(hasRealYieldSeries({})).toBe(false);
    expect(hasRealYieldSeries({ isLive: true })).toBe(false);
    expect(hasRealYieldSeries({ dates: ['2024-01'] })).toBe(false);
    expect(hasRealYieldSeries({ dates: ['2024-01'], d5y: [], d10y: [] })).toBe(false);
    expect(hasRealYieldSeries({ dates: ['2024-01'], d5y: [null, null] })).toBe(false);
    expect(hasRealYieldSeries({ d5y: [1.8], d10y: [2.1] })).toBe(false);
    expect(hasRealYieldSeries({ latest: 1.8 })).toBe(false);
  });

  it('hasRealYieldSeries is true when dates and a series paint', () => {
    expect(hasRealYieldSeries({ dates: ['2024-01'], d5y: [1.8] })).toBe(true);
    expect(hasRealYieldSeries({ dates: ['2024-01'], d10y: [2.1] })).toBe(true);
    expect(hasRealYieldSeries({ dates: ['2024-01', '2024-02'], d5y: [null, 1.8] })).toBe(true);
  });
});


describe('bonds leftover empty-capable tiles (credit / duration / macro / ecb / global-rates)', () => {
  it('panels do not hardcode leftover dates-only or bag-existence on empty-capable tiles', () => {
    const credit = src('panels/bonds/credit.jsx');
    const duration = src('panels/bonds/duration.jsx');
    const macro = src('panels/bonds/macro.jsx');
    const ecb = src('panels/bonds/ecbYields.jsx');
    const global = src('panels/bonds/globalRates.jsx');
    expect(credit).not.toMatch(/isLive:\s*\(ctx\)\s*=>\s*\{?[\s\S]*s\?\.dates\?\.length/);
    expect(duration).not.toMatch(/durationLadderMeta \|\| \(d\.fedFundsFutures && Object\.keys\(d\.fedFundsFutures\)\.length > 1\)/);
    expect(macro).not.toMatch(/!!\(m && Object\.keys\(m\)\.length > 0\)/);
    expect(ecb).not.toMatch(/!!\(ctx\?\.ecb\?\.data\?\.policyRates \|\| ctx\?\.ecb\?\.data\?\.moneyMarket\)/);
    expect(global).not.toMatch(/!!\(ctx\?\.bonds\?\.macroData\?\.centralBankRates \|\| ctx\?\.ecb\?\.data\)/);
    expect(credit).toMatch(/hasCreditSpreadContent\(ctx\?\.bonds\?\.spreadData\)/);
    expect(duration).toMatch(/hasDurationLadderContent\(/);
    expect(macro).toMatch(/hasMacroIndicatorsContent\(/);
    expect(ecb).toMatch(/hasEcbPolicyRatesContent\(ctx\?\.ecb\?\.data\)/);
    expect(global).toMatch(/hasGlobalCentralBankRates\(/);
  });

  it('hasCreditSpreadContent is false for empty / dates-only leftover bags', () => {
    expect(hasCreditSpreadContent()).toBe(false);
    expect(hasCreditSpreadContent(null)).toBe(false);
    expect(hasCreditSpreadContent({})).toBe(false);
    expect(hasCreditSpreadContent({ isLive: true })).toBe(false);
    expect(hasCreditSpreadContent({ dates: ['2024-01'] })).toBe(false);
    expect(hasCreditSpreadContent({ dates: ['2024-01'], IG: [], HY: [], EM: [], BBB: [] })).toBe(false);
    expect(hasCreditSpreadContent({ dates: ['2024-01'], IG: [null, null], HY: [null] })).toBe(false);
    expect(hasCreditSpreadContent({ current: {} })).toBe(false);
    expect(hasCreditSpreadContent({ current: { hySpread: null } })).toBe(false);
  });

  it('hasCreditSpreadContent is true when a series or current spread paints', () => {
    expect(hasCreditSpreadContent({ dates: ['2024-01'], HY: [412] })).toBe(true);
    expect(hasCreditSpreadContent({ dates: ['2024-01'], IG: [null, 98] })).toBe(true);
    expect(hasCreditSpreadContent({ current: { hySpread: 412 } })).toBe(true);
    expect(hasCreditSpreadContent({ current: { igSpread: 98 } })).toBe(true);
    expect(hasCreditSpreadContent({ current: { emSpread: 210 } })).toBe(true);
    expect(hasCreditSpreadContent({ BBB: [140] })).toBe(true);
  });

  it('hasDurationLadderContent is false for meta-only / sibling FFF-key leftover bags', () => {
    expect(hasDurationLadderContent()).toBe(false);
    expect(hasDurationLadderContent(null)).toBe(false);
    expect(hasDurationLadderContent([])).toBe(false);
    expect(hasDurationLadderContent([{ bucket: '0–2y' }], { isLive: true }, { asOf: '2024-01' })).toBe(false);
    expect(hasDurationLadderContent(null, { m1: null, m2: null, effectiveRate: 5.33 })).toBe(false);
    expect(hasDurationLadderContent(null, { m1: 5.33 })).toBe(false);
    expect(hasDurationLadderContent([{ amount: null, rate: null }])).toBe(false);
  });

  it('hasDurationLadderContent is true when a bucket or two FFF months paint', () => {
    expect(hasDurationLadderContent([{ bucket: '0–2y', amount: 6.2e6 }])).toBe(true);
    expect(hasDurationLadderContent([{ bucket: '10y+', rate: 4.1 }])).toBe(true);
    expect(hasDurationLadderContent(null, { m1: 5.33, m2: 5.21 })).toBe(true);
    expect(hasDurationLadderContent(null, null, { '2–5y': 3.8 })).toBe(true);
  });

  it('hasMacroIndicatorsContent is false for empty / leftover bag-only payloads', () => {
    expect(hasMacroIndicatorsContent()).toBe(false);
    expect(hasMacroIndicatorsContent(null)).toBe(false);
    expect(hasMacroIndicatorsContent({})).toBe(false);
    expect(hasMacroIndicatorsContent({ isLive: true })).toBe(false);
    expect(hasMacroIndicatorsContent({ centralBankRates: {}, centralBankMeta: {} })).toBe(false);
    expect(hasMacroIndicatorsContent({ fedBalanceSheet: null, unemployment: null })).toBe(false);
    expect(hasMacroIndicatorsContent({ centralBankRates: { US: null, EU: null } })).toBe(false);
  });

  it('hasMacroIndicatorsContent is true when a numeric row or CB rate paints', () => {
    expect(hasMacroIndicatorsContent({ unemployment: 4.1 })).toBe(true);
    expect(hasMacroIndicatorsContent({ m2: 21800 })).toBe(true);
    expect(hasMacroIndicatorsContent({ centralBankRates: { US: 5.25 } })).toBe(true);
    expect(hasMacroIndicatorsContent({}, 36e6)).toBe(true);
    expect(hasMacroIndicatorsContent({}, null, { latest: 122 })).toBe(true);
  });

  it('hasEcbPolicyRatesContent is false for empty / leftover policyRate bags', () => {
    expect(hasEcbPolicyRatesContent()).toBe(false);
    expect(hasEcbPolicyRatesContent(null)).toBe(false);
    expect(hasEcbPolicyRatesContent({})).toBe(false);
    expect(hasEcbPolicyRatesContent({ isLive: true })).toBe(false);
    expect(hasEcbPolicyRatesContent({ policyRates: {} })).toBe(false);
    expect(hasEcbPolicyRatesContent({ moneyMarket: {} })).toBe(false);
    expect(hasEcbPolicyRatesContent({ policyRates: { depositFacility: { period: '2024-01' } } })).toBe(false);
    expect(hasEcbPolicyRatesContent({ m3Growth: [], hicpDetail: [] })).toBe(false);
  });

  it('hasEcbPolicyRatesContent is true when a policy, MM, or aggregate rate paints', () => {
    expect(hasEcbPolicyRatesContent({ policyRates: { depositFacility: { value: 3.75 } } })).toBe(true);
    expect(hasEcbPolicyRatesContent({ policyRates: { mainRefinancing: { value: 4.15 } } })).toBe(true);
    expect(hasEcbPolicyRatesContent({ moneyMarket: { estr: { value: 3.91 } } })).toBe(true);
    expect(hasEcbPolicyRatesContent({ m3Growth: [{ value: 3.2 }] })).toBe(true);
    expect(hasEcbPolicyRatesContent({ hicpDetail: [{ value: 2.4 }] })).toBe(true);
  });

  it('hasGlobalCentralBankRates is false for empty / sibling ECB leftover bags', () => {
    expect(hasGlobalCentralBankRates()).toBe(false);
    expect(hasGlobalCentralBankRates(null)).toBe(false);
    expect(hasGlobalCentralBankRates({})).toBe(false);
    expect(hasGlobalCentralBankRates({ US: null, EU: null })).toBe(false);
    expect(hasGlobalCentralBankRates({ isLive: true })).toBe(false);
  });

  it('hasGlobalCentralBankRates is true when a painted rate exists', () => {
    expect(hasGlobalCentralBankRates({ US: 5.25 })).toBe(true);
    expect(hasGlobalCentralBankRates({ EU: null }, 4.15)).toBe(true);
    expect(hasGlobalCentralBankRates(null, 4.15)).toBe(true);
  });
});

describe('bonds leftover empty-capable tiles (foreign-holders / money-market / auctions)', () => {
  it('dashboard does not hardcode leftover bag-existence on empty-capable tiles', () => {
    const dash = src('markets/bonds/components/BondsDashboard.jsx');
    expect(dash).not.toMatch(/'foreign-holders':\s*!!\(ticCtx\?\.data\?\.latest\?\.length\)/);
    expect(dash).not.toMatch(/'money-market':\s*!!\(nyfedCtx\?\.data\?\.sofr\?\.series\?\.length\)/);
    expect(dash).not.toMatch(/auctions:\s*!!\(auctionCtx\?\.data\?\.auctions\?\.length\)/);
    expect(dash).toMatch(/'foreign-holders':\s*hasForeignHoldersContent\(ticCtx\?\.data\)/);
    expect(dash).toMatch(/'money-market':\s*hasMoneyMarketContent\(nyfedCtx\?\.data\)/);
    expect(dash).toMatch(/auctions:\s*hasAuctionContent\(auctionCtx\?\.data\)/);
  });

  it('hasForeignHoldersContent is false for empty / latest-only leftover bags', () => {
    expect(hasForeignHoldersContent()).toBe(false);
    expect(hasForeignHoldersContent(null)).toBe(false);
    expect(hasForeignHoldersContent({})).toBe(false);
    expect(hasForeignHoldersContent({ isLive: true })).toBe(false);
    expect(hasForeignHoldersContent({ latest: [{ country: 'Japan' }] })).toBe(false);
    expect(hasForeignHoldersContent({ latest: [{ country: 'Japan', holdingsB: null }] })).toBe(false);
    expect(hasForeignHoldersContent({ latest: [{ country: 'Japan', holdingsB: 1120 }] })).toBe(false);
    expect(hasForeignHoldersContent({ history: { Japan: [{ period: '2024-01' }] } })).toBe(false);
    expect(hasForeignHoldersContent({
      latest: [{ country: 'Japan', holdingsB: 1120 }],
      history: { Japan: [{ period: '2024-01' }] },
    })).toBe(false);
  });

  it('hasForeignHoldersContent is true when latest and history holdings paint', () => {
    expect(hasForeignHoldersContent({
      latest: [{ country: 'Japan', holdingsB: 1120 }],
      history: { Japan: [{ period: '2024-01', holdingsB: 1100 }] },
    })).toBe(true);
    expect(hasForeignHoldersContent({
      latest: [{ country: 'China, Mainland', holdingsB: 780 }],
      history: { 'China, Mainland': [{ period: '2024-02', holdingsB: 790 }] },
    })).toBe(true);
  });

  it('hasMoneyMarketContent is false for empty / dates-only leftover bags', () => {
    expect(hasMoneyMarketContent()).toBe(false);
    expect(hasMoneyMarketContent(null)).toBe(false);
    expect(hasMoneyMarketContent({})).toBe(false);
    expect(hasMoneyMarketContent({ isLive: true })).toBe(false);
    expect(hasMoneyMarketContent({ sofr: { series: [{ date: '2024-01' }] } })).toBe(false);
    expect(hasMoneyMarketContent({ sofr: { series: [{ date: '2024-01', rate: null }] } })).toBe(false);
    expect(hasMoneyMarketContent({ rrp: [{ date: '2024-01' }] })).toBe(false);
    expect(hasMoneyMarketContent({ sofr: { latest: {} } })).toBe(false);
  });

  it('hasMoneyMarketContent is true when a SOFR rate or RRP volume paints', () => {
    expect(hasMoneyMarketContent({ sofr: { series: [{ date: '2024-01', rate: 5.32 }] } })).toBe(true);
    expect(hasMoneyMarketContent({ rrp: [{ date: '2024-01', acceptedB: 2100 }] })).toBe(true);
    expect(hasMoneyMarketContent({ sofr: { latest: { rate: 5.31 } } })).toBe(true);
    expect(hasMoneyMarketContent({ sofr: { latest: 5.31 } })).toBe(true);
    expect(hasMoneyMarketContent({ effr: { latest: 5.33 } })).toBe(true);
  });

  it('hasAuctionContent is false for empty / dates-only leftover bags', () => {
    expect(hasAuctionContent()).toBe(false);
    expect(hasAuctionContent(null)).toBe(false);
    expect(hasAuctionContent({})).toBe(false);
    expect(hasAuctionContent({ isLive: true })).toBe(false);
    expect(hasAuctionContent({ auctions: [{ auctionDate: '2024-01-02', securityTerm: '10Y' }] })).toBe(false);
    expect(hasAuctionContent({ auctions: [{ auctionDate: '2024-01-02', bidToCover: null }] })).toBe(false);
    expect(hasAuctionContent({ summary: { count: 12 } })).toBe(false);
  });

  it('hasAuctionContent is true when a BTC, allotment, or yield paints', () => {
    expect(hasAuctionContent({ auctions: [{ auctionDate: '2024-01-02', bidToCover: 2.54 }] })).toBe(true);
    expect(hasAuctionContent({ auctions: [{ auctionDate: '2024-01-02', indirectPct: 62 }] })).toBe(true);
    expect(hasAuctionContent({ auctions: [{ auctionDate: '2024-01-02', stopYieldPct: 4.21 }] })).toBe(true);
    expect(hasAuctionContent({ summary: { avgBidToCover: 2.48 } })).toBe(true);
    expect(hasAuctionContent({ summary: { avgIndirectPct: 61 } })).toBe(true);
  });
});

describe('bonds leftover empty-capable tiles (auctions remount)', () => {
  it('dashboard does not slice leftover isLive auction bags', () => {
    const dash = src('markets/bonds/components/BondsDashboard.jsx');
    expect(dash).not.toMatch(/auctionCtx\?\.data\?\.auctions \|\| \[\]/);
    expect(dash).toMatch(/auctionRows\(auctionCtx\?\.data\)/);
  });

  it('auctionRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => auctionRows({ isLive: true })).not.toThrow();
    expect(() => auctionRows({ auctions: { isLive: true } })).not.toThrow();
    expect(() => auctionRows({ auctions: true })).not.toThrow();
    expect(auctionRows({ isLive: true })).toEqual([]);
    expect(auctionRows({ auctions: { isLive: true } })).toEqual([]);
    expect(auctionRows({ auctions: true })).toEqual([]);
    expect(() => auctionRows({ auctions: { isLive: true } }).slice(0, 20).reverse()).not.toThrow();
    const rows = auctionRows({
      isLive: true,
      auctions: [
        { isLive: true },
        { auctionDate: '2024-01-02', bidToCover: 2.54 },
      ],
    });
    expect(rows.map((r) => r.auctionDate)).toEqual([undefined, '2024-01-02']);
    expect(() => rows.slice(0, 30).map((r) => r.bidToCover)).not.toThrow();
  });
});

describe('macro empty-capable tiles (sidebar / scorecard / gdp / cpi / rates / debt / activity / cli / wb)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/globalMacro/components/GlobalMacroDashboard.jsx');
    expect(dash).not.toMatch(/sidebar:\s*!!isLive/);
    expect(dash).not.toMatch(/scorecard:\s*!!isLive/);
    expect(dash).not.toMatch(/gdp:\s*!!isLive/);
    expect(dash).not.toMatch(/cpi:\s*!!isLive/);
    expect(dash).not.toMatch(/rates:\s*!!isLive/);
    expect(dash).not.toMatch(/debt:\s*!!isLive/);
    expect(dash).not.toMatch(/activity:\s*!!isLive/);
    expect(dash).not.toMatch(/cli:\s*!!isLive/);
    expect(dash).not.toMatch(/'wb-trade':\s*!!isLive/);
    expect(dash).not.toMatch(/'wb-dev':\s*!!isLive/);
    expect(dash).toMatch(/sidebar:\s*hasMacroSidebarContent/);
    expect(dash).toMatch(/scorecard:\s*hasScorecardRows/);
    expect(dash).toMatch(/gdp:\s*hasScorecardRows/);
    expect(dash).toMatch(/cpi:\s*hasScorecardRows/);
    expect(dash).toMatch(/rates:\s*hasRateBarRows/);
    expect(dash).toMatch(/debt:\s*hasDebtBarRows/);
    expect(dash).toMatch(/activity:\s*hasActivityContent/);
    expect(dash).toMatch(/cli:\s*hasCliRows/);
    expect(dash).toMatch(/'wb-trade':\s*hasWbTradeRows/);
    expect(dash).toMatch(/'wb-dev':\s*hasWbDevRows/);
  });

  it('hasScorecardRows is false for empty / sibling-only payloads', () => {
    expect(hasScorecardRows()).toBe(false);
    expect(hasScorecardRows(null)).toBe(false);
    expect(hasScorecardRows({})).toBe(false);
    expect(hasScorecardRows({ isLive: true })).toBe(false);
    expect(hasScorecardRows([])).toBe(false);
  });

  it('hasScorecardRows is true when country rows exist', () => {
    expect(hasScorecardRows([{ code: 'US', gdp: 2.1 }])).toBe(true);
    expect(hasScorecardRows([{ code: 'DE' }])).toBe(true);
  });

  it('hasRateBarRows is false for empty / sibling-only payloads', () => {
    expect(hasRateBarRows()).toBe(false);
    expect(hasRateBarRows({})).toBe(false);
    expect(hasRateBarRows({ isLive: true })).toBe(false);
    expect(hasRateBarRows({ current: [] })).toBe(false);
    expect(hasRateBarRows({ history: [{ rate: 5.25 }] })).toBe(false);
  });

  it('hasRateBarRows is true when current rate rows exist', () => {
    expect(hasRateBarRows({ current: [{ code: 'US', rate: 5.25 }] })).toBe(true);
  });

  it('hasDebtBarRows is false for empty / sibling-only payloads', () => {
    expect(hasDebtBarRows()).toBe(false);
    expect(hasDebtBarRows({})).toBe(false);
    expect(hasDebtBarRows({ isLive: true })).toBe(false);
    expect(hasDebtBarRows({ countries: [] })).toBe(false);
    expect(hasDebtBarRows({ history: [{ debt: 120 }] })).toBe(false);
  });

  it('hasDebtBarRows is true when country debt rows exist', () => {
    expect(hasDebtBarRows({ countries: [{ code: 'JP', debt: 250 }] })).toBe(true);
  });

  it('hasMacroSidebarContent is false unless a bar section has rows', () => {
    expect(hasMacroSidebarContent()).toBe(false);
    expect(hasMacroSidebarContent({ scorecardData: { isLive: true } })).toBe(false);
    expect(hasMacroSidebarContent({ centralBankData: { isLive: true } })).toBe(false);
    expect(hasMacroSidebarContent({ debtData: { isLive: true } })).toBe(false);
  });

  it('hasMacroSidebarContent is true when any bar section has rows', () => {
    expect(hasMacroSidebarContent({ scorecardData: [{ code: 'US', gdp: 2.1 }] })).toBe(true);
    expect(hasMacroSidebarContent({ centralBankData: { current: [{ code: 'US', rate: 5.25 }] } })).toBe(true);
    expect(hasMacroSidebarContent({ debtData: { countries: [{ code: 'JP', debt: 250 }] } })).toBe(true);
  });

  it('hasActivityContent is false for empty / sibling-only payloads', () => {
    expect(hasActivityContent()).toBe(false);
    expect(hasActivityContent({ isLive: true })).toBe(false);
    expect(hasActivityContent({ values: [] }, { isLive: true })).toBe(false);
    expect(hasActivityContent({ dates: ['2024-01'] }, { values: [] })).toBe(false);
  });

  it('hasActivityContent is true when CFNAI or the 10Y-2Y spread paints', () => {
    expect(hasActivityContent({ latest: 0.12 })).toBe(true);
    expect(hasActivityContent({ values: [-0.2] })).toBe(true);
    expect(hasActivityContent({ dates: ['2024-01'], values: [0.05] })).toBe(true);
    expect(hasActivityContent(null, { values: [-0.15] })).toBe(true);
  });

  it('hasCliRows is false for empty / sibling-only payloads', () => {
    expect(hasCliRows()).toBe(false);
    expect(hasCliRows({ isLive: true }, { isLive: true })).toBe(false);
    expect(hasCliRows({ countries: [] }, {})).toBe(false);
    expect(hasCliRows(null, { isLive: true })).toBe(false);
  });

  it('hasCliRows is true when CLI country cards exist', () => {
    expect(hasCliRows({ countries: [{ code: 'US', value: 99.8 }] })).toBe(true);
    expect(hasCliRows(null, { US: { value: 100.2 } })).toBe(true);
    expect(hasCliRows(null, { DE: { cli: 99.1 } })).toBe(true);
  });

  it('hasWbTradeRows is false for empty / sibling-only / no-tradeGdp payloads', () => {
    expect(hasWbTradeRows()).toBe(false);
    expect(hasWbTradeRows({})).toBe(false);
    expect(hasWbTradeRows({ isLive: true })).toBe(false);
    expect(hasWbTradeRows({ countries: [] })).toBe(false);
    expect(hasWbTradeRows({ countries: [{ code: 'US', gdpGrowth: 2.1 }] })).toBe(false);
  });

  it('hasWbTradeRows is true when a country has tradeGdp', () => {
    expect(hasWbTradeRows({ countries: [{ code: 'US', tradeGdp: 27 }] })).toBe(true);
  });

  it('hasWbDevRows is false for empty / sibling-only / single-point payloads', () => {
    expect(hasWbDevRows()).toBe(false);
    expect(hasWbDevRows({})).toBe(false);
    expect(hasWbDevRows({ isLive: true })).toBe(false);
    expect(hasWbDevRows({ countries: [{ code: 'US', gdpPerCap: 76000, gdpGrowth: 2.1 }] })).toBe(false);
    expect(hasWbDevRows({ countries: [{ code: 'US', tradeGdp: 27 }, { code: 'DE', tradeGdp: 80 }] })).toBe(false);
  });

  it('hasWbDevRows is true when two countries have gdpPerCap and gdpGrowth', () => {
    expect(hasWbDevRows({
      countries: [
        { code: 'US', gdpPerCap: 76000, gdpGrowth: 2.1 },
        { code: 'DE', gdpPerCap: 51000, gdpGrowth: 0.4 },
      ],
    })).toBe(true);
  });
});

describe('equity+ empty-capable tiles (kpi / sidebar / valuation / earnings-quality)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!isLive/);
    expect(dash).not.toMatch(/sidebar:\s*!!isLive/);
    expect(dash).not.toMatch(/valuation:\s*!!isLive/);
    expect(dash).not.toMatch(/'earnings-quality':\s*!!isLive/);
    expect(dash).toMatch(/kpi:\s*hasEqdKpiMetrics/);
    expect(dash).toMatch(/sidebar:\s*hasEqdSidebarContent/);
    expect(dash).toMatch(/valuation:\s*hasEqdValuationContent/);
    expect(dash).toMatch(/'earnings-quality':\s*hasEqdEarningsQuality/);
  });

  it('hasEqdKpiMetrics is false for empty / SPY-only / sibling-only payloads', () => {
    expect(hasEqdKpiMetrics()).toBe(false);
    expect(hasEqdKpiMetrics({})).toBe(false);
    expect(hasEqdKpiMetrics({ sectorData: { isLive: true } })).toBe(false);
    expect(hasEqdKpiMetrics({ factorData: { isLive: true, inFavor: {} } })).toBe(false);
    expect(hasEqdKpiMetrics({ sectorData: { sectors: [{ code: 'SPY', name: 'S&P 500', perf1m: 1.2 }] } })).toBe(false);
    expect(hasEqdKpiMetrics({ factorData: { inFavor: { momentum: null } } })).toBe(false);
  });

  it('hasEqdKpiMetrics is true when a non-SPY sector or numeric factor exists', () => {
    expect(hasEqdKpiMetrics({ sectorData: { sectors: [{ code: 'XLK', name: 'Technology', perf1m: 3.1 }] } })).toBe(true);
    expect(hasEqdKpiMetrics({ factorData: { inFavor: { momentum: 4.2 } } })).toBe(true);
    expect(hasEqdKpiMetrics({ factorData: [{ name: 'Value', value: -1.5 }] })).toBe(true);
  });

  it('hasEqdSidebarContent is false for empty / sibling-only payloads', () => {
    expect(hasEqdSidebarContent()).toBe(false);
    expect(hasEqdSidebarContent({})).toBe(false);
    expect(hasEqdSidebarContent({ sectorData: { isLive: true } })).toBe(false);
    expect(hasEqdSidebarContent({ factorData: { isLive: true, inFavor: { momentum: 4.2 } } })).toBe(false);
    expect(hasEqdSidebarContent({ earningsData: { isLive: true, upcoming: [] } })).toBe(false);
    expect(hasEqdSidebarContent({ shortData: { isLive: true, mostShorted: [] } })).toBe(false);
  });

  it('hasEqdSidebarContent is true when a painted sidebar row exists', () => {
    expect(hasEqdSidebarContent({ sectorData: { sectors: [{ name: 'Technology', perf1m: 3.1 }] } })).toBe(true);
    expect(hasEqdSidebarContent({ factorData: { factorReturns: [{ name: 'Momentum', value: 2.4 }] } })).toBe(true);
    expect(hasEqdSidebarContent({ earningsData: { avgSurprise: 4.1 } })).toBe(true);
    expect(hasEqdSidebarContent({ shortData: { aggregateShortPct: 2.8 } })).toBe(true);
  });

  it('hasEqdValuationContent is false for empty / sibling-only payloads', () => {
    expect(hasEqdValuationContent()).toBe(false);
    expect(hasEqdValuationContent({})).toBe(false);
    expect(hasEqdValuationContent({ buffettIndicator: { isLive: true } })).toBe(false);
    expect(hasEqdValuationContent({ equityRiskPremium: { isLive: true } })).toBe(false);
    expect(hasEqdValuationContent({ sectorData: { sectors: [{ code: 'SPY', perf1m: 1.2 }] } })).toBe(false);
    expect(hasEqdValuationContent({ factorData: { inFavor: { momentum: 4.2 } } })).toBe(false);
    expect(hasEqdValuationContent({ shortData: { isLive: true } })).toBe(false);
    expect(hasEqdValuationContent({ earningsData: { isLive: true } })).toBe(false);
    expect(hasEqdValuationContent({ institutionalData: { isLive: true } })).toBe(false);
    expect(hasEqdValuationContent({ insiderData: { isLive: true } })).toBe(false);
  });

  it('hasEqdValuationContent is true when a gated valuation section would paint', () => {
    expect(hasEqdValuationContent({ spPE: 22.4 })).toBe(true);
    expect(hasEqdValuationContent({ buffettIndicator: { ratio: 198 } })).toBe(true);
    expect(hasEqdValuationContent({ equityRiskPremium: { erp: 1.8 } })).toBe(true);
    expect(hasEqdValuationContent({ sectorData: { sectors: [{ code: 'XLF', name: 'Financials' }] } })).toBe(true);
    expect(hasEqdValuationContent({ factorData: { stocks: [{ ticker: 'AAPL', composite: 72 }] } })).toBe(true);
    expect(hasEqdValuationContent({ shortData: { mostShorted: [{ ticker: 'GME', shortFloat: 21 }] } })).toBe(true);
    expect(hasEqdValuationContent({ earningsData: { upcoming: [{ ticker: 'MSFT', date: '2026-01-28' }] } })).toBe(true);
    expect(hasEqdValuationContent({ institutionalData: { institutions: [{ name: 'Vanguard' }] } })).toBe(true);
    expect(hasEqdValuationContent({ insiderData: { transactions: [{ ticker: 'AAPL', type: 'Buy' }] } })).toBe(true);
  });

  it('hasEqdEarningsQuality is false for empty / sibling-only / dash-only payloads', () => {
    expect(hasEqdEarningsQuality()).toBe(false);
    expect(hasEqdEarningsQuality({})).toBe(false);
    expect(hasEqdEarningsQuality({ earningsData: { isLive: true, upcoming: [], beatRates: [] } })).toBe(false);
    expect(hasEqdEarningsQuality({ factorData: { isLive: true, inFavor: {}, stocks: [] } })).toBe(false);
    expect(hasEqdEarningsQuality({ breadthDivergence: { isLive: true, spy1m: 1.2 } })).toBe(false);
  });

  it('hasEqdEarningsQuality is true when a painted quality metric exists', () => {
    expect(hasEqdEarningsQuality({ earningsData: { upcoming: [{ ticker: 'NVDA' }] } })).toBe(true);
    expect(hasEqdEarningsQuality({ earningsData: { beatRates: [{ sector: 'Tech', beatRate: 74 }] } })).toBe(true);
    expect(hasEqdEarningsQuality({ factorData: { inFavor: { quality: 3.2 } } })).toBe(true);
    expect(hasEqdEarningsQuality({ factorData: { stocks: [{ ticker: 'MSFT', quality: 81 }] } })).toBe(true);
    expect(hasEqdEarningsQuality({ breadthDivergence: { divergence: -1.4 } })).toBe(true);
  });
});

describe('equity+ leftover empty-capable tiles (factor-rankings remount)', () => {
  it('dashboard does not spread leftover isLive factor / earnings bags', () => {
    const dash = src('markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.jsx');
    expect(dash).not.toMatch(/const \{ inFavor = \{\}, stocks = \[\] \} = factorData/);
    expect(dash).not.toMatch(/earningsData\?\.upcoming \?\? \[\]/);
    expect(dash).not.toMatch(/earningsData\?\.beatRates \?\? \[\]/);
    expect(dash).not.toMatch(/'factor-rankings':\s*!!isLive && !!\(factorData\?\.stocks\?\.length \|\| factorData\?\.inFavor\)/);
    expect(dash).toMatch(/factorStocks\(factorData\)/);
    expect(dash).toMatch(/earningsUpcoming\(earningsData\)/);
    expect(dash).toMatch(/earningsBeatRates\(earningsData\)/);
    expect(dash).toMatch(/'factor-rankings':\s*!!isLive && hasFactorRankingsContent\(factorData\)/);
    const fr = src('markets/equitiesDeepDive/components/FactorRankings.jsx');
    expect(fr).not.toMatch(/const \{ inFavor = \{\}, stocks = \[\] \} = factorData/);
    expect(fr).toMatch(/factorStocks\(factorData\)/);
  });

  it('factorStocks / earnings helpers skip leftover isLive bags so remount does not crash', () => {
    expect(() => factorStocks({ isLive: true })).not.toThrow();
    expect(() => factorStocks({ stocks: { isLive: true } })).not.toThrow();
    expect(() => factorStocks({ stocks: true })).not.toThrow();
    expect(factorStocks({ isLive: true })).toEqual([]);
    expect(factorStocks({ stocks: { isLive: true } })).toEqual([]);
    expect(factorStocks({ stocks: true })).toEqual([]);
    expect(() => [...factorStocks({ stocks: { isLive: true } })].sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0))).not.toThrow();
    expect(() => factorStocks({ stocks: { isLive: true } }).forEach(() => {})).not.toThrow();
    const rows = factorStocks({
      isLive: true,
      stocks: [
        { isLive: true },
        { ticker: 'AAPL', composite: 69.25 },
      ],
    });
    expect(rows.map((s) => s.ticker)).toEqual([undefined, 'AAPL']);
    expect(() => [...rows].sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0)).map((s) => s.ticker)).not.toThrow();

    expect(() => earningsUpcoming({ isLive: true })).not.toThrow();
    expect(() => earningsUpcoming({ upcoming: { isLive: true } })).not.toThrow();
    expect(earningsUpcoming({ upcoming: { isLive: true } })).toEqual([]);
    expect(() => [...earningsUpcoming({ upcoming: { isLive: true } })].sort()).not.toThrow();
    expect(earningsUpcoming({ upcoming: [{ ticker: 'NVDA', date: '2026-01-28' }] }).map((r) => r.ticker)).toEqual(['NVDA']);

    expect(() => earningsBeatRates({ isLive: true })).not.toThrow();
    expect(() => earningsBeatRates({ beatRates: { isLive: true } })).not.toThrow();
    expect(earningsBeatRates({ beatRates: { isLive: true } })).toEqual([]);
    expect(() => (earningsBeatRates({ beatRates: { isLive: true } }) || []).map((r) => r.beatRate)).not.toThrow();
    expect(earningsBeatRates({ beatRates: [{ sector: 'Tech', beatRate: 74 }] }).map((r) => r.beatRate)).toEqual([74]);
  });

  it('hasFactorRankingsContent is false for empty / leftover isLive bags', () => {
    expect(hasFactorRankingsContent()).toBe(false);
    expect(hasFactorRankingsContent(null)).toBe(false);
    expect(hasFactorRankingsContent({})).toBe(false);
    expect(hasFactorRankingsContent({ isLive: true })).toBe(false);
    expect(hasFactorRankingsContent({ inFavor: { isLive: true } })).toBe(false);
    expect(hasFactorRankingsContent({ stocks: { isLive: true } })).toBe(false);
    expect(hasFactorRankingsContent({ stocks: true })).toBe(false);
    expect(hasFactorRankingsContent({ inFavor: {}, stocks: [] })).toBe(false);
    expect(hasFactorRankingsContent({ inFavor: { momentum: null, value: true } })).toBe(false);
  });

  it('hasFactorRankingsContent is true when a painted stock or numeric inFavor exists', () => {
    expect(hasFactorRankingsContent({ stocks: [{ ticker: 'AAPL', composite: 69.25 }] })).toBe(true);
    expect(hasFactorRankingsContent({ inFavor: { momentum: 3.5 } })).toBe(true);
    expect(hasFactorRankingsContent({
      isLive: true,
      inFavor: { isLive: true },
      stocks: [{ isLive: true }, { ticker: 'MSFT', composite: 67.5 }],
    })).toBe(true);
  });
});

describe('equity+ leftover empty-capable tiles (kpi remount)', () => {
  it('kpi strip does not forEach leftover isLive stock bags', () => {
    const kpi = src('markets/equitiesDeepDive/components/EquitiesDeepDiveKpiStrip.jsx');
    expect(kpi).not.toMatch(/factorData\?\.stocks \?\? \[\]/);
    expect(kpi).toMatch(/factorStocks\(factorData\)/);
  });

  it('factorStocks skips leftover isLive bags so remount does not crash', () => {
    expect(() => factorStocks({ isLive: true })).not.toThrow();
    expect(() => factorStocks({ stocks: { isLive: true } })).not.toThrow();
    expect(() => factorStocks({ stocks: true })).not.toThrow();
    expect(factorStocks({ isLive: true })).toEqual([]);
    expect(factorStocks({ stocks: { isLive: true } })).toEqual([]);
    expect(factorStocks({ stocks: true })).toEqual([]);
    expect(() => factorStocks({ stocks: { isLive: true } }).forEach(() => {})).not.toThrow();
    const rows = factorStocks({
      isLive: true,
      stocks: [
        { isLive: true },
        { ticker: 'AAPL', momentum: 68, composite: 69.25 },
      ],
    });
    expect(rows.map((s) => s.ticker)).toEqual([undefined, 'AAPL']);
    expect(() => rows.forEach((s) => { if (s.momentum != null) s.momentum.toFixed(0); })).not.toThrow();
  });
});

describe('equity+ leftover empty-capable tiles (insider remount)', () => {
  it('dashboard / insider tile do not spread leftover isLive holder or transaction bags', () => {
    const dash = src('markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.jsx');
    expect(dash).not.toMatch(/const \{ holders: insiderHolders = \[\], transactions: insiderTransactions = \[\] \} = insiderData/);
    expect(dash).toMatch(/insiderHolderRows\(insiderData\)/);
    expect(dash).toMatch(/insiderTransactionRows\(insiderData\)/);
    const tile = src('markets/equitiesDeepDive/components/InsiderTrading.jsx');
    expect(tile).not.toMatch(/const \{ holders = \[\], transactions = \[\] \} = insiderData/);
    expect(tile).toMatch(/insiderHolderRows\(insiderData\)/);
    expect(tile).toMatch(/insiderTransactionRows\(insiderData\)/);
  });

  it('insider helpers skip leftover isLive bags so remount does not crash', () => {
    expect(() => insiderHolderRows({ isLive: true })).not.toThrow();
    expect(() => insiderHolderRows({ holders: { isLive: true } })).not.toThrow();
    expect(() => insiderHolderRows({ holders: true })).not.toThrow();
    expect(insiderHolderRows({ isLive: true })).toEqual([]);
    expect(insiderHolderRows({ holders: { isLive: true } })).toEqual([]);
    expect(insiderHolderRows({ holders: true })).toEqual([]);
    expect(() => [...insiderHolderRows({ holders: { isLive: true } })].sort((a, b) => (Number(b.shares) || 0) - (Number(a.shares) || 0))).not.toThrow();
    const holders = insiderHolderRows({
      isLive: true,
      holders: [
        { isLive: true },
        { name: 'Cook', shares: 3200000 },
      ],
    });
    expect(holders.map((h) => h.name)).toEqual([undefined, 'Cook']);
    expect(() => [...holders].filter((h) => h && (h.shares != null || h.name)).map((h) => h.name)).not.toThrow();

    expect(() => insiderTransactionRows({ isLive: true })).not.toThrow();
    expect(() => insiderTransactionRows({ transactions: { isLive: true } })).not.toThrow();
    expect(insiderTransactionRows({ transactions: { isLive: true } })).toEqual([]);
    expect(() => [...insiderTransactionRows({ transactions: { isLive: true } })].sort()).not.toThrow();
    expect(insiderTransactionRows({ transactions: [{ ticker: 'AAPL', shares: 1200 }] }).map((r) => r.ticker)).toEqual(['AAPL']);
  });
});


describe('equity+ leftover empty-capable tiles (institutions remount)', () => {
  it('dashboard does not slice leftover isLive institution bags', () => {
    const dash = src('markets/equitiesDeepDive/components/EquitiesDeepDiveDashboard.jsx');
    expect(dash).not.toMatch(/const \{ institutions = \[\], aggregateTopHoldings = \[\], recentChanges = \{\} \} = institutionalData/);
    expect(dash).toMatch(/institutionRows\(institutionalData\)/);
    expect(dash).not.toMatch(/inst\.name\.length > 18/);
  });

  it('institutionRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => institutionRows({ isLive: true })).not.toThrow();
    expect(() => institutionRows({ institutions: { isLive: true } })).not.toThrow();
    expect(() => institutionRows({ institutions: true })).not.toThrow();
    expect(institutionRows({ isLive: true })).toEqual([]);
    expect(institutionRows({ institutions: { isLive: true } })).toEqual([]);
    expect(institutionRows({ institutions: true })).toEqual([]);
    expect(() => institutionRows({ institutions: { isLive: true } }).slice(0, 6)).not.toThrow();
    const rows = institutionRows({
      isLive: true,
      institutions: [
        { isLive: true },
        { name: 'Vanguard', totalValue: 8200 },
      ],
    });
    expect(rows.map((r) => r.name)).toEqual([undefined, 'Vanguard']);
    expect(() => rows.slice(0, 6).map((inst) => {
      const name = typeof inst?.name === 'string' ? inst.name : '';
      return name.length > 18 ? name.slice(0, 18) + '…' : name;
    })).not.toThrow();
  });
});

describe('calendar empty-capable tiles (kpi / sidebar / events / CB / earnings / key-data / treasury / options / impact / catalysts)', () => {
  it('market does not hardcode !!props.isLive on empty-capable tiles', () => {
    const dash = src('markets/calendar/CalendarMarket.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/sidebar:\s*!!\(props\.isLive/);
    expect(dash).not.toMatch(/economic:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/'cb-rates':\s*!!props\.isLive/);
    expect(dash).not.toMatch(/'cb-timeline':\s*!!props\.isLive/);
    expect(dash).not.toMatch(/earnings:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/'key-data':\s*!!props\.isLive/);
    expect(dash).not.toMatch(/treasury:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/options:\s*!!props\.isLive/);
    expect(dash).not.toMatch(/'release-impact':\s*!!props\.isLive/);
    expect(dash).not.toMatch(/'catalyst-wall':\s*!!props\.isLive/);
    expect(dash).toMatch(/kpi:\s*hasCalendarKpiMetrics/);
    expect(dash).toMatch(/sidebar:\s*hasCalendarSidebarContent/);
    expect(dash).toMatch(/economic:\s*hasEconomicEvents/);
    expect(dash).toMatch(/'cb-rates':\s*hasCentralBanks/);
    expect(dash).toMatch(/'cb-timeline':\s*hasCentralBanks/);
    expect(dash).toMatch(/earnings:\s*hasEarningsSeason/);
    expect(dash).toMatch(/'key-data':\s*hasKeyDataRows/);
    expect(dash).toMatch(/treasury:\s*hasTreasuryAuctions/);
    expect(dash).toMatch(/options:\s*hasOptionsExpiry/);
    expect(dash).toMatch(/'release-impact':\s*hasReleaseImpactRows/);
    expect(dash).toMatch(/'catalyst-wall':\s*hasCatalystRows/);
  });

  it('hasCalendarKpiMetrics is false for empty / sibling-only / meeting-less CB payloads', () => {
    expect(hasCalendarKpiMetrics()).toBe(false);
    expect(hasCalendarKpiMetrics({})).toBe(false);
    expect(hasCalendarKpiMetrics({ isLive: true })).toBe(false);
    expect(hasCalendarKpiMetrics({ treasuryAuctions: [{ date: '2026-01-15' }] })).toBe(false);
    expect(hasCalendarKpiMetrics({ keyReleases: [{ date: '2026-01-15', name: 'CPI' }] })).toBe(false);
    expect(hasCalendarKpiMetrics({ centralBanks: [{ bank: 'Fed' }] })).toBe(false);
  });

  it('hasCalendarKpiMetrics is true when a painted KPI source exists', () => {
    expect(hasCalendarKpiMetrics({ economicEvents: [{ date: '2026-01-20', event: 'CPI' }] })).toBe(true);
    expect(hasCalendarKpiMetrics({ earningsSeason: [{ date: '2026-01-28', ticker: 'AAPL' }] })).toBe(true);
    expect(hasCalendarKpiMetrics({ centralBanks: [{ bank: 'Fed', nextMeeting: '2026-01-28' }] })).toBe(true);
    expect(hasCalendarKpiMetrics({ centralBanks: [{ bank: 'ECB', daysUntil: 12 }] })).toBe(true);
  });

  it('hasCalendarSidebarContent is false for empty / sibling-only payloads', () => {
    expect(hasCalendarSidebarContent()).toBe(false);
    expect(hasCalendarSidebarContent({})).toBe(false);
    expect(hasCalendarSidebarContent({ isLive: true })).toBe(false);
    expect(hasCalendarSidebarContent({ coverage: { low: true } })).toBe(false);
  });

  it('hasCalendarSidebarContent is true when a sidebar list has rows', () => {
    expect(hasCalendarSidebarContent({ economicEvents: [{ date: '2026-01-20', event: 'CPI' }] })).toBe(true);
    expect(hasCalendarSidebarContent({ centralBanks: [{ bank: 'Fed' }] })).toBe(true);
    expect(hasCalendarSidebarContent({ earningsSeason: [{ ticker: 'MSFT' }] })).toBe(true);
    expect(hasCalendarSidebarContent({ keyReleases: [{ name: 'NFP' }] })).toBe(true);
    expect(hasCalendarSidebarContent({ treasuryAuctions: [{ date: '2026-01-15' }] })).toBe(true);
    expect(hasCalendarSidebarContent({ optionsExpiry: [{ date: '2026-01-16' }] })).toBe(true);
  });

  it('list tiles are false for empty / sibling-only payloads', () => {
    expect(hasEconomicEvents(null)).toBe(false);
    expect(hasEconomicEvents([])).toBe(false);
    expect(hasEconomicEvents({ isLive: true })).toBe(false);
    expect(hasCentralBanks(null)).toBe(false);
    expect(hasCentralBanks([])).toBe(false);
    expect(hasEarningsSeason(null)).toBe(false);
    expect(hasEarningsSeason([])).toBe(false);
    expect(hasTreasuryAuctions(null)).toBe(false);
    expect(hasTreasuryAuctions([])).toBe(false);
    expect(hasOptionsExpiry(null)).toBe(false);
    expect(hasOptionsExpiry([])).toBe(false);
  });

  it('list tiles are true when their own rows exist', () => {
    expect(hasEconomicEvents([{ date: '2026-01-20', event: 'CPI' }])).toBe(true);
    expect(hasCentralBanks([{ bank: 'Fed', nextMeeting: '2026-01-28' }])).toBe(true);
    expect(hasEarningsSeason([{ ticker: 'AAPL', date: '2026-01-28' }])).toBe(true);
    expect(hasTreasuryAuctions([{ date: '2026-01-15', security: '10Y' }])).toBe(true);
    expect(hasOptionsExpiry([{ date: '2026-01-16', type: 'Monthly' }])).toBe(true);
  });

  it('hasKeyDataRows is false for empty / non-US-FRED events', () => {
    expect(hasKeyDataRows(null, null)).toBe(false);
    expect(hasKeyDataRows([], [])).toBe(false);
    expect(hasKeyDataRows({ isLive: true }, { isLive: true })).toBe(false);
    expect(hasKeyDataRows([], [{ country: 'DE', source: 'Econdb', event: 'CPI' }])).toBe(false);
    expect(hasKeyDataRows([], [{ country: 'US', source: 'Yahoo', event: 'Earnings' }])).toBe(false);
  });

  it('hasKeyDataRows is true when keyReleases exist or a US FRED event can stand in', () => {
    expect(hasKeyDataRows([{ name: 'CPI', date: '2026-01-15' }], [])).toBe(true);
    expect(hasKeyDataRows([], [{ country: 'US', source: 'FRED', event: 'CPI', date: '2026-01-15' }])).toBe(true);
  });

  it('hasReleaseImpactRows is false for empty / earnings-auction / low-importance foreign rows', () => {
    expect(hasReleaseImpactRows()).toBe(false);
    expect(hasReleaseImpactRows({})).toBe(false);
    expect(hasReleaseImpactRows({ isLive: true })).toBe(false);
    expect(hasReleaseImpactRows({ keyReleases: [{ name: 'CPI' }] })).toBe(false);
    expect(hasReleaseImpactRows({ economicEvents: [{ date: '2026-01-20', event: 'AAPL earnings', country: 'US', importance: 3 }] })).toBe(false);
    expect(hasReleaseImpactRows({ economicEvents: [{ date: '2026-01-20', event: 'CPI', country: 'DE', importance: 1 }] })).toBe(false);
  });

  it('hasReleaseImpactRows is true when a dated key release or US/FRED/high-importance event exists', () => {
    expect(hasReleaseImpactRows({ keyReleases: [{ date: '2026-01-15', name: 'CPI' }] })).toBe(true);
    expect(hasReleaseImpactRows({ keyReleases: [{ date: '2026-01-15' }] })).toBe(true);
    expect(hasReleaseImpactRows({ economicEvents: [{ date: '2026-01-20', event: 'CPI', country: 'US' }] })).toBe(true);
    expect(hasReleaseImpactRows({ economicEvents: [{ date: '2026-01-20', event: 'HICP', source: 'FRED' }] })).toBe(true);
    expect(hasReleaseImpactRows({ economicEvents: [{ date: '2026-01-20', event: 'GDP', importance: 2 }] })).toBe(true);
  });

  it('hasCatalystRows is false for empty / dateless / sibling-only payloads', () => {
    expect(hasCatalystRows()).toBe(false);
    expect(hasCatalystRows({})).toBe(false);
    expect(hasCatalystRows({ isLive: true })).toBe(false);
    expect(hasCatalystRows({ economicEvents: [{ event: 'CPI' }] })).toBe(false);
    expect(hasCatalystRows({ centralBanks: [{ bank: 'Fed' }] })).toBe(false);
    expect(hasCatalystRows({ treasuryAuctions: [{ security: '10Y' }] })).toBe(false);
  });

  it('hasCatalystRows is true when any dated calendar row exists', () => {
    expect(hasCatalystRows({ economicEvents: [{ date: '2026-01-20', event: 'CPI' }] })).toBe(true);
    expect(hasCatalystRows({ keyReleases: [{ date: '2026-01-15', name: 'NFP' }] })).toBe(true);
    expect(hasCatalystRows({ centralBanks: [{ nextMeeting: '2026-01-28', bank: 'Fed' }] })).toBe(true);
    expect(hasCatalystRows({ treasuryAuctions: [{ auctionDate: '2026-01-15', security: '10Y' }] })).toBe(true);
    expect(hasCatalystRows({ earningsSeason: [{ date: '2026-01-28', ticker: 'AAPL' }] })).toBe(true);
    expect(hasCatalystRows({ optionsExpiry: [{ date: '2026-01-16' }] })).toBe(true);
  });
});

describe('crypto empty-capable tiles (sidebar / top-cryptos)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/crypto/components/CryptoDashboard.jsx');
    expect(dash).not.toMatch(/sidebar:\s*!!isLive/);
    expect(dash).not.toMatch(/'top-cryptos':\s*!!isLive/);
    expect(dash).toMatch(/sidebar:\s*hasCryptoSidebarContent/);
    expect(dash).toMatch(/'top-cryptos':\s*hasTopCryptos/);
  });

  it('hasCryptoSidebarContent is false for empty / sibling-only / dash-only payloads', () => {
    expect(hasCryptoSidebarContent()).toBe(false);
    expect(hasCryptoSidebarContent({})).toBe(false);
    expect(hasCryptoSidebarContent({ coinMarketData: { isLive: true } })).toBe(false);
    expect(hasCryptoSidebarContent({ coinMarketData: [] })).toBe(false);
    expect(hasCryptoSidebarContent({ coinMarketData: { coins: [] } })).toBe(false);
    expect(hasCryptoSidebarContent({ coinMarketData: [{ symbol: 'SOL', price: 140 }] })).toBe(false);
    expect(hasCryptoSidebarContent({ fearGreedData: { isLive: true, label: 'Fear' } })).toBe(false);
    expect(hasCryptoSidebarContent({ ethGas: { isLive: true } })).toBe(false);
    expect(hasCryptoSidebarContent({ stablecoinMcap: null, btcDominance: null })).toBe(false);
  });

  it('hasCryptoSidebarContent is true when a painted sidebar metric exists', () => {
    expect(hasCryptoSidebarContent({ coinMarketData: [{ symbol: 'BTC', price: 64000 }] })).toBe(true);
    expect(hasCryptoSidebarContent({ coinMarketData: { coins: [{ id: 'ethereum', symbol: 'eth' }] } })).toBe(true);
    expect(hasCryptoSidebarContent({ coinMarketData: { globalStats: { totalMarketCapT: 2.4 } } })).toBe(true);
    expect(hasCryptoSidebarContent({ coinMarketData: { total_market_cap_usd: 2.4e12 } })).toBe(true);
    expect(hasCryptoSidebarContent({ btcDominance: 54.2 })).toBe(true);
    expect(hasCryptoSidebarContent({ stablecoinMcap: 1.6e11 })).toBe(true);
    expect(hasCryptoSidebarContent({ ethGas: 18 })).toBe(true);
    expect(hasCryptoSidebarContent({ ethGas: { average: 22 } })).toBe(true);
    expect(hasCryptoSidebarContent({ fearGreedData: { value: 42 } })).toBe(true);
    expect(hasCryptoSidebarContent({ fearGreedData: { score: 28 } })).toBe(true);
  });

  it('hasTopCryptos is false for empty / sibling-only payloads', () => {
    expect(hasTopCryptos(null)).toBe(false);
    expect(hasTopCryptos([])).toBe(false);
    expect(hasTopCryptos({})).toBe(false);
    expect(hasTopCryptos({ isLive: true })).toBe(false);
    expect(hasTopCryptos({ coins: [] })).toBe(false);
    expect(hasTopCryptos({ globalStats: { totalMarketCapT: 2.4 } })).toBe(false);
  });

  it('hasTopCryptos is true when a coin row exists', () => {
    expect(hasTopCryptos([{ symbol: 'SOL', price: 140 }])).toBe(true);
    expect(hasTopCryptos({ coins: [{ id: 'bitcoin', symbol: 'btc' }] })).toBe(true);
  });
});

describe('crypto leftover empty-capable tiles (top-cryptos remount)', () => {
  it('dashboard and sidebar do not slice leftover isLive coin bags', () => {
    const dash = src('markets/crypto/components/CryptoDashboard.jsx');
    expect(dash).not.toMatch(/coinMarketData\?\.coins \|\| coinMarketData \|\| \[\]/);
    expect(dash).toMatch(/coinRows\(coinMarketData\)/);
    const side = src('markets/crypto/components/CryptoSidebar.jsx');
    expect(side).not.toMatch(/coinMarketData\?\.coins \|\| coinMarketData \|\| \[\]/);
    expect(side).toMatch(/coinRows\(coinMarketData\)/);
  });

  it('coinRows skips leftover isLive / coins bags so remount does not crash', () => {
    expect(() => coinRows({ isLive: true })).not.toThrow();
    expect(() => coinRows({ coins: { isLive: true } })).not.toThrow();
    expect(() => coinRows({ coins: true })).not.toThrow();
    expect(coinRows({ isLive: true })).toEqual([]);
    expect(coinRows({ coins: { isLive: true } })).toEqual([]);
    expect(coinRows({ coins: true })).toEqual([]);
    expect(() => coinRows({ isLive: true }).slice(0, 10)).not.toThrow();
    expect(() => coinRows({ coins: { isLive: true } }).slice(0, 10)).not.toThrow();
    const rows = coinRows({
      isLive: true,
      coins: [
        { isLive: true },
        { symbol: 'BTC', id: 'bitcoin', price: 64000 },
      ],
    });
    expect(rows.map((c) => c.symbol)).toEqual([undefined, 'BTC']);
    expect(() => rows.slice(0, 10).map((c) => c.symbol)).not.toThrow();
    expect(hasTopCryptos({ isLive: true })).toBe(false);
    expect(hasTopCryptos({ coins: { isLive: true } })).toBe(false);
    expect(hasTopCryptos({ coins: [{ symbol: 'BTC', price: 64000 }] })).toBe(true);
  });
});

describe('crypto leftover empty-capable tiles (onchain / btc-onchain)', () => {
  it('dashboard does not hardcode leftover isLive or bag existence on on-chain tiles', () => {
    const dash = src('markets/crypto/components/CryptoDashboard.jsx');
    expect(dash).not.toMatch(/onchain:\s*!!\(isLive && onChainData\)/);
    expect(dash).not.toMatch(/'btc-onchain':\s*!!onChainData/);
    expect(dash).toMatch(/onchain:\s*hasOnChainMetrics\(onChainData\)/);
    expect(dash).toMatch(/'btc-onchain':\s*hasOnChainMetrics\(onChainData\)/);
  });

  it('hasOnChainMetrics is false for empty / sibling isLive-only payloads', () => {
    expect(hasOnChainMetrics()).toBe(false);
    expect(hasOnChainMetrics(null)).toBe(false);
    expect(hasOnChainMetrics({})).toBe(false);
    expect(hasOnChainMetrics({ isLive: true })).toBe(false);
    expect(hasOnChainMetrics({ hashrate: {}, difficulty: {}, mempool: {}, fees: {} })).toBe(false);
    expect(hasOnChainMetrics({ hashrate: { history: [1, 2, 3] } })).toBe(false);
    expect(hasOnChainMetrics({ difficulty: { remainingBlocks: 120 } })).toBe(false);
  });

  it('hasOnChainMetrics is true when a painted on-chain metric exists', () => {
    expect(hasOnChainMetrics({ hashrate: { current: 650 } })).toBe(true);
    expect(hasOnChainMetrics({ difficulty: { progressPercent: 72.4 } })).toBe(true);
    expect(hasOnChainMetrics({ difficulty: { difficultyChange: -1.2 } })).toBe(true);
    expect(hasOnChainMetrics({ mempool: { count: 48000 } })).toBe(true);
    expect(hasOnChainMetrics({ fees: { fastest: 12 } })).toBe(true);
  });
});

describe('derivatives empty-capable tiles (kpi)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/derivatives/components/DerivativesDashboard.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!isLive/);
    expect(dash).toMatch(/kpi:\s*hasDerivativesKpiMetrics/);
  });

  it('hasDerivativesKpiMetrics is false for empty / sibling-only payloads', () => {
    expect(hasDerivativesKpiMetrics()).toBe(false);
    expect(hasDerivativesKpiMetrics({})).toBe(false);
    expect(hasDerivativesKpiMetrics({ vixTermStructure: { isLive: true } })).toBe(false);
    expect(hasDerivativesKpiMetrics({ vixTermStructure: { dates: ['1M', '3M'] } })).toBe(false);
    expect(hasDerivativesKpiMetrics({ vixTermStructure: { values: [18.2, 19.1] } })).toBe(false);
    expect(hasDerivativesKpiMetrics({ vixTermStructure: { dates: ['1M'], values: [null] } })).toBe(false);
    expect(hasDerivativesKpiMetrics({ putCallRatio: { isLive: true } })).toBe(false);
    expect(hasDerivativesKpiMetrics({ skewIndex: { interpretation: 'elevated' } })).toBe(false);
    expect(hasDerivativesKpiMetrics({ gammaExposure: { isLive: true } })).toBe(false);
    expect(hasDerivativesKpiMetrics({ gammaExposure: [] })).toBe(false);
  });

  it('hasDerivativesKpiMetrics is true when a painted KPI number exists', () => {
    expect(hasDerivativesKpiMetrics({ vixTermStructure: { dates: ['9D', '1M', '3M'], values: [17.4, 18.2, 19.1] } })).toBe(true);
    expect(hasDerivativesKpiMetrics({ vixTermStructure: { dates: ['9D'], values: [17.4] } })).toBe(true);
    expect(hasDerivativesKpiMetrics({ vixTermStructure: { dates: ['3M'], values: [19.1] } })).toBe(true);
    expect(hasDerivativesKpiMetrics({ putCallRatio: 0.92 })).toBe(true);
    expect(hasDerivativesKpiMetrics({ skewIndex: 132.4 })).toBe(true);
    expect(hasDerivativesKpiMetrics({ skewIndex: { value: 141.2 } })).toBe(true);
    expect(hasDerivativesKpiMetrics({ gammaExposure: 12.5 })).toBe(true);
    expect(hasDerivativesKpiMetrics({ gammaExposure: { total: -8.2 } })).toBe(true);
    expect(hasDerivativesKpiMetrics({ gammaExposure: [{ value: 3.1 }, { value: -1.4 }] })).toBe(true);
  });
});

describe('derivatives leftover empty-capable tiles (volprem / cftc-tff / ecb-derivatives)', () => {
  it('dashboard does not hardcode leftover bag existence on empty-capable tiles', () => {
    const dash = src('markets/derivatives/components/DerivativesDashboard.jsx');
    expect(dash).not.toMatch(/volprem:\s*!!volPremium/);
    expect(dash).not.toMatch(/'cftc-tff':\s*!!cftcTFFCtx\?\.data\?\.contracts/);
    expect(dash).not.toMatch(/'ecb-derivatives':\s*!!ecbCtx\?\.data\?\.policyRates/);
    expect(dash).toMatch(/volprem:\s*hasVolPremium\(volPremium\)/);
    expect(dash).toMatch(/'cftc-tff':\s*hasCftcTffRows\(cftcTFFCtx\?\.data\)/);
    expect(dash).toMatch(/'ecb-derivatives':\s*hasEcbDerivativesContent\(ecbCtx\?\.data\)/);
  });

  it('hasVolPremium is false for empty / sibling isLive-only payloads', () => {
    expect(hasVolPremium()).toBe(false);
    expect(hasVolPremium(null)).toBe(false);
    expect(hasVolPremium({})).toBe(false);
    expect(hasVolPremium({ isLive: true })).toBe(false);
    expect(hasVolPremium({ realizedVol30d: 12.4, premium: 3.1 })).toBe(false);
    expect(hasVolPremium({ atm1mIV: null })).toBe(false);
  });

  it('hasVolPremium is true when ATM 1M IV is numeric', () => {
    expect(hasVolPremium({ atm1mIV: 18.2 })).toBe(true);
    expect(hasVolPremium({ atm1mIV: '16.4' })).toBe(true);
  });

  it('hasCftcTffRows is false for empty / contracts-bag-only payloads', () => {
    expect(hasCftcTffRows()).toBe(false);
    expect(hasCftcTffRows(null)).toBe(false);
    expect(hasCftcTffRows({})).toBe(false);
    expect(hasCftcTffRows({ isLive: true })).toBe(false);
    expect(hasCftcTffRows({ contracts: {} })).toBe(false);
    expect(hasCftcTffRows({ contracts: { SPX: { name: 'S&P 500' } } })).toBe(false);
    expect(hasCftcTffRows({ contracts: { SPX: { series: [] } } })).toBe(false);
  });

  it('hasCftcTffRows is true when a contract series exists', () => {
    expect(hasCftcTffRows({ contracts: { SPX: { series: [{ nonCommLong: 12000, nonCommShort: 8000 }] } } })).toBe(true);
  });

  it('hasEcbDerivativesContent is false for empty / sibling bag-only payloads', () => {
    expect(hasEcbDerivativesContent()).toBe(false);
    expect(hasEcbDerivativesContent(null)).toBe(false);
    expect(hasEcbDerivativesContent({})).toBe(false);
    expect(hasEcbDerivativesContent({ isLive: true })).toBe(false);
    expect(hasEcbDerivativesContent({ policyRates: {}, moneyMarket: {} })).toBe(false);
    expect(hasEcbDerivativesContent({ policyRates: { depositFacility: {} }, m3Growth: [], hicpDetail: [] })).toBe(false);
  });

  it('hasEcbDerivativesContent is true when a painted ECB number exists', () => {
    expect(hasEcbDerivativesContent({ policyRates: { depositFacility: { value: 2.0 } } })).toBe(true);
    expect(hasEcbDerivativesContent({ moneyMarket: { estr: { value: 1.89 } } })).toBe(true);
    expect(hasEcbDerivativesContent({ m3Growth: [{ value: 3.1 }] })).toBe(true);
    expect(hasEcbDerivativesContent({ hicpDetail: [{ value: 2.4 }] })).toBe(true);
  });
});


describe('derivatives leftover empty-capable tiles (vixterm / vix1y / skew)', () => {
  it('dashboard does not hardcode leftover dates-only on empty-capable tiles', () => {
    const dash = src('markets/derivatives/components/DerivativesDashboard.jsx');
    expect(dash).not.toMatch(/vixterm:\s*!!vixTermStructure\?\.dates\?\.length/);
    expect(dash).not.toMatch(/vix1y:\s*!!fredVixHistory\?\.dates\?\.length/);
    expect(dash).not.toMatch(/skew:\s*!!skewHistory\?\.dates\?\.length/);
    expect(dash).toMatch(/vixterm:\s*hasVixTermSeries\(vixTermStructure\)/);
    expect(dash).toMatch(/vix1y:\s*hasFredVixSeries\(fredVixHistory\)/);
    expect(dash).toMatch(/skew:\s*hasSkewContent\(skewHistory, skewIndex\)/);
  });

  it('hasVixTermSeries is false for empty / dates-only leftover bags', () => {
    expect(hasVixTermSeries()).toBe(false);
    expect(hasVixTermSeries(null)).toBe(false);
    expect(hasVixTermSeries({})).toBe(false);
    expect(hasVixTermSeries({ isLive: true })).toBe(false);
    expect(hasVixTermSeries({ dates: ['1M', '3M'] })).toBe(false);
    expect(hasVixTermSeries({ dates: ['1M'], values: [], prevValues: [] })).toBe(false);
    expect(hasVixTermSeries({ dates: ['1M'], values: [null, null] })).toBe(false);
    expect(hasVixTermSeries({ values: [18.2] })).toBe(false);
    expect(hasVixTermSeries({ latest: 18.2 })).toBe(false);
  });

  it('hasVixTermSeries is true when dates and a series paint', () => {
    expect(hasVixTermSeries({ dates: ['1M'], values: [18.2] })).toBe(true);
    expect(hasVixTermSeries({ dates: ['1M'], prevValues: [17.4] })).toBe(true);
    expect(hasVixTermSeries({ dates: ['1M', '3M'], values: [null, 19.1] })).toBe(true);
  });

  it('hasFredVixSeries is false for empty / dates-only leftover bags', () => {
    expect(hasFredVixSeries()).toBe(false);
    expect(hasFredVixSeries(null)).toBe(false);
    expect(hasFredVixSeries({})).toBe(false);
    expect(hasFredVixSeries({ isLive: true })).toBe(false);
    expect(hasFredVixSeries({ dates: ['2024-01'] })).toBe(false);
    expect(hasFredVixSeries({ dates: ['2024-01'], values: [] })).toBe(false);
    expect(hasFredVixSeries({ dates: ['2024-01'], values: [null, null] })).toBe(false);
    expect(hasFredVixSeries({ values: [16.4] })).toBe(false);
    expect(hasFredVixSeries({ latest: 16.4 })).toBe(false);
  });

  it('hasFredVixSeries is true when dates and values paint', () => {
    expect(hasFredVixSeries({ dates: ['2024-01'], values: [16.4] })).toBe(true);
    expect(hasFredVixSeries({ dates: ['2024-01', '2024-02'], values: [null, 18.1] })).toBe(true);
  });

  it('hasSkewContent is false for empty / dates-only leftover bags', () => {
    expect(hasSkewContent()).toBe(false);
    expect(hasSkewContent(null)).toBe(false);
    expect(hasSkewContent({})).toBe(false);
    expect(hasSkewContent({ isLive: true })).toBe(false);
    expect(hasSkewContent({ dates: ['2024-01'] })).toBe(false);
    expect(hasSkewContent({ dates: ['2024-01'], values: [] })).toBe(false);
    expect(hasSkewContent({ dates: ['2024-01'], values: [null, null] })).toBe(false);
    expect(hasSkewContent({ values: [141.2] })).toBe(false);
    expect(hasSkewContent({ dates: ['2024-01'] }, { interpretation: 'elevated' })).toBe(false);
    expect(hasSkewContent({ dates: ['2024-01'] }, { value: null })).toBe(false);
  });

  it('hasSkewContent is true when history paints or spot is numeric', () => {
    expect(hasSkewContent({ dates: ['2024-01'], values: [141.2] })).toBe(true);
    expect(hasSkewContent({ dates: ['2024-01', '2024-02'], values: [null, 132.4] })).toBe(true);
    expect(hasSkewContent(null, { value: 141.2 })).toBe(true);
    expect(hasSkewContent({ dates: ['2024-01'] }, { value: '132.4' })).toBe(true);
  });
});

describe('bls empty-capable tiles (kpi / trends / jolts / productivity / cpi / ppi / eci / duration)', () => {
  it('dashboard does not hardcode !!isLive on empty-capable tiles', () => {
    const dash = src('markets/bls/components/BlsDashboard.jsx');
    expect(dash).not.toMatch(/Object\.keys\(bodies\)\.map\(\(id\) => \[id, !!isLive\]\)/);
    expect(dash).not.toMatch(/kpi:\s*!!isLive/);
    expect(dash).not.toMatch(/jolts:\s*!!isLive/);
    expect(dash).not.toMatch(/productivity:\s*!!isLive/);
    expect(dash).not.toMatch(/eci:\s*!!isLive/);
    expect(dash).toMatch(/kpi:\s*hasBlsKpiItems/);
    expect(dash).toMatch(/'trends-top':\s*hasBlsTrendsLaborItems/);
    expect(dash).toMatch(/'trends-bottom':\s*hasBlsTrendsPricesItems/);
    expect(dash).toMatch(/jolts:\s*hasBlsJoltsItems/);
    expect(dash).toMatch(/productivity:\s*hasBlsProductivityItems/);
    expect(dash).toMatch(/'cpi-components':\s*hasBlsCpiItems/);
    expect(dash).toMatch(/'ppi-by-industry':\s*hasBlsPpiItems/);
    expect(dash).toMatch(/eci:\s*hasBlsEciItems/);
    expect(dash).toMatch(/'unemployment-duration':\s*hasBlsDurationItems/);
  });

  it('hasBlsSeries is false for empty / sibling-only payloads', () => {
    expect(hasBlsSeries(null)).toBe(false);
    expect(hasBlsSeries(undefined)).toBe(false);
    expect(hasBlsSeries({})).toBe(false);
    expect(hasBlsSeries({ isLive: true })).toBe(false);
    expect(hasBlsSeries({ label: 'Unemployment Rate' })).toBe(false);
    expect(hasBlsSeries({ latest: null, history: { dates: [], values: [] }, _source: false })).toBe(false);
    expect(hasBlsSeries({ latest: { period: 'March' }, history: { dates: ['2026-03'] } })).toBe(false);
  });

  it('hasBlsSeries is true when source, history, or latest value exists', () => {
    expect(hasBlsSeries({ _source: true })).toBe(true);
    expect(hasBlsSeries({ history: { values: [4.3] } })).toBe(true);
    expect(hasBlsSeries({ latest: { value: 4.3 } })).toBe(true);
    expect(hasBlsSeries({ latest: { value: 0 } })).toBe(true);
  });

  it('hasBlsKpiItems is false for empty / sibling-only payloads', () => {
    expect(hasBlsKpiItems()).toBe(false);
    expect(hasBlsKpiItems(null)).toBe(false);
    expect(hasBlsKpiItems({})).toBe(false);
    expect(hasBlsKpiItems({ isLive: true })).toBe(false);
    expect(hasBlsKpiItems({ eciTotal: { latest: { value: 4.1 }, _source: true } })).toBe(false);
    expect(hasBlsKpiItems({ joltsHires: { latest: { value: 5500 }, _source: true } })).toBe(false);
    expect(hasBlsKpiItems({ unempLess5Weeks: { latest: { value: 2182 }, _source: true } })).toBe(false);
  });

  it('hasBlsKpiItems is true when a KPI series exists', () => {
    expect(hasBlsKpiItems({ unemployment: { latest: { value: 4.3 } } })).toBe(true);
    expect(hasBlsKpiItems({ nonfarmPayrolls: { history: { values: [158000] } } })).toBe(true);
  });

  it('hasBlsTrendsLaborItems / hasBlsTrendsPricesItems ignore the other trend group', () => {
    expect(hasBlsTrendsLaborItems({ cpi: { latest: { value: 330.2 } } })).toBe(false);
    expect(hasBlsTrendsPricesItems({ unemployment: { latest: { value: 4.3 } } })).toBe(false);
    expect(hasBlsTrendsLaborItems({ unemployment: { latest: { value: 4.3 } } })).toBe(true);
    expect(hasBlsTrendsPricesItems({ cpi: { latest: { value: 330.2 } } })).toBe(true);
  });

  it('hasBlsJoltsItems is false for empty / sibling-only payloads', () => {
    expect(hasBlsJoltsItems()).toBe(false);
    expect(hasBlsJoltsItems({ isLive: true })).toBe(false);
    expect(hasBlsJoltsItems({ unemployment: { latest: { value: 4.3 }, _source: true } })).toBe(false);
    expect(hasBlsJoltsItems({ eciTotal: { latest: { value: 4.1 } } })).toBe(false);
  });

  it('hasBlsJoltsItems is true when a JOLTS series exists', () => {
    expect(hasBlsJoltsItems({ jobOpenings: { latest: { value: 7200 } } })).toBe(true);
    expect(hasBlsJoltsItems({ joltsHires: { _source: true } })).toBe(true);
  });

  it('hasBlsProductivityItems is false for empty / sibling-only payloads', () => {
    expect(hasBlsProductivityItems()).toBe(false);
    expect(hasBlsProductivityItems({ unemployment: { latest: { value: 4.3 } } })).toBe(false);
    expect(hasBlsProductivityItems({ cpi: { latest: { value: 330.2 } } })).toBe(false);
  });

  it('hasBlsProductivityItems is true when output or unit labor cost exists', () => {
    expect(hasBlsProductivityItems({ outputPerHour: { latest: { value: 114.2 } } })).toBe(true);
    expect(hasBlsProductivityItems({ unitLaborCosts: { history: { values: [118.1] } } })).toBe(true);
  });

  it('hasBlsCpiItems / hasBlsPpiItems are false for empty / sibling-only payloads', () => {
    expect(hasBlsCpiItems()).toBe(false);
    expect(hasBlsPpiItems()).toBe(false);
    expect(hasBlsCpiItems({ ppi: { latest: { value: 145.2 } } })).toBe(false);
    expect(hasBlsPpiItems({ cpi: { latest: { value: 330.2 } } })).toBe(false);
    expect(hasBlsCpiItems({ unemployment: { latest: { value: 4.3 } } })).toBe(false);
  });

  it('hasBlsCpiItems / hasBlsPpiItems are true when a component series exists', () => {
    expect(hasBlsCpiItems({ cpi: { latest: { value: 330.2 } } })).toBe(true);
    expect(hasBlsCpiItems({ cpiFood: { _source: true } })).toBe(true);
    expect(hasBlsPpiItems({ ppi: { latest: { value: 145.2 } } })).toBe(true);
    expect(hasBlsPpiItems({ ppiServices: { history: { values: [130.4] } } })).toBe(true);
  });

  it('hasBlsEciItems is false for empty / sibling-only payloads', () => {
    expect(hasBlsEciItems()).toBe(false);
    expect(hasBlsEciItems({ isLive: true })).toBe(false);
    expect(hasBlsEciItems({ unemployment: { latest: { value: 4.3 }, _source: true } })).toBe(false);
    expect(hasBlsEciItems({ jobOpenings: { latest: { value: 7200 } } })).toBe(false);
  });

  it('hasBlsEciItems is true when a compensation series exists', () => {
    expect(hasBlsEciItems({ eciTotal: { latest: { value: 4.1 } } })).toBe(true);
    expect(hasBlsEciItems({ eciWages: { _source: true } })).toBe(true);
  });

  it('hasBlsDurationItems is false for empty / sibling-only / _source-false payloads', () => {
    expect(hasBlsDurationItems()).toBe(false);
    expect(hasBlsDurationItems({ unemployment: { latest: { value: 4.3 } } })).toBe(false);
    expect(hasBlsDurationItems({
      unemp15To26Weeks: { latest: null, history: { dates: [], values: [] }, _source: false },
      unemp27PlusWeeks: { latest: null, history: { dates: [], values: [] }, _source: false },
    })).toBe(false);
  });

  it('hasBlsDurationItems is true when a duration series exists', () => {
    expect(hasBlsDurationItems({ unempLess5Weeks: { latest: { value: 2182 } } })).toBe(true);
    expect(hasBlsDurationItems({ unemp27PlusWeeks: { history: { values: [1300] } } })).toBe(true);
  });
});
describe('macro leftover empty-capable tiles (ecb / tga / gdpnow / sep / cleveland / bea / eurostat / oecd)', () => {
  it('dashboard does not hardcode !!xxxData?.isLive on leftover tiles', () => {
    const dash = src('markets/globalMacro/components/GlobalMacroDashboard.jsx');
    expect(dash).not.toMatch(/'ecb-eur':\s*!!ecbData\?\.isLive/);
    expect(dash).not.toMatch(/'tga-balance':\s*!!dtsData\?\.isLive/);
    expect(dash).not.toMatch(/gdpnow:\s*!!gdpNowData\?\.isLive/);
    expect(dash).not.toMatch(/'fomc-sep':\s*!!sepData\?\.isLive/);
    expect(dash).not.toMatch(/cleveland:\s*!!cleveData\?\.isLive/);
    expect(dash).not.toMatch(/'bea-accounts':\s*!!beaData\?\.isLive/);
    expect(dash).not.toMatch(/eurostat:\s*!!eurostatData\?\.isLive/);
    expect(dash).not.toMatch(/'oecd-direct':\s*!!oecdData\?\.isLive/);
    expect(dash).not.toMatch(/'bea-income':\s*!!beaData\?\.isLive/);
    expect(dash).toMatch(/'ecb-eur':\s*hasEcbEurContent/);
    expect(dash).toMatch(/'tga-balance':\s*hasTgaSeries/);
    expect(dash).toMatch(/gdpnow:\s*hasGdpNowEvolution/);
    expect(dash).toMatch(/'fomc-sep':\s*hasFomcSepProjections/);
    expect(dash).toMatch(/cleveland:\s*hasClevelandNowcast/);
    expect(dash).toMatch(/'bea-accounts':\s*hasBeaAccountsRows/);
    expect(dash).toMatch(/eurostat:\s*hasEurostatRows/);
    expect(dash).toMatch(/'oecd-direct':\s*hasOecdDirectRows/);
    expect(dash).toMatch(/'bea-income':\s*hasBeaIncomeContent/);
  });

  it('hasEcbEurContent is false for empty / sibling-only payloads', () => {
    expect(hasEcbEurContent()).toBe(false);
    expect(hasEcbEurContent({})).toBe(false);
    expect(hasEcbEurContent({ isLive: true })).toBe(false);
    expect(hasEcbEurContent({ isLive: true, m3Growth: [{ value: 3.1 }], hicpDetail: [{ value: 2.4 }] })).toBe(false);
    expect(hasEcbEurContent({ policyRates: {} })).toBe(false);
    expect(hasEcbEurContent({ moneyMarket: { estr: { value: 3.9 } } })).toBe(false);
  });

  it('hasEcbEurContent is true when a corridor rate or money-market print exists', () => {
    expect(hasEcbEurContent({ policyRates: { mainRefinancing: { value: 4.15, period: '2024-06' } } })).toBe(true);
    expect(hasEcbEurContent({
      policyRates: { corridorWidth: { value: 0.75 } },
      moneyMarket: { estr: { value: 3.9 } },
    })).toBe(true);
  });

  it('hasTgaSeries is false for empty / isLive-only payloads', () => {
    expect(hasTgaSeries()).toBe(false);
    expect(hasTgaSeries({})).toBe(false);
    expect(hasTgaSeries({ isLive: true, latest: { closeB: 700 } })).toBe(false);
    expect(hasTgaSeries({ series: [] })).toBe(false);
  });

  it('hasTgaSeries is true when DTS series points exist', () => {
    expect(hasTgaSeries({ series: [{ date: '2024-06-01', closeB: 700 }] })).toBe(true);
  });

  it('hasGdpNowEvolution is false for empty / currentQuarter-only payloads', () => {
    expect(hasGdpNowEvolution()).toBe(false);
    expect(hasGdpNowEvolution({})).toBe(false);
    expect(hasGdpNowEvolution({ isLive: true, currentQuarter: '2024Q2', latest: { gdp: 2.1 } })).toBe(false);
    expect(hasGdpNowEvolution({ evolution: [] })).toBe(false);
  });

  it('hasGdpNowEvolution is true when evolution points exist', () => {
    expect(hasGdpNowEvolution({ evolution: [{ date: '2024-06-01', gdp: 2.1 }] })).toBe(true);
  });

  it('hasFomcSepProjections is false for empty / summary-only payloads', () => {
    expect(hasFomcSepProjections()).toBe(false);
    expect(hasFomcSepProjections({})).toBe(false);
    expect(hasFomcSepProjections({ isLive: true, summary: { releaseDate: '2024-06-12' } })).toBe(false);
    expect(hasFomcSepProjections({ projections: [] })).toBe(false);
  });

  it('hasFomcSepProjections is true when SEP rows exist', () => {
    expect(hasFomcSepProjections({ projections: [{ variable: 'PCE inflation', median: { current: 2.6 } }] })).toBe(true);
  });

  it('hasClevelandNowcast is false for empty / isLive-only payloads', () => {
    expect(hasClevelandNowcast()).toBe(false);
    expect(hasClevelandNowcast({})).toBe(false);
    expect(hasClevelandNowcast({ isLive: true })).toBe(false);
    expect(hasClevelandNowcast({ tables: [], byKind: { mom: { cpi: 0.2 } } })).toBe(false);
  });

  it('hasClevelandNowcast is true when tables or a YoY/latest headline exist', () => {
    expect(hasClevelandNowcast({ tables: [{ kind: 'yoy', rows: [{ cpi: 2.4 }] }] })).toBe(true);
    expect(hasClevelandNowcast({ latest: { cpi: 2.4 } })).toBe(true);
    expect(hasClevelandNowcast({ byKind: { yoy: { cpi: 2.4 } } })).toBe(true);
  });

  it('hasBeaAccountsRows is false for empty / sibling-only payloads', () => {
    expect(hasBeaAccountsRows()).toBe(false);
    expect(hasBeaAccountsRows({})).toBe(false);
    expect(hasBeaAccountsRows({ isLive: true, corporateProfits: [{ value: 3200 }] })).toBe(false);
    expect(hasBeaAccountsRows({ gdpComponents: [], savingRate: [] })).toBe(false);
  });

  it('hasBeaAccountsRows is true when GDP components or saving-rate rows exist', () => {
    expect(hasBeaAccountsRows({ gdpComponents: [{ desc: 'Gross domestic product', value: 28000 }] })).toBe(true);
    expect(hasBeaAccountsRows({ savingRate: [{ desc: 'Personal saving as a percentage', value: 4.1 }] })).toBe(true);
  });

  it('hasEurostatRows is false for empty / isLive-only payloads', () => {
    expect(hasEurostatRows()).toBe(false);
    expect(hasEurostatRows({})).toBe(false);
    expect(hasEurostatRows({ isLive: true })).toBe(false);
    expect(hasEurostatRows({ hicp: [], unemployment: [], govtDeficit: [] })).toBe(false);
  });

  it('hasEurostatRows is true when HICP, unemployment, or deficit rows exist', () => {
    expect(hasEurostatRows({ hicp: [{ period: '2024-05', value: 2.6 }] })).toBe(true);
    expect(hasEurostatRows({ unemployment: [{ period: '2024-05', value: 6.4 }] })).toBe(true);
  });

  it('hasOecdDirectRows is false for empty / sibling-only payloads', () => {
    expect(hasOecdDirectRows()).toBe(false);
    expect(hasOecdDirectRows({})).toBe(false);
    expect(hasOecdDirectRows({ isLive: true })).toBe(false);
    expect(hasOecdDirectRows({ cli: { USA: [] } })).toBe(false);
    expect(hasOecdDirectRows({ cli: { USA: [{ period: '2024-03' }] } })).toBe(false);
  });

  it('hasOecdDirectRows is true when a country CLI series has a value', () => {
    expect(hasOecdDirectRows({ cli: { USA: [{ period: '2024-03', value: 99.8 }] } })).toBe(true);
  });

  it('hasBeaIncomeContent is false for empty / GDP-sibling payloads', () => {
    expect(hasBeaIncomeContent()).toBe(false);
    expect(hasBeaIncomeContent({})).toBe(false);
    expect(hasBeaIncomeContent({ isLive: true, gdpComponents: [{ desc: 'Gross domestic product', value: 28000 }] })).toBe(false);
    expect(hasBeaIncomeContent({ savingRate: [{ desc: 'Unrelated line', value: 1, period: '2024Q1' }] })).toBe(false);
  });

  it('hasBeaIncomeContent is true when saving-rate cycle or income lines exist', () => {
    expect(hasBeaIncomeContent({
      savingRate: [{ desc: 'Personal saving as a percentage of disposable personal income', value: 4.1, period: '2024-05' }],
    })).toBe(true);
    expect(hasBeaIncomeContent({
      savingRate: [{ desc: 'Personal income', value: 24000, period: '2024-05' }],
    })).toBe(true);
  });
});

describe('insurance leftover empty-capable tiles (catastrophes / cat-exposure / ecb-supervisory)', () => {
  it('dashboard does not hardcode sibling isLive on leftover tiles', () => {
    const dash = src('markets/insurance/components/InsuranceDashboard.jsx');
    expect(dash).not.toMatch(/catastrophes:\s*!!\(femaCtx\?\.data\?\.isLive/);
    expect(dash).not.toMatch(/'cat-exposure':\s*!!\(femaCtx\?\.data\?\.isLive/);
    expect(dash).not.toMatch(/'ecb-supervisory':\s*!!ecbCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/catastrophes:\s*hasCatastropheRows/);
    expect(dash).toMatch(/'cat-exposure':\s*hasCatExposureContent/);
    expect(dash).toMatch(/'ecb-supervisory':\s*hasEcbSupervisoryContent/);
  });

  it('hasCatastropheRows is false for empty / sibling isLive-only payloads', () => {
    expect(hasCatastropheRows()).toBe(false);
    expect(hasCatastropheRows({}, {})).toBe(false);
    expect(hasCatastropheRows({ isLive: true, summary: { totalRecent: 0 } }, { isLive: true, eventsCount: 0 })).toBe(false);
    expect(hasCatastropheRows({ declarations: [] }, { events: [], magBuckets: [] })).toBe(false);
  });

  it('hasCatastropheRows is true when FEMA or USGS rows exist', () => {
    expect(hasCatastropheRows({ declarations: [{ type: 'Fire', firstDeclared: '2024-01-01' }] })).toBe(true);
    expect(hasCatastropheRows({ byType: [{ type: 'Fire', count: 8 }] })).toBe(true);
    expect(hasCatastropheRows(null, { events: [{ mag: 5.1 }] })).toBe(true);
    expect(hasCatastropheRows(null, { magBuckets: [{ range: '5-6', count: 3 }] })).toBe(true);
    expect(hasCatastropheRows(null, { biggest: { mag: 6.2, place: 'Chile' } })).toBe(true);
  });

  it('hasCatExposureContent is false for empty / sibling isLive-only payloads', () => {
    expect(hasCatExposureContent()).toBe(false);
    expect(hasCatExposureContent({})).toBe(false);
    expect(hasCatExposureContent({
      femaData: { isLive: true, summary: { totalRecent: 0 } },
      usgsData: { isLive: true, eventsCount: 0 },
      catLosses: { isLive: true },
      fredHyOasHistory: { isLive: true },
    })).toBe(false);
    expect(hasCatExposureContent({ catLosses: { values: [] } })).toBe(false);
    expect(hasCatExposureContent({ catLosses: { values: [null] } })).toBe(false);
    expect(hasCatExposureContent({ fredHyOasHistory: { dates: ['2024-01'] } })).toBe(false);
    expect(hasCatExposureContent({ industryAvgCombinedRatio: '92.1' })).toBe(false);
  });

  it('hasCatExposureContent is true when a painted KPI or list exists', () => {
    expect(hasCatExposureContent({ femaData: { declarations: [{ type: 'Fire' }] } })).toBe(true);
    expect(hasCatExposureContent({ usgsData: { events: [{ mag: 5.1 }] } })).toBe(true);
    expect(hasCatExposureContent({ catLosses: { values: [12.4] } })).toBe(true);
    expect(hasCatExposureContent({ fredHyOasHistory: { values: [3.1] } })).toBe(true);
    expect(hasCatExposureContent({ industryAvgCombinedRatio: 92.1 })).toBe(true);
  });

  it('hasEcbSupervisoryContent is false for empty / isLive-only payloads', () => {
    expect(hasEcbSupervisoryContent()).toBe(false);
    expect(hasEcbSupervisoryContent({})).toBe(false);
    expect(hasEcbSupervisoryContent({ isLive: true })).toBe(false);
    expect(hasEcbSupervisoryContent({ isLive: true, policyRates: {}, moneyMarket: {}, m3Growth: [], hicpDetail: [] })).toBe(false);
    expect(hasEcbSupervisoryContent({ policyRates: { depositFacility: { period: '2024-06' } } })).toBe(false);
    expect(hasEcbSupervisoryContent({ m3Growth: [{ period: '2024-05' }] })).toBe(false);
  });

  it('hasEcbSupervisoryContent is true when a policy, money-market, or macro print exists', () => {
    expect(hasEcbSupervisoryContent({ policyRates: { mainRefinancing: { value: 4.15, period: '2024-06' } } })).toBe(true);
    expect(hasEcbSupervisoryContent({ moneyMarket: { estr: { value: 3.9 } } })).toBe(true);
    expect(hasEcbSupervisoryContent({ m3Growth: [{ value: 3.1 }] })).toBe(true);
    expect(hasEcbSupervisoryContent({ hicpDetail: [{ value: 2.4 }] })).toBe(true);
  });
});

describe('insurance leftover empty-capable tiles (catastrophes remount)', () => {
  it('dashboard does not slice leftover isLive declaration or mag-bucket bags', () => {
    const dash = src('markets/insurance/components/InsuranceDashboard.jsx');
    expect(dash).not.toMatch(/femaCtx\?\.data\?\.declarations \|\| \[\]/);
    expect(dash).not.toMatch(/usgsCtx\?\.data\?\.magBuckets \|\| \[\]/);
    expect(dash).toMatch(/femaDeclarationRows\(femaCtx\?\.data\)/);
    expect(dash).toMatch(/usgsMagBucketRows\(usgsCtx\?\.data\)/);
  });

  it('femaDeclarationRows / usgsMagBucketRows skip leftover isLive bags so remount does not crash', () => {
    expect(() => femaDeclarationRows({ isLive: true })).not.toThrow();
    expect(() => femaDeclarationRows({ declarations: { isLive: true } })).not.toThrow();
    expect(() => femaDeclarationRows({ declarations: true })).not.toThrow();
    expect(femaDeclarationRows({ isLive: true })).toEqual([]);
    expect(femaDeclarationRows({ declarations: { isLive: true } })).toEqual([]);
    expect(femaDeclarationRows({ declarations: true })).toEqual([]);
    expect(() => femaDeclarationRows({ declarations: { isLive: true } }).slice(0, 10)).not.toThrow();
    const decls = femaDeclarationRows({
      isLive: true,
      declarations: [
        { isLive: true },
        { type: 'Fire', firstDeclared: '2024-01-01', states: ['CA', 'OR'] },
      ],
    });
    expect(decls.map((d) => d.type)).toEqual([undefined, 'Fire']);
    expect(() => decls.slice(0, 10).map((d) => (Array.isArray(d.states) ? d.states : []).join(','))).not.toThrow();

    expect(() => usgsMagBucketRows({ isLive: true })).not.toThrow();
    expect(() => usgsMagBucketRows({ magBuckets: { isLive: true } })).not.toThrow();
    expect(usgsMagBucketRows({ magBuckets: { isLive: true } })).toEqual([]);
    expect(() => usgsMagBucketRows({ magBuckets: { isLive: true } }).map((b) => b.range)).not.toThrow();
    const buckets = usgsMagBucketRows({
      isLive: true,
      magBuckets: [
        { isLive: true },
        { range: '5-6', count: 3 },
      ],
    });
    expect(buckets.map((b) => b.range)).toEqual([undefined, '5-6']);
    expect(() => buckets.map((b) => String(b.range || '').startsWith('7'))).not.toThrow();
  });
});

describe('sentiment leftover empty-capable tiles (news-sentiment)', () => {
  it('dashboard does not hardcode sibling isLive on leftover tiles', () => {
    const dash = src('markets/sentiment/components/SentimentDashboard.jsx');
    expect(dash).not.toMatch(/'news-sentiment':\s*!!newsSentimentCtx\?\.isLive/);
    expect(dash).toMatch(/'news-sentiment':\s*hasNewsSentimentSeries/);
  });

  it('hasNewsSentimentSeries is false for empty / sibling isLive-only payloads', () => {
    expect(hasNewsSentimentSeries()).toBe(false);
    expect(hasNewsSentimentSeries(null)).toBe(false);
    expect(hasNewsSentimentSeries({})).toBe(false);
    expect(hasNewsSentimentSeries({ isLive: true })).toBe(false);
    expect(hasNewsSentimentSeries({ isLive: true, latest: { date: '2024-01-02', sentiment: 0.12 } })).toBe(false);
    expect(hasNewsSentimentSeries({ series: [] })).toBe(false);
  });

  it('hasNewsSentimentSeries is true when SF Fed series rows exist', () => {
    expect(hasNewsSentimentSeries({ series: [{ date: '2024-01-02', sentiment: 0.12 }] })).toBe(true);
  });
});

describe('macro leftover empty-capable tiles (kpi)', () => {
  it('dashboard does not hardcode leftover kpiSidebar existence on kpi', () => {
    const dash = src('markets/globalMacro/components/GlobalMacroDashboard.jsx');
    expect(dash).not.toMatch(/kpi:\s*!!kpiSidebar/);
    expect(dash).toMatch(/kpi:\s*hasMacroKpiMetrics\(/);
  });

  it('hasMacroKpiMetrics is false for empty / leftover bag-only payloads', () => {
    expect(hasMacroKpiMetrics()).toBe(false);
    expect(hasMacroKpiMetrics({})).toBe(false);
    expect(hasMacroKpiMetrics({ scorecardData: { isLive: true } })).toBe(false);
    expect(hasMacroKpiMetrics({ scorecardData: [] })).toBe(false);
    expect(hasMacroKpiMetrics({ scorecardData: [{ code: 'DE' }] })).toBe(false);
    expect(hasMacroKpiMetrics({ scorecardData: [{ code: 'US' }], centralBankData: { isLive: true } })).toBe(false);
    expect(hasMacroKpiMetrics({ scorecardData: [{ code: 'JP', gdp: null, cpi: null }] })).toBe(false);
    expect(hasMacroKpiMetrics({ dxyHistory: { values: [104.2] } })).toBe(false);
    expect(hasMacroKpiMetrics({ centralBankData: { current: [{ code: 'US', rate: 5.25 }] } })).toBe(false);
  });

  it('hasMacroKpiMetrics is true when a painted KPI number exists', () => {
    expect(hasMacroKpiMetrics({ scorecardData: [{ code: 'US', gdp: 2.1 }] })).toBe(true);
    expect(hasMacroKpiMetrics({ scorecardData: [{ code: 'EA', gdp: 0.8 }] })).toBe(true);
    expect(hasMacroKpiMetrics({ scorecardData: [{ code: 'CN', gdp: 5.2 }] })).toBe(true);
    expect(hasMacroKpiMetrics({
      scorecardData: [{ code: 'DE' }],
      centralBankData: { current: [{ code: 'US', rate: 5.25 }] },
    })).toBe(true);
    expect(hasMacroKpiMetrics({
      scorecardData: [{ code: 'DE' }],
      dxyHistory: { values: [104.2] },
    })).toBe(true);
    expect(hasMacroKpiMetrics({ scorecardData: [{ code: 'UK', cpi: 3.4 }] })).toBe(true);
  });
});

describe('fx leftover empty-capable tiles (reer / corr)', () => {
  it('dashboard does not hardcode leftover bag existence on reer or corr', () => {
    const dash = src('markets/fx/components/FXDashboard.jsx');
    expect(dash).not.toMatch(/reer:\s*!!reer\?\.dates\?\.length/);
    expect(dash).not.toMatch(/corr:\s*!!\(history && Object\.keys\(history\)\.length/);
    expect(dash).toMatch(/reer:\s*hasReerSeries\(/);
    expect(dash).toMatch(/corr:\s*hasFxCorrelationHistory\(/);
  });

  it('hasReerSeries is false for empty / dates-only leftover bags', () => {
    expect(hasReerSeries()).toBe(false);
    expect(hasReerSeries(null)).toBe(false);
    expect(hasReerSeries({})).toBe(false);
    expect(hasReerSeries({ isLive: true })).toBe(false);
    expect(hasReerSeries({ dates: ['2024-01'] })).toBe(false);
    expect(hasReerSeries({ dates: ['2024-01'], US: [], EU: [] })).toBe(false);
    expect(hasReerSeries({ US: [118.2] })).toBe(false);
  });

  it('hasReerSeries is true when a painted country series exists', () => {
    expect(hasReerSeries({ dates: ['2024-01'], US: [118.2] })).toBe(true);
    expect(hasReerSeries({ dates: ['2024-01', '2024-02'], JP: [78.1, 77.4] })).toBe(true);
  });

  it('hasFxCorrelationHistory is false for empty / sibling-key leftover bags', () => {
    expect(hasFxCorrelationHistory()).toBe(false);
    expect(hasFxCorrelationHistory(null)).toBe(false);
    expect(hasFxCorrelationHistory({})).toBe(false);
    expect(hasFxCorrelationHistory({ isLive: true })).toBe(false);
    expect(hasFxCorrelationHistory({ USD: [1, 1.01], DXY: [104, 105] })).toBe(false);
    expect(hasFxCorrelationHistory({ EUR: [] })).toBe(false);
  });

  it('hasFxCorrelationHistory is true when a G10 history series exists', () => {
    expect(hasFxCorrelationHistory({ EUR: [0.92, 0.93] })).toBe(true);
    expect(hasFxCorrelationHistory({ JPY: [149.1] })).toBe(true);
  });
});

describe('fx leftover empty-capable tiles (dxy / cot)', () => {
  it('dashboard does not hardcode leftover bag existence on dxy or cot', () => {
    const dash = src('markets/fx/components/FXDashboard.jsx');
    expect(dash).not.toMatch(/dxy:\s*!!dxyHistory\?\.dates\?\.length/);
    expect(dash).not.toMatch(/cot:\s*!!\(cotHistory && Object\.keys\(cotHistory\)\.length/);
    expect(dash).toMatch(/dxy:\s*hasDxyHistory\(/);
    expect(dash).toMatch(/cot:\s*hasCotHistory\(/);
  });

  it('hasDxyHistory is false for empty / dates-only leftover bags', () => {
    expect(hasDxyHistory()).toBe(false);
    expect(hasDxyHistory(null)).toBe(false);
    expect(hasDxyHistory({})).toBe(false);
    expect(hasDxyHistory({ isLive: true })).toBe(false);
    expect(hasDxyHistory({ dates: ['2024-01'] })).toBe(false);
    expect(hasDxyHistory({ dates: ['2024-01'], values: [] })).toBe(false);
    expect(hasDxyHistory({ values: [104.2] })).toBe(false);
  });

  it('hasDxyHistory is true when dates and values paint', () => {
    expect(hasDxyHistory({ dates: ['2024-01'], values: [104.2] })).toBe(true);
  });

  it('hasCotHistory is false for empty / sibling-key leftover bags', () => {
    expect(hasCotHistory()).toBe(false);
    expect(hasCotHistory(null)).toBe(false);
    expect(hasCotHistory({})).toBe(false);
    expect(hasCotHistory({ isLive: true })).toBe(false);
    expect(hasCotHistory({ lastUpdated: '2024-01-01' })).toBe(false);
    expect(hasCotHistory({ EUR: [] })).toBe(false);
    expect(hasCotHistory({ EUR: [{}] })).toBe(false);
  });

  it('hasCotHistory is true when a currency series paints net positioning', () => {
    expect(hasCotHistory({ EUR: [{ date: '2024-01-01', net: 12.5 }] })).toBe(true);
    expect(hasCotHistory({ isLive: true, JPY: [{ date: '2024-01-01', net: -3 }] })).toBe(true);
  });

  it('cotHistorySeries skips leftover sibling keys so remount does not crash', () => {
    const series = cotHistorySeries({ isLive: true, lastUpdated: '2024-01', EUR: [{ date: '2024-01-01', net: 4 }] });
    expect(series.map(([ccy]) => ccy)).toEqual(['EUR']);
    expect(() => series.map(([, arr]) => arr.map((d) => d.net))).not.toThrow();
  });
});

describe('sentiment leftover empty-capable tiles (fed-risk-mood)', () => {
  it('dashboard does not hardcode leftover riskData bag existence on fed-risk-mood', () => {
    const dash = src('markets/sentiment/components/SentimentDashboard.jsx');
    expect(dash).not.toMatch(/'fed-risk-mood':\s*!!\(newsSentimentData\?\.series\?\.length \|\| riskData\)/);
    expect(dash).toMatch(/'fed-risk-mood':\s*hasFedRiskMoodContent/);
  });

  it('hasFedRiskMoodContent is false for empty / leftover bag-only payloads', () => {
    expect(hasFedRiskMoodContent()).toBe(false);
    expect(hasFedRiskMoodContent({})).toBe(false);
    expect(hasFedRiskMoodContent({ riskData: { isLive: true } })).toBe(false);
    expect(hasFedRiskMoodContent({ riskData: {} })).toBe(false);
    expect(hasFedRiskMoodContent({ riskData: { signals: [] } })).toBe(false);
    expect(hasFedRiskMoodContent({ newsSentimentData: { isLive: true, latest: { date: '2024-01-02', sentiment: 0.12 } } })).toBe(false);
    expect(hasFedRiskMoodContent({ newsSentimentData: { series: [] } })).toBe(false);
    expect(hasFedRiskMoodContent({ newsSentimentData: { series: [{ date: '2024-01-02' }] } })).toBe(false);
    expect(hasFedRiskMoodContent({ fearGreedData: { isLive: true } })).toBe(false);
    expect(hasFedRiskMoodContent({ fsiHistory: { dates: ['2024-01'] } })).toBe(false);
    expect(hasFedRiskMoodContent({ fsiHistory: { dates: ['2024-01'], values: [] } })).toBe(false);
  });

  it('hasFedRiskMoodContent is true when a painted card number exists', () => {
    expect(hasFedRiskMoodContent({ newsSentimentData: { series: [{ date: '2024-01-02', sentiment: 0.12 }] } })).toBe(true);
    expect(hasFedRiskMoodContent({ fearGreedData: { value: 42 } })).toBe(true);
    expect(hasFedRiskMoodContent({ fearGreedData: { score: 55 } })).toBe(true);
    expect(hasFedRiskMoodContent({ riskData: { overallScore: 61 } })).toBe(true);
    expect(hasFedRiskMoodContent({ fsiHistory: { values: [-0.4] } })).toBe(true);
    expect(hasFedRiskMoodContent({ riskData: { fsi: 0.8 } })).toBe(true);
    expect(hasFedRiskMoodContent({ riskData: { signals: [{ name: 'Financial Stress', value: 1.1 }] } })).toBe(true);
  });
});

describe('macro leftover empty-capable tiles (imf-cofer / global-liquidity)', () => {
  it('dashboard does not hardcode leftover bag-existence on empty-capable tiles', () => {
    const dash = src('markets/globalMacro/components/GlobalMacroDashboard.jsx');
    expect(dash).not.toMatch(/'imf-cofer':\s*!!\(imfData\?\.cofer && Object\.keys\(imfData\.cofer\)\.length > 0\)/);
    expect(dash).not.toMatch(/'global-liquidity':\s*!!\(dtsData\?\.series\?\.length \|\| ecbData\?\.m3Growth\?\.length \|\| beaData\?\.savingRate\?\.length\)/);
    expect(dash).toMatch(/'imf-cofer':\s*hasImfCoferShares\(imfData\?\.cofer\)/);
    expect(dash).toMatch(/'global-liquidity':\s*hasGlobalLiquidityContent\(/);
  });

  it('hasImfCoferShares is false for empty / keys-only leftover bags', () => {
    expect(hasImfCoferShares()).toBe(false);
    expect(hasImfCoferShares(null)).toBe(false);
    expect(hasImfCoferShares({})).toBe(false);
    expect(hasImfCoferShares({ isLive: true })).toBe(false);
    expect(hasImfCoferShares({ USD: { asOf: '2024-Q1' } })).toBe(false);
    expect(hasImfCoferShares({ USD: { value: 57.8 }, EUR: { value: 20.1 } })).toBe(false);
    expect(hasImfCoferShares({
      USD: { asOf: '2024-Q1' },
      EUR: { asOf: '2024-Q1' },
      JPY: { asOf: '2024-Q1' },
    })).toBe(false);
    expect(hasImfCoferShares({ USD: null, EUR: null, JPY: null })).toBe(false);
  });

  it('hasImfCoferShares is true when three currencies have painted shares', () => {
    expect(hasImfCoferShares({
      USD: { value: 57.8, asOf: '2024-Q1' },
      EUR: { value: 20.1, asOf: '2024-Q1' },
      JPY: { value: 5.8, asOf: '2024-Q1' },
    })).toBe(true);
    expect(hasImfCoferShares({
      USD: { value: 58 },
      EUR: { value: 20 },
      JPY: { asOf: '2024-Q1' },
      GBP: { value: 4.7 },
    })).toBe(true);
  });

  it('hasGlobalLiquidityContent is false for empty / dates-only leftover bags', () => {
    expect(hasGlobalLiquidityContent()).toBe(false);
    expect(hasGlobalLiquidityContent({})).toBe(false);
    expect(hasGlobalLiquidityContent({ dtsData: { isLive: true } })).toBe(false);
    expect(hasGlobalLiquidityContent({ dtsData: { series: [{ date: '2024-01-02' }] } })).toBe(false);
    expect(hasGlobalLiquidityContent({ dtsData: { series: [{ date: '2024-01-02', closeB: null }] } })).toBe(false);
    expect(hasGlobalLiquidityContent({ dtsData: { latest: { date: '2024-01-02' } } })).toBe(false);
    expect(hasGlobalLiquidityContent({ ecbData: { m3Growth: [{ period: '2024-01' }] } })).toBe(false);
    expect(hasGlobalLiquidityContent({ beaData: { savingRate: [{ desc: 'Unrelated line', value: 5.1 }] } })).toBe(false);
    expect(hasGlobalLiquidityContent({ beaData: { savingRate: [{ desc: 'Personal saving as a percentage of disposable personal income' }] } })).toBe(false);
    expect(hasGlobalLiquidityContent({ gdpNowData: { latest: { event: 'advance' } } })).toBe(false);
  });

  it('hasGlobalLiquidityContent is true when a painted TGA, M3, saving, or GDPNow number exists', () => {
    expect(hasGlobalLiquidityContent({ dtsData: { series: [{ date: '2024-01-02', closeB: 712 }] } })).toBe(true);
    expect(hasGlobalLiquidityContent({ dtsData: { latest: { closeB: 700 } } })).toBe(true);
    expect(hasGlobalLiquidityContent({ ecbData: { m3Growth: [{ period: '2024-01', value: 3.1 }] } })).toBe(true);
    expect(hasGlobalLiquidityContent({
      beaData: { savingRate: [{ desc: 'Personal saving as a percentage of disposable personal income', value: 4.8 }] },
    })).toBe(true);
    expect(hasGlobalLiquidityContent({ gdpNowData: { latest: { gdp: 2.4 } } })).toBe(true);
    expect(hasGlobalLiquidityContent({ gdpNowData: { evolution: [{ gdp: 1.8 }] } })).toBe(true);
  });
});

describe('macro leftover empty-capable tiles (m3Growth remount)', () => {
  it('dashboard does not slice leftover isLive m3Growth or DTS series bags', () => {
    const dash = src('markets/globalMacro/components/GlobalMacroDashboard.jsx');
    expect(dash).not.toMatch(/ecbData\?\.m3Growth \|\| \[\]/);
    expect(dash).not.toMatch(/dtsData\?\.series \|\| \[\]/);
    expect(dash).toMatch(/ecbM3GrowthRows\(ecbData\)/);
    expect(dash).toMatch(/dtsSeriesRows\(dtsData\)/);
  });

  it('ecbM3GrowthRows / dtsSeriesRows skip leftover isLive bags so remount does not crash', () => {
    expect(() => ecbM3GrowthRows({ isLive: true })).not.toThrow();
    expect(() => ecbM3GrowthRows({ m3Growth: { isLive: true } })).not.toThrow();
    expect(() => ecbM3GrowthRows({ m3Growth: true })).not.toThrow();
    expect(ecbM3GrowthRows({ isLive: true })).toEqual([]);
    expect(ecbM3GrowthRows({ m3Growth: { isLive: true } })).toEqual([]);
    expect(ecbM3GrowthRows({ m3Growth: true })).toEqual([]);
    expect(() => ecbM3GrowthRows({ m3Growth: { isLive: true } }).slice(-12)).not.toThrow();
    expect(() => ecbM3GrowthRows({ m3Growth: { isLive: true } }).slice(-24)).not.toThrow();
    const m3 = ecbM3GrowthRows({
      isLive: true,
      m3Growth: [
        { isLive: true },
        { period: '2024-01', value: 3.1 },
      ],
    });
    expect(m3.map((p) => p.period)).toEqual([undefined, '2024-01']);
    expect(() => m3.slice(-12).map((p) => p.period)).not.toThrow();

    expect(() => dtsSeriesRows({ isLive: true })).not.toThrow();
    expect(() => dtsSeriesRows({ series: { isLive: true } })).not.toThrow();
    expect(dtsSeriesRows({ series: { isLive: true } })).toEqual([]);
    expect(() => dtsSeriesRows({ series: { isLive: true } }).slice(-90)).not.toThrow();
    const series = dtsSeriesRows({
      isLive: true,
      series: [
        { isLive: true },
        { date: '2024-01-02', closeB: 712 },
      ],
    });
    expect(series.map((p) => p.date)).toEqual([undefined, '2024-01-02']);
    expect(() => series.slice(-60).map((p) => p.closeB)).not.toThrow();
  });
});

describe('derivatives leftover empty-capable tiles (volsurf)', () => {
  it('dashboard does not hardcode leftover grid-only bag existence on volsurf', () => {
    const dash = src('markets/derivatives/components/DerivativesDashboard.jsx');
    expect(dash).not.toMatch(/volsurf:\s*!!volSurfaceData\?\.grid\?\.length/);
    expect(dash).toMatch(/volsurf:\s*hasVolSurfaceGrid\(volSurfaceData\)/);
  });

  it('hasVolSurfaceGrid is false for empty / grid-only leftover bags', () => {
    expect(hasVolSurfaceGrid()).toBe(false);
    expect(hasVolSurfaceGrid(null)).toBe(false);
    expect(hasVolSurfaceGrid({})).toBe(false);
    expect(hasVolSurfaceGrid({ isLive: true })).toBe(false);
    expect(hasVolSurfaceGrid({ grid: [[]] })).toBe(false);
    expect(hasVolSurfaceGrid({ grid: [[20]] })).toBe(false);
    expect(hasVolSurfaceGrid({ grid: [[20]], strikes: [100] })).toBe(false);
    expect(hasVolSurfaceGrid({ grid: [[20]], expiries: ['1M'] })).toBe(false);
    expect(hasVolSurfaceGrid({ strikes: [100], expiries: ['1M'], grid: [[null]] })).toBe(false);
    expect(hasVolSurfaceGrid({ strikes: [100], expiries: ['1M'], grid: [[]] })).toBe(false);
  });

  it('hasVolSurfaceGrid is true when strikes, expiries, and a numeric cell paint', () => {
    expect(hasVolSurfaceGrid({ strikes: [100], expiries: ['1M'], grid: [[18.2]] })).toBe(true);
    expect(hasVolSurfaceGrid({ strikes: [90, 110], expiries: ['1M', '3M'], grid: [[null, 16.4], [19.1, null]] })).toBe(true);
    expect(hasVolSurfaceGrid({ strikes: [100], expiries: ['1M'], grid: [['17.4']] })).toBe(true);
  });

  it('volSurfaceHeatmap skips leftover grid-only bags so remount does not crash', () => {
    expect(() => volSurfaceHeatmap({ isLive: true, grid: [[]] })).not.toThrow();
    expect(() => volSurfaceHeatmap({ grid: [[20]] })).not.toThrow();
    expect(() => volSurfaceHeatmap({ grid: [[20]], strikes: [100] })).not.toThrow();
    expect(volSurfaceHeatmap({ grid: [[20]] }).cells).toEqual([]);
    const painted = volSurfaceHeatmap({
      strikes: [100, 110],
      expiries: ['1M'],
      grid: [[20, 18]],
    });
    expect(painted.cells).toEqual([[0, 0, 20], [1, 0, 18]]);
    expect(() => painted.cells.map((c) => c[2].toFixed(1))).not.toThrow();
  });
});

describe('equities leftover empty-capable tiles (sec-fundamentals / sec-filings)', () => {
  it('market does not hardcode leftover sibling isLive on SEC tiles', () => {
    const dash = src('markets/equities/EquitiesMarket.jsx');
    expect(dash).not.toMatch(/'sec-fundamentals':\s*!!edgarCtx\?\.data\?\.isLive/);
    expect(dash).not.toMatch(/'sec-filings':\s*!!filingActivityCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/'sec-fundamentals':\s*hasSecFundamentalsRows\(/);
    expect(dash).toMatch(/'sec-filings':\s*hasSecFilingActivity\(/);
  });

  it('hasSecFundamentalsRows is false for empty / sibling-isLive leftover bags', () => {
    expect(hasSecFundamentalsRows()).toBe(false);
    expect(hasSecFundamentalsRows(null)).toBe(false);
    expect(hasSecFundamentalsRows({})).toBe(false);
    expect(hasSecFundamentalsRows({ isLive: true })).toBe(false);
    expect(hasSecFundamentalsRows({ isLive: true, tickers: {} })).toBe(false);
    expect(hasSecFundamentalsRows({ isLive: true, tickers: { AAPL: null } })).toBe(false);
    expect(hasSecFundamentalsRows({ tickers: { AAPL: { cik: '0000320193' } } })).toBe(false);
    expect(hasSecFundamentalsRows({ tickers: { AAPL: { revenues: [], netIncome: [] } } })).toBe(false);
    expect(hasSecFundamentalsRows({ tickers: { AAPL: { revenues: [{ fy: 2024 }] } } })).toBe(false);
    expect(hasSecFundamentalsRows({ tickers: { AAPL: { revenues: [{ fy: 2024, value: null }] } } })).toBe(false);
    expect(hasSecFundamentalsRows({ AAPL: { revenues: [{ value: 394328000000 }] } })).toBe(false);
  });

  it('hasSecFundamentalsRows is true when a ticker has a numeric XBRL observation', () => {
    expect(hasSecFundamentalsRows({ tickers: { AAPL: { revenues: [{ fy: 2024, value: 394328000000 }] } } })).toBe(true);
    expect(hasSecFundamentalsRows({ tickers: { MSFT: { netIncome: [{ value: '88136000000' }] } } })).toBe(true);
    expect(hasSecFundamentalsRows({
      isLive: true,
      tickers: { AAPL: null, MSFT: { assets: [{ value: 512000000000 }] } },
    })).toBe(true);
  });

  it('hasSecFilingActivity is false for empty / sibling-isLive leftover bags', () => {
    expect(hasSecFilingActivity()).toBe(false);
    expect(hasSecFilingActivity(null)).toBe(false);
    expect(hasSecFilingActivity({})).toBe(false);
    expect(hasSecFilingActivity({ isLive: true })).toBe(false);
    expect(hasSecFilingActivity({ isLive: true, total: 12, tickerCount: 4 })).toBe(false);
    expect(hasSecFilingActivity({ isLive: true, byTicker: {} })).toBe(false);
    expect(hasSecFilingActivity({ byTicker: { AAPL: [] } })).toBe(false);
    expect(hasSecFilingActivity({ byTicker: { AAPL: [{}] } })).toBe(false);
    expect(hasSecFilingActivity({ byType: { '8-K': 3 }, total: 3 })).toBe(false);
    expect(hasSecFilingActivity({ material: [], insider: [], earnings: [], activist: [] })).toBe(false);
  });

  it('hasSecFilingActivity is true when a filing list paints', () => {
    expect(hasSecFilingActivity({ byTicker: { AAPL: [{ form: '8-K', date: '2026-08-01' }] } })).toBe(true);
    expect(hasSecFilingActivity({ material: [{ form: '8-K', accession: '0001' }] })).toBe(true);
    expect(hasSecFilingActivity({ insider: [{ form: '4', date: '2026-07-22' }] })).toBe(true);
    expect(hasSecFilingActivity({
      isLive: true,
      total: 0,
      byTicker: { AAPL: [], MSFT: [{ form: '10-Q' }] },
    })).toBe(true);
  });
});

describe('fx leftover empty-capable tiles (ratediff)', () => {
  it('dashboard does not hardcode leftover bag existence on ratediff', () => {
    const dash = src('markets/fx/components/FXDashboard.jsx');
    expect(dash).not.toMatch(/ratediff:\s*!!rateDiff\?\.length/);
    expect(dash).toMatch(/ratediff:\s*hasRateDiffRows\(/);
  });

  it('hasRateDiffRows is false for empty / sibling-key leftover bags', () => {
    expect(hasRateDiffRows()).toBe(false);
    expect(hasRateDiffRows(null)).toBe(false);
    expect(hasRateDiffRows({})).toBe(false);
    expect(hasRateDiffRows({ isLive: true })).toBe(false);
    expect(hasRateDiffRows({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasRateDiffRows({ dates: ['2024-01'] })).toBe(false);
    expect(hasRateDiffRows({ fed: null, ecb: null, usFed_ecb: null })).toBe(false);
    expect(hasRateDiffRows({ fed: '5.25' })).toBe(false);
  });

  it('hasRateDiffRows is true when a numeric policy or spread paints', () => {
    expect(hasRateDiffRows({ fed: 5.25 })).toBe(true);
    expect(hasRateDiffRows({ isLive: true, usFed_ecb: 1.5 })).toBe(true);
    expect(hasRateDiffRows({ lastUpdated: '2024-01', boj: 0.1 })).toBe(true);
  });

  it('rateDiffEntries skips leftover sibling keys so remount does not crash', () => {
    const rows = rateDiffEntries({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      fed: 5.25,
      usFed_ecb: 1.5,
    });
    expect(rows.map(([k]) => k)).toEqual(['fed', 'usFed_ecb']);
    expect(() => rows.map(([, v]) => v.toFixed(2))).not.toThrow();
  });
});

describe('equities leftover empty-capable tiles (universe-updates)', () => {
  it('market does not hardcode leftover _sources bag existence on universe-updates', () => {
    const dash = src('markets/equities/EquitiesMarket.jsx');
    expect(dash).not.toMatch(/'universe-updates':\s*!!universeCtx\?\.data\?\._sources/);
    expect(dash).toMatch(/'universe-updates':\s*hasUniverseUpdates\(/);
  });

  it('hasUniverseUpdates is false for empty / sibling-key leftover bags', () => {
    expect(hasUniverseUpdates()).toBe(false);
    expect(hasUniverseUpdates(null)).toBe(false);
    expect(hasUniverseUpdates({})).toBe(false);
    expect(hasUniverseUpdates({ isLive: true })).toBe(false);
    expect(hasUniverseUpdates({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasUniverseUpdates({ dates: ['2024-01'] })).toBe(false);
    expect(hasUniverseUpdates({ _sources: { universeUpdates: true } })).toBe(false);
    expect(hasUniverseUpdates({ isLive: true, updates: [] })).toBe(false);
    expect(hasUniverseUpdates({ updates: { isLive: true, lastUpdated: '2024-01', dates: ['2024-01'] } })).toBe(false);
    expect(hasUniverseUpdates({ updates: [{ isLive: true }, { lastUpdated: '2024-01' }] })).toBe(false);
    expect(hasUniverseUpdates({ updates: [{ name: 'AAPL' }] }, ['AAPL'])).toBe(false);
  });

  it('hasUniverseUpdates is true when a discovered listing paints', () => {
    expect(hasUniverseUpdates({ updates: [{ name: 'FOO' }] })).toBe(true);
    expect(hasUniverseUpdates({ isLive: true, _sources: { universeUpdates: true }, updates: [{ symbol: 'BAR' }] })).toBe(true);
    expect(hasUniverseUpdates({ updates: [{ name: 'AAPL' }, { name: 'NEWCO' }] }, ['AAPL'])).toBe(true);
  });

  it('universeUpdateRows skips leftover sibling keys so remount does not crash', () => {
    expect(() => universeUpdateRows({ isLive: true, lastUpdated: '2024-01', dates: ['2024-01'], updates: { isLive: true } })).not.toThrow();
    expect(universeUpdateRows({ updates: { isLive: true, lastUpdated: '2024-01', dates: ['2024-01'] } })).toEqual([]);
    const rows = universeUpdateRows({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      _sources: { universeUpdates: true },
      updates: [
        { isLive: true },
        { lastUpdated: '2024-01' },
        { name: 'FOO', price: '2024-01', changePct: true, marketCap: 12.5 },
      ],
    });
    expect(rows.map((r) => r.name)).toEqual(['FOO']);
    expect(() => rows.map((r) => (r.price != null ? r.price.toFixed(2) : '—'))).not.toThrow();
    expect(() => rows.map((r) => (r.changePct != null ? r.changePct.toFixed(2) : '—'))).not.toThrow();
    expect(rows[0].marketCap.toFixed(1)).toBe('12.5');
  });
});

describe('bonds leftover empty-capable tiles (yield)', () => {
  it('panel does not treat leftover sibling keys as live yield markets', () => {
    const panel = src('panels/bonds/yield.jsx');
    expect(panel).not.toMatch(/Object\.values\(yc\[k\]\)\.some\(\s*\(v\) => v != null\s*\)/);
    expect(panel).toMatch(/isLive:\s*\(ctx\) => hasYieldCurveContent\(ctx\?\.bonds\?\.yieldCurveData\)/);
  });

  it('hasYieldCurveContent is false for empty / sibling-key leftover bags', () => {
    expect(hasYieldCurveContent()).toBe(false);
    expect(hasYieldCurveContent(null)).toBe(false);
    expect(hasYieldCurveContent({})).toBe(false);
    expect(hasYieldCurveContent({ isLive: true })).toBe(false);
    expect(hasYieldCurveContent({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasYieldCurveContent({ dates: ['2024-01'] })).toBe(false);
    expect(hasYieldCurveContent({ _sources: { yieldCurve: true } })).toBe(false);
    expect(hasYieldCurveContent({ US: { isLive: true, lastUpdated: '2024-01', dates: ['2024-01'] } })).toBe(false);
    expect(hasYieldCurveContent({ US: { '3m': null, '10y': null, '30y': null } })).toBe(false);
    expect(hasYieldCurveContent({ US: { '10y': '4.25' } })).toBe(false);
    expect(hasYieldCurveContent({ DE: { '10y': true } })).toBe(false);
  });

  it('hasYieldCurveContent is true when a country paints a finite tenor', () => {
    expect(hasYieldCurveContent({ US: { '10y': 4.25 } })).toBe(true);
    expect(hasYieldCurveContent({ isLive: true, lastUpdated: '2024-01', DE: { '10y': 2.4 } })).toBe(true);
    expect(hasYieldCurveContent({
      isLive: true,
      dates: ['2024-01'],
      US: { isLive: true, '3m': null, '10y': 4.2 },
    })).toBe(true);
  });

  it('yieldCurveCountries skips leftover sibling keys so remount does not crash', () => {
    expect(() => yieldCurveCountries({ isLive: true, lastUpdated: '2024-01', dates: ['2024-01'], _sources: { yieldCurve: true } })).not.toThrow();
    expect(yieldCurveCountries({ isLive: true, lastUpdated: '2024-01', dates: ['2024-01'], US: { isLive: true } })).toEqual([]);
    const rows = yieldCurveCountries({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      _sources: { yieldCurve: true },
      US: { isLive: true, lastUpdated: '2024-01', dates: ['2024-01'], '10y': 4.25, '2y': true },
      DE: { '10y': '2.40' },
    });
    expect(rows.map(([k]) => k)).toEqual(['US']);
    expect(() => rows.map(([, curve]) => curve['10y'].toFixed(2))).not.toThrow();
    expect(rows[0][1]['10y'].toFixed(2)).toBe('4.25');
  });
});


describe('credit leftover empty-capable tiles (muni-market)', () => {
  it('dashboard does not hardcode leftover summary bag existence on muni-market', () => {
    const dash = src('markets/credit/components/CreditDashboard.jsx');
    expect(dash).not.toMatch(/'muni-market':\s*!!msrbCtx\?\.data\?\.summary/);
    expect(dash).not.toMatch(/return msrbCtx\?\.data\?\.summary/);
    expect(dash).toMatch(/'muni-market':\s*hasMuniMarketSummary\(/);
    expect(dash).toMatch(/return hasMuniMarketSummary\(msrbCtx\?\.data\)/);
  });

  it('hasMuniMarketSummary is false for empty / leftover summary bags', () => {
    expect(hasMuniMarketSummary()).toBe(false);
    expect(hasMuniMarketSummary(null)).toBe(false);
    expect(hasMuniMarketSummary({})).toBe(false);
    expect(hasMuniMarketSummary({ isLive: true })).toBe(false);
    expect(hasMuniMarketSummary({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasMuniMarketSummary({ dates: ['2024-01'] })).toBe(false);
    expect(hasMuniMarketSummary({ summary: { isLive: true, lastUpdated: '2024-01', dates: ['2024-01'] } })).toBe(false);
    expect(hasMuniMarketSummary({ summary: { tradesAll: true, parAllM: '410', ytdParM: true } })).toBe(false);
    expect(hasMuniMarketSummary({ summary: { tradesAll: 12000 } })).toBe(false);
    expect(hasMuniMarketSummary({ tradeTypes: [] })).toBe(false);
    expect(hasMuniMarketSummary({ tradeTypes: [{ isLive: true }, { lastUpdated: '2024-01' }] })).toBe(false);
    expect(hasMuniMarketSummary({ tradeTypes: [{ type: 'All', trades: true, parM: '12' }] })).toBe(false);
    expect(hasMuniMarketSummary({ primaryMarket: [{ period: true, parM: 100 }] })).toBe(false);
    expect(hasMuniMarketSummary({ primaryMarket: [{ period: 'Total', parM: 900 }] })).toBe(false);
    expect(hasMuniMarketSummary({ primaryMarket: [{ period: 'January' }] })).toBe(false);
  });

  it('hasMuniMarketSummary is true when a painted trade or issuance row exists', () => {
    expect(hasMuniMarketSummary({
      isLive: true,
      summary: { isLive: true, tradesAll: true },
      tradeTypes: [{ type: 'Customer Bought', trades: 1200, parM: 45.5 }],
    })).toBe(true);
    expect(hasMuniMarketSummary({
      summary: { lastUpdated: '2024-01' },
      primaryMarket: [{ period: 'January', parM: 2100 }],
    })).toBe(true);
  });

  it('muniTradeRows / muniPrimaryRows skip leftover sibling keys so remount does not crash', () => {
    expect(() => muniTradeRows({ isLive: true, summary: { isLive: true }, tradeTypes: { isLive: true } })).not.toThrow();
    expect(muniTradeRows({ tradeTypes: [{ isLive: true }, { lastUpdated: '2024-01' }, { type: 'All', trades: true, parM: '12' }] })).toEqual([]);
    const trades = muniTradeRows({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      summary: { isLive: true, lastUpdated: '2024-01', tradesAll: true },
      tradeTypes: [
        { isLive: true },
        { lastUpdated: '2024-01' },
        { type: 'Customer Bought', trades: 1200, parM: 45.5, avgSizeM: true },
      ],
    });
    expect(trades.map((r) => r.type)).toEqual(['Customer Bought']);
    expect(() => trades.map((r) => r.trades.toLocaleString())).not.toThrow();
    expect(() => trades.map((r) => r.parM.toFixed(1))).not.toThrow();
    expect(trades[0].parM.toFixed(1)).toBe('45.5');

    expect(() => muniPrimaryRows({ isLive: true, primaryMarket: { isLive: true } })).not.toThrow();
    expect(muniPrimaryRows({ primaryMarket: [{ period: true, parM: 100 }, { period: 'Total', parM: 900 }, { period: 'January' }] })).toEqual([]);
    const primary = muniPrimaryRows({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      primaryMarket: [
        { isLive: true },
        { period: true, parM: 100 },
        { period: 'Total', parM: 9000 },
        { period: 'January', parM: 2100, issues: 80, avgSizeM: 26.2 },
      ],
    });
    expect(primary.map((r) => r.period)).toEqual(['January']);
    expect(() => primary.map((r) => r.period.slice(0, 3))).not.toThrow();
    expect(() => primary.map((r) => r.parM.toFixed(0))).not.toThrow();
    expect(() => primary.map((r) => (typeof r.avgSizeM === 'number' ? r.avgSizeM.toFixed(1) : '—'))).not.toThrow();
    expect(primary[0].parM.toFixed(0)).toBe('2100');
  });
});

describe('crypto leftover empty-capable tiles (onchain-chart)', () => {
  it('dashboard does not hardcode leftover isLive or history-length on onchain-chart', () => {
    const dash = src('markets/crypto/components/CryptoDashboard.jsx');
    expect(dash).not.toMatch(/'onchain-chart':\s*!!\(isLive && onChainData\?\.hashrate\?\.history\?\.length/);
    expect(dash).toMatch(/'onchain-chart':\s*hasOnChainChart\(onChainData\)/);
  });

  it('hasOnChainChart is false for empty / leftover history bags', () => {
    expect(hasOnChainChart()).toBe(false);
    expect(hasOnChainChart(null)).toBe(false);
    expect(hasOnChainChart({})).toBe(false);
    expect(hasOnChainChart({ isLive: true })).toBe(false);
    expect(hasOnChainChart({ hashrate: { isLive: true, current: 650 } })).toBe(false);
    expect(hasOnChainChart({ hashrate: { history: [] } })).toBe(false);
    expect(hasOnChainChart({ hashrate: { history: [{ timestamp: 1700000000, avgHashrate: 650 }] } })).toBe(false);
    expect(hasOnChainChart({ hashrate: { history: [null, null] } })).toBe(false);
    expect(hasOnChainChart({ hashrate: { history: [{ isLive: true }, { lastUpdated: '2024-01' }] } })).toBe(false);
    expect(hasOnChainChart({ hashrate: { history: [{ timestamp: 1, avgHashrate: true }, { timestamp: 2, avgHashrate: '650' }] } })).toBe(false);
    expect(hasOnChainChart({ hashrate: { history: [{ timestamp: 1, avgHashrate: 650 }, { timestamp: 2 }] } })).toBe(false);
  });

  it('hasOnChainChart is true when two painted hashrate points exist', () => {
    expect(hasOnChainChart({
      isLive: true,
      hashrate: {
        isLive: true,
        history: [
          { timestamp: 1700000000, avgHashrate: 640 },
          { timestamp: 1700086400, avgHashrate: 650 },
        ],
      },
    })).toBe(true);
  });

  it('hashrateHistoryPoints skips leftover sibling rows so remount does not crash', () => {
    expect(() => hashrateHistoryPoints({ isLive: true, hashrate: { history: [null, { isLive: true }, 'x'] } })).not.toThrow();
    expect(hashrateHistoryPoints({ hashrate: { history: [null, { timestamp: 1, avgHashrate: 650 }, { timestamp: 2, avgHashrate: true }] } }).map((p) => p.avgHashrate)).toEqual([650]);
    const points = hashrateHistoryPoints({
      isLive: true,
      hashrate: {
        history: [
          { isLive: true },
          { timestamp: 1700000000, avgHashrate: 640 },
          { timestamp: 1700086400, avgHashrate: 650 },
          { timestamp: 3, avgHashrate: '660' },
        ],
      },
    });
    expect(points.map((p) => p.avgHashrate)).toEqual([640, 650]);
    expect(() => points.map((p) => p.avgHashrate.toFixed(1))).not.toThrow();
    expect(() => points.map((p) => new Date(p.timestamp * 1000).getMonth())).not.toThrow();
  });
});

describe('commodities leftover empty-capable tiles (fao-prices)', () => {
  it('dashboard does not hardcode leftover isLive on fao-prices', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/'fao-prices':\s*!!faoCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/'fao-prices':\s*hasFaoPriceSeries\(faoCtx\?\.data\)/);
  });

  it('hasFaoPriceSeries is false for empty / leftover isLive / dates-only bags', () => {
    expect(hasFaoPriceSeries()).toBe(false);
    expect(hasFaoPriceSeries(null)).toBe(false);
    expect(hasFaoPriceSeries({})).toBe(false);
    expect(hasFaoPriceSeries({ isLive: true })).toBe(false);
    expect(hasFaoPriceSeries({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasFaoPriceSeries({ series: [] })).toBe(false);
    expect(hasFaoPriceSeries({ isLive: true, series: [{ date: '2024-01' }] })).toBe(false);
    expect(hasFaoPriceSeries({ series: [{ date: '2024-01', value: null }] })).toBe(false);
    expect(hasFaoPriceSeries({ series: [{ date: '2024-01', value: '120.4' }] })).toBe(false);
    expect(hasFaoPriceSeries({ series: [{ isLive: true }, { lastUpdated: '2024-01' }] })).toBe(false);
  });

  it('hasFaoPriceSeries is true when a painted FAO index exists', () => {
    expect(hasFaoPriceSeries({ series: [{ date: '2024-01', value: 120.4 }] })).toBe(true);
    expect(hasFaoPriceSeries({
      isLive: true,
      series: [{ date: '2024-01' }, { date: '2024-02', value: 118.2 }],
    })).toBe(true);
  });

  it('faoPricePoints skips leftover sibling rows so remount does not crash', () => {
    expect(() => faoPricePoints({ isLive: true, series: [null, { isLive: true }, 'x'] })).not.toThrow();
    expect(faoPricePoints({ series: [null, { date: '2024-01', value: 120.4 }, { value: true }] }).map((p) => p.value)).toEqual([120.4]);
    const points = faoPricePoints({
      isLive: true,
      series: [
        { isLive: true },
        { date: '2024-01', value: 120.4 },
        { date: '2024-02', value: 118.2 },
        { date: '2024-03', value: '119' },
      ],
    });
    expect(points.map((p) => p.value)).toEqual([120.4, 118.2]);
    expect(() => points.map((p) => p.value.toFixed(1))).not.toThrow();
    expect(points[0].value.toFixed(1)).toBe('120.4');
  });
});

describe('commodities leftover empty-capable tiles (eia-petrol)', () => {
  it('dashboard does not hardcode leftover isLive on eia-petrol', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/'eia-petrol':\s*!!eiaPetCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/'eia-petrol':\s*hasEiaPetrolSeries\(eiaPetCtx\?\.data\)/);
  });

  it('hasEiaPetrolSeries is false for empty / leftover isLive / dates-only bags', () => {
    expect(hasEiaPetrolSeries()).toBe(false);
    expect(hasEiaPetrolSeries(null)).toBe(false);
    expect(hasEiaPetrolSeries({})).toBe(false);
    expect(hasEiaPetrolSeries({ isLive: true })).toBe(false);
    expect(hasEiaPetrolSeries({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasEiaPetrolSeries({ gasoline: { isLive: true, latest: { isLive: true } } })).toBe(false);
    expect(hasEiaPetrolSeries({ gasoline: { series: [] } })).toBe(false);
    expect(hasEiaPetrolSeries({ isLive: true, gasoline: { series: [{ date: '2024-01-01' }] } })).toBe(false);
    expect(hasEiaPetrolSeries({ gasoline: { series: [{ date: '2024-01-01', value: null }] } })).toBe(false);
    expect(hasEiaPetrolSeries({ gasoline: { series: [{ date: '2024-01-01', value: '3.21' }] } })).toBe(false);
    expect(hasEiaPetrolSeries({ gasoline: { series: [{ isLive: true }, { lastUpdated: '2024-01' }] } })).toBe(false);
    expect(hasEiaPetrolSeries({
      isLive: true,
      naturalGas: { series: [{ date: '2024-01-01', value: 2.84 }] },
    })).toBe(false);
  });

  it('hasEiaPetrolSeries is true when a painted gasoline point exists', () => {
    expect(hasEiaPetrolSeries({ gasoline: { series: [{ date: '2024-01-01', value: 3.21 }] } })).toBe(true);
    expect(hasEiaPetrolSeries({
      isLive: true,
      gasoline: { series: [{ date: 'not-a-date', value: 3.21 }, { date: '2024-02-01', value: 3.18 }] },
    })).toBe(true);
  });

  it('eiaPetrolSeriesPoints skips leftover sibling rows so remount does not crash', () => {
    expect(() => eiaPetrolSeriesPoints({ isLive: true, gasoline: { series: [null, { isLive: true }, 'x'] } }, 'gasoline')).not.toThrow();
    expect(eiaPetrolSeriesPoints({ gasoline: { series: [null, { date: '2024-01-01', value: 3.21 }, { date: 'bad', value: 3.5 }, { value: true }] } }, 'gasoline').map((p) => p.value)).toEqual([3.21]);
    const points = eiaPetrolSeriesPoints({
      isLive: true,
      gasoline: {
        series: [
          { isLive: true },
          { date: '2024-01-01', value: 3.21 },
          { date: '2024-02-01', value: 3.18 },
          { date: '2024-03-01', value: '3.19' },
        ],
      },
    }, 'gasoline');
    expect(points.map((p) => p.value)).toEqual([3.21, 3.18]);
    expect(() => points.map((p) => p.value.toFixed(2))).not.toThrow();
    expect(() => points.map((p) => new Date(p.date).toISOString())).not.toThrow();
    expect(points[0].value.toFixed(2)).toBe('3.21');
  });

  it('eiaPetrolSubtitle skips leftover latest / yoy so remount does not crash', () => {
    expect(() => eiaPetrolSubtitle({ isLive: true, gasoline: { latest: { isLive: true } }, naturalGas: { latest: { isLive: true } } })).not.toThrow();
    expect(eiaPetrolSubtitle({ isLive: true, gasoline: { latest: { isLive: true } }, naturalGas: { latest: { isLive: true } } })).toBe(null);
    expect(eiaPetrolSubtitle({ gasoline: { latest: { value: '3.21' } }, naturalGas: { latest: { value: 2.84 } } })).toBe(null);
    expect(eiaPetrolLatest({ gasoline: { latest: { isLive: true, value: true } } }, 'gasoline')).toBe(null);
    const text = eiaPetrolSubtitle({
      isLive: true,
      gasoline: { latest: { value: 3.21 }, yoyPct: true },
      naturalGas: { latest: { value: 2.84 }, yoyPct: '8' },
      crudeStocks: { latest: { isLive: true } },
    });
    expect(text).toBe('Gasoline $3.21/gal · NG $2.84/MMBtu');
    expect(() => eiaPetrolSubtitle({
      gasoline: { latest: { value: 3.21 }, yoyPct: -4.1 },
      naturalGas: { latest: { value: 2.84 }, yoyPct: 8.6 },
      crudeStocks: { latest: { value: 432100 } },
    })).not.toThrow();
    expect(eiaPetrolSubtitle({
      gasoline: { latest: { value: 3.21 }, yoyPct: -4.1 },
      naturalGas: { latest: { value: 2.84 }, yoyPct: 8.6 },
      crudeStocks: { latest: { value: 432100 } },
    })).toBe('Gasoline $3.21/gal (-4% YoY) · NG $2.84/MMBtu (+9% YoY) · Crude stocks 432M bbl');
  });
});

describe('commodities leftover empty-capable tiles (usda-ag)', () => {
  it('dashboard does not hardcode leftover isLive on usda-ag', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/'usda-ag':\s*!!\(usdaCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/'usda-ag':\s*!!\(hasUsdaAgSeries\(usdaCtx\?\.data\) \|\| hasUsdaFredSeries\(enhancedData\?\.fred\)\)/);
  });

  it('hasUsdaAgSeries is false for empty / leftover isLive / period-only bags', () => {
    expect(hasUsdaAgSeries()).toBe(false);
    expect(hasUsdaAgSeries(null)).toBe(false);
    expect(hasUsdaAgSeries({})).toBe(false);
    expect(hasUsdaAgSeries({ isLive: true })).toBe(false);
    expect(hasUsdaAgSeries({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasUsdaAgSeries({ summary: [], commodities: {} })).toBe(false);
    expect(hasUsdaAgSeries({ isLive: true, summary: [{ isLive: true }] })).toBe(false);
    expect(hasUsdaAgSeries({
      isLive: true,
      summary: [{ key: 'corn', latest: { isLive: true } }],
      commodities: { corn: [{ period: 'Jan', year: 2026 }] },
    })).toBe(false);
    expect(hasUsdaAgSeries({
      summary: [{ key: 'corn', desc: 'Corn', unit: '$/bu' }],
      commodities: { corn: [{ period: 'Jan', year: 2026, value: '4.12' }] },
    })).toBe(false);
    expect(hasUsdaAgSeries({
      summary: [{ key: 'corn' }],
      commodities: { corn: [{ isLive: true }, { lastUpdated: '2024-01' }] },
    })).toBe(false);
  });

  it('hasUsdaAgSeries is true when a painted NASS point exists', () => {
    expect(hasUsdaAgSeries({
      summary: [{ key: 'corn', desc: 'Corn', unit: '$/bu' }],
      commodities: { corn: [{ period: 'Jan', year: 2026, value: 4.12 }] },
    })).toBe(true);
    expect(hasUsdaAgSeries({
      isLive: true,
      summary: [{ key: 'wheat', desc: 'Wheat' }, { isLive: true }],
      commodities: {
        wheat: [{ period: 'Jan' }, { period: 'Feb', year: 2026, value: 5.48 }],
      },
    })).toBe(true);
  });

  it('usdaAgSeriesPoints skips leftover sibling rows so remount does not crash', () => {
    expect(() => usdaAgSeriesPoints({ isLive: true, commodities: { corn: [null, { isLive: true }, 'x'] } }, 'corn')).not.toThrow();
    expect(usdaAgSeriesPoints({
      commodities: { corn: [null, { period: 'Jan', year: 2026, value: 4.12 }, { period: 'Feb', year: 2026, value: true }] },
    }, 'corn').map((p) => p.value)).toEqual([4.12]);
    const points = usdaAgSeriesPoints({
      isLive: true,
      commodities: {
        corn: [
          { isLive: true },
          { period: 'Jan', year: 2026, value: 4.12 },
          { period: 'Feb', year: 2026, value: 4.28 },
          { period: 'Mar', year: 2026, value: '4.19' },
        ],
      },
    }, 'corn');
    expect(points.map((p) => p.value)).toEqual([4.12, 4.28]);
    expect(() => points.map((p) => p.value.toFixed(2))).not.toThrow();
    expect(() => points.map((p) => p.period.slice(0, 3) + '-' + String(p.year).slice(2))).not.toThrow();
    expect(points[0].value.toFixed(2)).toBe('4.12');
  });

  it('usdaAgSubtitle skips leftover latest / desc / unit so remount does not crash', () => {
    expect(() => usdaAgSubtitle({ isLive: true, summary: [{ isLive: true, latest: { isLive: true } }] })).not.toThrow();
    expect(usdaAgSubtitle({ isLive: true, summary: [{ isLive: true, latest: { isLive: true } }] })).toBe(null);
    expect(usdaAgSubtitle({ summary: [{ desc: 'Corn', unit: '$/bu', latest: { value: '4.12' } }] })).toBe(null);
    expect(usdaAgSubtitle({
      isLive: true,
      summary: [{ desc: 'Corn', unit: '$/bu', latest: { value: 4.12 }, yoyPct: true }],
    })).toBe('Corn 4.12/bu');
    expect(() => usdaAgSubtitle({
      summary: [{ desc: 'Corn', unit: '$/bu', latest: { value: 4.12 }, yoyPct: -6.1 }],
    })).not.toThrow();
    expect(usdaAgSubtitle({
      summary: [{ desc: 'Corn', unit: '$/bu', latest: { value: 4.12 }, yoyPct: -6.1 }],
    })).toBe('Corn 4.12/bu (-6% YoY)');
  });

  it('hasUsdaFredSeries is false for leftover FRED bags and true for painted history', () => {
    expect(hasUsdaFredSeries()).toBe(false);
    expect(hasUsdaFredSeries({ isLive: true })).toBe(false);
    expect(hasUsdaFredSeries({ wti: { history: [{ date: '2024-01', value: 78.4 }] } })).toBe(false);
    expect(hasUsdaFredSeries({ corn: { history: [{ date: '2024-01' }] } })).toBe(false);
    expect(hasUsdaFredSeries({ corn: { history: [{ isLive: true }, { date: '2024-01', value: '168.2' }] } })).toBe(false);
    expect(hasUsdaFredSeries({ corn: { history: [{ date: '2024-01', value: 168.2 }] } })).toBe(true);
    expect(() => usdaFredHistoryPoints({ corn: { history: [null, { isLive: true }, { date: '2024-01', value: 168.2 }] } }, 'corn')).not.toThrow();
    expect(usdaFredHistoryPoints({ corn: { history: [null, { isLive: true }, { date: '2024-01', value: 168.2 }] } }, 'corn').map((p) => p.value)).toEqual([168.2]);
  });

  it('usdaAgSummaryRows skips leftover summary so remount does not crash', () => {
    expect(() => usdaAgSummaryRows({ isLive: true, summary: [null, { isLive: true }, 'x'] })).not.toThrow();
    expect(usdaAgSummaryRows({
      summary: [{ isLive: true }, { key: 'corn', desc: 'Corn', unit: '$/bu' }],
      commodities: { corn: [{ period: 'Jan', year: 2026, value: 4.12 }] },
    }).map((r) => r.key)).toEqual(['corn']);
  });
});

describe('commodities leftover empty-capable tiles (us-trade)', () => {
  it('dashboard does not hardcode leftover isLive on us-trade', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/'us-trade':\s*!!tradeCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/'us-trade':\s*hasUsTradeSeries\(tradeCtx\?\.data\)/);
  });

  it('hasUsTradeSeries is false for empty / leftover isLive / month-only bags', () => {
    expect(hasUsTradeSeries()).toBe(false);
    expect(hasUsTradeSeries(null)).toBe(false);
    expect(hasUsTradeSeries({})).toBe(false);
    expect(hasUsTradeSeries({ isLive: true })).toBe(false);
    expect(hasUsTradeSeries({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasUsTradeSeries({ blocs: [], summary: { isLive: true } })).toBe(false);
    expect(hasUsTradeSeries({ isLive: true, blocs: [{ isLive: true }] })).toBe(false);
    expect(hasUsTradeSeries({
      isLive: true,
      blocs: [{ code: '-', label: 'World', series: { isLive: true } }],
    })).toBe(false);
    expect(hasUsTradeSeries({
      isLive: true,
      blocs: [{ code: '-', series: [{ month: '2024-01' }] }],
    })).toBe(false);
    expect(hasUsTradeSeries({
      blocs: [{ code: '-', series: [{ month: '2024-01', balanceB: null }] }],
    })).toBe(false);
    expect(hasUsTradeSeries({
      blocs: [{ code: '-', series: [{ month: '2024-01', balanceB: '-68.4' }] }],
    })).toBe(false);
    expect(hasUsTradeSeries({
      blocs: [{ code: '-', series: [{ isLive: true }, { lastUpdated: '2024-01' }] }],
    })).toBe(false);
  });

  it('hasUsTradeSeries is true when a painted balance point exists', () => {
    expect(hasUsTradeSeries({
      blocs: [{ code: '-', label: 'World', series: [{ month: '2024-01', balanceB: -68.4 }] }],
    })).toBe(true);
    expect(hasUsTradeSeries({
      isLive: true,
      blocs: [
        { isLive: true },
        { code: '0020', label: 'USMCA', series: [{ month: '2024-01' }, { month: '2024-02', balanceB: 12.5 }] },
      ],
    })).toBe(true);
  });

  it('usTradeBlocPoints skips leftover sibling rows so remount does not crash', () => {
    expect(() => usTradeBlocPoints({ isLive: true, series: [null, { isLive: true }, 'x'] })).not.toThrow();
    expect(usTradeBlocPoints({
      series: [null, { month: '2024-01', balanceB: -68.4 }, { month: '2024-02', balanceB: true }],
    }).map((p) => p.balanceB)).toEqual([-68.4]);
    const points = usTradeBlocPoints({
      isLive: true,
      series: [
        { isLive: true },
        { month: '2024-01', balanceB: -68.4 },
        { month: '2024-02', balanceB: -71.2 },
        { month: '2024-03', balanceB: '-69.1' },
      ],
    });
    expect(points.map((p) => p.balanceB)).toEqual([-68.4, -71.2]);
    expect(() => points.map((p) => p.balanceB.toFixed(1))).not.toThrow();
    expect(() => points.map((p) => p.month.slice(0, 7))).not.toThrow();
    expect(points[0].balanceB.toFixed(1)).toBe('-68.4');
  });

  it('usTradeSubtitle skips leftover summary so remount does not crash', () => {
    expect(() => usTradeSubtitle({ isLive: true, summary: { isLive: true } })).not.toThrow();
    expect(usTradeSubtitle({ isLive: true, summary: { isLive: true } })).toBe(null);
    expect(usTradeSubtitle({ summary: { latestMonth: '2024-01', worldExportsB: true, worldImportsB: 260.1, worldBalanceB: -68.4 } })).toBe(null);
    expect(usTradeSubtitle({ summary: { latestMonth: '2024-01', worldExportsB: '191.7', worldImportsB: 260.1, worldBalanceB: -68.4 } })).toBe(null);
    expect(usTradeSubtitle({
      isLive: true,
      summary: { latestMonth: true, worldExportsB: 191.7, worldImportsB: 260.1, worldBalanceB: -68.4 },
    })).toBe(null);
    expect(() => usTradeSubtitle({
      summary: { latestMonth: '2024-01', worldExportsB: 191.7, worldImportsB: 260.1, worldBalanceB: -68.4 },
    })).not.toThrow();
    expect(usTradeSubtitle({
      summary: { latestMonth: '2024-01', worldExportsB: 191.7, worldImportsB: 260.1, worldBalanceB: -68.4 },
    })).toBe('2024-01: $191.7B exports · $260.1B imports · net $-68.4B');
  });

  it('usTradeBlocs skips leftover blocs so remount does not crash', () => {
    expect(() => usTradeBlocs({ isLive: true, blocs: [null, { isLive: true }, 'x'] })).not.toThrow();
    expect(usTradeBlocs({
      blocs: [{ isLive: true }, { code: '-', label: 'World', series: [{ month: '2024-01', balanceB: -68.4 }] }],
    }).map((r) => r.code)).toEqual(['-']);
  });
});

describe('commodities leftover empty-capable tiles (physical-pressure)', () => {
  it('dashboard does not hardcode leftover isLive on physical-pressure', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/'physical-pressure':\s*!!\(eiaPetCtx\?\.data\?\.isLive/);
    expect(dash).toMatch(/'physical-pressure':\s*hasPhysicalPressureRows\(eiaPetCtx\?\.data, usdaCtx\?\.data, tradeCtx\?\.data\)/);
  });

  it('hasPhysicalPressureRows is false for empty / leftover isLive bags', () => {
    expect(hasPhysicalPressureRows()).toBe(false);
    expect(hasPhysicalPressureRows(null, null, null)).toBe(false);
    expect(hasPhysicalPressureRows({}, {}, {})).toBe(false);
    expect(hasPhysicalPressureRows({ isLive: true }, { isLive: true }, { isLive: true })).toBe(false);
    expect(hasPhysicalPressureRows({ lastUpdated: '2024-01' }, { lastUpdated: '2024-01' }, { lastUpdated: '2024-01' })).toBe(false);
    expect(hasPhysicalPressureRows(
      { isLive: true, crudeStocks: { latest: { isLive: true } }, gasoline: { latest: { isLive: true } } },
      { isLive: true, summary: { isLive: true } },
      { isLive: true, summary: { isLive: true } },
    )).toBe(false);
    expect(hasPhysicalPressureRows(
      { crudeStocks: { latest: { value: '432100' } } },
      { summary: [{ key: 'corn', latest: { value: '4.12' } }] },
      { summary: { worldBalanceB: '-68.4' } },
    )).toBe(false);
    expect(hasPhysicalPressureRows(
      { crudeStocks: { latest: { value: true } } },
      { summary: [{ isLive: true, latest: true }] },
      { summary: { worldBalanceB: true, latestMonth: '2024-01' } },
    )).toBe(false);
  });

  it('hasPhysicalPressureRows is true when a painted row exists', () => {
    expect(hasPhysicalPressureRows({ crudeStocks: { latest: { value: 432100 } } })).toBe(true);
    expect(hasPhysicalPressureRows(null, { summary: [{ key: 'corn', desc: 'Corn', latest: { value: 4.12 } }] })).toBe(true);
    expect(hasPhysicalPressureRows(null, null, { summary: { worldBalanceB: -68.4 } })).toBe(true);
    expect(hasPhysicalPressureRows(
      { isLive: true, gasoline: { latest: { isLive: true } } },
      { isLive: true, summary: [{ isLive: true }, { key: 'wheat', desc: 'Wheat', latest: { value: 5.48 } }] },
      { isLive: true, summary: { isLive: true } },
    )).toBe(true);
  });

  it('physicalPressureRows skips leftover siblings so remount does not crash', () => {
    expect(() => physicalPressureRows({ isLive: true }, { isLive: true, summary: { isLive: true } }, { isLive: true, summary: { isLive: true } })).not.toThrow();
    expect(() => physicalPressureRows(
      { crudeStocks: { latest: { isLive: true }, yoyPct: { isLive: true } } },
      { summary: [null, { isLive: true }, 'x', { desc: { isLive: true }, latest: { value: 4.12 } }] },
      { summary: { worldBalanceB: { isLive: true }, latestMonth: { isLive: true } } },
    )).not.toThrow();
    const rows = physicalPressureRows(
      { isLive: true, crudeStocks: { latest: { value: 432100 }, yoyPct: true }, gasoline: { latest: { isLive: true } } },
      { summary: [{ isLive: true }, { key: 'corn', desc: 'Corn', unit: '$/bu', latest: { value: 4.12 }, yoyPct: { isLive: true } }] },
      { summary: { worldBalanceB: -68.4, latestMonth: { isLive: true } } },
    );
    expect(rows.map((r) => r.market)).toEqual(['Crude stocks', 'Corn', 'US trade balance']);
    expect(rows.every((r) => typeof r.market === 'string')).toBe(true);
    expect(rows.every((r) => typeof r.value === 'string')).toBe(true);
    expect(rows.every((r) => typeof r.unit === 'string')).toBe(true);
    expect(rows.every((r) => typeof r.pressure === 'string')).toBe(true);
    expect(rows.every((r) => typeof r.read === 'string')).toBe(true);
    expect(() => rows.map((r) => r.read.slice(0, 3))).not.toThrow();
    expect(rows[0].value).toBe('432');
    expect(rows[0].read).toBe('No YoY');
    expect(rows[1].read).toBe('No YoY');
    expect(rows[2].read).toBe('latest month');
    expect(rows[2].value).toBe('\u221268.4');
  });

  it('physicalPressureRows paints finite yoy and trade month', () => {
    const rows = physicalPressureRows(
      { crudeStocks: { latest: { value: 432100 }, yoyPct: 1.2 } },
      { summary: [{ desc: 'Corn', unit: '$/bu', latest: { value: 4.12 }, yoyPct: -6.2 }] },
      { summary: { worldBalanceB: -68.4, latestMonth: '2026-06' } },
    );
    expect(rows[0].read).toBe('+1.2% YoY');
    expect(rows[0].pressure).toBe('Looser');
    expect(rows[1].read).toBe('-6.2% YoY');
    expect(rows[1].pressure).toBe('Lower');
    expect(rows[2].read).toBe('2026-06');
    expect(rows[2].pressure).toBe('Import demand');
  });
});

describe('commodities leftover empty-capable tiles (cot)', () => {
  it('dashboard does not hardcode leftover bag existence on cot', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/cot:\s*!!cotData/);
    expect(dash).toMatch(/cot:\s*hasCotPositioning\(cotData\)/);
    const market = src('markets/commodities/CommoditiesMarket.jsx');
    expect(market).not.toMatch(/const cotData = props\.cotData \|\| cotFromSentiment/);
    expect(market).toMatch(/hasCotPositioning\(props\.cotData\)/);
  });

  it('hasCotPositioning is false for empty / leftover isLive bags', () => {
    expect(hasCotPositioning()).toBe(false);
    expect(hasCotPositioning(null)).toBe(false);
    expect(hasCotPositioning({})).toBe(false);
    expect(hasCotPositioning({ isLive: true })).toBe(false);
    expect(hasCotPositioning({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasCotPositioning({ commodities: [] })).toBe(false);
    expect(hasCotPositioning({ isLive: true, commodities: [{ isLive: true }] })).toBe(false);
    expect(hasCotPositioning({
      isLive: true,
      commodities: [{ name: 'Gold', latest: { isLive: true } }],
    })).toBe(false);
    expect(hasCotPositioning({
      commodities: [{ name: 'Gold', latest: { noncommNet: '120000' } }],
    })).toBe(false);
    expect(hasCotPositioning({
      commodities: [{ name: 'Gold', latest: { noncommNet: true, commNet: '12', totalOI: { isLive: true } } }],
    })).toBe(false);
    expect(hasCotPositioning({
      commodities: [{ latest: { noncommNet: 120000 } }],
    })).toBe(false);
  });

  it('hasCotPositioning is true when a painted Spec/Comm/OI number exists', () => {
    expect(hasCotPositioning({
      commodities: [{ name: 'Gold', latest: { noncommNet: 120000 } }],
    })).toBe(true);
    expect(hasCotPositioning({
      isLive: true,
      commodities: [
        { isLive: true },
        { name: 'WTI Crude Oil', latest: { isLive: true }, history: [{ isLive: true }] },
        { name: 'Copper', latest: { totalOI: 210000 } },
      ],
    })).toBe(true);
  });

  it('cotCommodityRows / cotHistoryPoints skip leftover siblings so remount does not crash', () => {
    expect(() => cotCommodityRows({ isLive: true, commodities: [null, { isLive: true }, 'x'] })).not.toThrow();
    expect(cotCommodityRows({
      commodities: [
        { isLive: true },
        { name: 'Gold', latest: { isLive: true }, history: [{ isLive: true }, { date: true }] },
        { name: 'WTI Crude Oil', latest: { noncommNet: 185000, commNet: -190000, totalOI: 2100000, netChange: true } },
      ],
    }).map((r) => r.name)).toEqual(['WTI Crude Oil']);
    const rows = cotCommodityRows({
      isLive: true,
      commodities: [
        { isLive: true },
        { name: 'Gold', latest: { noncommNet: 120000, commNet: -115000, totalOI: 450000, netChange: 8000 } },
        { name: 'Silver', latest: { noncommNet: '12' } },
      ],
    });
    expect(rows.map((r) => r.name)).toEqual(['Gold']);
    expect(rows[0].latest.noncommNet).toBe(120000);
    expect(rows[0].latest.netChange).toBe(8000);
    expect(() => rows.map((r) => r.name.slice(0, 3))).not.toThrow();
    expect(() => rows.map((r) => (r.latest.noncommNet / 1000).toFixed(0))).not.toThrow();
    expect((rows[0].latest.noncommNet / 1000).toFixed(0)).toBe('120');

    expect(() => cotHistoryPoints([null, { isLive: true }, 'x'])).not.toThrow();
    expect(cotHistoryPoints([
      { isLive: true },
      { date: '2024-01-08', noncommNet: 110000 },
      { date: '2024-01-15', noncommNet: true },
      { date: true, noncommNet: 120000 },
    ]).map((p) => p.noncommNet)).toEqual([110000]);
    const points = cotHistoryPoints([
      { isLive: true },
      { date: '2024-01-01', noncommNet: 100000 },
      { date: '2024-01-08', noncommNet: 110000 },
      { date: '2024-01-15', noncommNet: 120000 },
    ]);
    expect(points.map((p) => p.noncommNet)).toEqual([100000, 110000, 120000]);
    expect(() => points.map((p) => p.date.slice(5))).not.toThrow();
    expect(() => points.map((p) => (p.noncommNet / 1000).toFixed(0))).not.toThrow();
    expect(points[0].date.slice(5)).toBe('01-01');
  });
});
describe('commodities leftover empty-capable tiles (wti-brent)', () => {
  it('dashboard does not hardcode leftover bag existence on wti-brent', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/'wti-brent':\s*!!\(fredCommodities\?\.wtiHistory && fredCommodities\?\.brentHistory\)/);
    expect(dash).toMatch(/'wti-brent':\s*hasWtiBrentSeries\(fredCommodities\)/);
    expect(dash).toMatch(/wtiBrentHistoryPoints\(fredCommodities\?\.wtiHistory\)/);
  });

  it('hasWtiBrentSeries is false for empty / leftover isLive bags', () => {
    expect(hasWtiBrentSeries()).toBe(false);
    expect(hasWtiBrentSeries(null)).toBe(false);
    expect(hasWtiBrentSeries({})).toBe(false);
    expect(hasWtiBrentSeries({ isLive: true })).toBe(false);
    expect(hasWtiBrentSeries({ wtiHistory: { isLive: true }, brentHistory: { isLive: true } })).toBe(false);
    expect(hasWtiBrentSeries({
      wtiHistory: { dates: [], values: [] },
      brentHistory: { dates: [], values: [] },
    })).toBe(false);
    expect(hasWtiBrentSeries({
      wtiHistory: { dates: ['2024-01-02'], values: [] },
      brentHistory: { dates: ['2024-01-02'], values: [] },
    })).toBe(false);
    expect(hasWtiBrentSeries({
      wtiHistory: { dates: ['2024-01-02'], values: ['70'] },
      brentHistory: { dates: ['2024-01-02'], values: [80] },
    })).toBe(false);
    expect(hasWtiBrentSeries({
      wtiHistory: { dates: [true], values: [70] },
      brentHistory: { dates: ['2024-01-02'], values: [80] },
    })).toBe(false);
    expect(hasWtiBrentSeries({
      wtiHistory: { dates: ['2024-01-02'], values: [70] },
      brentHistory: { isLive: true },
    })).toBe(false);
  });

  it('hasWtiBrentSeries is true when both series have a painted point', () => {
    expect(hasWtiBrentSeries({
      wtiHistory: { dates: ['2024-01-02'], values: [70.12] },
      brentHistory: { dates: ['2024-01-02'], values: [74.5] },
    })).toBe(true);
    expect(hasWtiBrentSeries({
      isLive: true,
      wtiHistory: { isLive: true, dates: [true, '2024-01-02'], values: [true, 70.12] },
      brentHistory: { dates: ['2024-01-03', '2024-01-02'], values: [75, 74.5] },
    })).toBe(true);
  });

  it('wtiBrentHistoryPoints skips leftover siblings so remount does not crash', () => {
    expect(() => wtiBrentHistoryPoints({ isLive: true })).not.toThrow();
    expect(() => wtiBrentHistoryPoints({ dates: true, values: true })).not.toThrow();
    expect(() => wtiBrentHistoryPoints({ dates: [true, { isLive: true }, 123], values: [70, 71, 72] })).not.toThrow();
    expect(wtiBrentHistoryPoints({
      dates: [true, '2024-01-02', '2024-01-03'],
      values: [70, 71.25, '72'],
    }).map((p) => p.value)).toEqual([71.25]);
    const points = wtiBrentHistoryPoints({
      isLive: true,
      dates: ['2024-01-02', '2024-01-03', '2024-01-04'],
      values: [70.12, 71.25, 72.5],
    });
    expect(points.map((p) => p.value)).toEqual([70.12, 71.25, 72.5]);
    expect(() => points.map((p) => p.date.slice(5))).not.toThrow();
    expect(() => points.map((p) => p.value.toFixed(2))).not.toThrow();
    expect(points[0].date.slice(5)).toBe('01-02');
    expect(points[0].value.toFixed(2)).toBe('70.12');
  });
});


describe('commodities leftover empty-capable tiles (comfx)', () => {
  it('dashboard does not hardcode leftover bag existence on comfx', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/comfx:\s*!!commodityCurrencies/);
    expect(dash).toMatch(/comfx:\s*hasCommodityFxRates\(commodityCurrencies\)/);
    expect(dash).toMatch(/commodityFxRows\(commodityCurrencies\)/);
    const market = src('markets/commodities/CommoditiesMarket.jsx');
    expect(market).not.toMatch(/const commodityCurrencies = props\.commodityCurrencies \|\| ccyFromFx/);
    expect(market).toMatch(/hasCommodityFxRates\(props\.commodityCurrencies\)/);
  });

  it('hasCommodityFxRates is false for empty / leftover isLive bags', () => {
    expect(hasCommodityFxRates()).toBe(false);
    expect(hasCommodityFxRates(null)).toBe(false);
    expect(hasCommodityFxRates({})).toBe(false);
    expect(hasCommodityFxRates({ isLive: true })).toBe(false);
    expect(hasCommodityFxRates({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasCommodityFxRates({ dates: ['2024-01'] })).toBe(false);
    expect(hasCommodityFxRates({ CAD: { isLive: true } })).toBe(false);
    expect(hasCommodityFxRates({ CAD: { rate: true } })).toBe(false);
    expect(hasCommodityFxRates({ CAD: { rate: '1.3612' } })).toBe(false);
    expect(hasCommodityFxRates({ CAD: { changePct: 0.14 } })).toBe(false);
    expect(hasCommodityFxRates({ isLive: true, lastUpdated: '2024-01', dates: ['2024-01'] })).toBe(false);
  });

  it('hasCommodityFxRates is true when a painted commodity FX rate exists', () => {
    expect(hasCommodityFxRates({ CAD: 1.3612 })).toBe(true);
    expect(hasCommodityFxRates({ CAD: { rate: 1.3612 } })).toBe(true);
    expect(hasCommodityFxRates({
      isLive: true,
      lastUpdated: '2024-01',
      CAD: { isLive: true },
      AUD: { rate: 1.528 },
    })).toBe(true);
  });

  it('commodityFxRows skips leftover sibling keys so remount does not crash', () => {
    expect(() => commodityFxRows({ isLive: true, lastUpdated: '2024-01', dates: ['2024-01'] })).not.toThrow();
    expect(commodityFxRows({ isLive: true, CAD: { isLive: true }, AUD: { rate: true } })).toEqual([]);
    expect(commodityFxRows({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      CAD: { rate: 1.3612, changePct: true },
      AUD: { rate: 1.528, change1d: -0.22 },
      NOK: 10.842,
      USD: { rate: 1 },
    }).map((r) => r.code)).toEqual(['CAD', 'AUD', 'NOK']);
    const rows = commodityFxRows({
      isLive: true,
      CAD: { rate: 1.3612, changePct: 0.14 },
      AUD: { rate: 1.528, change1d: -0.22 },
      NOK: 10.842,
    });
    expect(rows.map((r) => r.rate)).toEqual([1.3612, 1.528, 10.842]);
    expect(rows[0].changePct).toBe(0.14);
    expect(rows[1].changePct).toBe(-0.22);
    expect(rows[2].changePct).toBe(null);
    expect(() => rows.map((r) => r.rate.toFixed(4))).not.toThrow();
    expect(() => rows.map((r) => r.code.slice(0, 2))).not.toThrow();
    expect(rows[0].rate.toFixed(4)).toBe('1.3612');
  });
});

describe('commodities leftover empty-capable tiles (sector)', () => {
  it('dashboard does not hardcode leftover bag existence on sector', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/sector:\s*!!sectorHeatmapData/);
    expect(dash).toMatch(/sector:\s*hasSectorHeatmapRows\(sectorHeatmapData\)/);
    const heat = src('markets/commodities/components/SectorHeatmap.jsx');
    expect(heat).toMatch(/sectorHeatmapRows\(sectorHeatmapData\)/);
    expect(heat).not.toMatch(/const \{ commodities = \[\], columns = \[\] \} = sectorHeatmapData/);
  });

  it('hasSectorHeatmapRows is false for empty / leftover isLive bags', () => {
    expect(hasSectorHeatmapRows()).toBe(false);
    expect(hasSectorHeatmapRows(null)).toBe(false);
    expect(hasSectorHeatmapRows({})).toBe(false);
    expect(hasSectorHeatmapRows({ isLive: true })).toBe(false);
    expect(hasSectorHeatmapRows({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasSectorHeatmapRows({ dates: ['2024-01'] })).toBe(false);
    expect(hasSectorHeatmapRows({ commodities: [] })).toBe(false);
    expect(hasSectorHeatmapRows({ commodities: { isLive: true } })).toBe(false);
    expect(hasSectorHeatmapRows({ commodities: true })).toBe(false);
    expect(hasSectorHeatmapRows({ isLive: true, commodities: [{ isLive: true }] })).toBe(false);
    expect(hasSectorHeatmapRows({
      commodities: [{ name: 'Gold', d1: true, w1: '1.2', m1: { isLive: true } }],
    })).toBe(false);
    expect(hasSectorHeatmapRows({
      commodities: [{ d1: 0.82 }],
    })).toBe(false);
    expect(hasSectorHeatmapRows({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      columns: { isLive: true },
    })).toBe(false);
  });

  it('hasSectorHeatmapRows is true when a painted sector change exists', () => {
    expect(hasSectorHeatmapRows({
      commodities: [{ name: 'Gold', d1: 0.34 }],
    })).toBe(true);
    expect(hasSectorHeatmapRows({
      isLive: true,
      commodities: [
        { isLive: true },
        { name: 'Gold', d1: true },
        { name: 'WTI Crude', w1: 1.23 },
      ],
    })).toBe(true);
  });

  it('sectorHeatmapRows skips leftover siblings so remount does not crash', () => {
    expect(() => sectorHeatmapRows({ isLive: true })).not.toThrow();
    expect(() => sectorHeatmapRows({ commodities: { isLive: true } })).not.toThrow();
    expect(() => sectorHeatmapRows({ commodities: true })).not.toThrow();
    expect(() => sectorHeatmapRows({ commodities: [null, { isLive: true }, 'x'] })).not.toThrow();
    expect(sectorHeatmapRows({
      commodities: [
        { isLive: true },
        { name: 'Gold', d1: true, w1: '1.2', m1: { isLive: true } },
        { name: 'WTI Crude', ticker: 'CL=F', sector: 'Energy', d1: 0.82, w1: 1.23, m1: -0.45 },
      ],
    }).map((r) => r.name)).toEqual(['WTI Crude']);
    const rows = sectorHeatmapRows({
      isLive: true,
      commodities: [
        { isLive: true },
        { name: 'Gold', ticker: 'GC=F', sector: 'Metals', d1: 0.34, w1: 1.56, m1: 5.21 },
        { name: 'Silver', d1: '0.23' },
      ],
    });
    expect(rows.map((r) => r.name)).toEqual(['Gold']);
    expect(rows[0].d1).toBe(0.34);
    expect(rows[0].w1).toBe(1.56);
    expect(rows[0].m1).toBe(5.21);
    expect(() => rows.map((r) => r.name.slice(0, 3))).not.toThrow();
    expect(() => rows.map((r) => r.d1.toFixed(2))).not.toThrow();
    expect(rows[0].name.slice(0, 3)).toBe('Gol');
    expect(rows[0].d1.toFixed(2)).toBe('0.34');

    expect(() => sectorHeatmapColumns({ isLive: true })).not.toThrow();
    expect(() => sectorHeatmapColumns({ columns: { isLive: true } })).not.toThrow();
    expect(() => sectorHeatmapColumns({ columns: [true, { isLive: true }, '1d%'] })).not.toThrow();
    expect(sectorHeatmapColumns({ columns: [true, { isLive: true }, '1d%', '1w%'] })).toEqual(['1d%', '1w%']);
    expect(() => sectorHeatmapColumns({ columns: ['1d%', '1w%', '1m%'] }).map((c) => c.slice(0, 2))).not.toThrow();
  });
});

describe('commodities leftover empty-capable tiles (prices)', () => {
  it('dashboard does not hardcode leftover bag existence on prices', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/prices:\s*!!priceDashboardData/);
    expect(dash).toMatch(/prices:\s*hasPriceDashboardRows\(priceDashboardData\)/);
    expect(dash).toMatch(/priceDashboardGroups\(priceDashboardData\)/);
    const market = src('markets/commodities/CommoditiesMarket.jsx');
    expect(market).not.toMatch(/priceDashboardData:\s*d\.priceDashboardData \|\| mapped\.priceDashboardData/);
    expect(market).toMatch(/hasPriceDashboardRows\(d\.priceDashboardData\)/);
    const heat = src('markets/commodities/components/PriceDashboard.jsx');
    expect(heat).toMatch(/priceDashboardGroups\(priceDashboardData\)/);
    expect(heat).not.toMatch(/priceDashboardData\.forEach\(s =>/);
    const charts = src('markets/commodities/components/PriceCharts.jsx');
    expect(charts).toMatch(/priceDashboardGroups\(priceDashboardData\)/);
    expect(charts).not.toMatch(/const sectors = priceDashboardData \|\| \[\]/);
  });

  it('hasPriceDashboardRows is false for empty / leftover isLive bags', () => {
    expect(hasPriceDashboardRows()).toBe(false);
    expect(hasPriceDashboardRows(null)).toBe(false);
    expect(hasPriceDashboardRows({})).toBe(false);
    expect(hasPriceDashboardRows({ isLive: true })).toBe(false);
    expect(hasPriceDashboardRows({ lastUpdated: '2024-01' })).toBe(false);
    expect(hasPriceDashboardRows({ dates: ['2024-01'] })).toBe(false);
    expect(hasPriceDashboardRows([])).toBe(false);
    expect(hasPriceDashboardRows({ commodities: [{ isLive: true }] })).toBe(false);
    expect(hasPriceDashboardRows({ isLive: true, commodities: [{ isLive: true }] })).toBe(false);
    expect(hasPriceDashboardRows([{ isLive: true }])).toBe(false);
    expect(hasPriceDashboardRows([{ sector: 'Energy', commodities: [{ isLive: true }] }])).toBe(false);
    expect(hasPriceDashboardRows([{
      sector: 'Energy',
      commodities: [{ name: 'Gold', price: true, change1d: '0.34' }],
    }])).toBe(false);
    expect(hasPriceDashboardRows([{
      commodities: [{ name: 'Gold', price: 2345.6 }],
    }])).toBe(false);
    expect(hasPriceDashboardRows([{
      sector: 'Energy',
      commodities: [{ price: 82.14 }],
    }])).toBe(false);
    expect(hasPriceDashboardRows({
      isLive: true,
      lastUpdated: '2024-01',
      dates: ['2024-01'],
      commodities: { isLive: true },
    })).toBe(false);
  });

  it('hasPriceDashboardRows is true when a painted price exists', () => {
    expect(hasPriceDashboardRows([{
      sector: 'Energy',
      commodities: [{ name: 'WTI Crude', price: 82.14 }],
    }])).toBe(true);
    expect(hasPriceDashboardRows([
      { isLive: true },
      { sector: 'Energy', commodities: [{ isLive: true }, { name: 'Gold', price: true }] },
      { sector: 'Metals', commodities: [{ name: 'Gold', ticker: 'GC=F', price: 2345.6 }] },
    ])).toBe(true);
  });

  it('priceDashboardGroups skips leftover siblings so remount does not crash', () => {
    expect(() => priceDashboardGroups({ isLive: true })).not.toThrow();
    expect(() => priceDashboardGroups({ commodities: { isLive: true } })).not.toThrow();
    expect(() => priceDashboardGroups({ commodities: true })).not.toThrow();
    expect(() => priceDashboardGroups([null, { isLive: true }, 'x'])).not.toThrow();
    expect(priceDashboardGroups([
      { isLive: true },
      { sector: 'Energy', commodities: [{ name: 'Gold', price: true, change1d: '1.2', sparkline: { isLive: true } }] },
      { sector: 'Metals', commodities: [{ name: 'Gold', ticker: 'GC=F', price: 2345.6, change1d: 0.34, change1w: 1.56, change1m: 5.21, sparkline: [2300, 2320, 2345.6] }] },
    ]).map((g) => g.sector)).toEqual(['Metals']);
    const groups = priceDashboardGroups([
      { isLive: true },
      { sector: 'Energy', commodities: [
        { isLive: true },
        { name: 'WTI Crude', ticker: 'CL=F', price: 82.14, change1d: 0.82, sparkline: [80, 81, 82.14] },
        { name: 'Silver', price: '28.45' },
      ] },
    ]);
    expect(groups.map((g) => g.sector)).toEqual(['Energy']);
    expect(groups[0].commodities.map((c) => c.name)).toEqual(['WTI Crude']);
    expect(groups[0].commodities[0].price).toBe(82.14);
    expect(groups[0].commodities[0].change1d).toBe(0.82);
    expect(() => groups.map((g) => g.sector.slice(0, 3))).not.toThrow();
    expect(() => groups.flatMap((g) => g.commodities).map((c) => c.price.toFixed(2))).not.toThrow();
    expect(() => groups.flatMap((g) => g.commodities).map((c) => c.change1d.toFixed(2))).not.toThrow();
    expect(() => groups.flatMap((g) => g.commodities).map((c) => Math.min(...c.sparkline))).not.toThrow();
    expect(groups[0].commodities[0].price.toFixed(2)).toBe('82.14');
    expect(groups[0].commodities[0].change1d.toFixed(2)).toBe('0.82');

    expect(() => priceDashboardCommodities({ isLive: true })).not.toThrow();
    expect(() => priceDashboardCommodities([null, { isLive: true }, 'x'])).not.toThrow();
    expect(priceDashboardCommodities([
      { isLive: true },
      { name: 'Gold', price: true },
      { name: 'WTI Crude', price: 82.14, change1d: true, sparkline: { isLive: true } },
    ]).map((c) => c.name)).toEqual(['WTI Crude']);
    expect(() => priceDashboardGroups([{ sector: 'Energy', commodities: [{ name: 'Gold', price: 10, sparkline: { isLive: true } }] }]).flatMap((g) => g.commodities).map((c) => (c.sparkline || []).map((v) => v.toFixed(2)))).not.toThrow();
  });
});

describe('commodities leftover empty-capable tiles (sidebar)', () => {
  it('dashboard does not hardcode leftover bag existence on sidebar', () => {
    const dash = src('markets/commodities/components/CommoditiesDashboard.jsx');
    expect(dash).not.toMatch(/sidebar:\s*!!\(cotData \|\| allCommodities\.length \|\| dbcEtf\)/);
    expect(dash).toMatch(/sidebar:\s*hasCommoditiesSidebarContent\(\{ cotData, priceDashboardData, dbcEtf \}\)/);
    expect(dash).toMatch(/sidebarCotRows\(cotData\)/);
    expect(dash).not.toMatch(/cotData\.flatMap\(s => s\.commodities \|\| \[\]\)/);
    const market = src('markets/commodities/CommoditiesMarket.jsx');
    expect(market).not.toMatch(/dbcEtf:\s*d\.dbcEtf \|\| mapped\.dbcEtf/);
    expect(market).toMatch(/hasDbcEtfQuote\(d\.dbcEtf\)/);
    expect(market).toMatch(/hasCotPositioning\(cotFromSentiment\)/);
  });

  it('hasCommoditiesSidebarContent is false for empty / leftover isLive bags', () => {
    expect(hasCommoditiesSidebarContent()).toBe(false);
    expect(hasCommoditiesSidebarContent(null)).toBe(false);
    expect(hasCommoditiesSidebarContent({})).toBe(false);
    expect(hasCommoditiesSidebarContent({ cotData: { isLive: true } })).toBe(false);
    expect(hasCommoditiesSidebarContent({ dbcEtf: { isLive: true } })).toBe(false);
    expect(hasCommoditiesSidebarContent({ dbcEtf: {} })).toBe(false);
    expect(hasCommoditiesSidebarContent({ dbcEtf: { price: true } })).toBe(false);
    expect(hasCommoditiesSidebarContent({ dbcEtf: { price: '22.14' } })).toBe(false);
    expect(hasCommoditiesSidebarContent({ cotData: { commodities: { isLive: true } } })).toBe(false);
    expect(hasCommoditiesSidebarContent({ cotData: { commodities: [{ isLive: true }] } })).toBe(false);
    expect(hasCommoditiesSidebarContent({
      cotData: { isLive: true, commodities: [{ name: 'Gold', latest: { isLive: true } }] },
      dbcEtf: { isLive: true, lastUpdated: '2024-01' },
      priceDashboardData: [{ isLive: true }],
    })).toBe(false);
    expect(hasCommoditiesSidebarContent({
      priceDashboardData: [{ sector: 'Energy', commodities: [{ name: 'Gold', price: true }] }],
    })).toBe(false);
  });

  it('hasCommoditiesSidebarContent is true when a painted sidebar metric exists', () => {
    expect(hasCommoditiesSidebarContent({ dbcEtf: { price: 22.14 } })).toBe(true);
    expect(hasCommoditiesSidebarContent({
      cotData: { commodities: [{ name: 'Gold', netPct: 12.4 }] },
    })).toBe(true);
    expect(hasCommoditiesSidebarContent({
      priceDashboardData: [{ sector: 'Energy', commodities: [{ name: 'WTI Crude', price: 82.14 }] }],
    })).toBe(true);
    expect(hasCommoditiesSidebarContent({
      isLive: true,
      cotData: { isLive: true },
      dbcEtf: { isLive: true, price: 22.14 },
    })).toBe(true);
  });

  it('sidebarCotRows skips leftover siblings so remount does not crash', () => {
    expect(() => sidebarCotRows({ isLive: true })).not.toThrow();
    expect(() => sidebarCotRows({ commodities: { isLive: true } })).not.toThrow();
    expect(() => sidebarCotRows({ commodities: true })).not.toThrow();
    expect(() => sidebarCotRows([null, { isLive: true }, { commodities: { isLive: true } }])).not.toThrow();
    expect(sidebarCotRows({ commodities: { isLive: true } })).toEqual([]);
    expect(sidebarCotRows({
      commodities: [
        { isLive: true },
        { name: 'Gold', latest: { isLive: true }, netPct: true },
        { name: 'WTI Crude Oil', netPct: 12.4, latest: { noncommNet: 185000 } },
      ],
    }).map((r) => r.name)).toEqual(['WTI Crude Oil']);
    const rows = sidebarCotRows({
      isLive: true,
      commodities: [
        { isLive: true },
        { name: 'Gold', netPct: 8.2, latest: { noncommNet: 120000 } },
        { name: 'Silver', netPosition: -45000 },
        { name: 'Copper', latest: { noncommNet: '12' } },
      ],
    });
    expect(rows.map((r) => r.name)).toEqual(['Gold', 'Silver']);
    expect(rows[0].netPct).toBe(8.2);
    expect(rows[1].netPosition).toBe(-45000);
    expect(() => rows.map((r) => r.name.slice(0, 3))).not.toThrow();
    expect(() => rows.map((r) => (r.netPct != null ? r.netPct.toFixed(1) : r.netPosition.toLocaleString()))).not.toThrow();
    expect(rows[0].netPct.toFixed(1)).toBe('8.2');
    expect(hasDbcEtfQuote({ isLive: true })).toBe(false);
    expect(hasDbcEtfQuote({ price: 22.14 })).toBe(true);
  });
});

describe('fx leftover empty-capable tiles (treasury-tic remount)', () => {
  it('panel does not slice leftover isLive latest bags', () => {
    const panel = src('markets/fx/components/TreasuryTicPanel.jsx');
    expect(panel).not.toMatch(/data\.latest \|\| \[\]/);
    expect(panel).toMatch(/ticLatestRows\(ticCtx\?\.data\)/);
  });

  it('ticLatestRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => fxTicLatestRows({ isLive: true })).not.toThrow();
    expect(() => fxTicLatestRows({ latest: { isLive: true } })).not.toThrow();
    expect(() => fxTicLatestRows({ latest: true })).not.toThrow();
    expect(fxTicLatestRows({ isLive: true })).toEqual([]);
    expect(fxTicLatestRows({ latest: { isLive: true } })).toEqual([]);
    expect(fxTicLatestRows({ latest: true })).toEqual([]);
    expect(() => fxTicLatestRows({ latest: { isLive: true } }).slice(0, 12)).not.toThrow();
    expect(() => fxTicLatestRows({ latest: { isLive: true } }).reduce((s, r) => s + (r.holdingsB || 0), 0)).not.toThrow();
    const rows = fxTicLatestRows({
      isLive: true,
      latest: [
        { isLive: true },
        { country: 'Japan', holdingsB: 1100 },
      ],
    });
    expect(rows.map((r) => r.country)).toEqual([undefined, 'Japan']);
    expect(() => rows.slice(0, 12).map((r) => r.holdingsB)).not.toThrow();
  });
});

describe('credit leftover empty-capable tiles (treasury-credit-holdings remount)', () => {
  it('panel does not slice leftover isLive latest bags', () => {
    const panel = src('markets/credit/components/TreasuryCreditHoldingsPanel.jsx');
    expect(panel).not.toMatch(/data\.latest \|\| \[\]/);
    expect(panel).toMatch(/ticLatestRows\(ticCtx\?\.data\)/);
  });

  it('ticLatestRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => creditTicLatestRows({ isLive: true })).not.toThrow();
    expect(() => creditTicLatestRows({ latest: { isLive: true } })).not.toThrow();
    expect(() => creditTicLatestRows({ latest: true })).not.toThrow();
    expect(creditTicLatestRows({ isLive: true })).toEqual([]);
    expect(creditTicLatestRows({ latest: { isLive: true } })).toEqual([]);
    expect(creditTicLatestRows({ latest: true })).toEqual([]);
    expect(() => creditTicLatestRows({ latest: { isLive: true } }).slice(0, 10)).not.toThrow();
    const rows = creditTicLatestRows({
      isLive: true,
      latest: [
        { isLive: true },
        { country: 'Japan', holdingsB: 1100 },
      ],
    });
    expect(rows.map((r) => r.country)).toEqual([undefined, 'Japan']);
    expect(() => rows.slice(0, 10).map((r) => r.holdingsB)).not.toThrow();
  });
});

describe('insurance leftover empty-capable tiles (ins-penetration remount)', () => {
  it('dashboard does not filter leftover isLive countries bags', () => {
    const dash = src('markets/insurance/components/InsuranceDashboard.jsx');
    expect(dash).not.toMatch(/wbCtx\?\.data\?\.countries \|\| \[\]/);
    expect(dash).toMatch(/wbCountryRows\(wbCtx\?\.data\)/);
  });

  it('wbCountryRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => wbCountryRows({ isLive: true })).not.toThrow();
    expect(() => wbCountryRows({ countries: { isLive: true } })).not.toThrow();
    expect(() => wbCountryRows({ countries: true })).not.toThrow();
    expect(wbCountryRows({ isLive: true })).toEqual([]);
    expect(wbCountryRows({ countries: { isLive: true } })).toEqual([]);
    expect(wbCountryRows({ countries: true })).toEqual([]);
    expect(() => wbCountryRows({ countries: { isLive: true } }).filter((c) => c.lifeInsPctGdp != null)).not.toThrow();
    const rows = wbCountryRows({
      isLive: true,
      countries: [
        { isLive: true },
        { code: 'US', lifeInsPctGdp: 1.2 },
      ],
    });
    expect(rows.map((c) => c.code)).toEqual([undefined, 'US']);
    expect(() => rows.filter((c) => c.lifeInsPctGdp != null || c.nonLifeInsPctGdp != null)).not.toThrow();
  });
});

describe('credit leftover empty-capable tiles (wb-debt remount)', () => {
  it('panel does not spread leftover isLive countries bags', () => {
    const panel = src('markets/credit/components/WorldBankDebtPanel.jsx');
    expect(panel).not.toMatch(/data\.countries \|\| \[\]/);
    expect(panel).toMatch(/wbDebtCountryRows\(data\)/);
  });

  it('wbDebtCountryRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => wbDebtCountryRows({ isLive: true })).not.toThrow();
    expect(() => wbDebtCountryRows({ countries: { isLive: true } })).not.toThrow();
    expect(() => wbDebtCountryRows({ countries: true })).not.toThrow();
    expect(wbDebtCountryRows({ isLive: true })).toEqual([]);
    expect(wbDebtCountryRows({ countries: { isLive: true } })).toEqual([]);
    expect(wbDebtCountryRows({ countries: true })).toEqual([]);
    expect(() => [...wbDebtCountryRows({ countries: { isLive: true } })].sort((a, b) => (b.gdpGrowth || 0) - (a.gdpGrowth || 0))).not.toThrow();
    const rows = wbDebtCountryRows({
      isLive: true,
      countries: [
        { isLive: true },
        { code: 'JP', gdpGrowth: 1.1 },
      ],
    });
    expect(rows.map((c) => c.code)).toEqual([undefined, 'JP']);
    expect(() => rows.slice(0, 10).map((c) => c.gdpGrowth)).not.toThrow();
  });
});

describe('derivatives leftover empty-capable tiles (ecb-derivatives remount)', () => {
  it('panel does not map leftover isLive m3Growth bags', () => {
    const panel = src('markets/derivatives/components/EcbDerivativesPanel.jsx');
    expect(panel).not.toMatch(/data\.m3Growth \|\| \[\]/);
    expect(panel).not.toMatch(/data\.hicpDetail \|\| \[\]/);
    expect(panel).toMatch(/ecbM3GrowthRows\(data\)/);
    expect(panel).toMatch(/ecbHicpDetailRows\(data\)/);
  });

  it('ecbM3GrowthRows / ecbHicpDetailRows skip leftover isLive bags so remount does not crash', () => {
    expect(() => derivEcbM3GrowthRows({ isLive: true })).not.toThrow();
    expect(() => derivEcbM3GrowthRows({ m3Growth: { isLive: true } })).not.toThrow();
    expect(() => derivEcbM3GrowthRows({ m3Growth: true })).not.toThrow();
    expect(derivEcbM3GrowthRows({ isLive: true })).toEqual([]);
    expect(derivEcbM3GrowthRows({ m3Growth: { isLive: true } })).toEqual([]);
    expect(derivEcbM3GrowthRows({ m3Growth: true })).toEqual([]);
    expect(() => derivEcbM3GrowthRows({ m3Growth: { isLive: true } }).map((o) => o.period)).not.toThrow();
    const m3 = derivEcbM3GrowthRows({
      isLive: true,
      m3Growth: [
        { isLive: true },
        { period: '2024-01', value: 3.1 },
      ],
    });
    expect(m3.map((p) => p.period)).toEqual([undefined, '2024-01']);
    expect(() => m3.map((o) => o.period)).not.toThrow();

    expect(() => derivEcbHicpDetailRows({ isLive: true })).not.toThrow();
    expect(() => derivEcbHicpDetailRows({ hicpDetail: { isLive: true } })).not.toThrow();
    expect(() => derivEcbHicpDetailRows({ hicpDetail: true })).not.toThrow();
    expect(derivEcbHicpDetailRows({ isLive: true })).toEqual([]);
    expect(derivEcbHicpDetailRows({ hicpDetail: { isLive: true } })).toEqual([]);
    expect(derivEcbHicpDetailRows({ hicpDetail: true })).toEqual([]);
    expect(() => derivEcbHicpDetailRows({ hicpDetail: { isLive: true } }).map((o) => o.period)).not.toThrow();
    const hicp = derivEcbHicpDetailRows({
      isLive: true,
      hicpDetail: [
        { isLive: true },
        { period: '2024-01', value: 2.4 },
      ],
    });
    expect(hicp.map((p) => p.period)).toEqual([undefined, '2024-01']);
    expect(() => [...m3.map((o) => o.period), ...hicp.map((o) => o.period)]).not.toThrow();
  });
});

describe('crypto leftover empty-capable tiles (stablecoin-composition)', () => {
  it('dashboard does not hardcode leftover bag existence on stablecoin-composition', () => {
    const dash = src('markets/crypto/components/CryptoDashboard.jsx');
    expect(dash).not.toMatch(/'stablecoin-composition':\s*stablecoinMcap != null/);
    expect(dash).toMatch(/'stablecoin-composition':\s*hasStablecoinComposition\(stablecoinMcap\)/);
    const panel = src('markets/crypto/components/StablecoinCompositionPanel.jsx');
    expect(panel).toMatch(/stablecoinMcapValue\(data\.stablecoinMcap\)/);
  });

  it('hasStablecoinComposition is false for empty / leftover isLive bags', () => {
    expect(hasStablecoinComposition()).toBe(false);
    expect(hasStablecoinComposition(null)).toBe(false);
    expect(hasStablecoinComposition({ isLive: true })).toBe(false);
    expect(hasStablecoinComposition(NaN)).toBe(false);
    expect(hasStablecoinComposition('1.6e11')).toBe(false);
    expect(hasStablecoinComposition({ isLive: true }, { isLive: true })).toBe(false);
    expect(hasStablecoinComposition({ isLive: true }, [{ isLive: true }])).toBe(false);
  });

  it('hasStablecoinComposition is true when a painted mcap or composition row exists', () => {
    expect(hasStablecoinComposition(1.6e11)).toBe(true);
    expect(hasStablecoinComposition(0)).toBe(true);
    expect(hasStablecoinComposition(null, [{ symbol: 'USDT', pct: 50 }])).toBe(true);
    expect(hasStablecoinComposition({ isLive: true }, [{ name: 'USDC', mcapB: 40 }])).toBe(true);
  });

  it('stablecoinMcapValue skips leftover isLive bags so remount does not paint NaN', () => {
    expect(stablecoinMcapValue({ isLive: true })).toBe(null);
    expect(stablecoinMcapValue(true)).toBe(null);
    expect(stablecoinMcapValue(NaN)).toBe(null);
    expect(stablecoinMcapValue('1.6e11')).toBe(null);
    expect(stablecoinMcapValue(1.6e11)).toBe(1.6e11);
    const leftover = { isLive: true };
    const v = stablecoinMcapValue(leftover);
    expect(() => (v != null ? (v / 1e9).toFixed(1) : '—')).not.toThrow();
    expect(v != null ? `$${(v / 1e9).toFixed(1)}B` : '—').toBe('—');
  });
});

describe('crypto leftover empty-capable tiles (exchanges remount)', () => {
  it('dashboard does not some leftover isLive exchange bags', () => {
    const dash = src('markets/crypto/components/CryptoDashboard.jsx');
    expect(dash).not.toMatch(/\(topExchanges \|\| \[\]\)\.some/);
    expect(dash).not.toMatch(/\(topExchanges \|\| \[\]\)\.reduce/);
    expect(dash).not.toMatch(/\(topExchanges \|\| \[\]\)\.length/);
    expect(dash).toMatch(/exchangeRows\(topExchanges\)/);
    const market = src('markets/crypto/CryptoMarket.jsx');
    expect(market).not.toMatch(/d\.topExchanges \|\| \[\]/);
    expect(market).toMatch(/exchangeRows\(d\.topExchanges\)/);
  });

  it('exchangeRows skips leftover isLive bags so remount does not crash', () => {
    expect(() => exchangeRows({ isLive: true })).not.toThrow();
    expect(() => exchangeRows(true)).not.toThrow();
    expect(exchangeRows({ isLive: true })).toEqual([]);
    expect(exchangeRows(true)).toEqual([]);
    expect(exchangeRows(null)).toEqual([]);
    expect(() => exchangeRows({ isLive: true }).some((e) => Number(e.volume24h) > 0)).not.toThrow();
    expect(() => exchangeRows({ isLive: true }).reduce((s, e) => s + (Number(e.volume24h) || 0), 0)).not.toThrow();
    expect(() => exchangeRows({ isLive: true }).slice(0, 10)).not.toThrow();
    const rows = exchangeRows([
      { isLive: true },
      { name: 'Binance', volume24h: 1234 },
    ]);
    expect(rows.map((e) => e.name)).toEqual([undefined, 'Binance']);
    expect(() => rows.slice(0, 10).map((e) => e.volume24h)).not.toThrow();
    expect(exchangeRows({ isLive: true }).some((e) => Number(e.volume24h) > 0)).toBe(false);
    expect(exchangeRows([{ name: 'Binance', volume24h: null }]).some((e) => Number(e.volume24h) > 0)).toBe(false);
    expect(exchangeRows([{ name: 'Binance', volume24h: 1234 }]).some((e) => Number(e.volume24h) > 0)).toBe(true);
  });
});

describe('credit leftover empty-capable tiles (bank-sector remount)', () => {
  it('dashboard does not slice leftover isLive FDIC bags', () => {
    const dash = src('markets/credit/components/CreditDashboard.jsx');
    expect(dash).not.toMatch(/fdicCtx\?\.data\?\.failures \|\| \[\]/);
    expect(dash).not.toMatch(/fdicCtx\?\.data\?\.aggregate \|\| \[\]/);
    expect(dash).toMatch(/fdicFailureRows\(fdicCtx\?\.data\)/);
    expect(dash).toMatch(/fdicAggregateRows\(fdicCtx\?\.data\)/);
  });

  it('fdicFailureRows / fdicAggregateRows skip leftover isLive bags so remount does not crash', () => {
    expect(() => fdicFailureRows({ isLive: true })).not.toThrow();
    expect(() => fdicFailureRows({ failures: { isLive: true } })).not.toThrow();
    expect(() => fdicFailureRows({ failures: true })).not.toThrow();
    expect(fdicFailureRows({ isLive: true })).toEqual([]);
    expect(fdicFailureRows({ failures: { isLive: true } })).toEqual([]);
    expect(fdicFailureRows({ failures: true })).toEqual([]);
    expect(() => fdicFailureRows({ failures: { isLive: true } }).slice(0, 6)).not.toThrow();
    expect(() => fdicFailureRows({ failures: { isLive: true } }).filter((f) => String(f.date || '').includes('2026'))).not.toThrow();
    expect(() => fdicAggregateRows({ isLive: true })).not.toThrow();
    expect(() => fdicAggregateRows({ aggregate: { isLive: true } })).not.toThrow();
    expect(fdicAggregateRows({ aggregate: { isLive: true } })).toEqual([]);
    expect(() => fdicAggregateRows({ aggregate: { isLive: true } }).slice(0, 4)).not.toThrow();
    const rows = fdicFailureRows({
      isLive: true,
      failures: [
        { isLive: true },
        { name: 'Example Bank', date: '2024-03-01', assets: 2000 },
      ],
    });
    expect(rows.map((f) => f.name)).toEqual([undefined, 'Example Bank']);
    expect(() => rows.slice(0, 6).map((f) => f.assets)).not.toThrow();
    const agg = fdicAggregateRows({
      isLive: true,
      aggregate: [
        { isLive: true },
        { year: 2024, depositsB: 19000 },
      ],
    });
    expect(agg.map((y) => y.year)).toEqual([undefined, 2024]);
    expect(() => agg.slice(0, 4).map((y) => y.depositsB)).not.toThrow();
  });
});
