import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './CommoditiesDashboard.css';

function PriceCharts({ priceDashboardData, allCommodities, colors, formatChange }) {
  const sectors = priceDashboardData || [];
  const groupColors = { Energy: '#ef4444', Metals: '#f59e0b', Agriculture: '#22c55e', Livestock: '#8b5cf6', Fibers: '#06b6d4' };
  return (
    <div className="com-price-charts">
      {sectors.map(sector => (
        <div key={sector.sector} className="com-chart-group">
          <div className="com-chart-group-title" style={{ color: groupColors[sector.sector] || '#94a3b8' }}>{sector.sector}</div>
          <div className="com-chart-group-items">
            {(sector.commodities || []).map(c => (
              <div key={c.ticker || c.name} className="com-chart-item">
                <div className="com-chart-item-header">
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>{c.name}</span>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: (c.change1d || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{formatChange(c.change1d)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default PriceCharts;
