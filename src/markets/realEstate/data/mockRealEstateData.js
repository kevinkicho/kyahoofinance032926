// House Price Index — quarterly, indexed to 100 at 2015 Q1
export const priceIndexData = {
  US: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [152, 148, 158, 163, 170, 182, 195, 200, 210, 215, 208, 202, 198, 204, 210, 215, 220, 226, 228, 231],
  },
  UK: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [138, 133, 141, 148, 155, 165, 173, 178, 183, 186, 182, 175, 170, 168, 170, 173, 176, 180, 182, 185],
  },
  DE: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [145, 144, 149, 154, 160, 168, 175, 180, 186, 188, 182, 172, 163, 158, 156, 158, 161, 165, 167, 170],
  },
  AU: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [142, 137, 142, 150, 160, 175, 188, 196, 200, 197, 188, 180, 182, 190, 198, 205, 210, 215, 218, 222],
  },
  CA: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [148, 143, 152, 162, 175, 192, 205, 210, 215, 210, 195, 182, 178, 183, 190, 196, 200, 205, 207, 210],
  },
  JP: {
    dates:  ['Q1 20','Q2 20','Q3 20','Q4 20','Q1 21','Q2 21','Q3 21','Q4 21','Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
    values: [112, 110, 112, 114, 116, 119, 122, 124, 127, 130, 132, 134, 136, 139, 142, 145, 148, 151, 153, 156],
  },
};

export const reitData = [
  { ticker: 'PLD',  name: 'Prologis',          sector: 'Industrial',   dividendYield: 3.2, pFFO: 18.4, ytdReturn:  8.2, marketCap: 102 },
  { ticker: 'AMT',  name: 'American Tower',     sector: 'Cell Towers',  dividendYield: 3.8, pFFO: 22.1, ytdReturn: -2.1, marketCap:  88 },
  { ticker: 'EQIX', name: 'Equinix',            sector: 'Data Centers', dividendYield: 2.1, pFFO: 28.5, ytdReturn:  5.4, marketCap:  72 },
  { ticker: 'SPG',  name: 'Simon Property',     sector: 'Retail',       dividendYield: 5.6, pFFO: 12.8, ytdReturn:  4.1, marketCap:  48 },
  { ticker: 'WELL', name: 'Welltower',          sector: 'Healthcare',   dividendYield: 2.4, pFFO: 24.2, ytdReturn: 12.3, marketCap:  58 },
  { ticker: 'AVB',  name: 'AvalonBay',          sector: 'Residential',  dividendYield: 3.5, pFFO: 19.6, ytdReturn:  3.8, marketCap:  28 },
  { ticker: 'BXP',  name: 'Boston Properties',  sector: 'Office',       dividendYield: 6.8, pFFO:  9.4, ytdReturn: -8.5, marketCap:  11 },
  { ticker: 'PSA',  name: 'Public Storage',     sector: 'Self-Storage', dividendYield: 4.1, pFFO: 16.2, ytdReturn:  1.2, marketCap:  50 },
  { ticker: 'O',    name: 'Realty Income',      sector: 'Net Lease',    dividendYield: 6.0, pFFO: 13.5, ytdReturn: -1.8, marketCap:  44 },
  { ticker: 'VICI', name: 'VICI Properties',    sector: 'Gaming',       dividendYield: 5.5, pFFO: 14.0, ytdReturn:  2.9, marketCap:  32 },
];

export const affordabilityData = {
  current: { medianPrice: 420000, medianIncome: 75000, priceToIncome: 5.6, mortgageToIncome: 32.4, rate30y: 6.95, yoyChange: 4.2 },
  history: [
    { date: '2024-01-01', medianPrice: 380000, priceToIncome: 5.1 },
    { date: '2024-04-01', medianPrice: 390000, priceToIncome: 5.2 },
    { date: '2024-07-01', medianPrice: 400000, priceToIncome: 5.3 },
    { date: '2024-10-01', medianPrice: 410000, priceToIncome: 5.5 },
    { date: '2025-01-01', medianPrice: 415000, priceToIncome: 5.5 },
    { date: '2025-04-01', medianPrice: 420000, priceToIncome: 5.6 },
  ],
};

export const capRateData = [
  { sector: 'Office',       impliedYield: 5.8 },
  { sector: 'Retail',       impliedYield: 5.2 },
  { sector: 'Healthcare',   impliedYield: 4.8 },
  { sector: 'Net Lease',    impliedYield: 4.6 },
  { sector: 'Self-Storage', impliedYield: 4.2 },
  { sector: 'Residential',  impliedYield: 3.8 },
  { sector: 'Industrial',   impliedYield: 3.4 },
  { sector: 'Gaming',       impliedYield: 3.2 },
  { sector: 'Data Centers', impliedYield: 2.1 },
  { sector: 'Cell Towers',  impliedYield: 1.8 },
];
