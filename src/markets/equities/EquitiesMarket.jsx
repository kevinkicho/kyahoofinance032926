import React, { useState, useMemo, useRef } from 'react';
import Header from '../../components/Header/Header';
import HeatmapView from '../../components/HeatmapView/HeatmapView';
import ListView from '../../components/ListView/ListView';
import Sidebar from '../../components/Sidebar/Sidebar';
import { mockTreemapData } from '../../mockData';
import { currencySymbols } from '../../utils/constants';
import { useFrankfurterRates } from '../../utils/useFrankfurterRates';
import { getExtendedDetails } from '../../utils/dataHelpers';
import BarRaceView from '../../components/BarRaceView/BarRaceView';


export default function EquitiesMarket({ currency, setCurrency }) {
  const [viewMode, setViewMode] = useState('heatmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'descending' });
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [rankMetric, setRankMetric] = useState('marketCap');
  const [groupBy, setGroupBy] = useState('market');
  const [colorByPerf, setColorByPerf] = useState(false);
  const [marketUniverse] = useState(mockTreemapData);

  const { rates, isLive: ratesIsLive, lastUpdated: ratesDate } = useFrankfurterRates();

  const currentRate = rates[currency] || 1;
  const currentSymbol = currencySymbols[currency] || '$';

  // Pick the treemap sizing metric
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

  // Rank-based palette
  const RANK_PALETTE = [
    '#f59e0b', '#22c55e', '#3b82f6', '#ef4444', '#a855f7',
    '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#8b5cf6',
    '#14b8a6', '#f43f5e', '#0ea5e9', '#eab308', '#10b981',
    '#fb923c', '#818cf8', '#e879f9', '#4ade80', '#38bdf8',
  ];
  const rankColorFn = (rank) => RANK_PALETTE[(rank - 1) % RANK_PALETTE.length];

  // Processed Treemap
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

  // Reorganize treemap data for sector views
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

  // Flatten for list view
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

  return (
    <div className="app-container">
      <Header
        viewMode={viewMode} setViewMode={setViewMode}
        rankMetric={rankMetric} setRankMetric={setRankMetric}
        groupBy={groupBy} setGroupBy={setGroupBy}
        colorByPerf={colorByPerf} setColorByPerf={setColorByPerf}
      />
      <main className="main-content">
        <div className="view-container">
          {viewMode === 'heatmap' && (
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
          )}
          {viewMode === 'race' && (
            <BarRaceView
              flatData={flatData}
              currentRate={currentRate}
              currentSymbol={currentSymbol}
              currency={currency}
              groupBy={groupBy}
            />
          )}
          {viewMode === 'list' && (
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
          )}
        </div>
        <Sidebar
          selectedTicker={selectedTicker} setSelectedTicker={setSelectedTicker} flatData={flatData}
          currentRate={currentRate} currentSymbol={currentSymbol} currency={currency}
          rates={rates} ratesIsLive={ratesIsLive} ratesDate={ratesDate}
        />
      </main>
    </div>
  );
}