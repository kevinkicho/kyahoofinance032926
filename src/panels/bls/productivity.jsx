import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:productivity
 * Body prefers ctx.__render('productivity') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['productivity'], ctx.__subtitle['productivity'], ctx.__disabled['productivity']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('productivity', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:productivity] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Productivity — awaiting data"}
      reason={"bls:productivity"}
    />
  );
}

export default definePanel({
  key: "bls:productivity",
  panelId: "productivity",
  markets: ["bls"],
  title: "Productivity",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/productivity.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['productivity'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['productivity']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['productivity']),
  Body,
});
