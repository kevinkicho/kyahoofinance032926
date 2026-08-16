/**
 * Regression: commodities Commodity Regime must not go green from
 * sectorHeatmapData / yahoo.futures when priceDashboardData is empty.
 * The tile only paints priceDashboardData sector averages.
 * sectorHeatmapData is the sibling Sector Performance tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const HEAT = {
  commodities: [
    { ticker: 'CL=F', name: 'WTI Crude', sector: 'Energy', d1: 0.82, w1: 1.23, m1: -0.45 },
    { ticker: 'GC=F', name: 'Gold', sector: 'Metals', d1: 0.34, w1: 1.56, m1: 5.21 },
  ],
  columns: ['1d%', '1w%', '1m%'],
};
const YAHOO = { futures: { 'CL=F': { price: 78.4 }, 'GC=F': { price: 2410 } } };
const PRICES = [
  {
    sector: 'Energy',
    commodities: [
      { ticker: 'CL=F', name: 'WTI Crude', price: 78.4, change1d: 0.82 },
      { ticker: 'NG=F', name: 'Nat Gas', price: 2.84, change1d: 1.23 },
    ],
  },
  {
    sector: 'Precious Metals',
    commodities: [
      { ticker: 'GC=F', name: 'Gold', price: 2410, change1d: 0.34 },
    ],
  },
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

describe('commodities regime leftover sectorHeatmapData wiring', () => {
  it('placeholders and field map bind priceDashboardData only', () => {
    const slots = slotPaths('commodities', 'regime');
    expect(slots.some((p) => String(p).includes('priceDashboardData'))).toBe(true);
    expect(slots.some((p) => String(p).includes('sectorHeatmapData') || String(p).includes('yahoo'))).toBe(false);

    const spec = specPaths('commodities', 'regime');
    expect(spec.includes('priceDashboardData')).toBe(true);
    expect(spec.includes('sectorHeatmapData') || spec.includes('yahoo')).toBe(false);
  });

  it('sectorHeatmapData / yahoo.futures do not make regime L1 fetchOk', () => {
    const commodities = {
      data: { sectorHeatmapData: HEAT, yahoo: YAHOO, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'regime',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('priceDashboardData still fills L1', () => {
    const commodities = {
      data: {
        sectorHeatmapData: HEAT,
        yahoo: YAHOO,
        priceDashboardData: PRICES,
        fetchedOn: '2026-08-16',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'regime',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
