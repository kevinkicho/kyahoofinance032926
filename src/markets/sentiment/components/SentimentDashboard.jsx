import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import BentoWrapper from '../../../components/BentoWrapper';
import SafeECharts from '../../../components/SafeECharts';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
import CftcPositioning from './CftcPositioning';
import RiskDashboard from './RiskDashboard';
import './SentimentDashboard.css';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'key-metrics', x: 0, y: 0, w: 3, h: 3 },
    { i: 'fear-greed', x: 3, y: 0, w: 3, h: 3 },
    { i: 'fsi', x: 6, y: 0, w: 3, h: 3 },
    { i: 'cross-asset', x: 9, y: 0, w: 3, h: 3 },
    { i: 'cftc', x: 0, y: 3, w: 6, h: 3 },
    { i: 'risk-dashboard', x: 6, y: 3, w: 6, h: 3 },
    { i: 'leverage', x: 0, y: 6, w: 12, h: 2 },
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
        {/* Key Metrics */}
        <div key="key-metrics" className="sent-bento-card">
          <div className="sent-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">Key Metrics</span>
          </div>
          <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
            <div className="sent-sidebar-section">
              <div className="sent-sidebar-title">Fear & Greed</div>
              {fgiValue != null && (
                <div className="sent-metric-card">
                  <div className="sent-metric-label">Current</div>
                  <div className="sent-metric-value" style={{
                    color: fgiValue < 25 ? '#ef4444' : fgiValue < 50 ? '#fbbf24' : fgiValue < 75 ? '#22c55e' : '#14b8a6'
                  }}>
                    <MetricValue value={fgiValue} seriesKey="fearGreed" timestamp={lastUpdated} format={v => v} />
                  </div>
                  {fgiLabel && <div className="sent-metric-status">{fgiLabel}</div>}
                </div>
              )}
            </div>

            <div className="sent-sidebar-section">
              <div className="sent-sidebar-title">Risk Metrics</div>
              {typeof vixValue === 'number' && (
                <div className="sent-metric-card">
                  <div className="sent-metric-row">
                    <span className="sent-metric-name">VIX</span>
                    <span className="sent-metric-num" style={{ color: vixValue > 25 ? '#f87171' : vixValue > 18 ? '#fbbf24' : '#22c55e' }}>
                      <MetricValue value={vixValue} seriesKey="vix" timestamp={lastUpdated} format={v => v.toFixed(1)} />
                    </span>
                  </div>
                </div>
              )}
              {typeof putCallRatio === 'number' && (
                <div className="sent-metric-card">
                  <div className="sent-metric-row">
                    <span className="sent-metric-name">Put/Call</span>
                    <span className="sent-metric-num" style={{ color: putCallRatio > 1.2 ? '#22c55e' : putCallRatio < 0.8 ? '#f87171' : '#fbbf24' }}>
                      <MetricValue value={putCallRatio} seriesKey="putCallRatio" timestamp={lastUpdated} format={v => v.toFixed(2)} />
                    </span>
                  </div>
                </div>
              )}
              {(() => {
                const hySignal = riskData?.signals?.find(s => s.name?.includes('HY'));
                return hySignal && typeof hySignal.value === 'number' ? (
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">HY Spread</span>
                      <span className="sent-metric-num" style={{ color: hySignal.value > 400 ? '#f87171' : '#fbbf24' }}>
                        <MetricValue value={hySignal.value} seriesKey="hyOAS" timestamp={lastUpdated} format={v => `${v.toFixed(0)} bps`} />
                      </span>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            {fsiHistory?.values?.length > 0 && (() => {
              const fsiLatest = fsiHistory.values[fsiHistory.values.length - 1];
              return typeof fsiLatest === 'number' ? (
                <div className="sent-sidebar-section">
                  <div className="sent-sidebar-title">Stress</div>
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">FSI</span>
                      <span className="sent-metric-num" style={{ color: fsiLatest > 0 ? '#f87171' : '#22c55e' }}>
                        <MetricValue value={fsiLatest} seriesKey="financialStressIndex" timestamp={lastUpdated} format={v => v.toFixed(2)} />
                      </span>
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {(marginDebt || consumerCredit) && (
              <div className="sent-sidebar-section">
                <div className="sent-sidebar-title">Leverage</div>
                {typeof marginDebt?.value === 'number' && (
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">Margin Debt</span>
                      <span className="sent-metric-num" style={{ color: '#a78bfa' }}>
                        <MetricValue value={marginDebt.value} seriesKey="marginDebt" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(0)}B`} />
                      </span>
                    </div>
                  </div>
                )}
                {typeof consumerCredit?.value === 'number' && (
                  <div className="sent-metric-card">
                    <div className="sent-metric-row">
                      <span className="sent-metric-name">Consumer Credit</span>
                      <span className="sent-metric-num" style={{ color: '#60a5fa' }}>
                        <MetricValue value={consumerCredit.value} seriesKey="consumerCredit" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(0)}B`} />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <DataFooter source="Alternative.me / FRED / Yahoo Finance" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        </div>

        {/* Fear & Greed Index */}
        {fgiOption && (
          <div key="fear-greed" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Fear & Greed Index</span>
            </div>
            <div className="sent-panel-content bento-panel-content" onMouseDown={stopDrag}>
              <SafeECharts option={fgiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fear & Greed Index', source: 'Alternative.me / FRED', endpoint: '/api/sentiment', series: [], updatedAt: lastUpdated }} />
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
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <CftcPositioning cftcData={cftcData} />
            </div>
          </div>
        )}

        {/* Risk Dashboard */}
        {(riskData || vvixHistory || fsiHistory) && (
          <div key="risk-dashboard" className="sent-bento-card">
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <RiskDashboard
                riskData={riskData}
                marginDebt={marginDebt}
                vvixHistory={vvixHistory}
                fsiHistory={fsiHistory}
              />
            </div>
          </div>
        )}

        {/* Leverage Metrics */}
        {(marginDebt || consumerCredit) && (
          <div key="leverage" className="sent-bento-card">
            <div className="sent-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Leverage Metrics</span>
            </div>
            <div className="bento-panel-content bento-panel-scroll" onMouseDown={stopDrag}>
              {marginDebt?.value != null && (
                <div className="sent-mini-row">
                  <span className="sent-mini-name">Margin Debt</span>
                  <span className="sent-mini-value"><MetricValue value={marginDebt.value} seriesKey="marginDebt" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(0)}B`} /></span>
                </div>
              )}
              {consumerCredit?.value != null && (
                <div className="sent-mini-row">
                  <span className="sent-mini-name">Consumer Credit</span>
                  <span className="sent-mini-value"><MetricValue value={consumerCredit.value} seriesKey="consumerCredit" timestamp={lastUpdated} format={v => `$${(v / 1e9).toFixed(0)}B`} /></span>
                </div>
              )}
            </div>
            <DataFooter source="FRED" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}
      </BentoWrapper>
    </div>
  );
}

export default React.memo(SentimentDashboard);