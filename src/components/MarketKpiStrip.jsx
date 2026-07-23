import React from 'react';
import MetricValue from './MetricValue/MetricValue';
import DataFooter from './DataFooter/DataFooter';

/**
 * MarketKpiStrip — a standardized KPI strip used across most market dashboards.
 *
 * Renders a panel-chromed wrapper (.market-panel-card) so the strip reads as
 * a real bento panel rather than a loose row at the top of the page.
 *
 * Each `kpi` may include a `seriesKey` — when present, the value is wrapped
 * in <MetricValue> so users can click it to inspect the underlying source,
 * series ID, and timestamp (same provenance popover used inside bento panels).
 *
 * Pass `source` / `timestamp` / `isLive` / `fetchLog` / `error` / `fetchedOn`
 * / `isCurrent` to render a <DataFooter> badge at the bottom (FETCHED / NO
 * DATA / PENDING with click-to-expand fetch history). Without those props
 * the footer is omitted to preserve the current behavior of older callers.
 *
 * `kpi` shape:
 *   {
 *     label, value, color?, trend?, sublabel?,
 *     seriesKey?,            // opt into MetricValue popover for this pill
 *     rawValue?, format?,    // pair with seriesKey: raw number + formatter
 *   }
 */
export default function MarketKpiStrip({
  kpis = [],
  title,
  source,
  timestamp,
  isLive,
  fetchLog,
  error,
  fetchedOn,
  isCurrent,
  /* When `true`, render only the inner pill row + footer with no outer
     panel chrome. Use when the strip is already inside a bento card so the
     chrome doesn't double up. */
  bare = false,
}) {
  if (!kpis.length) return null;

  const showFooter = source != null;
  const wrapperClass = bare ? 'market-kpi-panel' : 'market-panel-card market-kpi-panel';

  return (
    <div className={wrapperClass}>
      {title && (
        <div className="market-panel-card-header bento-panel-title-row">
          <span className="bento-panel-title">{title}</span>
        </div>
      )}
      <div className="market-kpi-strip">
        {kpis.map((kpi, i) => {
          // If the caller provided a seriesKey, wrap the value in MetricValue
          // so users get the click-to-inspect provenance popover.
          // Otherwise fall back to plain text rendering for backward compat.
          const valueNode = kpi.seriesKey
            ? (
              <MetricValue
                value={kpi.rawValue != null ? kpi.rawValue : kpi.value}
                seriesKey={kpi.seriesKey}
                timestamp={kpi.timestamp || timestamp}
                format={kpi.format || ((v) => (v == null ? '—' : String(v)))}
              />
            )
            : kpi.value;

          return (
            <div key={i} className="market-kpi-pill">
              <span className="market-kpi-label">{kpi.label}</span>
              <div className="market-kpi-value-row">
                <span
                  className="market-kpi-value"
                  style={kpi.color ? { color: kpi.color } : undefined}
                >
                  {valueNode}
                </span>
                {kpi.trend && (
                  <span
                    className="market-kpi-trend"
                    style={kpi.color ? { color: kpi.color } : undefined}
                  >
                    {kpi.trend}
                  </span>
                )}
              </div>
              {kpi.sublabel && (
                <span className="market-kpi-sublabel">{kpi.sublabel}</span>
              )}
            </div>
          );
        })}
      </div>
      {showFooter && (
        <DataFooter
          source={source}
          timestamp={timestamp}
          isLive={isLive}
          fetchLog={fetchLog}
          error={error}
          fetchedOn={fetchedOn}
          isCurrent={isCurrent}
        />
      )}
    </div>
  );
}
