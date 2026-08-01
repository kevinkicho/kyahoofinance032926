import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:cpi
 * Body prefers ctx.__render('cpi') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cpi'], ctx.__subtitle['cpi'], ctx.__disabled['cpi']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cpi', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:cpi] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"CPI Inflation — awaiting data"}
      reason={"globalMacro:cpi"}
    />
  );
}

export default definePanel({
  key: "globalMacro:cpi",
  panelId: "cpi",
  markets: ["globalMacro"],
  title: "CPI Inflation",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/cpi.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cpi'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cpi']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cpi']),
  Body,
});
