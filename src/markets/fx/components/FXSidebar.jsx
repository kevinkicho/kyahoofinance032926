import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import DataFooter from '../../../components/DataFooter/DataFooter';

// Currency baskets used for the G10 / EM averages shown in the sidebar.
const G10 = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'NZD'];
const EM = ['CNY', 'HKD', 'SGD', 'INR', 'KRW', 'MXN', 'BRL', 'ZAR'];

// Series keys for MetricValue popovers — match the entries in
// components/MetricValue/MetricValue.jsx so each KPI can show its FRED ID.
const FX_SERIES = {
  'EUR/USD': 'fxEUR',
  'USD/JPY': 'fxJPY',
  'GBP/USD': 'fxGBP',
  'USD/CHF': 'fxCHF',
  'AUD/USD': 'fxAUD',
  'USD/CAD': 'fxCAD',
};

/**
 * FXSidebar — formerly rendered as a loose left column outside the bento
 * grid; now lives as a real BentoWrapper child (see FXDashboard.jsx) so it
 * inherits drag/resize/persist behavior from react-grid-layout.
 */
export default function FXSidebar({
  spotRates, changes, rateDifferentials, cotHistory,
  lastUpdated, isLive, fetchLog, error, fetchedOn, isCurrent,
}) {
  const keyPairs = useMemo(() => {
    const pairs = [];
    if (spotRates?.EUR) pairs.push({ label: 'EUR/USD', value: (1 / spotRates.EUR).toFixed(4), change: changes?.EUR });
    if (spotRates?.JPY) pairs.push({ label: 'USD/JPY', value: spotRates.JPY.toFixed(2), change: changes?.JPY });
    if (spotRates?.GBP) pairs.push({ label: 'GBP/USD', value: (1 / spotRates.GBP).toFixed(4), change: changes?.GBP });
    if (spotRates?.CHF) pairs.push({ label: 'USD/CHF', value: spotRates.CHF.toFixed(4), change: changes?.CHF });
    return pairs;
  }, [spotRates, changes]);

  const extremes = useMemo(() => {
    const sorted = Object.entries(changes || {}).filter(([c]) => c !== 'USD').sort((a, b) => b[1] - a[1]);
    return {
      strongest: sorted[0] ? { code: sorted[0][0], change: sorted[0][1] } : null,
      weakest: sorted[sorted.length - 1] ? { code: sorted[sorted.length - 1][0], change: sorted[sorted.length - 1][1] } : null,
    };
  }, [changes]);

  const averages = useMemo(() => {
    const g10Vals = G10.filter(c => changes?.[c] != null);
    const emVals = EM.filter(c => changes?.[c] != null);
    const g10Avg = g10Vals.length ? G10.filter(c => changes?.[c] != null).reduce((s, c) => s + changes[c], 0) / g10Vals.length : 0;
    const emAvg = emVals.length ? EM.filter(c => changes?.[c] != null).reduce((s, c) => s + changes[c], 0) / emVals.length : 0;
    return { g10: g10Avg, em: emAvg };
  }, [changes]);

  const rateDiff = useMemo(() => {
    if (!rateDifferentials) return [];
    return Object.entries(rateDifferentials).filter(([, v]) => v != null).slice(0, 6);
  }, [rateDifferentials]);

  const cotLatest = useMemo(() => {
    if (!cotHistory || !Object.keys(cotHistory).length) return [];
    return Object.entries(cotHistory).slice(0, 5).map(([ccy, data]) => {
      const latest = data[data.length - 1];
      return { ccy, net: latest?.net ?? null };
    });
  }, [cotHistory]);

  const fmt = (v, suffix = '%') => v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}${suffix}`;
  const color = (v) => v == null ? 'var(--text-muted)' : v >= 0 ? '#4ade80' : '#f87171';

  return (
    <div className="fx-sidebar fx-sidebar--in-bento">
      <div className="fx-sidebar-section">
        <h3 className="fx-sidebar-section-title">Key Pairs</h3>
        {keyPairs.map((pair) => (
          <div key={pair.label} className="fx-sidebar-metric">
            <span className="fx-sidebar-metric-label">{pair.label}</span>
            <span className="fx-sidebar-metric-value" style={{ color: color(pair.change) }}>
              <MetricValue value={parseFloat(pair.value)} seriesKey={FX_SERIES[pair.label]} timestamp={lastUpdated} format={v => v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })} />
              {pair.change != null && (
                <span className="fx-sidebar-metric-change" style={{ color: color(pair.change) }}> {fmt(pair.change)}</span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="fx-sidebar-section">
        <h3 className="fx-sidebar-section-title">Movers</h3>
        {extremes.strongest && (
          <div className="fx-sidebar-metric">
            <span className="fx-sidebar-metric-label">Strongest</span>
            <span className="fx-sidebar-metric-value" style={{ color: '#4ade80' }}>{extremes.strongest.code} {fmt(extremes.strongest.change)}</span>
          </div>
        )}
        {extremes.weakest && (
          <div className="fx-sidebar-metric">
            <span className="fx-sidebar-metric-label">Weakest</span>
            <span className="fx-sidebar-metric-value" style={{ color: '#f87171' }}>{extremes.weakest.code} {fmt(extremes.weakest.change)}</span>
          </div>
        )}
      </div>

      <div className="fx-sidebar-section">
        <h3 className="fx-sidebar-section-title">Averages</h3>
        <div className="fx-sidebar-metric">
          <span className="fx-sidebar-metric-label">G10 Avg</span>
          <span className="fx-sidebar-metric-value" style={{ color: color(averages.g10) }}>{fmt(averages.g10)}</span>
        </div>
        <div className="fx-sidebar-metric">
          <span className="fx-sidebar-metric-label">EM Avg</span>
          <span className="fx-sidebar-metric-value" style={{ color: color(averages.em) }}>{fmt(averages.em)}</span>
        </div>
      </div>

      {rateDiff.length > 0 && (
        <div className="fx-sidebar-section">
          <h3 className="fx-sidebar-section-title">Rate Differentials</h3>
          {rateDiff.map(([ccy, diff]) => (
            <div key={ccy} className="fx-sidebar-metric">
              <span className="fx-sidebar-metric-label">{ccy}</span>
              <span className="fx-sidebar-metric-value" style={{ color: color(diff) }}>{fmt(diff)}</span>
            </div>
          ))}
        </div>
      )}

      {cotLatest.length > 0 && (
        <div className="fx-sidebar-section">
          <h3 className="fx-sidebar-section-title">COT Positioning</h3>
          {cotLatest.map(({ ccy, net }) => (
            <div key={ccy} className="fx-sidebar-metric">
              <span className="fx-sidebar-metric-label">{ccy}</span>
              <span className="fx-sidebar-metric-value" style={{ color: color(net) }}>{net != null ? fmt(net, '% OI') : '—'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="fx-sidebar-status">
        {isLive ? <span className="fx-sidebar-live">● Live</span> : <span className="fx-sidebar-fallback">● Awaiting data</span>}
      </div>

      <DataFooter
        source="Frankfurter / FRED / CFTC"
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
