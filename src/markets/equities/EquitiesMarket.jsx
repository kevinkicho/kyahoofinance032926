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
import DataFooter from '../../components/DataFooter/DataFooter';
import MarketPanelGrid from '../../panels/MarketPanelGrid';
import { stockUniverseData } from '../../data/stockUniverse';
import { currencySymbols } from '../../utils/constants';
import { useCurrency } from '../../hub/CurrencyContext';
import { useDataContext } from '../../hub/DataContext';
import { putSnapshot as putIDBSnapshot } from '../../utils/snapshotDB';
import KeyIndicesStrip from './components/KeyIndicesStrip';
import PortfolioTracker from './components/PortfolioTracker';
import MetricValue from '../../components/MetricValue/MetricValue';
import BeaCorporateProfitsPanel, { hasBeaCorporateProfitsRows } from './components/BeaCorporateProfitsPanel';
import WorldBankMarketCapPanel, { hasWbMarketCapRows } from './components/WorldBankMarketCapPanel';
import SecMegaCapFundamentalsPanel from './components/SecMegaCapFundamentalsPanel';
import SecFilingActivityPanel from './components/SecFilingActivityPanel';

import {
  INDEX_TICKERS, INDEX_LABELS,
  INDEX_TICKERS_US, INDEX_TICKERS_DEV, INDEX_TICKERS_EM, INDEX_TICKERS_CN,
  INDEX_TICKERS_RISK, INDEX_TICKERS_COMM, INDEX_TICKERS_SECTORS,
} from './equitiesIndexUniverse';
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
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 4, minH: 3 },
    // minH 5 (~600px) so SafeECharts never collapses into a zero-height RGL cell
    { i: 'heatmap', x: 0, y: 4, w: 8,  h: 6, minH: 5, minW: 4 },
    { i: 'sidebar', x: 8, y: 4, w: 4,  h: 6, minH: 4 },
    { i: 'sec-fundamentals', x: 0, y: 10, w: 7, h: 6 },
    { i: 'sec-filings', x: 7, y: 10, w: 5, h: 6 },
    { i: 'universe-updates', x: 0, y: 16, w: 12, h: 4 },
    // h:4 (not 6–7): content is KPI + compact charts/table; taller cells left wasteful empty bottom.
    { i: 'bea-corporate-profits', x: 0, y: 20, w: 12, h: 4 },
    { i: 'wb-market-cap', x: 0, y: 24, w: 12, h: 4 },
  ]
};

const RACE_LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 3 },
    { i: 'race',    x: 0, y: 3, w: 8,  h: 8 },
    { i: 'sidebar', x: 8, y: 3, w: 4,  h: 8 },
  ]
};

const LIST_LAYOUT = {
  lg: [
    { i: 'kpi',            x: 0, y: 0, w: 12, h: 3 },
    { i: 'list-main',      x: 0, y: 3, w: 8,  h: 8 },
    { i: 'detail-sidebar', x: 8, y: 3, w: 4,  h: 8 },
  ]
};

