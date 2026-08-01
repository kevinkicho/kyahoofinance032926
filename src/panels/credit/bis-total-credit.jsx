import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: credit:bis-total-credit
 * Body prefers ctx.__render('bis-total-credit') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bis-total-credit'], ctx.__subtitle['bis-total-credit'], ctx.__disabled['bis-total-credit']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bis-total-credit', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel credit:bis-total-credit] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BIS Total Credit — awaiting data"}
      reason={"credit:bis-total-credit"}
    />
  );
}

export default definePanel({
  key: "credit:bis-total-credit",
  panelId: "bis-total-credit",
  markets: ["credit"],
  title: "BIS Total Credit",
  source: 'Market data',
  className: "credit-bento-card",
  contentClassName: "credit-panel-content",
  modulePath: "src/panels/credit/bis-total-credit.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bis-total-credit'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bis-total-credit']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bis-total-credit']),
  Body,
});
