import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './BondsDashboard.css';

const RATING_TIER = {
  'AAA': 0, 'Aaa': 0,
  'AA+': 1, 'AA': 1, 'AA-': 1, 'Aa1': 1, 'Aa2': 1, 'Aa3': 1,
  'A+': 2, 'A': 2, 'A-': 2, 'A1': 2, 'A2': 2, 'A3': 2,
  'BBB+': 3, 'BBB': 3, 'BBB-': 3, 'Baa1': 3, 'Baa2': 3, 'Baa3': 3,
  'BB+': 4, 'BB': 4, 'BB-': 4, 'Ba1': 4, 'Ba2': 4, 'Ba3': 4,
  'B+': 5, 'B': 5, 'B-': 5, 'B1': 5, 'B2': 5, 'B3': 5,
  'CCC+': 6, 'CCC': 6, 'CCC-': 6, 'Caa1': 6, 'Caa2': 6, 'Caa3': 6,
  'CC': 6, 'C': 6, 'D': 6, 'SD': 6,
};

const TIER_STYLE = [
  { bg: 'rgba(16,185,129,0.40)',  color: '#6ee7b7', label: 'AAA' },
  { bg: 'rgba(34,197,94,0.28)',   color: '#86efac', label: 'AA'  },
  { bg: 'rgba(132,204,22,0.22)',  color: '#bef264', label: 'A'   },
  { bg: 'rgba(245,158,11,0.28)',  color: '#fcd34d', label: 'BBB' },
  { bg: 'rgba(249,115,22,0.28)',  color: '#fdba74', label: 'BB'  },
  { bg: 'rgba(239,68,68,0.28)',   color: '#fca5a5', label: 'B'   },
  { bg: 'rgba(239,68,68,0.50)',   color: '#fca5a5', label: 'CCC' },
];

function ratingStyle(rating) {
  const tier = RATING_TIER[rating] ?? null;
  if (tier == null) return {};
  const { bg, color } = TIER_STYLE[tier];
  return { backgroundColor: bg, color };
}

function getTier(rating) { return RATING_TIER[rating] ?? 99; }

export default function CreditMatrix({ creditRatingsData, creditRatingsAsOf, lastUpdated }) {
  const kpis = useMemo(() => {
    const aaaAa = creditRatingsData.filter(r =>
      getTier(r.sp) <= 1 && getTier(r.moodys) <= 1 && getTier(r.fitch) <= 1
    ).length;
    const invGrade = creditRatingsData.filter(r =>
      getTier(r.sp) <= 3 && getTier(r.moodys) <= 3 && getTier(r.fitch) <= 3
    ).length;
    // Lowest rated: highest max tier
    let lowestCountry = '\u2014';
    let lowestTier = -1;
    creditRatingsData.forEach(r => {
      const maxT = Math.max(getTier(r.sp), getTier(r.moodys), getTier(r.fitch));
      if (maxT > lowestTier) { lowestTier = maxT; lowestCountry = r.name; }
    });
    // Modal tier
    const tierCounts = [0, 0, 0, 0, 0, 0, 0];
    creditRatingsData.forEach(r => {
      [r.sp, r.moodys, r.fitch].forEach(rating => {
        const t = getTier(rating);
        if (t < 7) tierCounts[t]++;
      });
    });
    const modalIdx = tierCounts.indexOf(Math.max(...tierCounts));
    const modalLabel = TIER_STYLE[modalIdx]?.label || '\u2014';
    return { aaaAa, invGrade, lowestCountry, modalLabel, tierCounts };
  }, [creditRatingsData]);

  const maxCount = Math.max(...kpis.tierCounts, 1);

  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Credit Matrix</span>
        <span className="bonds-panel-subtitle">Sovereign ratings by S&amp;P &middot; Moody&apos;s &middot; Fitch{creditRatingsAsOf ? ` (as of ${new Date(creditRatingsAsOf + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})` : ''}</span>
      </div>

      {/* KPI Strip */}
      <div className="bonds-kpi-strip">
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">AAA/AA Rated</span>
          <span className="bonds-kpi-value accent"><MetricValue value={kpis.aaaAa} seriesKey="creditAaaAa" timestamp={lastUpdated} /></span>
          <span className="bonds-kpi-sub">of {creditRatingsData.length}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Inv Grade</span>
          <span className="bonds-kpi-value accent"><MetricValue value={kpis.invGrade} seriesKey="creditInvGrade" timestamp={lastUpdated} /></span>
          <span className="bonds-kpi-sub">of {creditRatingsData.length}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Lowest Rated</span>
          <span className="bonds-kpi-value" style={{ color: '#f87171', fontSize: 13 }}>{kpis.lowestCountry}</span>
        </div>
        <div className="bonds-kpi-pill">
          <span className="bonds-kpi-label">Modal Rating</span>
          <span className="bonds-kpi-value accent">{kpis.modalLabel}</span>
        </div>
      </div>

      {/* Wide-Narrow: Table + Distribution */}
      <div className="bonds-wide-narrow">
        <div className="credit-scroll">
          <table className="credit-table">
            <thead>
              <tr>
                <th className="credit-th credit-corner">Country</th>
                <th className="credit-th">S&amp;P</th>
                <th className="credit-th">Moody&apos;s</th>
                <th className="credit-th">Fitch</th>
              </tr>
            </thead>
            <tbody>
              {creditRatingsData.map(row => (
                <tr key={row.country}>
                  <td className="credit-row-header">
                    {row.name}
                    <span className="credit-region">({row.region})</span>
                  </td>
                  {['sp', 'moodys', 'fitch'].map(agency => (
                    <td key={agency} className="credit-cell" style={ratingStyle(row[agency])}>
                      {row[agency]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bonds-chart-panel">
          <div className="bonds-chart-title">Rating Distribution</div>
          {TIER_STYLE.map((tier, idx) => {
            const count = kpis.tierCounts[idx];
            if (count === 0) return null;
            const pct = (count / maxCount) * 100;
            return (
              <div key={tier.label} className="bonds-dist-row">
                <span className="bonds-dist-label" style={{ color: tier.color }}>{tier.label}</span>
                <div className="bonds-dist-bar" style={{ width: `${pct}%`, background: tier.bg }} />
                <span className="bonds-dist-count">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bonds-panel-footer">
        {TIER_STYLE.map(t => (
          <span key={t.label} style={{ color: t.color, marginRight: 12 }}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}
