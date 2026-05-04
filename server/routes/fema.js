// OpenFEMA — US disaster declarations.
//
// Source: fema.gov/api/open/v2/DisasterDeclarationsSummaries (no key, OData
// query syntax). Each row is a state-level declaration line, so the same
// disaster appears multiple times if it touches several states. We dedupe
// by (disasterNumber, state, declarationDate) at the wire level then fold
// to one summary row per declaration for the panel.
import { Router } from 'express';
import { fetchJSON } from '../lib/fetch.js';
import { readDailyCache, writeDailyCache, readLatestCache, todayStr } from '../lib/cache.js';
import { trackApiCall } from '../lib/rateLimits.js';

const router = Router();

const BASE = 'https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries';
const FIELDS = ['disasterNumber','state','declarationDate','incidentType','declarationTitle','fyDeclared','incidentBeginDate','incidentEndDate','ihProgramDeclared','iaProgramDeclared','paProgramDeclared','hmProgramDeclared'].join(',');

router.get('/', async (_req, res) => {
  const cached = readDailyCache('fema');
  if (cached) return res.json(cached);

  const today = todayStr();
  let rows = null, declarations = null, byType = null;

  try {
    trackApiCall('OpenFEMA');
    // Pull the most recent 200 state-level declaration rows. That covers
    // ~30-45 unique disasters at typical declaration cadences.
    const url = `${BASE}?$top=200&$orderby=declarationDate desc&$select=${FIELDS}`;
    const data = await fetchJSON(encodeURI(url));
    rows = Array.isArray(data?.DisasterDeclarationsSummaries) ? data.DisasterDeclarationsSummaries : [];
    if (rows.length) {
      // Fold to one row per disaster — collect the states it touched and
      // keep the earliest declarationDate as the headline date.
      const byNum = new Map();
      for (const r of rows) {
        const key = r.disasterNumber;
        if (!key) continue;
        if (!byNum.has(key)) {
          byNum.set(key, {
            disasterNumber:  r.disasterNumber,
            title:           r.declarationTitle,
            type:            r.incidentType,
            firstDeclared:   r.declarationDate,
            incidentBegin:   r.incidentBeginDate,
            incidentEnd:     r.incidentEndDate,
            states:          new Set(),
            programsCount:   0,
          });
        }
        const slot = byNum.get(key);
        if (r.state) slot.states.add(r.state);
        if (r.declarationDate && r.declarationDate < slot.firstDeclared) slot.firstDeclared = r.declarationDate;
        slot.programsCount += [r.ihProgramDeclared, r.iaProgramDeclared, r.paProgramDeclared, r.hmProgramDeclared].filter(Boolean).length;
      }
      declarations = [...byNum.values()]
        .map(d => ({ ...d, states: [...d.states].sort(), stateCount: d.states.size }))
        .sort((a, b) => (b.firstDeclared || '').localeCompare(a.firstDeclared || ''))
        .slice(0, 25);

      // Group by incident type for the side bar chart.
      const types = new Map();
      for (const d of declarations) {
        const t = d.type || 'Other';
        types.set(t, (types.get(t) || 0) + 1);
      }
      byType = [...types.entries()]
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
    }
  } catch (e) { console.warn('[FEMA]', e.message || e); }

  const _sources = { fema: !!(declarations && declarations.length) };
  const isLive = _sources.fema;

  const result = {
    declarations,
    byType,
    summary: declarations?.length ? {
      totalRecent:    declarations.length,
      newestDate:     declarations[0]?.firstDeclared || null,
      mostCommonType: byType?.[0]?.type || null,
    } : null,
    _sources,
    isLive,
    isCurrent: true,
    fetchedOn: today,
    lastUpdated: today,
  };

  if (isLive) writeDailyCache('fema', result);
  else {
    const fb = readLatestCache('fema');
    if (fb) return res.json({ ...fb.data, isCurrent: false, fetchedOn: fb.fetchedOn });
  }
  res.json(result);
});

export default router;
