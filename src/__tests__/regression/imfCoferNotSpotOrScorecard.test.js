/**
 * Regression: IMF COFER health must not go green from FX spots / DXY
 * or from Global Macro scorecard/debt/WEO when reserve shares are empty.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { hasCoferRows } from '../../markets/fx/components/ImfCoferPanel.jsx';

const SPOT = { USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150 };
const DXY = { dates: ['2026-08-01', '2026-08-14'], values: [104.2, 103.8] };
const SCORECARD = [{ code: 'US', gdp: 2.1, inflation: 2.4 }];
const COFER = {
  USD: { value: 57.8, asOf: '2026-Q1' },
  EUR: { value: 20.1, asOf: '2026-Q1' },
  JPY: { value: 5.8, asOf: '2026-Q1' },
};

function fxMarkets({ imfReserves = null, cofer = null } = {}) {
  const fx = {
    data: { spotRates: SPOT, dxyHistory: DXY, imfReserves, fetchedOn: '2026-08-15' },
    isLoading: false,
    isLive: true,
  };
  const imf = { data: cofer ? { cofer } : {}, isLoading: false };
  return { fx, imf };
}

function macroMarkets({ cofer = null } = {}) {
  const globalMacro = {
    data: { scorecardData: SCORECARD, debtData: { US: 120 }, imfWEO: { US: {} }, fetchedOn: '2026-08-15' },
    isLoading: false,
    isLive: true,
  };
  const imf = { data: cofer ? { cofer } : {}, isLoading: false };
  return { globalMacro, imf };
}

describe('fx imf-cofer leftover spot/DXY wiring', () => {
  it('placeholders do not point at spotRates or dxyHistory', () => {
    const slots = getPanelPlaceholders('fx', 'imf-cofer') || [];
    const paths = slots.flatMap((s) => [s.path, ...(s.anyOf || [])]).filter(Boolean);
    expect(paths.some((p) => p === 'spotRates' || p === 'dxyHistory' || String(p).includes('spotRates') || String(p).includes('dxyHistory'))).toBe(false);
  });

  it('FX spots and DXY do not make COFER L1 fetchOk', () => {
    const markets = fxMarkets();
    const l1 = evaluatePanelData({
      marketId: 'fx',
      panelId: 'imf-cofer',
      marketCtx: markets.fx,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('imfReserves still fills COFER L1', () => {
    const markets = fxMarkets({
      imfReserves: { reserves: { USD: 57.8, EUR: 20.1, JPY: 5.8 }, asOf: '2026-Q1' },
    });
    const l1 = evaluatePanelData({
      marketId: 'fx',
      panelId: 'imf-cofer',
      marketCtx: markets.fx,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});

describe('globalMacro imf-cofer leftover scorecard wiring', () => {
  it('placeholders do not point at scorecard/debt/WEO', () => {
    const slots = getPanelPlaceholders('globalMacro', 'imf-cofer') || [];
    const paths = slots.flatMap((s) => [s.path, ...(s.anyOf || [])]).filter(Boolean);
    expect(paths.some((p) => ['scorecardData', 'debtData', 'imfWEO'].includes(p))).toBe(false);
  });

  it('scorecard/debt/WEO do not make COFER L1 fetchOk', () => {
    const markets = macroMarkets();
    const l1 = evaluatePanelData({
      marketId: 'globalMacro',
      panelId: 'imf-cofer',
      marketCtx: markets.globalMacro,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('imf.cofer still fills globalMacro COFER L1', () => {
    const markets = macroMarkets({ cofer: COFER });
    const l1 = evaluatePanelData({
      marketId: 'globalMacro',
      panelId: 'imf-cofer',
      marketCtx: markets.globalMacro,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});

describe('hasCoferRows live-chip helper', () => {
  it('is false for empty / spot-only payloads', () => {
    expect(hasCoferRows(null, null)).toBe(false);
    expect(hasCoferRows({ reserves: {} }, null)).toBe(false);
  });

  it('is true when reserve shares exist', () => {
    expect(hasCoferRows({ reserves: { USD: 57.8, EUR: 20.1 } }, null)).toBe(true);
    expect(hasCoferRows(null, COFER)).toBe(true);
  });
});
