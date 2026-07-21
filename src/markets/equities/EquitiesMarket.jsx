import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { api } from '../../lib/api';
import Header from '../../components/Header/Header';
import HeatmapView from '../../components/HeatmapView/HeatmapView';
import ListView from '../../components/ListView/ListView';
import Sidebar from '../../components/Sidebar/Sidebar';
import DetailPanel from '../../components/DetailPanel/DetailPanel';
import BarRaceView from '../../components/BarRaceView/BarRaceView';
import TimeTravel from '../../components/TimeTravel/TimeTravel';
import DataHubView from '../../components/DataHubView/DataHubView';
import BentoWrapper from '../../components/BentoWrapper';
import BentoCard from '../../components/BentoCard/BentoCard';
import DataFooter from '../../components/DataFooter/DataFooter';
import { stockUniverseData } from '../../data/stockUniverse';
import { currencySymbols } from '../../utils/constants';
import { useCurrency } from '../../hub/CurrencyContext';
import { useDataContext } from '../../hub/DataContext';
import { putSnapshot as putIDBSnapshot } from '../../utils/snapshotDB';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import KeyIndicesStrip from './components/KeyIndicesStrip';
import PortfolioTracker from './components/PortfolioTracker';
import RadarView from './components/RadarView';
import MetricValue from '../../components/MetricValue/MetricValue';
import BeaCorporateProfitsPanel from './components/BeaCorporateProfitsPanel';
import WorldBankMarketCapPanel from './components/WorldBankMarketCapPanel';

import './EquitiesDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const RANK_PALETTE = [
  '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7',
  '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#8b5cf6',
  '#14b8a6', '#f43f5e', '#0ea5e9', '#eab308', '#10b981',
  '#fb923c', '#818cf8', '#e879f9', '#4ade80', '#38bdf8',
];

const SECTOR_COLORS = {
  'Technology':  '#3b82f6',
  'Financials':  '#10b981',
  'Consumer':    '#f59e0b',
  'Healthcare':  '#ec4899',
  'Energy':      '#f97316',
  'Industrials': '#8b5cf6',
  'Crypto':      '#f7931a',
  'Other':       '#64748b',
};

function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? saved : defaultValue;
    } catch { return defaultValue; }
  });
  const persist = (v) => {
    setValue(v);
    try { localStorage.setItem(key, v); }
    catch (e) { console.warn(`[EquitiesMarket] persist failed for "${key}":`, e?.message); }
  };
  return [value, persist];
}

const STORAGE_KEY = 'equities-view';

const INDEX_TICKERS_US = ['^GSPC', '^IXIC', '^DJI', '^RUT'];
// Global developed markets — Europe + Japan + India + Australia + Canada.
const INDEX_TICKERS_DEV = ['^STOXX50E', '^GDAXI', '^FTSE', '^FCHI', '^N225', '^NSEI', '^AXJO', '^GSPTSE'];
// Emerging markets — broad EM + key country ETFs + single-country indices.
const INDEX_TICKERS_EM = ['EEM', 'VWO', 'FM', '^JKSE', '^BVSP', '^KS11', '^TWII'];
// China & HK strip: 3 native indices + 3 US-listed China ETFs that trade
// during NY hours, so we have something live while the mainland is closed.
const INDEX_TICKERS_CN = ['^HSI', '000300.SS', '000001.SS', 'ASHR', 'FXI', 'KWEB'];
// Risk & macro — VIX (vol), 10Y Treasury yield (rates), DX=F (DXY dollar
// futures), Gold (safe haven), Crude Oil (energy/global growth proxy).
const INDEX_TICKERS_RISK = ['^VIX', '^TNX', 'DX=F', 'GC=F', 'CL=F'];
// Commodities — precious metals + energy + agriculture benchmark.
const INDEX_TICKERS_COMM = ['SI=F', 'NG=F', 'DBC'];
// Sectors — broad SPDR sector rotation + semiconductors + defensive.
const INDEX_TICKERS_SECTORS = ['XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLI', 'XLB', 'XLRE', 'XLC', 'XLU', 'XLP', 'SMH'];
const INDEX_TICKERS = [
  ...INDEX_TICKERS_US,
  ...INDEX_TICKERS_DEV,
  ...INDEX_TICKERS_EM,
  ...INDEX_TICKERS_CN,
  ...INDEX_TICKERS_RISK,
  ...INDEX_TICKERS_COMM,
  ...INDEX_TICKERS_SECTORS,
];
const INDEX_LABELS = {
  '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^DJI': 'Dow Jones', '^RUT': 'Russell 2K',
  '^STOXX50E': 'Euro STOXX 50', '^GDAXI': 'DAX 40', '^FTSE': 'FTSE 100', '^FCHI': 'CAC 40',
  '^N225': 'Nikkei 225', '^NSEI': 'NIFTY 50', '^AXJO': 'ASX 200', '^GSPTSE': 'S&P/TSX',
  'EEM': 'MSCI EM', 'VWO': 'FTSE EM', 'FM': 'Frontier Mkts',
  '^JKSE': 'Jakarta', '^BVSP': 'Bovespa', '^KS11': 'KOSPI', '^TWII': 'TAIEX',
  '^HSI': 'Hang Seng', '000300.SS': 'CSI 300', '000001.SS': 'Shanghai',
  'ASHR': 'ASHR (CSI 300)', 'FXI': 'FXI (China LgCap)', 'KWEB': 'KWEB (China Internet)',
  '^VIX': 'VIX', '^TNX': '10Y Yield', 'DX=F': 'Dollar Index',
  'GC=F': 'Gold', 'CL=F': 'WTI Crude',
  'SI=F': 'Silver', 'NG=F': 'Nat Gas', 'DBC': 'Commodity Index',
  'XLK': 'XLK · Tech', 'XLF': 'XLF · Financials', 'XLE': 'XLE · Energy', 'XLV': 'XLV · Healthcare',
  'XLY': 'XLY · Consumer Disc', 'XLI': 'XLI · Industrials', 'XLB': 'XLB · Materials',
  'XLRE': 'XLRE · Real Estate', 'XLC': 'XLC · Comms', 'XLU': 'XLU · Utilities', 'XLP': 'XLP · Consumer Staples',
  'SMH': 'SMH · Semis',
};
// Currency hint per ticker — used to suffix the price formatter so a
// JPY or INR index doesn't get read as USD. VIX/^TNX have no currency
// (they're index points / yield %) so leave blank.
const INDEX_CURRENCY = {
  '^GSPC': '', '^IXIC': '', '^DJI': '', '^RUT': '',
  '^STOXX50E': 'EUR', '^GDAXI': 'EUR', '^FTSE': 'GBP', '^FCHI': 'EUR',
  '^N225': 'JPY', '^NSEI': 'INR', '^AXJO': 'AUD', '^GSPTSE': 'CAD',
  'EEM': 'USD', 'VWO': 'USD', 'FM': 'USD',
  '^JKSE': 'IDR', '^BVSP': 'BRL', '^KS11': 'KRW', '^TWII': 'TWD',
  '^HSI': 'HKD', '000300.SS': 'CNY', '000001.SS': 'CNY',
  'ASHR': 'USD', 'FXI': 'USD', 'KWEB': 'USD',
  '^VIX': '', '^TNX': '%', 'DX=F': '', 'GC=F': 'USD', 'CL=F': 'USD',
  'SI=F': 'USD', 'NG=F': 'USD', 'DBC': 'USD',
  'XLK': 'USD', 'XLF': 'USD', 'XLE': 'USD', 'XLV': 'USD',
  'XLY': 'USD', 'XLI': 'USD', 'XLB': 'USD', 'XLRE': 'USD',
  'XLC': 'USD', 'XLU': 'USD', 'XLP': 'USD', 'SMH': 'USD',
};

// rowHeight is 120px in BentoWrapper. The indices panel uses a compact
// grouped grid, so h:4 is enough for all 7 groups without the old wide
// empty band. The main panels start at y:4.
const HEATMAP_LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 4 },
    { i: 'heatmap', x: 0, y: 4, w: 8,  h: 6 },
    { i: 'sidebar', x: 8, y: 4, w: 4,  h: 6 },
    { i: 'sec-fundamentals', x: 0, y: 10, w: 6, h: 3 },
    { i: 'universe-updates', x: 0, y: 13, w: 12, h: 4 },
    { i: 'sec-filings', x: 6, y: 10, w: 6, h: 3 },
    { i: 'bea-corporate-profits', x: 0, y: 17, w: 6, h: 3 },
    { i: 'wb-market-cap', x: 6, y: 17, w: 6, h: 3 },
  ]
};

const RADAR_LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 4 },
    { i: 'radar',   x: 0, y: 4, w: 8,  h: 6 },
    { i: 'sidebar', x: 8, y: 4, w: 4,  h: 6 },
  ]
};

const RACE_LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 4 },
    { i: 'race',   x: 0,  y: 4, w: 8,  h: 6 },
    { i: 'sidebar', x: 8, y: 4, w: 4,  h: 6 },
  ]
};

