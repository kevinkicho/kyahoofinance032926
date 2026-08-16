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

  it('finds Data Quality Score on analytics and jumps to data-quality', () => {
    expect(idsFor('data quality score')).toContain('analytics');
    expect(firstPanel('data quality score', 'analytics')).toBe('data-quality');
    expect((MARKET_PANELS.analytics || []).some((p) => p.id === 'data-quality')).toBe(true);
  });

  it('finds Panel Visibility Audit on analytics and jumps to visibility-audit', () => {
    expect(idsFor('panel visibility audit')).toContain('analytics');
    expect(firstPanel('panel visibility audit', 'analytics')).toBe('visibility-audit');
    expect((MARKET_PANELS.analytics || []).some((p) => p.id === 'visibility-audit')).toBe(true);
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

  it('Macro registry ids match live tiles, not central-bank-rates / growth-inflation', () => {
    const live = new Set((MARKET_PANELS.globalMacro || []).map((p) => p.id));
    const stale = ['central-bank-rates', 'debt-monitor', 'growth-inflation', 'economic-activity', 'imf-weo', 'oecd-indicators', 'bis-liquidity'];
    const ids = (PANEL_REGISTRY.globalMacro || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['scorecard', 'rates', 'debt', 'gdp', 'cpi', 'activity', 'imf-reserves', 'cli', 'global-liquidity']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('globalMacro', id)).toBeTruthy();
    }
    expect(getRegistryEntry('globalMacro', 'central-bank-rates')).toBeNull();
    expect(getRegistryEntry('globalMacro', 'growth-inflation')).toBeNull();
    expect(getRegistryEntry('globalMacro', 'imf-weo')).toBeNull();
    expect(getRegistryEntry('globalMacro', 'bis-liquidity')).toBeNull();
  });

  it('Credit registry ids match live tiles, not ig-hy / loan-market / fdic-summary', () => {
    const live = new Set((MARKET_PANELS.credit || []).map((p) => p.id));
    const stale = ['ig-hy', 'em-bonds', 'loan-market', 'default-watch', 'fdic-summary'];
    const ids = (PANEL_REGISTRY.credit || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['credit-spreads', 'em-yields', 'default-rates', 'bank-sector', 'ted-spread', 'wb-debt', 'bis-total-credit', 'treasury-credit-holdings']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('credit', id)).toBeTruthy();
    }
    expect(getRegistryEntry('credit', 'ig-hy')).toBeNull();
    expect(getRegistryEntry('credit', 'loan-market')).toBeNull();
    expect(getRegistryEntry('credit', 'fdic-summary')).toBeNull();
    expect(getRegistryEntry('credit', 'default-watch')).toBeNull();
  });

  it('Calendar registry ids match live tiles, not economic-calendar / central-bank-schedule', () => {
    const live = new Set((MARKET_PANELS.calendar || []).map((p) => p.id));
    const stale = ['economic-calendar', 'central-bank-schedule'];
    const ids = (PANEL_REGISTRY.calendar || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['economic', 'cb-rates', 'cb-timeline', 'earnings']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('calendar', id)).toBeTruthy();
    }
    expect(getRegistryEntry('calendar', 'economic-calendar')).toBeNull();
    expect(getRegistryEntry('calendar', 'central-bank-schedule')).toBeNull();
  });

  it('Sentiment registry ids match live tiles, not eurostat-confidence / oecd-leading', () => {
    const live = new Set((MARKET_PANELS.sentiment || []).map((p) => p.id));
    const stale = ['eurostat-confidence', 'oecd-leading'];
    const ids = (PANEL_REGISTRY.sentiment || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['fear-greed', 'cftc', 'risk-dashboard', 'cross-asset', 'fsi', 'leverage', 'news-sentiment', 'fed-risk-mood']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('sentiment', id)).toBeTruthy();
    }
    expect(getRegistryEntry('sentiment', 'eurostat-confidence')).toBeNull();
    expect(getRegistryEntry('sentiment', 'oecd-leading')).toBeNull();
  });

  it('Real-estate registry ids match live tiles, not price-index / reit / affordability', () => {
    const live = new Set((MARKET_PANELS.realEstate || []).map((p) => p.id));
    const stale = ['price-index', 'reit', 'affordability', 'cap-rate'];
    const ids = (PANEL_REGISTRY.realEstate || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['shiller', 'reitperf', 'afford-stack', 'caprate', 'fhfa-hpi', 'bis-property-prices', 'metro-case-shiller', 'hud-affordability-by-metro']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('realEstate', id)).toBeTruthy();
    }
    expect(getRegistryEntry('realEstate', 'price-index')).toBeNull();
    expect(getRegistryEntry('realEstate', 'reit')).toBeNull();
    expect(getRegistryEntry('realEstate', 'affordability')).toBeNull();
    expect(getRegistryEntry('realEstate', 'cap-rate')).toBeNull();
  });

  it('Insurance registry ids match live tiles, not cat-bonds / reinsurance / reserve', () => {
    const live = new Set((MARKET_PANELS.insurance || []).map((p) => p.id));
    const stale = ['cat-bonds', 'reinsurance', 'reserve'];
    const ids = (PANEL_REGISTRY.insurance || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['catbonds', 'reinsrates', 'reserves', 'combined-ratios', 'fema-disasters', 'usgs-earthquakes']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('insurance', id)).toBeTruthy();
    }
    expect(getRegistryEntry('insurance', 'cat-bonds')).toBeNull();
    expect(getRegistryEntry('insurance', 'reinsurance')).toBeNull();
    expect(getRegistryEntry('insurance', 'reserve')).toBeNull();
  });

  it('FX registry ids match live tiles, not rate-matrix / top-movers / correlation', () => {
    const live = new Set((MARKET_PANELS.fx || []).map((p) => p.id));
    const stale = ['rate-matrix', 'top-movers', 'correlation'];
    const ids = (PANEL_REGISTRY.fx || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['sidebar', 'movers', 'corr', 'dxy', 'carry', 'reer', 'imf-cofer', 'treasury-tic']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('fx', id)).toBeTruthy();
    }
    expect(getRegistryEntry('fx', 'rate-matrix')).toBeNull();
    expect(getRegistryEntry('fx', 'top-movers')).toBeNull();
    expect(getRegistryEntry('fx', 'correlation')).toBeNull();
  });

  it('Derivatives registry ids match live tiles, not vix-term / vol-surface / options-flow', () => {
    const live = new Set((MARKET_PANELS.derivatives || []).map((p) => p.id));
    const stale = ['vix-term', 'vol-surface', 'options-flow'];
    const ids = (PANEL_REGISTRY.derivatives || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['vixterm', 'volsurf', 'flow', 'vix1y', 'skew', 'gamma', 'cftc-tff']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('derivatives', id)).toBeTruthy();
    }
    expect(getRegistryEntry('derivatives', 'vix-term')).toBeNull();
    expect(getRegistryEntry('derivatives', 'vol-surface')).toBeNull();
    expect(getRegistryEntry('derivatives', 'options-flow')).toBeNull();
  });

  it('Crypto registry ids match live tiles, not coin-overview / defi', () => {
    const live = new Set((MARKET_PANELS.crypto || []).map((p) => p.id));
    const stale = ['coin-overview', 'defi'];
    const ids = (PANEL_REGISTRY.crypto || []).map((p) => p.id);
    expect(ids.some((id) => stale.includes(id))).toBe(false);
    for (const id of ['top-cryptos', 'defi-tvl', 'funding', 'fear-greed', 'onchain', 'stablecoin-composition']) {
      expect(ids).toContain(id);
      expect(live.has(id)).toBe(true);
      expect(getRegistryEntry('crypto', id)).toBeTruthy();
    }
    expect(getRegistryEntry('crypto', 'coin-overview')).toBeNull();
    expect(getRegistryEntry('crypto', 'defi')).toBeNull();
  });
});
