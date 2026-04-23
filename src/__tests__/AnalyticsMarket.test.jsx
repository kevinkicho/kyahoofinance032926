import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AnalyticsMarket from '../markets/analytics/AnalyticsMarket.jsx';

vi.spyOn(global, 'fetch');

const mockAnalyticsData = {
  endpoints: [
    { path: '/api/fx', calls: 150, avgMs: 45, p50Ms: 40, maxMs: 200, errors: 2, errorPct: 1.3, minMs: 20, lastCalled: '2024-03-15T10:30:00Z' },
  ],
  apiUsage: {
    totalExternalCalls: 450,
    sources: [
      { name: 'FRED', used: 180, limit: 200, pct: 90, remaining: 20 },
      { name: 'Yahoo', used: 150, limit: 500, pct: 30, remaining: 350 },
    ],
  },
  environment: { pid: 12345, nodeVersion: 'v20.10.0', platform: 'win32', arch: 'x64', cpus: 8, freeMemGB: 8, totalMemGB: 16, env: 'production', hostname: 'test-host' },
  uptime: { seconds: 172800, memoryMB: 45, heapTotalMB: 128, rssMB: 80, externalMB: 12 },
  memCache: { keyCount: 50, hitRate: 85, hits: 425, misses: 75, keys: ['fx_data', 'bonds_data'] },
  dataFreshness: {
    currentCount: 8,
    markets: [
      { market: 'fx', fetchedOn: '2024-03-15', ageHours: 2, fileSizeKB: 125, keyCount: 15, isCurrent: true, hasFileCache: true, hasMemCache: true },
    ],
  },
  errorLog: [],
  cacheFiles: { count: 3, totalSizeKB: 500, files: ['fx_20240315.json', 'bonds_20240315.json'] },
  routes: [{ methods: ['GET', 'POST'], path: '/api/fx' }],
};

describe('AnalyticsMarket API usage metrics', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => mockAnalyticsData,
      text: async () => JSON.stringify(mockAnalyticsData),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders analytics market successfully', async () => {
    render(<AnalyticsMarket />);

    await waitFor(() => {
      expect(screen.getByText('● Analytics')).toBeInTheDocument();
    });
  });

  it('displays uptime stats', async () => {
    render(<AnalyticsMarket />);

    await waitFor(() => {
      expect(screen.getAllByText(/Uptime/i).length).toBeGreaterThan(0);
    });
  });

  it('shows heap memory stats', async () => {
    render(<AnalyticsMarket />);

    await waitFor(() => {
      expect(screen.getAllByText(/Heap/i).length).toBeGreaterThan(0);
    });
  });

  it('displays server info', async () => {
    render(<AnalyticsMarket />);

    await waitFor(() => {
      expect(screen.getByText('PID 12345')).toBeInTheDocument();
    });
  });
});