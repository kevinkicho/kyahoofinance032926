import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import WorldBankDebtPanel from './WorldBankDebtPanel';
import BisTotalCreditPanel from './BisTotalCreditPanel';
import TreasuryCreditHoldingsPanel from './TreasuryCreditHoldingsPanel';
import './CreditDashboard.css';

// KPI strip is now a real bento child at row 0 (h:2). All other panels
// shifted down 2 rows. Storage key bumped.
const LAYOUT = {
  lg: [
    { i: 'kpi', x: 0, y: 0, w: 12, h: 2 },
    { i: 'key-metrics', x: 0, y: 2, w: 3, h: 3 },
    { i: 'credit-spreads', x: 3, y: 2, w: 3, h: 3 },
    { i: 'spread-summary', x: 6, y: 2, w: 3, h: 3 },
    { i: 'em-spread', x: 9, y: 2, w: 3, h: 3 },
    { i: 'em-yields', x: 0, y: 5, w: 4, h: 2 },
    { i: 'cp-rates', x: 4, y: 5, w: 4, h: 2 },
    { i: 'clo-tranches', x: 8, y: 5, w: 4, h: 2 },
    { i: 'default-rates', x: 0, y: 7, w: 6, h: 2 },
    { i: 'delinquency', x: 6, y: 7, w: 6, h: 2 },
    // Tier-1 addition (2026-05-03): US banking sector aggregate + recent
    // bank failures (FDIC summary + failures endpoints).
    { i: 'bank-sector', x: 0, y: 9, w: 12, h: 3 },
    // 2026-05-04 additions: Moody's Aaa/Baa credit-quality spread (FRED)
    // and MSRB EMMA municipal-bond market activity (HTML scrape).
    { i: 'credit-quality', x: 0, y: 12, w: 6, h: 4 },
    { i: 'muni-market',    x: 6, y: 12, w: 6, h: 4 },
    { i: 'bank-stress',    x: 0, y: 16, w: 12, h: 3 },
    { i: 'ted-spread',     x: 0, y: 19, w: 6, h: 3 },
    { i: 'wb-debt', x: 6, y: 19, w: 6, h: 3 },
    { i: 'bis-total-credit', x: 0, y: 22, w: 6, h: 3 },
    { i: 'treasury-credit-holdings', x: 6, y: 22, w: 6, h: 3 },
  ]
};

