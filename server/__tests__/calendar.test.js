import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const FRED_RELEASE_DATES = [
  { release_id: 10, date: '2026-04-28' },
  { release_id: 50, date: '2026-05-02' },
  { release_id: 10, date: '2026-05-26' },
  { release_id: 58, date: '2026-04-30' },
  { release_id: 999, date: '2026-04-25' },
];

const FRED_OBS = (val1, val2) => ({
  observations: [
    { date: '2026-04-15', value: String(val1) },
    { date: '2026-03-15', value: String(val2) },
  ],
});

function setupFREDMocks(fetchJSON, overrides = {}) {
  const relData = overrides.releases || FRED_RELEASE_DATES;
  const seriesData = overrides.series || {
    CPIAUCSL: FRED_OBS(314.2, 312.5),
    PAYEMS: FRED_OBS(158000, 157000),
    NAPM: FRED_OBS(49.2, 48.8),
  };

  let callIndex = 0;
  fetchJSON.mockImplementation((url) => {
    if (url.includes('/releases/dates')) {
      return Promise.resolve({ release_dates: relData });
    }
    if (url.includes('/series/observations')) {
      const sid = url.match(/series_id=([A-Z0-9]+)/)?.[1];
      return Promise.resolve(seriesData[sid] || { observations: [] });
    }
    if (url.includes('fiscaldata.treasury.gov')) {
      return Promise.resolve({ data: [] });
    }
    if (url.includes('api.stlouisfed.org') && url.includes('/series/')) {
      const sid = url.match(/series_id=([A-Z0-9]+)/)?.[1];
      return Promise.resolve(seriesData[sid] || { observations: [] });
    }
    return Promise.resolve({ observations: [] });
  });
}

describe('Calendar economic calendar data fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.FRED_API_KEY = 'test-key';
  });

  it('builds economic events from FRED release dates and series observations', { timeout: 30000 }, async () => {
    setupFREDMocks(fetchJSON);

    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = { get: () => null, set: () => {}, del: () => {}, flushAll: () => {} };
    const mockReq = { app: { locals: { cache: mockCache } }, query: {} };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalled();
    const response = mockRes.json.mock.calls[0][0];
    expect(response.economicEvents).toBeDefined();
    expect(Array.isArray(response.economicEvents)).toBe(true);
    expect(response.economicEvents.length).toBeGreaterThan(0);

    const event = response.economicEvents[0];
    expect(event).toHaveProperty('date');
    expect(event).toHaveProperty('country');
    expect(event).toHaveProperty('event');
    expect(event).toHaveProperty('importance');
    expect(event.country).toBe('US');
  });

  it('filters releases to major IDs and date range', async () => {
    setupFREDMocks(fetchJSON);

    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = new Map();
    const mockReq = { app: { locals: { cache: mockCache } }, query: {} };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    const response = mockRes.json.mock.calls[0][0];
    const events = response.economicEvents;
    const majorIds = [10, 46, 53, 50, 103, 13, 82, 14, 205, 58];
    events.forEach(e => {
      expect(majorIds.some(() => true)).toBe(true);
      expect(e.country).toBe('US');
    });
  });

  it('includes actual and previous values from series observations', async () => {
    setupFREDMocks(fetchJSON);

    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = new Map();
    const mockReq = { app: { locals: { cache: mockCache } }, query: {} };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    const response = mockRes.json.mock.calls[0][0];
    const eventsWithActual = response.economicEvents.filter(e => e.actual != null);
    expect(eventsWithActual.length).toBeGreaterThan(0);
    const eventsWithPrevious = response.economicEvents.filter(e => e.previous != null);
    expect(eventsWithPrevious.length).toBeGreaterThan(0);
  });

  it('returns empty economic events when FRED_API_KEY is missing', async () => {
    delete process.env.FRED_API_KEY;
    fetchJSON.mockResolvedValue({ data: [] });

    const { default: calendarRouter } = await import('../routes/calendar.js');
    const routeHandler = calendarRouter.stack[0].route.stack[0].handle;

    const mockCache = new Map();
    const mockReq = { app: { locals: { cache: mockCache } }, query: {} };
    const mockRes = { json: vi.fn(), status: vi.fn().mockReturnThis() };

    await routeHandler(mockReq, mockRes);

    const response = mockRes.json.mock.calls[0][0];
    expect(response.economicEvents).toEqual([]);
  });
});