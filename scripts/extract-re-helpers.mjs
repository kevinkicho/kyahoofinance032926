import fs from 'fs';

const p = 'src/markets/realEstate/components/RealEstateDashboard.jsx';
let re = fs.readFileSync(p, 'utf8');
if (re.includes("from './RealEstateHelpers'")) {
  console.log('already extracted');
  process.exit(0);
}
const start = re.indexOf('function latestNumber');
const end = re.indexOf('function RealEstateDashboard');
if (start < 0 || end < start) throw new Error(`markers ${start} ${end}`);
const chunk = re.slice(start, end);
const helpers = `/** Shared formatters + commodity snapshot for RE dashboard. */\n${chunk}\nexport { latestNumber, fmtAcct, fmtUsdAcct, fmtPctAcct, getCommoditySnapshot };\n`;
fs.writeFileSync('src/markets/realEstate/components/RealEstateHelpers.js', helpers);
re = re.slice(0, start) + re.slice(end);
const importLine = "import RentalAffordabilityMap from './RentalAffordabilityMap';";
const withHelpers = `${importLine}\nimport { latestNumber, fmtAcct, fmtUsdAcct, fmtPctAcct, getCommoditySnapshot } from './RealEstateHelpers';`;
if (!re.includes(importLine)) throw new Error('import line missing');
re = re.replace(importLine, withHelpers);
fs.writeFileSync(p, re);
console.log('re lines', re.split('\n').length, 'helpers', helpers.split('\n').length);
