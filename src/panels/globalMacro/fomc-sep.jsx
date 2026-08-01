import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:fomc-sep
 * Body prefers ctx.__render('fomc-sep') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['fomc-sep'], ctx.__subtitle['fomc-sep'], ctx.__disabled['fomc-sep']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('fomc-sep', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:fomc-sep] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"FOMC SEP — awaiting data"}
      reason={"globalMacro:fomc-sep"}
    />
  );
}

export default definePanel({
  key: "globalMacro:fomc-sep",
  panelId: "fomc-sep",
  markets: ["globalMacro"],
  title: "FOMC SEP",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/fomc-sep.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['fomc-sep'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['fomc-sep']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['fomc-sep']),
  Body,
});
