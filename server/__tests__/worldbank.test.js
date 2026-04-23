import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchJSON } from '../lib/fetch.js';

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

import { getLatest, getPrevLatest, fetchIndicator } from '../routes/worldbank.js';

describe('worldbank scorecard data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getLatest extracts most recent year with value', () => {
    const scorecardData = [
      { date: '2024', value: 2.5 },
      { date: '2023', value: 2.8 },
    ];

    const latest = getLatest(scorecardData);

    expect(latest).toEqual({ year: '2024', value: 2.5 });
  });

  it('getPrevLatest extracts previous year from latest', () => {
    const scorecardData = [
      { date: '2024', value: 2.5 },
      { date: '2023', value: 2.8 },
    ];

    const prev = getPrevLatest(scorecardData);

    expect(prev).toEqual({ year: '2023', value: 2.8 });
  });

  it('getLatest handles missing data gracefully', () => {
    expect(getLatest([])).toBeNull();
    expect(getLatest(null)).toBeNull();
  });

  it('getPrevLatest handles missing data gracefully', () => {
    expect(getPrevLatest([])).toBeNull();
  });

  it('getLatest skips null values', () => {
    const dataWithNulls = [
      { date: '2024', value: null },
      { date: '2023', value: 2.8 },
    ];

    const latest = getLatest(dataWithNulls);

    expect(latest).toEqual({ year: '2023', value: 2.8 });
  });
});