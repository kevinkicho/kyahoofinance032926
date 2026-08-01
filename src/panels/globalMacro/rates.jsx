import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:rates
 * Body prefers ctx.__render('rates') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['rates'], ctx.__subtitle['rates'], ctx.__disabled['rates']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('rates', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:rates] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Central Bank Rates — awaiting data"}
      reason={"globalMacro:rates"}
    />
  );
}

export default definePanel({
  key: "globalMacro:rates",
  panelId: "rates",
  markets: ["globalMacro"],
  title: "Central Bank Rates",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/rates.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['rates'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['rates']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['rates']),
  Body,
});
