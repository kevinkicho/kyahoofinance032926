// src/markets/commodities/components/SupplyDemand.jsx
import React from 'react';
import ReactECharts from 'echarts-for-react';
import { useTheme } from '../../../hub/ThemeContext';
import './CommodComponents.css';

function buildStocksOption(title, periods, values, avg5yr, colors) {
  const avgLine = avg5yr != null ? Array(values.length).fill(avg5yr) : null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
    },
    legend: avgLine ? {
      data: [title, '5yr Avg'],
      textStyle: { color: colors.textMuted, fontSize: 10 },
      top: 0, right: 0,
    } : undefined,
    grid: { top: avgLine ? 24 : 10, right: 8, bottom: 28, left: 48, containLabel: false },
    xAxis: {
      type: 'category',
      data: periods,
      axisLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: {
        color: colors.textMuted, fontSize: 9,
        formatter: (v) => v ? v.slice(5) : v,
        interval: Math.floor(periods.length / 6),
      },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9 },
    },
    series: [
      {
        name: title,
        type: 'line',
        data: values,
        smooth: true,
        symbol: 'none',
        itemStyle: { color: '#ca8a04' },
        lineStyle: { color: '#ca8a04', width: 2 },
        areaStyle: { color: 'rgba(202,138,4,0.08)' },
      },
      ...(avgLine ? [{
        name: '5yr Avg',
        type: 'line',
        data: avgLine,
        symbol: 'none',
        lineStyle: { color: colors.textDim, width: 1, type: 'dashed' },
      }] : []),
    ],
  };
}

export default function SupplyDemand({ supplyDemandData }) {
  const { colors } = useTheme();
  if (!supplyDemandData) return null;
  const {
    crudeStocks     = { periods: [], values: [], avg5yr: null },
    natGasStorage   = { periods: [], values: [], avg5yr: null },
    crudeProduction = { periods: [], values: [] },
  } = supplyDemandData;

  return (
    <div className="com-panel">
      <div className="com-panel-header">
        <span className="com-panel-title">Supply &amp; Demand Monitor</span>
        <span className="com-panel-subtitle">EIA weekly data — US energy inventory and output</span>
      </div>
      <div className="com-sd-grid">
        <div className="com-sd-panel">
          <div className="com-sd-title">US Crude Oil Stocks</div>
          <div className="com-sd-subtitle">Weekly inventory (million barrels) vs 5-year average</div>
          <div className="com-sd-chart">
            <ReactECharts
              option={buildStocksOption('Crude Stocks', crudeStocks.periods, crudeStocks.values, crudeStocks.avg5yr, colors)}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        <div className="com-sd-panel">
          <div className="com-sd-title">Natural Gas Storage</div>
          <div className="com-sd-subtitle">Weekly storage (Bcf) vs 5-year average</div>
          <div className="com-sd-chart">
            <ReactECharts
              option={buildStocksOption('Nat Gas Storage', natGasStorage.periods, natGasStorage.values, natGasStorage.avg5yr, colors)}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
        <div className="com-sd-panel">
          <div className="com-sd-title">US Crude Production</div>
          <div className="com-sd-subtitle">Weekly output (million barrels/day) — 52-week trend</div>
          <div className="com-sd-chart">
            <ReactECharts
              option={buildStocksOption('Production', crudeProduction.periods, crudeProduction.values, null, colors)}
              style={{ height: '100%', width: '100%' }}
            />
          </div>
        </div>
      </div>
      <div className="com-panel-footer">Source: EIA API v2 · Weekly releases · Crude stocks released Wednesdays · Nat gas released Thursdays</div>
    </div>
  );
}
