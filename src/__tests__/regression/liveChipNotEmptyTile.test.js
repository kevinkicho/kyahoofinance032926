/**
 * Regression: live chips must not stay hardcoded true when the tile
 * paints an empty / unavailable body.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hasWbDebtRows } from '../../markets/credit/components/WorldBankDebtPanel.jsx';
import { hasTreasuryCreditHoldings } from '../../markets/credit/components/TreasuryCreditHoldingsPanel.jsx';
import { hasBisPropertyRows } from '../../markets/realEstate/components/BisPropertyPricePanel.jsx';
import { hasMetroCaseShillerRows } from '../../markets/realEstate/components/MetroCaseShillerPanel.jsx';
import { hasHudAffordabilityRows } from '../../markets/realEstate/components/HudAffordabilityPanel.jsx';
import { hasTreasuryTicRows } from '../../markets/fx/components/TreasuryTicPanel.jsx';
import { hasBeaCorporateProfitsRows } from '../../markets/equities/components/BeaCorporateProfitsPanel.jsx';
import { hasWbMarketCapRows } from '../../markets/equities/components/WorldBankMarketCapPanel.jsx';
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
  hasDelinquencyRows,
  hasTedSpreadSeries,
  hasMuniMarketSummary,
  hasBankStressContent,
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
} from '../../markets/fx/components/FXLiveChips.js';
import {
  hasSentimentSidebarContent,
  hasSentimentKeyMetrics,
  hasFsiHistory,
  hasCftcCurrencies,
  hasCrossAssetReturns,
  hasRiskDashboardContent,
  hasNewsSentimentSeries,
} from '../../markets/sentiment/components/SentimentLiveChips.js';
import {
  hasBondsKpiMetrics,
  hasBondsMetricsContent,
  hasCreditRatingsRows,
  hasTreasuryCostRates,
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
} from '../../markets/globalMacro/components/MacroLiveChips.js';
import {
  hasEqdKpiMetrics,
  hasEqdSidebarContent,
  hasEqdValuationContent,
  hasEqdEarningsQuality,
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
} from '../../markets/crypto/components/CryptoLiveChips.js';
import {
  hasDerivativesKpiMetrics,
  hasVolPremium,
  hasCftcTffRows,
  hasEcbDerivativesContent,
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

  it('hasMuniMarketSummary is true when MSRB summary exists', () => {
    expect(hasMuniMarketSummary({ summary: { tradesAll: 12000 } })).toBe(true);
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
