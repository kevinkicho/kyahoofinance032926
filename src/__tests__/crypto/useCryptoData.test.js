// src/__tests__/crypto/useCryptoData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCryptoData } from '../../markets/crypto/data/useCryptoData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCryptoData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns coinMarketData with 20 coins on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.coinMarketData.coins).toHaveLength(20);
    expect(result.current.coinMarketData.coins[0]).toMatchObject({
      symbol: expect.any(String),
      price: expect.any(Number),
      change24h: expect.any(Number),
      marketCapB: expect.any(Number),
    });
  });

  it('returns fearGreedData with value and 30-day history on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fearGreedData.value).toBeGreaterThanOrEqual(0);
    expect(result.current.fearGreedData.value).toBeLessThanOrEqual(100);
    expect(result.current.fearGreedData.history).toHaveLength(30);
    expect(result.current.fearGreedData.correlations).toHaveLength(5);
  });

  it('returns defiData with protocols and chains on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.defiData.protocols.length).toBeGreaterThan(0);
    expect(result.current.defiData.chains.length).toBeGreaterThan(0);
    expect(result.current.defiData.protocols[0]).toMatchObject({
      name: expect.any(String),
      tvlB: expect.any(Number),
    });
  });

  it('returns fundingData with rates on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fundingData.rates.length).toBeGreaterThan(0);
    expect(result.current.fundingData.rates[0]).toMatchObject({
      symbol: expect.any(String),
      rate8h: expect.any(Number),
      openInterestB: expect.any(Number),
    });
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true and updates data when server responds with sufficient data', async () => {
    const liveData = {
      coinMarketData: {
        coins: Array.from({ length: 12 }, (_, i) => ({
          id: `coin${i}`, symbol: `C${i}`, name: `Coin ${i}`,
          price: 100 + i, change24h: 1.0, change7d: 2.0, change30d: 5.0,
          marketCapB: 10 + i, volumeB: 1.0, dominance: 1.0,
        })),
        globalStats: { totalMarketCapT: 2.5, totalVolumeB: 120, btcDominance: 50, ethDominance: 15, altDominance: 35, activeCryptocurrencies: 13000, marketCapChange24h: 1.5 },
      },
      fearGreedData: {
        value: 65, label: 'Greed',
        history: Array.from({ length: 10 }, (_, i) => 60 + i),
        correlations: [],
      },
      defiData: {
        protocols: Array.from({ length: 6 }, (_, i) => ({ name: `P${i}`, category: 'DEX', chain: 'Ethereum', tvlB: 10 + i, change1d: 0.5, change7d: 2.0 })),
        chains: [],
      },
      fundingData: {
        rates: Array.from({ length: 4 }, (_, i) => ({ symbol: `F${i}`, rate8h: 0.01, rateAnnualized: 10, openInterestB: 1, exchange: 'Binance' })),
        openInterestHistory: { dates: [], btcOIB: [], ethOIB: [] },
      },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.lastUpdated).toBe('2026-04-05');
    expect(result.current.coinMarketData.coins[0].symbol).toBe('C0');
  });

  it('guard: does not apply coinMarketData when coins length < 10', async () => {
    const liveData = {
      coinMarketData: { coins: [{ id: 'btc', symbol: 'BTC', name: 'Bitcoin', price: 60000, change24h: 1, change7d: 2, change30d: 5, marketCapB: 1200, volumeB: 40, dominance: 50 }], globalStats: {} },
      fearGreedData: { value: 50, label: 'Neutral', history: [], correlations: [] },
      defiData: { protocols: [], chains: [] },
      fundingData: { rates: [], openInterestHistory: { dates: [], btcOIB: [], ethOIB: [] } },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.coinMarketData.coins).toHaveLength(20);
    expect(result.current.isLive).toBe(false);
  });

  it('exposes fetchedOn and isCurrent from server response', async () => {
    const liveData = {
      coinMarketData: { coins: Array.from({ length: 15 }, (_, i) => ({ id: `c${i}`, symbol: `C${i}`, name: `Coin ${i}`, price: 100, change24h: 1, change7d: 2, change30d: 5, marketCapB: 10, volumeB: 1, dominance: 1 })), globalStats: {} },
      fearGreedData: { value: 60, label: 'Greed', history: Array.from({length: 8}, () => 60), correlations: [] },
      defiData: { protocols: Array.from({length: 6}, (_, i) => ({ name: `P${i}`, category: 'DEX', chain: 'ETH', tvlB: 5, change1d: 0, change7d: 0 })), chains: [] },
      fundingData: { rates: Array.from({length: 4}, (_, i) => ({ symbol: `F${i}`, rate8h: 0.01, rateAnnualized: 10, openInterestB: 1, exchange: 'X' })), openInterestHistory: { dates: [], btcOIB: [], ethOIB: [] } },
      fetchedOn: '2026-04-05',
      isCurrent: true,
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCryptoData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchedOn).toBe('2026-04-05');
    expect(result.current.isCurrent).toBe(true);
  });
});
