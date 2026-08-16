/** Live-chip predicates for calendar tiles that can paint empty / dashes. */

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/** KPI strip always paints 3 pills; live only when a painted source series exists. */
export function hasCalendarKpiMetrics({
  economicEvents,
  centralBanks,
  earningsSeason,
} = {}) {
  if (asArray(economicEvents).length > 0) return true;
  if (asArray(earningsSeason).length > 0) return true;
  return asArray(centralBanks).some((cb) => cb && (cb.daysUntil != null || cb.nextMeeting));
}

/** Sidebar always paints 0-chips; live only when a list the sidebar reads is non-empty. */
export function hasCalendarSidebarContent({
  economicEvents,
  centralBanks,
  earningsSeason,
  keyReleases,
  treasuryAuctions,
  optionsExpiry,
} = {}) {
  return !!(
    asArray(economicEvents).length
    || asArray(centralBanks).length
    || asArray(earningsSeason).length
    || asArray(keyReleases).length
    || asArray(treasuryAuctions).length
    || asArray(optionsExpiry).length
  );
}

export function hasEconomicEvents(economicEvents) {
  return asArray(economicEvents).length > 0;
}

export function hasCentralBanks(centralBanks) {
  return asArray(centralBanks).length > 0;
}

export function hasEarningsSeason(earningsSeason) {
  return asArray(earningsSeason).length > 0;
}

/** Key-data paints PanelEmpty unless keyReleases exist or a US FRED event can stand in. */
export function hasKeyDataRows(keyReleases, economicEvents) {
  if (asArray(keyReleases).length > 0) return true;
  return asArray(economicEvents).some((e) => e && e.country === 'US' && e.source === 'FRED');
}

export function hasTreasuryAuctions(treasuryAuctions) {
  return asArray(treasuryAuctions).length > 0;
}

export function hasOptionsExpiry(optionsExpiry) {
  return asArray(optionsExpiry).length > 0;
}

/** Release-impact table needs a dated US/FRED/high-importance row (label defaults). */
export function hasReleaseImpactRows({ keyReleases, economicEvents } = {}) {
  if (asArray(keyReleases).some((row) => row?.date)) return true;
  return asArray(economicEvents).some((row) => {
    const label = String(row?.event || row?.name || '');
    if (/earnings|auction/i.test(label)) return false;
    if (!(row?.country === 'US' || row?.source === 'FRED' || Number(row?.importance) >= 2)) return false;
    return !!row?.date;
  });
}

/** Catalyst wall keeps any dated row from the calendar snapshot. */
export function hasCatalystRows({
  economicEvents,
  keyReleases,
  centralBanks,
  treasuryAuctions,
  earningsSeason,
  optionsExpiry,
} = {}) {
  if (asArray(economicEvents).some((row) => row?.date)) return true;
  if (asArray(keyReleases).some((row) => row?.date)) return true;
  if (asArray(centralBanks).some((row) => row?.date || row?.meetingDate || row?.nextMeeting)) return true;
  if (asArray(treasuryAuctions).some((row) => row?.date || row?.auctionDate)) return true;
  if (asArray(earningsSeason).some((row) => row?.date)) return true;
  if (asArray(optionsExpiry).some((row) => row?.date)) return true;
  return false;
}