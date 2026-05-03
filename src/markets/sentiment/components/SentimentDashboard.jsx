import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import BentoWrapper from '../../../components/BentoWrapper';
import SafeECharts from '../../../components/SafeECharts';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
import CftcPositioning from './CftcPositioning';
import RiskDashboard from './RiskDashboard';
import SentimentSidebar from './SentimentSidebar';
import './SentimentDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'sidebar', x: 0, y: 0, w: 3, h: 5 },
    { i: 'key-metrics', x: 3, y: 0, w: 3, h: 3 },
    { i: 'fear-greed', x: 6, y: 0, w: 3, h: 3 },
    { i: 'fsi', x: 9, y: 0, w: 3, h: 3 },
    { i: 'cftc', x: 3, y: 3, w: 6, h: 3 },
    { i: 'risk-dashboard', x: 9, y: 3, w: 3, h: 3 },
    { i: 'leverage', x: 0, y: 5, w: 12, h: 2 },
  ]
};

function SentimentDashboard({
  fearGreedData,
  cftcData,
  riskData,
  returnsData,
  marginDebt,
  consumerCredit,
  vvixHistory,
  fsiHistory,
  fetchLog,
  isLive,
  lastUpdated,
  error,
  fetchedOn,
  isCurrent,
}) {
  const { colors } = useTheme();

  const fgiValue = fearGreedData?.value ?? fearGreedData?.score;
  const fgiLabel = fearGreedData?.classification ?? fearGreedData?.label;
  const vixValue = riskData?.vix ?? riskData?.signals?.find(s => s.name === 'VIX')?.value;
  const putCallRatio = riskData?.putCallRatio;

  const fgiOption = useMemo(() => {
    const history = fearGreedData?.history;
    if (!history?.length && !history?.dates?.length) return null;

    const dates = history?.dates || history?.map?.(h => h.date);
    const values = history?.values || history?.map?.(h => h.value);

    if (!dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 6) } },
      yAxis: { type: 'value', min: 0, max: 100, axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 2 },
        areaStyle: { color: '#a78bfa', opacity: 0.1 },
        markLine: {
          silent: true,
          lineStyle: { type: 'dashed', color: colors.textDim },
          data: [
            { yAxis: 25, label: { formatter: 'Fear', color: colors.textMuted, fontSize: 9 } },
            { yAxis: 75, label: { formatter: 'Greed', color: colors.textMuted, fontSize: 9 } },
          ],
        },
      }],
    };
  }, [fearGreedData, colors]);

  const fsiOption = useMemo(() => {
    if (!fsiHistory?.dates?.length) return null;
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 30, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: fsiHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fsiHistory.dates.length / 6) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fsiHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#14b8a6', width: 2 } }],
    };
  }, [fsiHistory, colors]);

  const returnsList = useMemo(() => {
    const assets = returnsData?.assets || returnsData;
    if (!assets?.length) return [];
    return assets.map(a => ({
      asset: a.label || a.ticker || a.asset,
      return: a.ret1d ?? a.return ?? a['1d'] ?? 0,
    }));
  }, [returnsData]);

    return (
      <div className="sent-dashboard sent-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="sentiment-layout">
          {/* Sidebar */}
          <div key="sidebar" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Market Snapshot</span>
            </div>
            <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
              <SentimentSidebar 
                fearGreedData={fearGreedData}
                riskData={riskData}
                marginDebt={marginDebt}
                consumerCredit={consumerCredit}
                lastUpdated={lastUpdated}
              />
            </div>
            <DataFooter source="Alternative.me / FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

        {/* Key Metrics */}
        <div key="key-metrics" className="sent-bento-card">
          <div className="sent-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
            <div className="sent-sidebar-section">
              <div className="sent-sidebar-title">Stress</div>
              {fsiHistory?.values?.length > 0 && (() => {
                const fsiLatest = fsiHistory.values[fsiHistory.values.length - 1];
                return typeof fsiLatest === 'number' ? (
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">FSI</span>
                      <span className="sent-metric-num" style={{ color: fsiLatest > 0 ? '#f87171' : '#22c55e' }}>
                        <MetricValue value={fsiLatest} seriesKey="financialStressIndex" timestamp={lastUpdated} format={v => v.toFixed(2)} />
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
          <DataFooter source="FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* Fear & Greed Index — show the panel even if history is empty
            (alternative.me is sometimes blocked); fall back to the score
            + sub-indicators which are computed from FRED VIX/HY/yield data. */}
        {fearGreedData && (fgiValue != null || fearGreedData.indicators?.length > 0) && (
          <div key="fear-greed" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Fear & Greed Index</span>
              <span className="sent-panel-subtitle">{fgiLabel || '—'} · score {fgiValue ?? '—'}/100</span>
            </div>
            <div className="sent-panel-content bento-panel-content" onMouseDown={stopDrag}>
              {fgiOption ? (
                <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fear & Greed Index', source: 'Alternative.me / FRED', endpoint: '/api/sentiment', series: [], updatedAt: lastUpdated }} />
              ) : (
                <div className="sent-fgi-fallback">
                  <div className="sent-fgi-score" style={{ color: fgiValue == null ? '#94a3b8' : fgiValue <= 25 ? '#f87171' : fgiValue <= 45 ? '#fbbf24' : fgiValue <= 75 ? '#a78bfa' : '#22c55e' }}>{fgiValue ?? '—'}</div>
                  <div className="sent-fgi-label">{fgiLabel || 'Indicators only — Alternative.me history unavailable'}</div>
                  {fearGreedData.indicators?.length > 0 && (
                    <div className="sent-fgi-indicators">
                      {fearGreedData.indicators.map((ind, i) => (
                        <div key={ind.name || i} className="sent-mini-row">
                          <span className="sent-mini-name">{ind.name}</span>
                          <span className="sent-mini-value" style={{ color: ind.signal === 'greed' ? '#22c55e' : ind.signal === 'fear' ? '#f87171' : '#94a3b8' }}>
                            {ind.value != null ? (typeof ind.value === 'number' ? ind.value.toFixed(2) : ind.value) : '—'}
                            {ind.percentile != null && <span style={{ marginLeft: 6, color: '#94a3b8', fontSize: 10 }}>({ind.percentile}th pct)</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <DataFooter source="Alternative.me / FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Financial Stress Index */}
        {fsiOption && (
          <div key="fsi" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Financial Stress Index</span>
            </div>
            <div className="sent-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={fsiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Financial Stress Index', source: 'FRED', endpoint: '/api/sentiment', series: [{ id: 'STLFSI4' }], updatedAt: lastUpdated }} />
            </div>
            <DataFooter source="FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Cross-Asset Returns */}
        {returnsList.length > 0 && (
          <div key="cross-asset" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Cross-Asset Returns</span>
            </div>
            <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
              {returnsList.slice(0, 8).map((r) => (
                <div key={r.asset || r.ticker || r.name} className="sent-mini-row">
                  <span className="sent-mini-name">{r.asset}</span>
                  <span className="sent-mini-value" style={{ color: (r.return || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                    <MetricValue value={r.return || 0} seriesKey="crossAssetReturn" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                  </span>
                </div>
              ))}
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* CFTC Positioning */}
        {cftcData?.currencies?.length > 0 && (
          <div key="cftc" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">CFTC Positioning</span>
              <span className="sent-panel-subtitle">
                Net speculative position as % of open interest · green = net long · red = net short
                {cftcData?.asOf && <> · as of {cftcData.asOf}</>}
              </span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <CftcPositioning bare cftcData={cftcData} />
            </div>
            <DataFooter source="CFTC" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Risk Dashboard */}
        {(riskData || vvixHistory || fsiHistory) && (
          <div key="risk-dashboard" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Risk Dashboard</span>
              <span className="sent-panel-subtitle">Cross-asset risk-on / risk-off signals · FRED + Yahoo Finance</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <RiskDashboard
                bare
                riskData={riskData}
                marginDebt={marginDebt}
                vvixHistory={vvixHistory}
                fsiHistory={fsiHistory}
              />
            </div>
            <DataFooter source="FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Leverage Metrics — server returns { dates, values } so we read
            the latest value off the values array. Server BOGZ1FL663067003Q
            (margin debt) is reported in millions; multiply by 1e6 to render
            as USD. TOTALSL (consumer credit) is in billions, stored as-is. */}
        {(marginDebt?.values?.length || consumerCredit?.values?.length) && (
          <div key="leverage" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Leverage Metrics</span>
              <span className="sent-panel-subtitle">FINRA margin · consumer credit · quarterly / monthly</span>
            </div>
            <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
              {marginDebt?.values?.length > 0 && (() => {
                const latest = marginDebt.values[marginDebt.values.length - 1];
                const prev   = marginDebt.values[marginDebt.values.length - 2];
                const chgPct = (typeof latest === 'number' && typeof prev === 'number' && prev !== 0) ? ((latest - prev) / Math.abs(prev)) * 100 : null;
                return (
                  <div className="sent-mini-row">
                    <span className="sent-mini-name">Margin Debt</span>
                    <span className="sent-mini-value">
                      <MetricValue value={latest * 1e6} seriesKey="marginDebt" timestamp={lastUpdated} format={v => typeof v === 'number' ? `$${(v / 1e9).toFixed(0)}B` : '—'} />
                      {chgPct != null && <span style={{ marginLeft: 6, color: chgPct >= 0 ? '#22c55e' : '#f87171' }}>{chgPct >= 0 ? '+' : ''}{chgPct.toFixed(1)}%</span>}
                    </span>
                  </div>
                );
              })()}
              {consumerCredit?.values?.length > 0 && (() => {
                const latest = consumerCredit.values[consumerCredit.values.length - 1];
                const prev   = consumerCredit.values[consumerCredit.values.length - 2];
                const chgPct = (typeof latest === 'number' && typeof prev === 'number' && prev !== 0) ? ((latest - prev) / Math.abs(prev)) * 100 : null;
                return (
                  <div className="sent-mini-row">
                    <span className="sent-mini-name">Consumer Credit</span>
                    <span className="sent-mini-value">
                      <MetricValue value={latest * 1e9} seriesKey="consumerCredit" timestamp={lastUpdated} format={v => typeof v === 'number' ? `$${(v / 1e9).toFixed(0)}B` : '—'} />
                      {chgPct != null && <span style={{ marginLeft: 6, color: chgPct >= 0 ? '#22c55e' : '#f87171' }}>{chgPct >= 0 ? '+' : ''}{chgPct.toFixed(1)}%</span>}
                    </span>
                  </div>
                );
              })()}
            </div>
            <DataFooter source="FRED BOGZ1FL663067003Q / TOTALSL" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}
        </BentoWrapper>
      </div>
    );
  }


export default React.memo(SentimentDashboard);