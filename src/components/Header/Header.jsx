import React, { useState } from 'react';
import './Header.css';

const RANK_METRICS = [
  { id: 'marketCap',  label: 'Market Cap',  desc: 'Size cells by market capitalisation' },
  { id: 'revenue',    label: 'Revenue',     desc: 'Size cells by annual revenue' },
  { id: 'netIncome',  label: 'Net Income',  desc: 'Size cells by net profit' },
  { id: 'pe',         label: 'P/E Ratio',   desc: 'Rank by price-to-earnings (lowest = #1)' },
  { id: 'divYield',   label: 'Div. Yield',  desc: 'Rank by dividend yield (highest = #1)' },
];

const GROUP_OPTIONS = [
  { id: 'market',         label: 'By Market',    desc: 'Group stocks by their home exchange' },
  { id: 'sectorInMarket', label: '+ Sub-sectors', desc: 'Show sector brackets inside each market' },
  { id: 'sectorGlobal',   label: 'By Sector',    desc: 'Merge all markets — compare sectors globally' },
];

const Header = ({
  viewMode, setViewMode,
  currency, setCurrency,
  showTimeTravel, setShowTimeTravel,
  rankMetric, setRankMetric,
  groupBy, setGroupBy,
  colorByPerf, setColorByPerf,
  rates,
}) => {
  const [showRates, setShowRates] = useState(false);

  return (
    <header className="app-header">
      <div className="header-top">
        <h1>Global Macro Stock Visualizer</h1>
        <div className="controls">
          <div className="view-toggle">
            <button className={viewMode === 'heatmap'   ? 'active' : ''} onClick={() => setViewMode('heatmap')}>Heatmap</button>
            <button className={viewMode === 'list'      ? 'active' : ''} onClick={() => setViewMode('list')}>List View</button>
            <button
              className={viewMode === 'race' ? 'active' : ''}
              onClick={() => setViewMode('race')}
              style={{ color: viewMode === 'race' ? '#fff' : '#f59e0b', borderColor: '#f59e0b' }}
            >Bar Race</button>
            <button className={viewMode === 'portfolio' ? 'active' : ''} onClick={() => setViewMode('portfolio')}>Portfolio</button>
            <button className={viewMode === 'radar'     ? 'active' : ''} onClick={() => setViewMode('radar')}>Radar</button>
            <button
              className={viewMode === 'ml-explorer' ? 'active' : ''}
              onClick={() => setViewMode('ml-explorer')}
              style={{ color: viewMode === 'ml-explorer' ? '#fff' : '#a855f7', borderColor: '#a855f7' }}
            >ML Engine</button>
            <button
              className={viewMode === 'data-hub' ? 'active' : ''}
              onClick={() => setViewMode('data-hub')}
              style={{ color: viewMode === 'data-hub' ? '#fff' : '#10b981', borderColor: '#10b981', marginLeft: '0.5rem' }}
            >Data Hub</button>
          </div>
          <label>Currency:</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
              <option value="USD">USD</option>
              <option value="CNY">CNY</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="INR">INR</option>
              <option value="HKD">HKD</option>
              <option value="CAD">CAD</option>
              <option value="AUD">AUD</option>
              <option value="BRL">BRL</option>
            </select>
            <button
              className="rates-info-btn"
              onClick={() => setShowRates(v => !v)}
              title="Show exchange rates"
            >ⓘ</button>
            {showRates && rates && (
              <div className="rates-panel">
                <div className="rates-panel-header">
                  Exchange Rates (USD base)
                  <button onClick={() => setShowRates(false)}>✕</button>
                </div>
                <div className="rates-panel-grid">
                  {Object.entries(rates).filter(([k]) => k !== 'USD').map(([cur, rate]) => (
                    <div key={cur} className="rates-panel-row">
                      <span>{cur}</span>
                      <span>{rate.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            className={`timetravel-btn ${showTimeTravel ? 'active' : ''}`}
            onClick={() => setShowTimeTravel(v => !v)}
            title="Toggle time-travel era panel in sidebar"
          >News</button>
        </div>
      </div>

      {/* Ranking + Grouping bar */}
      <div className="ranking-bar">
        <span className="ranking-label">Rank by:</span>
        {RANK_METRICS.map(m => (
          <button
            key={m.id}
            className={`rank-btn ${rankMetric === m.id ? 'active' : ''}`}
            onClick={() => setRankMetric(m.id)}
            title={m.desc}
          >
            {m.label}
          </button>
        ))}
        <span className="ranking-bar-sep" />
        <span className="ranking-label">Group:</span>
        {GROUP_OPTIONS.map(g => (
          <button
            key={g.id}
            className={`rank-btn group-btn ${groupBy === g.id ? 'active' : ''}`}
            onClick={() => setGroupBy(g.id)}
            title={g.desc}
          >
            {g.label}
          </button>
        ))}
        <span className="ranking-bar-sep" />
        <button
          className={`rank-btn ${colorByPerf ? 'active' : ''}`}
          style={colorByPerf ? { borderColor: '#10b981', color: '#10b981' } : {}}
          onClick={() => setColorByPerf(v => !v)}
          title="Color cells by % price change when a historical date is selected"
        >Perf. Colors</button>
        <span className="ranking-hint">
          {rankMetric === 'marketCap'  && groupBy === 'market'         && '· Cells sized by market cap'}
          {rankMetric === 'revenue'    && '· Cells sized by revenue — Walmart & Aramco grow larger than AAPL'}
          {rankMetric === 'netIncome'  && '· Cells sized by net profit'}
          {rankMetric === 'pe'         && '· Ranked #1 = lowest P/E (cheapest valuation)'}
          {rankMetric === 'divYield'   && '· Ranked #1 = highest dividend yield'}
          {groupBy === 'sectorInMarket' && '· Sector brackets inside each market'}
          {groupBy === 'sectorGlobal'   && '· All markets merged — compare sectors globally'}
        </span>
      </div>
    </header>
  );
};

export default Header;
