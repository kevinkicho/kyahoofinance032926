import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AnalyticsMarket from '../../markets/analytics/AnalyticsMarket.jsx';

const mockAnalyticsData = {
  endpoints: [],
  apiUsage: { sources: [] },
  environment: {},
  uptime: { seconds: 100 },
  memCache: { keyCount: 0, hitRate: 0 },
  routes: [],
};

describe('ProvenanceAudit Integration in AnalyticsMarket', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch').mockImplementation((url) => {
      // Mock the initial analytics mount call
      if (url.includes('marketSnapshots/analytics/latest.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: mockAnalyticsData }),
        });
      }
      if (url.includes('/api/admin/diagnostics-report')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockAnalyticsData,
        });
      }
      
      // Mock individual market snapshots
      if (url.includes('marketSnapshots/bonds/latest.json')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              _sources: {
                'US Treasury Yields': true,
                'Breakevens': false, // required missing
                'econEventsFallback': false, // optional (ends with Fallback)
              }
            },
            fetchedAt: '2026-06-24T12:00:00Z',
          }),
        });
      }

      // Mock FRED verification URL
      if (url.includes('/api/fred/observations')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            observations: [
              { value: '4.25', date: '2026-06-24' }
            ]
          }),
        });
      }

      // Mock other snapshots as empty
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: {} }),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initially shows the empty state for the audit', async () => {
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getByText(/Click audit button to analyze provenance/i)).toBeInTheDocument();
    });
  });

  it('runs the provenance audit and displays results', async () => {
    render(<AnalyticsMarket />);
    await waitFor(() => {
      expect(screen.getByText(/Run Audit/i)).toBeInTheDocument();
    });

    const runAuditBtn = screen.getByRole('button', { name: /Run Audit/i });
    await userEvent.click(runAuditBtn);

    // Wait for the audit summary to show expected counts
    await waitFor(() => {
      // For bonds: we mocked 3 sources: 1 ok ('US Treasury Yields'), 1 optional ('econEventsFallback'), 1 missing ('Breakevens')
      // All other endpoints will return empty data (0 sources)
      expect(screen.getByText(/3 sources · 1 received · 1 optional · 1 missing/i)).toBeInTheDocument();
    });

    // Check that it shows Bonds endpoint status
    expect(screen.getByText('Bonds', { selector: '.ana-prov-market-label' })).toBeInTheDocument();
    expect(screen.getByText(/1 received/, { selector: '.ana-prov-stat' })).toBeInTheDocument();
    expect(screen.getByText(/1 optional/, { selector: '.ana-prov-optional-note' })).toBeInTheDocument();
    expect(screen.getByText(/1 required missing/, { selector: '.ana-prov-required-missing' })).toBeInTheDocument();

    // Expand the 'US Treasury Yields' source row
    const sourceRow = screen.getByText('US Treasury Yields');
    await userEvent.click(sourceRow);

    // Verify detail is shown
    expect(screen.getByText(/Click "Verify" on FRED series below/i)).toBeInTheDocument();

    // Look for a mapped FRED series, e.g. DGS3MO
    expect(screen.getByText('DGS3MO')).toBeInTheDocument();

    // Click verify on DGS3MO
    const verifyButtons = screen.getAllByRole('button', { name: 'Verify' });
    // DGS3MO is the first one
    await userEvent.click(verifyButtons[0]);

    // Check that it displays the fetched observation value
    await waitFor(() => {
      expect(screen.getByText(/FRED: 4.25 \(2026-06-24, 1 obs\)/i)).toBeInTheDocument();
    });
  });
});
