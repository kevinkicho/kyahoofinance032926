import { describe, it, expect } from 'vitest';
import { definePanel } from '../../panels/definePanel';
import { getPanel, listPanelsForMarket, listAllPanels } from '../../panels/registry';
import { BONDS_PANEL_BY_ID } from '../../panels/bonds';
import { MARKET_PANELS } from '../../data/marketPanels';

describe('definePanel / registry', () => {
  it('registers bonds panels as independent modules', () => {
    expect(BONDS_PANEL_BY_ID.yield?.key).toBe('bonds:yield');
    expect(BONDS_PANEL_BY_ID.yield?.Body).toBeTypeOf('function');
    expect(getPanel('bonds:yield')).toBeTruthy();
    expect(listPanelsForMarket('bonds').length).toBeGreaterThanOrEqual(20);
  });

  it('registers every MARKET_PANELS entry as an independent module', () => {
    const missing = [];
    for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
      const registered = new Set(listPanelsForMarket(marketId).map((p) => p.panelId));
      for (const p of panels) {
        if (!registered.has(p.id)) missing.push(`${marketId}:${p.id}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('definePanel validates required fields', () => {
    expect(() => definePanel({ panelId: 'x', markets: ['bonds'], Body: () => null })).toThrow();
  });

  it('listAllPanels returns unique keys', () => {
    const all = listAllPanels();
    const keys = all.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(all.length).toBeGreaterThanOrEqual(200);
  });
});
