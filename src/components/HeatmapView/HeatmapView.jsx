import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../hub/ThemeContext';

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
function groupTooltip(d, currentRate, currentSymbol, currency, metricKey, themeColors) {
  const total = sumLeaves(d);
  const converted = (total * currentRate).toLocaleString(undefined, { maximumFractionDigits: 0 });
  const count = countLeaves(d);
  const textSecondary = themeColors?.textSecondary || '#94a3b8';
  let body = `<div style="font-weight:700;font-size:1rem;margin-bottom:4px">${d.name}</div>`;
  body += `<div style="color:${textSecondary};font-size:0.78rem;margin-bottom:6px">${count} companies</div>`;
  body += `<div style="margin-bottom:4px">${metricKey}: <strong>${currentSymbol}${converted} B</strong> (${currency})</div>`;
  if (!d.isSectorGroup) {
    const sectors = getSectors(d.children || []).slice(0, 4);
    if (sectors.length) {
      body += `<div style="margin-top:6px;font-size:0.75rem;color:${textSecondary}">Sectors:</div>`;
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
      body += `<div style="margin-top:6px;font-size:0.75rem;color:${textSecondary}">Top holdings:</div>`;
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

// ─── Hover panel helpers ──────────────────────────────────────────────────────
function fmtB(val, sym = '$') {
  if (val == null || val === 0) return '—';
  if (Math.abs(val) >= 1000) return `${sym}${(val / 1000).toFixed(2)}T`;
  return `${sym}${val.toFixed(0)}B`;
}
function fmtPct(val) {
  if (val == null) return '—';
  return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
}

// ─── Hover panel ──────────────────────────────────────────────────────────────
function StockHoverPanel({ stock, isEnabled, snapshotPrices, comparisonPrices, currentRate, currentSymbol, currency, pos, snapshotDate }) {
  const { colors } = useTheme();
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

  const metricVal = stock.metricValue || stock.marketCap || stock.value;
  const capUSD    = metricVal || 0;
  const capStr    = fmtB(capUSD * currentRate, currentSymbol);

  // Fundamentals from stock universe data
  const rev     = stock.revenue   > 0 ? stock.revenue   : null;
  const ni      = stock.netIncome > 0 ? stock.netIncome : null;
  const margin  = rev && ni ? ((ni / rev) * 100) : null;
  const pe      = stock.pe      || null;
  const div     = stock.divYield || null;
  const revStr  = rev ? fmtB(rev * currentRate, currentSymbol) : '—';
  const niStr   = ni  ? fmtB(ni  * currentRate, currentSymbol) : '—';
  const peStr   = pe  ? `${pe.toFixed(1)}×` : '—';
  const divStr  = div ? `${div.toFixed(2)}%` : '—';
  const mgnStr  = margin != null ? `${margin.toFixed(1)}%` : '—';

  const VW = typeof window !== 'undefined' ? window.innerWidth  : 1200;
  const VH = typeof window !== 'undefined' ? window.innerHeight : 800;
  const PW = 310;
  const hasTimeTravel = !!(comparisonPrices && snapshotDate);
  // height estimate: header ~80px + fundamentals ~70px + perf ~100px + sparkline ~70px
  const estH = 80 + 70 + (hasTimeTravel ? 110 : 0) + (sparkPts.length >= 2 ? 70 : 0) + 20;
  const left = Math.min(pos.x + 18, VW - PW - 12);
  const top  = Math.min(pos.y - 16, Math.max(8, VH - estH));

  // Sparkline
  const SW = 274, SH = 44;
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

  // mini-bar chart for Revenue vs Net Income (absolute widths scaled to cap)
  const maxBar = Math.max(rev || 0, ni || 0, 1);
  const revBarW = rev ? Math.max(4, (rev / maxBar) * 100) : 0;
  const niBarW  = ni  ? Math.max(4, (ni  / maxBar) * 100) : 0;

  const sep = <div style={{ borderTop: `1px solid ${colors.cardBg}`, margin: '0.42rem 0' }} />;

  const panel = (
    <div style={{
      position: 'fixed', left: `${left}px`, top: `${top}px`,
      zIndex: 9999, width: `${PW}px`,
      background: 'rgba(7, 11, 26, 0.97)',
      border: isEnabled ? '1px solid #7c3aed' : '1px solid #1e3a5f',
      borderRadius: '0.55rem',
      padding: '0.7rem 0.85rem 0.65rem',
      boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
      pointerEvents: 'none',
      fontFamily: 'inherit',
      backdropFilter: 'blur(8px)',
      overflow: 'hidden',
    }}>

      {/* Top border progress bar */}
      <div key={stock.name} style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: isEnabled
          ? 'linear-gradient(to right, #7c3aed, #a78bfa)'
          : 'linear-gradient(to right, #3b82f6, #7c3aed)',
        transformOrigin: 'left',
        transform: 'scaleX(1)',
      }} />

      {/* Enabled badge */}
      {isEnabled && (
        <div style={{ position: 'absolute', top: '0.28rem', right: '0.5rem', fontSize: '0.57rem', color: '#a78bfa', letterSpacing: '0.03em' }}>
          sidebar loaded ✓
        </div>
      )}

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.1rem' }}>
        {stock.rank && <span style={{ color: '#facc15', fontWeight: 900, fontSize: '0.7rem' }}>#{stock.rank}</span>}
        <span style={{ color: colors.text, fontWeight: 800, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>{stock.name}</span>
        {stock.sector && (
          <span style={{
            marginLeft: 'auto', fontSize: '0.6rem', fontWeight: 700,
            background: 'rgba(99,102,241,0.18)', color: '#818cf8',
            padding: '1px 5px', borderRadius: '3px',
          }}>{stock.sector}</span>
        )}
      </div>
      {stock.fullName && stock.fullName !== stock.name && (
        <div style={{ color: colors.textSecondary, fontSize: '0.68rem', marginBottom: '0.35rem', lineHeight: 1.3 }}>{stock.fullName}</div>
      )}

      {sep}

      {/* ── Key metrics grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.28rem 0.5rem', marginBottom: '0.1rem' }}>
        {[
          { label: 'Mkt Cap', value: capStr,  color: '#93c5fd' },
          { label: 'P/E',     value: peStr,   color: colors.text },
          { label: 'Div',     value: divStr,  color: div > 0 ? '#4ade80' : colors.textMuted },
          { label: 'Revenue', value: revStr,  color: colors.text },
          { label: 'Net Inc', value: niStr,   color: ni > 0 ? '#4ade80' : '#ef4444' },
          { label: 'Margin',  value: mgnStr,  color: margin > 15 ? '#4ade80' : margin > 5 ? '#facc15' : '#ef4444' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '0.57rem', color: colors.textDim, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            <strong style={{ fontSize: '0.72rem', color, fontVariantNumeric: 'tabular-nums' }}>{value}</strong>
          </div>
        ))}
      </div>

      {/* ── Mini bar: revenue vs net income ── */}
      {(rev || ni) && (
        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '3px' }}>
          {rev && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.55rem', color: colors.textDim, width: '28px' }}>Rev</span>
              <div style={{ flex: 1, height: '4px', background: colors.cardBg, borderRadius: '2px' }}>
                <div style={{ width: `${revBarW}%`, height: '100%', background: '#3b82f6', borderRadius: '2px' }} />
              </div>
            </div>
          )}
          {ni && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontSize: '0.55rem', color: colors.textDim, width: '28px' }}>Net</span>
              <div style={{ flex: 1, height: '4px', background: colors.cardBg, borderRadius: '2px' }}>
                <div style={{ width: `${niBarW}%`, height: '100%', background: niBarW / revBarW > 0.15 ? '#22c55e' : '#ef4444', borderRadius: '2px' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Time-travel section (only when navigated to a date) ── */}
      {hasTimeTravel && (
        <>
          {sep}
          <div style={{ fontSize: '0.6rem', color: colors.textDim, marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Price Performance · {snapshotDate}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {changes.map(({ label, pct }) => {
              const has   = pct !== null;
              const color = !has ? colors.border : pct >= 0 ? '#22c55e' : '#ef4444';
              const barW  = has ? Math.min(Math.abs(pct) / 15 * 100, 100) : 0;
              return (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.6rem', color: colors.textMuted, width: '26px', flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: '3px', background: colors.cardBg, borderRadius: '2px', overflow: 'hidden', position: 'relative' }}>
                    {has && <div style={{
                      height: '100%', width: `${barW}%`, background: color, borderRadius: '2px',
                      position: 'absolute', [pct < 0 ? 'right' : 'left']: 0,
                    }} />}
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color, width: '56px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {has ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Sparkline */}
          {sparkPath && (
            <>
              {sep}
              <svg width={SW} height={SH} style={{ display: 'block', overflow: 'visible' }}>
                <defs>
                  <linearGradient id={`sg-${stock.name}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                <polyline points={areaPath} fill={`url(#sg-${stock.name})`} stroke="none" />
                <polyline points={sparkPath} fill="none" stroke={sparkColor} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.57rem', color: colors.border, marginTop: '0.08rem' }}>
                <span>1Y ago</span>
                <span>{snapshotDate}</span>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Hint when sidebar not yet loaded ── */}
      {!isEnabled && (
        <>
          {sep}
          <div style={{ fontSize: '0.6rem', color: colors.border, textAlign: 'center', letterSpacing: '0.03em' }}>
            hold to open full analysis →
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
  const { colors } = useTheme();

  const [hoveredStock, setHoveredStock] = useState(null);
  const [isEnabled,    setIsEnabled]    = useState(false);
  const [hoverPos,     setHoverPos]     = useState({ x: 0, y: 0 });
  const timerRef = useRef(null);
  const hoveredStockRef    = useRef(null);
  const onHoverActivateRef = useRef(onHoverActivate);
  useEffect(() => { onHoverActivateRef.current = onHoverActivate; }, [onHoverActivate]);

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
    animation: false,
    tooltip: {
      show: !hoveredStock,
      formatter: function (info) {
        if (!info.data) return '';
        const d = info.data;
        if (d.children?.length > 0) return groupTooltip(d, currentRate, currentSymbol, currency, METRIC_LABEL[rankMetric] || 'Mkt Cap', colors);
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
      roam: 'move',
      nodeClick: 'zoomToNode',
      breadcrumb: { show: true, left: 'center', bottom: 10, itemStyle: { textStyle: { color: '#fff' } } },
      data: chartData,
      width: '100%',
      height: '90%',
    }]
  }), [chartData, levels, currentRate, currentSymbol, currency, rankMetric, hoveredStock, colors]);

  const onMouseover = useCallback((params) => {
    const d = params.data;
    if (!d || d.children?.length > 0) {
      setHoveredStock(null);
      hoveredStockRef.current = null;
      setIsEnabled(false);
      clearTimeout(timerRef.current);
      return;
    }
    const ev = params.event?.event;
    if (ev) setHoverPos({ x: ev.clientX, y: ev.clientY });
    // Reset timer only when stock changes
    if (!hoveredStockRef.current || hoveredStockRef.current.name !== d.name) {
      setIsEnabled(false);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setIsEnabled(true);
        onHoverActivateRef.current?.(d); // always the latest callback, never stale
      }, ACTIVATE_DELAY);
    }
    setHoveredStock(d);
    hoveredStockRef.current = d;
  }, []); // empty deps — never re-registers on ECharts, never captures stale values

  const onMousemove = useCallback((params) => {
    const ev = params.event?.event;
    if (ev && hoveredStockRef.current) setHoverPos({ x: ev.clientX, y: ev.clientY });
  }, []); // stable

  const onMouseout = useCallback(() => {
    clearTimeout(timerRef.current);
    setHoveredStock(null);
    hoveredStockRef.current = null;
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
