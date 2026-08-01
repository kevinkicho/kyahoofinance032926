import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:treasury-cost
 * Body prefers ctx.__render('treasury-cost') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['treasury-cost'], ctx.__subtitle['treasury-cost'], ctx.__disabled['treasury-cost']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('treasury-cost', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:treasury-cost] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Treasury Avg Interest Cost — awaiting data"}
      reason={"bonds:treasury-cost"}
    />
  );
}

export default definePanel({
  key: "bonds:treasury-cost",
  panelId: "treasury-cost",
  markets: ["bonds"],
  title: "Treasury Avg Interest Cost",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/treasury-cost.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['treasury-cost'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['treasury-cost']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['treasury-cost']),
  Body,
});
