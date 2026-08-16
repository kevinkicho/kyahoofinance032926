import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsMarket from '../../markets/analytics/AnalyticsMarket';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function jsonResponse(data) {
  return {
    ok: true,
    text: async () => JSON.stringify(data),
    json: async () => data,
  };
}

describe('AnalyticsMarket', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<AnalyticsMarket />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('renders error state for non-OK responses', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
      text: async () => '{"error":"Not Found"}',
      json: async () => ({ error: 'Not Found' }),
    });
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
    });
  });

  it('mounts Data Quality Score and Panel Visibility Audit as catalog panels', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      endpoints: [], apiUsage: { sources: [] }, environment: {},
      uptime: { seconds: 100 }, memCache: { keyCount: 0, hitRate: 0 }, routes: [],
      dataFreshness: { markets: [{ market: 'bonds', isCurrent: true, fetchedOn: '2026-08-16', keyCount: 8 }] },
    }));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getByText('Data Quality Score')).toBeInTheDocument();
      expect(screen.getByText('Panel Visibility Audit')).toBeInTheDocument();
    });
    expect(document.querySelector('[data-panel-key="data-quality"]')).toBeTruthy();
    expect(document.querySelector('[data-panel-key="visibility-audit"]')).toBeTruthy();
  });

  it('renders analytics dashboard with data', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      endpoints: [
        { path: '/api/bonds', calls: 150, errors: 2 },
        { path: '/api/fx', calls: 120, errors: 0 },
      ],
      apiUsage: { sources: [{ name: 'FRED', calls: 500, pct: 50 }] },
      environment: { NODE_ENV: 'test' },
      uptime: { seconds: 3600, memoryMB: 45, heapTotalMB: 30, rssMB: 50 },
      memCache: { keyCount: 100, hitRate: 85 },
      routes: [{ path: '/api/bonds', methods: ['GET'] }],
    }));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getByText(/● Analytics/)).toBeInTheDocument();
    });
  });

  it('renders uptime information from data', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      endpoints: [], apiUsage: { sources: [] }, environment: {},
      uptime: { seconds: 7200 },
      memCache: { keyCount: 0, hitRate: 0 },
      routes: [],
    }));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getAllByText(/Uptime/).length).toBeGreaterThan(0);
    });
  });

  it('renders memory information from data', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      endpoints: [], apiUsage: { sources: [] }, environment: {},
      uptime: { seconds: 100, memoryMB: 50, heapTotalMB: 40, rssMB: 60 },
      memCache: { keyCount: 0, hitRate: 0 },
      routes: [],
    }));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getAllByText(/Heap/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/RSS/).length).toBeGreaterThan(0);
    });
  });

  it('renders MemCache information with hit rate', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      endpoints: [], apiUsage: { sources: [] }, environment: {},
      uptime: { seconds: 100 },
      memCache: { keyCount: 200, hitRate: 92 },
      routes: [],
    }));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getAllByText(/MemCache/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/92% hit/).length).toBeGreaterThan(0);
    });
  });

  it('renders endpoint list sorted by calls', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      endpoints: [
        { path: '/api/bonds', calls: 100, errors: 5 },
        { path: '/api/fx', calls: 200, errors: 0 },
        { path: '/api/derivatives', calls: 50, errors: 1 },
      ],
      apiUsage: { sources: [] },
      environment: {},
      uptime: { seconds: 100 },
      memCache: { keyCount: 50, hitRate: 90 },
      routes: [],
    }));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getAllByText(/api\/fx/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/api\/bonds/).length).toBeGreaterThan(0);
    });
  });

  it('renders manual refresh button (no auto-refresh)', async () => {
    mockFetch.mockResolvedValue(jsonResponse({
      endpoints: [], apiUsage: { sources: [] }, environment: {},
      uptime: { seconds: 100 }, memCache: { keyCount: 0, hitRate: 0 }, routes: [],
    }));
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getByText(/Refresh/i)).toBeInTheDocument();
    });
    expect(screen.queryByText('Auto-refresh')).toBeNull();
    expect(screen.queryByText('Auto 30s')).toBeNull();
  });
});
