/**
 * Regression: commodities Physical Pressure must not go green from
 * supplyDemand / commodities.eia / yahoo when eiaPetroleum, USDA, and
 * Census trade are empty. The table only paints those three sources.
 * supplyDemand is the sibling Supply & Demand tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const SUPPLY = {
  crudeStocks: { latest: 432100, avg5yr: 428000, values: [430000, 431200, 432100] },
  natGasStorage: { latest: 3120, avg5yr: 3000, values: [3080, 3100, 3120] },
};
const EIA_BAG = { crude_stocks: { value: 432100 }, natgas_storage: { value: 3120 } };
const YAHOO = { futures: { 'CL=F': { price: 78.4 }, 'GC=F': { price: 2410 } } };
const EIA_PET = {
  crudeStocks: { latest: { value: 432100 }, yoyPct: 1.2 },
  gasoline: { latest: { value: 3.21 }, yoyPct: -4.1 },
  naturalGas: { latest: { value: 2.84 }, yoyPct: 8.6 },
};
const USDA = {
  summary: [{ key: 'corn', desc: 'Corn', unit: '$/bu', latest: { value: 4.12 }, yoyPct: -6.2 }],
};
const TRADE = { summary: { worldBalanceB: -68.4, latestMonth: '2026-06' } };

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

describe('commodities physical-pressure leftover supplyDemand wiring', () => {
  it('placeholders and field map bind eiaPetroleum/usda/censusTrade only', () => {
    const slots = slotPaths('commodities', 'physical-pressure');
    expect(slots.some((p) => String(p).includes('eiaPetroleum') || String(p).includes('usda') || String(p).includes('censusTrade'))).toBe(true);
    expect(slots.some((p) => String(p).includes('supplyDemand') || p === 'eia' || p === 'yahoo' || String(p).includes('eia.crude'))).toBe(false);

    const spec = specPaths('commodities', 'physical-pressure');
    expect(spec.includes('eiaPetroleum') || spec.includes('usda') || spec.includes('censusTrade')).toBe(true);
    expect(spec.includes('supplyDemand') || spec.includes('yahoo') || spec.includes('eia')).toBe(false);
  });

  it('supplyDemand / commodities.eia / yahoo do not make physical-pressure L1 fetchOk', () => {
    const commodities = {
      data: { supplyDemand: SUPPLY, eia: EIA_BAG, yahoo: YAHOO, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'physical-pressure',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('eiaPetroleum crude stocks still fill L1', () => {
    const commodities = {
      data: { supplyDemand: SUPPLY, eia: EIA_BAG, yahoo: YAHOO, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const eiaPetroleum = { data: EIA_PET, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'physical-pressure',
      marketCtx: commodities,
      allMarkets: { commodities, eiaPetroleum },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });

  it('usda summary still fills L1 when petroleum is empty', () => {
    const commodities = {
      data: { supplyDemand: SUPPLY, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const usda = { data: USDA, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'physical-pressure',
      marketCtx: commodities,
      allMarkets: { commodities, usda },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
