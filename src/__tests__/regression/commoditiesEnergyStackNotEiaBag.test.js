/**
 * Regression: commodities Energy Stack must not go green from
 * commodities.eia / yahoo.futures when priceDashboardData is empty.
 * The tile paints priceDashboardData energy futures + optional EIA crude stocks.
 * commodities.eia is the leftover sibling prices bag.
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
const YAHOO = { futures: { 'CL=F': { price: 78.4 }, 'NG=F': { price: 2.84 } } };
const DASHBOARD = [
  {
    sector: 'Energy',
    commodities: [
      { ticker: 'CL=F', price: 78.4, change1d: 1.2 },
      { ticker: 'BZ=F', price: 82.1, change1d: 0.8 },
      { ticker: 'NG=F', price: 2.84, change1d: -0.4 },
      { ticker: 'HO=F', price: 2.31, change1d: 0.2 },
    ],
  },
];
const EIA_PET = {
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

describe('commodities energy-stack leftover eia bag wiring', () => {
  it('placeholders and field map bind price dashboard / eiaPetroleum stocks', () => {
    const slots = slotPaths('commodities', 'energy-stack');
    expect(slots.some((p) => String(p).includes('priceDashboardData'))).toBe(true);
    expect(slots.some((p) => String(p).includes('eia.wti') || String(p).includes('eia.natgas') || String(p).includes('eia.gasoline') || String(p).includes('yahoo'))).toBe(false);

    const spec = specPaths('commodities', 'energy-stack');
    expect(spec.includes('priceDashboardData')).toBe(true);
    expect(spec.includes('eia') || spec.includes('yahoo')).toBe(false);
  });

  it('commodities.eia / yahoo.futures do not make energy-stack L1 fetchOk', () => {
    const commodities = {
      data: { eia: EIA_BAG, yahoo: YAHOO, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'energy-stack',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('priceDashboardData still fills L1', () => {
    const commodities = {
      data: {
        eia: EIA_BAG,
        yahoo: YAHOO,
        priceDashboardData: DASHBOARD,
        fetchedOn: '2026-08-16',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'energy-stack',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });

  it('eiaPetroleum crude stocks still fill L1', () => {
    const commodities = {
      data: { eia: EIA_BAG, yahoo: YAHOO, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const eiaPetroleum = { data: EIA_PET, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'energy-stack',
      marketCtx: commodities,
      allMarkets: { commodities, eiaPetroleum },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
