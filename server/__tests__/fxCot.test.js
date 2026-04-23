import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fetchModule from '../lib/fetch.js';
import { fetchCOTHistory } from '../routes/fx.js';

describe('fetchCOTHistory', () => {
  let fetchJSONSpy;

  beforeEach(() => {
    fetchJSONSpy = vi.spyOn(fetchModule, 'fetchJSON');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null on fetch error', async () => {
    fetchJSONSpy.mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchCOTHistory();
    expect(result).toBeNull();
  });

  it('returns null when no valid data', async () => {
    fetchJSONSpy.mockResolvedValueOnce(null);

    const result = await fetchCOTHistory();
    expect(result).toBeNull();
  });

  it('parses CFTC data and computes net positioning', async () => {
    fetchJSONSpy.mockResolvedValueOnce([
      {
        report_date_as_yyyy_mm_dd: '2024-03-12',
        market_and_exchange_names: 'EURO FX',
        noncomm_positions_long_all: '130000',
        noncomm_positions_short_all: '70000',
        open_interest_all: '200000',
      },
      {
        report_date_as_yyyy_mm_dd: '2024-03-12',
        market_and_exchange_names: 'JAPANESE YEN',
        noncomm_positions_long_all: '80000',
        noncomm_positions_short_all: '70000',
        open_interest_all: '180000',
      },
      {
        report_date_as_yyyy_mm_dd: '2024-03-12',
        market_and_exchange_names: 'BRITISH POUND',
        noncomm_positions_long_all: '60000',
        noncomm_positions_short_all: '40000',
        open_interest_all: '150000',
      },
      {
        report_date_as_yyyy_mm_dd: '2024-03-05',
        market_and_exchange_names: 'EURO FX',
        noncomm_positions_long_all: '150000',
        noncomm_positions_short_all: '50000',
        open_interest_all: '200000',
      },
    ]);

    const result = await fetchCOTHistory();

    expect(result).not.toBeNull();
    expect(result.EUR).toHaveLength(2);
    expect(result.EUR.some(e => e.long === 130 && e.short === 70)).toBe(true);
  });

  it('sorts data by date ascending and limits to 52 weeks', async () => {
    const makeData = (currency) => Array.from({ length: 60 }, (_, i) => ({
      report_date_as_yyyy_mm_dd: `202${4 - Math.floor(i / 10)}-${String(3 + Math.floor(i / 30)).padStart(2, '0')}-${String(12 - (i % 10)).padStart(2, '0')}`,
      market_and_exchange_names: currency,
      noncomm_positions_long_all: '100000',
      noncomm_positions_short_all: '100000',
      open_interest_all: '200000',
    }));

    fetchJSONSpy.mockResolvedValueOnce([
      ...makeData('EURO FX'),
      ...makeData('JAPANESE YEN'),
      ...makeData('BRITISH POUND'),
    ]);

    const result = await fetchCOTHistory();

    expect(result.EUR).toHaveLength(52);
    expect(result.EUR[0].date).toBeDefined();
  });

  it('returns null when fewer than 3 currencies have data', async () => {
    fetchJSONSpy.mockResolvedValueOnce([
      { report_date_as_yyyy_mm_dd: '2024-03-12', market_and_exchange_names: 'EURO FX', noncomm_positions_long_all: '100000', noncomm_positions_short_all: '50000', open_interest_all: '200000' },
      { report_date_as_yyyy_mm_dd: '2024-03-05', market_and_exchange_names: 'EURO FX', noncomm_positions_long_all: '90000', noncomm_positions_short_all: '60000', open_interest_all: '200000' },
      { report_date_as_yyyy_mm_dd: '2024-02-27', market_and_exchange_names: 'EURO FX', noncomm_positions_long_all: '80000', noncomm_positions_short_all: '70000', open_interest_all: '200000' },
    ]);

    const result = await fetchCOTHistory();

    expect(result).toBeNull();
  });
});