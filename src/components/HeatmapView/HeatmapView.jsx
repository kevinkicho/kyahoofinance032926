import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactECharts from 'echarts-for-react';

const METRIC_LABEL = {
  marketCap:  'Mkt Cap',
  revenue:    'Revenue',
  netIncome:  'Net Income',
  pe:         'P/E',
  divYield:   'Div Yield',
};

function sumLeaves(node) {
  if (!node.children || node.children.length === 0) return node.value || 0;
  return node.children.reduce((s, c) => s + sumLeaves(c), 0);
}
function countLeaves(node) {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((s, c) => s + countLeaves(c), 0);
}
function getSectors(children) {
  const map = {};
  const collect = (nodes) => nodes.forEach(n => {
    if (n.children) collect(n.children);
    else if (n.sector) map[n.sector] = (map[n.sector] || 0) + (n.metricValue || n.value || 0);
  });
  collect(children);
  return Object.entries(map).sort(([, a], [, b]) => b - a);
}
function groupTooltip(d, currentRate, currentSymbol, currency, metricKey) {
  const total = sumLeaves(d);
  const converted = (total * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const count = countLeaves(d);
  let body = `<div style="font-weight:700;font-size:1rem;margin-bottom:4px">${d.name}</div>`;
  body += `<div style="color:#94a3b8;font-size:0.78rem;margin-bottom:6px">${count} companies</div>`;
  body += `<div style="margin-bottom:4px">${metricKey}: <strong>${currentSymbol}${converted} B</strong> (${currency})</div>`;
  if (!d.isSectorGroup) {
    const sectors = getSectors(d.children || []).slice(0, 4);
    if (sectors.length) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:#94a3b8">Sectors:</div>`;
      sectors.forEach(([sec, val]) => {
        const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0;
        body += `<div style="font-size:0.78rem">· ${sec} <span style="color:#60a5fa">${pct}%</span></div>`;
      });
    }
  } else {
    const stocks = (d.children || []).slice()
      .sort((a, b) => (b.metricValue || b.value || 0) - (a.metricValue || a.value || 0))
      .slice(0, 3);
    if (stocks.length) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:#94a3b8">Top holdings:</div>`;
      stocks.forEach(st => {
        const isNum = /^\d/.test(st.name);
        const label = isNum ? (st.fullName || st.name) : `${st.name}${st.regionName ? ` · ${st.regionName}` : ''}`;
        const v = ((st.metricValue || st.value || 0) * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
        body += `<div style="font-size:0.78rem">· ${label} <span style="color:#60a5fa">${currentSymbol}${v}B</span></div>`;
      });
    }
  }
  return body;
}

// ─── Inject keyframes once ────────────────────────────────────────────────────
function injectStyles() {
  if (document.getElementById('hm-panel-styles')) return;
  const s = document.createElement('style');
  s.id = 'hm-panel-styles';
  s.textContent = `
    @keyframes hmBorderTop {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }
    @keyframes hmEnabledGlow {
      0%,100% { box-shadow: 0 0 0 1px #7c3aed, 0 0 14px rgba(124,58,237,0.4); }
      50%      { box-shadow: 0 0 0 2px #a78bfa, 0 0 24px rgba(167,139,250,0.6); }
    }
  `;
  document.head.appendChild(s);
}

const PERIODS = [
  { label: 'D-1', key: 'd1' },
  { label: '1W',  key: 'w1' },
  { label: '1M',  key: 'm1' },
  { label: '1Y',  key: 'y1' },
  { label: 'YTD', key: 'ytd' },
];