const LIST_LAYOUT = {
  lg: [
    { i: 'kpi',            x: 0, y: 0, w: 12, h: 4 },
    { i: 'list-main',      x: 0, y: 4, w: 8,  h: 6 },
    { i: 'detail-sidebar', x: 8, y: 4, w: 4,  h: 6 },
  ]
};

// PORTFOLIO_LAYOUT was previously referenced but undefined — pre-existing
// ReferenceError in the Portfolio sub-tab. Now defined alongside the KPI.
const PORTFOLIO_LAYOUT = {
  lg: [
    { i: 'kpi',       x: 0, y: 0, w: 12, h: 4 },
    { i: 'portfolio', x: 0, y: 4, w: 12, h: 6 },
  ]
};

const REFRESH_PER_MARKET_LIMIT = 50;
const STATIC_DATA_TIMESTAMP = 'No fetch yet · click ▶ to refresh';
const QUOTES_KEY = 'equities-quotes-v2';
const LEGACY_SNAPSHOT_KEY = 'equities-snapshot-v1';
const MAX_SNAPSHOT_DAYS = 30;

function todayStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadDailyMap() {
  try {
    const raw = localStorage.getItem(QUOTES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
  } catch { return {}; }
}

function saveDailyMap(map) {
  try {
    const dates = Object.keys(map).sort();
    const keep = dates.slice(-MAX_SNAPSHOT_DAYS);
    const pruned = {};
    for (const d of keep) pruned[d] = map[d];
    localStorage.setItem(QUOTES_KEY, JSON.stringify(pruned));
  } catch (e) {
    console.warn('[Equities] snapshot save failed:', e?.message);
  }
}

function quotesFromUniverse(universe) {
  const out = {};
  for (const region of universe) {
    for (const stock of region.children) {
      if (!stock?.name) continue;
      const q = {};
      if (stock.price != null)     q.p = stock.price;
      if (stock.change != null)    q.c = stock.change;
      if (stock.changePct != null) q.cp = stock.changePct;
      if (stock.marketCap != null) q.mc = stock.marketCap;
      if (stock.pe != null)        q.pe = stock.pe;
      if (stock.divYield != null)  q.dy = stock.divYield;
      if (stock.weekHigh52 != null) q.wh = stock.weekHigh52;
      if (stock.weekLow52 != null) q.wl = stock.weekLow52;
      if (Object.keys(q).length) out[stock.name] = q;
    }
  }
  return out;
}

function compactQuotesFromSnapshot(quotes) {
  if (!quotes || typeof quotes !== 'object') return null;
  const out = {};
  for (const [ticker, q] of Object.entries(quotes)) {
    if (!q || typeof q !== 'object') continue;
    const compact = {};
    if (q.price != null) compact.p = q.price;
    if (q.change != null) compact.c = q.change;
    if (q.changePct != null) compact.cp = q.changePct;
    if (q.marketCapUsdB != null) compact.mc = q.marketCapUsdB;
    if (q.pe != null) compact.pe = q.pe;
    if (q.divYield != null) compact.dy = q.divYield;
    if (q.weekHigh52 != null) compact.wh = q.weekHigh52;
    if (q.weekLow52 != null) compact.wl = q.weekLow52;
    if (Object.keys(compact).length) out[ticker] = compact;
  }
  return Object.keys(out).length ? out : null;
}

function applyQuotesToUniverse(universe, quotes) {
  if (!quotes || !Object.keys(quotes).length) return universe;
  return universe.map(region => ({
    ...region,
    children: region.children.map(stock => {
      const q = quotes[stock.name];
      if (!q) return stock;
      return {
        ...stock,
        ...(q.mc != null && { marketCap: q.mc, value: q.mc }),
        ...(q.pe != null && { pe: q.pe }),
        ...(q.dy != null && { divYield: q.dy }),
        ...(q.p  != null && { price: q.p }),
        ...(q.c  != null && { change: q.c }),
        ...(q.cp != null && { changePct: q.cp }),
        ...(q.wh != null && { weekHigh52: q.wh }),
        ...(q.wl != null && { weekLow52: q.wl }),
      };
    }),
  }));
}

function getTopTickersByMarket(universe, perMarketLimit = REFRESH_PER_MARKET_LIMIT) {
  const seen = new Set();
  const tickers = [];
  for (const region of universe) {
    const ranked = [...(region.children || [])]
      .filter(stock => stock?.name && stock.sector !== 'Crypto')
      .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
      .slice(0, perMarketLimit);

    for (const stock of ranked) {
      if (seen.has(stock.name)) continue;
      seen.add(stock.name);
      tickers.push(stock.name);
    }
  }
  return tickers;
}

function migrateLegacySnapshot(map) {
  if (Object.keys(map).length) return map;
  try {
    const raw = localStorage.getItem(LEGACY_SNAPSHOT_KEY);
    if (!raw) return map;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.universe)) {
      const quotes = quotesFromUniverse(parsed.universe);
      if (Object.keys(quotes).length) {
        map[todayStr()] = { stamp: parsed.timestamp || `Migrated · ${todayStr()}`, quotes };
        saveDailyMap(map);
      }
    }
    localStorage.removeItem(LEGACY_SNAPSHOT_KEY);
  } catch {}
  return map;
}

function hydrateInitialState() {
  const map = migrateLegacySnapshot(loadDailyMap());
  const dates = Object.keys(map).sort();
  if (!dates.length) return { universe: stockUniverseData, stamp: STATIC_DATA_TIMESTAMP };
  const latest = dates[dates.length - 1];
  const entry = map[latest];
  return {
    universe: applyQuotesToUniverse(stockUniverseData, entry.quotes),
    stamp: entry.stamp || `Loaded · ${latest}`,
  };
}

