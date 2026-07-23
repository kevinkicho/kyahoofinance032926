import { useMemo } from 'react';
import SafeECharts from '../SafeECharts';
import { useTheme } from '../../hub/ThemeContext';
import './BarRaceView.css';

const SECTOR_COLORS = {
  Technology: '#3b82f6',
  Financials: '#10b981',
  Consumer: '#f59e0b',
  Healthcare: '#ec4899',
  Energy: '#f97316',
  Industrials: '#8b5cf6',
  Crypto: '#f7931a',
  Other: '#64748b',
};

/** Map stockUniverse region names → stable palette colors */
const REGION_COLOR_RULES = [
  { test: /USA|United States|NYSE|NASDAQ/i, color: '#3b82f6', label: 'USA' },
  { test: /China|Shanghai|Shenzhen|Hong Kong|Hang Seng/i, color: '#ef4444', label: 'China/HK' },
  { test: /Japan/i, color: '#eab308', label: 'Japan' },
  { test: /Europe|Euronext|DAX|Germany|SIX|Swiss|Borsa|Spain|BME|Italy|France|Austria|VSE|Nordic|Norway|OSL|Poland|WSE/i, color: '#10b981', label: 'Europe' },
  { test: /UK|LSE/i, color: '#8b5cf6', label: 'UK' },
  { test: /India|NSE|BSE/i, color: '#f97316', label: 'India' },
  { test: /Canada|TSX/i, color: '#06b6d4', label: 'Canada' },
  { test: /Australia|ASX|NZX|New Zealand/i, color: '#84cc16', label: 'Aus/NZ' },
  { test: /Brazil|B3/i, color: '#ec4899', label: 'Brazil' },
  { test: /Korea|KRX/i, color: '#6366f1', label: 'Korea' },
  { test: /Taiwan|TWSE/i, color: '#d946ef', label: 'Taiwan' },
  { test: /Saudi|Tadawul|Qatar|Abu Dhabi|Dubai|Kuwait|ADX|DFM|KSE|QSE/i, color: '#fbbf24', label: 'Gulf' },
  { test: /South Africa|JSE/i, color: '#14b8a6', label: 'S. Africa' },
  { test: /Singapore|SGX|Thailand|SET|Malaysia|Philippines|PSE|Indonesia|IDX/i, color: '#22d3ee', label: 'SE Asia' },
  { test: /Mexico|BMV|Chile|Peru|Colombia|BCS|BVL|BVC/i, color: '#fb7185', label: 'LatAm' },
  { test: /Israel|TASE|Egypt|EGX/i, color: '#a78bfa', label: 'MENA' },
  { test: /Crypto/i, color: '#f7931a', label: 'Crypto' },
];

function regionMeta(regionName) {
  const name = regionName || '';
  for (const rule of REGION_COLOR_RULES) {
    if (rule.test.test(name)) return { color: rule.color, label: rule.label };
  }
  return { color: '#64748b', label: name || 'Other' };
}

