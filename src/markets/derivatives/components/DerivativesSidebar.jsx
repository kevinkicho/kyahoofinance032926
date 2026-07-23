import React from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import DataFooter from '../../../components/DataFooter/DataFooter';

function DerivativesSidebar({
  vixTermStructure,
  vixEnrichment,
  termStatus,
  putCallRatio,
  volPremium,
  vixPercentile,
  termSpread,
  skewIndex,
  gammaExposure,
  lastUpdated,
  isLive,
  fetchLog,
  error,
  fetchedOn,
  isCurrent,
}) {
  const gexTotal = React.useMemo(() => {
    if (!gammaExposure) return null;
    if (typeof gammaExposure.total === 'number') return gammaExposure.total;
    if (Array.isArray(gammaExposure)) {
      return gammaExposure.reduce((s, g) => s + Math.abs(g.value || 0), 0);
    }
    return null;
  }, [gammaExposure]);

  return (
    <div className="deriv-sidebar-section">
      <div className="deriv-sidebar-title">VIX & Volatility</div>
      <div className="deriv-metric-card">
        <div className="deriv-metric-row">
          <span className="deriv-metric-name">Spot</span>
          <span className="deriv-metric-num" style={{ color: vixTermStructure?.values?.[0] > 25 ? '#f87171' : vixTermStructure?.values?.[0] > 18 ? '#fbbf24' : '#4ade80' }}>
            <MetricValue value={vixTermStructure?.values?.[0]} seriesKey="vix" timestamp={lastUpdated} format={v => v.toFixed(1)} />
          </span>
        </div>
        {termStatus && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">{termStatus.isContango ? 'Contango' : 'Backwardation'}</span>
            <span className="deriv-metric-num" style={{ color: termStatus.isContango ? '#4ade80' : '#f87171' }}>
              <MetricValue value={termStatus.pct} seriesKey="contangoPct" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
            </span>
          </div>
        )}
        {vixEnrichment?.vvix != null && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">VVIX</span>
            <span className="deriv-metric-num" style={{ color: '#a78bfa' }}><MetricValue value={vixEnrichment.vvix} seriesKey="vvix" timestamp={lastUpdated} format={v => v.toFixed(1)} /></span>
          </div>
        )}
      </div>

      <div className="deriv-sidebar-title" style={{ marginTop: 12 }}>Market Dynamics</div>
      <div className="deriv-metric-card">
        {putCallRatio != null && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">Put/Call</span>
            <span className="deriv-metric-num" style={{ color: putCallRatio > 1.0 ? '#f87171' : putCallRatio < 0.7 ? '#4ade80' : '#fbbf24' }}>
              <MetricValue value={putCallRatio} seriesKey="putCallRatio" timestamp={lastUpdated} format={v => v.toFixed(2)} />
            </span>
          </div>
        )}
        {volPremium?.atm1mIV != null && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">ATM 1M IV</span>
            <span className="deriv-metric-num" style={{ color: '#60a5fa' }}><MetricValue value={volPremium.atm1mIV} seriesKey="atmImpliedVol" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} /></span>
          </div>
        )}
        {vixPercentile != null && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">VIX %ile</span>
            <span className="deriv-metric-num"><MetricValue value={vixPercentile} seriesKey="vixPercentile" timestamp={lastUpdated} format={v => `${v.toFixed(0)}%`} /></span>
          </div>
        )}
      </div>

      <div className="deriv-sidebar-title" style={{ marginTop: 12 }}>Structural Risk</div>
      <div className="deriv-metric-card">
        {typeof termSpread === 'number' && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">Term Spread</span>
            <span className="deriv-metric-num" style={{ color: termSpread > 0 ? '#4ade80' : '#f87171' }}>
              <MetricValue value={termSpread} seriesKey="vix" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}`} />
            </span>
          </div>
        )}
        {skewIndex?.value != null && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">SKEW Index</span>
            <span className="deriv-metric-num" style={{ color: skewIndex.value > 140 ? '#f87171' : skewIndex.value > 120 ? '#fbbf24' : '#4ade80' }}>
              <MetricValue value={skewIndex.value} seriesKey="skew" timestamp={lastUpdated} format={v => v.toFixed(1)} />
            </span>
          </div>
        )}
        {gexTotal != null && (
          <div className="deriv-metric-row">
            <span className="deriv-metric-name">Gamma Exp</span>
            <span className="deriv-metric-num" style={{ color: '#60a5fa' }}>
              <MetricValue
                value={gexTotal}
                seriesKey="gammaExposure"
                timestamp={lastUpdated}
                format={(v) => {
                  if (v == null || !Number.isFinite(Number(v))) return '—';
                  const body = Math.abs(Number(v)).toLocaleString('en-US', {
                    minimumFractionDigits: 1,
                    maximumFractionDigits: 1,
                  });
                  return `$${body}B`;
                }}
              />
            </span>
          </div>
        )}
      </div>

      <DataFooter
        source="Yahoo Finance / CBOE / FRED"
        timestamp={lastUpdated}
        isLive={isLive}
        fetchLog={fetchLog}
        error={error}
        fetchedOn={fetchedOn}
        isCurrent={isCurrent}
      />
    </div>
  );
}

export default React.memo(DerivativesSidebar);
