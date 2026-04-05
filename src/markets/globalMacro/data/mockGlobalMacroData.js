// Generates 60 monthly labels: 2020-01 … 2024-12
const HISTORY_DATES = Array.from({ length: 60 }, (_, i) => {
  const year  = 2020 + Math.floor(i / 12);
  const month = String((i % 12) + 1).padStart(2, '0');
  return `${year}-${month}`;
});

// Piecewise-constant rate history: pivots = [[startIndex, rate], ...]
// Each pivot applies from its index until the next pivot.
function makeRateHistory(pivots) {
  return HISTORY_DATES.map((_, i) => {
    let rate = pivots[0][1];
    for (const [start, value] of pivots) {
      if (i >= start) rate = value;
    }
    return rate;
  });
}

// ---------------------------------------------------------------------------
// scorecardData — 12 countries, 5 macro indicators (latest annual, ~2023)
// ---------------------------------------------------------------------------
export const scorecardData = [
  { code: 'US', name: 'United States',  flag: '🇺🇸', region: 'G7',       gdp:  2.8, cpi:  3.2, rate:  4.50, unemp:  3.7, debt: 122.0 },
  { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', region: 'Advanced', gdp:  0.4, cpi:  2.8, rate:  3.00, unemp:  6.1, debt:  91.0 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', region: 'G7',       gdp:  0.1, cpi:  6.7, rate:  4.75, unemp:  4.2, debt:  98.6 },
  { code: 'JP', name: 'Japan',          flag: '🇯🇵', region: 'G7',       gdp:  1.9, cpi:  3.3, rate:  0.10, unemp:  2.4, debt: 261.3 },
  { code: 'CA', name: 'Canada',         flag: '🇨🇦', region: 'G7',       gdp:  1.1, cpi:  3.9, rate:  4.25, unemp:  5.4, debt: 106.4 },
  { code: 'CN', name: 'China',          flag: '🇨🇳', region: 'EM',       gdp:  4.9, cpi:  0.2, rate:  3.45, unemp:  5.2, debt:  83.6 },
  { code: 'IN', name: 'India',          flag: '🇮🇳', region: 'EM',       gdp:  8.2, cpi:  5.7, rate:  6.50, unemp:  3.1, debt:  83.1 },
  { code: 'BR', name: 'Brazil',         flag: '🇧🇷', region: 'EM',       gdp:  2.9, cpi:  4.8, rate: 10.50, unemp:  8.1, debt:  87.6 },
  { code: 'KR', name: 'South Korea',    flag: '🇰🇷', region: 'EM',       gdp:  1.4, cpi:  3.6, rate:  3.50, unemp:  2.7, debt:  53.8 },
  { code: 'AU', name: 'Australia',      flag: '🇦🇺', region: 'Advanced', gdp:  2.0, cpi:  5.6, rate:  4.35, unemp:  3.9, debt:  55.3 },
  { code: 'MX', name: 'Mexico',         flag: '🇲🇽', region: 'EM',       gdp:  3.2, cpi:  5.2, rate: 11.00, unemp:  2.8, debt:  54.2 },
  { code: 'SE', name: 'Sweden',         flag: '🇸🇪', region: 'Advanced', gdp: -0.2, cpi:  5.9, rate:  3.50, unemp:  8.5, debt:  31.4 },
];

// ---------------------------------------------------------------------------
// growthInflationData — same GDP/CPI values, sorted by the component
// ---------------------------------------------------------------------------
export const growthInflationData = {
  year: 2023,
  countries: scorecardData.map(c => ({
    code: c.code, name: c.name, flag: c.flag, gdp: c.gdp, cpi: c.cpi,
  })),
};

