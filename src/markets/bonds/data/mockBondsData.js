export const yieldCurveData = {
  US: { '3m': 5.25, '6m': 5.10, '1y': 4.85, '2y': 4.60, '5y': 4.35, '10y': 4.20, '30y': 4.40 },
  DE: { '3m': 3.80, '6m': 3.70, '1y': 3.50, '2y': 3.20, '5y': 2.85, '10y': 2.65, '30y': 2.90 },
  JP: { '3m': 0.08, '6m': 0.12, '1y': 0.20, '2y': 0.35, '5y': 0.52, '10y': 0.72, '30y': 1.85 },
  GB: { '3m': 5.15, '6m': 5.00, '1y': 4.75, '2y': 4.40, '5y': 4.15, '10y': 4.25, '30y': 4.70 },
  IT: { '3m': 3.90, '6m': 3.80, '1y': 3.65, '2y': 3.55, '5y': 3.70, '10y': 4.05, '30y': 4.60 },
  FR: { '3m': 3.82, '6m': 3.72, '1y': 3.52, '2y': 3.28, '5y': 3.00, '10y': 3.10, '30y': 3.55 },
  CN: { '3m': 1.75, '6m': 1.85, '1y': 1.95, '2y': 2.05, '5y': 2.25, '10y': 2.35, '30y': 2.60 },
  AU: { '3m': 4.35, '6m': 4.28, '1y': 4.15, '2y': 4.00, '5y': 3.95, '10y': 4.30, '30y': 4.75 },
};

