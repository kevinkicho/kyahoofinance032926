// src/markets/globalMacro/components/GlobalKpiStrip.jsx
import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';

/**
 * GlobalKpiStrip - Aggregated global macro metrics at a glance
 * Computes key indicators from 12-country scorecard and displays as KPI pills
 */
export default function GlobalKpiStrip({ scorecardData, cfnai, m2Growth, centralBankData }) {
  const { colors } = useTheme();

  // Compute aggregated KPIs
  const kpis = useMemo(() => {
    if (!scorecardData?.length) return [];

    // Group countries by region
    const g7 = scorecardData.filter(c => c.region === 'G7' || c.code === 'US' || c.code === 'GB' || c.code === 'JP' || c.code === 'CA');
    const em = scorecardData.filter(c => c.region === 'EM');
    const all = scorecardData;

    // Compute averages
    const avgG7Gdp = g7.length ? g7.reduce((s, c) => s + (c.gdp ?? 0), 0) / g7.length : null;
    const avgEmGdp = em.length ? em.reduce((s, c) => s + (c.gdp ?? 0), 0) / em.length : null;
    const avgCpi = all.length ? all.reduce((s, c) => s + (c.cpi ?? 0), 0) / all.length : null;

    // Find highest/lowest rates
    const withRates = all.filter(c => c.rate != null);
    const highestRate = withRates.length ? withRates.reduce((max, c) => c.rate > max.rate ? c : max, withRates[0]) : null;
    const lowestRate = withRates.length ? withRates.reduce((min, c) => c.rate < min.rate ? c : min, withRates[0]) : null;

    // Debt above 90% of GDP
    const debtAbove90 = all.filter(c => c.debt != null && c.debt > 90).length;

    // Latest CFNAI
    const cfnaiLatest = cfnai?.latest ?? cfnai?.values?.[cfnai.values.length - 1];

    // M2 Growth YoY
    const m2Latest = m2Growth?.yoyPct?.[m2Growth.yoyPct.length - 1];

    return [
      {
        key: 'g7Gdp',
        label: 'G7 GDP',
        value: avgG7Gdp,
        format: 'percent',
        color: avgG7Gdp > 2 ? '#4ade80' : avgG7Gdp > 0 ? '#fbbf24' : '#f87171',
        trend: avgG7Gdp > 1.5 ? '↑' : avgG7Gdp < 0.5 ? '↓' : '→',
      },
      {
        key: 'emGdp',
        label: 'EM GDP',
        value: avgEmGdp,
        format: 'percent',
        color: avgEmGdp > 4 ? '#4ade80' : avgEmGdp > 2 ? '#fbbf24' : '#f87171',
        trend: avgEmGdp > 5 ? '↑' : avgEmGdp < 3 ? '↓' : '→',
      },
      {
        key: 'avgCpi',
        label: 'Global CPI',
        value: avgCpi,
        format: 'percent',
        color: avgCpi < 2 ? '#4ade80' : avgCpi < 4 ? '#fbbf24' : '#f87171',
        trend: avgCpi < 2 ? '↓' : avgCpi > 5 ? '↑' : '→',
      },
      {
        key: 'highRate',
        label: 'High Rate',
        value: highestRate?.rate,
        format: 'rate',
        sublabel: highestRate?.name,
        color: '#f87171',
      },
      {
        key: 'lowRate',
        label: 'Low Rate',
        value: lowestRate?.rate,
        format: 'rate',
        sublabel: lowestRate?.name,
        color: '#4ade80',
      },
      {
        key: 'debt90',
        label: 'Debt >90%',
        value: debtAbove90,
        format: 'count',
        sublabel: `of ${all.length}`,
        color: debtAbove90 > 6 ? '#f87171' : debtAbove90 > 3 ? '#fbbf24' : '#4ade80',
      },
      {
        key: 'cfnai',
        label: 'CFNAI',
        value: cfnaiLatest,
        format: 'decimal',
        color: cfnaiLatest > 0.3 ? '#4ade80' : cfnaiLatest > -0.3 ? '#fbbf24' : '#f87171',
        sublabel: cfnaiLatest > 0 ? 'expanding' : cfnaiLatest < -0.7 ? 'recession' : 'below trend',
      },
      {
        key: 'm2Growth',
        label: 'M2 YoY',
        value: m2Latest,
        format: 'percent',
        color: m2Latest > 5 ? '#f87171' : m2Latest > 0 ? '#4ade80' : '#fbbf24',
      },
    ].filter(k => k.value != null);
  }, [scorecardData, cfnai, m2Growth]);

  if (!kpis.length) return null;

  return (
    <div className="mac-kpi-strip">
      {kpis.map(kpi => (
        <div key={kpi.key} className="mac-kpi-pill">
          <span className="mac-kpi-label">{kpi.label}</span>
          <span className="mac-kpi-value" style={{ color: kpi.color }}>
            {kpi.format === 'percent' && `${kpi.value?.toFixed(1)}%`}
            {kpi.format === 'rate' && `${kpi.value?.toFixed(2)}%`}
            {kpi.format === 'decimal' && kpi.value?.toFixed(2)}
            {kpi.format === 'count' && kpi.value}
            {kpi.trend && <span style={{ marginLeft: 4 }}>{kpi.trend}</span>}
          </span>
          {kpi.sublabel && <span className="mac-kpi-sub">{kpi.sublabel}</span>}
        </div>
      ))}
    </div>
  );
}