import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:factor-rankings
 * Body prefers ctx.__render('factor-rankings') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['factor-rankings'], ctx.__subtitle['factor-rankings'], ctx.__disabled['factor-rankings']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('factor-rankings', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:factor-rankings] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Factor Rankings — awaiting data"}
      reason={"equitiesDeepDive:factor-rankings"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:factor-rankings",
  panelId: "factor-rankings",
  markets: ["equitiesDeepDive"],
  title: "Factor Rankings",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/factor-rankings.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['factor-rankings'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['factor-rankings']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['factor-rankings']),
  Body,
});
