import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import { hasEcbPolicyRatesContent } from './BondsLiveChips';
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

  if (!hasEcbPolicyRatesContent(data)) {
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


export { MacroIndicatorsPanel, EcbPolicyRatesPanel, CentralBankRatesPanel };
