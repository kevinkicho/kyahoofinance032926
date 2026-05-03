import React, { useState, useMemo, useRef, useCallback } from 'react';
import Header from '../../components/Header/Header';
import HeatmapView from '../../components/HeatmapView/HeatmapView';
import ListView from '../../components/ListView/ListView';
import Sidebar from '../../components/Sidebar/Sidebar';
import DetailPanel from '../../components/DetailPanel/DetailPanel';
import BarRaceView from '../../components/BarRaceView/BarRaceView';
import TimeTravel from '../../components/TimeTravel/TimeTravel';
import DataHubView from '../../components/DataHubView/DataHubView';
import BentoWrapper from '../../components/BentoWrapper';
import DataFooter from '../../components/DataFooter/DataFooter';
import { stockUniverseData } from '../../data/stockUniverse';
import { currencySymbols } from '../../utils/constants';
import { useCurrency } from '../../hub/CurrencyContext';
import { putSnapshot as putIDBSnapshot } from '../../utils/snapshotDB';
import MarketKpiStrip from '../../components/MarketKpiStrip';
import MetricValue from '../../components/MetricValue/MetricValue';

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

const INDEX_TICKERS = ['^GSPC', '^IXIC', '^DJI', '^RUT'];
const INDEX_LABELS = { '^GSPC': 'S&P 500', '^IXIC': 'Nasdaq', '^DJI': 'Dow Jones', '^RUT': 'Russell 2K' };

// rowHeight is 120px in BentoWrapper, so h:5 = 600px and h:6 = 720px.
// h:5 was leaving ~80px of empty vertical space below the heatmap panel
// on a typical 900px viewport once the tab bar / KPI strip / filter row /
// panel header were accounted for. Bumping to h:6 fills that gap without
// forcing the page to scroll.
// KPI strip (S&P 500 / NASDAQ / Dow / Russell 2K) is now a real bento
// child at row 0 (h:2). All view-mode layouts include it as the first
// entry; the rest shift down 2 rows. Storage keys bumped.
const HEATMAP_LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 2 },
    { i: 'heatmap', x: 0, y: 2, w: 8,  h: 6 },
    { i: 'sidebar', x: 8, y: 2, w: 4,  h: 6 },
  ]
};

const RADAR_LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 2 },
    { i: 'radar',   x: 0, y: 2, w: 8,  h: 6 },
    { i: 'sidebar', x: 8, y: 2, w: 4,  h: 6 },
  ]
};

const RACE_LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 2 },
    { i: 'race',   x: 0,  y: 2, w: 8,  h: 6 },
    { i: 'sidebar', x: 8, y: 2, w: 4,  h: 6 },
  ]
};

const LIST_LAYOUT = {
  lg: [
    { i: 'kpi',            x: 0, y: 0, w: 12, h: 2 },
    { i: 'list-main',      x: 0, y: 2, w: 8,  h: 6 },
    { i: 'detail-sidebar', x: 8, y: 2, w: 4,  h: 6 },
  ]
};

const ML_LAYOUT = {
  lg: [
    { i: 'kpi',         x: 0, y: 0, w: 12, h: 2 },
    { i: 'ml-explorer', x: 0, y: 2, w: 8,  h: 6 },
    { i: 'sidebar',     x: 8, y: 2, w: 4,  h: 6 },
  ]
};

// PORTFOLIO_LAYOUT was previously referenced but undefined — pre-existing
// ReferenceError in the Portfolio sub-tab. Now defined alongside the KPI.
const PORTFOLIO_LAYOUT = {
  lg: [
    { i: 'kpi',       x: 0, y: 0, w: 12, h: 2 },
    { i: 'portfolio', x: 0, y: 2, w: 12, h: 6 },
  ]
};

const REFRESH_BATCH = 80;
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
      if (stock.weekHigh52 != null) q.wh = stock.weekHigh52;
      if (stock.weekLow52 != null) q.wl = stock.weekLow52;
      if (Object.keys(q).length) out[stock.name] = q;
    }
  }
  return out;
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
        ...(q.p  != null && { price: q.p }),
        ...(q.c  != null && { change: q.c }),
        ...(q.cp != null && { changePct: q.cp }),
        ...(q.wh != null && { weekHigh52: q.wh }),
        ...(q.wl != null && { weekLow52: q.wl }),
      };
    }),
  }));
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

