// src/markets/sentiment/components/RiskDashboard.jsx
import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import { signalList, vvixHistoryLooksReal } from './SentimentLiveChips.js';
import './SentimentComponents.css';

function badgeClass(signal) {
  if (signal === 'risk-on' || signal === 'greed') return 'sent-badge sent-badge-on';
  if (signal === 'risk-off' || signal === 'fear') return 'sent-badge sent-badge-off';
  return 'sent-badge sent-badge-neu';
}

function badgeLabel(signal) {
  if (signal === 'risk-on' || signal === 'greed') return 'Risk-On';
  if (signal === 'risk-off' || signal === 'fear') return 'Risk-Off';
  return 'Neutral';
}

function scoreColor(score, textSecondary = '#94a3b8') {
  if (score >= 65) return '#7c3aed';
  if (score >= 50) return '#a78bfa';
  if (score >= 35) return textSecondary;
  return '#f87171';
}

function n(...vals) {
  for (const v of vals) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function findSig(signals, ...names) {
  if (!Array.isArray(signals)) return null;
  for (const name of names) {
    const hit = signals.find(s => s?.name === name || s?.name?.toLowerCase() === name.toLowerCase());
    if (hit) return hit;
  }
  for (const name of names) {
    const hit = signals.find(s => s?.name?.toLowerCase().includes(String(name).toLowerCase()));
    if (hit) return hit;
  }
  return null;
}

function fmtShortDate(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).slice(0, 10).split('-');
  if (parts.length >= 2) return `${parts[1]}/${parts[0].slice(2)}`;
  return dateStr;
}

function buildLineOption({ dates, values, color, colors, areaColor, yFmt }) {
  const clean = (values || []).map(v => (typeof v === 'number' && Number.isFinite(v) ? v : null));
  const labels = (dates || []).map(fmtShortDate);
  if (!labels.length || !clean.some(v => v != null)) return null;
  const nums = clean.filter(v => v != null);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const pad = (max - min) * 0.08 || 1;
  const interval = Math.max(0, Math.floor(labels.length / 5) - 1);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const v = params[0]?.value;
        const shown = v == null ? '—' : (yFmt ? yFmt(v) : Number(v).toLocaleString());
        return `${params[0].axisValue}: <b>${shown}</b>`;
      },
    },
    grid: { top: 8, right: 6, bottom: 16, left: 4, containLabel: true },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: colors.textDim, fontSize: 8, interval },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      min: Math.floor(min - pad),
      max: Math.ceil(max + pad),
      axisLabel: {
        color: colors.textMuted,
        fontSize: 8,
        formatter: (v) => (yFmt ? yFmt(v) : v),
      },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      type: 'line',
      data: clean,
      lineStyle: { width: 1.5, color },
      itemStyle: { color },
      symbol: 'none',
      areaStyle: areaColor
        ? {
            color: {
              type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: `${areaColor}44` },
                { offset: 1, color: `${areaColor}05` },
              ],
            },
          }
        : undefined,
    }],
  };
}

/**
 * Build a complete, displayable signal list from riskData.signals + flat
 * fields so the dashboard never depends on a single sparse shape.
 */
