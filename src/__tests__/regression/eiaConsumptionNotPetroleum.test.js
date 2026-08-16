/**
 * Regression: EIA electricity consumption must not go green from
 * petroleum when sector sales are empty. The tile only paints
 * residential/commercial/industrial kWh sales.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const PETROLEUM = {
  wti: { latest: { value: 78.4, period: '2026-08' }, values: [72.1, 75.8, 78.4] },
  brent: { latest: { value: 82.1, period: '2026-08' }, values: [76.4, 79.2, 82.1] },
};
const ELECTRICITY = {
  residential: {
    latest: { period: '2026-01', sales: 145115, revenue: 25323, price: 17.45 },
    sales: { values: [140200, 142800, 145115], unit: 'M kWh' },
  },
  commercial: {
    latest: { period: '2026-01', sales: 121400, revenue: 15800, price: 13.02 },
    sales: { values: [118000, 119500, 121400], unit: 'M kWh' },
  },
  industrial: null,
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

describe('eia consumption leftover petroleum wiring', () => {
  it('placeholders and field map bind electricity sales, not petroleum', () => {
    const slots = slotPaths('eia', 'consumption');
    expect(slots.some((p) => String(p).includes('electricity') && String(p).includes('sales'))).toBe(true);
    expect(slots.some((p) => String(p).includes('petroleum'))).toBe(false);

    const spec = specPaths('eia', 'consumption');
    expect(spec.includes('electricity')).toBe(true);
    expect(spec.includes('petroleum')).toBe(false);
  });

  it('petroleum does not make consumption L1 fetchOk', () => {
    const eia = {
      data: { petroleum: PETROLEUM, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'eia',
      panelId: 'consumption',
      marketCtx: eia,
      allMarkets: { eia },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('electricity sector sales still fill L1', () => {
    const eia = {
      data: { petroleum: PETROLEUM, electricity: ELECTRICITY, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'eia',
      panelId: 'consumption',
      marketCtx: eia,
      allMarkets: { eia },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
