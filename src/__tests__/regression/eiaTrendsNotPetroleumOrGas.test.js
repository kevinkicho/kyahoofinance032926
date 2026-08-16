/**
 * Regression: EIA price trends must not go green from petroleum /
 * naturalGas when electricity sector price series are empty.
 * The tile only paints residential/commercial/industrial ¢/kWh
 * 3-year monthly sparklines.
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
const NATGAS = {
  henryHub: { latest: { value: 2.84, period: '2026-08' }, values: [2.41, 2.66, 2.84] },
};
const ELECTRICITY = {
  residential: {
    latest: { period: '2026-01', sales: 145115, revenue: 25323, price: 17.45 },
    price: { values: [16.8, 17.1, 17.45], unit: 'cents/kWh' },
  },
  commercial: {
    latest: { period: '2026-01', sales: 121400, revenue: 15800, price: 13.02 },
    price: { values: [12.6, 12.8, 13.02], unit: 'cents/kWh' },
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

describe('eia trends leftover petroleum/naturalGas wiring', () => {
  it('placeholders and field map bind electricity price series only', () => {
    const slots = slotPaths('eia', 'trends');
    expect(slots.some((p) => String(p).includes('electricity') && String(p).includes('price'))).toBe(true);
    expect(slots.some((p) => String(p).includes('petroleum') || String(p).includes('naturalGas'))).toBe(false);

    const spec = specPaths('eia', 'trends');
    expect(spec.includes('electricity')).toBe(true);
    expect(spec.includes('petroleum') || spec.includes('naturalGas')).toBe(false);
  });

  it('petroleum / naturalGas do not make trends L1 fetchOk', () => {
    const eia = {
      data: { petroleum: PETROLEUM, naturalGas: NATGAS, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'eia',
      panelId: 'trends',
      marketCtx: eia,
      allMarkets: { eia },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('electricity sector price series still fill L1', () => {
    const eia = {
      data: {
        petroleum: PETROLEUM,
        naturalGas: NATGAS,
        electricity: ELECTRICITY,
        fetchedOn: '2026-08-15',
      },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'eia',
      panelId: 'trends',
      marketCtx: eia,
      allMarkets: { eia },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
