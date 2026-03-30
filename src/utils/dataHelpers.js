import { exchangeRates } from './constants';

// Deterministic Details Generator for Mock Data
export const getExtendedDetails = (tickerInfo) => {
  if (!tickerInfo) return null;
  let hash = 0;
  for (let i = 0; i < tickerInfo.ticker.length; i++) hash = tickerInfo.ticker.charCodeAt(i) + ((hash << 5) - hash);
  const seed = Math.abs(hash);
  const rand = (min, max) => min + (seed % 1000) / 1000 * (max - min);
  
  const basePriceUSD = rand(10, 500);
  const rate = exchangeRates[tickerInfo.regionCurrency] || 1;
  const sym = tickerInfo.regionSymbol || '$';
  
  const nativePriceNum = basePriceUSD * rate;
  const formatNative = (num) => `${sym}${num.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

  const priceLabel = formatNative(nativePriceNum);
  const isUp = tickerInfo.perf.startsWith('+');
  const changePctNum = isUp ? rand(0.5, 4.5) : (rand(0.5, 4.5) * -1);
  
  const changeAmtNum = nativePriceNum * (changePctNum / 100);
  const changeAmtLabel = (changeAmtNum > 0 ? '+' : '') + formatNative(changeAmtNum);
  const changePctLabel = changePctNum > 0 ? `+${changePctNum.toFixed(2)}%` : `${changePctNum.toFixed(2)}%`;
  
  const openNum = nativePriceNum - changeAmtNum + (rand(-1, 1) * rate);
  const bidNum = nativePriceNum - (0.05 * rate);
  const askNum = nativePriceNum + (0.05 * rate);
  
  const rangeLowNum = nativePriceNum * 0.98;
  const rangeHighNum = nativePriceNum * 1.02;
  const wk52LowNum = nativePriceNum * rand(0.5, 0.8);
  const wk52HighNum = nativePriceNum * rand(1.1, 1.5);
  
  const vol = Math.floor(rand(1000000, 200000000));
  const avgVol = Math.floor(vol * rand(0.8, 1.2));
  const peNum = rand(10, 100);
  const epsNum = nativePriceNum / peNum;
  const beta = rand(0.5, 2.5).toFixed(2);
  
  const dividendNum = nativePriceNum * rand(0.01, 0.04);
  
  return {
    price: priceLabel,
    changeAmt: changeAmtLabel,
    changePct: changePctLabel,
    prevClose: formatNative(openNum),
    open: formatNative(openNum),
    bid: `${formatNative(bidNum)} x 100`,
    ask: `${formatNative(askNum)} x 400`,
    dayRange: `${formatNative(rangeLowNum)} - ${formatNative(rangeHighNum)}`,
    wk52Range: `${formatNative(wk52LowNum)} - ${formatNative(wk52HighNum)}`,
    volume: vol.toLocaleString(),
    avgVol: avgVol.toLocaleString(),
    marketCapGlobal: `$${parseFloat(tickerInfo.value).toLocaleString()} B (USD)`,
    marketCapNative: formatNative((parseFloat(tickerInfo.value) * rate * 1000000000)),
    beta,
    pe: peNum.toFixed(2),
    eps: formatNative(epsNum),
    earningsDate: 'May 20, 2026',
    dividend: `${formatNative(dividendNum)} (${rand(1, 4).toFixed(2)}%)`
  };
};
