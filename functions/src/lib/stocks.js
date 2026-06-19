import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR   = path.join(__dirname, '..', '..', 'data', 'stocks');
export const PRICES_DIR = path.join(__dirname, '..', '..', 'prices');

// Exchange suffix map: stockUniverse region name → Yahoo exchange suffix
export const REGION_SUFFIX = {
  'Japan Exchange':          'T',
  'Shanghai (China)':        'SS',
  'Shenzhen (China)':        'SZ',
  'Hong Kong (Hang Seng)':   'HK',
  'KRX (South Korea)':       'KS',
  'TWSE (Taiwan)':           'TW',
  'NSE (India)':             'NS',
  'BSE (India)':             'BO',
  'LSE (UK)':                'L',
  'Tadawul (Saudi Arabia)':  'SR',
  'TSX (Canada)':            'TO',
  'DAX (Germany)':           'F',
  'SIX (Switzerland)':       'SW',
  'Nasdaq Nordic':           'ST',   // try ST, then HE, CO
  'ASX (Australia)':         'AX',
  'B3 (Brazil)':             'SA',
  'BME (Spain)':             'MC',
  'SGX (Singapore)':         'SG',
  'JSE (South Africa)':      'JO',
  'Borsa Italiana':          'MI',
  'SET (Thailand)':          'BK',
  'BMV (Mexico)':            'MX',
  'IDX (Indonesia)':         'JK',
  'Bursa Malaysia':          'KL',
  'PSE (Philippines)':       'PS',
  'WSE (Poland)':            'WA',
  'TASE (Israel)':           'TA',
  'OSL (Norway)':            'OL',
  'Euronext (Europe)':       'PA',
  'Tadawul (UAE/Gulf)':      'AE',
  'Crypto':                  '',
};

// Nordic has mixed suffixes — try all three for fallback
export const NORDIC_SUFFIXES = ['ST', 'HE', 'CO'];

// Build candidate file paths for a ticker + region
export function resolveCandidates(ticker, region) {
  const suffix = REGION_SUFFIX[region];
  const candidates = [];

  const tryBoth = (sfx) => {
    candidates.push({ dir: DATA_DIR,   name: `${ticker}_${sfx}.json`, format: 'ohlcv' });
    candidates.push({ dir: PRICES_DIR, name: `${ticker}.${sfx}.json`, format: 'compact' });
  };

  if (suffix) {
    tryBoth(suffix);
    if (region === 'Nasdaq Nordic') NORDIC_SUFFIXES.filter(s => s !== suffix).forEach(tryBoth);
  }
  candidates.push({ dir: DATA_DIR,   name: `${ticker}.json`, format: 'ohlcv' });
  candidates.push({ dir: PRICES_DIR, name: `${ticker}.json`, format: 'compact' });

  return candidates;
}

// Read first existing candidate file; return { data, format }
export function readBestFile(ticker, region) {
  for (const c of resolveCandidates(ticker, region)) {
    const fullPath = path.join(c.dir, c.name);
    if (fs.existsSync(fullPath)) {
      try {
        return { data: JSON.parse(fs.readFileSync(fullPath, 'utf8')), format: c.format };
      } catch { /* try next */ }
    }
  }
  return null;
}

// Convert prices/ compact parallel-array format → [{date,open,high,low,close,volume}]
export function adaptCompact(compact, cutoffDate) {
  const result = [];
  for (let i = 0; i < (compact.t?.length || 0); i++) {
    const date = new Date(compact.t[i] * 1000).toISOString().split('T')[0];
    if (cutoffDate && date < cutoffDate) continue;
    result.push({
      date,
      open:   compact.o?.[i],
      high:   compact.h?.[i],
      low:    compact.l?.[i],
      close:  compact.c?.[i],
      volume: compact.v?.[i],
    });
  }
  return result;
}

export function periodCutoff(period) {
  const d = new Date();
  if (period === '5y') d.setFullYear(d.getFullYear() - 5);
  else if (period === '3y') d.setFullYear(d.getFullYear() - 3);
  else if (period === '3m') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().split('T')[0];
}

export function readLocalData(ticker) {
  const p = path.join(DATA_DIR, `${ticker}.json`);
  try { if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch { /* ignore */ }
  return null;
}

// ── Snapshot index (lazy-built for time travel) ──────────────────────────────
export let snapshotIndex = null;
export let snapshotBuilding = false;

export async function buildSnapshotIndex() {
  if (snapshotIndex || snapshotBuilding) return;
  snapshotBuilding = true;
  console.log('Building snapshot index from data/stocks/ …');
  const index = {};
  if (!fs.existsSync(DATA_DIR)) { snapshotBuilding = false; return; }
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
      const ticker = raw.ticker || file.replace('.json', '');
      if (raw.history?.length) {
        index[ticker] = raw.history.map(d => ({ date: d.date, close: d.close }));
      }
    } catch { /* skip bad files */ }
  }
  snapshotIndex = index;
  snapshotBuilding = false;
  console.log(`Snapshot index ready: ${Object.keys(index).length} tickers`);
}

