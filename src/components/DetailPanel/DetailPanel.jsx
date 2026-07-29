import React, { useState, useEffect } from 'react';
import SafeECharts from '../SafeECharts';
import './DetailPanel.css';
import { useTheme } from '../../hub/ThemeContext';
import { fetchWithRetry } from '../../utils/fetchWithRetry';
import { apiUrl } from '../../lib/api';
import DataFooter from '../DataFooter/DataFooter';
import MetricValue from '../MetricValue/MetricValue';

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
          <MetricValue
            value={changePct}
            seriesKey="stockPrice"
            format={(v) => `${v >= 0 ? '+' : ''}${Number(v).toFixed(2)}%`}
          />
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
const G = ({ label, value, rawValue, seriesKey, timestamp, format, color }) => (
  <div className="fg-cell">
    <span className="fg-label">{label}</span>
    <strong className={`fg-value${color ? ` text-${color}` : ''}`}>
      {seriesKey ? (
        <MetricValue
          value={rawValue}
          seriesKey={seriesKey}
          timestamp={timestamp}
          format={format || (() => value ?? '—')}
        />
      ) : (
        value ?? '—'
      )}
    </strong>
  </div>
);

const FundamentalsTab = ({ summaryData, sym, timestamp }) => {
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
        <G label="Total Revenue"    rawValue={fd.totalRevenue} seriesKey="stockFundamental" timestamp={timestamp} format={v => fmtNum(v, sym)} />
        <G label="Revenue Growth"   rawValue={fd.revenueGrowth} seriesKey="stockFundamental" timestamp={timestamp} format={fmtPct} color={gPct(fd.revenueGrowth)} />
        <G label="Gross Margin"     rawValue={fd.grossMargins} seriesKey="stockFundamental" timestamp={timestamp} format={fmtPct} />
        <G label="Operating Margin" rawValue={fd.operatingMargins} seriesKey="stockFundamental" timestamp={timestamp} format={fmtPct} color={gPct(fd.operatingMargins)} />
        <G label="Profit Margin"    rawValue={fd.profitMargins} seriesKey="stockFundamental" timestamp={timestamp} format={fmtPct} color={gPct(fd.profitMargins)} />
        <G label="Earnings Growth"  rawValue={fd.earningsGrowth} seriesKey="stockFundamental" timestamp={timestamp} format={fmtPct} color={gPct(fd.earningsGrowth)} />
        <G label="EBITDA Margin"    rawValue={fd.ebitdaMargins} seriesKey="stockFundamental" timestamp={timestamp} format={fmtPct} />
        <G label="EBITDA"           rawValue={fd.ebitda} seriesKey="stockFundamental" timestamp={timestamp} format={v => fmtNum(v, sym)} />
      </div>

      <div className="fg-section-hdr">Cash Flow &amp; Debt</div>
      <div className="fg-grid">
        <G label="Op. Cash Flow" rawValue={fd.operatingCashflow} seriesKey="stockFundamental" timestamp={timestamp} format={v => fmtNum(v, sym)} />
        <G label="Free Cash Flow" rawValue={fd.freeCashflow} seriesKey="stockFundamental" timestamp={timestamp} format={v => fmtNum(v, sym)} color={gPct(fd.freeCashflow)} />
        <G label="Total Cash"     rawValue={fd.totalCash} seriesKey="stockFundamental" timestamp={timestamp} format={v => fmtNum(v, sym)} />
        <G label="Total Debt"     rawValue={fd.totalDebt} seriesKey="stockFundamental" timestamp={timestamp} format={v => fmtNum(v, sym)} />
        <G label="Debt / Equity"  rawValue={fd.debtToEquity} seriesKey="stockValuation" timestamp={timestamp} format={v => v?.toFixed(2)} color={fd.debtToEquity != null ? (fd.debtToEquity < 100 ? 'green' : 'red') : ''} />
        <G label="Current Ratio"  rawValue={fd.currentRatio} seriesKey="stockValuation" timestamp={timestamp} format={v => v?.toFixed(2)} color={g(fd.currentRatio, 1)} />
        <G label="Quick Ratio"    rawValue={fd.quickRatio} seriesKey="stockValuation" timestamp={timestamp} format={v => v?.toFixed(2)} color={g(fd.quickRatio, 1)} />
        <G label="Rev / Share"    rawValue={fd.revenuePerShare} seriesKey="stockFundamental" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : null} />
      </div>

      <div className="fg-section-hdr">Valuation</div>
      <div className="fg-grid">
        <G label="Enterprise Value" rawValue={ks.enterpriseValue} seriesKey="stockValuation" timestamp={timestamp} format={v => fmtNum(v, '$')} />
        <G label="EV / Revenue"     rawValue={ks.enterpriseToRevenue} seriesKey="stockValuation" timestamp={timestamp} format={v => v != null ? `${v.toFixed(2)}×` : null} />
        <G label="EV / EBITDA"      rawValue={ks.enterpriseToEbitda} seriesKey="stockValuation" timestamp={timestamp} format={v => v != null ? `${v.toFixed(2)}×` : null} />
        <G label="Price / Book"     rawValue={ks.priceToBook} seriesKey="stockValuation" timestamp={timestamp} format={v => v != null ? `${v.toFixed(2)}×` : null} />
        <G label="Book Val / Share" rawValue={ks.bookValue} seriesKey="stockValuation" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : null} />
        <G label="Forward EPS"      rawValue={ks.forwardEps} seriesKey="stockValuation" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : null} />
        <G label="Forward P/E"      rawValue={ks.forwardPE} seriesKey="stockValuation" timestamp={timestamp} format={v => v != null ? `${v.toFixed(2)}×` : null} />
        <G label="52-Wk Δ"          rawValue={ks['52WeekChange']} seriesKey="stockPrice" timestamp={timestamp} format={fmtPct} color={gPct(ks['52WeekChange'])} />
      </div>

      <div className="fg-section-hdr">Returns &amp; Ownership</div>
      <div className="fg-grid">
        <G label="ROE"          rawValue={fd.returnOnEquity} seriesKey="stockOwnership" timestamp={timestamp} format={fmtPct} color={gPct(fd.returnOnEquity)} />
        <G label="ROA"          rawValue={fd.returnOnAssets} seriesKey="stockOwnership" timestamp={timestamp} format={fmtPct} />
        <G label="Shares Out."  rawValue={ks.sharesOutstanding} seriesKey="stockOwnership" timestamp={timestamp} format={fmtNum} />
        <G label="Float"        rawValue={ks.floatShares} seriesKey="stockOwnership" timestamp={timestamp} format={fmtNum} />
        <G label="Insiders"     rawValue={ks.heldPercentInsiders} seriesKey="stockOwnership" timestamp={timestamp} format={fmtPct} />
        <G label="Institutions" rawValue={ks.heldPercentInstitutions} seriesKey="stockOwnership" timestamp={timestamp} format={fmtPct} />
        <G label="Short Ratio"  rawValue={ks.shortRatio} seriesKey="stockOwnership" timestamp={timestamp} format={v => v?.toFixed(2)} />
        <G label="Short % Float" rawValue={ks.shortPercentOfFloat} seriesKey="stockOwnership" timestamp={timestamp} format={fmtPct} />
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

