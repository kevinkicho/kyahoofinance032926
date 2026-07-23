import React, { useMemo } from 'react';
import { useTheme } from '../../../hub/ThemeContext';
import { useCurrency } from '../../../hub/CurrencyContext';
import { useMarketData } from '../../../hub/DataContext';
import BentoWrapper from '../../../components/BentoWrapper';
import BentoCard from '../../../components/BentoCard/BentoCard';
import MarketKpiStrip from '../../../components/MarketKpiStrip';
import YieldCurve from './YieldCurve';
import SpreadMonitor from './SpreadMonitor';
import DurationLadder from './DurationLadder';
import CreditMatrix from './CreditMatrix';
import BreakevenMonitor from './BreakevenMonitor';
import RealYields from './RealYields';
import CpiComponents from './CpiComponents';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './BondsDashboard.css';

/** Format FRED macro levels with correct units (never dump nested objects). */
function buildMacroRows(macroData, nationalDebt, debtToGdpHistory) {
  if (!macroData || typeof macroData !== 'object') return [];
  const rows = [];
  const push = (id, label, value, kind, seriesKey, color) => {
    if (value == null || (typeof value === 'number' && !Number.isFinite(value))) return;
    if (typeof value === 'object') return; // skip nested maps like centralBankRates
    rows.push({ id, label, value, kind, seriesKey, color });
  };

  // WALCL = millions USD → trillions
  push('fedBalanceSheet', 'Fed balance sheet', macroData.fedBalanceSheet, 'milToT', 'fedBalanceSheet');
  // M2SL = billions USD → trillions
  push('m2', 'M2 money stock', macroData.m2, 'bilToT', 'm2');
  // GFDEBTN = millions USD → trillions (prefer explicit nationalDebt if set)
  push('federalDebt', 'Federal debt', nationalDebt != null ? nationalDebt * 1e6 : macroData.federalDebt, 'milToT', 'federalDebt', '#f87171');
  // FYFSD = millions USD
  push('surplusDeficit', 'Budget surplus', macroData.surplusDeficit, 'milToB', 'surplusDeficit',
    macroData.surplusDeficit != null && macroData.surplusDeficit < 0 ? '#f87171' : '#4ade80');
  push('unemployment', 'Unemployment', macroData.unemployment, 'pct', 'unemployment');
  push('laborParticipation', 'Labor participation', macroData.laborParticipation, 'pct', 'laborParticipation');
  // GDP = billions USD (level, not growth)
  push('gdp', 'Nominal GDP', macroData.gdp, 'bilToT', 'gdp');
  // PCEPI = price index level
  push('pce', 'PCE price index', macroData.pce, 'index', 'pce');
  push('tb3ms', '3M T-bill', macroData.tb3ms, 'pct', 'tb3ms');
  if (debtToGdpHistory?.latest != null) {
    push('debtToGdp', 'Debt / GDP', debtToGdpHistory.latest, 'pct', 'debtToGdp', '#f87171');
  }
  return rows;
}

function formatMacroValue(value, kind, convertAndFormat) {
  if (value == null || typeof value !== 'number' || !Number.isFinite(value)) return '—';
  switch (kind) {
    case 'pct':
      return `${value.toFixed(2)}%`;
    case 'index':
      return value.toFixed(1);
    case 'milToT':
      // millions → trillions
      return `$${(value / 1e6).toFixed(2)}T`;
    case 'bilToT':
      return `$${(value / 1e3).toFixed(2)}T`;
    case 'milToB': {
      const b = value / 1e3;
      const sign = b < 0 ? '−' : '';
      return `${sign}$${Math.abs(b).toFixed(0)}B`;
    }
    default:
      return convertAndFormat ? convertAndFormat(value, 'USD', 1) : String(value);
  }
}

