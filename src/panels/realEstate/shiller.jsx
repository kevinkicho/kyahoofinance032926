import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:shiller
 * Body prefers ctx.__render('shiller') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['shiller'], ctx.__subtitle['shiller'], ctx.__disabled['shiller']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('shiller', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:shiller] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Case-Shiller Index — awaiting data"}
      reason={"realEstate:shiller"}
    />
  );
}

export default definePanel({
  key: "realEstate:shiller",
  panelId: "shiller",
  markets: ["realEstate"],
  title: "Case-Shiller Index",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/shiller.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['shiller'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['shiller']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['shiller']),
  Body,
});
