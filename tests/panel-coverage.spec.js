/**
 * Panel coverage spec.
 *
 * Strict counterpart to data-binding-audit.spec.js. Drives the registry in
 * tests/panel-registry.js — for every market tab, navigates, lets the data
 * wave land, and asserts that:
 *
 *   1. every registered panel exists in the DOM
 *   2. it is not stuck on PENDING / NO DATA
 *   3. it has rendered content (chart canvas/svg, OR ≥ minValues meaningful
 *      text values that aren't all em-dash placeholders)
 *   4. no UNREGISTERED panel exists (forces newly-added panels to be
 *      registered, which is the whole point — coverage grows with the app
 *      instead of decaying behind it)
 *
 * Run with the dev/start server up:
 *   npm run test:coverage
 *
 * Knobs:
 *   COVERAGE_SETTLE_MS=8000   override per-tab data-wave wait
 *   COVERAGE_STRICT=0         soft-warn on extras instead of failing
 *   COVERAGE_ONLY=bonds,fx    restrict to a subset of markets
 */
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { PANEL_REGISTRY, SOFT_EXTRA_MARKETS } from './panel-registry.js';

const SETTLE_MS = Number(process.env.COVERAGE_SETTLE_MS || 7000);
const STRICT = process.env.COVERAGE_STRICT !== '0';
const ONLY = (process.env.COVERAGE_ONLY || '').split(',').map(s => s.trim()).filter(Boolean);

const REPORT_PATH = path.resolve('test-results', 'panel-coverage.json');

const MARKETS = Object.keys(PANEL_REGISTRY).filter(m => ONLY.length === 0 || ONLY.includes(m));

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .trim();
}

// Run inside the page. Returns a per-tab snapshot of every bento card on
// screen with enough metadata for the assertion layer to make decisions.
async function collectPanels(page) {
  return page.$$eval('[class*="bento-card"], [class*="bento-panel"]:not([class*="bento-panel-content"]):not([class*="bento-panel-title-row"])', (cards) => {
    function decode(s) {
      const t = document.createElement('textarea');
      t.innerHTML = s || '';
      return t.value.trim();
    }
    return cards.map((card) => {
      const titleEl = card.querySelector('.bento-panel-title-row, [class*="panel-title-row"]');
      // Title row often contains both title + subtitle spans. Prefer the
      // first span/dedicated title element; fall back to the row's text.
      let title = '';
      const titleSpan = titleEl?.querySelector('[class*="panel-title"]:not([class*="subtitle"])');
      if (titleSpan) title = titleSpan.textContent || '';
      else if (titleEl) title = titleEl.textContent || '';
      title = decode(title).slice(0, 100);

      const badge = card.querySelector('.df-fetched, .df-static, .df-pending, .df-no-data');
      const badgeText = badge?.textContent?.trim() || null;

      const valueEls = Array.from(card.querySelectorAll('[class*="value"], [class*="num"], td, .bento-panel-content span'));
      const values = valueEls.map(el => (el.textContent || '').trim());
      const meaningful = values.filter(v => v && v !== '—' && v !== '-' && v !== 'N/A' && !/^\.+$/.test(v));

      const hasCanvas = !!card.querySelector('canvas');
      const svgEls = Array.from(card.querySelectorAll('svg'));
      const hasChartSvg = svgEls.some(svg => {
        const r = svg.getBoundingClientRect();
        return r.width > 20 && r.height > 20;
      });

      return {
        title,
        badge: badgeText,
        valueCount: values.length,
        meaningfulCount: meaningful.length,
        hasCanvas,
        hasChartSvg,
      };
    });
  });
}

function panelHasContent(panel, minValues) {
  if (panel.badge === 'PENDING' || panel.badge === 'NO DATA') return false;
  if (panel.hasCanvas || panel.hasChartSvg) return true;
  return panel.meaningfulCount >= (minValues ?? 1);
}

function matchesEntry(entry, panelTitle) {
  const decoded = decodeEntities(panelTitle);
  if (entry.titlePattern) return entry.titlePattern.test(decoded);
  return decoded === entry.title;
}

