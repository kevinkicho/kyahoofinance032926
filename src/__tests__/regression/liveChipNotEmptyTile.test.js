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
