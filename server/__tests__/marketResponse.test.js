import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/cache.js', () => ({
  readLatestCache: vi.fn(),
  readLatestCacheAsync: vi.fn(),
  todayStr: () => '2026-07-23',
}));

import { readLatestCache, readLatestCacheAsync } from '../lib/cache.js';
import {
  classifyUpstreamError,
  buildDegradedShell,
  sendCachedOrDegradedSync,
  sendCachedOrDegraded,
} from '../lib/marketResponse.js';

function mockRes() {
  const res = {
    headersSent: false,
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      this.headersSent = true;
      return this;
    },
  };
  return res;
}

describe('classifyUpstreamError', () => {
  it('detects rate limits from 429 and message', () => {
    expect(classifyUpstreamError({ statusCode: 429 }).kind).toBe('rate_limit');
    expect(classifyUpstreamError(new Error('HTTP 429 from api.stlouisfed.org')).kind).toBe('rate_limit');
    expect(classifyUpstreamError(new Error('rate limit exceeded')).kind).toBe('rate_limit');
  });

  it('treats FRED-style 403 as forbidden (retryable)', () => {
    const info = classifyUpstreamError(new Error('HTTP 403 from api.stlouisfed.org'));
    expect(info.kind).toBe('forbidden');
    expect(info.retryable).toBe(true);
  });

  it('detects timeouts', () => {
    expect(classifyUpstreamError(new Error('fetchJSON timeout (10000ms)')).kind).toBe('timeout');
  });
});

describe('buildDegradedShell', () => {
  it('returns isLive false and degraded flags', () => {
    const shell = buildDegradedShell('bonds', new Error('HTTP 429'));
    expect(shell.isLive).toBe(false);
    expect(shell.isCurrent).toBe(false);
    expect(shell._degraded).toBe(true);
    expect(shell._rateLimited).toBe(true);
    expect(shell._cacheSource).toBe('degraded_shell');
  });
});

describe('sendCachedOrDegradedSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 with disk cache on rate limit', () => {
    readLatestCache.mockReturnValue({
      data: { yieldCurveData: { '10Y': 4.2 }, lastUpdated: '2026-07-22' },
      fetchedOn: '2026-07-22',
    });
    const res = mockRes();
    sendCachedOrDegradedSync(res, 'bonds', {
      error: new Error('HTTP 429 from api.stlouisfed.org'),
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.isLive).toBe(false);
    expect(res.body.isCurrent).toBe(false);
    expect(res.body._cacheSource).toBe('error_fallback');
    expect(res.body._rateLimited).toBe(true);
    expect(res.body.yieldCurveData['10Y']).toBe(4.2);
  });

  it('marks today disk cache as isCurrent when live refresh fails', () => {
    readLatestCache.mockReturnValue({
      data: { yieldCurveData: { '10Y': 4.63 }, lastUpdated: '2026-07-23' },
      fetchedOn: '2026-07-23',
    });
    const res = mockRes();
    sendCachedOrDegradedSync(res, 'bonds', {
      error: new Error('HTTP 403 from api.stlouisfed.org'),
    });
    expect(res.statusCode).toBe(200);
    expect(res.body.isCurrent).toBe(true);
    expect(res.body.isLive).toBe(false);
    expect(res.body._cacheSource).toBe('today_cache_fallback');
    expect(res.body.fetchedOn).toBe('2026-07-23');
  });

  it('returns 200 degraded shell when no cache exists', () => {
    readLatestCache.mockReturnValue(null);
    const res = mockRes();
    sendCachedOrDegradedSync(res, 'bonds', {
      error: new Error('HTTP 403 from api.stlouisfed.org'),
    });
    expect(res.statusCode).toBe(200);
    expect(res.body._degraded).toBe(true);
    expect(res.body._rateLimited).toBe(true);
    expect(res.body.isLive).toBe(false);
  });

  it('prefers memory cache when disk is empty', () => {
    readLatestCache.mockReturnValue(null);
    const memory = {
      get: vi.fn(() => ({ spotRates: { EUR: 1.08 }, lastUpdated: '2026-07-23' })),
    };
    const res = mockRes();
    sendCachedOrDegradedSync(res, 'fx', {
      error: new Error('timeout'),
      memoryCache: memory,
      cacheKey: 'fx_data',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body._cacheSource).toBe('memory_fallback');
    expect(res.body.spotRates.EUR).toBe(1.08);
  });
});

describe('sendCachedOrDegraded (async)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never uses non-200 status', async () => {
    readLatestCacheAsync.mockResolvedValue(null);
    const res = mockRes();
    await sendCachedOrDegraded(res, 'credit', {
      error: new Error('upstream timeout'),
      async: true,
    });
    expect(res.statusCode).toBe(200);
    expect(res.body._degraded).toBe(true);
  });
});