export default function EquitiesMarket({ currency, setCurrency }) {
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

  const handleSnapshotSelect = useCallback((quotes, date, stamp) => {
    if (!quotes) {
      setSnapshotQuotes(null);
      setSnapshotDate(null);
      setTimeTravelActive(false);
      return;
    }
    setSnapshotQuotes(quotes);
    setSnapshotDate(date);
    setDataTimestamp(stamp || date);
    setTimeTravelActive(true);
  }, []);

  const fetchIndexQuotes = useCallback(() => {
    fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers: INDEX_TICKERS }),
    })
      .then(r => r.json())
      .then(data => setIndexQuotes(data))
      .catch(() => {});
  }, []);

  React.useEffect(() => { fetchIndexQuotes(); }, [fetchIndexQuotes]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchIndexQuotes();
    const allTickers = [];
    stockUniverseData.forEach(region => {
      region.children.forEach(stock => {
        if (stock.name && stock.sector !== 'Crypto') allTickers.push(stock.name);
      });
    });
    const topTickers = allTickers.slice(0, REFRESH_BATCH);
    fetch('/api/stocks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers: topTickers }),
    })
      .then(r => r.json())
      .then(quotes => {
        const now = formatTimestamp(new Date());
        const stamp = `Fetched · Yahoo Finance · ${now}`;
        setMarketUniverse(prev => {
          const next = prev.map(region => ({
            ...region,
            children: region.children.map(stock => {
              const q = quotes[stock.name];
              if (!q) return stock;
              const liveCap = q.marketCap ? q.marketCap / 1e9 : stock.marketCap;
              return {
                ...stock,
                marketCap: liveCap || stock.marketCap,
                value: liveCap || stock.value,
                ...(q.changePct != null && { changePct: q.changePct }),
                ...(q.price != null && { price: q.price }),
                ...(q.change != null && { change: q.change }),
                ...(q.weekHigh52 != null && { weekHigh52: q.weekHigh52 }),
                ...(q.weekLow52 != null && { weekLow52: q.weekLow52 }),
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
  }, [isRefreshing]);

  const { rates: fxRates, currentRate, currentSymbol, ratesLive } = useCurrency();

  const getMetricValue = (stock, metric) => {
    if (metric === 'revenue')    return Math.max(stock.revenue   || 0.1, 0.1);
    if (metric === 'netIncome')  return Math.max(stock.netIncome || 0.1, 0.1);
    if (metric === 'pe')         return stock.marketCap || stock.value || 1;
    if (metric === 'divYield')   return stock.marketCap || stock.value || 1;
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

  const adjustedTreemapData = useMemo(() => {
    return marketUniverse.map(region => {
      const withAdjusted = region.children.map(stock => {
        const metricValue = (rankMetric === 'revenue' || rankMetric === 'netIncome')
          ? getMetricValue(stock, rankMetric)
          : stock.marketCap || stock.value || 1;
        return { ...stock, adjustedValue: stock.marketCap || stock.value, metricValue };
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
  }, [marketUniverse, rankMetric]);

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
    const source = snapshotQuotes ? (() => {
      const map = {};
      adjustedTreemapData.forEach(region => {
        region.children.forEach(stock => {
          const q = snapshotQuotes[stock.name];
          if (q) {
            const liveCap = q.mc != null ? q.mc : stock.marketCap;
            map[stock.name] = {
              ...stock,
              marketCap: liveCap || stock.marketCap,
              value: liveCap || stock.value,
              adjustedValue: liveCap || stock.adjustedValue,
              changePct: q.cp != null ? q.cp : stock.changePct,
              price: q.p != null ? q.p : stock.price,
              change: q.c != null ? q.c : stock.change,
            };
          } else {
            map[stock.name] = stock;
          }
        });
      });
      return map;
    })() : null;

    adjustedTreemapData.forEach(region => {
      region.children.forEach(stock => {
        const s = source ? source[stock.name] : stock;
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
  }, [adjustedTreemapData, snapshotQuotes]);

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
      fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [tickerInfo.ticker] })
      }),
      fetch(`/api/summary/${enc}?region=${encodeURIComponent(tickerInfo.region || '')}`),
      fetch(`/api/history/${enc}?period=5y&region=${encodeURIComponent(tickerInfo.region || '')}`),
    ]);

    let mergedDetails = {};
    let isLive = false;

    if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
      const liveData = await quoteRes.value.json();
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
          marketCapGlobal: live.marketCap ? `$${(live.marketCap / 1e9 / currentRate).toFixed(0)} B (Glob.)` : '—',
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

    const summaryData = (summaryRes.status === 'fulfilled' && summaryRes.value.ok)
      ? await summaryRes.value.json() : null;
    const historyData = (historyRes.status === 'fulfilled' && historyRes.value.ok)
      ? await historyRes.value.json() : null;

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

    const commonFooter = (
      <DataFooter 
        source="Yahoo Finance" 
        timestamp={dataTimestamp} 
        isLive={true} 
        isCurrent={true}
        fetchedOn={dataTimestamp}
      />
    );

    const sidebarPanel = (
      <div key="sidebar" className="eq-bento-card">
        <div className="eq-panel-title-row bento-panel-title-row">
          <span className="eq-panel-title">Market Summary</span>
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
        </div>
        <div className="eq-panel-footer">
          {selectedTicker
            ? (selectedTicker.isLoading ? 'Loading live data…' : (selectedTicker.isLive ? `Fetched · Yahoo Finance` : 'Static data · Click ticker for quote'))
            : <>{`Data as of ${dataTimestamp} · FX: ${ratesLive ? 'Fetched (ECB)' : 'Fallback'}`} <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button></>}
          {commonFooter}
        </div>
      </div>
    );

  // KPI strip becomes a real bento child rendered as the first item of
  // each view-mode's BentoWrapper. Same content regardless of view mode,
  // so render it once into a variable and reuse.
  const kpiBentoCard = (
    <div key="kpi" className="eq-bento-card">
      <div className="eq-panel-title-row bento-panel-title-row">
        <span className="eq-panel-title">Key Indices</span>
        <span className="eq-panel-subtitle">S&P 500 · NASDAQ · Dow · Russell 2000 — live Yahoo Finance quotes</span>
      </div>
      <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
        <MarketKpiStrip
          kpis={INDEX_TICKERS.map(tk => {
            const q = indexQuotes?.[tk];
            const label = INDEX_LABELS[tk];
            const price = q?.price;
            const changePct = q?.changePct;
            const change = q?.change;
            const hasData = price != null;
            const seriesKey = { '^GSPC': 'sp500', '^IXIC': 'nasdaq', '^DJI': 'dowJones', '^RUT': 'russell2k' }[tk];
            return {
              label,
              rawValue: price,
              value: hasData ? price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
              format: v => typeof v === 'number' ? v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—',
              seriesKey,
              color: hasData ? (changePct >= 0 ? '#4ade80' : '#f87171') : 'var(--text-primary)',
              trend: hasData ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : null,
              sublabel: hasData ? `(${change >= 0 ? '+' : ''}${change.toFixed(2)})` : 'no data',
            };
          })}
          bare
        />
      </div>
    </div>
  );

  return (
    <div className="eq-dashboard eq-dashboard--bento" role="region" aria-label="Equities">
      <Header
        viewMode={viewMode} setViewMode={setViewMode}
        rankMetric={rankMetric} setRankMetric={setRankMetric}
        groupBy={groupBy} setGroupBy={setGroupBy}
        colorByPerf={colorByPerf} setColorByPerf={setColorByPerf}
      />
      {viewMode === 'datahub' ? (
        <DataHubView
          flatData={flatData}
          currentRate={currentRate}
          currentSymbol={currentSymbol}
          currency={currency}
          onRowClick={handleSelectTicker}
        />
      ) : viewMode === 'ml-explorer' ? (
        <BentoWrapper layout={ML_LAYOUT} storageKey="equities-ml-layout-v2">
          {kpiBentoCard}
          <div key="ml-explorer" className="eq-bento-card">
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">ML Explorer</span>
              <span className="eq-panel-subtitle">AI-driven factor analysis</span>
            </div>
            <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <MLExplorer
                flatData={flatData}
                onTickerSelect={handleSelectTicker}
              />
            </div>
          </div>
          {sidebarPanel}
        </BentoWrapper>
      ) : viewMode === 'list' ? (
        <BentoWrapper layout={LIST_LAYOUT} storageKey="equities-list-layout-v2">
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
        <BentoWrapper layout={HEATMAP_LAYOUT} storageKey="equities-heatmap-layout-v2">
          {kpiBentoCard}
          <div key="heatmap" className="eq-bento-card">
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">Equity Heatmap</span>
              <span className="eq-panel-subtitle">{flatData.length} equities · {groupBy === 'sectorGlobal' ? 'global sectors' : groupBy === 'sectorInMarket' ? 'sectors by market' : 'by market'}</span>
            </div>
            <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <HeatmapView
                data={heatmapData}
                currentRate={currentRate}
                currentSymbol={currentSymbol}
                currency={currency}
                rankMetric={rankMetric}
                groupBy={groupBy}
                colorByPerf={colorByPerf}
                onSelect={handleSelectTicker}
              />
            </div>
            <div className="eq-panel-footer">
              {commonFooter}
              <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button>
            </div>
          </div>
          {sidebarPanel}
        </BentoWrapper>
      ) : viewMode === 'portfolio' ? (
        <BentoWrapper layout={PORTFOLIO_LAYOUT} storageKey="equities-portfolio-layout-v2">
          {kpiBentoCard}
          <div key="portfolio" className="eq-bento-card">
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">Portfolio Tracker</span>
              <span className="eq-panel-subtitle">Add holdings · allocation pie · weighted return</span>
            </div>
            <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <PortfolioTracker indexQuotes={indexQuotes} onTickerSelect={handleSelectTicker} />
            </div>
          </div>
          {sidebarPanel}
        </BentoWrapper>
      ) : viewMode === 'radar' ? (
        <BentoWrapper layout={RADAR_LAYOUT} storageKey="equities-radar-layout-v2">
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
        <BentoWrapper layout={RACE_LAYOUT} storageKey="equities-race-layout-v2">
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