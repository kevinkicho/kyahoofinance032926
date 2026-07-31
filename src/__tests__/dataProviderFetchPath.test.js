import { describe, it, expect } from 'vitest';
import {
  buildMarketFetchPath,
  buildWaveMarketIds,
  marketHasUsableData,
  MARKET_ENDPOINTS,
} from '../hub/DataProvider';

describe('buildMarketFetchPath', () => {
  it('returns null for unknown market', () => {
    expect(buildMarketFetchPath('not-a-market')).toBeNull();
  });

  it('returns plain path for cache-first (no refresh)', () => {
    const path = buildMarketFetchPath('bonds', { forceLive: false });
    expect(path).toBe(MARKET_ENDPOINTS.bonds);
    expect(path).not.toMatch(/refresh=/);
  });

  it('appends refresh=true for force-live', () => {
    const path = buildMarketFetchPath('bonds', { forceLive: true });
    expect(path).toContain(MARKET_ENDPOINTS.bonds);
    expect(path).toMatch(/[?&]refresh=true/);
  });

  it('merges custom params with refresh', () => {
    const path = buildMarketFetchPath('watchlist', {
      forceLive: true,
      params: { tickers: 'AAPL,MSFT' },
    });
    expect(path).toMatch(/tickers=AAPL%2CMSFT|tickers=AAPL,MSFT/);
    expect(path).toMatch(/refresh=true/);
  });

  it('does not produce double ??', () => {
    const path = buildMarketFetchPath('bonds', { forceLive: true, params: { x: '1' } });
    expect(path).not.toMatch(/\?\?/);
    expect((path.match(/\?/g) || []).length).toBe(1);
  });
});

describe('buildWaveMarketIds', () => {
  it('includes every MARKET_ENDPOINTS key exactly once', () => {
    const ids = buildWaveMarketIds();
    const endpointIds = Object.keys(MARKET_ENDPOINTS);
    for (const id of endpointIds) {
      expect(ids).toContain(id);
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('puts primary tab markets first', () => {
    const ids = buildWaveMarketIds();
    // equities / bonds are core tab markets when registered
    if (MARKET_ENDPOINTS.equities) {
      expect(ids.indexOf('equities')).toBeLessThan(ids.indexOf('ecb') >= 0 ? ids.indexOf('ecb') : ids.length);
    }
    if (MARKET_ENDPOINTS.bonds && MARKET_ENDPOINTS.treasuryTIC) {
      expect(ids.indexOf('bonds')).toBeLessThan(ids.indexOf('treasuryTIC'));
    }
  });
});

describe('marketHasUsableData', () => {
  it('false for missing entry or empty payload', () => {
    expect(marketHasUsableData(null, 'bonds')).toBe(false);
    expect(marketHasUsableData({}, 'bonds')).toBe(false);
    expect(marketHasUsableData({ data: null }, 'bonds')).toBe(false);
    expect(marketHasUsableData({ data: {} }, 'bonds')).toBe(false);
  });

  it('true when payload has real fields', () => {
    expect(marketHasUsableData({ data: { yieldCurveData: { US: { '10y': 4 } } } }, 'bonds')).toBe(true);
  });
});
