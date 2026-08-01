import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: globalMacro:bea-accounts
 * Body prefers ctx.__render('bea-accounts') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['bea-accounts'], ctx.__subtitle['bea-accounts'], ctx.__disabled['bea-accounts']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('bea-accounts', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel globalMacro:bea-accounts] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"BEA National Accounts — awaiting data"}
      reason={"globalMacro:bea-accounts"}
    />
  );
}

export default definePanel({
  key: "globalMacro:bea-accounts",
  panelId: "bea-accounts",
  markets: ["globalMacro"],
  title: "BEA National Accounts",
  source: 'Market data',
  className: "globalMacro-bento-card",
  contentClassName: "globalMacro-panel-content",
  modulePath: "src/panels/globalMacro/bea-accounts.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['bea-accounts'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['bea-accounts']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['bea-accounts']),
  Body,
});
