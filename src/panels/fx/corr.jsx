import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:corr
 * Body prefers ctx.__render('corr') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['corr'], ctx.__subtitle['corr'], ctx.__disabled['corr']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('corr', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:corr] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"Currency Correlation (30D) — awaiting data"}
      reason={"fx:corr"}
    />
  );
}

export default definePanel({
  key: "fx:corr",
  panelId: "corr",
  markets: ["fx"],
  title: "Currency Correlation (30D)",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/corr.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['corr'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['corr']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['corr']),
  Body,
});
