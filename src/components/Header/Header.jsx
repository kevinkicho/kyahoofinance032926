import React from 'react';
import './Header.css';

const Header = ({ viewMode, setViewMode, currency, setCurrency, showTimeTravel, setShowTimeTravel }) => {
  return (
    <header className="app-header">
      <h1>Global Macro Stock Visualizer</h1>
      <div className="controls">
        <div className="view-toggle">
          <button 
            className={viewMode === 'heatmap' ? 'active' : ''} 
            onClick={() => setViewMode('heatmap')}
          >
            Heatmap
          </button>
          <button 
            className={viewMode === 'list' ? 'active' : ''} 
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
          <button 
            className={viewMode === 'portfolio' ? 'active' : ''} 
            onClick={() => setViewMode('portfolio')}
          >
            Portfolio
          </button>
          <button 
            className={viewMode === 'radar' ? 'active' : ''} 
            onClick={() => setViewMode('radar')}
          >
            &#127919; Radar
          </button>
          <button 
            className={viewMode === 'ml-explorer' ? 'active' : ''} 
            onClick={() => setViewMode('ml-explorer')}
            style={{ color: viewMode === 'ml-explorer' ? '#fff' : '#a855f7', borderColor: '#a855f7' }}
          >
            &#129302; ML Engine
          </button>
          <button 
            className={viewMode === 'data-hub' ? 'active' : ''} 
            onClick={() => setViewMode('data-hub')}
            style={{ color: viewMode === 'data-hub' ? '#fff' : '#10b981', borderColor: '#10b981', marginLeft: '0.5rem' }}
          >
            &#128296; Data Hub
          </button>
        </div>
        <label>Global Display Currency:</label>
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
          className={`timetravel-btn ${showTimeTravel ? 'active' : ''}`}
          onClick={() => setShowTimeTravel(v => !v)}
          title="Time Travel — explore historical market eras"
        >
          &#128197; Time Travel
        </button>
      </div>
    </header>
  );
};

export default Header;
