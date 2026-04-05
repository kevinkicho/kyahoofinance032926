// src/markets/sentiment/data/mockSentimentData.js

export const fearGreedData = {
  score: 52,
  label: 'Neutral',
  altmeScore: 58,
  history: Array.from({ length: 252 }, (_, i) => ({
    date: (() => { const d = new Date('2025-07-01'); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0]; })(),
    value: Math.round(35 + 25 * Math.sin(i / 40) + 8 * Math.sin(i / 12)),
  })),
  indicators: [
    { name: 'Alt.me F&G',    value: 58,   signal: 'neutral', percentile: null },
    { name: 'VIX Level',     value: 18.4, signal: 'neutral', percentile: 42 },
    { name: 'HY Spread',     value: 342,  signal: 'risk-on', percentile: 38 },
    { name: 'Yield Curve',   value: 0.12, signal: 'neutral', percentile: null },
    { name: 'SPY Momentum',  value: 1.8,  signal: 'neutral', percentile: null },
  ],
};

export const cftcData = {
  asOf: '2026-04-01',
  currencies: [
    { code: 'EUR', name: 'Euro',         netPct:  12.4, longK: 184, shortK: 128, oiK: 452 },
    { code: 'JPY', name: 'Yen',          netPct: -18.2, longK:  92, shortK: 174, oiK: 473 },
    { code: 'GBP', name: 'Sterling',     netPct:   8.1, longK: 142, shortK: 108, oiK: 418 },
    { code: 'CAD', name: 'Canadian $',   netPct:  -6.3, longK:  28, shortK:  42, oiK: 220 },
    { code: 'CHF', name: 'Swiss Franc',  netPct:   4.2, longK:  18, shortK:  14, oiK:  96 },
    { code: 'AUD', name: 'Aussie $',     netPct:  -9.8, longK:  48, shortK:  82, oiK: 388 },
  ],
  equities: [
    { code: 'ES', name: 'E-Mini S&P 500',  netPct:  14.2, longK: 284, shortK: 198, oiK: 1202 },
    { code: 'NQ', name: 'E-Mini Nasdaq',   netPct:   8.6, longK: 128, shortK:  96, oiK:  498 },
  ],
  rates: [
    { code: 'ZN', name: '10-Yr T-Notes',   netPct: -22.4, longK: 482, shortK: 768, oiK: 2842 },
  ],
  commodities: [
    { code: 'GC', name: 'Gold',            netPct:  32.8, longK: 284, shortK: 142, oiK: 1284 },
    { code: 'CL', name: 'Crude Oil',       netPct:  18.4, longK: 542, shortK: 348, oiK: 2642 },
  ],
};

export const riskData = {
  overallScore: 58,
  overallLabel: 'Neutral',
  signals: [
    { name: 'Yield Curve',      value:  0.12, signal: 'neutral',  description: 'Flat — uncertain',             fmt: '0.12%'  },
    { name: 'HY Credit Spread', value:  342,  signal: 'risk-on',  description: 'Compressed — risk-on',         fmt: '342bps' },
    { name: 'IG Credit Spread', value:   98,  signal: 'risk-on',  description: 'Tight — confidence',           fmt: '98bps'  },
    { name: 'VIX',              value:  18.4, signal: 'neutral',  description: 'Moderate uncertainty',         fmt: '18.4'   },
    { name: 'Gold vs USD',      value:   1.2, signal: 'neutral',  description: 'Mixed signals',                fmt: '+1.2%'  },
    { name: 'EM vs US Equities',value:  -0.8, signal: 'neutral',  description: 'Mixed',                        fmt: '-0.8%'  },
  ],
};

export const returnsData = {
  asOf: '2026-04-04',
  assets: [
    { ticker: 'SPY',     label: 'S&P 500',    category: 'US Equity',    ret1d:  0.42, ret1w:  1.24, ret1m:  3.18, ret3m:  5.84 },
    { ticker: 'QQQ',     label: 'Nasdaq 100', category: 'US Equity',    ret1d:  0.68, ret1w:  1.82, ret1m:  4.24, ret3m:  7.12 },
    { ticker: 'EEM',     label: 'EM Equities',category: 'Global',       ret1d: -0.24, ret1w:  0.42, ret1m:  2.14, ret3m:  3.28 },
    { ticker: 'TLT',     label: 'Long Bonds', category: 'Fixed Income', ret1d:  0.18, ret1w: -0.84, ret1m: -1.42, ret3m: -3.18 },
    { ticker: 'GLD',     label: 'Gold',       category: 'Real Assets',  ret1d:  0.84, ret1w:  2.14, ret1m:  6.42, ret3m: 12.84 },
    { ticker: 'UUP',     label: 'US Dollar',  category: 'Real Assets',  ret1d: -0.12, ret1w: -0.48, ret1m: -1.84, ret3m: -2.42 },
    { ticker: 'USO',     label: 'Crude Oil',  category: 'Real Assets',  ret1d: -1.24, ret1w: -2.84, ret1m: -4.18, ret3m: -8.42 },
    { ticker: 'BTC-USD', label: 'Bitcoin',    category: 'Crypto',       ret1d:  2.84, ret1w:  4.24, ret1m:  8.42, ret3m: 18.24 },
  ],
};
