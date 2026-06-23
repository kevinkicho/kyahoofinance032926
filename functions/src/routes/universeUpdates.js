import { Router } from 'express';
import { yf, chunkArray } from '../lib/yahoo.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || '';
const MIN_MARKET_CAP = 2000000000; // 2 Billion
const LOOKBACK_DAYS = 45;

function getYYYYMMDD(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

router.get('/', async (req, res) => {
  try {
    const cache = req.app.locals.cache;
    
    if (!FINNHUB_API_KEY) {
      // Graceful fallback if no API key is provided
      const sources = { universeUpdates: true, count: 0, finnhubConfigured: false };
      res.set('X-Data-Sources', JSON.stringify(sources));
      return res.json({ updates: [], _sources: sources });
    }

    // 1. Calculate Date Range
    const today = new Date();
    const past = new Date();
    past.setDate(past.getDate() - LOOKBACK_DAYS);
    
    const fromDate = getYYYYMMDD(past);
    const toDate = getYYYYMMDD(today);

    // 2. Fetch IPOs from Finnhub
    trackApiCall('Finnhub');
    const fhUrl = `https://finnhub.io/api/v1/calendar/ipo?from=${fromDate}&to=${toDate}&token=${FINNHUB_API_KEY}`;
    const fhRes = await fetch(fhUrl);
    if (!fhRes.ok) {
      throw new Error(`Finnhub API Error: ${fhRes.status}`);
    }
    const fhData = await fhRes.json();
    const ipoCalendar = fhData.ipoCalendar || [];

    // 3. Filter for US exchanges and unique symbols
    const validExchanges = ['NASDAQ', 'NYSE', 'US'];
    const candidates = new Set();
    
    ipoCalendar.forEach(ipo => {
      const exch = ipo.exchange ? ipo.exchange.toUpperCase() : '';
      if (ipo.symbol && validExchanges.some(ve => exch.includes(ve))) {
        candidates.add(ipo.symbol);
      }
    });

    const tickersToFetch = Array.from(candidates);
    
    if (tickersToFetch.length === 0) {
      const sources = { universeUpdates: true, count: 0, finnhubConfigured: true };
      res.set('X-Data-Sources', JSON.stringify(sources));
      return res.json({ updates: [], _sources: sources });
    }

    // 4. Batch query Yahoo Finance for these tickers
    const chunks = chunkArray(tickersToFetch, 100);
    const confirmedUpdates = [];

    for (const chunk of chunks) {
      try {
        trackApiCall('Yahoo Finance');
        const results = await yf.quote(chunk);
        const arr = Array.isArray(results) ? results : [results];
        
        arr.forEach(quote => {
          if (!quote || !quote.symbol) return;
          
          // 5. Filter by Market Cap > $2B
          if (quote.marketCap && quote.marketCap >= MIN_MARKET_CAP) {
            const mc = quote.marketCap / 1e9; // Convert to Billions
            const stockEntry = {
              name: quote.symbol,
              fullName: quote.longName || quote.shortName || quote.symbol,
              marketCap: mc,
              // Yahoo Finance may not have fundamentals for recent IPOs,
              // but include them when available so the panel can show real data.
              revenue: quote.totalRevenue ? quote.totalRevenue / 1e9 : null, // in $B
              netIncome: quote.netIncomeToCo ? quote.netIncomeToCo / 1e9 : null, // in $B
              pe: quote.trailingPE || null,
              forwardPE: quote.forwardPE || null,
              divYield: quote.dividendYield != null ? quote.dividendYield * 100 : null, // as %
              beta: quote.beta || null,
              profitMargins: quote.profitMargins != null ? quote.profitMargins * 100 : null, // as %
              returnOnEquity: quote.returnOnEquity != null ? quote.returnOnEquity * 100 : null, // as %
              // Use Yahoo's sector/industry when available (not hardcoded)
              sector: quote.gicsSector || quote.sector || '—',
              industry: quote.gicsIndustry || quote.industry || '—',
              exchange: quote.exchange || quote.fullExchangeName || '—',
              // Live quote data
              price: quote.regularMarketPrice ?? null,
              changePct: quote.regularMarketChangePercent != null ? Math.round(quote.regularMarketChangePercent * 100) / 100 : null,
              dayHigh: quote.regularMarketDayHigh ?? null,
              dayLow: quote.regularMarketDayLow ?? null,
              weekHigh52: quote.fiftyTwoWeekHigh ?? null,
              weekLow52: quote.fiftyTwoWeekLow ?? null,
              volume: quote.regularMarketVolume ?? null,
              avgVolume: quote.averageDailyVolume10Day ?? quote.averageVolume ?? null,
              // ECharts treemap fields
              value: mc,
              isDiscovered: true,
              discoveryDate: today.toISOString()
            };
            
            confirmedUpdates.push(stockEntry);
          }
        });
      } catch (chunkError) {
        console.error(`[universeUpdates] Error fetching chunk from Yahoo:`, chunkError.message);
      }
    }

    const sources = { universeUpdates: true, count: confirmedUpdates.length, finnhubConfigured: true };
    res.set('X-Data-Sources', JSON.stringify(sources));
    res.json({ updates: confirmedUpdates, _sources: sources });

  } catch (error) {
    console.error('[universeUpdates] API Error:', error);
    // On error, return empty array rather than failing the whole cascade
    res.json({ updates: [], _sources: { universeUpdates: false, error: error.message } });
  }
});

export default router;
