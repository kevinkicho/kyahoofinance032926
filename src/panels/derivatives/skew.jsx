import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:skew
 * Body prefers ctx.__render('skew') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['skew'], ctx.__subtitle['skew'], ctx.__disabled['skew']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('skew', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:skew] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Skew Index — awaiting data"}
      reason={"derivatives:skew"}
    />
  );
}

export default definePanel({
  key: "derivatives:skew",
  panelId: "skew",
  markets: ["derivatives"],
  title: "Skew Index",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/skew.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['skew'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['skew']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['skew']),
  Body,
});
