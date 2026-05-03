import React from 'react';

const RealEstateSidebar = ({ 
  caseShillerData = {}, 
  mortgageRates = {}, 
  housingStarts = {}, 
  reitEtf = {} 
}) => {
  const renderStat = (label, value) => (
    <div className="sidebar-stat">
      <span className="label">{label}</span>
      <span className="value">{value !== undefined && value !== null ? value : 'N/A'}</span>
    </div>
  );

  return (
    <div className="realestate-sidebar">
      <section className="sidebar-section">
        <h3>Market Indices</h3>
        <div className="stat-grid">
          {renderStat('Case-Shiller', caseShillerData.latest)}
          {renderStat('Mortgage Rate', mortgageRates.latest)}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>Activity</h3>
        <div className="stat-grid">
          {renderStat('Housing Starts', housingStarts.latest)}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>REIT Performance</h3>
        <div className="stat-grid">
          {renderStat('REIT ETF %', reitEtf.changePct)}
        </div>
      </section>
    </div>
  );
};

export default React.memo(RealEstateSidebar);
