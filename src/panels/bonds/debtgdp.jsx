import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bonds:debtgdp
 * Body prefers ctx.__render('debtgdp') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['debtgdp'], ctx.__subtitle['debtgdp'], ctx.__disabled['debtgdp']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('debtgdp', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bonds:debtgdp] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Debt-to-GDP — awaiting data"}
      reason={"bonds:debtgdp"}
    />
  );
}

export default definePanel({
  key: "bonds:debtgdp",
  panelId: "debtgdp",
  markets: ["bonds"],
  title: "Debt-to-GDP",
  source: 'Market data',
  className: "bonds-bento-card",
  contentClassName: "bonds-panel-content",
  modulePath: "src/panels/bonds/debtgdp.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['debtgdp'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['debtgdp']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['debtgdp']),
  Body,
});