function CreditDashboard({
  kpiPanel,
  spreadData,
  emBondData,
  loanData,
  defaultData,
  delinquencyRates,
  lendingStandards,
  commercialPaper,
  excessReserves,
  creditQuality,
  tedSpread,
  isLive,
  lastUpdated,
  fetchLog,
  error,
  fetchedOn,
  isCurrent,
}) {
  const { colors } = useTheme();
  // Tier-1: US banking sector aggregate + recent bank failures.
  const fdicCtx = useMarketData('fdic');
  // 2026-05-04: MSRB EMMA municipal market activity.
  const msrbCtx = useMarketData('msrb');

  const igSpread = spreadData?.current?.igSpread;
  const hySpread = spreadData?.current?.hySpread;
  const emSpread = spreadData?.current?.emSpread;
  const defaultRate = defaultData?.rates?.[0]?.value ?? defaultData?.defaultRate;

  const spreadOption = useMemo(() => {
    const history = spreadData?.history;
    const dates = history?.dates;
    const igValues = history?.IG;
    const hyValues = history?.HY;

    if (!dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['IG OAS', 'HY OAS'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 6) } },
      yAxis: { type: 'value', name: 'bps', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'IG OAS', type: 'line', data: igValues || [], smooth: true, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2 } },
        { name: 'HY OAS', type: 'line', data: hyValues || [], smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 } },
      ],
    };
  }, [spreadData, colors]);

  const emOption = useMemo(() => {
    const hist = spreadData?.history;
    if (!hist?.EM?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: hist.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(hist.dates.length / 6) } },
      yAxis: { type: 'value', name: 'bps', nameTextStyle: { color: colors.textMuted, fontSize: 10 }, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: hist.EM, smooth: true, symbol: 'none', lineStyle: { color: '#a78bfa', width: 2 } }],
    };
  }, [spreadData, colors]);

  const spreadSummary = useMemo(() => {
    if (spreadData?.current) {
      return [
        { name: 'IG OAS', spread: spreadData.current.igSpread },
        { name: 'HY OAS', spread: spreadData.current.hySpread },
        { name: 'EM OAS', spread: spreadData.current.emSpread },
        { name: 'BBB OAS', spread: spreadData.current.bbbSpread },
      ].filter(s => s.spread != null);
    }
    return [];
  }, [spreadData]);

  const bankStress = useMemo(() => {
    const aggregate = fdicCtx?.data?.aggregate || [];
    const latest = aggregate[0] || null;
    const prior = aggregate[1] || null;
    const depositChange = latest?.depositsB != null && prior?.depositsB
      ? ((latest.depositsB - prior.depositsB) / Math.abs(prior.depositsB)) * 100
      : null;
    const failures = fdicCtx?.data?.failures || [];
    const currentYear = new Date().getFullYear();
    const failuresYtd = failures.filter(f => String(f.date || '').includes(String(currentYear))).length;
    const hy = Number(hySpread);
    const ig = Number(igSpread);
    const cp = commercialPaper?.rate;
    const def = defaultRate;
    const score = [
      Number.isFinite(hy) ? Math.min(35, Math.max(0, (hy - 250) / 8)) : 0,
      Number.isFinite(ig) ? Math.min(20, Math.max(0, (ig - 90) / 5)) : 0,
      Number.isFinite(def) ? Math.min(20, Math.max(0, (def - 2) * 7)) : 0,
      Number.isFinite(cp) ? Math.min(15, Math.max(0, (cp - 4.5) * 6)) : 0,
      failuresYtd ? Math.min(10, failuresYtd * 3) : 0,
    ].reduce((sum, v) => sum + v, 0);
    const regime = score >= 55 ? 'Elevated' : score >= 30 ? 'Watch' : 'Contained';
    return { latest, depositChange, failuresYtd, hy, ig, cp, def, score, regime };
  }, [fdicCtx, hySpread, igSpread, commercialPaper, defaultRate]);

  // ── Moody's Aaa vs Baa credit-quality spread (FRED DAAA/DBAA) ──────────
  // Two stacked panels in one chart: Aaa + Baa yields on the top axis,
  // Baa-Aaa spread (bps) on the bottom axis with a shaded band for the
  // long-run normal range (~80-130bps). Spread widening = credit cycle
  // weakening; tightening = benign / risk-on.
  const creditQualityOption = useMemo(() => {
    const cq = creditQuality;
    if (!cq?.dates?.length) return null;
    const dates = cq.dates;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['Aaa (%)', 'Baa (%)', 'Baa-Aaa spread (bps)'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: [
        { top: 28, right: 16, bottom: '50%', left: 44 },
        { top: '58%', right: 16, bottom: 28, left: 44 },
      ],
      xAxis: [
        { type: 'category', gridIndex: 0, data: dates, axisLabel: { show: false }, axisLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'category', gridIndex: 1, data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      ],
      yAxis: [
        { type: 'value', gridIndex: 0, name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { formatter: '{value}%', color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'value', gridIndex: 1, name: 'bps', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      ],
      series: [
        { name: 'Aaa (%)', xAxisIndex: 0, yAxisIndex: 0, type: 'line', data: cq.aaaPct, smooth: true, symbol: 'none', lineStyle: { color: '#22d3ee', width: 1.6 } },
        { name: 'Baa (%)', xAxisIndex: 0, yAxisIndex: 0, type: 'line', data: cq.baaPct, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 1.6 } },
        { name: 'Baa-Aaa spread (bps)', xAxisIndex: 1, yAxisIndex: 1, type: 'line', data: cq.spreadBps, smooth: true, symbol: 'none', lineStyle: { color: '#a78bfa', width: 1.8 }, areaStyle: { color: 'rgba(167, 139, 250, 0.12)' } },
      ],
    };
  }, [creditQuality, colors]);

  // ── MSRB primary-market YTD bar chart ──────────────────────────────────
  // Monthly issuance (par $M) — gives a sense of new-issue calendar pace
  // and demand. Total row excluded from the bars.
  const msrbPrimaryOption = useMemo(() => {
    const rows = (msrbCtx?.data?.primaryMarket || []).filter(r => !/total/i.test(r.period));
    if (!rows.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: ps => {
        const i = ps[0]?.dataIndex;
        const r = rows[i];
        return r ? `<b>${r.period}</b><br/>Issues: ${r.issues?.toLocaleString()}<br/>Par: $${r.parM?.toLocaleString()}M<br/>Avg size: $${r.avgSizeM?.toFixed(1)}M` : '';
      }},
      grid: { top: 12, right: 12, bottom: 28, left: 50 },
      xAxis: { type: 'category', data: rows.map(r => r.period.slice(0, 3)), axisLabel: { color: colors.textMuted, fontSize: 9 }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', name: '$M', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `$${(v / 1000).toFixed(0)}B` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'bar', data: rows.map(r => r.parM), itemStyle: { color: '#10b981', borderRadius: [3, 3, 0, 0] }, barWidth: 16 }],
    };
  }, [msrbCtx, colors]);

  return (
    <div className="credit-dashboard credit-dashboard--bento">
      <BentoWrapper layout={LAYOUT} storageKey="credit-layout-v5">
        {/* KPI strip — real bento child at row 0. Provided by parent so
            the credit-specific KPI builder lives there. */}
        {kpiPanel && (
          <BentoCard
            key="kpi"
            title="Credit Key Metrics"
            accent="credit"
            className="credit-bento-card"
            contentClassName="credit-panel-scroll"
            noFooter
          >
            {kpiPanel}
          </BentoCard>
        )}
        {/* Key Metrics */}
        <BentoCard
          key="key-metrics"
          title="Key Metrics"
          accent="credit"
          className="credit-bento-card"
          contentClassName="bento-panel-scroll"
          source="FRED / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <>
            <div className="credit-sidebar-section">
              <div className="credit-sidebar-title">Credit Spreads</div>
              {typeof igSpread === 'number' && (
                <div className="credit-metric-card">
                  <div className="credit-metric-label">IG OAS</div>
                  <div className="credit-metric-value" style={{
                    color: igSpread > 150 ? '#f87171' : igSpread > 100 ? '#fbbf24' : '#22c55e'
                  }}>
                    <MetricValue value={igSpread} seriesKey="igOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} />
                  </div>
                </div>
              )}
              {typeof hySpread === 'number' && (
                <div className="credit-metric-card">
                  <div className="credit-metric-row">
                    <span className="credit-metric-name">HY OAS</span>
                    <span className="credit-metric-num" style={{ color: hySpread > 400 ? '#f87171' : hySpread > 250 ? '#fbbf24' : '#22c55e' }}>
                       <MetricValue value={hySpread} seriesKey="hyOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} />
                    </span>
                  </div>
                </div>
              )}
              {typeof emSpread === 'number' && (
                <div className="credit-metric-card">
                  <div className="credit-metric-row">
                    <span className="credit-metric-name">EM Spread</span>
                    <span className="credit-metric-num" style={{ color: '#a78bfa' }}><MetricValue value={emSpread} seriesKey="emOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} /></span>
                  </div>
                </div>
              )}
            </div>

            <div className="credit-sidebar-section">
              <div className="credit-sidebar-title">Default Watch</div>
              {typeof defaultRate === 'number' && (
                <div className="credit-metric-card">
                  <div className="credit-metric-row">
                    <span className="credit-metric-name">Default Rate</span>
                    <span className="credit-metric-num" style={{ color: defaultRate > 3 ? '#f87171' : '#22c55e' }}>
                      <MetricValue value={defaultRate} seriesKey="defaultRate" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
                    </span>
                  </div>
                </div>
              )}
              {delinquencyRates?.[0] && typeof delinquencyRates[0].rate === 'number' && (
                <div className="credit-metric-card">
                  <div className="credit-metric-row">
                    <span className="credit-metric-name">{delinquencyRates[0].type}</span>
                     <span className="credit-metric-num"><MetricValue value={delinquencyRates[0].rate} seriesKey="delinquencyRate" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} /></span>
                  </div>
                </div>
              )}
            </div>

            {commercialPaper?.rate != null && typeof commercialPaper.rate === 'number' && (
              <div className="credit-sidebar-section">
                <div className="credit-sidebar-title">Short-Term</div>
                <div className="credit-metric-card">
                  <div className="credit-metric-row">
                    <span className="credit-metric-name">CP Rate</span>
                    <span className="credit-metric-num" style={{ color: '#14b8a6' }}>
                       <MetricValue value={commercialPaper.rate} seriesKey="commercialPaper" timestamp={lastUpdated} format={v => `${v.toFixed(2)}%`} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        </BentoCard>

        <BentoCard
          key="bank-stress"
          title="Bank Stress Monitor"
          subtitle={`${bankStress.regime} credit cycle · spread, default, funding, and FDIC signals`}
          accent="credit"
          className="credit-bento-card"
          contentClassName="bento-panel-scroll"
          source="FDIC / FRED"
          timestamp={fdicCtx?.lastUpdated || lastUpdated}
          isLive={!!(fdicCtx?.data?.aggregate?.length || spreadData)}
          isCurrent={fdicCtx?.isCurrent ?? isCurrent}
          fetchedOn={fdicCtx?.fetchedOn || fetchedOn}
          fetchLog={fdicCtx?.fetchLog || fetchLog}
          error={fdicCtx?.error || error}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8 }}>
            {[
              ['Stress Score', bankStress.score, bankStress.score >= 55 ? '#f87171' : bankStress.score >= 30 ? '#f59e0b' : '#22c55e', v => `${v.toFixed(0)}/100`],
              ['HY OAS', bankStress.hy, bankStress.hy >= 400 ? '#f87171' : bankStress.hy >= 275 ? '#f59e0b' : '#22c55e', v => `${v.toFixed(0)} bps`],
              ['Default Rate', bankStress.def, bankStress.def >= 4 ? '#f87171' : bankStress.def >= 2.5 ? '#f59e0b' : '#22c55e', v => `${v.toFixed(2)}%`],
              ['CP Rate', bankStress.cp, bankStress.cp >= 5 ? '#f87171' : '#60a5fa', v => `${v.toFixed(2)}%`],
              ['Deposit YoY', bankStress.depositChange, bankStress.depositChange < 0 ? '#f87171' : '#22c55e', v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`],
              ['Failures YTD', bankStress.failuresYtd, bankStress.failuresYtd > 0 ? '#f59e0b' : '#22c55e', v => `${v}`],
            ].map(([label, value, color, format]) => (
              <div key={label} className="credit-metric-card" style={{ minWidth: 0 }}>
                <div className="credit-metric-label">{label}</div>
                <div className="credit-metric-value" style={{ color, fontSize: 15 }}>
                  {typeof value === 'number' && Number.isFinite(value) ? format(value) : '—'}
                </div>
              </div>
            ))}
          </div>
        </BentoCard>

        {/* Credit Spreads Chart */}
        {spreadOption && (
          <BentoCard
            key="credit-spreads"
            title="Credit Spreads"
            accent="credit"
            className="credit-bento-card"
            contentClassName="credit-panel-content"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={spreadOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Credit Spreads', source: 'FRED', endpoint: '/api/credit', series: [{ id: 'BAMLH0A0HYM2' }, { id: 'BAMLC0A0CM' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* Spread Summary */}
        {spreadSummary.length > 0 && (
          <BentoCard
            key="spread-summary"
            title="Spread Summary"
            accent="credit"
            className="credit-bento-card"
            contentClassName="bento-panel-scroll"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {spreadSummary.map((s) => (
              <div key={s.name} className="credit-mini-row">
                <span className="credit-mini-name">{s.name}</span>
                <span className="credit-mini-value" style={{ color: s.spread > 150 ? '#f87171' : s.spread > 80 ? '#fbbf24' : '#22c55e' }}>
                  <MetricValue value={s.spread} seriesKey={s.label === 'High Yield' ? 'hyOAS' : s.label === 'Investment Grade' ? 'igOAS' : s.label === 'EM Sovereign' ? 'emOAS' : 'spreadSummary'} timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(0)} bps` : '—'} />
                </span>
              </div>
            ))}
          </BentoCard>
        )}

        {/* EM Spread History */}
        {emOption && (
          <BentoCard
            key="em-spread"
            title="EM Spread History"
            accent="credit"
            className="credit-bento-card"
            contentClassName="credit-panel-content"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={emOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'EM Spread History', source: 'FRED', endpoint: '/api/credit', series: [{ id: 'BAMLEMRACRPIOAS' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* EM Yields — ETF trailing yield proxy (best freely available) */}
        {(emBondData?.countries || emBondData)?.length > 0 && (
          <BentoCard
            key="em-yields"
            title="EM ETF Yields"
            accent="credit"
            className="credit-bento-card"
            contentClassName="bento-panel-scroll"
            source="Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {(emBondData.countries || emBondData).slice(0, 8).map((e) => (
              <div key={e.country || e.name} className="credit-mini-row">
                <span className="credit-mini-name">{e.country || e.name}{e.etfTicker ? <span style={{ fontSize: 9, opacity: 0.55, marginLeft: 4 }}>{e.etfTicker}</span> : null}</span>
                <span className="credit-mini-value"><MetricValue value={e.yld10y ?? e.etfYield ?? e.yield} seriesKey="emYield" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} /></span>
              </div>
            ))}
          </BentoCard>
        )}

        {/* Commercial Paper */}
        {commercialPaper?.history?.dates?.length > 0 && (
          <BentoCard
            key="cp-rates"
            title="Commercial Paper"
            accent="credit"
            className="credit-bento-card"
            contentClassName="bento-panel-scroll"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <>
              <div className="credit-mini-row">
                <span className="credit-mini-name">AA 30-Day</span>
                <span className="credit-mini-value"><MetricValue value={commercialPaper.rate} seriesKey="commercialPaper" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} /></span>
              </div>
              {commercialPaper.volume != null && (
                <div className="credit-mini-row">
                  <span className="credit-mini-name">Volume</span>
                  <span className="credit-mini-value"><MetricValue value={commercialPaper.volume} seriesKey="commercialPaperVolume" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(0)}B`} /></span>
                </div>
              )}
            </>
          </BentoCard>
        )}

        {/* CLO Tranches */}
        {(loanData?.cloTranches || loanData)?.length > 0 && (
          <BentoCard
            key="clo-tranches"
            title="CLO Tranches"
            accent="credit"
            className="credit-bento-card"
            contentClassName="bento-panel-scroll"
            source="FRED (IG OAS + conventions) / Yahoo"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <>
              <div className="credit-mini-row credit-mini-row-header">
                <span className="credit-mini-name" style={{ fontWeight: 700 }}>Tranche</span>
                <span className="credit-mini-value" style={{ fontWeight: 700, textAlign: 'right', minWidth: 60 }}>Spread</span>
                <span className="credit-mini-value" style={{ fontWeight: 700, textAlign: 'right', minWidth: 60 }}>Yield</span>
                <span className="credit-mini-value" style={{ fontWeight: 700, textAlign: 'right', minWidth: 40 }}>LTV</span>
              </div>
              {(loanData.cloTranches || loanData).slice(0, 8).map((l) => (
                <div key={l.tranche || l.sector} className="credit-mini-row">
                  <span className="credit-mini-name">{l.tranche || l.sector}</span>
                  <span className="credit-mini-value" style={{ textAlign: 'right', minWidth: 60 }}>
                    <MetricValue value={l.spread} seriesKey="cloSpread" timestamp={lastUpdated} format={v => v != null ? `${v} bps` : '—'} />
                  </span>
                  <span className="credit-mini-value" style={{ textAlign: 'right', minWidth: 60 }}>
                    <MetricValue value={l.yield} seriesKey="cloYield" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} />
                  </span>
                  <span className="credit-mini-value" style={{ textAlign: 'right', minWidth: 40, color: colors.textMuted }}>
                    {l.ltv != null ? `${l.ltv}%` : '—'}
                  </span>
                </div>
              ))}
            </>
          </BentoCard>
        )}

        {/* Default Rates */}
        {defaultData?.rates?.length > 0 && (
          <BentoCard
            key="default-rates"
            title="Default Rates"
            accent="credit"
            className="credit-bento-card"
            contentClassName="bento-panel-scroll"
            source="FRED / Moody's"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {defaultData.rates.slice(0, 8).map((d) => (
              <div key={d.category} className="credit-mini-row">
                <span className="credit-mini-name">{d.category}</span>
                <span className="credit-mini-value" style={{ color: d.value > 3 ? '#f87171' : '#fbbf24' }}>
                  <MetricValue value={d.value} seriesKey="defaultRateByCategory" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(1)}%` : '—'} />
                </span>
              </div>
            ))}
          </BentoCard>
        )}

        {/* Delinquency Rates */}
        {delinquencyRates?.length > 0 && (
          <BentoCard
            key="delinquency"
            title="Delinquency Rates"
            accent="credit"
            className="credit-bento-card"
            contentClassName="bento-panel-scroll"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {delinquencyRates.slice(0, 8).map((d) => (
              <div key={d.type} className="credit-mini-row">
                <span className="credit-mini-name">{d.type}</span>
                <span className="credit-mini-value"><MetricValue value={d.rate} seriesKey="delinquencyRate" timestamp={lastUpdated} format={v => v != null ? `${v.toFixed(2)}%` : '—'} /></span>
              </div>
            ))}
          </BentoCard>
        )}

        {/* US Banking Sector — FDIC aggregate + recent bank failures.
            Two-column layout: aggregate KPIs on the left, failures list on
            the right. Both fed by /api/fdic. */}
        <BentoCard
          key="bank-sector"
          title="US Banking Sector"
          subtitle="FDIC aggregate + recent failures"
          accent="credit"
          className="credit-bento-card"
          contentClassName="bento-panel-scroll"
          source="FDIC"
          timestamp={fdicCtx?.lastUpdated || lastUpdated}
          isLive={!!(fdicCtx?.data?.aggregate?.length || fdicCtx?.data?.failures?.length)}
          isCurrent={fdicCtx?.isCurrent ?? isCurrent}
          fetchedOn={fdicCtx?.fetchedOn || fetchedOn}
          fetchLog={fdicCtx?.fetchLog || fetchLog}
          error={fdicCtx?.error || error}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div className="credit-sidebar-title">Aggregate ($B, thousands of banks)</div>
              {(fdicCtx?.data?.aggregate || []).slice(0, 4).map(y => (
                <div key={y.year} className="credit-mini-row" style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr', gap: 6 }}>
                  <span className="credit-mini-name" style={{ color: colors.textSecondary, fontWeight: 600 }}>{y.year}</span>
                  <span className="credit-mini-value" title="Total assets" style={{ color: '#22d3ee' }}>
                    <MetricValue value={y.assetsB} seriesKey="fdicAssets" timestamp={fdicCtx?.lastUpdated} format={v => v != null ? `$${(v / 1000).toFixed(1)}T` : '—'} />
                  </span>
                  <span className="credit-mini-value" title="Total deposits" style={{ color: '#a78bfa' }}>
                    <MetricValue value={y.depositsB} seriesKey="fdicDeposits" timestamp={fdicCtx?.lastUpdated} format={v => v != null ? `$${(v / 1000).toFixed(1)}T` : '—'} />
                  </span>
                  <span className="credit-mini-value" title="Net income" style={{ color: '#4ade80' }}>
                    <MetricValue value={y.netIncomeB} seriesKey="fdicNetIncome" timestamp={fdicCtx?.lastUpdated} format={v => v != null ? `$${v.toFixed(1)}B` : '—'} />
                  </span>
                </div>
              ))}
              <div style={{ fontSize: 9, color: colors.textMuted, marginTop: 4 }}>year · assets · deposits · net income</div>
            </div>
            <div>
              <div className="credit-sidebar-title">Recent Failures</div>
              {(fdicCtx?.data?.failures || []).slice(0, 6).map((f, i) => (
                <div key={`${f.name}-${i}`} className="credit-mini-row" style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px', gap: 6 }}>
                  <span className="credit-mini-name" title={f.city} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                  <span className="credit-mini-value" style={{ color: colors.textMuted, fontSize: 10 }}>{f.date}</span>
                  <span className="credit-mini-value" style={{ color: '#f87171' }}>
                    <MetricValue value={f.assets} seriesKey="fdicFailureAssets" timestamp={f.date} format={v => v != null ? `$${(v / 1000).toFixed(1)}B` : '—'} />
                  </span>
                </div>
              ))}
              {(!fdicCtx?.data?.failures?.length) && <div style={{ color: colors.textMuted, fontSize: 11 }}>No recent failures</div>}
            </div>
          </div>
        </BentoCard>

        {/* Moody's Aaa/Baa credit-quality spread (FRED DAAA/DBAA) */}
        {creditQuality?.dates?.length > 0 && (
          <BentoCard
            key="credit-quality"
            title="Credit Quality Premium"
            subtitle={creditQuality.latest
              ? `Baa-Aaa spread: ${creditQuality.latest.spreadBps} bps · Aaa ${creditQuality.latest.aaaPct?.toFixed(2)}% / Baa ${creditQuality.latest.baaPct?.toFixed(2)}% (${creditQuality.latest.date})`
              : "Moody's seasoned Aaa & Baa corporate yields · 1-year history"}
            accent="credit"
            className="credit-bento-card"
            contentClassName="credit-panel-content"
            source="FRED · Moody's seasoned indices"
            timestamp={lastUpdated}
            isLive={!!creditQuality?.dates?.length}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {creditQualityOption && <SafeECharts option={creditQualityOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Credit Quality Premium', source: "Moody's via FRED", endpoint: '/api/credit', series: [{ id: 'DAAA' }, { id: 'DBAA' }], updatedAt: lastUpdated }} />}
          </BentoCard>
        )}

        {/* MSRB EMMA — US Municipal market activity */}
        {msrbCtx?.data?.summary && (
          <BentoCard
            key="muni-market"
            title="US Municipal Bond Market"
            subtitle={msrbCtx.data.summary.tradesAll
              ? `${msrbCtx.data.summary.tradesAll.toLocaleString()} trades / $${msrbCtx.data.summary.parAllM?.toLocaleString()}M par · YTD ${msrbCtx.data.summary.ytdIssues?.toLocaleString()} issues / $${(msrbCtx.data.summary.ytdParM / 1000).toFixed(1)}B`
              : 'MSRB EMMA · trade activity + new-issue calendar'}
            accent="credit"
            className="credit-bento-card"
            contentClassName="credit-panel-content"
            source="MSRB EMMA"
            timestamp={msrbCtx?.lastUpdated || lastUpdated}
            isLive={!!msrbCtx?.data?.isLive}
            isCurrent={msrbCtx?.isCurrent ?? isCurrent}
            fetchedOn={msrbCtx?.fetchedOn || fetchedOn}
            fetchLog={msrbCtx?.fetchLog || fetchLog}
            error={msrbCtx?.error || error}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 12, height: '100%' }}>
              <div>
                <div className="credit-sidebar-title" style={{ marginBottom: 4 }}>Trade Activity (latest day)</div>
                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: colors.textMuted, borderBottom: `1px solid ${colors.cardBg}` }}>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Type</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px' }}>Trades</th>
                      <th style={{ textAlign: 'right', padding: '4px 6px' }}>Par $M</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(msrbCtx?.data?.tradeTypes || []).map((r, i) => (
                      <tr key={i} style={{ borderBottom: `1px solid ${colors.cardBg}`, fontWeight: /All/i.test(r.type) ? 600 : 400 }}>
                        <td style={{ padding: '4px 6px', color: colors.textSecondary }}>{r.type}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.trades?.toLocaleString()}</td>
                        <td style={{ padding: '4px 6px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: /All/i.test(r.type) ? '#10b981' : colors.textPrimary }}>${r.parM?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="credit-sidebar-title" style={{ marginBottom: 4 }}>Primary Market YTD ($ par)</div>
                <div style={{ flex: 1, minHeight: 0 }}>
                  {msrbPrimaryOption && <SafeECharts option={msrbPrimaryOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Muni Primary Market', source: 'MSRB EMMA', endpoint: '/api/msrb', series: [], updatedAt: msrbCtx?.lastUpdated || lastUpdated }} />}
                </div>
              </div>
            </div>
          </BentoCard>
        )}

        {tedSpread?.values?.length > 0 && (
          <BentoCard key="ted-spread" title="TED Spread (LIBOR − T-Bill)" accent="credit" className="credit-bento-card" contentClassName="credit-panel-content" source="FRED (TEDRATE)" timestamp={lastUpdated} isLive={isLive} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
            <div style={{ height: '100%', minHeight: 0, padding: 4 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 700, color: (tedSpread.latest ?? 0) > 0.5 ? '#f87171' : '#22c55e' }}>
                  {tedSpread.latest != null ? `${tedSpread.latest.toFixed(2)}%` : '—'}
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted, #666)' }}>bps · {tedSpread.dates?.[tedSpread.dates.length - 1]}</span>
              </div>
              <div style={{ height: 'calc(100% - 30px)', minHeight: 0 }}>
                <SafeECharts
                  option={{
                    animation: false, backgroundColor: 'transparent',
                    grid: { left: 40, right: 8, top: 8, bottom: 20 },
                    xAxis: { type: 'category', data: tedSpread.dates, axisLabel: { fontSize: 9, color: '#888', interval: Math.floor(tedSpread.dates.length / 5) } },
                    yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#888' }, splitLine: { lineStyle: { color: '#222' } } },
                    tooltip: { trigger: 'axis' },
                    series: [{ type: 'line', data: tedSpread.values, smooth: true, symbol: 'none', lineStyle: { color: '#f59e0b', width: 2 }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#f59e0b40' }, { offset: 1, color: '#f59e0b05' }] } } }],
                  }}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{ title: 'TED Spread', source: 'FRED', endpoint: '/api/credit', series: [] }}
                />
              </div>
            </div>
          </BentoCard>
        )}
        <BentoCard key="wb-debt" title="World Bank Debt Statistics" subtitle="GDP growth and trade openness by country" accent="credit" className="credit-bento-card" contentClassName="bento-panel-scroll" source="World Bank" timestamp={lastUpdated} isLive={true} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          <WorldBankDebtPanel />
        </BentoCard>
        <BentoCard key="bis-total-credit" title="BIS Total Credit" subtitle="Credit-to-GDP ratios for major economies" accent="credit" className="credit-bento-card" contentClassName="bento-panel-scroll" source="BIS" timestamp={lastUpdated} isLive={true} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          <BisTotalCreditPanel />
        </BentoCard>
        <BentoCard key="treasury-credit-holdings" title="Treasury Credit Holdings" subtitle="Top foreign holders of US Treasury securities" accent="credit" className="credit-bento-card" contentClassName="bento-panel-scroll" source="US Treasury TIC" timestamp={lastUpdated} isLive={true} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          <TreasuryCreditHoldingsPanel />
        </BentoCard>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(CreditDashboard);
