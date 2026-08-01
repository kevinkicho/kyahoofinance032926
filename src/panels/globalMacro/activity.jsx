import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:activity
 * Body prefers ctx.__render('activity') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['activity'], ctx.__subtitle['activity'], ctx.__disabled['activity']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('activity', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:activity] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Economic Activity — awaiting data"}
      reason={"globalMacro:activity"}
    />
  );
}

export default definePanel({
  key: "globalMacro:activity",
  panelId: "activity",
  markets: ["globalMacro"],
  title: "Economic Activity",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/activity.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['activity'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['activity']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['activity']),
  Body,
});
