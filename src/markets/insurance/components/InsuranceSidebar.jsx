import React from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';

const InsuranceSidebar = ({ 
  industryAvgCombinedRatio, 
  reinsurancePricing = {}, 
  hyOAS, 
  lastUpdated 
}) => {
  const renderPrice = (key, label) => {
    const data = reinsurancePricing[key];
    if (!data) return null;
    return (
      <div className="ins-sidebar-metric">
        <span className="ins-sidebar-metric-label">{label}</span>
        <span className="ins-sidebar-metric-value">
          <MetricValue 
            value={data.price} 
            seriesKey={key === 'PGR' ? 'reinsurerPGR' : key === 'ALL' ? 'reinsurerALL' : key === 'TRV' ? 'reinsurerTRV' : 'reinsurerHIG'} 
            timestamp={lastUpdated} 
          />
          <span className={`ins-sidebar-metric-change ${data.change >= 0 ? 'up' : 'down'}`}>
            {data.change >= 0 ? '▲' : '▼'}{Math.abs(data.change)}%
          </span>
        </span>
      </div>
    );
  };

  const isProfitable = industryAvgCombinedRatio < 100;

  return (
    <aside className="ins-sidebar">
      <h2 className="ins-sidebar-heading" style={{ borderBottom: '2px solid #f59e0b', color: '#f59e0b' }}>Insurance Insights</h2>
      
      <div className="ins-sidebar-section">
        <h3 className="ins-sidebar-section-title">Underwriting</h3>
        <div className="ins-sidebar-metric">
          <span className="ins-sidebar-metric-label">Combined Ratio</span>
          <span className="ins-sidebar-metric-value">
            <span className={`profit-indicator ${isProfitable ? 'profitable' : 'unprofitable'}`}>
              {industryAvgCombinedRatio || '—'}%
            </span>
          </span>
        </div>
      </div>

      <div className="ins-sidebar-section">
        <h3 className="ins-sidebar-section-title">Reinsurance Pricing</h3>
        {renderPrice('PGR', 'PGR')}
        {renderPrice('ALL', 'ALL')}
        {renderPrice('TRV', 'TRV')}
        {renderPrice('HIG', 'HIG')}
      </div>

      <div className="ins-sidebar-section">
        <h3 className="ins-sidebar-section-title">Credit Markets</h3>
        <div className="ins-sidebar-metric">
          <span className="ins-sidebar-metric-label">HY OAS Spread</span>
          <span className="ins-sidebar-metric-value">
            <MetricValue value={hyOAS} seriesKey="hyOAS" timestamp={lastUpdated} />
            <span className="ins-sidebar-unit"> bps</span>
          </span>
        </div>
      </div>
    </aside>
  );
};

export default React.memo(InsuranceSidebar);