function buildDisplaySignals(riskData, fsiHistory) {
  const signals = signalList(riskData);
  const rows = [];
  const push = (row) => {
    if (row.value == null || !Number.isFinite(Number(row.value))) return;
    rows.push(row);
  };

  const fromSig = (name, aliases = []) => findSig(signals, name, ...aliases);

  // Prefer flat fields (enriched server payload), then signals[]
  const vix = n(riskData?.vix, fromSig('VIX')?.value);
  const vvix = n(riskData?.vvix, fromSig('VVIX')?.value);
  const move = n(riskData?.move, fromSig('MOVE')?.value);
  const skew = n(riskData?.skew, fromSig('SKEW')?.value);
  const vix3m = n(riskData?.vix3m);
  let hy = n(riskData?.hyOas, riskData?.hySpread, fromSig('HY Credit Spread', 'HY')?.value);
  let ig = n(riskData?.igOas, riskData?.igSpread, fromSig('IG Credit Spread', 'IG')?.value);
  // Legacy percent OAS → bps
  if (hy != null && hy < 30) hy = Math.round(hy * 100);
  if (ig != null && ig < 20) ig = Math.round(ig * 100);
  const yc = n(riskData?.yieldCurve, fromSig('Yield Curve')?.value);
  const fsi = n(riskData?.fsi, fromSig('Financial Stress')?.value, fsiHistory?.values?.at?.(-1));
  const gold = n(riskData?.goldVsUsd, fromSig('Gold vs USD')?.value);
  const em = n(riskData?.emVsUs, fromSig('EM vs US Equities')?.value);
  const term = vix != null && vix3m != null ? Math.round((vix3m - vix) * 10) / 10 : null;

  const meta = (name, value, fmt, signal, description, seriesKey) => ({
    name, value, fmt, signal: signal || 'neutral', description: description || '', seriesKey,
  });

  push(meta(
    'Yield Curve',
    yc,
    yc != null ? `${yc.toFixed(2)}%` : '—',
    fromSig('Yield Curve')?.signal || (yc > 0.5 ? 'risk-on' : yc < -0.5 ? 'risk-off' : 'neutral'),
    fromSig('Yield Curve')?.description || (yc != null && yc < 0 ? 'Inverted — recession signal' : 'Growth / policy path'),
    'yieldCurve',
  ));
  push(meta(
    'HY OAS',
    hy,
    hy != null ? `${Math.round(hy)} bps` : '—',
    fromSig('HY Credit Spread')?.signal || (hy < 350 ? 'risk-on' : hy > 500 ? 'risk-off' : 'neutral'),
    fromSig('HY Credit Spread')?.description || 'High-yield credit stress',
    'hyOAS',
  ));
  push(meta(
    'IG OAS',
    ig,
    ig != null ? `${Math.round(ig)} bps` : '—',
    fromSig('IG Credit Spread')?.signal || (ig < 100 ? 'risk-on' : ig > 150 ? 'risk-off' : 'neutral'),
    fromSig('IG Credit Spread')?.description || 'Investment-grade credit',
    'igOAS',
  ));
  push(meta(
    'VIX',
    vix,
    vix != null ? vix.toFixed(1) : '—',
    fromSig('VIX')?.signal || (vix < 15 ? 'risk-on' : vix > 25 ? 'risk-off' : 'neutral'),
    riskData?.vixPercentile != null
      ? `${riskData.vixPercentile}th percentile · equity implied vol`
      : (fromSig('VIX')?.description || 'Equity implied vol'),
    'vix',
  ));
  push(meta(
    'VVIX',
    vvix != null && vvix > 40 ? vvix : null,
    vvix != null && vvix > 40 ? vvix.toFixed(1) : '—',
    fromSig('VVIX')?.signal || (vvix < 90 ? 'risk-on' : vvix > 120 ? 'risk-off' : 'neutral'),
    fromSig('VVIX')?.description || 'Vol-of-vol',
    'vvix',
  ));
  push(meta(
    'VIX 3M',
    vix3m,
    vix3m != null ? vix3m.toFixed(1) : '—',
    term != null && term < 0 ? 'risk-off' : 'risk-on',
    '3-month equity vol',
    'vix',
  ));
  push(meta(
    'Term 3M−1M',
    term,
    term != null ? `${term >= 0 ? '+' : ''}${term.toFixed(1)}` : '—',
    term != null && term < 0 ? 'risk-off' : 'risk-on',
    term != null && term < 0 ? 'Backwardation — stress' : 'Contango — calm',
    'vix',
  ));
  push(meta(
    'MOVE',
    move,
    move != null ? move.toFixed(1) : '—',
    fromSig('MOVE')?.signal || (move < 80 ? 'risk-on' : move > 120 ? 'risk-off' : 'neutral'),
    fromSig('MOVE')?.description || 'Treasury bond vol',
    'vix',
  ));
  push(meta(
    'SKEW',
    skew,
    skew != null ? skew.toFixed(1) : '—',
    fromSig('SKEW')?.signal || (skew > 140 ? 'risk-off' : 'neutral'),
    fromSig('SKEW')?.description || 'Tail-risk premium',
    'vix',
  ));
  push(meta(
    'Gold vs USD',
    gold,
    gold != null ? `${gold >= 0 ? '+' : ''}${gold.toFixed(1)}%` : '—',
    fromSig('Gold vs USD')?.signal || (gold > 2 ? 'risk-off' : gold < -2 ? 'risk-on' : 'neutral'),
    fromSig('Gold vs USD')?.description || 'Safe-haven demand (1m)',
    'gold',
  ));
  push(meta(
    'EM vs US',
    em,
    em != null ? `${em >= 0 ? '+' : ''}${em.toFixed(1)}%` : '—',
    fromSig('EM vs US Equities')?.signal || (em > 2 ? 'risk-on' : em < -2 ? 'risk-off' : 'neutral'),
    fromSig('EM vs US Equities')?.description || 'Global risk appetite (1m)',
    'emOAS',
  ));
  push(meta(
    'STLFSI',
    fsi,
    fsi != null ? fsi.toFixed(2) : '—',
    fromSig('Financial Stress')?.signal || (fsi < 0 ? 'risk-on' : fsi > 1 ? 'risk-off' : 'neutral'),
    fromSig('Financial Stress')?.description || 'St. Louis financial stress',
    'financialStressIndex',
  ));

  // If server already sent a full signals list with fmt, merge any extras not covered
  for (const s of signals) {
    if (s?.value == null) continue;
    if (rows.some(r => r.name === s.name || r.name.includes(s.name.split(' ')[0]))) continue;
    let value = s.value;
    let fmt = s.fmt;
    if (/HY|IG/i.test(s.name) && value < 30 && !String(fmt || '').includes('bps')) {
      value = Math.round(value * 100);
      fmt = `${value} bps`;
    }
    rows.push({
      name: s.name,
      value,
      fmt: fmt || String(value),
      signal: s.signal || 'neutral',
      description: s.description || '',
      seriesKey: 'riskScore',
    });
  }

  return rows;
}

