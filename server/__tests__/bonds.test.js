import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/fetch.js', () => ({
  fetchJSON: vi.fn(),
}));

vi.mock('../lib/cache.js', () => ({
  readDailyCacheAsync: vi.fn(() => Promise.resolve(null)),
  writeDailyCacheAsync: vi.fn(() => Promise.resolve()),
  readLatestCacheAsync: vi.fn(() => Promise.resolve(null)),
  readLatestCacheWithFieldAsync: vi.fn(() => Promise.resolve(null)),
  todayStr: vi.fn(() => '2026-04-22'),
}));

vi.mock('../lib/rateLimits.js', () => ({
  trackApiCall: vi.fn(),
}));

vi.mock('../lib/fred.js', () => ({
  fetchFredHistory: vi.fn(() => Promise.resolve([])),
  fetchFredLatest: vi.fn(() => Promise.resolve(null)),
}));

const { fetchJSON } = await import('../lib/fetch.js');
const cache = await import('../lib/cache.js');
const rateLimits = await import('../lib/rateLimits.js');
const { default: bondsRouter } = await import('../routes/bonds.js');

describe('Bonds Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRED_API_KEY = 'test-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves from daily cache if present', async () => {
    const mockDaily = {
      yieldCurveData: { US: { dates: ['2026-04-21'], values: [4.2] } },
      lastUpdated: '2026-04-22',
    };
    cache.readDailyCacheAsync.mockResolvedValueOnce(mockDaily);

    const routeHandler = bondsRouter.stack.find(s => s.route?.path === '/').route.stack[0].handle;

    const mockCache = { get: vi.fn(), set: vi.fn() };
    const mockReq = { app: { locals: { cache: mockCache } } };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    expect(cache.readDailyCacheAsync).toHaveBeenCalledWith('bonds');
    expect(mockRes.json).toHaveBeenCalled();
    const resBody = mockRes.json.mock.calls[0][0];
    expect(resBody.yieldCurveData).toBeDefined();
    expect(resBody.isCurrent).toBe(true);
  });

  it('uses latest cache fallback when API calls fail', async () => {
    cache.readDailyCacheAsync.mockResolvedValueOnce(null);
    rateLimits.trackApiCall.mockImplementationOnce(() => {
      throw new Error('Trigger fallback path');
    });
    const mockFallback = {
      data: { yieldCurveData: { US: { dates: ['2026-04-20'], values: [4.1] } } },
      fetchedOn: '2026-04-20',
    };
    cache.readLatestCacheAsync.mockResolvedValueOnce(mockFallback);

    const routeHandler = bondsRouter.stack.find(s => s.route?.path === '/').route.stack[0].handle;

    const mockCache = { get: vi.fn(() => null), set: vi.fn() };
    const mockReq = { app: { locals: { cache: mockCache } } };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    expect(cache.readLatestCacheAsync).toHaveBeenCalledWith('bonds');
    expect(mockRes.json).toHaveBeenCalled();
    const resBody = mockRes.json.mock.calls[0][0];
    expect(resBody.yieldCurveData).toBeDefined();
    expect(resBody.isLive).toBe(false);
  });
});
