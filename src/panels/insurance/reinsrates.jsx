import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:reinsrates
 * Body prefers ctx.__render('reinsrates') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['reinsrates'], ctx.__subtitle['reinsrates'], ctx.__disabled['reinsrates']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('reinsrates', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:reinsrates] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Reinsurance Pricing — awaiting data"}
      reason={"insurance:reinsrates"}
    />
  );
}

export default definePanel({
  key: "insurance:reinsrates",
  panelId: "reinsrates",
  markets: ["insurance"],
  title: "Reinsurance Pricing",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/reinsrates.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['reinsrates'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['reinsrates']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['reinsrates']),
  Body,
});
