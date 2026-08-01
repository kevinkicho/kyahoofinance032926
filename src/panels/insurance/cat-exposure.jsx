import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:cat-exposure
 * Body prefers ctx.__render('cat-exposure') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cat-exposure'], ctx.__subtitle['cat-exposure'], ctx.__disabled['cat-exposure']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cat-exposure', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:cat-exposure] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Cat Exposure — awaiting data"}
      reason={"insurance:cat-exposure"}
    />
  );
}

export default definePanel({
  key: "insurance:cat-exposure",
  panelId: "cat-exposure",
  markets: ["insurance"],
  title: "Cat Exposure",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/cat-exposure.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cat-exposure'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cat-exposure']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cat-exposure']),
  Body,
});
