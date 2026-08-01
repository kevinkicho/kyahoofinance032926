import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: realEstate:cre
 * Body prefers ctx.__render('cre') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cre'], ctx.__subtitle['cre'], ctx.__disabled['cre']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cre', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel realEstate:cre] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"CRE Delinquencies — awaiting data"}
      reason={"realEstate:cre"}
    />
  );
}

export default definePanel({
  key: "realEstate:cre",
  panelId: "cre",
  markets: ["realEstate"],
  title: "CRE Delinquencies",
  source: 'Market data',
  className: "realEstate-bento-card",
  contentClassName: "realEstate-panel-content",
  modulePath: "src/panels/realEstate/cre.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cre'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cre']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cre']),
  Body,
});