const AnalystsTab = ({ summaryData, sym, timestamp }) => {
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
        <span className="consensus-count">
          <MetricValue value={fd.numberOfAnalystOpinions} seriesKey="analystTarget" timestamp={timestamp} format={v => v != null ? String(v) : '—'} /> analysts
        </span>
      </div>

      {/* Price targets */}
      <div className="pt-section">
        <div className="section-label">12-Month Price Targets</div>
        <div className="pt-grid">
          <div className="pt-stat"><span>Mean</span>   <strong style={{ color: '#60a5fa' }}><MetricValue value={fd.targetMeanPrice} seriesKey="analystTarget" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : '—'} /></strong></div>
          <div className="pt-stat"><span>Median</span> <strong><MetricValue value={fd.targetMedianPrice} seriesKey="analystTarget" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : '—'} /></strong></div>
          <div className="pt-stat"><span>High</span>   <strong className="text-green"><MetricValue value={fd.targetHighPrice} seriesKey="analystTarget" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : '—'} /></strong></div>
          <div className="pt-stat"><span>Low</span>    <strong className="text-red"><MetricValue value={fd.targetLowPrice} seriesKey="analystTarget" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : '—'} /></strong></div>
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
                  <strong>
                    <MetricValue value={avg} seriesKey="analystTarget" timestamp={timestamp} format={v => v != null ? `${sym}${v.toFixed(2)}` : '—'} />
                  </strong>
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

