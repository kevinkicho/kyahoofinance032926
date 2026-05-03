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
  const kpis = [
    { label: 'IG OAS',       rawValue: igOas,       value: fmtBps(igOas),       format: fmtBps, seriesKey: 'igOAS',                 sublabel: 'Investment Grade' },
    { label: 'HY OAS',       rawValue: hyOas,       value: fmtBps(hyOas),       format: fmtBps, seriesKey: 'hyOAS',                 sublabel: 'High Yield' },
    { label: 'EM Spread',    rawValue: emSpread,    value: fmtBps(emSpread),    format: fmtBps, seriesKey: 'emYield',               sublabel: 'Emerging' },
    { label: 'Default Rate', rawValue: defaultRate, value: fmtPct(defaultRate), format: fmtPct, seriesKey: 'defaultRate',           sublabel: 'Aggregate' },
    { label: 'CP Rate',      rawValue: cpRate,      value: fmtPct(cpRate),      format: fmtPct, seriesKey: 'commercialPaperVolume', sublabel: 'Commercial Paper' },
  ];

  // `bare` mode: skip the panel chrome since this strip is already inside
  // the parent bento card's title-row + content. Without it we get a
  // double-bracketed header.
  return <MarketKpiStrip kpis={kpis} bare />;
};

export default React.memo(CreditKpiStrip);
