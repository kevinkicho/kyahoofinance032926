/**
 * Regression: VIX 1Y health must not go green from term structure,
 * enrichment, or percentile when fredVixHistory is empty.
 * The tile only paints the 1Y FRED history chart.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const TERM = { dates: ['1M', '3M', '6M'], values: [14.2, 16.1, 17.4] };
const ENRICH = { percentile: 42, regime: 'normal' };
const PERCENTILE = 42;
const HISTORY = {
  dates: ['2025-08-15', '2026-02-15', '2026-08-14'],
  values: [15.2, 18.4, 14.8],
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

describe('derivatives vix1y leftover term/enrichment wiring', () => {
  it('placeholders and field map do not point at term/enrichment/percentile', () => {
    const slots = slotPaths('derivatives', 'vix1y');
    expect(slots.some((p) => String(p).includes('fredVixHistory'))).toBe(true);
    expect(slots.some((p) => ['vixTermStructure', 'vixEnrichment', 'vixPercentile'].includes(p) || String(p).includes('vixTermStructure'))).toBe(false);

    const spec = specPaths('derivatives', 'vix1y');
    expect(spec.includes('fredVixHistory')).toBe(true);
    expect(spec.includes('vixTermStructure') || spec.includes('vixEnrichment') || spec.includes('vixPercentile')).toBe(false);
  });

  it('term structure / enrichment do not make VIX 1Y L1 fetchOk', () => {
    const derivatives = {
      data: {
        vixTermStructure: TERM,
        vixEnrichment: ENRICH,
        vixPercentile: PERCENTILE,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'derivatives',
      panelId: 'vix1y',
      marketCtx: derivatives,
      allMarkets: { derivatives },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('fredVixHistory still fills L1', () => {
    const derivatives = {
      data: {
        vixTermStructure: TERM,
        vixEnrichment: ENRICH,
        fredVixHistory: HISTORY,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'derivatives',
      panelId: 'vix1y',
      marketCtx: derivatives,
      allMarkets: { derivatives },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
