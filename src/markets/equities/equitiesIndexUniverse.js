/**
 * Index ticker sets + labels for Key Indices strip and equities refresh.
 * Extracted from EquitiesMarket.jsx for reuse and smaller main module.
 */

export const INDEX_TICKERS_US = ['^GSPC', '^IXIC', '^DJI', '^RUT'];
export const INDEX_TICKERS_DEV = ['^STOXX50E', '^GDAXI', '^FTSE', '^FCHI', '^N225', '^NSEI', '^AXJO', '^GSPTSE'];
export const INDEX_TICKERS_EM = ['EEM', 'VWO', 'FM', '^JKSE', '^BVSP', '^KS11', '^TWII'];
export const INDEX_TICKERS_CN = ['^HSI', '000300.SS', '000001.SS', 'ASHR', 'FXI', 'KWEB'];
export const INDEX_TICKERS_RISK = ['^VIX', '^TNX', 'DX=F', 'GC=F', 'CL=F'];
export const INDEX_TICKERS_COMM = ['SI=F', 'NG=F', 'DBC'];
export const INDEX_TICKERS_SECTORS = ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLB', 'XLRE', 'XLC', 'XLU', 'XLP', 'SMH'];

export const INDEX_TICKERS = [
  ...INDEX_TICKERS_US,
  ...INDEX_TICKERS_DEV,
  ...INDEX_TICKERS_EM,
  ...INDEX_TICKERS_CN,
  ...INDEX_TICKERS_RISK,
  ...INDEX_TICKERS_COMM,
  ...INDEX_TICKERS_SECTORS,
];

export const INDEX_LABELS = {
  '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^DJI': 'Dow Jones', '^RUT': 'Russell 2K',
  '^STOXX50E': 'Euro STOXX 50', '^GDAXI': 'DAX 40', '^FTSE': 'FTSE 100', '^FCHI': 'CAC 40',
  '^N225': 'Nikkei 225', '^NSEI': 'NIFTY 50', '^AXJO': 'ASX 200', '^GSPTSE': 'S&P/TSX',
  'EEM': 'MSCI EM', 'VWO': 'FTSE EM', 'FM': 'Frontier Mkts',
  '^JKSE': 'Jakarta', '^BVSP': 'Bovespa', '^KS11': 'KOSPI', '^TWII': 'TAIEX',
  '^HSI': 'Hang Seng', '000300.SS': 'CSI 300', '000001.SS': 'Shanghai',
  'ASHR': 'ASHR (CSI 300)', 'FXI': 'FXI (China LgCap)', 'KWEB': 'KWEB (China Internet)',
  '^VIX': 'VIX', '^TNX': '10Y Yield', 'DX=F': 'Dollar Index',
  'GC=F': 'Gold', 'CL=F': 'WTI Crude',
  'SI=F': 'Silver', 'NG=F': 'Nat Gas', 'DBC': 'Commodities',
  XLK: 'Technology', XLF: 'Financials', XLE: 'Energy', XLV: 'Health Care',
  XLY: 'Cons. Disc.', XLI: 'Industrials', XLB: 'Materials', XLRE: 'Real Estate',
  XLC: 'Comm. Svcs', XLU: 'Utilities', XLP: 'Cons. Staples', SMH: 'Semiconductors',
};
