import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// The panel-trace route (GET /api/analytics/panel-trace/:market) fetches the
// live market endpoint back into the server via global fetch(). We mock
// fetch to return a controlled market payload and assert that the trace
// forwards _errors / _errorKind / _rateLimited and per-panel error strings.

vi.mock('../lib/cache.js', () => ({
  readLatestCache: vi.fn(() => null),
  todayStr: vi.fn(() => '2026-08-02'),
  CACHE_DIR: '/tmp/test-cache',
}));

vi.mock('../lib/rateLimits.js', () => ({
  getApiCounts: vi.fn(() => ({ date: '2026-08-02', calls: {} })),
  KNOWN_LIMITS: { 'Yahoo Finance': 2000 },
}));

const analyticsRouter = (await import('../routes/analytics.js')).default;

function findRoute(path) {
  const layer = analyticsRouter.stack.find(
    (s) => s.route?.path === path && s.route.methods.get
  );
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe('GET /api/analytics/panel-trace/:market', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  function mockFetch(jsonBody, status = 200) {
    global.fetch = vi.fn(async () => ({
      status,
      json: async () => jsonBody,
    }));
  }

  function mockReq(market) {
    return {
      params: { market },
      socket: { localAddress: '127.0.0.1', localPort: 3001 },
      app: { locals: {} },
    };
  }

  function mockRes() {
    return { json: vi.fn(), status: vi.fn().mockReturnThis() };
  }

  it('forwards _errors, _errorKind, _rateLimited, and per-panel error', async () => {
    mockFetch({
      isLive: false,
      isCurrent: false,
      fetchedOn: '2026-08-01',
      lastUpdated: '2026-08-01',
      realYieldHistory: null,
      yieldCurveData: { US: { dates: ['2026-08-01'], values: [4.2] } },
      _sources: { realYieldHistory: false, yieldCurveData: true },
      _errors: {
        realYieldHistory: 'FRED DFII5 returned HTTP 400: series does not exist',
      },
      _errorKind: 'upstream_5xx',
      _rateLimited: false,
    });

    const handler = findRoute('/panel-trace/:market');
    const res = mockRes();
    await handler(mockReq('bonds'), res);

    expect(res.json).toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];

    // Top-level forwarded fields.
    expect(body.errorKind).toBe('upstream_5xx');
    expect(body.rateLimited).toBe(false);
    expect(body.errors).toEqual({
      realYieldHistory: 'FRED DFII5 returned HTTP 400: series does not exist',
    });

    // Per-panel error surfaced on the null field's panel entry.
    const realYieldPanel = body.panels.find((p) => p.field === 'realYieldHistory');
    expect(realYieldPanel).toBeDefined();
    expect(realYieldPanel.isNull).toBe(true);
    expect(realYieldPanel.error).toBe(
      'FRED DFII5 returned HTTP 400: series does not exist'
    );

    // The populated field has no error and is not null.
    const yieldPanel = body.panels.find((p) => p.field === 'yieldCurveData');
    expect(yieldPanel.isNull).toBe(false);
    expect(yieldPanel.error).toBeNull();

    // nullFields aggregates the null panels.
    expect(body.nullFields).toContain('realYieldHistory');
  });

  it('returns 400 for an unknown market', async () => {
    const handler = findRoute('/panel-trace/:market');
    const res = mockRes();
    await handler(mockReq('not-a-market'), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('No endpoint') })
    );
  });

  it('handles upstream fetch failure gracefully', async () => {
    global.fetch = vi.fn(async () => {
      throw new Error('ECONNREFUSED');
    });

    const handler = findRoute('/panel-trace/:market');
    const res = mockRes();
    await handler(mockReq('bonds'), res);

    expect(res.json).toHaveBeenCalled();
    const body = res.json.mock.calls[0][0];
    expect(body.error).toBe('ECONNREFUSED');
    expect(body.panels).toEqual([]);
  });
});