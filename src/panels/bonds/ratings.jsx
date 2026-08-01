import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:ratings
 * Body prefers ctx.__render('ratings') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ratings'], ctx.__subtitle['ratings'], ctx.__disabled['ratings']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ratings', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:ratings] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Credit Ratings — awaiting data"}
      reason={"bonds:ratings"}
    />
  );
}

export default definePanel({
  key: "bonds:ratings",
  panelId: "ratings",
  markets: ["bonds"],
  title: "Credit Ratings",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/ratings.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ratings'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ratings']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ratings']),
  Body,
});
