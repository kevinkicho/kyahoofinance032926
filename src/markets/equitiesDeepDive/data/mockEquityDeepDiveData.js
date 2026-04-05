// src/markets/equitiesDeepDive/data/mockEquityDeepDiveData.js

export const sectorData = {
  sectors: [
    { code: 'XLK',  name: 'Technology',        perf1d:  0.8, perf1w:  2.1, perf1m:  5.3, perf3m: 12.1, perf1y: 28.4 },
    { code: 'XLF',  name: 'Financials',         perf1d:  0.3, perf1w:  0.8, perf1m:  2.1, perf3m:  8.4, perf1y: 18.2 },
    { code: 'XLV',  name: 'Health Care',        perf1d: -0.2, perf1w: -0.5, perf1m:  1.2, perf3m:  3.1, perf1y:  8.4 },
    { code: 'XLE',  name: 'Energy',             perf1d:  1.2, perf1w:  3.4, perf1m: -2.1, perf3m: -5.3, perf1y:  2.1 },
    { code: 'XLI',  name: 'Industrials',        perf1d:  0.5, perf1w:  1.2, perf1m:  3.4, perf3m:  9.2, perf1y: 15.3 },
    { code: 'XLC',  name: 'Communication',      perf1d:  0.9, perf1w:  1.8, perf1m:  4.2, perf3m: 10.1, perf1y: 22.8 },
    { code: 'XLY',  name: 'Consumer Disc.',     perf1d:  0.6, perf1w:  1.5, perf1m:  3.8, perf3m:  7.6, perf1y: 14.2 },
    { code: 'XLP',  name: 'Consumer Staples',   perf1d: -0.1, perf1w:  0.2, perf1m:  0.8, perf3m:  2.1, perf1y:  5.3 },
    { code: 'XLRE', name: 'Real Estate',        perf1d: -0.3, perf1w: -0.8, perf1m: -1.2, perf3m: -3.4, perf1y: -2.1 },
    { code: 'XLB',  name: 'Materials',          perf1d:  0.4, perf1w:  0.9, perf1m:  2.3, perf3m:  5.8, perf1y: 10.4 },
    { code: 'XLU',  name: 'Utilities',          perf1d: -0.2, perf1w: -0.4, perf1m:  0.5, perf3m:  1.2, perf1y:  3.8 },
    { code: 'SPY',  name: 'S&P 500',            perf1d:  0.5, perf1w:  1.3, perf1m:  3.2, perf3m:  8.1, perf1y: 18.9 },
  ],
};

