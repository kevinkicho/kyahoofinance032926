import { describe, it, expect } from 'vitest';
import { MARKET_EVENTS, getEventsNear } from '../data/marketEvents.js';

describe('MARKET_EVENTS data', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(MARKET_EVENTS)).toBe(true);
    expect(MARKET_EVENTS.length).toBeGreaterThan(0);
  });

  it('every event has required fields', () => {
    for (const event of MARKET_EVENTS) {
      expect(event).toHaveProperty('date');
      expect(event).toHaveProperty('headline');
      expect(event).toHaveProperty('tag');
      expect(event).toHaveProperty('body');
    }
  });

  it('all dates are valid YYYY-MM-DD strings', () => {
    for (const event of MARKET_EVENTS) {
      expect(event.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(event.date).getTime()).not.toBeNaN();
    }
  });

  it('events are sorted chronologically', () => {
    for (let i = 1; i < MARKET_EVENTS.length; i++) {
      const prev = new Date(MARKET_EVENTS[i - 1].date).getTime();
      const curr = new Date(MARKET_EVENTS[i].date).getTime();
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });
});

describe('getEventsNear', () => {
  it('returns empty array for null/undefined date', () => {
    expect(getEventsNear(null)).toEqual([]);
    expect(getEventsNear(undefined)).toEqual([]);
    expect(getEventsNear('')).toEqual([]);
  });

  it('returns events within the default window', () => {
    // GME short squeeze was 2021-01-27 — query exactly that date
    const results = getEventsNear('2021-01-27', 1);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tag).toBe('GME');
  });

  it('returns no results when no events are nearby', () => {
    // Far future date with a tiny window
    const results = getEventsNear('2099-01-01', 1);
    expect(results).toEqual([]);
  });

  it('sorts results by proximity (closest first)', () => {
    const results = getEventsNear('2022-06-12', 30, 10);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].diff).toBeGreaterThanOrEqual(results[i - 1].diff);
    }
  });

  it('respects maxResults limit', () => {
    const results = getEventsNear('2022-06-10', 365, 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('respects windowDays boundary — excludes events just outside', () => {
    // FTX collapse 2022-11-11, query 20 days later with 10-day window → should miss it
    const results = getEventsNear('2022-12-01', 10);
    const ftx = results.find(e => e.tag === 'FTX');
    expect(ftx).toBeUndefined();
  });
});
