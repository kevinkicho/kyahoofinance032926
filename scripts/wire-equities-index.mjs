import fs from 'fs';

const p = 'src/markets/equities/EquitiesMarket.jsx';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('equitiesIndexUniverse')) {
  console.log('already wired');
  process.exit(0);
}

const i0 = s.indexOf('const INDEX_TICKERS_US =');
if (i0 < 0) throw new Error('no INDEX_TICKERS_US');
const i1 = s.indexOf('const INDEX_LABELS =');
if (i1 < 0) throw new Error('no INDEX_LABELS');
const brace = s.indexOf('};', i1);
if (brace < 0) throw new Error('no INDEX_LABELS close');
const after = s.indexOf('\n', brace) + 1;

const importLine =
  "import {\n"
  + "  INDEX_TICKERS, INDEX_LABELS,\n"
  + "  INDEX_TICKERS_US, INDEX_TICKERS_DEV, INDEX_TICKERS_EM, INDEX_TICKERS_CN,\n"
  + "  INDEX_TICKERS_RISK, INDEX_TICKERS_COMM, INDEX_TICKERS_SECTORS,\n"
  + "} from './equitiesIndexUniverse';\n";

s = s.slice(0, i0) + s.slice(after);
if (!s.includes("from './equitiesIndexUniverse'")) {
  s = s.replace("import './EquitiesDashboard.css';", `${importLine}import './EquitiesDashboard.css';`);
}
fs.writeFileSync(p, s);
console.log('wired equities index universe, lines', s.split('\n').length);
