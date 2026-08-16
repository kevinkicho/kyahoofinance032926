/**
 * Regression: commodities US Ag prices must not go green from
 * worldBank / whole FRED bag / rice when USDA NASS and FRED
 * corn/wheat/soybeans are empty. The tile paints USDA NASS or
 * FRED ag histories. worldBank / FRED energy-metals bag are
 * leftover sibling false-greens (FAO / prices).
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const WORLD_BANK = {
  countries: [{ country: 'USA', value: 1.2 }],
};
const FRED_BAG = {
  wti: { value: 78.4, history: [{ date: '2026-08-01', value: 78.4 }] },
  gold_am: { value: 2410, history: [{ date: '2026-08-01', value: 2410 }] },
  copper: { value: 4.21 },
  rice: { value: 17.4, history: [{ date: '2026-08-01', value: 17.4 }] },
};
const FRED_AG = {
  wheat: {
    value: 198.4,
    history: [
      { date: '2026-06-01', value: 190.1 },
      { date: '2026-07-01', value: 194.8 },
      { date: '2026-08-01', value: 198.4 },
    ],
  },
  corn: {
    value: 168.2,
    history: [
      { date: '2026-06-01', value: 160.4 },
      { date: '2026-07-01', value: 164.1 },
      { date: '2026-08-01', value: 168.2 },
    ],
  },
  soybeans: {
    value: 412.0,
    history: [
      { date: '2026-06-01', value: 400.2 },
      { date: '2026-07-01', value: 406.5 },
      { date: '2026-08-01', value: 412.0 },
    ],
  },
};
const USDA = {
  summary: [
    { key: 'corn', desc: 'Corn', unit: '$/bu', latest: { value: 4.12 }, color: '#f59e0b' },
    { key: 'wheat', desc: 'Wheat', unit: '$/bu', latest: { value: 5.48 }, color: '#fbbf24' },
  ],
  commodities: {
    corn: [{ period: 'Jan', year: 2026, value: 4.12 }],
    wheat: [{ period: 'Jan', year: 2026, value: 5.48 }],
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

describe('commodities usda-ag leftover worldBank/FRED bag wiring', () => {
  it('placeholders and field map bind USDA / FRED ag series only', () => {
    const slots = slotPaths('commodities', 'usda-ag');
    expect(slots.some((p) => String(p).includes('usda') || String(p).includes('wheat') || String(p).includes('corn'))).toBe(true);
    expect(slots.some((p) => String(p).includes('worldBank') || String(p).includes('rice') || p === 'fred')).toBe(false);

    const spec = specPaths('commodities', 'usda-ag');
    expect(spec.includes('commodities') || spec.includes('wheat') || spec.includes('corn')).toBe(true);
    expect(spec.includes('worldBank') || spec.includes('fred')).toBe(false);
  });

  it('worldBank / FRED energy-metals / rice do not make usda-ag L1 fetchOk', () => {
    const commodities = {
      data: { fred: FRED_BAG, worldBank: WORLD_BANK, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'usda-ag',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('FRED wheat/corn/soybeans still fills L1', () => {
    const commodities = {
      data: { fred: { ...FRED_BAG, ...FRED_AG }, worldBank: WORLD_BANK, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'usda-ag',
      marketCtx: commodities,
      allMarkets: { commodities },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });

  it('usda.commodities still fills L1', () => {
    const commodities = {
      data: { fred: FRED_BAG, worldBank: WORLD_BANK, fetchedOn: '2026-08-16' },
      isLoading: false,
    };
    const usda = { data: USDA, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'commodities',
      panelId: 'usda-ag',
      marketCtx: commodities,
      allMarkets: { commodities, usda },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
