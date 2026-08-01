import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:imf-reserves
 * Body prefers ctx.__render('imf-reserves') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['imf-reserves'], ctx.__subtitle['imf-reserves'], ctx.__disabled['imf-reserves']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('imf-reserves', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:imf-reserves] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"IMF Reserves — awaiting data"}
      reason={"globalMacro:imf-reserves"}
    />
  );
}

export default definePanel({
  key: "globalMacro:imf-reserves",
  panelId: "imf-reserves",
  markets: ["globalMacro"],
  title: "IMF Reserves",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/imf-reserves.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['imf-reserves'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['imf-reserves']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['imf-reserves']),
  Body,
});
