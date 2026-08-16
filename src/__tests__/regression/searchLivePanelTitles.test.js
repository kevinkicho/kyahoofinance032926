/**
 * Regression: global search must find live MARKET_PANELS titles.
 * SEARCH_INDEX subTabs are stale (Combined Ratio vs combined-ratios,
 * missing Panel Trace / GDPNow / TED Spread).
 */
import { describe, it, expect } from 'vitest';
import { searchHub } from '../../hub/lib/searchMarkets.js';
import { SEARCH_INDEX } from '../../hub/markets.config.js';
import { MARKET_PANELS } from '../../data/marketPanels.js';
import { PANEL_REGISTRY, TRACEABLE_MARKETS } from '../../data/panelRegistry.js';
import { MARKETS } from '../../hub/markets.config.js';

function idsFor(query) {
  return searchHub(query).map((r) => r.marketId);
}

function firstPanel(query, marketId) {
  const hit = searchHub(query).find((r) => r.marketId === marketId);
  return hit?.matchingPanelId || null;
}

describe('global search live panel titles', () => {
  it('finds combined-ratios via the live insurance title, not stale Combined Ratio', () => {
    expect(idsFor('combined ratios')).toContain('insurance');
    expect(firstPanel('combined ratios', 'insurance')).toBe('combined-ratios');
    const insurance = SEARCH_INDEX.find((e) => e.marketId === 'insurance');
    expect(insurance.subTabs.some((s) => s.toLowerCase().includes('combined ratios'))).toBe(false);
  });

  it('finds Panel Trace Inspector on analytics', () => {
    expect(idsFor('panel trace')).toContain('analytics');
    expect(firstPanel('panel trace', 'analytics')).toBe('panel-trace');
  });

  it('finds GDPNow on macro', () => {
    expect(idsFor('gdpnow')).toContain('globalMacro');
    expect(firstPanel('gdpnow', 'globalMacro')).toBe('gdpnow');
  });

  it('finds TED Spread on credit', () => {
    expect(idsFor('ted spread')).toContain('credit');
    expect(firstPanel('ted spread', 'credit')).toBe('ted-spread');
  });

  it('still matches ticker keywords and equities view-mode tabs', () => {
    expect(idsFor('AAPL')).toContain('equities');
    const race = searchHub('bar race').find((r) => r.marketId === 'equities');
    expect(race).toBeTruthy();
    expect(race.matchingPanelId).toBeNull();
    expect(race.matchingSub).toBe('Bar Race');
  });

  it('every MARKET_PANELS title is searchable', () => {
    const missing = [];
    for (const [marketId, panels] of Object.entries(MARKET_PANELS)) {
      for (const p of panels) {
        const hits = searchHub(p.title).filter((r) => r.marketId === marketId);
        if (!hits.length) missing.push(`${marketId}:${p.id}:${p.title}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('panelRegistry market ids', () => {
  it('TRACEABLE_MARKETS use live MARKETS ids (equitiesDeepDive not equityDeepDive)', () => {
    const live = new Set(MARKETS.map((m) => m.id));
    const unknown = TRACEABLE_MARKETS.filter((id) => !live.has(id));
    expect(unknown).toEqual([]);
    expect(PANEL_REGISTRY.equitiesDeepDive).toBeTruthy();
    expect(PANEL_REGISTRY.equityDeepDive).toBeUndefined();
  });
});
