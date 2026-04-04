import React from 'react';
import './BondsComponents.css';

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

export default function CreditMatrix({ creditRatingsData }) {
  return (
    <div className="bonds-panel">
      <div className="bonds-panel-header">
        <span className="bonds-panel-title">Credit Matrix</span>
        <span className="bonds-panel-subtitle">Sovereign ratings by S&amp;P · Moody's · Fitch</span>
      </div>
      <div className="credit-scroll">
        <table className="credit-table">
          <thead>
            <tr>
              <th className="credit-th credit-corner">Country</th>
              <th className="credit-th">S&P</th>
              <th className="credit-th">Moody's</th>
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
      <div className="bonds-panel-footer">
        {TIER_STYLE.map(t => (
          <span key={t.label} style={{ color: t.color, marginRight: 12 }}>{t.label}</span>
        ))}
      </div>
    </div>
  );
}
