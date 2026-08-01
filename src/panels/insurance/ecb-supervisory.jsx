import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:ecb-supervisory
 * Body prefers ctx.__render('ecb-supervisory') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ecb-supervisory'], ctx.__subtitle['ecb-supervisory'], ctx.__disabled['ecb-supervisory']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ecb-supervisory', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:ecb-supervisory] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"ECB Policy Rates — awaiting data"}
      reason={"insurance:ecb-supervisory"}
    />
  );
}

export default definePanel({
  key: "insurance:ecb-supervisory",
  panelId: "ecb-supervisory",
  markets: ["insurance"],
  title: "ECB Policy Rates",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/ecb-supervisory.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ecb-supervisory'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ecb-supervisory']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ecb-supervisory']),
  Body,
});
