import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header/Header';
import HeatmapView from './components/HeatmapView/HeatmapView';
import ListView from './components/ListView/ListView';
import PortfolioView from './components/PortfolioView/PortfolioView';
import RadarView from './components/RadarView/RadarView';
import ModelExplorer from './components/ModelExplorer/ModelExplorer';
import DataHub from './components/DataHub/DataHub';
import Sidebar from './components/Sidebar/Sidebar';
import { mockTreemapData } from './mockData';
import { currencySymbols } from './utils/constants';
import { useFrankfurterRates } from './utils/useFrankfurterRates';
import { getExtendedDetails } from './utils/dataHelpers';
import { buildGlobalMacroEngine, predictMacroImpact } from './utils/mlEngine';
import { ERAS } from './components/TimeTravel/TimeTravel';
import './index.css';

function App() {
  const [currency, setCurrency] = useState('USD');
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
  const [groupBy, setGroupBy] = useState('market'); // 'market' | 'sectorInMarket' | 'sectorGlobal'

  // Dynamic Data Pipeline - defaults to real stock universe, swappable to live APIs
  const [marketUniverse, setMarketUniverse] = useState(mockTreemapData);

  const { rates, isLive: ratesIsLive, lastUpdated: ratesDate } = useFrankfurterRates();

  useEffect(() => {
    setMlModels(buildGlobalMacroEngine());
  }, []);

  const currentRate = rates[currency] || 1;
  const currentSymbol = currencySymbols[currency] || '$';

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

  // Processed Treemap with Era + Scenario Impacts + Ranking
  const adjustedTreemapData = useMemo(() => {
    const era = ERAS.find(e => e.id === activeEra) || ERAS[ERAS.length - 1];
    return marketUniverse.map(region => {
      const withAdjusted = region.children.map(stock => ({
        ...stock,
        adjustedValue: getAdjustedValue(stock, scenarios, era.multipliers),
        metricValue:   getMetricValue(stock, rankMetric),
      }));
      // Rank within region by selected metric (descending)
      const sorted = [...withAdjusted].sort((a, b) =>
        getRankValue(b, rankMetric) - getRankValue(a, rankMetric)
      );
      return {
        ...region,
        children: sorted.map((stock, idx) => ({ ...stock, rank: idx + 1 })),
      };
    });
  }, [marketUniverse, scenarios, activeEra, useMlEngine, mlModels, rankMetric]);

  const SECTOR_COLORS = {
    'Technology':  '#3b82f6',
    'Financials':  '#10b981',
    'Consumer':    '#f59e0b',
    'Healthcare':  '#ec4899',
    'Energy':      '#f97316',
    'Industrials': '#8b5cf6',
    'Other':       '#64748b',
  };

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
        const isUp = stock.itemStyle.color === '#27ae60' || stock.itemStyle.color === '#2ecc71';
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
          perf: isUp ? '+1.54%' : '-2.10%',
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

  const handleSelectTicker = async (tickerInfo) => {
    const details = getExtendedDetails(tickerInfo, rates);
    setSelectedTicker({ ...tickerInfo, details, isLive: false, summaryData: null, historyData: null });

    const sym = tickerInfo.regionSymbol || '$';
    const enc = encodeURIComponent(tickerInfo.ticker);

    const [quoteRes, summaryRes, historyRes] = await Promise.allSettled([
      fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [tickerInfo.ticker] })
      }),
      fetch(`/api/summary/${enc}`),
      fetch(`/api/history/${enc}?period=1y`),
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
          price:          live.price    != null ? `${sym}${live.price.toLocaleString()}` : mergedDetails.price,
          changeAmt:      live.change   != null ? `${live.change >= 0 ? '+' : ''}${sym}${live.change.toFixed(2)}` : mergedDetails.changeAmt,
          changePct:      live.changePct != null ? `${live.changePct >= 0 ? '+' : ''}${live.changePct.toFixed(2)}%` : mergedDetails.changePct,
          open:           live.open     != null ? `${sym}${live.open.toLocaleString()}` : mergedDetails.open,
          prevClose:      live.prevClose != null ? `${sym}${live.prevClose.toLocaleString()}` : mergedDetails.prevClose,
          dayRange:       (live.dayLow && live.dayHigh) ? `${sym}${live.dayLow.toFixed(2)} – ${sym}${live.dayHigh.toFixed(2)}` : mergedDetails.dayRange,
          wk52Range:      (live.weekLow52 && live.weekHigh52) ? `${sym}${live.weekLow52.toFixed(2)} – ${sym}${live.weekHigh52.toFixed(2)}` : mergedDetails.wk52Range,
          bid:            live.bid      != null ? `${sym}${live.bid.toFixed(2)} × ${live.bidSize || ''}` : mergedDetails.bid,
          ask:            live.ask      != null ? `${sym}${live.ask.toFixed(2)} × ${live.askSize || ''}` : mergedDetails.ask,
          volume:         live.volume   != null ? live.volume.toLocaleString() : mergedDetails.volume,
          avgVol:         live.avgVolume != null ? live.avgVolume.toLocaleString() : mergedDetails.avgVol,
          marketCapNative: live.marketCap ? `${sym}${(live.marketCap / 1e12).toFixed(2)} T` : mergedDetails.marketCapNative,
          marketCapGlobal: live.marketCap ? `$${(live.marketCap / 1e9 / currentRate).toFixed(0)} B (Glob.)` : mergedDetails.marketCapGlobal,
          pe:             live.pe       != null ? live.pe.toFixed(2) : mergedDetails.pe,
          eps:            live.eps      != null ? `${sym}${live.eps.toFixed(2)}` : mergedDetails.eps,
          beta:           live.beta     != null ? live.beta.toFixed(2) : mergedDetails.beta,
        };
      }
    }

    const summaryData = (summaryRes.status === 'fulfilled' && summaryRes.value.ok)
      ? await summaryRes.value.json() : null;
    const historyData = (historyRes.status === 'fulfilled' && historyRes.value.ok)
      ? await historyRes.value.json() : null;

    setSelectedTicker(prev => ({ ...prev, details: mergedDetails, isLive, summaryData, historyData }));
  };

  const onChartClick = (params) => {
    if (params.data && params.data.value !== undefined && !params.data.children) {
      const found = flatData.find(f => f.ticker === params.data.name);
      if (found) handleSelectTicker(found);
    }
  };

  return (
    <div className="app-container">
      <Header
        viewMode={viewMode} setViewMode={setViewMode}
        currency={currency} setCurrency={setCurrency}
        showTimeTravel={showTimeTravel} setShowTimeTravel={setShowTimeTravel}
        rankMetric={rankMetric} setRankMetric={setRankMetric}
        groupBy={groupBy} setGroupBy={setGroupBy}
      />
      <main className="main-content">
        <div className="view-container">
          {viewMode === 'heatmap' && (
            <HeatmapView
              data={heatmapData}
              onChartClick={onChartClick}
              currentRate={currentRate}
              currentSymbol={currentSymbol}
              currency={currency}
              rankMetric={rankMetric}
              groupBy={groupBy}
            />
          )}
          {viewMode === 'list' && (
            <ListView 
              processedData={processedData} handleSort={handleSort} renderSortIndicator={renderSortIndicator} 
              handleSelectTicker={handleSelectTicker} currentRate={currentRate} currentSymbol={currentSymbol} 
              currency={currency} searchQuery={searchQuery} setSearchQuery={setSearchQuery} 
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
          useMlEngine={useMlEngine} setUseMlEngine={setUseMlEngine}
        />
      </main>
    </div>
  );
}

export default App;
