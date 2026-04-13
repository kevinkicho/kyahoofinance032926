import React, { useState, useMemo, useRef, useCallback } from 'react';
import Header from '../../components/Header/Header';
import HeatmapView from '../../components/HeatmapView/HeatmapView';
import ListView from '../../components/ListView/ListView';
import Sidebar from '../../components/Sidebar/Sidebar';
import DetailPanel from '../../components/DetailPanel/DetailPanel';
import BarRaceView from '../../components/BarRaceView/BarRaceView';
import BentoWrapper from '../../components/BentoWrapper';
import { mockTreemapData } from '../../mockData';
import { currencySymbols } from '../../utils/constants';
import { useFrankfurterRates } from '../../utils/useFrankfurterRates';
import { getExtendedDetails } from '../../utils/dataHelpers';
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
    try { localStorage.setItem(key, v); } catch {}
  };
  return [value, persist];
}

const STORAGE_KEY = 'equities-view';

const HEATMAP_LAYOUT = {
  lg: [
    { i: 'heatmap', x: 0, y: 0, w: 8, h: 5 },
    { i: 'sidebar', x: 8, y: 0, w: 4, h: 5 },
  ]
};

const RACE_LAYOUT = {
  lg: [
    { i: 'race',   x: 0, y: 0, w: 8, h: 5 },
    { i: 'sidebar', x: 8, y: 0, w: 4, h: 5 },
  ]
};