// ---------------------------------------------------------------------------
// centralBankData — current rates (all 12) + 5-year history (7 FRED countries)
// ---------------------------------------------------------------------------
export const centralBankData = {
  current: [
    { code: 'US', name: 'United States',  flag: '🇺🇸', rate:  4.50, bank: 'Fed',      isLive: false },
    { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', rate:  3.00, bank: 'ECB',      isLive: false },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', rate:  4.75, bank: 'BoE',      isLive: false },
    { code: 'JP', name: 'Japan',          flag: '🇯🇵', rate:  0.10, bank: 'BoJ',      isLive: false },
    { code: 'CA', name: 'Canada',         flag: '🇨🇦', rate:  4.25, bank: 'BoC',      isLive: false },
    { code: 'CN', name: 'China',          flag: '🇨🇳', rate:  3.45, bank: 'PBoC',     isLive: false },
    { code: 'IN', name: 'India',          flag: '🇮🇳', rate:  6.50, bank: 'RBI',      isLive: false },
    { code: 'BR', name: 'Brazil',         flag: '🇧🇷', rate: 10.50, bank: 'BCB',      isLive: false },
    { code: 'KR', name: 'South Korea',    flag: '🇰🇷', rate:  3.50, bank: 'BoK',      isLive: false },
    { code: 'AU', name: 'Australia',      flag: '🇦🇺', rate:  4.35, bank: 'RBA',      isLive: false },
    { code: 'MX', name: 'Mexico',         flag: '🇲🇽', rate: 11.00, bank: 'Banxico',  isLive: false },
    { code: 'SE', name: 'Sweden',         flag: '🇸🇪', rate:  3.50, bank: 'Riksbank', isLive: false },
  ],
  history: {
    dates: HISTORY_DATES,
    series: [
      // Pivots encode the global rate hiking cycle 2022-2023
      { code: 'US', name: 'United States',  flag: '🇺🇸', values: makeRateHistory([[0,1.75],[3,0.25],[26,0.50],[28,1.00],[29,1.75],[30,2.50],[32,3.25],[34,4.00],[35,4.50],[37,4.75],[38,5.00],[41,5.50],[51,5.25],[53,4.75],[58,4.50]]) },
      { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', values: makeRateHistory([[0,0.00],[30,0.50],[32,1.25],[35,2.50],[37,3.00],[38,3.50],[40,4.00],[53,3.75],[55,3.50],[58,3.00]]) },
      { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', values: makeRateHistory([[0,0.75],[1,0.10],[25,0.25],[26,0.50],[28,1.00],[30,1.75],[32,2.25],[34,3.00],[35,3.50],[36,4.00],[38,4.25],[40,4.50],[43,5.25],[53,5.00],[55,4.75]]) },
      { code: 'JP', name: 'Japan',          flag: '🇯🇵', values: makeRateHistory([[0,-0.10],[51,0.10]]) },
      { code: 'CA', name: 'Canada',         flag: '🇨🇦', values: makeRateHistory([[0,1.75],[3,0.25],[26,0.50],[28,1.50],[30,2.50],[33,4.25],[36,4.50],[39,5.00],[52,4.75],[54,4.50],[57,4.25]]) },
      { code: 'AU', name: 'Australia',      flag: '🇦🇺', values: makeRateHistory([[0,0.75],[3,0.25],[28,0.85],[29,1.35],[30,1.85],[32,2.85],[34,3.10],[36,3.35],[38,3.60],[40,4.10],[42,4.35]]) },
      { code: 'SE', name: 'Sweden',         flag: '🇸🇪', values: makeRateHistory([[0,0.00],[26,0.25],[30,0.75],[32,1.75],[35,2.50],[36,3.00],[38,3.50],[40,4.00],[54,3.75],[57,3.50]]) },
    ],
  },
};

// ---------------------------------------------------------------------------
// debtData — government debt % GDP + current account % GDP (latest ~2023)
// ---------------------------------------------------------------------------
export const debtData = {
  year: 2023,
  countries: [
    { code: 'US', name: 'United States',  flag: '🇺🇸', debt: 122.0, currentAccount: -3.0 },
    { code: 'EA', name: 'Euro Area',      flag: '🇪🇺', debt:  91.0, currentAccount:  2.2 },
    { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', debt:  98.6, currentAccount: -2.7 },
    { code: 'JP', name: 'Japan',          flag: '🇯🇵', debt: 261.3, currentAccount:  3.5 },
    { code: 'CA', name: 'Canada',         flag: '🇨🇦', debt: 106.4, currentAccount: -1.4 },
    { code: 'CN', name: 'China',          flag: '🇨🇳', debt:  83.6, currentAccount:  1.5 },
    { code: 'IN', name: 'India',          flag: '🇮🇳', debt:  83.1, currentAccount: -1.5 },
    { code: 'BR', name: 'Brazil',         flag: '🇧🇷', debt:  87.6, currentAccount: -2.8 },
    { code: 'KR', name: 'South Korea',    flag: '🇰🇷', debt:  53.8, currentAccount:  2.3 },
    { code: 'AU', name: 'Australia',      flag: '🇦🇺', debt:  55.3, currentAccount: -1.8 },
    { code: 'MX', name: 'Mexico',         flag: '🇲🇽', debt:  54.2, currentAccount: -0.4 },
    { code: 'SE', name: 'Sweden',         flag: '🇸🇪', debt:  31.4, currentAccount:  5.5 },
  ],
};
