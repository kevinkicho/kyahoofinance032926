import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:tga-balance
 * Body prefers ctx.__render('tga-balance') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['tga-balance'], ctx.__subtitle['tga-balance'], ctx.__disabled['tga-balance']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('tga-balance', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:tga-balance] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"TGA Cash Balance — awaiting data"}
      reason={"globalMacro:tga-balance"}
    />
  );
}

export default definePanel({
  key: "globalMacro:tga-balance",
  panelId: "tga-balance",
  markets: ["globalMacro"],
  title: "TGA Cash Balance",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/tga-balance.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['tga-balance'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['tga-balance']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['tga-balance']),
  Body,
});
