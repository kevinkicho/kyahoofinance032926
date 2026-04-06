# Live Data: Bonds, Derivatives, Real Estate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all mock data in Bonds, Derivatives, and Real Estate markets with live data from FRED and Yahoo Finance, matching existing component data shapes exactly.

**Architecture:** Three server endpoints (`/api/bonds`, `/api/derivatives`, `/api/realEstate`) are added to the existing Express server. Each client hook is converted from synchronous to async (same `useState`/`useEffect`/fetch pattern as `useInsuranceData`). Every hook silently falls back to mock data on server failure. Root components gain a loading spinner using existing CSS patterns.

**Tech Stack:** React 18, Express, `yahoo-finance2` (already installed), FRED API (key already in `.env`), `node-cache` (already installed, 15-min TTL)

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `server/index.js` | Add `/api/bonds`, `/api/derivatives`, `/api/realEstate` endpoints |
| Modify | `src/markets/bonds/data/useBondsData.js` | Convert to async hook |
| Modify | `src/markets/bonds/BondsMarket.jsx` | Add loading spinner |
| Modify | `src/markets/bonds/BondsMarket.css` | Add loading styles |
| Modify | `src/__tests__/bonds/useBondsData.test.js` | Update for async hook |
| Modify | `src/__tests__/bonds/BondsMarket.test.jsx` | Add waitFor + fetch mock |
| Modify | `src/markets/derivatives/data/useDerivativesData.js` | Convert to async hook |
| Modify | `src/markets/derivatives/DerivativesMarket.jsx` | Add loading spinner |
| Modify | `src/markets/derivatives/DerivativesMarket.css` | Add loading styles |
| Modify | `src/__tests__/derivatives/useDerivativesData.test.js` | Update for async hook |
| Modify | `src/__tests__/derivatives/DerivativesMarket.test.jsx` | Add waitFor + fetch mock |
| Modify | `src/markets/realEstate/data/useRealEstateData.js` | Convert to async hook |
| Modify | `src/markets/realEstate/RealEstateMarket.jsx` | Add loading spinner |
| Modify | `src/markets/realEstate/RealEstateMarket.css` | Add loading styles |
| Modify | `src/__tests__/realEstate/useRealEstateData.test.js` | Update for async hook |
| Modify | `src/__tests__/realEstate/RealEstateMarket.test.jsx` | Add waitFor + fetch mock |

---

## Data Sources Reference

### FRED Series Used
| Key | Series ID | Description |
|-----|-----------|-------------|
| US 3m yield | `DGS3MO` | 3-Month Treasury Constant Maturity |
| US 6m yield | `DGS6MO` | 6-Month Treasury Constant Maturity |
| US 1y yield | `DGS1` | 1-Year Treasury Constant Maturity |
| US 2y yield | `DGS2` | 2-Year Treasury Constant Maturity |
| US 5y yield | `DGS5` | 5-Year Treasury Constant Maturity |
| US 7y yield | `DGS7` | 7-Year Treasury Constant Maturity |
| US 10y yield | `DGS10` | 10-Year Treasury Constant Maturity |
| US 20y yield | `DGS20` | 20-Year Treasury Constant Maturity |
| US 30y yield | `DGS30` | 30-Year Treasury Constant Maturity |
| DE 10y | `IRLTLT01DEM156N` | Germany 10yr govt bond yield |
| JP 10y | `IRLTLT01JPM156N` | Japan 10yr govt bond yield |
| GB 10y | `IRLTLT01GBM156N` | UK 10yr govt bond yield |
| IT 10y | `IRLTLT01ITM156N` | Italy 10yr govt bond yield |
| FR 10y | `IRLTLT01FRM156N` | France 10yr govt bond yield |
| AU 10y | `IRLTLT01AUM156N` | Australia 10yr govt bond yield |
| IG OAS | `BAMLC0A0CM` | Investment Grade OAS (bps) |
| HY OAS | `BAMLH0A0HYM2` | High Yield OAS (bps) |
| EM OAS | `BAMLEMCBPIOAS` | Emerging Market OAS (bps) |
| US House Prices | `QUSR628BIS` | BIS Residential Property Prices USA |
| UK House Prices | `QGBR628BIS` | BIS Residential Property Prices GBR |
| DE House Prices | `QDEU628BIS` | BIS Residential Property Prices DEU |
| AU House Prices | `QAUS628BIS` | BIS Residential Property Prices AUS |
| CA House Prices | `QCAN628BIS` | BIS Residential Property Prices CAN |
| JP House Prices | `QJPN628BIS` | BIS Residential Property Prices JPN |

### Yahoo Finance Tickers Used
| Purpose | Tickers |
|---------|---------|
| VIX term structure | `^VIX9D`, `^VIX`, `^VIX3M`, `^VIX6M` |
| S&P momentum | `^GSPC` (125-day historical) |
| Safe haven proxy | `TLT` (20-day historical) |
| Options flow | `SPY`, `QQQ` (options chains) |
| REITs | `PLD`, `AMT`, `EQIX`, `SPG`, `WELL`, `AVB`, `BXP`, `PSA`, `O`, `VICI` |

---

### Task 1: Server `/api/bonds`

**Files:**
- Modify: `server/index.js` (insert after `/api/macro` block, around line 312)

- [ ] **Step 1: Read `server/index.js` to find exact insertion point**

Run: `grep -n "api/macro\|api/summary\|api/history" server/index.js`

Find the line number where `app.get('/api/macro'` ends (closing `});`) and insert after it.

- [ ] **Step 2: Add the `/api/bonds` endpoint**

Insert this block after the `/api/macro` closing `});`:

```js
// --- Bonds Market Data ---
const TENOR_SERIES = {
  '3m': 'DGS3MO', '6m': 'DGS6MO', '1y': 'DGS1', '2y': 'DGS2',
  '5y': 'DGS5',  '7y': 'DGS7',  '10y': 'DGS10', '20y': 'DGS20', '30y': 'DGS30',
};
const INTL_10Y = {
  DE: 'IRLTLT01DEM156N', JP: 'IRLTLT01JPM156N', GB: 'IRLTLT01GBM156N',
  IT: 'IRLTLT01ITM156N', FR: 'IRLTLT01FRM156N', AU: 'IRLTLT01AUM156N',
};
const SPREAD_SERIES = {
  IG: 'BAMLC0A0CM', HY: 'BAMLH0A0HYM2', EM: 'BAMLEMCBPIOAS',
};

async function fetchFredLatest(seriesId) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=5`;
  const data = await fetchJSON(url);
  const valid = (data?.observations || []).filter(o => o.value !== '.');
  return valid.length ? parseFloat(valid[0].value) : null;
}

