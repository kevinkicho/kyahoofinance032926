import { describe, it, expect } from 'vitest';
import {
  getPanelPlaceholders,
  placeholdersFromFieldMap,
  placeholdersFromContract,
  PANEL_PLACEHOLDERS,
} from '../data/panelPlaceholders.js';

describe('placeholdersFromFieldMap', () => {
  it('derives slots when no hand-authored placeholders', () => {
    // Pick a field-map key that might lack hand entries — or force via known map key
    const auto = placeholdersFromFieldMap('equities', 'heatmap');
    // heatmap has hand-authored entry; fromFieldMap still works standalone
    expect(auto?.length).toBeGreaterThan(0);
    expect(auto[0].path || auto[0].anyOf).toBeTruthy();
  });

  it('simple hand entries defer to field map when map exists', () => {
    // equities:heatmap is single-slot hand — L1 prefers field map path
    const key = 'equities:heatmap';
    expect(PANEL_PLACEHOLDERS[key]).toBeTruthy();
    const got = getPanelPlaceholders('equities', 'heatmap');
    expect(got?.length).toBeGreaterThan(0);
    expect(got[0].path || got[0].anyOf).toBeTruthy();
    // Not forced to be the hand array identity; path must resolve quotes
    const paths = got.flatMap((s) => s.anyOf || (s.path ? [s.path] : []));
    expect(paths.some((p) => String(p).includes('quotes'))).toBe(true);
  });

  it('rich multi-slot hand inventory still wins', () => {
    const key = Object.keys(PANEL_PLACEHOLDERS).find((k) => {
      const slots = PANEL_PLACEHOLDERS[k];
      return Array.isArray(slots) && slots.filter((s) => s.required !== false).length >= 2;
    });
    expect(key).toBeTruthy();
    const [marketId, panelId] = key.split(':');
    expect(getPanelPlaceholders(marketId, panelId)).toBe(PANEL_PLACEHOLDERS[key]);
  });

  it('returns null for completely unknown panel', () => {
    expect(placeholdersFromFieldMap('nope', 'zzz')).toBeNull();
    expect(getPanelPlaceholders('nope', 'zzz')).toBeNull();
  });

  it('contract paths only — no invented values', () => {
    const slots = placeholdersFromContract('equities', 'heatmap');
    expect(slots?.some((s) => s.path === 'quotes')).toBe(true);
    expect(slots.every((s) => s.path && s.value == null)).toBe(true);
  });
});
