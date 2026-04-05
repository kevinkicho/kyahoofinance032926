// src/__tests__/credit/useCreditData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreditData } from '../../markets/credit/data/useCreditData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCreditData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns spreadData with current spreads and 12-month history on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.spreadData.current).toMatchObject({
      igSpread:  expect.any(Number),
      hySpread:  expect.any(Number),
      emSpread:  expect.any(Number),
      bbbSpread: expect.any(Number),
      cccSpread: expect.any(Number),
    });
    expect(result.current.spreadData.history.dates).toHaveLength(12);
    expect(result.current.spreadData.etfs).toHaveLength(6);
  });

  it('returns emBondData with 12 countries and 4 regions on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.emBondData.countries).toHaveLength(12);
    expect(result.current.emBondData.regions).toHaveLength(4);
    expect(result.current.emBondData.countries[0]).toMatchObject({
      country: expect.any(String),
      spread:  expect.any(Number),
      rating:  expect.any(String),
    });
  });

  it('returns loanData with 7 CLO tranches on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.loanData.cloTranches).toHaveLength(7);
    expect(result.current.loanData.cloTranches[0]).toMatchObject({
      tranche: expect.any(String),
      yield:   expect.any(Number),
    });
  });

  it('returns defaultData with rates and charge-off history on mock fallback', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.defaultData.rates.length).toBeGreaterThanOrEqual(3);
    expect(result.current.defaultData.chargeoffs.dates.length).toBeGreaterThan(0);
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true and replaces spreadData when server responds', async () => {
    const liveData = {
      spreadData: {
        current: { igSpread: 95, hySpread: 330, emSpread: 275, bbbSpread: 132, cccSpread: 820 },
        history: { dates: Array.from({length:8},(_,i)=>`M${i}`), IG: Array.from({length:8},()=>95), HY: Array.from({length:8},()=>330), EM: Array.from({length:8},()=>275), BBB: Array.from({length:8},()=>132) },
        etfs: Array.from({length:3},(_, i)=>({ ticker:`E${i}`, name:`ETF${i}`, price:100, change1d:0.1, yieldPct:5, durationYr:5 })),
      },
      emBondData: { countries: Array.from({length:6},(_, i)=>({ country:`C${i}`, code:`C${i}`, spread:200, rating:'BB', change1m:-5, yld10y:7, debtGdp:60 })), regions: [] },
      loanData: { cloTranches: Array.from({length:5},(_, i)=>({ tranche:`T${i}`, spread:200+i*100, yield:7+i, rating:'A', ltv:70+i })), indices: [], priceHistory: { dates: [], bkln: [] } },
      defaultData: { rates: Array.from({length:4},(_, i)=>({ category:`Cat${i}`, value:3, prev:4, peak:10, unit:'%' })), chargeoffs: { dates:[], commercial:[], consumer:[] }, defaultHistory: { dates:[], hy:[], loan:[] } },
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.lastUpdated).toBe('2026-04-05');
    expect(result.current.spreadData.current.igSpread).toBe(95);
  });

  it('guard: does not apply spreadData when history.dates length < 6', async () => {
    const liveData = {
      spreadData: { current: { igSpread:95, hySpread:330, emSpread:275, bbbSpread:132, cccSpread:820 }, history: { dates: ['Jan','Feb'], IG:[95,95], HY:[330,330], EM:[275,275], BBB:[132,132] }, etfs: [] },
      emBondData: { countries: [], regions: [] },
      loanData: { cloTranches: [], indices: [], priceHistory: { dates:[], bkln:[] } },
      defaultData: { rates: [], chargeoffs: { dates:[], commercial:[], consumer:[] }, defaultHistory: { dates:[], hy:[], loan:[] } },
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.spreadData.history.dates).toHaveLength(12);
    expect(result.current.isLive).toBe(false);
  });

  it('exposes fetchedOn and isCurrent', async () => {
    const liveData = {
      spreadData: { current: { igSpread:95, hySpread:330, emSpread:275, bbbSpread:132, cccSpread:820 }, history: { dates: Array.from({length:8},(_,i)=>`M${i}`), IG:Array.from({length:8},()=>95), HY:Array.from({length:8},()=>330), EM:Array.from({length:8},()=>275), BBB:Array.from({length:8},()=>132) }, etfs:[] },
      emBondData: { countries: Array.from({length:6},(_, i)=>({ country:`C${i}`, code:`C${i}`, spread:200, rating:'BB', change1m:0, yld10y:7, debtGdp:60 })), regions:[] },
      loanData: { cloTranches: Array.from({length:5},(_, i)=>({ tranche:`T${i}`, spread:200, yield:7, rating:'A', ltv:70 })), indices:[], priceHistory:{dates:[],bkln:[]} },
      defaultData: { rates: Array.from({length:4},(_, i)=>({ category:`C${i}`, value:3, prev:4, peak:10, unit:'%' })), chargeoffs:{dates:[],commercial:[],consumer:[]}, defaultHistory:{dates:[],hy:[],loan:[]} },
      fetchedOn: '2026-04-05', isCurrent: true,
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCreditData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchedOn).toBe('2026-04-05');
    expect(result.current.isCurrent).toBe(true);
  });
});
