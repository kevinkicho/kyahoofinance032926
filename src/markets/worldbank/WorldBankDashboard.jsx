import React, { useState, useMemo } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import BentoWrapper from '../../components/BentoWrapper';
import WorldBankScorecard from './WorldBankScorecard';
import WbGrowthTrends from './WbGrowthTrends';
import WbDevScatter from './WbDevScatter';
import WbTradeOpenness from './WbTradeOpenness';
import DataFooter from '../../components/DataFooter/DataFooter';

const stopDrag = (e) => e.stopPropagation();

const LAYOUT = {
  lg: [
    { i: 'scorecard',  x: 0, y: 0, w: 12, h: 4 },
    { i: 'trends',     x: 0, y: 4, w: 6,  h: 4 },
    { i: 'dev',        x: 6, y: 4, w: 6,  h: 4 },
    { i: 'trade',      x: 0, y: 8, w: 12, h: 4 },
  ]
};

function WorldBankDashboard({
  countries, trendData, fetchLog, isLive, lastUpdated,
}) {
  const [selectedCountry, setSelectedCountry] = useState(null);

  const selectedCountryData = useMemo(() => {
    if (!selectedCountry || !countries) return null;
    return countries.find(c => c.code === selectedCountry);
  }, [selectedCountry, countries]);

  if (!countries?.length) return null;

  return (
    <div className="wb-dashboard wb-dashboard--bento">
      <div className="wb-dashboard-layout">
        <BentoWrapper layout={LAYOUT} storageKey="wb-layout">
          <div key="scorecard" className="wb-bento-card">
            <div className="wb-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">World Development Indicators</span>
              <span className="bento-panel-subtitle">Click row for details</span>
            </div>
            <div className="bento-panel-content wb-panel-scroll" onMouseDown={stopDrag}>
              <WorldBankScorecard
                countries={countries}
                selectedCountry={selectedCountry}
                onSelectCountry={setSelectedCountry}
                lastUpdated={lastUpdated}
              />
            </div>
            <DataFooter source="World Bank WDI" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="trends" className="wb-bento-card">
            <div className="wb-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">GDP Growth Trends</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <WbGrowthTrends trendData={trendData} lastUpdated={lastUpdated} />
            </div>
            <DataFooter source="World Bank WDI" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="dev" className="wb-bento-card">
            <div className="wb-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">GDP per Capita vs Growth</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <WbDevScatter countries={countries} lastUpdated={lastUpdated} />
            </div>
            <DataFooter source="World Bank WDI" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>

          <div key="trade" className="wb-bento-card">
            <div className="wb-panel-title-row bento-panel-title-row">
              <span className="bento-panel-title">Trade Openness (% of GDP)</span>
            </div>
            <div className="bento-panel-content" onMouseDown={stopDrag}>
              <WbTradeOpenness countries={countries} lastUpdated={lastUpdated} />
            </div>
            <DataFooter source="World Bank WDI" timestamp={lastUpdated} isLive={isLive} fetchLog={fetchLog} />
          </div>
        </BentoWrapper>

        {selectedCountryData && (
          <div className="wb-detail-panel" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div className="wb-detail-header">
              <span>{selectedCountryData.flag} {selectedCountryData.name}</span>
              <button onClick={() => setSelectedCountry(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div className="wb-detail-grid">
              {[
                { key: 'gdpGrowth',    label: 'GDP Growth',   suffix: '%', yearKey: 'gdpGrowthYear' },
                { key: 'gdpPerCap',    label: 'GDP/Capita',   suffix: '$', yearKey: 'gdpPerCapYear' },
                { key: 'inflation',    label: 'Inflation',    suffix: '%', yearKey: 'inflationYear' },
                { key: 'tradeGdp',     label: 'Trade % GDP', suffix: '%', yearKey: 'tradeGdpYear' },
                { key: 'population',   label: 'Pop (M)',     suffix: '', yearKey: 'populationYear' },
              ].map(({ key, label, suffix, yearKey }) => {
                const cur = selectedCountryData[key];
                const prev = selectedCountryData[key + 'Prev'];
                const year = selectedCountryData[yearKey];
                const delta = cur != null && prev != null ? cur - prev : null;
                return (
                  <div key={key} className="wb-detail-cell">
                    <span className="wb-detail-label">{label}</span>
                    <span className="wb-detail-value">{cur != null ? `${suffix}${cur.toFixed(key === 'population' ? 1 : 1)}${key === 'gdpPerCap' ? 'k' : ''}` : '—'}</span>
                    {year && <span className="wb-detail-year">{year}</span>}
                    {delta != null && delta !== 0 && (
                      <span className="wb-detail-delta" style={{ color: delta > 0 ? '#4ade80' : '#f87171', fontSize: 10 }}>
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

export default React.memo(WorldBankDashboard);