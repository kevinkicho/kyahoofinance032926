/**
 * Global hub search. Live tile titles come from MARKET_PANELS so catalog
 * panels stay findable; SEARCH_INDEX supplies keywords and view-mode tabs
 * (Heatmap / List / Bar Race / Data Hub).
 */
import { SEARCH_INDEX } from '../markets.config.js';
import { MARKET_PANELS } from '../../data/marketPanels.js';

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

export function searchHub(query, { searchIndex = SEARCH_INDEX, marketPanels = MARKET_PANELS } = {}) {
  const q = norm(query);
  if (!q) return [];

  const results = [];
  for (const entry of searchIndex) {
    const panels = marketPanels[entry.marketId] || [];
    const extraTabs = (entry.subTabs || []).filter(
      (s) => !panels.some((p) => norm(p.title) === norm(s)),
    );
    const matchingPanels = panels.filter(
      (p) => norm(p.title).includes(q) || norm(p.id).includes(q),
    );
    const matchingExtra = extraTabs.filter((s) => norm(s).includes(q));
    const labelHit = norm(entry.label).includes(q);
    const keywordHit = (entry.keywords || []).some((k) => norm(k).includes(q));

    if (!labelHit && !keywordHit && matchingPanels.length === 0 && matchingExtra.length === 0) {
      continue;
    }

    const displaySubs = (matchingPanels.length || matchingExtra.length)
      ? [...matchingPanels.map((p) => p.title), ...matchingExtra]
      : [...panels.map((p) => p.title), ...extraTabs];

    results.push({
      marketId: entry.marketId,
      label: entry.label,
      matchingPanels,
      matchingExtra,
      matchingSub: matchingPanels[0]?.title || matchingExtra[0] || null,
      matchingPanelId: matchingPanels[0]?.id || null,
      subTabs: displaySubs,
    });
  }
  return results;
}
