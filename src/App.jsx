import React, { useState, useMemo } from 'react';
import Header from './components/Header/Header';
import HeatmapView from './components/HeatmapView/HeatmapView';
import ListView from './components/ListView/ListView';
import PortfolioView from './components/PortfolioView/PortfolioView';
import RadarView from './components/RadarView/RadarView';
import ModelExplorer from './components/ModelExplorer/ModelExplorer';
import DataHub from './components/DataHub/DataHub';
import Sidebar from './components/Sidebar/Sidebar';
import { mockTreemapData } from './mockData';
import { exchangeRates, currencySymbols } from './utils/constants';
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
  
  // Dynamic Data Pipeline - defaults to simulated data, swappable to live APIs
  const [marketUniverse, setMarketUniverse] = useState(mockTreemapData);

  React.useEffect(() => {
    setMlModels(buildGlobalMacroEngine());
  }, []);

  const currentRate = exchangeRates[currency] || 1;
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

  // Processed Treemap with Era + Scenario Impacts
  const adjustedTreemapData = useMemo(() => {
    const era = ERAS.find(e => e.id === activeEra) || ERAS[ERAS.length - 1];
    return marketUniverse.map(region => ({
      ...region,
      children: region.children.map(stock => ({
        ...stock,
        adjustedValue: getAdjustedValue(stock, scenarios, era.multipliers)
      }))
    }));
  }, [marketUniverse, scenarios, activeEra, useMlEngine, mlModels]);

  // Flatten mock data for list view and stats
  const flatData = useMemo(() => {
    const arr = [];
    adjustedTreemapData.forEach(region => {
      region.children.forEach(stock => {
        let perfStr = stock.itemStyle.color === '#27ae60' || stock.itemStyle.color === '#2ecc71' ? '+1.54%' : '-2.10%';
        arr.push({
          region: region.name,
          regionCurrency: region.currency,
          regionSymbol: region.symbol,
          regionColor: region.itemStyle.borderColor,
          ticker: stock.name,
          value: stock.value,
          adjustedValue: stock.adjustedValue,
          sector: stock.sector,
          color: stock.itemStyle.color,
          perf: perfStr
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
    const details = getExtendedDetails(tickerInfo);
    setSelectedTicker({ ...tickerInfo, details, isLive: false });

    try {
      const response = await fetch('/api/stocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tickers: [tickerInfo.ticker] })
      });
      if (response.ok) {
        const liveData = await response.json();
        const live = liveData[tickerInfo.ticker];
        if (live) {
          const mergedDetails = {
            ...details,
            price: live.price ? `${tickerInfo.regionSymbol}${live.price.toLocaleString()}` : details.price,
            changeAmt: live.change ? `${live.change > 0 ? '+' : ''}${tickerInfo.regionSymbol}${live.change.toFixed(2)}` : details.changeAmt,
            changePct: live.changePct ? `${live.changePct > 0 ? '+' : ''}${live.changePct.toFixed(2)}%` : details.changePct,
            marketCapNative: live.marketCap ? `${tickerInfo.regionSymbol}${(live.marketCap / 1e12).toFixed(2)} T` : details.marketCapNative,
            marketCapGlobal: live.marketCap ? `$${(live.marketCap / 1e9 / currentRate).toFixed(0)} B (Glob.)` : details.marketCapGlobal,
            volume: live.volume ? live.volume.toLocaleString() : details.volume
          };
          setSelectedTicker(prev => ({ ...prev, details: mergedDetails, isLive: true }));
        }
      }
    } catch (err) {
      console.warn('Backend server not responding, using mock fallback.');
    }
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
      />
      <main className="main-content">
        <div className="view-container">
          {viewMode === 'heatmap' && (
            <HeatmapView 
              data={adjustedTreemapData} 
              onChartClick={onChartClick} 
              currentRate={currentRate} 
              currentSymbol={currentSymbol} 
              currency={currency} 
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
