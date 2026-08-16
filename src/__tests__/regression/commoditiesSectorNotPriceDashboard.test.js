/**
 * Regression: commodities Sector Performance must not go green from
 * priceDashboardData / yahoo.futures when sectorHeatmapData is empty.
 * The tile only paints heatmap rows. priceDashboardData is the sibling
 * prices tile.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const PRICES = [
  {
    sector: 'Energy',
    commodities: [
      { ticker: 'CL=F', name: 'WTI Crude', price: 78.4, change1d: 0.82 },
      { ticker: 'NG=F', name: 'Nat Gas', price: 2.84, change1d: 1.23 },
    ],
  },
];
const YAHOO = { futures: { 'CL=F': { price: 78.4 }, 'GC=F': { price: 2410 } } };
const HEAT = {
  commodities: [
    { ticker: 'CL=F', name: 'WTI Crude', sector: 'Energy', d1: 0.82, w1: 1.23, m1: -0.45 },
    { ticker: 'GC=F', name: 'Gold', sector: 'Metals', d1: 0.34, w1: 1.56, m1: 5.21 },
  ],
  columns: ['1d%', '1w%', '1m%'],
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

describe('commodities sector leftover priceDashboardData wiring', () => {
  it('placeholders and field map bind sectorHeatmapData only', () => {
    const slots = slotPaths('commodities', 'sector');
    expect(slots.some((p) => String(p).includes('sectorHeatmapData'))).toBe(true);
    expect(slots.some((p) => String(p).includes('priceDashboardData') || String(p).includes('yahoo'))).toBe(false);

    const spec = specPaths('commodities', 'sector');
    expect(spec.includes('sectorHeatmapData') || spec.some((p) => String(p).includes('sectorHeatmapData'))).toBe(true);
    expect(spec.includes('priceDashboardData') || spec.includes('yahoo')).toBe(false);
  });

  it('priceDashboardData / yahoo.futures do not make sector L1 fetchOk', () => {
    const commodities = {
      data: { priceDashboardData: PRICES, yahoo: YAHOO, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'sector',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('sectorHeatmapData still fills L1', () => {
    const commodities = {
      data: {
        priceDashboardData: PRICES,
        yahoo: YAHOO,
        sectorHeatmapData: HEAT,
        fetchedOn: '2026-08-16',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'sector',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
