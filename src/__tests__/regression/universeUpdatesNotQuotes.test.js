/**
 * Regression: equities universe-updates must not go green from
 * heatmap universe/quotes when discovered listings are empty.
 * The tile only paints universeUpdates.updates.
 */
import { describe, it, expect } from 'vitest';
import { evaluatePanelData } from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const QUOTES = [
  { symbol: 'AAPL', price: 190.2, changePct: 0.4 },
  { symbol: 'MSFT', price: 420.1, changePct: -0.2 },
  { symbol: 'NVDA', price: 880.5, changePct: 1.1 },
];
const UNIVERSE = {
  US: { name: 'United States', children: [{ name: 'AAPL' }, { name: 'MSFT' }] },
};
const UPDATES = [
  { name: 'ABCD', fullName: 'ABCD Corp', marketCap: 2.4, price: 12.1, changePct: 1.2 },
  { name: 'EFGH', fullName: 'EFGH Inc', marketCap: 1.1, price: 8.4, changePct: -0.5 },
  { name: 'IJKL', fullName: 'IJKL Ltd', marketCap: 3.8, price: 22.0, changePct: 0.3 },
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

describe('equities universe-updates leftover universe/quotes wiring', () => {
  it('placeholders and field map bind universeUpdates.updates only', () => {
    const slots = slotPaths('equities', 'universe-updates');
    expect(slots.some((p) => p === 'updates' || String(p).includes('updates'))).toBe(true);
    expect(slots.some((p) => p === 'quotes' || p === 'universe' || String(p).includes('quotes'))).toBe(false);

    const spec = specPaths('equities', 'universe-updates');
    expect(spec.includes('updates')).toBe(true);
    expect(spec.includes('universeUpdates')).toBe(true);
    expect(spec.includes('quotes') || spec.includes('universe')).toBe(false);
  });

  it('heatmap universe/quotes do not make universe-updates L1 fetchOk', () => {
    const equities = {
      data: { quotes: QUOTES, universe: UNIVERSE, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const universeUpdates = { data: {}, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'equities',
      panelId: 'universe-updates',
      marketCtx: equities,
      allMarkets: { equities, universeUpdates },
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('universeUpdates.updates still fills L1', () => {
    const equities = {
      data: { quotes: QUOTES, universe: UNIVERSE, fetchedOn: '2026-08-15' },
      isLoading: false,
    };
    const universeUpdates = { data: { updates: UPDATES, isLive: true }, isLoading: false };
    const l1 = evaluatePanelData({
      marketId: 'equities',
      panelId: 'universe-updates',
      marketCtx: equities,
      allMarkets: { equities, universeUpdates },
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});
