import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';

const REER_COUNTRIES = ['US', 'EU', 'JP', 'GB', 'CN'];
const REER_COLORS = { US: '#3b82f6', EU: '#10b981', JP: '#ef4444', GB: '#f59e0b', CN: '#a855f7' };
const REER_LABELS = { US: 'United States', EU: 'Euro Area', JP: 'Japan', GB: 'United Kingdom', CN: 'China' };

export default function ReerChart({ reer, isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent }) {
  const { colors } = useTheme();

  const latestValues = useMemo(() => {
    if (!reer?.dates?.length) return {};
    const vals = {};
    for (const k of REER_COUNTRIES) {
      if (reer[k]?.length) {
        vals[k] = reer[k][reer[k].length - 1];
      }
    }
    return vals;
  }, [reer]);

  const chartOption = useMemo(() => {
    if (!reer?.dates?.length) return null;
    const countries = REER_COUNTRIES.filter(k => reer[k]?.length);
    if (countries.length === 0) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
      },
      legend: {
        data: countries,
        top: 0,
        textStyle: { color: colors.textSecondary, fontSize: 9 },
      },
      grid: { top: 28, right: 16, bottom: 24, left: 44 },
      xAxis: {
        type: 'category',
        data: reer.dates,
        axisLabel: {
          color: colors.textMuted,
          fontSize: 9,
          interval: Math.floor(reer.dates.length / 5),
          formatter: v => v ? v.slice(5) : v,
        },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        name: 'REER',
        nameTextStyle: { color: colors.textMuted, fontSize: 9 },
        axisLabel: { color: colors.textMuted, fontSize: 9 },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: countries.map(k => ({
        name: k,
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 1.5, color: REER_COLORS[k] },
        itemStyle: { color: REER_COLORS[k] },
        data: reer[k],
      })),
    };
  }, [reer, colors]);

  if (!reer?.dates?.length) {
    // Empty-state fallback. Parent FXDashboard already wraps this in
    // its own `.fx-bento-card` + title row, so we just render the inner
    // empty placeholder — otherwise we'd nest two bento cards (and two
    // identical titles, which is what showed up as the duplicate REER
    // panel in the audit).
    return (
      <div className="fx-panel-content bento-panel-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>No REER data available</span>
      </div>
    );
  }

  const countries = REER_COUNTRIES.filter(k => reer[k]?.length);
  const hasLatest = Object.keys(latestValues).length > 0;

  // No outer .fx-bento-card / title row — those are provided by the
  // parent. Just render the body that goes inside.
  return (
    <>
      {hasLatest && (
        <div className="fx-kpi-strip">
          {countries.map(k => (
            latestValues[k] != null && (
              <div key={k} className="fx-kpi-pill">
                <span className="fx-kpi-label">{k}</span>
                <span className="fx-kpi-value" style={{ color: REER_COLORS[k] }}>
                  <MetricValue value={latestValues[k]} seriesKey={`reer_${k}`} timestamp={lastUpdated} format={v => v != null ? v.toFixed(1) : '—'} />
                </span>
                {reer[k]?.length >= 2 && (() => {
                  const delta = reer[k][reer[k].length - 1] - reer[k][reer[k].length - 2];
                  return (
                    <span className="fx-kpi-sub" style={{ color: delta >= 0 ? '#4ade80' : '#f87171', display: 'block' }}>
                      {delta >= 0 ? '+' : ''}{delta.toFixed(1)} chg
                    </span>
                  );
                })()}
              </div>
            )
          ))}
        </div>
      )}

      <div className="fx-panel-content bento-panel-content" onMouseDown={e => e.stopPropagation()}>
        {chartOption ? (
          <SafeECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            sourceInfo={{
              title: 'Real Effective Exchange Rates',
              source: 'BIS/FRED',
              endpoint: '/api/fx',
              series: REER_COUNTRIES.filter(k => reer[k]?.length).map(k => ({ id: `reer_${k}`, label: REER_LABELS[k] })),
              updatedAt: lastUpdated,
            }}
          />
        ) : (
          <div className="fx-empty">No REER data</div>
        )}
      </div>

      <div style={{ padding: '4px 10px 2px', fontSize: 10, color: 'var(--text-dim)' }}>
        {countries.map(k => (
          <span key={k} style={{ marginRight: 10 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, backgroundColor: REER_COLORS[k], marginRight: 3, verticalAlign: 'middle' }} />
            <span style={{ verticalAlign: 'middle' }}>{REER_LABELS[k]}</span>
          </span>
        ))}
      </div>
    </>
  );
}