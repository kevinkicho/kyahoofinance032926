import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:shorted
 * Body prefers ctx.__render('shorted') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['shorted'], ctx.__subtitle['shorted'], ctx.__disabled['shorted']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('shorted', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:shorted] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Most Shorted — awaiting data"}
      reason={"equitiesDeepDive:shorted"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:shorted",
  panelId: "shorted",
  markets: ["equitiesDeepDive"],
  title: "Most Shorted",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/shorted.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['shorted'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['shorted']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['shorted']),
  Body,
});
