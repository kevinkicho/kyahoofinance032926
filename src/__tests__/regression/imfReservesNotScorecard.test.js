/**
 * Regression: IMF reserves health must not go green from Global Macro
 * scorecard / growth / WEO when IFS reserve rows are empty.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';
import { hasReserveRows } from '../../markets/imf/ImfReserves.jsx';

const SCORECARD = [{ code: 'US', gdp: 2.1, inflation: 2.4, flag: '🇺🇸', name: 'United States' }];
const GROWTH = [{ code: 'US', gdp: 2.1 }];
const WEO = { US: { gdp: 2.1 } };
const COUNTRIES = [
  { code: 'US', flag: '🇺🇸', name: 'United States' },
  { code: 'CN', flag: '🇨🇳', name: 'China' },
];
const IFS = { US: { '2024': 243.1, '2025': 251.8 }, CN: { '2025': 3301.0 } };

function macroMarkets({ countries = null, ifsReserves = null } = {}) {
  const globalMacro = {
    data: {
      scorecardData: SCORECARD,
      growthInflationData: GROWTH,
      imfWEO: WEO,
      fetchedOn: '2026-08-15',
    },
    isLoading: false,
    isLive: true,
  };
  const imf = {
    data: {
      ...(countries ? { countries } : {}),
      ...(ifsReserves ? { ifsReserves } : {}),
    },
    isLoading: false,
  };
  return { globalMacro, imf };
}

describe('globalMacro imf-reserves leftover scorecard wiring', () => {
  it('placeholders and field map do not point at scorecard/growth/WEO', () => {
    const slots = getPanelPlaceholders('globalMacro', 'imf-reserves') || [];
    const paths = slots.flatMap((s) => [s.path, ...(s.anyOf || [])]).filter(Boolean);
    expect(paths.some((p) => ['scorecardData', 'growthInflationData', 'imfWEO'].includes(p))).toBe(false);

    const spec = getPanelFieldSpec('globalMacro', 'imf-reserves');
    const specPaths = [];
    if (spec) {
      specPaths.push(spec.field, spec.fieldPath);
      for (const alt of spec.anyOf || []) specPaths.push(alt.field, alt.fieldPath);
    }
    expect(specPaths.some((p) => ['scorecardData', 'growthInflationData', 'imfWEO'].includes(p))).toBe(false);
  });

  it('scorecard/growth/WEO do not make reserves L1 fetchOk', () => {
    const markets = macroMarkets();
    const l1 = evaluatePanelData({
      marketId: 'globalMacro',
      panelId: 'imf-reserves',
      marketCtx: markets.globalMacro,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('imf.ifsReserves still fills reserves L1', () => {
    const markets = macroMarkets({ countries: COUNTRIES, ifsReserves: IFS });
    const l1 = evaluatePanelData({
      marketId: 'globalMacro',
      panelId: 'imf-reserves',
      marketCtx: markets.globalMacro,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});

describe('hasReserveRows live-chip helper', () => {
  it('is false for empty / scorecard-only payloads', () => {
    expect(hasReserveRows(null, null)).toBe(false);
    expect(hasReserveRows(SCORECARD, null)).toBe(false);
    expect(hasReserveRows(COUNTRIES, null)).toBe(false);
  });

  it('is true when IFS reserve values exist', () => {
    expect(hasReserveRows(COUNTRIES, IFS)).toBe(true);
    expect(hasReserveRows([{ code: 'US', intlReserves: 251.8 }], null)).toBe(true);
  });
});
