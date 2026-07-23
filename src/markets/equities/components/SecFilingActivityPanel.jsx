import { useMemo, useState, useCallback } from 'react';

const CATEGORIES = [
  { id: 'all', label: 'All', color: '#94a3b8' },
  { id: 'material', label: '8-K', color: '#f59e0b', tip: 'Material events' },
  { id: 'insider', label: 'Form 4', color: '#a78bfa', tip: 'Insider trades' },
  { id: 'earnings', label: '10-K/Q', color: '#22c55e', tip: 'Earnings reports' },
  { id: 'activist', label: '13G/D', color: '#ec4899', tip: 'Activist / 13D-G' },
  { id: 'proxy', label: 'Proxy', color: '#38bdf8', tip: 'Proxy statements' },
  { id: 'offering', label: 'Offer', color: '#fb923c', tip: 'Offerings / 424B' },
  { id: 'ipo', label: 'IPO', color: '#e879f9', tip: 'S-1 / F-1' },
  { id: 'other', label: 'Other', color: '#64748b', tip: 'Other forms' },
];

const CAT_META = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

const SORTS = [
  { id: 'date', label: 'Date' },
  { id: 'ticker', label: 'Ticker' },
  { id: 'form', label: 'Form' },
  { id: 'category', label: 'Category' },
];

