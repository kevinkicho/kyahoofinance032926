import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:jolts
 * Body prefers ctx.__render('jolts') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['jolts'], ctx.__subtitle['jolts'], ctx.__disabled['jolts']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('jolts', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:jolts] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"JOLTS — awaiting data"}
      reason={"bls:jolts"}
    />
  );
}

export default definePanel({
  key: "bls:jolts",
  panelId: "jolts",
  markets: ["bls"],
  title: "JOLTS",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/jolts.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['jolts'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['jolts']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['jolts']),
  Body,
});
