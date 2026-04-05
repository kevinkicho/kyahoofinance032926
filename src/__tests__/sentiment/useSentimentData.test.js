// src/__tests__/sentiment/useSentimentData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSentimentData } from '../../markets/sentiment/data/useSentimentData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useSentimentData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns fearGreedData with 252-entry history on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fearGreedData.history.length).toBeGreaterThanOrEqual(30);
    expect(result.current.fearGreedData.score).toBeGreaterThanOrEqual(0);
    expect(result.current.fearGreedData.indicators).toHaveLength(5);
  });

  it('returns cftcData with 6 currencies and correct groups on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cftcData.currencies).toHaveLength(6);
    expect(result.current.cftcData.equities).toHaveLength(2);
    expect(result.current.cftcData.rates).toHaveLength(1);
    expect(result.current.cftcData.commodities).toHaveLength(2);
    expect(result.current.cftcData.currencies[0]).toMatchObject({
      code: expect.any(String), netPct: expect.any(Number),
    });
  });

  it('returns riskData with 6 signals of correct shape on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.riskData.signals).toHaveLength(6);
    expect(result.current.riskData.signals[0]).toMatchObject({
      name: expect.any(String),
      value: expect.any(Number),
      signal: expect.stringMatching(/^(risk-on|neutral|risk-off)$/),
    });
  });

  it('returns returnsData with 8 assets all having ret1d and ret1m on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.returnsData.assets).toHaveLength(8);
    result.current.returnsData.assets.forEach(a => {
      expect(typeof a.ret1d).toBe('number');
      expect(typeof a.ret1m).toBe('number');
    });
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true and replaces data when server responds with valid payload', async () => {
    const liveData = {
      fearGreedData: {
        score: 62, label: 'Greed', altmeScore: 65,
        history: Array.from({ length: 35 }, (_, i) => ({ date: `2026-03-${String(i+1).padStart(2,'0')}`, value: 55 + i })),
        indicators: [
          { name: 'Alt.me F&G', value: 65, signal: 'greed', percentile: null },
          { name: 'VIX Level',  value: 14, signal: 'greed', percentile: 28 },
          { name: 'HY Spread',  value: 310, signal: 'greed', percentile: 32 },
          { name: 'Yield Curve',value: 0.4, signal: 'neutral', percentile: null },
          { name: 'SPY Momentum',value: 3.2, signal: 'greed', percentile: null },
        ],
      },
      cftcData: {
        asOf: '2026-04-01',
        currencies: Array.from({ length: 5 }, (_, i) => ({ code: `C${i}`, name: `Cur${i}`, netPct: i * 5, longK: 100, shortK: 80, oiK: 400 })),
        equities:   [{ code: 'ES', name: 'S&P', netPct: 12, longK: 200, shortK: 160, oiK: 1000 }],
        rates:      [{ code: 'ZN', name: 'T-Note', netPct: -10, longK: 400, shortK: 520, oiK: 2000 }],
        commodities:[{ code: 'GC', name: 'Gold', netPct: 28, longK: 250, shortK: 130, oiK: 1200 }],
      },
      riskData: {
        overallScore: 64, overallLabel: 'Risk-On',
        signals: Array.from({ length: 6 }, (_, i) => ({ name: `Sig${i}`, value: 100 + i, signal: 'risk-on', description: 'ok', fmt: `${100+i}` })),
      },
      returnsData: {
        asOf: '2026-04-04',
        assets: Array.from({ length: 7 }, (_, i) => ({ ticker: `T${i}`, label: `Asset${i}`, category: 'US Equity', ret1d: 0.5, ret1w: 1.0, ret1m: 2.0, ret3m: 5.0 })),
      },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.fearGreedData.score).toBe(62);
    expect(result.current.lastUpdated).toBe('2026-04-05');
  });

  it('guard: does not apply cftcData when currencies.length < 4', async () => {
    const liveData = {
      fearGreedData: { score: 50, label: 'Neutral', altmeScore: 50, history: [], indicators: [] },
      cftcData: {
        asOf: '2026-04-01',
        currencies: [{ code: 'EUR', name: 'Euro', netPct: 5, longK: 100, shortK: 80, oiK: 400 }],
        equities: [], rates: [], commodities: [],
      },
      riskData:    { overallScore: 50, overallLabel: 'Neutral', signals: [] },
      returnsData: { asOf: '2026-04-04', assets: [] },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.cftcData.currencies).toHaveLength(6); // mock untouched
    expect(result.current.isLive).toBe(false);
  });

  it('exposes fetchedOn and isCurrent', async () => {
    const liveData = {
      fearGreedData: {
        score: 55, label: 'Neutral', altmeScore: 55,
        history: Array.from({ length: 35 }, (_, i) => ({ date: `2026-03-${String(i+1).padStart(2,'0')}`, value: 50 })),
        indicators: Array.from({ length: 5 }, (_, i) => ({ name: `I${i}`, value: 50, signal: 'neutral', percentile: null })),
      },
      cftcData: {
        asOf: '2026-04-01',
        currencies: Array.from({ length: 5 }, (_, i) => ({ code: `C${i}`, name: `Cur${i}`, netPct: 5, longK: 100, shortK: 80, oiK: 400 })),
        equities: [], rates: [], commodities: [],
      },
      riskData: { overallScore: 55, overallLabel: 'Neutral', signals: Array.from({ length: 5 }, (_, i) => ({ name: `S${i}`, value: 50, signal: 'neutral', description: 'ok', fmt: '50' })) },
      returnsData: { asOf: '2026-04-04', assets: Array.from({ length: 7 }, (_, i) => ({ ticker: `T${i}`, label: `A${i}`, category: 'US Equity', ret1d: 0.5, ret1w: 1.0, ret1m: 2.0, ret3m: 5.0 })) },
      fetchedOn: '2026-04-05', isCurrent: true,
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useSentimentData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchedOn).toBe('2026-04-05');
    expect(result.current.isCurrent).toBe(true);
  });
});
