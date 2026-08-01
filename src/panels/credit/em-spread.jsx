import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:em-spread
 * Body prefers ctx.__render('em-spread') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['em-spread'], ctx.__subtitle['em-spread'], ctx.__disabled['em-spread']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('em-spread', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:em-spread] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"EM Spread History — awaiting data"}
      reason={"credit:em-spread"}
    />
  );
}

export default definePanel({
  key: "credit:em-spread",
  panelId: "em-spread",
  markets: ["credit"],
  title: "EM Spread History",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/em-spread.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['em-spread'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['em-spread']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['em-spread']),
  Body,
});
