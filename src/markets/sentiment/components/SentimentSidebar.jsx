import React from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';

function SentimentSidebar({ 
  fearGreedData, 
  riskData, 
  marginDebt, 
  consumerCredit, 
  lastUpdated 
}) {
  const fgiValue = fearGreedData?.value ?? fearGreedData?.score;
  const fgiLabel = fearGreedData?.classification ?? fearGreedData?.label;
  const vixValue = riskData?.vix ?? riskData?.signals?.find(s => s.name === 'VIX')?.value;
  const putCallRatio = riskData?.putCallRatio;

  return (
    <div className="sent-sidebar-content">
      <div className="sent-sidebar-section">
        <div className="sent-sidebar-title">Fear & Greed</div>
        {fgiValue != null && (
          <div className="sent-metric-card">
            <div className="sent-metric-label">Current</div>
            <div className="sent-metric-value" style={{
              color: fgiValue < 25 ? '#ef4444' : fgiValue < 50 ? '#fbbf24' : fgiValue < 75 ? '#22c55e' : '#14b8a6'
            }}>
              <MetricValue value={fgiValue} seriesKey="fearGreed" timestamp={lastUpdated} format={v => v} />
            </div>
            {fgiLabel && <div className="sent-metric-status">{fgiLabel}</div>}
          </div>
        )}
      </div>

      <div className="sent-sidebar-section" style={{ marginTop: 12 }}>
        <div className="sent-sidebar-title">Risk Metrics</div>
        {typeof vixValue === 'number' && (
          <div className="sent-metric-card">
            <div className="sent-metric-row">
              <span className="sent-metric-name">VIX</span>
              <span className="sent-metric-num" style={{ color: vixValue > 25 ? '#f87171' : vixValue > 18 ? '#fbbf24' : '#22c55e' }}>
                <MetricValue value={vixValue} seriesKey="vix" timestamp={lastUpdated} format={v => v.toFixed(1)} />
              </span>
            </div>
          </div>
        )}
        {typeof putCallRatio === 'number' && (
          <div className="sent-metric-card">
            <div className="sent-metric-row">
              <span className="sent-metric-name">Put/Call</span>
              <span className="sent-metric-num" style={{ color: putCallRatio > 1.2 ? '#22c55e' : putCallRatio < 0.8 ? '#f87171' : '#fbbf24' }}>
                <MetricValue value={putCallRatio} seriesKey="putCallRatio" timestamp={lastUpdated} format={v => v.toFixed(2)} />
              </span>
            </div>
          </div>
        )}
        {(() => {
          const hySignal = riskData?.signals?.find(s => s.name?.includes('HY'));
          return hySignal && typeof hySignal.value === 'number' ? (
            <div className="sent-metric-card">
              <div className="sent-metric-row">
                <span className="sent-metric-name">HY Spread</span>
                <span className="sent-metric-num" style={{ color: hySignal.value > 400 ? '#f87171' : '#fbbf24' }}>
                  <MetricValue value={hySignal.value} seriesKey="hyOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} />
                </span>
              </div>
            </div>
          ) : null;
        })()}
      </div>

      {/* Server returns marginDebt/consumerCredit as { dates, values }
          (history series). Read the latest value off `values[]` and
          rescale: BOGZ1FL663067003Q is millions, TOTALSL is billions. */}
      {(marginDebt?.values?.length || consumerCredit?.values?.length) ? (
        <div className="sent-sidebar-section" style={{ marginTop: 12 }}>
          <div className="sent-sidebar-title">Leverage</div>
          {marginDebt?.values?.length > 0 && (
            <div className="sent-metric-card">
              <div className="sent-metric-row">
                <span className="sent-metric-name">Margin Debt</span>
                <span className="sent-metric-num" style={{ color: '#a78bfa' }}>
                  <MetricValue value={marginDebt.values[marginDebt.values.length - 1] * 1e6} seriesKey="marginDebt" timestamp={lastUpdated} format={v => typeof v === 'number' ? `$${(v / 1e9).toFixed(0)}B` : '—'} />
                </span>
              </div>
            </div>
          )}
          {consumerCredit?.values?.length > 0 && (
            <div className="sent-metric-card">
              <div className="sent-metric-row">
                <span className="sent-metric-name">Consumer Credit</span>
                <span className="sent-metric-num" style={{ color: '#60a5fa' }}>
                  <MetricValue value={consumerCredit.values[consumerCredit.values.length - 1] * 1e9} seriesKey="consumerCredit" timestamp={lastUpdated} format={v => typeof v === 'number' ? `$${(v / 1e9).toFixed(0)}B` : '—'} />
                </span>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default React.memo(SentimentSidebar);
