import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:crhist
 * Body prefers ctx.__render('crhist') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['crhist'], ctx.__subtitle['crhist'], ctx.__disabled['crhist']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('crhist', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:crhist] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Industry Combined Ratio — awaiting data"}
      reason={"insurance:crhist"}
    />
  );
}

export default definePanel({
  key: "insurance:crhist",
  panelId: "crhist",
  markets: ["insurance"],
  title: "Industry Combined Ratio",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/crhist.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['crhist'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['crhist']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['crhist']),
  Body,
});
