/**
 * Regression: bonds Macro Indicators must not go green from
 * fedBalanceSheetHistory when macroData / nationalDebt are empty.
 * The tile paints the US macro snapshot + optional nationalDebt.
 * Fed WALCL history is the sibling bonds:fed chart.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const FED_HISTORY = {
  dates: ['2024-01', '2025-01', '2026-01'],
  values: [7.6, 6.9, 6.7],
};
const MACRO = {
  fedBalanceSheet: 6700000,
  m2: 21800,
  unemployment: 4.2,
  gdp: 2.1,
  pce: 2.4,
};
const DEBT = 36.2e12;

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

describe('bonds macro leftover fedBalanceSheetHistory wiring', () => {
  it('placeholders and field map bind macroData / nationalDebt only', () => {
    const slots = slotPaths('bonds', 'macro');
    expect(slots.some((p) => String(p).includes('macroData') || String(p).includes('nationalDebt'))).toBe(true);
    expect(slots.some((p) => String(p).includes('fedBalanceSheetHistory'))).toBe(false);

    const spec = specPaths('bonds', 'macro');
    expect(spec.includes('macroData')).toBe(true);
    expect(spec.includes('fedBalanceSheetHistory')).toBe(false);
  });

  it('Fed balance-sheet history does not make macro L1 fetchOk', () => {
    const bonds = {
      data: { fedBalanceSheetHistory: FED_HISTORY, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'bonds',
      panelId: 'macro',
      marketCtx: bonds,
      allMarkets: { bonds },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('macroData still fills L1', () => {
    const bonds = {
      data: {
        fedBalanceSheetHistory: FED_HISTORY,
        macroData: MACRO,
        nationalDebt: DEBT,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'bonds',
      panelId: 'macro',
      marketCtx: bonds,
      allMarkets: { bonds },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
