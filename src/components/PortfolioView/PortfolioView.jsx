import React, { useState, useMemo } from 'react';
import './PortfolioView.css';

const PortfolioView = ({ portfolio, setPortfolio, flatData, handleSelectTicker, currentSymbol, currentRate, currency }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [amount, setAmount] = useState('10000');

  // Find matching tickers up to 5 results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return flatData
      .filter(item => 
        item.ticker.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.region.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 5);
  }, [searchTerm, flatData]);

  const handleAdd = (ticker) => {
    const numericAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) return;

    setPortfolio(prev => {
      // If already exists, just update amount
      const existing = prev.find(p => p.ticker === ticker);
      if (existing) {
        return prev.map(p => p.ticker === ticker ? { ...p, amount: p.amount + numericAmount } : p);
      }
      return [...prev, { ticker, amount: numericAmount, id: Date.now() }];
    });
    setSearchTerm('');
  };

  const handleRemove = (ticker) => {
    setPortfolio(prev => prev.filter(p => p.ticker !== ticker));
  };

  // Enhance portfolio items with fresh multipliers from flatData
  const enrichedPortfolio = useMemo(() => {
    return portfolio.map(pos => {
      const stockMeta = flatData.find(f => f.ticker === pos.ticker);
      if (!stockMeta) return null; // Edge case: not found in mock data

      // The magic of the digital twin: grab the live macro multiplier
      const multiplier = stockMeta.value > 0 ? (stockMeta.adjustedValue / stockMeta.value) : 1;
      const nominalAdjusted = pos.amount * multiplier;
      const impactPct = ((multiplier - 1) * 100).toFixed(2);

      return {
        ...pos,
        ...stockMeta,
        multiplier,
        nominalAdjusted,
        impactPct,
        impactVal: nominalAdjusted - pos.amount
      };
    }).filter(Boolean);
  }, [portfolio, flatData]);

  // Totals
  const totalInvested = enrichedPortfolio.reduce((sum, p) => sum + p.amount, 0);
  const totalAdjusted = enrichedPortfolio.reduce((sum, p) => sum + p.nominalAdjusted, 0);
  const totalImpact = totalAdjusted - totalInvested;
  const totalImpactPct = totalInvested > 0 ? ((totalAdjusted - totalInvested) / totalInvested) * 100 : 0;

  return (
    <div className="portfolio-view">
      <div className="portfolio-header-strip">
        <div className="portfolio-stat-card">
          <h4>Total Nominal Invested ({currency})</h4>
          <span className="stat-big">{currentSymbol}{(totalInvested * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="portfolio-stat-card">
          <h4>Scenario Adjusted Value</h4>
          <span className={`stat-big ${totalAdjusted >= totalInvested ? 'text-green' : 'text-red'}`}>
            {currentSymbol}{(totalAdjusted * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="portfolio-stat-card">
          <h4>Macro Impact %</h4>
          <span className={`stat-big ${totalImpactPct >= 0 ? 'text-green' : 'text-red'}`}>
            {totalImpactPct >= 0 ? '+' : ''}{totalImpactPct.toFixed(2)}%
          </span>
          <span className="stat-sub">({totalImpact >= 0 ? '+' : ''}{currentSymbol}{(totalImpact * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
        </div>
      </div>

      <div className="portfolio-controls">
        <div className="search-wrap">
          <input 
            type="text" 
            placeholder="Search ticker or region (e.g. AAPL, Japan)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className="search-dropdown">
              {searchResults.map(res => (
                <div key={res.ticker} className="search-result-item" onClick={() => handleAdd(res.ticker)}>
                  <span className="sr-ticker">{res.ticker}</span>
                  <span className="sr-sector">{res.sector}</span>
                  <span className="sr-add">Add +</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="amount-wrap">
          <label>Amount ($):</label>
          <input 
            type="text" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="portfolio-table-container">
        {enrichedPortfolio.length === 0 ? (
          <div className="empty-portfolio">
            <span className="empty-icon">&#128188;</span>
            <h3>Your portfolio is empty</h3>
            <p>Search for a ticker above to add it to your custom macro simulation.</p>
          </div>
        ) : (
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Sector</th>
                <th>Base Investment</th>
                <th>Macro Multiplier</th>
                <th>Adjusted Value</th>
                <th>Impact</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {enrichedPortfolio.sort((a,b) => b.nominalAdjusted - a.nominalAdjusted).map(pos => {
                const isPositive = pos.multiplier >= 1;
                return (
                  <tr key={pos.id}>
                    <td>
                      <button className="ticker-btn" onClick={() => handleSelectTicker(pos)}>{pos.ticker}</button>
                    </td>
                    <td>
                      <span className="sector-badge">{pos.sector}</span>
                    </td>
                    <td className="mono">{currentSymbol}{(pos.amount * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    <td className="mono">
                      <span className={`pill-mult ${isPositive ? 'bg-green' : 'bg-red'}`}>
                        {pos.multiplier.toFixed(2)}x
                      </span>
                    </td>
                    <td className={`mono fw-bold ${isPositive ? 'text-green' : 'text-red'}`}>
                      {currentSymbol}{(pos.nominalAdjusted * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                    <td className={`mono ${isPositive ? 'text-green' : 'text-red'}`}>
                      {isPositive ? '+' : ''}{pos.impactPct}%
                    </td>
                    <td>
                      <button className="remove-btn" onClick={() => handleRemove(pos.ticker)}>&#10005;</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default PortfolioView;
