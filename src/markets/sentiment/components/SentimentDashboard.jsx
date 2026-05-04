import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import CftcPositioning from './CftcPositioning';
import RiskDashboard from './RiskDashboard';
import SentimentSidebar from './SentimentSidebar';
import './SentimentDashboard.css';

const LAYOUT = {
  lg: [
    { i: 'sidebar', x: 0, y: 0, w: 3, h: 5 },
    { i: 'key-metrics', x: 3, y: 0, w: 3, h: 3 },
    { i: 'fear-greed', x: 6, y: 0, w: 3, h: 3 },
    { i: 'fsi', x: 9, y: 0, w: 3, h: 3 },
    { i: 'cftc', x: 3, y: 3, w: 6, h: 3 },
    { i: 'risk-dashboard', x: 9, y: 3, w: 3, h: 3 },
    { i: 'leverage', x: 0, y: 5, w: 12, h: 2 },
    // SF Fed Daily News Sentiment Index — full-width line below leverage.
    { i: 'news-sentiment', x: 0, y: 7, w: 12, h: 3 },
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
  newsSentimentData,
  newsSentimentLastUpdated,
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

  // SF Fed Daily News Sentiment — area chart with the zero baseline. The
  // index runs roughly between -0.5 (very negative news flow) and +0.5
  // (very positive). 30-day moving average smooths the daily noise.
  const newsSentimentOption = useMemo(() => {
    const series = newsSentimentData?.series || [];
    if (!series.length) return null;
    const dates = series.map(p => p.date);
    const vals = series.map(p => p.sentiment);
    // Compute a trailing 30-day moving average aligned to `vals`.
    const ma = vals.map((_, i) => {
      const start = Math.max(0, i - 29);
      const window = vals.slice(start, i + 1);
      return window.reduce((s, v) => s + v, 0) / window.length;
    });
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: v => v != null ? v.toFixed(3) : '—' },
      legend: { data: ['Daily', '30d avg'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 16, bottom: 28, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(dates.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: 'Daily', type: 'line', data: vals, smooth: true, symbol: 'none', lineStyle: { color: '#94a3b8', width: 1 }, areaStyle: { color: 'rgba(148,163,184,0.08)' } },
        { name: '30d avg', type: 'line', data: ma, smooth: true, symbol: 'none', lineStyle: { color: '#22d3ee', width: 2 } },
      ],
    };
  }, [newsSentimentData, colors]);

  // Latest + 30-day-average headline numbers for the panel subtitle.
  const newsSentimentSummary = useMemo(() => {
    const series = newsSentimentData?.series;
    if (!series?.length) return null;
    const latest = series[series.length - 1];
    const last30 = series.slice(-30);
    const avg30 = last30.reduce((s, p) => s + p.sentiment, 0) / last30.length;
    return { latest, avg30 };
  }, [newsSentimentData]);

    return (
      <div className="sent-dashboard sent-dashboard--bento">
        <BentoWrapper layout={LAYOUT} storageKey="sentiment-layout">
          {/* Sidebar */}
          <BentoCard
            key="sidebar"
            title="Market Snapshot"
            accent="sentiment"
            className="sent-bento-card"
            contentClassName="bento-panel-scroll"
            source="Alternative.me / FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SentimentSidebar
              fearGreedData={fearGreedData}
              riskData={riskData}
              marginDebt={marginDebt}
              consumerCredit={consumerCredit}
              lastUpdated={lastUpdated}
            />
          </BentoCard>

        {/* Key Metrics */}
        <BentoCard
          key="key-metrics"
          title="Key Metrics"
          accent="sentiment"
          className="sent-bento-card"
          contentClassName="bento-panel-scroll"
          source="FRED"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <div className="sent-sidebar-section">
            <div className="sent-sidebar-title">Risk Regime</div>
            {typeof riskData?.overallScore === 'number' && (
              <div className="sent-metric-card">
                <div className="sent-metric-row">
                  <span className="sent-metric-name">Risk Score</span>
                  <span className="sent-metric-num" style={{ color: riskData.overallScore >= 60 ? '#22c55e' : riskData.overallScore >= 40 ? '#fbbf24' : '#f87171' }}>
                    <MetricValue value={riskData.overallScore} seriesKey="riskScore" timestamp={lastUpdated} format={v => `${v}/100`} />
                  </span>
                </div>
                {riskData.overallLabel && (
                  <div className="sent-metric-row" style={{ fontSize: 11, opacity: 0.75 }}>
                    <span className="sent-metric-name">Regime</span>
                    <span className="sent-metric-num">{riskData.overallLabel}</span>
                  </div>
                )}
              </div>
            )}
            {typeof fgiValue === 'number' && (
              <div className="sent-metric-card">
                <div className="sent-metric-row">
                  <span className="sent-metric-name">Fear &amp; Greed</span>
                  <span className="sent-metric-num" style={{ color: fgiValue >= 60 ? '#22c55e' : fgiValue >= 40 ? '#fbbf24' : '#f87171' }}>
                    <MetricValue value={fgiValue} seriesKey="fearGreed" timestamp={lastUpdated} format={v => `${v}/100`} />
                  </span>
                </div>
                {fgiLabel && (
                  <div className="sent-metric-row" style={{ fontSize: 11, opacity: 0.75 }}>
                    <span className="sent-metric-name">Sentiment</span>
                    <span className="sent-metric-num">{fgiLabel}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="sent-sidebar-section">
            <div className="sent-sidebar-title">Volatility</div>
            {vvixHistory?.values?.length > 0 && (() => {
              const last = vvixHistory.values[vvixHistory.values.length - 1];
              return typeof last === 'number' ? (
                <div className="sent-metric-card">
                  <div className="sent-metric-row">
                    <span className="sent-metric-name">VVIX</span>
                    <span className="sent-metric-num" style={{ color: last > 100 ? '#f87171' : last > 80 ? '#fbbf24' : '#22c55e' }}>
                      <MetricValue value={last} seriesKey="vvix" timestamp={lastUpdated} format={v => v.toFixed(1)} />
                    </span>
                  </div>
                </div>
              ) : null;
            })()}
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
          {marginDebt?.values?.length > 0 && (() => {
            const last = marginDebt.values[marginDebt.values.length - 1];
            const prev = marginDebt.values[marginDebt.values.length - 13]; // ~yoy from monthly
            const yoyPct = (typeof last === 'number' && typeof prev === 'number' && prev !== 0) ? ((last - prev) / prev) * 100 : null;
            return (
              <div className="sent-sidebar-section">
                <div className="sent-sidebar-title">Leverage</div>
                <div className="sent-metric-card">
                  <div className="sent-metric-row">
                    <span className="sent-metric-name">Margin Debt</span>
                    <span className="sent-metric-num">${(last / 1000).toFixed(1)}B</span>
                  </div>
                  {typeof yoyPct === 'number' && (
                    <div className="sent-metric-row" style={{ fontSize: 11, opacity: 0.75 }}>
                      <span className="sent-metric-name">YoY</span>
                      <span className="sent-metric-num" style={{ color: yoyPct > 0 ? '#22c55e' : '#f87171' }}>
                        {yoyPct > 0 ? '+' : ''}{yoyPct.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </BentoCard>

        {/* Fear & Greed Index — show the panel even if history is empty
            (alternative.me is sometimes blocked); fall back to the score
            + sub-indicators which are computed from FRED VIX/HY/yield data. */}
        {fearGreedData && (fgiValue != null || fearGreedData.indicators?.length > 0) && (
          <BentoCard
            key="fear-greed"
            title="Fear & Greed Index"
            subtitle={`${fgiLabel || '—'} · score ${fgiValue ?? '—'}/100`}
            accent="sentiment"
            className="sent-bento-card"
            contentClassName="sent-panel-content"
            source="Alternative.me / FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
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
          </BentoCard>
        )}

        {/* Financial Stress Index */}
        {fsiOption && (
          <BentoCard
            key="fsi"
            title="Financial Stress Index"
            accent="sentiment"
            className="sent-bento-card"
            contentClassName="sent-panel-content"
            source="FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <SafeECharts option={fsiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Financial Stress Index', source: 'FRED', endpoint: '/api/sentiment', series: [{ id: 'STLFSI4' }], updatedAt: lastUpdated }} />
          </BentoCard>
        )}

        {/* Cross-Asset Returns */}
        {returnsList.length > 0 && (
          <BentoCard
            key="cross-asset"
            title="Cross-Asset Returns"
            accent="sentiment"
            className="sent-bento-card"
            contentClassName="bento-panel-scroll"
            source="FRED / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {returnsList.slice(0, 8).map((r) => (
              <div key={r.asset || r.ticker || r.name} className="sent-mini-row">
                <span className="sent-mini-name">{r.asset}</span>
                <span className="sent-mini-value" style={{ color: (r.return || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                  <MetricValue value={r.return || 0} seriesKey="crossAssetReturn" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                </span>
              </div>
            ))}
          </BentoCard>
        )}

        {/* CFTC Positioning */}
        {cftcData?.currencies?.length > 0 && (
          <BentoCard
            key="cftc"
            title="CFTC Positioning"
            subtitle={`Net speculative position as % of open interest · green = net long · red = net short${cftcData?.asOf ? ` · as of ${cftcData.asOf}` : ''}`}
            accent="sentiment"
            className="sent-bento-card"
            source="CFTC"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <CftcPositioning bare cftcData={cftcData} />
          </BentoCard>
        )}

        {/* Risk Dashboard */}
        {(riskData || vvixHistory || fsiHistory) && (
          <BentoCard
            key="risk-dashboard"
            title="Risk Dashboard"
            subtitle="Cross-asset risk-on / risk-off signals · FRED + Yahoo Finance"
            accent="sentiment"
            className="sent-bento-card"
            source="FRED / Yahoo Finance"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <RiskDashboard
              bare
              riskData={riskData}
              marginDebt={marginDebt}
              vvixHistory={vvixHistory}
              fsiHistory={fsiHistory}
            />
          </BentoCard>
        )}

        {/* Leverage Metrics — server returns { dates, values } so we read
            the latest value off the values array. Server BOGZ1FL663067003Q
            (margin debt) is reported in millions; multiply by 1e6 to render
            as USD. TOTALSL (consumer credit) is in billions, stored as-is. */}
        {(marginDebt?.values?.length || consumerCredit?.values?.length) && (
          <BentoCard
            key="leverage"
            title="Leverage Metrics"
            subtitle="FINRA margin · consumer credit · quarterly / monthly"
            accent="sentiment"
            className="sent-bento-card"
            contentClassName="bento-panel-scroll"
            source="FRED BOGZ1FL663067003Q / TOTALSL"
            timestamp={lastUpdated}
            isLive={isLive}
            isCurrent={isCurrent}
            fetchedOn={fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            <>
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
            </>
          </BentoCard>
        )}

        {/* SF Fed Daily News Sentiment Index — full-year history line */}
        {newsSentimentData?.series?.length > 0 && (
          <BentoCard
            key="news-sentiment"
            title="Daily News Sentiment Index"
            subtitle={newsSentimentSummary
              ? `Latest ${newsSentimentSummary.latest.sentiment > 0 ? '+' : ''}${newsSentimentSummary.latest.sentiment.toFixed(3)} (${newsSentimentSummary.latest.date}) · 30d avg ${newsSentimentSummary.avg30 > 0 ? '+' : ''}${newsSentimentSummary.avg30.toFixed(3)}`
              : 'San Francisco Fed · text-based macro sentiment from major papers'}
            accent="sentiment"
            className="sent-bento-card"
            source="SF Fed"
            timestamp={newsSentimentLastUpdated || lastUpdated}
            isLive={!!newsSentimentData?.isLive}
            isCurrent={newsSentimentData?.isCurrent !== false}
            fetchedOn={newsSentimentData?.fetchedOn || fetchedOn}
            fetchLog={fetchLog}
            error={error}
          >
            {newsSentimentOption && <SafeECharts option={newsSentimentOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Daily News Sentiment Index', source: 'SF Fed', endpoint: '/api/fed/news-sentiment', series: [], updatedAt: newsSentimentLastUpdated || lastUpdated }} />}
          </BentoCard>
        )}
        </BentoWrapper>
      </div>
    );
  }


export default React.memo(SentimentDashboard);