// src/markets/crypto/data/mockCryptoData.js

export const coinMarketData = {
  coins: [
    { id: 'bitcoin',       symbol: 'BTC',  name: 'Bitcoin',       price: 67420,    change24h:  1.8,  change7d:  4.2,  change30d: 12.1,  marketCapB: 1328, volumeB:  38.4, dominance: 52.1 },
    { id: 'ethereum',      symbol: 'ETH',  name: 'Ethereum',      price:  3241,    change24h:  2.4,  change7d:  6.8,  change30d:  8.4,  marketCapB:  390, volumeB:  18.2, dominance: 15.3 },
    { id: 'tether',        symbol: 'USDT', name: 'Tether',        price:     1.00, change24h:  0.01, change7d:  0.02, change30d:  0.0,  marketCapB:  108, volumeB:  62.1, dominance:  4.2 },
    { id: 'binancecoin',   symbol: 'BNB',  name: 'BNB',           price:   412,    change24h:  0.9,  change7d:  2.1,  change30d:  5.8,  marketCapB:   62, volumeB:   2.1, dominance:  2.4 },
    { id: 'solana',        symbol: 'SOL',  name: 'Solana',        price:   172,    change24h:  3.2,  change7d:  9.4,  change30d: 18.2,  marketCapB:   79, volumeB:   4.8, dominance:  3.1 },
    { id: 'xrp',           symbol: 'XRP',  name: 'XRP',           price:     0.621,change24h:  1.1,  change7d:  3.2,  change30d:  6.4,  marketCapB:   35, volumeB:   2.4, dominance:  1.4 },
    { id: 'usd-coin',      symbol: 'USDC', name: 'USD Coin',      price:     1.00, change24h:  0.01, change7d:  0.01, change30d:  0.0,  marketCapB:   42, volumeB:   8.2, dominance:  1.6 },
    { id: 'staked-ether',  symbol: 'STETH',name: 'Lido Staked ETH',price:  3238,   change24h:  2.3,  change7d:  6.7,  change30d:  8.3,  marketCapB:   35, volumeB:   0.4, dominance:  1.4 },
    { id: 'dogecoin',      symbol: 'DOGE', name: 'Dogecoin',      price:     0.182,change24h:  4.8,  change7d: 12.1,  change30d: 22.4,  marketCapB:   26, volumeB:   2.8, dominance:  1.0 },
    { id: 'toncoin',       symbol: 'TON',  name: 'TON',           price:     6.84, change24h:  1.4,  change7d:  3.8,  change30d:  9.2,  marketCapB:   24, volumeB:   0.6, dominance:  0.9 },
    { id: 'cardano',       symbol: 'ADA',  name: 'Cardano',       price:     0.512,change24h:  1.8,  change7d:  4.4,  change30d:  8.8,  marketCapB:   18, volumeB:   0.9, dominance:  0.7 },
    { id: 'avalanche-2',   symbol: 'AVAX', name: 'Avalanche',     price:    38.2,  change24h:  2.6,  change7d:  7.2,  change30d: 14.4,  marketCapB:   16, volumeB:   0.8, dominance:  0.6 },
    { id: 'shiba-inu',     symbol: 'SHIB', name: 'Shiba Inu',     price:  0.0000248,change24h: 5.2,  change7d: 14.8,  change30d: 28.1,  marketCapB:   15, volumeB:   1.2, dominance:  0.6 },
    { id: 'chainlink',     symbol: 'LINK', name: 'Chainlink',     price:    18.4,  change24h:  2.1,  change7d:  5.6,  change30d: 11.2,  marketCapB:   11, volumeB:   0.7, dominance:  0.4 },
    { id: 'polkadot',      symbol: 'DOT',  name: 'Polkadot',      price:     8.92, change24h:  1.6,  change7d:  4.1,  change30d:  7.8,  marketCapB:   12, volumeB:   0.5, dominance:  0.5 },
    { id: 'bitcoin-cash',  symbol: 'BCH',  name: 'Bitcoin Cash',  price:   462,    change24h:  1.2,  change7d:  3.4,  change30d:  6.8,  marketCapB:    9, volumeB:   0.4, dominance:  0.4 },
    { id: 'uniswap',       symbol: 'UNI',  name: 'Uniswap',       price:    11.2,  change24h:  2.8,  change7d:  7.4,  change30d: 13.6,  marketCapB:    8, volumeB:   0.3, dominance:  0.3 },
    { id: 'litecoin',      symbol: 'LTC',  name: 'Litecoin',      price:    94.2,  change24h:  0.8,  change7d:  2.2,  change30d:  4.4,  marketCapB:    7, volumeB:   0.5, dominance:  0.3 },
    { id: 'near',          symbol: 'NEAR', name: 'NEAR Protocol', price:     7.84, change24h:  3.4,  change7d:  9.2,  change30d: 17.6,  marketCapB:    8, volumeB:   0.4, dominance:  0.3 },
    { id: 'internet-computer',symbol:'ICP',name: 'Internet Computer',price: 14.8, change24h:  1.4,  change7d:  3.8,  change30d:  7.4,  marketCapB:    7, volumeB:   0.2, dominance:  0.3 },
  ],
  globalStats: {
    totalMarketCapT:  2.56,
    totalVolumeB:    148.2,
    btcDominance:     52.1,
    ethDominance:     15.3,
    altDominance:     32.6,
    activeCryptocurrencies: 13842,
    marketCapChange24h: 2.1,
  },
};

