import React from 'react';
import MetricValue from '../../components/MetricValue/MetricValue';

const INDICATORS = [
  { key: 'gdpReal',       label: 'GDP',     fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'inflation',     label: 'CPI',     fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'unemployment',  label: 'Unemp',  fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'currentAccount', label: 'CA',    fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'govDebt',       label: 'Debt',   fmt: v => v != null ? `${v.toFixed(0)}%` : '—' },
  { key: 'govRevenue',    label: 'Rev',    fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'investment',    label: 'Invest', fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'intlReserves',  label: 'Res(B$)', fmt: v => v != null ? v.toFixed(0) : '—' },
];

function deltaClass(key, delta) {
  if (delta == null || delta === 0) return '';
  const is_good = (key === 'gdpReal' || key === 'investment' || key === 'govRevenue') ? delta > 0
    : (key === 'inflation' || key === 'unemployment' || key === 'govDebt') ? delta < 0
    : delta > 0;
  return is_good ? 'imf-delta-good' : 'imf-delta-bad';
}

function ImfScorecard({ countries, selectedCountry, onSelectCountry, lastUpdated }) {
  if (!countries?.length) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No data available</div>;

  return (
    <div className="imf-scorecard-compact">
      <div className="imf-scorecard-header-row">
        <div className="imf-scorecell imf-scorecell-flag"></div>
        <div className="imf-scorecell imf-scorecell-country">Country</div>
        {INDICATORS.map(ind => (
          <div key={ind.key} className="imf-scorecell">{ind.label}</div>
        ))}
      </div>
      {countries.map(country => (
        <div
          key={country.code}
          className={`imf-scorecard-row ${selectedCountry === country.code ? 'selected' : ''}`}
          onClick={() => onSelectCountry(country.code)}
        >
          <div className="imf-scorecell imf-scorecell-flag">{country.flag}</div>
          <div className="imf-scorecell imf-scorecell-country">{country.code}</div>
          {INDICATORS.map(ind => {
            const cur = country[ind.key];
            const prev = country[ind.key + 'Prev'];
            const delta = cur != null && prev != null ? cur - prev : null;
            return (
              <div key={ind.key} className="imf-scorecell">
                <MetricValue value={cur} seriesKey={`imf_${ind.key}`} timestamp={lastUpdated} format={ind.fmt} />
                {delta != null && delta !== 0 && (
                  <span className={`imf-delta ${deltaClass(ind.key, delta)}`}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default React.memo(ImfScorecard);