function shortDate(d) {
  if (!d) return '—';
  // 2026-07-22 → 07/22
  const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}/${m[3]}`;
  return d;
}

function catLabel(id) {
  return CAT_META[id]?.label || id || '—';
}

function catColor(id) {
  return CAT_META[id]?.color || '#94a3b8';
}

/** Re-classify forms so older cached payloads still tally correctly. */
function normalizeCategory(form, category) {
  const f = String(form || '').toUpperCase().trim();
  if (['8-K', '8-K/A'].includes(f)) return 'material';
  if (['10-K', '10-K/A', '10-Q', '10-Q/A'].includes(f)) return 'earnings';
  if (['3', '4', '5', '3/A', '4/A', '5/A'].includes(f)) return 'insider';
  if (
    ['SC 13G', 'SC 13G/A', 'SC 13D', 'SC 13D/A'].includes(f) ||
    /^SCHEDULE\s+13[DG](\/A)?$/.test(f) ||
    /^SC\s*13[DG](\/A)?$/.test(f)
  ) return 'activist';
  if (['DEF 14A', 'DEFA14A', 'DEF 14C', 'DEFR14A', 'PREC14A'].includes(f)) return 'proxy';
  if (['S-1', 'S-1/A', 'F-1', 'F-1/A'].includes(f)) return 'ipo';
  if (['424B2', '424B3', '424B4', '424B5', 'FWP'].includes(f)) return 'offering';
  return category || 'other';
}

function flattenFilings(byTicker = {}) {
  const out = [];
  for (const [ticker, list] of Object.entries(byTicker)) {
    if (!Array.isArray(list)) continue;
    for (const f of list) {
      const form = f.form || '';
      out.push({
        ticker: f.ticker || ticker,
        form,
        date: f.date || '',
        description: f.description || '',
        category: normalizeCategory(form, f.category),
        url: f.url || '',
        accession: f.accession || '',
      });
    }
  }
  return out;
}

function countBy(arr, keyFn) {
  const m = {};
  for (const item of arr) {
    const k = keyFn(item);
    if (!k) continue;
    m[k] = (m[k] || 0) + 1;
  }
  return m;
}

export default function SecFilingActivityPanel({
  byTicker = {},
  byType = {},
  total = 0,
  tickerCount = 0,
  material = [],
  insider = [],
  earnings = [],
  activist = [],
}) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc'); // desc = newest first for date
  const [formFilter, setFormFilter] = useState(null); // exact form type chip

  const allFilings = useMemo(() => flattenFilings(byTicker), [byTicker]);

  const catCounts = useMemo(() => {
    const c = countBy(allFilings, (f) => f.category || 'other');
    return c;
  }, [allFilings]);

  // Prefer full counts from flattened data; fall back to API category arrays
  const materialN = catCounts.material ?? material.length;
  const insiderN = catCounts.insider ?? insider.length;
  const earningsN = catCounts.earnings ?? earnings.length;
  const activistN = catCounts.activist ?? activist.length;
  const proxyN = catCounts.proxy || 0;
  const offeringN = catCounts.offering || 0;

  const topForms = useMemo(() => {
    const entries = Object.entries(byType || {}).sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 8);
  }, [byType]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = allFilings;

    if (category !== 'all') {
      rows = rows.filter((f) => f.category === category);
    }
    if (formFilter) {
      rows = rows.filter((f) => f.form === formFilter);
    }
    if (q) {
      rows = rows.filter((f) => {
        const hay = `${f.ticker} ${f.form} ${f.description} ${f.category} ${f.date}`.toLowerCase();
        return hay.includes(q);
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    const sorted = [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') cmp = (a.date || '').localeCompare(b.date || '');
      else if (sortBy === 'ticker') cmp = (a.ticker || '').localeCompare(b.ticker || '');
      else if (sortBy === 'form') cmp = (a.form || '').localeCompare(b.form || '');
      else if (sortBy === 'category') cmp = (a.category || '').localeCompare(b.category || '');
      if (cmp === 0) cmp = (b.date || '').localeCompare(a.date || '');
      return cmp * dir;
    });
    return sorted;
  }, [allFilings, category, formFilter, query, sortBy, sortDir]);

  const toggleSort = useCallback((id) => {
    if (sortBy === id) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(id);
      setSortDir(id === 'date' ? 'desc' : 'asc');
    }
  }, [sortBy]);

  const kpis = [
    { label: 'Total', value: total || allFilings.length, tone: 'blue', tip: 'Recent filings across watchlist' },
    { label: 'Tickers', value: tickerCount || Object.keys(byTicker).length, tone: 'slate', tip: 'Issuers covered' },
    { label: '8-K', value: materialN, tone: 'amber', tip: 'Material events (90d cap in feed)', onClick: () => setCategory('material') },
    { label: 'Form 4', value: insiderN, tone: 'purple', tip: 'Insider Form 4/5', onClick: () => setCategory('insider') },
    { label: '10-K/Q', value: earningsN, tone: 'green', tip: 'Annual / quarterly reports', onClick: () => setCategory('earnings') },
    { label: '13G/D', value: activistN, tone: 'pink', tip: 'Beneficial ownership', onClick: () => setCategory('activist') },
  ];

  if (!allFilings.length && !total) {
    return (
      <div className="sec-file-empty">
        SEC filing activity unavailable.
      </div>
    );
  }

  return (
    <div className="sec-file-panel">
      {/* KPI cards */}
      <div className="sec-file-kpis" role="group" aria-label="Filing tallies">
        {kpis.map((k) => (
          <button
            key={k.label}
            type="button"
            className={`sec-file-kpi sec-file-kpi--${k.tone}${category !== 'all' && k.onClick && (
              (k.label === '8-K' && category === 'material') ||
              (k.label === 'Form 4' && category === 'insider') ||
              (k.label === '10-K/Q' && category === 'earnings') ||
              (k.label === '13G/D' && category === 'activist')
            ) ? ' is-active' : ''}`}
            title={k.tip}
            onClick={() => {
              if (!k.onClick) {
                setCategory('all');
                setFormFilter(null);
                return;
              }
              // toggle category filter
              const map = { '8-K': 'material', 'Form 4': 'insider', '10-K/Q': 'earnings', '13G/D': 'activist' };
              const id = map[k.label];
              if (id) {
                setCategory((c) => (c === id ? 'all' : id));
                setFormFilter(null);
              }
            }}
          >
            <span className="sec-file-kpi-label">{k.label}</span>
            <span className="sec-file-kpi-value">{k.value}</span>
          </button>
        ))}
      </div>

      {/* Secondary tallies: proxy / offering + top forms */}
      <div className="sec-file-tallies">
        {(proxyN > 0 || offeringN > 0) && (
          <div className="sec-file-tally-group">
            {proxyN > 0 && (
              <button
                type="button"
                className={`sec-file-chip${category === 'proxy' ? ' is-active' : ''}`}
                style={{ '--chip': '#38bdf8' }}
                onClick={() => { setCategory((c) => (c === 'proxy' ? 'all' : 'proxy')); setFormFilter(null); }}
              >
                Proxy <strong>{proxyN}</strong>
              </button>
            )}
            {offeringN > 0 && (
              <button
                type="button"
                className={`sec-file-chip${category === 'offering' ? ' is-active' : ''}`}
                style={{ '--chip': '#fb923c' }}
                onClick={() => { setCategory((c) => (c === 'offering' ? 'all' : 'offering')); setFormFilter(null); }}
              >
                Offerings <strong>{offeringN}</strong>
              </button>
            )}
          </div>
        )}
        <div className="sec-file-tally-group sec-file-forms">
          {topForms.map(([form, n]) => (
            <button
              key={form}
              type="button"
              className={`sec-file-chip sec-file-chip--form${formFilter === form ? ' is-active' : ''}`}
              title={`${form}: ${n} filings`}
              onClick={() => setFormFilter((f) => (f === form ? null : form))}
            >
              {form} <strong>{n}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Controls: search + category + sort */}
      <div className="sec-file-controls">
        <input
          type="search"
          className="sec-file-search"
          placeholder="Search ticker, form, desc…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search filings"
        />
        <select
          className="sec-file-select"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setFormFilter(null); }}
          aria-label="Filter by category"
        >
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}{c.id !== 'all' && catCounts[c.id] != null ? ` (${catCounts[c.id]})` : ''}
            </option>
          ))}
        </select>
        <div className="sec-file-sorts" role="group" aria-label="Sort">
          {SORTS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`sec-file-sort-btn${sortBy === s.id ? ' is-active' : ''}`}
              onClick={() => toggleSort(s.id)}
              title={`Sort by ${s.label}`}
            >
              {s.label}
              {sortBy === s.id ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
            </button>
          ))}
        </div>
      </div>

      <div className="sec-file-meta">
        Showing <strong>{filtered.length}</strong>
        {filtered.length !== allFilings.length ? ` of ${allFilings.length}` : ''}
        {formFilter ? ` · form ${formFilter}` : ''}
        {category !== 'all' ? ` · ${catLabel(category)}` : ''}
        {query.trim() ? ` · “${query.trim()}”` : ''}
        {(formFilter || category !== 'all' || query.trim()) && (
          <button
            type="button"
            className="sec-file-clear"
            onClick={() => { setQuery(''); setCategory('all'); setFormFilter(null); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="sec-file-grid" role="table" aria-label="SEC filings">
        <div className="sec-file-head" role="row">
          <button type="button" className="sec-file-cell c-tkr" role="columnheader" onClick={() => toggleSort('ticker')}>
            Tkr{sortBy === 'ticker' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
          <button type="button" className="sec-file-cell c-form" role="columnheader" onClick={() => toggleSort('form')}>
            Form{sortBy === 'form' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
          <button type="button" className="sec-file-cell c-date" role="columnheader" onClick={() => toggleSort('date')}>
            Date{sortBy === 'date' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
          <button type="button" className="sec-file-cell c-cat" role="columnheader" onClick={() => toggleSort('category')}>
            Cat{sortBy === 'category' ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
          </button>
          <div className="sec-file-cell c-desc" role="columnheader">Desc</div>
          <div className="sec-file-cell c-link" role="columnheader"> </div>
        </div>
        <div className="sec-file-body">
          {filtered.length === 0 ? (
            <div className="sec-file-empty-rows">No filings match filters.</div>
          ) : (
            filtered.map((f, i) => (
              <div
                key={`${f.ticker}-${f.form}-${f.date}-${f.accession || i}`}
                className="sec-file-row"
                role="row"
              >
                <div className="sec-file-cell c-tkr" role="cell">
                  <strong>{f.ticker}</strong>
                </div>
                <div className="sec-file-cell c-form" role="cell" style={{ color: catColor(f.category) }}>
                  {f.form}
                </div>
                <div className="sec-file-cell c-date" role="cell" title={f.date}>
                  {shortDate(f.date)}
                </div>
                <div className="sec-file-cell c-cat" role="cell">
                  <span className="sec-file-cat-pill" style={{ '--chip': catColor(f.category) }}>
                    {catLabel(f.category)}
                  </span>
                </div>
                <div className="sec-file-cell c-desc" role="cell" title={f.description || f.form}>
                  {f.description && f.description !== f.form ? f.description : '—'}
                </div>
                <div className="sec-file-cell c-link" role="cell">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" title="Open on SEC EDGAR" onClick={(e) => e.stopPropagation()}>
                      ↗
                    </a>
                  ) : (
                    <span className="sec-muted">—</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="sec-file-footer">
        SEC EDGAR submissions · {tickerCount || Object.keys(byTicker).length} mega-caps · recent filings per issuer
      </div>
    </div>
  );
}
