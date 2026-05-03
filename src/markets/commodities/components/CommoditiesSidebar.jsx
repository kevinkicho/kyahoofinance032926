import React from 'react';
import DataFooter from '../../../components/DataFooter/DataFooter';

const CommoditiesSidebar = (props) => {
  // Defaults only kick in when a prop is `undefined`. The parent passes
  // explicit `null` for unfetched fields, so coalesce manually.
  const priceDashboardData = props.priceDashboardData ?? [];
  const goldOilRatio = props.goldOilRatio ?? {};
  const dbcEtf = props.dbcEtf ?? {};
  const cotData = props.cotData ?? {};

  const renderStat = (label, value) => (
    <div key={label} className="sidebar-stat">
      <span className="label">{label}</span>
      <span className="value">{value !== undefined && value !== null ? value : 'N/A'}</span>
    </div>
  );

  // Extract key prices from priceDashboardData. The default value above is
  // `[]`, but a parent that explicitly passes `null`/`undefined` still trips
  // .forEach — guard explicitly. Same for nested `commodities`.
  const prices = {};
  if (Array.isArray(priceDashboardData)) {
    priceDashboardData.forEach(sector => {
      if (!sector || !Array.isArray(sector.commodities)) return;
      sector.commodities.forEach(com => {
        if (com?.name) prices[com.name] = com.price;
      });
    });
  }

  return (
    <div className="commodities-sidebar">
      <section className="sidebar-section">
        <h3>Key Prices</h3>
        <div className="stat-grid">
          {renderStat('Gold', prices['Gold'])}
          {renderStat('WTI', prices['WTI Crude'])}
          {renderStat('Nat Gas', prices['Natural Gas'])}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>Indicators</h3>
        <div className="stat-grid">
          {renderStat('Gold/Oil Ratio', goldOilRatio.ratio)}
          {renderStat('DBC ETF %', dbcEtf.changePct)}
        </div>
      </section>

      <section className="sidebar-section">
        <h3>COT Positioning</h3>
        <div className="stat-grid">
          {/* Simplified logic for COT display; usually requires specific contract lookup */}
          {renderStat('Net Long/Short', cotData?.latest || 'N/A')}
        </div>
      </section>

      <DataFooter
        source="Yahoo Finance / FRED / EIA / CFTC"
        timestamp={props.lastUpdated}
        isLive={props.isLive}
        fetchLog={props.fetchLog}
        error={props.error}
        fetchedOn={props.fetchedOn}
        isCurrent={props.isCurrent}
      />
    </div>
  );
};

export default React.memo(CommoditiesSidebar);
