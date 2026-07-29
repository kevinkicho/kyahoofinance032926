import { describe, it, expect } from 'vitest';
import {
  asArray,
  safeSlice,
  asNumber,
  asHistory,
  hasHistory,
} from '../utils/panelGuards';

describe('panelGuards', () => {
  it('asArray tolerates null/undefined/objects', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
    expect(asArray({ a: 1 })).toEqual([]);
    expect(asArray([1, 2])).toEqual([1, 2]);
  });

  it('safeSlice never throws on non-arrays', () => {
    expect(safeSlice(null, 0, 2)).toEqual([]);
    expect(safeSlice([1, 2, 3, 4], 0, 2)).toEqual([1, 2]);
  });

  it('asNumber returns null for non-finite', () => {
    expect(asNumber(3.5)).toBe(3.5);
    expect(asNumber('2.1')).toBe(2.1);
    expect(asNumber(null)).toBe(null);
    expect(asNumber('x')).toBe(null);
    expect(asNumber(NaN)).toBe(null);
  });

  it('asHistory normalizes missing series', () => {
    expect(asHistory(null).dates).toEqual([]);
    expect(asHistory({ dates: ['a'], values: [1] }).dates).toEqual(['a']);
  });

  it('hasHistory detects usable series', () => {
    expect(hasHistory(null)).toBe(false);
    expect(hasHistory({ dates: ['2020'], values: [1] })).toBe(true);
    expect(hasHistory([1, 2], 2)).toBe(true);
  });
});
