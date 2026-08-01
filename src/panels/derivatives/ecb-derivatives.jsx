import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:ecb-derivatives
 * Body prefers ctx.__render('ecb-derivatives') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ecb-derivatives'], ctx.__subtitle['ecb-derivatives'], ctx.__disabled['ecb-derivatives']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ecb-derivatives', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:ecb-derivatives] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"ECB Financial Market Data — awaiting data"}
      reason={"derivatives:ecb-derivatives"}
    />
  );
}

export default definePanel({
  key: "derivatives:ecb-derivatives",
  panelId: "ecb-derivatives",
  markets: ["derivatives"],
  title: "ECB Financial Market Data",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/ecb-derivatives.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ecb-derivatives'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ecb-derivatives']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ecb-derivatives']),
  Body,
});