export default function RiskDashboard({
  riskData,
  marginDebt,
  vvixHistory,
  fsiHistory,
  bare = false,
  lastUpdated,
}) {
  const { colors } = useTheme();

  const displaySignals = useMemo(
    () => buildDisplaySignals(riskData, fsiHistory),
    [riskData, fsiHistory],
  );

  const overallScore = n(riskData?.overallScore) ?? (
    displaySignals.length
      ? Math.round(
          displaySignals.reduce((sum, s) => {
            const map = { 'risk-on': 100, greed: 100, neutral: 50, 'risk-off': 0, fear: 0 };
            return sum + (map[s.signal] ?? 50);
          }, 0) / displaySignals.length,
        )
      : null
  );
  const overallLabel = riskData?.overallLabel
    || (overallScore == null ? '—'
      : overallScore >= 65 ? 'Risk-On'
      : overallScore <= 35 ? 'Risk-Off'
      : 'Neutral');
  const color = scoreColor(overallScore ?? 50, colors.textSecondary);

  const fsiOption = useMemo(() => {
    if (!fsiHistory?.dates?.length || !fsiHistory?.values?.length) return null;
    return buildLineOption({
      dates: fsiHistory.dates,
      values: fsiHistory.values,
      color: '#06b6d4',
      colors,
      areaColor: '#06b6d4',
      yFmt: (v) => Number(v).toFixed(2),
    });
  }, [fsiHistory, colors]);

  const marginOption = useMemo(() => {
    if (!marginDebt?.dates?.length || !marginDebt?.values?.length) return null;
    // BOGZ1FL663067003Q is $ millions — chart in $B
    const valuesBn = marginDebt.values.map(v => (typeof v === 'number' ? Math.round(v / 1000 * 10) / 10 : null));
    const last = valuesBn[valuesBn.length - 1];
    const prev = valuesBn[valuesBn.length - 2];
    const rising = last != null && prev != null && last >= prev;
    const lineColor = rising ? '#7c3aed' : '#f87171';
    return {
      option: buildLineOption({
        dates: marginDebt.dates,
        values: valuesBn,
        color: lineColor,
        colors,
        areaColor: lineColor,
        yFmt: (v) => `$${Number(v).toFixed(0)}B`,
      }),
      rising,
      last,
    };
  }, [marginDebt, colors]);

  // Prefer real VVIX spot series if history looks like VIX3M (< 50); else use history
  const vvixSpot = n(riskData?.vvix);
  const vvixHistLooksReal = vvixHistoryLooksReal(vvixHistory);
  const vvixOption = useMemo(() => {
    if (vvixHistLooksReal && vvixHistory?.dates?.length) {
      return buildLineOption({
        dates: vvixHistory.dates,
        values: vvixHistory.values,
        color: '#f97316',
        colors,
        areaColor: '#f97316',
        yFmt: (v) => Number(v).toFixed(1),
      });
    }
    // FRED VXVCLS is ~VIX3M — chart FSI companion instead isn't right; skip chart,
    // spot VVIX still shows in the signal table.
    return null;
  }, [vvixHistory, vvixHistLooksReal, colors]);

  const onCount = displaySignals.filter(s => s.signal === 'risk-on' || s.signal === 'greed').length;
  const offCount = displaySignals.filter(s => s.signal === 'risk-off' || s.signal === 'fear').length;
  const neuCount = displaySignals.length - onCount - offCount;

  if (!riskData && !displaySignals.length && !fsiHistory && !marginDebt) {
    return (
      <div className="sent-snapshot-empty" style={{ padding: 16 }}>
        No risk dashboard data available
      </div>
    );
  }

  const body = (
    <div className="sent-risk-dash">
      {/* Hero score + breadth */}
      <div className="sent-risk-hero">
        <div className="sent-risk-hero-score">
          <span className="sent-risk-hero-label">Risk appetite</span>
          <strong className="sent-risk-hero-value" style={{ color }}>
            {overallScore != null ? overallScore : '—'}
          </strong>
          <span className="sent-risk-hero-regime" style={{ color }}>{overallLabel}</span>
        </div>
        <div className="sent-risk-hero-breadth">
          <div className="sent-risk-breadth-row">
            <span className="sent-badge sent-badge-on">Risk-On {onCount}</span>
            <span className="sent-badge sent-badge-neu">Neutral {neuCount}</span>
            <span className="sent-badge sent-badge-off">Risk-Off {offCount}</span>
          </div>
          <div className="sent-risk-breadth-bar">
            {displaySignals.length > 0 && (
              <>
                <span style={{ flex: onCount || 0.001, background: '#7c3aed' }} />
                <span style={{ flex: neuCount || 0.001, background: '#64748b' }} />
                <span style={{ flex: offCount || 0.001, background: '#f87171' }} />
              </>
            )}
          </div>
          <div className="sent-risk-hero-hint">{displaySignals.length} live cross-asset signals</div>
        </div>
      </div>

      {/* Dense signal table */}
      {displaySignals.length === 0 ? (
        <div className="sent-snapshot-empty">Signal list empty — waiting for FRED / Yahoo</div>
      ) : (
        <div className="sent-risk-table-wrap">
          <table className="sent-risk-table">
            <thead>
              <tr>
                <th className="sent-risk-th sent-risk-th-name">Signal</th>
                <th className="sent-risk-th">Value</th>
                <th className="sent-risk-th">Stance</th>
                <th className="sent-risk-th sent-risk-th-desc">Read</th>
              </tr>
            </thead>
            <tbody>
              {displaySignals.map(sig => (
                <tr key={sig.name} className="sent-risk-tr">
                  <td className="sent-risk-td sent-risk-td-name">{sig.name}</td>
                  <td className="sent-risk-td sent-risk-td-val">
                    <MetricValue
                      value={sig.value}
                      seriesKey={sig.seriesKey || 'riskScore'}
                      timestamp={lastUpdated}
                      format={() => sig.fmt}
                    />
                  </td>
                  <td className="sent-risk-td">
                    <span className={badgeClass(sig.signal)}>{badgeLabel(sig.signal)}</span>
                  </td>
                  <td className="sent-risk-td sent-risk-td-desc">{sig.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mini charts: FSI + Margin (+ VVIX history when real) */}
      {(fsiOption || marginOption || vvixOption) && (
        <div className={`sent-risk-charts ${[fsiOption, marginOption, vvixOption].filter(Boolean).length >= 3 ? 'cols-3' : 'cols-2'}`}>
          {fsiOption && (
            <div className="sent-risk-chart-card">
              <div className="sent-risk-chart-title">STLFSI · Financial stress</div>
              <div className="sent-risk-chart-wrap">
                <SafeECharts
                  option={fsiOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{ title: 'STLFSI', source: 'FRED', endpoint: '/api/sentiment', series: [{ id: 'STLFSI4' }], updatedAt: lastUpdated }}
                />
              </div>
            </div>
          )}
          {marginOption && (
            <div className="sent-risk-chart-card">
              <div className="sent-risk-chart-title">
                Margin debt
                <span style={{ marginLeft: 6, color: marginOption.rising ? '#7c3aed' : '#f87171' }}>
                  {marginOption.rising ? '▲' : '▼'}
                  {marginOption.last != null ? ` $${marginOption.last.toFixed(0)}B` : ''}
                </span>
              </div>
              <div className="sent-risk-chart-wrap">
                <SafeECharts
                  option={marginOption.option}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{ title: 'Margin Debt', source: 'FRED', endpoint: '/api/sentiment', series: [{ id: 'BOGZ1FL663067003Q' }], updatedAt: lastUpdated }}
                />
              </div>
            </div>
          )}
          {vvixOption && (
            <div className="sent-risk-chart-card">
              <div className="sent-risk-chart-title">
                VVIX
                {vvixSpot != null && <span style={{ marginLeft: 6 }}>{vvixSpot.toFixed(1)}</span>}
              </div>
              <div className="sent-risk-chart-wrap">
                <SafeECharts
                  option={vvixOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{ title: 'VVIX', source: 'CBOE / Yahoo', endpoint: '/api/sentiment', series: [], updatedAt: lastUpdated }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (bare) return body;

  return (
    <div className="sent-panel">
      <div className="sent-panel-header">
        <span className="sent-panel-title">Risk Dashboard</span>
        <span className="sent-panel-subtitle">Cross-asset risk-on / risk-off · FRED + Yahoo</span>
      </div>
      {body}
    </div>
  );
}
