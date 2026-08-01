import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:cross-asset
 * Body prefers ctx.__render('cross-asset') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cross-asset'], ctx.__subtitle['cross-asset'], ctx.__disabled['cross-asset']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cross-asset', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:cross-asset] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Cross-Asset Returns — awaiting data"}
      reason={"sentiment:cross-asset"}
    />
  );
}

export default definePanel({
  key: "sentiment:cross-asset",
  panelId: "cross-asset",
  markets: ["sentiment"],
  title: "Cross-Asset Returns",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/cross-asset.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cross-asset'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cross-asset']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cross-asset']),
  Body,
});
