// src/markets/commodities/data/mockCommoditiesData.js

export const priceDashboardData = [
  {
    sector: 'Energy',
    commodities: [
      { ticker: 'CL=F', name: 'WTI Crude',   unit: '$/bbl',   price: 82.14, change1d: 0.82,  change1w: -2.10, change1m: -4.31, sparkline: [84.2, 83.8, 83.1, 82.5, 82.9, 82.2, 82.4, 82.1, 82.0, 82.14] },
      { ticker: 'BZ=F', name: 'Brent Crude',  unit: '$/bbl',   price: 86.42, change1d: 0.71,  change1w: -1.93, change1m: -3.88, sparkline: [88.1, 87.6, 87.3, 87.0, 87.2, 86.8, 87.0, 86.6, 86.5, 86.42] },
      { ticker: 'NG=F', name: 'Natural Gas',  unit: '$/MMBtu', price:  1.93, change1d: -1.18, change1w:  3.41, change1m:  8.12, sparkline: [1.78, 1.80, 1.82, 1.85, 1.87, 1.89, 1.91, 1.92, 1.92, 1.93] },
      { ticker: 'RB=F', name: 'Gasoline',     unit: '$/gal',   price:  2.64, change1d: 0.45,  change1w: -0.82, change1m:  1.23, sparkline: [2.61, 2.62, 2.60, 2.63, 2.62, 2.64, 2.63, 2.65, 2.64, 2.64] },
    ],
  },
  {
    sector: 'Metals',
    commodities: [
      { ticker: 'GC=F', name: 'Gold',      unit: '$/oz',  price: 2314.0, change1d: 0.31,  change1w: 1.42,  change1m:  5.21, sparkline: [2198, 2220, 2245, 2268, 2281, 2294, 2301, 2308, 2311, 2314] },
      { ticker: 'SI=F', name: 'Silver',    unit: '$/oz',  price:   27.42, change1d: -0.21, change1w: 2.81,  change1m:  8.34, sparkline: [25.3, 25.6, 25.9, 26.2, 26.5, 26.8, 27.0, 27.2, 27.3, 27.42] },
      { ticker: 'HG=F', name: 'Copper',    unit: '$/lb',  price:    4.12, change1d: -0.48, change1w: -1.23, change1m:  3.41, sparkline: [3.98, 4.00, 4.04, 4.07, 4.10, 4.12, 4.11, 4.13, 4.12, 4.12] },
      { ticker: 'PL=F', name: 'Platinum',  unit: '$/oz',  price:  948.0,  change1d: -0.31, change1w: -0.94, change1m:  2.18, sparkline: [921, 927, 932, 937, 940, 943, 945, 947, 947, 948] },
    ],
  },
  {
    sector: 'Agriculture',
    commodities: [
      { ticker: 'ZW=F', name: 'Wheat',     unit: '¢/bu', price: 562.0,  change1d: -1.12, change1w: -3.21, change1m:  -8.42, sparkline: [612, 601, 591, 583, 577, 572, 569, 566, 564, 562] },
      { ticker: 'ZC=F', name: 'Corn',      unit: '¢/bu', price: 441.0,  change1d:  0.23, change1w: -1.14, change1m:  -4.21, sparkline: [461, 457, 454, 451, 449, 447, 445, 443, 442, 441] },
      { ticker: 'ZS=F', name: 'Soybeans',  unit: '¢/bu', price: 1142.0, change1d:  0.81, change1w:  1.21, change1m:  -2.84, sparkline: [1174, 1167, 1160, 1154, 1150, 1147, 1145, 1143, 1142, 1142] },
      { ticker: 'KC=F', name: 'Coffee',    unit: '¢/lb', price:  228.4, change1d: -0.72, change1w:  2.41, change1m:  12.34, sparkline: [202, 206, 210, 215, 219, 222, 225, 226, 228, 228.4] },
    ],
  },
];

export const futuresCurveData = {
  labels:    ["Jun '26", "Jul '26", "Aug '26", "Sep '26", "Oct '26", "Nov '26", "Dec '26", "Jan '27"],
  prices:    [82.14, 81.82, 81.54, 81.28, 81.05, 80.84, 80.65, 80.48],
  commodity: 'WTI Crude Oil',
  spotPrice: 82.14,
  unit:      '$/bbl',
};

