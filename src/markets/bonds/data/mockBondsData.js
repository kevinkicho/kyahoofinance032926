const MOCK_DATES = ['Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'];

export const yieldCurveData = {
  US: { '3m': 5.10, '6m': 4.95, '1y': 4.70, '2y': 4.45, '5y': 4.20, '10y': 4.05, '30y': 4.25 },
  DE: { '3m': 3.40, '6m': 3.30, '1y': 3.20, '2y': 3.00, '5y': 2.85, '10y': 2.65, '30y': 2.80 },
  JP: { '3m': 0.05, '6m': 0.05, '1y': 0.05, '2y': 0.10, '5y': 0.35, '10y': 0.75, '30y': 1.20 },
  GB: { '3m': 4.50, '6m': 4.45, '1y': 4.35, '2y': 4.20, '5y': 4.00, '10y': 4.10, '30y': 4.30 },
};

export const spreadData = {
  current: { igSpread: 98, hySpread: 342, emSpread: 285, bbbSpread: 138, cccSpread: 842 },
  dates: MOCK_DATES,
  IG:   [ 92, 94, 96, 98,102, 99, 97, 95, 96, 98,100, 98],
  HY:   [312,318,324,330,358,345,338,332,336,340,348,342],
  EM:   [262,268,274,278,298,292,286,280,284,288,292,285],
  BBB:  [128,130,132,135,142,139,136,133,135,137,140,138],
  history: {
    dates: MOCK_DATES,
    IG:   [ 92, 94, 96, 98,102, 99, 97, 95, 96, 98,100, 98],
    HY:   [312,318,324,330,358,345,338,332,336,340,348,342],
    EM:   [262,268,274,278,298,292,286,280,284,288,292,285],
    BBB:  [128,130,132,135,142,139,136,133,135,137,140,138],
  },
  etfs: [
    { ticker: 'LQD',  name: 'iShares IG Corp Bond',  price: 107.42, change1d: -0.18, yieldPct: 5.18, durationYr: 8.4 },
    { ticker: 'HYG',  name: 'iShares HY Corp Bond',  price:  78.24, change1d:  0.12, yieldPct: 7.82, durationYr: 3.6 },
    { ticker: 'EMB',  name: 'iShares EM USD Bond',   price:  88.64, change1d: -0.24, yieldPct: 7.14, durationYr: 7.2 },
  ],
};

export const breakevensData = {
  current: { be5y: 2.31, be10y: 2.42, forward5y5y: 2.54, real5y: 1.74, real10y: 1.63 },
  history: {
    dates:  ['Jan-24','Feb-24','Mar-24','Apr-24','May-24','Jun-24','Jul-24','Aug-24','Sep-24','Oct-24','Nov-24','Dec-24','Jan-25','Feb-25','Mar-25','Apr-25','May-25','Jun-25','Jul-25','Aug-25'],
    be5y:       [2.18, 2.24, 2.30, 2.28, 2.35, 2.22, 2.18, 2.25, 2.30, 2.35, 2.28, 2.32, 2.28, 2.35, 2.38, 2.31, 2.34, 2.28, 2.32, 2.31],
    be10y:      [2.30, 2.34, 2.40, 2.38, 2.44, 2.32, 2.28, 2.36, 2.42, 2.48, 2.40, 2.44, 2.38, 2.44, 2.48, 2.42, 2.46, 2.40, 2.44, 2.42],
    forward5y5y:[2.42, 2.44, 2.50, 2.48, 2.53, 2.42, 2.38, 2.47, 2.54, 2.60, 2.52, 2.56, 2.48, 2.53, 2.58, 2.54, 2.58, 2.52, 2.56, 2.54],
  },
};

export const fredYieldHistory = {
  dates: MOCK_DATES,
  values: [4.05, 4.08, 4.12, 4.18, 4.22, 4.15, 4.10, 4.08, 4.12, 4.18, 4.10, 4.05],
};

export const creditRatingsData = [
  { country: 'US', name: 'United States',  sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' },
  { country: 'DE', name: 'Germany', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
  { country: 'GB', name: 'United Kingdom', sp: 'AA', moodys: 'Aa3', fitch: 'AA-', region: 'Europe' },
  { country: 'JP', name: 'Japan',          sp: 'A+', moodys: 'A1', fitch: 'A', region: 'Asia-Pacific' },
  { country: 'FR', name: 'France', sp: 'AA-', moodys: 'Aa2', fitch: 'AA-', region: 'Europe' },
  { country: 'AU', name: 'Australia', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Asia-Pacific' },
  { country: 'CA', name: 'Canada', sp: 'AAA', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' },
  { country: 'IT', name: 'Italy',          sp: 'BBB', moodys: 'Baa3', fitch: 'BBB', region: 'Europe' },
  { country: 'CN', name: 'China',          sp: 'A+', moodys: 'A1', fitch: 'A+', region: 'Asia-Pacific' },
  { country: 'NL', name: 'Netherlands', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
  { country: 'SE', name: 'Sweden',         sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
  { country: 'CH', name: 'Switzerland', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
];

export const durationLadderData = [
  { bucket: '0-2y', amount: 2.4, pct: 22 },
  { bucket: '2-5y', amount: 3.1, pct: 28 },
  { bucket: '5-10y', amount: 3.6, pct: 33 },
  { bucket: '10y+',  amount: 1.9, pct: 17 },
];