import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: equitiesDeepDive:factor-favor
 * Body prefers ctx.__render('factor-favor') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['factor-favor'], ctx.__subtitle['factor-favor'], ctx.__disabled['factor-favor']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('factor-favor', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel equitiesDeepDive:factor-favor] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Factor In Favor — awaiting data"}
      reason={"equitiesDeepDive:factor-favor"}
    />
  );
}

export default definePanel({
  key: "equitiesDeepDive:factor-favor",
  panelId: "factor-favor",
  markets: ["equitiesDeepDive"],
  title: "Factor In Favor",
  source: 'Market data',
  className: "eqd-bento-card",
  contentClassName: "eqd-panel-scroll",
  modulePath: "src/panels/equitiesDeepDive/factor-favor.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['factor-favor'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['factor-favor']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['factor-favor']),
  Body,
});
