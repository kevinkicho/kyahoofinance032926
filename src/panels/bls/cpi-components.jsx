import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: bls:cpi-components
 * Body prefers ctx.__render('cpi-components') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['cpi-components'], ctx.__subtitle['cpi-components'], ctx.__disabled['cpi-components']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('cpi-components', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel bls:cpi-components] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"CPI Components — awaiting data"}
      reason={"bls:cpi-components"}
    />
  );
}

export default definePanel({
  key: "bls:cpi-components",
  panelId: "cpi-components",
  markets: ["bls"],
  title: "CPI Components",
  source: 'Market data',
  className: "bls-bento-card",
  contentClassName: "bls-panel-content",
  modulePath: "src/panels/bls/cpi-components.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['cpi-components'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['cpi-components']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['cpi-components']),
  Body,
});