export const factorData = {
  inFavor: { value: 12.3, momentum: 28.1, quality: 8.4, lowVol: -2.1 },
  stocks: [
    { ticker: 'NVDA',  name: 'NVIDIA',          sector: 'Technology',       value: 15, momentum: 98, quality: 82, lowVol: 12, composite: 52 },
    { ticker: 'MSFT',  name: 'Microsoft',        sector: 'Technology',       value: 42, momentum: 88, quality: 91, lowVol: 65, composite: 72 },
    { ticker: 'AAPL',  name: 'Apple',            sector: 'Technology',       value: 38, momentum: 82, quality: 88, lowVol: 58, composite: 67 },
    { ticker: 'AVGO',  name: 'Broadcom',         sector: 'Technology',       value: 45, momentum: 79, quality: 85, lowVol: 52, composite: 65 },
    { ticker: 'META',  name: 'Meta',             sector: 'Communication',    value: 55, momentum: 91, quality: 78, lowVol: 35, composite: 65 },
    { ticker: 'GOOGL', name: 'Alphabet',         sector: 'Communication',    value: 60, momentum: 75, quality: 86, lowVol: 60, composite: 70 },
    { ticker: 'JPM',   name: 'JPMorgan',         sector: 'Financials',       value: 72, momentum: 68, quality: 82, lowVol: 55, composite: 69 },
    { ticker: 'V',     name: 'Visa',             sector: 'Financials',       value: 55, momentum: 72, quality: 94, lowVol: 75, composite: 74 },
    { ticker: 'LLY',   name: 'Eli Lilly',        sector: 'Health Care',      value: 20, momentum: 85, quality: 88, lowVol: 48, composite: 60 },
    { ticker: 'UNH',   name: 'UnitedHealth',     sector: 'Health Care',      value: 65, momentum: 55, quality: 90, lowVol: 72, composite: 71 },
    { ticker: 'WMT',   name: 'Walmart',          sector: 'Consumer Staples', value: 48, momentum: 78, quality: 85, lowVol: 82, composite: 73 },
    { ticker: 'PG',    name: 'P&G',              sector: 'Consumer Staples', value: 52, momentum: 62, quality: 89, lowVol: 88, composite: 73 },
    { ticker: 'AMZN',  name: 'Amazon',           sector: 'Consumer Disc.',   value: 35, momentum: 80, quality: 75, lowVol: 40, composite: 58 },
    { ticker: 'HD',    name: 'Home Depot',       sector: 'Consumer Disc.',   value: 58, momentum: 65, quality: 82, lowVol: 62, composite: 67 },
    { ticker: 'CAT',   name: 'Caterpillar',      sector: 'Industrials',      value: 62, momentum: 72, quality: 78, lowVol: 58, composite: 68 },
    { ticker: 'HON',   name: 'Honeywell',        sector: 'Industrials',      value: 65, momentum: 58, quality: 85, lowVol: 70, composite: 70 },
    { ticker: 'XOM',   name: 'ExxonMobil',       sector: 'Energy',           value: 78, momentum: 45, quality: 72, lowVol: 62, composite: 64 },
    { ticker: 'CVX',   name: 'Chevron',          sector: 'Energy',           value: 80, momentum: 42, quality: 75, lowVol: 65, composite: 66 },
    { ticker: 'TSLA',  name: 'Tesla',            sector: 'Consumer Disc.',   value:  8, momentum: 62, quality: 55, lowVol: 15, composite: 35 },
    { ticker: 'INTC',  name: 'Intel',            sector: 'Technology',       value: 85, momentum: 22, quality: 45, lowVol: 52, composite: 51 },
  ],
};

export const earningsData = {
  upcoming: [
    { ticker: 'JPM',  name: 'JPMorgan Chase',   sector: 'Financials',      date: '2026-04-11', epsEst: 4.61, epsPrev: 4.44, marketCapB: 680 },
    { ticker: 'WFC',  name: 'Wells Fargo',       sector: 'Financials',      date: '2026-04-11', epsEst: 1.24, epsPrev: 1.20, marketCapB: 220 },
    { ticker: 'BAC',  name: 'Bank of America',   sector: 'Financials',      date: '2026-04-14', epsEst: 0.86, epsPrev: 0.83, marketCapB: 315 },
    { ticker: 'GS',   name: 'Goldman Sachs',     sector: 'Financials',      date: '2026-04-14', epsEst: 9.85, epsPrev: 11.58, marketCapB: 175 },
    { ticker: 'UNH',  name: 'UnitedHealth',      sector: 'Health Care',     date: '2026-04-15', epsEst: 7.28, epsPrev: 6.91, marketCapB: 540 },
    { ticker: 'JNJ',  name: 'Johnson & Johnson', sector: 'Health Care',     date: '2026-04-15', epsEst: 2.58, epsPrev: 2.71, marketCapB: 390 },
    { ticker: 'NFLX', name: 'Netflix',           sector: 'Communication',   date: '2026-04-15', epsEst: 5.68, epsPrev: 5.35, marketCapB: 320 },
    { ticker: 'TSLA', name: 'Tesla',             sector: 'Consumer Disc.',  date: '2026-04-22', epsEst: 0.52, epsPrev: 0.45, marketCapB: 850 },
    { ticker: 'AAPL', name: 'Apple',             sector: 'Technology',      date: '2026-04-30', epsEst: 1.65, epsPrev: 2.18, marketCapB: 3200 },
  ],
  beatRates: [
    { sector: 'Technology',        beatCount: 25, totalCount: 32, beatRate: 78.1 },
    { sector: 'Financials',        beatCount: 18, totalCount: 24, beatRate: 75.0 },
    { sector: 'Health Care',       beatCount: 14, totalCount: 20, beatRate: 70.0 },
    { sector: 'Industrials',       beatCount: 16, totalCount: 24, beatRate: 66.7 },
    { sector: 'Communication',     beatCount: 10, totalCount: 16, beatRate: 62.5 },
    { sector: 'Consumer Disc.',    beatCount: 12, totalCount: 20, beatRate: 60.0 },
    { sector: 'Consumer Staples',  beatCount:  9, totalCount: 16, beatRate: 56.3 },
    { sector: 'Energy',            beatCount:  7, totalCount: 16, beatRate: 43.8 },
  ],
};

