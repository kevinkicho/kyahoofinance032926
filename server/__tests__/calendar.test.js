import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/fetch.js', () => ({
  fetchJSON: vi.fn(),
}));

vi.mock('../lib/cache.js', () => ({
  readDailyCache: vi.fn(() => null),
  writeDailyCache: vi.fn(),
  readLatestCache: vi.fn(() => null),
  todayStr: vi.fn(() => '2026-04-22'),
}));

vi.mock('../lib/rateLimits.js', () => ({
  trackApiCall: vi.fn(),
}));

vi.mock('../lib/yahoo.js', () => ({
  yf: {
    quoteSummary: vi.fn().mockResolvedValue({}),
  },
}));

const { fetchJSON } = await import('../lib/fetch.js');

describe('Calendar economic calendar data fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('transforms econdb API response to economic events format', async () => {
    const mockEvents = [
      { date: '2026-04-22T09:00:00Z', country: 'US', event: 'CPI', importance: 2, actual: '3.4', consensus: '3.5', previous: '3.6' },
      { date: '2026-04-23T12:00:00Z', country: 'EU', event: 'ECB Rate Decision', importance: 3, actual: '2.65', consensus: '2.65', previous: '2.90' },
      { date: '2026-04-25T08:30:00Z', country: 'GB', event: 'GDP', importance: 1, actual: '2.1', consensus: '2.2', previous: '2.3' },
    ];

    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = new Map();
    const mockReq = {
      app: { locals: { cache: mockCache } },
      query: {},
    };

    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };

    fetchJSON
      .mockResolvedValueOnce(mockEvents)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce([]);

    await routeHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const response = mockRes.json.mock.calls[0][0];
    expect(response.economicEvents).toBeDefined();
    expect(Array.isArray(response.economicEvents)).toBe(true);
    expect(response.economicEvents.length).toBe(2);
  });

  it('handles malformed econdb API response with missing fields', async () => {
    const malformedEvents = [
      { date: null, country: null, event: 'Test', importance: 'high' },
      { notValid: 'event' },
    ];

    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = new Map();
    const mockReq = {
      app: { locals: { cache: mockCache } },
      query: {},
    };

    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };

    fetchJSON
      .mockResolvedValueOnce(malformedEvents)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce([]);

    await routeHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const response = mockRes.json.mock.calls[0][0];
    expect(response.economicEvents).toBeDefined();
  });

  it('handles empty econdb response', async () => {
    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = new Map();
    const mockReq = {
      app: { locals: { cache: mockCache } },
      query: {},
    };

    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };

    fetchJSON
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce([]);

    await routeHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const response = mockRes.json.mock.calls[0][0];
    expect(response.economicEvents).toEqual([]);
  });

  it('handles econdb response in results format', async () => {
    const resultsFormatEvents = {
      results: [
        { date: '2026-04-22T09:00:00Z', iso: 'US', indicator: 'CPI', importance: 2, actual: '3.4' },
        { date: '2026-04-23T09:00:00Z', iso: 'EU', indicator: 'GDP', importance: 3, actual: '1.5' },
      ]
    };

    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = new Map();
    const mockReq = {
      app: { locals: { cache: mockCache } },
      query: {},
    };

    const mockRes = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };

    fetchJSON
      .mockResolvedValueOnce(resultsFormatEvents)
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce([]);

    await routeHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const response = mockRes.json.mock.calls[0][0];
    expect(response.economicEvents).toBeDefined();
  });
});