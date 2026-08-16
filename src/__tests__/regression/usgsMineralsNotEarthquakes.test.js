/**
 * Regression: insurance usgs-minerals must not score USGS earthquake events
 * as minerals data (leftover false-green after the tile was unwired).
 * Also: panelRegistry id must match MARKET_PANELS combined-ratios (EDGAR).
 */
import { describe, it, expect } from 'vitest';
import {
  evaluatePanelData,
  getRegistryEntry,
  getPanelSpec,
} from '../../hub/lib/health/index.js';
import { DATA } from '../../hub/lib/health/types.js';
import { getPanelPlaceholders } from '../../data/panelPlaceholders.js';
import { getPanelFieldSpec } from '../../data/panelFieldMap.js';

const QUAKE_EVENTS = [
  { mag: 5.2, place: 'Alaska', time: '2026-08-01T00:00:00Z' },
  { mag: 4.8, place: 'Chile', time: '2026-08-02T00:00:00Z' },
];

function quakeMarkets() {
  const usgs = { data: { events: QUAKE_EVENTS, eventsCount: 2, isLive: true }, isLoading: false };
  const insurance = { data: { fetchedOn: '2026-08-15' }, isLoading: false };
  return { insurance, usgs };
}

describe('insurance usgs-minerals leftover quake wiring', () => {
  it('placeholders and field map do not point at usgs.events', () => {
    const slots = getPanelPlaceholders('insurance', 'usgs-minerals') || [];
    const paths = slots.flatMap((s) => [s.path, ...(s.anyOf || [])]).filter(Boolean);
    expect(paths.some((p) => p === 'events' || String(p).endsWith('.events'))).toBe(false);

    const spec = getPanelFieldSpec('insurance', 'usgs-minerals');
    const specPaths = [];
    if (spec) {
      specPaths.push(spec.field, spec.fieldPath);
      for (const alt of spec.anyOf || []) specPaths.push(alt.field, alt.fieldPath);
    }
    expect(specPaths.includes('events')).toBe(false);
  });

  it('earthquake events do not make minerals L1 fetchOk', () => {
    const markets = quakeMarkets();
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'usgs-minerals',
      marketCtx: markets.insurance,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(false);
    expect(l1.dataState).not.toBe(DATA.READY);
  });

  it('usgs-earthquakes still fills from events', () => {
    const markets = quakeMarkets();
    const l1 = evaluatePanelData({
      marketId: 'insurance',
      panelId: 'usgs-earthquakes',
      marketCtx: markets.insurance,
      allMarkets: markets,
    });
    expect(l1.fetchOk).toBe(true);
    expect(l1.dataState).toBe(DATA.READY);
  });
});

describe('insurance combined-ratios registry id', () => {
  it('registry matches MARKET_PANELS id and EDGAR issuers, not combined-ratio', () => {
    expect(getRegistryEntry('insurance', 'combined-ratio')).toBeNull();
    const entry = getRegistryEntry('insurance', 'combined-ratios');
    expect(entry).toBeTruthy();
    expect(entry.field).toBe('issuers');
    expect(entry.crossMarket).toBe('edgarInsurerRatios');

    const spec = getPanelSpec('insurance', 'combined-ratios');
    expect(spec).toBeTruthy();
    expect(spec.field).toBe('issuers');
    expect(spec.crossMarket).toBe('edgarInsurerRatios');
  });
});