const REFRESH_BATCH = 80;
const STATIC_DATA_TIMESTAMP = 'Apr 2, 2026 00:00:00 UTC';

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
  const [marketUniverse, setMarketUniverse] = useState(mockTreemapData);
  const [dataTimestamp, setDataTimestamp] = useState(STATIC_DATA_TIMESTAMP);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const allTickers = [];
    mockTreemapData.forEach(region => {
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
        setMarketUniverse(prev => prev.map(region => ({
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
            };
          }),
        })));
        setDataTimestamp(`Fetched · Yahoo Finance · ${now}`);
      })
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [isRefreshing]);

  const { rates, isLive: ratesIsLive, lastUpdated: ratesDate } = useFrankfurterRates();

  const currentRate = rates[currency] || 1;
  const currentSymbol = currencySymbols[currency] || '$';

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
    adjustedTreemapData.forEach(region => {
      region.children.forEach(stock => {
        arr.push({
          region: region.name,
          regionCurrency: region.currency,
          regionSymbol: region.symbol,
          regionColor: region.itemStyle.borderColor,
          ticker: stock.name,
          fullName: stock.fullName || stock.name,
          value: stock.value,
          adjustedValue: stock.adjustedValue,
          metricValue: stock.metricValue,
          marketCap: stock.marketCap,
          revenue: stock.revenue,
          netIncome: stock.netIncome,
          pe: stock.pe,
          divYield: stock.divYield,
          rank: stock.rank,
          sector: stock.sector,
          color: stock.itemStyle.color,
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
    const details = getExtendedDetails(tickerInfo, rates);
    setSelectedTicker({ ...tickerInfo, details, isLive: false, summaryData: null, historyData: null });

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

    let mergedDetails = { ...details };
    let isLive = false;

    if (quoteRes.status === 'fulfilled' && quoteRes.value.ok) {
      const liveData = await quoteRes.value.json();
      const live = liveData[tickerInfo.ticker];
      if (live) {
        isLive = true;
        mergedDetails = {
          ...mergedDetails,
          price:     live.price     != null ? `${sym}${live.price.toLocaleString()}` : mergedDetails.price,
          changeAmt: live.change    != null ? `${live.change >= 0 ? '+' : ''}${sym}${live.change.toFixed(2)}` : mergedDetails.changeAmt,
          changePct: live.changePct != null ? `${live.changePct >= 0 ? '+' : ''}${live.changePct.toFixed(2)}%` : mergedDetails.changePct,
          open:      live.open      != null ? `${sym}${live.open.toLocaleString()}` : mergedDetails.open,
          prevClose: live.prevClose != null ? `${sym}${live.prevClose.toLocaleString()}` : mergedDetails.prevClose,
          dayRange:  (live.dayLow && live.dayHigh) ? `${sym}${live.dayLow.toFixed(2)} – ${sym}${live.dayHigh.toFixed(2)}` : mergedDetails.dayRange,
          wk52Range: (live.weekLow52 && live.weekHigh52) ? `${sym}${live.weekLow52.toFixed(2)} – ${sym}${live.weekHigh52.toFixed(2)}` : mergedDetails.wk52Range,
          volume:    live.volume    != null ? live.volume.toLocaleString() : mergedDetails.volume,
          avgVol:    live.avgVolume != null ? live.avgVolume.toLocaleString() : mergedDetails.avgVol,
          marketCapNative: live.marketCap ? `${sym}${(live.marketCap / 1e12).toFixed(2)} T` : mergedDetails.marketCapNative,
          marketCapGlobal: live.marketCap ? `$${(live.marketCap / 1e9 / currentRate).toFixed(0)} B (Glob.)` : mergedDetails.marketCapGlobal,
          ...(!isCrypto && {
            bid:  live.bid  != null ? `${sym}${live.bid.toFixed(2)} × ${live.bidSize || ''}` : mergedDetails.bid,
            ask:  live.ask  != null ? `${sym}${live.ask.toFixed(2)} × ${live.askSize || ''}` : mergedDetails.ask,
            pe:   live.pe   != null ? live.pe.toFixed(2) : mergedDetails.pe,
            eps:  live.eps  != null ? `${sym}${live.eps.toFixed(2)}` : mergedDetails.eps,
            beta: live.beta != null ? live.beta.toFixed(2) : mergedDetails.beta,
          }),
        };
      }
    }

    const summaryData = (summaryRes.status === 'fulfilled' && summaryRes.value.ok)
      ? await summaryRes.value.json() : null;
    const historyData = (historyRes.status === 'fulfilled' && historyRes.value.ok)
      ? await historyRes.value.json() : null;

    if (selectionRef.current !== selectionId) return;
    setSelectedTicker(prev => ({ ...prev, details: mergedDetails, isLive, summaryData, historyData }));
  };

  const globalValCap = flatData.reduce((acc, curr) => acc + (curr.adjustedValue || curr.value), 0);

  const sidebarPanel = (
    <div key="sidebar" className="eq-bento-card">
      <div className="eq-panel-title-row bento-panel-title-row">
        <span className="eq-panel-title">{selectedTicker ? selectedTicker.ticker : 'Market Summary'}</span>
        {selectedTicker && (
          <button className="eq-close-btn" onClick={() => setSelectedTicker(null)}>✕</button>
        )}
      </div>
      <div className="eq-panel-content bento-panel-content eq-panel-scroll" onMouseDown={stopDrag}>
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
              <div className="eq-stat-value">{currentSymbol}{(globalValCap * currentRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} B</div>
            </div>
            <div className="eq-stat-card">
              <div className="eq-stat-label">Equities Tracked</div>
              <div className="eq-stat-value">{flatData.length}</div>
            </div>
            <div className="eq-stat-card">
              <div className="eq-stat-label">Regions</div>
              <div className="eq-stat-value">{marketUniverse.length}</div>
            </div>
            <div className="eq-stat-card">
              <div className="eq-stat-label">Rank Metric</div>
              <div className="eq-stat-value eq-stat-accent">{rankMetric === 'marketCap' ? 'Market Cap' : rankMetric === 'revenue' ? 'Revenue' : rankMetric === 'netIncome' ? 'Net Income' : rankMetric === 'pe' ? 'P/E Ratio' : 'Div Yield'}</div>
            </div>
            <div className="eq-stat-card">
              <div className="eq-stat-label">Grouping</div>
              <div className="eq-stat-value">{groupBy === 'market' ? 'By Market' : groupBy === 'sectorInMarket' ? 'Sector in Market' : 'Global Sector'}</div>
            </div>
            {ratesIsLive && (
              <div className="eq-stat-card eq-stat-live">
                <div className="eq-stat-label">FX Rates</div>
                <div className="eq-stat-value" style={{ fontSize: 11, color: '#60a5fa' }}>Fetched {ratesDate}</div>
              </div>
            )}
            <div className="eq-hint">Click any cell on the heatmap to view details</div>
          </div>
        )}
      </div>
      <div className="eq-panel-footer">
        {selectedTicker
? (selectedTicker.isLive ? `Fetched · Yahoo Finance · ${selectedTicker.details?.price || ''}` : 'Static data · Click ticker for quote')
        : <>{`Data as of ${dataTimestamp} · FX: ${ratesIsLive ? 'Fetched (ECB)' : 'Fallback'}`} <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button></>}
      </div>
    </div>
  );

  return (
    <div className="eq-dashboard eq-dashboard--bento">
      <Header
        viewMode={viewMode} setViewMode={setViewMode}
        rankMetric={rankMetric} setRankMetric={setRankMetric}
        groupBy={groupBy} setGroupBy={setGroupBy}
        colorByPerf={colorByPerf} setColorByPerf={setColorByPerf}
      />
      {viewMode === 'list' ? (
        <div className="eq-list-wrapper">
          <div className="eq-list-main">
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
            <div className="eq-list-footer">Data as of {dataTimestamp} · FX: {ratesIsLive ? 'Fetched (ECB)' : 'Fallback'} <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button></div>
          </div>
          {selectedTicker && (
            <div className="eq-detail-sidebar" onMouseDown={stopDrag}>
              <DetailPanel
                selectedTicker={selectedTicker}
                setSelectedTicker={setSelectedTicker}
                currentRate={currentRate}
                currentSymbol={currentSymbol}
              />
            </div>
          )}
        </div>
      ) : viewMode === 'heatmap' ? (
        <BentoWrapper layout={HEATMAP_LAYOUT} storageKey="equities-heatmap-layout">
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
            <div className="eq-panel-footer">Data as of {dataTimestamp} <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button></div>
          </div>
          {sidebarPanel}
        </BentoWrapper>
      ) : (
        <BentoWrapper layout={RACE_LAYOUT} storageKey="equities-race-layout">
          <div key="race" className="eq-bento-card">
            <div className="eq-panel-title-row bento-panel-title-row">
              <span className="eq-panel-title">Bar Race</span>
              <span className="eq-panel-subtitle">Top 30 · colored by {groupBy === 'market' ? 'region' : 'sector'}</span>
            </div>
            <div className="eq-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <BarRaceView
                flatData={flatData}
                currentRate={currentRate}
                currentSymbol={currentSymbol}
                currency={currency}
                groupBy={groupBy}
              />
            </div>
            <div className="eq-panel-footer">Data as of {dataTimestamp} <button className="eq-refresh-btn" onClick={handleRefresh} disabled={isRefreshing} title="Refresh market data">{isRefreshing ? '⟳' : '▶'}</button></div>
          </div>
          {sidebarPanel}
        </BentoWrapper>
      )}
    </div>
  );
}