// ─── Hover panel ──────────────────────────────────────────────────────────────
function StockHoverPanel({ stock, isEnabled, snapshotPrices, comparisonPrices, currentRate, currentSymbol, currency, pos, snapshotDate }) {
  useEffect(() => { injectStyles(); }, []);
  if (!stock) return null;

  const apiKey   = stock.apiKey;
  const curPrice = snapshotPrices?.[apiKey];

  const changes = PERIODS.map(p => {
    const ref = comparisonPrices?.[p.key]?.[apiKey];
    const pct = ref && curPrice ? (curPrice / ref - 1) * 100 : null;
    return { ...p, pct };
  });

  // Sparkline: y1 → ytd → m1 → w1 → d1 → current (temporal order)
  const sparkPts = [
    comparisonPrices?.y1?.[apiKey],
    comparisonPrices?.ytd?.[apiKey],
    comparisonPrices?.m1?.[apiKey],
    comparisonPrices?.w1?.[apiKey],
    comparisonPrices?.d1?.[apiKey],
    curPrice,
  ].filter(v => v != null && v > 0);

  const metricVal = stock.metricValue || stock.value;
  const capStr = metricVal
    ? (metricVal * currentRate >= 1000
        ? `${currentSymbol}${(metricVal * currentRate / 1000).toFixed(2)}T`
        : `${currentSymbol}${(metricVal * currentRate).toFixed(0)}B`)
    : '—';

  const VW = typeof window !== 'undefined' ? window.innerWidth  : 1200;
  const VH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const PW = 288;
  const left = Math.min(pos.x + 18, VW - PW - 12);
  const top  = Math.min(pos.y - 16, VH - 360);

  // Sparkline
  const SW = 252, SH = 46;
  let sparkPath = null, areaPath = null, sparkColor = '#22c55e';
  if (sparkPts.length >= 2) {
    const min = Math.min(...sparkPts), max = Math.max(...sparkPts);
    const range = max - min || 1;
    const pts = sparkPts.map((p, i) => {
      const x = ((i / (sparkPts.length - 1)) * (SW - 4) + 2).toFixed(1);
      const y = (SH - 4 - ((p - min) / range) * (SH - 12)).toFixed(1);
      return [x, y];
    });
    sparkPath = pts.map(([x, y]) => `${x},${y}`).join(' ');
    areaPath  = sparkPath + ` ${pts[pts.length - 1][0]},${SH} 2,${SH}`;
    sparkColor = sparkPts[sparkPts.length - 1] >= sparkPts[0] ? '#22c55e' : '#ef4444';
  }

  const noData = !comparisonPrices || !snapshotDate;

  const panel = (
    <div style={{
      position: 'fixed', left: `${left}px`, top: `${top}px`,
      zIndex: 9999, width: `${PW}px`,
      background: 'rgba(7, 11, 26, 0.97)',
      border: isEnabled ? '1px solid #7c3aed' : '1px solid #1e3a5f',
      borderRadius: '0.55rem',
      padding: '0.75rem 0.85rem 0.7rem',
      boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
      animation: isEnabled ? 'hmEnabledGlow 2s ease-in-out infinite' : undefined,
      pointerEvents: 'none',
      fontFamily: 'inherit',
      backdropFilter: 'blur(8px)',
      overflow: 'hidden',
    }}>

      {/* Top border progress bar — animates over 1.5s on each new hover */}
      <div
        key={stock.name}   /* remounts animation when stock changes */
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
          background: isEnabled
            ? 'linear-gradient(to right, #7c3aed, #a78bfa)'
            : 'linear-gradient(to right, #3b82f6, #7c3aed)',
          transformOrigin: 'left',
          animation: isEnabled ? 'none' : 'hmBorderTop 1.5s ease-out forwards',
          transform: isEnabled ? 'scaleX(1)' : 'scaleX(0)',
        }}
      />

      {/* Enabled badge */}
      {isEnabled && (
        <div style={{ position: 'absolute', top: '0.3rem', right: '0.5rem', fontSize: '0.58rem', color: '#a78bfa', letterSpacing: '0.03em' }}>
          sidebar loaded
        </div>
      )}

      {/* Stock header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.15rem' }}>
        {stock.rank && <span style={{ color: '#facc15', fontWeight: 900, fontSize: '0.72rem' }}>#{stock.rank}</span>}
        <span style={{ color: '#f1f5f9', fontWeight: 800, fontSize: '0.88rem' }}>{stock.name}</span>
        {stock.sector && <span style={{ color: '#64748b', fontSize: '0.65rem', marginLeft: 'auto' }}>{stock.sector}</span>}
      </div>
      {stock.fullName && stock.fullName !== stock.name && (
        <div style={{ color: '#94a3b8', fontSize: '0.7rem', marginBottom: '0.3rem', lineHeight: 1.3 }}>{stock.fullName}</div>
      )}
      <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.68rem', color: '#64748b', marginBottom: '0.45rem' }}>
        <span>Mkt Cap: <strong style={{ color: '#e2e8f0' }}>{capStr}</strong></span>
        {stock.pe && <span>P/E: <strong style={{ color: '#e2e8f0' }}>{stock.pe}x</strong></span>}
      </div>

      <div style={{ borderTop: '1px solid #1e293b', marginBottom: '0.42rem' }} />

      {/* Period changes */}
      {noData ? (
        <div style={{ color: '#475569', fontSize: '0.68rem', padding: '0.2rem 0' }}>
          Navigate to a historical date to see performance data
        </div>
      ) : !comparisonPrices ? (
        <div style={{ color: '#7c3aed', fontSize: '0.68rem', padding: '0.2rem 0', animation: 'tbPulse 0.8s ease-in-out infinite' }}>
          Loading comparison data…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.22rem' }}>
          {changes.map(({ label, pct }) => {
            const has    = pct !== null;
            const color  = !has ? '#334155' : pct >= 0 ? '#22c55e' : '#ef4444';
            const barW   = has ? Math.min(Math.abs(pct) / 15 * 100, 100) : 0;
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.63rem', color: '#64748b', width: '26px', flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: '3px', background: '#1e293b', borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                  {has && <div style={{
                    height: '100%', width: `${barW}%`, background: color, borderRadius: '2px',
                    position: 'absolute', [pct < 0 ? 'right' : 'left']: 0,
                  }} />}
                </div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color, width: '56px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {has ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Sparkline */}
      {sparkPath && (
        <>
          <div style={{ borderTop: '1px solid #1e293b', margin: '0.5rem 0 0.3rem' }} />
          <svg width={SW} height={SH} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <linearGradient id={`sg-${stock.name}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparkColor} stopOpacity="0.28" />
                <stop offset="100%" stopColor={sparkColor} stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <polyline points={areaPath} fill={`url(#sg-${stock.name})`} stroke="none" />
            <polyline points={sparkPath} fill="none" stroke={sparkColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
          </svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.58rem', color: '#334155', marginTop: '0.1rem' }}>
            <span>1Y ago</span>
            <span>{snapshotDate}</span>
          </div>
        </>
      )}
    </div>
  );

  return ReactDOM.createPortal(panel, document.body);
}

// ─── Main component ───────────────────────────────────────────────────────────
const ACTIVATE_DELAY = 1500; // ms until sidebar loads

const HeatmapView = ({
  data, onChartClick,
  currentRate, currentSymbol, currency,
  rankMetric = 'marketCap', groupBy = 'market',
  snapshotPrices, comparisonPrices, snapshotDate, colorByPerf,
  onHoverActivate,
}) => {

  const [hoveredStock, setHoveredStock] = useState(null);
  const [isEnabled,    setIsEnabled]    = useState(false);
  const [hoverPos,     setHoverPos]     = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);

  const chartData = useMemo(() => {
    const norm = (node) => node.children
      ? { ...node, children: node.children.map(norm) }
      : { ...node, value: node.metricValue || node.adjustedValue || node.value };
    return data.map(norm);
  }, [data, rankMetric]);

  const levels = useMemo(() => {
    if (groupBy === 'sectorInMarket') return [
      { itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },
      { itemStyle: { borderWidth: 2, gapWidth: 2 }, upperLabel: { show: true, height: 20, fontSize: 10 } },
      { itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },
    ];
    if (groupBy === 'sectorGlobal') return [
      { itemStyle: { borderWidth: 3, gapWidth: 4 }, upperLabel: { show: true } },
      { itemStyle: { borderWidth: 1, gapWidth: 1 }, label: { show: true } },
    ];
    return [
      { itemStyle: { borderWidth: 2, gapWidth: 3 }, upperLabel: { show: true } },
      { itemStyle: { borderWidth: 1, gapWidth: 2 }, label: { show: true } },
    ];
  }, [groupBy]);

  const chartOption = useMemo(() => ({
    animation: true,
    animationDuration: 600,
    animationEasing: 'cubicInOut',
    animationDurationUpdate: 600,
    animationEasingUpdate: 'cubicInOut',
    tooltip: {
      show: !hoveredStock,
      formatter: function (info) {
        if (!info.data) return '';
        const d = info.data;
        if (d.children?.length > 0) return groupTooltip(d, currentRate, currentSymbol, currency, METRIC_LABEL[rankMetric] || 'Mkt Cap');
        return '';
      }
    },
    series: [{
      name: 'Global Market',
      type: 'treemap',
      visibleMin: 50,
      label: {
        show: true, fontSize: 11, fontWeight: 'bold', overflow: 'truncate',
        formatter: (params) => {
          const d = params.data;
          if (!d || d.children?.length > 0) return params.name;
          const isNum = /^\d/.test(d.name);
          return (d.rank ? `#${d.rank} ` : '') + (isNum ? (d.fullName || d.name) : d.name);
        },
      },
      upperLabel: { show: true, height: 22, fontSize: 11, color: '#fff', fontWeight: '600' },
      itemStyle: { borderColor: '#1e1e1e', borderWidth: 1, gapWidth: 2 },
      levels,
      roam: true,
      nodeClick: 'zoomToNode',
      breadcrumb: { show: true, left: 'center', bottom: 10, itemStyle: { textStyle: { color: '#fff' } } },
      data: chartData,
      width: '100%',
      height: '90%',
    }]
  }), [chartData, levels, currentRate, currentSymbol, currency, rankMetric, hoveredStock]);

  const onMouseover = useCallback((params) => {
    const d = params.data;
    if (!d || d.children?.length > 0) {
      setHoveredStock(null);
      setIsEnabled(false);
      clearTimeout(timerRef.current);
      return;
    }
    const ev = params.event?.event;
    if (ev) setHoverPos({ x: ev.clientX, y: ev.clientY });
    // Reset if different stock
    if (!hoveredStock || hoveredStock.name !== d.name) {
      setIsEnabled(false);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsEnabled(true);
        onHoverActivate?.(d);
      }, ACTIVATE_DELAY);
    }
    setHoveredStock(d);
  }, [hoveredStock, onHoverActivate]);

  const onMousemove = useCallback((params) => {
    const ev = params.event?.event;
    if (ev && hoveredStock) setHoverPos({ x: ev.clientX, y: ev.clientY });
  }, [hoveredStock]);

  const onMouseout = useCallback(() => {
    clearTimeout(timerRef.current);
    setHoveredStock(null);
    setIsEnabled(false);
  }, []);

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
      <ReactECharts
        // key forces chart remount when colorByPerf or rankMetric changes
        // — ensures itemStyle colors and rank labels re-render via ECharts
        key={`${colorByPerf ? 'perf' : 'rank'}-${rankMetric}`}
        option={chartOption}
        notMerge={false}
        lazyUpdate={false}
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
        opts={{ renderer: 'canvas' }}
        onEvents={{
          'click':     onChartClick,
          'mouseover': onMouseover,
          'mouseout':  onMouseout,
          'mousemove': onMousemove,
        }}
      />
      {hoveredStock && (
        <StockHoverPanel
          stock={hoveredStock}
          isEnabled={isEnabled}
          snapshotPrices={snapshotPrices}
          comparisonPrices={comparisonPrices}
          currentRate={currentRate}
          currentSymbol={currentSymbol}
          currency={currency}
          pos={hoverPos}
          snapshotDate={snapshotDate}
        />
      )}
    </div>
  );
};

export default HeatmapView;
