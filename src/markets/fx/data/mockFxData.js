// src/markets/fx/data/mockFxData.js
const MOCK_DATES = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-01-02');
  d.setDate(d.getDate() + i);
  return d.toISOString().split('T')[0];
});

// COT history dates (52 weeks)
const COT_DATES = Array.from({ length: 52 }, (_, i) => {
  const d = new Date('2025-04-01');
  d.setDate(d.getDate() + i * 7);
  return d.toISOString().split('T')[0];
});

export const fredFxRates = {
  eurUsd: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 1.08 + Math.sin(i / 10) * 0.03),
  },
  usdJpy: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 150 + Math.sin(i / 8) * 4),
  },
  gbpUsd: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 1.26 + Math.sin(i / 12) * 0.02),
  },
  usdChf: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 0.88 + Math.sin(i / 9) * 0.02),
  },
  usdCad: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 1.36 + Math.sin(i / 11) * 0.03),
  },
  audUsd: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 0.65 + Math.sin(i / 10) * 0.02),
  },
  dollarIndex: {
    dates: MOCK_DATES,
    values: MOCK_DATES.map((_, i) => 104 + Math.sin(i / 12) * 3),
  },
};

// COT Positioning History (net positioning as % of open interest)
// Positive = net long, Negative = net short
export const mockCotHistory = {
  EUR: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((15 + Math.sin(i / 6) * 20) * 10) / 10,
    long: Math.round((120 + Math.sin(i / 8) * 30) * 1000),
    short: Math.round((80 + Math.cos(i / 8) * 20) * 1000),
  })),
  JPY: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((-25 + Math.sin(i / 5) * 15) * 10) / 10,
    long: Math.round((60 + Math.sin(i / 7) * 25) * 1000),
    short: Math.round((140 + Math.cos(i / 7) * 35) * 1000),
  })),
  GBP: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((10 + Math.sin(i / 8) * 12) * 10) / 10,
    long: Math.round((85 + Math.sin(i / 9) * 20) * 1000),
    short: Math.round((70 + Math.cos(i / 9) * 15) * 1000),
  })),
  CAD: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((-8 + Math.sin(i / 7) * 10) * 10) / 10,
    long: Math.round((55 + Math.sin(i / 6) * 15) * 1000),
    short: Math.round((75 + Math.cos(i / 6) * 18) * 1000),
  })),
  CHF: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((5 + Math.sin(i / 9) * 8) * 10) / 10,
    long: Math.round((40 + Math.sin(i / 10) * 12) * 1000),
    short: Math.round((35 + Math.cos(i / 10) * 10) * 1000),
  })),
  AUD: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((-12 + Math.sin(i / 6) * 14) * 10) / 10,
    long: Math.round((45 + Math.sin(i / 8) * 18) * 1000),
    short: Math.round((70 + Math.cos(i / 8) * 22) * 1000),
  })),
  MXN: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((8 + Math.sin(i / 7) * 6) * 10) / 10,
    long: Math.round((25 + Math.sin(i / 5) * 8) * 1000),
    short: Math.round((18 + Math.cos(i / 5) * 6) * 1000),
  })),
  NZD: COT_DATES.map((date, i) => ({
    date,
    net: Math.round((-5 + Math.sin(i / 8) * 7) * 10) / 10,
    long: Math.round((30 + Math.sin(i / 9) * 10) * 1000),
    short: Math.round((38 + Math.cos(i / 9) * 12) * 1000),
  })),
};
