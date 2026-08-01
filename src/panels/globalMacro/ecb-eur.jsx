import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:ecb-eur
 * Body prefers ctx.__render('ecb-eur') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['ecb-eur'], ctx.__subtitle['ecb-eur'], ctx.__disabled['ecb-eur']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('ecb-eur', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:ecb-eur] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"ECB Euro Area — awaiting data"}
      reason={"globalMacro:ecb-eur"}
    />
  );
}

export default definePanel({
  key: "globalMacro:ecb-eur",
  panelId: "ecb-eur",
  markets: ["globalMacro"],
  title: "ECB Euro Area",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/ecb-eur.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['ecb-eur'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['ecb-eur']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['ecb-eur']),
  Body,
});
