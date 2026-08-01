import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:spread-summary
 * Body prefers ctx.__render('spread-summary') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['spread-summary'], ctx.__subtitle['spread-summary'], ctx.__disabled['spread-summary']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('spread-summary', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:spread-summary] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Spread Summary — awaiting data"}
      reason={"credit:spread-summary"}
    />
  );
}

export default definePanel({
  key: "credit:spread-summary",
  panelId: "spread-summary",
  markets: ["credit"],
  title: "Spread Summary",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/spread-summary.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['spread-summary'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['spread-summary']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['spread-summary']),
  Body,
});
