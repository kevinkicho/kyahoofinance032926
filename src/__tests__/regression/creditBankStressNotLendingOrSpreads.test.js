/**
 * Regression: credit bank-stress must not go green from unused
 * SLOOS lendingStandards or sibling spreadData when FDIC rows
 * are empty. The tile paints FDIC deposits/failures (+ optional
 * HY / default / CP). lendingStandards is never rendered.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const LENDING = { dates: ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'], values: [12.4, 14.1, 15.8, 16.2] };
const SPREADS = { current: { igSpread: 95, hySpread: 320 }, history: { IG: [90, 95], HY: [300, 320] } };
const FDIC_AGG = [
  { date: '2026-Q1', depositsB: 18200, assetsB: 24100 },
  { date: '2025-Q4', depositsB: 17950, assetsB: 23800 },
  { date: '2025-Q3', depositsB: 17710, assetsB: 23550 },
];

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

describe('credit bank-stress leftover lendingStandards/spreadData wiring', () => {
  it('placeholders and field map do not point at lendingStandards', () => {
    const slots = slotPaths('credit', 'bank-stress');
    expect(slots.some((p) => String(p).includes('lendingStandards'))).toBe(false);
    expect(slots.some((p) => p === 'aggregate' || p === 'failures' || p === 'fdic')).toBe(true);

    const spec = specPaths('credit', 'bank-stress');
    expect(spec.includes('lendingStandards')).toBe(false);
    expect(spec.includes('aggregate') || spec.includes('failures')).toBe(true);
    expect(spec.includes('fdic')).toBe(true);
  });

  it('lendingStandards / spreadData do not make bank-stress L1 fetchOk', () => {
    const credit = {
      data: { lendingStandards: LENDING, spreadData: SPREADS, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const fdic = { data: {}, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'credit',
      panelId: 'bank-stress',
      marketCtx: credit,
      allMarkets: { credit, fdic },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('fdic.aggregate still fills L1', () => {
    const credit = {
      data: { lendingStandards: LENDING, spreadData: SPREADS, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const fdic = { data: { aggregate: FDIC_AGG, isLive: true }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'credit',
      panelId: 'bank-stress',
      marketCtx: credit,
      allMarkets: { credit, fdic },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
