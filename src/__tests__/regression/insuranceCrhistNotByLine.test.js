/**
 * Regression: insurance Industry Combined Ratio must not go green from
 * combinedRatioData / industryAvgCombinedRatio when combinedRatioHistory
 * is empty. The tile only paints the history chart. By-line ratios are
 * the sibling crline tile; industryAvg is the KPI strip.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const BY_LINE = {
  byLine: [
    { line: 'Personal Auto', ratio: 98.4 },
    { line: 'Homeowners', ratio: 102.1 },
  ],
  lines: { 'Personal Auto': [99.1, 98.4], Homeowners: [101.0, 102.1] },
  quarters: ['2025-Q4', '2026-Q1'],
};
const HISTORY = {
  quarters: ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1'],
  values: [97.2, 98.1, 99.4, 98.8, 97.6],
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

describe('insurance crhist leftover by-line / industryAvg wiring', () => {
  it('placeholders and field map bind combinedRatioHistory only', () => {
    const slots = slotPaths('insurance', 'crhist');
    expect(slots.some((p) => String(p).includes('combinedRatioHistory'))).toBe(true);
    expect(slots.some((p) => String(p).includes('combinedRatioData') || String(p).includes('industryAvgCombinedRatio'))).toBe(false);

    const spec = specPaths('insurance', 'crhist');
    expect(spec.includes('combinedRatioHistory')).toBe(true);
    expect(spec.includes('combinedRatioData') || spec.includes('industryAvgCombinedRatio')).toBe(false);
  });

  it('by-line / industry avg do not make crhist L1 fetchOk', () => {
    const insurance = {
      data: {
        combinedRatioData: BY_LINE,
        industryAvgCombinedRatio: 97.6,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'crhist',
      marketCtx: insurance,
      allMarkets: { insurance },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('combinedRatioHistory still fills L1', () => {
    const insurance = {
      data: {
        combinedRatioData: BY_LINE,
        industryAvgCombinedRatio: 97.6,
        combinedRatioHistory: HISTORY,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'crhist',
      marketCtx: insurance,
      allMarkets: { insurance },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
