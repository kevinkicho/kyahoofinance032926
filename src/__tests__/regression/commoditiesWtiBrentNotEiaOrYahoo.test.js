/**
 * Regression: commodities WTI vs Brent must not go green from
 * commodities.eia / yahoo.futures / FRED latest values when WTI/Brent
 * history is empty. The chart only paints FRED daily histories.
 * eia / yahoo are leftover sibling false-greens (prices tile).
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
const YAHOO = { futures: { 'CL=F': { price: 78.4 }, 'BZ=F': { price: 82.1 } } };
const FRED_LATEST = { wti: { value: 78.4 }, brent: { value: 82.1 } };
const FRED_HIST = {
  wti: {
    history: [
      { date: '2026-06-01', value: 72.1 },
      { date: '2026-07-01', value: 75.8 },
      { date: '2026-08-01', value: 78.4 },
    ],
  },
  brent: {
    history: [
      { date: '2026-06-01', value: 76.4 },
      { date: '2026-07-01', value: 79.2 },
      { date: '2026-08-01', value: 82.1 },
    ],
  },
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

describe('commodities wti-brent leftover eia/yahoo wiring', () => {
  it('placeholders and field map bind FRED wti/brent history only', () => {
    const slots = slotPaths('commodities', 'wti-brent');
    expect(slots.some((p) => String(p).includes('fred.wti'))).toBe(true);
    expect(slots.some((p) => String(p).includes('fred.brent'))).toBe(true);
    expect(slots.some((p) => String(p).includes('eia') || String(p).includes('yahoo'))).toBe(false);

    const spec = specPaths('commodities', 'wti-brent');
    expect(spec.some((p) => String(p).includes('fred.wti'))).toBe(true);
    expect(spec.some((p) => String(p).includes('fred.brent'))).toBe(true);
    expect(spec.includes('eia') || spec.includes('yahoo')).toBe(false);
  });

  it('eia / yahoo / FRED latest do not make wti-brent L1 fetchOk', () => {
    const commodities = {
      data: { eia: EIA_BAG, yahoo: YAHOO, fred: FRED_LATEST, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'wti-brent',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('FRED wti/brent history still fills L1', () => {
    const commodities = {
      data: {
        eia: EIA_BAG,
        yahoo: YAHOO,
        fred: FRED_HIST,
        fetchedOn: '2026-08-16',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'wti-brent',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
