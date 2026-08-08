import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/fetch.js', () => ({
  fetchJSON: vi.fn(),
}));

vi.mock('../lib/cache.js', () => ({
  readDailyCacheAsync: vi.fn(() => Promise.resolve(null)),
  readBestAvailableCache: vi.fn(() => Promise.resolve(null)),
  withCacheProvenance: vi.fn((data, meta = {}) => ({
    ...data,
    fetchedOn: meta.fetchedOn || '2026-04-22',
    isCurrent: meta.isCurrent !== false,
    isStale: !!meta.isStale,
    isLive: !!meta.isLive,
    _cacheSource: meta.source || 'cache',
  })),
  writeDailyCacheAsync: vi.fn(() => Promise.resolve()),
  mergeWithPreviousCache: vi.fn((_m, data) => data),
  readLatestCacheAsync: vi.fn(() => Promise.resolve(null)),
  isStructurallyHollow: vi.fn(() => false),
  todayStr: vi.fn(() => '2026-04-22'),
}));

vi.mock('../lib/rateLimits.js', () => ({
  trackApiCall: vi.fn(),
}));

vi.mock('../lib/yahoo.js', () => ({
  yf: {
    quote: vi.fn(() => Promise.resolve([])),
  },
}));

vi.mock('../lib/fred.js', () => ({
  fetchFredHistory: vi.fn(() => Promise.resolve([])),
  fetchFredLatest: vi.fn(() => Promise.resolve(null)),
}));

const { fetchJSON } = await import('../lib/fetch.js');
const cache = await import('../lib/cache.js');
const { default: creditRouter } = await import('../routes/credit.js');
const { emYieldFromEtfQuote } = await import('../routes/credit.js');

describe('Credit Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRED_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves from daily cache if present', async () => {
    const mockDaily = {
      creditQuality: { IG: { spread: 1.2 } },
      lastUpdated: '2026-04-22',
    };
    cache.readBestAvailableCache.mockResolvedValueOnce({
      data: mockDaily,
      fetchedOn: '2026-04-22',
      isCurrent: true,
      isStale: false,
      source: 'daily_file',
    });

    const routeHandler = creditRouter.stack.find(s => s.route?.path === '/').route.stack[0].handle;

    const mockCache = { get: vi.fn(), set: vi.fn() };
    const mockReq = { app: { locals: { cache: mockCache } } };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    expect(cache.readBestAvailableCache).toHaveBeenCalledWith('credit');
    expect(mockRes.json).toHaveBeenCalled();
    const resBody = mockRes.json.mock.calls[0][0];
    expect(resBody.creditQuality).toBeDefined();
    expect(resBody.isCurrent).toBe(true);
  });

  it('uses latest cache fallback when API calls fail', async () => {
    cache.readBestAvailableCache.mockResolvedValueOnce(null);
    cache.writeDailyCacheAsync.mockRejectedValueOnce(new Error('Trigger fallback path'));
    const mockFallback = {
      data: { creditQuality: { IG: { spread: 1.3 } } },
      fetchedOn: '2026-04-20',
    };
    cache.readLatestCacheAsync.mockResolvedValueOnce(mockFallback);

    const routeHandler = creditRouter.stack.find(s => s.route?.path === '/').route.stack[0].handle;

    const mockCache = { get: vi.fn(() => null), set: vi.fn() };
    const mockReq = { app: { locals: { cache: mockCache } } };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    expect(cache.readLatestCacheAsync).toHaveBeenCalledWith('credit');
    expect(mockRes.json).toHaveBeenCalled();
    const resBody = mockRes.json.mock.calls[0][0];
    expect(resBody.creditQuality).toBeDefined();
    expect(resBody.isCurrent).toBe(false);
  });

  describe('emYieldFromEtfQuote', () => {
    it('returns null when trailing dividend yield is zero (no real yield)', () => {
      expect(emYieldFromEtfQuote({ trailingAnnualDividendYield: 0 })).toBeNull();
      expect(emYieldFromEtfQuote({ trailingAnnualDividendYield: null })).toBeNull();
      expect(emYieldFromEtfQuote({})).toBeNull();
      expect(emYieldFromEtfQuote(null)).toBeNull();
    });

    it('returns percent when dividend yield is positive', () => {
      expect(emYieldFromEtfQuote({ trailingAnnualDividendYield: 0.045 })).toBe(4.5);
      expect(emYieldFromEtfQuote({ trailingAnnualDividendYield: 0.03 })).toBe(3);
    });
  });
});
