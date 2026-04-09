import React, { useState, useEffect } from 'react';
import { useTheme } from '../../hub/ThemeContext';
import DetailPanel from '../DetailPanel/DetailPanel';
import { exchangeRates } from '../../utils/constants'; // fallback only
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
  rates,
  ratesIsLive,
  ratesDate,
}) => {
  const { colors } = useTheme();
  const fxRates = rates || exchangeRates;
  const [macroData, setMacroData] = useState(MOCK_MACRO);
  const [macroLive, setMacroLive] = useState(false);

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
        />
      ) : (
        <>
          <h2>Market Summary</h2>
          <div className="stat-card">
            <h3>Global Validated Cap ({currency})</h3>
            <p className="stat-value">{currentSymbol}{(flatData.reduce((acc, curr) => acc + (curr.adjustedValue || curr.value), 0) * currentRate).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} B</p>
          </div>

          <h2>Macro Indicators {macroLive ? <span className="live-pill" style={{fontSize:'0.6rem'}}>LIVE</span> : <span style={{fontSize:'0.6rem',color:colors.textDim}}>(Mock)</span>}</h2>
          <div className="macro-grid">
            <MacroCard label="M1 MONEY SUPPLY" latest={macroData.M1?.latest} prev={macroData.M1?.prev} prefix="$" unit="B" />
            <MacroCard label="M2 MONEY SUPPLY" latest={macroData.M2?.latest} prev={macroData.M2?.prev} prefix="$" unit="B" />
            <MacroCard label="CPI (ALL URBAN)" latest={macroData.CPI?.latest} prev={macroData.CPI?.prev} />
            <MacroCard label="FED FUNDS RATE" latest={macroData.FFR?.latest} prev={macroData.FFR?.prev} unit="%" />
            <MacroCard label="UNEMPLOYMENT" latest={macroData.UNEMP?.latest} prev={macroData.UNEMP?.prev} unit="%" />
            <MacroCard label="NOMINAL GDP" latest={macroData.GDP?.latest} prev={macroData.GDP?.prev} prefix="$" unit="B" />
          </div>
          {macroLive && (macroData.IG_OAS || macroData.HY_OAS || macroData.BAA_SPREAD) && (
            <>
              <h2 style={{marginTop:'0.25rem'}}>Credit Spreads <span className="live-pill" style={{fontSize:'0.6rem'}}>LIVE</span></h2>
              <div className="macro-grid">
                {macroData.IG_OAS     && <MacroCard label="IG OAS (bps)"        latest={macroData.IG_OAS.latest}     prev={macroData.IG_OAS.prev} />}
                {macroData.HY_OAS     && <MacroCard label="HY OAS (bps)"        latest={macroData.HY_OAS.latest}     prev={macroData.HY_OAS.prev} />}
                {macroData.BAA_SPREAD && <MacroCard label="Baa–10yr Sprd (%)" latest={macroData.BAA_SPREAD.latest} prev={macroData.BAA_SPREAD.prev} />}
              </div>
              <p style={{fontSize:'0.6rem',color:colors.border,margin:'-0.25rem 0 0'}}>
                ICE BofA OAS · Baa–10yr Treasury spread · FRED{macroData.IG_OAS?.date ? ` · ${macroData.IG_OAS.date}` : ''}
              </p>
            </>
          )}

          <h2>
            FX Rates (vs USD)
            {ratesIsLive
              ? <span style={{ fontSize: '0.7rem', color: '#10b981', marginLeft: '0.5rem' }}>● Live {ratesDate}</span>
              : <span style={{ fontSize: '0.7rem', color: colors.textMuted, marginLeft: '0.5rem' }}>● Static fallback</span>
            }
          </h2>
          <div className="fx-grid">
            {Object.entries(fxRates)
              .filter(([k]) => k !== 'USD')
              .sort(([k1], [k2]) => k1.localeCompare(k2))
              .map(([cur, rate]) => (
                <div key={cur} className="fx-card">
                  <strong>{cur}</strong>
                  <span>{rate.toFixed(cur === 'JPY' || cur === 'KRW' || cur === 'IDR' ? 0 : 2)}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </aside>
  );
};

export default Sidebar;