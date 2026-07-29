import fs from 'fs';

const p = 'src/markets/bonds/components/BondsDashboard.jsx';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('bondsChartOptions')) {
  s = s.replace(
    "import './BondsDashboard.css';",
    "import { buildSpreadHistoryOption, buildFedBalanceOption, buildM2Option, buildDebtToGdpOption } from './bondsChartOptions';\nimport './BondsDashboard.css';",
  );
}

// Identify spread history option variable name
const spreadMatch = s.match(/const (\w+) = useMemo\(\(\) => \{\s*\n\s*if \(!spreadHistory/);
const spreadName = spreadMatch?.[1] || 'curveSpreadsOption';

// Replace blocks by unique start comments / patterns
const replacements = [
  [
    /const curveSpreadsOption = useMemo\(\(\) => \{[\s\S]*?\}, \[spreadHistory, colors\]\);/,
    `const curveSpreadsOption = useMemo(
    () => buildSpreadHistoryOption(spreadHistory, colors),
    [spreadHistory, colors],
  );`,
  ],
  [
    /const spreadHistoryOption = useMemo\(\(\) => \{[\s\S]*?\}, \[spreadHistory, colors\]\);/,
    `const spreadHistoryOption = useMemo(
    () => buildSpreadHistoryOption(spreadHistory, colors),
    [spreadHistory, colors],
  );`,
  ],
  [
    /\/\/ Fed Balance Sheet chart\r?\n\s*const fedBalanceOption = useMemo\(\(\) => \{[\s\S]*?\}, \[fedBalanceSheetHistory, colors, currentSymbol\]\);/,
    `const fedBalanceOption = useMemo(
    () => buildFedBalanceOption(fedBalanceSheetHistory, colors, currentSymbol),
    [fedBalanceSheetHistory, colors, currentSymbol],
  );`,
  ],
  [
    /\/\/ M2 chart\r?\n\s*const m2Option = useMemo\(\(\) => \{[\s\S]*?\}, \[m2HistoryData, colors, currentSymbol\]\);/,
    `const m2Option = useMemo(
    () => buildM2Option(m2HistoryData, colors, currentSymbol),
    [m2HistoryData, colors, currentSymbol],
  );`,
  ],
  [
    /\/\/ Debt-to-GDP chart\r?\n\s*const debtToGdpOption = useMemo\(\(\) => \{[\s\S]*?\}, \[debtToGdpHistory, colors\]\);/,
    `const debtToGdpOption = useMemo(
    () => buildDebtToGdpOption(debtToGdpHistory, colors),
    [debtToGdpHistory, colors],
  );`,
  ],
];

for (const [re, rep] of replacements) {
  if (re.test(s)) {
    s = s.replace(re, rep);
    console.log('replaced', re.toString().slice(0, 40));
  } else {
    console.log('skip', re.toString().slice(0, 40));
  }
}

fs.writeFileSync(p, s);
console.log('lines', s.split('\n').length, 'spreadName', spreadName);
console.log('import', s.includes('bondsChartOptions'));
console.log('buildFed', s.includes('buildFedBalanceOption'));
