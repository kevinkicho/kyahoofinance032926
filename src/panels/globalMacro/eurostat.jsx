import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:eurostat
 * Body prefers ctx.__render('eurostat') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['eurostat'], ctx.__subtitle['eurostat'], ctx.__disabled['eurostat']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('eurostat', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:eurostat] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Eurostat Macro — awaiting data"}
      reason={"globalMacro:eurostat"}
    />
  );
}

export default definePanel({
  key: "globalMacro:eurostat",
  panelId: "eurostat",
  markets: ["globalMacro"],
  title: "Eurostat Macro",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/eurostat.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['eurostat'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['eurostat']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['eurostat']),
  Body,
});
