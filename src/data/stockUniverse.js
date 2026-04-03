// ─── Real Global Stock Universe ──────────────────────────────────────────────
// Approximate data as of early 2025 (USD-equivalent)
// Fields: marketCap ($B), revenue ($B), netIncome ($B), pe, divYield (%)
// Live data layers on top via yahoo-finance2 when backend is running

const mkColor = (t) => {
  const h = t.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return ['#27ae60', '#2ecc71', '#e74c3c', '#c0392b'][h % 4];
};

const s = (name, fullName, marketCap, revenue, netIncome, pe, divYield, sector) => ({
  name, fullName, marketCap, revenue,
  netIncome: Math.max(netIncome, 0.1),
  pe: pe > 0 ? pe : 999,
  divYield: divYield || 0,
  value: marketCap,
  sector,
  itemStyle: { color: mkColor(name) },
});

// ─── Markets ──────────────────────────────────────────────────────────────────

export const stockUniverseData = [
  {
    name: 'USA (NYSE & NASDAQ)',
    currency: 'USD', symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#3b82f6' },
    children: [
      s('AAPL',  'Apple Inc.',            3500, 391, 97,  31,  0.5, 'Technology'),
      s('MSFT',  'Microsoft Corp.',       3100, 245, 88,  35,  0.7, 'Technology'),
      s('NVDA',  'NVIDIA Corp.',          2900, 130, 73,  40,  0.1, 'Technology'),
      s('GOOGL', 'Alphabet Inc.',         2200, 340, 74,  23,  0.5, 'Technology'),
      s('AMZN',  'Amazon.com Inc.',       2200, 620, 35,  63,  0,   'Consumer'),
      s('META',  'Meta Platforms',        1500, 165, 50,  28,  0.4, 'Technology'),
      s('BRK-B', 'Berkshire Hathaway',     950, 365, 96,  10,  0,   'Financials'),
      s('WMT',   'Walmart Inc.',           690, 648, 15,  46,  1.0, 'Consumer'),
      s('TSLA',  'Tesla Inc.',             680, 97,  7.1, 96,  0,   'Consumer'),
      s('LLY',   'Eli Lilly & Co.',        770, 45,  5.8, 135, 0.7, 'Healthcare'),
      s('AVGO',  'Broadcom Inc.',          740, 51,  14,  53,  1.3, 'Technology'),
      s('JPM',   'JPMorgan Chase',         650, 158, 50,  13,  2.3, 'Financials'),
      s('V',     'Visa Inc.',              600, 35,  19,  31,  0.7, 'Financials'),
      s('XOM',   'ExxonMobil Corp.',       520, 400, 36,  14,  3.4, 'Energy'),
      s('UNH',   'UnitedHealth Group',     510, 372, 16,  32,  1.5, 'Healthcare'),
      s('MA',    'Mastercard Inc.',        490, 28,  12,  41,  0.6, 'Financials'),
      s('ORCL',  'Oracle Corp.',           390, 53,  10,  36,  1.0, 'Technology'),
      s('ABBV',  'AbbVie Inc.',            360, 55,  4.3, 82,  3.2, 'Healthcare'),
      s('PG',    "Procter & Gamble",       385, 84,  15,  25,  2.4, 'Consumer'),
      s('COST',  'Costco Wholesale',       380, 242, 7.4, 54,  0.5, 'Consumer'),
      s('JNJ',   'Johnson & Johnson',      380, 89,  14,  27,  3.0, 'Healthcare'),
      s('HD',    'Home Depot Inc.',        375, 153, 17,  22,  2.4, 'Consumer'),
      s('BAC',   'Bank of America',        340, 96,  27,  13,  2.4, 'Financials'),
      s('NFLX',  'Netflix Inc.',           350, 37,  7.0, 50,  0,   'Technology'),
      s('KO',    'Coca-Cola Co.',          285, 46,  10,  28,  3.1, 'Consumer'),
      s('MRK',   'Merck & Co.',            270, 60,  15,  18,  2.5, 'Healthcare'),
      s('CRM',   'Salesforce Inc.',        275, 35,  4.1, 68,  0,   'Technology'),
      s('AMD',   'Advanced Micro Devices', 250, 25,  0.9, 278, 0,   'Technology'),
      s('CSCO',  'Cisco Systems',          230, 55,  10,  23,  3.5, 'Technology'),
      s('GE',    'GE Aerospace',           230, 68,  9.3, 25,  0.6, 'Industrials'),
    ]
  },
  {
    name: 'Euronext (Europe)',
    currency: 'EUR', symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#10b981' },
    children: [
      s('MC',    'LVMH Moët Hennessy',    360, 93,  10,  24, 1.8, 'Consumer'),
      s('ASML',  'ASML Holding',          340, 30,  7.8, 44, 1.0, 'Technology'),
      s('OR',    "L'Oréal S.A.",          210, 46,  6.5, 32, 1.9, 'Consumer'),
      s('RMS',   'Hermès International',  220, 14,  4.6, 48, 1.3, 'Consumer'),
      s('SAN',   'Sanofi S.A.',           140, 50,  5.2, 27, 3.5, 'Healthcare'),
      s('TTE',   'TotalEnergies SE',      160, 218, 19,  8,  4.5, 'Energy'),
      s('SU',    'Schneider Electric',    130, 39,  4.1, 32, 1.4, 'Industrials'),
      s('AIR',   'Airbus SE',             130, 79,  3.8, 34, 1.3, 'Industrials'),
      s('AI',    'Air Liquide S.A.',       90, 32,  3.0, 30, 2.4, 'Industrials'),
      s('BNP',   'BNP Paribas',            85, 52,  10,  8,  5.8, 'Financials'),
      s('CS',    'AXA S.A.',               75, 120, 7.8, 10, 6.3, 'Financials'),
      s('EL',    'EssilorLuxottica',        82, 26,  2.2, 37, 1.3, 'Healthcare'),
      s('DG',    'Vinci S.A.',              73, 77,  5.0, 15, 3.8, 'Industrials'),
      s('STLA',  'Stellantis N.V.',         52, 189, 18,  3,  7.8, 'Consumer'),
      s('IFX',   'Infineon Technologies',   55, 16,  1.5, 37, 1.5, 'Technology'),
      s('ENGI',  'Engie S.A.',              42, 85,  3.2, 13, 6.8, 'Energy'),
      s('BN',    'Danone S.A.',             37, 30,  1.8, 21, 3.5, 'Consumer'),
      s('RI',    'Pernod Ricard',           37, 12,  1.5, 25, 3.5, 'Consumer'),
      s('ML',    'Michelin Group',          25, 32,  2.4, 10, 3.2, 'Consumer'),
      s('NOKIA', 'Nokia Oyj',              22, 23,  0.8, 27, 2.9, 'Technology'),
    ]
  },
  {
    name: 'Shanghai (China)',
    currency: 'CNY', symbol: '¥',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#ef4444' },
    children: [
      s('600519', 'Kweichow Moutai',       300, 18,  8.5, 35, 1.5, 'Consumer'),
      s('601398', 'ICBC',                  260, 110, 32,  8,  5.9, 'Financials'),
      s('601939', 'China Const. Bank',     220, 95,  29,  7,  6.0, 'Financials'),
      s('601288', 'Agricultural Bank CN',  210, 85,  25,  8,  6.5, 'Financials'),
      s('601988', 'Bank of China',         200, 80,  23,  8,  6.0, 'Financials'),
      s('601857', 'PetroChina',            200, 430, 18,  11, 5.8, 'Energy'),
      s('600028', 'Sinopec',               140, 380, 8.0, 17, 7.0, 'Energy'),
      s('601318', 'Ping An Insurance',     140, 150, 12,  11, 5.0, 'Financials'),
      s('600036', 'China Merchants Bank',  150, 52,  16,  9,  6.0, 'Financials'),
      s('601628', 'China Life Insurance',  115, 55,  7.0, 16, 3.5, 'Financials'),
      s('601088', 'China Shenhua Energy',   80, 37,  10,  8,  7.5, 'Energy'),
      s('600900', 'Yangtze Power',           75, 9,   4.2, 18, 5.5, 'Energy'),
      s('601166', 'Industrial Bank',         65, 30,  8.0, 8,  5.5, 'Financials'),
      s('601601', 'China Pacific Ins.',      55, 45,  3.5, 16, 3.5, 'Financials'),
      s('601888', 'China Tourism Group',     50, 9,   2.0, 25, 1.5, 'Consumer'),
      s('601012', 'LONGi Green Energy',      45, 14,  1.0, 45, 1.5, 'Technology'),
      s('600030', 'CITIC Securities',        50, 18,  4.5, 11, 4.5, 'Financials'),
      s('600104', 'SAIC Motor',              40, 110, 2.5, 16, 5.8, 'Consumer'),
      s('600000', 'Shanghai Pudong Bank',    45, 25,  6.5, 7,  6.0, 'Financials'),
      s('600050', 'China Unicom',            30, 50,  2.0, 15, 5.0, 'Technology'),
    ]
  },
  {
    name: 'Japan Exchange',
    currency: 'JPY', symbol: '¥',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fbbf24' },
    children: [
      s('7203',  'Toyota Motor',           290, 274, 28,  10, 3.5, 'Consumer'),
      s('8306',  'MUFG',                   115, 45,  12,  10, 3.2, 'Financials'),
      s('6861',  'Keyence Corp.',          100, 7.0, 3.2, 31, 0.5, 'Technology'),
      s('6758',  'Sony Group Corp.',       100, 88,  7.0, 14, 0.6, 'Technology'),
      s('9432',  'NTT Corp.',               85, 110, 7.5, 11, 3.8, 'Technology'),
      s('8035',  'Tokyo Electron',          82, 18,  3.5, 23, 2.1, 'Technology'),
      s('9984',  'SoftBank Group',          90, 60,  0.1, 99, 0.4, 'Technology'),
      s('4063',  'Shin-Etsu Chemical',      68, 18,  5.0, 14, 2.0, 'Industrials'),
      s('9983',  'Fast Retailing',          75, 22,  2.4, 31, 1.0, 'Consumer'),
      s('7974',  'Nintendo Co.',            65, 13,  3.2, 20, 3.0, 'Technology'),
      s('6098',  'Recruit Holdings',        60, 24,  2.4, 25, 0.8, 'Industrials'),
      s('8058',  'Mitsubishi Corp.',        65, 165, 10,  6,  3.1, 'Financials'),
      s('7741',  'HOYA Corp.',              50, 5.5, 1.5, 33, 0.8, 'Healthcare'),
      s('4519',  'Chugai Pharma',           57, 7.0, 2.5, 23, 1.1, 'Healthcare'),
      s('6902',  'Denso Corp.',             52, 50,  2.8, 19, 1.8, 'Consumer'),
      s('8031',  'Mitsui & Co.',            60, 140, 9.0, 7,  3.5, 'Energy'),
      s('7267',  'Honda Motor',             50, 127, 5.5, 9,  3.2, 'Consumer'),
      s('8053',  'Sumitomo Corp.',          40, 140, 5.8, 7,  4.0, 'Industrials'),
      s('6178',  'Japan Post Holdings',     45, 100, 3.5, 13, 4.0, 'Financials'),
      s('4502',  'Takeda Pharmaceutical',   42, 30,  1.8, 23, 4.8, 'Healthcare'),
    ]
  },
  {
    name: 'Shenzhen (China)',
    currency: 'CNY', symbol: '¥',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f87171' },
    children: [
      s('300750', 'CATL',                  120, 44,  5.5, 22, 1.0, 'Technology'),
      s('002594', 'BYD Co.',               110, 102, 3.7, 30, 0.5, 'Consumer'),
      s('000858', 'Wuliangye Yibin',        80, 13,  5.5, 15, 2.8, 'Consumer'),
      s('000333', 'Midea Group',            65, 52,  3.8, 17, 3.0, 'Consumer'),
      s('002475', 'Luxshare Precision',     40, 26,  1.8, 22, 0.8, 'Technology'),
      s('000651', 'Gree Electric',          30, 31,  3.0, 10, 5.5, 'Consumer'),
      s('002415', 'Hikvision',              35, 13,  2.0, 18, 3.0, 'Technology'),
      s('000001', 'Ping An Bank',           38, 15,  4.5, 8,  5.5, 'Financials'),
      s('000568', 'Luzhou Laojiao',         30, 5.0, 2.2, 14, 3.5, 'Consumer'),
      s('000776', 'GF Securities',          22, 8,   1.5, 15, 3.5, 'Financials'),
      s('300124', 'Inovance Technology',    25, 4.5, 0.8, 31, 1.5, 'Technology'),
      s('002714', 'Muyuan Foods',           28, 14,  0.8, 35, 1.5, 'Consumer'),
      s('300059', 'East Money Info',        20, 3.0, 1.2, 17, 1.5, 'Financials'),
      s('300014', 'EVE Energy',             17, 6.0, 0.5, 34, 1.0, 'Technology'),
      s('002230', 'iFlytek Co.',            18, 3.5, 0.2, 90, 0.5, 'Technology'),
    ]
  },
  {
    name: 'Hong Kong (Hang Seng)',
    currency: 'HKD', symbol: 'HK$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#a855f7' },
    children: [
      s('0700',  'Tencent Holdings',       400, 82,  19,  21, 1.5, 'Technology'),
      s('9988',  'Alibaba Group',          230, 130, 14,  17, 0,   'Consumer'),
      s('0941',  'China Mobile',           200, 130, 18,  11, 6.5, 'Technology'),
      s('0005',  'HSBC Holdings',          180, 55,  23,  8,  6.8, 'Financials'),
      s('2318',  'Ping An (H-share)',       120, 150, 12,  10, 5.5, 'Financials'),
      s('1299',  'AIA Group',              100, 25,  3.5, 29, 2.8, 'Financials'),
      s('0883',  'CNOOC Ltd.',             110, 30,  12,  9,  8.5, 'Energy'),
      s('3690',  'Meituan',                 90, 34,  2.7, 33, 0,   'Consumer'),
      s('1810',  'Xiaomi Corp.',            65, 38,  2.5, 26, 0,   'Technology'),
      s('9618',  'JD.com Inc.',             55, 140, 4.0, 14, 0,   'Consumer'),
      s('0388',  'HKEX',                    50, 4.5, 2.0, 25, 4.5, 'Financials'),
      s('0016',  'SHK Properties',          28, 12,  3.5, 8,  6.0, 'Financials'),
      s('9999',  'NetEase Inc.',            45, 14,  3.5, 13, 1.8, 'Technology'),
      s('0175',  'Geely Automobile',        20, 30,  1.2, 17, 2.5, 'Consumer'),
      s('0027',  'Galaxy Entertainment',    18, 8,   1.0, 18, 3.5, 'Consumer'),
    ]
  },
  {
    name: 'NSE (India)',
    currency: 'INR', symbol: '₹',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f97316' },
    children: [
      s('RELIANCE',    'Reliance Industries',   230, 108, 7.5, 31, 0.5, 'Energy'),
      s('TCS',         'Tata Consultancy',       175, 28,  5.5, 32, 1.8, 'Technology'),
      s('HDFCBANK',    'HDFC Bank',              150, 28,  6.5, 23, 1.2, 'Financials'),
      s('BHARTIARTL',  'Bharti Airtel',          110, 18,  1.8, 61, 0.3, 'Technology'),
      s('ICICIBANK',   'ICICI Bank',             100, 18,  5.0, 20, 0.8, 'Financials'),
      s('INFY',        'Infosys Ltd.',             90, 19,  3.2, 28, 2.5, 'Technology'),
      s('SBIN',        'State Bank of India',      85, 32,  7.8, 11, 1.5, 'Financials'),
      s('ITC',         'ITC Ltd.',                 80, 11,  2.8, 28, 3.8, 'Consumer'),
      s('LT',          'Larsen & Toubro',           75, 28,  1.8, 41, 1.2, 'Industrials'),
      s('HINDUNILVR',  'Hindustan Unilever',        65, 7.5, 1.5, 43, 2.0, 'Consumer'),
      s('BAJFINANCE',  'Bajaj Finance',             60, 4.5, 1.5, 40, 0.3, 'Financials'),
      s('KOTAKBANK',   'Kotak Mahindra Bank',       55, 8.5, 2.8, 20, 0.1, 'Financials'),
      s('MARUTI',      'Maruti Suzuki',             52, 16,  1.5, 35, 0.8, 'Consumer'),
      s('ADANIENT',    'Adani Enterprises',         50, 11,  0.5, 100,0.1, 'Industrials'),
      s('WIPRO',       'Wipro Ltd.',                45, 11,  1.5, 30, 0.2, 'Technology'),
      s('AXISBANK',    'Axis Bank',                 40, 10,  2.5, 16, 0.1, 'Financials'),
      s('SUNPHARMA',   'Sun Pharma',                42, 5.5, 1.0, 42, 0.7, 'Healthcare'),
      s('ASIANPAINT',  'Asian Paints',              38, 5.5, 0.8, 48, 1.0, 'Consumer'),
      s('NTPC',        'NTPC Ltd.',                 37, 9,   1.5, 25, 2.0, 'Energy'),
      s('NESTLEIND',   'Nestle India',              25, 2.8, 0.5, 50, 2.2, 'Consumer'),
    ]
  },
  {
    name: 'LSE (UK)',
    currency: 'GBP', symbol: '£',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#8b5cf6' },
    children: [
      s('AZN',   'AstraZeneca',            260, 54,  5.8, 45, 2.2, 'Healthcare'),
      s('SHEL',  'Shell Plc',              220, 320, 28,  8,  4.2, 'Energy'),
      s('HSBA',  'HSBC Holdings',          190, 55,  23,  8,  6.8, 'Financials'),
      s('ULVR',  'Unilever Plc',           120, 62,  7.2, 17, 3.5, 'Consumer'),
      s('BP',    'BP Plc',                 110, 205, 5.5, 20, 5.0, 'Energy'),
      s('RIO',   'Rio Tinto',              110, 54,  11,  10, 6.8, 'Energy'),
      s('GSK',   'GSK Plc',               100, 40,  4.5, 22, 4.0, 'Healthcare'),
      s('BATS',  'British American Tobacco', 73, 35, 3.0, 24, 9.8, 'Consumer'),
      s('REL',   'RELX Plc',               80, 10,  2.0, 40, 1.8, 'Consumer'),
      s('DGE',   'Diageo Plc',             65, 17,  3.6, 18, 3.8, 'Consumer'),
      s('NG',    'National Grid',           55, 22,  2.5, 22, 5.8, 'Energy'),
      s('BARC',  'Barclays Plc',            55, 28,  7.5, 7,  4.5, 'Financials'),
      s('BA',    'BAE Systems',             42, 28,  2.5, 17, 2.8, 'Industrials'),
      s('LLOY',  'Lloyds Banking',          45, 22,  5.8, 8,  5.5, 'Financials'),
      s('NWG',   'NatWest Group',           38, 18,  5.5, 7,  5.5, 'Financials'),
      s('PRU',   'Prudential Plc',          32, 8,   1.0, 32, 2.8, 'Financials'),
      s('STAN',  'Standard Chartered',      28, 18,  4.0, 7,  5.0, 'Financials'),
      s('IMB',   'Imperial Brands',         22, 18,  2.8, 8,  9.5, 'Consumer'),
      s('VOD',   'Vodafone Group',          22, 45,  0.5, 44,11.0, 'Technology'),
      s('LGEN',  'Legal & General',         20, 18,  1.8, 11, 9.5, 'Financials'),
    ]
  },
  {
    name: 'Tadawul (Saudi Arabia)',
    currency: 'SAR', symbol: '﷼',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#14b8a6' },
    children: [
      s('2222',  'Saudi Aramco',           1850, 510, 121, 15, 4.0, 'Energy'),
      s('1180',  'Al Rajhi Bank',            80, 8,   4.2, 19, 3.0, 'Financials'),
      s('1020',  'Saudi National Bank',      55, 7,   3.5, 16, 3.8, 'Financials'),
      s('2010',  'SABIC',                    75, 50,  1.5, 50, 4.0, 'Industrials'),
      s('4200',  'Saudi Telecom (STC)',       55, 15,  2.5, 22, 4.5, 'Technology'),
      s('2350',  'ACWA Power',               40, 2.5, 0.5, 80, 1.0, 'Energy'),
      s('4280',  'Elm Co.',                  38, 0.8, 0.3, 127,0.5, 'Technology'),
      s('1211',  'Maaden',                   30, 5,   1.0, 30, 2.5, 'Energy'),
      s('1050',  'Alinma Bank',              25, 2.5, 1.2, 21, 3.5, 'Financials'),
      s('2380',  'Petro Rabigh',             12, 10,  0.3, 40, 2.0, 'Energy'),
      s('4030',  'Mouwasat Medical',         18, 0.8, 0.2, 90, 1.2, 'Healthcare'),
      s('2160',  'Yanbu National Petro',     18, 5,   0.8, 22, 3.5, 'Energy'),
      s('2080',  'Rabigh Refining',          10, 8,   0.2, 50, 1.5, 'Energy'),
      s('4321',  'Samba Financial',          20, 3,   1.0, 20, 4.0, 'Financials'),
      s('4160',  'Nahdi Medical',             8, 1.2, 0.2, 40, 2.0, 'Healthcare'),
    ]
  },
  {
    name: 'TSX (Canada)',
    currency: 'CAD', symbol: 'C$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#ec4899' },
    children: [
      s('RY',    'Royal Bank of Canada',   175, 50,  14,  12, 3.8, 'Financials'),
      s('TD',    'TD Bank Group',          130, 45,  12,  11, 5.2, 'Financials'),
      s('SHOP',  'Shopify Inc.',            95, 7.0, 0.8, 119,0,   'Technology'),
      s('BAM',   'Brookfield Asset Mgmt',   80, 100, 2.0, 40, 2.8, 'Financials'),
      s('CNR',   'Canadian National Rwy',   75, 14,  3.6, 21, 1.7, 'Industrials'),
      s('CP',    'Canadian Pacific KC',     70, 10,  3.0, 23, 0.7, 'Industrials'),
      s('ENB',   'Enbridge Inc.',           70, 40,  3.5, 20, 7.2, 'Energy'),
      s('TRI',   'Thomson Reuters',         68, 7.5, 1.8, 38, 1.5, 'Technology'),
      s('CNQ',   'Canadian Natural Res.',   65, 25,  6.0, 11, 4.3, 'Energy'),
      s('BMO',   'Bank of Montreal',        58, 30,  6.8, 8,  5.0, 'Financials'),
      s('SU',    'Suncor Energy',           55, 52,  6.0, 9,  4.2, 'Energy'),
      s('BNS',   'Bank of Nova Scotia',     60, 32,  6.5, 9,  6.8, 'Financials'),
      s('MFC',   'Manulife Financial',      42, 55,  5.5, 8,  4.5, 'Financials'),
      s('WN',    'George Weston',           22, 68,  1.0, 22, 2.0, 'Consumer'),
      s('ABX',   'Barrick Gold',            28, 11,  1.5, 19, 2.2, 'Energy'),
    ]
  },
  {
    name: 'BSE (India)',
    currency: 'INR', symbol: '₹',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fb923c' },
    children: [
      s('HCLTECH',   'HCL Technologies',    55, 14,  2.0, 28, 3.5, 'Technology'),
      s('TECHM',     'Tech Mahindra',        18, 6.5, 0.5, 36, 1.5, 'Technology'),
      s('M&M',       'Mahindra & Mahindra',  38, 22,  1.5, 25, 0.8, 'Consumer'),
      s('BAJAJFINSV','Bajaj Finserv',        35, 3.5, 0.8, 44, 0.1, 'Financials'),
      s('TITAN',     'Titan Company',        38, 6.5, 0.6, 63, 0.4, 'Consumer'),
      s('ONGC',      'ONGC Ltd.',            28, 24,  3.5, 8,  4.5, 'Energy'),
      s('ULTRACEMCO','UltraTech Cement',     30, 7.5, 0.8, 38, 0.6, 'Industrials'),
      s('POWERGRID', 'Power Grid Corp.',     30, 5.5, 1.5, 20, 4.5, 'Energy'),
      s('HINDALCO',  'Hindalco Industries',  22, 22,  1.5, 15, 1.0, 'Industrials'),
      s('CIPLA',     'Cipla Ltd.',           22, 3.5, 0.6, 37, 0.5, 'Healthcare'),
      s('DRREDDY',   "Dr. Reddy's Labs",     12, 3.5, 0.6, 20, 0.5, 'Healthcare'),
      s('EICHERMOT', 'Eicher Motors',        12, 4.0, 0.8, 15, 0.8, 'Consumer'),
      s('BPCL',      'BPCL',                 15, 60,  2.5, 6,  5.0, 'Energy'),
      s('VEDL',      'Vedanta Ltd.',          18, 14,  1.0, 18,12.0, 'Energy'),
      s('HAVELLS',   'Havells India',        10, 2.0, 0.3, 33, 0.7, 'Consumer'),
    ]
  },
  {
    name: 'DAX (Germany)',
    currency: 'EUR', symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#06b6d4' },
    children: [
      s('SAP',   'SAP SE',                 250, 35,  3.5, 71, 1.2, 'Technology'),
      s('SIE',   'Siemens AG',             150, 95,  8.0, 19, 2.5, 'Industrials'),
      s('ALV',   'Allianz SE',             120, 155, 10,  12, 5.5, 'Financials'),
      s('DTE',   'Deutsche Telekom',       115, 120, 9.0, 13, 3.5, 'Technology'),
      s('VOW3',  'Volkswagen AG',           55, 330, 10,  5,  7.0, 'Consumer'),
      s('BMW',   'BMW AG',                  58, 145, 9.0, 6,  5.5, 'Consumer'),
      s('MBG',   'Mercedes-Benz Group',     65, 155, 11,  6,  8.0, 'Consumer'),
      s('BAS',   'BASF SE',                 50, 74,  1.5, 33, 7.0, 'Industrials'),
      s('RWE',   'RWE AG',                  28, 25,  2.0, 14, 4.5, 'Energy'),
      s('DB1',   'Deutsche Boerse',         37, 5.5, 1.5, 25, 2.2, 'Financials'),
      s('MRK_DE','Merck KGaA',              30, 23,  2.5, 12, 1.8, 'Healthcare'),
      s('HEI',   'HeidelbergMaterials',     20, 22,  1.8, 11, 2.2, 'Industrials'),
      s('BAYN',  'Bayer AG',                28, 50,  0.1, 280,8.5, 'Healthcare'),
      s('MTX',   'MTU Aero Engines',        18, 6.5, 0.6, 30, 1.3, 'Industrials'),
      s('DHER',  'Delivery Hero',           12, 12,  0.1, 120,0,   'Technology'),
    ]
  },
  {
    name: 'KRX (South Korea)',
    currency: 'KRW', symbol: '₩',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#6366f1' },
    children: [
      s('005930', 'Samsung Electronics',  350, 215, 15,  23, 2.5, 'Technology'),
      s('000660', 'SK Hynix',              90, 33,  9,   10, 1.2, 'Technology'),
      s('207940', 'Samsung Biologics',     55, 3.5, 0.8, 69, 0,   'Healthcare'),
      s('005380', 'Hyundai Motor',         55, 118, 7,   8,  3.8, 'Consumer'),
      s('068270', 'Celltrion Inc.',         25, 2.5, 0.5, 50, 0.2, 'Healthcare'),
      s('000270', 'Kia Corp.',              28, 92,  5.5, 5,  4.5, 'Consumer'),
      s('012330', 'Hyundai Mobis',         22, 35,  1.2, 18, 2.5, 'Consumer'),
      s('035420', 'NAVER Corp.',            30, 9,   1.0, 30, 0.3, 'Technology'),
      s('051910', 'LG Chem',               25, 40,  0.5, 50, 1.8, 'Industrials'),
      s('035720', 'Kakao Corp.',            18, 7,   0.5, 36, 0.2, 'Technology'),
      s('096770', 'SK Innovation',         14, 55,  0.5, 28, 2.0, 'Energy'),
      s('003550', 'LG Corp.',               12, 8,   0.5, 24, 1.8, 'Consumer'),
      s('030200', 'KT Corp.',                8, 22,  0.5, 16, 5.5, 'Technology'),
      s('028260', 'Samsung C&T',            18, 32,  1.5, 12, 1.5, 'Consumer'),
      s('017670', 'SK Telecom',             15, 18,  1.5, 10, 6.5, 'Technology'),
    ]
  },
  {
    name: 'SIX (Switzerland)',
    currency: 'CHF', symbol: 'Fr',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f43f5e' },
    children: [
      s('NOVN',  'Novartis AG',            230, 47,  8.5, 27, 3.5, 'Healthcare'),
      s('ROG',   'Roche Holding',          200, 62,  12,  17, 3.5, 'Healthcare'),
      s('NESN',  'Nestlé S.A.',            260, 95,  10,  26, 3.2, 'Consumer'),
      s('UBSG',  'UBS Group AG',            95, 38,  29,  3,  2.5, 'Financials'),
      s('ABBN',  'ABB Ltd.',                90, 32,  4.0, 22, 1.5, 'Industrials'),
      s('SREN',  'Swiss Re',               40, 45,  3.5, 11, 5.8, 'Financials'),
      s('ZURN',  'Zurich Insurance',        75, 75,  5.0, 15, 5.5, 'Financials'),
      s('LONN',  'Lonza Group',             32, 6.5, 0.5, 64, 1.3, 'Healthcare'),
      s('GIVN',  'Givaudan SA',             32, 7.5, 0.8, 40, 1.8, 'Consumer'),
      s('SCMN',  'Swisscom AG',             28, 12,  1.8, 16, 4.5, 'Technology'),
    ]
  },
  {
    name: 'Nasdaq Nordic',
    currency: 'SEK', symbol: 'kr',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#38bdf8' },
    children: [
      s('NOVO-B', 'Novo Nordisk',          490, 38,  9.5, 52, 1.0, 'Healthcare'),
      s('ATCO-B', 'Atlas Copco',            55, 18,  2.5, 22, 1.2, 'Industrials'),
      s('VOLV-B', 'Volvo Group',            30, 55,  4.0, 7,  5.0, 'Industrials'),
      s('ASSA-B', 'ASSA ABLOY',             28, 15,  1.5, 19, 2.0, 'Consumer'),
      s('DSV',    'DSV A/S',               40, 30,  2.0, 20, 0.7, 'Industrials'),
      s('SAND',   'Sandvik AB',             22, 12,  1.5, 15, 2.5, 'Industrials'),
      s('HM-B',   'H&M Group',              25, 24,  1.0, 25, 3.0, 'Consumer'),
      s('NESTE',  'Neste Oyj',              15, 20,  0.5, 30, 3.5, 'Energy'),
      s('ERIC-B', 'Ericsson AB',            22, 24,  0.5, 44, 0,   'Technology'),
      s('NOKIA',  'Nokia Oyj',              22, 23,  0.8, 27, 2.9, 'Technology'),
    ]
  },
  {
    name: 'TWSE (Taiwan)',
    currency: 'TWD', symbol: 'NT$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#84cc16' },
    children: [
      s('2330',  'TSMC',                  1500, 93,  34,  28, 1.8, 'Technology'),
      s('2454',  'MediaTek Inc.',            65, 20,  3.5, 19, 5.0, 'Technology'),
      s('2317',  'Foxconn (Hon Hai)',        55, 215, 4.5, 12, 3.5, 'Technology'),
      s('6505',  'Formosa Petrochemical',    32, 28,  2.0, 16, 6.5, 'Energy'),
      s('2308',  'Delta Electronics',        22, 15,  1.2, 18, 3.5, 'Technology'),
      s('2382',  'Quanta Computer',          15, 40,  1.0, 15, 5.0, 'Technology'),
      s('2303',  'United Micro (UMC)',        18, 8.5, 1.5, 12, 5.5, 'Technology'),
      s('1301',  'Formosa Plastics',         22, 22,  1.0, 22, 5.0, 'Industrials'),
      s('2881',  'Fubon Financial',          18, 10,  1.8, 10, 5.5, 'Financials'),
      s('2886',  'Mega Financial',           15, 5.5, 1.2, 12, 5.0, 'Financials'),
    ]
  },
  {
    name: 'ASX (Australia)',
    currency: 'AUD', symbol: 'A$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#d946ef' },
    children: [
      s('BHP',   'BHP Group',              155, 55,  13,  12, 5.5, 'Energy'),
      s('CBA',   'Commonwealth Bank',      155, 28,  9.5, 16, 3.8, 'Financials'),
      s('CSL',   'CSL Limited',            100, 14,  2.0, 50, 1.2, 'Healthcare'),
      s('NAB',   'National Australia Bank', 78, 18,  7.0, 11, 4.8, 'Financials'),
      s('WES',   'Wesfarmers Ltd.',         65, 38,  2.5, 26, 3.0, 'Consumer'),
      s('ANZ',   'ANZ Group',               65, 15,  6.5, 10, 5.5, 'Financials'),
      s('MQG',   'Macquarie Group',         60, 15,  3.5, 17, 3.5, 'Financials'),
      s('WBC',   'Westpac Banking',         58, 15,  7.0, 8,  5.5, 'Financials'),
      s('FMG',   'Fortescue Metals',        52, 17,  6.0, 9,  8.5, 'Energy'),
      s('GMG',   'Goodman Group',           35, 2.0, 0.5, 70, 1.2, 'Financials'),
      s('WOW',   'Woolworths Group',        28, 58,  1.2, 23, 3.8, 'Consumer'),
      s('TCL',   'Transurban Group',        28, 3.5, 0.3, 93, 4.5, 'Industrials'),
      s('ALL',   'Aristocrat Leisure',      22, 5.0, 0.9, 24, 1.8, 'Technology'),
      s('QBE',   'QBE Insurance',           18, 25,  1.5, 12, 5.0, 'Financials'),
      s('MIN',   'Mineral Resources',       12, 4.5, 0.3, 40, 3.0, 'Energy'),
    ]
  },
  {
    name: 'JSE (South Africa)',
    currency: 'ZAR', symbol: 'R',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#eab308' },
    children: [
      s('NPN',   'Naspers Ltd.',            60, 8,   2.0, 30, 0.3, 'Technology'),
      s('CFR',   'Richemont SA',            80, 20,  3.5, 23, 1.5, 'Consumer'),
      s('BHP',   'BHP Group (JSE)',         65, 55,  13,  12, 5.5, 'Energy'),
      s('AGL',   'Anglo American',          30, 30,  2.0, 15, 6.0, 'Energy'),
      s('SBK',   'Standard Bank',           18, 8,   2.5, 7,  5.8, 'Financials'),
      s('FSR',   'FirstRand Ltd.',          20, 6,   2.0, 10, 5.5, 'Financials'),
      s('MTN',   'MTN Group',               10, 12,  0.5, 20, 5.0, 'Technology'),
      s('SOL',   'Sasol Ltd.',               8, 12,  0.3, 27, 4.5, 'Energy'),
      s('REM',   'Remgro Ltd.',             10, 3,   0.5, 20, 2.8, 'Financials'),
      s('VOD_ZA','Vodacom Group',           12, 4.5, 0.8, 15, 8.5, 'Technology'),
    ]
  },
  {
    name: 'B3 (Brazil)',
    currency: 'BRL', symbol: 'R$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#22c55e' },
    children: [
      s('VALE3',  'Vale S.A.',             50, 40,  8.0, 6,  10.0, 'Energy'),
      s('PETR4',  'Petrobras',             80, 110, 22,  4,  14.0, 'Energy'),
      s('ITUB4',  'Itaú Unibanco',         55, 28,  8.5, 6,  6.5, 'Financials'),
      s('BBDC4',  'Bradesco',              25, 18,  4.0, 6,  7.0, 'Financials'),
      s('B3SA3',  'B3 S.A.',               20, 2.5, 0.8, 25, 5.5, 'Financials'),
      s('WEGE3',  'WEG S.A.',              22, 5.5, 0.9, 24, 1.8, 'Industrials'),
      s('ABEV3',  'Ambev S.A.',            18, 12,  2.0, 9,  5.5, 'Consumer'),
      s('BBAS3',  'Banco do Brasil',       22, 20,  5.5, 4,  8.5, 'Financials'),
      s('SUZB3',  'Suzano S.A.',           15, 6,   1.5, 10, 3.0, 'Industrials'),
      s('MGLU3',  'Magazine Luiza',         5, 5.5, 0.1, 50, 0,   'Consumer'),
    ]
  },
  {
    name: 'BME (Spain)',
    currency: 'EUR', symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f59e0b' },
    children: [
      s('ITX',   'Inditex (Zara)',         120, 38,  5.5, 22, 3.8, 'Consumer'),
      s('IBE',   'Iberdrola S.A.',          80, 42,  5.0, 16, 5.0, 'Energy'),
      s('SAN_ES','Banco Santander',         75, 55,  12,  6,  5.0, 'Financials'),
      s('BBVA',  'BBVA',                    65, 28,  8.5, 8,  5.5, 'Financials'),
      s('TEF',   'Telefónica',              20, 42,  2.0, 10, 8.5, 'Technology'),
      s('REP',   'Repsol S.A.',             18, 50,  2.5, 7,  8.0, 'Energy'),
      s('ACS',   'ACS Group',               12, 42,  1.0, 12, 4.5, 'Industrials'),
      s('ENG',   'Enagás S.A.',             10, 3.5, 0.5, 20, 9.5, 'Energy'),
      s('GRF',   'Grifols S.A.',             8, 6.5, 0.3, 27, 2.0, 'Healthcare'),
      s('MAP',   'Mapfre S.A.',              5, 8,   0.5, 10, 8.0, 'Financials'),
    ]
  },
  {
    name: 'SGX (Singapore)',
    currency: 'SGD', symbol: 'S$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#cbd5e1' },
    children: [
      s('D05',   'DBS Group',              70, 18,  8.5, 8,  5.8, 'Financials'),
      s('U11',   'United Overseas Bank',   40, 10,  4.5, 9,  5.5, 'Financials'),
      s('O39',   'OCBC Bank',              42, 12,  5.5, 8,  5.2, 'Financials'),
      s('Z74',   'Singapore Telecom',       25, 12,  1.2, 21, 5.5, 'Technology'),
      s('G13',   'Genting Singapore',       10, 2.5, 0.6, 17, 4.0, 'Consumer'),
      s('9CI',   'CapitaLand Invest.',      12, 2.0, 0.5, 24, 4.5, 'Financials'),
      s('C52',   'ComfortDelGro',            3, 1.8, 0.2, 15, 5.0, 'Industrials'),
      s('S68',   'Singapore Exchange',       8, 1.0, 0.5, 16, 3.8, 'Financials'),
    ]
  },
  {
    name: 'Borsa Italiana',
    currency: 'EUR', symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#475569' },
    children: [
      s('ENEL',  'Enel S.p.A.',             60, 90,  5.5, 11, 6.5, 'Energy'),
      s('ENI',   'ENI S.p.A.',              45, 95,  5.0, 9,  6.5, 'Energy'),
      s('ISP',   'Intesa Sanpaolo',          55, 22,  7.5, 7,  7.0, 'Financials'),
      s('UCG',   'UniCredit S.p.A.',         55, 25,  9.0, 6,  5.5, 'Financials'),
      s('STM',   'STMicroelectronics',       30, 17,  2.5, 12, 0.8, 'Technology'),
      s('LDO',   'Leonardo S.p.A.',          18, 17,  1.0, 18, 2.0, 'Industrials'),
      s('PRY',   'Prysmian S.p.A.',          15, 16,  0.8, 19, 1.5, 'Industrials'),
      s('TIT',   'Telecom Italia',            5, 14,  0.2, 25, 0,   'Technology'),
    ]
  },
  {
    name: 'SET (Thailand)',
    currency: 'THB', symbol: '฿',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fda4af' },
    children: [
      s('PTT',   'PTT Pcl',                30, 55,  1.5, 20, 5.5, 'Energy'),
      s('PTTEP', 'PTT Exploration',         20, 8,   2.0, 10, 5.0, 'Energy'),
      s('GULF',  'Gulf Energy Dev.',        15, 2.5, 0.5, 30, 2.0, 'Energy'),
      s('ADVANC','Advanced Info (AIS)',      15, 4,   0.8, 19, 6.5, 'Technology'),
      s('CPALL', 'CP All Pcl',              12, 18,  0.5, 24, 2.5, 'Consumer'),
      s('SCB',   'SCB X Pcl',               8, 4,   0.8, 10, 5.5, 'Financials'),
      s('AOT',   'Airports of Thailand',    18, 2,   0.6, 30, 1.5, 'Industrials'),
    ]
  },
  {
    name: 'BMV (Mexico)',
    currency: 'MXN', symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fcd34d' },
    children: [
      s('AMXL',  'América Móvil',           50, 55,  3.5, 14, 3.0, 'Technology'),
      s('WALMEX','Walmart de México',        45, 35,  2.0, 22, 2.0, 'Consumer'),
      s('FEMSAUBD','FEMSA',                  28, 30,  1.5, 19, 1.8, 'Consumer'),
      s('GMEXICOB','Grupo México',           28, 12,  3.0, 9,  4.5, 'Energy'),
      s('GCARSOA1','Grupo Carso',            10, 8,   0.8, 12, 2.0, 'Consumer'),
      s('GFNORTEO','Banorte',               18, 5,   2.0, 9,  4.8, 'Financials'),
      s('CEMEXCPO','CEMEX',                  8, 15,  0.8, 10, 2.0, 'Industrials'),
    ]
  },
  {
    name: 'IDX (Indonesia)',
    currency: 'IDR', symbol: 'Rp',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#86efac' },
    children: [
      s('BBCA',  'Bank Central Asia',       75, 8,   3.5, 21, 2.5, 'Financials'),
      s('BBRI',  'Bank Rakyat Indonesia',   45, 12,  3.0, 15, 4.5, 'Financials'),
      s('TLKM',  'Telkom Indonesia',        22, 9,   1.5, 15, 5.5, 'Technology'),
      s('ASII',  'Astra International',     18, 22,  1.5, 12, 4.8, 'Consumer'),
      s('BMRI',  'Bank Mandiri',            30, 7,   2.5, 12, 4.8, 'Financials'),
      s('GOTO',  'Goto Group',               8, 1.5, 0.1, 80, 0,   'Technology'),
    ]
  },
  {
    name: 'Bursa Malaysia',
    currency: 'MYR', symbol: 'RM',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#93c5fd' },
    children: [
      s('MAY',   'Malayan Banking (Maybank)',25, 6,   2.0, 12, 7.5, 'Financials'),
      s('PBK',   'Public Bank Bhd',         18, 4,   1.5, 12, 5.5, 'Financials'),
      s('CIMB',  'CIMB Group',              15, 5,   1.2, 13, 6.0, 'Financials'),
      s('TENAGA','Tenaga Nasional',          12, 5,   0.8, 15, 4.5, 'Energy'),
      s('PCHEM', 'Petronas Chemicals',       10, 4.5, 0.5, 20, 5.0, 'Energy'),
      s('AXIATA','Axiata Group',              8, 2.5, 0.3, 27, 4.0, 'Technology'),
    ]
  },
  {
    name: 'PSE (Philippines)',
    currency: 'PHP', symbol: '₱',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#c4b5fd' },
    children: [
      s('SM',    'SM Investments',          20, 8,   0.8, 25, 1.0, 'Consumer'),
      s('BDO',   'BDO Unibank',             12, 4,   0.8, 15, 3.0, 'Financials'),
      s('ALI',   'Ayala Land',               8, 2.5, 0.4, 20, 2.0, 'Consumer'),
      s('AC',    'Ayala Corp.',              10, 4,   0.5, 20, 1.5, 'Consumer'),
      s('JFC',   'Jollibee Foods',            5, 3.5, 0.3, 17, 1.5, 'Consumer'),
    ]
  },
  {
    name: 'WSE (Poland)',
    currency: 'PLN', symbol: 'zł',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f9a8d4' },
    children: [
      s('PKN',   'Orlen S.A.',              15, 45,  1.5, 10, 4.5, 'Energy'),
      s('PKO',   'PKO Bank Polski',          12, 4,   1.5, 8,  6.0, 'Financials'),
      s('PZU',   'PZU S.A.',                10, 7,   1.0, 10, 7.5, 'Financials'),
      s('KGHM', 'KGHM Polska Miedź',         8, 5.5, 0.8, 10, 4.0, 'Energy'),
      s('LPP',   'LPP S.A.',                 8, 3,   0.5, 16, 1.5, 'Consumer'),
    ]
  },
  {
    name: 'TASE (Israel)',
    currency: 'ILS', symbol: '₪',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#99f6e4' },
    children: [
      s('NICE',  'NICE Systems',            18, 2.5, 0.5, 36, 0,   'Technology'),
      s('CHKP',  'Check Point Software',    18, 2.5, 0.8, 22, 0,   'Technology'),
      s('GLPG',  'Galapagos NV (IL)',        5, 0.5, 0.1, 50, 0,   'Healthcare'),
      s('PERI',  'Perion Network',           2, 0.7, 0.1, 20, 0,   'Technology'),
      s('SPNS',  'Sapiens International',    2, 0.5, 0.1, 20, 1.0, 'Technology'),
    ]
  },
  {
    name: 'OSL (Norway)',
    currency: 'NOK', symbol: 'kr',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#bae6fd' },
    children: [
      s('EQNR',  'Equinor ASA',             90, 110, 12,  8,  4.0, 'Energy'),
      s('DNB',   'DNB Bank ASA',            28, 8,   3.5, 8,  6.5, 'Financials'),
      s('MOWI',  'Mowi ASA',                10, 5,   0.8, 13, 5.0, 'Consumer'),
      s('ORK',   'Orkla ASA',               10, 5,   0.5, 20, 4.5, 'Consumer'),
      s('NEL',   'NEL ASA',                  2, 0.3, 0.1, 99, 0,   'Energy'),
    ]
  },
  {
    name: 'VSE (Austria)',
    currency: 'EUR', symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fed7aa' },
    children: [
      s('EBS',   'Erste Group Bank',        14, 8,   2.0, 7,  4.5, 'Financials'),
      s('OMV',   'OMV AG',                  14, 38,  1.5, 9,  5.5, 'Energy'),
      s('VIG',   'Vienna Insurance',         8, 12,  0.5, 16, 4.0, 'Financials'),
      s('ANDR',  'Andritz AG',               5, 8,   0.5, 10, 3.5, 'Industrials'),
    ]
  },
  {
    name: 'NZX (New Zealand)',
    currency: 'NZD', symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#d9f99d' },
    children: [
      s('FPH',   'Fisher & Paykel Health',  10, 1.8, 0.4, 25, 1.8, 'Healthcare'),
      s('ATM',   'a2 Milk Company',          4, 1.3, 0.2, 20, 0,   'Consumer'),
      s('SPK',   'Spark NZ',                 5, 2.0, 0.3, 17, 8.5, 'Technology'),
      s('MEL',   'Meridian Energy',           5, 2.5, 0.3, 17, 6.0, 'Energy'),
    ]
  },
  {
    name: 'BVC (Colombia)',
    currency: 'COP', symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fef08a' },
    children: [
      s('EC',    'Ecopetrol',               12, 25,  2.5, 5,  15.0,'Energy'),
      s('PFBCOLOM','Bancolombia',            8, 4,   1.0, 8,  7.0, 'Financials'),
      s('GRUPOSURA','GrupoSura',             5, 2,   0.3, 17, 3.5, 'Financials'),
      s('NUTRESA','Grupo Nutresa',            4, 3,   0.3, 13, 2.5, 'Consumer'),
    ]
  },
  {
    name: 'QSE (Qatar)',
    currency: 'QAR', symbol: 'ر.ق',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#bfdbfe' },
    children: [
      s('QNBK',  'Qatar National Bank',     45, 6,   3.5, 13, 4.5, 'Financials'),
      s('IQCD',  'Industries Qatar',        25, 3.5, 1.5, 17, 6.0, 'Industrials'),
      s('QGTS',  'Qatar Gas Transport',     10, 1.5, 0.8, 13, 7.5, 'Energy'),
      s('MARK',  'Masraf Al Rayan',          8, 2,   0.8, 10, 5.5, 'Financials'),
    ]
  },
  {
    name: 'ADX (Abu Dhabi)',
    currency: 'AED', symbol: 'د.إ',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#e9d5ff' },
    children: [
      s('IHC',   'International Holding',  230, 5,   3.0, 77, 0.5, 'Financials'),
      s('ADNOCDIST','ADNOC Distribution',  30, 5,   1.5, 20, 5.0, 'Energy'),
      s('ADCB',  'Abu Dhabi Comm. Bank',   28, 3,   1.8, 15, 5.0, 'Financials'),
      s('FAB',   'First Abu Dhabi Bank',   45, 5,   3.5, 13, 5.5, 'Financials'),
      s('ETISALAT','e&  (Etisalat)',        48, 14,  2.5, 19, 6.0, 'Technology'),
    ]
  },
  {
    name: 'DFM (Dubai)',
    currency: 'AED', symbol: 'د.إ',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fbcfe8' },
    children: [
      s('EMIRATESNBD','Emirates NBD',       30, 5,   2.5, 12, 4.0, 'Financials'),
      s('DU',    'du (EITC)',               10, 2,   0.5, 20, 4.5, 'Technology'),
      s('EMAAR', 'Emaar Properties',        18, 5,   2.0, 9,  5.0, 'Consumer'),
      s('DIB',   'Dubai Islamic Bank',      15, 2,   1.0, 15, 5.5, 'Financials'),
    ]
  },
  {
    name: 'KSE (Kuwait)',
    currency: 'KWD', symbol: 'د.ك',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#a7f3d0' },
    children: [
      s('KFH',   'Kuwait Finance House',    40, 3,   1.5, 27, 2.5, 'Financials'),
      s('NBK',   'National Bank of Kuwait', 30, 3,   1.5, 20, 3.5, 'Financials'),
      s('ZAIN',  'Zain Kuwait',             10, 2,   0.5, 20, 7.0, 'Technology'),
      s('KIPCO', 'KIPCO',                    8, 1.5, 0.3, 27, 3.5, 'Financials'),
    ]
  },
  {
    name: 'EGX (Egypt)',
    currency: 'EGP', symbol: 'E£',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fca5a5' },
    children: [
      s('COMI',  'Commercial Int. Bank',     8, 1.5, 0.8, 10, 5.0, 'Financials'),
      s('EFIH',  'EFG Hermes',               3, 0.8, 0.2, 15, 3.0, 'Financials'),
      s('SWDY',  'Sidi Kerir Petrochem',     2, 0.5, 0.2, 10, 7.0, 'Energy'),
      s('PHDC',  'Palm Hills Dev.',          2, 0.5, 0.1, 20, 2.0, 'Consumer'),
    ]
  },
  {
    name: 'BCS (Chile)',
    currency: 'CLP', symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#6ee7b7' },
    children: [
      s('SQM',   'SQM S.A.',               22, 4,   1.0, 22, 4.0, 'Industrials'),
      s('COPEC', 'Empresas Copec',          10, 18,  0.5, 20, 3.5, 'Energy'),
      s('BSANTANDER_CL','Banco Santander CL', 8, 2.5, 0.8, 10, 5.0, 'Financials'),
      s('CMPC',  'CMPC S.A.',               8, 5,   0.5, 16, 3.0, 'Industrials'),
    ]
  },
  {
    name: 'BVL (Peru)',
    currency: 'PEN', symbol: 'S/',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#c084fc' },
    children: [
      s('BAP',   'Credicorp Ltd.',          13, 3,   1.0, 13, 4.0, 'Financials'),
      s('SCCO',  'Southern Copper',         65, 10,  3.5, 19, 5.0, 'Energy'),
      s('BBVAC1','BBVA Continental',         5, 1.5, 0.5, 10, 4.5, 'Financials'),
    ]
  },
  {
    name: 'Casablanca (Morocco)',
    currency: 'MAD', symbol: 'د.م.',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f87171' },
    children: [
      s('ATW',   'Attijariwafa Bank',        6, 2,   0.5, 12, 4.5, 'Financials'),
      s('IAM',   'Maroc Telecom',            8, 3,   0.8, 10, 6.5, 'Technology'),
      s('BCP',   'Banque Centrale Pop.',     5, 1.5, 0.4, 13, 4.0, 'Financials'),
    ]
  },
  {
    name: 'NGX (Nigeria)',
    currency: 'NGN', symbol: '₦',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#34d399' },
    children: [
      s('DANGCEM','Dangote Cement',         10, 2,   0.5, 20, 4.0, 'Industrials'),
      s('GTCO',  'Guaranty Trust Bank',      5, 2,   0.8, 6,  8.5, 'Financials'),
      s('MTNN',  'MTN Nigeria',              8, 3,   0.5, 16, 5.0, 'Technology'),
      s('AIRTELAF','Airtel Africa',           4, 2,   0.3, 13, 4.5, 'Technology'),
    ]
  },
  {
    name: 'BCBA (Argentina)',
    currency: 'ARS', symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#60a5fa' },
    children: [
      s('YPF',   'YPF S.A.',                7, 15,  0.5, 14, 0,   'Energy'),
      s('MER',   'MercadoLibre (AR)',        70, 14,  1.5, 47, 0,   'Technology'),
      s('GGAL',  'Grupo Galicia',            5, 2,   0.5, 10, 2.0, 'Financials'),
      s('BMA',   'Banco Macro',              3, 1,   0.4, 7,  5.0, 'Financials'),
    ]
  },
  {
    name: 'KASE (Kazakhstan)',
    currency: 'KZT', symbol: '₸',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#818cf8' },
    children: [
      s('KSPI',  'Kaspi.kz',               16, 3.5, 1.5, 11, 5.0, 'Financials'),
      s('HSBK',  'Halyk Bank',               5, 1.5, 0.8, 6,  7.5, 'Financials'),
      s('KAZ_MUN','KazMunayGas',             8, 18,  1.0, 8,  4.5, 'Energy'),
    ]
  },
  {
    name: 'HOSE (Vietnam)',
    currency: 'VND', symbol: '₫',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#a78bfa' },
    children: [
      s('VIC',   'Vingroup',               10, 4,   0.3, 33, 0,   'Consumer'),
      s('VNM',   'Vinamilk',                5, 1.8, 0.4, 13, 6.5, 'Consumer'),
      s('VCB',   'Vietcombank',            10, 2.5, 1.0, 10, 2.5, 'Financials'),
      s('BID',   'BIDV',                    7, 2,   0.8, 9,  3.5, 'Financials'),
      s('FPT',   'FPT Corp.',               5, 2,   0.4, 13, 2.5, 'Technology'),
    ]
  },
  {
    name: 'DSE (Bangladesh)',
    currency: 'BDT', symbol: '৳',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f472b6' },
    children: [
      s('GRAMEENPHONE','Grameenphone',       4, 0.8, 0.3, 13, 7.5, 'Technology'),
      s('BRAC',  'BRAC Bank',                2, 0.5, 0.1, 20, 3.0, 'Financials'),
      s('SQUARE','Square Pharma',            2, 0.5, 0.2, 10, 3.5, 'Healthcare'),
    ]
  },
  {
    name: 'PSX (Pakistan)',
    currency: 'PKR', symbol: '₨',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fb7185' },
    children: [
      s('OGDC',  'Oil & Gas Dev. Corp.',     3, 3,   0.8, 4,  8.0, 'Energy'),
      s('HBL',   'Habib Bank',               3, 1.5, 0.5, 6,  8.5, 'Financials'),
      s('MCB',   'MCB Bank',                 2, 1,   0.5, 4,  10.0,'Financials'),
      s('LUCK',  'Lucky Cement',             1, 0.8, 0.2, 5,  3.5, 'Industrials'),
    ]
  },
  {
    name: 'NSE (Kenya)',
    currency: 'KES', symbol: 'KSh',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#4ade80' },
    children: [
      s('SCOM',  'Safaricom Plc',            5, 1.5, 0.5, 10, 6.5, 'Technology'),
      s('EQTY',  'Equity Bank',              3, 0.8, 0.3, 10, 6.0, 'Financials'),
      s('KCB',   'KCB Group',                2, 0.7, 0.3, 7,  6.5, 'Financials'),
    ]
  },
  {
    name: 'ZSE (Zimbabwe)',
    currency: 'ZWG', symbol: 'Z$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fb923c' },
    children: [
      s('DELTA', 'Delta Corp.',              1, 0.3, 0.1, 10, 5.0, 'Consumer'),
      s('OK',    'OK Zimbabwe',              0.5, 0.2, 0.05, 10, 4.0, 'Consumer'),
    ]
  },
  {
    name: 'BVM (Luxembourg)',
    currency: 'EUR', symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#2dd4bf' },
    children: [
      s('MT',    'ArcelorMittal',           20, 65,  1.5, 13, 3.5, 'Industrials'),
      s('SES',   'SES S.A.',                3, 2,   0.3, 10, 6.5, 'Technology'),
      s('BIL',   'Banque Intl. Luxembourg',  2, 0.5, 0.1, 20, 3.0, 'Financials'),
    ]
  },
];
