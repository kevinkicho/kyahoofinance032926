import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: derivatives:gamma
 * Body prefers ctx.__render('gamma') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['gamma'], ctx.__subtitle['gamma'], ctx.__disabled['gamma']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('gamma', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel derivatives:gamma] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Gamma Exposure — awaiting data"}
      reason={"derivatives:gamma"}
    />
  );
}

export default definePanel({
  key: "derivatives:gamma",
  panelId: "gamma",
  markets: ["derivatives"],
  title: "Gamma Exposure",
  source: 'Market data',
  className: "derivatives-bento-card",
  contentClassName: "derivatives-panel-content",
  modulePath: "src/panels/derivatives/gamma.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['gamma'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['gamma']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['gamma']),
  Body,
});
