import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:insider
 * Body prefers ctx.__render('insider') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['insider'], ctx.__subtitle['insider'], ctx.__disabled['insider']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('insider', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:insider] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Insider Trading — awaiting data"}
      reason={"equitiesDeepDive:insider"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:insider",
  panelId: "insider",
  markets: ["equitiesDeepDive"],
  title: "Insider Trading",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/insider.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['insider'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['insider']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['insider']),
  Body,
});
