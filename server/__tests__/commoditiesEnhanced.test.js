import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../lib/fetch.js', () => ({
  fetchJSON: vi.fn(),
}));

vi.mock('../lib/rateLimits.js', () => ({
  trackApiCall: vi.fn(),
}));

const { fetchJSON } = await import('../lib/fetch.js');
const { buildCotData } = await import('../routes/commoditiesEnhanced.js');

const cotRow = (name, date, long, short, commLong, commShort, oi) => ({
  report_date_as_yyyy_mm_dd: date,
  market_and_exchange_names: name,
  noncomm_positions_long_all: String(long),
  noncomm_positions_short_all: String(short),
  comm_positions_long_all: String(commLong),
  comm_positions_short_all: String(commShort),
  open_interest_all: String(oi),
});

describe('buildCotData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when CFTC returns no rows', async () => {
    fetchJSON.mockResolvedValueOnce([]);
    expect(await buildCotData()).toBeNull();
  });

  it('returns null when fetch fails', async () => {
    fetchJSON.mockRejectedValueOnce(new Error('boom'));
    expect(await buildCotData()).toBeNull();
  });

  it('builds WTI + Gold with 12-pt history and real netChange', async () => {
    const rows = [];
    for (let i = 0; i < 12; i++) {
      rows.push(cotRow('CRUDE OIL, NYMEX', `2026-0${(i % 9) + 1}-0${(i % 7) + 1}`, 100 + i, 50, 200, 150, 300));
      rows.push(cotRow('GOLD, COMEX', `2026-0${(i % 9) + 1}-0${(i % 7) + 1}`, 80 + i, 30, 150, 100, 250));
    }
    fetchJSON.mockResolvedValueOnce(rows);

    const result = await buildCotData();

    expect(result).not.toBeNull();
    expect(result.commodities.length).toBeGreaterThanOrEqual(2);
    const wti = result.commodities.find(c => c.name === 'WTI Crude Oil');
    const gold = result.commodities.find(c => c.name === 'Gold');
    expect(wti).toBeDefined();
    expect(gold).toBeDefined();
    expect(wti.history.length).toBe(12);
    expect(wti.latest.noncommNet).toBe(100 - 50);
    expect(wti.latest.netChange).toBe(-1); // rows[0](100) - rows[1](101)
    expect(gold.history.length).toBe(12);
  });

  it('sets netChange null when only a single point exists', async () => {
    fetchJSON.mockResolvedValueOnce([
      cotRow('CRUDE OIL, NYMEX', '2026-08-04', 100, 50, 200, 150, 300),
      cotRow('GOLD, COMEX', '2026-08-04', 80, 30, 150, 100, 250),
    ]);

    const result = await buildCotData();

    expect(result).not.toBeNull();
    const wti = result.commodities.find(c => c.name === 'WTI Crude Oil');
    expect(wti.latest.netChange).toBeNull();
  });
});
