import React from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';

export default function CreditSidebar({
  spreadData,
  emBondData,
  defaultData,
  delinquencyRates,
  commercialPaper,
  lastUpdated,
}) {
  const igSpread = spreadData?.current?.igSpread ?? spreadData?.current?.ig;
  const hySpread = spreadData?.current?.hySpread ?? spreadData?.current?.hy;
  const emSpread = spreadData?.current?.emSpread ?? emBondData?.averageSpread;
  const defaultRate = defaultData?.rates?.[0]?.value ?? defaultData?.defaultRate;
  const cpRate = commercialPaper?.rate;

  return (
    <div className="credit-sidebar-content">
      <div className="credit-sidebar-section">
        <div className="credit-sidebar-title">Credit Spreads</div>
        {typeof igSpread === 'number' && (
          <div className="credit-metric-card">
            <div className="credit-metric-row">
              <span className="credit-metric-name">IG OAS</span>
              <span className="credit-metric-num" style={{
                color: igSpread > 150 ? '#f87171' : igSpread > 100 ? '#fbbf24' : '#22c55e'
              }}>
                <MetricValue value={igSpread} seriesKey="igOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} />
              </span>
            </div>
          </div>
        )}
        {typeof hySpread === 'number' && (
          <div className="credit-metric-card">
            <div className="credit-metric-row">
              <span className="credit-metric-name">HY OAS</span>
              <span className="credit-metric-num" style={{
                color: hySpread > 400 ? '#f87171' : hySpread > 250 ? '#fbbf24' : '#22c55e'
              }}>
                <MetricValue value={hySpread} seriesKey="hyOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} />
              </span>
            </div>
          </div>
        )}
        {typeof emSpread === 'number' && (
          <div className="credit-metric-card">
            <div className="credit-metric-row">
              <span className="credit-metric-name">EM Spread</span>
              <span className="credit-metric-num" style={{ color: '#a5b4fc' }}>
                <MetricValue value={emSpread} seriesKey="emOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="credit-sidebar-section">
        <div className="credit-sidebar-title">Default Watch</div>
        {typeof defaultRate === 'number' && (
          <div className="credit-metric-card">
            <div className="credit-metric-row">
              <span className="credit-metric-name">Default Rate</span>
              <span className="credit-metric-num" style={{
                color: defaultRate > 3 ? '#f87171' : '#fbbf24'
              }}>
                <MetricValue value={defaultRate} seriesKey="defaultRate" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
              </span>
            </div>
          </div>
        )}
        {delinquencyRates?.length > 0 && typeof delinquencyRates[0].rate === 'number' && (
          <div className="credit-metric-card">
            <div className="credit-metric-row">
              <span className="credit-metric-name">{delinquencyRates[0].type}</span>
              <span className="credit-metric-num" style={{ color: '#f59e0b' }}>
                <MetricValue value={delinquencyRates[0].rate} seriesKey="delinquencyRate" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="credit-sidebar-section">
        <div className="credit-sidebar-title">Short-Term</div>
        {typeof cpRate === 'number' && (
          <div className="credit-metric-card">
            <div className="credit-metric-row">
              <span className="credit-metric-name">CP Rate</span>
              <span className="credit-metric-num" style={{ color: '#14b8a6' }}>
                <MetricValue value={cpRate} seriesKey="commercialPaper" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
              </span>
            </div>
          </div>
        )}
        {commercialPaper?.volume != null && (
          <div className="credit-metric-card">
            <div className="credit-metric-row">
              <span className="credit-metric-name">CP Volume</span>
              <span className="credit-metric-num" style={{ color: '#64748b' }}>
                <MetricValue value={commercialPaper.volume} seriesKey="commercialPaperVolume" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(0)}B`} />
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}