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
import { getRegistryEntry } from '../../hub/lib/health/index.js';

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

  it('finds Factor Rankings on Equity+ and jumps to factor-rankings', () => {
    expect(idsFor('factor rankings')).toContain('equitiesDeepDive');
    expect(firstPanel('factor rankings', 'equitiesDeepDive')).toBe('factor-rankings');
    expect((MARKET_PANELS.equitiesDeepDive || []).some((p) => p.id === 'factor-rankings')).toBe(true);
  });

  it('finds US Trade Balance on commodities and jumps to us-trade', () => {
    expect(idsFor('us trade balance')).toContain('commodities');
    expect(firstPanel('us trade balance', 'commodities')).toBe('us-trade');
    expect((MARKET_PANELS.commodities || []).some((p) => p.id === 'us-trade')).toBe(true);
  });

  it('finds Cross-Market Alert Board on watchlist and jumps to cross-alerts', () => {
    expect(idsFor('cross-market alert board')).toContain('watchlist');
    expect(firstPanel('cross-market alert board', 'watchlist')).toBe('cross-alerts');
    expect((MARKET_PANELS.watchlist || []).some((p) => p.id === 'cross-alerts')).toBe(true);
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

  it('Equity+ registry ids match live tiles, not sector-rotation / earnings-watch', () => {
    const live = new Set((MARKET_PANELS.equitiesDeepDive || []).map((p) => p.id));
    const stale = ['sector-rotation', 'earnings-watch', 'short-interest', 'sec-13f'];
    const ids = (PANEL_REGISTRY.equitiesDeepDive || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['etf', 'factor-rankings', 'earnings', 'shorted', 'insider', 'institutions']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('equitiesDeepDive', id)).toBeTruthy();
    }
    expect(getRegistryEntry('equitiesDeepDive', 'sector-rotation')).toBeNull();
    expect(getRegistryEntry('equitiesDeepDive', 'earnings-watch')).toBeNull();
    expect(getRegistryEntry('equitiesDeepDive', 'short-interest')).toBeNull();
    expect(getRegistryEntry('equitiesDeepDive', 'sec-13f')).toBeNull();
  });

  it('Commodities registry ids match live tiles, not price-dashboard / futures-curve / supply-demand', () => {
    const live = new Set((MARKET_PANELS.commodities || []).map((p) => p.id));
    const stale = ['price-dashboard', 'futures-curve', 'supply-demand'];
    const ids = (PANEL_REGISTRY.commodities || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['prices', 'futures', 'supply', 'us-trade']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('commodities', id)).toBeTruthy();
    }
    expect(getRegistryEntry('commodities', 'price-dashboard')).toBeNull();
    expect(getRegistryEntry('commodities', 'futures-curve')).toBeNull();
    expect(getRegistryEntry('commodities', 'supply-demand')).toBeNull();
  });
});
