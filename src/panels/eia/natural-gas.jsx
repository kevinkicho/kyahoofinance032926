import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: eia:natural-gas
 * Body prefers ctx.__render('natural-gas') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['natural-gas'], ctx.__subtitle['natural-gas'], ctx.__disabled['natural-gas']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('natural-gas', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel eia:natural-gas] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Natural Gas — awaiting data"}
      reason={"eia:natural-gas"}
    />
  );
}

export default definePanel({
  key: "eia:natural-gas",
  panelId: "natural-gas",
  markets: ["eia"],
  title: "Natural Gas",
  source: 'Market data',
  className: "eia-bento-card",
  contentClassName: "eia-panel-content",
  modulePath: "src/panels/eia/natural-gas.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['natural-gas'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['natural-gas']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['natural-gas']),
  Body,
});
