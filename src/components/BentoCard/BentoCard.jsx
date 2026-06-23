import React from 'react';
import DataFooter from '../DataFooter/DataFooter';
import './BentoCard.css';

// Canonical card wrapper for every panel that lives inside a BentoWrapper
// grid. Replaces the per-tab `<div className="X-bento-card">…</div>`
// boilerplate that was duplicated across 18 dashboards.
//
// Drag handle: outer markup uses `bento-panel-title-row` exactly where
// react-grid-layout's `draggableHandle` selector expects it. The content
// wrapper stops mouse-down propagation so clicks inside the card don't
// trigger drag.
//
// Consumers must still pass `key="<id>"` on the JSX call site (React's
// reserved key prop), since react-grid-layout maps each layout slot's
// `i` to the child's React key. Do NOT also pass `id`.
//
// API:
//   <BentoCard
//     title="Yield Curve"           // required
//     subtitle="..."                // optional, second line
//     accent="bonds"                // hover color preset (see ACCENTS below)
//     accentColor="#ff0000"         // raw color escape hatch (overrides accent)
//     source="..."                  // DataFooter passthrough
//     timestamp={lastUpdated}
//     isLive={isLive}
//     isCurrent={isCurrent}
//     fetchedOn={fetchedOn}
//     fetchLog={fetchLog}
//     error={error}
//     bare                          // skip outer chrome entirely
//     titleActions={<button/>}      // right-side title row slot
//     className="..."               // extra modifier classes
//     noFooter                      // suppress DataFooter
//   >
//     {children}
//   </BentoCard>

const ACCENTS = new Set([
  'bonds', 'fx', 'equities', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
]);

function stopPropagation(e) { e.stopPropagation(); }

// Use forwardRef because react-grid-layout's GridItem wraps each child
// and forwards a ref via DraggableCore. Without forwardRef React logs
// "Function components cannot be given refs" and drag behavior degrades.
const BentoCard = React.forwardRef(function BentoCard({
  title,
  subtitle,
  accent,
  accentColor,
  source,
  timestamp,
  isLive,
  isCurrent,
  isHistorical,
  asOfDate,
  fetchedOn,
  fetchLog,
  error,
  bare = false,
  titleActions,
  className = '',
  contentClassName = '',
  noFooter = false,
  footer,
  children,
  panelKey,
  // react-grid-layout-injected props (style, onMouseDown, onTouchEnd…)
  // get spread onto the root element so its absolute-positioning &
  // drag listeners attach correctly.
  ...rest
}, ref) {
  // `bare` mode: no chrome, just children. Used by sub-cards embedded
  // inside another card that already provides its own outer wrapper.
  // Note: this loses RGL drag wiring; only use bare on cards that are
  // NOT direct children of a BentoWrapper grid.
  if (bare) return <>{children}</>;

  const accentClass = accent && ACCENTS.has(accent) ? `bento-card--${accent}` : '';
  const inlineStyle = accentColor
    ? { '--bento-accent-color': accentColor, ...(rest.style || {}) }
    : rest.style;

  return (
    <div
      ref={ref}
      {...rest}
      data-panel-key={panelKey}
      style={inlineStyle}
      className={`bento-card ${accentClass} ${className} ${rest.className || ''}`.trim().replace(/\s+/g, ' ')}
    >
      <div className="bento-panel-title-row">
        <span className="bento-panel-title">{title}</span>
        {subtitle && <span className="bento-panel-subtitle">{subtitle}</span>}
        {titleActions && <span className="bento-panel-title-actions">{titleActions}</span>}
      </div>
      <div className={`bento-panel-content ${contentClassName}`.trim()} onMouseDown={stopPropagation}>
        {children}
      </div>
      {/* Footer slot. Three modes (in order of precedence):
          1) `footer` prop — arbitrary JSX (e.g. custom toolbar with buttons)
          2) `noFooter` — render nothing
          3) default — DataFooter with provenance props */}
      {footer ? footer
        : !noFooter && (
        <DataFooter
          source={source}
          timestamp={timestamp}
          isLive={isLive}
          isCurrent={isCurrent}
          isHistorical={isHistorical}
          asOfDate={asOfDate}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
        />
      )}
    </div>
  );
});

export default BentoCard;
