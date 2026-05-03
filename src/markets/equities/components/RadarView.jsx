import React, { useState, useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';

const SECTOR_COLORS = {
  'Technology':  '#3b82f6',
  'Financials':  '#10b981',
  'Consumer':    '#f59e0b',
  'Healthcare':  '#ec4899',
  'Energy':      '#f97316',
  'Industrials': '#8b5cf6',
  'Crypto':      '#f7931a',
  'Other':       '#64748b',
};

const DIMENSIONS = {
  marketCap: { label: 'Market Cap', key: 'marketCap' },
  pe: { label: 'P/E Ratio', key: 'pe' },
  revenue: { label: 'Revenue', key: 'revenue' },
  netIncome: { label: 'Net Income', key: 'netIncome' },
  divYield: { label: 'Div Yield', key: 'divYield' },
  changePct: { label: 'Perf %', key: 'changePct' },
};

export default function RadarView({ flatData = [], onTickerSelect }) {
  const { colors } = useTheme();
  const [xAxis, setXAxis] = useState('marketCap');
  const [yAxis, setYAxis] = useState('pe');

  const option = useMemo(() => {
    if (!flatData || flatData.length === 0) return {};

    const data = flatData
      .filter(item => item[xAxis] != null && item[yAxis] != null)
      .map(item => ({
      name: item.ticker,
      value: [
        item[xAxis] || 0,
        item[yAxis] || 0,
        item.marketCap || 1,
        item.sector || 'Other'
      ],
      ticker: item.ticker
    }));

    return {
      title: { text: 'Equities Radar', left: 'center', textStyle: { color: colors.text } },
      tooltip: {
        formatter: (params) => {
          const { name, value } = params.data;
          return `<b style="color:#eee">${name}</b><br/>${DIMENSIONS[xAxis].label}: ${value[0]}<br/>${DIMENSIONS[yAxis].label}: ${value[1]}`;
        }
      },
      grid: { top: '15%', bottom: '10%', left: '10%', right: '10%' },
      xAxis: { 
        name: DIMENSIONS[xAxis].label, 
        nameLocation: 'middle', 
        nameGap: 30, 
        splitLine: { lineStyle: { color: colors.border } },
        axisLine: { lineStyle: { color: colors.textSecondary } },
        axisLabel: { color: colors.textSecondary }
      },
      yAxis: { 
        name: DIMENSIONS[yAxis].label, 
        nameLocation: 'middle', 
        nameGap: 50, 
        splitLine: { lineStyle: { color: colors.border } },
        axisLine: { lineStyle: { color: colors.textSecondary } },
        axisLabel: { color: colors.textSecondary }
      },
      series: [{
        type: 'scatter',
        symbolSize: (data) => Math.sqrt(data[2]) * 0.01,
        data: data,
        itemStyle: {
          color: (params) => SECTOR_COLORS[params.data.value[3]] || SECTOR_COLORS.Other,
          opacity: 0.7
        },
        emphasis: {
          itemStyle: { opacity: 1, borderColor: colors.text, borderWidth: 1 }
        }
      }]
    };
  }, [flatData, xAxis, yAxis, colors]);

  const onEvents = useMemo(() => ({
    'click': (params) => {
      if (params.data) {
        onTickerSelect(flatData.find(i => i.ticker === params.data.ticker));
      }
    }
  }), [flatData, onTickerSelect]);

  return (
    <div className="eq-panel-content bento-panel-content" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        padding: '12px', 
        background: 'transparent', 
        color: 'var(--text-muted)',
        fontSize: '12px',
        borderBottom: '1px solid var(--border-color)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          X: 
          <select 
            value={xAxis} 
            onChange={e => setXAxis(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
          >
            {Object.entries(DIMENSIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          Y: 
          <select 
            value={yAxis} 
            onChange={e => setYAxis(e.target.value)}
            style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}
          >
            {Object.entries(DIMENSIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ flex: 1, minHeight: '400px' }}>
        <SafeECharts 
          option={option} 
          onEvents={onEvents}
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}


