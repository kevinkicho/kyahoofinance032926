import React from 'react';

const BondsSidebar = ({ 
  yieldCurveData = {}, 
  spreadIndicators = {}, 
  creditIndices = {}, 
  breakevensData = {}, 
  macroData = {} 
}) => {
  const renderStat = (label, value) => (
    <div key={label} className="sidebar-stat">
      <span className="label">{label}</span>
      <span className="value">{value !== undefined ? value : 'N/A'}</span>
    </div>
  );

  return (
    <div className="bonds-sidebar">
      <section className="sidebar-section">
        <h3>Yield Curve</h3>
        <div className="stat-grid">
          {['3M', '2Y', '5Y', '10Y', '30Y'].map(term => 
            renderStat(term, yieldCurveData[term])
          )}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>Spreads</h3>
        <div className="stat-grid">
          {renderStat('2s10s', spreadIndicators['2s10s'])}
          {renderStat('10s3s', spreadIndicators['10s3s'])}
          {renderStat('5s30s', spreadIndicators['5s30s'])}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>Credit Spreads (OAS)</h3>
        <div className="stat-grid">
          {renderStat('IG', creditIndices.IG)}
          {renderStat('HY', creditIndices.HY)}
          {renderStat('EM', creditIndices.EM)}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>Breakevens</h3>
        <div className="stat-grid">
          {renderStat('5Y', breakevensData.current?.be5y)}
          {renderStat('10Y', breakevensData.current?.be10y)}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>Fed Funds Rate</h3>
        <div className="stat-grid">
          {renderStat('Bonds', macroData.fedFundsRate)}
        </div>
      </section>
    </div>
  );
};

export default React.memo(BondsSidebar);
