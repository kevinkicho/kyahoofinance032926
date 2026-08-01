import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:debt
 * Body prefers ctx.__render('debt') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['debt'], ctx.__subtitle['debt'], ctx.__disabled['debt']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('debt', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:debt] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Debt Monitor — awaiting data"}
      reason={"globalMacro:debt"}
    />
  );
}

export default definePanel({
  key: "globalMacro:debt",
  panelId: "debt",
  markets: ["globalMacro"],
  title: "Debt Monitor",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/debt.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['debt'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['debt']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['debt']),
  Body,
});
