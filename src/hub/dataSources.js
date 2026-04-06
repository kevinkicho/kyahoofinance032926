// Central registry of every external data source used per market.
// Each entry: { name, url (docs link), items (what data we pull) }

const DATA_SOURCES = {
  equities: [
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: 'Stock quotes, OHLC, volume, market cap, P/E, dividends for 825 stocks across 51 exchanges' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'M1, M2 money supply, CPI, Fed Funds Rate, unemployment, GDP' },
  ],
  bonds: [
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'US yield curve (3M–30Y), international 10Y anchors, IG/HY/EM/BBB spreads, TIPS breakevens, Fed Funds futures (FF1–FF6), yield history (2Y/10Y/30Y), mortgage rates' },
    { name: 'Treasury Fiscal Data', url: 'https://fiscaldata.treasury.gov/api-documentation', items: 'Average interest rates by security type' },
  ],
  fx: [
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'EUR/USD, USD/JPY, GBP/USD, USD/CHF, USD/CAD, AUD/USD (252-day), Dollar Index, Real Effective Exchange Rates (US/EU/JP/GB/CN), central bank rate differentials (Fed/ECB/BoE/BoJ)' },
  ],
  derivatives: [
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: 'VIX term structure (9D/1M/3M/6M), SPY/QQQ options chains, vol surface, historical VIX (365-day), SKEW index, put/call ratio' },
    { name: 'CBOE',            url: 'https://www.cboe.com/tradable_products/vix',   items: 'VIX percentile rank, term structure spread (contango/backwardation)' },
  ],
  realEstate: [
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: 'REIT quotes, dividends, NAV' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'House price indices, 30Y/15Y mortgage rates, housing starts (HOUST), building permits, rental vacancy rate, homeownership rate, existing home sales, median home price' },
  ],
  insurance: [
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: 'Quarterly financials (AIG, HIG, MMC, PGR, TRV), combined ratios, KIE insurance sector ETF, cat bond proxy (SHRX/ILS)' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: '10Y Treasury rate (investment income context)' },
  ],
  commodities: [
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: '12 commodity futures (CL, GC, SI, NG, HG, ZC, ZS, ZW, LE, KC, CT, LBS), 5-year seasonal patterns, gold/oil ratio, commodity currencies (CAD/AUD/NOK)' },
    { name: 'EIA',             url: 'https://www.eia.gov/opendata',                 items: 'Crude oil stocks, natural gas storage, petroleum supply/demand' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'WTI/Brent futures curves, gold forward curves, contango/backwardation indicator' },
  ],
  globalMacro: [
    { name: 'World Bank',      url: 'https://data.worldbank.org',                   items: 'GDP growth, CPI, unemployment, debt-to-GDP, current account for 40+ countries' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'Central bank rates (8 banks), M2 money supply growth (YoY), trade balance, industrial production (YoY), consumer sentiment (U. Michigan), yield spread recession indicator (T10Y2Y)' },
  ],
  equitiesDeepDive: [
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: '12 sector ETFs (XLK–XLRE), factor stocks, S&P 500 P/E, breadth divergence (SPY vs RSP equal-weight)' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'Equity risk premium (earnings yield vs 10Y), Buffett Indicator (Wilshire 5000 / GDP), 10Y Treasury yield' },
  ],
  crypto: [
    { name: 'CoinGecko',      url: 'https://www.coingecko.com/en/api',             items: 'Top 20 coins (prices, 24h change, market cap, volume), BTC dominance, top 10 exchanges by volume' },
    { name: 'Mempool.space',  url: 'https://mempool.space/docs/api',               items: 'Bitcoin mempool fees, difficulty adjustment, hashrate, block stats' },
    { name: 'DefiLlama',      url: 'https://defillama.com/docs/api',               items: 'DeFi TVL by protocol & chain, total stablecoin market cap' },
    { name: 'Alternative.me', url: 'https://alternative.me/crypto/fear-and-greed-index', items: 'Crypto Fear & Greed Index' },
    { name: 'Etherscan',      url: 'https://etherscan.io/apis',                    items: 'Ethereum gas prices (low/average/high gwei)' },
  ],
  credit: [
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'IG/HY/EM/BBB/CCC spreads (13-month), charge-off rates, delinquency rates (commercial RE & all loans), bank lending standards (C&I), commercial paper rates, excess reserves' },
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: 'Credit ETF quotes (LQD, HYG, EMB, BKLN)' },
  ],
  sentiment: [
    { name: 'CNN Fear & Greed',url: 'https://edition.cnn.com/markets/fear-and-greed',items: 'Fear & Greed Index (252-day history)' },
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: 'Cross-asset returns: SPY, QQQ, EEM, TLT, GLD, UUP, USO, BTC-USD (95-day)' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'VIX history (270-day), HY spreads, margin debt, consumer credit growth, VVIX (volatility of volatility)' },
    { name: 'CFTC',            url: 'https://www.cftc.gov/MarketReports/CommitmentsofTraders', items: 'Commitment of Traders positioning (6 FX, 2 equity, 1 rate, 2 commodity)' },
  ],
  calendar: [
    { name: 'EconDB',         url: 'https://www.econdb.com/api',                   items: 'Economic calendar events (30-day forward)' },
    { name: 'FRED',            url: 'https://fred.stlouisfed.org',                  items: 'Central bank meeting dates, rate decisions' },
    { name: 'Yahoo Finance',   url: 'https://finance.yahoo.com',                   items: 'Earnings calendar (20+ stocks), dividend ex-dates (AAPL, MSFT, JNJ, JPM, XOM)' },
    { name: 'Treasury Fiscal Data', url: 'https://fiscaldata.treasury.gov/api-documentation', items: 'Upcoming Treasury auction schedule' },
  ],
};

export default DATA_SOURCES;
