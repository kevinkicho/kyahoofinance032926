import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:wb-dev
 * Body prefers ctx.__render('wb-dev') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['wb-dev'], ctx.__subtitle['wb-dev'], ctx.__disabled['wb-dev']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('wb-dev', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:wb-dev] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"World Bank GDP per Capita — awaiting data"}
      reason={"globalMacro:wb-dev"}
    />
  );
}

export default definePanel({
  key: "globalMacro:wb-dev",
  panelId: "wb-dev",
  markets: ["globalMacro"],
  title: "World Bank GDP per Capita",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/wb-dev.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['wb-dev'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['wb-dev']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['wb-dev']),
  Body,
});
