const sectors = ['Technology', 'Financials', 'Healthcare', 'Energy', 'Consumer', 'Industrials'];

const pad = (existing, prefix, target, startVal) => {
  const arr = existing.map((item, idx) => ({ 
    ...item, 
    sector: item.sector || sectors[idx % sectors.length] 
  }));
  
  let val = arr.length ? arr[arr.length - 1].value * 0.92 : startVal;
  const colors = ['#27ae60', '#2ecc71', '#e74c3c', '#c0392b'];
  
  for (let i = arr.length + 1; i <= target; i++) {
    arr.push({ 
      name: `${prefix}${i}`, 
      value: Math.floor(val), 
      sector: sectors[i % sectors.length],
      itemStyle: { color: colors[i % 4] } 
    });
    val *= 0.96; // exponential decay curve for market caps
  }
  return arr;
};

export const mockTreemapData = [
  // Top 10 Elite Markets (Padded to 50)
  {
    name: 'USA (NYSE & NASDAQ)',
    currency: 'USD',
    symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#3b82f6' }, // Blue
    children: pad([
      { name: 'AAPL', value: 3000, sector: 'Technology', itemStyle: { color: '#27ae60' } },
      { name: 'MSFT', value: 2800, sector: 'Technology', itemStyle: { color: '#27ae60' } },
      { name: 'NVDA', value: 2200, sector: 'Technology', itemStyle: { color: '#27ae60' } },
      { name: 'GOOGL', value: 1800, sector: 'Technology', itemStyle: { color: '#e74c3c' } },
      { name: 'AMZN', value: 1600, sector: 'Consumer', itemStyle: { color: '#2ecc71' } },
      { name: 'META', value: 1200, sector: 'Technology', itemStyle: { color: '#c0392b' } }
    ], 'US-', 50, 1000)
  },
  {
    name: 'Euronext (Europe)',
    currency: 'EUR',
    symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#10b981' }, // Emerald
    children: pad([
      { name: 'LVMH', value: 400, sector: 'Consumer', itemStyle: { color: '#e74c3c' } },
      { name: 'ASML', value: 350, sector: 'Technology', itemStyle: { color: '#27ae60' } },
      { name: 'L\'Oréal', value: 250, sector: 'Consumer', itemStyle: { color: '#2ecc71' } }
    ], 'EU-', 50, 200)
  },
  {
    name: 'Shanghai (China)',
    currency: 'CNY',
    symbol: '¥',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#ef4444' }, // Red
    children: pad([
      { name: 'Moutai', value: 300, sector: 'Consumer', itemStyle: { color: '#e74c3c' } },
      { name: 'ICBC', value: 250, sector: 'Financials', itemStyle: { color: '#27ae60' } }
    ], 'SHG-', 50, 200)
  },
  {
    name: 'Japan Exchange',
    currency: 'JPY',
    symbol: '¥',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fbbf24' }, // Amber
    children: pad([
      { name: 'Toyota', value: 300, sector: 'Consumer', itemStyle: { color: '#27ae60' } },
      { name: 'Sony', value: 150, sector: 'Technology', itemStyle: { color: '#2ecc71' } }
    ], 'JP-', 50, 100)
  },
  {
    name: 'Shenzhen (China)',
    currency: 'CNY',
    symbol: '¥',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f87171' }, // Light Red
    children: pad([
      { name: 'BYD', value: 150, sector: 'Consumer', itemStyle: { color: '#27ae60' } },
      { name: 'CATL', value: 130, sector: 'Industrials', itemStyle: { color: '#e74c3c' } }
    ], 'SHZ-', 50, 100)
  },
  {
    name: 'Hong Kong (Hang Seng)',
    currency: 'HKD',
    symbol: 'HK$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#a855f7' }, // Purple
    children: pad([
      { name: 'Tencent', value: 400, sector: 'Technology', itemStyle: { color: '#e74c3c' } },
      { name: 'Alibaba', value: 250, sector: 'Consumer', itemStyle: { color: '#c0392b' } }
    ], 'HK-', 50, 150)
  },
  {
    name: 'NSE (India)',
    currency: 'INR',
    symbol: '₹',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f97316' }, // Orange
    children: pad([
      { name: 'Reliance', value: 250, sector: 'Energy', itemStyle: { color: '#27ae60' } },
      { name: 'TCS', value: 180, sector: 'Technology', itemStyle: { color: '#2ecc71' } }
    ], 'IN-', 50, 100)
  },
  {
    name: 'LSE (UK)',
    currency: 'GBP',
    symbol: '£',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#8b5cf6' }, // Violet
    children: pad([
      { name: 'SHEL', value: 250, sector: 'Energy', itemStyle: { color: '#2ecc71' } },
      { name: 'AZN', value: 230, sector: 'Healthcare', itemStyle: { color: '#e74c3c' } }
    ], 'UK-', 50, 150)
  },
  {
    name: 'Tadawul (Saudi Arabia)',
    currency: 'SAR',
    symbol: '﷼',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#14b8a6' }, // Teal
    children: pad([
      { name: 'Aramco', value: 2000, sector: 'Energy', itemStyle: { color: '#27ae60' } }
    ], 'SA-', 50, 150)
  },
  {
    name: 'TSX (Canada)',
    currency: 'CAD',
    symbol: 'C$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#ec4899' }, // Pink
    children: pad([
      { name: 'RBC', value: 140, sector: 'Financials', itemStyle: { color: '#27ae60' } },
      { name: 'TD', value: 110, sector: 'Financials', itemStyle: { color: '#2ecc71' } }
    ], 'CA-', 50, 80)
  },
  {
    name: 'BSE (India)',
    currency: 'INR',
    symbol: '₹',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fb923c' },
    children: pad([ { name: 'Infosys', value: 90, sector: 'Technology', itemStyle: { color: '#27ae60' } } ], 'IN-BSE-', 50, 80)
  },
  {
    name: 'DAX (Germany)',
    currency: 'EUR',
    symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#06b6d4' },
    children: pad([ { name: 'SAP', value: 200, sector: 'Technology', itemStyle: { color: '#27ae60' } } ], 'GER-', 40, 100) 
  },
  {
    name: 'KRX (South Korea)',
    currency: 'KRW',
    symbol: '₩',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#6366f1' },
    children: pad([ { name: 'Samsung', value: 350, sector: 'Technology', itemStyle: { color: '#e74c3c' } } ], 'KR-', 50, 150)
  },
  {
    name: 'SIX (Switzerland)',
    currency: 'CHF',
    symbol: 'Fr',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f43f5e' },
    children: pad([ { name: 'Nestlé', value: 300, sector: 'Consumer', itemStyle: { color: '#27ae60' } } ], 'CH-', 50, 150)
  },
  {
    name: 'Nasdaq Nordic',
    currency: 'SEK',
    symbol: 'kr',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#38bdf8' },
    children: pad([ { name: 'Novo Nordisk', value: 450, sector: 'Healthcare', itemStyle: { color: '#27ae60' } } ], 'NO-NOR-', 50, 150)
  },
  {
    name: 'TWSE (Taiwan)',
    currency: 'TWD',
    symbol: 'NT$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#84cc16' },
    children: pad([ { name: 'TSMC', value: 650, sector: 'Technology', itemStyle: { color: '#27ae60' } } ], 'TW-', 50, 200)
  },
  {
    name: 'ASX (Australia)',
    currency: 'AUD',
    symbol: 'A$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#d946ef' },
    children: pad([ { name: 'BHP', value: 150, sector: 'Energy', itemStyle: { color: '#e74c3c' } } ], 'AU-', 50, 100)
  },
  {
    name: 'JSE (South Africa)',
    currency: 'ZAR',
    symbol: 'R',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#eab308' },
    children: pad([ { name: 'Naspers', value: 60, sector: 'Technology', itemStyle: { color: '#e74c3c' } } ], 'ZA-', 50, 50)
  },
  {
    name: 'B3 (Brazil)',
    currency: 'BRL',
    symbol: 'R$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#22c55e' },
    children: pad([ { name: 'Petrobras', value: 100, sector: 'Energy', itemStyle: { color: '#27ae60' } } ], 'BR-', 50, 80)
  },
  {
    name: 'BME (Spain)',
    currency: 'EUR',
    symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f59e0b' },
    children: pad([ { name: 'Inditex', value: 120, sector: 'Consumer', itemStyle: { color: '#27ae60' } } ], 'ES-', 50, 80)
  },
  {
    name: 'SGX (Singapore)',
    currency: 'SGD',
    symbol: 'S$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#cbd5e1' },
    children: pad([ { name: 'DBS', value: 70, sector: 'Financials', itemStyle: { color: '#2ecc71' } } ], 'SG-', 50, 50)
  },
  {
    name: 'Borsa Italiana',
    currency: 'EUR',
    symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#475569' },
    children: pad([ { name: 'Enel', value: 60, sector: 'Energy', itemStyle: { color: '#27ae60' } } ], 'IT-', 50, 40)
  },
  {
    name: 'SET (Thailand)',
    currency: 'THB',
    symbol: '฿',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fda4af' },
    children: pad([ { name: 'PTT', value: 30, sector: 'Energy', itemStyle: { color: '#e74c3c' } } ], 'TH-', 50, 20)
  },
  {
    name: 'BMV (Mexico)',
    currency: 'MXN',
    symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fcd34d' },
    children: pad([ { name: 'America Movil', value: 50, sector: 'Technology', itemStyle: { color: '#27ae60' } } ], 'MX-', 50, 40)
  },
  {
    name: 'IDX (Indonesia)',
    currency: 'IDR',
    symbol: 'Rp',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#86efac' },
    children: pad([ { name: 'BCA', value: 75, sector: 'Financials', itemStyle: { color: '#27ae60' } } ], 'ID-', 50, 50)
  },
  {
    name: 'Bursa Malaysia',
    currency: 'MYR',
    symbol: 'RM',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#93c5fd' },
    children: pad([ { name: 'Maybank', value: 25, sector: 'Financials', itemStyle: { color: '#e74c3c' } } ], 'MY-', 50, 20)
  },
  {
    name: 'PSE (Philippines)',
    currency: 'PHP',
    symbol: '₱',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#c4b5fd' },
    children: pad([ { name: 'SM Prime', value: 20, sector: 'Consumer', itemStyle: { color: '#2ecc71' } } ], 'PH-', 50, 15)
  },
  {
    name: 'WSE (Poland)',
    currency: 'PLN',
    symbol: 'zł',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f9a8d4' },
    children: pad([ { name: 'Orlen', value: 15, sector: 'Energy', itemStyle: { color: '#27ae60' } } ], 'PL-', 50, 10)
  },
  {
    name: 'TASE (Israel)',
    currency: 'ILS',
    symbol: '₪',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#99f6e4' },
    children: pad([ { name: 'NICE', value: 18, sector: 'Technology', itemStyle: { color: '#2ecc71' } } ], 'IL-', 50, 12)
  },
  {
    name: 'OSL (Norway)',
    currency: 'NOK',
    symbol: 'kr',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#bae6fd' },
    children: pad([ { name: 'Equinor', value: 90, sector: 'Energy', itemStyle: { color: '#e74c3c' } } ], 'NO-', 50, 60)
  },
  {
    name: 'VSE (Austria)',
    currency: 'EUR',
    symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fed7aa' },
    children: pad([ { name: 'Erste', value: 14, sector: 'Financials', itemStyle: { color: '#27ae60' } } ], 'AT-', 50, 10)
  },
  {
    name: 'NZX (New Zealand)',
    currency: 'NZD',
    symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#d9f99d' },
    children: pad([ { name: 'Fisher', value: 10, sector: 'Healthcare', itemStyle: { color: '#e74c3c' } } ], 'NZ-', 50, 8)
  },
  {
    name: 'BVC (Colombia)',
    currency: 'COP',
    symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fef08a' },
    children: pad([ { name: 'Ecopetrol', value: 12, sector: 'Energy', itemStyle: { color: '#27ae60' } } ], 'CO-', 50, 10)
  },
  {
    name: 'QSE (Qatar)',
    currency: 'QAR',
    symbol: 'ر.ق',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#bfdbfe' },
    children: pad([ { name: 'QNB', value: 45, sector: 'Financials', itemStyle: { color: '#2ecc71' } } ], 'QA-', 50, 30)
  },
  {
    name: 'ADX (Abu Dhabi)',
    currency: 'AED',
    symbol: 'د.إ',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#e9d5ff' },
    children: pad([ { name: 'IHC', value: 230, sector: 'Financials', itemStyle: { color: '#27ae60' } } ], 'AD-', 50, 150)
  },
  {
    name: 'DFM (Dubai)',
    currency: 'AED',
    symbol: 'د.إ',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fbcfe8' },
    children: pad([ { name: 'Emirates NBD', value: 30, sector: 'Financials', itemStyle: { color: '#27ae60' } } ], 'DU-', 50, 20)
  },
  {
    name: 'KSE (Kuwait)',
    currency: 'KWD',
    symbol: 'د.ك',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#a7f3d0' },
    children: pad([ { name: 'KFH', value: 40, sector: 'Financials', itemStyle: { color: '#e74c3c' } } ], 'KW-', 50, 25)
  },
  {
    name: 'EGX (Egypt)',
    currency: 'EGP',
    symbol: 'E£',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fca5a5' },
    children: pad([ { name: 'CIB', value: 8, sector: 'Financials', itemStyle: { color: '#2ecc71' } } ], 'EG-', 50, 5)
  },
  {
    name: 'BCS (Chile)',
    currency: 'CLP',
    symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#6ee7b7' },
    children: pad([ { name: 'SQM', value: 22, sector: 'Industrials', itemStyle: { color: '#e74c3c' } } ], 'CL-', 50, 15)
  },
  {
    name: 'BVL (Peru)',
    currency: 'PEN',
    symbol: 'S/',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#c084fc' },
    children: pad([ { name: 'Credicorp', value: 13, sector: 'Financials', itemStyle: { color: '#27ae60' } } ], 'PE-', 50, 10)
  },
  {
    name: 'Casablanca (Morocco)',
    currency: 'MAD',
    symbol: 'د.م.',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f87171' },
    children: pad([ { name: 'Attijari', value: 6, sector: 'Financials', itemStyle: { color: '#27ae60' } } ], 'MA-', 50, 5)
  },
  {
    name: 'NGX (Nigeria)',
    currency: 'NGN',
    symbol: '₦',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#34d399' },
    children: pad([ { name: 'Dangote', value: 10, sector: 'Industrials', itemStyle: { color: '#2ecc71' } } ], 'NG-', 50, 8)
  },
  {
    name: 'BCBA (Argentina)',
    currency: 'ARS',
    symbol: '$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#60a5fa' },
    children: pad([ { name: 'YPF', value: 7, sector: 'Energy', itemStyle: { color: '#e74c3c' } } ], 'AR-', 50, 5)
  },
  {
    name: 'KASE (Kazakhstan)',
    currency: 'KZT',
    symbol: '₸',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#818cf8' },
    children: pad([ { name: 'Kaspi', value: 16, sector: 'Financials', itemStyle: { color: '#27ae60' } } ], 'KZ-', 50, 10)
  },
  {
    name: 'HOSE (Vietnam)',
    currency: 'VND',
    symbol: '₫',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#a78bfa' },
    children: pad([ { name: 'Vingroup', value: 10, sector: 'Consumer', itemStyle: { color: '#2ecc71' } } ], 'VN-', 50, 8)
  },
  {
    name: 'DSE (Bangladesh)',
    currency: 'BDT',
    symbol: '৳',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#f472b6' },
    children: pad([ { name: 'Grameen', value: 4, sector: 'Technology', itemStyle: { color: '#27ae60' } } ], 'BD-', 50, 3)
  },
  {
    name: 'PSX (Pakistan)',
    currency: 'PKR',
    symbol: '₨',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fb7185' },
    children: pad([ { name: 'OGDC', value: 3, sector: 'Energy', itemStyle: { color: '#e74c3c' } } ], 'PK-', 50, 2)
  },
  {
    name: 'NSE (Kenya)',
    currency: 'KES',
    symbol: 'KSh',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#4ade80' },
    children: pad([ { name: 'Safaricom', value: 5, sector: 'Technology', itemStyle: { color: '#27ae60' } } ], 'KE-', 50, 4)
  },
  {
    name: 'ZSE (Zimbabwe)',
    currency: 'ZWG',
    symbol: 'Z$',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#fb923c' },
    children: pad([ { name: 'Delta', value: 1, sector: 'Consumer', itemStyle: { color: '#e74c3c' } } ], 'ZW-', 50, 1)
  },
  {
    name: 'BVM (Luxembourg)',
    currency: 'EUR',
    symbol: '€',
    itemStyle: { color: 'transparent', borderWidth: 2, borderColor: '#2dd4bf' },
    children: pad([ { name: 'Arcelor', value: 20, sector: 'Industrials', itemStyle: { color: '#27ae60' } } ], 'LU-', 50, 15)
  }
];
