/**
 * Mount a panel module inside a bento grid.
 * Progressive: when market bag is empty, fetch /api/panel slice into ctx.
 */
import React, { useMemo } from 'react';
import BentoCard from '../components/BentoCard/BentoCard';
import { useMarketData } from '../hub/DataContext';
import { usePanelSlice } from '../hooks/usePanelSlice';

/**
 * @param {object} props
 * @param {import('./definePanel').PanelDefinition} props.panel
 * @param {string} props.accent
 * @param {object} [props.ctx]
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
  market,
  onRefresh,
  isRefreshing,
  className = '',
  contentClassName = '',
  panelKey: injectedPanelKey,
  style,
}) {
  const marketId = market || panel?.markets?.[0] || accent;
  const panelId = injectedPanelKey || panel?.panelId;
  const marketState = useMarketData(marketId || '');
  const marketLoading = !!(isLoading || marketState?.isLoading || marketState?.isRefreshing);
  const hasBag = !!(marketState?.data && typeof marketState.data === 'object');
  // Progressive slice when bag missing or still loading first paint
  const needSlice = !!marketId && !!panelId && (!hasBag || marketLoading);
  const { slice, status: sliceStatus } = usePanelSlice(marketId, panelId, {
    enabled: needSlice,
  });

  const enrichedCtx = useMemo(() => ({
    ...ctx,
    __marketId: marketId,
    __panelId: panelId,
    __slice: slice,
    __sliceStatus: sliceStatus,
    __progressive: needSlice,
    __marketLoading: marketLoading,
    __hasMarketBag: hasBag,
  }), [ctx, marketId, panelId, slice, sliceStatus, needSlice, marketLoading, hasBag]);

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
    live = typeof panel.isLive === 'function' ? !!panel.isLive(enrichedCtx) : !!panel.isLive;
    disabled = typeof panel.isDisabled === 'function' ? !!panel.isDisabled(enrichedCtx) : !!panel.isDisabled;
    subtitle = typeof panel.getSubtitle === 'function' ? panel.getSubtitle(enrichedCtx) : panel.subtitle;
  } catch (e) {
    console.warn(`[PanelSlot] ${panel.key} isLive/subtitle threw:`, e);
  }

  // Don't force-disable while progressive slice is loading
  if (marketLoading || sliceStatus === 'loading') {
    disabled = false;
  }

  const panelKey = injectedPanelKey || panel.panelId;
  const noFooter = !!(panel.noFooter || ctx?.__noFooter?.[panel.panelId]);
  const source = ctx?.__source?.[panel.panelId] ?? panel.source;
  const loading = marketLoading || sliceStatus === 'loading';

  return (
    <BentoCard
      panelKey={panelKey}
      title={panel.title}
      subtitle={subtitle || undefined}
      accent={accent}
      market={marketId}
      className={`${panel.className || ''} ${className}`.trim()}
      contentClassName={`${panel.contentClassName || ''} ${contentClassName}`.trim()}
      source={source}
      timestamp={timestamp || slice?.fetchedOn || marketState?.fetchedOn}
      isLive={live}
      isCurrent={isCurrent ?? marketState?.isCurrent}
      fetchedOn={fetchedOn || slice?.fetchedOn || marketState?.fetchedOn}
      fetchLog={fetchLog || marketState?.fetchLog}
      error={error || marketState?.error}
      isLoading={loading}
      onRefresh={onRefresh}
      isRefreshing={isRefreshing || marketState?.isRefreshing}
      disabled={disabled}
      noFooter={noFooter}
      style={style}
    >
      <Body ctx={enrichedCtx} />
    </BentoCard>
  );
}
