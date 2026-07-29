/**
 * One-shot extractor: pull large inline panel components out of god dashboards.
 * Safe to re-run only if markers still present.
 */
import fs from 'fs';

function extractBonds() {
  const bondsPath = 'src/markets/bonds/components/BondsDashboard.jsx';
  let bonds = fs.readFileSync(bondsPath, 'utf8');
  if (bonds.includes("from './MacroAndRatesPanels'")) {
    console.log('bonds: already extracted');
    return;
  }
  const start = bonds.indexOf('/** Format FRED macro levels');
  const end = bonds.indexOf('function BondsDashboard');
  if (start < 0 || end < 0) throw new Error(`bonds markers not found ${start} ${end}`);
  const extracted = bonds.slice(start, end);
  const macroFile = `import React, { useMemo } from 'react';
import MetricValue from '../../../components/MetricValue/MetricValue';
import './BondsDashboard.css';

${extracted}
export { MacroIndicatorsPanel, EcbPolicyRatesPanel, CentralBankRatesPanel };
`;
  fs.writeFileSync('src/markets/bonds/components/MacroAndRatesPanels.jsx', macroFile);
  bonds = bonds.slice(0, start) + bonds.slice(end);
  bonds = bonds.replace(
    "import CpiComponents from './CpiComponents';",
    "import CpiComponents from './CpiComponents';\nimport { MacroIndicatorsPanel, EcbPolicyRatesPanel, CentralBankRatesPanel } from './MacroAndRatesPanels';",
  );
  fs.writeFileSync(bondsPath, bonds);
  console.log('bonds lines', bonds.split('\n').length, 'macro', macroFile.split('\n').length);
}

function extractRealEstateMap() {
  const rePath = 'src/markets/realEstate/components/RealEstateDashboard.jsx';
  let re = fs.readFileSync(rePath, 'utf8');
  if (re.includes("from './RentalAffordabilityMap'")) {
    console.log('re: map already extracted');
    return;
  }
  const reStart = re.indexOf('function RentalAffordabilityMap');
  const reDash = re.indexOf('function RealEstateDashboard');
  if (reStart < 0 || reDash < reStart) {
    console.log('re: RentalAffordabilityMap not found, skip');
    return;
  }
  const chunk = re.slice(reStart, reDash);
  const mapFile = `import React from 'react';
import './RealEstateDashboard.css';

${chunk}
export default RentalAffordabilityMap;
`;
  fs.writeFileSync('src/markets/realEstate/components/RentalAffordabilityMap.jsx', mapFile);
  re = re.slice(0, reStart) + re.slice(reDash);
  re = re.replace(
    "import './RealEstateDashboard.css';",
    "import RentalAffordabilityMap from './RentalAffordabilityMap';\nimport './RealEstateDashboard.css';",
  );
  fs.writeFileSync(rePath, re);
  console.log('re lines', re.split('\n').length);
}

function extractCreditBankPanels() {
  // Credit already uses external BisTotalCreditPanel etc. Extract DefaultRates table
  // body is small; skip heavy rewrite.
  console.log('credit: already modular enough (external Bis/WB/Treasury panels)');
}

extractBonds();
extractRealEstateMap();
extractCreditBankPanels();
