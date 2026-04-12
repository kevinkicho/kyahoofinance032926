// src/markets/globalMacro/components/MacroScorecard.jsx
import React, { useMemo } from 'react';


function fmtBillions(v) {
  if (v == null) return '—';
  const b = v / 1e9;
  return (b >= 0 ? '+' : '') + b.toFixed(1) + 'B';
}

function gdpHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v > 3)    return 'mac-heat-dg';
  if (v > 1)    return 'mac-heat-lg';
  if (v >= 0)   return 'mac-heat-neu';
  if (v >= -1)  return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function cpiHeat(v) {
  if (v == null)        return 'mac-heat-neu';
  if (v < 0 || v > 6)  return 'mac-heat-dr';
  if (v > 4)            return 'mac-heat-lr';
  if (v > 3)            return 'mac-heat-neu';
  if (v > 2)            return 'mac-heat-lg';
  if (v >= 1)           return 'mac-heat-dg';
  return 'mac-heat-lr'; // 0–1%: below target, deflation risk
}

function rateHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 0)    return 'mac-heat-neu';  // negative rates: unconventional, not beneficial
  if (v < 1)    return 'mac-heat-dg';
  if (v < 3)    return 'mac-heat-lg';
  if (v < 5)    return 'mac-heat-neu';
  if (v < 8)    return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function unempHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 4)    return 'mac-heat-dg';
  if (v < 6)    return 'mac-heat-lg';
  if (v < 8)    return 'mac-heat-neu';
  if (v < 10)   return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function debtHeat(v) {
  if (v == null) return 'mac-heat-neu';
  if (v < 40)   return 'mac-heat-dg';
  if (v < 60)   return 'mac-heat-lg';
  if (v < 90)   return 'mac-heat-neu';
  if (v <= 120) return 'mac-heat-lr';
  return 'mac-heat-dr';
}

function fmt1(v) { return v != null ? v.toFixed(1) + '%' : '—'; }
function fmtRate(v) { return v != null ? v.toFixed(2) + '%' : '—'; }

