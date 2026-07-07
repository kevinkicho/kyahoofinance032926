import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useMarketData } from '../../../hub/DataContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import MetricValue from '../../../components/MetricValue/MetricValue';
import DerivativesSidebar from './DerivativesSidebar';
import './DerivativesDashboard.css';

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
    { i: 'bis-otc', x: 0, y: 11, w: 12, h: 4 },
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
    if (!skewHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 12, bottom: 20, left: 40 },
      xAxis: { type: 'category', data: skewHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(skewHistory.dates.length / 5) } },
      yAxis: { type: 'value', min: 110, max: 160, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: skewHistory.values, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: '#f59e0b' }, areaStyle: { color: 'rgba(245,158,11,0.1)' }, markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: colors.textDim }, data: [{ yAxis: 130, label: { position: 'end', formatter: 'Neutral', fontSize: 9, color: colors.textMuted } }] } }],
    };
  }, [skewHistory, colors]);

  const flowSummary = useMemo(() => {
    if (!optionsFlow?.length) return null;
    return optionsFlow.slice(0, 8);
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
      <BentoWrapper layout={LAYOUT} storageKey="derivatives-layout-v3">
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
          <MarketKpiStrip kpis={kpis || []} bare />
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

        {/* SKEW Index */}
        {skewOption && (
          <BentoCard
            key="skew"
            title="SKEW Index"
            accent="derivatives"
            className="deriv-bento-card"
            source="CBOE / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={!!skewHistory?.dates?.length}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={skewOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'SKEW Index', source: 'CBOE / Yahoo Finance', endpoint: '/api/derivatives', series: [{ id: 'SKEW' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

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
        {flowSummary && (
          <BentoCard
            key="flow"
            title="Options Flow"
            accent="derivatives"
            className="deriv-bento-card"
            contentClassName="deriv-panel-scroll"
            source="CBOE / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={!!optionsFlow?.length}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <div className="deriv-mini-table" style={{ paddingTop: 0 }}>
              {flowSummary.map((f) => (
                <div key={`${f.ticker || f.symbol}-${f.strike || ''}-${f.expiry || ''}-${f.type}`} className="deriv-mini-row">
                  <span className="deriv-mini-name">{f.ticker || f.symbol}</span>
                  <span className="deriv-mini-type">{f.type}</span>
                  <span className="deriv-mini-value" style={{ color: f.side === 'BUY' ? '#4ade80' : '#f87171' }}>
                    {f.side}
                  </span>
                </div>
              ))}
            </div>
          </BentoCard>
        )}
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
          if (!hasGex) return null;
          return (
            <BentoCard
              key="gamma"
              title="Gamma Exposure (GEX)"
              accent="derivatives"
              className="deriv-bento-card"
              contentClassName="deriv-panel-scroll"
              source="Yahoo Finance / SpotGamma"
              timestamp={lastUpdated}
              isLive={true}
              isCurrent={isCurrent}
              fetchedOn={fetchedOn}
              fetchLog={fetchLog}
              error={error}
            >
              <div className="deriv-sidebar-section" style={{ borderBottom: 'none' }}>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Total</span>
                    <span className="deriv-metric-num" style={{ color: '#60a5fa' }}>
                      <MetricValue value={gexTotal} seriesKey="gammaExposure" timestamp={lastUpdated} format={v => `$${v.toFixed(1)}B`} />
                    </span>
                  </div>
                </div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name" style={{ color: '#4ade80' }}>Call GEX</span>
                    <span className="deriv-metric-num" style={{ color: '#4ade80' }}>
                      <MetricValue value={gexCall} seriesKey="gammaExposure" timestamp={lastUpdated} format={v => `$${v.toFixed(1)}B`} />
                    </span>
                  </div>
                </div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name" style={{ color: '#f87171' }}>Put GEX</span>
                    <span className="deriv-metric-num" style={{ color: '#f87171' }}>
                      <MetricValue value={gexPut} seriesKey="gammaExposure" timestamp={lastUpdated} format={v => `$${v.toFixed(1)}B`} />
                    </span>
                  </div>
                </div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Net GEX</span>
                    <span className="deriv-metric-num" style={{ color: gexNet >= 0 ? '#4ade80' : '#f87171' }}>
                      <MetricValue value={gexNet} seriesKey="gammaExposure" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}$${Math.abs(v).toFixed(1)}B`} />
                    </span>
                  </div>
                </div>
              </div>
            </BentoCard>
          );
        })()}

        {/* Vol Premium — only render the panel when we actually have data,
            so the bento doesn't stay populated with an empty placeholder. */}
        {volPremium?.atm1mIV != null && (
          <BentoCard
            key="volprem"
            title="Vol Premium"
            accent="derivatives"
            className="deriv-bento-card"
            contentClassName="deriv-panel-scroll"
            source="CBOE / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={!!volPremium}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <>
              <div className="vol-premium-row">
                <div className="vol-premium-pill">
                  <span className="vol-premium-label">ATM 1M IV</span>
                  <span className="vol-premium-value" style={{ color: '#a78bfa' }}>
                    <MetricValue value={volPremium.atm1mIV} seriesKey="atmImpliedVol" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} />
                  </span>
                </div>
                <div className="vol-premium-pill">
                  <span className="vol-premium-label">30d Realized</span>
                  <span className="vol-premium-value">
                    <MetricValue value={volPremium.realizedVol30d} seriesKey="realizedVol" timestamp={lastUpdated} format={v => `${v.toFixed(1)}%`} />
                  </span>
                </div>
              </div>
              {volPremium.premium != null && (
                <div className="vol-premium-row" style={{ marginTop: 8 }}>
                  <div className="vol-premium-pill" style={{ minWidth: '100%' }}>
                    <span className="vol-premium-label">IV − Realized Spread</span>
                    <span className={`vol-premium-value ${volPremium.premium >= 0 ? 'vol-premium-pos' : 'vol-premium-neg'}`}>
                      <MetricValue value={volPremium.premium} seriesKey="volPremium" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`} />
                    </span>
                  </div>
                </div>
              )}
            </>
          </BentoCard>
        )}

        <BentoCard key="cftc-tff" title="CFTC Financial Futures Positioning" accent="derivatives" className="deriv-bento-card" contentClassName="deriv-panel-content" source="CFTC Traders in Financial Futures" timestamp={cftcTFFCtx?.lastUpdated || lastUpdated} isLive={!!cftcTFFCtx?.data?.contracts} isCurrent={cftcTFFCtx?.isCurrent ?? isCurrent} fetchedOn={cftcTFFCtx?.fetchedOn || fetchedOn} fetchLog={cftcTFFCtx?.fetchLog || fetchLog} error={cftcTFFCtx?.error || error}>
          {cftcTFFCtx?.data?.contracts ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, height: '100%', overflow: 'auto' }}>
              {Object.entries(cftcTFFCtx.data.contracts).filter(([, v]) => v?.series?.length).map(([key, contract]) => {
                const latest = contract.series[0];
                const netNonComm = (latest.nonCommLong || 0) - (latest.nonCommShort || 0);
                return (
                  <div key={key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>{contract.name}</div>
                    <div style={{ fontSize: 11, fontVariantNumeric: 'tabular-nums' }}>
                      <div style={{ color: netNonComm > 0 ? '#22c55e' : '#f87171' }}>
                        Net NonComm: {netNonComm > 0 ? '+' : ''}{netNonComm.toLocaleString()}
                      </div>
                      <div style={{ color: colors.textMuted, fontSize: 10 }}>
                        Long {latest.nonCommLong?.toLocaleString()} · Short {latest.nonCommShort?.toLocaleString()}
                      </div>
                      <div style={{ color: colors.textMuted, fontSize: 9, marginTop: 2 }}>
                        OI: {latest.openInterest?.toLocaleString()} · {latest.date?.slice(0, 10)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="deriv-empty">CFTC TFF data unavailable</div>
          )}
        </BentoCard>

        <BentoCard key="bis-otc" title="BIS OTC Derivatives — Global Notional Outstanding" accent="derivatives" className="deriv-bento-card" contentClassName="deriv-panel-content" source="BIS OTC Derivatives Statistics" timestamp={bisOTCCtx?.lastUpdated || lastUpdated} isLive={!!bisOTCCtx?.data?.categories} isCurrent={bisOTCCtx?.isCurrent ?? isCurrent} fetchedOn={bisOTCCtx?.fetchedOn || fetchedOn} fetchLog={bisOTCCtx?.fetchLog || fetchLog} error={bisOTCCtx?.error || error}>
          {bisOTCCtx?.data?.categories ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, height: '100%', overflow: 'auto' }}>
              {Object.entries(bisOTCCtx.data.categories).filter(([, v]) => v?.series?.length).map(([key, cat]) => {
                const latest = cat.series[cat.series.length - 1];
                return (
                  <div key={key} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: colors.textPrimary, marginBottom: 4 }}>{cat.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: '#a78bfa' }}>
                      {latest?.value != null ? `$${(latest.value / 1e6).toFixed(1)}T` : '—'}
                    </div>
                    <div style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                      {latest?.period || ''}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="deriv-empty">BIS OTC data unavailable</div>
          )}
        </BentoCard>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(DerivativesDashboard);