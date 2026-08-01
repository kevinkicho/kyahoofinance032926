import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:scorecard
 * Body prefers ctx.__render('scorecard') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['scorecard'], ctx.__subtitle['scorecard'], ctx.__disabled['scorecard']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('scorecard', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:scorecard] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Scorecard — awaiting data"}
      reason={"globalMacro:scorecard"}
    />
  );
}

export default definePanel({
  key: "globalMacro:scorecard",
  panelId: "scorecard",
  markets: ["globalMacro"],
  title: "Scorecard",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/scorecard.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['scorecard'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['scorecard']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['scorecard']),
  Body,
});
