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
} from '../../markets/fx/components/FXLiveChips.js';

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
    expect(dash).not.toMatch(/shiller:\s*!!isLive/);
    expect(dash).not.toMatch(/reitperf:\s*!!isLive/);
    expect(dash).not.toMatch(/caprate:\s*!!isLive/);
    expect(dash).not.toMatch(/'afford-stack':\s*!!isLive/);
    expect(dash).not.toMatch(/supply:\s*!!isLive/);
    expect(dash).not.toMatch(/'fhfa-hpi':\s*!!isLive/);
    expect(dash).toMatch(/shiller:\s*hasShillerSeries/);
    expect(dash).toMatch(/reitperf:\s*hasReitPerfRows/);
    expect(dash).toMatch(/caprate:\s*hasCapRateRows/);
    expect(dash).toMatch(/'afford-stack':\s*hasAffordabilityStackMetrics/);
    expect(dash).toMatch(/supply:\s*hasSupplyMetrics/);
    expect(dash).toMatch(/'fhfa-hpi':\s*hasFhfaHpiSeries/);
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
