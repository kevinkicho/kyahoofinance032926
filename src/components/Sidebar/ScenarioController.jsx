import React, { useState, useEffect, useRef } from 'react';
import './ScenarioController.css';

// Hook: fires callback only after user stops dragging for `delay` ms
const useDebounce = (value, delay) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

const ScenarioController = ({ scenarios, setScenarios, useMlEngine, setUseMlEngine }) => {
  // Local state tracks slider position in real-time (instant UI feedback)
  const [local, setLocal] = useState(scenarios);

  // Debounced values — only trigger treemap re-render after 120ms idle
  const dRisk     = useDebounce(local.riskAppetite, 120);
  const dRate     = useDebounce(local.interestRate,  120);
  const dInflat   = useDebounce(local.inflation,     120);
  const dPpi      = useDebounce(local.ppi,           120);
  const dGini     = useDebounce(local.gini,          120);

  // Push debounced values up to App state
  useEffect(() => {
    setScenarios({ riskAppetite: dRisk, interestRate: dRate, inflation: dInflat, ppi: dPpi, gini: dGini });
  }, [dRisk, dRate, dInflat, dPpi, dGini]);

  // Keep local in sync if parent resets
  useEffect(() => { setLocal(scenarios); }, [scenarios.riskAppetite, scenarios.interestRate, scenarios.inflation, scenarios.ppi, scenarios.gini]);

  const handleChange = (key, value) =>
    setLocal(prev => ({ ...prev, [key]: parseFloat(value) }));

  const handleReset = () => {
    const baseline = { riskAppetite: 50, interestRate: 0, inflation: 2.0, ppi: 2.0, gini: 48.0 };
    setLocal(baseline);
    setScenarios(baseline);
  };

  return (
    <div className="scenario-controller">
      <div className="scenario-group">
        <div className="scenario-label">
          <span>Global Risk Appetite</span>
          <span className="scenario-value">{local.riskAppetite}%</span>
        </div>
        <input type="range" min="0" max="100"
          value={local.riskAppetite}
          onChange={e => handleChange('riskAppetite', e.target.value)}
        />
        <div className="range-hints"><span>Defensive</span><span>Aggressive</span></div>
      </div>

      <div className="scenario-group">
        <div className="scenario-label">
          <span>Interest Rate Shift</span>
          <span className="scenario-value">{local.interestRate > 0 ? '+' : ''}{local.interestRate} bps</span>
        </div>
        <input type="range" min="-300" max="300" step="25"
          value={local.interestRate}
          onChange={e => handleChange('interestRate', e.target.value)}
        />
        <div className="range-hints"><span>Dovish</span><span>Hawkish</span></div>
      </div>

      <div className="scenario-group">
        <div className="scenario-label">
          <span>Inflation Expectation (CPI)</span>
          <span className="scenario-value">{local.inflation}%</span>
        </div>
        <input type="range" min="0" max="15" step="0.1"
          value={local.inflation}
          onChange={e => handleChange('inflation', e.target.value)}
        />
        <div className="range-hints"><span>Deflation</span><span>Hyperinflation</span></div>
      </div>

      <div className="scenario-group">
        <div className="scenario-label">
          <span>Producer Price Index (PPI)</span>
          <span className="scenario-value">{local.ppi}%</span>
        </div>
        <input type="range" min="-5" max="15" step="0.1"
          value={local.ppi}
          onChange={e => handleChange('ppi', e.target.value)}
          title="Supply Chain Raw Material Inflation"
        />
        <div className="range-hints"><span>Supply Glut</span><span>Supply Shock</span></div>
      </div>

      <div className="scenario-group">
        <div className="scenario-label">
          <span>Gini Index (Inequality)</span>
          <span className="scenario-value">{local.gini}</span>
        </div>
        <input type="range" min="35" max="65" step="0.5"
          value={local.gini}
          onChange={e => handleChange('gini', e.target.value)}
          title="0=Equality, 100=Max Inequality. Structural drag on retail."
        />
        <div className="range-hints"><span>Utopia (35)</span><span>Feudal (65)</span></div>
      </div>

      <div className="scenario-toggles" style={{ marginTop: '0.5rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input 
          type="checkbox" 
          id="ml-toggle" 
          checked={useMlEngine} 
          onChange={(e) => setUseMlEngine(e.target.checked)} 
        />
        <label htmlFor="ml-toggle" style={{ fontSize: '0.75rem', color: useMlEngine ? '#a855f7' : 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }}>
          Apply ML Engine Predictions
        </label>
      </div>

      <button className="reset-scenario" onClick={handleReset}>
        Reset to Baseline
      </button>
    </div>
  );
};

export default ScenarioController;
