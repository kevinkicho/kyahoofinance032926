import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:metro-case-shiller
 * Body prefers ctx.__render('metro-case-shiller') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['metro-case-shiller'], ctx.__subtitle['metro-case-shiller'], ctx.__disabled['metro-case-shiller']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('metro-case-shiller', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:metro-case-shiller] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Metro Case-Shiller — awaiting data"}
      reason={"realEstate:metro-case-shiller"}
    />
  );
}

export default definePanel({
  key: "realEstate:metro-case-shiller",
  panelId: "metro-case-shiller",
  markets: ["realEstate"],
  title: "Metro Case-Shiller",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/metro-case-shiller.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['metro-case-shiller'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['metro-case-shiller']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['metro-case-shiller']),
  Body,
});
