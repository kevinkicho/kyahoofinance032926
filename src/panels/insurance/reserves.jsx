import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:reserves
 * Body prefers ctx.__render('reserves') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['reserves'], ctx.__subtitle['reserves'], ctx.__disabled['reserves']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('reserves', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:reserves] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Reserve Adequacy — awaiting data"}
      reason={"insurance:reserves"}
    />
  );
}

export default definePanel({
  key: "insurance:reserves",
  panelId: "reserves",
  markets: ["insurance"],
  title: "Reserve Adequacy",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/reserves.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['reserves'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['reserves']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['reserves']),
  Body,
});