function MacroIndicatorsPanel({ macroData, nationalDebt, debtToGdpHistory, lastUpdated, convertAndFormat }) {
  const rows = useMemo(
    () => buildMacroRows(macroData, nationalDebt, debtToGdpHistory),
    [macroData, nationalDebt, debtToGdpHistory],
  );
  const cbRates = macroData?.centralBankRates || {};
  const cbMeta = macroData?.centralBankMeta || {};
  const cbEntries = Object.entries(cbRates).filter(([, v]) => v != null && Number.isFinite(Number(v)));

  if (!rows.length && !cbEntries.length) {
    return <div className="bonds-empty">No macro data available</div>;
  }

  return (
    <div className="mi-panel">
      <div className="mi-section-title">US macro snapshot</div>
      <div className="mi-grid">
        {rows.map((r) => (
          <div key={r.id} className="mi-card">
            <span className="mi-card-label">{r.label}</span>
            <span className="mi-card-value" style={r.color ? { color: r.color } : undefined}>
              <MetricValue
                value={r.value}
                seriesKey={r.seriesKey}
                timestamp={lastUpdated}
                format={(v) => formatMacroValue(v, r.kind, convertAndFormat)}
              />
            </span>
          </div>
        ))}
      </div>

      {cbEntries.length > 0 && (
        <>
          <div className="mi-section-title mi-section-title--spaced">Central bank / overnight rates</div>
          <div className="mi-cb-grid">
            {cbEntries.map(([code, rate]) => (
              <div key={code} className="mi-cb-card">
                <span className="mi-cb-code">{code}</span>
                <span className="mi-cb-rate">{Number(rate).toFixed(2)}%</span>
                <span className="mi-cb-meta">{cbMeta[code]?.label || 'policy rate'}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Display order: majors first, then EM / others alphabetically within groups
const CB_ORDER = [
  'US', 'EU', 'UK', 'JP', 'CN', 'DE', 'FR', 'ES', 'IT',
  'CA', 'AU', 'CH', 'SE', 'NO', 'NZ',
  'IN', 'KR', 'BR', 'MX', 'RU', 'TR', 'ZA', 'ID', 'CL', 'PL', 'IL', 'CZ', 'HU',
];
const CB_FLAGS = {
  US: '🇺🇸', EU: '🇪🇺', UK: '🇬🇧', JP: '🇯🇵', CN: '🇨🇳',
  DE: '🇩🇪', FR: '🇫🇷', ES: '🇪🇸', IT: '🇮🇹',
  CA: '🇨🇦', AU: '🇦🇺', CH: '🇨🇭', SE: '🇸🇪', NO: '🇳🇴', NZ: '🇳🇿',
  IN: '🇮🇳', KR: '🇰🇷', BR: '🇧🇷', MX: '🇲🇽', RU: '🇷🇺',
  TR: '🇹🇷', ZA: '🇿🇦', ID: '🇮🇩', CL: '🇨🇱', PL: '🇵🇱', IL: '🇮🇱',
  CZ: '🇨🇿', HU: '🇭🇺',
};
const CB_NAMES = {
  US: 'United States', EU: 'Euro area', UK: 'United Kingdom', JP: 'Japan',
  CN: 'China', DE: 'Germany', FR: 'France', ES: 'Spain', IT: 'Italy',
  CA: 'Canada', AU: 'Australia', CH: 'Switzerland', SE: 'Sweden',
  NO: 'Norway', NZ: 'New Zealand', IN: 'India', KR: 'South Korea',
  BR: 'Brazil', MX: 'Mexico', RU: 'Russia', TR: 'Türkiye', ZA: 'South Africa',
  ID: 'Indonesia', CL: 'Chile', PL: 'Poland', IL: 'Israel',
  CZ: 'Czechia', HU: 'Hungary',
};

function fmtPct(v, digits = 2) {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  return `${Number(v).toFixed(digits)}%`;
}

function fmtChg(v) {
  if (v == null || !Number.isFinite(Number(v))) return null;
  const n = Number(v);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

/** Full ECB policy + money-market rates panel (live SDW only). */
function EcbPolicyRatesPanel({ data }) {
  const pr = data?.policyRates;
  const mm = data?.moneyMarket;
  const m3Last = data?.m3Growth?.length ? data.m3Growth[data.m3Growth.length - 1] : null;
  const hicpLast = data?.hicpDetail?.length ? data.hicpDetail[data.hicpDetail.length - 1] : null;

  if (!pr && !mm && !m3Last && !hicpLast) {
    return <div className="bonds-empty">ECB data unavailable</div>;
  }

  const corridor = [
    {
      code: 'DFR',
      label: 'Deposit facility',
      value: pr?.depositFacility?.value,
      period: pr?.depositFacility?.period,
      chg: pr?.depositFacilityChange?.value,
      color: '#66bb6a',
    },
    {
      code: 'MRR',
      label: 'Main refinancing',
      value: pr?.mainRefinancing?.value,
      period: pr?.mainRefinancing?.period,
      chg: pr?.mainRefinancingChange?.value,
      color: '#42a5f5',
    },
    {
      code: 'MLFR',
      label: 'Marginal lending',
      value: pr?.marginalLending?.value,
      period: pr?.marginalLending?.period,
      chg: pr?.marginalLendingChange?.value,
      color: '#ef5350',
    },
  ];

  const mmRows = [
    { label: '€STR (vol-wtd)', value: mm?.estr?.value, period: mm?.estr?.period, color: '#a78bfa' },
    { label: '€STR 25th pct', value: mm?.estrP25?.value, period: mm?.estrP25?.period },
    { label: '€STR 75th pct', value: mm?.estrP75?.value, period: mm?.estrP75?.period },
    { label: '€STR monthly avg', value: mm?.estrMonthlyAvg?.value, period: mm?.estrMonthlyAvg?.period },
    { label: 'EURIBOR 1M', value: mm?.euribor1m?.value, period: mm?.euribor1m?.period, color: '#fbbf24' },
    { label: 'EURIBOR 3M', value: mm?.euribor3m?.value, period: mm?.euribor3m?.period, color: '#fbbf24' },
    { label: 'EURIBOR 6M', value: mm?.euribor6m?.value, period: mm?.euribor6m?.period, color: '#fbbf24' },
    { label: 'EURIBOR 1Y', value: mm?.euribor1y?.value, period: mm?.euribor1y?.period, color: '#fbbf24' },
  ].filter((r) => r.value != null && Number.isFinite(Number(r.value)));

  const derived = [
    {
      label: 'Corridor width (MLFR−DFR)',
      value: pr?.corridorWidth?.value,
      period: pr?.corridorWidth?.period,
    },
    {
      label: 'MRR − DFR spread',
      value: pr?.standingFacilitySpread?.value,
      period: pr?.standingFacilitySpread?.period,
    },
    {
      label: '€STR − DFR',
      value:
        mm?.estr?.value != null && pr?.depositFacility?.value != null
          ? Number(mm.estr.value) - Number(pr.depositFacility.value)
          : null,
      period: mm?.estr?.period,
    },
  ].filter((r) => r.value != null && Number.isFinite(Number(r.value)));

  const macro = [
    { label: 'M3 growth (YoY)', value: m3Last?.value, period: m3Last?.period, digits: 1 },
    { label: 'HICP (YoY)', value: hicpLast?.value, period: hicpLast?.period, digits: 1 },
  ].filter((r) => r.value != null);

  const effDate = pr?.mainRefinancing?.period || pr?.depositFacility?.period || null;

  return (
    <div className="ecb-panel">
      <div className="ecb-section">
        <div className="ecb-section-h">
          <span>Key ECB interest rates</span>
          {effDate && <span className="ecb-asof">eff. {effDate}</span>}
        </div>
        <div className="ecb-corridor">
          {corridor.map((r) => (
            <div key={r.code} className="ecb-rate-card">
              <span className="ecb-rate-code" style={{ color: r.color }}>{r.code}</span>
              <span className="ecb-rate-val" style={{ color: r.color }}>{fmtPct(r.value)}</span>
              <span className="ecb-rate-label">{r.label}</span>
              {fmtChg(r.chg) != null && (
                <span className={`ecb-rate-chg ${Number(r.chg) > 0 ? 'up' : Number(r.chg) < 0 ? 'down' : ''}`}>
                  last Δ {fmtChg(r.chg)} pp
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {mmRows.length > 0 && (
        <div className="ecb-section">
          <div className="ecb-section-h"><span>€STR &amp; EURIBOR</span></div>
          <div className="ecb-rate-list">
            {mmRows.map((r) => (
              <div key={r.label} className="ecb-rate-row">
                <span className="ecb-rate-name">{r.label}</span>
                <span className="ecb-rate-period">{r.period || ''}</span>
                <span className="ecb-rate-num" style={r.color ? { color: r.color } : undefined}>
                  {fmtPct(r.value, 3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {derived.length > 0 && (
        <div className="ecb-section">
          <div className="ecb-section-h"><span>Corridor / spreads</span></div>
          <div className="ecb-rate-list">
            {derived.map((r) => (
              <div key={r.label} className="ecb-rate-row">
                <span className="ecb-rate-name">{r.label}</span>
                <span className="ecb-rate-period">{r.period || ''}</span>
                <span className="ecb-rate-num">{fmtPct(r.value, 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {macro.length > 0 && (
        <div className="ecb-section">
          <div className="ecb-section-h"><span>Euro-area aggregates</span></div>
          <div className="ecb-rate-list">
            {macro.map((r) => (
              <div key={r.label} className="ecb-rate-row">
                <span className="ecb-rate-name">{r.label}</span>
                <span className="ecb-rate-period">{r.period || ''}</span>
                <span className="ecb-rate-num">{fmtPct(r.value, r.digits ?? 2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ecb-footer">Live ECB SDW · no mock · DFR/MRR/MLFR · €STR · EURIBOR 1M–1Y</div>
    </div>
  );
}

function CentralBankRatesPanel({ rates, meta, ecbRate }) {
  const merged = { ...(rates || {}) };
  // Prefer live ECB SDW main refinancing for EU when available
  if (ecbRate != null && Number.isFinite(Number(ecbRate))) {
    merged.EU = Number(ecbRate);
  }

  const orderIdx = Object.fromEntries(CB_ORDER.map((c, i) => [c, i]));
  const entries = Object.keys(merged)
    .map((code) => ({
      code,
      rate: merged[code] != null && Number.isFinite(Number(merged[code])) ? Number(merged[code]) : null,
      label: meta?.[code]?.label || CB_NAMES[code] || code,
      name: CB_NAMES[code] || code,
      series: meta?.[code]?.series || null,
    }))
    .filter((e) => e.rate != null)
    .sort((a, b) => {
      const ia = orderIdx[a.code] ?? 500;
      const ib = orderIdx[b.code] ?? 500;
      if (ia !== ib) return ia - ib;
      return b.rate - a.rate;
    });

  if (!entries.length) {
    return <div className="bonds-empty">Global rate data unavailable — FRED series empty</div>;
  }

  // Cap bar scale so extreme rates (e.g. TR 35%) don't crush everyone else
  const barMax = Math.min(
    Math.max(...entries.map((e) => e.rate), 0.01),
    Math.max(8, ...entries.filter((e) => e.rate <= 15).map((e) => e.rate), 1) * 1.15,
  );

  return (
    <div className="mi-panel">
      <div className="mi-cb-summary">
        <span>{entries.length} economies</span>
        <span>rates · live FRED / ECB</span>
      </div>
      <div className="mi-cb-list">
        {entries.map((e) => (
          <div key={e.code} className="mi-cb-row">
            <span className="mi-cb-flag">{CB_FLAGS[e.code] || '·'}</span>
            <span className="mi-cb-name">
              <strong>{e.code}</strong>
              <span className="mi-cb-sub" title={e.series || undefined}>
                {e.name} · {e.label}
              </span>
            </span>
            <span className="mi-cb-bar-track">
              <span
                className="mi-cb-bar-fill"
                style={{ width: `${Math.min(100, Math.max(2, (e.rate / barMax) * 100))}%` }}
              />
            </span>
            <span className="mi-cb-rate-lg">{e.rate.toFixed(2)}%</span>
          </div>
        ))}
      </div>
      <div className="mi-footer">
        Live only · US EFFR · EU ECB MRR · UK SONIA · JP/CA/AU/CN/IN/BR/KR/… OECD call money · no mock
      </div>
    </div>
  );
}

function BondsDashboard({
  yieldCurveData, creditRatingsData, creditRatingsAsOf, spreadIndicators, spreadData, durationLadderData, durationLadderMeta,
  breakevensData, fredYieldHistory, treasuryRates, fedFundsFutures, yieldHistory,
  mortgageSpread, tipsYields, realYieldHistory, macroData, fedBalanceSheetHistory,
  m2HistoryData, auctionData, nationalDebt, spreadHistory, cpiComponents, debtToGdpHistory,
  isLive, lastUpdated, fetchLog, provenance, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const { convertAndFormat, currentSymbol } = useCurrency();
  // Cross-market data for the new Foreign Holders + Money Market panels.
  const ticCtx = useMarketData('treasuryTIC');
  const nyfedCtx = useMarketData('nyfed');
  const auctionCtx = useMarketData('treasuryAuctions');
  const ecbCtx = useMarketData('ecb');
  const treasuryCostCtx = useMarketData('treasuryCost');

  // KPI panel is a real bento child at row 0 (h:2 = 240px). All other
  // panels shifted down by 2 rows. Storage key bumped to avoid stale
  // layouts merging with the new schema.
  const layout = {
    lg: [
      { i: 'kpi',        x: 0, y: 0,  w: 12, h: 2 },
      { i: 'yield',      x: 0, y: 2,  w: 8,  h: 5 },
      { i: 'metrics',    x: 8, y: 2,  w: 4,  h: 5 },
      { i: 'credit',     x: 0, y: 7,  w: 4,  h: 3 },
      { i: 'realYield',  x: 4, y: 7,  w: 4,  h: 3 },
      { i: 'ratings',    x: 8, y: 7,  w: 4,  h: 3 },
      { i: 'curvespreads', x: 0, y: 10, w: 4, h: 3 },
      { i: 'fed',        x: 4, y: 10, w: 4,  h: 3 },
      { i: 'm2',         x: 8, y: 10, w: 4,  h: 3 },
      { i: 'cpi',        x: 0, y: 13, w: 4,  h: 3 },
      { i: 'debtgdp',    x: 4, y: 13, w: 4,  h: 3 },
      { i: 'breakevens', x: 8, y: 13, w: 4,  h: 3 },
      { i: 'duration',   x: 0, y: 16, w: 6,  h: 5 },
      { i: 'macro',      x: 6, y: 16, w: 6,  h: 5 },
      { i: 'foreign-holders', x: 0, y: 21, w: 6, h: 4 },
      { i: 'money-market',    x: 6, y: 21, w: 6, h: 4 },
      { i: 'auctions',        x: 0, y: 25, w: 12, h: 5 },
      { i: 'ecb-yields',      x: 0, y: 30, w: 6, h: 7 },
      { i: 'global-rates',    x: 6, y: 30, w: 6, h: 7 },
      { i: 'treasury-cost',   x: 0, y: 37, w: 6, h: 3 },
    ]
  };

  // Top-of-page KPI metrics — clickable via MetricValue (seriesKey wires
  // each pill to FRED ID + source for the popover).
  const kpiItems = useMemo(() => {
    // Guard for non-numeric values — `format` is also called with the
    // pre-rendered string ('—') when data is missing, so toFixed/round
    // need to bail out rather than throw.
    const fmtPct = v => typeof v === 'number' ? `${v.toFixed(2)}%` : '—';
    const fmtBps = v => typeof v === 'number' ? `${Math.round(v)} bps` : '—';
    const n = (...vals) => {
      for (const v of vals) if (typeof v === 'number' && Number.isFinite(v)) return v;
      return null;
    };
    const us10 = n(treasuryRates?.US10Y, yieldCurveData?.US?.['10y']);
    const us2 = n(treasuryRates?.US2Y, yieldCurveData?.US?.['2y']);
    const curve = n(spreadIndicators?.t10y2y, (us10 != null && us2 != null ? us10 - us2 : null));
    const fed = n(fedFundsFutures?.m1, treasuryRates?.fedFunds, treasuryRates?.US3M);
    const ig = n(spreadData?.current?.igSpread, spreadData?.current?.ig);
    const hy = n(spreadData?.current?.hySpread, spreadData?.current?.hy);
    const be5 = n(breakevensData?.current?.be5y);
    return [
      { label: 'US 10Y',    rawValue: us10, value: fmtPct(us10), format: fmtPct, seriesKey: '10y',      sublabel: 'Treasury' },
      { label: 'US 2Y',     rawValue: us2,  value: fmtPct(us2),  format: fmtPct, seriesKey: '2y',       sublabel: 'Treasury' },
      { label: 'Fed Funds', rawValue: fed,  value: fmtPct(fed),  format: fmtPct, seriesKey: 'fedFunds', sublabel: 'Policy rate' },
      { label: '10Y-2Y',    rawValue: curve, value: fmtPct(curve), format: fmtPct, seriesKey: 't10y2y', color: curve != null && curve < 0 ? '#f87171' : '#4ade80', sublabel: 'Curve' },
      { label: 'IG OAS',    rawValue: ig,   value: fmtBps(ig),   format: fmtBps, seriesKey: 'igOAS',    sublabel: 'Investment Grade' },
      { label: 'HY OAS',    rawValue: hy,   value: fmtBps(hy),   format: fmtBps, seriesKey: 'hyOAS',    sublabel: 'High Yield' },
      { label: '5Y BE',     rawValue: be5,  value: fmtPct(be5),  format: fmtPct, seriesKey: 't5yie',    sublabel: 'Breakeven' },
    ];
  }, [treasuryRates, fedFundsFutures, spreadIndicators, spreadData, breakevensData, yieldCurveData]);

  // Spread History chart
  const spreadHistoryOption = useMemo(() => {
    if (!spreadHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['2s10s', '10s3s', '5s30s'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 20, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: spreadHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(spreadHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [
        { name: '2s10s', type: 'line', data: spreadHistory.t10y2y, symbol: 'none', smooth: true, lineStyle: { color: '#60a5fa', width: 1.5 } },
        { name: '10s3s', type: 'line', data: spreadHistory.t10y3m, symbol: 'none', smooth: true, lineStyle: { color: '#f59e0b', width: 1.5 } },
        { name: '5s30s', type: 'line', data: spreadHistory.t5y30y, symbol: 'none', smooth: true, lineStyle: { color: '#10b981', width: 1.5 } },
      ],
    };
  }, [spreadHistory, colors]);


  // Fed Balance Sheet chart
  const fedBalanceOption = useMemo(() => {
    if (!fedBalanceSheetHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: fedBalanceSheetHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(fedBalanceSheetHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${currentSymbol}${v}T` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: fedBalanceSheetHistory.values, areaStyle: { color: 'rgba(167,139,250,0.1)' }, lineStyle: { color: '#a78bfa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [fedBalanceSheetHistory, colors, currentSymbol]);

  // M2 chart
  const m2Option = useMemo(() => {
    if (!m2HistoryData?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: m2HistoryData.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(m2HistoryData.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: v => `${currentSymbol}${v}T` }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: m2HistoryData.values, areaStyle: { color: 'rgba(96,165,250,0.1)' }, lineStyle: { color: '#60a5fa', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [m2HistoryData, colors, currentSymbol]);
 
  // Debt-to-GDP chart
  const debtToGdpOption = useMemo(() => {
    if (!debtToGdpHistory?.dates?.length) return null;
    return {
      animation: false, backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      grid: { top: 8, right: 16, bottom: 20, left: 44 },
      xAxis: { type: 'category', data: debtToGdpHistory.dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.floor(debtToGdpHistory.dates.length / 4) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: [{ type: 'line', data: debtToGdpHistory.values, areaStyle: { color: 'rgba(239,68,68,0.1)' }, lineStyle: { color: '#ef4444', width: 1.5 }, symbol: 'none', smooth: true }],
    };
  }, [debtToGdpHistory, colors]);

  // Key metrics sidebar data
  const usCurve = yieldCurveData?.US; 
  const us10y = usCurve?.['10y'];
  const countryCount = yieldCurveData ? Object.keys(yieldCurveData).length : 0;
  const steepest = useMemo(() => {
    if (!yieldCurveData) return null;
    let best = null, bestSpread = -Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve?.['30y'], s3m = curve?.['3m'];
      if (s30 != null && s3m != null) { const spread = s30 - s3m; if (spread > bestSpread) { bestSpread = spread; best = cc; } }
    }
    return best ? { country: best, spread: bestSpread } : null;
  }, [yieldCurveData]);

  const flattest = useMemo(() => {
    if (!yieldCurveData) return null;
    let best = null, bestSpread = Infinity;
    for (const [cc, curve] of Object.entries(yieldCurveData)) {
      const s30 = curve?.['30y'], s3m = curve?.['3m'];
      if (s30 != null && s3m != null) { const spread = s30 - s3m; if (spread < bestSpread) { bestSpread = spread; best = cc; } }
    }
    return best ? { country: best, spread: bestSpread } : null;
  }, [yieldCurveData]);

  // ── Foreign Holders chart (Treasury TIC) ────────────────────────────────
  // Multi-line over the latest ~12 months for the top 5 holders + "All Other".
  // Snapshot-bar version was a one-month picture; the rotation between Japan
  // / China / UK is the more interesting story to surface here. Server's
  // /api/treasury/tic endpoint already returns `history` keyed by country.
  const foreignHoldersOption = useMemo(() => {
    const history = ticCtx?.data?.history;
    const latest = ticCtx?.data?.latest || [];
    if (!history || !latest.length) return null;
    // Pick top-5 by latest holdings, plus "All Other" if present in history.
    const ranked = latest.filter(r => r.country !== 'All Other').slice(0, 5).map(r => r.country);
    const countries = [...ranked];
    if (history['All Other']) countries.push('All Other');
    // Periods come straight from any one country's series — they're all aligned.
    const sample = history[countries[0]] || [];
    const periods = sample.map(p => p.period);
    if (!periods.length) return null;
    const palette = ['#10b981', '#3b82f6', '#f59e0b', '#a78bfa', '#ec4899', '#94a3b8'];
    const seriesByCountry = countries.map((c, i) => {
      const periodMap = Object.fromEntries((history[c] || []).map(p => [p.period, p.holdingsB]));
      const values = periods.map(p => periodMap[p] ?? null);
      const last = values[values.length - 1];
      return {
        name: `${c} ($${last?.toFixed(0)}B)`,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 3,
        data: values,
        lineStyle: { color: palette[i % palette.length], width: 1.8 },
        itemStyle: { color: palette[i % palette.length] },
      };
    });
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', valueFormatter: v => v != null ? `$${v.toFixed(0)}B` : '—' },
      legend: { top: 0, type: 'scroll', textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 28, right: 12, bottom: 24, left: 48 },
      xAxis: { type: 'category', data: periods, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(0, Math.floor(periods.length / 6)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: { type: 'value', axisLabel: { formatter: v => `$${v}B`, color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
      series: seriesByCountry,
    };
  }, [ticCtx, colors]);

  // ── Money Market chart (NY Fed: SOFR + ON RRP) ──────────────────────────
  const moneyMarketOption = useMemo(() => {
    const sofrSeries = nyfedCtx?.data?.sofr?.series || [];
    const rrpSeries = nyfedCtx?.data?.rrp || [];
    if (!sofrSeries.length && !rrpSeries.length) return null;
    // NY Fed returns both series newest-first; reverse so the chart reads
    // left=oldest, right=newest. Without the reverse, the SOFR line ran
    // backwards (latest 04-30 on the left) and the ON RRP bars all
    // clustered on the left edge because RRP only happens ~10 of 30 days.
    const sofrAsc = [...sofrSeries].reverse();
    const last30  = sofrAsc.slice(-30);
    const dates   = last30.map(r => r.date);
    const sofrVals = last30.map(r => r.rate);
    const rrpByDate = Object.fromEntries(rrpSeries.map(r => [r.date, r.acceptedB]));
    const rrpVols = dates.map(d => rrpByDate[d] != null ? rrpByDate[d] : null);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis' },
      legend: { data: ['SOFR (%)', 'ON RRP ($B)'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 9 } },
      grid: { top: 22, right: 50, bottom: 22, left: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 9, interval: Math.max(1, Math.floor(dates.length / 5)) }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: [
        { type: 'value', name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'value', name: '$B', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, position: 'right', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}' }, splitLine: { show: false } },
      ],
      series: [
        { name: 'SOFR (%)', type: 'line', yAxisIndex: 0, data: sofrVals, symbol: 'none', smooth: 0.3, lineStyle: { color: '#22d3ee', width: 1.6 } },
        { name: 'ON RRP ($B)', type: 'bar', yAxisIndex: 1, data: rrpVols, itemStyle: { color: '#f59e0b88' }, barWidth: 6 },
      ],
    };
  }, [nyfedCtx, colors]);

  // ── Auction quality trend (Treasury Fiscal Data) ────────────────────────
  // Two complementary signals on one chart: bid-to-cover ratio (line, left
  // axis) and indirect-bidder share (bar, right axis). Strong demand looks
  // like rising BTC + rising indirect %; weak demand is the opposite, with
  // dealers absorbing more.
  const auctionTrendOption = useMemo(() => {
    const rows = (auctionCtx?.data?.auctions || []).slice(0, 20).reverse();
    if (!rows.length) return null;
    const dates = rows.map(r => `${r.auctionDate}\n${r.securityTerm}`);
    const btc   = rows.map(r => r.bidToCover);
    const ind   = rows.map(r => r.indirectPct != null ? Math.round(r.indirectPct * 10) / 10 : null);
    return {
      animation: false,
      backgroundColor: 'transparent',
      tooltip: { trigger: 'axis', formatter: ps => {
        const i = ps[0]?.dataIndex;
        const r = rows[i];
        if (!r) return '';
        return `<b>${r.auctionDate}</b> · ${r.securityType} ${r.securityTerm}<br/>BTC: ${r.bidToCover?.toFixed(2)}<br/>Indirect: ${r.indirectPct?.toFixed(1)}%<br/>Direct: ${r.directPct?.toFixed(1)}%<br/>Dealer: ${r.dealerPct?.toFixed(1)}%${r.stopYieldPct != null ? `<br/>Stop yield: ${r.stopYieldPct.toFixed(3)}%` : ''}`;
      }},
      legend: { data: ['Bid-to-Cover', 'Indirect %'], top: 0, textStyle: { color: colors.textSecondary, fontSize: 10 } },
      grid: { top: 28, right: 56, bottom: 40, left: 40 },
      xAxis: { type: 'category', data: dates, axisLabel: { color: colors.textMuted, fontSize: 8, interval: 0, rotate: 35 }, axisLine: { lineStyle: { color: colors.cardBg } } },
      yAxis: [
        { type: 'value', name: 'BTC', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, axisLabel: { color: colors.textMuted, fontSize: 9 }, splitLine: { lineStyle: { color: colors.cardBg } } },
        { type: 'value', name: '%', nameTextStyle: { color: colors.textMuted, fontSize: 9 }, position: 'right', axisLabel: { color: colors.textMuted, fontSize: 9, formatter: '{value}%' }, splitLine: { show: false }, max: 100 },
      ],
      series: [
        { name: 'Bid-to-Cover', type: 'line', yAxisIndex: 0, data: btc, symbol: 'circle', symbolSize: 4, lineStyle: { color: '#22d3ee', width: 2 }, itemStyle: { color: '#22d3ee' } },
        { name: 'Indirect %', type: 'bar', yAxisIndex: 1, data: ind, itemStyle: { color: '#10b98155' }, barWidth: 8 },
      ],
    };
  }, [auctionCtx, colors]);

  const auctionDemandSummary = useMemo(() => {
    const rows = auctionCtx?.data?.auctions || [];
    if (!rows.length) return null;
    const recent = rows.slice(0, 10);
    const summary = auctionCtx?.data?.summary || {};
    const avg = (values) => {
      const nums = values.map(Number).filter(Number.isFinite);
      return nums.length ? nums.reduce((sum, v) => sum + v, 0) / nums.length : null;
    };
    const avgBidToCover = Number.isFinite(Number(summary.avgBidToCover)) ? Number(summary.avgBidToCover) : avg(recent.map(r => r.bidToCover));
    const avgIndirectPct = Number.isFinite(Number(summary.avgIndirectPct)) ? Number(summary.avgIndirectPct) : avg(recent.map(r => r.indirectPct));
    const avgDealerPct = avg(recent.map(r => r.dealerPct));
    const demandLabel = avgBidToCover == null
      ? 'Unknown'
      : avgBidToCover >= 2.6 && (avgIndirectPct ?? 0) >= 60
        ? 'Strong'
        : avgBidToCover >= 2.2
          ? 'Stable'
          : 'Soft';
    return {
      latest: rows[0],
      count: summary.count ?? rows.length,
      avgBidToCover,
      avgIndirectPct,
      avgDealerPct,
      demandLabel,
    };
  }, [auctionCtx]);

  return (
    <div className="bonds-dashboard bonds-dashboard--bento">
      <BentoWrapper layout={layout} storageKey="bonds-layout-v9">
        {/* KPI strip — first bento child, full-width across row 0. Each
            pill is clickable (MetricValue popover with FRED series ID). */}
        <BentoCard
          key="kpi"
          title="Key Metrics"
          subtitle="US Treasury yields · Fed funds · curve spread · credit spreads · 5Y breakeven"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="FRED / Yahoo Finance"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <MarketKpiStrip kpis={kpiItems} bare />
        </BentoCard>

        {/* Yield Curve */}
        <BentoCard
          key="yield"
          title="Yield Curve"
          subtitle={`${countryCount} markets · US multi-tenor + global 10Y`}
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content yc-host"
          source="FRED"
          timestamp={lastUpdated}
          isLive={Object.keys(yieldCurveData || {}).some(k => yieldCurveData[k] && Object.values(yieldCurveData[k]).some(v => v != null))}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <YieldCurve
            yieldCurveData={yieldCurveData}
            spreadIndicators={spreadIndicators}
            fredYieldHistory={fredYieldHistory}
            yieldHistory={yieldHistory}
            lastUpdated={lastUpdated}
          />
        </BentoCard>

        {/* Key Metrics (sidebar) */}
        <BentoCard
          key="metrics"
          title="Key Metrics"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="FRED / Treasury / World Bank"
          timestamp={lastUpdated}
          isLive={macroData && Object.values(macroData).some(v => v != null)}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <>
               <div className="bonds-sidebar-section">
                 <div className="bonds-sidebar-title">Yields (US)</div>
                 <div className="bonds-metric-card">
                   {['3m', '2y', '5y', '10y', '30y'].map(tenor => (
                     <div key={tenor} className="bonds-metric-row">
                       <span className="bonds-metric-name">{tenor.toUpperCase()}</span>
                       <span className="bonds-metric-num">
                         <MetricValue value={usCurve?.[tenor]} format={v => `${v?.toFixed(2)}%`} seriesKey={`us-${tenor}`} timestamp={lastUpdated} />
                       </span>
                     </div>
                   ))}
                 </div>
                 <div className="bonds-metric-card">
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">Steepest</span>
                     <span className="bonds-metric-num info">{steepest?.country} ({steepest?.spread?.toFixed(0)}bp)</span>
                   </div>
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">Flattest</span>
                     <span className="bonds-metric-num info">{flattest?.country} ({flattest?.spread?.toFixed(0)}bp)</span>
                   </div>
                 </div>
               </div>
               <div className="bonds-sidebar-section">
                 <div className="bonds-sidebar-title">Spreads</div>
                 <div className="bonds-metric-card">
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">2s10s</span>
                     <span className={`bonds-metric-num ${spreadIndicators?.t10y2y >= 0 ? 'positive' : 'negative'}`}>
                       <MetricValue value={spreadIndicators?.t10y2y} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y2y" timestamp={lastUpdated} />
                     </span>
                   </div>
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">10s3m</span>
                     <span className={`bonds-metric-num ${spreadIndicators?.t10y3m >= 0 ? 'positive' : 'negative'}`}>
                       <MetricValue value={spreadIndicators?.t10y3m} format={v => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`} seriesKey="t10y3m" timestamp={lastUpdated} />
                     </span>
                   </div>
                   <div className="bonds-metric-row">
                     <span className="bonds-metric-name">5s30s</span>
                     <span className={`bonds-metric-num ${spreadHistory?.latest?.t5y30y >= 0 ? 'positive' : 'negative'}`}>
                       <MetricValue value={spreadHistory?.latest?.t5y30y} format={v => `${v >= 0 ? '+' : ''}${v?.toFixed(2)}%`} seriesKey="t5y30y" timestamp={lastUpdated} />
                     </span>
                   </div>
                 </div>
               </div>

            {tipsYields && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Real Yields (TIPS)</div>
                <div className="bonds-metric-card">
                  {tipsYields['5y'] != null && <div className="bonds-metric-row"><span className="bonds-metric-name">5Y TIPS</span><span className="bonds-metric-num" style={{ color: '#22d3ee' }}><MetricValue value={tipsYields['5y']} format={v => `${v.toFixed(2)}%`} seriesKey="tips5y" timestamp={lastUpdated} /></span></div>}
                  {tipsYields['10y'] != null && <div className="bonds-metric-row"><span className="bonds-metric-name">10Y TIPS</span><span className="bonds-metric-num" style={{ color: '#a78bfa' }}><MetricValue value={tipsYields['10y']} format={v => `${v.toFixed(2)}%`} seriesKey="tips10y" timestamp={lastUpdated} /></span></div>}
                  {tipsYields['30y'] != null && <div className="bonds-metric-row"><span className="bonds-metric-name">30Y TIPS</span><span className="bonds-metric-num"><MetricValue value={tipsYields['30y']} format={v => `${v.toFixed(2)}%`} seriesKey="tips30y" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
            {macroData && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Macro</div>
                <div className="bonds-metric-card">
                  {macroData.unemployment != null && <div className="bonds-metric-row"><span className="bonds-metric-name">Unemployment</span><span className="bonds-metric-num"><MetricValue value={macroData.unemployment} format={v => `${v.toFixed(1)}%`} seriesKey="unemployment" timestamp={lastUpdated} /></span></div>}
                  {macroData.gdp != null && <div className="bonds-metric-row"><span className="bonds-metric-name">GDP Growth</span><span className="bonds-metric-num" style={{ color: macroData.gdp > 0 ? '#4ade80' : '#f87171' }}><MetricValue value={macroData.gdp} format={v => `${v.toFixed(1)}%`} seriesKey="gdp" timestamp={lastUpdated} /></span></div>}
                  {macroData.pce != null && <div className="bonds-metric-row"><span className="bonds-metric-name">PCE Inflation</span><span className="bonds-metric-num" style={{ color: macroData.pce > 2 ? '#fbbf24' : '#4ade80' }}><MetricValue value={macroData.pce} format={v => `${v.toFixed(1)}%`} seriesKey="pce" timestamp={lastUpdated} /></span></div>}
                   {nationalDebt != null && <div className="bonds-metric-row"><span className="bonds-metric-name">US Debt</span><span className="bonds-metric-num" style={{ color: '#f87171' }}><MetricValue value={nationalDebt} format={v => convertAndFormat(v, 'USD', 1)} seriesKey="federalDebt" timestamp={lastUpdated} /></span></div>}

                  {debtToGdpHistory?.latest != null && <div className="bonds-metric-row"><span className="bonds-metric-name">Debt/GDP</span><span className="bonds-metric-num" style={{ color: '#f87171' }}><MetricValue value={debtToGdpHistory.latest} format={v => `${v.toFixed(1)}%`} seriesKey="debtToGdp" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
            {breakevensData && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Breakevens</div>
                <div className="bonds-metric-card">
                  {breakevensData.current?.be5y != null && <div className="bonds-metric-row"><span className="bonds-metric-name">5Y BE</span><span className="bonds-metric-num" style={{ color: '#f59e0b' }}><MetricValue value={breakevensData.current.be5y} format={v => `${v.toFixed(2)}%`} seriesKey="be5y" timestamp={lastUpdated} /></span></div>}
                  {breakevensData.current?.be10y != null && <div className="bonds-metric-row"><span className="bonds-metric-name">10Y BE</span><span className="bonds-metric-num" style={{ color: '#f59e0b' }}><MetricValue value={breakevensData.current.be10y} format={v => `${v.toFixed(2)}%`} seriesKey="be10y" timestamp={lastUpdated} /></span></div>}
                </div>
              </div>
            )}
            {fedFundsFutures && (
              <div className="bonds-sidebar-section">
                <div className="bonds-sidebar-title">Fed Funds</div>
                <div className="bonds-metric-card">
                  <div className="bonds-metric-row">
                    <span className="bonds-metric-name">Effective Rate</span>
                    <span className="bonds-metric-num accent">
                      <MetricValue value={fedFundsFutures?.effectiveRate} format={v => `${v?.toFixed(2)}%`} seriesKey="effRate" timestamp={lastUpdated} />
                    </span>
                  </div>
                </div>
              </div>
            )}
             {spreadData && (
               <div className="bonds-sidebar-section">
                 <div className="bonds-sidebar-title">Credit Spreads</div>
                 <div className="bonds-metric-card">
                    {spreadData.current?.igSpread != null && <div className="bonds-metric-row"><span className="bonds-metric-name">IG</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.igSpread} format={v => `${v.toFixed(0)}bp`} seriesKey="igSpread" timestamp={lastUpdated} /></span></div>}
                    {spreadData.current?.hySpread != null && <div className="bonds-metric-row"><span className="bonds-metric-name">HY</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.hySpread} format={v => `${v.toFixed(0)}bp`} seriesKey="hySpread" timestamp={lastUpdated} /></span></div>}
                    {spreadData.current?.emSpread != null && <div className="bonds-metric-row"><span className="bonds-metric-name">EM</span><span className="bonds-metric-num"><MetricValue value={spreadData.current.emSpread} format={v => `${v.toFixed(0)}bp`} seriesKey="emSpread" timestamp={lastUpdated} /></span></div>}
                 </div>
               </div>
             )}


          </>
        </BentoCard>

        {/* Credit Spreads */}
        <BentoCard key="credit" title="Credit Spreads" subtitle="IG · HY · EM · BBB" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED ICE BofA" timestamp={lastUpdated} isLive={!!(spreadData?.dates?.length || spreadData?.current?.hySpread != null)} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {(spreadData?.dates?.length || spreadData?.current)
            ? <SpreadMonitor spreadData={spreadData} mortgageSpread={mortgageSpread} lastUpdated={lastUpdated} />
            : <div className="bonds-empty">No spread data available</div>}
        </BentoCard>

        {/* Real Yields — RealYields was refactored in Phase 6b to expose
            just chart content; chrome handled by BentoCard like everywhere
            else. */}
        <BentoCard
          key="realYield"
          title="TIPS Real Yields"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="FRED DFII5 / DFII10"
          timestamp={lastUpdated}
          isLive={realYieldHistory?.dates?.length > 0}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <RealYields realYieldHistory={realYieldHistory} lastUpdated={lastUpdated} />
        </BentoCard>

        {/* Credit Ratings */}
        <BentoCard key="ratings" title="Credit Ratings" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="S&P / Moody's / Fitch" timestamp={lastUpdated} isLive={!!creditRatingsAsOf} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {creditRatingsData && <CreditMatrix creditRatingsData={creditRatingsData} creditRatingsAsOf={creditRatingsAsOf} lastUpdated={lastUpdated} />}
        </BentoCard>

        {/* Curve Spreads */}
        <BentoCard key="curvespreads" title="Curve Spreads" subtitle="2s10s · 10s3m · 5s30s" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED T10Y2Y / T10Y3M" timestamp={lastUpdated} isLive={spreadHistory?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {spreadHistoryOption && <SafeECharts option={spreadHistoryOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Credit Spread History', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'T10Y2Y' }], updatedAt: lastUpdated }} />}
        </BentoCard>

        {/* Fed Balance Sheet */}
        <BentoCard key="fed" title="Fed Balance Sheet" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED WALCL" timestamp={lastUpdated} isLive={fedBalanceSheetHistory?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {fedBalanceOption && <SafeECharts option={fedBalanceOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Fed Balance Sheet', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'WALCL' }], updatedAt: lastUpdated }} />}
        </BentoCard>

        {/* M2 Money Supply */}
        <BentoCard key="m2" title="M2 Money Supply" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED M2SL" timestamp={lastUpdated} isLive={m2HistoryData?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {m2Option && <SafeECharts option={m2Option} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'M2 Money Supply', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'M2SL' }], updatedAt: lastUpdated }} />}
        </BentoCard>

        {/* CPI Components */}
        <BentoCard key="cpi" title="CPI Components (YoY)" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED CPIAUCSL / CPILFESL" timestamp={lastUpdated} isLive={cpiComponents?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          <CpiComponents cpiComponents={cpiComponents} lastUpdated={lastUpdated} />
        </BentoCard>

        {/* Debt-to-GDP */}
        <BentoCard key="debtgdp" title="Debt-to-GDP" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED GFDEBTN / GDP" timestamp={lastUpdated} isLive={debtToGdpHistory?.dates?.length > 0} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {debtToGdpOption && <SafeECharts option={debtToGdpOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Debt-to-GDP', source: 'FRED', endpoint: '/api/bonds', series: [{ id: 'GFDEBTN' }], updatedAt: lastUpdated }} />}
        </BentoCard>

        {/* Breakevens */}
        <BentoCard key="breakevens" title="Breakeven Inflation" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="FRED DFII5 / DFII10" timestamp={lastUpdated} isLive={!!breakevensData?.current?.be5y} isCurrent={isCurrent} fetchedOn={fetchedOn} fetchLog={fetchLog} error={error}>
          {breakevensData && <BreakevenMonitor breakevensData={breakevensData} lastUpdated={lastUpdated} />}
        </BentoCard>

        {/* Duration Ladder — US Treasury debt by maturity */}
        <BentoCard
          key="duration"
          title="Duration Ladder"
          subtitle={`US Treasury marketable debt by maturity${durationLadderMeta?.asOf ? ` (as of ${new Date(durationLadderMeta.asOf + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})` : ''}`}
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content dl-host"
          source="Treasury Fiscal Data / CME ZQ"
          timestamp={lastUpdated}
          isLive={!!durationLadderMeta || !!(fedFundsFutures && Object.keys(fedFundsFutures).length > 1)}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <DurationLadder
            bare
            durationLadderData={durationLadderData}
            durationLadderMeta={durationLadderMeta}
            treasuryRates={treasuryRates}
            fedFundsFutures={fedFundsFutures}
          />
        </BentoCard>

        {/* Macro Indicators */}
        {/* Foreign Holders — Major foreign holders of US Treasuries (Treasury TIC) */}
        <BentoCard
          key="foreign-holders"
          title="Foreign Holders"
          subtitle="Top-5 + All Other · 12-month rotation · USD billions"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="US Treasury TIC"
          timestamp={ticCtx?.lastUpdated || lastUpdated}
          isLive={!!(ticCtx?.data?.latest?.length)}
          isCurrent={ticCtx?.isCurrent ?? isCurrent}
          fetchedOn={ticCtx?.fetchedOn || fetchedOn}
          fetchLog={ticCtx?.fetchLog || fetchLog}
          error={ticCtx?.error || error}
        >
          {foreignHoldersOption ? (
            <SafeECharts option={foreignHoldersOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Foreign Holders', source: 'US Treasury TIC', endpoint: '/api/treasury/tic', series: [], updatedAt: ticCtx?.lastUpdated || lastUpdated }} />
          ) : (
            <div className="bonds-empty">No TIC data available</div>
          )}
        </BentoCard>

        {/* Money Market — SOFR + ON RRP overnight (NY Fed Markets data) */}
        <BentoCard
          key="money-market"
          title="Money Market"
          subtitle="SOFR (left) · ON RRP volume (right) · last 30 days"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content"
          source="NY Fed Markets"
          timestamp={nyfedCtx?.lastUpdated || lastUpdated}
          isLive={!!(nyfedCtx?.data?.sofr?.series?.length)}
          isCurrent={nyfedCtx?.isCurrent ?? isCurrent}
          fetchedOn={nyfedCtx?.fetchedOn || fetchedOn}
          fetchLog={nyfedCtx?.fetchLog || fetchLog}
          error={nyfedCtx?.error || error}
        >
          {moneyMarketOption ? (
            <SafeECharts option={moneyMarketOption} style={{ height: '100%', width: '100%' }} sourceInfo={{ title: 'Money Market', source: 'NY Fed Markets', endpoint: '/api/nyfed', series: [], updatedAt: nyfedCtx?.lastUpdated || lastUpdated }} />
          ) : (
            <div className="bonds-empty">No NY Fed data available</div>
          )}
        </BentoCard>

        {/* Recent Auctions — bid-to-cover trend + indirect-bidder share table */}
        <BentoCard
          key="auctions"
          title="Recent Auctions"
          subtitle={auctionDemandSummary
            ? `${auctionDemandSummary.demandLabel} demand · avg BTC ${auctionDemandSummary.avgBidToCover?.toFixed(2) ?? '—'} · indirect ${auctionDemandSummary.avgIndirectPct?.toFixed(0) ?? '—'}%`
            : 'Bid-to-cover trend · indirect-bidder share = foreign demand proxy'}
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content auc-host"
          source="US Treasury Fiscal Data"
          timestamp={auctionCtx?.lastUpdated || lastUpdated}
          isLive={!!(auctionCtx?.data?.auctions?.length)}
          isCurrent={auctionCtx?.isCurrent ?? isCurrent}
          fetchedOn={auctionCtx?.fetchedOn || fetchedOn}
          fetchLog={auctionCtx?.fetchLog || fetchLog}
          error={auctionCtx?.error || error}
        >
          {auctionTrendOption ? (
            <div className="auc-panel">
              {auctionDemandSummary && (
                <div className="auc-kpis">
                  {[
                    ['Demand', auctionDemandSummary.demandLabel, '#22d3ee'],
                    ['Avg BTC', auctionDemandSummary.avgBidToCover, '#10b981', (v) => v.toFixed(2)],
                    ['Indirect', auctionDemandSummary.avgIndirectPct, '#a78bfa', (v) => `${v.toFixed(0)}%`],
                    ['Dealer', auctionDemandSummary.avgDealerPct, '#f59e0b', (v) => `${v.toFixed(0)}%`],
                  ].map(([label, value, color, format]) => (
                    <div key={label} className="auc-kpi">
                      <span className="auc-kpi-label">{label}</span>
                      <span className="auc-kpi-value" style={{ color }}>
                        {typeof format === 'function' && Number.isFinite(Number(value))
                          ? format(Number(value))
                          : (value ?? '—')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="auc-main">
                <div className="auc-chart-card">
                  <div className="auc-section-title">Bid-to-cover · indirect %</div>
                  <div className="auc-chart-body">
                    <SafeECharts
                      option={auctionTrendOption}
                      style={{ height: '100%', width: '100%' }}
                      sourceInfo={{
                        title: 'Auction Bid-to-Cover',
                        source: 'US Treasury Fiscal Data',
                        endpoint: '/api/treasury/auctions',
                        series: [],
                        updatedAt: auctionCtx?.lastUpdated || lastUpdated,
                      }}
                    />
                  </div>
                </div>
                <div className="auc-table-card">
                  <div className="auc-section-title">
                    Recent results · {(auctionCtx?.data?.auctions || []).length} auctions
                  </div>
                  <div className="auc-table" role="table">
                    <div className="auc-table-head" role="row">
                      <span role="columnheader">Date</span>
                      <span role="columnheader">Issue</span>
                      <span role="columnheader">BTC</span>
                      <span role="columnheader">Ind%</span>
                      <span role="columnheader">Yield</span>
                    </div>
                    <div className="auc-table-body">
                      {(auctionCtx?.data?.auctions || []).slice(0, 30).map((r, i) => {
                        const btc = r.bidToCover;
                        const btcColor =
                          btc == null ? undefined
                            : btc >= 2.5 ? '#10b981'
                              : btc >= 2.0 ? '#fbbf24'
                                : '#f87171';
                        return (
                          <div
                            key={`${r.auctionDate}-${r.securityTerm}-${i}`}
                            className="auc-table-row"
                            role="row"
                          >
                            <span className="auc-td-date" role="cell">
                              {r.auctionDate?.slice(5) || '—'}
                            </span>
                            <span className="auc-td-issue" role="cell" title={`${r.securityType || ''} ${r.securityTerm || ''}`}>
                              {(r.securityType?.[0] || '?')} · {r.securityTerm || '—'}
                            </span>
                            <span className="auc-td-num" role="cell" style={{ color: btcColor }}>
                              {btc != null ? btc.toFixed(2) : '—'}
                            </span>
                            <span className="auc-td-num" role="cell">
                              {r.indirectPct != null ? `${r.indirectPct.toFixed(0)}%` : '—'}
                            </span>
                            <span className="auc-td-num" role="cell">
                              {r.stopYieldPct != null ? `${r.stopYieldPct.toFixed(2)}%` : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bonds-empty">No auction data available</div>
          )}
        </BentoCard>

        <BentoCard
          key="macro"
          title="Macro Indicators"
          subtitle="Fed balance sheet · money · labor · growth · policy rates"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content mi-host"
          source="FRED"
          timestamp={lastUpdated}
          isLive={macroData && Object.keys(macroData).length > 0}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <MacroIndicatorsPanel
            macroData={macroData}
            nationalDebt={nationalDebt}
            debtToGdpHistory={debtToGdpHistory}
            lastUpdated={lastUpdated}
            convertAndFormat={convertAndFormat}
          />
        </BentoCard>

        <BentoCard
          key="ecb-yields"
          title="ECB Policy Rates"
          subtitle="Key rates · €STR · EURIBOR · M3/HICP"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content ecb-host"
          source="ECB SDW"
          timestamp={ecbCtx?.lastUpdated || lastUpdated}
          isLive={!!ecbCtx?.data?.policyRates || !!ecbCtx?.data?.moneyMarket}
          isCurrent={ecbCtx?.isCurrent ?? isCurrent}
          fetchedOn={ecbCtx?.fetchedOn || fetchedOn}
          fetchLog={ecbCtx?.fetchLog || fetchLog}
          error={ecbCtx?.error || error}
        >
          <EcbPolicyRatesPanel data={ecbCtx?.data} />
        </BentoCard>

        <BentoCard
          key="global-rates"
          title="Global Central Bank Policy Rates"
          subtitle="Overnight / policy rates · FRED + ECB"
          accent="bonds"
          className="bonds-bento-card"
          contentClassName="bonds-panel-content mi-host"
          source="FRED / ECB"
          timestamp={lastUpdated}
          isLive={isLive}
          isCurrent={isCurrent}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        >
          <CentralBankRatesPanel
            rates={macroData?.centralBankRates}
            meta={macroData?.centralBankMeta}
            ecbRate={ecbCtx?.data?.policyRates?.mainRefinancing?.value}
          />
        </BentoCard>

        <BentoCard key="treasury-cost" title="Treasury Avg Interest Cost" accent="bonds" className="bonds-bento-card" contentClassName="bonds-panel-content" source="US Treasury Fiscal Data" timestamp={treasuryCostCtx?.lastUpdated || lastUpdated} isLive={!!treasuryCostCtx?.data?.latest} isCurrent={treasuryCostCtx?.isCurrent ?? isCurrent} fetchedOn={treasuryCostCtx?.fetchedOn || fetchedOn} fetchLog={treasuryCostCtx?.fetchLog || fetchLog} error={treasuryCostCtx?.error || error}>
          {treasuryCostCtx?.data?.latest ? (
            <div className="bonds-metrics-grid">
              {Object.entries(treasuryCostCtx.data.latest).map(([type, val]) => (
                <div key={type} className="bonds-metric-row">
                  <span className="bonds-metric-name">{type}</span>
                  <span className="bonds-metric-num">{val?.rate != null ? `${val.rate.toFixed(2)}%` : '—'}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bonds-empty">Treasury cost data unavailable</div>
          )}
        </BentoCard>
      </BentoWrapper>
    </div>
  );
}

export default React.memo(BondsDashboard);
