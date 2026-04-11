// Unified commodity data source configuration
// Defines primary, secondary, and tertiary sources for each commodity/market

export const DATA_SOURCE_TIERS = {
  TIER_OFFICIAL: 'official',     // Government, central bank, exchange APIs
  TIER_AGGREGATOR: 'aggregator', // Data aggregators (Yahoo, FMP, etc.)
  TIER_CALCULATED: 'calculated', // Derived from other data
};

export const UPDATE_FREQUENCIES = {
  REALTIME: { label: 'Real-time', maxAgeMinutes: 5 },
  DELAYED: { label: 'Delayed', maxAgeMinutes: 15 },
  DAILY: { label: 'Daily', maxAgeMinutes: 60 * 24 },
  WEEKLY: { label: 'Weekly', maxAgeMinutes: 60 * 24 * 7 },
  MONTHLY: { label: 'Monthly', maxAgeMinutes: 60 * 24 * 35 },
};

// Commodity data source registry
export const commodityDataSources = {
  // Energy - Oil
  'WTI_CRUDE': {
    name: 'WTI Crude Oil',
    category: 'Energy',
    unit: '$/bbl',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.RWTC.D',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
        description: 'Cushing OK WTI Spot Price',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'DCOILWTICO',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
        description: 'Crude Oil Prices: West Texas Intermediate (WTI)',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'CL=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'BRENT_CRUDE': {
    name: 'Brent Crude Oil',
    category: 'Energy',
    unit: '$/bbl',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.RBRTE.D',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
        description: 'Europe Brent Spot Price',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'DCOILBRENTEU',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'BZ=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  // Energy - Natural Gas
  'NATGAS_HENRYHUB': {
    name: 'Natural Gas (Henry Hub)',
    category: 'Energy',
    unit: '$/MMBtu',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'NG.RNGWHHD.D',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'DHHNGSP',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'NG=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  // Energy - Refined Products
  'GASOLINE_REGULAR': {
    name: 'Regular Gasoline',
    category: 'Energy',
    unit: '$/gal',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.EER_EPMRU_PF4_RGC_DPG.D',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
        description: 'US Regular Conventional Gasoline',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'GASREGW',
        frequency: UPDATE_FREQUENCIES.WEEKLY,
        reliability: 'high',
      },
    ],
  },

  'DIESEL_ULS': {
    name: 'Ultra-Low Sulfur Diesel',
    category: 'Energy',
    unit: '$/gal',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.EER_EPD2DXL0_PFU_NUS_DPG.D',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
      },
    ],
  },

  'HEATING_OIL': {
    name: 'Heating Oil',
    category: 'Energy',
    unit: '$/gal',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.EER_EPD2F_PF4_Y44NY_DPG.D',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'HO=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  // Energy - Inventory Data (Weekly)
  'CRUDE_INVENTORIES': {
    name: 'Crude Oil Inventories',
    category: 'Energy',
    unit: 'Million Barrels',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.WCRSTUS1.W',
        frequency: UPDATE_FREQUENCIES.WEEKLY,
        reliability: 'high',
        description: 'Weekly Commercial Crude Oil Stocks',
      },
    ],
  },

  'GASOLINE_INVENTORIES': {
    name: 'Gasoline Inventories',
    category: 'Energy',
    unit: 'Million Barrels',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.WGSTUS1.W',
        frequency: UPDATE_FREQUENCIES.WEEKLY,
        reliability: 'high',
      },
    ],
  },

  'DISTILLATE_INVENTORIES': {
    name: 'Distillate Fuel Inventories',
    category: 'Energy',
    unit: 'Million Barrels',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'PET.WDFTUUS1.W',
        frequency: UPDATE_FREQUENCIES.WEEKLY,
        reliability: 'high',
      },
    ],
  },

  'NATGAS_STORAGE': {
    name: 'Natural Gas Storage',
    category: 'Energy',
    unit: 'Billion Cu Ft',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'EIA',
        series: 'NG.NW2_EPG0_SWO_R48_BCF.W',
        frequency: UPDATE_FREQUENCIES.WEEKLY,
        reliability: 'high',
      },
    ],
  },

  // Precious Metals
  'GOLD': {
    name: 'Gold',
    category: 'Metals',
    unit: '$/oz',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'GOLDAMGBD228NLBM',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
        description: 'Gold Fixing Price in London AM',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'GOLD',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        fallback: true,
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'GC=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'SILVER': {
    name: 'Silver',
    category: 'Metals',
    unit: '$/oz',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'SILVERUSDQB',
        frequency: UPDATE_FREQUENCIES.DAILY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SILVER',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        fallback: true,
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'SI=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'PLATINUM': {
    name: 'Platinum',
    category: 'Metals',
    unit: '$/oz',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PLATINUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'PL=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  // Industrial Metals
  'COPPER': {
    name: 'Copper',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COPPER',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'PCOPP',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'medium',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'HG=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'ALUMINUM': {
    name: 'Aluminum',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'ALUMINUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'PALUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'medium',
      },
    ],
  },

  'IRON_ORE': {
    name: 'Iron Ore',
    category: 'Metals',
    unit: '$/dry mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'IRON',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'LEAD': {
    name: 'Lead',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'LEAD',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'NICKEL': {
    name: 'Nickel',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'NICKEL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'TIN': {
    name: 'Tin',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'TIN',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'ZINC': {
    name: 'Zinc',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'ZINC',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  // Battery Metals - Critical for EVs and energy transition
  'LITHIUM': {
    name: 'Lithium',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'LITHIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Critical for EV batteries',
      },
    ],
  },

  'COBALT': {
    name: 'Cobalt',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COBALT',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Essential for battery cathodes',
      },
    ],
  },

  'MANGANESE': {
    name: 'Manganese',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MANGANESE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Steel production, battery cathodes',
      },
    ],
  },

  // Steel-making and Alloy Metals
  'MOLYBDENUM': {
    name: 'Molybdenum',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MOLYBDENUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Steel alloys, catalysts',
      },
    ],
  },

  'CHROMIUM': {
    name: 'Chromium',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'CHROMIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Stainless steel production',
      },
    ],
  },

  'VANADIUM': {
    name: 'Vanadium',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'VANADIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Steel alloys, battery storage',
      },
    ],
  },

  'TUNGSTEN': {
    name: 'Tungsten',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'TUNGSTEN',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'High-strength alloys, cutting tools',
      },
    ],
  },

  'ANTIMONY': {
    name: 'Antimony',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'ANTIMONY',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Flame retardants, batteries',
      },
    ],
  },

  'TITANIUM': {
    name: 'Titanium',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'TITANIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Aerospace, medical implants',
      },
    ],
  },

  // Rare Earth Elements (critical for technology)
  'RARE_EARTH': {
    name: 'Rare Earth Elements',
    category: 'Metals',
    unit: 'Index',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RARE_EARTH',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Magnet materials, electronics',
      },
    ],
  },

  // Precious Metals additions
  'PALLADIUM': {
    name: 'Palladium',
    category: 'Metals',
    unit: '$/oz',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PALLADIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Automotive catalysts',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'PA=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'RHODIUM': {
    name: 'Rhodium',
    category: 'Metals',
    unit: '$/oz',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RHODIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Automotive catalysts',
      },
    ],
  },

  'IRIDIUM': {
    name: 'Iridium',
    category: 'Metals',
    unit: '$/oz',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'IRIDIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Electronics, medical',
      },
    ],
  },

  'RUTHENIUM': {
    name: 'Ruthenium',
    category: 'Metals',
    unit: '$/oz',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RUTHENIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Electronics, catalysts',
      },
    ],
  },

  // Energy-related minerals
  'URANIUM': {
    name: 'Uranium',
    category: 'Metals',
    unit: '$/lb',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'URANIUM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Nuclear power fuel',
      },
    ],
  },

  'COPPER_ORE': {
    name: 'Copper Ore',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COPPER_ORE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Raw copper feedstock',
      },
    ],
  },

  'BAUXITE': {
    name: 'Bauxite',
    category: 'Metals',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'BAUXITE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Aluminum ore',
      },
    ],
  },

  // Agriculture
  'WHEAT_US_SRW': {
    name: 'Wheat (US SRW)',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'WHEAT_US_SRW',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'PWHEAMTUSDM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'medium',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'ZW=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'CORN': {
    name: 'Corn',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MAIZE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'PMAIZMTUSDM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'medium',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'ZC=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'SOYBEANS': {
    name: 'Soybeans',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SOYBEANS',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'PSOYBUSDM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'medium',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'ZS=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'RICE': {
    name: 'Rice',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RICE_05',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'OATS': {
    name: 'Oats',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'OATS',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'ZO=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'RAPESEED': {
    name: 'Rapeseed/Canola',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RAPESEED',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Major oilseed crop',
      },
    ],
  },

  'SUNFLOWER_OIL': {
    name: 'Sunflower Oil',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SUNFLOWER_OIL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Major cooking oil',
      },
    ],
  },

  'RAPESEED_OIL': {
    name: 'Rapeseed Oil',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RAPESEED_OIL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Canola oil',
      },
    ],
  },

  'OLIVE_OIL': {
    name: 'Olive Oil',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'OLIVE_OIL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Mediterranean staple',
      },
    ],
  },

  // Pulses and Oilseeds
  'PEANUTS': {
    name: 'Peanuts',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PEANUTS',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Major oilseed and snack',
      },
    ],
  },

  'PEANUT_OIL': {
    name: 'Peanut Oil',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PEANUT_OIL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'RAPESEED_MEAL': {
    name: 'Rapeseed Meal',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RAPESEED_MEAL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Animal feed',
      },
    ],
  },

  'SUNFLOWER_MEAL': {
    name: 'Sunflower Meal',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SUNFLOWER_MEAL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Animal feed',
      },
    ],
  },

  'COPRA': {
    name: 'Copra',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COPRA',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Dried coconut kernel',
      },
    ],
  },

  // Softs
  'COFFEE_ARABICA': {
    name: 'Coffee (Arabica)',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COFFEE_ARABIC',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'KC=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'COFFEE_ROBUSTA': {
    name: 'Coffee (Robusta)',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COFFEE_ROBUSTA',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'COCOA': {
    name: 'Cocoa',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COCOA',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'SUGAR_WLD': {
    name: 'Sugar (World)',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SUGAR_WLD',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'SB=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'COTTON': {
    name: 'Cotton',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COTTON_A_INDX',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'CT=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  // Tropical Products
  'BLACK_TEA': {
    name: 'Black Tea',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'TEA_KENYA',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Kenya auction prices',
      },
    ],
  },

  'PEPPER': {
    name: 'Pepper',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PEPPER',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Black pepper',
      },
    ],
  },

  'GINGER': {
    name: 'Ginger',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'GINGER',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'TURMERIC': {
    name: 'Turmeric',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'TURMERIC',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'CARDAMOM': {
    name: 'Cardamom',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'CARDAMOM',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'CLOVES': {
    name: 'Cloves',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'CLOVES',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'CINNAMON': {
    name: 'Cinnamon',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'CINNAMON',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'VANILLA': {
    name: 'Vanilla',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'VANILLA',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'NUTMEG': {
    name: 'Nutmeg',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'NUTMEG',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'MACE': {
    name: 'Mace',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MACE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  // Fruits
  'APPLES': {
    name: 'Apples',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'APPLES',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'MANGOS': {
    name: 'Mangos',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MANGOS',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'PINEAPPLES': {
    name: 'Pineapples',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PINEAPPLES',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'GRAPES': {
    name: 'Grapes',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'GRAPES',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  // Other Agricultural Products
  'HONEY': {
    name: 'Honey',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'HONEY',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'MILK': {
    name: 'Milk',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MILK',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'CHEESE': {
    name: 'Cheese',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'CHEESE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'BUTTER': {
    name: 'Butter',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'BUTTER',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'WOOL': {
    name: 'Wool',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'WOOL_COARSE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'SILK': {
    name: 'Silk',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SILK',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'JUTE': {
    name: 'Jute',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'JUTE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Natural fiber',
      },
    ],
  },

  'SISAL': {
    name: 'Sisal',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SISAL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Natural fiber',
      },
    ],
  },

  'COTTONSEED_OIL': {
    name: 'Cottonseed Oil',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'COTTONSEED_OIL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  // Livestock
  'BEEF': {
    name: 'Beef',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'BEEF',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'PBEEFUSDQ',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'medium',
      },
    ],
  },

  'LAMB': {
    name: 'Lamb',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'LAMB',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'POULTRY_CHICKEN': {
    name: 'Poultry (Chicken)',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'POULT_CHICK',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'FRED',
        series: 'PPOULTUSDQ',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'medium',
      },
    ],
  },

  'SHRIMP': {
    name: 'Shrimp',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'SHRIMP_TH',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'PORK': {
    name: 'Pork',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PORK',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
        description: 'Hog prices',
      },
    ],
  },

  'MUTTON': {
    name: 'Mutton',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MUTTON',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'FISH_SALMON': {
    name: 'Salmon',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'FISH_SALMON',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'FISH_TILAPIA': {
    name: 'Tilapia',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'FISH_TILAPIA',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'EGGS': {
    name: 'Eggs',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'EGGS',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'MILK_POWDER': {
    name: 'Milk Powder',
    category: 'Livestock',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'MILK_POWDER',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'LIVE_CATTLE': {
    name: 'Live Cattle',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'LIVE_CATTLE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'LE=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'FEEDER_CATTLE': {
    name: 'Feeder Cattle',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'FEEDER_CATTLE',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'GF=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  'LEAN_HOGS': {
    name: 'Lean Hogs',
    category: 'Livestock',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'LEAN_HOGS',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
      {
        tier: DATA_SOURCE_TIERS.TIER_AGGREGATOR,
        source: 'Yahoo',
        symbol: 'HE=F',
        frequency: UPDATE_FREQUENCIES.REALTIME,
        reliability: 'medium',
        fallback: true,
      },
    ],
  },

  // Other
  'PALM_OIL': {
    name: 'Palm Oil',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PALM_OIL',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'RUBBER': {
    name: 'Rubber',
    category: 'Agriculture',
    unit: '$/kg',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'RUBBER_TSR20',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'LOGS_CAMEROON': {
    name: 'Logs (Cameroon)',
    category: 'Agriculture',
    unit: '$/cm',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'LOGS_CAMEROON',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'PLYWOOD': {
    name: 'Plywood',
    category: 'Agriculture',
    unit: '$/sheet',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'PLYWOOD',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },

  'TOBACCO': {
    name: 'Tobacco',
    category: 'Agriculture',
    unit: '$/mt',
    sources: [
      {
        tier: DATA_SOURCE_TIERS.TIER_OFFICIAL,
        source: 'WorldBank',
        code: 'TOBACCO_US',
        frequency: UPDATE_FREQUENCIES.MONTHLY,
        reliability: 'high',
      },
    ],
  },
};

// Helper function to get sources for a commodity
export function getCommoditySources(commodityKey) {
  const commodity = commodityDataSources[commodityKey];
  if (!commodity) return null;

  return {
    ...commodity,
    primarySource: commodity.sources.find(s => !s.fallback),
    fallbackSources: commodity.sources.filter(s => s.fallback),
  };
}

// Get all commodities in a category
export function getCommoditiesByCategory(category) {
  return Object.entries(commodityDataSources)
    .filter(([_, data]) => data.category === category)
    .map(([key, data]) => ({ key, ...data }));
}

// Get all commodity keys
export function getAllCommodityKeys() {
  return Object.keys(commodityDataSources);
}

// Get commodities by data source
export function getCommoditiesBySource(sourceName) {
  const result = [];
  for (const [key, data] of Object.entries(commodityDataSources)) {
    const hasSource = data.sources.some(s => s.source === sourceName);
    if (hasSource) {
      result.push({ key, ...data });
    }
  }
  return result;
}