export default function MacroScorecard({ scorecardData = [], consumerSentiment, tradeBalance, m2Growth }) {
  const kpis = useMemo(() => {
    const g7 = scorecardData.filter(c => c.region === 'G7');
    const em = scorecardData.filter(c => c.region === 'EM');
    const avgG7Gdp = g7.length ? g7.reduce((s, c) => s + (c.gdp || 0), 0) / g7.length : 0;
    const avgEmGdp = em.length ? em.reduce((s, c) => s + (c.gdp || 0), 0) / em.length : 0;
    const withCpi = scorecardData.filter(c => c.cpi != null);
    const lowestCpi = withCpi.length ? withCpi.reduce((a, b) => a.cpi < b.cpi ? a : b) : null;
    const withDebt = scorecardData.filter(c => c.debt != null);
    const highestDebt = withDebt.length ? withDebt.reduce((a, b) => a.debt > b.debt ? a : b) : null;
    // New FRED series KPIs
    const latestSentiment = consumerSentiment?.values?.length
      ? consumerSentiment.values[consumerSentiment.values.length - 1]
      : null;
    const latestTradeBalance = tradeBalance?.values?.length
      ? tradeBalance.values[tradeBalance.values.length - 1]
      : null;
    const latestM2Yoy = m2Growth?.yoyPct?.length
      ? m2Growth.yoyPct[m2Growth.yoyPct.length - 1]
      : null;
    return { avgG7Gdp, avgEmGdp, lowestCpi, highestDebt, latestSentiment, latestTradeBalance, latestM2Yoy };
  }, [scorecardData, consumerSentiment, tradeBalance, m2Growth]);

  return (
    <div className="mac-panel">
      <div className="mac-panel-header">
        <span className="mac-panel-title">Macro Scorecard</span>
        <span className="mac-panel-subtitle">12 countries · latest annual data · World Bank + central banks</span>
      </div>
      {/* KPI Strip */}
      <div className="mac-kpi-strip">
        <div className="mac-kpi-pill">
          <span className="mac-kpi-label">Avg G7 GDP</span>
          <span className={`mac-kpi-value ${kpis.avgG7Gdp >= 0 ? 'positive' : 'negative'}`}>
            {kpis.avgG7Gdp.toFixed(1)}%
          </span>
        </div>
        <div className="mac-kpi-pill">
          <span className="mac-kpi-label">Avg EM GDP</span>
          <span className={`mac-kpi-value ${kpis.avgEmGdp >= 0 ? 'positive' : 'negative'}`}>
            {kpis.avgEmGdp.toFixed(1)}%
          </span>
        </div>
        <div className="mac-kpi-pill">
          <span className="mac-kpi-label">Lowest CPI</span>
          <span className="mac-kpi-value accent">{kpis.lowestCpi ? kpis.lowestCpi.name : '\u2014'}</span>
          {kpis.lowestCpi && <span className="mac-kpi-sub">{kpis.lowestCpi.cpi.toFixed(1)}%</span>}
        </div>
        <div className="mac-kpi-pill">
          <span className="mac-kpi-label">Highest Debt</span>
          <span className="mac-kpi-value" style={{ color: '#ef4444' }}>{kpis.highestDebt ? kpis.highestDebt.name : '\u2014'}</span>
          {kpis.highestDebt && <span className="mac-kpi-sub">{kpis.highestDebt.debt.toFixed(0)}% GDP</span>}
        </div>
        {kpis.latestSentiment != null && (
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Consumer Sentiment</span>
            <span className="mac-kpi-value" style={{ color: kpis.latestSentiment >= 80 ? '#4ade80' : kpis.latestSentiment >= 60 ? '#f59e0b' : '#ef4444' }}>
              {kpis.latestSentiment.toFixed(1)}
            </span>
            <span className="mac-kpi-sub">U. Michigan Index</span>
          </div>
        )}
        {kpis.latestTradeBalance != null && (
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">Trade Balance</span>
            <span className="mac-kpi-value" style={{ color: kpis.latestTradeBalance >= 0 ? '#4ade80' : '#ef4444' }}>
              {fmtBillions(kpis.latestTradeBalance)}
            </span>
            <span className="mac-kpi-sub">Latest month</span>
          </div>
        )}
        {kpis.latestM2Yoy != null && (
          <div className="mac-kpi-pill">
            <span className="mac-kpi-label">M2 YoY Growth</span>
            <span className="mac-kpi-value" style={{ color: kpis.latestM2Yoy > 8 ? '#ef4444' : kpis.latestM2Yoy > 4 ? '#f59e0b' : '#4ade80' }}>
              {kpis.latestM2Yoy >= 0 ? '+' : ''}{kpis.latestM2Yoy.toFixed(1)}%
            </span>
            <span className="mac-kpi-sub">Money supply</span>
          </div>
        )}
      </div>
      <div className="mac-scroll">
        <table className="mac-table">
          <thead>
            <tr>
              <th className="mac-th" style={{ textAlign: 'left' }}>Country</th>
              <th className="mac-th">GDP Growth%</th>
              <th className="mac-th">CPI Inflation%</th>
              <th className="mac-th">Policy Rate</th>
              <th className="mac-th">Unemp%</th>
              <th className="mac-th">Debt/GDP%</th>
            </tr>
          </thead>
          <tbody>
            {scorecardData.map(c => (
              <tr key={c.code} className="mac-row">
                <td className="mac-cell"><span>{c.flag}</span> <span>{c.name}</span></td>
                <td className={`mac-cell ${gdpHeat(c.gdp)}`}  style={{ fontWeight: 500 }}>{fmt1(c.gdp)}</td>
                <td className={`mac-cell ${cpiHeat(c.cpi)}`}  style={{ fontWeight: 500 }}>{fmt1(c.cpi)}</td>
                <td className={`mac-cell ${rateHeat(c.rate)}`} style={{ fontWeight: 500 }}>{fmtRate(c.rate)}</td>
                <td className={`mac-cell ${unempHeat(c.unemp)}`} style={{ fontWeight: 500 }}>{fmt1(c.unemp)}</td>
                <td className={`mac-cell ${debtHeat(c.debt)}`}  style={{ fontWeight: 500 }}>{fmt1(c.debt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mac-panel-footer">
        Color: green = favorable · red = concerning · thresholds per IMF/Maastricht guidelines
      </div>
    </div>
  );
}