async function fetchFredHistory(seriesId, limit = 13) {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=${limit}`;
  const data = await fetchJSON(url);
  return (data?.observations || [])
    .filter(o => o.value !== '.')
    .map(o => ({ date: o.date, value: parseFloat(o.value) }))
    .reverse();
}

function dateToMonthLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }).replace(' ', '-');
}

app.get('/api/bonds', async (req, res) => {
  const cacheKey = 'bonds_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  if (!FRED_API_KEY) return res.status(503).json({ error: 'FRED_API_KEY not configured' });

  try {
    // 1. US yield curve — all 9 tenors
    const usEntries = await Promise.allSettled(
      Object.entries(TENOR_SERIES).map(async ([tenor, sid]) => [tenor, await fetchFredLatest(sid)])
    );
    const usYields = {};
    usEntries.forEach(r => { if (r.status === 'fulfilled' && r.value[1] != null) usYields[r.value[0]] = r.value[1]; });

    // Map to display tenors (drop 7y, keep 3m 6m 1y 2y 5y 10y 30y)
    const yieldCurveData = {
      US: {
        '3m': usYields['3m'] ?? null, '6m': usYields['6m'] ?? null,
        '1y': usYields['1y'] ?? null, '2y': usYields['2y'] ?? null,
        '5y': usYields['5y'] ?? null, '10y': usYields['10y'] ?? null,
        '30y': usYields['30y'] ?? null,
      },
    };

    // 2. International 10yr anchors → scale whole mock curve
    const intlEntries = await Promise.allSettled(
      Object.entries(INTL_10Y).map(async ([cc, sid]) => [cc, await fetchFredLatest(sid)])
    );
    intlEntries.forEach(r => {
      if (r.status === 'fulfilled' && r.value[1] != null) {
        yieldCurveData[r.value[0]] = { '10y': r.value[1] };
      }
    });

    // 3. Credit spread history — last 12 months
    const spreadEntries = await Promise.allSettled(
      Object.entries(SPREAD_SERIES).map(async ([key, sid]) => [key, await fetchFredHistory(sid, 13)])
    );
    const spreadRaw = {};
    spreadEntries.forEach(r => { if (r.status === 'fulfilled') spreadRaw[r.value[0]] = r.value[1]; });

    // Align dates across series (use IG as anchor, last 12 points)
    const anchor = spreadRaw.IG || spreadRaw.HY || [];
    const spreadData = anchor.length ? {
      dates: anchor.slice(-12).map(p => dateToMonthLabel(p.date)),
      IG:    (spreadRaw.IG  || []).slice(-12).map(p => Math.round(p.value)),
      HY:    (spreadRaw.HY  || []).slice(-12).map(p => Math.round(p.value)),
      EM:    (spreadRaw.EM  || []).slice(-12).map(p => Math.round(p.value)),
    } : null;

    const result = {
      yieldCurveData,
      spreadData,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, 900);
    res.json(result);
  } catch (error) {
    console.error('Bonds API error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: Verify no syntax errors**

Run: `node --check server/index.js`
Expected: no output (clean)

- [ ] **Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat(server): add /api/bonds — FRED yield curves + international 10yr + spread history"
```

---

### Task 2: Server `/api/derivatives`

**Files:**
- Modify: `server/index.js` (insert after `/api/bonds` block)

- [ ] **Step 1: Add the `/api/derivatives` endpoint**

Insert this block immediately after Task 1's `/api/bonds` closing `});`:

```js
// --- Derivatives Market Data ---
const VIX_TICKERS = ['^VIX9D', '^VIX', '^VIX3M', '^VIX6M'];
const VIX_LABELS  = ['9D', '1M', '3M', '6M'];

function vixScore(vix) {
  return Math.max(0, Math.min(100, Math.round(100 - (vix - 10) * 2.5)));
}
function pcrScore(pcr) {
  return Math.max(0, Math.min(100, Math.round(100 - (pcr - 0.5) * 60)));
}
function momentumScore(pctAboveSma) {
  return Math.max(0, Math.min(100, Math.round(50 + pctAboveSma * 4)));
}
function safeHavenScore(tltRelPerf) {
  return Math.max(0, Math.min(100, Math.round(50 - tltRelPerf * 3)));
}
function junkBondScore(hyOas) {
  return Math.max(0, Math.min(100, Math.round(100 - (hyOas - 200) / 5)));
}
function scoreLabel(s) {
  if (s <= 25) return 'Extreme Fear';
  if (s <= 45) return 'Fear';
  if (s <= 55) return 'Neutral';
  if (s <= 75) return 'Greed';
  return 'Extreme Greed';
}

async function buildVolSurface(spyPrice) {
  const targetDays  = [7, 14, 30, 60, 90, 180, 365, 730];
  const expLabels   = ['1W', '2W', '1M', '2M', '3M', '6M', '1Y', '2Y'];
  const strikePcts  = [0.80, 0.85, 0.90, 0.95, 1.00, 1.05, 1.10, 1.15, 1.20];
  const strikes     = [80, 85, 90, 95, 100, 105, 110, 115, 120];

  let expirations;
  try {
    const idx = await yf.options('SPY');
    expirations = idx.expirationDates || [];
  } catch { return null; }

  const now = Math.floor(Date.now() / 1000);
  const grid = [];

  for (const days of targetDays) {
    const target = now + days * 86400;
    const nearest = expirations.reduce((best, d) =>
      Math.abs(d - target) < Math.abs(best - target) ? d : best, expirations[0]);
    try {
      const opts = await yf.options('SPY', { date: nearest });
      const calls = opts.options[0]?.calls || [];
      const row = strikePcts.map(pct => {
        const ts = Math.round(spyPrice * pct);
        const c  = calls.reduce((b, x) => Math.abs(x.strike - ts) < Math.abs((b?.strike ?? Infinity) - ts) ? x : b, null);
        return c?.impliedVolatility ? Math.round(c.impliedVolatility * 1000) / 10 : null;
      });
      grid.push(row);
    } catch {
      grid.push(new Array(9).fill(null));
    }
  }

  // If too many nulls, return null (use mock)
  const total = grid.flat().filter(v => v != null).length;
  if (total < 20) return null;

  return { strikes, expiries: expLabels, grid };
}

app.get('/api/derivatives', async (req, res) => {
  const cacheKey = 'derivatives_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // 1. VIX term structure
    const vixQuotes = await yf.quote(VIX_TICKERS).catch(() => []);
    const vixArr = Array.isArray(vixQuotes) ? vixQuotes : [vixQuotes];
    const vixTermStructure = VIX_LABELS.length === vixArr.length && vixArr.every(q => q?.regularMarketPrice) ? {
      dates:      VIX_LABELS,
      values:     vixArr.map(q => Math.round(q.regularMarketPrice * 10) / 10),
      prevValues: vixArr.map(q => Math.round((q.regularMarketPreviousClose ?? q.regularMarketPrice) * 10) / 10),
    } : null;

    // 2. Options flow — top rows by volume from SPY + QQQ nearest expiry
    let optionsFlow = null;
    try {
      const [spyOpts, qqqOpts] = await Promise.all([yf.options('SPY'), yf.options('QQQ')]);
      const spyPrice = vixArr.find(q => q.symbol === '^GSPC')?.regularMarketPrice;

      const rows = [];
      for (const [sym, opts] of [['SPY', spyOpts], ['QQQ', qqqOpts]]) {
        const exp = opts.options[0];
        if (!exp) continue;
        const expLabel = new Date(opts.expirationDates[0] * 1000)
          .toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
        for (const [type, arr] of [['C', exp.calls], ['P', exp.puts]]) {
          (arr || [])
            .filter(o => o.volume > 0 && o.openInterest > 0)
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 3)
            .forEach(o => rows.push({
              ticker: sym, strike: o.strike, expiry: expLabel, type,
              volume: o.volume, openInterest: o.openInterest,
              premium: Math.round((o.lastPrice ?? o.ask ?? 0) * 100) / 100,
              sentiment: type === 'C' ? 'bullish' : 'bearish',
            }));
        }
      }
      if (rows.length >= 4) {
        optionsFlow = rows.sort((a, b) => b.volume - a.volume).slice(0, 12);
      }
    } catch { /* use mock */ }

    // 3. Fear & Greed — compute from VIX + SPY momentum + TLT + FRED HY OAS
    let fearGreedData = null;
    try {
      const vixValue = vixArr.find(q => q.symbol === '^VIX')?.regularMarketPrice;
      const [spyHist, tltHist] = await Promise.all([
        yf.historical('^GSPC', { period1: (() => { const d = new Date(); d.setDate(d.getDate() - 180); return d.toISOString().split('T')[0]; })(), period2: new Date().toISOString().split('T')[0], interval: '1d' }),
        yf.historical('TLT',   { period1: (() => { const d = new Date(); d.setDate(d.getDate() - 30);  return d.toISOString().split('T')[0]; })(), period2: new Date().toISOString().split('T')[0], interval: '1d' }),
      ]);

      let hyOasLatest = null;
      if (FRED_API_KEY) {
        try { hyOasLatest = await fetchFredLatest('BAMLH0A0HYM2'); } catch {}
      }

      // SPY: current price vs 125-day SMA
      const spyCloses = spyHist.map(d => d.close).filter(Boolean);
      const spyCurrent = spyCloses[spyCloses.length - 1];
      const sma125 = spyCloses.slice(-125).reduce((s, v) => s + v, 0) / Math.min(125, spyCloses.length);
      const spyPctAbove = ((spyCurrent - sma125) / sma125) * 100;

      // TLT vs SPY 20-day return
      const tltCloses = tltHist.map(d => d.close).filter(Boolean);
      const tlt20 = tltCloses.length >= 20 ? ((tltCloses[tltCloses.length - 1] - tltCloses[tltCloses.length - 21]) / tltCloses[tltCloses.length - 21]) * 100 : 0;
      const spy20start = spyCloses.length >= 20 ? spyCloses[spyCloses.length - 21] : spyCloses[0];
      const spy20 = ((spyCurrent - spy20start) / spy20start) * 100;
      const tltRelPerf = tlt20 - spy20; // positive = bonds outperforming = fear

      // SPY options put/call ratio
      let pcr = 1.0; // neutral default
      if (optionsFlow) {
        const spyPuts  = optionsFlow.filter(r => r.ticker === 'SPY' && r.type === 'P').reduce((s, r) => s + r.volume, 0);
        const spyCalls = optionsFlow.filter(r => r.ticker === 'SPY' && r.type === 'C').reduce((s, r) => s + r.volume, 0);
        if (spyCalls > 0) pcr = spyPuts / spyCalls;
      }

      const indicators = [
        { name: 'VIX Level',          value: Math.round(vixValue * 10) / 10,       score: vixScore(vixValue),            label: scoreLabel(vixScore(vixValue)) },
        { name: 'Put/Call Ratio',      value: Math.round(pcr * 100) / 100,          score: pcrScore(pcr),                 label: scoreLabel(pcrScore(pcr)) },
        { name: 'Market Momentum',     value: Math.round(spyPctAbove * 10) / 10,    score: momentumScore(spyPctAbove),    label: scoreLabel(momentumScore(spyPctAbove)) },
        { name: 'Safe Haven Demand',   value: Math.round(tltRelPerf * 10) / 10,     score: safeHavenScore(tltRelPerf),    label: scoreLabel(safeHavenScore(tltRelPerf)) },
        { name: 'Junk Bond Demand',    value: hyOasLatest ?? 350,                   score: hyOasLatest ? junkBondScore(hyOasLatest) : 50, label: scoreLabel(hyOasLatest ? junkBondScore(hyOasLatest) : 50) },
        { name: 'Market Breadth',      value: 42.1, score: 41, label: 'Fear' },    // no free breadth API
        { name: 'Stock Price Strength',value: 18.0, score: 55, label: 'Neutral' }, // no free 52wk high data
      ];
      const avgScore = Math.round(indicators.reduce((s, i) => s + i.score, 0) / indicators.length);
      fearGreedData = { score: avgScore, label: scoreLabel(avgScore), indicators };
    } catch { /* use mock */ }

    // 4. Vol surface from SPY options
    let volSurfaceData = null;
    try {
      const spyQuote = await yf.quote('SPY');
      volSurfaceData = await buildVolSurface(spyQuote.regularMarketPrice);
    } catch { /* use mock */ }

    const result = {
      vixTermStructure,
      optionsFlow,
      fearGreedData,
      volSurfaceData,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    cache.set(cacheKey, result, 900);
    res.json(result);
  } catch (error) {
    console.error('Derivatives API error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node --check server/index.js`
Expected: no output (clean)

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(server): add /api/derivatives — VIX term structure, real options flow, Fear & Greed, vol surface"
```

---

### Task 3: Server `/api/realEstate`

**Files:**
- Modify: `server/index.js` (insert after `/api/derivatives` block)

- [ ] **Step 1: Add the `/api/realEstate` endpoint**

Insert this block immediately after Task 2's `/api/derivatives` closing `});`:

```js
// --- Real Estate Market Data ---
const REIT_TICKERS = ['PLD', 'AMT', 'EQIX', 'SPG', 'WELL', 'AVB', 'BXP', 'PSA', 'O', 'VICI'];
const REIT_META = {
  PLD:  { name: 'Prologis',          sector: 'Industrial',   pFFO: 18.4 },
  AMT:  { name: 'American Tower',    sector: 'Cell Towers',  pFFO: 22.1 },
  EQIX: { name: 'Equinix',           sector: 'Data Centers', pFFO: 28.5 },
  SPG:  { name: 'Simon Property',    sector: 'Retail',       pFFO: 12.8 },
  WELL: { name: 'Welltower',         sector: 'Healthcare',   pFFO: 24.2 },
  AVB:  { name: 'AvalonBay',         sector: 'Residential',  pFFO: 19.6 },
  BXP:  { name: 'Boston Properties', sector: 'Office',       pFFO:  9.4 },
  PSA:  { name: 'Public Storage',    sector: 'Self-Storage', pFFO: 16.2 },
  O:    { name: 'Realty Income',     sector: 'Net Lease',    pFFO: 13.5 },
  VICI: { name: 'VICI Properties',   sector: 'Gaming',       pFFO: 14.0 },
};

