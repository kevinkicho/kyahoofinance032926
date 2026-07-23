import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';

function toneForSignal(signal) {
  if (signal === 'risk-on' || signal === 'greed') return '#4ade80';
  if (signal === 'risk-off' || signal === 'fear') return '#f87171';
  return '#fbbf24';
}

function findSignal(signals, ...names) {
  if (!Array.isArray(signals)) return null;
  for (const name of names) {
    const hit = signals.find(s => s?.name === name || s?.name?.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
  }
  // partial match fallback
  for (const name of names) {
    const hit = signals.find(s => s?.name?.toLowerCase().includes(name.toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

function num(...candidates) {
  for (const v of candidates) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

/**
 * Market Snapshot sidebar — Fear & Greed, full risk metrics strip, leverage.
 * Risk metrics are resolved from top-level riskData fields and the signals[]
 * array so a missing alias (e.g. riskData.vix) does not blank the section.
 */
function SentimentSidebar({
  fearGreedData,
  riskData,
  marginDebt,
  consumerCredit,
  vvixHistory,
  fsiHistory,
  lastUpdated,
}) {
  const fgiValue = num(fearGreedData?.value, fearGreedData?.score);
  const fgiLabel = fearGreedData?.classification ?? fearGreedData?.label;
  const fgiIndicators = Array.isArray(fearGreedData?.indicators) ? fearGreedData.indicators : [];

  const risk = useMemo(() => {
    const signals = riskData?.signals || [];
    const vix = num(riskData?.vix, findSignal(signals, 'VIX')?.value);
    const vvix = num(
      riskData?.vvix,
      findSignal(signals, 'VVIX')?.value,
      vvixHistory?.values?.at?.(-1),
    );
    const move = num(riskData?.move, findSignal(signals, 'MOVE')?.value);
    const skew = num(riskData?.skew, findSignal(signals, 'SKEW')?.value);
    const vix3m = num(riskData?.vix3m, findSignal(signals, 'VIX3M')?.value);
    const hy = num(
      riskData?.hyOas,
      riskData?.hySpread,
      findSignal(signals, 'HY Credit Spread', 'HY')?.value,
    );
    const ig = num(
      riskData?.igOas,
      riskData?.igSpread,
      findSignal(signals, 'IG Credit Spread', 'IG')?.value,
    );
    const yc = num(riskData?.yieldCurve, findSignal(signals, 'Yield Curve')?.value);
    const fsi = num(
      riskData?.fsi,
      findSignal(signals, 'Financial Stress')?.value,
      fsiHistory?.values?.at?.(-1),
    );
    const goldVsUsd = num(riskData?.goldVsUsd, findSignal(signals, 'Gold vs USD')?.value);
    const emVsUs = num(riskData?.emVsUs, findSignal(signals, 'EM vs US Equities')?.value);
    const putCall = num(riskData?.putCallRatio, riskData?.putCall);

    // If OAS still looks like percent (legacy cache < 20), scale to bps for display.
    const hyBps = hy != null && hy < 30 ? Math.round(hy * 100) : hy;
    const igBps = ig != null && ig < 20 ? Math.round(ig * 100) : ig;

    const rows = [
      {
        key: 'vix',
        label: 'VIX',
        value: vix,
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: vix == null ? undefined : vix > 25 ? '#f87171' : vix > 18 ? '#fbbf24' : '#4ade80',
        sub: riskData?.vixPercentile != null ? `${riskData.vixPercentile}th %ile` : findSignal(signals, 'VIX')?.description,
      },
      {
        key: 'vvix',
        label: 'VVIX',
        value: vvix,
        seriesKey: 'vvix',
        format: v => v.toFixed(1),
        color: vvix == null ? undefined : vvix > 120 ? '#f87171' : vvix > 90 ? '#fbbf24' : '#4ade80',
        sub: 'vol-of-vol',
      },
      {
        key: 'vix3m',
        label: 'VIX 3M',
        value: vix3m,
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: undefined,
        sub: 'term structure',
      },
      {
        key: 'move',
        label: 'MOVE',
        value: move,
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: move == null ? undefined : move > 120 ? '#f87171' : move > 80 ? '#fbbf24' : '#4ade80',
        sub: 'bond vol',
      },
      {
        key: 'skew',
        label: 'SKEW',
        value: skew,
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: skew == null ? undefined : skew > 140 ? '#f87171' : '#fbbf24',
        sub: 'tail risk',
      },
      {
        key: 'hy',
        label: 'HY OAS',
        value: hyBps,
        seriesKey: 'hyOAS',
        format: v => `${Math.round(v)} bps`,
        color: hyBps == null ? undefined : hyBps > 450 ? '#f87171' : hyBps > 300 ? '#fbbf24' : '#4ade80',
        sub: findSignal(signals, 'HY Credit Spread')?.description || 'high yield',
      },
      {
        key: 'ig',
        label: 'IG OAS',
        value: igBps,
        seriesKey: 'igOAS',
        format: v => `${Math.round(v)} bps`,
        color: igBps == null ? undefined : igBps > 150 ? '#f87171' : igBps > 100 ? '#fbbf24' : '#4ade80',
        sub: findSignal(signals, 'IG Credit Spread')?.description || 'inv. grade',
      },
      {
        key: 'yc',
        label: '10Y–2Y',
        value: yc,
        seriesKey: 'yieldCurve',
        format: v => `${v.toFixed(2)}%`,
        color: yc == null ? undefined : yc < 0 ? '#f87171' : yc < 0.5 ? '#fbbf24' : '#4ade80',
        sub: findSignal(signals, 'Yield Curve')?.description || 'curve',
      },
      {
        key: 'fsi',
        label: 'STLFSI',
        value: fsi,
        seriesKey: 'financialStressIndex',
        format: v => v.toFixed(2),
        color: fsi == null ? undefined : fsi > 1 ? '#f87171' : fsi > 0 ? '#fbbf24' : '#4ade80',
        sub: 'fin. stress',
      },
      {
        key: 'gold',
        label: 'Gold vs USD',
        value: goldVsUsd,
        seriesKey: 'gold',
        format: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
        color: goldVsUsd == null ? undefined : goldVsUsd > 2 ? '#fbbf24' : '#4ade80',
        sub: '1m relative',
      },
      {
        key: 'em',
        label: 'EM vs US',
        value: emVsUs,
        seriesKey: 'emOAS',
        format: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`,
        color: emVsUs == null ? undefined : emVsUs < -2 ? '#f87171' : '#4ade80',
        sub: '1m relative',
      },
      {
        key: 'pc',
        label: 'Put/Call',
        value: putCall,
        seriesKey: 'putCallRatio',
        format: v => v.toFixed(2),
        color: putCall == null ? undefined : putCall > 1.2 ? '#4ade80' : putCall < 0.8 ? '#f87171' : '#fbbf24',
        sub: 'equity options',
      },
    ].filter(r => r.value != null);

    return {
      overallScore: num(riskData?.overallScore),
      overallLabel: riskData?.overallLabel || null,
      rows,
      signals,
    };
  }, [riskData, vvixHistory, fsiHistory]);

  const marginLatest = marginDebt?.values?.length
    ? marginDebt.values[marginDebt.values.length - 1]
    : null;
  const creditLatest = consumerCredit?.values?.length
    ? consumerCredit.values[consumerCredit.values.length - 1]
    : null;

  return (
    <div className="sent-sidebar-content">
      {/* Regime hero */}
      {(risk.overallLabel || fgiValue != null) && (
        <div className="sent-snapshot-hero">
          {risk.overallLabel && (
            <div className="sent-snapshot-hero-block">
              <span className="sent-snapshot-hero-label">Risk regime</span>
              <strong
                className="sent-snapshot-hero-value"
                style={{ color: toneForSignal(risk.overallLabel === 'Risk-On' ? 'risk-on' : risk.overallLabel === 'Risk-Off' ? 'risk-off' : 'neutral') }}
              >
                {risk.overallLabel}
              </strong>
              {risk.overallScore != null && (
                <span className="sent-snapshot-hero-sub">score {risk.overallScore}</span>
              )}
            </div>
          )}
          {fgiValue != null && (
            <div className="sent-snapshot-hero-block">
              <span className="sent-snapshot-hero-label">Fear & Greed</span>
              <strong
                className="sent-snapshot-hero-value"
                style={{
                  color: fgiValue < 25 ? '#ef4444' : fgiValue < 50 ? '#fbbf24' : fgiValue < 75 ? '#22c55e' : '#14b8a6',
                }}
              >
                <MetricValue value={fgiValue} seriesKey="fearGreed" timestamp={lastUpdated} format={v => Math.round(v)} />
              </strong>
              {fgiLabel && <span className="sent-snapshot-hero-sub">{fgiLabel}</span>}
            </div>
          )}
        </div>
      )}

      {/* F&G component indicators */}
      {fgiIndicators.length > 0 && (
        <div className="sent-sidebar-section">
          <div className="sent-sidebar-title">F&G Components</div>
          <div className="sent-snapshot-grid">
            {fgiIndicators.map(ind => (
              <div key={ind.name} className="sent-snapshot-chip">
                <span className="sent-snapshot-chip-label">{ind.name}</span>
                <strong
                  className="sent-snapshot-chip-value"
                  style={{ color: toneForSignal(ind.signal) }}
                >
                  {ind.value == null ? '—' : typeof ind.value === 'number' ? (Number.isInteger(ind.value) ? ind.value : ind.value.toFixed(1)) : ind.value}
                </strong>
                {ind.signal && (
                  <span className="sent-snapshot-chip-sub" style={{ color: toneForSignal(ind.signal) }}>
                    {ind.signal}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk metrics — always show section; empty state if no rows */}
      <div className="sent-sidebar-section">
        <div className="sent-sidebar-title">Risk Metrics</div>
        {risk.rows.length === 0 ? (
          <div className="sent-snapshot-empty">No live risk metrics yet</div>
        ) : (
          <div className="sent-snapshot-list">
            {risk.rows.map(row => (
              <div key={row.key} className="sent-snapshot-row">
                <div className="sent-snapshot-row-main">
                  <span className="sent-snapshot-row-label">{row.label}</span>
                  {row.sub && <span className="sent-snapshot-row-sub">{row.sub}</span>}
                </div>
                <span className="sent-snapshot-row-value" style={row.color ? { color: row.color } : undefined}>
                  <MetricValue
                    value={row.value}
                    seriesKey={row.seriesKey}
                    timestamp={lastUpdated}
                    format={row.format}
                  />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leverage */}
      {(marginLatest != null || creditLatest != null) && (
        <div className="sent-sidebar-section">
          <div className="sent-sidebar-title">Leverage</div>
          <div className="sent-snapshot-list">
            {marginLatest != null && (
              <div className="sent-snapshot-row">
                <div className="sent-snapshot-row-main">
                  <span className="sent-snapshot-row-label">Margin Debt</span>
                  <span className="sent-snapshot-row-sub">broker-dealer</span>
                </div>
                <span className="sent-snapshot-row-value" style={{ color: '#a78bfa' }}>
                  <MetricValue
                    value={marginLatest * 1e6}
                    seriesKey="marginDebt"
                    timestamp={lastUpdated}
                    format={v => (typeof v === 'number' ? `$${(v / 1e9).toFixed(0)}B` : '—')}
                  />
                </span>
              </div>
            )}
            {creditLatest != null && (
              <div className="sent-snapshot-row">
                <div className="sent-snapshot-row-main">
                  <span className="sent-snapshot-row-label">Consumer Credit</span>
                  <span className="sent-snapshot-row-sub">outstanding</span>
                </div>
                <span className="sent-snapshot-row-value" style={{ color: '#60a5fa' }}>
                  <MetricValue
                    value={creditLatest * 1e9}
                    seriesKey="consumerCredit"
                    timestamp={lastUpdated}
                    format={v => (typeof v === 'number' ? `$${(v / 1e12).toFixed(2)}T` : '—')}
                  />
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(SentimentSidebar);
