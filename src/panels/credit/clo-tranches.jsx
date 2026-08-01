import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:clo-tranches
 * Body prefers ctx.__render('clo-tranches') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['clo-tranches'], ctx.__subtitle['clo-tranches'], ctx.__disabled['clo-tranches']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('clo-tranches', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:clo-tranches] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"CLO Tranches — awaiting data"}
      reason={"credit:clo-tranches"}
    />
  );
}

export default definePanel({
  key: "credit:clo-tranches",
  panelId: "clo-tranches",
  markets: ["credit"],
  title: "CLO Tranches",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/clo-tranches.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['clo-tranches'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['clo-tranches']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['clo-tranches']),
  Body,
});
