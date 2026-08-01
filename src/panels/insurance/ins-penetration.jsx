import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:ins-penetration
 * Body prefers ctx.__render('ins-penetration') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ins-penetration'], ctx.__subtitle['ins-penetration'], ctx.__disabled['ins-penetration']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ins-penetration', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:ins-penetration] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Insurance Penetration — awaiting data"}
      reason={"insurance:ins-penetration"}
    />
  );
}

export default definePanel({
  key: "insurance:ins-penetration",
  panelId: "ins-penetration",
  markets: ["insurance"],
  title: "Insurance Penetration",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/ins-penetration.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ins-penetration'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ins-penetration']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ins-penetration']),
  Body,
});
