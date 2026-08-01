/**
 * Mount a panel module inside a bento grid.
 * Tab dashboards pass provenance + accent; the panel Body is independent.
 */
import React from 'react';
import BentoCard from '../components/BentoCard/BentoCard';

/**
 * @param {object} props
 * @param {import('./definePanel').PanelDefinition} props.panel
 * @param {string} props.accent            Tab accent for BentoCard
 * @param {object} [props.ctx]             Optional context passed to Body / isLive / subtitle
 * @param {string|null} [props.timestamp]
 * @param {boolean} [props.isCurrent]
 * @param {string|null} [props.fetchedOn]
 * @param {array} [props.fetchLog]
 * @param {string|null} [props.error]
 * @param {boolean} [props.isLoading]
 * @param {string} [props.className]
 * @param {string} [props.contentClassName]
 */
export default function PanelSlot({
  panel,
  accent,
  ctx = {},
  timestamp,
  isCurrent,
  fetchedOn,
  fetchLog,
  error,
  isLoading,
  className = '',
  contentClassName = '',
  // BentoWrapper cloneElement may inject these:
  panelKey: injectedPanelKey,
  style,
}) {
  if (!panel?.Body) {
    return (
      <BentoCard
        panelKey={injectedPanelKey || 'unknown'}
        title="Missing panel"
        accent={accent}
        disabled
        emptyMessage="Panel module failed to load"
        noFooter
        style={style}
      />
    );
  }
  const Body = panel.Body;
  let live = false;
  let disabled = false;
  let subtitle;
  try {
    live = typeof panel.isLive === 'function' ? !!panel.isLive(ctx) : !!panel.isLive;
    disabled = typeof panel.isDisabled === 'function' ? !!panel.isDisabled(ctx) : !!panel.isDisabled;
    subtitle = typeof panel.getSubtitle === 'function' ? panel.getSubtitle(ctx) : panel.subtitle;
  } catch (e) {
    console.warn(`[PanelSlot] ${panel.key} isLive/subtitle threw:`, e);
  }

  // React `key` must be on <PanelSlot key={panelId} /> so BentoWrapper matches layout.
  const panelKey = injectedPanelKey || panel.panelId;
  const noFooter = !!(panel.noFooter || ctx?.__noFooter?.[panel.panelId]);
  const source = ctx?.__source?.[panel.panelId] ?? panel.source;

  return (
    <BentoCard
      panelKey={panelKey}
      title={panel.title}
      subtitle={subtitle || undefined}
      accent={accent}
      className={`${panel.className || ''} ${className}`.trim()}
      contentClassName={`${panel.contentClassName || ''} ${contentClassName}`.trim()}
      source={source}
      timestamp={timestamp}
      isLive={live}
      isCurrent={isCurrent}
      fetchedOn={fetchedOn}
      fetchLog={fetchLog}
      error={error}
      isLoading={isLoading}
      disabled={disabled}
      noFooter={noFooter}
      style={style}
    >
      <Body ctx={ctx} />
    </BentoCard>
  );
}
