import React, { useLayoutEffect, useRef, useState, useCallback } from 'react';
import DataFooter from '../DataFooter/DataFooter';
import EmptyPanelBody from './EmptyPanelBody';
import { useMarketData, useRefetchSingle } from '../../hub/DataContext';
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
//     market="bonds"                // enables footer ▶ (refetch that market only)
//     disabled                      // force opacity-disabled empty state
//     bare                          // skip outer chrome entirely
//     titleActions={<button/>}      // right-side title row slot
//     className="..."               // extra modifier classes
//     noFooter                      // suppress DataFooter
//   >
//     {children}
//   </BentoCard>
//
// Empty / failed panels stay mounted at reduced opacity so layout + health
// signalling remain credible. Prefer EmptyPanelBody over `return null`.

const ACCENTS = new Set([
  'bonds', 'fx', 'equities', 'derivatives', 'realEstate', 'insurance',
  'commodities', 'globalMacro', 'equitiesDeepDive', 'crypto', 'credit',
  'sentiment', 'calendar', 'bls', 'eia', 'alerts', 'watchlist', 'analytics',
]);

function stopPropagation(e) { e.stopPropagation(); }

function contentLooksEmpty(el) {
  if (!el) return true;
  if (el.querySelector('[data-panel-empty="1"]')) return true;
  const hasViz = !!el.querySelector(
    'canvas, svg, table, img, video, [data-series-samples], [data-metric-value], [data-metric-display], .echarts-for-react'
  );
  const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
  if (!text && !hasViz) return true;
  if (/\bno data\b|\bunavailable\b|\bnot available\b|\bno .* scheduled\b/i.test(text) && text.length < 200) {
    return true;
  }
  const hasNumbers = /\d/.test(text);
  // Title-only / dash-only shells without viz
  if (!hasViz && !hasNumbers) return true;
  return false;
}

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
  isLoading,
  market,
  disabled = false,
  emptyMessage = 'No data available',
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
  // Resolve market for panel ▶. Explicit `market` wins; otherwise use accent
  // when it matches a known tab id (common dashboard pattern).
  // Hooks must run unconditionally (including bare mode).
  const marketId = market || (accent && ACCENTS.has(accent) ? accent : null);
  const refetchSingle = useRefetchSingle();
  const marketState = useMarketData(marketId || '');
  const handlePanelRefresh = useCallback(() => {
    if (!marketId) return;
    refetchSingle(marketId);
  }, [marketId, refetchSingle]);

  // `bare` mode: no chrome, just children. Used by sub-cards embedded
  // inside another card that already provides its own outer wrapper.
  // Note: this loses RGL drag wiring; only use bare on cards that are
  // NOT direct children of a BentoWrapper grid.
  if (bare) return <>{children}</>;

  const contentRef = useRef(null);
  const [autoDisabled, setAutoDisabled] = useState(false);

  const recomputeEmpty = useCallback(() => {
    if (disabled || isLoading) {
      setAutoDisabled(false);
      return;
    }
    setAutoDisabled(contentLooksEmpty(contentRef.current));
  }, [disabled, isLoading]);

  useLayoutEffect(() => {
    recomputeEmpty();
    // Charts / MetricValue often paint a frame later.
    let raf1 = 0;
    let raf2 = 0;
    let timer = null;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(recomputeEmpty);
    });
    timer = setTimeout(recomputeEmpty, 250);

    const el = contentRef.current;
    let obs = null;
    if (el && typeof MutationObserver !== 'undefined') {
      let debounce = null;
      obs = new MutationObserver(() => {
        clearTimeout(debounce);
        debounce = setTimeout(recomputeEmpty, 80);
      });
      obs.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
    }
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(timer);
      obs?.disconnect();
    };
  }, [recomputeEmpty, children]);

  const childArr = React.Children.toArray(children).filter(c => c != null && c !== false);
  const hasChildren = childArr.length > 0;
  const isDisabled = !!disabled || (!isLoading && (autoDisabled || !hasChildren));

  const accentClass = accent && ACCENTS.has(accent) ? `bento-card--${accent}` : '';
  const inlineStyle = accentColor
    ? { '--bento-accent-color': accentColor, ...(rest.style || {}) }
    : rest.style;

  // Bound only when actively showing a stream — never when disabled/empty.
  const bound =
    !isDisabled &&
    !error &&
    (isLive === true || isCurrent === true || hasChildren);

  return (
    <div
      ref={ref}
      {...rest}
      data-panel-key={panelKey}
      data-panel-bound={bound ? '1' : '0'}
      data-panel-live={isLive && !isDisabled ? '1' : '0'}
      data-panel-current={isCurrent && !isDisabled ? '1' : '0'}
      data-panel-disabled={isDisabled ? '1' : '0'}
      aria-disabled={isDisabled || undefined}
      style={inlineStyle}
      className={`bento-card ${accentClass} ${isDisabled ? 'bento-card--disabled' : ''} ${className} ${rest.className || ''}`.trim().replace(/\s+/g, ' ')}
    >
      <div className="bento-panel-title-row">
        <span className="bento-panel-title">{title}</span>
        {subtitle && <span className="bento-panel-subtitle">{subtitle}</span>}
        {isDisabled && !isLoading && (
          <span className="bento-panel-disabled-badge" title="Panel has no usable data">—</span>
        )}
        {titleActions && <span className="bento-panel-title-actions">{titleActions}</span>}
      </div>
      <div
        ref={contentRef}
        className={`bento-panel-content ${contentClassName}`.trim()}
        onMouseDown={stopPropagation}
      >
        {hasChildren ? children : <EmptyPanelBody message={error ? 'Data unavailable' : emptyMessage} reason={typeof error === 'string' ? error : undefined} />}
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
          isLive={isLive && !isDisabled}
          isCurrent={isCurrent && !isDisabled}
          isHistorical={isHistorical}
          asOfDate={asOfDate}
          fetchedOn={fetchedOn}
          fetchLog={fetchLog}
          error={error}
          isLoading={isLoading || (!!marketId && marketState?.isLoading)}
          onRefresh={marketId ? handlePanelRefresh : undefined}
          isRefreshing={!!(marketId && (marketState?.isRefreshing || marketState?.isLoading))}
        />
      )}
    </div>
  );
});

export default BentoCard;
export { EmptyPanelBody };
