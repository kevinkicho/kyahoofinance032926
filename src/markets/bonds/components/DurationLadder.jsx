import { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './BondsDashboard.css';

// amount is millions of USD from Treasury MSPD
const MIDPOINTS = { '0–2y': 1, '2–5y': 3.5, '5–10y': 7.5, '10y+': 15, '0-2y': 1, '2-5y': 3.5, '5-10y': 7.5 };

const FFF_MONTHS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
const FFF_LABELS = ['1M', '2M', '3M', '4M', '5M', '6M'];
const BAR_COLORS = ['#34d399', '#60a5fa', '#a78bfa', '#f472b6'];

function fmtAmt(mil) {
  if (mil == null || !Number.isFinite(Number(mil))) return '—';
  const t = Number(mil) / 1e6; // millions → trillions
  if (t >= 1) return `$${t.toFixed(2)}T`;
  return `$${(Number(mil) / 1e3).toFixed(0)}B`;
}

function fmtPct(p) {
  if (p == null || !Number.isFinite(Number(p))) return '—';
  return `${Number(p).toFixed(1)}%`;
}

function fmtRate(r) {
  if (r == null || !Number.isFinite(Number(r))) return '—';
  return `${Number(r).toFixed(2)}%`;
}

export default function DurationLadder({
  durationLadderData,
  durationLadderMeta,
  treasuryRates = null,
  fedFundsFutures = null,
  bare = false,
}) {
  const { colors } = useTheme();

  const safeData = useMemo(() => {
    if (Array.isArray(durationLadderData) && durationLadderData.length) {
      return durationLadderData.map((d) => ({
        bucket: d.bucket,
        amount: d.amount != null ? Number(d.amount) : null,
        pct: d.pct != null ? Number(d.pct) : null,
        rate: d.rate != null ? Number(d.rate) : (treasuryRates?.[d.bucket] ?? null),
      }));
    }
    return [
      { bucket: '0–2y', amount: null, pct: null, rate: null },
      { bucket: '2–5y', amount: null, pct: null, rate: null },
      { bucket: '5–10y', amount: null, pct: null, rate: null },
      { bucket: '10y+', amount: null, pct: null, rate: null },
    ];
  }, [durationLadderData, treasuryRates]);

  const hasData = safeData.some((d) => d.amount != null);

  const option = useMemo(() => {
    if (!hasData) return null;
    // Chart in $ trillions (amount is millions)
    const buckets = safeData.map((d) => d.bucket);
    const amountsT = safeData.map((d) => (d.amount != null ? +(d.amount / 1e6).toFixed(2) : null));
    const pcts = safeData.map((d) => d.pct);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const i = params?.[0]?.dataIndex;
          if (i == null) return '';
          const d = safeData[i];
          return `<b>${d.bucket}</b><br/>Outstanding: <b>${fmtAmt(d.amount)}</b><br/>Share: <b>${fmtPct(d.pct)}</b>${
            d.rate != null ? `<br/>Avg rate: <b>${fmtRate(d.rate)}</b>` : ''
          }`;
        },
      },
      grid: { top: 8, right: 48, bottom: 8, left: 56, containLabel: false },
      xAxis: {
        type: 'value',
        axisLabel: { color: colors.textMuted, fontSize: 10, formatter: '${value}T' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'category',
        data: buckets,
        inverse: true,
        axisLabel: { color: colors.textSecondary, fontSize: 11, fontWeight: 600 },
        axisLine: { lineStyle: { color: colors.cardBg } },
        axisTick: { show: false },
      },
      series: [{
        type: 'bar',
        data: amountsT.map((v, i) => ({
          value: v,
          itemStyle: {
            color: BAR_COLORS[i % BAR_COLORS.length],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 28,
        label: {
          show: true,
          position: 'right',
          color: colors.textSecondary,
          fontSize: 10,
          fontWeight: 600,
          formatter: (params) => {
            const p = pcts[params.dataIndex];
            return p != null ? `${p}%` : '';
          },
        },
      }],
    };
  }, [safeData, hasData, colors]);

  const totalAmount = safeData.reduce((s, d) => s + (d.amount || 0), 0);
  const validBuckets = safeData.filter((d) => d.pct != null && d.pct > 0);
  const largest = validBuckets.length
    ? validBuckets.reduce((a, b) => (a.pct > b.pct ? a : b))
    : null;

  const avgMaturity = useMemo(() => {
    let wSum = 0;
    let wTotal = 0;
    safeData.forEach((d) => {
      const mid = MIDPOINTS[d.bucket] || 5;
      wSum += mid * (d.pct || 0);
      wTotal += d.pct || 0;
    });
    return wTotal > 0 ? (wSum / wTotal).toFixed(1) : '—';
  }, [safeData]);

  const shortBucket = safeData.find((d) => String(d.bucket).startsWith('0'));
  const longBucket = safeData.find((d) => String(d.bucket).startsWith('10'));
  const shortLong =
    shortBucket?.pct != null && longBucket?.pct > 0
      ? `${(shortBucket.pct / longBucket.pct).toFixed(1)}×`
      : '—';

  const fffOption = useMemo(() => {
    if (!fedFundsFutures) return null;
    const vals = FFF_MONTHS.map((k) => {
      const v = fedFundsFutures[k];
      return v != null && Number.isFinite(Number(v)) ? Number(v) : null;
    });
    // Need at least 2 months for a path chart; otherwise show nothing
    // (single DFF point is already on Key Metrics).
    if (vals.filter((v) => v != null).length < 2) return null;
    const finite = vals.filter((v) => v != null);
    const minVal = Math.min(...finite);
    const maxVal = Math.max(...finite);
    const pad = Math.max(0.1, (maxVal - minVal) * 0.25);
    const yMin = Math.max(0, Math.floor((minVal - pad) * 20) / 20);
    const yMax = Math.ceil((maxVal + pad) * 20) / 20;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params) => {
          const p = params?.[0];
          if (!p || p.value == null) return `${p?.name || ''}: —`;
          return `${p.name}: <b>${Number(p.value).toFixed(3)}%</b>`;
        },
      },
      grid: { top: 22, right: 8, bottom: 22, left: 40 },
      xAxis: {
        type: 'category',
        data: FFF_LABELS,
        axisLabel: { color: colors.textMuted, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'bar',
        data: vals.map((v) => ({
          value: v,
          itemStyle: {
            color: v == null ? 'transparent' : '#60a5fa',
            borderRadius: [3, 3, 0, 0],
          },
        })),
        barMaxWidth: 36,
        label: {
          show: true,
          position: 'top',
          color: colors.textSecondary,
          fontSize: 9,
          formatter: (p) => (p.value != null ? `${Number(p.value).toFixed(2)}%` : ''),
        },
      }],
    };
  }, [fedFundsFutures, colors]);

  const fffCount = fedFundsFutures
    ? FFF_MONTHS.filter((k) => fedFundsFutures[k] != null).length
    : 0;

  const body = (
    <div className="dl-body">
      <div className="dl-kpis">
        <div className="dl-kpi">
          <span className="dl-kpi-label">Total marketable</span>
          <span className="dl-kpi-value">{fmtAmt(totalAmount > 0 ? totalAmount : null)}</span>
        </div>
        <div className="dl-kpi">
          <span className="dl-kpi-label">Largest bucket</span>
          <span className="dl-kpi-value">{largest?.bucket ?? '—'}</span>
          <span className="dl-kpi-sub">{largest?.pct != null ? fmtPct(largest.pct) : ''}</span>
        </div>
        <div className="dl-kpi">
          <span className="dl-kpi-label">Avg maturity</span>
          <span className="dl-kpi-value">{avgMaturity !== '—' ? `${avgMaturity}y` : '—'}</span>
        </div>
        <div className="dl-kpi">
          <span className="dl-kpi-label">Short / long</span>
          <span className="dl-kpi-value">{shortLong}</span>
        </div>
      </div>

      <div className="dl-main">
        <div className="dl-chart-card">
          <div className="dl-section-title">Outstanding by maturity</div>
          <div className="dl-chart-body">
            {option ? (
              <SafeECharts
                option={option}
                style={{ height: '100%', width: '100%' }}
                sourceInfo={{
                  title: 'Duration Ladder',
                  source: 'Treasury Fiscal Data MSPD',
                  endpoint: '/api/bonds',
                  series: [],
                  updatedAt: durationLadderMeta?.asOf,
                }}
              />
            ) : (
              <div className="dl-empty">Treasury MSPD unavailable</div>
            )}
          </div>
        </div>

        <div className="dl-table-card">
          <div className="dl-section-title">Bucket detail</div>
          <div className="dl-table" role="table">
            <div className="dl-table-head" role="row">
              <span role="columnheader">Bucket</span>
              <span role="columnheader">Outstanding</span>
              <span role="columnheader">Share</span>
              <span role="columnheader">Avg rate</span>
            </div>
            <div className="dl-table-body">
              {safeData.map((d, i) => (
                <div
                  key={d.bucket}
                  className="dl-table-row"
                  role="row"
                  style={{ borderLeftColor: BAR_COLORS[i % BAR_COLORS.length] }}
                >
                  <span className="dl-td-bucket" role="cell">{d.bucket}</span>
                  <span className="dl-td-num" role="cell">{fmtAmt(d.amount)}</span>
                  <span className="dl-td-num" role="cell">{fmtPct(d.pct)}</span>
                  <span className="dl-td-num" role="cell">{fmtRate(d.rate)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {fffOption && (
        <div className="dl-fff-card">
          <div className="dl-section-title">
            Fed funds futures · implied rate 1–6M
            {fffCount ? ` · ${fffCount}/6 months` : ''}
          </div>
          <div className="dl-fff-body">
            <SafeECharts
              option={fffOption}
              style={{ height: '100%', width: '100%' }}
              sourceInfo={{
                title: 'Fed Funds Futures (ZQ)',
                source: 'CME via Yahoo Finance',
                endpoint: '/api/bonds',
                series: [],
              }}
            />
          </div>
        </div>
      )}

      <div className="dl-footer">
        MSPD maturity buckets
        {durationLadderMeta?.asOf
          ? ` · as of ${new Date(`${durationLadderMeta.asOf}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
          : ''}
        {durationLadderMeta?.avgRate != null
          ? ` · weighted avg coupon ${fmtRate(durationLadderMeta.avgRate)}`
          : ''}
        {' · '}fiscaldata.treasury.gov
        {fffCount >= 2 ? ' · ZQ path: CME' : ''}
      </div>
    </div>
  );

  if (bare) return body;

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Duration Ladder</span>
        <span className="bonds-panel-subtitle">US Treasury marketable debt by maturity</span>
      </div>
      {body}
    </div>
  );
}