export const fearGreedData = {
  value: 72,
  label: 'Greed',
  history: [
    45,48,52,55,58,61,64,62,60,58,55,52,56,59,62,65,68,70,72,71,69,68,70,72,74,76,74,72,71,72
  ],
  correlations: [
    { asset: 'SPY',  corr30d:  0.58, corr90d:  0.42, corr1y:  0.34 },
    { asset: 'GLD',  corr30d:  0.21, corr90d:  0.18, corr1y:  0.12 },
    { asset: 'DXY',  corr30d: -0.48, corr90d: -0.38, corr1y: -0.28 },
    { asset: 'TLT',  corr30d: -0.32, corr90d: -0.24, corr1y: -0.18 },
    { asset: 'QQQ',  corr30d:  0.64, corr90d:  0.52, corr1y:  0.44 },
  ],
};

export const defiData = {
  protocols: [
    { name: 'Lido',           category: 'Liquid Staking', chain: 'Ethereum', tvlB: 28.4, change1d:  1.2, change7d:  4.8 },
    { name: 'AAVE',           category: 'Lending',        chain: 'Multi',    tvlB: 12.1, change1d:  0.8, change7d:  3.2 },
    { name: 'EigenLayer',     category: 'Restaking',      chain: 'Ethereum', tvlB: 11.8, change1d:  2.4, change7d:  8.6 },
    { name: 'Uniswap',        category: 'DEX',            chain: 'Multi',    tvlB:  6.2, change1d:  1.4, change7d:  5.4 },
    { name: 'JustLend',       category: 'Lending',        chain: 'Tron',     tvlB:  5.8, change1d:  0.4, change7d:  1.8 },
    { name: 'Spark',          category: 'Lending',        chain: 'Ethereum', tvlB:  4.9, change1d:  1.8, change7d:  6.2 },
    { name: 'Ether.fi',       category: 'Liquid Staking', chain: 'Ethereum', tvlB:  4.4, change1d:  2.2, change7d:  8.8 },
    { name: 'Curve Finance',  category: 'DEX',            chain: 'Multi',    tvlB:  3.8, change1d: -0.4, change7d:  1.2 },
    { name: 'Morpho',         category: 'Lending',        chain: 'Ethereum', tvlB:  3.2, change1d:  1.2, change7d:  4.4 },
    { name: 'Maker',          category: 'CDP',            chain: 'Ethereum', tvlB:  3.1, change1d: -0.2, change7d:  0.8 },
    { name: 'Compound',       category: 'Lending',        chain: 'Multi',    tvlB:  2.4, change1d:  0.6, change7d:  2.4 },
    { name: 'Rocket Pool',    category: 'Liquid Staking', chain: 'Ethereum', tvlB:  2.1, change1d:  0.8, change7d:  3.4 },
    { name: 'PancakeSwap',    category: 'DEX',            chain: 'BSC',      tvlB:  1.8, change1d:  1.2, change7d:  4.8 },
    { name: 'dYdX',           category: 'Derivatives',    chain: 'Cosmos',   tvlB:  0.9, change1d:  2.4, change7d:  9.2 },
    { name: 'GMX',            category: 'Derivatives',    chain: 'Arbitrum', tvlB:  0.7, change1d:  1.8, change7d:  6.8 },
  ],
  chains: [
    { name: 'Ethereum',  tvlB: 64.2, change7d:  4.8, protocols: 1021 },
    { name: 'Tron',      tvlB: 18.4, change7d:  1.2, protocols:  124 },
    { name: 'BSC',       tvlB:  6.8, change7d:  2.4, protocols:  612 },
    { name: 'Solana',    tvlB:  6.4, change7d:  9.2, protocols:  218 },
    { name: 'Arbitrum',  tvlB:  4.2, change7d:  5.4, protocols:  348 },
    { name: 'Base',      tvlB:  3.8, change7d:  8.8, protocols:  284 },
    { name: 'Avalanche', tvlB:  1.8, change7d:  4.2, protocols:  198 },
    { name: 'Polygon',   tvlB:  1.4, change7d:  2.8, protocols:  312 },
    { name: 'Optimism',  tvlB:  1.1, change7d:  3.6, protocols:  184 },
    { name: 'Near',      tvlB:  0.8, change7d:  6.4, protocols:   88 },
  ],
};

