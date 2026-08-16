/**
 * Regression: insurance Cat Bond Spreads must not go green from
 * catBondProxy when catBondSpreads is empty. The tile only paints
 * official FRED catBondSpreads rows. catBondProxy is an unused Yahoo ILS leftover.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const PROXY = { ticker: 'PSP', price: 108.5, changePct: 0.42 };
const SPREADS = [
  { name: 'ICE BofA US HY OAS', seriesId: 'BAMLH0A0HYM2', group: 'Credit', spreadBps: 312, unit: 'bps' },
  { name: '10Y Treasury', seriesId: 'DGS10', group: 'Rates', spread: 4.21, unit: 'pct' },
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

describe('insurance catbonds leftover catBondProxy wiring', () => {
  it('placeholders and field map bind catBondSpreads only', () => {
    const slots = slotPaths('insurance', 'catbonds');
    expect(slots.some((p) => String(p).includes('catBondSpreads'))).toBe(true);
    expect(slots.some((p) => String(p).includes('catBondProxy'))).toBe(false);

    const spec = specPaths('insurance', 'catbonds');
    expect(spec.includes('catBondSpreads')).toBe(true);
    expect(spec.includes('catBondProxy')).toBe(false);
  });

  it('catBondProxy does not make catbonds L1 fetchOk', () => {
    const insurance = {
      data: { catBondProxy: PROXY, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'catbonds',
      marketCtx: insurance,
      allMarkets: { insurance },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('catBondSpreads still fills L1 without catBondProxy', () => {
    const insurance = {
      data: {
        catBondSpreads: SPREADS,
        fetchedOn: '2026-08-16',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'catbonds',
      marketCtx: insurance,
      allMarkets: { insurance },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
