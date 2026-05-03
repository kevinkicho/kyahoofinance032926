import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import DataFooter from '../../../components/DataFooter/DataFooter';
import { useTheme } from '../../../hub/ThemeContext';
import './EquitiesDeepDiveDashboard.css';

function fmtShares(v) {
  if (v == null) return '\u2014';
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function fmtValue(v) {
  if (v == null) return '\u2014';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v}`;
}

function txColor(type) {
  if (!type) return 'var(--text-secondary)';
  const t = type.toLowerCase();
  if (t.includes('purchase') || t.includes('buy')) return '#22c55e';
  if (t.includes('sale') || t.includes('sell')) return '#ef4444';
  return '#6366f1';
}

function buildTxByTickerOption(transactions, colors) {
  const byTicker = {};
  transactions.forEach(t => {
    if (!byTicker[t.ticker]) byTicker[t.ticker] = { buys: 0, sells: 0 };
    const ty = (t.type || '').toLowerCase();
    if (ty.includes('purchase') || ty.includes('buy')) byTicker[t.ticker].buys += (t.value || 0);
    else if (ty.includes('sale') || ty.includes('sell')) byTicker[t.ticker].sells += (t.value || 0);
  });
  const tickers = Object.keys(byTicker).slice(0, 10);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const ticker = tickers[params[0].dataIndex];
        const d = byTicker[ticker];
        return `${ticker}<br/>Buys: ${fmtValue(d.buys)}<br/>Sells: ${fmtValue(d.sells)}`;
      },
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => fmtValue(v) },
    },
    yAxis: {
      type: 'category',
      data: tickers,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 10 },
    },
    series: [
      {
        name: 'Buys',
        type: 'bar',
        stack: 'total',
        data: tickers.map(t => ({ value: byTicker[t].buys, itemStyle: { color: '#22c55e' } })),
        barWidth: '60%',
      },
      {
        name: 'Sells',
        type: 'bar',
        stack: 'total',
        data: tickers.map(t => ({ value: -byTicker[t].sells, itemStyle: { color: '#ef4444' } })),
      },
    ],
  };
}

function buildInsiderHoldersOption(holders, colors) {
  const top = holders.slice(0, 10);
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => `${params[0].name}: ${fmtShares(params[0].value)}`,
    },
    grid: { top: 8, right: 40, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => fmtShares(v) },
    },
    yAxis: {
      type: 'category',
      data: top.map(h => h.name.length > 14 ? h.name.slice(0, 14) + '\u2026' : h.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: colors.textSecondary, fontSize: 9 },
    },
    series: [{
      type: 'bar',
      data: top.map(h => ({
        value: h.shares,
        itemStyle: { color: '#6366f1' },
      })),
      barWidth: '60%',
    }],
  };
}

export default function InsiderTrading({ insiderData, isLive, lastUpdated, fetchLog, error, fetchedOn, isCurrent }) {
  const { colors } = useTheme();
  const { holders = [], transactions = [] } = insiderData ?? {};

  const txByTickerOption = useMemo(() => transactions.length > 0 ? buildTxByTickerOption(transactions, colors) : null, [transactions, colors]);
  const holdersOption = useMemo(() => holders.length > 0 ? buildInsiderHoldersOption(holders, colors) : null, [holders, colors]);

  const kpis = useMemo(() => {
    if (!transactions.length) return null;
    const buys = transactions.filter(t => { const ty = (t.type || '').toLowerCase(); return ty.includes('purchase') || ty.includes('buy'); });
    const sells = transactions.filter(t => { const ty = (t.type || '').toLowerCase(); return ty.includes('sale') || ty.includes('sell'); });
    const totalBuyValue = buys.reduce((s, t) => s + (t.value || 0), 0);
    const totalSellValue = sells.reduce((s, t) => s + (t.value || 0), 0);
    const uniqueTickers = new Set(transactions.map(t => t.ticker)).size;
    return { buyCount: buys.length, sellCount: sells.length, totalBuyValue, totalSellValue, uniqueTickers };
  }, [transactions]);

  if (!insiderData) return null;

  return (
    <div className="eq-panel">
      <div className="eq-panel-header">
        <span className="eq-panel-title">Insider Trading</span>
        <span className="eq-panel-subtitle">Recent insider buys/sells from SEC Form 4 filings</span>
      </div>
      {kpis && (
        <div className="eq-kpi-strip">
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Buys</span>
            <span className="eq-kpi-value positive">{kpis.buyCount}</span>
            <span className="eq-kpi-sub">{fmtValue(kpis.totalBuyValue)}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Sells</span>
            <span className="eq-kpi-value negative">{kpis.sellCount}</span>
            <span className="eq-kpi-sub">{fmtValue(kpis.totalSellValue)}</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Tickers</span>
            <span className="eq-kpi-value accent">{kpis.uniqueTickers}</span>
            <span className="eq-kpi-sub">tracked</span>
          </div>
          <div className="eq-kpi-pill">
            <span className="eq-kpi-label">Net</span>
            <span className="eq-kpi-value" style={{ color: kpis.totalBuyValue - kpis.totalSellValue >= 0 ? '#22c55e' : '#ef4444' }}>
              {fmtValue(kpis.totalBuyValue - kpis.totalSellValue)}
            </span>
            <span className="eq-kpi-sub">buy - sell</span>
          </div>
        </div>
      )}
      <div className="eq-two-col">
        {txByTickerOption && (
          <div className="eq-chart-panel">
            <div className="eq-chart-title">Transactions by Ticker</div>
            <div className="eq-chart-subtitle">Green = buys · Red = sells · Value-weighted</div>
            <div className="eq-chart-wrap">
              <SafeECharts option={txByTickerOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Insider Transactions by Ticker', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [] }} />
            </div>
          </div>
        )}
        {holdersOption && (
          <div className="eq-chart-panel">
            <div className="eq-chart-title">Top Insider Holders</div>
            <div className="eq-chart-subtitle">By shares held</div>
            <div className="eq-chart-wrap">
              <SafeECharts option={holdersOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Top Insider Holders', source: 'Yahoo Finance', endpoint: '/api/equityDeepDive', series: [] }} />
            </div>
          </div>
        )}
      </div>
      {transactions.length > 0 && (
        <div className="inst-section">
          <div className="inst-section-title">Recent Transactions</div>
          <div className="eq-scroll">
            <table className="eqd-table">
              <thead>
                <tr>
                  <th className="eqd-th">Date</th>
                  <th className="eqd-th">Ticker</th>
                  <th className="eqd-th">Insider</th>
                  <th className="eqd-th">Title</th>
                  <th className="eqd-th">Type</th>
                  <th className="eqd-th">Shares</th>
                  <th className="eqd-th">Value</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 15).map((t, i) => (
                  <tr key={i} className="eqd-row">
                    <td className="eqd-cell eqd-date">{t.date || '\u2014'}</td>
                    <td className="eqd-cell"><strong>{t.ticker}</strong></td>
                    <td className="eqd-cell eqd-name">{t.name || '\u2014'}</td>
                    <td className="eqd-cell eqd-name">{t.title || '\u2014'}</td>
                    <td className="eqd-cell eqd-dir" style={{ color: txColor(t.type) }}>
                      {(t.type || '').toLowerCase().includes('purchase') || (t.type || '').toLowerCase().includes('buy') ? 'Buy' :
                       (t.type || '').toLowerCase().includes('sale') || (t.type || '').toLowerCase().includes('sell') ? 'Sell' : t.type || '\u2014'}
                    </td>
                    <td className="eqd-cell eqd-num">{fmtShares(t.shares)}</td>
                    <td className="eqd-cell eqd-num">{fmtValue(t.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="inst-panel-footer">
        Data from Yahoo Finance insiderHolders &amp; insiderTransactions · SEC Form 4 filings
      </div>
    </div>
  );
}