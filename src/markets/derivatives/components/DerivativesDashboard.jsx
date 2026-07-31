import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import MetricValue from '../../../components/MetricValue/MetricValue';
import DerivativesSidebar from './DerivativesSidebar';
import EcbDerivativesPanel from './EcbDerivativesPanel';
import './DerivativesDashboard.css';

/** Western thousand separators: 20292.7 → $20,292.7B */
function fmtGexBillions(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const body = Math.abs(Number(v)).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `$${body}B`;
}

function fmtGexBillionsSigned(v) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  const body = Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${n >= 0 ? '+' : '-'}$${body}B`;
}

// KPI strip is now a real bento child at row 0 (h:2). Other panels shifted
// down 2 rows. Storage key bumped.
const LAYOUT = {
  lg: [
    { i: 'kpi',     x: 0, y: 0, w: 12, h: 2 },
    { i: 'metrics', x: 0, y: 2, w: 3,  h: 5 },
    { i: 'vixterm', x: 3, y: 2, w: 3,  h: 3 },
    { i: 'vix1y',   x: 6, y: 2, w: 3,  h: 3 },
    { i: 'skew',    x: 9, y: 2, w: 3,  h: 3 },
    { i: 'volsurf', x: 3, y: 5, w: 6,  h: 3 },
    { i: 'flow',    x: 9, y: 5, w: 3,  h: 3 },
    { i: 'gamma',   x: 0, y: 7, w: 3,  h: 4 },
    { i: 'volprem', x: 3, y: 8, w: 3,  h: 3 },
    { i: 'cftc-tff', x: 6, y: 7, w: 6, h: 4 },
    { i: 'bis-otc', x: 0, y: 11, w: 7, h: 5 },
    { i: 'ecb-derivatives', x: 7, y: 11, w: 5, h: 5 },
  ]
};

function DerivativesDashboard({
  kpis,
  volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment,
  volPremium, fredVixHistory, putCallRatio, skewIndex, skewHistory,
  gammaExposure, vixPercentile, termSpread, fetchLog, isLive, lastUpdated, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const cftcTFFCtx = useMarketData('cftcTFF');
  const bisOTCCtx = useMarketData('bisOTC');
  const ecbCtx = useMarketData('ecb');

  const vixOption = useMemo(() => {
    if (!vixTermStructure?.dates?.length) return null;
    const { dates, values, prevValues } = vixTermStructure;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['Current', 'Prev Close'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 24, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'value', name: 'VIX', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'Current', type: 'line', data: values, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#a78bfa' }, itemStyle: { color: '#a78bfa' } },
        { name: 'Prev Close', type: 'line', data: prevValues, smooth: true, symbol: 'none', lineStyle: { width: 1, type: 'dashed', color: colors.textDim } },
      ],
    };
  }, [vixTermStructure, colors]);

  const fredOption = useMemo(() => {
    if (!fredVixHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 12, bottom: 20, left: 40 },
      xAxis: { type: 'category', data: fredVixHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fredVixHistory.dates.length / 5) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fredVixHistory.values, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#a78bfa' }, areaStyle: { color: 'rgba(167,139,250,0.1)' } }],
    };
  }, [fredVixHistory, colors]);

  const heatmapOption = useMemo(() => {
    if (!volSurfaceData?.grid?.length) return null;
    const { strikes, expiries, grid } = volSurfaceData;
    const data = [];
    expiries.forEach((_, ei) => { strikes.forEach((_, si) => { data.push([si, ei, grid[ei][si]]); }); });
    const allVols = grid.flat();
    const minVol = Math.min(...allVols);
    const maxVol = Math.max(...allVols);
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { formatter: p => `<b>${expiries[p.data[1]]} / ${strikes[p.data[0]]}%</b><br/>IV: <b>${p.data[2].toFixed(1)}%</b>` },
      grid: { top: 28, right: 80, bottom: 28, left: 48 },
      xAxis: { type: 'category', data: strikes.map(s => `${s}%`), name: 'Strike', nameLocation: 'middle', nameGap: 20, nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      yAxis: { type: 'category', data: expiries, name: 'Expiry', nameLocation: 'middle', nameGap: 32, nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 } },
      visualMap: { min: minVol, max: maxVol, calculable: true, orient: 'vertical', right: 4, top: 24, textStyle: { color: colors.textMuted, fontSize: 8 }, inRange: { color: ['#1e3a5f', '#2563eb', '#7c3aed', '#db2777', '#ef4444'] } },
      series: [{ type: 'heatmap', data, label: { show: true, fontSize: 7, color: colors.text, formatter: p => p.data[2].toFixed(1) } }],
    };
  }, [volSurfaceData, colors]);

  const skewOption = useMemo(() => {
    if (!skewHistory?.dates?.length || !skewHistory?.values?.length) return null;
    const vals = skewHistory.values.filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (!vals.length) return null;
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = Math.max(3, (hi - lo) * 0.12);
    const yMin = Math.floor(Math.min(110, lo - pad));
    const yMax = Math.ceil(Math.max(160, hi + pad));
    const n = skewHistory.dates.length;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          const p = Array.isArray(params) ? params[0] : params;
          if (!p) return '';
          return `${p.axisValue}<br/><b>${Number(p.value).toFixed(1)}</b>`;
        },
      },
      grid: { top: 10, right: 10, bottom: 22, left: 36 },
      xAxis: {
        type: 'category',
        data: skewHistory.dates,
        axisLabel: {
          color: colors.textMuted,
          fontSize: 9,
          interval: Math.max(0, Math.floor(n / 5)),
        },
      },
      yAxis: {
        type: 'value',
        min: yMin,
        max: yMax,
        scale: true,
        axisLabel: { color: colors.textMuted, fontSize: 9 },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'line',
        data: skewHistory.values,
        smooth: true,
        symbol: n <= 2 ? 'circle' : 'none',
        symbolSize: 5,
        lineStyle: { width: 1.5, color: '#f59e0b' },
        areaStyle: { color: 'rgba(245,158,11,0.12)' },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: colors.textDim },
          data: [{
            yAxis: 130,
            label: {
              position: 'insideEndTop',
              formatter: 'Neutral 130',
              fontSize: 9,
              color: colors.textMuted,
            },
          }],
        },
      }],
    };
  }, [skewHistory, colors]);

  const flowSummary = useMemo(() => {
    if (!optionsFlow?.length) return null;
    const fmtVol = (v) => {
      if (v == null || !Number.isFinite(Number(v))) return '—';
      const n = Number(v);
      if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
      return String(Math.round(n));
    };
    return optionsFlow.slice(0, 10).map((f, i) => {
      const ticker = f.ticker || f.symbol || '—';
      const isCall = f.type === 'C' || f.type === 'Call' || f.type === 'call';
      const isPut = f.type === 'P' || f.type === 'Put' || f.type === 'put';
      const cp = isCall ? 'C' : isPut ? 'P' : (f.type || '?');
      const strike = f.strike != null && Number.isFinite(Number(f.strike))
        ? Number(f.strike)
        : null;
      // OCC-style short label: SPY 450C 20Dec
      const contract = [
        ticker,
        strike != null ? `${strike % 1 === 0 ? strike.toFixed(0) : strike.toFixed(1)}${cp}` : cp,
        f.expiry || null,
      ].filter(Boolean).join(' ');
      const volOi = f.openInterest > 0 && f.volume != null
        ? f.volume / f.openInterest
        : null;
      const sentiment = f.sentiment
        || (isCall ? 'bullish' : isPut ? 'bearish' : null)
        || f.side
        || null;
      return {
        key: `${ticker}-${strike ?? ''}-${f.expiry || ''}-${cp}-${i}`,
        ticker,
        contract,
        cp,
        isCall,
        strike,
        expiry: f.expiry || null,
        volume: f.volume,
        volumeLabel: fmtVol(f.volume),
        openInterest: f.openInterest,
        oiLabel: fmtVol(f.openInterest),
        volOi,
        premium: f.premium,
        sentiment,
      };
    });
  }, [optionsFlow]);

  const termStatus = useMemo(() => {
    if (!vixTermStructure?.values?.length || vixTermStructure.values.length < 2) return null;
    const spot = vixTermStructure.values[0];
    const back = vixTermStructure.values[vixTermStructure.values.length - 1];
    const pct = Math.round(((back - spot) / spot) * 1000) / 10;
    return { spot, back, pct, isContango: spot < back };
  }, [vixTermStructure]);

  return (
    <div className="deriv-dashboard deriv-dashboard--bento">
      <BentoWrapper layout={LAYOUT} storageKey="derivatives-layout-v4">
        {/* KPI strip — full-width row 0, real bento panel. */}
        <BentoCard
          key="kpi"
          title="Derivatives Key Metrics"
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-scroll"
          source="Yahoo Finance / CBOE / FRED"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <MarketKpiStrip
            kpis={kpis || []}
            bare
            timestamp={lastUpdated}
          />
        </BentoCard>
        {/* Metrics Sidebar */}
        <BentoCard
          key="metrics"
          title="Key Metrics"
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-scroll"
          source="Yahoo Finance / CBOE"
          timestamp={lastUpdated}
          isLive={!!vixTermStructure?.values?.length}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <DerivativesSidebar
            vixTermStructure={vixTermStructure}
            vixEnrichment={vixEnrichment}
            termStatus={termStatus}
            putCallRatio={putCallRatio}
            volPremium={volPremium}
            vixPercentile={vixPercentile}
            termSpread={termSpread}
            skewIndex={skewIndex}
            gammaExposure={gammaExposure}
            lastUpdated={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchLog={fetchLog}
            error={error}
            fetchedOn={fetchedOn}
          />
        </BentoCard>

        {/* VIX Term Structure */}
        {vixOption && (
          <BentoCard
            key="vixterm"
            title="VIX Term Structure"
            accent="derivatives"
            className="deriv-bento-card"
            source="CBOE / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={!!vixTermStructure?.dates?.length}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={vixOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'VIX Term Structure', source: 'CBOE / Yahoo Finance', endpoint: '/api/derivatives', series: [], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* VIX 1 Year */}
        {fredOption && (
          <BentoCard
            key="vix1y"
            title="VIX — 1 Year"
            accent="derivatives"
            className="deriv-bento-card"
            source="FRED / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={!!fredVixHistory?.dates?.length}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={fredOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'VIX — 1 Year History', source: 'FRED', endpoint: '/api/derivatives', series: [{ id: 'VIXCLS' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* SKEW Index — always mounted so layout key stays stable */}
        <BentoCard
          key="skew"
          title="SKEW Index"
          subtitle={
            skewIndex?.value != null
              ? `${Number(skewIndex.value).toFixed(1)} · ${skewIndex.interpretation || 'CBOE tail-risk'}`
              : 'CBOE tail-risk premium'
          }
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-content skew-host"
          source="CBOE / Yahoo Finance (^SKEW)"
          timestamp={lastUpdated}
          isLive={!!skewHistory?.dates?.length || skewIndex?.value != null}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <div className="skew-panel">
            <div className="skew-kpi-row">
              <div className="skew-kpi-card">
                <span className="skew-kpi-label">Spot</span>
                <span
                  className="skew-kpi-val"
                  style={{
                    color:
                      skewIndex?.value == null
                        ? undefined
                        : skewIndex.value > 140
                          ? '#f87171'
                          : skewIndex.value > 120
                            ? '#fbbf24'
                            : '#4ade80',
                  }}
                >
                  {skewIndex?.value != null ? (
                    <MetricValue
                      value={skewIndex.value}
                      seriesKey="skew"
                      timestamp={skewIndex.asOf || lastUpdated}
                      format={(v) => Number(v).toFixed(1)}
                    />
                  ) : (
                    '—'
                  )}
                </span>
              </div>
              <div className="skew-kpi-card">
                <span className="skew-kpi-label">Regime</span>
                <span className="skew-kpi-regime">
                  {skewIndex?.interpretation || '—'}
                </span>
              </div>
              {skewHistory?.values?.length > 1 && (
                <div className="skew-kpi-card">
                  <span className="skew-kpi-label">1Y range</span>
                  <span className="skew-kpi-range">
                    {Math.min(...skewHistory.values.filter(Number.isFinite)).toFixed(0)}
                    –
                    {Math.max(...skewHistory.values.filter(Number.isFinite)).toFixed(0)}
                  </span>
                </div>
              )}
            </div>
            {skewOption ? (
              <div className="skew-chart">
                <SafeECharts
                  option={skewOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{
                    title: 'SKEW Index',
                    source: 'CBOE / Yahoo Finance',
                    endpoint: '/api/derivatives',
                    series: [{ id: '^SKEW' }],
                    updatedAt: lastUpdated,
                  }}
                />
              </div>
            ) : (
              <div className="deriv-empty">SKEW history unavailable</div>
            )}
          </div>
        </BentoCard>

        {/* Vol Surface */}
        {heatmapOption && (
          <BentoCard
            key="volsurf"
            title="Vol Surface (SPX)"
            accent="derivatives"
            className="deriv-bento-card"
            source="CBOE / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={!!volSurfaceData?.grid?.length}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Vol Surface (SPX)', source: 'CBOE / Yahoo Finance', endpoint: '/api/derivatives', series: [], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* Options Flow */}
        <BentoCard
          key="flow"
          title="Options Flow"
          subtitle="Top contracts by volume · SPY / QQQ"
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-content flow-host"
          source="CBOE / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={!!optionsFlow?.length}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          {flowSummary?.length ? (
            <div className="flow-list">
              <div className="flow-list-head">
                <span>Contract</span>
                <span className="flow-num">Vol</span>
                <span className="flow-num">OI</span>
                <span className="flow-num">Bias</span>
              </div>
              {flowSummary.map((f) => (
                <div key={f.key} className="flow-list-row">
                  <div className="flow-contract">
                    <span className="flow-contract-main">
                      <strong>{f.ticker}</strong>
                      <span className={`flow-cp-badge ${f.isCall ? 'call' : 'put'}`}>{f.cp}</span>
                      {f.strike != null && (
                        <span className="flow-strike">${f.strike % 1 === 0 ? f.strike.toFixed(0) : f.strike.toFixed(1)}</span>
                      )}
                    </span>
                    <span className="flow-contract-sub" title={f.contract}>
                      {f.expiry ? `exp ${f.expiry}` : '—'}
                      {f.premium != null ? ` · $${Number(f.premium).toFixed(2)}` : ''}
                      {f.volOi != null ? ` · vol/oi ${f.volOi.toFixed(2)}` : ''}
                    </span>
                  </div>
                  <span className="flow-num flow-vol">{f.volumeLabel}</span>
                  <span className="flow-num flow-oi">{f.oiLabel}</span>
                  <span className={`flow-bias ${f.sentiment === 'bullish' ? 'bull' : f.sentiment === 'bearish' ? 'bear' : ''}`}>
                    {f.sentiment === 'bullish' ? 'Bull' : f.sentiment === 'bearish' ? 'Bear' : f.sentiment || '—'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="deriv-empty">Options flow unavailable</div>
          )}
        </BentoCard>
      {/* Gamma Exposure */}
        {(() => {
          let gexTotal, gexCall, gexPut, gexNet;
          let hasGex = false;
          if (Array.isArray(gammaExposure) && gammaExposure.length > 0) {
            gexTotal = gammaExposure.reduce((s, g) => s + Math.abs(g.value || 0), 0);
            gexCall = gammaExposure.filter(g => g.value > 0).reduce((s, g) => s + (g.value || 0), 0);
            gexPut = gammaExposure.filter(g => g.value < 0).reduce((s, g) => s + Math.abs(g.value || 0), 0);
            gexNet = gexCall - gexPut;
            hasGex = true;
          } else if (gammaExposure && typeof gammaExposure === 'object' && gammaExposure.total != null) {
            gexTotal = gammaExposure.total;
            gexCall = gammaExposure.callGamma;
            gexPut = gammaExposure.putGamma;
            gexNet = gammaExposure.netGamma ?? (gexCall - gexPut);
            hasGex = true;
          }
          return (
            <BentoCard
              key="gamma"
              title="Gamma Exposure (GEX)"
              accent="derivatives"
              className="deriv-bento-card"
              contentClassName="deriv-panel-scroll"
              source="Yahoo Finance / SpotGamma"
              timestamp={lastUpdated}
              isLive={hasGex}
              isCurrent={isCurrent}
              fetchedOn={fetchedOn}
              fetchLog={fetchLog}
              error={error}
              disabled={!hasGex}
              emptyMessage="Gamma exposure unavailable"
            >
              {hasGex ? (
              <div className="deriv-sidebar-section" style={{ borderBottom: 'none' }}>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Total</span>
                    <span className="deriv-metric-num" style={{ color: '#60a5fa' }}>
                      <MetricValue value={gexTotal} seriesKey="gammaExposure" timestamp={lastUpdated} format={fmtGexBillions} />
                    </span>
                  </div>
                </div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name" style={{ color: '#4ade80' }}>Call GEX</span>
                    <span className="deriv-metric-num" style={{ color: '#4ade80' }}>
                      <MetricValue value={gexCall} seriesKey="gammaExposure" timestamp={lastUpdated} format={fmtGexBillions} />
                    </span>
                  </div>
                </div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name" style={{ color: '#f87171' }}>Put GEX</span>
                    <span className="deriv-metric-num" style={{ color: '#f87171' }}>
                      <MetricValue value={gexPut} seriesKey="gammaExposure" timestamp={lastUpdated} format={fmtGexBillions} />
                    </span>
                  </div>
                </div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Net GEX</span>
                    <span className="deriv-metric-num" style={{ color: gexNet >= 0 ? '#4ade80' : '#f87171' }}>
                      <MetricValue value={gexNet} seriesKey="gammaExposure" timestamp={lastUpdated} format={fmtGexBillionsSigned} />
                    </span>
                  </div>
                </div>
              </div>
              ) : null}
            </BentoCard>
          );
        })()}

        {/* Vol Premium */}
        <BentoCard
          key="volprem"
          title="Vol Premium"
          subtitle="ATM IV vs 30d realized"
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-content vp-host"
          source="CBOE / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={!!volPremium}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          {volPremium?.atm1mIV != null ? (
            <div className="vp-panel">
              <div className="vp-grid">
                <div className="vp-card">
                  <span className="vp-label">ATM 1M IV</span>
                  <span className="vp-value" style={{ color: '#a78bfa' }}>
                    <MetricValue
                      value={volPremium.atm1mIV}
                      seriesKey="atmImpliedVol"
                      timestamp={lastUpdated}
                      format={(v) => `${Number(v).toFixed(1)}%`}
                    />
                  </span>
                </div>
                <div className="vp-card">
                  <span className="vp-label">30d Realized</span>
                  <span className="vp-value">
                    <MetricValue
                      value={volPremium.realizedVol30d}
                      seriesKey="realizedVol"
                      timestamp={lastUpdated}
                      format={(v) => (v != null ? `${Number(v).toFixed(1)}%` : '—')}
                    />
                  </span>
                </div>
                <div className={`vp-card vp-card-spread ${volPremium.premium >= 0 ? 'pos' : 'neg'}`}>
                  <span className="vp-label">IV − Realized</span>
                  <span className={`vp-value ${volPremium.premium >= 0 ? 'vp-pos' : 'vp-neg'}`}>
                    {volPremium.premium != null ? (
                      <MetricValue
                        value={volPremium.premium}
                        seriesKey="volPremium"
                        timestamp={lastUpdated}
                        format={(v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(1)}%`}
                      />
                    ) : (
                      '—'
                    )}
                  </span>
                  <span className="vp-hint">
                    {volPremium.premium == null
                      ? ''
                      : volPremium.premium >= 0
                        ? 'IV rich vs realized'
                        : 'IV cheap vs realized'}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="deriv-empty">Vol premium unavailable</div>
          )}
        </BentoCard>

        <BentoCard
          key="cftc-tff"
          title="CFTC Financial Futures Positioning"
          subtitle="Traders in Financial Futures · non-commercial"
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-content cftc-host"
          source="CFTC Traders in Financial Futures"
          timestamp={cftcTFFCtx?.lastUpdated || lastUpdated}
          isLive={!!cftcTFFCtx?.data?.contracts}
          isCurrent={cftcTFFCtx?.isCurrent ?? isCurrent}
          fetchedOn={cftcTFFCtx?.fetchedOn || fetchedOn}
          fetchLog={cftcTFFCtx?.fetchLog || fetchLog}
          error={cftcTFFCtx?.error || error}
        >
          {(() => {
            const rows = Object.entries(cftcTFFCtx?.data?.contracts || {})
              .filter(([, v]) => v?.series?.length)
              .map(([key, contract]) => {
                const latest = contract.series[0] || {};
                const net = (latest.nonCommLong || 0) - (latest.nonCommShort || 0);
                return {
                  key,
                  name: contract.name || key,
                  net,
                  long: latest.nonCommLong ?? null,
                  short: latest.nonCommShort ?? null,
                  oi: latest.openInterest ?? null,
                  date: latest.date ? String(latest.date).slice(0, 10) : null,
                };
              });
            if (!rows.length) {
              return <div className="deriv-empty">CFTC TFF data unavailable</div>;
            }
            const fmt = (n) =>
              n == null || !Number.isFinite(Number(n))
                ? '—'
                : Number(n).toLocaleString('en-US');
            return (
              <div className="cftc-panel">
                <div
                  className="cftc-grid"
                  style={{
                    // Fill available width without empty ghost columns
                    gridTemplateColumns:
                      rows.length === 1
                        ? '1fr'
                        : rows.length === 2
                          ? 'repeat(2, minmax(0, 1fr))'
                          : rows.length === 3
                            ? 'repeat(3, minmax(0, 1fr))'
                            : 'repeat(auto-fit, minmax(140px, 1fr))',
                  }}
                >
                  {rows.map((r) => (
                    <div key={r.key} className={`cftc-card ${r.net >= 0 ? 'long' : 'short'}`}>
                      <div className="cftc-card-head">
                        <span className="cftc-name" title={r.name}>{r.name}</span>
                        {r.date && <span className="cftc-date">{r.date}</span>}
                      </div>
                      <div className={`cftc-net ${r.net >= 0 ? 'pos' : 'neg'}`}>
                        {r.net > 0 ? '+' : ''}{fmt(r.net)}
                      </div>
                      <div className="cftc-net-label">Net non-commercial</div>
                      <div className="cftc-stats">
                        <div className="cftc-stat">
                          <span className="cftc-stat-l">Long</span>
                          <span className="cftc-stat-v pos">{fmt(r.long)}</span>
                        </div>
                        <div className="cftc-stat">
                          <span className="cftc-stat-l">Short</span>
                          <span className="cftc-stat-v neg">{fmt(r.short)}</span>
                        </div>
                        <div className="cftc-stat">
                          <span className="cftc-stat-l">OI</span>
                          <span className="cftc-stat-v">{fmt(r.oi)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </BentoCard>

        <BentoCard
          key="bis-otc"
          title="BIS OTC Derivatives - Global Notional Outstanding"
          subtitle="USD trillions · semi-annual · BIS WS_OTC_DERIV2"
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-content bis-host"
          source="BIS WS_OTC_DERIV2"
          timestamp={bisOTCCtx?.lastUpdated || lastUpdated}
          isLive={!!(bisOTCCtx?.data?.categories && Object.keys(bisOTCCtx.data.categories).some((k) => bisOTCCtx.data.categories[k]?.series?.length))}
          isCurrent={bisOTCCtx?.isCurrent ?? isCurrent}
          fetchedOn={bisOTCCtx?.fetchedOn || fetchedOn}
          fetchLog={bisOTCCtx?.fetchLog || fetchLog}
          error={bisOTCCtx?.error || error}
        >
          {(() => {
            const cats = bisOTCCtx?.data?.categories || {};
            const order = ['total', 'ir', 'fx', 'equity', 'commodity', 'cds'];
            const rows = Object.entries(cats)
              .filter(([, v]) => v?.series?.length)
              .map(([key, cat]) => {
                const series = cat.series || [];
                const latest = series[series.length - 1];
                const prev = series.length > 1 ? series[series.length - 2] : null;
                const delta =
                  latest?.value != null && prev?.value
                    ? ((latest.value / prev.value) - 1) * 100
                    : null;
                const trillions =
                  latest?.value != null && Number.isFinite(Number(latest.value))
                    ? Number(latest.value) / 1e6
                    : null;
                return {
                  key,
                  label: cat.label || cat.name || key,
                  trillions,
                  period: latest?.period || null,
                  delta,
                  isTotal: key === 'total',
                };
              })
              .sort((a, b) => {
                const ia = order.indexOf(a.key);
                const ib = order.indexOf(b.key);
                return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
              });

            if (!rows.length) {
              return <div className="deriv-empty">BIS OTC data unavailable</div>;
            }

            const total = rows.find((r) => r.isTotal) || null;
            const rest = rows.filter((r) => !r.isTotal);
            const fmtT = (v) => {
              if (v == null || !Number.isFinite(v)) return '—';
              return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'T';
            };
            const fmtDelta = (d) => {
              if (d == null || !Number.isFinite(d)) return null;
              return (d >= 0 ? '+' : '') + d.toFixed(1) + '%';
            };

            return (
              <div className="bis-panel" data-panel-bound="1" data-panel-live="1">
                {total && (
                  <div className="bis-total-card">
                    <div className="bis-total-left">
                      <span className="bis-kicker">Total outstanding</span>
                      <span className="bis-total-val">
                        <MetricValue
                          value={total.trillions}
                          seriesKey="bisOTC_Total"
                          timestamp={total.period}
                          format={(v) => fmtT(v)}
                        />
                      </span>
                    </div>
                    <div className="bis-total-right">
                      {total.period && <span className="bis-period">{total.period}</span>}
                      {fmtDelta(total.delta) && (
                        <span className={'bis-delta ' + (total.delta >= 0 ? 'pos' : 'neg')}>
                          {fmtDelta(total.delta)} vs prior
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="bis-grid">
                  {(total ? rest : rows).map((r) => (
                    <div key={r.key} className="bis-card">
                      <span className="bis-card-label" title={r.label}>{r.label}</span>
                      <span className="bis-card-val">
                        <MetricValue
                          value={r.trillions}
                          seriesKey={`bisOTC_${r.key === 'fx' ? 'FX' : r.key === 'ir' ? 'IR' : r.key === 'equity' ? 'Equity' : r.key === 'cds' ? 'CDS' : r.key}`}
                          timestamp={r.period}
                          format={(v) => fmtT(v)}
                        />
                      </span>
                      <div className="bis-card-meta">
                        <span>{r.period || ''}</span>
                        {fmtDelta(r.delta) && (
                          <span className={'bis-delta ' + (r.delta >= 0 ? 'pos' : 'neg')}>
                            {fmtDelta(r.delta)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </BentoCard>
        <BentoCard
          key="ecb-derivatives"
          title="ECB Financial Market Data"
          subtitle="Policy · €STR · EURIBOR · M3 · HICP · history"
          accent="derivatives"
          className="deriv-bento-card"
          contentClassName="deriv-panel-content ecb-fm-host"
          source="ECB Statistical Data Warehouse"
          timestamp={ecbCtx?.lastUpdated || lastUpdated}
          isLive={!!ecbCtx?.data?.policyRates || !!ecbCtx?.data?.moneyMarket}
          isCurrent={ecbCtx?.isCurrent ?? isCurrent}
          fetchedOn={ecbCtx?.fetchedOn || fetchedOn}
          fetchLog={ecbCtx?.fetchLog || fetchLog}
          error={ecbCtx?.error || error}
        >
          <EcbDerivativesPanel />
        </BentoCard>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(DerivativesDashboard);