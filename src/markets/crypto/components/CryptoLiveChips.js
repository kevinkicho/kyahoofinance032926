/** Live-chip predicates for crypto tiles that can paint empty / dashes. */

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function coinList(coinMarketData) {
  if (Array.isArray(coinMarketData)) return coinMarketData;
  return Array.isArray(coinMarketData?.coins) ? coinMarketData.coins : [];
}

function ethGasValue(ethGas) {
  if (ethGas == null) return null;
  if (isFiniteNumber(ethGas)) return ethGas;
  const v = ethGas.average ?? ethGas.low ?? null;
  return isFiniteNumber(v) ? v : null;
}

function totalMarketCap(coinMarketData) {
  if (!coinMarketData || typeof coinMarketData !== 'object' || Array.isArray(coinMarketData)) return null;
  if (isFiniteNumber(coinMarketData.globalStats?.totalMarketCapT)) return coinMarketData.globalStats.totalMarketCapT;
  if (isFiniteNumber(coinMarketData.total_market_cap_usd)) return coinMarketData.total_market_cap_usd / 1e12;
  return null;
}

/** Sidebar always paints Market + FGI dashes; live only when a painted metric is real. */
export function hasCryptoSidebarContent({
  coinMarketData,
  fearGreedData,
  stablecoinMcap,
  btcDominance,
  ethGas,
} = {}) {
  const coins = coinList(coinMarketData);
  if (coins.some((c) => c && (c.symbol === 'BTC' || c.id === 'bitcoin'))) return true;
  if (coins.some((c) => c && (c.symbol === 'ETH' || c.id === 'ethereum'))) return true;
  if (isFiniteNumber(totalMarketCap(coinMarketData))) return true;
  if (isFiniteNumber(btcDominance)) return true;
  if (isFiniteNumber(stablecoinMcap)) return true;
  if (isFiniteNumber(ethGasValue(ethGas))) return true;
  const fgi = fearGreedData?.value ?? fearGreedData?.score;
  return isFiniteNumber(fgi);
}

/** Top-cryptos table is blank unless a coin row exists. */
export function hasTopCryptos(coinMarketData) {
  return coinList(coinMarketData).length > 0;
}

/** On-chain / btc-onchain cards paint only when a metric is numeric; leftover isLive bag is empty. */
export function hasOnChainMetrics(onChainData) {
  if (!onChainData || typeof onChainData !== 'object' || Array.isArray(onChainData)) return false;
  if (isFiniteNumber(onChainData.hashrate?.current)) return true;
  if (isFiniteNumber(onChainData.difficulty?.progressPercent)) return true;
  if (isFiniteNumber(onChainData.difficulty?.difficultyChange)) return true;
  if (isFiniteNumber(onChainData.mempool?.count)) return true;
  return isFiniteNumber(onChainData.fees?.fastest);
}

/** Hashrate-chart rows that paint; leftover isLive / history-length / sibling keys still empty / crash the tile. */
export function hashrateHistoryPoints(onChainData) {
  const hist = onChainData?.hashrate?.history;
  if (!Array.isArray(hist)) return [];
  const points = [];
  for (const row of hist) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    if (!isFiniteNumber(row.avgHashrate) || !isFiniteNumber(row.timestamp)) continue;
    points.push({ timestamp: row.timestamp, avgHashrate: row.avgHashrate });
  }
  return points;
}

export function hasOnChainChart(onChainData) {
  return hashrateHistoryPoints(onChainData).length >= 2;
}
