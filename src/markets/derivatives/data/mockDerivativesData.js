export const volSurfaceData = {
  strikes: [80, 85, 90, 95, 100, 105, 110, 115, 120],
  expiries: ['1W', '2W', '1M', '2M', '3M', '6M', '1Y', '2Y'],
  grid: [
    [38.2, 32.1, 26.5, 21.8, 18.2, 19.5, 22.1, 25.8, 29.4],
    [35.8, 30.2, 25.1, 20.9, 17.8, 18.9, 21.4, 24.7, 28.1],
    [32.4, 27.8, 23.2, 19.5, 16.9, 17.8, 20.2, 23.1, 26.5],
    [30.1, 26.2, 22.1, 18.8, 16.2, 17.1, 19.4, 22.2, 25.3],
    [28.5, 25.0, 21.2, 18.1, 15.8, 16.5, 18.8, 21.5, 24.2],
    [26.2, 23.4, 20.1, 17.4, 15.2, 15.9, 17.8, 20.4, 22.8],
    [24.8, 22.2, 19.4, 17.0, 15.0, 15.6, 17.2, 19.6, 21.8],
    [23.5, 21.2, 18.8, 16.6, 14.8, 15.4, 16.8, 19.0, 21.0],
  ],
};

export const vixTermStructure = {
  dates:      ['Spot', 'Apr-25', 'May-25', 'Jun-25', 'Jul-25', 'Aug-25', 'Sep-25', 'Oct-25', 'Nov-25', 'Dec-25'],
  values:     [18.4, 19.2, 20.1, 21.0, 21.8, 22.3, 22.9, 23.4, 23.8, 24.2],
  prevValues: [16.2, 17.1, 18.2, 19.3, 20.2, 20.8, 21.5, 22.1, 22.6, 23.1],
};

export const optionsFlow = [
  { ticker: 'SPY',  strike: 520, expiry: '16 May 25', type: 'P', volume: 45200, openInterest: 12400, premium:  8.20, sentiment: 'bearish' },
  { ticker: 'NVDA', strike: 950, expiry: '20 Jun 25', type: 'C', volume: 38900, openInterest:  8200, premium: 24.50, sentiment: 'bullish' },
  { ticker: 'QQQ',  strike: 440, expiry: '16 May 25', type: 'P', volume: 32100, openInterest: 15600, premium:  6.80, sentiment: 'bearish' },
  { ticker: 'AAPL', strike: 200, expiry: '18 Apr 25', type: 'C', volume: 28400, openInterest:  6100, premium:  3.40, sentiment: 'bullish' },
  { ticker: 'TSLA', strike: 250, expiry: '16 May 25', type: 'C', volume: 25800, openInterest:  9800, premium: 12.60, sentiment: 'bullish' },
  { ticker: 'SPY',  strike: 500, expiry: '20 Jun 25', type: 'P', volume: 22400, openInterest: 18900, premium: 15.30, sentiment: 'bearish' },
  { ticker: 'IWM',  strike: 195, expiry: '16 May 25', type: 'P', volume: 19600, openInterest:  7200, premium:  4.10, sentiment: 'bearish' },
  { ticker: 'META', strike: 580, expiry: '20 Jun 25', type: 'C', volume: 17200, openInterest:  4800, premium: 18.90, sentiment: 'bullish' },
  { ticker: 'GLD',  strike: 185, expiry: '18 Apr 25', type: 'C', volume: 15800, openInterest:  3200, premium:  2.80, sentiment: 'bullish' },
  { ticker: 'XLE',  strike:  85, expiry: '16 May 25', type: 'P', volume: 14200, openInterest:  5600, premium:  1.95, sentiment: 'bearish' },
  { ticker: 'AMZN', strike: 200, expiry: '20 Jun 25', type: 'C', volume: 13900, openInterest:  4100, premium:  8.70, sentiment: 'bullish' },
  { ticker: 'TLT',  strike:  90, expiry: '16 May 25', type: 'C', volume: 12400, openInterest:  6800, premium:  2.20, sentiment: 'neutral' },
];

export const fearGreedData = {
  score: 38,
  label: 'Fear',
  indicators: [
    { name: 'VIX Level',           value: 18.4, score: 35, label: 'Fear'         },
    { name: 'Put/Call Ratio',       value:  1.18, score: 28, label: 'Fear'         },
    { name: 'Market Momentum',      value: -2.4, score: 32, label: 'Fear'         },
    { name: 'Safe Haven Demand',    value:  3.8, score: 25, label: 'Extreme Fear' },
    { name: 'Junk Bond Demand',     value:  1.2, score: 52, label: 'Neutral'      },
    { name: 'Market Breadth',       value: 42.1, score: 41, label: 'Fear'         },
    { name: 'Stock Price Strength', value: 18.0, score: 55, label: 'Neutral'      },
  ],
};

const MOCK_VIX_DATES = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-01-02');
  d.setDate(d.getDate() + i);
  return d.toISOString().split('T')[0];
});

export const fredVixHistory = {
  dates: MOCK_VIX_DATES,
  values: MOCK_VIX_DATES.map((_, i) => 18 + Math.sin(i / 8) * 5 + Math.random() * 2),
};

// SKEW Index History (52 weeks)
const SKEW_DATES = Array.from({ length: 52 }, (_, i) => {
  const d = new Date('2025-04-01');
  d.setDate(d.getDate() + i * 7);
  return d.toISOString().split('T')[0];
});

export const skewHistory = {
  dates: SKEW_DATES,
  values: SKEW_DATES.map((_, i) => 128 + Math.sin(i / 10) * 12 + (Math.random() - 0.5) * 4),
};

// Gamma Exposure Estimate (in $B)
export const gammaExposure = {
  total: 2.4,
  callGamma: 1.8,
  putGamma: 0.6,
  netGamma: 1.2,
};
