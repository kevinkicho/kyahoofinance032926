import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:fed
 * Body prefers ctx.__render('fed') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fed'], ctx.__subtitle['fed'], ctx.__disabled['fed']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fed', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:fed] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Fed Balance Sheet — awaiting data"}
      reason={"bonds:fed"}
    />
  );
}

export default definePanel({
  key: "bonds:fed",
  panelId: "fed",
  markets: ["bonds"],
  title: "Fed Balance Sheet",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/fed.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fed'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fed']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fed']),
  Body,
});
