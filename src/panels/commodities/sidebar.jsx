import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:sidebar
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
      console.warn('[panel commodities:sidebar] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Market Summary — awaiting data"}
      reason={"commodities:sidebar"}
    />
  );
}

export default definePanel({
  key: "commodities:sidebar",
  panelId: "sidebar",
  markets: ["commodities"],
  title: "Market Summary",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/sidebar.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['sidebar'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['sidebar']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['sidebar']),
  Body,
});