export const creditRatingsData = [
  { country: 'AU', name: 'Australia',      sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Asia-Pacific' },
  { country: 'DE', name: 'Germany',        sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Europe'       },
  { country: 'NL', name: 'Netherlands',    sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Europe'       },
  { country: 'CA', name: 'Canada',         sp: 'AAA',  moodys: 'Aaa',  fitch: 'AA+',  region: 'Americas'     },
  { country: 'SE', name: 'Sweden',         sp: 'AAA',  moodys: 'Aaa',  fitch: 'AAA',  region: 'Europe'       },
  { country: 'US', name: 'United States',  sp: 'AA+',  moodys: 'Aaa',  fitch: 'AA+',  region: 'Americas'     },
  { country: 'GB', name: 'United Kingdom', sp: 'AA',   moodys: 'Aa3',  fitch: 'AA-',  region: 'Europe'       },
  { country: 'FR', name: 'France',         sp: 'AA-',  moodys: 'Aa2',  fitch: 'AA-',  region: 'Europe'       },
  { country: 'JP', name: 'Japan',          sp: 'A+',   moodys: 'A1',   fitch: 'A',    region: 'Asia-Pacific' },
  { country: 'CN', name: 'China',          sp: 'A+',   moodys: 'A1',   fitch: 'A+',   region: 'Asia-Pacific' },
  { country: 'IT', name: 'Italy',          sp: 'BBB',  moodys: 'Baa3', fitch: 'BBB',  region: 'Europe'       },
  { country: 'BR', name: 'Brazil',         sp: 'BB',   moodys: 'Ba1',  fitch: 'BB',   region: 'Americas'     },
];

export const spreadData = {
  dates: ['Apr-24','May-24','Jun-24','Jul-24','Aug-24','Sep-24','Oct-24','Nov-24','Dec-24','Jan-25','Feb-25','Mar-25'],
  IG:    [112, 108, 115, 120, 118, 106, 102, 98,  105, 110, 108, 104],
  HY:    [345, 330, 360, 385, 370, 340, 325, 310, 340, 360, 355, 342],
  EM:    [410, 395, 425, 455, 440, 405, 388, 372, 395, 420, 415, 398],
  BBB:   [185, 178, 192, 205, 198, 182, 175, 168, 180, 195, 190, 185],
};

export const durationLadderData = [
  { bucket: '0–2y',  amount: 8420, pct: 34.2 },
  { bucket: '2–5y',  amount: 5980, pct: 24.3 },
  { bucket: '5–10y', amount: 6250, pct: 25.4 },
  { bucket: '10y+',  amount: 3950, pct: 16.1 },
];

export const spreadIndicators = {
  t10y2y:  0.42,
  t10y3m: -0.15,
  t5yie:   2.31,
  t10yie:  2.28,
  dfii10:  1.92,
};

export const breakevensData = {
  current: { be5y: 2.31, be10y: 2.28, forward5y5y: 2.25, real5y: 1.85, real10y: 1.92 },
  history: {
    dates: [
      'Oct-24','Oct-24','Nov-24','Nov-24','Dec-24','Dec-24','Jan-25','Jan-25',
      'Feb-25','Feb-25','Mar-25','Mar-25','Mar-25','Mar-25','Mar-25','Mar-25',
      'Mar-25','Mar-25','Mar-25','Apr-25','Apr-25','Apr-25','Apr-25','Apr-25',
    ],
    be5y:        [2.18,2.20,2.22,2.24,2.19,2.16,2.21,2.25,2.28,2.30,2.32,2.34,2.31,2.29,2.27,2.30,2.32,2.33,2.31,2.30,2.29,2.31,2.32,2.31],
    be10y:       [2.22,2.24,2.25,2.27,2.23,2.20,2.24,2.27,2.29,2.31,2.32,2.33,2.30,2.28,2.27,2.29,2.31,2.32,2.30,2.29,2.28,2.29,2.30,2.28],
    forward5y5y: [2.26,2.28,2.28,2.30,2.27,2.24,2.27,2.29,2.30,2.32,2.32,2.32,2.29,2.27,2.27,2.28,2.30,2.31,2.29,2.28,2.27,2.27,2.28,2.25],
  },
};

// 60-day sinusoidal mock for FRED DGS10 1yr history
export const fredYieldHistory = (() => {
  const dates = [];
  const values = [];
  const base = new Date('2025-03-01');
  for (let i = 0; i < 60; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().split('T')[0]);
    values.push(+(4.20 + 0.25 * Math.sin(i / 10)).toFixed(2));
  }
  return { dates, values };
})();

// Real Yields (TIPS)
export const tipsYields = {
  '5y': 1.85,
  '10y': 1.92,
  '30y': 2.05,
};

// Real Yield History (for charting)
export const realYieldHistory = (() => {
  const dates = [];
  const d5y = [];
  const d10y = [];
  const base = new Date('2024-04-01');
  for (let i = 0; i < 52; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toISOString().split('T')[0]);
    d5y.push(+(1.75 + 0.15 * Math.sin(i / 8)).toFixed(2));
    d10y.push(+(1.85 + 0.12 * Math.sin(i / 10)).toFixed(2));
  }
  return { dates, d5y, d10y };
})();

// Macro Indicators
export const macroData = {
  fedBalanceSheet: 7.2, // Trillions
  m2: 20.8, // Trillions
  federalDebt: 34.5, // Trillions
  surplusDeficit: -1.7, // Trillions (annual)
  unemployment: 4.1, // Percent
  laborParticipation: 62.5, // Percent
  gdp: 2.8, // Percent (annualized)
  pce: 2.4, // Percent (YoY)
  tb3ms: 5.25, // Percent
};

// Fed Balance Sheet History (for charting)
export const fedBalanceSheetHistory = (() => {
  const dates = [];
  const values = [];
  const base = new Date('2024-04-01');
  for (let i = 0; i < 52; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toISOString().split('T')[0].slice(5).replace('-', '-'));
    values.push(+(8.5 - i * 0.025).toFixed(2)); // Declining (QT)
  }
  return { dates, values };
})();

// M2 History (for charting)
export const m2HistoryData = (() => {
  const dates = [];
  const values = [];
  const base = new Date('2024-04-01');
  for (let i = 0; i < 52; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toISOString().split('T')[0].slice(5).replace('-', '-'));
    values.push(+(20.5 + i * 0.01).toFixed(2));
  }
  return { dates, values };
})();

