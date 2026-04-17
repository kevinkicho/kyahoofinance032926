import React from 'react';
import MetricValue from '../../components/MetricValue/MetricValue';

const INDICATORS = [
  { key: 'gdpGrowth',   label: 'GDP',     fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'gdpPerCap',   label: 'GDP/Cap', fmt: v => v != null ? `$${(v / 1000).toFixed(1)}k` : '—' },
  { key: 'inflation',   label: 'CPI',     fmt: v => v != null ? `${v.toFixed(1)}%` : '—' },
  { key: 'tradeGdp',    label: 'Trade',   fmt: v => v != null ? `${v.toFixed(0)}%` : '—' },
  { key: 'population',  label: 'Pop(M)',  fmt: v => v != null ? v.toFixed(1) : '—' },
];

function deltaClass(key, delta) {
  if (delta == null || delta === 0) return '';
  const is_good = (key === 'gdpGrowth' || key === 'gdpPerCap' || key === 'tradeGdp') ? delta > 0
    : (key === 'inflation') ? delta < 0
    : delta > 0;
  return is_good ? 'wb-delta-good' : 'wb-delta-bad';
}

function WorldBankScorecard({ countries, selectedCountry, onSelectCountry, lastUpdated }) {
  if (!countries?.length) return <div style={{ color: 'var(--text-muted)', padding: 20 }}>No data available</div>;

  return (
    <div className="wb-scorecard-compact">
      <div className="wb-scorecard-header-row">
        <div className="wb-scorecell wb-scorecell-flag"></div>
        <div className="wb-scorecell wb-scorecell-country">Country</div>
        {INDICATORS.map(ind => (
          <div key={ind.key} className="wb-scorecell">{ind.label}</div>
        ))}
      </div>
      {countries.map(country => (
        <div
          key={country.code}
          className={`wb-scorecard-row ${selectedCountry === country.code ? 'selected' : ''}`}
          onClick={() => onSelectCountry(country.code)}
        >
          <div className="wb-scorecell wb-scorecell-flag">{country.flag}</div>
          <div className="wb-scorecell wb-scorecell-country">{country.code}</div>
          {INDICATORS.map(ind => {
            const cur = country[ind.key];
            const prev = country[ind.key + 'Prev'];
            const delta = cur != null && prev != null ? cur - prev : null;
            return (
              <div key={ind.key} className="wb-scorecell">
                <MetricValue value={cur} seriesKey={`wb_${ind.key}`} timestamp={lastUpdated} format={ind.fmt} />
                {delta != null && delta !== 0 && (
                  <span className={`wb-delta ${deltaClass(ind.key, delta)}`}>
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

export default React.memo(WorldBankScorecard);