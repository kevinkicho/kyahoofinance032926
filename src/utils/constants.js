export const SECTOR = {
  CRYPTO: 'Crypto',
};

export const exchangeRates = {
  USD: 1.00, EUR: 0.92, CNY: 7.23, JPY: 151.30, HKD: 7.82, INR: 83.31,
  GBP: 0.79, SAR: 3.75, CAD: 1.36, KRW: 1348.50, CHF: 0.90, SEK: 10.64,
  TWD: 32.05, AUD: 1.52, ZAR: 18.79, BRL: 5.01, SGD: 1.34, THB: 36.42,
  MXN: 16.58, IDR: 15875.00, MYR: 4.72, PHP: 56.24, PLN: 3.96, ILS: 3.68,
  NOK: 10.82, NZD: 1.67, COP: 3845.00, QAR: 3.64, AED: 3.67, KWD: 0.31,
  EGP: 47.33, CLP: 978.50, PEN: 3.68, MAD: 10.05, NGN: 1300.00, ARS: 855.50,
  KZT: 446.50, VND: 24785.00, BDT: 109.50, PKR: 278.00, KES: 131.50, ZWG: 13.56
};

// Maps stockUniverse region name → Yahoo Finance exchange suffix
// Used to reconstruct full Yahoo tickers (e.g. "2330" + "TW" → "2330.TW")
export const REGION_SUFFIX = {
  'Japan Exchange':          'T',
  'Shanghai (China)':        'SS',
  'Shenzhen (China)':        'SZ',
  'Hong Kong (Hang Seng)':   'HK',
  'KRX (South Korea)':       'KS',
  'TWSE (Taiwan)':           'TW',
  'NSE (India)':             'NS',
  'BSE (India)':             'BO',
  'LSE (UK)':                'L',
  'Tadawul (Saudi Arabia)':  'SR',
  'TSX (Canada)':            'TO',
  'DAX (Germany)':           'F',
  'SIX (Switzerland)':       'SW',
  'Nasdaq Nordic':           'ST',
  'ASX (Australia)':         'AX',
  'B3 (Brazil)':             'SA',
  'BME (Spain)':             'MC',
  'SGX (Singapore)':         'SG',
  'JSE (South Africa)':      'JO',
  'Borsa Italiana':          'MI',
  'SET (Thailand)':          'BK',
  'BMV (Mexico)':            'MX',
  'IDX (Indonesia)':         'JK',
  'Bursa Malaysia':          'KL',
  'PSE (Philippines)':       'PS',
  'WSE (Poland)':            'WA',
  'TASE (Israel)':           'TA',
  'OSL (Norway)':            'OL',
  'Euronext (Europe)':       'PA',
  'Crypto':                  '',
};

export const REGION_COLORS = {
  'Crypto': '#f7931a',
};

export const currencySymbols = {
  USD: '$', EUR: '€', CNY: '¥', JPY: '¥', HKD: 'HK$', INR: '₹',
  GBP: '£', SAR: '﷼', CAD: 'C$', KRW: '₩', CHF: 'Fr', SEK: 'kr',
  TWD: 'NT$', AUD: 'A$', ZAR: 'R', BRL: 'R$', SGD: 'S$', THB: '฿',
  MXN: '$', IDR: 'Rp', MYR: 'RM', PHP: '₱', PLN: 'zł', ILS: '₪',
  NOK: 'kr', NZD: '$', COP: '$', QAR: 'ر.ق', AED: 'د.إ', KWD: 'د.ك',
  EGP: 'E£', CLP: '$', PEN: 'S/', MAD: 'د.م.', NGN: '₦', ARS: '$',
  KZT: '₸', VND: '₫', BDT: '৳', PKR: '₨', KES: 'KSh', ZWG: 'Z$'
};