// Credit Indices
export const creditIndices = {
  aaa10y: 0.25, // AAA-10Y spread (bp)
  baa10y: 1.85, // BAA-AAA spread (%)
};

// Treasury Auction Data
export const auctionData = [
  { date: '2025-04-01', term: '4-Week', type: 'Bill', yield: 4.35, bidToCover: 2.45 },
  { date: '2025-04-01', term: '8-Week', type: 'Bill', yield: 4.30, bidToCover: 2.38 },
  { date: '2025-04-01', term: '13-Week', type: 'Bill', yield: 4.25, bidToCover: 2.52 },
  { date: '2025-04-01', term: '26-Week', type: 'Bill', yield: 4.15, bidToCover: 2.41 },
  { date: '2025-04-01', term: '52-Week', type: 'Bill', yield: 4.00, bidToCover: 2.33 },
  { date: '2025-03-25', term: '4-Week', type: 'Bill', yield: 4.38, bidToCover: 2.42 },
];

// National Debt (Trillions)
export const nationalDebt = 34.5;

// Spread History (for yield curve spread charts)
export const spreadHistory = (() => {
  const dates = [];
  const t10y2y = [];
  const t10y3m = [];
  const t5y30y = [];
  const base = new Date('2024-04-01');
  for (let i = 0; i < 52; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    dates.push(d.toISOString().split('T')[0].slice(5).replace('-', '-'));
    // 10Y-2Y spread oscillating around 0.4%
    t10y2y.push(+(0.42 + 0.15 * Math.sin(i / 8)).toFixed(2));
    // 10Y-3M spread (inversion indicator)
    t10y3m.push(+(-0.15 + 0.20 * Math.sin(i / 6)).toFixed(2));
    // 5Y-30Y spread
    t5y30y.push(+(0.20 + 0.10 * Math.sin(i / 10)).toFixed(2));
  }
  return {
    dates,
    t10y2y,
    t10y3m,
    t5y30y,
    latest: { t10y2y: 0.42, t10y3m: -0.15, t5y30y: 0.20 },
  };
})();

// CPI Components (for inflation breakout chart)
export const cpiComponents = (() => {
  const dates = [];
  const all = [];
  const core = [];
  const food = [];
  const energy = [];
  const base = new Date('2024-01-01');
  for (let i = 0; i < 48; i++) { // 4 years of monthly data
    const d = new Date(base);
    d.setMonth(d.getMonth() + i);
    dates.push(d.toISOString().split('T')[0].slice(5).replace('-', '-'));
    // YoY inflation rates
    all.push(+(3.2 + 0.8 * Math.sin(i / 12) - i * 0.01).toFixed(1));
    core.push(+(3.5 + 0.3 * Math.sin(i / 10) - i * 0.005).toFixed(1));
    food.push(+(2.8 + 1.5 * Math.sin(i / 8) + i * 0.02).toFixed(1));
    energy.push(+(5.0 + 3.0 * Math.sin(i / 6) - i * 0.03).toFixed(1));
  }
  return {
    dates,
    all,
    core,
    food,
    energy,
    latest: {
      all: 315.5,
      core: 318.2,
      food: 310.8,
      energy: 305.3,
      allYoy: 3.2,
    },
  };
})();

// Debt-to-GDP History (quarterly)
export const debtToGdpHistory = (() => {
  const dates = [];
  const values = [];
  const base = new Date('2020-01-01');
  for (let i = 0; i < 21; i++) { // Q1 2020 to Q1 2025
    const d = new Date(base);
    d.setMonth(d.getMonth() + i * 3);
    dates.push(d.toISOString().split('T')[0].slice(0, 7)); // YYYY-MM format
    // Rising from 106% to 122%
    values.push(+(106 + i * 0.8).toFixed(1));
  }
  return {
    dates,
    values,
    latest: 122.1,
  };
})();
