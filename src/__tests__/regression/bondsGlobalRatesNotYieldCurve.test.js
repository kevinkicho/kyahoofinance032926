/**
 * Regression: bonds Global Central Bank Policy Rates must not go
 * green from yieldCurveData / treasuryRates when centralBankRates
 * and ECB policyRates are empty. The tile only paints FRED policy
 * rates plus an ECB MRR overlay.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const YIELD_CURVE = {
  US: { '3m': 4.21, '2y': 3.72, '10y': 4.18, '30y': 4.55 },
  DE: { '10y': 2.41 },
};
const TREASURY = { US10Y: 4.18, US2Y: 3.72, fedFunds: 4.33 };
const RATES = { US: 4.33, EU: 2.15, UK: 4.00, JP: 0.50 };
const ECB = {
  policyRates: {
    mainRefinancing: { value: 2.15, period: '2026-07' },
    depositFacility: { value: 2.00, period: '2026-07' },
  },
};

function specPaths(marketId, panelId) {
  const spec = getPanelFieldSpec(marketId, panelId);
  const out = [];
  if (!spec) return out;
  out.push(spec.field, spec.fieldPath, spec.crossMarket);
  for (const alt of spec.anyOf || []) out.push(alt.field, alt.fieldPath, alt.crossMarket);
  return out.filter(Boolean);
}

function slotPaths(marketId, panelId) {
  const slots = getPanelPlaceholders(marketId, panelId) || [];
  return slots.flatMap((s) => [s.path, s.crossMarket, ...(s.anyOf || [])]).filter(Boolean);
}

describe('bonds global-rates leftover yield-curve wiring', () => {
  it('placeholders and field map bind centralBankRates / ECB only', () => {
    const slots = slotPaths('bonds', 'global-rates');
    expect(slots.some((p) => String(p).includes('centralBankRates') || String(p).includes('policyRates'))).toBe(true);
    expect(slots.some((p) => String(p).includes('yieldCurveData') || String(p).includes('treasuryRates'))).toBe(false);

    const spec = specPaths('bonds', 'global-rates');
    expect(spec.includes('centralBankRates') || spec.includes('macroData.centralBankRates')).toBe(true);
    expect(spec.includes('yieldCurveData') || spec.includes('treasuryRates')).toBe(false);
  });

  it('yield curve / treasury rates do not make global-rates L1 fetchOk', () => {
    const bonds = {
      data: { yieldCurveData: YIELD_CURVE, treasuryRates: TREASURY, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'bonds',
      panelId: 'global-rates',
      marketCtx: bonds,
      allMarkets: { bonds },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('macroData.centralBankRates still fills L1', () => {
    const bonds = {
      data: {
        yieldCurveData: YIELD_CURVE,
        treasuryRates: TREASURY,
        macroData: { centralBankRates: RATES },
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'bonds',
      panelId: 'global-rates',
      marketCtx: bonds,
      allMarkets: { bonds },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });

  it('ECB policyRates still fill L1 when FRED rates are empty', () => {
    const bonds = {
      data: { yieldCurveData: YIELD_CURVE, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const ecb = { data: ECB, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'bonds',
      panelId: 'global-rates',
      marketCtx: bonds,
      allMarkets: { bonds, ecb },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
