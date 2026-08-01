/**
 * Regression: BentoWrapper empty shells for every panel.
 * Nested React keys (".0:$kpi") failed to match layout i ("kpi").
 */
import { describe, it, expect } from 'vitest';
import { normalizeLayoutKey } from '../../lib/bentoLayoutKeys';

describe('normalizeLayoutKey (layout ↔ child matching)', () => {
  it('passes plain panel ids through', () => {
    expect(normalizeLayoutKey('kpi')).toBe('kpi');
    expect(normalizeLayoutKey('foreign-holders')).toBe('foreign-holders');
    expect(normalizeLayoutKey('ecb-yields')).toBe('ecb-yields');
  });

  it('strips React.Children ".$id" prefix', () => {
    expect(normalizeLayoutKey('.$kpi')).toBe('kpi');
    expect(normalizeLayoutKey('.$yield')).toBe('yield');
  });

  it('strips nested map index prefixes (.0:$id) — the empty-shell bug', () => {
    expect(normalizeLayoutKey('.0:$kpi')).toBe('kpi');
    expect(normalizeLayoutKey('.0:$foreign-holders')).toBe('foreign-holders');
    expect(normalizeLayoutKey('.$0:$metrics')).toBe('metrics');
    expect(normalizeLayoutKey('.12:$vixterm')).toBe('vixterm');
  });

  it('strips bare $ prefix used by some extras', () => {
    expect(normalizeLayoutKey('$cross-alerts')).toBe('cross-alerts');
    expect(normalizeLayoutKey('$factor-rankings')).toBe('factor-rankings');
  });

  it('handles nullish without throwing', () => {
    // Implementation uses `i ?? ''` then String — null/undefined → empty key.
    expect(normalizeLayoutKey(null)).toBe('');
    expect(normalizeLayoutKey(undefined)).toBe('');
    expect(normalizeLayoutKey('')).toBe('');
  });

  it('layout keys and child keys match after normalize (round-trip contract)', () => {
    const layoutIds = ['kpi', 'yield', 'metrics', 'foreign-holders', 'ecb-yields'];
    const childKeys = layoutIds.flatMap((id) => [id, `.$${id}`, `.0:$${id}`, `.$0:$${id}`]);
    for (const ck of childKeys) {
      const n = normalizeLayoutKey(ck);
      expect(layoutIds).toContain(n);
    }
  });
});
