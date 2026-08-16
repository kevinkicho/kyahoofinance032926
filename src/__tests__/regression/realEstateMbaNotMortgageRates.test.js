/**
 * Regression: realEstate MBA Applications must not go green from
 * mortgageRates when mbaApplications is empty. The tile only paints
 * MBA purchase/refi application indexes. mortgageRates is the sibling
 * Key Metrics tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const MORTGAGE = { rate30y: 6.58, rate15y: 5.91, asOf: '2026-08-14' };
const MBA = {
  purchase: { dates: ['2026-06', '2026-07', '2026-08'], values: [142.1, 148.4, 151.2] },
  refi: { dates: ['2026-06', '2026-07', '2026-08'], values: [88.4, 91.0, 93.6] },
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

describe('realEstate mba leftover mortgageRates wiring', () => {
  it('placeholders and field map bind mbaApplications only', () => {
    const slots = slotPaths('realEstate', 'mba');
    expect(slots.some((p) => String(p).includes('mbaApplications'))).toBe(true);
    expect(slots.some((p) => String(p).includes('mortgageRates'))).toBe(false);

    const spec = specPaths('realEstate', 'mba');
    expect(spec.includes('mbaApplications')).toBe(true);
    expect(spec.includes('mortgageRates')).toBe(false);
  });

  it('mortgage rates do not make mba L1 fetchOk', () => {
    const realEstate = {
      data: { mortgageRates: MORTGAGE, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'realEstate',
      panelId: 'mba',
      marketCtx: realEstate,
      allMarkets: { realEstate },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('mbaApplications still fills L1', () => {
    const realEstate = {
      data: {
        mortgageRates: MORTGAGE,
        mbaApplications: MBA,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'realEstate',
      panelId: 'mba',
      marketCtx: realEstate,
      allMarkets: { realEstate },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
