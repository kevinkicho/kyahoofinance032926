// src/__tests__/calendar/useCalendarData.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCalendarData } from '../../markets/calendar/data/useCalendarData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useCalendarData', () => {
  beforeEach(() => { mockFetch.mockReset(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('returns mock economicEvents on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.economicEvents.length).toBeGreaterThanOrEqual(10);
    expect(result.current.economicEvents[0]).toMatchObject({
      date: expect.any(String), country: expect.any(String), event: expect.any(String),
    });
  });

  it('returns mock centralBanks on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.centralBanks).toHaveLength(4);
    expect(result.current.centralBanks[0]).toMatchObject({
      bank: expect.any(String), rate: expect.any(Number), nextMeeting: expect.any(String),
    });
  });

  it('returns mock earningsSeason on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.earningsSeason.length).toBeGreaterThanOrEqual(8);
    expect(result.current.earningsSeason[0]).toMatchObject({
      ticker: expect.any(String), date: expect.any(String),
    });
  });

  it('returns mock keyReleases on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.keyReleases.length).toBeGreaterThanOrEqual(8);
    expect(result.current.keyReleases[0]).toMatchObject({
      name: expect.any(String), date: expect.any(String), category: expect.any(String),
    });
  });

  it('isLive stays false on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isLive).toBe(false);
  });

  it('sets isLive true when server responds with valid data', async () => {
    const liveData = {
      economicEvents: Array.from({ length: 8 }, (_, i) => ({
        date: '2026-04-10', country: 'US', event: `Event${i}`,
        actual: null, expected: i, previous: i - 1, importance: 3,
      })),
      centralBanks: [
        { bank: 'Fed', rate: 4.50, nextMeeting: '2026-05-06', daysUntil: 31, previousRate: 4.50 },
        { bank: 'ECB', rate: 2.65, nextMeeting: '2026-04-16', daysUntil: 11, previousRate: 2.90 },
        { bank: 'BOE', rate: 4.50, nextMeeting: '2026-05-07', daysUntil: 32, previousRate: 4.50 },
      ],
      earningsSeason: Array.from({ length: 6 }, (_, i) => ({
        ticker: `T${i}`, name: `Co${i}`, date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100,
      })),
      keyReleases: Array.from({ length: 5 }, (_, i) => ({
        name: `Release${i}`, date: '2026-04-10', category: 'inflation', previousValue: '2.8%',
      })),
      lastUpdated: '2026-04-05',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.economicEvents).toHaveLength(8);
    expect(result.current.lastUpdated).toBe('2026-04-05');
  });

  it('guard: does not apply economicEvents when length < 5', async () => {
    const liveData = {
      economicEvents: [{ date: '2026-04-10', country: 'US', event: 'CPI', actual: null, expected: 2.6, previous: 2.8, importance: 3 }],
      centralBanks: [], earningsSeason: [], keyReleases: [],
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.economicEvents.length).toBeGreaterThanOrEqual(10); // mock untouched
    expect(result.current.isLive).toBe(false);
  });

  it('exposes fetchedOn and isCurrent', async () => {
    const liveData = {
      economicEvents: Array.from({ length: 8 }, (_, i) => ({
        date: '2026-04-10', country: 'US', event: `Ev${i}`, actual: null, expected: i, previous: i, importance: 3,
      })),
      centralBanks: [
        { bank: 'Fed', rate: 4.50, nextMeeting: '2026-05-06', daysUntil: 31, previousRate: 4.50 },
        { bank: 'ECB', rate: 2.65, nextMeeting: '2026-04-16', daysUntil: 11, previousRate: 2.90 },
        { bank: 'BOE', rate: 4.50, nextMeeting: '2026-05-07', daysUntil: 32, previousRate: 4.50 },
      ],
      earningsSeason: Array.from({ length: 6 }, (_, i) => ({
        ticker: `T${i}`, name: `Co${i}`, date: '2026-04-15', epsEst: 1.0, epsPrev: 0.9, marketCapB: 100,
      })),
      keyReleases: Array.from({ length: 5 }, (_, i) => ({
        name: `R${i}`, date: '2026-04-10', category: 'growth', previousValue: '2.4%',
      })),
      fetchedOn: '2026-04-05', isCurrent: true,
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useCalendarData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fetchedOn).toBe('2026-04-05');
    expect(result.current.isCurrent).toBe(true);
  });
});
