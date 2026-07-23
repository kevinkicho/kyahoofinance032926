import { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import { useTheme } from '../../../hub/ThemeContext';
import './BondsDashboard.css';

const TENORS = ['3m', '6m', '1y', '2y', '5y', '10y', '30y'];
const TENOR_LABELS = { '3m': '3M', '6m': '6M', '1y': '1Y', '2y': '2Y', '5y': '5Y', '10y': '10Y', '30y': '30Y' };

const COUNTRY_COLORS = {
  US: '#60a5fa', DE: '#34d399', JP: '#f472b6',
  GB: '#a78bfa', IT: '#fb923c', FR: '#facc15',
  CN: '#f87171', AU: '#4ade80', CA: '#22d3ee', CH: '#e879f9',
  SE: '#a3e635', ES: '#fb7185', NL: '#38bdf8',
};

function hasAnyYield(curve) {
  if (!curve || typeof curve !== 'object') return false;
  return TENORS.some((t) => curve[t] != null && Number.isFinite(Number(curve[t])));
}

function tenorCount(curve) {
  if (!curve) return 0;
  return TENORS.filter((t) => curve[t] != null && Number.isFinite(Number(curve[t]))).length;
}

export default function YieldCurve({
  yieldCurveData,
  spreadIndicators,
  fredYieldHistory,
  yieldHistory,
  lastUpdated,
}) {
  const { colors } = useTheme();

  const us = yieldCurveData?.US || {};
  const us10y = us['10y'] ?? null;
  const spread10y2y = spreadIndicators?.t10y2y ?? (
    us['10y'] != null && us['2y'] != null ? us['10y'] - us['2y'] : null
  );
  const spread10y3m = spreadIndicators?.t10y3m ?? (
    us['10y'] != null && us['3m'] != null ? us['10y'] - us['3m'] : null
  );

  const { fullCurveCountries, intl10y } = useMemo(() => {
    const data = yieldCurveData || {};
    const full = [];
    const intl = [];
    for (const [cc, curve] of Object.entries(data)) {
      if (!hasAnyYield(curve)) continue;
      if (tenorCount(curve) >= 3) full.push(cc);
      else if (curve['10y'] != null) intl.push({ code: cc, y10: Number(curve['10y']) });
    }
    // Always prefer US first in full curves
    full.sort((a, b) => (a === 'US' ? -1 : b === 'US' ? 1 : a.localeCompare(b)));
    intl.sort((a, b) => b.y10 - a.y10);
    return { fullCurveCountries: full, intl10y: intl };
  }, [yieldCurveData]);

  const steepest = useMemo(() => {
    let best = null;
    let bestSpread = -Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData || {})) {
      const s30 = curve?.['30y'];
      const s3m = curve?.['3m'];
      if (s30 != null && s3m != null) {
        const spread = s30 - s3m;
        if (spread > bestSpread) {
          bestSpread = spread;
          best = cc;
        }
      }
    }
    return best;
  }, [yieldCurveData]);

  const curveOption = useMemo(() => {
    // Plot countries that have multi-tenor data (typically US). Single-tenor
    // intl 10Y rows go in the side list — plotting them as empty lines looked
    // like "missing data".
    const countries = fullCurveCountries.length ? fullCurveCountries : (hasAnyYield(us) ? ['US'] : []);
    if (!countries.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          if (!params?.length) return '';
          const lines = params
            .filter((p) => p.value != null)
            .map((p) => `${p.seriesName}: <b>${Number(p.value).toFixed(2)}%</b>`);
          return `<b>${params[0].axisValue}</b><br/>${lines.join('<br/>')}`;
        },
      },
      legend: {
        data: countries,
        top: 0,
        textStyle: { color: colors.textSecondary, fontSize: 10 },
      },
      grid: { top: 28, right: 12, bottom: 22, left: 40, containLabel: false },
      xAxis: {
        type: 'category',
        data: TENORS.map((t) => TENOR_LABELS[t] || t),
        axisLabel: { color: colors.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: countries.map((c) => ({
        name: c,
        type: 'line',
        smooth: true,
        connectNulls: false,
        data: TENORS.map((t) => {
          const v = yieldCurveData[c]?.[t];
          return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
        }),
        itemStyle: { color: COUNTRY_COLORS[c] || colors.textSecondary },
        lineStyle: { width: c === 'US' ? 2.4 : 1.6 },
        symbol: 'circle',
        symbolSize: c === 'US' ? 6 : 4,
      })),
    };
  }, [fullCurveCountries, yieldCurveData, us, colors]);

  const historyOption = useMemo(() => {
    if (!yieldHistory?.dates?.length && !fredYieldHistory?.dates?.length) return null;
    // Prefer multi-tenor history; fall back to single DGS10 series
    if (yieldHistory?.dates?.length) {
      const d = yieldHistory.dates;
      const step = Math.max(1, Math.floor(d.length / 80));
      const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
      const subsample = (arr) => (arr
        ? arr.filter((_, i) => i % step === 0 || i === arr.length - 1)
        : []);
      return {
        animation: false,
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          formatter: (params) =>
            `<b>${params[0].axisValue}</b><br/>` +
            params
              .filter((p) => p.value != null)
              .map((p) => `${p.seriesName}: <b>${Number(p.value).toFixed(2)}%</b>`)
              .join('<br/>'),
        },
        legend: {
          data: ['2Y', '10Y', '30Y'],
          top: 0,
          textStyle: { color: colors.textSecondary, fontSize: 9 },
        },
        grid: { top: 22, right: 8, bottom: 18, left: 36 },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            color: colors.textMuted,
            fontSize: 9,
            interval: Math.floor(dates.length / 4),
          },
          axisLine: { lineStyle: { color: colors.cardBg } },
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' },
          splitLine: { lineStyle: { color: colors.cardBg } },
        },
        series: [
          {
            name: '2Y',
            type: 'line',
            data: subsample(yieldHistory.dgs2),
            symbol: 'none',
            smooth: true,
            lineStyle: { color: '#60a5fa', width: 1.4 },
          },
          {
            name: '10Y',
            type: 'line',
            data: subsample(yieldHistory.dgs10),
            symbol: 'none',
            smooth: true,
            lineStyle: { color: '#fbbf24', width: 1.4 },
          },
          {
            name: '30Y',
            type: 'line',
            data: subsample(yieldHistory.dgs30),
            symbol: 'none',
            smooth: true,
            lineStyle: { color: '#f87171', width: 1.4 },
          },
        ],
      };
    }
    // Single series fallback
    const d = fredYieldHistory.dates;
    const v = fredYieldHistory.values;
    const step = Math.max(1, Math.floor(d.length / 60));
    const dates = d.filter((_, i) => i % step === 0 || i === d.length - 1);
    const vals = v.filter((_, i) => i % step === 0 || i === v.length - 1);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (p) => `${p[0].axisValue}<br/>10Y: <b>${p[0].value?.toFixed(2)}%</b>`,
      },
      grid: { top: 10, right: 8, bottom: 18, left: 36 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 4) },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'line',
        data: vals,
        areaStyle: { color: 'rgba(16,185,129,0.12)' },
        lineStyle: { color: '#10b981', width: 1.5 },
        symbol: 'none',
        smooth: true,
      }],
    };
  }, [yieldHistory, fredYieldHistory, colors]);

  const maxYield = Math.max(...TENORS.map((t) => us[t] ?? 0), 0.01);
  const usHasData = hasAnyYield(us);

  if (!yieldCurveData || !Object.keys(yieldCurveData).some((k) => hasAnyYield(yieldCurveData[k]))) {
    return (
      <div className="yc-panel yc-panel--empty">
        No yield curve data — FRED Treasury series unavailable.
      </div>
    );
  }

  return (
    <div className="yc-panel">
      {/* Compact KPI strip */}
      <div className="yc-kpis">
        <div className="yc-kpi">
          <span className="yc-kpi-label">US 10Y</span>
          <span className="yc-kpi-value yc-kpi-value--accent">
            {us10y != null
              ? <MetricValue value={us10y} format={(v) => `${v.toFixed(2)}%`} seriesKey="10y" timestamp={lastUpdated} />
              : '—'}
          </span>
        </div>
        <div className="yc-kpi">
          <span className="yc-kpi-label">10Y−2Y</span>
          <span
            className="yc-kpi-value"
            style={{ color: spread10y2y == null ? undefined : spread10y2y >= 0 ? '#4ade80' : '#f87171' }}
          >
            {spread10y2y != null
              ? <MetricValue value={spread10y2y} format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y2y" timestamp={lastUpdated} />
              : '—'}
          </span>
        </div>
        <div className="yc-kpi">
          <span className="yc-kpi-label">10Y−3M</span>
          <span
            className="yc-kpi-value"
            style={{ color: spread10y3m == null ? undefined : spread10y3m >= 0 ? '#4ade80' : '#f87171' }}
          >
            {spread10y3m != null
              ? <MetricValue value={spread10y3m} format={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y3m" timestamp={lastUpdated} />
              : '—'}
          </span>
        </div>
        <div className="yc-kpi">
          <span className="yc-kpi-label">Steepest</span>
          <span className="yc-kpi-value yc-kpi-value--accent">{steepest || '—'}</span>
        </div>
      </div>

      {/* Main: curve chart + US tenor table (isolated so bars never overlap chart) */}
      <div className="yc-main">
        <div className="yc-chart-card">
          <div className="yc-section-title">
            Curve shape · {fullCurveCountries.length ? fullCurveCountries.join(', ') : 'US'}
          </div>
          <div className="yc-chart-body">
            {curveOption
              ? (
                <SafeECharts
                  option={curveOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{
                    title: 'Yield Curve',
                    source: 'FRED',
                    endpoint: '/api/bonds',
                    series: [{ id: 'DGS*' }],
                    updatedAt: lastUpdated,
                  }}
                />
              )
              : <div className="yc-empty">No multi-tenor curve</div>}
          </div>
        </div>

        <div className="yc-tenor-card">
          <div className="yc-section-title">US yield by tenor</div>
          <div className="yc-tenor-list">
            {usHasData ? TENORS.map((t) => {
              const val = us[t];
              const pct = val != null ? (val / maxYield) * 100 : 0;
              return (
                <div key={t} className="yc-tenor-row">
                  <span className="yc-tenor-label">{TENOR_LABELS[t]}</span>
                  <div className="yc-tenor-track">
                    <div
                      className="yc-tenor-fill"
                      style={{ width: val != null ? `${Math.max(2, pct)}%` : '0%' }}
                    />
                  </div>
                  <span className="yc-tenor-val">
                    {val != null ? `${Number(val).toFixed(2)}%` : '—'}
                  </span>
                </div>
              );
            }) : (
              <div className="yc-empty">US tenors unavailable</div>
            )}
          </div>

          {intl10y.length > 0 && (
            <>
              <div className="yc-section-title yc-section-title--spaced">
                Global 10Y · {intl10y.length}
              </div>
              <div className="yc-intl-list">
                {intl10y.slice(0, 12).map((row) => (
                  <div key={row.code} className="yc-intl-row">
                    <span className="yc-intl-code">{row.code}</span>
                    <span className="yc-intl-val">{row.y10.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact history — single band, no stacked overflow */}
      {historyOption && (
        <div className="yc-history-card">
          <div className="yc-section-title">
            {yieldHistory?.dates?.length ? '2Y / 10Y / 30Y history' : 'US 10Y history (DGS10)'}
          </div>
          <div className="yc-history-body">
            <SafeECharts
              option={historyOption}
              style={{ height: '100%', width: '100%' }}
              sourceInfo={{
                title: 'Treasury yield history',
                source: 'FRED',
                endpoint: '/api/bonds',
                series: yieldHistory?.dates?.length
                  ? [{ id: 'DGS2' }, { id: 'DGS10' }, { id: 'DGS30' }]
                  : [{ id: 'DGS10' }],
                updatedAt: lastUpdated,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
