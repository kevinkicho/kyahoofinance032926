/**
 * Regression: commodities Futures Curves must not go green from
 * yahoo.futures / eia.wti_price when futuresCurveData is empty.
 * The tile paints futuresCurveData + optional goldFuturesCurve.
 * yahoo / eia are leftover sibling false-greens (prices tile).
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const EIA_BAG = {
  wti_price: { value: 78.4, unit: '$/bbl' },
  brent_price: { value: 82.1, unit: '$/bbl' },
};
const YAHOO = { futures: { 'CL=F': { price: 78.4 }, 'GC=F': { price: 2410 } } };
const WTI_CURVE = {
  labels: ['M1', 'M2', 'M3', 'M6'],
  prices: [78.4, 78.9, 79.2, 80.1],
  spotPrice: 78.4,
  unit: '$/bbl',
};
const GOLD_CURVE = {
  labels: ['M1', 'M2', 'M3'],
  prices: [2410, 2422, 2435],
  spotPrice: 2410,
  unit: '$/oz',
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

describe('commodities futures leftover yahoo/eia wiring', () => {
  it('placeholders and field map bind curve payloads only', () => {
    const slots = slotPaths('commodities', 'futures');
    expect(slots.some((p) => String(p).includes('futuresCurveData'))).toBe(true);
    expect(slots.some((p) => String(p).includes('goldFuturesCurve'))).toBe(true);
    expect(slots.some((p) => String(p).includes('yahoo') || String(p).includes('eia'))).toBe(false);

    const spec = specPaths('commodities', 'futures');
    expect(spec.includes('futuresCurveData')).toBe(true);
    expect(spec.includes('goldFuturesCurve')).toBe(true);
    expect(spec.includes('yahoo') || spec.includes('eia')).toBe(false);
  });

  it('yahoo.futures / eia.wti_price do not make futures L1 fetchOk', () => {
    const commodities = {
      data: { eia: EIA_BAG, yahoo: YAHOO, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'futures',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('futuresCurveData still fills L1', () => {
    const commodities = {
      data: {
        eia: EIA_BAG,
        yahoo: YAHOO,
        futuresCurveData: WTI_CURVE,
        goldFuturesCurve: GOLD_CURVE,
        fetchedOn: '2026-08-16',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'futures',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
