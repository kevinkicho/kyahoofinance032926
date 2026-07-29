/**
 * Extract large subcomponents from Insurance / Commodities / Global Macro dashboards.
 */
import fs from 'fs';

function extractMacroBars() {
  const p = 'src/markets/globalMacro/components/GlobalMacroDashboard.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('from \'./MacroBarCharts\'')) {
    console.log('macro: already extracted');
    return;
  }
  const start = s.indexOf('function GdpBars');
  const end = s.indexOf('function GlobalMacroDashboard');
  if (start < 0 || end < start) throw new Error(`macro markers ${start} ${end}`);
  const chunk = s.slice(start, end);
  const out = `import React from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './GlobalMacroDashboard.css';

${chunk}
export { GdpBars, CpiBars, RateBars, DebtBars };
`;
  fs.writeFileSync('src/markets/globalMacro/components/MacroBarCharts.jsx', out);
  s = s.slice(0, start) + s.slice(end);
  s = s.replace(
    "import './GlobalMacroDashboard.css';",
    "import { GdpBars, CpiBars, RateBars, DebtBars } from './MacroBarCharts';\nimport './GlobalMacroDashboard.css';",
  );
  // Ensure MetricValue still imported in main if used elsewhere
  fs.writeFileSync(p, s);
  console.log('macro dashboard lines', s.split('\n').length, 'bars', out.split('\n').length);
}

function extractCommoditiesPriceCharts() {
  const p = 'src/markets/commodities/components/CommoditiesDashboard.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('from \'./PriceCharts\'')) {
    console.log('commodities: already extracted');
    return;
  }
  const start = s.indexOf('function PriceCharts');
  const end = s.indexOf('export default React.memo(CommoditiesDashboard)');
  if (start < 0 || end < start) {
    // PriceCharts may be after default export - try alternate
    const alt = s.indexOf('function PriceCharts({');
    console.log('commodities markers', start, end, alt);
    if (alt < 0) {
      console.log('commodities: PriceCharts not found, skip');
      return;
    }
  }
  // Find from function PriceCharts to end of that function (export default is after)
  const i0 = s.indexOf('function PriceCharts');
  if (i0 < 0) return;
  // Function ends before export default React.memo
  let i1 = s.indexOf('\nexport default React.memo(CommoditiesDashboard)');
  if (i1 < 0) i1 = s.lastIndexOf('export default');
  const chunk = s.slice(i0, i1);
  // Need SafeECharts import in extracted file
  const out = `import React, { useMemo } from 'react';
import SafeECharts from '../../../components/SafeECharts';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './CommoditiesDashboard.css';

${chunk}
export default PriceCharts;
`;
  fs.writeFileSync('src/markets/commodities/components/PriceCharts.jsx', out);
  s = s.slice(0, i0) + s.slice(i1);
  s = s.replace(
    "import './CommoditiesDashboard.css';",
    "import PriceCharts from './PriceCharts';\nimport './CommoditiesDashboard.css';",
  );
  fs.writeFileSync(p, s);
  console.log('commodities lines', s.split('\n').length, 'priceCharts', out.split('\n').length);
}

function extractInsuranceHelpers() {
  const p = 'src/markets/insurance/components/InsuranceDashboard.jsx';
  let s = fs.readFileSync(p, 'utf8');
  if (s.includes('from \'./insuranceHelpers\'')) {
    console.log('insurance: already extracted');
    return;
  }
  const start = s.indexOf('function fmtChangePct');
  const end = s.indexOf('function InsuranceDashboard');
  if (start < 0 || end < start) {
    console.log('insurance: helpers not found', start, end);
    return;
  }
  const chunk = s.slice(start, end);
  // Only export pure helpers (functions before InsuranceDashboard)
  const out = `/** Pure helpers for Insurance dashboard */\n${chunk}\nexport { fmtChangePct };\n`;
  // Check if only fmtChangePct
  fs.writeFileSync('src/markets/insurance/components/insuranceHelpers.js', out);
  s = s.slice(0, start) + s.slice(end);
  s = s.replace(
    "import './InsuranceDashboard.css';",
    "import { fmtChangePct } from './insuranceHelpers';\nimport './InsuranceDashboard.css';",
  );
  fs.writeFileSync(p, s);
  console.log('insurance lines', s.split('\n').length);
}

try {
  extractMacroBars();
} catch (e) {
  console.warn('macro extract failed', e.message);
}
try {
  extractCommoditiesPriceCharts();
} catch (e) {
  console.warn('commodities extract failed', e.message);
}
try {
  extractInsuranceHelpers();
} catch (e) {
  console.warn('insurance extract failed', e.message);
}
