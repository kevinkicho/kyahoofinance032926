import React from 'react';
import { definePanel } from './definePanel';
import EmptyPanelBody from '../components/BentoCard/EmptyPanelBody';
import ProgressiveSlicePreview from '../components/ProgressiveSlicePreview/ProgressiveSlicePreview';

/**
 * Create an independent panel module whose Body is supplied by the market tab
 * via ctx.__render(panelId). Falls back to progressive /api/panel slice preview.
 */
export function createBridgePanel({
  marketId,
  panelId,
  title,
  source = 'Market data',
  markets,
  className,
  contentClassName,
  getSubtitle,
  isLive,
  isDisabled,
}) {
  const key = `${marketId}:${panelId}`;
  function Body({ ctx }) {
    if (typeof ctx?.__render === 'function') {
      try {
        const node = ctx.__render(panelId, ctx);
        if (node != null && node !== false) return node;
      } catch (e) {
        console.warn(`[panel ${key}] __render threw:`, e);
        return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
      }
    }
    // Progressive: show cached field slice while market body / render is empty
    if (ctx?.__progressive || ctx?.__slice || ctx?.__sliceStatus === 'loading') {
      return (
        <ProgressiveSlicePreview
          title={title}
          slice={ctx.__slice}
          status={ctx.__sliceStatus || 'idle'}
        />
      );
    }
    return (
      <EmptyPanelBody
        message={`${title} — open tab / wait for data`}
        reason={key}
        loading={!!ctx?.__marketLoading}
      />
    );
  }
  return definePanel({
    key,
    panelId,
    markets: markets || [marketId],
    title,
    source,
    className: className || `${marketId}-bento-card`,
    contentClassName: contentClassName || `${marketId}-panel-content`,
    modulePath: `src/panels/${marketId}/${panelId}.jsx`,
    getSubtitle,
    isLive,
    isDisabled,
    Body,
  });
}
