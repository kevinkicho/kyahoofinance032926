import { describe, it, expect } from 'vitest';
import { getSourceAuditState, countSourcesByState } from '../../markets/analytics/AnalyticsMarket';
import { getFieldByPath, describeValue } from '../../markets/analytics/PanelTraceInspector';

describe('Analytics Tab Helpers', () => {
  describe('getSourceAuditState', () => {
    it('identifies received sources', () => {
      const state = getSourceAuditState('/api/bonds', 'US Treasury Yields', true);
      expect(state.kind).toBe('ok');
      expect(state.badge).toBe('✓');
    });

    it('identifies unused fallback markers as optional', () => {
      const state = getSourceAuditState('/api/fx', 'econEventsFallback', false);
      expect(state.kind).toBe('optional');
      expect(state.badge).toBe('-');
      expect(state.status).toContain('Fallback not used');
    });

    it('identifies known optional keys as optional', () => {
      const state = getSourceAuditState('/api/equities', 'yahooFinance', false);
      expect(state.kind).toBe('optional');
      expect(state.badge).toBe('-');
    });

    it('identifies required missing keys as missing', () => {
      const state = getSourceAuditState('/api/bonds', 'US Treasury Yields', false);
      expect(state.kind).toBe('missing');
      expect(state.badge).toBe('✗');
    });
  });

  describe('countSourcesByState', () => {
    it('sums sources correct by state category', () => {
      const row = {
        path: '/api/bonds',
        sourceKeys: ['US Treasury Yields', 'econEventsFallback', 'Breakevens'],
        sources: {
          'US Treasury Yields': true,
          'econEventsFallback': false,
          'Breakevens': false,
        }
      };

      const okCount = countSourcesByState(row, 'ok');
      const optionalCount = countSourcesByState(row, 'optional');
      const missingCount = countSourcesByState(row, 'missing');

      expect(okCount).toBe(1);
      expect(optionalCount).toBe(1);
      expect(missingCount).toBe(1);
    });
  });

  describe('getFieldByPath', () => {
    it('returns values for flat and nested paths', () => {
      const obj = { foo: { bar: 'baz' }, simple: 42 };
      expect(getFieldByPath(obj, 'simple')).toBe(42);
      expect(getFieldByPath(obj, 'foo.bar')).toBe('baz');
      expect(getFieldByPath(obj, 'foo.missing')).toBeUndefined();
      expect(getFieldByPath(null, 'foo')).toBeUndefined();
    });
  });

  describe('describeValue', () => {
    it('correctly categorizes shape description of variables', () => {
      expect(describeValue(null).shape).toBe('null');
      expect(describeValue(undefined).shape).toBe('null');
      expect(describeValue([1, 2, 3]).shape).toBe('array');
      expect(describeValue([1, 2, 3]).count).toBe(3);
      expect(describeValue({ a: 1, b: 2 }).shape).toBe('object');
      expect(describeValue(42).shape).toBe('number');
      expect(describeValue('hello').shape).toBe('string');
    });

    it('identifies objects that contain array properties', () => {
      const complex = { values: [1, 2], labels: ['a', 'b'] };
      const desc = describeValue(complex);
      expect(desc.shape).toBe('object_with_arrays');
      expect(desc.detail).toContain('values[2]');
      expect(desc.detail).toContain('labels[2]');
    });
  });
});
