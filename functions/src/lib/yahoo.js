import YahooFinance from 'yahoo-finance2';

export const yf = new YahooFinance({ suppressNotices: ['yahooSurvey', 'ripHistorical'] });

export const CRYPTO_TICKERS = new Set([
  'BTC','ETH','XRP','BNB','SOL','DOGE','ADA','TRX','AVAX','LINK','DOT','LTC','UNI','POL','ATOM',
]);
export const cryptoYahoo = (t) => CRYPTO_TICKERS.has(t) ? `${t}-USD` : t;
export const cryptoStrip = (sym) => sym.endsWith('-USD') ? sym.slice(0, -4) : sym;

export const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
};
