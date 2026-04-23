import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchBLSSeries, parseSeries } from '../routes/bls.js';

describe('fetchBLSSeries', () => {
  beforeEach(() => {
    vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when API key is missing', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'error',
    });

    const result = await fetchBLSSeries(['LNS14000000'], '');
    expect(result).toBeNull();
  });

  it('returns parsed series data on success', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'REQUEST_SUCCEEDED',
        Results: {
          series: [
            {
              seriesID: 'LNS14000000',
              data: [
                { year: '2024', period: 'M12', periodName: 'December', value: '4.1' },
                { year: '2024', period: 'M11', periodName: 'November', value: '4.2' },
              ],
            },
          ],
        },
      }),
    });

    const result = await fetchBLSSeries(['LNS14000000'], 'test-key');
    expect(result).not.toBeNull();
    expect(result[0].seriesID).toBe('LNS14000000');
    expect(result[0].data[0].value).toBe('4.1');
  });

  it('returns null on API error status', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'REQUEST_FAILED',
        message: ['Invalid series id'],
      }),
    });

    const result = await fetchBLSSeries(['INVALID'], 'test-key');
    expect(result).toBeNull();
  });
});

describe('parseSeries', () => {
  it('parses raw BLS series into structured data', () => {
    const rawSeries = [
      {
        seriesID: 'LNS14000000',
        data: [
          { year: '2024', period: 'M12', periodName: 'December', value: '4.1' },
          { year: '2024', period: 'M11', periodName: 'November', value: '4.2' },
        ],
      },
    ];

    const result = parseSeries(rawSeries);

    expect(result.unemployment).toMatchObject({
      label: 'Unemployment Rate',
      unit: '%',
      seriesId: 'LNS14000000',
      latest: { value: 4.1, period: 'December', year: '2024' },
      previous: { value: 4.2, period: 'November', year: '2024' },
      _source: true,
    });
  });

  it('handles missing data gracefully', () => {
    const result = parseSeries([]);

    expect(result.unemployment).toMatchObject({
      label: 'Unemployment Rate',
      unit: '%',
      seriesId: 'LNS14000000',
      latest: null,
      previous: null,
      history: [],
      _source: false,
    });
  });

  it('sorts data by date descending', () => {
    const rawSeries = [
      {
        seriesID: 'LNS14000000',
        data: [
          { year: '2023', period: 'M06', periodName: 'June', value: '3.8' },
          { year: '2024', period: 'M01', periodName: 'January', value: '4.0' },
          { year: '2023', period: 'M12', periodName: 'December', value: '3.9' },
        ],
      },
    ];

    const result = parseSeries(rawSeries);

    expect(result.unemployment.history.dates).toEqual([
      '2024-01',
      '2023-12',
      '2023-06',
    ]);
    expect(result.unemployment.history.values).toEqual([4.0, 3.9, 3.8]);
  });

  it('filters out invalid values', () => {
    const rawSeries = [
      {
        seriesID: 'LNS14000000',
        data: [
          { year: '2024', period: 'M12', periodName: 'December', value: '-' },
          { year: '2024', period: 'M11', periodName: 'November', value: null },
          { year: '2024', period: 'M10', periodName: 'October', value: '4.0' },
        ],
      },
    ];

    const result = parseSeries(rawSeries);

    expect(result.unemployment.history.values).toEqual([4.0]);
  });
});