const BIS_SERIES = {
  US: 'QUSR628BIS', UK: 'QGBR628BIS', DE: 'QDEU628BIS',
  AU: 'QAUS628BIS', CA: 'QCAN628BIS', JP: 'QJPN628BIS',
};

function bisQuarterLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const q = Math.ceil((d.getUTCMonth() + 1) / 3);
  return `Q${q} ${String(d.getUTCFullYear()).slice(2)}`;
}

app.get('/api/realEstate', async (req, res) => {
  const cacheKey = 'realestate_data';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);

  try {
    // 1. REIT live quotes
    let reitData = null;
    try {
      const quotes = await yf.quote(REIT_TICKERS);
      const arr = Array.isArray(quotes) ? quotes : [quotes];
      reitData = arr
        .filter(q => q?.regularMarketPrice)
        .map(q => {
          const meta = REIT_META[q.symbol] || {};
          const ytdReturn = q.ytdReturn != null
            ? Math.round(q.ytdReturn * 1000) / 10
            : (q.regularMarketChangePercent ? Math.round(q.regularMarketChangePercent * 10) / 10 : 0);
          return {
            ticker:       q.symbol,
            name:         meta.name  || q.shortName || q.symbol,
            sector:       meta.sector || 'REIT',
            dividendYield: q.dividendYield != null ? Math.round(q.dividendYield * 1000) / 10 : null,
            pFFO:         meta.pFFO,  // not in Yahoo Finance, keep static
            ytdReturn,
            marketCap:    q.marketCap ? Math.round(q.marketCap / 1e9) : null,
            price:        Math.round(q.regularMarketPrice * 100) / 100,
            changePct:    Math.round((q.regularMarketChangePercent ?? 0) * 100) / 100,
          };
        });
    } catch { /* use mock */ }

    // 2. House price indices from FRED BIS series
    let priceIndexData = null;
    if (FRED_API_KEY) {
      try {
        const bisEntries = await Promise.allSettled(
          Object.entries(BIS_SERIES).map(async ([cc, sid]) => {
            const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${sid}&api_key=${FRED_API_KEY}&file_type=json&sort_order=asc&observation_start=2020-01-01`;
            const data = await fetchJSON(url);
            const obs = (data?.observations || []).filter(o => o.value !== '.');
            if (!obs.length) return [cc, null];
            // Rebase to Q1 2020 = 100
            const base = parseFloat(obs[0].value);
            const dated = obs.map(o => ({
              label: bisQuarterLabel(o.date),
              value: Math.round((parseFloat(o.value) / base) * 100 * 10) / 10,
            }));
            return [cc, dated];
          })
        );

        const collected = {};
        bisEntries.forEach(r => {
          if (r.status === 'fulfilled' && r.value[1]) collected[r.value[0]] = r.value[1];
        });

        if (Object.keys(collected).length >= 2) {
          priceIndexData = {};
          for (const [cc, pts] of Object.entries(collected)) {
            priceIndexData[cc] = {
              dates:  pts.map(p => p.label),
              values: pts.map(p => p.value),
            };
          }
        }
      } catch { /* use mock */ }
    }

    const result = { reitData, priceIndexData, lastUpdated: new Date().toISOString().split('T')[0] };
    cache.set(cacheKey, result, 900);
    res.json(result);
  } catch (error) {
    console.error('Real Estate API error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 2: Verify no syntax errors**

Run: `node --check server/index.js`
Expected: no output (clean)

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat(server): add /api/realEstate — REIT live quotes + BIS house price indices"
```

---

### Task 4: Async `useBondsData` + BondsMarket loading state

**Files:**
- Modify: `src/markets/bonds/data/useBondsData.js`
- Modify: `src/markets/bonds/BondsMarket.jsx`
- Modify: `src/markets/bonds/BondsMarket.css`
- Modify: `src/__tests__/bonds/useBondsData.test.js`
- Modify: `src/__tests__/bonds/BondsMarket.test.jsx`

- [ ] **Step 1: Write the failing hook test**

Replace `src/__tests__/bonds/useBondsData.test.js` entirely:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBondsData } from '../../markets/bonds/data/useBondsData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useBondsData', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns mock yieldCurveData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { yieldCurveData } = result.current;
    expect(typeof yieldCurveData).toBe('object');
    expect(yieldCurveData.US).toBeDefined();
    expect(typeof yieldCurveData.US['10y']).toBe('number');
    expect(result.current.isLive).toBe(false);
  });

  it('returns mock spreadData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { spreadData } = result.current;
    expect(Array.isArray(spreadData.dates)).toBe(true);
    expect(spreadData.dates.length).toBe(12);
    expect(Array.isArray(spreadData.IG)).toBe(true);
    expect(spreadData.IG.length).toBe(12);
  });

  it('merges live US yields into yieldCurveData when server responds', async () => {
    const liveData = {
      yieldCurveData: { US: { '3m': 5.10, '6m': 4.95, '1y': 4.70, '2y': 4.45, '5y': 4.20, '10y': 4.05, '30y': 4.25 } },
      spreadData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.yieldCurveData.US['10y']).toBe(4.05);
    expect(result.current.yieldCurveData.US['3m']).toBe(5.10);
  });

  it('scales international curve using live 10yr anchor', async () => {
    const liveData = {
      yieldCurveData: { US: { '3m': 5.1, '6m': 4.9, '1y': 4.7, '2y': 4.4, '5y': 4.2, '10y': 4.0, '30y': 4.2 }, DE: { '10y': 3.0 } },
      spreadData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    // DE mock 10yr = 2.65, live 10yr = 3.0, scale = 3.0/2.65 ≈ 1.132
    // DE mock 5yr = 2.85, scaled ≈ 2.85 * 1.132 ≈ 3.23
    const de = result.current.yieldCurveData.DE;
    expect(de['10y']).toBe(3.0);
    expect(de['5y']).toBeGreaterThan(2.85); // scaled up
  });

  it('falls back to mock spreadData when server returns null', async () => {
    const liveData = { yieldCurveData: { US: { '10y': 4.0 } }, spreadData: null, lastUpdated: '2026-04-04' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.spreadData.dates.length).toBe(12);
  });

  it('returns creditRatingsData and durationLadderData unchanged (always mock)', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useBondsData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.creditRatingsData)).toBe(true);
    expect(result.current.creditRatingsData.length).toBeGreaterThan(0);
    expect(Array.isArray(result.current.durationLadderData)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/bonds/useBondsData.test.js
```
Expected: FAIL — hook is synchronous, not async

- [ ] **Step 3: Replace `src/markets/bonds/data/useBondsData.js`**

```js
import { useState, useEffect } from 'react';
import {
  yieldCurveData as mockYieldCurveData,
  creditRatingsData,
  spreadData as mockSpreadData,
  durationLadderData,
} from './mockBondsData';

const SERVER = 'http://localhost:3001';

// Mock 10yr anchors for international curve scaling
const MOCK_10Y = { DE: 2.65, JP: 0.72, GB: 4.25, IT: 4.05, FR: 3.10, AU: 4.30 };

function scaleCurve(mockCurve, live10y, mock10y) {
  if (!live10y || !mock10y || mock10y === 0) return mockCurve;
  const factor = live10y / mock10y;
  const scaled = {};
  for (const [tenor, val] of Object.entries(mockCurve)) {
    scaled[tenor] = tenor === '10y' ? live10y : Math.round(val * factor * 100) / 100;
  }
  return scaled;
}

function mergeYieldCurves(serverData, mock) {
  const merged = { ...mock };
  const liveUS = serverData?.US;
  if (liveUS) {
    merged.US = { ...mock.US };
    for (const [tenor, val] of Object.entries(liveUS)) {
      if (val != null) merged.US[tenor] = val;
    }
  }
  for (const cc of ['DE', 'JP', 'GB', 'IT', 'FR', 'AU']) {
    const live10y = serverData?.[cc]?.['10y'];
    if (live10y != null) {
      merged[cc] = scaleCurve(mock[cc] || {}, live10y, MOCK_10Y[cc]);
    }
  }
  return merged;
}

export function useBondsData() {
  const [yieldCurveData, setYieldCurveData]   = useState(mockYieldCurveData);
  const [spreadData, setSpreadData]           = useState(mockSpreadData);
  const [isLive, setIsLive]                   = useState(false);
  const [lastUpdated, setLastUpdated]         = useState('Mock data — Apr 2025');
  const [isLoading, setIsLoading]             = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/bonds`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.yieldCurveData) setYieldCurveData(mergeYieldCurves(data.yieldCurveData, mockYieldCurveData));
        if (data.spreadData?.dates?.length === 12) setSpreadData(data.spreadData);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { yieldCurveData, creditRatingsData, spreadData, durationLadderData, isLive, lastUpdated, isLoading };
}
```

- [ ] **Step 4: Run hook test to verify it passes**

```bash
npx vitest run src/__tests__/bonds/useBondsData.test.js
```
Expected: 5 tests passing

- [ ] **Step 5: Update `src/__tests__/bonds/BondsMarket.test.jsx`**

Replace the file entirely:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BondsMarket from '../../markets/bonds/BondsMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('BondsMarket', () => {
  it('renders Yield Curve tab by default after loading', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Yield Curve').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Yield Curve'     })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Credit Matrix'   })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Spread Monitor'  })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Duration Ladder' })).toBeInTheDocument();
  });

  it('switches to Credit Matrix on click', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Credit Matrix' }));
    expect(screen.getByText(/S&P|AAA|rating/i)).toBeInTheDocument();
  });

  it('switches to Spread Monitor on click', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Spread Monitor' }));
    expect(screen.getAllByText(/spread|OAS|IG|HY/i).length).toBeGreaterThan(0);
  });

  it('shows mock data status when server unavailable', async () => {
    render(<BondsMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Update `src/markets/bonds/BondsMarket.jsx`**

Replace the file:

```jsx
import React, { useState } from 'react';
import { useBondsData } from './data/useBondsData';
import YieldCurve     from './components/YieldCurve';
import CreditMatrix   from './components/CreditMatrix';
import SpreadMonitor  from './components/SpreadMonitor';
import DurationLadder from './components/DurationLadder';
import './BondsMarket.css';

const SUB_TABS = [
  { id: 'yield-curve',     label: 'Yield Curve'    },
  { id: 'credit-matrix',   label: 'Credit Matrix'  },
  { id: 'spread-monitor',  label: 'Spread Monitor' },
  { id: 'duration-ladder', label: 'Duration Ladder' },
];

export default function BondsMarket() {
  const [activeTab, setActiveTab] = useState('yield-curve');
  const { yieldCurveData, creditRatingsData, spreadData, durationLadderData, isLive, lastUpdated, isLoading } = useBondsData();

  if (isLoading) {
    return (
      <div className="bonds-market bonds-loading">
        <div className="bonds-loading-spinner" />
        <span className="bonds-loading-text">Loading bonds data…</span>
      </div>
    );
  }

  return (
    <div className="bonds-market">
      <div className="bonds-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`bonds-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bonds-status-bar">
        <span className={isLive ? 'bonds-status-live' : ''}>
          {isLive ? '● Live (FRED)' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="bonds-content">
        {activeTab === 'yield-curve'     && <YieldCurve     yieldCurveData={yieldCurveData} />}
        {activeTab === 'credit-matrix'   && <CreditMatrix   creditRatingsData={creditRatingsData} />}
        {activeTab === 'spread-monitor'  && <SpreadMonitor  spreadData={spreadData} />}
        {activeTab === 'duration-ladder' && <DurationLadder durationLadderData={durationLadderData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Append loading styles to `src/markets/bonds/BondsMarket.css`**

Append to end of file (do NOT replace existing content):

```css
/* Loading state */
.bonds-loading {
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.bonds-loading-spinner {
  width: 24px; height: 24px;
  border: 2px solid #1e293b;
  border-top-color: #10b981;
  border-radius: 50%;
  animation: bonds-spin 0.7s linear infinite;
}
@keyframes bonds-spin { to { transform: rotate(360deg); } }
.bonds-loading-text { font-size: 12px; color: #64748b; }
```

- [ ] **Step 8: Run full suite**

```bash
npx vitest run
```
Expected: all tests passing

- [ ] **Step 9: Commit**

```bash
git add src/markets/bonds/data/useBondsData.js src/markets/bonds/BondsMarket.jsx src/markets/bonds/BondsMarket.css src/__tests__/bonds/useBondsData.test.js src/__tests__/bonds/BondsMarket.test.jsx
git commit -m "feat(bonds): async useBondsData — live FRED yield curves + spread history + loading state"
```

---

### Task 5: Async `useDerivativesData` + DerivativesMarket loading state

**Files:**
- Modify: `src/markets/derivatives/data/useDerivativesData.js`
- Modify: `src/markets/derivatives/DerivativesMarket.jsx`
- Modify: `src/markets/derivatives/DerivativesMarket.css`
- Modify: `src/__tests__/derivatives/useDerivativesData.test.js`
- Modify: `src/__tests__/derivatives/DerivativesMarket.test.jsx`

- [ ] **Step 1: Write the failing hook test**

Replace `src/__tests__/derivatives/useDerivativesData.test.js` entirely:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDerivativesData } from '../../markets/derivatives/data/useDerivativesData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useDerivativesData', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns mock volSurfaceData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { volSurfaceData } = result.current;
    expect(Array.isArray(volSurfaceData.strikes)).toBe(true);
    expect(volSurfaceData.grid.length).toBe(volSurfaceData.expiries.length);
    expect(result.current.isLive).toBe(false);
  });

  it('returns mock vixTermStructure on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { vixTermStructure } = result.current;
    expect(vixTermStructure.dates.length).toBeGreaterThan(0);
    expect(vixTermStructure.values.length).toBe(vixTermStructure.dates.length);
    expect(vixTermStructure.prevValues.length).toBe(vixTermStructure.dates.length);
  });

  it('uses live vixTermStructure when server responds', async () => {
    const liveData = {
      vixTermStructure: { dates: ['9D', '1M', '3M', '6M'], values: [14.2, 16.8, 18.5, 20.1], prevValues: [13.9, 16.2, 17.9, 19.6] },
      optionsFlow: null, fearGreedData: null, volSurfaceData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.vixTermStructure.values).toEqual([14.2, 16.8, 18.5, 20.1]);
  });

  it('uses live optionsFlow when server responds', async () => {
    const liveFlow = [
      { ticker: 'SPY', strike: 520, expiry: '16 May 25', type: 'P', volume: 45200, openInterest: 12400, premium: 8.20, sentiment: 'bearish' },
    ];
    const liveData = {
      vixTermStructure: null, optionsFlow: liveFlow, fearGreedData: null, volSurfaceData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.optionsFlow[0].ticker).toBe('SPY');
  });

  it('falls back to mock fearGreedData when server returns null', async () => {
    const liveData = { vixTermStructure: null, optionsFlow: null, fearGreedData: null, volSurfaceData: null, lastUpdated: '2026-04-04' };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useDerivativesData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.fearGreedData.score).toBeGreaterThanOrEqual(0);
    expect(result.current.fearGreedData.score).toBeLessThanOrEqual(100);
    expect(result.current.fearGreedData.indicators.length).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/derivatives/useDerivativesData.test.js
```
Expected: FAIL — hook is synchronous

- [ ] **Step 3: Replace `src/markets/derivatives/data/useDerivativesData.js`**

```js
import { useState, useEffect } from 'react';
import {
  volSurfaceData  as mockVolSurfaceData,
  vixTermStructure as mockVixTermStructure,
  optionsFlow     as mockOptionsFlow,
  fearGreedData   as mockFearGreedData,
} from './mockDerivativesData';

const SERVER = 'http://localhost:3001';

export function useDerivativesData() {
  const [volSurfaceData,   setVolSurfaceData]   = useState(mockVolSurfaceData);
  const [vixTermStructure, setVixTermStructure] = useState(mockVixTermStructure);
  const [optionsFlow,      setOptionsFlow]      = useState(mockOptionsFlow);
  const [fearGreedData,    setFearGreedData]    = useState(mockFearGreedData);
  const [isLive,           setIsLive]           = useState(false);
  const [lastUpdated,      setLastUpdated]      = useState('Mock data — Apr 2025');
  const [isLoading,        setIsLoading]        = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/derivatives`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.vixTermStructure?.dates?.length)         setVixTermStructure(data.vixTermStructure);
        if (data.optionsFlow?.length >= 4)                setOptionsFlow(data.optionsFlow);
        if (data.fearGreedData?.indicators?.length === 7) setFearGreedData(data.fearGreedData);
        if (data.volSurfaceData?.grid?.length)            setVolSurfaceData(data.volSurfaceData);
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, isLive, lastUpdated, isLoading };
}
```

- [ ] **Step 4: Run hook test to verify it passes**

```bash
npx vitest run src/__tests__/derivatives/useDerivativesData.test.js
```
Expected: 5 tests passing

- [ ] **Step 5: Update `src/__tests__/derivatives/DerivativesMarket.test.jsx`**

Replace the file:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DerivativesMarket from '../../markets/derivatives/DerivativesMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('DerivativesMarket', () => {
  it('renders Vol Surface tab by default after loading', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Vol Surface').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Vol Surface'        })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'VIX Term Structure' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Options Flow'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fear & Greed'       })).toBeInTheDocument();
  });

  it('switches to Options Flow on click', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Options Flow' }));
    expect(screen.getByText(/unusual options activity/i)).toBeInTheDocument();
  });

  it('switches to Fear & Greed on click', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Fear & Greed' }));
    expect(screen.getByText(/composite sentiment/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<DerivativesMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Update `src/markets/derivatives/DerivativesMarket.jsx`**

Replace the file:

```jsx
import React, { useState } from 'react';
import { useDerivativesData } from './data/useDerivativesData';
import VolSurface       from './components/VolSurface';
import VIXTermStructure from './components/VIXTermStructure';
import OptionsFlow      from './components/OptionsFlow';
import FearGreed        from './components/FearGreed';
import './DerivativesMarket.css';

const SUB_TABS = [
  { id: 'vol-surface',        label: 'Vol Surface'        },
  { id: 'vix-term-structure', label: 'VIX Term Structure' },
  { id: 'options-flow',       label: 'Options Flow'       },
  { id: 'fear-greed',         label: 'Fear & Greed'       },
];

export default function DerivativesMarket() {
  const [activeTab, setActiveTab] = useState('vol-surface');
  const { volSurfaceData, vixTermStructure, optionsFlow, fearGreedData, isLive, lastUpdated, isLoading } = useDerivativesData();

  if (isLoading) {
    return (
      <div className="deriv-market deriv-loading">
        <div className="deriv-loading-spinner" />
        <span className="deriv-loading-text">Loading derivatives data…</span>
      </div>
    );
  }

  return (
    <div className="deriv-market">
      <div className="deriv-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`deriv-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="deriv-status-bar">
        <span className={isLive ? 'deriv-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="deriv-content">
        {activeTab === 'vol-surface'        && <VolSurface       volSurfaceData={volSurfaceData} />}
        {activeTab === 'vix-term-structure' && <VIXTermStructure vixTermStructure={vixTermStructure} />}
        {activeTab === 'options-flow'       && <OptionsFlow      optionsFlow={optionsFlow} />}
        {activeTab === 'fear-greed'         && <FearGreed        fearGreedData={fearGreedData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Append loading styles to `src/markets/derivatives/DerivativesMarket.css`**

Append to end of file:

```css
/* Loading state */
.deriv-loading {
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.deriv-loading-spinner {
  width: 24px; height: 24px;
  border: 2px solid #1e293b;
  border-top-color: #a78bfa;
  border-radius: 50%;
  animation: deriv-spin 0.7s linear infinite;
}
@keyframes deriv-spin { to { transform: rotate(360deg); } }
.deriv-loading-text { font-size: 12px; color: #64748b; }
```

- [ ] **Step 8: Run full suite**

```bash
npx vitest run
```
Expected: all tests passing

- [ ] **Step 9: Commit**

```bash
git add src/markets/derivatives/data/useDerivativesData.js src/markets/derivatives/DerivativesMarket.jsx src/markets/derivatives/DerivativesMarket.css src/__tests__/derivatives/useDerivativesData.test.js src/__tests__/derivatives/DerivativesMarket.test.jsx
git commit -m "feat(derivatives): async useDerivativesData — live VIX term structure, real options flow, Fear & Greed + loading state"
```

---

### Task 6: Async `useRealEstateData` + RealEstateMarket loading state

**Files:**
- Modify: `src/markets/realEstate/data/useRealEstateData.js`
- Modify: `src/markets/realEstate/RealEstateMarket.jsx`
- Modify: `src/markets/realEstate/RealEstateMarket.css`
- Modify: `src/__tests__/realEstate/useRealEstateData.test.js`
- Modify: `src/__tests__/realEstate/RealEstateMarket.test.jsx`

- [ ] **Step 1: Write the failing hook test**

Replace `src/__tests__/realEstate/useRealEstateData.test.js` entirely:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useRealEstateData } from '../../markets/realEstate/data/useRealEstateData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('useRealEstateData', () => {
  beforeEach(() => mockFetch.mockReset());

  it('returns mock reitData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { reitData } = result.current;
    expect(Array.isArray(reitData)).toBe(true);
    expect(reitData.length).toBeGreaterThanOrEqual(8);
    expect(result.current.isLive).toBe(false);
  });

  it('returns mock priceIndexData on server failure', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const { priceIndexData } = result.current;
    expect(priceIndexData.US).toBeDefined();
    expect(Array.isArray(priceIndexData.US.dates)).toBe(true);
    expect(priceIndexData.US.values.length).toBe(priceIndexData.US.dates.length);
  });

  it('uses live reitData when server responds', async () => {
    const liveData = {
      reitData: [
        { ticker: 'PLD', name: 'Prologis', sector: 'Industrial', dividendYield: 3.1, pFFO: 18.4, ytdReturn: 7.5, marketCap: 98, price: 110.2, changePct: 0.5 },
      ],
      priceIndexData: null,
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.reitData[0].price).toBe(110.2);
    expect(result.current.reitData[0].dividendYield).toBe(3.1);
  });

  it('uses live priceIndexData when server responds', async () => {
    const liveData = {
      reitData: null,
      priceIndexData: {
        US: { dates: ['Q1 20', 'Q2 20', 'Q3 20', 'Q4 20'], values: [100, 97.2, 103.5, 107.1] },
        UK: { dates: ['Q1 20', 'Q2 20', 'Q3 20', 'Q4 20'], values: [100, 96.8, 102.1, 106.3] },
      },
      lastUpdated: '2026-04-04',
    };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(liveData) });
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLive).toBe(true));
    expect(result.current.priceIndexData.US.values[0]).toBe(100);
  });

  it('always returns mock affordabilityData and capRateData', async () => {
    mockFetch.mockRejectedValue(new Error('no server'));
    const { result } = renderHook(() => useRealEstateData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(Array.isArray(result.current.affordabilityData)).toBe(true);
    expect(result.current.affordabilityData.length).toBeGreaterThan(0);
    expect(result.current.capRateData).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/realEstate/useRealEstateData.test.js
```
Expected: FAIL — hook is synchronous

- [ ] **Step 3: Replace `src/markets/realEstate/data/useRealEstateData.js`**

```js
import { useState, useEffect } from 'react';
import {
  priceIndexData   as mockPriceIndexData,
  reitData         as mockReitData,
  affordabilityData,
  capRateData,
} from './mockRealEstateData';

const SERVER = 'http://localhost:3001';

export function useRealEstateData() {
  const [priceIndexData, setPriceIndexData] = useState(mockPriceIndexData);
  const [reitData,       setReitData]       = useState(mockReitData);
  const [isLive,         setIsLive]         = useState(false);
  const [lastUpdated,    setLastUpdated]    = useState('Mock data — Apr 2025');
  const [isLoading,      setIsLoading]      = useState(true);

  useEffect(() => {
    fetch(`${SERVER}/api/realEstate`)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        if (data.reitData?.length)                     setReitData(data.reitData);
        if (data.priceIndexData && Object.keys(data.priceIndexData).length >= 2) {
          // Merge live countries into mock (keep mock for any missing country)
          setPriceIndexData(prev => ({ ...prev, ...data.priceIndexData }));
        }
        setIsLive(true);
        setLastUpdated(data.lastUpdated || new Date().toISOString().split('T')[0]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return { priceIndexData, reitData, affordabilityData, capRateData, isLive, lastUpdated, isLoading };
}
```

- [ ] **Step 4: Run hook test to verify it passes**

```bash
npx vitest run src/__tests__/realEstate/useRealEstateData.test.js
```
Expected: 5 tests passing

- [ ] **Step 5: Update `src/__tests__/realEstate/RealEstateMarket.test.jsx`**

Replace the file:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RealEstateMarket from '../../markets/realEstate/RealEstateMarket';

vi.mock('echarts-for-react', () => ({ default: () => <div data-testid="echarts-mock" /> }));

beforeEach(() => {
  global.fetch = vi.fn().mockRejectedValue(new Error('no server'));
});

describe('RealEstateMarket', () => {
  it('renders Price Index tab by default after loading', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText('Price Index').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all 4 sub-tabs', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Price Index'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'REIT Screen'       })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Affordability Map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cap Rate Monitor'  })).toBeInTheDocument();
  });

  it('switches to REIT Screen on click', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'REIT Screen' }));
    expect(screen.getByText(/PLD|Prologis|Industrial|REIT/i)).toBeInTheDocument();
  });

  it('switches to Affordability Map on click', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Affordability Map' }));
    expect(screen.getByText(/Hong Kong|Sydney|price.to.income/i)).toBeInTheDocument();
  });

  it('shows mock data status when server unavailable', async () => {
    render(<RealEstateMarket />);
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument());
    expect(screen.getAllByText(/mock data/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 6: Update `src/markets/realEstate/RealEstateMarket.jsx`**

Replace the file:

```jsx
import React, { useState } from 'react';
import { useRealEstateData } from './data/useRealEstateData';
import PriceIndex       from './components/PriceIndex';
import REITScreen       from './components/REITScreen';
import AffordabilityMap from './components/AffordabilityMap';
import CapRateMonitor   from './components/CapRateMonitor';
import './RealEstateMarket.css';

const SUB_TABS = [
  { id: 'price-index',       label: 'Price Index'       },
  { id: 'reit-screen',       label: 'REIT Screen'       },
  { id: 'affordability-map', label: 'Affordability Map' },
  { id: 'cap-rate-monitor',  label: 'Cap Rate Monitor'  },
];

export default function RealEstateMarket() {
  const [activeTab, setActiveTab] = useState('price-index');
  const { priceIndexData, reitData, affordabilityData, capRateData, isLive, lastUpdated, isLoading } = useRealEstateData();

  if (isLoading) {
    return (
      <div className="re-market re-loading">
        <div className="re-loading-spinner" />
        <span className="re-loading-text">Loading real estate data…</span>
      </div>
    );
  }

  return (
    <div className="re-market">
      <div className="re-sub-tabs">
        {SUB_TABS.map(t => (
          <button
            key={t.id}
            className={`re-sub-tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="re-status-bar">
        <span className={isLive ? 're-status-live' : ''}>
          {isLive ? '● Live' : '○ Mock data — static'}
        </span>
        {lastUpdated && <span>Updated: {lastUpdated}</span>}
      </div>
      <div className="re-content">
        {activeTab === 'price-index'       && <PriceIndex       priceIndexData={priceIndexData} />}
        {activeTab === 'reit-screen'       && <REITScreen       reitData={reitData} />}
        {activeTab === 'affordability-map' && <AffordabilityMap affordabilityData={affordabilityData} />}
        {activeTab === 'cap-rate-monitor'  && <CapRateMonitor   capRateData={capRateData} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Append loading styles to `src/markets/realEstate/RealEstateMarket.css`**

Append to end of file:

```css
/* Loading state */
.re-loading {
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.re-loading-spinner {
  width: 24px; height: 24px;
  border: 2px solid #1e293b;
  border-top-color: #f97316;
  border-radius: 50%;
  animation: re-spin 0.7s linear infinite;
}
@keyframes re-spin { to { transform: rotate(360deg); } }
.re-loading-text { font-size: 12px; color: #64748b; }
```

- [ ] **Step 8: Run full suite**

```bash
npx vitest run
```
Expected: all tests passing, no regressions

- [ ] **Step 9: Commit**

```bash
git add src/markets/realEstate/data/useRealEstateData.js src/markets/realEstate/RealEstateMarket.jsx src/markets/realEstate/RealEstateMarket.css src/__tests__/realEstate/useRealEstateData.test.js src/__tests__/realEstate/RealEstateMarket.test.jsx
git commit -m "feat(realEstate): async useRealEstateData — live REIT quotes + BIS house price index + loading state"
```

---

## Self-Review

**Spec coverage:**
- FRED US yield curve → Task 1 `/api/bonds` ✓
- International 10yr yield anchors with curve scaling → Task 1 + Task 4 `mergeYieldCurves` ✓
- IG/HY/EM spread 12-month history → Task 1 ✓
- Credit ratings stays mock → confirmed (hook returns `creditRatingsData` unchanged) ✓
- Duration ladder stays mock → confirmed (hook returns `durationLadderData` unchanged) ✓
- VIX term structure (4 tenors) → Task 2 ✓
- Options flow (SPY + QQQ real chains) → Task 2 ✓
- Fear & Greed (5/7 real indicators) → Task 2 ✓
- Vol surface (SPY real IVs) → Task 2 `buildVolSurface` ✓
- REIT live quotes (10 tickers) → Task 3 ✓
- BIS house price indices (6 countries) → Task 3 ✓
- Affordability stays mock → confirmed ✓
- Cap rates stays mock → confirmed ✓
- Loading spinners all 3 markets → Tasks 4, 5, 6 ✓
- Spinner colors match accent: Bonds green `#10b981`, Derivatives purple `#a78bfa`, Real Estate orange `#f97316` ✓

**Placeholder scan:** No TBDs. All code complete.

**Type consistency:**
- `spreadData` shape: `{ dates: string[], IG: number[], HY: number[], EM: number[] }` — consistent Tasks 1 + 4 ✓
- `yieldCurveData[cc]` shape: `{ '3m': number, ..., '30y': number }` — Task 1 returns same shape, Task 4 merges preserving it ✓
- `vixTermStructure` shape: `{ dates: string[], values: number[], prevValues: number[] }` — consistent Tasks 2 + 5 ✓
- `optionsFlow` shape: `[{ ticker, strike, expiry, type, volume, openInterest, premium, sentiment }]` — consistent Tasks 2 + 5 ✓
- `reitData` shape: `[{ ticker, name, sector, dividendYield, pFFO, ytdReturn, marketCap, price, changePct }]` — Task 3 adds `price`/`changePct`; mock doesn't have those, but hook merges live → components receive enriched data ✓
