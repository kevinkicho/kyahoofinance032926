import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:crline
 * Body prefers ctx.__render('crline') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['crline'], ctx.__subtitle['crline'], ctx.__disabled['crline']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('crline', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:crline] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Combined Ratio by Line — awaiting data"}
      reason={"insurance:crline"}
    />
  );
}

export default definePanel({
  key: "insurance:crline",
  panelId: "crline",
  markets: ["insurance"],
  title: "Combined Ratio by Line",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/crline.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['crline'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['crline']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['crline']),
  Body,
});
