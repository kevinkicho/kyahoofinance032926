import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:eci
 * Body prefers ctx.__render('eci') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['eci'], ctx.__subtitle['eci'], ctx.__disabled['eci']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('eci', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:eci] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Employment Cost Index — awaiting data"}
      reason={"bls:eci"}
    />
  );
}

export default definePanel({
  key: "bls:eci",
  panelId: "eci",
  markets: ["bls"],
  title: "Employment Cost Index",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/eci.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['eci'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['eci']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['eci']),
  Body,
});
