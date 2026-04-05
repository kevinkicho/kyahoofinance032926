// src/markets/calendar/data/mockCalendarData.js

export const economicEvents = [
  { date: '2026-04-07', country: 'US', event: 'Consumer Credit', actual: null, expected: 15.0, previous: 18.1, importance: 2 },
  { date: '2026-04-08', country: 'US', event: 'NFIB Small Business Optimism', actual: null, expected: 100.7, previous: 100.7, importance: 2 },
  { date: '2026-04-10', country: 'US', event: 'CPI YoY', actual: null, expected: 2.6, previous: 2.8, importance: 3 },
  { date: '2026-04-10', country: 'US', event: 'CPI MoM', actual: null, expected: 0.1, previous: 0.2, importance: 3 },
  { date: '2026-04-10', country: 'DE', event: 'CPI YoY Final', actual: null, expected: 2.2, previous: 2.3, importance: 2 },
  { date: '2026-04-11', country: 'US', event: 'PPI MoM', actual: null, expected: 0.2, previous: 0.0, importance: 2 },
  { date: '2026-04-11', country: 'GB', event: 'GDP MoM', actual: null, expected: 0.1, previous: -0.1, importance: 3 },
  { date: '2026-04-14', country: 'CN', event: 'Trade Balance (USD)', actual: null, expected: 74.0, previous: 170.5, importance: 2 },
  { date: '2026-04-15', country: 'US', event: 'Retail Sales MoM', actual: null, expected: 0.4, previous: 0.2, importance: 3 },
  { date: '2026-04-16', country: 'US', event: 'Housing Starts', actual: null, expected: 1410, previous: 1501, importance: 2 },
  { date: '2026-04-17', country: 'US', event: 'Initial Jobless Claims', actual: null, expected: 223, previous: 219, importance: 2 },
  { date: '2026-04-17', country: 'EU', event: 'ECB Interest Rate Decision', actual: null, expected: 2.50, previous: 2.65, importance: 3 },
  { date: '2026-04-22', country: 'US', event: 'Existing Home Sales', actual: null, expected: 4.14, previous: 4.26, importance: 2 },
  { date: '2026-04-25', country: 'US', event: 'Durable Goods Orders MoM', actual: null, expected: 1.0, previous: 0.9, importance: 2 },
  { date: '2026-04-29', country: 'US', event: 'CB Consumer Confidence', actual: null, expected: 93.0, previous: 92.9, importance: 3 },
  { date: '2026-04-30', country: 'US', event: 'GDP QoQ Advance', actual: null, expected: 2.3, previous: 2.4, importance: 3 },
  { date: '2026-04-30', country: 'EU', event: 'GDP QoQ Flash', actual: null, expected: 0.2, previous: 0.2, importance: 3 },
  { date: '2026-05-01', country: 'US', event: 'ISM Manufacturing PMI', actual: null, expected: 49.5, previous: 50.3, importance: 3 },
  { date: '2026-05-02', country: 'US', event: 'Nonfarm Payrolls', actual: null, expected: 195, previous: 228, importance: 3 },
  { date: '2026-05-02', country: 'US', event: 'Unemployment Rate', actual: null, expected: 4.2, previous: 4.1, importance: 3 },
];

export const centralBanks = [
  { bank: 'Fed',  rate: 4.50, nextMeeting: '2026-05-06', daysUntil: 31, previousRate: 4.50 },
  { bank: 'ECB',  rate: 2.65, nextMeeting: '2026-04-16', daysUntil: 11, previousRate: 2.90 },
  { bank: 'BOE',  rate: 4.50, nextMeeting: '2026-05-07', daysUntil: 32, previousRate: 4.50 },
  { bank: 'BOJ',  rate: 0.50, nextMeeting: '2026-04-30', daysUntil: 25, previousRate: 0.50 },
];

export const earningsSeason = [
  { ticker: 'JPM',  name: 'JPMorgan Chase', date: '2026-04-11', epsEst: 4.61, epsPrev: 4.44, marketCapB: 680 },
  { ticker: 'WFC',  name: 'Wells Fargo',    date: '2026-04-11', epsEst: 1.24, epsPrev: 1.20, marketCapB: 220 },
  { ticker: 'BAC',  name: 'Bank of America', date: '2026-04-14', epsEst: 0.86, epsPrev: 0.83, marketCapB: 315 },
  { ticker: 'GS',   name: 'Goldman Sachs',  date: '2026-04-14', epsEst: 9.85, epsPrev: 11.58, marketCapB: 175 },
  { ticker: 'UNH',  name: 'UnitedHealth',   date: '2026-04-15', epsEst: 7.28, epsPrev: 6.91, marketCapB: 540 },
  { ticker: 'NFLX', name: 'Netflix',        date: '2026-04-15', epsEst: 5.68, epsPrev: 5.35, marketCapB: 320 },
  { ticker: 'TSLA', name: 'Tesla',          date: '2026-04-22', epsEst: 0.52, epsPrev: 0.45, marketCapB: 850 },
  { ticker: 'MSFT', name: 'Microsoft',      date: '2026-04-29', epsEst: 3.22, epsPrev: 3.30, marketCapB: 3100 },
  { ticker: 'META', name: 'Meta Platforms',  date: '2026-04-30', epsEst: 5.28, epsPrev: 4.71, marketCapB: 1500 },
  { ticker: 'AAPL', name: 'Apple',          date: '2026-04-30', epsEst: 1.65, epsPrev: 2.18, marketCapB: 3200 },
  { ticker: 'AMZN', name: 'Amazon',         date: '2026-05-01', epsEst: 1.38, epsPrev: 1.29, marketCapB: 2100 },
  { ticker: 'NVDA', name: 'NVIDIA',         date: '2026-05-21', epsEst: 0.89, epsPrev: 0.82, marketCapB: 2800 },
];

export const keyReleases = [
  { name: 'CPI',                     date: '2026-04-10', category: 'inflation',  previousValue: '2.8% YoY' },
  { name: 'PPI',                     date: '2026-04-11', category: 'inflation',  previousValue: '0.0% MoM' },
  { name: 'Retail Sales',            date: '2026-04-15', category: 'consumer',   previousValue: '0.2% MoM' },
  { name: 'Housing Starts',          date: '2026-04-16', category: 'housing',    previousValue: '1,501K' },
  { name: 'Industrial Production',   date: '2026-04-17', category: 'growth',     previousValue: '0.7% MoM' },
  { name: 'PCE Price Index',         date: '2026-04-25', category: 'inflation',  previousValue: '2.5% YoY' },
  { name: 'GDP (Advance)',           date: '2026-04-30', category: 'growth',     previousValue: '2.4% QoQ' },
  { name: 'Employment Situation',    date: '2026-05-02', category: 'employment', previousValue: '228K / 4.1%' },
  { name: 'ISM Manufacturing',       date: '2026-05-01', category: 'growth',     previousValue: '50.3' },
  { name: 'Consumer Confidence',     date: '2026-04-29', category: 'sentiment',  previousValue: '92.9' },
];
