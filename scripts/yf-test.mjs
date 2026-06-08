import yf from 'yahoo-finance2';
const d = await yf.default.chart('000688.SS', { period1: '2026-02-04', period2: '2026-05-04', interval: '1d' });
console.log('quotes count:', d.quotes?.length);
console.log('first:', d.quotes?.[0]?.date, d.quotes?.[0]?.close);
console.log('last:', d.quotes?.[d.quotes?.length - 1]?.date, d.quotes?.[d.quotes?.length - 1]?.close);