export const STATIC_TICKER_MAP = {
  "1020": "1020.SR",
  "1050": "1050.SR",
  "1180": "1180.SR",
  "1211": "1211.SR",
  "1299": "1299.HK",
  "1301": "1301.TW",
  "1810": "1810.HK",
  "2010": "2010.SR",
  "2160": "2160.SR",
  "2222": "2222.SR",
  "2303": "2303.TW",
  "2308": "2308.TW",
  "2317": "2317.TW",
  "2318": "2318.HK",
  "2330": "2330.TW",
  "2350": "2350.SR",
  "2380": "2380.SR",
  "2382": "2382.TW",
  "2454": "2454.TW",
  "2881": "2881.TW",
  "2886": "2886.TW",
  "3690": "3690.HK",
  "4030": "4030.SR",
  "4063": "4063.T",
  "4200": "4200.SR",
  "4280": "4280.SR",
  "4321": "4321.SR",
  "4502": "4502.T",
  "4519": "4519.T",
  "6098": "6098.T",
  "6178": "6178.T",
  "6505": "6505.TW",
  "6758": "6758.T",
  "6861": "6861.T",
  "6902": "6902.T",
  "7203": "7203.T",
  "7267": "7267.T",
  "7741": "7741.T",
  "7974": "7974.T",
  "8031": "8031.T",
  "8035": "8035.T",
  "8053": "8053.T",
  "8058": "8058.T",
  "8306": "8306.T",
  "9432": "9432.T",
  "9618": "9618.HK",
  "9983": "9983.T",
  "9984": "9984.T",
  "9988": "9988.HK",
  "9999": "9999.HK",
  "207940": "207940.KS",
  "300014": "300014.SZ",
  "300059": "300059.SZ",
  "300124": "300124.SZ",
  "300750": "300750.SZ",
  "600000": "600000.SS",
  "600028": "600028.SS",
  "600030": "600030.SS",
  "600036": "600036.SS",
  "600050": "600050.SS",
  "600104": "600104.SS",
  "600519": "600519.SS",
  "600900": "600900.SS",
  "601012": "601012.SS",
  "601088": "601088.SS",
  "601166": "601166.SS",
  "601288": "601288.SS",
  "601318": "601318.SS",
  "601398": "601398.SS",
  "601601": "601601.SS",
  "601628": "601628.SS",
  "601857": "601857.SS",
  "601888": "601888.SS",
  "601939": "601939.SS",
  "601988": "601988.SS",
  "AAPL": "AAPL",
  "MSFT": "MSFT",
  "NVDA": "NVDA",
  "GOOGL": "GOOGL",
  "AMZN": "AMZN",
  "META": "META",
  "BRK-B": "BRK-B",
  "WMT": "WMT",
  "TSLA": "TSLA",
  "LLY": "LLY",
  "AVGO": "AVGO",
  "JPM": "JPM",
  "V": "V",
  "XOM": "XOM",
  "UNH": "UNH",
  "MA": "MA",
  "ORCL": "ORCL",
  "ABBV": "ABBV",
  "PG": "PG",
  "COST": "COST",
  "JNJ": "JNJ",
  "HD": "HD",
  "BAC": "BAC",
  "NFLX": "NFLX",
  "KO": "KO",
  "MRK": "MRK.DE",
  "CRM": "CRM",
  "AMD": "AMD",
  "CSCO": "CSCO",
  "GE": "GE",
  "MC": "MC.PA",
  "ASML": "ASML.AS",
  "OR": "OR.PA",
  "RMS": "RMS.PA",
  "SAN": "SAN.MC",
  "TTE": "TTE.PA",
  "SU": "SU.TO",
  "AIR": "AIR.PA",
  "AI": "AI.PA",
  "BNP": "BNP.PA",
  "CS": "CS.PA",
  "EL": "EL.PA",
  "DG": "DG.PA",
  "STLA": "STLA",
  "IFX": "IFX.DE",
  "ENGI": "ENGI.PA",
  "BN": "BN.PA",
  "RI": "RI.PA",
  "ML": "ML.PA",
  "NOKIA": "NOKIA.HE",
  "002594": "002594.SZ",
  "000858": "000858.SZ",
  "000333": "000333.SZ",
  "002475": "002475.SZ",
  "000651": "000651.SZ",
  "002415": "002415.SZ",
  "000001": "000001.SZ",
  "000568": "000568.SZ",
  "000776": "000776.SZ",
  "002714": "002714.SZ",
  "002230": "002230.SZ",
  "0700": "0700.HK",
  "0941": "0941.HK",
  "0005": "0005.HK",
  "0883": "0883.HK",
  "0388": "0388.HK",
  "0016": "0016.HK",
  "0175": "0175.HK",
  "0027": "0027.HK",
  "RELIANCE": "RELIANCE.NS",
  "TCS": "TCS.NS",
  "HDFCBANK": "HDFCBANK.NS",
  "BHARTIARTL": "BHARTIARTL.NS",
  "ICICIBANK": "ICICIBANK.NS",
  "INFY": "INFY.NS",
  "SBIN": "SBIN.NS",
  "ITC": "ITC.NS",
  "LT": "LT.NS",
  "HINDUNILVR": "HINDUNILVR.NS",
  "BAJFINANCE": "BAJFINANCE.NS",
  "KOTAKBANK": "KOTAKBANK.NS",
  "MARUTI": "MARUTI.NS",
  "ADANIENT": "ADANIENT.NS",
  "WIPRO": "WIPRO.NS",
  "AXISBANK": "AXISBANK.NS",
  "SUNPHARMA": "SUNPHARMA.NS",
  "ASIANPAINT": "ASIANPAINT.NS",
  "NTPC": "NTPC.NS",
  "NESTLEIND": "NESTLEIND.NS",
  "AZN": "AZN.L",
  "SHEL": "SHEL.L",
  "HSBA": "HSBA.L",
  "ULVR": "ULVR.L",
  "BP": "BP.L",
  "RIO": "RIO.L",
  "GSK": "GSK.L",
  "BATS": "BATS.L",
  "REL": "REL.L",
  "DGE": "DGE.L",
  "NG": "NG.L",
  "BARC": "BARC.L",
  "BA": "BA.L",
  "LLOY": "LLOY.L",
  "NWG": "NWG.L",
  "PRU": "PRU.L",
  "STAN": "STAN.L",
  "IMB": "IMB.L",
  "VOD": "VOD.L",
  "LGEN": "LGEN.L",
  "RY": "RY.TO",
  "TD": "TD.TO",
  "SHOP": "SHOP.TO",
  "BAM": "BAM.TO",
  "CNR": "CNR.TO",
  "CP": "CP.TO",
  "ENB": "ENB.TO",
  "TRI": "TRI.TO",
  "CNQ": "CNQ.TO",
  "BMO": "BMO.TO",
  "BNS": "BNS.TO",
  "MFC": "MFC.TO",
  "ABX": "ABX.TO",
  "HCLTECH": "HCLTECH.NS",
  "TECHM": "TECHM.NS",
  "M&M": "M&M.NS",
  "BAJAJFINSV": "BAJAJFINSV.NS",
  "TITAN": "TITAN.NS",
  "ONGC": "ONGC.NS",
  "ULTRACEMCO": "ULTRACEMCO.NS",
  "POWERGRID": "POWERGRID.NS",
  "HINDALCO": "HINDALCO.NS",
  "CIPLA": "CIPLA.NS",
  "DRREDDY": "DRREDDY.NS",
  "EICHERMOT": "EICHERMOT.NS",
  "BPCL": "BPCL.NS",
  "VEDL": "VEDL.NS",
  "SAP": "SAP.DE",
  "SIE": "SIE.DE",
  "ALV": "ALV.DE",
  "DTE": "DTE.DE",
  "VOW3": "VOW3.DE",
  "BMW": "BMW.DE",
  "MBG": "MBG.DE",
  "BAS": "BAS.DE",
  "RWE": "RWE.DE",
  "DB1": "DB1.DE",
  "HEI": "HEI.DE",
  "BAYN": "BAYN.DE",
  "MTX": "MTX.DE",
  "005930": "005930.KS",
  "000660": "000660.KS",
  "005380": "005380.KS",
  "068270": "068270.KS",
  "000270": "000270.KS",
  "012330": "012330.KS",
  "035420": "035420.KS",
  "051910": "051910.KS",
  "035720": "035720.KS",
  "096770": "096770.KS",
  "003550": "003550.KS",
  "030200": "030200.KS",
  "028260": "028260.KS",
  "017670": "017670.KS",
  "NOVN": "NOVN.SW",
  "ROG": "ROG.SW",
  "NESN": "NESN.SW",
  "UBSG": "UBSG.SW",
  "ABBN": "ABBN.SW",
  "SREN": "SREN.SW",
  "ZURN": "ZURN.SW",
  "LONN": "LONN.SW",
  "GIVN": "GIVN.SW",
  "SCMN": "SCMN.SW",
  "NOVO-B": "NOVO-B.CO",
  "ATCO-B": "ATCO-B.ST",
  "VOLV-B": "VOLV-B.ST",
  "ASSA-B": "ASSA-B.ST",
  "DSV": "DSV.CO",
  "SAND": "SAND.ST",
  "HM-B": "HM-B.ST",
  "NESTE": "NESTE.HE",
  "ERIC-B": "ERIC-B.ST",
  "BHP": "BHP.AX",
  "CBA": "CBA.AX",
  "CSL": "CSL.AX",
  "NAB": "NAB.AX",
  "WES": "WES.AX",
  "ANZ": "ANZ.AX",
  "MQG": "MQG.AX",
  "WBC": "WBC.AX",
  "FMG": "FMG.AX",
  "GMG": "GMG.AX",
  "WOW": "WOW.AX",
  "TCL": "TCL.AX",
  "ALL": "ALL.AX",
  "QBE": "QBE.AX",
  "NPN": "NPN.JO",
  "CFR": "CFR.JO",
  "AGL": "AGL.JO",
  "SBK": "SBK.JO",
  "FSR": "FSR.JO",
  "MTN": "MTN.JO",
  "SOL": "SOL.JO",
  "VALE3": "VALE3.SA",
  "PETR4": "PETR4.SA",
  "ITUB4": "ITUB4.SA",
  "BBDC4": "BBDC4.SA",
  "B3SA3": "B3SA3.SA",
  "WEGE3": "WEGE3.SA",
  "ABEV3": "ABEV3.SA",
  "BBAS3": "BBAS3.SA",
  "SUZB3": "SUZB3.SA",
  "ITX": "ITX.MC",
  "IBE": "IBE.MC",
  "BBVA": "BBVA.MC",
  "TEF": "TEF.MC",
  "REP": "REP.MC",
  "ACS": "ACS.MC",
  "D05": "D05.SI",
  "U11": "U11.SI",
  "O39": "O39.SI",
  "Z74": "Z74.SI",
  "G13": "G13.SI",
  "S68": "S68.SI",
  "ENEL": "ENEL.MI",
  "ENI": "ENI.MI",
  "ISP": "ISP.MI",
  "UCG": "UCG.MI",
  "STM": "STM.MI",
  "LDO": "LDO.MI",
  "PRY": "PRY.MI",
  "PTT": "PTT.BK",
  "PTTEP": "PTTEP.BK",
  "GULF": "GULF.BK",
  "ADVANC": "ADVANC.BK",
  "CPALL": "CPALL.BK",
  "SCB": "SCB.BK",
  "AOT": "AOT.BK",
  "AMXL": "AMXL.MX",
  "WALMEX": "WALMEX.MX",
  "FEMSAUBD": "FEMSAUBD.MX",
  "GMEXICOB": "GMEXICOB.MX",
  "GFNORTEO": "GFNORTEO.MX",
  "CEMEXCPO": "CEMEXCPO.MX",
  "BBCA": "BBCA.JK",
  "BBRI": "BBRI.JK",
  "TLKM": "TLKM.JK",
  "ASII": "ASII.JK",
  "BMRI": "BMRI.JK",
  "MAY": "MAY.KL",
  "PBK": "PBK.KL",
  "CIMB": "CIMB.KL",
  "TENAGA": "TENAGA.KL",
  "PCHEM": "PCHEM.KL",
  "EQNR": "EQNR.OL",
  "DNB": "DNB.OL",
  "MOWI": "MOWI.OL",
  "ORK": "ORK.OL",
  "PKN": "PKN.WA",
  "PKO": "PKO.WA",
  "PZU": "PZU.WA",
  "KGH": "KGH.WA",
  "LPP": "LPP.WA",
  "NICE": "NICE",
  "CHKP": "CHKP",
  "IHC": "IHC.AD",
  "FAB": "FAB.AD",
  "ETISALAT": "ETISALAT.AD",
  "MELI": "MELI",
  "KSPI": "KSPI",
  "VIC": "VIC.VN",
  "VNM": "VNM.VN",
  "VCB": "VCB.VN"
};

export function mapToYahooTicker(ticker) {
  if (!ticker || typeof ticker !== 'string') return ticker;
  if (ticker.includes('.')) return ticker;
  const CRYPTO_TICKERS = new Set([
    'BTC','ETH','XRP','BNB','SOL','DOGE','ADA','TRX','AVAX','LINK','DOT','LTC','UNI','POL','ATOM',
  ]);
  if (CRYPTO_TICKERS.has(ticker)) return `${ticker}-USD`;
  return STATIC_TICKER_MAP[ticker] || ticker;
}

export function getYahooTicker(ticker, region) {
  if (!ticker || typeof ticker !== 'string') return ticker;
  if (ticker.includes('.')) return ticker;
  const suffix = REGION_SUFFIX[region];
  if (suffix) return `${ticker}.${suffix}`;
  return mapToYahooTicker(ticker);
}