export const fundingData = {
  rates: [
    { symbol: 'BTC',  rate8h:  0.0082, rateAnnualized:  8.97, openInterestB:  18.4, exchange: 'Binance' },
    { symbol: 'ETH',  rate8h:  0.0068, rateAnnualized:  7.42, openInterestB:   8.2, exchange: 'Binance' },
    { symbol: 'SOL',  rate8h:  0.0124, rateAnnualized: 13.54, openInterestB:   2.8, exchange: 'Binance' },
    { symbol: 'DOGE', rate8h:  0.0152, rateAnnualized: 16.60, openInterestB:   1.4, exchange: 'Binance' },
    { symbol: 'AVAX', rate8h:  0.0094, rateAnnualized: 10.26, openInterestB:   0.6, exchange: 'Binance' },
    { symbol: 'LINK', rate8h:  0.0106, rateAnnualized: 11.57, openInterestB:   0.5, exchange: 'Binance' },
    { symbol: 'BNB',  rate8h:  0.0078, rateAnnualized:  8.52, openInterestB:   0.8, exchange: 'Binance' },
    { symbol: 'ADA',  rate8h:  0.0058, rateAnnualized:  6.33, openInterestB:   0.4, exchange: 'Binance' },
    { symbol: 'DOT',  rate8h: -0.0024, rateAnnualized: -2.62, openInterestB:   0.3, exchange: 'Binance' },
    { symbol: 'NEAR', rate8h:  0.0142, rateAnnualized: 15.50, openInterestB:   0.4, exchange: 'Binance' },
  ],
  openInterestHistory: {
    dates:  ['Mar 1','Mar 8','Mar 15','Mar 22','Mar 29','Apr 5'],
    btcOIB: [14.2,   15.8,   16.4,   17.1,   17.8,    18.4],
    ethOIB: [ 6.4,    6.8,    7.2,    7.6,    8.0,     8.2],
  },
};
