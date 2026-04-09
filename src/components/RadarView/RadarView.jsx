import React, { useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import './RadarView.css';

const RadarView = ({ flatData, handleSelectTicker, currentSymbol, currentRate, currency, useMlEngine }) => {
  const { colors } = useTheme();
  const radarData = useMemo(() => {
    // Calculate the percentage deviation for every global stock
    const enriched = flatData.map(stock => {
      const baseValue = stock.value;
      const predValue = stock.adjustedValue || stock.value; // Handle unadjusted states
      // Avoid divide by zero
      const impactPct = baseValue > 0 ? ((predValue - baseValue) / baseValue) * 100 : 0;
      
      return {
        ...stock,
        baseValue,
        predValue,
        impactPct
      };
    });

    // Extract Top 10 Beneficiaries and Top 10 Casualties globally
    const sorted = [...enriched].sort((a, b) => b.impactPct - a.impactPct);
    const top10 = sorted.slice(0, 10);
    const bottom10 = sorted.slice(-10).reverse(); // reverse so the absolute worst is #1

    // Group Top 5/Bottom 5 anomalies by Sector
    const anomaliesBySector = {};
    const sectors = ['Technology', 'Financials', 'Energy', 'Healthcare', 'Consumer', 'Industrials'];
    sectors.forEach(sec => {
      const secData = enriched.filter(e => e.sector === sec);
      const sortedSec = [...secData].sort((a, b) => b.impactPct - a.impactPct);
      anomaliesBySector[sec] = { 
        top: sortedSec.slice(0, 5), 
        bottom: sortedSec.slice(-5).reverse() 
      };
    });

    return { top10, bottom10, anomaliesBySector };
  }, [flatData]);

  const { top10, bottom10, anomaliesBySector } = radarData;

  const renderTable = (data, isPositive) => (
    <table className="radar-table">
      <thead>
        <tr>
          <th>Asset</th>
          <th>Sector</th>
          <th>Base Value</th>
          <th>Predicted</th>
          <th>Impact %</th>
        </tr>
      </thead>
      <tbody>
        {data.map(stock => (
          <tr key={stock.ticker} className={isPositive ? 'tr-pos' : 'tr-neg'}>
            <td>
              <button className="radar-ticker-btn" onClick={() => handleSelectTicker(stock)}>
                {stock.ticker} <span className="radar-flag">{stock.regionSymbol}</span>
              </button>
            </td>
            <td><span className="radar-badge">{stock.sector}</span></td>
            <td className="mono">{currentSymbol}{(stock.baseValue * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}B</td>
            <td className={`mono fw-bold ${isPositive ? 'text-green' : 'text-red'}`}>
              {currentSymbol}{(stock.predValue * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 })}B
            </td>
            <td className={`mono ${isPositive ? 'text-green' : 'text-red'}`}>
              {isPositive ? '+' : ''}{stock.impactPct.toFixed(2)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="radar-view">
      <div className="radar-header-banner">
        <h2>Macro Divergence Radar</h2>
        <p>Scanning 2,500+ global assets. Engine: <strong>{useMlEngine ? 'Statistical ML Regression' : 'Static Hardcoded Rules'}</strong>.</p>
        <p className="radar-subtext">This tool isolates the absolute mathematical extremes—companies functionally breaking under your monetary constraints versus those structurally positioned to explode.</p>
      </div>

      {/* Overview Block */}
      <div className="radar-split-view">
        {/* The Winners */}
        <div className="radar-card radar-winners">
          <div className="rc-header">
            <h3>Top 10 Beneficiaries</h3>
            <span>Greatest positive beta to current scenario</span>
          </div>
          {renderTable(top10, true)}
        </div>

        {/* The Losers */}
        <div className="radar-card radar-losers">
          <div className="rc-header">
            <h3>Highest Casualties</h3>
            <span>Greatest negative beta to current scenario</span>
          </div>
          {renderTable(bottom10, false)}
        </div>
      </div>

      {/* Sector Alpha/Beta */}
      <div className="radar-card radar-sector-anomalies">
        <div className="rc-header" style={{ borderBottom: `1px solid ${colors.border}`, paddingBottom: '1rem', marginBottom: '1rem' }}>
          <h3>Sector Deep Dive</h3>
          <span>The Top 5 Beneficiaries and Top 5 Casualties within each specific market sector.</span>
        </div>
        <div className="sector-grid">
          {Object.entries(anomaliesBySector).map(([sec, val]) => (
            <div key={sec} className="sec-bubble">
              <h4 className="sec-bubble-title">{sec}</h4>
              
              <div className="sec-list-group">
                <span className="sec-list-label text-green">Top 5 Builders</span>
                {val.top.map(stock => (
                  <div key={stock.ticker} className="sec-extreme sec-top" onClick={() => handleSelectTicker(stock)}>
                    <span className="se-tick">{stock.ticker}</span>
                    <span className="se-pct text-green">+{stock.impactPct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>

              <div className="sec-list-group" style={{ marginTop: '1rem' }}>
                <span className="sec-list-label text-red">Top 5 Casualties</span>
                {val.bottom.map(stock => (
                  <div key={stock.ticker} className="sec-extreme sec-bot" onClick={() => handleSelectTicker(stock)}>
                    <span className="se-tick">{stock.ticker}</span>
                    <span className="se-pct text-red">{stock.impactPct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RadarView;