function sectorColor(sector) {
  return SECTOR_COLORS[sector] || '#64748b';
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCap(v, symbol = '$') {
  const n = num(v);
  if (n >= 1000) return `${symbol}${(n / 1000).toFixed(2)}T`;
  if (n >= 1) return `${symbol}${n.toFixed(0)}B`;
  if (n > 0) return `${symbol}${(n * 1000).toFixed(0)}M`;
  return `${symbol}0`;
}

const BarRaceView = ({
  flatData = [],
  currentRate = 1,
  currentSymbol = '$',
  currency = 'USD',
  snapshotDate,
  groupBy = 'market',
}) => {
  const { colors } = useTheme();
  const rate = Number.isFinite(Number(currentRate)) && Number(currentRate) > 0 ? Number(currentRate) : 1;
  const symbol = currentSymbol || '$';

  const top = useMemo(() => {
    const rows = (Array.isArray(flatData) ? flatData : [])
      .map((s) => ({
        ...s,
        _cap: num(s.adjustedValue ?? s.marketCap ?? s.value),
      }))
      .filter((s) => s._cap > 0 && (s.ticker || s.fullName));
    rows.sort((a, b) => b._cap - a._cap);
    // ECharts category axis draws bottom→top; reverse so largest is on top
    return rows.slice(0, 30).reverse();
  }, [flatData]);

  const getColor = (s) => {
    if (groupBy === 'market') return regionMeta(s.region).color;
    return sectorColor(s.sector);
  };

  const option = useMemo(() => {
    if (!top.length) return null;
    return {
      animation: true,
      animationDuration: 600,
      animationDurationUpdate: 600,
      animationEasing: 'cubicInOut',
      animationEasingUpdate: 'cubicInOut',
      backgroundColor: 'transparent',
      grid: { top: 8, bottom: 28, left: 168, right: 88, containLabel: false },
      xAxis: {
        max: 'dataMax',
        type: 'value',
        axisLine: { lineStyle: { color: colors.border } },
        splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
        axisLabel: {
          color: colors.textMuted,
          fontSize: 10,
          formatter: (v) => formatCap(v * rate, symbol),
        },
      },
      yAxis: {
        type: 'category',
        data: top.map((s) => s.ticker || s.fullName),
        axisLabel: {
          color: colors.text,
          fontSize: 10,
          fontWeight: '600',
          width: 150,
          overflow: 'truncate',
          formatter: (value, idx) => {
            const row = top[idx];
            if (!row) return value;
            // Prefer short ticker on axis; full name in tooltip
            return row.ticker || value;
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
      },
      series: [
        {
          realtimeSort: true,
          type: 'bar',
          data: top.map((s) => ({
            value: s._cap,
            name: s.fullName || s.ticker,
            ticker: s.ticker,
            sector: s.sector,
            region: s.region,
            itemStyle: {
              color: getColor(s),
              borderRadius: [0, 4, 4, 0],
            },
          })),
          barMaxWidth: 28,
          label: {
            show: true,
            position: 'right',
            color: colors.textSecondary,
            fontSize: 10,
            fontWeight: '700',
            fontFamily: 'SF Mono, Cascadia Code, monospace',
            formatter: (params) => formatCap(params.value * rate, symbol),
          },
          emphasis: { itemStyle: { opacity: 0.9 } },
        },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
        textStyle: { color: colors.text, fontSize: 12 },
        formatter: (params) => {
          const d = params?.[0]?.data;
          if (!d) return '';
          const cap = formatCap(d.value * rate, symbol);
          const regionLabel = regionMeta(d.region).label;
          return `<strong>${d.name}</strong><br/>${d.ticker || ''} · ${d.sector || '—'}<br/>Market Cap: ${cap} (${currency})<br/><span style="color:${colors.textMuted};font-size:0.75rem">${regionLabel}</span>`;
        },
      },
    };
  }, [top, rate, symbol, currency, groupBy, colors]);

  const legendItems = useMemo(() => {
    const seen = new Set();
    const out = [];
    [...top].reverse().forEach((s) => {
      if (groupBy === 'market') {
        const { label, color } = regionMeta(s.region);
        if (label && !seen.has(label)) {
          seen.add(label);
          out.push({ label, color });
        }
      } else {
        const key = s.sector || 'Other';
        if (!seen.has(key)) {
          seen.add(key);
          out.push({ label: key, color: sectorColor(key) });
        }
      }
    });
    return out;
  }, [top, groupBy]);

  if (!top.length) {
    return (
      <div className="bar-race-view bar-race-view--empty">
        <p>No market-cap data to rank. Click ▶ on Market Summary to refresh quotes.</p>
      </div>
    );
  }

  return (
    <div className="bar-race-view">
      <div className="bar-race-meta">
        <span className="bar-race-meta-title">
          Top {top.length} · {groupBy === 'market' ? 'by region' : 'by sector'}
        </span>
        {snapshotDate && <span className="bar-race-meta-snap">{snapshotDate}</span>}
        <div className="bar-race-legend">
          {legendItems.map(({ label, color }) => (
            <span
              key={label}
              className="bar-race-chip"
              style={{ color, background: `${color}22`, borderColor: `${color}55` }}
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="bar-race-chart">
        <SafeECharts
          option={option}
          notMerge={false}
          lazyUpdate
          style={{ height: '100%', width: '100%', minHeight: 360 }}
          opts={{ renderer: 'canvas' }}
          sourceInfo={{
            title: 'Bar Race',
            source: 'Yahoo Finance / Universe',
            endpoint: '/api/stocks',
            series: [],
            updatedAt: snapshotDate || undefined,
          }}
        />
      </div>
    </div>
  );
};

export default BarRaceView;
