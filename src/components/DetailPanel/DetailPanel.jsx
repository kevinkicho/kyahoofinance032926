import React, { useState } from 'react';
import SafeECharts from '../SafeECharts';
import './DetailPanel.css';
import { useTheme } from '../../hub/ThemeContext';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmtNum = (n, prefix = '') => {
  if (n == null || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `${prefix}${(n / 1e6).toFixed(1)}M`;
  return `${prefix}${n.toLocaleString()}`;
};

const fmtPct = (n) => (n != null && !isNaN(n)) ? `${(n * 100).toFixed(1)}%` : '—';

// ─── Fair Value Model ────────────────────────────────────────────────────────

const computeFairValue = (ticker, details, scenarios) => {
  let hash = 0;
  for (let i = 0; i < ticker.length; i++) hash = ticker.charCodeAt(i) + ((hash << 5) - hash);
  const seed = Math.abs(hash);
  const rand = (min, max) => min + (seed % 1000) / 1000 * (max - min);

  const sectorPE = {
    Technology: 28, Financials: 12, Healthcare: 22,
    Energy: 14, Consumer: 18, Industrials: 16
  };
  const basePE = sectorPE[ticker.sector] || 18;
  const rateAdj = scenarios.interestRate / 10000;
  const inflAdj = (scenarios.inflation - 2) / 100;
  const adjustedPE = basePE * (1 - rateAdj * 3) * (1 - inflAdj * 0.5);
  const rawPrice = parseFloat((details.price || '100').replace(/[^0-9.]/g, '')) || rand(50, 500);
  const currentEPS = rawPrice / (parseFloat(details.pe) || rand(12, 35));
  const fairPrice = adjustedPE * currentEPS;
  const pctDiff = ((fairPrice - rawPrice) / rawPrice) * 100;
  const upside = pctDiff > 0;
  const beta = parseFloat(details.beta) || 1;
  const adjVol = 0.25 * beta * (1 + Math.abs(rateAdj) * 2);
  return {
    fairPrice, rawPrice, pctDiff, upside,
    rangeHigh: fairPrice * (1 + adjVol),
    rangeLow:  fairPrice * (1 - adjVol * 0.6),
    adjustedPE
  };
};

const FairValueBar = ({ rawPrice, fairPrice, rangeLow, rangeHigh, sym }) => {
  const total = rangeHigh - rangeLow;
  const curPos  = Math.min(100, Math.max(0, ((rawPrice  - rangeLow) / total) * 100));
  const fairPos = Math.min(100, Math.max(0, ((fairPrice - rangeLow) / total) * 100));
  return (
    <div className="fv-bar-wrap">
      <div className="fv-bar-track">
        <div className="fv-bar-fill" style={{ width: `${fairPos}%` }} />
        <div className="fv-bar-cursor" style={{ left: `${curPos}%` }}  title={`Current: ${sym}${rawPrice.toFixed(0)}`} />
        <div className="fv-bar-target" style={{ left: `${fairPos}%` }} title={`Fair Value: ${sym}${fairPrice.toFixed(0)}`} />
      </div>
      <div className="fv-bar-labels">
        <span>{sym}{rangeLow.toFixed(0)}</span>
        <span>12-mo Range</span>
        <span>{sym}{rangeHigh.toFixed(0)}</span>
      </div>
    </div>
  );
};

// ─── Chart Tab ───────────────────────────────────────────────────────────────

const PERIOD_DAYS = { '1m': 22, '3m': 66, '6m': 132, '1y': 252, '3y': 756, '5y': 1260 };
const PERIOD_LABEL = { '1m': '1-Month', '3m': '3-Month', '6m': '6-Month', '1y': '1-Year', '3y': '3-Year', '5y': '5-Year' };

const ChartTab = ({ historyData, sym }) => {
  const { colors } = useTheme();
  const [period, setPeriod] = useState('1y');
  const [view, setView] = useState('chart');

  if (!historyData || historyData.length === 0) {
    return (
      <div className="no-live-data">
        <p>Price chart requires the Express backend.</p>
        <code>cd server &amp;&amp; npm start</code>
      </div>
    );
  }

  const sliced = historyData.slice(-PERIOD_DAYS[period]);
  const closes = sliced.map(d => d.close);
  const first = closes[0];
  const last  = closes[closes.length - 1];
  const changePct = first ? ((last - first) / first) * 100 : 0;
  const isUp = changePct >= 0;
  const lineColor = isUp ? '#22c55e' : '#ef4444';
  const areaColor = isUp ? 'rgba(34,197,94,' : 'rgba(239,68,68,';

  const option = {
    backgroundColor: 'transparent',
    grid: { left: '2%', right: '8%', top: '10%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: sliced.map(d => d.date),
      boundaryGap: false,
      axisLine:  { lineStyle: { color: colors.border } },
      axisTick:  { show: false },
      axisLabel: { color: colors.textMuted, fontSize: 10, interval: 'auto', formatter: v => v.slice(5) },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      position: 'right',
      scale: true,
      axisLine:  { show: false },
      axisTick:  { show: false },
      axisLabel: { color: colors.textMuted, fontSize: 10, formatter: v => `${sym}${v}` },
      splitLine: { lineStyle: { color: colors.cardBg, type: 'dashed' } },
    },
    series: [{
      type: 'line',
      data: closes.map(c => c?.toFixed(2)),
      smooth: 0.3,
      lineStyle: { color: lineColor, width: 1.5 },
      showSymbol: false,
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: `${areaColor}0.28)` },
            { offset: 1, color: `${areaColor}0.01)` },
          ],
        },
      },
    }],
    tooltip: {
      trigger: 'axis',
      backgroundColor: colors.tooltipBg,
      borderColor: colors.tooltipBorder,
      textStyle: { color: colors.text, fontSize: 11 },
      formatter: params => `${params[0].axisValue}<br/><b>${sym}${params[0].value}</b>`,
    },
  };

  const tableRows = sliced.slice().reverse();

  return (
    <div className="chart-tab">
      <div className="chart-controls">
        <div className="chart-period-toggle">
          {Object.keys(PERIOD_DAYS).map(p => (
            <button
              key={p}
              className={period === p ? 'chart-period-btn active' : 'chart-period-btn'}
              onClick={() => setPeriod(p)}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="chart-view-toggle">
          <button className={view === 'chart' ? 'chart-view-btn active' : 'chart-view-btn'} onClick={() => setView('chart')}>Chart</button>
          <button className={view === 'table' ? 'chart-view-btn active' : 'chart-view-btn'} onClick={() => setView('table')}>Table</button>
        </div>
      </div>

      <div className="chart-header">
        <span className="chart-period-label">{PERIOD_LABEL[period]} Performance</span>
        <span className={`chart-pct ${isUp ? 'text-green' : 'text-red'}`}>
          {isUp ? '+' : ''}{changePct.toFixed(2)}%
        </span>
      </div>

      {view === 'chart' ? (
        <SafeECharts option={option} style={{ height: '220px' }} opts={{ renderer: 'canvas' }} />
      ) : (
        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th><th>Open</th><th>High</th><th>Low</th><th>Close</th><th>Volume</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.date}>
                  <td>{r.date}</td>
                  <td>{r.open != null ? `${sym}${r.open.toFixed(2)}` : '—'}</td>
                  <td>{r.high != null ? `${sym}${r.high.toFixed(2)}` : '—'}</td>
                  <td>{r.low  != null ? `${sym}${r.low.toFixed(2)}`  : '—'}</td>
                  <td><strong>{r.close != null ? `${sym}${r.close.toFixed(2)}` : '—'}</strong></td>
                  <td>{r.volume != null ? r.volume.toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="history-table-meta">{tableRows.length.toLocaleString()} daily bars</div>
        </div>
      )}
    </div>
  );
};

// ─── Fundamentals Tab ────────────────────────────────────────────────────────

// Compact 2-column grid cell
const G = ({ label, value, color }) => (
  <div className="fg-cell">
    <span className="fg-label">{label}</span>
    <strong className={`fg-value${color ? ` text-${color}` : ''}`}>{value ?? '—'}</strong>
  </div>
);

const FundamentalsTab = ({ summaryData, sym }) => {
  if (!summaryData?.financialData) {
    return (
      <div className="no-live-data">
        <p>Fundamentals require the Express backend.</p>
        <code>cd server &amp;&amp; npm start</code>
      </div>
    );
  }

  const fd = summaryData.financialData;
  const ks = summaryData.defaultKeyStatistics || {};
  const g  = (v, hi) => v == null ? '' : v >= hi ? 'green' : 'red';  // green if above threshold
  const gPct = (v) => v == null ? '' : v >= 0 ? 'green' : 'red';

  return (
    <div className="fg-wrap">

      <div className="fg-section-hdr">Income &amp; Growth</div>
      <div className="fg-grid">
        <G label="Total Revenue"    value={fmtNum(fd.totalRevenue, sym)} />
        <G label="Revenue Growth"   value={fmtPct(fd.revenueGrowth)}    color={gPct(fd.revenueGrowth)} />
        <G label="Gross Margin"     value={fmtPct(fd.grossMargins)} />
        <G label="Operating Margin" value={fmtPct(fd.operatingMargins)} color={gPct(fd.operatingMargins)} />
        <G label="Profit Margin"    value={fmtPct(fd.profitMargins)}    color={gPct(fd.profitMargins)} />
        <G label="Earnings Growth"  value={fmtPct(fd.earningsGrowth)}   color={gPct(fd.earningsGrowth)} />
        <G label="EBITDA Margin"    value={fmtPct(fd.ebitdaMargins)} />
        <G label="EBITDA"           value={fmtNum(fd.ebitda, sym)} />
      </div>

      <div className="fg-section-hdr">Cash Flow &amp; Debt</div>
      <div className="fg-grid">
        <G label="Op. Cash Flow" value={fmtNum(fd.operatingCashflow, sym)} />
        <G label="Free Cash Flow" value={fmtNum(fd.freeCashflow, sym)}   color={gPct(fd.freeCashflow)} />
        <G label="Total Cash"     value={fmtNum(fd.totalCash, sym)} />
        <G label="Total Debt"     value={fmtNum(fd.totalDebt, sym)} />
        <G label="Debt / Equity"  value={fd.debtToEquity?.toFixed(2)}    color={fd.debtToEquity != null ? (fd.debtToEquity < 100 ? 'green' : 'red') : ''} />
        <G label="Current Ratio"  value={fd.currentRatio?.toFixed(2)}    color={g(fd.currentRatio, 1)} />
        <G label="Quick Ratio"    value={fd.quickRatio?.toFixed(2)}      color={g(fd.quickRatio, 1)} />
        <G label="Rev / Share"    value={fd.revenuePerShare != null ? `${sym}${fd.revenuePerShare.toFixed(2)}` : null} />
      </div>

      <div className="fg-section-hdr">Valuation</div>
      <div className="fg-grid">
        <G label="Enterprise Value" value={fmtNum(ks.enterpriseValue, '$')} />
        <G label="EV / Revenue"     value={ks.enterpriseToRevenue != null ? `${ks.enterpriseToRevenue.toFixed(2)}×` : null} />
        <G label="EV / EBITDA"      value={ks.enterpriseToEbitda  != null ? `${ks.enterpriseToEbitda.toFixed(2)}×`  : null} />
        <G label="Price / Book"     value={ks.priceToBook != null ? `${ks.priceToBook.toFixed(2)}×` : null} />
        <G label="Book Val / Share" value={ks.bookValue != null ? `${sym}${ks.bookValue.toFixed(2)}` : null} />
        <G label="Forward EPS"      value={ks.forwardEps != null ? `${sym}${ks.forwardEps.toFixed(2)}` : null} />
        <G label="Forward P/E"      value={ks.forwardPE != null ? `${ks.forwardPE.toFixed(2)}×` : null} />
        <G label="52-Wk Δ"          value={fmtPct(ks['52WeekChange'])} color={gPct(ks['52WeekChange'])} />
      </div>

      <div className="fg-section-hdr">Returns &amp; Ownership</div>
      <div className="fg-grid">
        <G label="ROE"          value={fmtPct(fd.returnOnEquity)}  color={gPct(fd.returnOnEquity)} />
        <G label="ROA"          value={fmtPct(fd.returnOnAssets)} />
        <G label="Shares Out."  value={fmtNum(ks.sharesOutstanding)} />
        <G label="Float"        value={fmtNum(ks.floatShares)} />
        <G label="Insiders"     value={fmtPct(ks.heldPercentInsiders)} />
        <G label="Institutions" value={fmtPct(ks.heldPercentInstitutions)} />
        <G label="Short Ratio"  value={ks.shortRatio?.toFixed(2)} />
        <G label="Short % Float" value={fmtPct(ks.shortPercentOfFloat)} />
      </div>

    </div>
  );
};

// ─── Analysts Tab ────────────────────────────────────────────────────────────

const REC_META = {
  strong_buy:   { label: 'STRONG BUY',   color: '#22c55e' },
  buy:          { label: 'BUY',          color: '#4ade80' },
  hold:         { label: 'HOLD',         color: '#facc15' },
  sell:         { label: 'SELL',         color: '#f97316' },
  strong_sell:  { label: 'STRONG SELL',  color: '#ef4444' },
};

const PERIOD_LABELS = {
  '0q': 'Current Quarter',
  '+1q': 'Next Quarter',
  '0y': 'Current Year',
  '+1y': 'Next Year',
};

const AnalystsTab = ({ summaryData, sym }) => {
  const { colors: tabColors } = useTheme();
  if (!summaryData?.financialData) {
    return (
      <div className="no-live-data">
        <p>Analyst data requires the Express backend.</p>
        <code>cd server &amp;&amp; npm start</code>
      </div>
    );
  }

  const fd  = summaryData.financialData;
  const rt  = summaryData.recommendationTrend?.trend?.[0];
  const et  = summaryData.earningsTrend?.trend || [];
  const key = fd.recommendationKey || '';
  const meta = REC_META[key] || { label: key.toUpperCase(), color: tabColors.textSecondary };

  const segments = rt ? [
    { label: 'Strong Buy',   count: rt.strongBuy,   color: '#22c55e' },
    { label: 'Buy',          count: rt.buy,          color: '#4ade80' },
    { label: 'Hold',         count: rt.hold,         color: '#facc15' },
    { label: 'Sell',         count: rt.sell,         color: '#f97316' },
    { label: 'Strong Sell',  count: rt.strongSell,   color: '#ef4444' },
  ].filter(s => s.count > 0) : [];
  const totalRecs = segments.reduce((s, r) => s + r.count, 0);

  return (
    <div className="analysts-tab">

      {/* Consensus badge */}
      <div className="consensus-block">
        <span className="consensus-pill" style={{ color: meta.color, borderColor: meta.color }}>
          {meta.label || '—'}
        </span>
        <span className="consensus-count">{fd.numberOfAnalystOpinions || '—'} analysts</span>
      </div>

      {/* Price targets */}
      <div className="pt-section">
        <div className="section-label">12-Month Price Targets</div>
        <div className="pt-grid">
          <div className="pt-stat"><span>Mean</span>   <strong style={{ color: '#60a5fa' }}>{sym}{fd.targetMeanPrice?.toFixed(2)   ?? '—'}</strong></div>
          <div className="pt-stat"><span>Median</span> <strong>{sym}{fd.targetMedianPrice?.toFixed(2) ?? '—'}</strong></div>
          <div className="pt-stat"><span>High</span>   <strong className="text-green">{sym}{fd.targetHighPrice?.toFixed(2)   ?? '—'}</strong></div>
          <div className="pt-stat"><span>Low</span>    <strong className="text-red">{sym}{fd.targetLowPrice?.toFixed(2)    ?? '—'}</strong></div>
        </div>
      </div>

      {/* Rating distribution bar */}
      {segments.length > 0 && (
        <div className="rec-dist-section">
          <div className="section-label">Rating Distribution ({totalRecs} total)</div>
          <div className="rec-bar">
            {segments.map(s => (
              <div
                key={s.label}
                className="rec-bar-seg"
                style={{ width: `${(s.count / totalRecs) * 100}%`, backgroundColor: s.color }}
                title={`${s.label}: ${s.count}`}
              />
            ))}
          </div>
          <div className="rec-legend">
            {segments.map(s => (
              <span key={s.label} className="rec-legend-item">
                <span className="rec-dot" style={{ backgroundColor: s.color }} />
                {s.label} ({s.count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* EPS estimates */}
      {et.length > 0 && (
        <div className="eps-section">
          <div className="section-label">EPS Estimates</div>
          {et.slice(0, 4).map(t => {
            const avg = t.earningsEstimate?.avg;
            const lo  = t.earningsEstimate?.low;
            const hi  = t.earningsEstimate?.high;
            return (
              <div key={t.period} className="eps-row">
                <span className="eps-period">{PERIOD_LABELS[t.period] || t.period}</span>
                <div className="eps-vals">
                  <strong>{avg != null ? `${sym}${avg.toFixed(2)}` : '—'}</strong>
                  <span className="eps-range">
                    {(lo != null && hi != null) ? `[${sym}${lo.toFixed(2)} – ${sym}${hi.toFixed(2)}]` : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Data Source Footer + Modal ───────────────────────────────────────────────

const fmtFlexibleDate = (ts) => {
  if (ts == null || ts === '') return null;
  let d;
  if (typeof ts === 'number') d = new Date(ts < 1e12 ? ts * 1000 : ts);
  else if (typeof ts === 'string') d = new Date(ts);
  else if (typeof ts === 'object' && ts.raw != null) {
    const n = Number(ts.raw);
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else return null;
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};
const fmtISODate = (str) => {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const SUMMARY_MODULES = [
  { id: 'financialData',             desc: 'Price targets, margins, cash flow, debt ratios' },
  { id: 'defaultKeyStatistics',      desc: 'Valuation multiples, shares, ownership, most recent quarter' },
  { id: 'earningsTrend',             desc: 'EPS estimates (current/next Q, current/next Y)' },
  { id: 'recommendationTrend',       desc: 'Buy/hold/sell analyst counts' },
  { id: 'majorHoldersBreakdown',     desc: 'Insider and institutional ownership breakdown' },
  { id: 'incomeStatementHistory',    desc: 'Revenue / income (annual, 4 periods)' },
  { id: 'cashflowStatementHistory',  desc: 'Operating / investing / financing cash flows' },
  { id: 'balanceSheetHistory',       desc: 'Assets, liabilities, equity (annual)' },
];

const SourceInfoModal = ({ ticker, region, summaryData, historyData, isLive, onClose }) => {
  const quarterDate  = fmtFlexibleDate(summaryData?.defaultKeyStatistics?.mostRecentQuarter);
  const firstPrice   = historyData?.length ? fmtISODate(historyData[0].date) : null;
  const lastPrice    = historyData?.length ? fmtISODate(historyData[historyData.length - 1].date) : null;
  const barsCount    = historyData?.length || 0;
  const enc          = encodeURIComponent(ticker);
  const regionQS     = region ? `?region=${encodeURIComponent(region)}` : '';
  const yahooLink    = `https://finance.yahoo.com/quote/${enc}`;

  return (
    <div className="source-modal-overlay" onClick={onClose}>
      <div className="source-modal" onClick={(e) => e.stopPropagation()}>
        <div className="source-modal-header">
          <h3>Data Sources · {ticker}</h3>
          <button className="source-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="source-modal-body">
          <div className="source-section">
            <div className="source-section-title">Provider</div>
            <div className="source-row">
              <span className="source-label">Yahoo Finance</span>
              <span className={`source-badge ${isLive ? 'live' : 'cached'}`}>{isLive ? '● LIVE' : '○ CACHED'}</span>
            </div>
            <a className="source-link" href={yahooLink} target="_blank" rel="noreferrer">View on finance.yahoo.com ↗</a>
          </div>

          <div className="source-section">
            <div className="source-section-title">Endpoints Hit</div>
            <div className="endpoint-row">
              <code>POST /api/stocks</code>
              <span className="endpoint-desc">Real-time quote: price, change, OHLC, bid/ask, 52w range, PE, EPS, beta</span>
            </div>
            <div className="endpoint-row">
              <code>GET /api/summary/{enc}{regionQS}</code>
              <span className="endpoint-desc">Fundamentals via <em>yf.quoteSummary</em> (8 modules below)</span>
            </div>
            <div className="endpoint-row">
              <code>GET /api/history/{enc}?period=5y{region ? `&region=${encodeURIComponent(region)}` : ''}</code>
              <span className="endpoint-desc">Daily OHLCV bars via <em>yf.historical</em></span>
            </div>
          </div>

          <div className="source-section">
            <div className="source-section-title">Summary Modules</div>
            <div className="module-list">
              {SUMMARY_MODULES.map(m => {
                const present = summaryData && summaryData[m.id] != null;
                return (
                  <div key={m.id} className="module-row">
                    <span className={`module-dot ${present ? 'ok' : 'missing'}`} />
                    <code>{m.id}</code>
                    <span className="module-desc">{m.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="source-section">
            <div className="source-section-title">Coverage &amp; Freshness</div>
            <div className="coverage-grid">
              <div><span>Fundamentals as-of</span><strong>{quarterDate || '—'}</strong></div>
              <div><span>Price range</span><strong>{firstPrice && lastPrice ? `${firstPrice} – ${lastPrice}` : '—'}</strong></div>
              <div><span>Daily bars</span><strong>{barsCount.toLocaleString()}</strong></div>
              <div><span>Summary cache TTL</span><strong>30 min</strong></div>
              <div><span>History cache TTL</span><strong>60 min</strong></div>
              <div><span>Auto-refresh</span><strong>Manual (▶ button)</strong></div>
            </div>
          </div>

          <div className="source-footer-note">
            Data fetched via the Express backend. When local cache is ≥2 days stale, a delta fetch from Yahoo fills the gap on request.
          </div>
        </div>
      </div>
    </div>
  );
};

const DataFooter = ({ summaryData, historyData, isLive, onOpenModal }) => {
  const quarterDate = fmtFlexibleDate(summaryData?.defaultKeyStatistics?.mostRecentQuarter);
  const firstPrice  = historyData?.length ? fmtISODate(historyData[0].date) : null;
  const lastPrice   = historyData?.length ? fmtISODate(historyData[historyData.length - 1].date) : null;

  return (
    <button type="button" className="data-footer data-footer-btn" onClick={onOpenModal} title="View data source details">
      <span className="data-footer-source">Yahoo Finance{isLive ? ' · LIVE' : ''}</span>
      {quarterDate && <span className="data-footer-sep">·</span>}
      {quarterDate && <span>Fundamentals: {quarterDate}</span>}
      {firstPrice && lastPrice && <span className="data-footer-sep">·</span>}
      {firstPrice && lastPrice && <span>Prices: {firstPrice}–{lastPrice}</span>}
      <span className="data-footer-sep">·</span>
      <span className="data-footer-cta">sources ↗</span>
    </button>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'summary',      label: 'Summary' },
  { id: 'chart',        label: 'Chart' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'analysts',     label: 'Analysts' },
  { id: 'fairvalue',    label: 'Fair Value' },
];

const DetailPanel = ({ selectedTicker, setSelectedTicker }) => {
  const { details, summaryData, historyData } = selectedTicker;
  const isCrypto = selectedTicker.sector === 'Crypto';
  const [activeTab, setActiveTab] = useState('summary');
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const sym = selectedTicker.regionSymbol || '$';
  const fv = computeFairValue(
    selectedTicker, details,
    { riskAppetite: 50, interestRate: 0, inflation: 2 }
  );

  return (
    <div className="detail-panel-content">
      <div className="detail-header">
        <div>
          <h2 className="detail-ticker">
            {selectedTicker.ticker}
            {selectedTicker.isLive && <span className="live-pill">LIVE</span>}
          </h2>
          <p className="detail-region">{selectedTicker.region} ({selectedTicker.regionCurrency})</p>
        </div>
        <button className="close-btn" onClick={() => setSelectedTicker(null)}>Close</button>
      </div>

      <div className="detail-price-section">
        <span className="large-price">{details.price}</span>
        <span className={`detail-change ${details.changeAmt?.includes('+') ? 'text-green' : 'text-red'}`}>
          {details.changeAmt} ({details.changePct})
        </span>
      </div>

      <div className="detail-tabs">
        {TABS.map(t => (
          <button
            key={t.id}
            className={activeTab === t.id ? 'tab active' : 'tab'}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="data-metrics">
          <div className="metric-row"><span>{isCrypto ? '24h Open' : 'Previous Close'}</span><strong>{details.prevClose}</strong></div>
          <div className="metric-row"><span>Open</span><strong>{details.open}</strong></div>
          {details.bid  != null && <div className="metric-row"><span>Bid</span><strong>{details.bid}</strong></div>}
          {details.ask  != null && <div className="metric-row"><span>Ask</span><strong>{details.ask}</strong></div>}
          <div className="metric-row"><span>{isCrypto ? '24h Range' : "Day's Range"}</span><strong>{details.dayRange}</strong></div>
          <div className="metric-row"><span>{isCrypto ? '52-Week Range' : '52 Week Range'}</span><strong>{details.wk52Range}</strong></div>
          <div className="metric-row"><span>{isCrypto ? '24h Volume' : 'Volume'}</span><strong>{details.volume}</strong></div>
          <div className="metric-row"><span>Avg. Volume</span><strong>{details.avgVol}</strong></div>
          <div className="metric-row"><span>Market Cap</span><strong style={{ color: '#93c5fd' }}>{details.marketCapGlobal}</strong></div>
          {details.beta         != null && <div className="metric-row"><span>Beta (5Y Monthly)</span><strong>{details.beta}</strong></div>}
          {details.pe           != null && <div className="metric-row"><span>PE Ratio (TTM)</span><strong>{details.pe}</strong></div>}
          {details.eps          != null && <div className="metric-row"><span>EPS (TTM)</span><strong>{details.eps}</strong></div>}
          {details.earningsDate != null && <div className="metric-row"><span>Earnings Date</span><strong>{details.earningsDate}</strong></div>}
          {details.dividend     != null && <div className="metric-row"><span>Forward Dividend</span><strong>{details.dividend}</strong></div>}
          {isCrypto && <div className="metric-row"><span>Currency</span><strong>USD (always)</strong></div>}
        </div>
      )}

      {activeTab === 'chart'        && <ChartTab        historyData={historyData} sym={sym} />}
      {activeTab === 'fundamentals' && <FundamentalsTab summaryData={summaryData} sym={sym} />}
      {activeTab === 'analysts'     && <AnalystsTab     summaryData={summaryData} sym={sym} />}

      {activeTab === 'fairvalue' && (
        <div className="fv-panel">
          <div className={`fv-verdict ${fv.upside ? 'undervalued' : 'overvalued'}`}>
            <span className="fv-label">{fv.upside ? 'UNDERVALUED' : 'OVERVALUED'}</span>
            <span className="fv-pct">{fv.upside ? '+' : ''}{fv.pctDiff.toFixed(1)}% vs. current</span>
          </div>
          <div className="fv-grid">
            <div className="fv-stat">
              <span className="fv-stat-label">Current Price</span>
              <span className="fv-stat-value">{sym}{fv.rawPrice.toFixed(2)}</span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Model Fair Value</span>
              <span className={`fv-stat-value ${fv.upside ? 'text-green' : 'text-red'}`}>{sym}{fv.fairPrice.toFixed(2)}</span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Adj. P/E Used</span>
              <span className="fv-stat-value">{fv.adjustedPE.toFixed(1)}x</span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Sector</span>
              <span className="fv-stat-value sector-pill">{selectedTicker.sector || '—'}</span>
            </div>
          </div>
          <div className="fv-bar-section">
            <p className="fv-bar-title">12-Month Probabilistic Range</p>
            <FairValueBar rawPrice={fv.rawPrice} fairPrice={fv.fairPrice} rangeLow={fv.rangeLow} rangeHigh={fv.rangeHigh} sym={sym} />
          </div>
          <div className="fv-disclaimer">
            Model-generated estimate. Based on active macro scenario.
            Adjust scenario sliders to see how rates &amp; inflation shift valuations.
          </div>
        </div>
      )}

      <DataFooter
        summaryData={summaryData}
        historyData={historyData}
        isLive={selectedTicker.isLive}
        onOpenModal={() => setSourceModalOpen(true)}
      />

      {sourceModalOpen && (
        <SourceInfoModal
          ticker={selectedTicker.ticker}
          region={selectedTicker.region}
          summaryData={summaryData}
          historyData={historyData}
          isLive={selectedTicker.isLive}
          onClose={() => setSourceModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DetailPanel;
