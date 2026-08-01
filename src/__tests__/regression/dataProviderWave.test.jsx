/**
 * Regression: splash "18 markets fetching" forever.
 *
 * Causes we hit in production:
 * 1) First wave results discarded as "stale" after generation bump
 * 2) Second cache-first caller waited on mutex then returned without re-running
 * 3) isLoading never cleared
 *
 * This mounts DataProvider with mocked fetch and asserts markets leave loading
 * even when a second fetchAllMarkets is requested mid-wave.
 */
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { DataProvider } from '../../hub/DataProvider';
import { useDataContext } from '../../hub/DataContext';

const bondPayload = {
  yieldCurveData: { US: { '10y': 4.5, '2y': 4.1 } },
  treasuryRates: { US10Y: 4.5, US2Y: 4.1 },
  lastUpdated: '2026-07-31',
  fetchedOn: '2026-07-31',
  isLive: true,
  isCurrent: true,
  _sources: { fred: true },
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: () => null },
  };
}

function Probe({ onSnap }) {
  const ctx = useDataContext();
  useEffect(() => {
    onSnap(ctx);
  }, [ctx, onSnap]);
  return (
    <div data-testid="probe">
      {ctx?.markets?.bonds?.isLoading ? 'loading' : 'idle'}
      {ctx?.markets?.bonds?.data ? '|has-data' : '|no-data'}
    </div>
  );
}

describe('DataProvider wave / isLoading lifecycle', () => {
  let snaps;

  beforeEach(() => {
    snaps = [];
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url);
      // Slow first response so we can fire a concurrent refetch
      if (u.includes('/api/bonds') || u.includes('bonds')) {
        await new Promise((r) => setTimeout(r, 40));
        return jsonResponse(bondPayload);
      }
      // Generic hollow-but-valid for other markets
      await new Promise((r) => setTimeout(r, 5));
      return jsonResponse({ ok: true, lastUpdated: '2026-07-31', fetchedOn: '2026-07-31', placeholder: 1 });
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('clears bonds isLoading and keeps payload after initial wave', async () => {
    render(
      <DataProvider>
        <Probe onSnap={(c) => snaps.push(c)} />
      </DataProvider>,
    );

    await waitFor(() => {
      const last = snaps[snaps.length - 1];
      expect(last?.markets?.bonds?.isLoading).toBe(false);
      expect(last?.markets?.bonds?.data?.yieldCurveData?.US?.['10y']).toBe(4.5);
    }, { timeout: 15000 });
  });

  it('second concurrent fetchAllMarkets still leaves markets with data (mutex drain)', async () => {
    let ctxRef = null;
    function Holder() {
      const ctx = useDataContext();
      ctxRef = ctx;
      return <Probe onSnap={() => {}} />;
    }

    render(
      <DataProvider>
        <Holder />
      </DataProvider>,
    );

    // Wait for first wave to start producing context
    await waitFor(() => {
      expect(ctxRef?.refetchAll).toBeTypeOf('function');
    }, { timeout: 5000 });

    // Concurrent force-live waves — mutex must drain without stranding isLoading
    await act(async () => {
      const p1 = ctxRef.refetchAll();
      const p2 = ctxRef.refetchAll();
      await Promise.all([p1, p2]);
    });

    await waitFor(() => {
      const b = ctxRef?.markets?.bonds;
      expect(b?.isLoading).toBe(false);
      expect(b?.isRefreshing).not.toBe(true);
    }, { timeout: 20000 });
  }, 25000);
});
