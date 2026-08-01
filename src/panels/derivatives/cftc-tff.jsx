import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:cftc-tff
 * Body prefers ctx.__render('cftc-tff') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cftc-tff'], ctx.__subtitle['cftc-tff'], ctx.__disabled['cftc-tff']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cftc-tff', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:cftc-tff] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"CFTC Financial Futures — awaiting data"}
      reason={"derivatives:cftc-tff"}
    />
  );
}

export default definePanel({
  key: "derivatives:cftc-tff",
  panelId: "cftc-tff",
  markets: ["derivatives"],
  title: "CFTC Financial Futures",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/cftc-tff.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cftc-tff'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cftc-tff']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cftc-tff']),
  Body,
});
