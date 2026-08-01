import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:gdpnow
 * Body prefers ctx.__render('gdpnow') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['gdpnow'], ctx.__subtitle['gdpnow'], ctx.__disabled['gdpnow']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('gdpnow', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:gdpnow] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"GDPNow — awaiting data"}
      reason={"globalMacro:gdpnow"}
    />
  );
}

export default definePanel({
  key: "globalMacro:gdpnow",
  panelId: "gdpnow",
  markets: ["globalMacro"],
  title: "GDPNow",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/gdpnow.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['gdpnow'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['gdpnow']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['gdpnow']),
  Body,
});