test.beforeEach(async ({ page }) => {
  page.on('console', msg => console.log(`[browser console] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.error(`[browser pageerror] ${err.message}\n${err.stack}`));

  const mockResponses = {
    '/api/equities': {
      isLive: true, isCurrent: true,
      quotes: Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`TICKER${i}`, { price: 100 + i, change: 1.5, changePercent: 1.2 }])),
      stocks: [{ ticker: 'AAPL', price: 150, change: 2.3 }],
      indices: { SPY: { price: 450, change: 0.5 }, QQQ: { price: 380, change: 0.8 } },
      dummy: true
    },
    '/api/watchlist': {
      isLive: true, isCurrent: true,
      tickers: ['AAPL', 'MSFT', 'GOOG'],
      metrics: { AAPL: { price: 175 }, MSFT: { price: 420 }, GOOG: { price: 170 } },
      dummy: true
    },
    '/api/rate-limits': {
      isLive: true, isCurrent: true,
      apiUsage: { totalExternalCalls: 120 },
      dataFreshness: { currentCount: 15, markets: [{ name: 'bonds' }, { name: 'fx' }] },
      cacheFiles: { count: 12, totalSizeKB: 256 },
      memoryCache: { keyCount: 45, hitRate: 88 },
      errorLog: [{ timestamp: '2026-06-24T10:00:00Z', error: 'Test error' }],
      dummy: true
    },
    '/api/analytics': {
      isLive: true,
      isCurrent: true,
      apiUsage: {
        totalExternalCalls: 120,
        sources: [
          { name: 'Yahoo Finance', used: 12, limit: 2000, pct: 1, remaining: 1988 },
          { name: 'FRED', used: 45, limit: 172800, pct: 0, remaining: 172755 }
        ]
      },
      endpoints: [
        { path: '/api/stocks', calls: 50, avgMs: 12, maxMs: 45, minMs: 2, p50Ms: 10, errors: 0, errorPct: 0, lastCalled: '2026-06-24T12:00:00Z', recentErrors: [] },
        { path: '/api/bonds', calls: 30, avgMs: 18, maxMs: 80, minMs: 5, p50Ms: 15, errors: 0, errorPct: 0, lastCalled: '2026-06-24T12:05:00Z', recentErrors: [] },
        { path: '/api/fx', calls: 20, avgMs: 8, maxMs: 30, minMs: 1, p50Ms: 6, errors: 0, errorPct: 0, lastCalled: '2026-06-24T12:06:00Z', recentErrors: [] }
      ],
      dataFreshness: {
        today: '2026-06-24',
        markets: [
          { market: 'bonds', fetchedOn: '2026-06-24', isCurrent: true, ageHours: 1, hasFileCache: true, hasMemCache: true, fileSizeKB: 12, keyCount: 5 },
          { market: 'fx', fetchedOn: '2026-06-24', isCurrent: true, ageHours: 1, hasFileCache: true, hasMemCache: true, fileSizeKB: 8, keyCount: 4 },
          { market: 'equities', fetchedOn: '2026-06-24', isCurrent: true, ageHours: 1, hasFileCache: true, hasMemCache: true, fileSizeKB: 15, keyCount: 6 }
        ],
        currentCount: 3,
        staleCount: 0,
        noCacheCount: 0
      },
      cacheFiles: {
        count: 3,
        totalSizeKB: 35,
        files: [
          { name: 'bonds.json', sizeKB: 12, sizeDisplay: '12KB', modified: '2026-06-24T12:00:00Z' },
          { name: 'fx.json', sizeKB: 8, sizeDisplay: '8KB', modified: '2026-06-24T12:01:00Z' },
          { name: 'equities.json', sizeKB: 15, sizeDisplay: '15KB', modified: '2026-06-24T12:02:00Z' }
        ]
      },
      memCache: {
        keyCount: 5,
        keys: ['route_bonds', 'route_fx', 'route_equities'],
        hits: 120,
        misses: 10,
        hitRate: 92
      },
      errorLog: [
        { timestamp: '2026-06-24T12:00:00Z', error: 'Database connection reset', status: 503, method: 'GET', path: '/api/fred' }
      ],
      environment: {
        nodeVersion: 'v22.22.3',
        platform: 'linux',
        arch: 'x64',
        cpus: 2,
        totalMemGB: 1,
        freeMemGB: 1,
        hostname: 'localhost',
        pid: 1,
        cwd: '/workspace',
        env: 'production'
      },
      uptime: {
        seconds: 600,
        memoryMB: 38,
        rssMB: 196,
        heapTotalMB: 43,
        externalMB: 7,
        arrayBuffersMB: 0
      },
      sourceHealth: [
        { name: 'Yahoo Finance', status: 'ok', used: 12, limit: 2000, pct: 1 },
        { name: 'FRED', status: 'ok', used: 45, limit: 172800, pct: 0 }
      ],
      routes: [
        { path: '/api/analytics', methods: ['GET'] },
        { path: '/api/bonds', methods: ['GET'] },
        { path: '/api/fx', methods: ['GET'] }
      ],
      dummy: true
    },
    '/api/institutional': {
      isLive: true, isCurrent: true,
      institutions: [{ name: 'Vanguard Group', shares: 1000000, value: 150000000 }],
      insiders: [{ name: 'Tim Cook', relation: 'CEO', shares: 50000, value: 8500000 }],
      dummy: true
    },
    '/api/bonds': {
      isLive: true, isCurrent: true,
      yieldCurveData: {
        US: { '1m': 5.2, '3m': 5.3, '2y': 4.8, '10y': 4.5 },
        DE: { '1m': 3.2, '3m': 3.3, '2y': 3.0, '10y': 2.8 },
        JP: { '1m': 0.1, '3m': 0.1, '2y': 0.2, '10y': 0.8 }
      },
      spreadIndicators: { t10y2y: -0.3, t10y3m: -0.8 },
      spreadData: {
        dates: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
        IG: [120, 118, 122, 125, 121, 120],
        HY: [350, 345, 355, 360, 348, 350],
        EM: [180, 175, 185, 190, 182, 180],
        BBB: [220, 215, 225, 230, 221, 220]
      },
      spreadHistory: {
        dates: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
        t10y2y: [-0.2, -0.25, -0.3, -0.28, -0.32, -0.3],
        t10y3m: [-0.7, -0.75, -0.8, -0.78, -0.82, -0.8],
        t5y30y: [0.1, 0.12, 0.15, 0.13, 0.14, 0.15]
      },
      fedBalanceSheetHistory: { dates: ['2026-01', '2026-02', '2026-03'], values: [7500, 7400, 7300] },
      m2HistoryData: { dates: ['2026-01', '2026-02', '2026-03'], values: [21000, 20900, 20850] },
      cpiComponents: {
        dates: ['2026-01', '2026-02', '2026-03'],
        all: [3.1, 3.2, 3.0], core: [3.8, 3.7, 3.6], food: [2.5, 2.4, 2.3], energy: [-1.0, -0.5, -2.0],
        latest: { all: 3.0, core: 3.6, food: 2.3, energy: -2.0 }
      },
      debtToGdpHistory: { dates: ['2026-01', '2026-02', '2026-03'], values: [120.5, 121.2, 122.0], latest: 122.0 },
      breakevensData: { current: { be5y: 2.3, be10y: 2.2 }, history: { dates: ['2026-01', '2026-02', '2026-03'], be5y: [2.2, 2.25, 2.3], be10y: [2.1, 2.15, 2.2], forward5y5y: [2.0, 2.05, 2.1] } },
      durationLadder: { buckets: [{ bucket: '1-3 Yrs', amount: 500 }, { bucket: '3-5 Yrs', amount: 800 }], total: 1300, avgRate: 4.2 },
      macroData: {
        cftcNetLong: 12000,
        moneyVelocity: 1.3,
        centralBankRates: {
          'United States': 5.25,
          'Euro Area': 4.25,
          'United Kingdom': 5.00,
          'Japan': 0.10,
          'Canada': 4.75,
          'Australia': 4.35
        }
      },
      tipsYields: {
        '5y': 2.1, '10y': 2.2, '30y': 2.4
      },
      realYieldHistory: {
        dates: ['2026-01', '2026-02', '2026-03'],
        d5y: [2.0, 2.05, 2.1],
        d10y: [2.1, 2.15, 2.2]
      },
      creditRatings: {
        asOf: '2026-06-24',
        countries: [
          { country: 'US', name: 'United States', sp: 'AA+', moodys: 'Aaa', fitch: 'AA+', region: 'Americas' },
          { country: 'DE', name: 'Germany', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' },
          { country: 'JP', name: 'Japan', sp: 'A+', moodys: 'A1', fitch: 'A', region: 'Asia' },
          { country: 'CH', name: 'Switzerland', sp: 'AAA', moodys: 'Aaa', fitch: 'AAA', region: 'Europe' }
        ]
      },
      dummy: true
    },
    '/api/nyfed': {
      isLive: true, isCurrent: true,
      sofr: { series: [{ date: '2026-06-23', rate: 5.3 }] },
      dummy: true
    },
    '/api/fdic': {
      isLive: true, isCurrent: true,
      bankSummary: { failuresCount: 0, troubledBanks: 52 },
      dummy: true
    },
    '/api/ecb': {
      isLive: true, isCurrent: true,
      policyRates: { mainRefinancing: 4.25, marginalLending: 4.5, depositFacility: 3.75 },
      dummy: true
    },
    '/api/treasuryTIC': {
      isLive: true, isCurrent: true,
      latest: [
        { country: 'Japan', holdingsB: 1100 },
        { country: 'China', holdingsB: 770 },
        { country: 'United Kingdom', holdingsB: 650 },
        { country: 'Luxembourg', holdingsB: 350 },
        { country: 'Cayman Islands', holdingsB: 300 }
      ],
      history: {
        'Japan': [
          { period: '2025-06', holdingsB: 1080 },
          { period: '2025-07', holdingsB: 1090 },
          { period: '2025-08', holdingsB: 1100 }
        ],
        'China': [
          { period: '2025-06', holdingsB: 780 },
          { period: '2025-07', holdingsB: 775 },
          { period: '2025-08', holdingsB: 770 }
        ],
        'United Kingdom': [
          { period: '2025-06', holdingsB: 640 },
          { period: '2025-07', holdingsB: 645 },
          { period: '2025-08', holdingsB: 650 }
        ],
        'Luxembourg': [
          { period: '2025-06', holdingsB: 340 },
          { period: '2025-07', holdingsB: 345 },
          { period: '2025-08', holdingsB: 350 }
        ],
        'Cayman Islands': [
          { period: '2025-06', holdingsB: 290 },
          { period: '2025-07', holdingsB: 295 },
          { period: '2025-08', holdingsB: 300 }
        ]
      },
      dummy: true
    },
    '/api/treasuryAuctions': {
      isLive: true, isCurrent: true,
      auctions: [{ securityType: '10-Year Note', highRate: 4.35, bidToCover: 2.5, issueDate: '2026-06-15' }],
      dummy: true
    },
    '/api/treasuryDTS': {
      isLive: true, isCurrent: true,
      tgaBalance: 750000000000,
      dummy: true
    },
    '/api/treasuryCost': {
      isLive: true, isCurrent: true,
      latest: { avgInterestRate: 3.25 },
      dummy: true
    },
    '/api/fed/sep': {
      isLive: true, isCurrent: true,
      projections: [{ year: '2026', gdp: 2.1, unemployment: 4.0, pceInflation: 2.4, fedFunds: 4.6 }],
      dummy: true
    },
    '/api/fed/gdpnow': {
      isLive: true, isCurrent: true,
      latestEstimate: 2.3,
      dummy: true
    },
    '/api/fed/inflation-nowcast': {
      isLive: true, isCurrent: true,
      nowcast: { cpi: 3.1, pce: 2.5 },
      dummy: true
    },
    '/api/fed/news-sentiment': {
      isLive: true, isCurrent: true,
      indexValue: 0.15,
      dummy: true
    },
    '/api/msrb': {
      isLive: true, isCurrent: true,
      municipalVolume: 1200000000,
      dummy: true
    },
    '/api/fema': {
      isLive: true, isCurrent: true,
      declarations: [
        { firstDeclared: '2026-06-24', states: ['CA'], stateCount: 1, type: 'Fire', disasterNumber: 1, title: 'Disaster 1', incidentBegin: '2026-06-20', incidentEnd: '2026-06-24', programsCount: 2 },
        { firstDeclared: '2026-06-23', states: ['TX'], stateCount: 1, type: 'Flood', disasterNumber: 2, title: 'Disaster 2', incidentBegin: '2026-06-21', incidentEnd: '2026-06-23', programsCount: 1 }
      ],
      byType: [{ type: 'Fire', count: 15 }, { type: 'Flood', count: 5 }],
      summary: {
        totalRecent: 20,
        mostCommonType: 'Fire'
      },
      dummy: true
    },
    '/api/usgs': {
      isLive: true, isCurrent: true,
      events: [{ magnitude: 4.5, place: 'California', time: '2026-06-23T12:00:00Z' }],
      eventsCount: 1,
      biggest: {
        mag: 4.5,
        place: 'California'
      },
      dummy: true
    },
    '/api/edgar/insurer-ratios': {
      isLive: true, isCurrent: true,
      ratios: [{ companyName: 'Allstate', combinedRatio: 98.5 }],
      dummy: true
    },
    '/api/edgar/filing-activity': {
      isLive: true, isCurrent: true,
      filings: [{ ticker: 'AAPL', form: '10-Q', date: '2026-05-01' }],
      dummy: true
    },
    '/api/usda': {
      isLive: true, isCurrent: true,
      agriculturalPrices: [{ item: 'Corn', price: 4.5 }, { item: 'Wheat', price: 6.2 }],
      dummy: true
    },
    '/api/censusTrade': {
      isLive: true, isCurrent: true,
      exports: [{ product: 'Soybeans', value: 120000000 }],
      dummy: true
    },
    '/api/eiaPetroleum': {
      isLive: true, isCurrent: true,
      inventories: { crudeOil: 420 },
      dummy: true
    },
    '/api/cftcTFF': {
      isLive: true, isCurrent: true,
      contracts: {
        's-p-500': { name: 'S&P 500 E-mini', series: [{ nonCommLong: 250000, nonCommShort: 180000, openInterest: 2100000, date: '2026-06-17' }] },
        'nasdaq': { name: 'Nasdaq 100 E-mini', series: [{ nonCommLong: 95000, nonCommShort: 72000, openInterest: 680000, date: '2026-06-17' }] },
        '10y-tnote': { name: '10Y T-Note', series: [{ nonCommLong: 120000, nonCommShort: 310000, openInterest: 4200000, date: '2026-06-17' }] },
        'eurofx': { name: 'Euro FX', series: [{ nonCommLong: 85000, nonCommShort: 42000, openInterest: 520000, date: '2026-06-17' }] }
      },
      dummy: true
    },
    '/api/bisOTC': {
      isLive: true, isCurrent: true,
      categories: {
        'fx-derivatives': { label: 'FX Derivatives', series: [{ value: 75000000000000, period: '2025-H2' }] },
        'ir-derivatives': { label: 'Interest Rate Derivatives', series: [{ value: 135000000000000, period: '2025-H2' }] },
        'cds': { label: 'Credit Default Swaps', series: [{ value: 7500000000000, period: '2025-H2' }] },
        'equity-derivatives': { label: 'Equity Derivatives', series: [{ value: 12000000000000, period: '2025-H2' }] }
      },
      dummy: true
    },
    '/api/fao': {
      isLive: true, isCurrent: true,
      foodPriceIndex: 120.4,
      dummy: true
    },
    '/api/bea': {
      isLive: true, isCurrent: true,
      gdpComponents: [{ component: 'Personal Consumption', share: 68.2 }],
      personalIncome: [{ date: '2026-05', value: 1.2 }],
      savingRate: [{ date: '2026-05', value: 4.5 }],
      dummy: true
    },
    '/api/eurostat': {
      isLive: true, isCurrent: true,
      hicp: [{ country: 'Euro Area', rate: 2.4 }],
      unemployment: [{ country: 'Euro Area', rate: 6.5 }],
      govtDeficit: [{ country: 'Euro Area', rate: -3.6 }],
      dummy: true
    },
    '/api/oecd': {
      isLive: true, isCurrent: true,
      cli: { USA: [{ date: '2026-05', value: 100.2 }], DEU: [{ date: '2026-05', value: 99.8 }] },
      dummy: true
    },
    '/api/edgar': {
      isLive: true, isCurrent: true,
      tickers: { AAPL: { assets: 350000000000, liabilities: 270000000000 } },
      profitable: 1, count: 1, avgMargin: 22.8,
      dummy: true
    },
    '/api/universeUpdates': {
      isLive: true, isCurrent: true,
      updates: [{ ticker: 'NEWCO', action: 'discovered', reason: 'SEC Filing' }],
      dummy: true
    },
    '/api/fx': {
      isLive: true, isCurrent: true,
      fredFxRates: [{ date: '2026-05-01' }, { date: '2026-05-02' }],
      dxyHistory: { values: [100, 101] },
      currencyCorrelations: { values: [[1]] },
      spotRates: { EUR: 0.92, JPY: 155.2, GBP: 0.78, CHF: 0.89, AUD: 1.51, CAD: 1.36 },
      changes1d: { EUR: 0.12, JPY: -0.45, GBP: 0.08 },
      rateDifferentials: {
        fed: 5.25,
        ecb: 4.25,
        boe: 5.00,
        boj: 0.10,
        usFed_ecb: 1.00,
        usFed_boe: 0.25,
        usFed_boj: 5.15,
        EUR: 1.00,
        JPY: 5.15,
        GBP: 0.25
      },
      cotHistory: {
        EUR: [{ date: '2026-05-01', net: 15000 }],
        JPY: [{ date: '2026-05-01', net: -25000 }],
        GBP: [{ date: '2026-05-01', net: 8000 }]
      },
      history: { EUR: [0.92, 0.915, 0.922], JPY: [155.2, 154.8, 155.5], GBP: [0.78, 0.778, 0.782] },
      dummy: true
    },
    '/api/derivatives': {
      isLive: true, isCurrent: true,
      vixTermStructure: { dates: ['Spot', '1M', '2M', '3M'], values: [15.2, 16.4, 17.5, 18.2], prevValues: [14.8, 15.9, 17.0, 17.8] },
      skewHistory: { dates: ['2026-05-01', '2026-05-15', '2026-06-01'], values: [135, 137, 134] },
      volPremium: { atm1mIV: 16.2, realizedVol30d: 14.1, premium: 2.1 },
      vixPercentile: 52,
      fredVixHistory: { dates: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'], values: [18.0, 17.2, 16.5, 15.8, 15.2, 14.9] },
      volSurfaceData: { strikes: [80, 90, 100, 110, 120], expiries: ['1W', '1M', '3M', '6M'], grid: [[25,22,20,22,25],[24,21,19,21,24],[23,20,18,20,23],[22,19,17,19,22]] },
      optionsFlow: [
        { ticker: 'SPY', strike: 520, expiry: '16 May 25', type: 'P', volume: 45200, openInterest: 12400, premium: 8.20, sentiment: 'bearish' },
        { ticker: 'NVDA', strike: 950, expiry: '20 Jun 25', type: 'C', volume: 38900, openInterest: 8200, premium: 24.50, sentiment: 'bullish' },
        { ticker: 'TLT', strike: 90, expiry: '16 May 25', type: 'C', volume: 12400, openInterest: 6800, premium: 2.20, sentiment: 'neutral' }
      ],
      gammaExposure: { total: 12.3, callGamma: 8.1, putGamma: 4.2, netGamma: 3.9 },
      vixEnrichment: { vvix: 92.4, vixPercentile: 28 },
      putCallRatio: 0.85,
      termSpread: 2.1,
      skewIndex: { value: 135, interpretation: 'elevated' },
      dummy: true
    },
    '/api/realEstate': {
      isLive: true, isCurrent: true,
      reitData: [{ ticker: 'VNQ', price: 82.5, yield: 4.1 }, { ticker: 'PLD', price: 115.0, yield: 3.8 }],
      caseShillerData: { dates: ['2026-01', '2026-02', '2026-03'], values: [312.4, 313.5, 314.8] },
      mortgageRates: { rate30y: 6.85 },
      foreclosureData: {
        foreclosures: { dates: ['2026-01', '2026-02', '2026-03'], values: [0.12, 0.15, 0.14] },
        delinquencies: { dates: ['2026-01', '2026-02', '2026-03'], values: [1.8, 1.9, 1.85] }
      },
      mbaApplications: {
        purchase: { dates: ['2026-01', '2026-02', '2026-03'], values: [180, 185, 190] },
        refi: { dates: ['2026-01', '2026-02', '2026-03'], values: [250, 240, 260] }
      },
      creDelinquencies: [{ sector: 'Office', rate: 6.2 }],
      existingHomeSales: [{ date: '2026-05-01', value: 4.1 }],
      rentalVacancy: [{ date: '2026-05-01', value: 6.6 }],
      treasury10y: 4.5,
      reitEtf: {
        price: 82.5,
        changePct: 1.2,
        ytd: 3.5,
        dates: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
        values: [80.0, 81.2, 79.5, 82.0, 81.5, 82.5]
      },
      capRateData: [
        { sector: 'Residential', impliedYield: 4.8, capRate: 4.8 },
        { sector: 'Office', impliedYield: 6.2, capRate: 6.2 },
        { sector: 'Retail', impliedYield: 5.5, capRate: 5.5 },
        { sector: 'Industrial', impliedYield: 5.1, capRate: 5.1 }
      ],
      dummy: true
    },
    '/api/insurance': {
      isLive: true, isCurrent: true,
      combinedRatioData: [{ year: 2024, ratio: 97.5 }, { year: 2025, ratio: 98.2 }],
      combinedRatioHistory: {
        quarters: ['2025-Q1', '2025-Q2', '2025-Q3', '2025-Q4'],
        values: [96.5, 98.0, 101.2, 97.8]
      },
      hyOAS: 3.2,
      igOAS: 1.1,
      industryAvgCombinedRatio: 98.2,
      catLosses: [{ year: 2025, amount: 110 }],
      reinsurancePricing: {
        byCategory: [
          { category: 'US Wind', rate: 145 },
          { category: 'Europe Wind', rate: 120 },
          { category: 'US Quake', rate: 110 }
        ]
      },
      reserveAdequacyData: {
        lines: ['Auto Liab', 'Homeowners', 'Comm Multi', 'Workers Comp'],
        reserves: [12500, 8500, 14200, 19500],
        required: [12000, 8900, 13800, 18200],
        adequacy: [104.2, 95.5, 102.9, 107.1],
        insurerSurplus: { PGR: 1.2, ALL: 0.9, TRV: 1.5, HIG: 1.1 }
      },
      catBondSpreads: [
        { name: 'Sutter Re 2026', spread: 550, notional: 250, expectedLoss: 2.1, triggerType: 'Wind' },
        { name: 'Galveston Re 2025', spread: 720, notional: 150, expectedLoss: 3.5, triggerType: 'Quake' }
      ],
      reinsurers: [
        { ticker: 'RNR', price: 190.5, changePct: 1.2 },
        { ticker: 'ACGL', price: 82.3, changePct: -0.4 }
      ],
      sectorETF: {
        symbol: 'KIE',
        price: 45.20,
        changePct: 0.85,
        change: 0.85,
        high52w: 48.0,
        low52w: 39.5,
        sma50: 44.1
      },
      dummy: true
    },
    '/api/commoditiesEnhanced': {
      isLive: true, isCurrent: true,
      cotData: [{ date: '2026-05-01', netLong: 125000 }, { date: '2026-05-08', netLong: 130000 }],
      priceDashboardData: [{ commodity: 'Crude Oil', price: 80.5, change: 1.2 }],
      sectorHeatmapData: { commodities: [{ sector: 'Energy', performance: 2.1 }] },
      yahoo: { futures: { CL: { price: 80.5, change: 1.2 } } },
      commodityCurrencies: [{ currency: 'CAD', rate: 1.36 }],
      dummy: true
    },
    '/api/globalMacro': {
      isLive: true, isCurrent: true,
      scorecardData: [
        { country: 'United States', gdp: 2.5, cpi: 3.1 },
        { country: 'Euro Area', gdp: 0.8, cpi: 2.4 },
        { country: 'China', gdp: 5.2, cpi: 0.1 },
        { country: 'Japan', gdp: 1.0, cpi: 2.8 },
        { country: 'United Kingdom', gdp: 0.5, cpi: 2.2 },
        { country: 'Canada', gdp: 1.1, cpi: 2.7 },
        { country: 'Australia', gdp: 1.5, cpi: 3.6 },
        { country: 'Germany', gdp: -0.2, cpi: 2.5 }
      ],
      growthInflationData: [{ country: 'USA', growth: 2.5, inflation: 3.1 }],
      centralBankData: [{ bank: 'FRB', rate: 5.25 }],
      imfWEO: [{ country: 'USA', projection: 2.1 }],
      bisCreditToGDP: [{ country: 'USA', ratio: 250.4 }],
      cfnai: { values: [0.12, 0.15, -0.05] },
      oecdCli: { USA: 100.2 },
      dummy: true
    },
    '/api/equityDeepDive': {
      isLive: true, isCurrent: true,
      sectors: [{ sector: 'Technology', weight: 30.5 }, { sector: 'Financials', weight: 12.8 }, { sector: 'Healthcare', weight: 12.1 }, { sector: 'Consumer Cyclical', weight: 10.5 }, { sector: 'Industrials', weight: 8.4 }],
      sectorData: {
        sectors: [{ name: 'Technology', perf: 1.5 }, { name: 'Financials', perf: -0.5 }, { name: 'Healthcare', perf: 0.8 }, { name: 'Consumer Cyclical', perf: 1.2 }, { name: 'Industrials', perf: 0.3 }]
      },
      factorData: {
        inFavor: { Value: 1.2, Growth: -0.4, Momentum: 2.1 },
        stocks: [{ ticker: 'AAPL', score: 92 }]
      },
      equityRiskPremium: 4.8,
      spPE: 24.5,
      buffettIndicator: 155.2,
      dummy: true
    },
    '/api/crypto': {
      isLive: true, isCurrent: true,
      coins: [{ id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', priceUsd: 65000, percentChange24h: 2.3 }, { id: 'ethereum', symbol: 'eth', name: 'Ethereum', priceUsd: 3500, percentChange24h: 1.8 }, { id: 'solana', symbol: 'sol', name: 'Solana', priceUsd: 150, percentChange24h: 5.2 }, { id: 'cardano', symbol: 'ada', name: 'Cardano', priceUsd: 0.45, percentChange24h: -1.2 }, { id: 'ripple', symbol: 'xrp', name: 'Ripple', priceUsd: 0.50, percentChange24h: 0.5 }],
      coinMarketData: { coins: [{ id: 'bitcoin', dominance: 52.7 }] },
      ethGas: 15,
      fundingData: [{ asset: 'BTC', rate: 0.01 }],
      onChainData: { btcActiveAddresses: 950000 },
      dummy: true
    },
    '/api/credit': {
      isLive: true, isCurrent: true,
      spreadData: {
        current: { igSpread: 120, hySpread: 350, emSpread: 180, bbbSpread: 220, cccSpread: 650 },
        history: {
          dates: ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'],
          IG: [120, 118, 122, 125, 121, 120],
          HY: [350, 345, 355, 360, 348, 350],
          EM: [180, 175, 185, 190, 182, 180],
          BBB: [220, 215, 225, 230, 221, 220],
          CCC: [650, 640, 660, 670, 645, 650]
        }
      },
      commercialPaper: { rate: 5.35 },
      delinquencyRates: [{ type: 'Credit Card', rate: 2.85 }],
      emBondData: {
        countries: [
          { country: 'Mexico', spread: 180, yield: 6.2, debtGdp: 50 },
          { country: 'Brazil', spread: 210, yield: 6.5, debtGdp: 75 },
          { country: 'Colombia', spread: 230, yield: 6.7, debtGdp: 60 },
          { country: 'South Africa', spread: 290, yield: 7.5, debtGdp: 70 },
          { country: 'Turkey', spread: 350, yield: 8.2, debtGdp: 40 }
        ],
        regions: [
          { region: 'Latin America', spread: 200 },
          { region: 'EMEA', spread: 240 }
        ]
      },
      defaultData: {
        rates: [
          { sector: 'Corporate', rate: 1.5, avg: 1.2 },
          { sector: 'Sovereign', rate: 0.5, avg: 0.3 }
        ]
      },
      dummy: true
    },
    '/api/sentiment': {
      isLive: true, isCurrent: true,
      fearGreedData: { score: 62, value: 'Greed' },
      riskData: { stressIndex: -0.5 },
      returnsData: {
        assets: [
          { ticker: 'SPY', dailyReturns: [0.01, -0.005, 0.012, 0.003, -0.002, 0.005] },
          { ticker: 'BTC-USD', dailyReturns: [0.02, -0.015, 0.03, 0.005, -0.01, 0.015] },
          { ticker: 'GLD', dailyReturns: [-0.005, 0.002, 0.003, -0.001, 0.005, -0.002] }
        ]
      },
      cftcData: [{ asset: 'S&P 500', netLong: 45000 }],
      dummy: true
    },
    '/api/calendar': {
      isLive: true, isCurrent: true,
      economicEvents: [{ title: 'FOMC Statement', date: '2026-06-24', importance: 'High' }],
      centralBanks: [{ bank: 'Federal Reserve', rate: 5.25, nextMeeting: '2026-07-29' }],
      earningsSeason: [{ ticker: 'AAPL', date: '2026-07-30', epsEst: 1.45, marketCapB: 3200 }],
      dummy: true
    },
    '/api/imf': {
      isLive: true, isCurrent: true,
      countries: [{ country: 'USA', growth: 2.1 }, { country: 'CHN', growth: 4.8 }, { country: 'DEU', growth: 0.2 }, { country: 'JPN', growth: 0.9 }, { country: 'GBR', growth: 0.7 }],
      dummy: true
    },
    '/api/worldbank': {
      isLive: true, isCurrent: true,
      countries: [{ country: 'USA', gdp: 27000000000000 }, { country: 'CHN', gdp: 18000000000000 }, { country: 'DEU', gdp: 4400000000000 }, { country: 'JPN', gdp: 4200000000000 }, { country: 'GBR', gdp: 3300000000000 }],
      dummy: true
    },
    '/api/bls': {
      isLive: true, isCurrent: true,
      series: {
        unemployment: { label: 'Unemployment Rate', unit: '%', seriesId: 'LNS14000000', latest: { period: 'May', year: '2026', value: 4.0 }, previous: { period: 'April', year: '2026', value: 3.9 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [3.8, 3.9, 4.0] }, _source: true },
        laborParticipation: { label: 'Labor Force Participation', unit: '%', seriesId: 'LNS11300000', latest: { period: 'May', year: '2026', value: 62.5 }, previous: { period: 'April', year: '2026', value: 62.7 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [62.6, 62.7, 62.5] }, _source: true },
        employmentPop: { label: 'Employment-Population Ratio', unit: '%', seriesId: 'LNS12300000', latest: { period: 'May', year: '2026', value: 60.1 }, previous: { period: 'April', year: '2026', value: 60.2 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [60.0, 60.2, 60.1] }, _source: true },
        nonfarmPayrolls: { label: 'Nonfarm Payrolls (thousands)', unit: 'K', seriesId: 'CES0000000001', latest: { period: 'May', year: '2026', value: 158000 }, previous: { period: 'April', year: '2026', value: 157800 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [157500, 157800, 158000] }, _source: true },
        cpi: { label: 'CPI (All Urban)', unit: 'index', seriesId: 'CUUR0000SA0', latest: { period: 'May', year: '2026', value: 314.0 }, previous: { period: 'April', year: '2026', value: 313.2 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [312.2, 313.2, 314.0] }, _source: true },
        ppi: { label: 'PPI (Final Demand)', unit: 'index', seriesId: 'WPSFD4111', latest: { period: 'May', year: '2026', value: 254.0 }, previous: { period: 'April', year: '2026', value: 253.5 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [253.0, 253.5, 254.0] }, _source: true },
        jobOpenings: { label: 'Job Openings (thousands)', unit: 'K', seriesId: 'LNS17200000', latest: { period: 'May', year: '2026', value: 8500 }, previous: { period: 'April', year: '2026', value: 8700 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [8900, 8700, 8500] }, _source: true },
        unemployedPersons: { label: 'Unemployed Persons (thousands)', unit: 'K', seriesId: 'LNS13000000', latest: { period: 'May', year: '2026', value: 6500 }, previous: { period: 'April', year: '2026', value: 6400 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [6300, 6400, 6500] }, _source: true },
        joltsQuits: { label: 'Quits Rate', unit: '%', seriesId: 'JTS000000000000000QUR', latest: { period: 'May', year: '2026', value: 2.2 }, previous: { period: 'April', year: '2026', value: 2.3 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [2.4, 2.3, 2.2] }, _source: true },
        joltsHires: { label: 'Hires (thousands)', unit: 'K', seriesId: 'JTS000000000000000HIL', latest: { period: 'May', year: '2026', value: 5800 }, previous: { period: 'April', year: '2026', value: 5700 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [5600, 5700, 5800] }, _source: true },
        joltsLayoffs: { label: 'Layoffs & Discharges', unit: 'K', seriesId: 'JTS000000000000000LDL', latest: { period: 'May', year: '2026', value: 1600 }, previous: { period: 'April', year: '2026', value: 1500 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [1400, 1500, 1600] }, _source: true },
        outputPerHour: { label: 'Output per Hour (Nonfarm)', unit: '%', seriesId: 'PRS85006092', latest: { period: 'Q1', year: '2026', value: 1.5 }, previous: { period: 'Q4', year: '2025', value: 1.3 }, history: { dates: ['2025-Q3', '2025-Q4', '2026-Q1'], values: [1.2, 1.3, 1.5] }, _source: true },
        unitLaborCosts: { label: 'Unit Labor Costs (Nonfarm)', unit: '%', seriesId: 'PRS85006112', latest: { period: 'Q1', year: '2026', value: 2.2 }, previous: { period: 'Q4', year: '2025', value: 2.4 }, history: { dates: ['2025-Q3', '2025-Q4', '2026-Q1'], values: [2.5, 2.4, 2.2] }, _source: true },
        cpiFood: { label: 'CPI · Food', unit: 'index', seriesId: 'CUUR0000SAF1', latest: { period: 'May', year: '2026', value: 322.0 }, previous: { period: 'April', year: '2026', value: 321.5 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [320.5, 321.5, 322.0] }, _source: true },
        cpiEnergy: { label: 'CPI · Energy', unit: 'index', seriesId: 'CUUR0000SAE1', latest: { period: 'May', year: '2026', value: 298.0 }, previous: { period: 'April', year: '2026', value: 297.0 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [295.0, 297.0, 298.0] }, _source: true },
        cpiShelter: { label: 'CPI · Shelter', unit: 'index', seriesId: 'CUUR0000SAH1', latest: { period: 'May', year: '2026', value: 395.0 }, previous: { period: 'April', year: '2026', value: 393.5 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [392.0, 393.5, 395.0] }, _source: true },
        ppiIntermediate: { label: 'PPI · Intermediate Demand', unit: 'index', seriesId: 'WPUFD4121', latest: { period: 'May', year: '2026', value: 238.0 }, previous: { period: 'April', year: '2026', value: 237.2 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [236.2, 237.2, 238.0] }, _source: true },
        ppiServices: { label: 'PPI · Services', unit: 'index', seriesId: 'WPUFD4131', latest: { period: 'May', year: '2026', value: 195.0 }, previous: { period: 'April', year: '2026', value: 194.5 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [194.0, 194.5, 195.0] }, _source: true },
        eciWages: { label: 'ECI · Wages & Salaries', unit: '%', seriesId: 'CIS2020000000000I', latest: { period: 'Q1', year: '2026', value: 4.2 }, previous: { period: 'Q4', year: '2025', value: 4.1 }, history: { dates: ['2025-Q3', '2025-Q4', '2026-Q1'], values: [4.0, 4.1, 4.2] }, _source: true },
        eciBenefits: { label: 'ECI · Benefits', unit: '%', seriesId: 'CIS2030000000000I', latest: { period: 'Q1', year: '2026', value: 4.0 }, previous: { period: 'Q4', year: '2025', value: 3.9 }, history: { dates: ['2025-Q3', '2025-Q4', '2026-Q1'], values: [3.8, 3.9, 4.0] }, _source: true },
        eciTotal: { label: 'ECI · Total Compensation', unit: '%', seriesId: 'CIS2010000000000I', latest: { period: 'Q1', year: '2026', value: 4.1 }, previous: { period: 'Q4', year: '2025', value: 4.0 }, history: { dates: ['2025-Q3', '2025-Q4', '2026-Q1'], values: [3.9, 4.0, 4.1] }, _source: true },
        unempLess5Weeks: { label: 'Unemployed < 5 Weeks', unit: 'K', seriesId: 'LNS13008396', latest: { period: 'May', year: '2026', value: 2200 }, previous: { period: 'April', year: '2026', value: 2100 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [2000, 2100, 2200] }, _source: true },
        unemp5To14Weeks: { label: 'Unemployed 5-14 Weeks', unit: 'K', seriesId: 'LNS13008397', latest: { period: 'May', year: '2026', value: 1800 }, previous: { period: 'April', year: '2026', value: 1750 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [1700, 1750, 1800] }, _source: true },
        unemp15To26Weeks: { label: 'Unemployed 15-26 Weeks', unit: 'K', seriesId: 'LNS13008398', latest: { period: 'May', year: '2026', value: 850 }, previous: { period: 'April', year: '2026', value: 800 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [750, 800, 850] }, _source: true },
        unemp27PlusWeeks: { label: 'Unemployed 27+ Weeks', unit: 'K', seriesId: 'LNS13008585', latest: { period: 'May', year: '2026', value: 1250 }, previous: { period: 'April', year: '2026', value: 1200 }, history: { dates: ['2026-03', '2026-04', '2026-05'], values: [1150, 1200, 1250] }, _source: true }
      },
      dummy: true
    },
    '/api/eia': {
      isLive: true, isCurrent: true,
      electricity: {
        residential: {
          dates: ['2026-06', '2026-05', '2026-04'],
          sales: { values: [1500, 1400, 1300], unit: 'M kWh' },
          revenue: { values: [200, 190, 180], unit: 'M$' },
          price: { values: [16.2, 16.0, 15.8], unit: 'cents/kWh' },
          latest: { period: '2026-06', sales: 1500, revenue: 200, price: 16.2 },
          previous: { period: '2026-05', sales: 1400, revenue: 190, price: 16.0 }
        },
        commercial: {
          dates: ['2026-06', '2026-05', '2026-04'],
          sales: { values: [1200, 1100, 1000], unit: 'M kWh' },
          revenue: { values: [150, 140, 130], unit: 'M$' },
          price: { values: [12.5, 12.3, 12.1], unit: 'cents/kWh' },
          latest: { period: '2026-06', sales: 1200, revenue: 150, price: 12.5 },
          previous: { period: '2026-05', sales: 1100, revenue: 140, price: 12.3 }
        },
        industrial: {
          dates: ['2026-06', '2026-05', '2026-04'],
          sales: { values: [1000, 950, 900], unit: 'M kWh' },
          revenue: { values: [80, 75, 70], unit: 'M$' },
          price: { values: [8.2, 8.0, 7.9], unit: 'cents/kWh' },
          latest: { period: '2026-06', sales: 1000, revenue: 80, price: 8.2 },
          previous: { period: '2026-05', sales: 950, revenue: 75, price: 8.0 }
        }
      },
      co2Emissions: {
        total: [
          { name: 'Total', latest: 4800, unit: 'MMT CO₂', period: '2025', history: [{ period: '2025', value: 4800 }, { period: '2024', value: 4900 }] }
        ],
        bySector: [
          { name: 'Residential', latest: 120, unit: 'MMT CO₂', period: '2025', history: [{ period: '2025', value: 120 }, { period: '2024', value: 122 }] },
          { name: 'Commercial', latest: 80, unit: 'MMT CO₂', period: '2025', history: [{ period: '2025', value: 80 }, { period: '2024', value: 82 }] },
          { name: 'Industrial', latest: 950, unit: 'MMT CO₂', period: '2025', history: [{ period: '2025', value: 950 }, { period: '2024', value: 960 }] },
          { name: 'Transportation', latest: 1800, unit: 'MMT CO₂', period: '2025', history: [{ period: '2025', value: 1800 }, { period: '2024', value: 1820 }] },
          { name: 'Electric Power', latest: 1500, unit: 'MMT CO₂', period: '2025', history: [{ period: '2025', value: 1500 }, { period: '2024', value: 1510 }] }
        ]
      },
      petroleum: {
        wti: {
          dates: ['2026-06', '2026-05', '2026-04'],
          values: [75.5, 76.2, 74.8],
          unit: '$/bbl',
          label: 'WTI Crude Spot',
          latest: { period: '2026-06', value: 75.5 },
          previous: { period: '2026-05', value: 76.2 }
        },
        brent: {
          dates: ['2026-06', '2026-05', '2026-04'],
          values: [80.5, 81.2, 79.8],
          unit: '$/bbl',
          label: 'Brent Crude Spot',
          latest: { period: '2026-06', value: 80.5 },
          previous: { period: '2026-05', value: 81.2 }
        },
        gasoline: {
          dates: ['2026-06', '2026-05', '2026-04'],
          values: [3.25, 3.30, 3.20],
          unit: '$/gal',
          label: 'Gasoline Spot',
          latest: { period: '2026-06', value: 3.25 },
          previous: { period: '2026-05', value: 3.30 }
        },
        diesel: {
          dates: ['2026-06', '2026-05', '2026-04'],
          values: [3.75, 3.80, 3.70],
          unit: '$/gal',
          label: 'Diesel Spot',
          latest: { period: '2026-06', value: 3.75 },
          previous: { period: '2026-05', value: 3.80 }
        },
        heatingOil: {
          dates: ['2026-06', '2026-05', '2026-04'],
          values: [2.65, 2.70, 2.60],
          unit: '$/gal',
          label: 'Heating Oil Spot',
          latest: { period: '2026-06', value: 2.65 },
          previous: { period: '2026-05', value: 2.70 }
        }
      },
      naturalGas: {
        henryHub: {
          dates: ['2026-06', '2026-05', '2026-04'],
          values: [2.5, 2.4, 2.6],
          unit: '$/MMBTU',
          label: 'Henry Hub',
          latest: { period: '2026-06', value: 2.5 },
          previous: { period: '2026-05', value: 2.4 }
        }
      },
      dummy: true
    },
    '/api/census': {
      isLive: true, isCurrent: true,
      series: { '1': { _source: true } },
      dummy: true
    }
  };

  // Build a mapping from marketId (extracted from RTDB URL) to mock data.
  // The app's DataProvider reads from RTDB, not /api/* directly, so we must
  // return mock RTDB snapshots instead of 404.
  const marketIdToMockData = {
    analytics:     mockResponses['/api/analytics'] || mockResponses['/api/rate-limits'],
    equities:      mockResponses['/api/equities'],
    bonds:         mockResponses['/api/bonds'],
    fx:            mockResponses['/api/fx'],
    derivatives:   mockResponses['/api/derivatives'],
    realEstate:    mockResponses['/api/realEstate'],
    insurance:     mockResponses['/api/insurance'],
    commodities:   mockResponses['/api/commoditiesEnhanced'],
    globalMacro:   mockResponses['/api/globalMacro'],
    watchlist:     mockResponses['/api/watchlist'],
    equitiesDeepDive: mockResponses['/api/equityDeepDive'],
    institutional: mockResponses['/api/institutional'],
    crypto:        mockResponses['/api/crypto'],
    credit:        mockResponses['/api/credit'],
    sentiment:     mockResponses['/api/sentiment'],
    calendar:      mockResponses['/api/calendar'],
    imf:           mockResponses['/api/imf'],
    worldbank:     mockResponses['/api/worldbank'],
    bls:           mockResponses['/api/bls'],
    eia:           mockResponses['/api/eia'],
    census:        mockResponses['/api/census'],
    bea:           mockResponses['/api/bea'],
    eurostat:      mockResponses['/api/eurostat'],
    oecd:          mockResponses['/api/oecd'],
    oecdInsurance: mockResponses['/api/oecd'],
    edgar:         mockResponses['/api/edgar'],
    universeUpdates: mockResponses['/api/universeUpdates'],
    nyfed:         mockResponses['/api/nyfed'],
    fdic:          mockResponses['/api/fdic'],
    ecb:           mockResponses['/api/ecb'],
    treasuryTIC:   mockResponses['/api/treasuryTIC'],
    treasuryAuctions: mockResponses['/api/treasuryAuctions'],
    treasuryDTS:   mockResponses['/api/treasuryDTS'],
    treasuryCost:  mockResponses['/api/treasuryCost'],
    fedSEP:        mockResponses['/api/fed/sep'],
    fedGDPNow:     mockResponses['/api/fed/gdpnow'],
    fedInflationNowcast: mockResponses['/api/fed/inflation-nowcast'],
    fedNewsSentiment: mockResponses['/api/fed/news-sentiment'],
    msrb:          mockResponses['/api/msrb'],
    fema:          mockResponses['/api/fema'],
    usgs:          mockResponses['/api/usgs'],
    edgarInsurerRatios: mockResponses['/api/edgar/insurer-ratios'],
    edgarFilingActivity: mockResponses['/api/edgar/filing-activity'],
    usda:          mockResponses['/api/usda'],
    censusTrade:   mockResponses['/api/censusTrade'],
    eiaPetroleum:  mockResponses['/api/eiaPetroleum'],
    cftcTFF:       mockResponses['/api/cftcTFF'],
    bisOTC:        mockResponses['/api/bisOTC'],
    fao:           mockResponses['/api/fao'],
  };
  const fallbackMock = { isLive: true, isCurrent: true, key1: [1, 2], key2: [3, 4] };

  // Intercept RTDB snapshot calls — return mock data so DataProvider seeds markets
  await page.route(/firebaseio\.com\/marketSnapshots/, async (route) => {
    const url = route.request().url();
    // history.json?shallow=true — return a list of available dates
    if (url.includes('history.json?shallow=true')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ '2026-06-24': true }),
      });
      return;
    }
    const match = url.match(/marketSnapshots\/([^/]+)\//);
    const marketId = match ? match[1] : null;
    const mockData = marketId && marketIdToMockData[marketId] ? marketIdToMockData[marketId] : fallbackMock;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: mockData, fetchedAt: '2026-06-24T12:00:00Z' }),
    });
  });

  // Intercept all other /api/ calls to avoid hitting the throttled backend
  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    const matchedKey = Object.keys(mockResponses).find(k => url.includes(k));
    const body = matchedKey ? mockResponses[matchedKey] : { isLive: true, isCurrent: true, key1: [1, 2], key2: [3, 4] };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });
});

// One Playwright test per market tab so the report breaks out by tab and
// failures don't cascade across markets.
for (const market of MARKETS) {
  test(`panel coverage · ${market}`, async ({ page }, testInfo) => {
    test.setTimeout(60_000);
    const expected = PANEL_REGISTRY[market]?.panels || [];

    if (market === 'watchlist') {
      await page.addInitScript(() => {
        window.localStorage.setItem('hub-watchlist-tickers', JSON.stringify(['AAPL', 'MSFT']));
      });
    }

    await page.goto(`/kyahoofinance032926/?market=${market}`, { waitUntil: 'domcontentloaded' });
    // Wait for splash screen to dismiss so we only collect the active market's panels
    await page.waitForSelector('.splash-screen', { state: 'hidden', timeout: 35_000 }).catch(() => {});
    await page.waitForTimeout(2000);

    if (market === 'bonds') {
      const text = await page.textContent('body');
      console.log('DEBUG: bonds page body content length:', text?.length);
      console.log('DEBUG: bonds page body first 1000 chars:', text?.substring(0, 1000));
      await page.screenshot({ path: 'test-results/panel-coverage-bonds-debug.png', fullPage: true });
    }

    const panels = await collectPanels(page);

    const result = {
      market,
      total: panels.length,
      expected: expected.length,
      missing: [],            // registered, not found
      empty: [],              // registered, found but no content
      stalePending: [],       // registered, found with PENDING/NO DATA badge
      extras: [],             // unregistered panels in the DOM
      ok: [],                 // registered + rendered
    };

    const consumed = new Set();

    for (const entry of expected) {
      const matchedIdxs = panels
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => matchesEntry(entry, p.title));
      const need = entry.count ?? 1;

      if (matchedIdxs.length < need) {
        result.missing.push({ title: entry.title || String(entry.titlePattern), need, found: matchedIdxs.length });
        continue;
      }

      let satisfied = 0;
      for (const { p, i } of matchedIdxs) {
        if (consumed.has(i)) continue;
        if (p.badge === 'PENDING' || p.badge === 'NO DATA') {
          result.stalePending.push({ title: p.title, badge: p.badge });
          consumed.add(i);
          continue;
        }
        if (!panelHasContent(p, entry.minValues)) {
          result.empty.push({ title: p.title, valueCount: p.valueCount, meaningfulCount: p.meaningfulCount, hasChart: p.hasCanvas || p.hasChartSvg });
          consumed.add(i);
          continue;
        }
        result.ok.push({ title: p.title });
        consumed.add(i);
        satisfied++;
        if (satisfied >= need) break;
      }

      if (satisfied < need) {
        result.missing.push({ title: entry.title || String(entry.titlePattern), need, found: satisfied, note: 'matched panels existed but failed content checks' });
      }
    }

    // Anything unconsumed and titled is an unregistered extra.
    for (let i = 0; i < panels.length; i++) {
      if (consumed.has(i)) continue;
      const p = panels[i];
      if (!p.title || p.title === '(untitled)') continue;
      result.extras.push({ title: p.title, badge: p.badge, hasChart: p.hasCanvas || p.hasChartSvg, meaningfulCount: p.meaningfulCount });
    }

    // Persist per-tab artifact for inspection (overwrites cumulative file
    // each test; the all-tabs aggregate is built by an afterAll hook below).
    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    const perTabPath = REPORT_PATH.replace('.json', `-${market}.json`);
    fs.writeFileSync(perTabPath, JSON.stringify(result, null, 2));
    await testInfo.attach(`panel-coverage-${market}.json`, { path: perTabPath, contentType: 'application/json' });

    // Hard assertions.
    expect(result.missing, `missing panels on "${market}": ${JSON.stringify(result.missing)}`).toEqual([]);
    expect(result.empty, `empty panels on "${market}": ${JSON.stringify(result.empty)}`).toEqual([]);
    expect(result.stalePending, `PENDING/NO DATA panels on "${market}": ${JSON.stringify(result.stalePending)}`).toEqual([]);

    const isSoft = !STRICT || SOFT_EXTRA_MARKETS.has(market);
    if (result.extras.length) {
      const msg = `unregistered panels on "${market}" (add to tests/panel-registry.js): ${result.extras.map(e => e.title).join(', ')}`;
      if (isSoft) console.warn(`[coverage] ${msg}`);
      else expect(result.extras, msg).toEqual([]);
    }
  });
}

// Aggregate all per-tab JSONs into a single report at the end.
test.afterAll(async () => {
  try {
    const dir = path.dirname(REPORT_PATH);
    if (!fs.existsSync(dir)) return;
    const parts = fs.readdirSync(dir)
      .filter(f => f.startsWith('panel-coverage-') && f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
    if (!parts.length) return;
    fs.writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), settleMs: SETTLE_MS, strict: STRICT, tabs: parts }, null, 2));

    const lines = [];
    lines.push('# Panel coverage report');
    lines.push(`Generated ${new Date().toISOString()} · settle=${SETTLE_MS}ms · strict=${STRICT}`);
    lines.push('');
    lines.push('| Market | Registered | Rendered | Missing | Empty | Pending | Extras |');
    lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const r of parts) {
      lines.push(`| ${r.market} | ${r.expected} | ${r.ok.length} | ${r.missing.length} | ${r.empty.length} | ${r.stalePending.length} | ${r.extras.length} |`);
    }
    lines.push('');
    for (const r of parts) {
      const issues = r.missing.length + r.empty.length + r.stalePending.length + r.extras.length;
      lines.push(`## ${r.market} — ${issues === 0 ? '✓ all panels rendered' : `⚠ ${issues} issue(s)`}`);
      if (r.missing.length)      lines.push(`  Missing:  ${r.missing.map(x => x.title).join(', ')}`);
      if (r.empty.length)        lines.push(`  Empty:    ${r.empty.map(x => x.title).join(', ')}`);
      if (r.stalePending.length) lines.push(`  Pending:  ${r.stalePending.map(x => `${x.title}[${x.badge}]`).join(', ')}`);
      if (r.extras.length)       lines.push(`  Extras:   ${r.extras.map(x => x.title).join(', ')}`);
      lines.push('');
    }
    fs.writeFileSync(REPORT_PATH.replace('.json', '.md'), lines.join('\n'));
  } catch (e) {
    console.warn('[coverage] aggregate report failed:', e?.message);
  }
});
