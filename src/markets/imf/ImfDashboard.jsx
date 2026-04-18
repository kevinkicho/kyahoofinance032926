import React, { useState, useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import BentoWrapper from '../../components/BentoWrapper';
import ImfScorecard from './ImfScorecard';
import ImfGrowthInflation from './ImfGrowthInflation';
import ImfReserves from './ImfReserves';
import ImfCofier from './ImfCofier';
import DataFooter from '../../components/DataFooter/DataFooter';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'scorecard',  x: 0, y: 0, w: 12, h: 4 },
    { i: 'growth',     x: 0, y: 4, w: 6,  h: 4 },
    { i: 'inflation',  x: 6, y: 4, w: 6,  h: 4 },
    { i: 'reserves',   x: 0, y: 8, w: 6,  h: 4 },
    { i: 'cofer',      x: 6, y: 8, w: 6,  h: 4 },
  ]
};

function ImfDashboard({
  countries, weoForecasts, ifsReserves, cofer,
  fetchLog, isLive, lastUpdated, error, fetchedOn, isCurrent,
}) {
  const { colors } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState(null);

  const selectedCountryData = useMemo(() => {
    if (!selectedCountry || !countries) return null;
    return countries.find(c => c.code === selectedCountry);
  }, [selectedCountry, countries]);

  if (!countries?.length) return null;

  return (
    <div className="imf-dashboard imf-dashboard--bento">
      <div className="imf-dashboard-layout">
        <BentoWrapper layout={LAYOUT} storageKey="imf-layout">
          <div key="scorecard" className="imf-bento-card">
            <div className="imf-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">IMF Scorecard</span>
              <span className="bento-panel-subtitle">Click row for details</span>
            </div>
            <div className="bento-panel-content imf-panel-scroll" onMouseDown={stopDrag}>
              <ImfScorecard
                countries={countries}
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
                lastUpdated={lastUpdated}
              />
            </div>
            <DataFooter source="IMF WEO" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          <div key="growth" className="imf-bento-card">
            <div className="imf-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">GDP Growth</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <ImfGrowthInflation
                countries={countries}
                weoForecasts={weoForecasts}
                indicator="gdpReal"
                lastUpdated={lastUpdated}
              />
            </div>
            <DataFooter source="IMF WEO" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          <div key="inflation" className="imf-bento-card">
            <div className="imf-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Inflation</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <ImfGrowthInflation
                countries={countries}
                weoForecasts={weoForecasts}
                indicator="inflation"
                lastUpdated={lastUpdated}
              />
            </div>
            <DataFooter source="IMF WEO" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          <div key="reserves" className="imf-bento-card">
            <div className="imf-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">International Reserves</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <ImfReserves
                countries={countries}
                ifsReserves={ifsReserves}
                lastUpdated={lastUpdated}
              />
            </div>
            <DataFooter source="IMF IFS" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>

          <div key="cofer" className="imf-bento-card">
            <div className="imf-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">COFER Currency Shares</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <ImfCofier cofer={cofer} lastUpdated={lastUpdated} />
            </div>
            <DataFooter source="IMF COFER" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} error={error} fetchedOn={fetchedOn} isCurrent={isCurrent} />
          </div>
        </BentoWrapper>

        {selectedCountryData && (
          <div className="imf-detail-panel" style={{ background: colors.cardBg, border: `1px solid ${colors.border}` }}>
            <div className="imf-detail-header">
              <span>{selectedCountryData.flag} {selectedCountryData.name}</span>
              <button onClick={() => setSelectedCountry(null)} style={{ background: 'none', border: 'none', color: colors.textMuted, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div className="imf-detail-grid">
              {[
                { key: 'gdpReal', label: 'GDP Growth' },
                { key: 'inflation', label: 'Inflation' },
                { key: 'unemployment', label: 'Unemployment' },
                { key: 'gdpPerCapita', label: 'GDP/Capita' },
                { key: 'currentAccount', label: 'Current Acct' },
                { key: 'govDebt', label: 'Gov Debt' },
                { key: 'govRevenue', label: 'Gov Revenue' },
                { key: 'investment', label: 'Investment' },
                { key: 'pop', label: 'Pop (M)' },
                { key: 'intlReserves', label: 'IntlRes (B$)' },
              ].map(({ key, label }) => {
                const cur = selectedCountryData[key];
                const prev = selectedCountryData[key + 'Prev'];
                const delta = cur != null && prev != null ? cur - prev : null;
                return (
                  <div key={key} className="imf-detail-cell">
                    <span className="imf-detail-label">{label}</span>
                    <span className="imf-detail-value">{cur != null ? (key === 'pop' ? cur.toFixed(1) : cur.toFixed(1)) : '—'}</span>
                    {delta != null && delta !== 0 && (
                      <span className="imf-detail-delta" style={{ color: delta > 0 ? '#4ade80' : '#f87171', fontSize: 10 }}>
                        {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(ImfDashboard);