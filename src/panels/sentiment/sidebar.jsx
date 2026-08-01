import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: sentiment:sidebar
 * Body prefers ctx.__render('sidebar') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['sidebar'], ctx.__subtitle['sidebar'], ctx.__disabled['sidebar']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('sidebar', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel sentiment:sidebar] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Market Snapshot — awaiting data"}
      reason={"sentiment:sidebar"}
    />
  );
}

export default definePanel({
  key: "sentiment:sidebar",
  panelId: "sidebar",
  markets: ["sentiment"],
  title: "Market Snapshot",
  source: 'Market data',
  className: "sentiment-bento-card",
  contentClassName: "sentiment-panel-content",
  modulePath: "src/panels/sentiment/sidebar.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['sidebar'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['sidebar']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['sidebar']),
  Body,
});
