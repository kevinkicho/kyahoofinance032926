import React, { useState, useEffect, useMemo } from 'react';
import { TRAINING_DATA, buildGlobalMacroEngine, predictMacroImpact } from '../../utils/mlEngine';
import { useTheme } from '../../hub/ThemeContext';
import './ModelExplorer.css';

const ModelExplorer = ({ scenarios, setScenarios }) => {
  const { colors } = useTheme();
  const [models, setModels] = useState(null);
  const [activeSector, setActiveSector] = useState('Technology');

  // Train the model natively on mount
  useEffect(() => {
    // Adding a slight delay to simulate "training time" for UX
    const t = setTimeout(() => {
      const trained = buildGlobalMacroEngine();
      setModels(trained);
    }, 400);
    return () => clearTimeout(t);
  }, []);

  // Calculate live prediction for the active sector
  const livePrediction = useMemo(() => {
    if (!models) return 0;
    const preds = predictMacroImpact(models, scenarios.riskAppetite, scenarios.interestRate, scenarios.inflation, scenarios.ppi, scenarios.gini);
    return preds[activeSector];
  }, [models, scenarios, activeSector]);

  if (!models) {
    return (
      <div className="ml-loading">
        <div className="ml-spinner" />
        <p>Training Multiple Linear Regression Model on 6 Historical Eras...</p>
      </div>
    );
  }

  const actModel = models[activeSector];
  const features = [
    { name: 'Risk Appetite', w: actModel.w_risk, val: scenarios.riskAppetite, norm: scenarios.riskAppetite / 100 },
    { name: 'Interest Rate', w: actModel.w_rate, val: scenarios.interestRate, norm: scenarios.interestRate / 600 },
    { name: 'Inflation (CPI)', w: actModel.w_inf,  val: scenarios.inflation, norm: scenarios.inflation / 10 },
    { name: 'Producer Prices (PPI)', w: actModel.w_ppi, val: scenarios.ppi, norm: (scenarios.ppi - -5) / 20 },
    { name: 'Inequality (Gini)', w: actModel.w_gini, val: scenarios.gini, norm: (scenarios.gini - 35) / 30 }
  ];

  return (
    <div className="model-explorer">
      <div className="ml-header">
        <h2>Transparent Engine: Statistical VAR/MLR</h2>
        <p>No black boxes. A native JavaScript gradient-descent solver just read our 6 historical macro eras and derived exactly how Risk, Rates, and Inflation impact each sector.</p>
      </div>

      <div className="ml-layout">
        <div className="ml-left">
          {/* Training Data Table */}
          <div className="ml-card">
            <h3>1. The Training Data (Input matrix)</h3>
            <table className="ml-table">
              <thead>
                <tr>
                  <th>Era</th>
                  <th>Risk (0-100)</th>
                  <th>Rate (bps)</th>
                  <th>CPI (%)</th>
                  <th>PPI (%)</th>
                  <th>Gini</th>
                  <th>{activeSector} Shift</th>
                </tr>
              </thead>
              <tbody>
                {TRAINING_DATA.map(d => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td className="mono">{d.risk}</td>
                    <td className="mono">{d.rate}</td>
                    <td className="mono">{d.inflation.toFixed(1)}</td>
                    <td className="mono">{d.ppi.toFixed(1)}</td>
                    <td className="mono">{d.gini.toFixed(1)}</td>
                    <td className="mono">{d.y[activeSector].toFixed(2)}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Model Weights / Feature Importance */}
          <div className="ml-card">
            <h3 style={{ display:'flex', justifyContent:'space-between'}}>
              2. Extracted Feature Weights
              <select className="ml-select" value={activeSector} onChange={e => setActiveSector(e.target.value)}>
                {Object.keys(models).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </h3>
            <div className="weight-bars">
              {features.map(f => {
                const wPct = (Math.abs(f.w) / 2) * 100; // max weight scale ~2.0
                const isPos = f.w >= 0;
                return (
                  <div key={f.name} className="weight-row">
                    <span className="w-label">{f.name}</span>
                    <div className="w-track">
                      <div className="w-zero-line" />
                      <div className={`w-fill ${isPos ? 'w-pos' : 'w-neg'}`} 
                           style={{ width: `${Math.min(100, wPct)}%`, left: isPos ? '50%' : `calc(50% - ${Math.min(50, wPct)}%)` }} />
                    </div>
                    <span className={`w-val mono ${isPos ? 't-green' : 't-red'}`}>{isPos ? '+' : ''}{f.w.toFixed(3)}</span>
                  </div>
                );
              })}
            </div>
            <p className="ml-note">Notice how the model mathematically proves that {features.find(f => f.w === Math.max(...features.map(x=>x.w))).name} drives {activeSector} up, while {features.find(f => f.w === Math.min(...features.map(x=>x.w))).name} pulls it down.</p>
          </div>
        </div>

        <div className="ml-right">
          {/* Live Equasion Sandbox */}
          <div className="ml-card sandbox-card">
            <h3>3. Live Equation Sandbox (y = mx + b)</h3>
            <div className="equation-box">
              <div className="eq-row">
                <span className="eq-var">Base Intercept (bias)</span>
                <span className="eq-math">{actModel.bias.toFixed(3)}</span>
              </div>
              {features.map(f => (
                <div className="eq-row" key={f.name}>
                  <span className="eq-var">+ ({f.name} weight × input)</span>
                  <span className="eq-math">
                    <span className={f.w >= 0 ? 't-green' : 't-red'}>{f.w >= 0 ? '+' : ''}{f.w.toFixed(3)}</span>
                    <span style={{color: colors.textMuted}}> × {f.norm.toFixed(2)}</span>
                  </span>
                </div>
              ))}
              <div className="eq-total">
                <span>Predicted Multiplier</span>
                <span className="eq-result">{livePrediction.toFixed(2)}x</span>
              </div>
            </div>

            <div className="sandbox-sliders">
              <label>Risk Appetite ({scenarios.riskAppetite})</label>
              <input type="range" min="0" max="100" value={scenarios.riskAppetite} onChange={e => setScenarios(s => ({...s, riskAppetite: +e.target.value}))} />
              
              <label>Rates ({scenarios.interestRate} bps)</label>
              <input type="range" min="0" max="600" step="25" value={scenarios.interestRate} onChange={e => setScenarios(s => ({...s, interestRate: +e.target.value}))} />
              
              <label>CPI Inflation ({scenarios.inflation}%)</label>
              <input type="range" min="0" max="10" step="0.1" value={scenarios.inflation} onChange={e => setScenarios(s => ({...s, inflation: +e.target.value}))} />
              
              <label>PPI Supply Shock ({scenarios.ppi}%)</label>
              <input type="range" min="-5" max="15" step="0.1" value={scenarios.ppi} onChange={e => setScenarios(s => ({...s, ppi: +e.target.value}))} />
              
              <label>Gini Index ({scenarios.gini})</label>
              <input type="range" min="35" max="65" step="0.5" value={scenarios.gini} onChange={e => setScenarios(s => ({...s, gini: +e.target.value}))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelExplorer;
