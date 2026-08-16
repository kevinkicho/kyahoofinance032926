/**
 * Regression: sentiment Financial Stress Index must not go green from
 * riskData when fsiHistory is empty. The tile only paints the STLFSI
 * history chart. riskData is the sibling key-metrics / risk-dashboard tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const RISK = {
  overallScore: 58,
  overallLabel: 'Neutral',
  vix: 14.8,
  hyOas: 310,
  fsi: -0.42,
  signals: [{ name: 'STLFSI', value: -0.42 }],
};
const HISTORY = {
  dates: ['2026-02-13', '2026-05-15', '2026-08-14'],
  values: [-0.31, -0.18, -0.42],
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

describe('sentiment fsi leftover riskData wiring', () => {
  it('placeholders and field map bind fsiHistory only', () => {
    const slots = slotPaths('sentiment', 'fsi');
    expect(slots.some((p) => String(p).includes('fsiHistory'))).toBe(true);
    expect(slots.some((p) => String(p).includes('riskData'))).toBe(false);

    const spec = specPaths('sentiment', 'fsi');
    expect(spec.includes('fsiHistory')).toBe(true);
    expect(spec.includes('riskData')).toBe(false);
  });

  it('riskData does not make fsi L1 fetchOk', () => {
    const sentiment = {
      data: { riskData: RISK, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'sentiment',
      panelId: 'fsi',
      marketCtx: sentiment,
      allMarkets: { sentiment },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('fsiHistory still fills L1', () => {
    const sentiment = {
      data: {
        riskData: RISK,
        fsiHistory: HISTORY,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'sentiment',
      panelId: 'fsi',
      marketCtx: sentiment,
      allMarkets: { sentiment },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});