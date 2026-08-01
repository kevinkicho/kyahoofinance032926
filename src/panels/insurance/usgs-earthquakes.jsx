import React from 'react';
import { definePanel } from '../definePanel';
import EmptyPanelBody from '../../components/BentoCard/EmptyPanelBody';

/**
 * Independent panel module: insurance:usgs-earthquakes
 * Body prefers ctx.__render('usgs-earthquakes') from the market tab during migration,
 * so UI is not dropped until a full Body is written here.
 *
 * Live / subtitle / disabled can also be supplied by the tab via:
 *   ctx.__live['usgs-earthquakes'], ctx.__subtitle['usgs-earthquakes'], ctx.__disabled['usgs-earthquakes']
 */
function Body({ ctx }) {
  if (typeof ctx?.__render === 'function') {
    try {
      const node = ctx.__render('usgs-earthquakes', ctx);
      if (node != null && node !== false) return node;
    } catch (e) {
      console.warn('[panel insurance:usgs-earthquakes] __render threw:', e);
      return <EmptyPanelBody message="Panel render error" reason={String(e?.message || e)} />;
    }
  }
  return (
    <EmptyPanelBody
      message={"USGS Earthquake Activity — awaiting data"}
      reason={"insurance:usgs-earthquakes"}
    />
  );
}

export default definePanel({
  key: "insurance:usgs-earthquakes",
  panelId: "usgs-earthquakes",
  markets: ["insurance"],
  title: "USGS Earthquake Activity",
  source: 'Market data',
  className: "insurance-bento-card",
  contentClassName: "insurance-panel-content",
  modulePath: "src/panels/insurance/usgs-earthquakes.jsx",
  getSubtitle: (ctx) => ctx?.__subtitle?.['usgs-earthquakes'] ?? undefined,
  isLive: (ctx) => !!(ctx?.__live?.['usgs-earthquakes']),
  isDisabled: (ctx) => !!(ctx?.__disabled?.['usgs-earthquakes']),
  Body,
});