export const sectorHeatmapData = {
  commodities: [
    { ticker: 'CL=F', name: 'WTI Crude',   sector: 'Energy',      d1:  0.82, w1: -2.10, m1:  -4.31 },
    { ticker: 'BZ=F', name: 'Brent Crude', sector: 'Energy',      d1:  0.71, w1: -1.93, m1:  -3.88 },
    { ticker: 'NG=F', name: 'Nat Gas',     sector: 'Energy',      d1: -1.18, w1:  3.41, m1:   8.12 },
    { ticker: 'RB=F', name: 'Gasoline',    sector: 'Energy',      d1:  0.45, w1: -0.82, m1:   1.23 },
    { ticker: 'GC=F', name: 'Gold',        sector: 'Metals',      d1:  0.31, w1:  1.42, m1:   5.21 },
    { ticker: 'SI=F', name: 'Silver',      sector: 'Metals',      d1: -0.21, w1:  2.81, m1:   8.34 },
    { ticker: 'HG=F', name: 'Copper',      sector: 'Metals',      d1: -0.48, w1: -1.23, m1:   3.41 },
    { ticker: 'PL=F', name: 'Platinum',    sector: 'Metals',      d1: -0.31, w1: -0.94, m1:   2.18 },
    { ticker: 'ZW=F', name: 'Wheat',       sector: 'Agriculture', d1: -1.12, w1: -3.21, m1:  -8.42 },
    { ticker: 'ZC=F', name: 'Corn',        sector: 'Agriculture', d1:  0.23, w1: -1.14, m1:  -4.21 },
    { ticker: 'ZS=F', name: 'Soybeans',    sector: 'Agriculture', d1:  0.81, w1:  1.21, m1:  -2.84 },
    { ticker: 'KC=F', name: 'Coffee',      sector: 'Agriculture', d1: -0.72, w1:  2.41, m1:  12.34 },
  ],
  columns: ['1d%', '1w%', '1m%'],
};

const CRUDE_PERIODS = ['2025-10-10','2025-10-17','2025-10-24','2025-10-31','2025-11-07','2025-11-14','2025-11-21','2025-11-28','2025-12-05','2025-12-12','2025-12-19','2025-12-26'];

export const supplyDemandData = {
  crudeStocks:    { periods: CRUDE_PERIODS, values: [454.2, 453.8, 455.1, 456.4, 458.2, 457.9, 456.1, 455.4, 454.8, 453.9, 452.8, 453.1], avg5yr: 432.1 },
  natGasStorage:  { periods: CRUDE_PERIODS, values: [3821, 3748, 3672, 3591, 3508, 3421, 3339, 3254, 3168, 3082, 2994, 2908],               avg5yr: 3142 },
  crudeProduction:{ periods: CRUDE_PERIODS, values: [13.1, 13.2, 13.1, 13.3, 13.2, 13.3, 13.4, 13.3, 13.2, 13.4, 13.5, 13.4] },
};

export const cotData = {
  commodities: [
    {
      name: 'WTI Crude Oil',
      latest: { noncommNet: 215400, commNet: -198200, totalOI: 1842000, netChange: 12800 },
      history: [
        { date: '2026-04-01', noncommNet: 215400 },
        { date: '2026-03-25', noncommNet: 202600 },
        { date: '2026-03-18', noncommNet: 198400 },
        { date: '2026-03-11', noncommNet: 210200 },
        { date: '2026-03-04', noncommNet: 205800 },
        { date: '2026-02-25', noncommNet: 195200 },
        { date: '2026-02-18', noncommNet: 188400 },
        { date: '2026-02-11', noncommNet: 192600 },
        { date: '2026-02-04', noncommNet: 201000 },
        { date: '2026-01-28', noncommNet: 208200 },
        { date: '2026-01-21', noncommNet: 198800 },
        { date: '2026-01-14', noncommNet: 194200 },
      ],
    },
    {
      name: 'Gold',
      latest: { noncommNet: 268400, commNet: -245800, totalOI: 524000, netChange: 8200 },
      history: [
        { date: '2026-04-01', noncommNet: 268400 },
        { date: '2026-03-25', noncommNet: 260200 },
        { date: '2026-03-18', noncommNet: 255800 },
        { date: '2026-03-11', noncommNet: 248200 },
        { date: '2026-03-04', noncommNet: 252400 },
        { date: '2026-02-25', noncommNet: 242800 },
        { date: '2026-02-18', noncommNet: 238200 },
        { date: '2026-02-11', noncommNet: 235400 },
        { date: '2026-02-04', noncommNet: 240600 },
        { date: '2026-01-28', noncommNet: 245800 },
        { date: '2026-01-21', noncommNet: 238400 },
        { date: '2026-01-14', noncommNet: 232800 },
      ],
    },
  ],
};
