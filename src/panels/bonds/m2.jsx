import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:m2
 * Body prefers ctx.__render('m2') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['m2'], ctx.__subtitle['m2'], ctx.__disabled['m2']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('m2', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:m2] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"M2 Money Supply — awaiting data"}
      reason={"bonds:m2"}
    />
  );
}

export default definePanel({
  key: "bonds:m2",
  panelId: "m2",
  markets: ["bonds"],
  title: "M2 Money Supply",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/m2.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['m2'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['m2']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['m2']),
  Body,
});
