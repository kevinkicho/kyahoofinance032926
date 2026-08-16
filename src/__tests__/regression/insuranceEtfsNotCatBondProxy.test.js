/**
 * Regression: insurance Sector / Industry Pulse must not go green from
 * catBondProxy when sectorETF is empty. The tile only paints official
 * FRED sector/industry series. catBondProxy is the sibling catbonds tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const PROXY = { ticker: 'PSP', price: 108.5, changePct: 0.42 };
const ETF = [
  { symbol: 'SP500', name: 'S&P 500', price: 5482.1, changePct: 0.31, group: 'Equity' },
  { symbol: 'IP', name: 'Industrial Production', price: 102.4, changePct: -0.12, group: 'Activity' },
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

describe('insurance etfs leftover catBondProxy wiring', () => {
  it('placeholders and field map bind sectorETF only', () => {
    const slots = slotPaths('insurance', 'etfs');
    expect(slots.some((p) => String(p).includes('sectorETF'))).toBe(true);
    expect(slots.some((p) => String(p).includes('catBondProxy'))).toBe(false);

    const spec = specPaths('insurance', 'etfs');
    expect(spec.includes('sectorETF')).toBe(true);
    expect(spec.includes('catBondProxy')).toBe(false);
  });

  it('catBondProxy does not make etfs L1 fetchOk', () => {
    const insurance = {
      data: { catBondProxy: PROXY, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'etfs',
      marketCtx: insurance,
      allMarkets: { insurance },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('sectorETF still fills L1', () => {
    const insurance = {
      data: {
        catBondProxy: PROXY,
        sectorETF: ETF,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'etfs',
      marketCtx: insurance,
      allMarkets: { insurance },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
