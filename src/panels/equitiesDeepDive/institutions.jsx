import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:institutions
 * Body prefers ctx.__render('institutions') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['institutions'], ctx.__subtitle['institutions'], ctx.__disabled['institutions']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('institutions', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:institutions] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Top Institutions — awaiting data"}
      reason={"equitiesDeepDive:institutions"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:institutions",
  panelId: "institutions",
  markets: ["equitiesDeepDive"],
  title: "Top Institutions",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/institutions.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['institutions'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['institutions']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['institutions']),
  Body,
});
