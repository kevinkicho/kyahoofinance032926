import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: commodities:cot
 * Body prefers ctx.__render('cot') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cot'], ctx.__subtitle['cot'], ctx.__disabled['cot']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cot', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel commodities:cot] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"COT Positioning — awaiting data"}
      reason={"commodities:cot"}
    />
  );
}

export default definePanel({
  key: "commodities:cot",
  panelId: "cot",
  markets: ["commodities"],
  title: "COT Positioning",
  source: 'Market data',
  className: "commodities-bento-card",
  contentClassName: "commodities-panel-content",
  modulePath: "src/panels/commodities/cot.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cot'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cot']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cot']),
  Body,
});
