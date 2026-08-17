import React, { useMemo } from 'react';
import { useMarketData } from '../../../hub/DataContext';
import MetricValue from '../../../components/MetricValue/MetricValue';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import { ecbM3GrowthRows, ecbHicpDetailRows, ecbHistorySeriesRows } from './DerivativesLiveChips.js';
import './EcbDerivativesPanel.css';

function fmtPct(v, digits = 2) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

function fmtChg(v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  return `${n > 0 ? '+' : ''}${n.toFixed(2)}`;
}

function lastOf(arr) {
  if (!Array.isArray(arr) || !arr.length) return null;
  return arr[arr.length - 1];
}

/**
 * Dense ECB Financial Market Data panel for Derivatives tab.
 * Uses live /api/ecb: policy corridor, €STR, EURIBOR, M3, HICP + histories.
 */
export default function EcbDerivativesPanel() {
  const { colors } = useTheme();
  const ecbCtx = useMarketData('ecb');
  const data = ecbCtx?.data || {};
  const pr = data.policyRates;
  const mm = data.moneyMarket;
  const m3 = ecbM3GrowthRows(data);
  const hicp = ecbHicpDetailRows(data);

  const corridor = useMemo(() => {
    if (!pr) return [];
    return [
      {
        code: 'DFR',
        label: 'Deposit facility',
        value: pr.depositFacility?.value,
        period: pr.depositFacility?.period,
        chg: pr.depositFacilityChange?.value,
        key: 'ecbDepositRate',
        color: '#66bb6a',
      },
      {
        code: 'MRR',
        label: 'Main refinancing',
        value: pr.mainRefinancing?.value,
        period: pr.mainRefinancing?.period,
        chg: pr.mainRefinancingChange?.value,
        key: 'ecbMainRefiRate',
        color: '#42a5f5',
      },
      {
        code: 'MLFR',
        label: 'Marginal lending',
        value: pr.marginalLending?.value,
        period: pr.marginalLending?.period,
        chg: pr.marginalLendingChange?.value,
        key: 'ecbMarginalLending',
        color: '#ef5350',
      },
    ].filter((r) => r.value != null && Number.isFinite(Number(r.value)));
  }, [pr]);

  const rateTable = useMemo(() => {
    const rows = [
      { group: 'Policy', label: 'Deposit facility (DFR)', value: pr?.depositFacility?.value, period: pr?.depositFacility?.period, key: 'ecbDepositRate', digits: 2 },
      { group: 'Policy', label: 'Main refinancing (MRR)', value: pr?.mainRefinancing?.value, period: pr?.mainRefinancing?.period, key: 'ecbMainRefiRate', digits: 2 },
      { group: 'Policy', label: 'Marginal lending (MLFR)', value: pr?.marginalLending?.value, period: pr?.marginalLending?.period, key: 'ecbMarginalLending', digits: 2 },
      { group: 'Policy', label: 'Corridor (MLFR−DFR)', value: pr?.corridorWidth?.value, period: pr?.corridorWidth?.period, digits: 2 },
      { group: 'Policy', label: 'MRR − DFR', value: pr?.standingFacilitySpread?.value, period: pr?.standingFacilitySpread?.period, digits: 2 },
      { group: 'Money mkt', label: '€STR (vol-wtd)', value: mm?.estr?.value, period: mm?.estr?.period, key: 'ecbEstr', digits: 3 },
      { group: 'Money mkt', label: '€STR 25th pct', value: mm?.estrP25?.value, period: mm?.estrP25?.period, digits: 3 },
      { group: 'Money mkt', label: '€STR 75th pct', value: mm?.estrP75?.value, period: mm?.estrP75?.period, digits: 3 },
      { group: 'Money mkt', label: '€STR monthly avg', value: mm?.estrMonthlyAvg?.value, period: mm?.estrMonthlyAvg?.period, digits: 3 },
      { group: 'Money mkt', label: 'EURIBOR 1M', value: mm?.euribor1m?.value, period: mm?.euribor1m?.period, key: 'ecbEuribor1m', digits: 3 },
      { group: 'Money mkt', label: 'EURIBOR 3M', value: mm?.euribor3m?.value, period: mm?.euribor3m?.period, key: 'ecbEuribor3m', digits: 3 },
      { group: 'Money mkt', label: 'EURIBOR 6M', value: mm?.euribor6m?.value, period: mm?.euribor6m?.period, key: 'ecbEuribor6m', digits: 3 },
      { group: 'Money mkt', label: 'EURIBOR 1Y', value: mm?.euribor1y?.value, period: mm?.euribor1y?.period, key: 'ecbEuribor1y', digits: 3 },
      { group: 'Aggregates', label: 'M3 growth (YoY)', value: lastOf(m3)?.value, period: lastOf(m3)?.period, key: 'ecbM3Growth', digits: 1 },
      { group: 'Aggregates', label: 'HICP (YoY)', value: lastOf(hicp)?.value, period: lastOf(hicp)?.period, key: 'ecbHicp', digits: 1 },
    ];
    return rows.filter((r) => r.value != null && Number.isFinite(Number(r.value)));
  }, [pr, mm, m3, hicp]);

  const chartOption = useMemo(() => {
    const mrr = ecbHistorySeriesRows(pr, 'mrr');
    const dfr = ecbHistorySeriesRows(pr, 'dfr');
    const mlfr = ecbHistorySeriesRows(pr, 'mlfr');
    const euri3 = ecbHistorySeriesRows(mm, 'euribor3m');
    const estrM = ecbHistorySeriesRows(mm, 'estrMonthly');

    // Align policy change dates (irregular) as category from MRR history
    const dates = mrr.map((o) => o.period);
    if (!dates.length && !euri3.length && !m3.length) return null;

    const series = [];
    if (mrr.length) {
      series.push({
        name: 'MRR',
        type: 'line',
        step: 'end',
        data: mrr.map((o) => o.value),
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#42a5f5' },
      });
    }
    if (dfr.length) {
      series.push({
        name: 'DFR',
        type: 'line',
        step: 'end',
        data: dfr.map((o) => o.value),
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#66bb6a' },
      });
    }
    if (mlfr.length) {
      series.push({
        name: 'MLFR',
        type: 'line',
        step: 'end',
        data: mlfr.map((o) => o.value),
        symbol: 'none',
        lineStyle: { width: 1.5, color: '#ef5350' },
      });
    }

    // Prefer dense monthly FM history (€STR avg, EURIBOR, M3, HICP) so the
    // chart shows multi-year evolution rather than sparse policy step dates.
    const useMonthly = euri3.length >= 6 || estrM.length >= 6 || m3.length >= 6;
    if (useMonthly && (euri3.length || estrM.length || m3.length || hicp.length)) {
      const monthSet = new Set([
        ...euri3.map((o) => o.period),
        ...estrM.map((o) => o.period),
        ...m3.map((o) => o.period),
        ...hicp.map((o) => o.period),
      ]);
      const months = [...monthSet].sort();
      const mapSeries = (arr) => {
        const m = new Map((arr || []).map((o) => [o.period, o.value]));
        return months.map((p) => (m.has(p) ? m.get(p) : null));
      };
      return {
        animation: false,
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis' },
        legend: {
          data: ['EURIBOR 3M', '€STR m-avg', 'M3 YoY', 'HICP YoY'].filter((_, i) =>
            [euri3.length, estrM.length, m3.length, hicp.length][i]
          ),
          top: 0,
          textStyle: { color: colors.textSecondary, fontSize: 8 },
          itemWidth: 10,
          itemHeight: 6,
        },
        grid: { top: 22, right: 8, bottom: 18, left: 32 },
        xAxis: {
          type: 'category',
          data: months,
          axisLabel: {
            color: colors.textMuted,
            fontSize: 8,
            interval: Math.max(0, Math.floor(months.length / 5)),
          },
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: { color: colors.textMuted, fontSize: 8 },
          splitLine: { lineStyle: { color: colors.cardBg } },
        },
        series: [
          euri3.length && {
            name: 'EURIBOR 3M',
            type: 'line',
            data: mapSeries(euri3),
            symbol: 'none',
            connectNulls: true,
            lineStyle: { width: 1.4, color: '#fbbf24' },
          },
          estrM.length && {
            name: '€STR m-avg',
            type: 'line',
            data: mapSeries(estrM),
            symbol: 'none',
            connectNulls: true,
            lineStyle: { width: 1.4, color: '#a78bfa' },
          },
          m3.length && {
            name: 'M3 YoY',
            type: 'line',
            data: mapSeries(m3),
            symbol: 'none',
            connectNulls: true,
            lineStyle: { width: 1.2, color: '#22c55e', type: 'dashed' },
          },
          hicp.length && {
            name: 'HICP YoY',
            type: 'line',
            data: mapSeries(hicp),
            symbol: 'none',
            connectNulls: true,
            lineStyle: { width: 1.2, color: '#f87171', type: 'dashed' },
          },
        ].filter(Boolean),
      };
    }

    if (!series.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: {
        data: series.map((s) => s.name),
        top: 0,
        textStyle: { color: colors.textSecondary, fontSize: 8 },
        itemWidth: 10,
        itemHeight: 6,
      },
      grid: { top: 22, right: 8, bottom: 18, left: 32 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLabel: {
          color: colors.textMuted,
          fontSize: 8,
          interval: Math.max(0, Math.floor(dates.length / 5)),
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 8 },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series,
    };
  }, [pr, mm, m3, hicp, colors]);

  /** Long history table: merge recent periods across series */
  const historyRows = useMemo(() => {
    const euri3 = ecbHistorySeriesRows(mm, 'euribor3m');
    const estrM = ecbHistorySeriesRows(mm, 'estrMonthly');
    // Use monthly anchors from the densest monthly series
    const periods = [...new Set([
      ...euri3.map((o) => o.period),
      ...estrM.map((o) => o.period),
      ...m3.map((o) => o.period),
      ...hicp.map((o) => o.period),
    ])].sort().slice(-18).reverse();

    const idx = (arr) => new Map((arr || []).map((o) => [o.period, o.value]));
    const e3 = idx(euri3);
    const e1 = idx(ecbHistorySeriesRows(mm, 'euribor1m'));
    const e6 = idx(ecbHistorySeriesRows(mm, 'euribor6m'));
    const eY = idx(ecbHistorySeriesRows(mm, 'euribor1y'));
    const es = idx(estrM);
    const m3m = idx(m3);
    const hi = idx(hicp);

    // Policy levels as of period (step function from change history)
    const policyAt = (hist, period) => {
      if (!hist?.length) return null;
      let last = null;
      for (const o of hist) {
        if (o.period <= period) last = o.value;
        else break;
      }
      // if period is YYYY-MM and policy is YYYY-MM-DD, compare prefix
      if (last != null) return last;
      for (const o of hist) {
        if (String(o.period).slice(0, 7) <= String(period).slice(0, 7)) last = o.value;
      }
      return last;
    };

    return periods.map((period) => ({
      period,
      mrr: policyAt(ecbHistorySeriesRows(pr, 'mrr'), period),
      dfr: policyAt(ecbHistorySeriesRows(pr, 'dfr'), period),
      estr: es.get(period) ?? null,
      euri1m: e1.get(period) ?? null,
      euri3m: e3.get(period) ?? null,
      euri6m: e6.get(period) ?? null,
      euri1y: eY.get(period) ?? null,
      m3: m3m.get(period) ?? null,
      hicp: hi.get(period) ?? null,
    }));
  }, [pr, mm, m3, hicp]);

  if (!corridor.length && !rateTable.length) {
    return <div className="ecb-fm-empty">ECB financial market data unavailable</div>;
  }

  const eff = pr?.mainRefinancing?.period || pr?.depositFacility?.period || null;

  return (
    <div className="ecb-fm-panel">
      {/* Corridor KPI cards */}
      {corridor.length > 0 && (
        <div className="ecb-fm-corridor">
          {corridor.map((r) => (
            <div key={r.code} className="ecb-fm-card">
              <span className="ecb-fm-code" style={{ color: r.color }}>{r.code}</span>
              <span className="ecb-fm-val" style={{ color: r.color }}>
                <MetricValue
                  value={r.value}
                  seriesKey={r.key}
                  timestamp={r.period}
                  format={(v) => fmtPct(v)}
                />
              </span>
              <span className="ecb-fm-lab">{r.label}</span>
              {fmtChg(r.chg) != null && (
                <span className={`ecb-fm-chg ${Number(r.chg) > 0 ? 'up' : Number(r.chg) < 0 ? 'down' : ''}`}>
                  Δ {fmtChg(r.chg)} pp
                </span>
              )}
            </div>
          ))}
        </div>
      )}
      {eff && <div className="ecb-fm-asof">Policy rates effective {eff}</div>}

      <div className="ecb-fm-body">
        {/* Left: dense levels table */}
        <div className="ecb-fm-table-wrap">
          <div className="ecb-fm-sec-h">All series · latest</div>
          <div className="ecb-fm-thead">
            <span>Series</span>
            <span className="num">As of</span>
            <span className="num">Level</span>
          </div>
          <div className="ecb-fm-tbody">
            {rateTable.map((r) => (
              <div key={r.label} className="ecb-fm-row">
                <span className="ecb-fm-name">
                  <span className="ecb-fm-group">{r.group}</span>
                  {r.label}
                </span>
                <span className="ecb-fm-period">{r.period || ''}</span>
                <span className="ecb-fm-rate">
                  {r.key ? (
                    <MetricValue
                      value={r.value}
                      seriesKey={r.key}
                      timestamp={r.period}
                      format={(v) => fmtPct(v, r.digits ?? 2)}
                    />
                  ) : (
                    fmtPct(r.value, r.digits ?? 2)
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: history chart + period table */}
        <div className="ecb-fm-right">
          {chartOption && (
            <div className="ecb-fm-chart">
              <div className="ecb-fm-sec-h">Over time</div>
              <SafeECharts
                option={chartOption}
                style={{ height: '100%', width: '100%' }}
                sourceInfo={{
                  title: 'ECB Financial Markets',
                  source: 'ECB SDW',
                  endpoint: '/api/ecb',
                  series: [{ id: 'FM/EST/BSI/ICP' }],
                  updatedAt: ecbCtx?.lastUpdated,
                }}
              />
            </div>
          )}
          {historyRows.length > 0 && (
            <div className="ecb-fm-hist-wrap">
              <div className="ecb-fm-sec-h">Monthly history (latest 18)</div>
              <div className="ecb-fm-hist-scroll">
                <table className="ecb-fm-hist">
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>MRR</th>
                      <th>DFR</th>
                      <th>€STR</th>
                      <th>E3M</th>
                      <th>E1Y</th>
                      <th>M3</th>
                      <th>HICP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyRows.map((h) => (
                      <tr key={h.period}>
                        <td>{h.period}</td>
                        <td>{h.mrr != null ? Number(h.mrr).toFixed(2) : '—'}</td>
                        <td>{h.dfr != null ? Number(h.dfr).toFixed(2) : '—'}</td>
                        <td>{h.estr != null ? Number(h.estr).toFixed(3) : '—'}</td>
                        <td>{h.euri3m != null ? Number(h.euri3m).toFixed(3) : '—'}</td>
                        <td>{h.euri1y != null ? Number(h.euri1y).toFixed(3) : '—'}</td>
                        <td>{h.m3 != null ? Number(h.m3).toFixed(1) : '—'}</td>
                        <td>{h.hicp != null ? Number(h.hicp).toFixed(1) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