export const shortData = {
  mostShorted: [
    { ticker: 'CVNA',  name: 'Carvana',           sector: 'Consumer Disc.',   shortFloat: 28.4, daysToCover: 4.2, marketCapB:  32, perf1w:  3.8 },
    { ticker: 'GME',   name: 'GameStop',           sector: 'Consumer Disc.',   shortFloat: 24.5, daysToCover: 3.2, marketCapB:   8, perf1w:  8.4 },
    { ticker: 'CHWY',  name: 'Chewy',              sector: 'Consumer Disc.',   shortFloat: 22.1, daysToCover: 2.8, marketCapB:  14, perf1w:  1.2 },
    { ticker: 'RIVN',  name: 'Rivian',             sector: 'Consumer Disc.',   shortFloat: 20.8, daysToCover: 2.1, marketCapB:  18, perf1w: -2.4 },
    { ticker: 'PLUG',  name: 'Plug Power',         sector: 'Industrials',      shortFloat: 19.6, daysToCover: 1.8, marketCapB:   4, perf1w: -3.8 },
    { ticker: 'LCID',  name: 'Lucid Group',        sector: 'Consumer Disc.',   shortFloat: 18.9, daysToCover: 2.4, marketCapB:   7, perf1w: -1.5 },
    { ticker: 'BYND',  name: 'Beyond Meat',        sector: 'Consumer Staples', shortFloat: 18.2, daysToCover: 3.1, marketCapB:   1, perf1w: -0.8 },
    { ticker: 'CLSK',  name: 'CleanSpark',         sector: 'Technology',       shortFloat: 17.5, daysToCover: 1.5, marketCapB:   3, perf1w:  5.2 },
    { ticker: 'UPST',  name: 'Upstart',            sector: 'Financials',       shortFloat: 16.8, daysToCover: 2.2, marketCapB:   5, perf1w:  6.8 },
    { ticker: 'MARA',  name: 'Marathon Digital',   sector: 'Technology',       shortFloat: 16.2, daysToCover: 1.8, marketCapB:   5, perf1w:  4.1 },
    { ticker: 'NKLA',  name: 'Nikola',             sector: 'Industrials',      shortFloat: 15.8, daysToCover: 1.2, marketCapB:   1, perf1w: -5.2 },
    { ticker: 'OPEN',  name: 'Opendoor',           sector: 'Real Estate',      shortFloat: 15.2, daysToCover: 2.8, marketCapB:   3, perf1w:  2.1 },
    { ticker: 'SPCE',  name: 'Virgin Galactic',    sector: 'Industrials',      shortFloat: 14.1, daysToCover: 1.5, marketCapB:   2, perf1w: -3.4 },
    { ticker: 'SAVA',  name: 'Cassava Sciences',   sector: 'Health Care',      shortFloat: 13.8, daysToCover: 4.5, marketCapB:   1, perf1w:  1.8 },
    { ticker: 'LAZR',  name: 'Luminar',            sector: 'Technology',       shortFloat: 13.2, daysToCover: 2.1, marketCapB:   3, perf1w: -1.2 },
    { ticker: 'IONQ',  name: 'IonQ',               sector: 'Technology',       shortFloat: 12.8, daysToCover: 1.8, marketCapB:   5, perf1w:  9.2 },
    { ticker: 'ARRY',  name: 'Array Technologies', sector: 'Industrials',      shortFloat: 12.1, daysToCover: 2.4, marketCapB:   4, perf1w:  3.5 },
    { ticker: 'XPEV',  name: 'XPeng',              sector: 'Consumer Disc.',   shortFloat: 11.8, daysToCover: 2.2, marketCapB:  14, perf1w:  2.8 },
    { ticker: 'WOLF',  name: 'Wolfspeed',          sector: 'Technology',       shortFloat: 11.2, daysToCover: 1.9, marketCapB:   2, perf1w: -4.1 },
    { ticker: 'BYSI',  name: 'BioAtla',            sector: 'Health Care',      shortFloat: 10.8, daysToCover: 3.2, marketCapB:   1, perf1w:  0.4 },
  ],
};
