import React, { useMemo, useCallback } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import CarryMap from './CarryMap';
import ReerChart from './ReerChart';
import CurrencyCorrelationMatrix from './CurrencyCorrelationMatrix';
import FXSidebar from './FXSidebar';
import ImfCoferPanel, { hasCoferRows } from './ImfCoferPanel';
import { useMarketData } from '../../../hub/DataContext';
import TreasuryTicPanel, { hasTreasuryTicRows } from './TreasuryTicPanel';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import MarketPanelGrid from '../../../panels/MarketPanelGrid';
import './FXDashboard.css';

function Sparkline({ values }) {
  if (!values || values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 0.001;
  const W = 48, H = 14;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const isUp = values[values.length - 1] >= values[0];
  return (
    <svg width={W} height={H} className="fx-spark">
      <polyline points={pts} fill="none" stroke={isUp ? '#22c55e' : '#ef4444'} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// All FX panels are real BentoWrapper children. KPI strip lives at the top
// (full width, h:2) followed by the existing 3-row grid pushed down by 2.
const LAYOUT = {
  lg: [
    { i: 'kpi',      x: 0, y: 0,  w: 12, h: 2 },
    { i: 'sidebar',  x: 0, y: 2,  w: 3,  h: 4 },
    { i: 'movers',   x: 3, y: 2,  w: 3,  h: 4 },
    { i: 'dxy',      x: 6, y: 2,  w: 3,  h: 4 },
    { i: 'reer',     x: 9, y: 2,  w: 3,  h: 4 },
    { i: 'cot',      x: 0, y: 6,  w: 4,  h: 3 },
    { i: 'corr',     x: 4, y: 6,  w: 4,  h: 3 },
    { i: 'ratediff', x: 8, y: 6,  w: 4,  h: 3 },
    { i: 'carry',    x: 0, y: 9,  w: 12, h: 5 },
    { i: 'rate-dashboard', x: 0, y: 14, w: 12, h: 2 },
    { i: 'imf-cofer', x: 0, y: 16, w: 4, h: 4 },
    { i: 'treasury-tic', x: 4, y: 16, w: 4, h: 4 },
  ]
};

// G10 basket used to compute the KPI panel's average (mirrored from the
// old loose <KpiStrip> in FXMarket.jsx).
const G10 = ['EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'SEK', 'NOK', 'NZD'];

// Series keys for MetricValue popovers — match entries in MetricValue.jsx.
const FX_KPI_SERIES = {
  'EUR/USD': 'fxEUR',
  'USD/JPY': 'fxJPY',
  'GBP/USD': 'fxGBP',
  'USD/CHF': 'fxCHF',
  'DXY':     'dxy',
};


function FXDashboard({
  spotRates, changes, changes1w, changes1m, sparklines,
  history, reer, rateDifferentials, dxyHistory, cotData, cotHistory,
  isLive, isUsingFallbackRates, lastUpdated, fetchLog, error, fetchedOn, isCurrent,
}) {
  const fxCtx = useMarketData('fx');
  const imfCtx = useMarketData('imf');
  const hasCofer = hasCoferRows(fxCtx?.data?.imfReserves, imfCtx?.data?.cofer);
  const ticCtx = useMarketData('treasuryTIC');
  const hasTicHoldings = hasTreasuryTicRows(ticCtx?.data?.latest);
  // Top-of-grid KPI metrics. Each pill is clickable (MetricValue popover
  // exposes the FRED ID + source). Values are formatted to 4 decimals for
  // FX rates and 2 decimals for DXY / G10 average.
  const kpiItems = useMemo(() => {
    const g10Avg = G10.filter(c => changes?.[c] != null).reduce((s, c) => s + (changes?.[c] || 0), 0) / (G10.length || 1);
    // Guard against non-numeric input — `format` is invoked with the
    // pre-rendered string ('—') when data is missing.
    const fmt4 = v => typeof v === 'number' ? v.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 }) : '—';
    const fmt2 = v => typeof v === 'number' ? v.toFixed(2) : '—';
    const fmtPct = v => typeof v === 'number' ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : null;
    const dxyVal = dxyHistory?.values?.slice(-1)[0];
    return [
      { label: 'EUR/USD', rawValue: spotRates?.EUR ? 1 / spotRates.EUR : null, value: fmt4(spotRates?.EUR ? 1 / spotRates.EUR : null), format: fmt4, seriesKey: FX_KPI_SERIES['EUR/USD'], trend: fmtPct(changes?.EUR) },
      { label: 'USD/JPY', rawValue: spotRates?.JPY,                            value: fmt2(spotRates?.JPY),                             format: fmt2, seriesKey: FX_KPI_SERIES['USD/JPY'], trend: fmtPct(changes?.JPY) },
      { label: 'GBP/USD', rawValue: spotRates?.GBP ? 1 / spotRates.GBP : null, value: fmt4(spotRates?.GBP ? 1 / spotRates.GBP : null), format: fmt4, seriesKey: FX_KPI_SERIES['GBP/USD'], trend: fmtPct(changes?.GBP) },
      { label: 'USD/CHF', rawValue: spotRates?.CHF,                            value: fmt4(spotRates?.CHF),                             format: fmt4, seriesKey: FX_KPI_SERIES['USD/CHF'], trend: fmtPct(changes?.CHF) },
      { label: 'DXY',     rawValue: dxyVal,                                    value: fmt2(dxyVal),                                     format: fmt2, seriesKey: FX_KPI_SERIES['DXY'],     sublabel: 'Dollar Index' },
      { label: 'G10 Avg', rawValue: g10Avg,                                    value: fmt2(g10Avg),                                     format: fmt2, sublabel: 'avg %' },
    ];
  }, [spotRates, changes, dxyHistory]);

  // rateDifferentials is the full object from FX endpoint:
  // { fed, ecb, boe, boj, usFed_ecb, usFed_boe, usFed_boj }
  const { colors } = useTheme();

  const movers = useMemo(() => {
    return Object.entries(changes || {})
      .filter(([c]) => c !== 'USD')
      .map(([code, changePct]) => ({
        code, changePct,
        change1w: changes1w?.[code],
        change1m: changes1m?.[code],
        spark: sparklines?.[code],
        cotPct: cotData?.[code],
      }))
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 12);
  }, [changes, changes1w, changes1m, sparklines, cotData]);

  const rateDiff = useMemo(() => {
    if (!rateDifferentials) return null;
    return Object.entries(rateDifferentials).filter(([, v]) => v != null).slice(0, 8);
  }, [rateDifferentials]);

  const rateDiffRows = useMemo(() => {
    if (!rateDifferentials) return [];
    const policyMap = [
      { code: 'EUR', diff: rateDifferentials.usFed_ecb, cb: rateDifferentials.ecb, cbLabel: 'ECB' },
      { code: 'GBP', diff: rateDifferentials.usFed_boe, cb: rateDifferentials.boe, cbLabel: 'BoE' },
      { code: 'JPY', diff: rateDifferentials.usFed_boj, cb: rateDifferentials.boj, cbLabel: 'BoJ' },
    ];
    return policyMap
      .filter((r) => typeof r.diff === 'number')
      .map((r) => ({
        ...r,
        fed: rateDifferentials.fed,
        spotChange: changes?.[r.code],
        monthChange: changes1m?.[r.code],
        signal:
          r.diff > 1 && (changes?.[r.code] ?? 0) >= 0
            ? 'USD carry winning'
            : r.diff < -1
              ? `${r.code} carry winning`
              : 'Balanced',
      }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  }, [rateDifferentials, changes, changes1m]);

  const dxyOption = useMemo(() => {
    if (!dxyHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 20, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dxyHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dxyHistory.dates.length / 5) } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: dxyHistory.values, smooth: true, symbol: 'none', lineStyle: { color: '#3b82f6', width: 2 }, areaStyle: { color: 'rgba(59,130,246,0.1)' } }],
    };
  }, [dxyHistory, colors]);

  const cotOption = useMemo(() => {
    if (!cotHistory || !Object.keys(cotHistory).length) return null;
    const currencies = Object.keys(cotHistory).slice(0, 6);
    const dates = cotHistory[currencies[0]]?.map(d => d.date.slice(5)) || [];
    const lineColors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: currencies, top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 24, right: 16, bottom: 24, left: 44 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(dates.length / 5) } },
      yAxis: { type: 'value', name: 'Net % of OI', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: currencies.map((ccy, idx) => ({ name: ccy, type: 'line', smooth: true, symbol: 'none', lineStyle: { width: 1.5, color: lineColors[idx % lineColors.length] }, data: cotHistory[ccy].map(d => d.net) })),
    };
  }, [cotHistory, colors]);

  const renderPanel = useCallback((panelId) => {
    switch (panelId) {
      case 'kpi':
        return <MarketKpiStrip kpis={kpiItems} bare />;

      case 'sidebar':
        return (
          <FXSidebar
            spotRates={spotRates}
            changes={changes}
            rateDifferentials={rateDifferentials}
            cotHistory={cotHistory}
            lastUpdated={lastUpdated}
            isLive={isLive}
            fetchLog={fetchLog}
            error={error}
            fetchedOn={fetchedOn}
            isCurrent={isCurrent}
          />
        );

      case 'movers':
        return (
          <div className="fx-movers-list">
            {movers.slice(0, 8).map((m, i) => (
              <div key={m.code} className="fx-mover-row">
                <span className="fx-mover-rank">{i + 1}</span>
                <span className="fx-mover-code"><MetricValue value={m.changePct} seriesKey={`fx${m.code}`} timestamp={lastUpdated} format={() => m.code} /></span>
                <span className="fx-mover-pct" style={{ color: m.changePct >= 0 ? '#4ade80' : '#f87171' }}>
                  <MetricValue value={m.changePct} seriesKey={`fx${m.code}`} timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(3)}%`} />
                </span>
                <Sparkline values={m.spark} />
              </div>
            ))}
          </div>
        );

      case 'dxy':
        return dxyOption
          ? <SafeECharts option={dxyOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'DXY Dollar Index', source: 'FRED', endpoint: '/api/fx', series: [{ id: 'DTWEXBGS' }], updatedAt: lastUpdated }} />
          : <div className="fx-empty">No DXY data</div>;

      case 'cot':
        return cotOption
          ? <SafeECharts option={cotOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'CFTC COT Positioning', source: 'CFTC', endpoint: '/api/fx', series: [], updatedAt: lastUpdated }} />
          : <div className="fx-empty">No COT data</div>;

      case 'corr':
        return <CurrencyCorrelationMatrix history={history} lastUpdated={lastUpdated} />;

      case 'reer':
        return <ReerChart reer={reer} lastUpdated={lastUpdated} />;

      case 'ratediff':
        return rateDiff?.length ? (
          <div className="fx-mini-table" style={{ paddingTop: 0 }}>
            {rateDiff.map(([ccy, diff]) => (
              <div key={ccy} className="fx-mini-row">
                <span className="fx-mini-name">{ccy}</span>
                <span className="fx-mini-value" style={{ color: diff >= 0 ? '#4ade80' : '#f87171' }}>
                  <MetricValue value={diff} seriesKey="rateDifferential" timestamp={lastUpdated} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} />
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="fx-empty">No rate differential data</div>
        );

      case 'carry':
        return <CarryMap rateDifferentials={rateDifferentials} />;

      case 'rate-dashboard':
        return rateDiffRows.length > 0 ? (
          <div className="rd-panel">
            {rateDifferentials?.fed != null && (
              <div className="rd-policy-strip">
                {[
                  { label: 'Fed', value: rateDifferentials.fed, color: '#60a5fa' },
                  { label: 'ECB', value: rateDifferentials.ecb, color: '#a78bfa' },
                  { label: 'BoE', value: rateDifferentials.boe, color: '#34d399' },
                  { label: 'BoJ', value: rateDifferentials.boj, color: '#fbbf24' },
                ].filter((p) => p.value != null).map((p) => (
                  <div key={p.label} className="rd-policy-pill">
                    <span className="rd-policy-label">{p.label}</span>
                    <span className="rd-policy-val" style={{ color: p.color }}>{Number(p.value).toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            )}
            <div className="rd-table" role="table">
              <div className="rd-thead" role="row">
                <span>Pair</span>
                <span>Fed − CB</span>
                <span>CB rate</span>
                <span>1D</span>
                <span>1M</span>
                <span>Signal</span>
              </div>
              {rateDiffRows.map((row) => (
                <div key={row.code} className="rd-row" role="row">
                  <span className="rd-pair">
                    <strong>{row.code}</strong>
                    <span className="rd-pair-sub">vs USD · {row.cbLabel}</span>
                  </span>
                  <span className={`rd-num ${row.diff >= 0 ? 'pos' : 'neg'}`}>
                    {row.diff >= 0 ? '+' : ''}{row.diff.toFixed(2)}%
                  </span>
                  <span className="rd-num muted">
                    {row.cb != null ? `${Number(row.cb).toFixed(2)}%` : '—'}
                  </span>
                  <span className={`rd-num ${(row.spotChange ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                    {row.spotChange != null ? `${row.spotChange >= 0 ? '+' : ''}${row.spotChange.toFixed(2)}%` : '—'}
                  </span>
                  <span className={`rd-num ${(row.monthChange ?? 0) >= 0 ? 'pos' : 'neg'}`}>
                    {row.monthChange != null ? `${row.monthChange >= 0 ? '+' : ''}${row.monthChange.toFixed(2)}%` : '—'}
                  </span>
                  <span className="rd-signal">{row.signal}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="fx-empty">No rate dashboard data</div>
        );

      case 'imf-cofer':
        return <ImfCoferPanel />;

      case 'treasury-tic':
        return <TreasuryTicPanel />;

      default:
        return null;
    }
  }, [
    kpiItems, spotRates, changes, rateDifferentials, cotHistory, lastUpdated,
    isLive, fetchLog, error, fetchedOn, isCurrent, movers, dxyOption, cotOption,
    history, reer, rateDiff, rateDiffRows,
  ]);

  const panelCtx = useMemo(() => ({
    __render: renderPanel,
    __live: {
      kpi: !!isLive,
      sidebar: !!isLive,
      movers: !!isLive,
      dxy: !!dxyHistory?.dates?.length,
      cot: !!(cotHistory && Object.keys(cotHistory).length > 0),
      corr: !!(history && Object.keys(history).length > 0),
      reer: !!reer?.dates?.length,
      ratediff: !!rateDiff?.length,
      carry: !!(rateDifferentials && rateDifferentials.fed != null),
      'rate-dashboard': !!rateDiffRows.length,
      'imf-cofer': hasCofer,
      'treasury-tic': hasTicHoldings,
    },
    __subtitle: {
      kpi: 'Spot rates · DXY · G10 average',
      carry: 'Interest rate differential (long base − short quote). Positive = earn positive carry.',
      'rate-dashboard': 'Fed policy vs ECB / BoE / BoJ · spot 1D / 1M',
      'imf-cofer': 'Currency composition of official FX reserves',
      'treasury-tic': 'Top foreign holders of US Treasury securities',
    },
    __disabled: {
      dxy: !dxyOption,
      cot: !cotOption,
      ratediff: !rateDiff?.length,
      'rate-dashboard': !rateDiffRows.length,
      'treasury-tic': !hasTicHoldings,
    },
    __noFooter: {
      sidebar: true,
    },
    __source: {
      kpi: 'Frankfurter / FRED',
      movers: 'Frankfurter API',
      dxy: 'FRED DTWEXBGS',
      cot: 'CFTC / Server',
      corr: 'Frankfurter API',
      reer: 'FRED / BIS',
      ratediff: 'FRED / Server',
      carry: 'FRED / Central Banks',
      'rate-dashboard': 'FRED / Central Banks / Frankfurter',
      'imf-cofer': 'IMF COFER',
      'treasury-tic': 'US Treasury TIC',
    },
  }), [
    renderPanel, isLive, dxyHistory, cotHistory, history, reer, rateDiff,
    rateDifferentials, rateDiffRows, dxyOption, cotOption, hasCofer, ticCtx, hasTicHoldings,
  ]);

  return (
    <div className="fx-dashboard fx-dashboard--bento">
      {isUsingFallbackRates && (
        <div style={{ padding: '6px 12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 6, marginBottom: 6, fontSize: 11, color: '#f59e0b' }}>
          Live FX rates unavailable — showing static fallback rates. All changes will be 0%.
        </div>
      )}
      <MarketPanelGrid
        marketId="fx"
        layout={LAYOUT}
        storageKey="fx-layout-v8"
        accent="fx"
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

export default React.memo(FXDashboard);
