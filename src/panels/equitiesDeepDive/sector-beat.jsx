import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:sector-beat
 * Body prefers ctx.__render('sector-beat') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['sector-beat'], ctx.__subtitle['sector-beat'], ctx.__disabled['sector-beat']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('sector-beat', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:sector-beat] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Sector Beat Rate — awaiting data"}
      reason={"equitiesDeepDive:sector-beat"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:sector-beat",
  panelId: "sector-beat",
  markets: ["equitiesDeepDive"],
  title: "Sector Beat Rate",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/sector-beat.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['sector-beat'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['sector-beat']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['sector-beat']),
  Body,
});
