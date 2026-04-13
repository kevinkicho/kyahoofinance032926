import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';
import './DerivativesDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'metrics', x: 0, y: 0, w: 3, h: 5 },
    { i: 'vixterm', x: 3, y: 0, w: 3, h: 3 },
    { i: 'vix1y',   x: 6, y: 0, w: 3, h: 3 },
    { i: 'skew',    x: 9, y: 0, w: 3, h: 3 },
    { i: 'volsurf',  x: 3, y: 3, w: 6, h: 3 },
    { i: 'flow',    x: 9, y: 3, w: 3, h: 3 },
  ]
};

function DerivativesDashboard({
  volSurfaceData, vixTermStructure, optionsFlow, vixEnrichment,
  volPremium, fredVixHistory, putCallRatio, skewIndex, skewHistory,
  gammaExposure, vixPercentile, termSpread, fetchLog, isLive, lastUpdated,
}) {
  const { colors } = useTheme();

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
    if (!vixTermStructure?.values?.length >= 2) return null;
    const spot = vixTermStructure.values[0];
    const back = vixTermStructure.values[vixTermStructure.values.length - 1];
    const pct = Math.round(((back - spot) / spot) * 1000) / 10;
    return { spot, back, pct, isContango: spot < back };
  }, [vixTermStructure]);

  return (
    <div className="deriv-dashboard deriv-dashboard--bento">
      <BentoWrapper layout={LAYOUT} storageKey="derivatives-layout">
        {/* Metrics Sidebar */}
        <div key="metrics" className="deriv-bento-card">
          <div className="deriv-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content deriv-panel-scroll" onMouseDown={stopDrag}>
            <div className="deriv-sidebar-section">
              <div className="deriv-sidebar-title">VIX</div>
              <div className="deriv-metric-card">
                <div className="deriv-metric-label">Spot</div>
                <div className="deriv-metric-value" style={{ color: vixTermStructure?.values?.[0] > 25 ? '#f87171' : vixTermStructure?.values?.[0] > 18 ? '#fbbf24' : '#4ade80' }}>
                  {vixTermStructure?.values?.[0]?.toFixed(1) || '—'}
                </div>
              </div>
              {termStatus && (
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">{termStatus.isContango ? 'Contango' : 'Backwardation'}</span>
                    <span className="deriv-metric-num" style={{ color: termStatus.isContango ? '#4ade80' : '#f87171' }}>
                      {termStatus.pct >= 0 ? '+' : ''}{termStatus.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
              {vixEnrichment?.vvix != null && (
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">VVIX</span>
                    <span className="deriv-metric-num" style={{ color: '#a78bfa' }}>{vixEnrichment.vvix.toFixed(1)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="deriv-sidebar-section">
              <div className="deriv-sidebar-title">Volatility</div>
              {putCallRatio != null && (
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Put/Call</span>
                    <span className="deriv-metric-num" style={{ color: putCallRatio > 1.0 ? '#f87171' : putCallRatio < 0.7 ? '#4ade80' : '#fbbf24' }}>
                      {putCallRatio.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              {volPremium?.atm1mIV != null && (
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">ATM 1M IV</span>
                    <span className="deriv-metric-num" style={{ color: '#60a5fa' }}>{volPremium.atm1mIV.toFixed(1)}%</span>
                  </div>
                </div>
              )}
              {vixPercentile != null && (
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">VIX %ile</span>
                    <span className="deriv-metric-num">{vixPercentile.toFixed(0)}%</span>
                  </div>
                </div>
              )}
            </div>

            {typeof termSpread === 'number' && (
              <div className="deriv-sidebar-section">
                <div className="deriv-sidebar-title">Term Structure</div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Term Spread</span>
                    <span className="deriv-metric-num" style={{ color: termSpread > 0 ? '#4ade80' : '#f87171' }}>
                      {termSpread >= 0 ? '+' : ''}{termSpread.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {skewIndex?.value != null && (
              <div className="deriv-sidebar-section">
                <div className="deriv-sidebar-title">SKEW</div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Index</span>
                    <span className="deriv-metric-num" style={{ color: skewIndex.value > 140 ? '#f87171' : skewIndex.value > 120 ? '#fbbf24' : '#4ade80' }}>
                      {skewIndex.value.toFixed(1)}
                    </span>
                  </div>
                  {skewIndex.interpretation && (
                    <div className="deriv-metric-label" style={{ fontSize: 10, marginTop: 4 }}>
                      {skewIndex.interpretation}
                    </div>
                  )}
                </div>
              </div>
            )}

            {gammaExposure?.total != null && (
              <div className="deriv-sidebar-section">
                <div className="deriv-sidebar-title">Gamma (GEX)</div>
                <div className="deriv-metric-card">
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Total</span>
                    <span className="deriv-metric-num" style={{ color: '#60a5fa' }}>
                      ${gammaExposure.total.toFixed(1)}B
                    </span>
                  </div>
                  <div className="deriv-metric-row">
                    <span className="deriv-metric-name">Net</span>
                    <span className="deriv-metric-num" style={{ color: gammaExposure.netGamma >= 0 ? '#4ade80' : '#f87171' }}>
                      {gammaExposure.netGamma >= 0 ? '+' : ''}{gammaExposure.netGamma.toFixed(1)}B
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DataFooter source="Yahoo Finance / CBOE" timestamp={lastUpdated} isLive={!!vixTermStructure?.values?.length} fetchLog={fetchLog} />
        </div>

        {/* VIX Term Structure */}
        {vixOption && (
          <div key="vixterm" className="deriv-bento-card">
            <div className="deriv-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">VIX Term Structure</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={vixOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="CBOE / Yahoo Finance" timestamp={lastUpdated} isLive={!!vixTermStructure?.dates?.length} fetchLog={fetchLog} />
          </div>
        )}

        {/* VIX 1 Year */}
        {fredOption && (
          <div key="vix1y" className="deriv-bento-card">
            <div className="deriv-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">VIX — 1 Year</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={fredOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={!!fredVixHistory?.dates?.length} fetchLog={fetchLog} />
          </div>
        )}

        {/* SKEW Index */}
        {skewOption && (
          <div key="skew" className="deriv-bento-card">
            <div className="deriv-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">SKEW Index</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={skewOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="CBOE / Yahoo Finance" timestamp={lastUpdated} isLive={!!skewHistory?.dates?.length} fetchLog={fetchLog} />
          </div>
        )}

        {/* Vol Surface */}
        {heatmapOption && (
          <div key="volsurf" className="deriv-bento-card">
            <div className="deriv-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Vol Surface (SPX)</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={heatmapOption} style={{ height: '100%', width: '100%' }} />
            </div>
            <DataFooter source="CBOE / Yahoo Finance" timestamp={lastUpdated} isLive={!!volSurfaceData?.grid?.length} fetchLog={fetchLog} />
          </div>
        )}

        {/* Options Flow */}
        {flowSummary && (
          <div key="flow" className="deriv-bento-card">
            <div className="deriv-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Options Flow</span>
            </div>
            <div className="bento-panel-content deriv-panel-scroll" onMouseDown={stopDrag}>
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
            </div>
            <DataFooter source="CBOE / Yahoo Finance" timestamp={lastUpdated} isLive={!!optionsFlow?.length} fetchLog={fetchLog} />
          </div>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(DerivativesDashboard);