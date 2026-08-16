/**
 * Regression: FAO Food Price Index health must not go green from
 * commodities FRED wheat / the whole FRED bag / World Bank when
 * FAO series are empty. The tile only paints fao.series.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const WHEAT = { value: 548.2, history: [520, 531, 548.2] };
const FRED = { wheat: WHEAT, wti: { value: 78.4 }, copper: { value: 4.12 } };
const WORLD_BANK = { commodities: [{ name: 'Wheat', value: 220 }] };
const FAO_INDEX = {
  dates: ['2026-01', '2026-06', '2026-07'],
  values: [120.4, 118.2, 119.1],
  latest: 119.1,
};
const FAO_SERIES = [
  { date: '2026-01', value: 120.4 },
  { date: '2026-06', value: 118.2 },
  { date: '2026-07', value: 119.1 },
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

describe('commodities fao-prices leftover wheat/FRED wiring', () => {
  it('placeholders and field map bind FAO only', () => {
    const slots = slotPaths('commodities', 'fao-prices');
    expect(slots.some((p) => String(p).includes('foodPriceIndex') || p === 'series' || p === 'fao')).toBe(true);
    expect(slots.some((p) => String(p).includes('wheat') || p === 'fred' || String(p).includes('worldBank'))).toBe(false);

    const spec = specPaths('commodities', 'fao-prices');
    expect(spec.includes('foodPriceIndex') || spec.includes('series')).toBe(true);
    expect(spec.includes('fao')).toBe(true);
    expect(spec.includes('fred') || spec.includes('worldBank')).toBe(false);
  });

  it('FRED wheat / World Bank do not make FAO L1 fetchOk', () => {
    const commodities = {
      data: { fred: FRED, worldBank: WORLD_BANK, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const fao = { data: {}, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'fao-prices',
      marketCtx: commodities,
      allMarkets: { commodities, fao },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('fao.foodPriceIndex still fills L1', () => {
    const commodities = {
      data: { fred: FRED, worldBank: WORLD_BANK, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const fao = { data: { foodPriceIndex: FAO_INDEX, series: FAO_SERIES, isLive: true }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'fao-prices',
      marketCtx: commodities,
      allMarkets: { commodities, fao },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
