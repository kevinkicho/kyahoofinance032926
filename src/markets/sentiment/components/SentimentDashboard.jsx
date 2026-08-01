import React, { useCallback, useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import EmptyPanelBody from '../../../components/BentoCard/EmptyPanelBody';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import CftcPositioning from './CftcPositioning';
import RiskDashboard from './RiskDashboard';
import SentimentSidebar from './SentimentSidebar';
import './SentimentDashboard.css';

const LAYOUT = {
  lg: [
    { i: 'sidebar', x: 0, y: 0, w: 3, h: 6 },
    { i: 'key-metrics', x: 3, y: 0, w: 3, h: 6 },
    { i: 'fear-greed', x: 6, y: 0, w: 3, h: 6 },
    { i: 'fsi', x: 9, y: 0, w: 3, h: 3 },
    { i: 'cftc', x: 9, y: 3, w: 3, h: 3 },
    { i: 'risk-dashboard', x: 0, y: 6, w: 12, h: 5 },
    { i: 'leverage', x: 0, y: 11, w: 12, h: 2 },
    // SF Fed Daily News Sentiment Index — full-width below.
    { i: 'news-sentiment', x: 0, y: 13, w: 12, h: 3 },
    { i: 'fed-risk-mood', x: 0, y: 16, w: 12, h: 3 },
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
  newsSentimentCtx,
  fetchLog,
  isLive,
  lastUpdated,
  error,
  fetchedOn,
  isCurrent,
}) {
  const newsSentimentData = newsSentimentCtx?.data;
  const { colors } = useTheme();

  const fgiValue = fearGreedData?.value ?? fearGreedData?.score ?? fearGreedData?.altmeScore ?? null;
  const fgiLabel = fearGreedData?.classification ?? fearGreedData?.label
    ?? (fgiValue == null ? null
      : fgiValue <= 25 ? 'Extreme Fear'
      : fgiValue <= 45 ? 'Fear'
      : fgiValue <= 55 ? 'Neutral'
      : fgiValue <= 75 ? 'Greed'
      : 'Extreme Greed');

  // Merge server F&G indicators with riskData so the component table stays
  // dense even on older caches that only shipped 5 sparse rows.
  const fgiIndicators = useMemo(() => {
    const base = Array.isArray(fearGreedData?.indicators) ? [...fearGreedData.indicators] : [];
    const byName = new Map(base.map(ind => [ind.name, ind]));
    const n = (...vals) => {
      for (const v of vals) {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
      }
      return null;
    };
    const sig = (name) => riskData?.signals?.find(s => s?.name === name);
    const ensure = (row) => {
      if (row.value == null) return;
      const existing = byName.get(row.name);
      if (!existing) {
        byName.set(row.name, row);
        return;
      }
      // Fill missing display/percentile on legacy rows
      if (existing.value == null && row.value != null) existing.value = row.value;
      if (!existing.display && row.display) existing.display = row.display;
      if (existing.percentile == null && row.percentile != null) existing.percentile = row.percentile;
      if (!existing.description && row.description) existing.description = row.description;
      if (existing.weight == null && row.weight != null) existing.weight = row.weight;
      if ((!existing.unit || existing.unit === '%') && row.unit) existing.unit = row.unit;
    };

    const vix = n(riskData?.vix, sig('VIX')?.value);
    const vvix = n(riskData?.vvix, sig('VVIX')?.value);
    const move = n(riskData?.move, sig('MOVE')?.value);
    const skew = n(riskData?.skew, sig('SKEW')?.value);
    const vix3m = n(riskData?.vix3m);
    let hy = n(riskData?.hyOas, sig('HY Credit Spread')?.value);
    let ig = n(riskData?.igOas, sig('IG Credit Spread')?.value);
    if (hy != null && hy < 30) hy = Math.round(hy * 100);
    if (ig != null && ig < 20) ig = Math.round(ig * 100);
    const yc = n(riskData?.yieldCurve, sig('Yield Curve')?.value);
    const fsi = n(riskData?.fsi, sig('Financial Stress')?.value, fsiHistory?.values?.at?.(-1));
    const gold = n(riskData?.goldVsUsd, sig('Gold vs USD')?.value);
    const em = n(riskData?.emVsUs, sig('EM vs US Equities')?.value);
    const term = vix != null && vix3m != null ? Math.round((vix3m - vix) * 10) / 10 : null;

    ensure({ name: 'VIX Level', value: vix, display: vix != null ? vix.toFixed(1) : null, unit: 'level', signal: sig('VIX')?.signal || 'neutral', percentile: riskData?.vixPercentile ?? null, weight: 0.25, description: 'Equity implied vol' });
    ensure({ name: 'VIX 3M', value: vix3m, display: vix3m != null ? vix3m.toFixed(1) : null, unit: 'level', signal: 'neutral', description: '3-month equity vol' });
    ensure({ name: 'Vol Term (3M−1M)', value: term, display: term != null ? `${term >= 0 ? '+' : ''}${term.toFixed(1)}` : null, unit: 'level', signal: term != null && term < 0 ? 'fear' : 'greed', description: term != null && term < 0 ? 'Backwardation' : 'Contango' });
    ensure({ name: 'VVIX', value: vvix != null && vvix > 40 ? vvix : null, display: vvix != null && vvix > 40 ? vvix.toFixed(1) : null, unit: 'level', signal: sig('VVIX')?.signal || 'neutral', description: 'Vol-of-vol' });
    ensure({ name: 'MOVE', value: move, display: move != null ? move.toFixed(1) : null, unit: 'level', signal: sig('MOVE')?.signal || 'neutral', description: 'Treasury bond vol' });
    ensure({ name: 'SKEW', value: skew, display: skew != null ? skew.toFixed(1) : null, unit: 'level', signal: sig('SKEW')?.signal || 'neutral', description: 'Tail-risk premium' });
    ensure({ name: 'HY OAS', value: hy, display: hy != null ? `${Math.round(hy)} bps` : null, unit: 'bps', signal: sig('HY Credit Spread')?.signal || 'neutral', percentile: riskData?.hyPercentile ?? null, weight: 0.20, description: 'High-yield credit stress' });
    // Upgrade legacy "HY Spread" row units
    const legacyHy = byName.get('HY Spread');
    if (legacyHy && hy != null) {
      legacyHy.value = hy;
      legacyHy.display = `${Math.round(hy)} bps`;
      legacyHy.unit = 'bps';
      legacyHy.name = 'HY OAS';
      byName.delete('HY Spread');
      byName.set('HY OAS', legacyHy);
    }
    ensure({ name: 'IG OAS', value: ig, display: ig != null ? `${Math.round(ig)} bps` : null, unit: 'bps', signal: sig('IG Credit Spread')?.signal || 'neutral', description: 'Investment-grade credit' });
    ensure({ name: 'Yield Curve 10Y−2Y', value: yc, display: yc != null ? `${yc.toFixed(2)}%` : null, unit: 'pp', signal: sig('Yield Curve')?.signal || 'neutral', weight: 0.10, description: 'Growth / recession signal' });
    ensure({ name: 'Gold vs USD 1M', value: gold, display: gold != null ? `${gold >= 0 ? '+' : ''}${gold.toFixed(1)}%` : null, unit: 'pct', signal: sig('Gold vs USD')?.signal || 'neutral', description: 'Safe-haven demand' });
    ensure({ name: 'EM vs US 1M', value: em, display: em != null ? `${em >= 0 ? '+' : ''}${em.toFixed(1)}%` : null, unit: 'pct', signal: sig('EM vs US Equities')?.signal || 'neutral', description: 'Global risk appetite' });
    ensure({ name: 'STLFSI', value: fsi, display: fsi != null ? fsi.toFixed(2) : null, unit: 'idx', signal: sig('Financial Stress')?.signal || 'neutral', description: 'St. Louis financial stress' });

    return [...byName.values()].filter(ind => ind.value != null);
  }, [fearGreedData, riskData, fsiHistory]);

  // Volatility strip for Key Metrics — prefer flat riskData fields (server
  // enrichment), then signals[], then history series fallbacks.
  const volMetrics = useMemo(() => {
    const sig = (name) => riskData?.signals?.find(s => s?.name === name)?.value;
    const n = (...vals) => {
      for (const v of vals) {
        if (typeof v === 'number' && Number.isFinite(v)) return v;
        if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
      }
      return null;
    };
    const vix = n(riskData?.vix, sig('VIX'));
    const vvix = n(riskData?.vvix, sig('VVIX'), vvixHistory?.values?.at?.(-1));
    const vix3m = n(riskData?.vix3m, sig('VIX3M'));
    // FRED VXVCLS history is 3M vol (not true VVIX); surface as fallback for VIX3M only
    const fredVxv = n(vvixHistory?.values?.at?.(-1));
    const move = n(riskData?.move, sig('MOVE'));
    const skew = n(riskData?.skew, sig('SKEW'));
    const fsi = n(riskData?.fsi, sig('Financial Stress'), fsiHistory?.values?.at?.(-1));
    const term = (vix != null && vix3m != null) ? Math.round((vix3m - vix) * 10) / 10
      : (vix != null && fredVxv != null && (vvix == null || Math.abs(fredVxv - (vvix || 0)) > 20)
        ? Math.round((fredVxv - vix) * 10) / 10
        : null);
    const vixPctile = n(riskData?.vixPercentile);

    const rows = [
      {
        key: 'vix',
        label: 'VIX',
        value: vix,
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: vix == null ? undefined : vix > 25 ? '#f87171' : vix > 18 ? '#fbbf24' : '#22c55e',
        sub: vixPctile != null ? `${vixPctile}th %ile` : 'spot vol',
      },
      {
        key: 'vix3m',
        label: 'VIX 3M',
        value: vix3m ?? (fredVxv != null && (vvix == null || fredVxv < 50) ? fredVxv : null),
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: undefined,
        sub: '3-month',
      },
      {
        key: 'term',
        label: 'Term (3M−1M)',
        value: term,
        seriesKey: 'vix',
        format: v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}`,
        color: term == null ? undefined : term < 0 ? '#f87171' : '#22c55e',
        sub: term != null ? (term < 0 ? 'backwardation' : 'contango') : null,
      },
      {
        key: 'vvix',
        label: 'VVIX',
        value: vvix != null && vvix > 40 ? vvix : null, // real VVIX is typically 80–140
        seriesKey: 'vvix',
        format: v => v.toFixed(1),
        color: vvix == null ? undefined : vvix > 120 ? '#f87171' : vvix > 90 ? '#fbbf24' : '#22c55e',
        sub: 'vol-of-vol',
      },
      {
        key: 'move',
        label: 'MOVE',
        value: move,
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: move == null ? undefined : move > 120 ? '#f87171' : move > 80 ? '#fbbf24' : '#22c55e',
        sub: 'Treasury vol',
      },
      {
        key: 'skew',
        label: 'SKEW',
        value: skew,
        seriesKey: 'vix',
        format: v => v.toFixed(1),
        color: skew == null ? undefined : skew > 140 ? '#f87171' : '#fbbf24',
        sub: 'tail risk',
      },
      {
        key: 'fsi',
        label: 'STLFSI',
        value: fsi,
        seriesKey: 'financialStressIndex',
        format: v => v.toFixed(2),
        color: fsi == null ? undefined : fsi > 1 ? '#f87171' : fsi > 0 ? '#fbbf24' : '#22c55e',
        sub: 'fin. stress',
      },
    ].filter(r => r.value != null);

    return rows;
  }, [riskData, vvixHistory, fsiHistory]);

  const fgiSeries = useMemo(() => {
    const history = fearGreedData?.history;
    if (!history) return { dates: [], values: [] };
    // Support: [{date,value}], {dates,values}, [number,...]
    if (Array.isArray(history)) {
      if (!history.length) return { dates: [], values: [] };
      if (typeof history[0] === 'number') {
        return {
          dates: history.map((_, i) => `${i + 1}`),
          values: history.map(Number).filter((v) => Number.isFinite(v)),
        };
      }
      return {
        dates: history.map((h) => (typeof h === 'object' ? (h.date || h.t || '') : '')).filter(Boolean),
        values: history.map((h) => (typeof h === 'object' ? Number(h.value ?? h.v) : Number(h))).filter((v) => Number.isFinite(v)),
      };
    }
    if (history.dates && history.values) {
      return {
        dates: history.dates,
        values: (history.values || []).map(Number).filter((v) => Number.isFinite(v)),
      };
    }
    return { dates: [], values: [] };
  }, [fearGreedData]);

  const fgiOption = useMemo(() => {
    const { dates, values } = fgiSeries;
    if (!values?.length) return null;
    const x = dates?.length === values.length
      ? dates.map((d) => (typeof d === 'string' && d.length >= 10 ? d.slice(5) : d))
      : values.map((_, i) => `${i + 1}`);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 11 },
      },
      grid: { top: 12, right: 10, bottom: 22, left: 28, containLabel: false },
      xAxis: {
        type: 'category',
        data: x,
        axisLabel: { color: colors.textMuted, fontSize: 8, interval: Math.max(0, Math.floor(x.length / 5) - 1) },
        axisLine: { lineStyle: { color: colors.cardBg } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: colors.textMuted, fontSize: 8 },
        splitLine: { lineStyle: { color: colors.cardBg } },
      },
      series: [{
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: '#a78bfa', width: 2 },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(167,139,250,0.35)' },
              { offset: 1, color: 'rgba(167,139,250,0.02)' },
            ],
          },
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { type: 'dashed', color: colors.textDim, width: 1 },
          data: [
            { yAxis: 25, label: { formatter: 'Fear', color: colors.textMuted, fontSize: 8 } },
            { yAxis: 75, label: { formatter: 'Greed', color: colors.textMuted, fontSize: 8 } },
          ],
        },
      }],
    };
  }, [fgiSeries, colors]);

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

  const fedRiskMood = useMemo(() => {
    // STLFSI can live on fsiHistory.values, riskData.fsi, or risk signals.
    // Coerce strings (JSON/cache) so the FSI card never blanks when data exists.
    const asNum = (v) => {
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
      return null;
    };
    const fsiFromHist = asNum(fsiHistory?.values?.at?.(-1));
    const fsiFromRisk = asNum(riskData?.fsi);
    const fsiFromSig = asNum(
      riskData?.signals?.find(s => /financial stress|stlfsi|fsi/i.test(s?.name || ''))?.value,
    );
    const fsiLatest = fsiFromHist ?? fsiFromRisk ?? fsiFromSig;

    const newsLatest = asNum(newsSentimentSummary?.latest?.sentiment);
    const fgi = asNum(fgiValue);
    const riskScore = asNum(riskData?.overallScore);

    const scoreParts = [
      fgi != null ? (fgi - 50) / 2 : 0,
      riskScore != null ? (riskScore - 50) / 2 : 0,
      newsLatest != null ? newsLatest * 60 : 0,
      // Negative FSI (calm) adds to risk-on; positive stress subtracts
      fsiLatest != null ? -fsiLatest * 10 : 0,
    ];
    const composite = Math.max(-100, Math.min(100, scoreParts.reduce((s, v) => s + v, 0)));
    const label = composite >= 20 ? 'Risk-On' : composite <= -20 ? 'Risk-Off' : 'Mixed';
    const fsiRead = fsiLatest == null ? null
      : fsiLatest > 1 ? 'Elevated stress'
      : fsiLatest > 0 ? 'Above normal'
      : 'Below average · calm';
    return { fsiLatest, newsLatest, composite, label, fsiRead };
  }, [fsiHistory, newsSentimentSummary, fgiValue, riskData]);

  const renderPanel = useCallback((panelId) => {
    switch (panelId) {
      case 'sidebar':
        return (
          <SentimentSidebar
            fearGreedData={fearGreedData}
            riskData={riskData}
            marginDebt={marginDebt}
            consumerCredit={consumerCredit}
            vvixHistory={vvixHistory}
            fsiHistory={fsiHistory}
            lastUpdated={lastUpdated}
          />
        );

      case 'key-metrics':
        return (
          <>
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
              {volMetrics.length === 0 ? (
                <div className="sent-snapshot-empty">No volatility metrics loaded</div>
              ) : (
                <div className="sent-vol-list">
                  {volMetrics.map(row => (
                    <div key={row.key} className="sent-vol-row">
                      <div className="sent-vol-row-main">
                        <span className="sent-vol-label">{row.label}</span>
                        {row.sub && <span className="sent-vol-sub">{row.sub}</span>}
                      </div>
                      <span className="sent-vol-value" style={row.color ? { color: row.color } : undefined}>
                        <MetricValue
                          value={row.value}
                          seriesKey={row.seriesKey}
                          timestamp={lastUpdated}
                          format={row.format}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              )}
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
          </>
        );

      case 'fear-greed':
        return fgiValue == null && fgiIndicators.length === 0 && !fgiOption ? (
          <div className="sent-fgi-fallback">
            <div className="sent-fgi-label">Fear &amp; Greed data unavailable</div>
          </div>
        ) : (
          <div className="sent-fgi-panel">
            <div className="sent-fgi-hero">
              <div
                className="sent-fgi-score"
                style={{
                  color: fgiValue == null ? '#94a3b8'
                    : fgiValue <= 25 ? '#f87171'
                    : fgiValue <= 45 ? '#fbbf24'
                    : fgiValue <= 55 ? '#e2e8f0'
                    : fgiValue <= 75 ? '#a78bfa'
                    : '#c084fc',
                }}
              >
                <MetricValue
                  value={fgiValue}
                  seriesKey="fearGreed"
                  timestamp={lastUpdated}
                  format={(v) => (typeof v === 'number' ? Math.round(v) : '—')}
                />
              </div>
              <div className="sent-fgi-meta">
                <div className="sent-fgi-label">{fgiLabel || '—'}</div>
                <div className="sent-fgi-scale">0 Fear · 100 Greed</div>
                {fearGreedData?.altmeScore != null && (
                  <div className="sent-fgi-altme">Alt.me raw: {fearGreedData.altmeScore}</div>
                )}
                <div className="sent-fgi-altme">{fgiIndicators.length} components</div>
              </div>
            </div>

            {fgiIndicators.length > 0 && (
              <div className="sent-fgi-table-wrap">
                <table className="sent-fgi-table">
                  <thead>
                    <tr>
                      <th className="sent-fgi-th sent-fgi-th-name">Component</th>
                      <th className="sent-fgi-th">Value</th>
                      <th className="sent-fgi-th">Signal</th>
                      <th className="sent-fgi-th">%ile</th>
                      <th className="sent-fgi-th">Wgt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fgiIndicators.map((ind, i) => {
                      const sig = ind.signal || 'neutral';
                      const sigColor = sig === 'greed' || sig === 'risk-on' ? '#a78bfa'
                        : sig === 'fear' || sig === 'risk-off' ? '#f97316'
                        : '#94a3b8';
                      // Prefer server display string; fall back for legacy caches.
                      let display = ind.display;
                      if (display == null && ind.value != null && typeof ind.value === 'number') {
                        if (ind.unit === 'bps' || /OAS|HY Spread|IG Spread/i.test(ind.name || '')) {
                          const bps = ind.value < 30 && !/VIX|MOVE|SKEW|VVIX/i.test(ind.name || '')
                            ? Math.round(ind.value * 100)
                            : Math.round(ind.value);
                          display = `${bps} bps`;
                        } else if (ind.unit === 'pct' || /Momentum|vs /i.test(ind.name || '')) {
                          display = `${ind.value >= 0 ? '+' : ''}${ind.value.toFixed(1)}%`;
                        } else if (ind.unit === 'pp' || /Yield Curve/i.test(ind.name || '')) {
                          display = `${ind.value.toFixed(2)}%`;
                        } else if (ind.unit === 'score' || /Alt\.me|F&G/i.test(ind.name || '')) {
                          display = `${Math.round(ind.value)}`;
                        } else {
                          display = ind.value.toFixed(ind.value >= 10 ? 1 : 2);
                        }
                      }
                      return (
                        <tr key={ind.name || i} className="sent-fgi-tr">
                          <td className="sent-fgi-td sent-fgi-td-name">
                            <span className="sent-fgi-comp-name">{ind.name}</span>
                            {ind.description && (
                              <span className="sent-fgi-comp-desc">{ind.description}</span>
                            )}
                          </td>
                          <td className="sent-fgi-td sent-fgi-td-val" style={{ color: sigColor }}>
                            {display ?? '—'}
                          </td>
                          <td className="sent-fgi-td sent-fgi-td-sig" style={{ color: sigColor }}>
                            {sig}
                          </td>
                          <td className="sent-fgi-td sent-fgi-td-muted">
                            {ind.percentile != null ? `${ind.percentile}` : '—'}
                          </td>
                          <td className="sent-fgi-td sent-fgi-td-muted">
                            {ind.weight != null ? `${Math.round(ind.weight * 100)}%` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {fgiOption && (
              <div className="sent-fgi-chart">
                <SafeECharts
                  option={fgiOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{
                    title: 'Fear & Greed Index',
                    source: 'Alternative.me / FRED',
                    endpoint: '/api/sentiment',
                    series: [],
                    updatedAt: lastUpdated,
                  }}
                />
              </div>
            )}
          </div>
        );

      case 'fsi':
        return fsiOption
          ? <SafeECharts option={fsiOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Financial Stress Index', source: 'FRED', endpoint: '/api/sentiment', series: [{ id: 'STLFSI4' }], updatedAt: lastUpdated }} />
          : <EmptyPanelBody message="No financial stress history" />;

      case 'cross-asset':
        return returnsList.length > 0
          ? returnsList.slice(0, 8).map((r) => (
              <div key={r.asset || r.ticker || r.name} className="sent-mini-row">
                <span className="sent-mini-name">{r.asset}</span>
                <span className="sent-mini-value" style={{ color: (r.return || 0) >= 0 ? '#22c55e' : '#f87171' }}>
                  <MetricValue value={r.return || 0} seriesKey="crossAssetReturn" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                </span>
              </div>
            ))
          : <EmptyPanelBody message="No cross-asset returns" />;

      case 'cftc':
        return cftcData?.currencies?.length > 0
          ? <CftcPositioning bare cftcData={cftcData} />
          : <EmptyPanelBody message="No CFTC positioning data" />;

      case 'risk-dashboard':
        return (riskData || vvixHistory || fsiHistory)
          ? (
            <RiskDashboard
              bare
              riskData={riskData}
              marginDebt={marginDebt}
              vvixHistory={vvixHistory}
              fsiHistory={fsiHistory}
              lastUpdated={lastUpdated}
            />
          )
          : <EmptyPanelBody message="No risk dashboard data" />;

      case 'leverage':
        return (
          <div data-panel-bound="1" data-panel-live={marginDebt?.values?.length ? '1' : '0'}>
            {marginDebt?.values?.length > 0 ? (() => {
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
            })() : (
              <div className="sent-mini-row">
                <span className="sent-mini-name">Margin Debt</span>
                <span className="sent-mini-value" style={{ color: 'var(--text-muted)' }}>Loading…</span>
              </div>
            )}
            {consumerCredit?.values?.length > 0 && (() => {
              const latest = consumerCredit.values[consumerCredit.values.length - 1];
              const prev   = consumerCredit.values[consumerCredit.values.length - 2];
              const chgPct = (typeof latest === 'number' && typeof prev === 'number' && prev !== 0) ? ((latest - prev) / Math.abs(prev)) * 100 : null;
              // TOTALSL is reported in millions of dollars
              return (
                <div className="sent-mini-row">
                  <span className="sent-mini-name">Consumer Credit</span>
                  <span className="sent-mini-value">
                    <MetricValue value={latest * 1e6} seriesKey="consumerCredit" timestamp={lastUpdated} format={v => typeof v === 'number' ? `$${(v / 1e12).toFixed(2)}T` : '—'} />
                    {chgPct != null && <span style={{ marginLeft: 6, color: chgPct >= 0 ? '#22c55e' : '#f87171' }}>{chgPct >= 0 ? '+' : ''}{chgPct.toFixed(1)}%</span>}
                  </span>
                </div>
              );
            })()}
          </div>
        );

      case 'news-sentiment':
        return newsSentimentData?.series?.length > 0
          ? (newsSentimentOption
            ? <SafeECharts option={newsSentimentOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Daily News Sentiment Index', source: 'SF Fed', endpoint: '/api/fed/news-sentiment', series: [], updatedAt: newsSentimentCtx?.lastUpdated || lastUpdated }} />
            : <EmptyPanelBody message="No news sentiment chart" />)
          : <EmptyPanelBody message="No news sentiment data" />;

      case 'fed-risk-mood':
        return (
          <div className="sent-fed-mood-grid">
            {[
              {
                label: 'Composite',
                value: fedRiskMood.composite,
                color: fedRiskMood.composite >= 25 ? '#22c55e' : fedRiskMood.composite <= -25 ? '#f87171' : '#f59e0b',
                format: v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}`,
                sub: fedRiskMood.label,
              },
              {
                label: 'Fed News Tone',
                value: fedRiskMood.newsLatest,
                color: fedRiskMood.newsLatest == null ? undefined : fedRiskMood.newsLatest >= 0 ? '#22c55e' : '#f87171',
                format: v => `${v >= 0 ? '+' : ''}${v.toFixed(3)}`,
                sub: 'SF Fed daily index',
              },
              {
                label: 'Fear & Greed',
                value: typeof fgiValue === 'number' ? fgiValue : null,
                color: fgiValue == null ? undefined : fgiValue >= 60 ? '#22c55e' : fgiValue >= 40 ? '#f59e0b' : '#f87171',
                format: v => `${Math.round(v)}/100`,
                sub: fgiLabel || 'composite',
              },
              {
                label: 'Risk Score',
                value: typeof riskData?.overallScore === 'number' ? riskData.overallScore : null,
                color: riskData?.overallScore == null ? undefined : riskData.overallScore >= 60 ? '#22c55e' : riskData.overallScore >= 40 ? '#f59e0b' : '#f87171',
                format: v => `${Math.round(v)}/100`,
                sub: riskData?.overallLabel || 'cross-asset',
              },
              {
                label: 'STLFSI',
                value: fedRiskMood.fsiLatest,
                color: fedRiskMood.fsiLatest == null ? undefined : fedRiskMood.fsiLatest > 0 ? '#f87171' : '#22c55e',
                format: v => v.toFixed(2),
                sub: fedRiskMood.fsiRead || 'St. Louis Fed FSI',
                seriesKey: 'financialStressIndex',
              },
            ].map(card => (
              <div key={card.label} className="sent-fed-mood-card">
                <span className="sent-fed-mood-label">{card.label}</span>
                <strong className="sent-fed-mood-value" style={card.color ? { color: card.color } : undefined}>
                  {typeof card.value === 'number' && Number.isFinite(card.value)
                    ? (card.seriesKey
                      ? (
                        <MetricValue
                          value={card.value}
                          seriesKey={card.seriesKey}
                          timestamp={lastUpdated}
                          format={card.format}
                        />
                      )
                      : card.format(card.value))
                    : '—'}
                </strong>
                {card.sub && <span className="sent-fed-mood-sub">{card.sub}</span>}
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  }, [
    fearGreedData, riskData, marginDebt, consumerCredit, vvixHistory, fsiHistory,
    lastUpdated, fgiValue, fgiLabel, volMetrics, fgiIndicators, fgiOption, fsiOption,
    returnsList, cftcData, newsSentimentData, newsSentimentOption, newsSentimentCtx,
    fedRiskMood,
  ]);

  const panelCtx = useMemo(() => ({
    sentiment: {
      fearGreedData,
      cftcData,
      riskData,
      returnsData,
      marginDebt,
      consumerCredit,
      vvixHistory,
      fsiHistory,
      lastUpdated,
    },
    newsSentiment: newsSentimentCtx,
    __render: renderPanel,
    __live: {
      sidebar: !!isLive,
      'key-metrics': !!isLive,
      'fear-greed': !!(isLive && fgiValue != null),
      fsi: !!isLive,
      cftc: !!isLive,
      'cross-asset': !!isLive,
      'risk-dashboard': !!isLive,
      leverage: !!(marginDebt?.values?.length || consumerCredit?.values?.length),
      'news-sentiment': !!newsSentimentCtx?.isLive,
      'fed-risk-mood': !!(newsSentimentData?.series?.length || riskData),
    },
    __subtitle: {
      sidebar: 'Regime · F&G · vol · credit · leverage',
      'key-metrics': 'Regime · vol complex · leverage',
      'fear-greed': fgiValue != null ? `${fgiLabel || '—'} · ${fgiValue}/100` : 'Cross-asset composite',
      cftc: `Net speculative position as % of open interest · green = net long · red = net short${cftcData?.asOf ? ` · as of ${cftcData.asOf}` : ''}`,
      'risk-dashboard': 'Cross-asset risk-on / risk-off · VIX · credit · curve · stress',
      leverage: 'FINRA margin · consumer credit · mutual fund cash',
      'news-sentiment': newsSentimentSummary
        ? `Latest ${newsSentimentSummary.latest.sentiment > 0 ? '+' : ''}${newsSentimentSummary.latest.sentiment.toFixed(3)} (${newsSentimentSummary.latest.date}) · 30d avg ${newsSentimentSummary.avg30 > 0 ? '+' : ''}${newsSentimentSummary.avg30.toFixed(3)}`
        : 'San Francisco Fed · text-based macro sentiment from major papers',
      'fed-risk-mood': `${fedRiskMood.label} · composite ${fedRiskMood.composite >= 0 ? '+' : ''}${fedRiskMood.composite.toFixed(0)}`,
    },
    __source: {
      sidebar: 'Alternative.me / FRED / Yahoo Finance',
      'key-metrics': 'FRED / Yahoo Finance (^VIX ^VVIX ^MOVE ^SKEW)',
      'fear-greed': 'Alternative.me / FRED',
      fsi: 'FRED',
      'cross-asset': 'FRED / Yahoo Finance',
      cftc: 'CFTC',
      'risk-dashboard': 'FRED / Yahoo Finance',
      leverage: 'FRED BOGZ1FL663067003Q / TOTALSL / WDDNS',
      'news-sentiment': 'SF Fed',
      'fed-risk-mood': 'SF Fed / FRED / Yahoo Finance',
    },
    __disabled: {
      fsi: !fsiOption,
      'cross-asset': !returnsList.length,
      cftc: !(cftcData?.currencies?.length > 0),
      'risk-dashboard': !(riskData || vvixHistory || fsiHistory),
      'news-sentiment': !(newsSentimentData?.series?.length > 0),
    },
  }), [
    fearGreedData, cftcData, riskData, returnsData, marginDebt, consumerCredit,
    vvixHistory, fsiHistory, lastUpdated, newsSentimentCtx, renderPanel, isLive,
    fgiValue, fgiLabel, newsSentimentData, newsSentimentSummary, fedRiskMood,
    fsiOption, returnsList,
  ]);

  return (
    <div className="sent-dashboard sent-dashboard--bento">
      <MarketPanelGrid
        marketId="sentiment"
        layout={LAYOUT}
        storageKey="sentiment-layout-v5"
        accent="sentiment"
        ctx={panelCtx}
        provenance={{
          timestamp: lastUpdated,
          isCurrent,
          fetchedOn,
          fetchLog,
          error,
        }}
      />
    </div>
  );
}

export default React.memo(SentimentDashboard);
