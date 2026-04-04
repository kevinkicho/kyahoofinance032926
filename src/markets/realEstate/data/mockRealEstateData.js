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

export const affordabilityData = [
  { city: 'Hong Kong',   country: 'HK', priceToIncome: 18.8, mortgageToIncome: 92.4, medianPrice: 1280000, yoyChange:  -4.2 },
  { city: 'Sydney',      country: 'AU', priceToIncome: 13.2, mortgageToIncome: 74.5, medianPrice:  980000, yoyChange:   5.1 },
  { city: 'Vancouver',   country: 'CA', priceToIncome: 12.6, mortgageToIncome: 71.8, medianPrice:  920000, yoyChange:   2.3 },
  { city: 'London',      country: 'UK', priceToIncome: 11.0, mortgageToIncome: 65.2, medianPrice:  720000, yoyChange:   1.8 },
  { city: 'Auckland',    country: 'NZ', priceToIncome: 10.8, mortgageToIncome: 63.1, medianPrice:  680000, yoyChange:  -1.5 },
  { city: 'Toronto',     country: 'CA', priceToIncome: 10.5, mortgageToIncome: 61.4, medianPrice:  850000, yoyChange:   3.2 },
  { city: 'Singapore',   country: 'SG', priceToIncome:  9.8, mortgageToIncome: 57.2, medianPrice: 1100000, yoyChange:   2.8 },
  { city: 'Los Angeles', country: 'US', priceToIncome:  9.2, mortgageToIncome: 56.8, medianPrice:  820000, yoyChange:   4.5 },
  { city: 'New York',    country: 'US', priceToIncome:  8.9, mortgageToIncome: 54.1, medianPrice:  750000, yoyChange:   3.1 },
  { city: 'Munich',      country: 'DE', priceToIncome:  8.5, mortgageToIncome: 50.3, medianPrice:  620000, yoyChange:  -5.8 },
  { city: 'Paris',       country: 'FR', priceToIncome:  8.2, mortgageToIncome: 48.7, medianPrice:  580000, yoyChange:  -3.2 },
  { city: 'Tokyo',       country: 'JP', priceToIncome:  7.8, mortgageToIncome: 30.2, medianPrice:  480000, yoyChange:   6.2 },
  { city: 'Chicago',     country: 'US', priceToIncome:  5.4, mortgageToIncome: 33.5, medianPrice:  320000, yoyChange:   2.8 },
  { city: 'Berlin',      country: 'DE', priceToIncome:  5.1, mortgageToIncome: 30.8, medianPrice:  280000, yoyChange:  -4.1 },
  { city: 'Houston',     country: 'US', priceToIncome:  4.2, mortgageToIncome: 26.4, medianPrice:  260000, yoyChange:   1.5 },
];

export const capRateData = {
  dates:       ['Q1 22','Q2 22','Q3 22','Q4 22','Q1 23','Q2 23','Q3 23','Q4 23','Q1 24','Q2 24','Q3 24','Q4 24'],
  Industrial:  [3.8, 4.1, 4.5, 4.9, 5.0, 5.1, 5.2, 5.2, 5.1, 5.0, 5.0, 4.9],
  Multifamily: [4.2, 4.6, 5.0, 5.3, 5.5, 5.6, 5.7, 5.7, 5.6, 5.5, 5.4, 5.3],
  Retail:      [5.8, 6.0, 6.3, 6.6, 6.8, 6.9, 7.0, 7.0, 6.9, 6.8, 6.7, 6.6],
  Office:      [5.5, 5.9, 6.4, 6.9, 7.2, 7.5, 7.8, 8.0, 8.1, 8.2, 8.2, 8.3],
  Hotel:       [6.8, 7.0, 7.2, 7.4, 7.5, 7.5, 7.4, 7.3, 7.2, 7.1, 7.0, 6.9],
};
