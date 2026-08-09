import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import { useTheme } from '../../../hub/ThemeContext';
import './EquitiesDeepDiveDashboard.css';

function fmtShares(v) {
  if (v == null || !Number.isFinite(Number(v))) return '\u2014';
  const n = Number(v);
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(Math.round(n));
}

function fmtValue(v) {
  if (v == null || !Number.isFinite(Number(v))) return '\u2014';
  const n = Number(v);
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`;
  return `$${Math.round(n)}`;
}

/** Normalize buy/sell/other from Yahoo type or free-text description. */
function classifyTx(type, text = '') {
  const s = `${type || ''} ${text || ''}`.toLowerCase();
  if (!s.trim()) return { kind: 'other', label: '—' };
  if (s.includes('purchase') || s.includes('buy') || s.includes('acquisition')) {
    return { kind: 'buy', label: 'Buy' };
  }
  if (s.includes('sale') || s.includes('sell') || s.includes('disposition')) {
    return { kind: 'sell', label: 'Sell' };
  }
  if (s.includes('gift')) return { kind: 'other', label: 'Gift' };
  if (s.includes('award') || s.includes('option') || s.includes('exercise')) {
    return { kind: 'other', label: 'Award' };
  }
  const raw = (type || text || '').trim();
  return { kind: 'other', label: raw ? raw.slice(0, 18) : '—' };
}

function txColor(kind) {
  if (kind === 'buy') return '#22c55e';
  if (kind === 'sell') return '#ef4444';
  return '#6366f1';
}

function buildTxByTickerOption(transactions, colors) {
  const byTicker = {};
  transactions.forEach(t => {
    if (!t.ticker) return;
    if (!byTicker[t.ticker]) byTicker[t.ticker] = { buys: 0, sells: 0, other: 0, count: 0 };
    const { kind } = classifyTx(t.type, t.text);
    // Prefer $ value; fall back to share count so hollow-value rows still chart.
    const weight = Number.isFinite(Number(t.value)) && Number(t.value) > 0
      ? Number(t.value)
      : (Number.isFinite(Number(t.shares)) ? Number(t.shares) : 0);
    if (kind === 'buy') byTicker[t.ticker].buys += weight;
    else if (kind === 'sell') byTicker[t.ticker].sells += weight;
    else byTicker[t.ticker].other += weight;
    byTicker[t.ticker].count += 1;
  });
  const tickers = Object.keys(byTicker)
    .sort((a, b) => {
      const ta = byTicker[a].buys + byTicker[a].sells + byTicker[a].other;
      const tb = byTicker[b].buys + byTicker[b].sells + byTicker[b].other;
      return tb - ta;
    })
    .slice(0, 10);
  if (!tickers.length) return null;
  const usesValue = transactions.some(t => Number(t.value) > 0);
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
        const f = usesValue ? fmtValue : fmtShares;
        const net = d.buys - d.sells;
        const netLine = `<br/>Net: <b style="color:${net >= 0 ? '#22c55e' : '#ef4444'}">${net >= 0 ? '+' : ''}${f(net)}</b>`;
        return `${ticker}<br/>Buys: ${f(d.buys)}<br/>Sells: ${f(d.sells)}${netLine}${d.other ? `<br/>Other: ${f(d.other)}` : ''}<br/>${d.count} transaction${d.count !== 1 ? 's' : ''}`;
      },
    },
    grid: { top: 8, right: 8, bottom: 8, left: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: colors.cardBg } },
      splitLine: { lineStyle: { color: colors.cardBg } },
      axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => (usesValue ? fmtValue(v) : fmtShares(v)) },
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
  const top = holders.filter(h => h.shares != null && Number(h.shares) > 0).slice(0, 10);
  if (!top.length) return null;
  return {
    animation: false,
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: (params) => {
        const h = top[params[0].dataIndex];
        const role = (h?.title || h?.relation || '').trim();
        const roleLine = role ? `<br/>${role}` : '';
        const lastTx = h?.lastTx ? `<br/>Last: ${h.lastTx}${h?.date ? ` (${h.date})` : ''}` : '';
        return `${h?.name || params[0].name}${h?.ticker ? ` (${h.ticker})` : ''}${roleLine}<br/>${fmtShares(params[0].value)} shares${lastTx}`;
      },
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
      data: top.map(h => {
        const label = h.name || h.ticker || '—';
        return label.length > 14 ? `${label.slice(0, 14)}\u2026` : label;
      }),
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

export default function InsiderTrading({ insiderData }) {
  const { colors } = useTheme();
  const { holders = [], transactions = [] } = insiderData ?? {};

  // Prefer rows with identity + size; keep table dense instead of 40 hollow cells.
  const displayTx = useMemo(() => {
    return [...transactions]
      .filter(t => t && (t.shares != null || t.value != null || t.name))
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 15);
  }, [transactions]);

  const displayHolders = useMemo(() => {
    return [...holders]
      .filter(h => h && (h.shares != null || h.name))
      .sort((a, b) => (Number(b.shares) || 0) - (Number(a.shares) || 0));
  }, [holders]);

  const showTitleCol = useMemo(
    () => displayTx.some(t => (t.title || t.relation || '').trim()),
    [displayTx],
  );

  const txByTickerOption = useMemo(
    () => (transactions.length > 0 ? buildTxByTickerOption(transactions, colors) : null),
    [transactions, colors],
  );
  const holdersOption = useMemo(
    () => (displayHolders.length > 0 ? buildInsiderHoldersOption(displayHolders, colors) : null),
    [displayHolders, colors],
  );

  const kpis = useMemo(() => {
    if (!transactions.length) return null;
    let buyCount = 0;
    let sellCount = 0;
    let otherCount = 0;
    let totalBuyValue = 0;
    let totalSellValue = 0;
    transactions.forEach(t => {
      const { kind } = classifyTx(t.type, t.text);
      const val = Number(t.value);
      const hasVal = Number.isFinite(val) && val > 0;
      if (kind === 'buy') {
        buyCount += 1;
        if (hasVal) totalBuyValue += val;
      } else if (kind === 'sell') {
        sellCount += 1;
        if (hasVal) totalSellValue += val;
      } else {
        otherCount += 1;
      }
    });
    const uniqueTickers = new Set(transactions.map(t => t.ticker).filter(Boolean)).size;
    return {
      buyCount,
      sellCount,
      otherCount,
      totalBuyValue,
      totalSellValue,
      uniqueTickers,
      net: totalBuyValue - totalSellValue,
    };
  }, [transactions]);

  if (!insiderData) return null;
  if (!displayTx.length && !displayHolders.length) {
    return (
      <div className="eq-panel">
        <div className="eq-panel-empty">No insider filings in the current snapshot.</div>
      </div>
    );
  }

  return (
    <div className="eq-panel eq-insider-panel">
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
            <span className="eq-kpi-label">Net $</span>
            <span
              className="eq-kpi-value"
              style={{ color: kpis.net >= 0 ? '#22c55e' : '#ef4444' }}
            >
              {fmtValue(kpis.net)}
            </span>
            <span className="eq-kpi-sub">buy − sell</span>
          </div>
        </div>
      )}

      {(txByTickerOption || holdersOption) && (
        <div className={`eq-two-col ${!(txByTickerOption && holdersOption) ? 'eq-two-col--single' : ''}`}>
          {txByTickerOption && (
            <div className="eq-chart-panel">
              <div className="eq-chart-title">Transactions by Ticker</div>
              <div className="eq-chart-subtitle">Green = buys · Red = sells</div>
              <div className="eq-chart-wrap">
                <SafeECharts
                  option={txByTickerOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{
                    title: 'Insider Transactions by Ticker',
                    source: 'Yahoo Finance',
                    endpoint: '/api/equityDeepDive',
                    series: [],
                  }}
                />
              </div>
            </div>
          )}
          {holdersOption && (
            <div className="eq-chart-panel">
              <div className="eq-chart-title">Top Insider Holders</div>
              <div className="eq-chart-subtitle">Direct position · shares held</div>
              <div className="eq-chart-wrap">
                <SafeECharts
                  option={holdersOption}
                  style={{ height: '100%', width: '100%' }}
                  sourceInfo={{
                    title: 'Top Insider Holders',
                    source: 'Yahoo Finance',
                    endpoint: '/api/equityDeepDive',
                    series: [],
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {displayHolders.length > 0 && (
        <div className="inst-section">
          <div className="inst-section-title">Top Insider Holders</div>
          <div className="eq-scroll">
            <table className="eqd-table">
              <thead>
                <tr>
                  <th className="eqd-th">Ticker</th>
                  <th className="eqd-th">Insider</th>
                  <th className="eqd-th">Role</th>
                  <th className="eqd-th">Shares</th>
                  <th className="eqd-th">Last Tx</th>
                </tr>
              </thead>
              <tbody>
                {displayHolders.slice(0, 10).map((h, i) => {
                  const cls = classifyTx('', h.lastTx);
                  return (
                    <tr key={`${h.ticker}-${h.name}-${i}`} className="eqd-row">
                      <td className="eqd-cell"><strong>{h.ticker || '\u2014'}</strong></td>
                      <td className="eqd-cell eqd-name">{h.name || '\u2014'}</td>
                      <td className="eqd-cell eqd-name">{(h.title || h.relation || '').trim() || '\u2014'}</td>
                      <td className="eqd-cell eqd-num">{fmtShares(h.shares)}</td>
                      <td className="eqd-cell eqd-dir" style={{ color: txColor(cls.kind) }} title={h.date ? `Last transaction ${h.date}` : ''}>
                        {h.lastTx || '\u2014'}{h.date ? ` · ${h.date}` : ''}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {displayTx.length > 0 && (
        <div className="inst-section">
          <div className="inst-section-title">Recent Transactions</div>
          <div className="eq-scroll">
            <table className="eqd-table">
              <thead>
                <tr>
                  <th className="eqd-th">Date</th>
                  <th className="eqd-th">Ticker</th>
                  <th className="eqd-th">Insider</th>
                  {showTitleCol && <th className="eqd-th">Role</th>}
                  <th className="eqd-th">Type</th>
                  <th className="eqd-th">Shares</th>
                  <th className="eqd-th">Value</th>
                </tr>
              </thead>
              <tbody>
                {displayTx.map((t, i) => {
                  const cls = classifyTx(t.type, t.text);
                  const role = (t.title || t.relation || '').trim();
                  return (
                    <tr key={`${t.ticker}-${t.date}-${t.name}-${i}`} className="eqd-row">
                      <td className="eqd-cell eqd-date">{t.date || '\u2014'}</td>
                      <td className="eqd-cell"><strong>{t.ticker || '\u2014'}</strong></td>
                      <td className="eqd-cell eqd-name">{t.name || '\u2014'}</td>
                      {showTitleCol && <td className="eqd-cell eqd-name">{role || '\u2014'}</td>}
                      <td className="eqd-cell eqd-dir" style={{ color: txColor(cls.kind) }} title={t.text || ''}>
                        {cls.label}
                      </td>
                      <td className="eqd-cell eqd-num">{fmtShares(t.shares)}</td>
                      <td className="eqd-cell eqd-num">{fmtValue(t.value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="inst-panel-footer">
        Yahoo Finance insiderHolders &amp; insiderTransactions · SEC Form 4
      </div>
    </div>
  );
}
