import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: fx:imf-cofer
 * Body prefers ctx.__render('imf-cofer') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['imf-cofer'], ctx.__subtitle['imf-cofer'], ctx.__disabled['imf-cofer']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('imf-cofer', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel fx:imf-cofer] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"IMF COFER Reserves — awaiting data"}
      reason={"fx:imf-cofer"}
    />
  );
}

export default definePanel({
  key: "fx:imf-cofer",
  panelId: "imf-cofer",
  markets: ["fx"],
  title: "IMF COFER Reserves",
  source: 'Market data',
  className: "fx-bento-card",
  contentClassName: "fx-panel-content",
  modulePath: "src/panels/fx/imf-cofer.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['imf-cofer'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['imf-cofer']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['imf-cofer']),
  Body,
});
