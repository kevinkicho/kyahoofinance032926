import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import { useTheme } from '../../../hub/ThemeContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';

function seriesFromRows(rows, matchFn, { max = 40, valueKey = 'value' } = {}) {
  if (!Array.isArray(rows) || !rows.length) return { periods: [], values: [], latest: null, desc: null };
  const filtered = rows
    .filter((r) => r && r.value != null && matchFn(r))
    .slice()
    .sort((a, b) => String(a.period).localeCompare(String(b.period)));
  // Deduplicate periods (keep last)
  const map = new Map();
  for (const r of filtered) map.set(r.period, r);
  const ordered = [...map.values()].slice(-max);
  const values = ordered.map((r) => Number(r[valueKey] ?? r.value));
  const periods = ordered.map((r) => r.period);
  const latest = ordered.length ? ordered[ordered.length - 1] : null;
  return { periods, values, latest, desc: latest?.desc || null };
}

function heat(v) {
  if (v == null || !Number.isFinite(Number(v))) return 'var(--text-muted)';
  if (Number(v) > 0) return '#4ade80';
  if (Number(v) < 0) return '#f87171';
  return 'var(--text-secondary)';
}

function buildLineOption({ periods, values, colors, name, color, yFormat, valueFormat }) {
  if (!periods?.length || !values?.length) return null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const p = params?.[0];
        if (!p) return '';
        const v = p.value;
        const formatted = valueFormat
          ? valueFormat(v)
          : (v != null ? Number(v).toFixed(1) : '—');
        return `${p.axisValue}<br/><b>${name}</b>: ${formatted}`;
      },
    },
    grid: { top: 8, right: 6, bottom: 14, left: 32, containLabel: false },
    xAxis: {
      type: 'category',
      data: periods,
      axisLabel: {
        color: colors.textMuted,
        fontSize: 8,
        interval: Math.max(0, Math.floor(periods.length / 5) - 1),
        formatter: (v) => String(v).replace(/^20/, ''),
      },
      axisLine: { lineStyle: { color: colors.cardBg } },
    },
    yAxis: {
      type: 'value',
      scale: true,
      axisLabel: {
        color: colors.textMuted,
        fontSize: 8,
        formatter: yFormat || ((v) => `${v}`),
      },
      splitLine: { lineStyle: { color: colors.cardBg } },
    },
    series: [{
      name,
      type: 'line',
      data: values,
      smooth: true,
      symbol: 'none',
      lineStyle: { color, width: 2 },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: color + '55' },
            { offset: 1, color: color + '08' },
          ],
        },
      },
      markLine: name.toLowerCase().includes('gdp')
        ? {
            silent: true,
            symbol: 'none',
            lineStyle: { type: 'dashed', color: colors.textDim, width: 1 },
            data: [{ yAxis: 0 }],
          }
        : undefined,
    }],
  };
}

export function hasBeaCorporateProfitsRows(data) {
  if (!data || typeof data !== 'object') return false;
  return !!(
    (Array.isArray(data.gdpComponents) && data.gdpComponents.length)
    || (Array.isArray(data.savingRate) && data.savingRate.length)
    || (Array.isArray(data.corporateProfits) && data.corporateProfits.length)
  );
}

