import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:oecd-direct
 * Body prefers ctx.__render('oecd-direct') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['oecd-direct'], ctx.__subtitle['oecd-direct'], ctx.__disabled['oecd-direct']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('oecd-direct', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:oecd-direct] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"OECD Direct — awaiting data"}
      reason={"globalMacro:oecd-direct"}
    />
  );
}

export default definePanel({
  key: "globalMacro:oecd-direct",
  panelId: "oecd-direct",
  markets: ["globalMacro"],
  title: "OECD Direct",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/oecd-direct.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['oecd-direct'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['oecd-direct']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['oecd-direct']),
  Body,
});
