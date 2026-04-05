import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import './DerivComponents.css';

export default function VolSurface({ volSurfaceData, volPremium = null }) {
  const { strikes, expiries, grid } = volSurfaceData;

  const option = useMemo(() => {
    const data = [];
    expiries.forEach((_, ei) => {
      strikes.forEach((_, si) => {
        data.push([si, ei, grid[ei][si]]);
      });
    });

    const allVols = grid.flat();
    const minVol  = Math.min(...allVols);
    const maxVol  = Math.max(...allVols);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        formatter: (params) => {
          const [si, ei, vol] = params.data;
          return `<b>${expiries[ei]} / ${strikes[si]}%</b><br/>IV: <b>${vol.toFixed(1)}%</b>`;
        },
      },
      grid: { top: 60, right: 100, bottom: 40, left: 60 },
      xAxis: {
        type: 'category',
        data: strikes.map(s => `${s}%`),
        name: 'Strike (% of spot)',
        nameLocation: 'middle',
        nameGap: 28,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'category',
        data: expiries,
        name: 'Expiry',
        nameLocation: 'middle',
        nameGap: 42,
        nameTextStyle: { color: '#64748b', fontSize: 10 },
        axisLabel: { color: '#64748b', fontSize: 11 },
        axisLine: { lineStyle: { color: '#1e293b' } },
        splitLine: { show: false },
      },
      visualMap: {
        min: minVol,
        max: maxVol,
        calculable: true,
        orient: 'vertical',
        right: 10,
        top: 60,
        textStyle: { color: '#64748b', fontSize: 10 },
        inRange: {
          color: ['#1e3a5f', '#2563eb', '#7c3aed', '#db2777', '#ef4444'],
        },
      },
      series: [{
        type: 'heatmap',
        data,
        label: { show: true, fontSize: 9, color: '#e2e8f0', formatter: p => p.data[2].toFixed(1) },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      }],
    };
  }, [volSurfaceData]);

  return (
    <div className="deriv-panel">
      <div className="deriv-panel-header">
        <span className="deriv-panel-title">Vol Surface</span>
        <span className="deriv-panel-subtitle">SPX implied volatility · strike % of spot × expiry</span>
      </div>
      <div className="deriv-chart-wrap">
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>
      {volPremium && (
        <div className="vol-premium-row">
          <div className="vol-premium-pill">
            <span className="vol-premium-label">ATM 1M IV</span>
            <span className="vol-premium-value">{volPremium.atm1mIV.toFixed(1)}%</span>
          </div>
          <div className="vol-premium-pill">
            <span className="vol-premium-label">30d Realized</span>
            <span className="vol-premium-value">{volPremium.realizedVol30d.toFixed(1)}%</span>
          </div>
          <div className="vol-premium-pill">
            <span className="vol-premium-label">IV Premium</span>
            <span className={`vol-premium-value ${volPremium.premium >= 0 ? 'vol-premium-pos' : 'vol-premium-neg'}`}>
              {volPremium.premium >= 0 ? '+' : ''}{volPremium.premium.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      <div className="deriv-panel-footer">
        IV % · Volatility smile: OTM puts carry higher IV than ATM (skew) · Darker = lower vol
        {volPremium && ' · Vol Risk Premium = IV − Realized'}
      </div>
    </div>
  );
}