// PORTFOLIO_LAYOUT — full-width tracker under Key Indices (taller so table + chart fit).
const PORTFOLIO_LAYOUT = {
  lg: [
    { i: 'kpi',       x: 0, y: 0, w: 12, h: 3 },
    { i: 'portfolio', x: 0, y: 3, w: 12, h: 9 },
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

/**
 * Normalize /api/equities quotes (full or compact) into one compact shape.
 * Single data plane: hub bag is the source of truth — no parallel /api/stocks merge.
 */
function compactQuotesFromSnapshot(quotes) {
  if (!quotes || typeof quotes !== 'object') return null;
  const out = {};
  for (const [ticker, q] of Object.entries(quotes)) {
    if (!q || typeof q !== 'object') continue;
    const compact = {};
    const price = q.price ?? q.p;
    const change = q.change ?? q.c;
    const changePct = q.changePct ?? q.cp;
    const mc = q.marketCapUsdB ?? q.mc ?? (typeof q.marketCap === 'number' && q.marketCap > 1e6
      ? q.marketCap / 1e9
      : q.marketCap);
    const pe = q.pe ?? q.trailingPE;
    const dy = q.divYield ?? q.dividendYield ?? q.dy;
    const wh = q.weekHigh52 ?? q.wh;
    const wl = q.weekLow52 ?? q.wl;
    if (price != null) compact.p = price;
    if (change != null) compact.c = change;
    if (changePct != null) compact.cp = changePct;
    if (mc != null && Number.isFinite(Number(mc))) compact.mc = Number(mc);
    if (pe != null) compact.pe = pe;
    if (dy != null) compact.dy = dy;
    if (wh != null) compact.wh = wh;
    if (wl != null) compact.wl = wl;
    if (Object.keys(compact).length) out[ticker] = compact;
  }
  return Object.keys(out).length ? out : null;
}

function applyQuotesToUniverse(universe, quotes, { preferLocal = false } = {}) {
  if (!quotes || !Object.keys(quotes).length) return universe;
  return universe.map(region => ({
    ...region,
    children: region.children.map(stock => {
      const raw = quotes[stock.name];
      if (!raw) return stock;
      // Accept compact (p/cp/mc) or full equities API fields.
      const q = {
        p: raw.p ?? raw.price,
        c: raw.c ?? raw.change,
        cp: raw.cp ?? raw.changePct,
        mc: raw.mc ?? raw.marketCapUsdB ?? raw.marketCap,
        pe: raw.pe,
        dy: raw.dy ?? raw.divYield ?? raw.dividendYield,
        wh: raw.wh ?? raw.weekHigh52,
        wl: raw.wl ?? raw.weekLow52,
      };
      if (preferLocal) {
        return {
          ...stock,
          marketCap: stock.marketCap ?? q.mc ?? stock.value,
          value: stock.value ?? q.mc ?? stock.marketCap,
          pe: stock.pe ?? q.pe,
          divYield: stock.divYield ?? q.dy,
          price: stock.price ?? q.p,
          change: stock.change ?? q.c,
          changePct: stock.changePct ?? q.cp,
          weekHigh52: stock.weekHigh52 ?? q.wh,
          weekLow52: stock.weekLow52 ?? q.wl,
        };
      }
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
  'equities-heatmap-layout',   'equities-heatmap-layout-v2',   'equities-heatmap-layout-v3',   'equities-heatmap-layout-v4',   'equities-heatmap-layout-v5',   'equities-heatmap-layout-v6',   'equities-heatmap-layout-v7',   'equities-heatmap-layout-v8',
  'equities-list-layout',      'equities-list-layout-v2',      'equities-list-layout-v3',      'equities-list-layout-v4',      'equities-list-layout-v5',      'equities-list-layout-v6', 'equities-list-layout-v7', 'equities-list-layout-v8',
  'equities-radar-layout',     'equities-radar-layout-v2',     'equities-radar-layout-v3',     'equities-radar-layout-v4',     'equities-radar-layout-v5',     'equities-radar-layout-v6',
  'equities-race-layout',      'equities-race-layout-v2',      'equities-race-layout-v3',      'equities-race-layout-v4',      'equities-race-layout-v5',      'equities-race-layout-v6', 'equities-race-layout-v7', 'equities-race-layout-v8',
  'equities-portfolio-layout', 'equities-portfolio-layout-v2', 'equities-portfolio-layout-v3', 'equities-portfolio-layout-v4', 'equities-portfolio-layout-v5', 'equities-portfolio-layout-v6', 'equities-portfolio-layout-v7', 'equities-portfolio-layout-v8',
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
  // Keep-alive: once a submenu has been opened, keep its RGL tree mounted
  // (hidden) so switching back does not remount and twitch.
  const [visitedViews, setVisitedViews] = useState(() => ({
    heatmap: true,
    list: false,
    race: false,
    portfolio: false,
  }));
  // Splash mounts equities under [data-splash-market] and needs every catalog
  // panel in the DOM for F/D/C — keep-alive all views while splash is up.
  const underSplash = typeof document !== 'undefined'
    && !!document.querySelector('[data-splash-market="equities"]');
  const viewMounted = (key) => !!(visitedViews[key] || underSplash);
  // Removed sub-tabs (ML Explorer, Radar) — remap stale localStorage so users land on Heatmap.
  useEffect(() => {
    if (viewMode === 'ml-explorer' || viewMode === 'radar') setViewMode('heatmap');
  }, [viewMode, setViewMode]);
  useEffect(() => {
    if (viewMode === 'datahub') return;
    const key = ['list', 'heatmap', 'race', 'portfolio'].includes(viewMode) ? viewMode : 'heatmap';
    setVisitedViews((v) => (v[key] ? v : { ...v, [key]: true }));
  }, [viewMode]);
  // On splash, mark all views visited so post-Enter keep-alive still has them.
  useEffect(() => {
    if (!underSplash) return;
    setVisitedViews((v) => ({ ...v, heatmap: true, list: true, race: true, portfolio: true }));
  }, [underSplash]);
  // After switching submenu, nudge width measure so a keep-alive pane that
  // was display:none gets a correct container width without layout thrash.
  useEffect(() => {
    if (viewMode === 'datahub') return undefined;
    const id = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
    });
    return () => window.cancelAnimationFrame(id);
  }, [viewMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'descending' });
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [rankMetric, setRankMetric] = usePersistedState(`${STORAGE_KEY}-rankMetric`, 'marketCap');
  const [groupBy, setGroupBy] = usePersistedState(`${STORAGE_KEY}-groupBy`, 'market');
  const [sizeDensity, setSizeDensity] = usePersistedState(`${STORAGE_KEY}-sizeDensity`, 'auto');
  const [colorByPerf, setColorByPerf] = useState(false);
  const [hydrated] = useState(hydrateInitialState);
  const [marketUniverse, setMarketUniverse] = useState(hydrated.universe);
  const [dataTimestamp, setDataTimestamp] = useState(hydrated.stamp);
  const [isRefreshing, setIsRefreshing] = useState(false);
  /** After user ▶ refresh, prefer local universe over hub centralQuotes overlay. */
  const [preferLocalQuotes, setPreferLocalQuotes] = useState(false);
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
  const beaCtx = dataCtx?.getMarket?.('bea');
  const wbCtx = dataCtx?.getMarket?.('worldbank');
  const hasBeaProfits = hasBeaCorporateProfitsRows(beaCtx?.data);
  const hasWbMcap = hasWbMarketCapRows(wbCtx?.data?.countries);
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
    // Auto-discovery sidecar: inject IPO discoveries from the nightly RTDB job.
    // Only *latest* is read — names that fall out of Finnhub's 45-day window
    // used to disappear on the next refresh (SPCX vanished 2026-07-28). Promote
    // permanent names into stockUniverse.js; the scheduled job now also merges
    // prior discoveries for 90 days so the sidecar is sticky.
    fetch('https://kfinance032926-default-rtdb.firebaseio.com/marketSnapshots/universeUpdates/latest.json')
      .then(res => res.json())
      .then(payload => {
        if (!payload || !payload.data || !payload.data.updates || !payload.data.updates.length) return;

        setMarketUniverse(prevUniverse => {
          const newUniverse = [...prevUniverse];
          const usRegionIndex = newUniverse.findIndex(r => r.name.includes('USA'));
          if (usRegionIndex === -1) return prevUniverse;

          const usRegion = { ...newUniverse[usRegionIndex], children: [...newUniverse[usRegionIndex].children] };

          const existingTickers = new Set();
          newUniverse.forEach(r => r.children.forEach(c => {
            if (c?.name) existingTickers.add(String(c.name).toUpperCase());
          }));

          let added = 0;
          payload.data.updates.forEach(newStock => {
            const sym = String(newStock?.name || '').toUpperCase();
            if (!sym || existingTickers.has(sym)) return;
            const entry = {
              ...newStock,
              name: sym,
              itemStyle: newStock.itemStyle || {
                color: 'transparent',
                borderWidth: 2,
                borderColor: '#06b6d4',
                borderType: 'dashed',
              },
            };
            usRegion.children.push(entry);
            existingTickers.add(sym);
            added++;
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

  /**
   * Single data plane: footer ▶ only force-lives /api/equities via DataProvider.
   * centralQuotes (from hub bag) re-merge into heatmap/list — no parallel /api/stocks.
   */
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setPreferLocalQuotes(false);
    setSnapshotQuotes(null);
    setSnapshotDate(null);
    setTimeTravelActive(false);
    try {
      if (typeof dataCtx?.refetchSingle === 'function') {
        await dataCtx.refetchSingle('equities');
      } else {
        // Fallback if context missing (tests / isolated mount)
        fetchIndexQuotes();
        await api.get('/api/equities?refresh=true').catch(() => null);
      }
      const stamp = `Fetched · /api/equities · ${formatTimestamp(new Date())}`;
      setDataTimestamp(stamp);
    } catch (err) {
      console.warn('[EquitiesMarket] refresh failed:', err?.message || err);
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, dataCtx, fetchIndexQuotes]);

  // When hub bag updates (wave or ▶), persist compact quotes for offline paint.
  useEffect(() => {
    if (!centralQuotes || snapshotQuotes) return;
    const stamp = dataTimestamp || centralData?.fetchedOn || formatTimestamp(new Date());
    const map = loadDailyMap();
    const today = todayStr();
    map[today] = { stamp, quotes: { ...(map[today]?.quotes || {}), ...centralQuotes } };
    saveDailyMap(map);
    putIDBSnapshot({
      marketId: 'equities',
      date: today,
      stamp,
      data: { quotes: map[today].quotes },
      lastUpdated: stamp,
      isLive: !!centralData?.isLive,
      isCurrent: centralData?.isCurrent !== false,
    });
  }, [centralQuotes, snapshotQuotes, dataTimestamp, centralData?.fetchedOn, centralData?.isLive, centralData?.isCurrent]);

  // Indices: prefer hub bag indices over ad-hoc /api/stocks when present.
  useEffect(() => {
    const idx = centralSnapshot?.indices;
    if (idx && typeof idx === 'object' && Object.keys(idx).length) {
      setIndexQuotes((prev) => ({ ...idx, ...(prev || {}) }));
    }
  }, [centralSnapshot?.indices]);

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
    if (!quoteLayer) return marketUniverse;
    return applyQuotesToUniverse(marketUniverse, quoteLayer, {
      preferLocal: !snapshotQuotes && preferLocalQuotes,
    });
  }, [marketUniverse, snapshotQuotes, centralQuotes, preferLocalQuotes]);

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
      item.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.region.toLowerCase().includes(searchQuery.toLowerCase())
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
  // Expansion queue: only show names not already in the static heatmap universe
  // (or already injected). Avoids "SPCX is a candidate" when it is already listed.
  const universeUpdates = useMemo(() => {
    const known = new Set();
    for (const region of marketUniverse || []) {
      for (const child of region.children || []) {
        if (child?.name) known.add(String(child.name).toUpperCase());
      }
    }
    const raw = universeCtx?.data?.updates || [];
    return raw.filter((row) => {
      const t = String(row?.name || row?.symbol || '').toUpperCase();
      return t && !known.has(t);
    });
  }, [universeCtx?.data?.updates, marketUniverse]);

    // Synthetic fetchLog so DataFooter's click-to-open popover has something
    // to render. Without this, open() bails on `fetchLog.length === 0` and
    // clicking the FETCHED bar appears to do nothing.
    const quotesFetchLog = centralData?.fetchLog?.length
      ? centralData.fetchLog
      : [{
        time: dataTimestamp,
        url: '/api/equities',
        status: dataTimestamp && dataTimestamp !== STATIC_DATA_TIMESTAMP ? 200 : 0,
        sources: {
          'Yahoo Finance · /api/equities': {
            _source: 'Yahoo Finance',
            _description: 'Single data plane: equity + index quotes from App Hosting /api/equities (disk/GCS cache-first; ▶ force-live).',
          },
          'Stock universe (local)': {
            _source: 'src/data/stockUniverse.js',
            _description: 'Static base universe — sectors, regions, fundamentals — overlaid with hub quotes.',
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
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing || !!centralData?.isRefreshing}
      />
    );

    const sidebarBody = selectedTicker ? (
      <DetailPanel
        selectedTicker={selectedTicker}
        setSelectedTicker={setSelectedTicker}
        currentRate={currentRate}
        currentSymbol={currentSymbol}
      />
    ) : (
      <div className="eq-summary">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
          <button
            type="button"
            className="eq-refresh-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh market data"
          >
            {isRefreshing ? '⟳' : '▶'}
          </button>
        </div>
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
    );

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

  const kpiBody = (
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
  );

  const filingActivityTotal = filingActivityCtx?.data?.total || 0;
  const filingActivityTickers = filingActivityCtx?.data?.tickerCount || 0;
  const materialFilings = filingActivityCtx?.data?.material || [];
  const insiderFilings = filingActivityCtx?.data?.insider || [];
  const earningsFilings = filingActivityCtx?.data?.earnings || [];
  const activistFilings = filingActivityCtx?.data?.activist || [];

  const secFundamentalsBody = edgarRows.length > 0 ? (
    <SecMegaCapFundamentalsPanel rows={edgarRows} summary={edgarSummary} />
  ) : null;

  const secFilingsBody = (filingActivityTotal > 0 || Object.keys(filingActivityCtx?.data?.byTicker || {}).length > 0) ? (
    <SecFilingActivityPanel
      byTicker={filingActivityCtx?.data?.byTicker || {}}
      byType={filingActivityCtx?.data?.byType || {}}
      total={filingActivityTotal}
      tickerCount={filingActivityTickers}
      material={materialFilings}
      insider={insiderFilings}
      earnings={earningsFilings}
      activist={activistFilings}
    />
  ) : null;

  const universeUpdatesBody = universeUpdates.length > 0 ? (
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
  ) : null;

  const heatmapBody = (
    <div
      className="eq-heatmap-body"
      onMouseDown={stopDrag}
      style={{
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 240,
        minWidth: 0,
        overflow: 'hidden',
      }}
    >
      <HeatmapView
        data={heatmapData}
        currentRate={currentRate}
        currentSymbol={currentSymbol}
        currency={currency}
        rankMetric={rankMetric}
        groupBy={groupBy}
        colorByPerf={colorByPerf}
        density={sizeDensity}
        onSelect={handleSelectTicker}
      />
    </div>
  );

  const portfolioBody = (
    <PortfolioTracker
      universeQuotes={displayUniverse}
      onTickerSelect={handleSelectTicker}
    />
  );

  // Shared footer wiring for every equities MarketPanelGrid (heatmap ▶ included).
  const equitiesProvenance = useMemo(() => ({
    timestamp: dataTimestamp,
    isCurrent: !snapshotDate,
    fetchedOn: dataTimestamp,
    fetchLog: quotesFetchLog,
    onRefresh: handleRefresh,
    isRefreshing: isRefreshing || !!centralData?.isRefreshing,
  }), [dataTimestamp, snapshotDate, quotesFetchLog, handleRefresh, isRefreshing, centralData?.isRefreshing]);

  const makeEquitiesCtx = (bodies, extraLive = {}, extraSubtitle = {}, extraSource = {}) => ({
    __render: (panelId) => bodies[panelId] ?? null,
    __live: {
      kpi: indexIsLive,
      heatmap: !snapshotDate,
      sidebar: !snapshotDate,
      portfolio: true,
      'sec-fundamentals': !!edgarCtx?.data?.isLive,
      'sec-filings': !!filingActivityCtx?.data?.isLive,
      'universe-updates': !!universeCtx?.data?._sources?.universeUpdates,
      'bea-corporate-profits': hasBeaProfits,
      'wb-market-cap': hasWbMcap,
      ...extraLive,
    },
    __subtitle: {
      kpi: 'US · Intl · China & HK · Risk · Sectors — live Yahoo Finance quotes · hover/click pill for 3-month chart',
      heatmap: `${flatData.length} equities · ${groupBy === 'sectorGlobal' ? 'global sectors' : groupBy === 'sectorInMarket' ? 'sectors by market' : 'by market'}${snapshotDate ? ` · ${snapshotDate}` : ''}`,
      sidebar: selectedTicker
        ? (selectedTicker.isLoading ? 'Loading live quote…' : (selectedTicker.isLive ? 'Live Yahoo quote' : 'Static fundamentals'))
        : `FX ${ratesLive ? 'live' : 'fallback'}`,
      portfolio: 'Add holdings · live Yahoo quotes · allocation',
      'sec-fundamentals': edgarRows.length > 0
        ? `${edgarSummary.count} cos · ${edgarSummary.profitable}/${edgarSummary.count} profitable · ${edgarSummary.gradeA || 0} grade A`
        : undefined,
      'sec-filings': `${filingActivityTotal} filings · ${filingActivityTickers} tickers`,
      'universe-updates': universeUpdates.length > 0
        ? `${universeUpdates.length} discovered listings · review candidates`
        : undefined,
      'bea-corporate-profits': 'Corporate profits · real GDP growth · personal saving rate',
      'wb-market-cap': 'Listed equity market size · GDP · inflation · trade by country',
      ...extraSubtitle,
    },
    __source: {
      kpi: 'Yahoo Finance',
      heatmap: snapshotDate ? 'Yahoo Finance snapshot' : 'Yahoo Finance',
      sidebar: snapshotDate ? 'Yahoo Finance snapshot' : 'Yahoo Finance',
      portfolio: 'Yahoo Finance',
      'sec-fundamentals': 'SEC EDGAR XBRL',
      'sec-filings': 'SEC EDGAR',
      'universe-updates': 'Finnhub / Yahoo Finance',
      'bea-corporate-profits': 'Bureau of Economic Analysis (NIPA)',
      'wb-market-cap': 'World Bank WDI',
      ...extraSource,
    },
    __disabled: {
      'bea-corporate-profits': !hasBeaProfits,
      'wb-market-cap': !hasWbMcap,
    },
  });

  return (
    <div className="eq-dashboard eq-dashboard--bento" role="region" aria-label="Equities">
      <Header
        viewMode={viewMode} setViewMode={setViewMode}
        rankMetric={rankMetric} setRankMetric={setRankMetric}
        groupBy={groupBy} setGroupBy={setGroupBy}
        colorByPerf={colorByPerf} setColorByPerf={setColorByPerf}
        sizeDensity={sizeDensity} setSizeDensity={setSizeDensity}
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
      ) : (
        <>
          {/* Keep-alive RGL panes: hide inactive views instead of unmounting.
              Unmount/remount on every List↔Heatmap switch was the main "twitch". */}
          {viewMounted('list') && (
          <div
            className={`eq-view-pane${viewMode === 'list' ? ' is-active' : ''}`}
            aria-hidden={viewMode !== 'list'}
          >
            {/* list-main / detail-sidebar are view-only slots (not MARKET_PANELS). */}
            <MarketPanelGrid
              marketId="equities"
              layout={LIST_LAYOUT}
              storageKey="equities-list-layout-v10"
              accent="equities"
              only={['kpi']}
              ctx={makeEquitiesCtx({ kpi: kpiBody })}
              provenance={{
                ...equitiesProvenance,
                timestamp: indexLastUpdated || dataTimestamp,
                fetchLog: indexFetchLog || equitiesProvenance.fetchLog,
              }}
              extra={[
                <div key="list-main" className="eq-bento-card bento-card">
                  <div className="eq-panel-title-row bento-panel-title-row">
                    <span className="eq-panel-title">Equity List</span>
                    <span className="eq-panel-subtitle">
                      {processedData.length} equities · click a row for detail
                      {snapshotDate ? ` · snapshot ${snapshotDate}` : ''}
                    </span>
                  </div>
                  <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
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
                </div>,
                <div key="detail-sidebar" className="eq-bento-card eq-list-detail bento-card">
                  <div className="eq-panel-title-row bento-panel-title-row">
                    <span className="eq-panel-title">
                      {selectedTicker
                        ? `Detail · ${selectedTicker.ticker || selectedTicker.fullName || '—'}`
                        : 'Detail'}
                    </span>
                    {selectedTicker && (
                      <span className="eq-panel-subtitle">
                        {selectedTicker.isLoading ? 'loading…' : selectedTicker.fullName || ''}
                      </span>
                    )}
                  </div>
                  <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
                    {selectedTicker ? (
                      <DetailPanel
                        selectedTicker={selectedTicker}
                        setSelectedTicker={setSelectedTicker}
                        currentRate={currentRate}
                        currentSymbol={currentSymbol}
                      />
                    ) : (
                      <div className="eq-summary">
                        <div className="eq-hint" style={{ padding: '24px 12px', fontStyle: 'normal' }}>
                          Select a ticker from the list to load live quote, fundamentals, and history.
                        </div>
                        <div className="eq-stat-card">
                          <div className="eq-stat-label">Equities in view</div>
                          <div className="eq-stat-value">{processedData.length}</div>
                        </div>
                        <div className="eq-stat-card">
                          <div className="eq-stat-label">Global mkt cap ({currency})</div>
                          <div className="eq-stat-value">
                            {currentSymbol}{(globalValCap * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })} B
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>,
              ]}
            />
          </div>
          )}

          {viewMounted('heatmap') && (
          <div
            className={`eq-view-pane${viewMode === 'heatmap' ? ' is-active' : ''}`}
            aria-hidden={viewMode !== 'heatmap'}
          >
            <MarketPanelGrid
              marketId="equities"
              layout={HEATMAP_LAYOUT}
              storageKey="equities-heatmap-layout-v10"
              accent="equities"
              only={[
                'kpi', 'heatmap', 'sidebar',
                'sec-fundamentals', 'sec-filings', 'universe-updates',
                'bea-corporate-profits', 'wb-market-cap',
              ]}
              ctx={makeEquitiesCtx({
                kpi: kpiBody,
                heatmap: heatmapBody,
                sidebar: sidebarBody,
                'sec-fundamentals': secFundamentalsBody,
                'sec-filings': secFilingsBody,
                'universe-updates': universeUpdatesBody,
                'bea-corporate-profits': <BeaCorporateProfitsPanel />,
                'wb-market-cap': <WorldBankMarketCapPanel />,
              })}
              provenance={equitiesProvenance}
            />
          </div>
          )}

          {viewMounted('portfolio') && (
          <div
            className={`eq-view-pane${viewMode === 'portfolio' ? ' is-active' : ''}`}
            aria-hidden={viewMode !== 'portfolio'}
          >
            <MarketPanelGrid
              marketId="equities"
              layout={PORTFOLIO_LAYOUT}
              storageKey="equities-portfolio-layout-v10"
              accent="equities"
              only={['kpi', 'portfolio']}
              ctx={makeEquitiesCtx({
                kpi: kpiBody,
                portfolio: portfolioBody,
              })}
              provenance={equitiesProvenance}
            />
          </div>
          )}

          {viewMounted('race') && (
          <div
            className={`eq-view-pane${viewMode === 'race' ? ' is-active' : ''}`}
            aria-hidden={viewMode !== 'race'}
          >
            <MarketPanelGrid
              marketId="equities"
              layout={RACE_LAYOUT}
              storageKey="equities-race-layout-v10"
              accent="equities"
              only={['kpi', 'sidebar']}
              ctx={makeEquitiesCtx({
                kpi: kpiBody,
                sidebar: sidebarBody,
              })}
              provenance={equitiesProvenance}
              extra={(
                <div key="race" className="eq-bento-card bento-card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="eq-panel-title-row bento-panel-title-row">
                    <span className="eq-panel-title">Bar Race</span>
                    <span className="eq-panel-subtitle">Top 30 by market cap · colored by {groupBy === 'market' ? 'region' : 'sector'}{snapshotDate ? ` · ${snapshotDate}` : ''}</span>
                  </div>
                  <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                    <TimeTravel onSnapshotSelect={handleSnapshotSelect} isActive={viewMode === 'race'} />
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
              )}
            />
          </div>
          )}
        </>
      )}
    </div>
  );
}
