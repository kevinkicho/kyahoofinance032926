import React from 'react';
import './ListView.css';

const ListView = ({ 
  processedData, 
  handleSort, 
  renderSortIndicator, 
  handleSelectTicker, 
  currentRate, 
  currentSymbol, 
  currency, 
  searchQuery, 
  setSearchQuery 
}) => {
  return (
    <div className="list-view">
      <div className="list-toolbar">
        <input 
          type="text" 
          placeholder="Search by Ticker or Region..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="search-input" 
        />
        <span className="results-count">{processedData.length} equities matched</span>
      </div>
      <div className="table-wrapper">
        <table className="data-grid">
          <thead>
            <tr>
              <th onClick={() => handleSort('ticker')}>Ticker{renderSortIndicator('ticker')}</th>
              <th onClick={() => handleSort('region')}>Exchange / Origin{renderSortIndicator('region')}</th>
              <th onClick={() => handleSort('value')} className="text-right">Global Market Cap ({currency}){renderSortIndicator('value')}</th>
              <th className="text-right">Performance (Mock)</th>
            </tr>
          </thead>
          <tbody>
            {processedData.map((item, index) => (
              <tr key={index} onClick={() => handleSelectTicker(item)} className="clickable-row">
                <td><div className="ticker-badge" style={{ backgroundColor: item.color }}>{item.ticker}</div></td>
                <td>
                  <span className="region-indicator" style={{ borderLeftColor: item.regionColor }}>
                    {item.region} <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>[{item.regionCurrency}]</span>
                  </span>
                </td>
                <td className="text-right">{currentSymbol}{((item.adjustedValue || item.value) * currentRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} B</td>
                <td className={`text-right ${item.perf.startsWith('+') ? 'text-green' : 'text-red'}`}>{item.perf}</td>
              </tr>
            ))}
            {processedData.length === 0 && <tr><td colSpan="4" className="empty-state">No equities match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ListView;