// ─── Main Component ──────────────────────────────────────────────────────────

const MACRO_LABELS = {
  M1:    { label: 'M1 Money Supply',  unit: 'B',   fmt: v => v != null ? `$${(v/1000).toFixed(1)}T` : '—' },
  M2:    { label: 'M2 Money Supply',  unit: 'B',   fmt: v => v != null ? `$${(v/1000).toFixed(1)}T` : '—' },
  CPI:   { label: 'CPI (All Items)',  unit: 'Idx', fmt: v => v != null ? v.toFixed(1) : '—' },
  FFR:   { label: 'Fed Funds Rate',   unit: '%',   fmt: v => v != null ? `${v.toFixed(2)}%` : '—' },
  UNEMP: { label: 'Unemployment',     unit: '%',   fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  GDP:   { label: 'GDP',              unit: 'B',   fmt: v => v != null ? `$${(v/1000).toFixed(1)}T` : '—' },
};

const MacroIndicators = ({ macroData }) => {
  if (!macroData) return null;
  const keys = Object.keys(MACRO_LABELS).filter(k => macroData[k]?.latest != null);
  if (!keys.length) return null;
  return (
    <div className="macro-section">
      <div className="fg-section-hdr">Macro Indicators (FRED)</div>
      <div className="macro-grid">
        {keys.map(k => {
          const m = macroData[k];
          const meta = MACRO_LABELS[k];
          const prev = m.prev != null ? meta.fmt(m.prev) : null;
          const diff = m.latest != null && m.prev != null ? m.latest - m.prev : null;
          const diffPct = diff != null && m.prev !== 0 ? ((diff / Math.abs(m.prev)) * 100) : null;
          return (
            <div key={k} className="macro-cell">
              <span className="macro-label">{meta.label}</span>
              <strong className="macro-value">
                <MetricValue value={m.latest} seriesKey="macroIndicator" timestamp={m.date} format={meta.fmt} />
              </strong>
              {diffPct != null && (
                <span className={`macro-delta ${diffPct > 0 ? 'text-red' : diffPct < 0 ? 'text-green' : ''}`}>
                  <MetricValue
                    value={diffPct}
                    seriesKey="macroIndicator"
                    timestamp={m.date}
                    format={(v) => `${v > 0 ? '+' : ''}${Number(v).toFixed(2)}%`}
                  />
                </span>
              )}
              <span className="macro-date">{m.date}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const FxRates = ({ rates, currency }) => {
  if (!rates || !Object.keys(rates).length) return null;
  const shown = Object.entries(rates).filter(([c]) => c !== currency).slice(0, 6);
  if (!shown.length) return null;
  return (
    <div className="fx-section">
      <div className="fg-section-hdr">FX Rates (Frankfurter)</div>
      <div className="fx-grid">
        {shown.map(([ccy, rate]) => (
          <div key={ccy} className="fx-cell">
            <span className="fx-label">{currency}/{ccy}</span>
            <strong className="fx-value">
              <MetricValue value={rate} seriesKey="fxSpot" format={(v) => Number(v).toFixed(4)} />
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
};

const TABS = [
  { id: 'summary',      label: 'Summary' },
  { id: 'chart',        label: 'Chart' },
  { id: 'fundamentals', label: 'Fundamentals' },
  { id: 'analysts',     label: 'Analysts' },
  { id: 'fairvalue',    label: 'Fair Value' },
];

const DetailPanel = ({ selectedTicker, setSelectedTicker, rates, currency }) => {
  const { details, summaryData, historyData } = selectedTicker;
  const isCrypto = selectedTicker.sector === 'Crypto';
  const [activeTab, setActiveTab] = useState('summary');
  const [macroData, setMacroData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetchWithRetry(apiUrl('/api/macro'), { retries: 1, timeout: 10000 })
      .then(r => r.json())
      .then(data => { if (!cancelled && data && Object.keys(data).length) setMacroData(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (selectedTicker.isLoading || !details) {
    return (
      <div className="detail-panel-content">
        <div className="detail-header">
          <div>
            <h2 className="detail-ticker">{selectedTicker.ticker}</h2>
            <p className="detail-region">{selectedTicker.region || 'Loading details...'}</p>
          </div>
          <button className="close-btn" onClick={() => setSelectedTicker(null)}>Close</button>
        </div>
        <div className="detail-panel-loading-container">
          <div className="detail-panel-spinner" />
          <span>Loading live quotes...</span>
        </div>
      </div>
    );
  }

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
        <span className="large-price">
          <MetricValue
            value={parseFloat(String(details.price).replace(/[^\d.-]/g, ''))}
            seriesKey="stockPrice"
            timestamp={selectedTicker.timestamp}
            format={() => details.price}
          />
        </span>
        <span className={`detail-change ${details.changeAmt?.includes('+') ? 'text-green' : 'text-red'}`}>
          <MetricValue
            value={parseFloat(String(details.changeAmt).replace(/[^\d.-]/g, ''))}
            seriesKey="stockPrice"
            timestamp={selectedTicker.timestamp}
            format={() => `${details.changeAmt} (${details.changePct})`}
          />
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
          <div className="metric-row"><span>{isCrypto ? '24h Open' : 'Previous Close'}</span><strong><MetricValue value={parseFloat(String(details.prevClose).replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.prevClose} /></strong></div>
          <div className="metric-row"><span>Open</span><strong><MetricValue value={parseFloat(String(details.open).replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.open} /></strong></div>
          {details.bid  != null && <div className="metric-row"><span>Bid</span><strong><MetricValue value={parseFloat(String(details.bid).replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.bid} /></strong></div>}
          {details.ask  != null && <div className="metric-row"><span>Ask</span><strong><MetricValue value={parseFloat(String(details.ask).replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.ask} /></strong></div>}
          <div className="metric-row"><span>{isCrypto ? '24h Range' : "Day's Range"}</span><strong><MetricValue value={parseFloat(String(details.dayRange).split('-')[0].replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.dayRange} /></strong></div>
          <div className="metric-row"><span>{isCrypto ? '52-Week Range' : '52 Week Range'}</span><strong><MetricValue value={parseFloat(String(details.wk52Range).split('-')[0].replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.wk52Range} /></strong></div>
          <div className="metric-row"><span>{isCrypto ? '24h Volume' : 'Volume'}</span><strong><MetricValue value={parseFloat(String(details.volume).replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.volume} /></strong></div>
          <div className="metric-row"><span>Avg. Volume</span><strong><MetricValue value={parseFloat(String(details.avgVol).replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.avgVol} /></strong></div>
          <div className="metric-row"><span>Market Cap</span><strong style={{ color: '#93c5fd' }}><MetricValue value={parseFloat(String(details.marketCapGlobal).replace(/[^\d.-]/g, ''))} seriesKey="universeMarketCap" timestamp={selectedTicker.timestamp} format={() => details.marketCapGlobal} /></strong></div>
          {details.beta         != null && <div className="metric-row"><span>Beta (5Y Monthly)</span><strong><MetricValue value={parseFloat(String(details.beta).replace(/[^\d.-]/g, ''))} seriesKey="stockValuation" timestamp={selectedTicker.timestamp} format={() => details.beta} /></strong></div>}
          {details.pe           != null && <div className="metric-row"><span>PE Ratio (TTM)</span><strong><MetricValue value={parseFloat(String(details.pe).replace(/[^\d.-]/g, ''))} seriesKey="stockValuation" timestamp={selectedTicker.timestamp} format={() => details.pe} /></strong></div>}
          {details.eps          != null && <div className="metric-row"><span>EPS (TTM)</span><strong><MetricValue value={parseFloat(String(details.eps).replace(/[^\d.-]/g, ''))} seriesKey="stockValuation" timestamp={selectedTicker.timestamp} format={() => details.eps} /></strong></div>}
          {details.earningsDate != null && <div className="metric-row"><span>Earnings Date</span><strong>{details.earningsDate}</strong></div>}
          {details.dividend     != null && <div className="metric-row"><span>Forward Dividend</span><strong><MetricValue value={parseFloat(String(details.dividend).replace(/[^\d.-]/g, ''))} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={() => details.dividend} /></strong></div>}
          {isCrypto && <div className="metric-row"><span>Currency</span><strong>USD (always)</strong></div>}
        </div>
      )}

      {activeTab === 'chart'        && <ChartTab        historyData={historyData} sym={sym} />}
      {activeTab === 'fundamentals' && <FundamentalsTab summaryData={summaryData} sym={sym} timestamp={selectedTicker.timestamp} />}
      {activeTab === 'analysts'     && <AnalystsTab     summaryData={summaryData} sym={sym} timestamp={selectedTicker.timestamp} />}

      {activeTab === 'fairvalue' && (
        <div className="fv-panel">
          <div className={`fv-verdict ${fv.upside ? 'undervalued' : 'overvalued'}`}>
            <span className="fv-label">{fv.upside ? 'UNDERVALUED' : 'OVERVALUED'}</span>
            <span className="fv-pct">{fv.upside ? '+' : ''}{fv.pctDiff.toFixed(1)}% vs. current</span>
          </div>
          <div className="fv-grid">
            <div className="fv-stat">
              <span className="fv-stat-label">Current Price</span>
              <span className="fv-stat-value">
                <MetricValue value={fv.rawPrice} seriesKey="stockPrice" timestamp={selectedTicker.timestamp} format={v => `${sym}${v.toFixed(2)}`} />
              </span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Model Fair Value</span>
              <span className={`fv-stat-value ${fv.upside ? 'text-green' : 'text-red'}`}>
                <MetricValue value={fv.fairPrice} seriesKey="fairValue" timestamp={selectedTicker.timestamp} format={v => `${sym}${v.toFixed(2)}`} />
              </span>
            </div>
            <div className="fv-stat">
              <span className="fv-stat-label">Adj. P/E Used</span>
              <span className="fv-stat-value">
                <MetricValue value={fv.adjustedPE} seriesKey="fairValue" timestamp={selectedTicker.timestamp} format={v => `${v.toFixed(1)}x`} />
              </span>
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
        source="Yahoo Finance"
        timestamp={selectedTicker.timestamp || new Date().toISOString()}
        isLive={selectedTicker.isLive}
        isCurrent={true}
        fetchLog={[
          {
            time: selectedTicker.timestamp || new Date().toISOString(),
            url: `/api/summary/${selectedTicker.ticker}`,
            status: 200,
            sources: {
              'Yahoo Finance (quoteSummary)': {
                _source: 'Yahoo Finance',
                _description: `Fundamentals, statistics, earnings trends and recommendation trends for ${selectedTicker.ticker}.`,
              }
            }
          },
          {
            time: selectedTicker.timestamp || new Date().toISOString(),
            url: `/api/history/${selectedTicker.ticker}`,
            status: 200,
            sources: {
              'Yahoo Finance (historical)': {
                _source: 'Yahoo Finance',
                _description: `Historical daily price and volume data for ${selectedTicker.ticker}.`,
              }
            }
          }
        ]}
      />
    </div>
  );
};

export default DetailPanel;
