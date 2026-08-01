import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:gdp
 * Body prefers ctx.__render('gdp') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['gdp'], ctx.__subtitle['gdp'], ctx.__disabled['gdp']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('gdp', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:gdp] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"GDP Growth — awaiting data"}
      reason={"globalMacro:gdp"}
    />
  );
}

export default definePanel({
  key: "globalMacro:gdp",
  panelId: "gdp",
  markets: ["globalMacro"],
  title: "GDP Growth",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/gdp.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['gdp'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['gdp']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['gdp']),
  Body,
});
