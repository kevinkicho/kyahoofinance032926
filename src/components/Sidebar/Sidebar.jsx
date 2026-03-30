import React, { useState, useEffect } from 'react';
import DetailPanel from '../DetailPanel/DetailPanel';
import ScenarioController from './ScenarioController';
import TimeTravel from '../TimeTravel/TimeTravel';
import CountryMacro from './CountryMacro';
import { ERAS } from '../TimeTravel/TimeTravel';
import { exchangeRates } from '../../utils/constants';
import './Sidebar.css';

const MOCK_MACRO = {
  M1:    { latest: 18200, prev: 18050, seriesId: 'M1SL',     date: '2024-12' },
  M2:    { latest: 21300, prev: 21150, seriesId: 'M2SL',     date: '2024-12' },
  CPI:   { latest: 314.8, prev:  312.1, seriesId: 'CPIAUCSL', date: '2024-12' },
  FFR:   { latest: 5.33,  prev:  5.33,  seriesId: 'FEDFUNDS', date: '2024-12' },
  UNEMP: { latest: 3.7,   prev:  3.8,   seriesId: 'UNRATE',   date: '2024-12' },
  GDP:   { latest: 28200, prev:  27900, seriesId: 'GDP',       date: '2024-Q3' },
};

const MacroCard = ({ label, latest, prev, unit = '', prefix = '' }) => {
  const pct = prev ? ((latest - prev) / Math.abs(prev)) * 100 : 0;
  const up = pct >= 0;
  return (
    <div className="macro-card">
      <span className="label">{label}</span>
      <span className="value">{prefix}{typeof latest === 'number' ? latest.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}{unit}</span>
      <span className={`trend ${up ? 'text-green' : 'text-red'}`}>{up ? '↑' : '↓'} {Math.abs(pct).toFixed(2)}%</span>
    </div>
  );
};

const Sidebar = ({
  selectedTicker,
  setSelectedTicker,
  flatData,
  currentRate,
  currentSymbol,
  currency,
  scenarios,
  setScenarios,
  activeEra,
  setActiveEra,
  showTimeTravel,
  useMlEngine,
  setUseMlEngine
}) => {
  const [macroData, setMacroData] = useState(MOCK_MACRO);
  const [macroLive, setMacroLive] = useState(false);
  const [macroMode, setMacroMode] = useState('global'); // 'global' or 'regional'
  const currentEraLabel = ERAS.find(e => e.id === activeEra)?.label || 'Current';

  useEffect(() => {
    fetch('/api/macro')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          setMacroData(data);
          setMacroLive(true);
        }
      })
      .catch(() => {}); // silently fallback to mock
  }, []);

  return (
    <aside className="sidebar">
      {selectedTicker ? (
        <DetailPanel
          selectedTicker={selectedTicker}
          setSelectedTicker={setSelectedTicker}
          currentRate={currentRate}
          currentSymbol={currentSymbol}
          scenarios={scenarios}
        />
      ) : (
        <>
          {showTimeTravel && (
            <>
              <h2>&#128197; Time Machine</h2>
              <TimeTravel activeEra={activeEra} setActiveEra={setActiveEra} />
            </>
          )}
          <h2>Market Summary {showTimeTravel ? <span style={{color:'#a855f7',fontSize:'0.7rem'}}>({currentEraLabel})</span> : '(Mock)'}</h2>
          <div className="stat-card">
            <h3>Global Validated Cap ({currency})</h3>
            <p className="stat-value">{currentSymbol}{(flatData.reduce((acc, curr) => acc + (curr.adjustedValue || curr.value), 0) * currentRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} B</p>
            {(() => {
              const orig = flatData.reduce((acc, curr) => acc + curr.value, 0);
              const adj  = flatData.reduce((acc, curr) => acc + (curr.adjustedValue || curr.value), 0);
              const diff = ((adj - orig) / orig) * 100;
              return (
                <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }} className={diff >= 0 ? 'text-green' : 'text-red'}>
                  {diff >= 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(2)}% Systemic Impact
                </div>
              );
            })()}
          </div>

          <h2>Market Modeling Scenarios</h2>
          <ScenarioController 
            scenarios={scenarios} setScenarios={setScenarios} 
            useMlEngine={useMlEngine} setUseMlEngine={setUseMlEngine}
          />

          <div className="macro-mode-toggle">
            <button className={macroMode === 'global' ? 'active' : ''} onClick={() => setMacroMode('global')}>Global</button>
            <button className={macroMode === 'regional' ? 'active' : ''} onClick={() => setMacroMode('regional')}>Regional Twin</button>
          </div>

          {macroMode === 'global' ? (
            <>
              <h2>Macro Indicators {macroLive ? <span className="live-pill" style={{fontSize:'0.6rem'}}>LIVE</span> : <span style={{fontSize:'0.6rem',color:'#475569'}}>(Mock)</span>}</h2>
              <div className="macro-grid">
                <MacroCard label="M1 MONEY SUPPLY" latest={macroData.M1?.latest} prev={macroData.M1?.prev} prefix="$" unit="B" />
                <MacroCard label="M2 MONEY SUPPLY" latest={macroData.M2?.latest} prev={macroData.M2?.prev} prefix="$" unit="B" />
                <MacroCard label="CPI (ALL URBAN)" latest={macroData.CPI?.latest} prev={macroData.CPI?.prev} />
                <MacroCard label="FED FUNDS RATE" latest={macroData.FFR?.latest} prev={macroData.FFR?.prev} unit="%" />
                <MacroCard label="UNEMPLOYMENT" latest={macroData.UNEMP?.latest} prev={macroData.UNEMP?.prev} unit="%" />
                <MacroCard label="NOMINAL GDP" latest={macroData.GDP?.latest} prev={macroData.GDP?.prev} prefix="$" unit="B" />
              </div>
            </>
          ) : (
            <>
              <h2>Regional Context (Predictive Mode)</h2>
              <CountryMacro scenarios={scenarios} />
            </>
          )}

          <h2>Live FX Rates (vs USD)</h2>
          <div className="fx-grid">
            {Object.entries(exchangeRates)
              .filter(([k]) => k !== 'USD')
              .sort(([k1], [k2]) => k1.localeCompare(k2))
              .map(([cur, rate]) => (
                <div key={cur} className="fx-card">
                  <strong>{cur}</strong>
                  <span>{rate.toFixed(2)}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;
