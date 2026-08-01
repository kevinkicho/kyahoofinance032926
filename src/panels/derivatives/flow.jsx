import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:flow
 * Body prefers ctx.__render('flow') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['flow'], ctx.__subtitle['flow'], ctx.__disabled['flow']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('flow', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:flow] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Options Flow — awaiting data"}
      reason={"derivatives:flow"}
    />
  );
}

export default definePanel({
  key: "derivatives:flow",
  panelId: "flow",
  markets: ["derivatives"],
  title: "Options Flow",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/flow.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['flow'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['flow']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['flow']),
  Body,
});
