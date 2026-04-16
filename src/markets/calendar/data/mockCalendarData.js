export const economicEvents = [
  { date: '2026-04-07', country: 'US', event: 'ISM Manufacturing PMI', actual: 49.8, expected: 50.2, previous: 50.1, importance: 3 },
  { date: '2026-04-08', country: 'US', event: 'JOLTS Job Openings', actual: '8.75M', expected: '8.90M', previous: '8.86M', importance: 2 },
  { date: '2026-04-09', country: 'US', event: 'FOMC Meeting Minutes', actual: null, expected: null, previous: null, importance: 3 },
  { date: '2026-04-10', country: 'US', event: 'CPI (YoY)', actual: null, expected: 2.9, previous: 3.0, importance: 3 },
  { date: '2026-04-10', country: 'EA', event: 'ECB Interest Rate Decision', actual: null, expected: 2.50, previous: 2.65, importance: 3 },
  { date: '2026-04-11', country: 'US', event: 'PPI (YoY)', actual: null, expected: 1.8, previous: 1.9, importance: 2 },
  { date: '2026-04-14', country: 'CN', event: 'GDP (YoY)', actual: null, expected: 5.0, previous: 4.9, importance: 3 },
  { date: '2026-04-15', country: 'US', event: 'Retail Sales (MoM)', actual: null, expected: 0.3, previous: 0.6, importance: 2 },
  { date: '2026-04-16', country: 'GB', event: 'CPI (YoY)', actual: null, expected: 4.2, previous: 4.0, importance: 2 },
  { date: '2026-04-17', country: 'US', event: 'Housing Starts', actual: null, expected: '1.38M', previous: '1.42M', importance: 2 },
  { date: '2026-04-18', country: 'JP', event: 'BOJ Policy Rate', actual: null, expected: 0.10, previous: 0.10, importance: 3 },
  { date: '2026-04-21', country: 'US', event: 'Existing Home Sales', actual: null, expected: '4.15M', previous: '4.08M', importance: 2 },
];

export const centralBanks = [
  { bank: 'Fed', country: 'US', rate: 4.50, nextMeeting: '2026-05-06', daysUntil: 28, previousRate: 4.50, stance: 'Hold' },
  { bank: 'ECB', country: 'EA', rate: 2.65, nextMeeting: '2026-04-16', daysUntil: 11, previousRate: 2.90, stance: 'Easing' },
  { bank: 'BOE', country: 'GB', rate: 4.50, nextMeeting: '2026-05-07', daysUntil: 32, previousRate: 4.50, stance: 'Hold' },
  { bank: 'BOJ', country: 'JP', rate: 0.10, nextMeeting: '2026-04-18', daysUntil: 13, previousRate: -0.10, stance: 'Tightening' },
];

export const earningsSeason = [
  { ticker: 'JPM',  name: 'JPMorgan Chase',   date: '2026-04-11', epsEst: 4.61, epsPrev: 4.44, sector: 'Financials' },
  { ticker: 'WFC',  name: 'Wells Fargo',       date: '2026-04-11', epsEst: 1.24, epsPrev: 1.20, sector: 'Financials' },
  { ticker: 'BAC',  name: 'Bank of America',   date: '2026-04-14', epsEst: 0.86, epsPrev: 0.83, sector: 'Financials' },
  { ticker: 'GS',   name: 'Goldman Sachs',     date: '2026-04-14', epsEst: 9.85, epsPrev: 11.58, sector: 'Financials' },
  { ticker: 'UNH',  name: 'UnitedHealth',      date: '2026-04-15', epsEst: 7.28, epsPrev: 6.91, sector: 'Health Care' },
  { ticker: 'JNJ',  name: 'Johnson & Johnson', date: '2026-04-15', epsEst: 2.58, epsPrev: 2.71, sector: 'Health Care' },
  { ticker: 'NFLX', name: 'Netflix',           date: '2026-04-15', epsEst: 5.68, epsPrev: 5.35, sector: 'Communication' },
  { ticker: 'TSLA', name: 'Tesla',             date: '2026-04-22', epsEst: 0.52, epsPrev: 0.45, sector: 'Consumer Disc.' },
  { ticker: 'AAPL', name: 'Apple',             date: '2026-04-30', epsEst: 1.65, epsPrev: 2.18, sector: 'Technology' },
];

export const keyReleases = [
  { name: 'US CPI (YoY)',        date: '2026-04-10', category: 'inflation',  importance: 3, previousValue: '3.0%' },
  { name: 'US Nonfarm Payrolls',  date: '2026-04-04', category: 'employment', importance: 3, previousValue: '228K' },
  { name: 'US GDP (QoQ)',         date: '2026-04-25', category: 'growth',     importance: 3, previousValue: '2.4%' },
  { name: 'FOMC Rate Decision',   date: '2026-05-06', category: 'central_bank', importance: 3, previousValue: '4.50%' },
  { name: 'China GDP (YoY)',      date: '2026-04-14', category: 'growth',     importance: 3, previousValue: '4.9%' },
  { name: 'US Retail Sales',      date: '2026-04-15', category: 'growth',     importance: 2, previousValue: '0.6%' },
  { name: 'ECB Interest Rate',    date: '2026-04-16', category: 'central_bank', importance: 3, previousValue: '2.65%' },
  { name: 'US ISM Manufacturing', date: '2026-04-01', category: 'manufacturing', importance: 2, previousValue: '50.1' },
  { name: 'UK CPI (YoY)',        date: '2026-04-16', category: 'inflation',  importance: 2, previousValue: '4.0%' },
  { name: 'Japan BOJ Rate',      date: '2026-04-18', category: 'central_bank', importance: 2, previousValue: '-0.10%' },
];