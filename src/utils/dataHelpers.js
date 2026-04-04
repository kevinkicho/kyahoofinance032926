import { exchangeRates } from './constants';

// Deterministic Details Generator for Mock Data
// rates: live Frankfurter rates (falls back to static exchangeRates if not provided)
export const getExtendedDetails = (tickerInfo, rates) => {
  if (!tickerInfo) return null;
  const isCrypto = tickerInfo.sector === 'Crypto';

  let hash = 0;
  for (let i = 0; i < tickerInfo.ticker.length; i++) hash = tickerInfo.ticker.charCodeAt(i) + ((hash << 5) - hash);
  const seed = Math.abs(hash);
  const rand = (min, max) => min + (seed % 1000) / 1000 * (max - min);

  // Crypto is always priced in USD regardless of selected currency
  const rateTable = rates || exchangeRates;
  const rate = isCrypto ? 1 : (rateTable[tickerInfo.regionCurrency] || 1);
  const sym  = isCrypto ? '$' : (tickerInfo.regionSymbol || '$');

  const basePriceUSD = rand(10, 500);
  const nativePriceNum = basePriceUSD * rate;
  const formatNative = (num) => `${sym}${num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  const isUp = tickerInfo.perf ? tickerInfo.perf.startsWith('+') : true;
  const changePctNum = isUp ? rand(0.5, 4.5) : (rand(0.5, 4.5) * -1);
  const changeAmtNum = nativePriceNum * (changePctNum / 100);
  const changeAmtLabel = (changeAmtNum > 0 ? '+' : '') + formatNative(changeAmtNum);
  const changePctLabel = changePctNum > 0 ? `+${changePctNum.toFixed(2)}%` : `${changePctNum.toFixed(2)}%`;

  const openNum      = nativePriceNum - changeAmtNum + (rand(-1, 1) * rate);
  const rangeLowNum  = nativePriceNum * 0.98;
  const rangeHighNum = nativePriceNum * 1.02;
  const wk52LowNum   = nativePriceNum * rand(0.5, 0.8);
  const wk52HighNum  = nativePriceNum * rand(1.1, 1.5);
  const vol    = Math.floor(rand(1000000, 200000000));
  const avgVol = Math.floor(vol * rand(0.8, 1.2));

  const base = {
    price:           formatNative(nativePriceNum),
    changeAmt:       changeAmtLabel,
    changePct:       changePctLabel,
    prevClose:       formatNative(openNum),
    open:            formatNative(openNum),
    dayRange:        `${formatNative(rangeLowNum)} – ${formatNative(rangeHighNum)}`,
    wk52Range:       `${formatNative(wk52LowNum)} – ${formatNative(wk52HighNum)}`,
    volume:          vol.toLocaleString(),
    avgVol:          avgVol.toLocaleString(),
    marketCapGlobal: `$${parseFloat(tickerInfo.value).toLocaleString()} B (USD)`,
    marketCapNative: formatNative(parseFloat(tickerInfo.value) * rate * 1e9),
    // Stock-only fields — null signals DetailPanel to hide the row
    bid:          isCrypto ? null : `${formatNative(nativePriceNum - 0.05 * rate)} x 100`,
    ask:          isCrypto ? null : `${formatNative(nativePriceNum + 0.05 * rate)} x 400`,
    beta:         isCrypto ? null : rand(0.5, 2.5).toFixed(2),
    pe:           isCrypto ? null : rand(10, 100).toFixed(2),
    eps:          isCrypto ? null : formatNative(nativePriceNum / rand(10, 100)),
    earningsDate: isCrypto ? null : 'May 20, 2026',
    dividend:     isCrypto ? null : (() => {
      const dividendNum = nativePriceNum * rand(0.01, 0.04);
      return `${formatNative(dividendNum)} (${rand(1, 4).toFixed(2)}%)`;
    })(),
  };

  return base;
};