export default function BeaCorporateProfitsPanel() {
  const { colors } = useTheme();
  const beaCtx = useMarketData('bea');
  const data = beaCtx?.data || {};
  const gdpComponents = data.gdpComponents || [];
  const savingRate = data.savingRate || [];
  const corporateProfits = data.corporateProfits || [];

  const gdpSeries = useMemo(() => seriesFromRows(
    gdpComponents,
    (r) => String(r.line) === '1' || /^gross domestic product/i.test(r.desc || ''),
    { max: 24 },
  ), [gdpComponents]);

  const savingSeries = useMemo(() => seriesFromRows(
    savingRate,
    (r) => /personal saving as a percentage/i.test(r.desc || '') || String(r.line) === '35',
    { max: 36 },
  ), [savingRate]);

  const profitsSeries = useMemo(() => {
    // Prefer line 13 Corporate profits with IVA and CCAdj; values already in $bn when valueBn set
    const rows = corporateProfits.map((r) => ({
      ...r,
      value: r.valueBn != null ? r.valueBn : (r.value != null ? r.value / 1000 : null),
    }));
    return seriesFromRows(
      rows,
      (r) => String(r.line) === '13' || /corporate profits with iva and ccadj/i.test(r.desc || ''),
      { max: 24 },
    );
  }, [corporateProfits]);

  const gdpOption = useMemo(
    () => buildLineOption({
      periods: gdpSeries.periods,
      values: gdpSeries.values,
      colors,
      name: 'Real GDP (q/q SAAR %)',
      color: '#60a5fa',
      yFormat: (v) => `${v}%`,
      valueFormat: (v) => (v != null ? `${Number(v) >= 0 ? '+' : ''}${Number(v).toFixed(1)}%` : '—'),
    }),
    [gdpSeries, colors],
  );

  const savingOption = useMemo(
    () => buildLineOption({
      periods: savingSeries.periods,
      values: savingSeries.values,
      colors,
      name: 'Personal saving rate',
      color: '#22c55e',
      yFormat: (v) => `${v}%`,
      valueFormat: (v) => (v != null ? `${Number(v).toFixed(1)}%` : '—'),
    }),
    [savingSeries, colors],
  );

  const profitsOption = useMemo(
    () => buildLineOption({
      periods: profitsSeries.periods,
      values: profitsSeries.values,
      colors,
      name: 'Corporate profits ($B)',
      color: '#a78bfa',
      yFormat: (v) => `$${v}`,
      valueFormat: (v) => (v != null ? `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}B` : '—'),
    }),
    [profitsSeries, colors],
  );

  const components = useMemo(() => {
    if (!gdpComponents.length) return [];
    const latestPeriod = gdpSeries.latest?.period
      || [...gdpComponents].sort((a, b) => String(b.period).localeCompare(String(a.period)))[0]?.period;
    // Prefer headline NIPA contribution lines, then fill remaining with other
    // latest-period rows so a tall panel can show a longer list.
    const priority = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25'];
    const rank = (line) => {
      const i = priority.indexOf(String(line));
      return i >= 0 ? i : 1000 + Number(line || 999);
    };
    const latest = gdpComponents
      .filter((r) => r.period === latestPeriod && r.value != null && r.desc)
      .filter((r, i, arr) => arr.findIndex((x) => String(x.line) === String(r.line)) === i)
      .sort((a, b) => rank(a.line) - rank(b.line) || Number(a.line) - Number(b.line));
    return latest;
  }, [gdpComponents, gdpSeries.latest]);

  const hasAny = hasBeaCorporateProfitsRows({ gdpComponents, savingRate, corporateProfits });

  if (!hasAny) {
    return (
      <div className="bea-profits-empty" style={{ minHeight: 80 }}>
        BEA data unavailable — check BEA_API_KEY or wait for /api/bea.
      </div>
    );
  }

  const kpis = [
    {
      label: 'Real GDP',
      value: gdpSeries.latest?.value,
      period: gdpSeries.latest?.period,
      format: (v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`,
      color: heat(gdpSeries.latest?.value),
      sub: 'q/q SAAR',
      seriesKey: 'beaGdpGrowth',
    },
    {
      label: 'Corp. Profits',
      value: profitsSeries.latest?.value,
      period: profitsSeries.latest?.period,
      format: (v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}B`,
      color: '#a78bfa',
      sub: 'IVA + CCAdj',
      seriesKey: 'beaCorpProfits',
    },
    {
      label: 'Saving Rate',
      value: savingSeries.latest?.value,
      period: savingSeries.latest?.period,
      format: (v) => `${Number(v).toFixed(1)}%`,
      color: '#22c55e',
      sub: '% of DPI',
      seriesKey: 'beaSavingRate',
    },
  ];

  return (
    <div className="bea-profits-panel">
      <div className="bea-profits-kpis">
        {kpis.map((k) => (
          <div key={k.label} className="bea-profits-kpi">
            <div className="bea-profits-kpi-label">{k.label}</div>
            <div className="bea-profits-kpi-value" style={{ color: k.color }}>
              {k.value != null
                ? <MetricValue value={k.value} seriesKey={k.seriesKey} timestamp={k.period} format={k.format} />
                : '—'}
            </div>
            <div className="bea-profits-kpi-sub">
              {k.sub}{k.period ? ` · ${k.period}` : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="bea-profits-charts">
        <div className="bea-profits-chart-card">
          <div className="bea-profits-chart-title">Real GDP growth</div>
          <div className="bea-profits-chart-body">
            {gdpOption
              ? <SafeECharts option={gdpOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Real GDP', source: 'BEA', endpoint: '/api/bea', series: [], updatedAt: beaCtx?.lastUpdated }} />
              : <div className="bea-profits-empty">No GDP history</div>}
          </div>
        </div>
        <div className="bea-profits-chart-card">
          <div className="bea-profits-chart-title">Personal saving rate</div>
          <div className="bea-profits-chart-body">
            {savingOption
              ? <SafeECharts option={savingOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Personal Saving Rate', source: 'BEA', endpoint: '/api/bea', series: [], updatedAt: beaCtx?.lastUpdated }} />
              : <div className="bea-profits-empty">No saving-rate history</div>}
          </div>
        </div>
        <div className="bea-profits-chart-card">
          <div className="bea-profits-chart-title">Corporate profits</div>
          <div className="bea-profits-chart-body">
            {profitsOption
              ? <SafeECharts option={profitsOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Corporate Profits', source: 'BEA', endpoint: '/api/bea', series: [], updatedAt: beaCtx?.lastUpdated }} />
              : <div className="bea-profits-empty">No profits history</div>}
          </div>
        </div>
      </div>

      {components.length > 0 && (
        <div className="bea-profits-table-wrap">
          <div className="bea-profits-chart-title">
            GDP components · {gdpSeries.latest?.period || 'latest'} (q/q SAAR %) · {components.length} lines
          </div>
          <div className="bea-profits-table" role="list" aria-label="GDP components">
            {components.map((r) => (
              <div key={`${r.line}-${r.period}`} className="bea-profits-row" role="listitem" title={r.desc}>
                <span className="bea-profits-row-label">{r.desc}</span>
                <span className="bea-profits-row-value" style={{ color: heat(r.value) }}>
                  {r.value != null ? `${r.value >= 0 ? '+' : ''}${Number(r.value).toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bea-profits-footer">
        BEA NIPA · T10101 GDP · T11200 corporate profits · T20600 personal saving
      </div>
    </div>
  );
}
