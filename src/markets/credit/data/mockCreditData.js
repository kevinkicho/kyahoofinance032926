// src/markets/credit/data/mockCreditData.js

export const spreadData = {
  current: {
    igSpread:  98,   // bps BAMLC0A0CM
    hySpread:  342,  // bps BAMLH0A0HYM2
    emSpread:  285,  // bps BAMLEMCBPIOAS
    bbbSpread: 138,  // bps BAMLC0A4CBBB
    cccSpread: 842,  // bps BAMLH0A3HYC
  },
  history: {
    dates: ['Apr-25','May-25','Jun-25','Jul-25','Aug-25','Sep-25','Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
    IG:  [ 92, 94, 96, 98,102, 99, 97, 95, 96, 98,100, 98],
    HY:  [312,318,324,330,358,345,338,332,336,340,348,342],
    EM:  [262,268,274,278,298,292,286,280,284,288,292,285],
    BBB: [128,130,132,135,142,139,136,133,135,137,140,138],
  },
  etfs: [
    { ticker: 'LQD',  name: 'iShares IG Corp Bond',  price: 107.42, change1d: -0.18, yieldPct: 5.18, durationYr: 8.4 },
    { ticker: 'HYG',  name: 'iShares HY Corp Bond',  price:  78.24, change1d:  0.12, yieldPct: 7.82, durationYr: 3.6 },
    { ticker: 'EMB',  name: 'iShares EM USD Bond',   price:  88.64, change1d: -0.24, yieldPct: 7.14, durationYr: 7.2 },
    { ticker: 'JNK',  name: 'SPDR HY Bond',          price:  94.18, change1d:  0.08, yieldPct: 7.94, durationYr: 3.4 },
    { ticker: 'BKLN', name: 'Invesco Sr Loan ETF',   price:  21.84, change1d:  0.02, yieldPct: 8.64, durationYr: 0.4 },
    { ticker: 'MUB',  name: 'iShares Natl Muni Bond', price: 106.82, change1d: -0.08, yieldPct: 3.42, durationYr: 6.8 },
  ],
};

export const emBondData = {
  countries: [
    { country: 'Brazil',       code: 'BZ', spread: 210, rating: 'BB',  change1m:  -8, yld10y: 7.2, debtGdp:  88 },
    { country: 'Mexico',       code: 'MX', spread: 180, rating: 'BBB', change1m: -12, yld10y: 6.8, debtGdp:  54 },
    { country: 'Indonesia',    code: 'ID', spread: 165, rating: 'BBB', change1m:  -6, yld10y: 6.5, debtGdp:  39 },
    { country: 'South Africa', code: 'ZA', spread: 285, rating: 'BB',  change1m:   4, yld10y: 9.8, debtGdp:  74 },
    { country: 'India',        code: 'IN', spread: 142, rating: 'BBB', change1m:  -4, yld10y: 7.0, debtGdp:  84 },
    { country: 'Turkey',       code: 'TR', spread: 342, rating: 'B+',  change1m:  18, yld10y:12.4, debtGdp:  32 },
    { country: 'Philippines',  code: 'PH', spread: 128, rating: 'BBB', change1m:  -8, yld10y: 5.8, debtGdp:  58 },
    { country: 'Colombia',     code: 'CO', spread: 248, rating: 'BB+', change1m:   6, yld10y: 8.4, debtGdp:  58 },
    { country: 'Egypt',        code: 'EG', spread: 624, rating: 'B-',  change1m: -22, yld10y:18.2, debtGdp:  96 },
    { country: 'Nigeria',      code: 'NG', spread: 512, rating: 'B-',  change1m:  14, yld10y:15.8, debtGdp:  38 },
    { country: 'Saudi Arabia', code: 'SA', spread:  68, rating: 'A+',  change1m:  -2, yld10y: 4.6, debtGdp:  26 },
    { country: 'Chile',        code: 'CL', spread:  98, rating: 'A',   change1m:  -4, yld10y: 5.2, debtGdp:  40 },
  ],
  regions: [
    { region: 'Latin America', avgSpread: 184, change1m:  -3 },
    { region: 'Asia EM',       avgSpread: 145, change1m:  -6 },
    { region: 'EMEA',          avgSpread: 248, change1m:   8 },
    { region: 'Frontier',      avgSpread: 568, change1m:  -4 },
  ],
};

export const loanData = {
  cloTranches: [
    { tranche: 'AAA', spread: 145, yield: 6.82, rating: 'AAA', ltv: 65 },
    { tranche: 'AA',  spread: 210, yield: 7.47, rating: 'AA',  ltv: 72 },
    { tranche: 'A',   spread: 290, yield: 8.27, rating: 'A',   ltv: 78 },
    { tranche: 'BBB', spread: 420, yield: 9.57, rating: 'BBB', ltv: 83 },
    { tranche: 'BB',  spread: 720, yield:12.07, rating: 'BB',  ltv: 89 },
    { tranche: 'B',   spread:1050, yield:15.37, rating: 'B',   ltv: 94 },
    { tranche: 'Equity', spread: null, yield: 18.5, rating: 'NR', ltv: 100 },
  ],
  indices: [
    { name: 'BKLN NAV',                value: 21.84, change1d:  0.02, spread: 312 },
    { name: 'CS Lev Loan 100 Index',   value: 96.42, change1d:  0.08, spread: 318 },
    { name: 'LL New Issue Vol ($B YTD)',value: 142,   change1d: null,  spread: null },
    { name: 'Avg Loan Price',           value: 96.8,  change1d:  0.04, spread: null },
  ],
  priceHistory: {
    dates: ['Oct-25','Nov-25','Dec-25','Jan-26','Feb-26','Mar-26'],
    bkln:  [21.42,   21.54,   21.68,   21.72,   21.78,   21.84],
  },
};

export const defaultData = {
  rates: [
    { category: 'HY Default Rate (TTM)',       value: 3.8, prev: 4.2, peak: 14.0, unit: '%' },
    { category: 'Loan Default Rate (TTM)',      value: 2.4, prev: 2.8, peak: 10.8, unit: '%' },
    { category: 'HY Distressed Ratio',         value: 8.2, prev: 9.1, peak: 42.0, unit: '%' },
    { category: 'Loans Trading <80c',          value: 5.1, prev: 5.8, peak: 28.0, unit: '%' },
    { category: 'CCC/Split-B % of HY Index',   value:12.4, prev:12.8, peak: 22.0, unit: '%' },
  ],
  chargeoffs: {
    dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
    commercial: [1.42, 1.38, 1.44, 1.52, 1.48, 1.44, 1.40, 1.36],
    consumer:   [3.84, 3.92, 4.08, 4.22, 4.18, 4.10, 4.02, 3.94],
  },
  defaultHistory: {
    dates: ['Q1-24','Q2-24','Q3-24','Q4-24','Q1-25','Q2-25','Q3-25','Q4-25'],
    hy:   [4.8, 4.6, 4.4, 4.2, 4.0, 3.9, 3.8, 3.8],
    loan: [3.4, 3.2, 3.0, 2.8, 2.6, 2.5, 2.4, 2.4],
  },
};
