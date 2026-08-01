import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:bis-otc
 * Body prefers ctx.__render('bis-otc') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bis-otc'], ctx.__subtitle['bis-otc'], ctx.__disabled['bis-otc']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bis-otc', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:bis-otc] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BIS OTC Derivatives — awaiting data"}
      reason={"derivatives:bis-otc"}
    />
  );
}

export default definePanel({
  key: "derivatives:bis-otc",
  panelId: "bis-otc",
  markets: ["derivatives"],
  title: "BIS OTC Derivatives",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/bis-otc.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bis-otc'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bis-otc']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bis-otc']),
  Body,
});
