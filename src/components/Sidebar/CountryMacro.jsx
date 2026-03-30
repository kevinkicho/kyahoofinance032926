import React from 'react';
import { countryMacroData } from '../../utils/macroData';
import './CountryMacro.css';

const CountryMacro = ({ scenarios }) => {
  // Simple "Digital Twin" logic: adjust mock stats based on global scenarios
  // High Beta countries (EM) are more sensitive to global rate/inflation shocks
  const getAdjustedMacro = (countryCode, baseData) => {
    const { riskAppetite, interestRate, inflation } = scenarios;
    const isEM = ['IND', 'CHN', 'HKG'].includes(countryCode);
    const beta = isEM ? 1.5 : 1.0;

    // 1. Unemployment: Rises with high inflation & low risk appetite
    const unempAdj = (inflation - 2) * 0.1 * beta + (50 - riskAppetite) * 0.02 * beta;
    const unemployment = Math.max(1.0, baseData.unemployment + unempAdj);

    // 2. M2 Liquidity: Contracts when rates rise
    const rateFactor = interestRate / 1000; // 1000bps = 1% drop in M2 for mock logic
    const m2 = Math.max(10, baseData.m2 * (1 - rateFactor * 0.05 * beta));

    // 3. Status logic
    let status = 'stable';
    if (unemployment > 7 || inflation > 8) status = 'crisis';
    else if (unemployment > 5 || inflation > 4) status = 'watch';

    return { unemployment, m2, status };
  };

  return (
    <div className="country-macro-container">
      <div className="macro-header-row">
        <span></span>
        <span>Country</span>
        <span className="macro-header-cell">Unemp</span>
        <span className="macro-header-cell">M2 ($B)</span>
        <span className="macro-header-cell">Status</span>
      </div>
      <div className="country-grid">
        {Object.entries(countryMacroData).sort((a,b) => b[1].m2 - a[1].m2).map(([code, data]) => {
          const adj = getAdjustedMacro(code, data);
          return (
            <div key={code} className="country-row" title={`${data.name} Macro Context`}>
              <span className="country-flag">{data.flag}</span>
              <span className="country-name">{data.name}</span>
              <div className="macro-val">
                <span className="m-value">{adj.unemployment.toFixed(1)}%</span>
              </div>
              <div className="macro-val">
                <span className="m-value">{adj.m2.toLocaleString(undefined, { maximumFractionDigits: 0 })}B</span>
              </div>
              <div className="macro-val" style={{ alignItems: 'center' }}>
                <div className={`status-indicator ${adj.status}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CountryMacro;
