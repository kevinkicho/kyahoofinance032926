import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import SafeECharts from '../../../components/SafeECharts';
import BentoWrapper from '../../../components/BentoWrapper';
import DataFooter from '../../../components/DataFooter/DataFooter';
import MetricValue from '../../../components/MetricValue/MetricValue';
import CarryMap from './CarryMap';
import ReerChart from './ReerChart';
import CurrencyCorrelationMatrix from './CurrencyCorrelationMatrix';
import FXSidebar from './FXSidebar';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
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

const stopDrag = (e) => e.stopPropagation();

function FXDashboard({
  spotRates, changes, changes1w, changes1m, sparklines,
  history, reer, rateDifferentials, dxyHistory, cotData, cotHistory,
  isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent,
}) {
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
 
  return (
    <div className="fx-dashboard fx-dashboard--bento">
      <BentoWrapper layout={LAYOUT} storageKey="fx-layout-v5">
        {/* KPI strip — full-width row 0, real bento panel (drag/resize/
            persist). Each pill is clickable via MetricValue. */}
        <div key="kpi" className="fx-bento-card">
          <div className="fx-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">FX Key Metrics</span>
            <span className="fx-panel-subtitle">Spot rates · DXY · G10 average</span>
          </div>
          <div className="fx-panel-content bento-panel-content" onMouseDown={stopDrag}>
            <MarketKpiStrip kpis={kpiItems} bare />
          </div>
          <DataFooter
            source="Frankfurter / FRED"
            timestamp={lastUpdated}
            isLive={isLive}
            fetchLog={fetchLog}
            error={error}
            fetchedOn={fetchedOn}
            isCurrent={isCurrent}
          />
        </div>

        {/* FX Dashboard sidebar — bento panel (left column under the KPI
            strip). Drag the title to move it; resize the corner. */}
        <div key="sidebar" className="fx-bento-card">
          <div className="fx-panel-title-row bento-panel-title-row">
            <span className="bento-panel-title">FX Dashboard</span>
          </div>
          <div className="fx-panel-content bento-panel-content bento-panel-scroll">
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
          </div>
        </div>
        {/* Top Movers */}
        <div key="movers" className="fx-bento-card">
          <div className="fx-panel-title-row bento-panel-title-row">
            <span className="fx-panel-title">Top Movers vs USD</span>
          </div>
          <div className="fx-panel-content bento-panel-content fx-panel-scroll" onMouseDown={stopDrag}>
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
          </div>
          <DataFooter source="Frankfurter API" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* DXY Chart */}
        <div key="dxy" className="fx-bento-card">
          <div className="fx-panel-title-row bento-panel-title-row">
            <span className="fx-panel-title">DXY Dollar Index</span>
          </div>
          <div className="fx-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {dxyOption ? <SafeECharts option={dxyOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'DXY Dollar Index', source: 'FRED', endpoint: '/api/fx', series: [{ id: 'DTWEXBGS' }], updatedAt: lastUpdated }} /> : <div className="fx-empty">No DXY data</div>}
          </div>
          <DataFooter source="FRED DTWEXBGS" timestamp={lastUpdated} isLive={!!dxyHistory?.dates?.length} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

        {/* COT Positioning */}
        <div key="cot" className="fx-bento-card">
          <div className="fx-panel-title-row bento-panel-title-row">
            <span className="fx-panel-title">CFTC COT Positioning</span>
          </div>
          <div className="fx-panel-content bento-panel-content" onMouseDown={stopDrag}>
            {cotOption ? <SafeECharts option={cotOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'CFTC COT Positioning', source: 'CFTC', endpoint: '/api/fx', series: [], updatedAt: lastUpdated }} /> : <div className="fx-empty">No COT data</div>}
          </div>
          <DataFooter source="CFTC / Server" timestamp={lastUpdated} isLive={!!cotHistory && Object.keys(cotHistory).length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
        </div>

         {/* Correlation Matrix */}
         <div key="corr" className="fx-bento-card">
           <div className="fx-panel-title-row bento-panel-title-row">
             <span className="fx-panel-title">Currency Correlation (30D)</span>
           </div>
           <div className="fx-panel-content bento-panel-content" onMouseDown={stopDrag}>
             <CurrencyCorrelationMatrix history={history} lastUpdated={lastUpdated} />
           </div>
           <DataFooter source="Frankfurter API" timestamp={lastUpdated} isLive={!!history && Object.keys(history).length > 0} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
         </div>
 
         {/* REER */}
         <div key="reer" className="fx-bento-card">
           <div className="fx-panel-title-row bento-panel-title-row">
             <span className="fx-panel-title">Real Effective Exchange Rates</span>
           </div>
           <div className="fx-panel-content bento-panel-content" onMouseDown={stopDrag}>
             <ReerChart reer={reer} lastUpdated={lastUpdated} />
           </div>
           <DataFooter source="FRED / BIS" timestamp={lastUpdated} isLive={!!reer?.dates?.length} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
         </div>

        {/* Rate Differentials */}
        {rateDiff && (
          <div key="ratediff" className="fx-bento-card">
            <div className="fx-panel-title-row bento-panel-title-row">
              <span className="fx-panel-title">Rate Differentials</span>
            </div>
            <div className="fx-panel-content bento-panel-content fx-panel-scroll" onMouseDown={stopDrag}>
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
            </div>
            <DataFooter source="FRED / Server" timestamp={lastUpdated} isLive={!!rateDiff?.length} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        )}

        {/* Carry Map */}
        <div key="carry" className="fx-bento-card fx-bento-card--carry">
          <CarryMap
            rateDifferentials={rateDifferentials}
            isLive={isLive}
            lastUpdated={lastUpdated}
            fetchLog={fetchLog}
            error={error}
            fetchedOn={fetchedOn}
            isCurrent={isCurrent}
          />
        </div>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(FXDashboard);