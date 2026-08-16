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
const { emYieldFromEtfQuote, buildTedSpread } = await import('../routes/credit.js');

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

  it("builds EM countries on the happy path without throwing", async () => {
    cache.readBestAvailableCache.mockResolvedValueOnce(null);
    const yahoo = await import("../lib/yahoo.js");
    yahoo.yf.quote.mockImplementation(async () => ({
      regularMarketPrice: 40,
      regularMarketChangePercent: 0.5,
      trailingAnnualDividendYield: 0.045,
    }));
    const routeHandler = creditRouter.stack.find(s => s.route && s.route.path === "/").route.stack[0].handle;
    const mockCache = { get: vi.fn(() => null), set: vi.fn(), del: vi.fn() };
    const mockReq = { app: { locals: { cache: mockCache } }, query: { refresh: "1" }, headers: {} };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };
    await expect(routeHandler(mockReq, mockRes)).resolves.toBeUndefined();
    expect(mockRes.json).toHaveBeenCalled();
    const resBody = mockRes.json.mock.calls[0][0];
    expect(resBody.emBondData).toBeDefined();
    expect(resBody.emBondData.countries.length).toBeGreaterThan(0);
    expect(resBody._errors && resBody._errors.emBondData).toBeUndefined();
    const withEtf = resBody.emBondData.countries.find(c => c.etfTicker);
    expect(withEtf).toBeDefined();
    expect(withEtf.etfYield).toBe(4.5);
    expect(withEtf.yld10y).toBe(4.5);
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

  describe('buildTedSpread', () => {
    const NOW = new Date('2026-08-04').getTime();

    it('returns null when the last observation is stale (> 30 days)', () => {
      const stale = [
        { date: '2021-02-04', value: 0.10 },
        { date: '2022-01-21', value: 0.09 },
      ];
      expect(buildTedSpread(stale, NOW)).toBeNull();
    });

    it('returns populated payload when the last observation is recent', () => {
      const fresh = [
        { date: '2026-07-01', value: 0.10 },
        { date: '2026-08-03', value: 0.09 },
      ];
      const result = buildTedSpread(fresh, NOW);
      expect(result).not.toBeNull();
      expect(result.dates).toEqual(['2026-07-01', '2026-08-03']);
      expect(result.latest).toBe(0.09);
    });

    it('returns null for empty input', () => {
      expect(buildTedSpread([], NOW)).toBeNull();
      expect(buildTedSpread(null, NOW)).toBeNull();
    });
  });
});
