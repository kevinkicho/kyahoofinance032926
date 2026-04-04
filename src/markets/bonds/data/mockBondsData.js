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
};

export const durationLadderData = [
  { bucket: '0–2y',  amount: 8420, pct: 34.2 },
  { bucket: '2–5y',  amount: 5980, pct: 24.3 },
  { bucket: '5–10y', amount: 6250, pct: 25.4 },
  { bucket: '10y+',  amount: 3950, pct: 16.1 },
];
