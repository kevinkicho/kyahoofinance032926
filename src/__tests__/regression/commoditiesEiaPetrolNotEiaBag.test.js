/**
 * Regression: commodities EIA Petroleum must not go green from
 * commodities.eia / yahoo.futures when eiaPetroleum is empty.
 * The tile only paints eiaPetroleum gasoline / Henry Hub / crude stocks.
 * commodities.eia is the sibling energy-stack / prices bag.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const EIA_BAG = {
  wti_price: { value: 78.4, unit: '$/bbl' },
  brent_price: { value: 82.1, unit: '$/bbl' },
  gasoline_regular: { value: 3.21, unit: '$/gal' },
  natgas: { value: 2.84, unit: '$/MMBtu' },
};
const YAHOO = { futures: { 'CL=F': { price: 78.4 }, 'GC=F': { price: 2410 } } };
const EIA_PET = {
  gasoline: { latest: { value: 3.21 }, yoyPct: -4.1, series: [{ date: '2026-07-01', value: 3.18 }, { date: '2026-08-01', value: 3.21 }] },
  naturalGas: { latest: { value: 2.84 }, yoyPct: 8.6, series: [{ date: '2026-07-01', value: 2.61 }, { date: '2026-08-01', value: 2.84 }] },
  crudeStocks: { latest: { value: 432100 }, yoyPct: 1.2 },
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

describe('commodities eia-petrol leftover eia bag wiring', () => {
  it('placeholders and field map bind eiaPetroleum only', () => {
    const slots = slotPaths('commodities', 'eia-petrol');
    expect(slots.some((p) => String(p).includes('eiaPetroleum') || String(p).includes('gasoline') || String(p).includes('naturalGas'))).toBe(true);
    expect(slots.some((p) => String(p).includes('eia.wti') || String(p).includes('eia.gasoline') || String(p).includes('yahoo'))).toBe(false);

    const spec = specPaths('commodities', 'eia-petrol');
    expect(spec.includes('eiaPetroleum')).toBe(true);
    expect(spec.includes('eia') || spec.includes('yahoo')).toBe(false);
  });

  it('commodities.eia / yahoo.futures do not make eia-petrol L1 fetchOk', () => {
    const commodities = {
      data: { eia: EIA_BAG, yahoo: YAHOO, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'eia-petrol',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('eiaPetroleum gasoline still fills L1', () => {
    const commodities = {
      data: { eia: EIA_BAG, yahoo: YAHOO, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const eiaPetroleum = { data: EIA_PET, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'eia-petrol',
      marketCtx: commodities,
      allMarkets: { commodities, eiaPetroleum },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
