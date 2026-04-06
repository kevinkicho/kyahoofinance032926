import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from '../../components/Header/Header';
import HeatmapView from '../../components/HeatmapView/HeatmapView';
import ListView from '../../components/ListView/ListView';
import PortfolioView from '../../components/PortfolioView/PortfolioView';
import RadarView from '../../components/RadarView/RadarView';
import ModelExplorer from '../../components/ModelExplorer/ModelExplorer';
import DataHub from '../../components/DataHub/DataHub';
import Sidebar from '../../components/Sidebar/Sidebar';
import { mockTreemapData } from '../../mockData';
import { currencySymbols, REGION_SUFFIX } from '../../utils/constants';
import { useFrankfurterRates } from '../../utils/useFrankfurterRates';
import { getExtendedDetails } from '../../utils/dataHelpers';
import { buildGlobalMacroEngine, predictMacroImpact } from '../../utils/mlEngine';
import { ERAS } from '../../components/TimeTravel/TimeTravel';
import TimeBar from '../../components/TimeBar/TimeBar';
import BarRaceView from '../../components/BarRaceView/BarRaceView';


export default function EquitiesMarket({ currency, setCurrency, snapshotDate, setSnapshotDate }) {
  const [viewMode, setViewMode] = useState('heatmap');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'value', direction: 'descending' });
  const [selectedTicker, setSelectedTicker] = useState(null);
  const [scenarios, setScenarios] = useState({
    riskAppetite: 50,
    interestRate: 0,
    inflation: 2.0,
    ppi: 2.0,
    gini: 48.0
  });
  const [activeEra, setActiveEra] = useState('2025');
  const [showTimeTravel, setShowTimeTravel] = useState(false);
  const [portfolio, setPortfolio] = useState([
    { ticker: 'AAPL', amount: 15000, id: 1 },
    { ticker: '1398', amount: 5000, id: 2 } // ICBC Bank, High Beta logic demo
  ]);
  const [useMlEngine, setUseMlEngine] = useState(false);
  const [mlModels, setMlModels] = useState(null);
  const [rankMetric, setRankMetric] = useState('marketCap');
  const [groupBy, setGroupBy] = useState('market');
  const [colorByPerf, setColorByPerf] = useState(false);

  // Real time-travel: snapshot prices at a chosen date
  const [snapshotPrices, setSnapshotPrices]   = useState(null);   // { "2330.TW": 142.5, ... }
  const [baselinePrices, setBaselinePrices]   = useState(null);   // today's prices (denominator)
  const [snapshotLoading, setSnapshotLoading] = useState(false); // 'market' | 'sectorInMarket' | 'sectorGlobal'
  const [comparisonPrices, setComparisonPrices] = useState(null); // { d1, w1, m1, y1, ytd } each a prices map

  // Dynamic Data Pipeline - defaults to real stock universe, swappable to live APIs
  const [marketUniverse, setMarketUniverse] = useState(mockTreemapData);

  const { rates, isLive: ratesIsLive, lastUpdated: ratesDate } = useFrankfurterRates();

  useEffect(() => {
    setMlModels(buildGlobalMacroEngine());
  }, []);

  // Fetch baseline (today) once on mount — needed for TimeBar and Time Travel
  useEffect(() => {
    if (baselinePrices) return;
    const today = new Date().toISOString().split('T')[0];
    fetch(`/api/snapshot?date=${today}`)
      .then(r => r.json())
      .then(d => { if (!d.building) setBaselinePrices(d); })
      .catch(() => {});
  }, []);

  // Fetch historical snapshot when snapshotDate changes
  useEffect(() => {
    if (!snapshotDate) { setSnapshotPrices(null); return; }
    setSnapshotLoading(true);
    fetch(`/api/snapshot?date=${snapshotDate}`)
      .then(r => r.json())
      .then(d => {
        if (!d.building) setSnapshotPrices(d);
        setSnapshotLoading(false);
      })
      .catch(() => setSnapshotLoading(false));
  }, [snapshotDate]);

  // Fetch comparison snapshots for hover modal (d-1, 1W, 1M, 1Y, YTD)
  useEffect(() => {
    if (!snapshotDate) { setComparisonPrices(null); return; }
    const d = new Date(snapshotDate + 'T12:00:00Z');
    const fmt = dt => dt.toISOString().slice(0, 10);
    const d1  = new Date(d); d1.setUTCDate(d1.getUTCDate() - 1);
    const w1  = new Date(d); w1.setUTCDate(w1.getUTCDate() - 7);
    const m1  = new Date(d); m1.setUTCMonth(m1.getUTCMonth() - 1);
    const y1  = new Date(d); y1.setUTCFullYear(y1.getUTCFullYear() - 1);
    const ytd = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const periods = { d1: fmt(d1), w1: fmt(w1), m1: fmt(m1), y1: fmt(y1), ytd: fmt(ytd) };
    Promise.all(
      Object.entries(periods).map(([key, date]) =>
        fetch(`/api/snapshot?date=${date}`)
          .then(r => r.json())
          .then(data => [key, data])
          .catch(() => [key, {}])
      )
    ).then(results => setComparisonPrices(Object.fromEntries(results)));
  }, [snapshotDate]);

  const currentRate = rates[currency] || 1;
  const currentSymbol = currencySymbols[currency] || '$';

  // Green/red performance color — always visually distinct even at 0% change.
  // 0% → dark but clearly green; ±12%+ → bright green/red; capped at ±12%.
  function perfColorFn(pct) {
    if (pct >= 0) {
      const k = Math.min(pct / 12, 1);
      return `rgb(${Math.round(20 + 2*k)}, ${Math.round(83 + 80*k)}, ${Math.round(45 + 29*k)})`;
      // 0% → rgb(20,83,45) dark green   |  12%+ → rgb(22,163,74) bright green
    } else {
      const k = Math.min(-pct / 12, 1);
      return `rgb(${Math.round(69 + 151*k)}, ${Math.round(10 + 28*k)}, ${Math.round(10 + 28*k)})`;
      // 0% → rgb(69,10,10) dark red   |  -12%+ → rgb(220,38,38) bright red
    }
  }

  // Macro Valuation Engine — composes era multiplier × scenario slider
  const getAdjustedValue = (item, scenarios, eraMultipliers) => {
    // Phase 7/8: ML Regression Override
    if (useMlEngine && mlModels) {
      const preds = predictMacroImpact(mlModels, scenarios.riskAppetite, scenarios.interestRate, scenarios.inflation, scenarios.ppi, scenarios.gini);
      return Math.max(0.1, item.value * (preds[item.sector] || 1.0));
    }

    // Layer 1: Historical era baseline
    const eraMult = eraMultipliers[item.sector] || 1.0;

    // Layer 2: Scenario slider adjustments
    let scenarioMult = 1.0;
    const riskFactor = (scenarios.riskAppetite - 50) / 100;
    if (item.sector === 'Technology') scenarioMult += riskFactor * 0.4;
    if (item.sector === 'Healthcare') scenarioMult -= riskFactor * 0.2;
    const rateFactor = scenarios.interestRate / 10000;
    if (item.sector === 'Technology') scenarioMult -= rateFactor * 15;
    if (item.sector === 'Financials') scenarioMult += rateFactor * 10;
    const inflationFactor = (scenarios.inflation - 2) / 100;
    if (item.sector === 'Energy') scenarioMult += inflationFactor * 5;
    if (item.sector === 'Consumer') scenarioMult -= inflationFactor * 2;

    return Math.max(0.1, item.value * eraMult * Math.max(0.1, scenarioMult));
  };

  // Pick the treemap sizing metric — revenue/netIncome resize cells; pe/divYield use marketCap size
  const getMetricValue = (stock, metric) => {
    if (metric === 'revenue')    return Math.max(stock.revenue   || 0.1, 0.1);
    if (metric === 'netIncome')  return Math.max(stock.netIncome || 0.1, 0.1);
    if (metric === 'pe')         return stock.marketCap || stock.value || 1; // size unchanged, rank by pe
    if (metric === 'divYield')   return stock.marketCap || stock.value || 1; // size unchanged, rank by divYield
    return stock.marketCap || stock.value || 1; // default: marketCap
  };

  const getRankValue = (stock, metric) => {
    if (metric === 'revenue')   return stock.revenue   || 0;
    if (metric === 'netIncome') return stock.netIncome || 0;
    if (metric === 'pe')        return -(stock.pe      || 999); // lower PE = better = rank 1
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

  // Rank-based palette: 20 distinct vivid colors cycling from #1 (gold) through rainbow
  const RANK_PALETTE = [
    '#f59e0b', // 1  gold
    '#22c55e', // 2  green
    '#3b82f6', // 3  blue
    '#ef4444', // 4  red
    '#a855f7', // 5  purple
    '#f97316', // 6  orange
    '#06b6d4', // 7  cyan
    '#ec4899', // 8  pink
    '#84cc16', // 9  lime
    '#8b5cf6', // 10 violet
    '#14b8a6', // 11 teal
    '#f43f5e', // 12 rose
    '#0ea5e9', // 13 sky
    '#eab308', // 14 yellow
    '#10b981', // 15 emerald
    '#fb923c', // 16 light-orange
    '#818cf8', // 17 indigo
    '#e879f9', // 18 fuchsia
    '#4ade80', // 19 light-green
    '#38bdf8', // 20 light-blue
  ];
  const rankColorFn = (rank) => RANK_PALETTE[(rank - 1) % RANK_PALETTE.length];

  // Processed Treemap with Era + Scenario Impacts + Ranking
  const adjustedTreemapData = useMemo(() => {
    const era = ERAS.find(e => e.id === activeEra) || ERAS[ERAS.length - 1];
    const useRealSnapshot = snapshotPrices && baselinePrices && snapshotDate;

    return marketUniverse.map(region => {
      const suffix = REGION_SUFFIX[region.name];
      const withAdjusted = region.children.map(stock => {
        const apiKey = suffix ? `${stock.name}.${suffix}` : stock.name;
        let adjustedValue;
        let _hist, _base;

        // Real historical data: scale market cap by price ratio on chosen date
        if (useRealSnapshot) {
          _hist = snapshotPrices[apiKey];
          _base = baselinePrices[apiKey];
          if (_hist > 0 && _base > 0) {
            adjustedValue = Math.max(0.1, (stock.marketCap || stock.value) * (_hist / _base));
          }
        }
        // Fall back to era multiplier if no real data for this ticker
        if (!adjustedValue) {
          adjustedValue = getAdjustedValue(stock, scenarios, era.multipliers);
        }

        // metricValue drives treemap sizing.
        // For marketCap/pe/divYield: size by adjustedValue (snapshot/era-adjusted cap).
        // For revenue/netIncome: use the actual fundamental — snapshot doesn't affect it.
        const metricValue = (rankMetric === 'revenue' || rankMetric === 'netIncome')
          ? getMetricValue(stock, rankMetric)
          : adjustedValue;

        return { ...stock, adjustedValue, metricValue, _hist, _base, apiKey };
      });

      // Sort using snapshot-adjusted values for market cap so ranks reflect the chosen date
      const sorted = [...withAdjusted].sort((a, b) => {
        if (rankMetric === 'marketCap') return (b.adjustedValue || 0) - (a.adjustedValue || 0);
        return getRankValue(b, rankMetric) - getRankValue(a, rankMetric);
      });

      return {
        ...region,
        children: sorted.map((stock, idx) => {
          const rank = idx + 1;
          // Perf mode: green/red by % change. Default: rank-based amber→blue palette.
          let cellColor;
          if (colorByPerf && useRealSnapshot && stock._hist > 0 && stock._base > 0) {
            cellColor = perfColorFn((stock._hist / stock._base - 1) * 100);
          } else {
            cellColor = rankColorFn(rank);
          }
          const { _hist, _base, ...clean } = stock;
          return { ...clean, rank, itemStyle: { ...stock.itemStyle, color: cellColor } };
        }),
      };
    });
  }, [marketUniverse, scenarios, activeEra, useMlEngine, mlModels, rankMetric, snapshotPrices, baselinePrices, snapshotDate, colorByPerf]);

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

  // Flatten for list view and stats
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
          // Stock-only fields — keep null for crypto so DetailPanel hides them
          ...(!isCrypto && {
            bid:  live.bid  != null ? `${sym}${live.bid.toFixed(2)} × ${live.bidSize || ''}` : mergedDetails.bid,
            ask:  live.ask  != null ? `${sym}${live.ask.toFixed(2)} × ${live.askSize || ''}` : mergedDetails.ask,
            pe:   live.pe   != null ? live.pe.toFixed(2)                                      : mergedDetails.pe,
            eps:  live.eps  != null ? `${sym}${live.eps.toFixed(2)}`                          : mergedDetails.eps,
            beta: live.beta != null ? live.beta.toFixed(2)                                    : mergedDetails.beta,
          }),
        };
      }
    }

    const summaryData = (summaryRes.status === 'fulfilled' && summaryRes.value.ok)
      ? await summaryRes.value.json() : null;
    const historyData = (historyRes.status === 'fulfilled' && historyRes.value.ok)
      ? await historyRes.value.json() : null;

    // Discard results if a newer stock was selected while we were awaiting
    if (selectionRef.current !== selectionId) return;
    setSelectedTicker(prev => ({ ...prev, details: mergedDetails, isLive, summaryData, historyData }));
  };

  return (
    <div className="app-container">
      <Header
        viewMode={viewMode} setViewMode={setViewMode}
        showTimeTravel={showTimeTravel} setShowTimeTravel={setShowTimeTravel}
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
            />
          )}
          {viewMode === 'race' && (
            <BarRaceView
              flatData={flatData}
              currentRate={currentRate}
              currentSymbol={currentSymbol}
              currency={currency}
              snapshotDate={snapshotDate}
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
              snapshotDate={snapshotDate}
            />
          )}
          {(viewMode === 'heatmap' || viewMode === 'race' || viewMode === 'list') && (
            <TimeBar
              snapshotDate={snapshotDate}
              setSnapshotDate={setSnapshotDate}
              snapshotLoading={snapshotLoading}
            />
          )}
          {viewMode === 'portfolio' && (
            <PortfolioView
              portfolio={portfolio} setPortfolio={setPortfolio}
              flatData={flatData} handleSelectTicker={handleSelectTicker}
              currentRate={currentRate} currentSymbol={currentSymbol}
              currency={currency}
            />
          )}
          {viewMode === 'ml-explorer' && (
            <ModelExplorer scenarios={scenarios} setScenarios={setScenarios} />
          )}
          {viewMode === 'radar' && (
            <RadarView
              flatData={flatData} handleSelectTicker={handleSelectTicker}
              currentRate={currentRate} currentSymbol={currentSymbol}
              currency={currency} useMlEngine={useMlEngine}
            />
          )}
          {viewMode === 'data-hub' && (
            <DataHub
              setMarketUniverse={setMarketUniverse}
              setViewMode={setViewMode}
            />
          )}
        </div>
        <Sidebar
          selectedTicker={selectedTicker} setSelectedTicker={setSelectedTicker} flatData={flatData}
          currentRate={currentRate} currentSymbol={currentSymbol} currency={currency}
          rates={rates} ratesIsLive={ratesIsLive} ratesDate={ratesDate}
          scenarios={scenarios} setScenarios={setScenarios}
          activeEra={activeEra} setActiveEra={setActiveEra}
          showTimeTravel={showTimeTravel}
          snapshotDate={snapshotDate} setSnapshotDate={setSnapshotDate}
          snapshotLoading={snapshotLoading} hasRealData={!!baselinePrices}
          useMlEngine={useMlEngine} setUseMlEngine={setUseMlEngine}
        />
      </main>
    </div>
  );
}
