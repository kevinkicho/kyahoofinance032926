export const catBondSpreads = [
  { name: 'Kilimanjaro Re 2025-1', peril: 'US Hurricane',    sponsor: 'Swiss Re',      spread: 620, rating: 'BB',  trigger: 'Indemnity',    maturity: 'Jan 2028', notional: 300, expectedLoss: 2.1 },
  { name: 'Limestone Re 2025-A',   peril: 'US Hurricane',    sponsor: 'State Farm',    spread: 580, rating: 'BB-', trigger: 'Parametric',   maturity: 'Jun 2027', notional: 250, expectedLoss: 1.8 },
  { name: 'Montoya Re 2025-2',     peril: 'California EQ',   sponsor: 'Allianz',       spread: 840, rating: 'B+',  trigger: 'Indemnity',    maturity: 'Apr 2028', notional: 200, expectedLoss: 3.2 },
  { name: 'Cranberry Re 2025-1',   peril: 'Florida Hurricane',sponsor: 'Citizens',     spread: 710, rating: 'BB-', trigger: 'Indemnity',    maturity: 'Jun 2027', notional: 175, expectedLoss: 2.6 },
  { name: 'Resilience Re 2024-A',  peril: 'EU Windstorm',    sponsor: 'Munich Re',     spread: 390, rating: 'BB+', trigger: 'Industry Loss',maturity: 'Dec 2026', notional: 400, expectedLoss: 1.2 },
  { name: 'Nakama Re 2025-1',      peril: 'Japan Typhoon',   sponsor: 'Sompo',         spread: 450, rating: 'BB',  trigger: 'Parametric',   maturity: 'Sep 2027', notional: 150, expectedLoss: 1.5 },
  { name: 'Sichuan Re 2025-A',     peril: 'China EQ',        sponsor: 'PICC',          spread: 760, rating: 'B+',  trigger: 'Parametric',   maturity: 'Mar 2028', notional: 120, expectedLoss: 2.9 },
  { name: 'Torino Re 2024-2',      peril: 'EU Flood',        sponsor: 'Generali',      spread: 310, rating: 'BBB-',trigger: 'Industry Loss',maturity: 'Nov 2026', notional: 350, expectedLoss: 0.9 },
  { name: 'Bonfire Re 2025-1',     peril: 'Wildfire',        sponsor: 'Travelers',     spread: 920, rating: 'B',   trigger: 'Indemnity',    maturity: 'Aug 2028', notional: 100, expectedLoss: 3.8 },
  { name: 'Helios Re 2025-A',      peril: 'Multi-Peril',     sponsor: 'AIG',           spread: 540, rating: 'BB-', trigger: 'Indemnity',    maturity: 'Jun 2028', notional: 500, expectedLoss: 2.0 },
];

export const combinedRatioData = {
  quarters: ['Q1 23', 'Q2 23', 'Q3 23', 'Q4 23', 'Q1 24', 'Q2 24', 'Q3 24', 'Q4 24'],
  lines: {
    'Auto':        [98.2, 101.5,  99.8, 103.2, 105.1, 102.8, 100.4,  97.6],
    'Homeowners':  [88.4,  92.1, 115.2,  89.3,  94.8, 118.5,  91.2,  86.7],
    'Commercial':  [94.2,  96.8,  97.1,  95.4,  93.8,  96.2,  94.7,  92.1],
    'Specialty':   [82.1,  85.4,  83.2,  81.8,  84.6,  86.1,  83.8,  80.4],
  },
};

export const reserveAdequacyData = {
  lines:    ['Auto Liability', 'Workers Comp', 'General Liability', 'Commercial Property', 'Medical Malpractice'],
  reserves: [12400, 8900, 15200, 7800, 11300],
  required: [11800, 9200, 16100, 7400, 12800],
  adequacy: [105.1, 96.7, 94.4, 105.4, 88.3],
};

export const reinsurancePricing = [
  { peril: 'US Hurricane',      layer: '$100M xs $50M',   rol: 12.4, rolChange: +8.2,  rpl: 2.8, rplChange: +5.1,  capacity: 'Ample',      renewalDate: 'Jun 2025' },
  { peril: 'US Hurricane',      layer: '$200M xs $150M',  rol:  7.8, rolChange: +6.4,  rpl: 2.1, rplChange: +3.8,  capacity: 'Adequate',   renewalDate: 'Jun 2025' },
  { peril: 'California EQ',     layer: '$200M xs $100M',  rol: 18.6, rolChange: +15.3, rpl: 4.2, rplChange: +12.8, capacity: 'Tight',      renewalDate: 'Jan 2026' },
  { peril: 'Florida Hurricane', layer: '$150M xs $50M',   rol: 14.2, rolChange: +9.8,  rpl: 3.4, rplChange: +7.2,  capacity: 'Tight',      renewalDate: 'Jun 2025' },
  { peril: 'EU Windstorm',      layer: '€100M xs €50M',   rol:  6.2, rolChange: +2.1,  rpl: 1.8, rplChange: +1.4,  capacity: 'Ample',      renewalDate: 'Jan 2026' },
  { peril: 'Japan Typhoon',     layer: '¥20B xs ¥10B',    rol:  9.4, rolChange: +4.2,  rpl: 2.6, rplChange: +3.1,  capacity: 'Adequate',   renewalDate: 'Apr 2025' },
  { peril: 'Wildfire',          layer: '$50M xs $25M',    rol: 22.8, rolChange: +18.6, rpl: 5.8, rplChange: +14.2, capacity: 'Very Tight', renewalDate: 'Jan 2026' },
  { peril: 'Cyber',             layer: '$25M xs $10M',    rol: 16.4, rolChange: +11.2, rpl: 4.6, rplChange: +8.8,  capacity: 'Tight',      renewalDate: 'Jan 2026' },
  { peril: 'Marine',            layer: '$75M xs $25M',    rol:  5.8, rolChange: +1.6,  rpl: 1.4, rplChange: +0.9,  capacity: 'Ample',      renewalDate: 'Jan 2026' },
];

const MOCK_OAS_DATES = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2026-01-02');
  d.setDate(d.getDate() + i);
  return d.toISOString().split('T')[0];
});

export const fredHyOasHistory = {
  dates: MOCK_OAS_DATES,
  values: MOCK_OAS_DATES.map((_, i) => 350 + Math.sin(i / 10) * 50 + Math.random() * 20),
};

// Natural Catastrophe Losses (in $B)
const CAT_LOSS_DATES = Array.from({ length: 60 }, (_, i) => {
  const d = new Date('2025-01-01');
  d.setMonth(d.getMonth() - (60 - i));
  return d.toISOString().slice(0, 7);
});

export const catLosses = {
  dates: CAT_LOSS_DATES,
  values: CAT_LOSS_DATES.map((_, i) => Math.round((8 + Math.sin(i / 6) * 15 + (i % 12 === 8 ? 50 : 0) + Math.random() * 5) * 10) / 10),
};

// Combined Ratio History (industry average)
export const combinedRatioHistory = {
  quarters: combinedRatioData.quarters,
  values: combinedRatioData.quarters.map((_, qIdx) => {
    const ratios = Object.values(combinedRatioData.lines)
      .map(arr => arr[qIdx])
      .filter(v => v != null);
    return ratios.length ? Math.round(ratios.reduce((s, v) => s + v, 0) / ratios.length * 10) / 10 : null;
  }),
};
