import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:wb-ins-penetration
 * Body prefers ctx.__render('wb-ins-penetration') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['wb-ins-penetration'], ctx.__subtitle['wb-ins-penetration'], ctx.__disabled['wb-ins-penetration']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('wb-ins-penetration', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:wb-ins-penetration] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"World Bank Insurance Penetration — awaiting data"}
      reason={"insurance:wb-ins-penetration"}
    />
  );
}

export default definePanel({
  key: "insurance:wb-ins-penetration",
  panelId: "wb-ins-penetration",
  markets: ["insurance"],
  title: "World Bank Insurance Penetration",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/wb-ins-penetration.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['wb-ins-penetration'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['wb-ins-penetration']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['wb-ins-penetration']),
  Body,
});
