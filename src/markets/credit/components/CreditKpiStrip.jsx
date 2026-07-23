import React from 'react';
import MarketKpiStrip from '../../../components/MarketKpiStrip';

const CreditKpiStrip = ({
  igOas,
  hyOas,
  emSpread,
  defaultRate,
  cpRate,
  lastUpdated,
  isLive,
  fetchLog,
  error,
  fetchedOn,
  isCurrent,
}) => {
  // Each KPI gets a `seriesKey` so MetricValue renders a click-to-inspect
  // popover with the FRED series ID for the spread/rate.
  // `format` may be invoked with the pre-rendered `'—'` placeholder when
  // data is missing — guard with typeof checks before calling toFixed.
  const fmtBps = v => typeof v === 'number' ? `${Math.round(v)} bps` : '—';
  const fmtPct = v => typeof v === 'number' ? `${v.toFixed(2)}%` : '—';
  // Color cues so empty-looking strips are easier to scan when data returns.
  const bpsTone = (v, warn, hot) => {
    if (typeof v !== 'number') return undefined;
    if (v >= hot) return '#f87171';
    if (v >= warn) return '#fbbf24';
    return '#4ade80';
  };
  const kpis = [
    { label: 'IG OAS',       rawValue: igOas,       value: fmtBps(igOas),       format: fmtBps, seriesKey: 'igOAS',                 sublabel: 'Investment Grade', color: bpsTone(igOas, 100, 150) },
    { label: 'HY OAS',       rawValue: hyOas,       value: fmtBps(hyOas),       format: fmtBps, seriesKey: 'hyOAS',                 sublabel: 'High Yield',        color: bpsTone(hyOas, 300, 450) },
    { label: 'EM Spread',    rawValue: emSpread,    value: fmtBps(emSpread),    format: fmtBps, seriesKey: 'emOAS',                 sublabel: 'EM Corp OAS',       color: bpsTone(emSpread, 250, 400) },
    { label: 'Charge-Off',   rawValue: defaultRate, value: fmtPct(defaultRate), format: fmtPct, seriesKey: 'defaultRate',           sublabel: defaultRate != null ? 'Bank charge-off' : 'Aggregate', color: typeof defaultRate === 'number' ? (defaultRate > 3 ? '#f87171' : '#4ade80') : undefined },
    { label: 'CP Rate',      rawValue: cpRate,      value: fmtPct(cpRate),      format: fmtPct, seriesKey: 'commercialPaperVolume', sublabel: '3M commercial paper' },
  ];

  // `bare` mode: skip the panel chrome since this strip is already inside
  // the parent bento card's title-row + content. Without it we get a
  // double-bracketed header.
  return <MarketKpiStrip kpis={kpis} bare />;
};

export default React.memo(CreditKpiStrip);
