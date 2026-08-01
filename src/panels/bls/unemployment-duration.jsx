import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:unemployment-duration
 * Body prefers ctx.__render('unemployment-duration') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['unemployment-duration'], ctx.__subtitle['unemployment-duration'], ctx.__disabled['unemployment-duration']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('unemployment-duration', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:unemployment-duration] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Unemployment Duration — awaiting data"}
      reason={"bls:unemployment-duration"}
    />
  );
}

export default definePanel({
  key: "bls:unemployment-duration",
  panelId: "unemployment-duration",
  markets: ["bls"],
  title: "Unemployment Duration",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/unemployment-duration.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['unemployment-duration'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['unemployment-duration']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['unemployment-duration']),
  Body,
});