function formatTimestamp(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// One-time cleanup of obsolete layout-storage keys. Older versions of
// the app saved layouts to `equities-*-layout`, `…-v2`, and `…-v3`.
// When BentoWrapper later writes a layout under v4, RGL synthesizes
// 1×1 entries for items it can't match — including ones missing from a
// stale saved layout. Wiping the older keys guarantees v4 starts clean
// for every user, regardless of browser cache state.
const STALE_LAYOUT_KEYS = [
  'equities-heatmap-layout',   'equities-heatmap-layout-v2',   'equities-heatmap-layout-v3',   'equities-heatmap-layout-v4',   'equities-heatmap-layout-v5',   'equities-heatmap-layout-v6',
  'equities-list-layout',      'equities-list-layout-v2',      'equities-list-layout-v3',      'equities-list-layout-v4',      'equities-list-layout-v5',      'equities-list-layout-v6',
  'equities-radar-layout',     'equities-radar-layout-v2',     'equities-radar-layout-v3',     'equities-radar-layout-v4',     'equities-radar-layout-v5',     'equities-radar-layout-v6',
  'equities-race-layout',      'equities-race-layout-v2',      'equities-race-layout-v3',      'equities-race-layout-v4',      'equities-race-layout-v5',      'equities-race-layout-v6',
  'equities-portfolio-layout', 'equities-portfolio-layout-v2', 'equities-portfolio-layout-v3', 'equities-portfolio-layout-v4', 'equities-portfolio-layout-v5', 'equities-portfolio-layout-v6',
  'equities-ml-layout',        'equities-ml-layout-v2',        'equities-ml-layout-v3',        'equities-ml-layout-v4',        'equities-ml-layout-v5',        'equities-ml-layout-v6',
];
let __equitiesLayoutCleanupRan = false;
function purgeStaleLayoutKeys() {
  if (__equitiesLayoutCleanupRan || typeof window === 'undefined') return;
  __equitiesLayoutCleanupRan = true;
  for (const k of STALE_LAYOUT_KEYS) {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  }
}

export default function EquitiesMarket({ currency, setCurrency, centralData }) {
  // Wipe legacy layout keys before any RGL render so a stale v3 entry can't
  // sneak into the v4 layout merge as a degenerate 1×1.
  purgeStaleLayoutKeys();
  const [viewMode, setViewMode] = usePersistedState(`${STORAGE_KEY}-viewMode`, 'heatmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'descending' });
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [rankMetric, setRankMetric] = usePersistedState(`${STORAGE_KEY}-rankMetric`, 'marketCap');
  const [groupBy, setGroupBy] = usePersistedState(`${STORAGE_KEY}-groupBy`, 'market');
  const [colorByPerf, setColorByPerf] = useState(false);
  const [hydrated] = useState(hydrateInitialState);
  const [marketUniverse, setMarketUniverse] = useState(hydrated.universe);
  const [dataTimestamp, setDataTimestamp] = useState(hydrated.stamp);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [indexQuotes, setIndexQuotes] = useState(null);
  const [snapshotQuotes, setSnapshotQuotes] = useState(null);
  const [snapshotDate, setSnapshotDate] = useState(null);
  const [timeTravelActive, setTimeTravelActive] = useState(false);
  const [historyNotice, setHistoryNotice] = useState(null);
  const dataCtx = (() => { try { return useDataContext(); } catch { return null; } })();
  const globalHistoricalDate = dataCtx?.historicalDate || null;
  const edgarCtx = dataCtx?.getMarket?.('edgar');
  const filingActivityCtx = dataCtx?.getMarket?.('edgarFilingActivity');
  const universeCtx = dataCtx?.getMarket?.('universeUpdates');
  const centralSnapshot = centralData?.data || null;
  const centralQuotes = useMemo(() => compactQuotesFromSnapshot(centralSnapshot?.quotes), [centralSnapshot]);

  const handleSnapshotSelect = useCallback((quotes, date, stamp) => {
    if (!quotes) {
      setSnapshotQuotes(null);
      setSnapshotDate(null);
      setTimeTravelActive(false);
      setHistoryNotice(null);
      return;
    }
    setSnapshotQuotes(quotes);
    setSnapshotDate(date);
    setDataTimestamp(stamp || date);
    setTimeTravelActive(true);
    setHistoryNotice(null);
  }, []);

  useEffect(() => {
    if (!globalHistoricalDate) {
      setSnapshotQuotes(null);
      setSnapshotDate(null);
      setTimeTravelActive(false);
      setHistoryNotice(null);
      if (centralQuotes) {
        setDataTimestamp(centralData?.fetchedOn || centralSnapshot?.fetchedAt || centralSnapshot?.lastUpdated || 'RTDB latest equities snapshot');
      }
      return;
    }

    if (centralQuotes && centralData?.isHistorical) {
      setSnapshotQuotes(centralQuotes);
      setSnapshotDate(globalHistoricalDate);
      setDataTimestamp(centralData.fetchedOn || centralSnapshot?.fetchedAt || `RTDB snapshot · ${globalHistoricalDate}`);
      setTimeTravelActive(true);
      setHistoryNotice(null);
    } else if (centralData?.error) {
      setSnapshotQuotes(null);
      setSnapshotDate(null);
      setTimeTravelActive(false);
      setHistoryNotice(`No RTDB Equities snapshot for ${globalHistoricalDate}. Equities history starts after the backend Equities snapshot job has run.`);
    }
  }, [globalHistoricalDate, centralQuotes, centralData?.isHistorical, centralData?.error, centralData?.fetchedOn, centralSnapshot]);

  const fetchIndexQuotes = useCallback(() => {
    api.post('/api/stocks', { tickers: INDEX_TICKERS })
      .then(data => setIndexQuotes(data))
      .catch(() => {});
  }, []);

  React.useEffect(() => { fetchIndexQuotes(); }, [fetchIndexQuotes]);

  React.useEffect(() => {
    if (centralSnapshot?.indices && Object.keys(centralSnapshot.indices).length) {
      // Merge: prefer live-fetched quotes (which may have tickers missing
      // from the RTDB snapshot, e.g. Asian indices that fail during the
      // midnight UTC scheduled refresh). Only fill in from RTDB what we
      // don't already have from the live call.
      setIndexQuotes(prev => {
        const merged = { ...(centralSnapshot.indices) };
        if (prev) {
          for (const [tk, q] of Object.entries(prev)) {
            if (q?.price != null && (!merged[tk] || merged[tk]?.price == null)) {
              merged[tk] = q;
            }
          }
        }
        return merged;
      });
    }
  }, [centralSnapshot]);

  React.useEffect(() => {
    // Auto-discovery sidecar: fetch recently listed IPOs from the nightly RTDB job
    fetch('https://kfinance032926-default-rtdb.firebaseio.com/marketSnapshots/universeUpdates/latest.json')
      .then(res => res.json())
      .then(payload => {
        if (!payload || !payload.data || !payload.data.updates || !payload.data.updates.length) return;
        
        setMarketUniverse(prevUniverse => {
          const newUniverse = [...prevUniverse];
          // Default to injecting into the main US region (where most tracked IPOs happen)
          const usRegionIndex = newUniverse.findIndex(r => r.name.includes('USA'));
          if (usRegionIndex === -1) return prevUniverse;

          const usRegion = { ...newUniverse[usRegionIndex], children: [...newUniverse[usRegionIndex].children] };
          
          const existingTickers = new Set();
          newUniverse.forEach(r => r.children.forEach(c => existingTickers.add(c.name)));

          let added = 0;
          payload.data.updates.forEach(newStock => {
            if (!existingTickers.has(newStock.name)) {
              if (!newStock.itemStyle) {
                // Highlight newly discovered stocks with a distinct neon cyan border
                newStock.itemStyle = { color: 'transparent', borderWidth: 2, borderColor: '#06b6d4', borderType: 'dashed' };
              }
              usRegion.children.push(newStock);
              existingTickers.add(newStock.name);
              added++;
            }
          });

          if (added > 0) {
            newUniverse[usRegionIndex] = usRegion;
            return newUniverse;
          }
          return prevUniverse;
        });
      })
      .catch(err => console.warn('[EquitiesMarket] Failed to load universe updates sidecar:', err));
  }, []);

  const { rates: fxRates, currentRate, currentSymbol, ratesLive } = useCurrency();

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchIndexQuotes();
    const topTickers = getTopTickersByMarket(stockUniverseData);
    api.post('/api/stocks', { tickers: topTickers })
      .then(quotes => {
        const now = formatTimestamp(new Date());
        const stamp = `Fetched · Yahoo Finance · ${now}`;
        setMarketUniverse(prev => {
          const next = prev.map(region => ({
            ...region,
            children: region.children.map(stock => {
              const q = quotes[stock.name];
              if (!q) return stock;
              const fxRate = q.currency === 'USD' ? 1 : fxRates?.[q.currency];
              const liveCap = q.marketCap && fxRate ? q.marketCap / fxRate / 1e9 : stock.marketCap;
              return {
                ...stock,
                marketCap: liveCap || stock.marketCap,
                value: liveCap || stock.value,
                ...(q.changePct != null && { changePct: q.changePct }),
                ...(q.price != null && { price: q.price }),
                ...(q.change != null && { change: q.change }),
                ...(q.weekHigh52 != null && { weekHigh52: q.weekHigh52 }),
                ...(q.weekLow52 != null && { weekLow52: q.weekLow52 }),
                ...(q.pe != null && { pe: q.pe }),
                ...(q.divYield != null && { divYield: q.divYield }),
              };
            }),
          }));
          const map = loadDailyMap();
          const today = todayStr();
          const existing = map[today]?.quotes || {};
          const mergedQuotes = { ...existing, ...quotesFromUniverse(next) };
          map[today] = { stamp, quotes: mergedQuotes };
          saveDailyMap(map);
          putIDBSnapshot({
            marketId: 'equities',
            date: today,
            stamp,
            data: { quotes: mergedQuotes },
            lastUpdated: stamp,
            isLive: true,
            isCurrent: true,
          });
          return next;
        });
        setDataTimestamp(stamp);
      })
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [fetchIndexQuotes, fxRates, isRefreshing]);

  const getMetricValue = (stock, metric) => {
    if (metric === 'revenue')    return Math.max(stock.revenue   || 0.1, 0.1);
    if (metric === 'netIncome')  return Math.max(stock.netIncome || 0.1, 0.1);
    if (metric === 'pe')         return Math.max(stock.pe || 0.1, 0.1);
    if (metric === 'divYield')   return Math.max(stock.divYield || 0.1, 0.1);
    return stock.marketCap || stock.value || 1;
  };

  const getRankValue = (stock, metric) => {
    if (metric === 'revenue')   return stock.revenue   || 0;
    if (metric === 'netIncome') return stock.netIncome || 0;
    if (metric === 'pe')        return -(stock.pe      || 999);
    if (metric === 'divYield')  return stock.divYield  || 0;
    return stock.marketCap || stock.value || 0;
  };

  const rankColorFn = (rank) => RANK_PALETTE[(rank - 1) % RANK_PALETTE.length];

  const displayUniverse = useMemo(() => {
    const quoteLayer = snapshotQuotes || centralQuotes;
    return quoteLayer ? applyQuotesToUniverse(marketUniverse, quoteLayer) : marketUniverse;
  }, [marketUniverse, snapshotQuotes, centralQuotes]);

  const adjustedTreemapData = useMemo(() => {
    return displayUniverse.map(region => {
      const withAdjusted = region.children.map(stock => {
        const metricValue = (rankMetric === 'revenue' || rankMetric === 'netIncome' || rankMetric === 'pe' || rankMetric === 'divYield')
          ? getMetricValue(stock, rankMetric)
          : stock.marketCap || stock.value || 1;
        return {
          ...stock,
          adjustedValue: stock.marketCap || stock.value,
          metricValue,
          regionName: region.name,
          regionSymbol: region.symbol,
          regionCurrency: region.currency,
        };
      });
      const sorted = [...withAdjusted].sort((a, b) => {
        if (rankMetric === 'marketCap') return (b.adjustedValue || 0) - (a.adjustedValue || 0);
        return getRankValue(b, rankMetric) - getRankValue(a, rankMetric);
      });
      return {
        ...region,
        children: sorted.map((stock, idx) => {
          const rank = idx + 1;
          const cellColor = rankColorFn(rank);
          return { ...stock, rank, itemStyle: { ...stock.itemStyle, color: cellColor } };
        }),
      };
    });
  }, [displayUniverse, rankMetric]);

  const heatmapData = useMemo(() => {
    if (groupBy === 'sectorInMarket') {
      return adjustedTreemapData.map(region => {
        const bySector = {};
        region.children.forEach(stock => {
          const sec = stock.sector || 'Other';
          if (!bySector[sec]) bySector[sec] = [];
          bySector[sec].push(stock);
        });
        return {
          ...region,
          children: Object.entries(bySector)
            .sort(([a], [b]) => {
              const sumA = bySector[a].reduce((s, st) => s + (st.metricValue || st.value || 0), 0);
              const sumB = bySector[b].reduce((s, st) => s + (st.metricValue || st.value || 0), 0);
              return sumB - sumA;
            })
            .map(([sector, stocks]) => ({
              name: sector,
              isSectorGroup: true,
              value: stocks.reduce((s, st) => s + (st.metricValue || st.value || 0), 0),
              itemStyle: { color: 'transparent', borderColor: SECTOR_COLORS[sector] || '#64748b', borderWidth: 2 },
              children: stocks,
            })),
        };
      });
    }
    if (groupBy === 'sectorGlobal') {
      const bySector = {};
      adjustedTreemapData.forEach(region => {
        region.children.forEach(stock => {
          const sec = stock.sector || 'Other';
          if (!bySector[sec]) bySector[sec] = [];
          bySector[sec].push({ ...stock, regionName: region.name });
        });
      });
      return Object.entries(bySector)
        .sort(([, a], [, b]) => {
          const sumA = a.reduce((s, st) => s + (st.metricValue || st.value || 0), 0);
          const sumB = b.reduce((s, st) => s + (st.metricValue || st.value || 0), 0);
          return sumB - sumA;
        })
        .map(([sector, stocks]) => ({
          name: sector,
          isSectorGroup: true,
          value: stocks.reduce((s, st) => s + (st.metricValue || st.value || 0), 0),
          itemStyle: { color: SECTOR_COLORS[sector] || '#64748b', borderWidth: 3, borderColor: '#1e1e1e' },
          children: stocks.sort((a, b) => (b.metricValue || b.value || 0) - (a.metricValue || a.value || 0)),
        }));
    }
    return adjustedTreemapData;
  }, [adjustedTreemapData, groupBy]);

  const flatData = useMemo(() => {
    const arr = [];
    adjustedTreemapData.forEach(region => {
      region.children.forEach(stock => {
        const s = stock;
        arr.push({
          region: region.name,
          regionCurrency: region.currency,
          regionSymbol: region.symbol,
          regionColor: region.itemStyle.borderColor,
          ticker: s.name || stock.name,
          fullName: s.fullName || stock.fullName || stock.name,
          value: s.value,
          adjustedValue: s.adjustedValue,
          metricValue: s.metricValue,
          marketCap: s.marketCap,
          revenue: s.revenue,
          netIncome: s.netIncome,
          pe: s.pe,
          divYield: s.divYield,
          rank: s.rank,
          sector: s.sector,
          color: s.itemStyle?.color,
        });
      });
    });
    return arr;
  }, [adjustedTreemapData]);

  const processedData = useMemo(() => {
    let filtered = flatData.filter(item =>
      (item.ticker || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.region || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
    if (sortConfig.key) {
      const sortKey = sortConfig.key === 'value' ? 'adjustedValue' : sortConfig.key;
      filtered.sort((a, b) => {
        if (a[sortKey] < b[sortKey]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [flatData, searchQuery, sortConfig]);

  const handleSort = (key) => {
    let direction = sortConfig.key === key && sortConfig.direction === 'ascending' ? 'descending' : 'ascending';
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key) => sortConfig.key === key ? (sortConfig.direction === 'ascending' ? ' ▲' : ' ▼') : '';

  const selectionRef = useRef(0);
  const handleSelectTicker = async (tickerInfo) => {
    const selectionId = ++selectionRef.current;
    setSelectedTicker({ ...tickerInfo, details: null, isLive: false, summaryData: null, historyData: null, isLoading: true });

    const isCrypto = tickerInfo.sector === 'Crypto';
    const sym = isCrypto ? '$' : (tickerInfo.regionSymbol || '$');
    const enc = encodeURIComponent(tickerInfo.ticker);

    const [quoteRes, summaryRes, historyRes] = await Promise.allSettled([
      api.post('/api/stocks', { tickers: [tickerInfo.ticker] }),
      api.get(`/api/summary/${enc}?region=${encodeURIComponent(tickerInfo.region || '')}`),
      api.get(`/api/history/${enc}?period=5y&region=${encodeURIComponent(tickerInfo.region || '')}`),
    ]);

    let mergedDetails = {};
    let isLive = false;

    if (quoteRes.status === 'fulfilled') {
      const liveData = quoteRes.value;
      const live = liveData[tickerInfo.ticker];
      if (live) {
        isLive = true;
        mergedDetails = {
          price:     live.price     != null ? `${sym}${live.price.toLocaleString()}` : '—',
          changeAmt: live.change    != null ? `${live.change >= 0 ? '+' : ''}${sym}${live.change.toFixed(2)}` : '—',
          changePct: live.changePct != null ? `${live.changePct >= 0 ? '+' : ''}${live.changePct.toFixed(2)}%` : '—',
          open:      live.open      != null ? `${sym}${live.open.toLocaleString()}` : '—',
          prevClose: live.prevClose != null ? `${sym}${live.prevClose.toLocaleString()}` : '—',
          dayRange:  (live.dayLow && live.dayHigh) ? `${sym}${live.dayLow.toFixed(2)} – ${sym}${live.dayHigh.toFixed(2)}` : '—',
          wk52Range: (live.weekLow52 && live.weekHigh52) ? `${sym}${live.weekLow52.toFixed(2)} – ${sym}${live.weekHigh52.toFixed(2)}` : '—',
          volume:    live.volume    != null ? live.volume.toLocaleString() : '—',
          avgVol:    live.avgVolume != null ? live.avgVolume.toLocaleString() : '—',
          marketCapGlobal: live.marketCap && live.currency && fxRates?.[live.currency] ? `$${(live.marketCap / fxRates[live.currency] / 1e9).toFixed(0)} B (Glob.)` : '—',
          marketCapNative: live.marketCap ? `${sym}${(live.marketCap / 1e12).toFixed(2)} T` : '—',
          ...(!isCrypto && {
            bid:  live.bid  != null ? `${sym}${live.bid.toFixed(2)} × ${live.bidSize || ''}` : null,
            ask:  live.ask  != null ? `${sym}${live.ask.toFixed(2)} × ${live.askSize || ''}` : null,
            pe:   live.pe   != null ? live.pe.toFixed(2) : null,
            eps:  live.eps  != null ? `${sym}${live.eps.toFixed(2)}` : null,
            beta: live.beta != null ? live.beta.toFixed(2) : null,
          }),
        };
      }
    }

    if (!isLive) {
      mergedDetails = {};
    }

    const summaryData = (summaryRes.status === 'fulfilled') ? summaryRes.value : null;
    const historyData = (historyRes.status === 'fulfilled') ? historyRes.value : null;

    if (selectionRef.current !== selectionId) return;
    setSelectedTicker(prev => ({ ...prev, details: mergedDetails, isLive, summaryData, historyData, isLoading: false }));
  };

  const marketStats = useMemo(() => {
    let advancers = 0, decliners = 0, unchanged = 0, newHighs = 0, newLows = 0;
    for (const region of marketUniverse) {
      for (const stock of region.children) {
        if (stock.changePct != null) {
          if (stock.changePct > 0) advancers++;
          else if (stock.changePct < 0) decliners++;
          else unchanged++;
        }
        if (stock.price != null && stock.weekHigh52 != null && Math.abs(stock.price - stock.weekHigh52) / stock.weekHigh52 < 0.02) newHighs++;
        if (stock.price != null && stock.weekLow52 != null && Math.abs(stock.price - stock.weekLow52) / stock.weekLow52 < 0.02) newLows++;
      }
    }
    return { advancers, decliners, unchanged, newHighs, newLows };
  }, [marketUniverse]);

  const globalValCap = flatData.reduce((acc, curr) => acc + (curr.adjustedValue || curr.value), 0);
  const edgarRows = useMemo(() => {
    const toNum = (value) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };
    const latest = (arr) => arr?.at?.(-1);
    const prev = (arr) => arr?.at?.(-2);
    const yoyGrowth = (curr, prev) => {
      if (curr == null || prev == null || prev === 0) return null;
      return ((curr - prev) / Math.abs(prev)) * 100;
    };

    return Object.entries(edgarCtx?.data?.tickers || {}).map(([ticker, row]) => {
      const revLatest = latest(row.revenues);
      const revPrev = prev(row.revenues);
      const niLatest = latest(row.netIncome);
      const niPrev = prev(row.netIncome);
      const oiLatest = latest(row.operatingIncome);
      const cfLatest = latest(row.cashFlow);
      const capexLatest = latest(row.capex);
      const rdLatest = latest(row.rdExpense);
      const intExpLatest = latest(row.interestExpense);
      const caLatest = latest(row.currentAssets);
      const clLatest = latest(row.currentLiabilities);

      const revenue = toNum(revLatest?.value);
      const prevRevenue = toNum(revPrev?.value);
      const netIncome = toNum(niLatest?.value);
      const prevNetIncome = toNum(niPrev?.value);
      const operatingIncome = toNum(oiLatest?.value);
      const cashFlow = toNum(cfLatest?.value);
      const capex = toNum(capexLatest?.value);
      const rdExpense = toNum(rdLatest?.value);
      const interestExpense = toNum(intExpLatest?.value);
      const currentAssets = toNum(caLatest?.value);
      const currentLiabilities = toNum(clLatest?.value);
      const assets = toNum(latest(row.assets)?.value);
      const equity = toNum(latest(row.equity)?.value);
      const liabilities = toNum(latest(row.liabilities)?.value);

      // Core ratios
      const margin = revenue ? ((netIncome ?? 0) / revenue) * 100 : null;
      const operatingMargin = revenue && operatingIncome ? (operatingIncome / revenue) * 100 : null;
      const roa = assets && netIncome ? (netIncome / assets) * 100 : null;
      const roe = equity && netIncome ? (netIncome / equity) * 100 : null;
      const debtToEquity = liabilities && equity ? liabilities / equity : null;
      const currentRatio = currentAssets && currentLiabilities ? currentAssets / currentLiabilities : null;

      // Growth rates
      const revGrowth = yoyGrowth(revenue, prevRevenue);
      const niGrowth = yoyGrowth(netIncome, prevNetIncome);

      // Efficiency
      const fcf = cashFlow != null && capex != null ? cashFlow - Math.abs(capex) : null;
      const fcfMargin = revenue && fcf != null ? (fcf / revenue) * 100 : null;
      const rdIntensity = revenue && rdExpense != null ? (rdExpense / revenue) * 100 : null;
      const assetTurnover = assets && revenue ? revenue / assets : null;

      // Market data from stock universe
      const stock = (Array.isArray(flatData) ? flatData : []).find(s => s.ticker === ticker || s.name === ticker);
      const pe = stock?.pe || null;
      const marketCap = stock?.marketCap || null;

      // Valuation
      const pbRatio = equity && marketCap ? (marketCap * 1e9) / equity : null;
      const evEbitda = operatingIncome && marketCap ? (marketCap * 1e9) / operatingIncome : null;

      // Period
      const period = niLatest?.fy || revLatest?.fy || niLatest?.end || revLatest?.end || null;

      // Quality score (composite)
      let qualityScore = 0;
      if (margin != null && margin >= 20) qualityScore++;
      if (roe != null && roe >= 15) qualityScore++;
      if (revGrowth != null && revGrowth > 5) qualityScore++;
      if (fcf != null && fcf > 0) qualityScore++;
      if (debtToEquity != null && debtToEquity < 2) qualityScore++;
      const quality = qualityScore >= 4 ? 'A' : qualityScore >= 3 ? 'B' : qualityScore >= 2 ? 'C' : qualityScore >= 1 ? 'D' : 'F';

      return {
        ticker,
        cik: row.cik,
        period,
        // Income statement
        revenue, prevRevenue, revGrowth,
        netIncome, prevNetIncome, niGrowth,
        operatingIncome, operatingMargin,
        // Balance sheet
        assets, liabilities, equity,
        debtToEquity, currentRatio,
        // Cash flow
        cashFlow, capex, fcf, fcfMargin,
        // Efficiency
        rdExpense, rdIntensity, interestExpense, assetTurnover,
        // Margins
        margin, roa, roe,
        // Market
        pe, marketCap, pbRatio, evEbitda,
        // Quality
        quality, qualityScore,
      };
    }).sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  }, [edgarCtx, flatData]);
  const edgarSummary = useMemo(() => {
    const margins = edgarRows.map(row => row.margin).filter(Number.isFinite);
    const avgMargin = margins.length ? margins.reduce((sum, v) => sum + v, 0) / margins.length : null;
    const profitable = edgarRows.filter(row => (row.netIncome ?? 0) > 0).length;
    const avgRoa = edgarRows.filter(r => Number.isFinite(r.roa)).reduce((s, r) => s + r.roa, 0) / edgarRows.filter(r => Number.isFinite(r.roa)).length || null;
    const avgRoe = edgarRows.filter(r => Number.isFinite(r.roe)).reduce((s, r) => s + r.roe, 0) / edgarRows.filter(r => Number.isFinite(r.roe)).length || null;
    const avgRevGrowth = edgarRows.filter(r => Number.isFinite(r.revGrowth)).reduce((s, r) => s + r.revGrowth, 0) / edgarRows.filter(r => Number.isFinite(r.revGrowth)).length || null;
    const avgDe = edgarRows.filter(r => Number.isFinite(r.debtToEquity)).reduce((s, r) => s + r.debtToEquity, 0) / edgarRows.filter(r => Number.isFinite(r.debtToEquity)).length || null;
    const gradeA = edgarRows.filter(r => r.quality === 'A').length;
    return { avgMargin, profitable, count: edgarRows.length, avgRoa, avgRoe, avgRevGrowth, avgDe, gradeA };
  }, [edgarRows]);
  const universeUpdates = universeCtx?.data?.updates || [];

    // Synthetic fetchLog so DataFooter's click-to-open popover has something
    // to render. Without this, open() bails on `fetchLog.length === 0` and
    // clicking the FETCHED bar appears to do nothing.
    const quotesFetchLog = [{
      time: dataTimestamp,
      url: '/api/stocks',
      status: dataTimestamp && dataTimestamp !== STATIC_DATA_TIMESTAMP ? 200 : 0,
      sources: {
        'Yahoo Finance · /api/stocks': {
          _source: 'Yahoo Finance',
          _description: `Live equity quotes for up to top ${REFRESH_PER_MARKET_LIMIT} tickers per market (price, change %, market cap, 52w high/low). Refresh updates marketUniverse and persists to IndexedDB.`,
        },
        'Stock universe (local)': {
          _source: 'src/data/stockUniverse.js',
          _description: 'Static base universe — sectors, regions, fundamentals — overlaid with live quotes when available.',
        },
      },
    }];
    const commonFooter = (
      <DataFooter
        source={snapshotDate ? 'Yahoo Finance snapshot' : 'Yahoo Finance'}
        timestamp={dataTimestamp}
        isLive={!snapshotDate}
        isCurrent={!snapshotDate}
        fetchedOn={dataTimestamp}
        fetchLog={quotesFetchLog}
      />
    );

    const sidebarFooter = (
      <div className="eq-panel-footer">
        {selectedTicker
          ? (selectedTicker.isLoading ? 'Loading live data…' : (selectedTicker.isLive ? `Fetched · Yahoo Finance` : 'Static data · Click ticker for quote'))
          : <>{`Data as of ${dataTimestamp} · FX: ${ratesLive ? 'Fetched (ECB)' : 'Fallback'}`} <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button></>}
        {commonFooter}
      </div>
    );
    const sidebarPanel = (
      <BentoCard
        key="sidebar"
        title="Market Summary"
        accent="equities"
        className="eq-bento-card"
        contentClassName="eq-panel-content"
        footer={sidebarFooter}
      >
        {selectedTicker ? (
          <DetailPanel
            selectedTicker={selectedTicker}
            setSelectedTicker={setSelectedTicker}
            currentRate={currentRate}
            currentSymbol={currentSymbol}
          />
        ) : (
          <div className="eq-summary">
               <div className="eq-stat-card">
                 <div className="eq-stat-label">Global Market Cap ({currency})</div>
                 <div className="eq-stat-value">
                   <MetricValue value={globalValCap * currentRate} seriesKey="globalEqCap" timestamp={dataTimestamp} format={v => `${currentSymbol}${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} B`} />
                 </div>
               </div>
               <div className="eq-stat-card">
                 <div className="eq-stat-label">Equities Tracked</div>
                 <div className="eq-stat-value">
                   <MetricValue value={flatData.length} seriesKey="eqTrackedCount" timestamp={dataTimestamp} format={v => v} />
                 </div>
               </div>
               <div className="eq-stat-card">
                 <div className="eq-stat-label">Regions</div>
                 <div className="eq-stat-value">
                   <MetricValue value={marketUniverse.length} seriesKey="eqRegionCount" timestamp={dataTimestamp} format={v => v} />
                 </div>
               </div>
                <div className="eq-stat-card">
                  <div className="eq-stat-label">Advancers / Decliners</div>
                  <div className="eq-stat-value">
                    <span style={{ color: '#4ade80' }}>
                      <MetricValue value={marketStats.advancers} seriesKey="eqAdvancers" timestamp={dataTimestamp} format={v => v != null ? String(v) : '—'} />
                    </span>
                    {' / '}
                    <span style={{ color: '#f87171' }}>
                      <MetricValue value={marketStats.decliners} seriesKey="eqDecliners" timestamp={dataTimestamp} format={v => v != null ? String(v) : '—'} />
                    </span>
                    {marketStats.unchanged > 0 && <span style={{ color: '#94a3b8' }}> · {marketStats.unchanged} unchanged</span>}
                  </div>
                </div>
                <div className="eq-stat-card">
                  <div className="eq-stat-label">52-Week Highs / Lows</div>
                  <div className="eq-stat-value">
                    <span style={{ color: '#4ade80' }}>
                      <MetricValue value={marketStats.newHighs} seriesKey="eqNewHighs" timestamp={dataTimestamp} format={v => v != null ? String(v) : '—'} />
                    </span>
                    {' / '}
                    <span style={{ color: '#f87171' }}>
                      <MetricValue value={marketStats.newLows} seriesKey="eqNewLows" timestamp={dataTimestamp} format={v => v != null ? String(v) : '—'} />
                    </span>
                  </div>
                </div>

               <div className="eq-stat-card">
                 <div className="eq-stat-label">Rank Metric</div>
                 <div className="eq-stat-value eq-stat-accent">{rankMetric === 'marketCap' ? 'Market Cap' : rankMetric === 'revenue' ? 'Revenue' : rankMetric === 'netIncome' ? 'Net Income' : rankMetric === 'pe' ? 'P/E Ratio' : 'Div Yield'}</div>
               </div>
               <div className="eq-stat-card">
                 <div className="eq-stat-label">Grouping</div>
                 <div className="eq-stat-value">{groupBy === 'market' ? 'By Market' : groupBy === 'sectorInMarket' ? 'Sector in Market' : 'Global Sector'}</div>
               </div>

              {ratesLive && (
                <div className="eq-stat-card eq-stat-live">
                  <div className="eq-stat-label">FX Rates</div>
                  <div className="eq-stat-value" style={{ fontSize: 11, color: '#60a5fa' }}>Live (ECB)</div>
                </div>
              )}
              <div className="eq-hint">Click any cell on the heatmap to view details</div>
            </div>
        )}
      </BentoCard>
    );

  // KPI strip becomes a real bento child rendered as the first item of
  // each view-mode's BentoWrapper. Same content regardless of view mode,
  // so render it once into a variable and reuse.
  // Build pills for a single ticker. Carries `ticker` + `currency` so the
  // KeyIndicesStrip popover can fetch /api/history and label units.
  const buildPill = (tk) => {
    const q = indexQuotes?.[tk];
    const label = INDEX_LABELS[tk];
    const price = q?.price;
    const changePct = q?.changePct;
    const change = q?.change;
    const hasData = price != null;
    const ccy = INDEX_CURRENCY[tk] || '';
    return {
      ticker:   tk,
      label,
      currency: ccy,
      value:    hasData ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
      color:    hasData ? (changePct >= 0 ? '#4ade80' : '#f87171') : 'var(--text-primary)',
      trend:    hasData ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : null,
      // Sublabel carries the absolute change AND the currency for non-USD
      // indices, so a glance at the strip makes the unit obvious.
      sublabel: hasData
        ? `(${change >= 0 ? '+' : ''}${change.toFixed(2)})${ccy && ccy !== 'USD' ? ` ${ccy}` : ''}`
        : 'no data',
    };
  };

  // Derive footer state from the index-quotes payload. fetchLog is a single
  // synthetic entry per ticker so the popover surfaces something useful;
  // isLive is true if any pill has data.
  const indexFetchLog = INDEX_TICKERS.map(tk => ({
    time: indexQuotes?._timestamp || new Date().toISOString(),
    url: `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(tk)}`,
    status: indexQuotes?.[tk]?.price != null ? 200 : 0,
    sources: indexQuotes?.[tk] ? { [INDEX_LABELS[tk]]: { _source: 'Yahoo Finance', _ticker: tk, _currency: INDEX_CURRENCY[tk] || 'USD' } } : null,
  }));
  const indexIsLive = INDEX_TICKERS.some(tk => indexQuotes?.[tk]?.price != null);
  const indexLastUpdated = indexQuotes?._timestamp || null;

  // DataFooter is rendered by BentoCard in its footer slot (flush at the
  // bottom of the card, like every other panel). KeyIndicesStrip itself
  // no longer renders a footer — pass `source` to it as undefined so the
  // internal footer is suppressed.
  const kpiBentoCard = (
    <BentoCard
      key="kpi"
      title="Key Indices"
      subtitle="US · Intl · China & HK · Risk · Sectors — live Yahoo Finance quotes · hover/click pill for 3-month chart"
      accent="equities"
      className="eq-bento-card"
      contentClassName="eq-panel-content"
      source="Yahoo Finance"
      timestamp={indexLastUpdated}
      isLive={indexIsLive}
      isCurrent={true}
      fetchLog={indexFetchLog}
    >
      <KeyIndicesStrip
        groups={[
          { label: 'US · major indices',                                        kpis: INDEX_TICKERS_US.map(buildPill) },
          { label: 'Global Developed · Europe + Japan + India + Aus + Canada',   kpis: INDEX_TICKERS_DEV.map(buildPill) },
          { label: 'Emerging Markets · EM ETFs + country indices',              kpis: INDEX_TICKERS_EM.map(buildPill) },
          { label: 'China & HK · native + USD-listed ETFs',                     kpis: INDEX_TICKERS_CN.map(buildPill) },
          { label: 'Risk & Macro · vol, rates, dollar, gold, crude',            kpis: INDEX_TICKERS_RISK.map(buildPill) },
          { label: 'Commodities · silver, nat gas, broad index',                kpis: INDEX_TICKERS_COMM.map(buildPill) },
          { label: 'Sectors · growth + defensive + semis',                      kpis: INDEX_TICKERS_SECTORS.map(buildPill) },
        ]}
      />
    </BentoCard>
  );

  const secFundamentalsCard = edgarRows.length > 0 ? (
    <BentoCard
      key="sec-fundamentals"
      title="SEC Mega-Cap Fundamentals"
      subtitle={`${edgarSummary.count} companies · ${edgarSummary.profitable}/${edgarSummary.count} profitable · avg margin ${edgarSummary.avgMargin?.toFixed(1) || '—'}% · avg ROE ${edgarSummary.avgRoe?.toFixed(1) || '—'}% · avg D/E ${edgarSummary.avgDe?.toFixed(1) || '—'} · ${edgarSummary.gradeA || 0} grade A`}
      accent="equities"
      className="eq-bento-card"
      contentClassName="eq-panel-content eq-panel-scroll"
      source="SEC EDGAR XBRL"
      timestamp={edgarCtx?.lastUpdated || dataTimestamp}
      isLive={!!edgarCtx?.data?.isLive}
      isCurrent={edgarCtx?.isCurrent ?? true}
      fetchedOn={edgarCtx?.fetchedOn}
      fetchLog={edgarCtx?.fetchLog || []}
      error={edgarCtx?.error}
    >
      {/* Summary KPI strip */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, padding: '0 2px' }}>
        {[
          { label: 'Avg Margin', value: edgarSummary.avgMargin != null ? `${edgarSummary.avgMargin.toFixed(1)}%` : '—', color: '#60a5fa' },
          { label: 'Avg ROE', value: edgarSummary.avgRoe != null ? `${edgarSummary.avgRoe.toFixed(1)}%` : '—', color: '#22c55e' },
          { label: 'Avg ROA', value: edgarSummary.avgRoa != null ? `${edgarSummary.avgRoa.toFixed(1)}%` : '—', color: '#a78bfa' },
          { label: 'Avg Rev Growth', value: edgarSummary.avgRevGrowth != null ? `${edgarSummary.avgRevGrowth >= 0 ? '+' : ''}${edgarSummary.avgRevGrowth.toFixed(1)}%` : '—', color: edgarSummary.avgRevGrowth >= 0 ? '#22c55e' : '#f87171' },
          { label: 'Avg D/E', value: edgarSummary.avgDe != null ? `${edgarSummary.avgDe.toFixed(1)}x` : '—', color: '#f59e0b' },
        ].map(kpi => (
          <span key={kpi.label} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ color: 'var(--text-muted)' }}>{kpi.label}</span>{' '}
            <strong style={{ color: kpi.color, fontVariantNumeric: 'tabular-nums' }}>{kpi.value}</strong>
          </span>
        ))}
      </div>

      {/* Main table */}
      <div className="eq-mini-table">
        <div style={{ display: 'grid', gridTemplateColumns: '48px 52px 60px 60px 52px 52px 48px 42px', gap: 6, alignItems: 'center', padding: '0 0 4px', fontSize: 8, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <span>Ticker</span>
          <span style={{ textAlign: 'right' }}>FY</span>
          <span style={{ textAlign: 'right' }}>Revenue</span>
          <span style={{ textAlign: 'right' }}>Net Inc</span>
          <span style={{ textAlign: 'right' }}>Margin</span>
          <span style={{ textAlign: 'right' }}>ROE</span>
          <span style={{ textAlign: 'right' }}>D/E</span>
          <span style={{ textAlign: 'right' }}>Grd</span>
        </div>
        {edgarRows.map(row => (
          <div key={row.ticker} className="eq-stat-card" style={{ display: 'grid', gridTemplateColumns: '48px 52px 60px 60px 52px 52px 48px 42px', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <strong style={{ fontSize: 11 }}>{row.ticker}</strong>
            <span style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.period || '—'}</span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <MetricValue value={row.revenue} seriesKey="edgarRevenue" timestamp={edgarCtx?.lastUpdated} format={v => v != null ? `$${(v / 1e9).toFixed(0)}B` : '—'} />
            </span>
            <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
              <MetricValue value={row.netIncome} seriesKey="edgarNetIncome" timestamp={edgarCtx?.lastUpdated} format={v => v != null ? `$${(v / 1e9).toFixed(0)}B` : '—'} />
            </span>
            <span style={{ color: (row.margin ?? 0) >= 20 ? '#22c55e' : (row.margin ?? 0) >= 10 ? '#f59e0b' : '#f87171', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
              {row.margin != null ? `${row.margin.toFixed(0)}%` : '—'}
            </span>
            <span style={{ color: (row.roe ?? 0) >= 20 ? '#22c55e' : '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
              {row.roe != null ? `${row.roe.toFixed(0)}%` : '—'}
            </span>
            <span style={{ color: (row.debtToEquity ?? 0) > 3 ? '#f87171' : '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>
              {row.debtToEquity != null ? `${row.debtToEquity.toFixed(1)}x` : '—'}
            </span>
            <span style={{
              color: row.quality === 'A' ? '#22c55e' : row.quality === 'B' ? '#60a5fa' : row.quality === 'C' ? '#f59e0b' : '#f87171',
              fontWeight: 700, textAlign: 'right', fontSize: 11
            }}>{row.quality}</span>
          </div>
        ))}
      </div>

      {/* Detailed breakdown per ticker */}
      <div style={{ marginTop: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
        <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6, padding: '0 2px' }}>Detailed Breakdown</div>
        {edgarRows.slice(0, 6).map(row => (
          <div key={row.ticker} style={{ marginBottom: 6, padding: '4px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <strong style={{ fontSize: 11 }}>{row.ticker}</strong>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>FY{row.period}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 4, fontSize: 9 }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Op Margin </span>
                <strong style={{ color: (row.operatingMargin ?? 0) >= 20 ? '#22c55e' : '#94a3b8' }}>
                  {row.operatingMargin != null ? `${row.operatingMargin.toFixed(1)}%` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>FCF </span>
                <strong style={{ color: (row.fcf ?? 0) > 0 ? '#22c55e' : '#f87171' }}>
                  {row.fcf != null ? `$${(row.fcf / 1e9).toFixed(1)}B` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Rev Growth </span>
                <strong style={{ color: (row.revGrowth ?? 0) >= 0 ? '#22c55e' : '#f87171' }}>
                  {row.revGrowth != null ? `${row.revGrowth >= 0 ? '+' : ''}${row.revGrowth.toFixed(1)}%` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>NI Growth </span>
                <strong style={{ color: (row.niGrowth ?? 0) >= 0 ? '#22c55e' : '#f87171' }}>
                  {row.niGrowth != null ? `${row.niGrowth >= 0 ? '+' : ''}${row.niGrowth.toFixed(1)}%` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Current Ratio </span>
                <strong style={{ color: (row.currentRatio ?? 0) >= 1.5 ? '#22c55e' : '#f59e0b' }}>
                  {row.currentRatio != null ? `${row.currentRatio.toFixed(2)}x` : '—'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>R&D Intensity </span>
                <strong>{row.rdIntensity != null ? `${row.rdIntensity.toFixed(1)}%` : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>P/E </span>
                <strong>{row.pe != null ? `${row.pe.toFixed(1)}x` : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>P/B </span>
                <strong>{row.pbRatio != null ? `${row.pbRatio.toFixed(1)}x` : '—'}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>
    </BentoCard>
  ) : null;

  const filingActivityData = filingActivityCtx?.data?.byType || {};
  const filingActivityTotal = filingActivityCtx?.data?.total || 0;
  const filingActivityTickers = filingActivityCtx?.data?.tickerCount || 0;
  const materialFilings = filingActivityCtx?.data?.material || [];
  const insiderFilings = filingActivityCtx?.data?.insider || [];
  const earningsFilings = filingActivityCtx?.data?.earnings || [];
  const activistFilings = filingActivityCtx?.data?.activist || [];

  const CategorySection = ({ title, icon, color, filings, maxRows = 5 }) => {
    if (!filings || filings.length === 0) return null;
    return (
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>{icon}</span> {title} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({filings.length})</span>
        </div>
        {filings.slice(0, maxRows).map((f, i) => (
          <div key={`${f.ticker}-${f.date}-${i}`} style={{ display: 'grid', gridTemplateColumns: '44px 48px 60px 1fr 36px', gap: 6, alignItems: 'center', padding: '2px 0', fontSize: 11, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <strong style={{ fontSize: 11 }}>{f.ticker}</strong>
            <span style={{ color, fontSize: 10 }}>{f.form}</span>
            <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontSize: 10 }}>{f.date}</span>
            <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10 }}>{f.description || '—'}</span>
            <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textAlign: 'right', textDecoration: 'none', fontSize: 10 }} title={`View on SEC EDGAR`}>↗</a>
          </div>
        ))}
        {filings.length > maxRows && (
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>+{filings.length - maxRows} more</div>
        )}
      </div>
    );
  };

  const secFilingsCard = filingActivityTotal > 0 ? (
    <BentoCard
      key="sec-filings"
      title="SEC Filing Activity"
      subtitle={`${filingActivityTotal} filings · ${filingActivityTickers} tickers · ${materialFilings.length} material events · ${insiderFilings.length} insider trades`}
      accent="equities"
      className="eq-bento-card"
      contentClassName="eq-panel-content eq-panel-scroll"
      source="SEC EDGAR"
      timestamp={filingActivityCtx?.lastUpdated || dataTimestamp}
      isLive={!!filingActivityCtx?.data?.isLive}
      isCurrent={filingActivityCtx?.isCurrent ?? true}
      fetchedOn={filingActivityCtx?.fetchedOn}
      fetchLog={filingActivityCtx?.fetchLog || []}
      error={filingActivityCtx?.error}
    >
      {/* Summary pills */}
      <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {[
          { label: '8-K Material', count: materialFilings.length, color: '#f59e0b' },
          { label: 'Form 4 Insider', count: insiderFilings.length, color: '#a78bfa' },
          { label: '10-K/Q Earnings', count: earningsFilings.length, color: '#22c55e' },
          { label: '13G/D Activist', count: activistFilings.length, color: '#ec4899' },
        ].filter(s => s.count > 0).map(s => (
          <span key={s.label} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
            <span style={{ color: s.color }}>{s.label}</span>{' '}
            <strong style={{ color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.count}</strong>
          </span>
        ))}
      </div>

      {/* Material events (8-K) */}
      <CategorySection title="Material Events (8-K)" icon="⚡" color="#f59e0b" filings={materialFilings} maxRows={4} />

      {/* Insider trading (Form 4) */}
      <CategorySection title="Insider Transactions (Form 4)" icon="👤" color="#a78bfa" filings={insiderFilings} maxRows={4} />

      {/* Earnings filings (10-K/Q) */}
      <CategorySection title="Earnings Filings (10-K/Q)" icon="📊" color="#22c55e" filings={earningsFilings} maxRows={3} />

      {/* Activist filings (13G/D) */}
      <CategorySection title="Activist / Institutional (13G/D)" icon="🏦" color="#ec4899" filings={activistFilings} maxRows={3} />
    </BentoCard>
  ) : null;

  const universeUpdatesCard = universeUpdates.length > 0 ? (
    <BentoCard
      key="universe-updates"
      panelKey="universe-updates"
      title="Universe Expansion Queue"
      subtitle={`${universeUpdates.length} discovered listings · review candidates`}
      accent="equities"
      className="eq-bento-card"
      contentClassName="eq-panel-content eq-panel-scroll"
      source="Finnhub / Yahoo Finance"
      timestamp={universeCtx?.lastUpdated || dataTimestamp}
      isLive={!!universeCtx?.data?._sources?.universeUpdates}
      isCurrent={universeCtx?.isCurrent ?? true}
      fetchedOn={universeCtx?.fetchedOn}
      fetchLog={universeCtx?.fetchLog || []}
      error={universeCtx?.error}
    >
      <table className="eq-table" style={{ width: '100%', fontSize: 10, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <th style={{ padding: '2px 4px' }}>Ticker</th>
            <th style={{ padding: '2px 4px' }}>Company</th>
            <th style={{ padding: '2px 4px' }}>Sector</th>
            <th style={{ padding: '2px 4px' }}>Industry</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Mkt Cap</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Price</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Chg%</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>P/E</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Rev ($B)</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Net Inc ($B)</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Margin</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Beta</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>Div Yld</th>
            <th style={{ padding: '2px 4px', textAlign: 'right' }}>52W H/L</th>
            <th style={{ padding: '2px 4px' }}>Exch</th>
          </tr>
        </thead>
        <tbody>
          {universeUpdates.slice(0, 15).map(row => (
            <tr key={row.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <td style={{ padding: '3px 4px', fontWeight: 600 }}>{row.name}</td>
              <td style={{ padding: '3px 4px', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.fullName || '—'}</td>
              <td style={{ padding: '3px 4px', color: 'var(--text-muted)' }}>{row.sector || '—'}</td>
              <td style={{ padding: '3px 4px', color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.industry || '—'}</td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                <MetricValue value={row.marketCap} seriesKey="universeMarketCap" timestamp={universeCtx?.lastUpdated} format={v => v != null ? `$${v.toFixed(1)}B` : '—'} />
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.price != null ? `$${row.price.toFixed(2)}` : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: row.changePct != null ? (row.changePct >= 0 ? '#4ade80' : '#f87171') : 'var(--text-muted)' }}>
                {row.changePct != null ? `${row.changePct >= 0 ? '+' : ''}${row.changePct.toFixed(2)}%` : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.pe != null && row.pe < 999 ? row.pe.toFixed(1) : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.revenue != null ? `$${row.revenue.toFixed(2)}` : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.netIncome != null ? `$${row.netIncome.toFixed(2)}` : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.profitMargins != null ? `${row.profitMargins.toFixed(1)}%` : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.beta != null ? row.beta.toFixed(2) : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                {row.divYield != null ? `${row.divYield.toFixed(2)}%` : '—'}
              </td>
              <td style={{ padding: '3px 4px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>
                {row.weekHigh52 != null || row.weekLow52 != null
                  ? `${row.weekHigh52 != null ? row.weekHigh52.toFixed(0) : '—'}/${row.weekLow52 != null ? row.weekLow52.toFixed(0) : '—'}`
                  : '—'}
              </td>
              <td style={{ padding: '3px 4px', color: 'var(--text-muted)', fontSize: 9 }}>{row.exchange || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </BentoCard>
  ) : null;

  return (
    <div className="eq-dashboard eq-dashboard--bento" role="region" aria-label="Equities">
      <Header
        viewMode={viewMode} setViewMode={setViewMode}
        rankMetric={rankMetric} setRankMetric={setRankMetric}
        groupBy={groupBy} setGroupBy={setGroupBy}
        colorByPerf={colorByPerf} setColorByPerf={setColorByPerf}
      />
      {historyNotice && (
        <div className="eq-history-notice" role="status">
          {historyNotice}
        </div>
      )}
      {viewMode === 'datahub' ? (
        <DataHubView
          flatData={flatData}
          currentRate={currentRate}
          currentSymbol={currentSymbol}
          currency={currency}
          onRowClick={handleSelectTicker}
        />
      ) : viewMode === 'list' ? (
        <BentoWrapper layout={LIST_LAYOUT} storageKey="equities-list-layout-v8">
          {kpiBentoCard}
          <div key="list-main" className="eq-bento-card">
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">Equity List</span>
              <span className="eq-panel-subtitle">Detailed market table</span>
            </div>
            <div className="eq-panel-content bento-panel-content eq-panel-scroll" onMouseDown={stopDrag}>
              <ListView
                processedData={processedData}
                handleSort={handleSort}
                renderSortIndicator={renderSortIndicator}
                handleSelectTicker={handleSelectTicker}
                currentRate={currentRate}
                currentSymbol={currentSymbol}
                currency={currency}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                rankMetric={rankMetric}
                groupBy={groupBy}
                dataTimestamp={dataTimestamp}
                snapshotDate={snapshotDate}
              />
            </div>
            <div className="eq-panel-footer">
              {commonFooter}
              <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button>
            </div>
          </div>
          {selectedTicker && (
            <div key="detail-sidebar" className="eq-bento-card eq-detail-sidebar">
              <div className="eq-panel-title-row bento-panel-title-row">
                <span className="eq-panel-title">Detail · {selectedTicker}</span>
              </div>
              <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
                <DetailPanel
                  selectedTicker={selectedTicker}
                  setSelectedTicker={setSelectedTicker}
                  currentRate={currentRate}
                  currentSymbol={currentSymbol}
                />
              </div>
            </div>
          )}
        </BentoWrapper>
      ) : viewMode === 'heatmap' ? (
        <BentoWrapper layout={HEATMAP_LAYOUT} storageKey="equities-heatmap-layout-v8">
          {kpiBentoCard}
          <div key="heatmap" className="eq-bento-card">
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">Equity Heatmap</span>
              <span className="eq-panel-subtitle">{flatData.length} equities · {groupBy === 'sectorGlobal' ? 'global sectors' : groupBy === 'sectorInMarket' ? 'sectors by market' : 'by market'}{snapshotDate ? ` · ${snapshotDate}` : ''}</span>
            </div>
            <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <div className="value"><HeatmapView
                data={heatmapData}
                currentRate={currentRate}
                currentSymbol={currentSymbol}
                currency={currency}
                rankMetric={rankMetric}
                groupBy={groupBy}
                colorByPerf={colorByPerf}
                onSelect={handleSelectTicker}
              /><span style={{display:'none'}}>heatmap</span></div>
            </div>
            <div className="eq-panel-footer">
              {commonFooter}
              <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button>
            </div>
          </div>
          {sidebarPanel}
          {secFundamentalsCard}
          {secFilingsCard}
          {universeUpdatesCard}
          <BentoCard key="bea-corporate-profits" title="BEA Corporate Profits" subtitle="GDP components · personal saving rate" accent="equities" className="eq-bento-card" contentClassName="eq-panel-content" source="Bureau of Economic Analysis" timestamp={dataTimestamp} isLive={true} isCurrent={!snapshotDate} fetchedOn={dataTimestamp} fetchLog={quotesFetchLog}>
            <BeaCorporateProfitsPanel />
          </BentoCard>
          <BentoCard key="wb-market-cap" title="World Bank Market Cap" subtitle="Key indicators by country" accent="equities" className="eq-bento-card" contentClassName="eq-panel-content" source="World Bank" timestamp={dataTimestamp} isLive={true} isCurrent={!snapshotDate} fetchedOn={dataTimestamp} fetchLog={quotesFetchLog}>
            <WorldBankMarketCapPanel />
          </BentoCard>
        </BentoWrapper>
      ) : viewMode === 'portfolio' ? (
        // PORTFOLIO_LAYOUT only has 'kpi' + 'portfolio' slots — sidebar
        // intentionally omitted because Portfolio takes full width. Don't
        // render <sidebarPanel> here, otherwise RGL falls back to a 1×1
        // default and Market Summary collapses to a 116×120 stub.
        // PortfolioTracker also brings its own title row, so we wrap it in
        // a slim shell instead of the redundant eq-panel-title chrome.
        <BentoWrapper layout={PORTFOLIO_LAYOUT} storageKey="equities-portfolio-layout-v8">
          {kpiBentoCard}
          <div key="portfolio" className="eq-bento-card" onMouseDown={stopDrag}>
            <PortfolioTracker indexQuotes={indexQuotes} onTickerSelect={handleSelectTicker} />
          </div>
        </BentoWrapper>
      ) : viewMode === 'radar' ? (
        <BentoWrapper layout={RADAR_LAYOUT} storageKey="equities-radar-layout-v8">
          {kpiBentoCard}
          <div key="radar" className="eq-bento-card">
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">Equities Radar</span>
              <span className="eq-panel-subtitle">Plot stocks by dimensions · color-by-sector</span>
            </div>
            <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <RadarView
                flatData={flatData}
                onTickerSelect={handleSelectTicker}
              />
            </div>
            <div className="eq-panel-footer">
              {commonFooter}
              <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button>
            </div>
          </div>
          {sidebarPanel}
        </BentoWrapper>
      ) : (
        <BentoWrapper layout={RACE_LAYOUT} storageKey="equities-race-layout-v8">
          {kpiBentoCard}
          <div key="race" className="eq-bento-card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">Bar Race</span>
              <span className="eq-panel-subtitle">Top 30 · colored by {groupBy === 'market' ? 'region' : 'sector'}{snapshotDate ? ` · ${snapshotDate}` : ''}</span>
            </div>
            <TimeTravel onSnapshotSelect={handleSnapshotSelect} isActive={viewMode === 'race'} />
            <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <BarRaceView
                flatData={flatData}
                currentRate={currentRate}
                currentSymbol={currentSymbol}
                currency={currency}
                groupBy={groupBy}
                snapshotDate={snapshotDate}
              />
            </div>
            <div className="eq-panel-footer">
              {commonFooter}
              <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button>
            </div>
          </div>
          {sidebarPanel}
        </BentoWrapper>
      )}
    </div>
  );
}
