import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: analytics:provenance
 * Body prefers ctx.__render('provenance') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['provenance'], ctx.__subtitle['provenance'], ctx.__disabled['provenance']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('provenance', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel analytics:provenance] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Provenance Audit — awaiting data"}
      reason={"analytics:provenance"}
    />
  );
}

export default definePanel({
  key: "analytics:provenance",
  panelId: "provenance",
  markets: ["analytics"],
  title: "Provenance Audit",
  source: 'Market data',
  className: "ana-bento-card",
  contentClassName: "ana-panel-scroll",
  modulePath: "src/panels/analytics/provenance.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['provenance'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['provenance']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['provenance']),
  Body,
});
