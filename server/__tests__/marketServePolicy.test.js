import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getMarketServeMode,
  resolveMarketServePolicy,
  shouldPersistLiveResult,
} from '../lib/marketServePolicy.js';

describe('marketServePolicy', () => {
  const prev = process.env.MARKET_SERVE_MODE;
  const prevOnly = process.env.MARKET_CACHE_ONLY;

  afterEach(() => {
    if (prev === undefined) delete process.env.MARKET_SERVE_MODE;
    else process.env.MARKET_SERVE_MODE = prev;
    if (prevOnly === undefined) delete process.env.MARKET_CACHE_ONLY;
    else process.env.MARKET_CACHE_ONLY = prevOnly;
  });

  it('defaults to cache_bootstrap', () => {
    delete process.env.MARKET_SERVE_MODE;
    expect(getMarketServeMode()).toBe('cache_bootstrap');
  });

  it('normal GET allows upstream only on miss (bootstrap)', () => {
    delete process.env.MARKET_SERVE_MODE;
    const p = resolveMarketServePolicy({ query: {}, headers: {} });
    expect(p.forceRefresh).toBe(false);
    expect(p.allowUpstream).toBe(true);
    expect(p.reason).toBe('bootstrap_on_miss');
  });

  it('cache mode never allows upstream without refresh', () => {
    process.env.MARKET_SERVE_MODE = 'cache';
    const p = resolveMarketServePolicy({ query: {}, headers: {} });
    expect(p.allowUpstream).toBe(false);
    expect(p.reason).toBe('serve_mode_cache');
  });

  it('force refresh allows upstream', () => {
    process.env.MARKET_SERVE_MODE = 'cache';
    const p = resolveMarketServePolicy({ query: { refresh: 'true' }, headers: {} });
    expect(p.forceRefresh).toBe(true);
    expect(p.allowUpstream).toBe(true);
  });

  it('X-Cache-Bypass forces refresh', () => {
    const p = resolveMarketServePolicy({
      query: {},
      headers: { 'x-cache-bypass': '1' },
      skipCache: true,
    });
    expect(p.forceRefresh).toBe(true);
    expect(p.allowUpstream).toBe(true);
  });

  it('cacheOnly blocks upstream even in bootstrap mode', () => {
    delete process.env.MARKET_SERVE_MODE;
    const p = resolveMarketServePolicy({ query: { cacheOnly: '1' }, headers: {} });
    expect(p.allowUpstream).toBe(false);
    expect(p.reason).toBe('cache_only_request');
  });

  it('shouldPersistLiveResult rejects hollow', () => {
    expect(shouldPersistLiveResult('bonds', { a: 1 }, () => true)).toBe(false);
    expect(shouldPersistLiveResult('bonds', { a: 1 }, () => false)).toBe(true);
    expect(shouldPersistLiveResult('bonds', null, () => false)).toBe(false);
  });
});
