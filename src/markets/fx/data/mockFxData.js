// src/markets/fx/data/mockFxData.js
const MOCK_DATES = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-01-02');
  d.setDate(d.getDate() + i);
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
