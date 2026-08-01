import YahooFinance from 'yahoo-finance2';

// Yahoo intermittently returns incomplete quote objects for some symbols
// (e.g. COLO-B.ST missing exchange fields). Schema validation then throws and
// used to fail *entire* multi-symbol quote chunks. Log but don't throw so the
// rest of the chunk still paints.
export const yf = new YahooFinance({
  suppressNotices: ['yahooSurvey', 'ripHistorical'],
  validation: {
    logErrors: false,
    logOptionsErrors: false,
  },
});

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
