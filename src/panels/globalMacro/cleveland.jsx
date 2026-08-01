import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:cleveland
 * Body prefers ctx.__render('cleveland') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cleveland'], ctx.__subtitle['cleveland'], ctx.__disabled['cleveland']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cleveland', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:cleveland] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Cleveland Inflation Nowcast — awaiting data"}
      reason={"globalMacro:cleveland"}
    />
  );
}

export default definePanel({
  key: "globalMacro:cleveland",
  panelId: "cleveland",
  markets: ["globalMacro"],
  title: "Cleveland Inflation Nowcast",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/cleveland.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cleveland'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cleveland']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cleveland']),
  Body,
});
