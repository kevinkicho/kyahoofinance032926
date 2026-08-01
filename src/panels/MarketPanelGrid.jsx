/**
 * Compose all independent panels for a market tab.
 * Dashboards pass layout + ctx; panels live under src/panels/.
 */
import React from 'react';
import BentoWrapper from '../components/BentoWrapper';
import PanelSlot from './PanelSlot';
import { listPanelsForMarket } from './registry';
import { MARKET_PANELS } from '../data/marketPanels';

/**
 * @param {object} props
 * @param {string} props.marketId
 * @param {object} props.layout          BentoWrapper layout
 * @param {string} props.storageKey
 * @param {string} props.accent
 * @param {object} props.ctx             Data bag for panel Bodies
 * @param {object} [props.provenance]    { timestamp, isCurrent, fetchedOn, fetchLog, error, isLoading }
 * @param {React.ReactNode} [props.extra] Extra children (rare legacy slots)
 * @param {string[]} [props.only]        If set, only these panelIds
 * @param {string[]} [props.except]      Skip these panelIds
 */
export default function MarketPanelGrid({
  marketId,
  layout,
  storageKey,
  accent,
  ctx,
  provenance = {},
  extra = null,
  only = null,
  except = null,
}) {
  let panels = listPanelsForMarket(marketId);
  if (only) {
    const allow = new Set(only);
    panels = panels.filter((p) => allow.has(p.panelId));
  }
  if (except) {
    const deny = new Set(except);
    panels = panels.filter((p) => !deny.has(p.panelId));
  }

  const titles = Object.fromEntries(
    (MARKET_PANELS[marketId] || []).map((p) => [p.id, p.title]),
  );

  return (
    <BentoWrapper
      layout={layout}
      storageKey={storageKey}
      accent={accent}
      panelTitles={titles}
    >
      {panels.map((panel) => (
        <PanelSlot
          key={panel.panelId}
          panelKey={panel.panelId}
          panel={panel}
          accent={accent}
          ctx={ctx}
          timestamp={provenance.timestamp}
          isCurrent={provenance.isCurrent}
          fetchedOn={provenance.fetchedOn}
          fetchLog={provenance.fetchLog}
          error={provenance.error}
          isLoading={provenance.isLoading}
        />
      ))}
      {React.Children.map(extra, (child) => {
        if (!React.isValidElement(child)) return child;
        // Normalize extra keys the same way (avoid ".0:$id" orphans).
        const k = child.key != null
          ? String(child.key).replace(/^\.\$/, '').replace(/^\.\d+:\$/, '').replace(/^\$/, '')
          : child.props?.panelKey;
        return k ? React.cloneElement(child, { key: k, panelKey: child.props.panelKey || k }) : child;
      })}
    </BentoWrapper>
  );
}
