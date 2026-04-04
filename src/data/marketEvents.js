// Notable global market events, sorted by date
// Used by TimeBar to show contextual news near a selected date
export const MARKET_EVENTS = [
  { date: '2021-01-27', emoji: '🚀', tag: 'GME', headline: 'GameStop short squeeze peaks', body: 'GME surges 1,700% as Reddit traders on r/WallStreetBets battle Wall Street short sellers. Robinhood halts trading.' },
  { date: '2021-02-08', emoji: '₿', tag: 'Tesla BTC', headline: 'Tesla buys $1.5B in Bitcoin', body: 'Elon Musk announces Tesla purchased Bitcoin as a reserve asset. BTC surges to $44K.' },
  { date: '2021-04-14', emoji: '🏦', tag: 'COIN IPO', headline: 'Coinbase IPO at $86B valuation', body: 'First major crypto exchange lists directly on NASDAQ. Crypto goes mainstream on Wall Street.' },
  { date: '2021-06-16', emoji: '📈', tag: 'Fed hawkish', headline: 'Fed signals earlier rate hikes', body: 'FOMC dot plot shifts — 2023 hike now expected. Dollar surges, gold drops. Tapering discussion begins.' },
  { date: '2021-09-20', emoji: '🏗️', tag: 'Evergrande', headline: 'Evergrande crisis shakes global markets', body: 'Chinese property giant faces $300B debt default. S&P drops 1.7%. Contagion fears spread.' },
  { date: '2021-11-03', emoji: '📉', tag: 'Fed taper', headline: 'Fed announces QE taper', body: 'Fed to reduce $120B/month bond purchases by $15B. First step toward policy normalization.' },
  { date: '2021-11-26', emoji: '😷', tag: 'Omicron', headline: 'Omicron variant discovered', body: 'New COVID variant triggers global market selloff. S&P drops 2.3%, oil crashes 13% — worst day since 2020.' },
  { date: '2022-01-05', emoji: '📋', tag: 'Fed hawkish', headline: 'Fed minutes: faster hikes ahead', body: 'Dec minutes signal rapid tightening. Tech stocks crater. NASDAQ enters correction in January.' },
  { date: '2022-02-24', emoji: '⚔️', tag: 'Russia-Ukraine', headline: 'Russia invades Ukraine', body: 'Full-scale invasion begins. Markets tumble, oil spikes above $100/barrel. European energy crisis begins.' },
  { date: '2022-03-16', emoji: '🏦', tag: 'Fed +25bps', headline: 'Fed hikes 25bps — cycle begins', body: 'First rate hike since 2018 kicks off the most aggressive tightening cycle in 40 years.' },
  { date: '2022-05-04', emoji: '💥', tag: 'Fed +50bps', headline: 'Fed hikes 50bps — largest in 22 years', body: 'S&P surges 3% then reverses. Tech in freefall. NASDAQ down 25% YTD. Growth stocks crushed.' },
  { date: '2022-06-10', emoji: '🔥', tag: 'CPI 8.6%', headline: 'CPI hits 8.6% — 40-year high', body: 'Inflation shocks markets. Fed forced into 75bps hike. S&P enters official bear market.' },
  { date: '2022-06-15', emoji: '🔨', tag: 'Fed +75bps', headline: 'Fed hikes 75bps — largest since 1994', body: 'Emergency response to surging inflation. 10yr yield hits 3.5%. Bonds and stocks both crash.' },
  { date: '2022-09-28', emoji: '🇬🇧', tag: 'UK gilts', headline: 'UK gilt market crisis', body: "UK bond market collapses after Truss government's mini-budget. BOE forced into emergency intervention." },
  { date: '2022-10-13', emoji: '📊', tag: 'CPI flip', headline: 'CPI beats — then markets reverse', body: 'S&P initially drops 2%, then surges 5% intraday in historic reversal. Traders bet Fed is near peak.' },
  { date: '2022-11-11', emoji: '₿', tag: 'FTX', headline: 'FTX crypto exchange collapses', body: 'Sam Bankman-Fried\'s $32B exchange implodes in 72 hours. Crypto market loses $200B. Bitcoin drops to $16K.' },
  { date: '2022-12-13', emoji: '❄️', tag: 'CPI peak', headline: 'CPI cools to 7.1%', body: 'Inflation peak appears to be in. Markets rally on potential Fed pivot. 10yr yield drops to 3.5%.' },
  { date: '2023-01-23', emoji: '🤖', tag: 'ChatGPT', headline: 'ChatGPT reaches 100M users', body: 'Fastest app to 100M users in history. Microsoft announces $10B investment in OpenAI. AI race ignites.' },
  { date: '2023-03-10', emoji: '🏦', tag: 'SVB', headline: 'Silicon Valley Bank collapses', body: 'Largest US bank failure since 2008. $42B withdrawn in 10 hours. Fed creates BTFP emergency facility.' },
  { date: '2023-03-19', emoji: '🇨🇭', tag: 'CS→UBS', headline: 'Credit Suisse sold to UBS', body: 'Swiss banking giant acquired for $3.25B — 99% below peak value. AT1 bonds wiped to zero.' },
  { date: '2023-05-01', emoji: '🏦', tag: 'First Republic', headline: 'First Republic Bank seized', body: 'Third major US bank failure in 2 months. JPMorgan acquires assets. Regional banking stress peaks.' },
  { date: '2023-05-25', emoji: '🖥️', tag: 'NVDA AI', headline: 'NVIDIA quarterly revenue triples guidance', body: 'NVDA guidance of $11B vs $7.2B expected. Stock surges 25% — $200B added in a day. AI boom declared.' },
  { date: '2023-07-26', emoji: '🏛️', tag: 'Fed 5.5%', headline: 'Fed raises to 5.25–5.50%', body: 'Terminal rate reached after 11 hikes. Fed signals data dependence. Market prices in cuts for 2024.' },
  { date: '2023-09-01', emoji: '📈', tag: 'Bull market', headline: 'S&P 500 enters new bull market', body: 'Index up 20% from October 2022 lows. Soft landing narrative takes hold. Mag-7 lead the charge.' },
  { date: '2023-11-01', emoji: '🕊️', tag: 'Fed pause', headline: 'Fed holds — hiking cycle likely over', body: 'Powell signals rates are sufficiently restrictive. Bond market surges. 10yr yield drops from 5%.' },
  { date: '2024-01-11', emoji: '₿', tag: 'BTC ETF', headline: 'Bitcoin ETF approved by SEC', body: 'BlackRock and Fidelity spot ETFs launch. $4B flows in on day one. BTC surges to $46K.' },
  { date: '2024-03-05', emoji: '₿', tag: 'BTC ATH', headline: 'Bitcoin hits new all-time high', body: 'BTC breaks 2021 record of $69K before the halving. Institutional inflows via ETFs drive demand.' },
  { date: '2024-04-19', emoji: '₿', tag: 'Halving', headline: 'Bitcoin halving occurs', body: 'Block reward cut from 6.25 to 3.125 BTC. Supply shock expected. BTC at $64K.' },
  { date: '2024-06-10', emoji: '🍎', tag: 'Apple AI', headline: 'Apple Intelligence unveiled at WWDC', body: 'On-device AI features announced. AAPL surges, briefly becomes most valuable company at $3.3T.' },
  { date: '2024-06-12', emoji: '🏛️', tag: 'Fed hold', headline: 'Fed holds, signals one 2024 cut', body: 'Hawkish hold surprises market. Dot plot revised from 3 to 1 cut for 2024. Tech wobbles.' },
  { date: '2024-08-02', emoji: '📉', tag: 'Jobs miss', headline: 'July jobs miss — recession fears', body: 'Only 114K jobs added vs 185K expected. Unemployment jumps to 4.3%. Sahm Rule triggered.' },
  { date: '2024-08-05', emoji: '🌊', tag: 'Yen crash', headline: 'Global flash crash — yen carry unwind', body: 'BOJ rate hike unwinds yen carry trades. S&P drops 3%, Nikkei -12%. VIX spikes to 65. Worst day since 2022.' },
  { date: '2024-09-18', emoji: '✂️', tag: 'Fed cut -50', headline: 'Fed cuts 50bps — pivot begins', body: 'Jumbo first cut surprises markets. Easing cycle begins after 14 months at peak. S&P rallies 1.7%.' },
  { date: '2024-11-06', emoji: '🗳️', tag: 'Trump wins', headline: 'Trump wins US presidential election', body: 'Republican sweep of Congress. S&P +2.5%, Bitcoin +10%, bank stocks surge. Dollar rallies sharply.' },
  { date: '2024-12-04', emoji: '🇰🇷', tag: 'Korea crisis', headline: 'South Korea emergency martial law', body: 'President Yoon declares and reverses martial law within hours. KOSPI drops 2%.' },
  { date: '2024-12-18', emoji: '🏛️', tag: '2025 hawkish', headline: 'Fed signals fewer 2025 cuts', body: 'Only 2 cuts projected for 2025 vs 4 expected. "Hawkish cut." S&P drops 3% — worst Fed day since 2001.' },
  { date: '2025-01-20', emoji: '🦅', tag: 'Trump tariffs', headline: 'Trump inaugurated — tariff threats begin', body: 'Executive orders on immigration and energy. 25% tariffs threatened on Canada and Mexico.' },
  { date: '2025-02-03', emoji: '🛃', tag: 'Tariffs 25%', headline: '25% tariffs on Canada & Mexico', body: 'Auto stocks crash. CAD and MXN tumble. Markets price in stagflation risk. Oil drops on demand fears.' },
  { date: '2025-03-04', emoji: '🖥️', tag: 'Blackwell', headline: 'NVIDIA GTC: Blackwell Ultra announced', body: 'Next-gen AI chip platform unveiled. $500B US AI infrastructure plan. NVDA recovers to $3.5T.' },
  { date: '2025-04-02', emoji: '💥', tag: 'Liberation Day', headline: 'Liberation Day — sweeping tariffs', body: "Trump announces 10-25% tariffs on most imports. S&P drops 5% — worst day since COVID crash. 'Reciprocal' tariff formula stuns markets." },
  { date: '2025-04-09', emoji: '⏸️', tag: 'Tariff pause', headline: '90-day tariff pause — markets explode', body: "Trump pauses most tariffs for 90 days. S&P surges 9.5% — biggest single-day gain since 2008. 'Greatest buying opportunity ever.'" },
];

/**
 * Find events within ±windowDays of a given YYYY-MM-DD date string.
 * Returns up to maxResults events sorted by proximity.
 */
export function getEventsNear(dateStr, windowDays = 12, maxResults = 2) {
  if (!dateStr) return [];
  const target = new Date(dateStr).getTime();
  const window = windowDays * 86400000;

  return MARKET_EVENTS
    .map(e => ({ ...e, diff: Math.abs(new Date(e.date).getTime() - target) }))
    .filter(e => e.diff <= window)
    .sort((a, b) => a.diff - b.diff)
    .slice(0, maxResults);
}
