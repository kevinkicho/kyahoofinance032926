import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:bea-income
 * Body prefers ctx.__render('bea-income') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bea-income'], ctx.__subtitle['bea-income'], ctx.__disabled['bea-income']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bea-income', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:bea-income] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BEA Income — awaiting data"}
      reason={"globalMacro:bea-income"}
    />
  );
}

export default definePanel({
  key: "globalMacro:bea-income",
  panelId: "bea-income",
  markets: ["globalMacro"],
  title: "BEA Income",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/bea-income.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bea-income'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bea-income']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bea-income']),
  Body,
});
