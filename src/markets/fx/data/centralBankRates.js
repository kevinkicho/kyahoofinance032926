// src/markets/fx/data/centralBankRates.js
// Central bank policy rates (approximate as of early 2025 — update manually when rates change)
export const CENTRAL_BANK_RATES = {
  USD: { rate: 5.25, bank: 'Federal Reserve',  label: 'Fed Funds Rate'   },
  EUR: { rate: 4.00, bank: 'ECB',              label: 'Main Refi Rate'   },
  GBP: { rate: 5.25, bank: 'Bank of England',  label: 'Bank Rate'        },
  JPY: { rate: 0.10, bank: 'Bank of Japan',    label: 'Policy Rate'      },
  CHF: { rate: 1.75, bank: 'SNB',              label: 'Policy Rate'      },
  AUD: { rate: 4.35, bank: 'RBA',              label: 'Cash Rate'        },
  CAD: { rate: 5.00, bank: 'Bank of Canada',   label: 'Overnight Rate'   },
  NZD: { rate: 5.50, bank: 'RBNZ',             label: 'OCR'              },
  CNY: { rate: 3.45, bank: 'PBOC',             label: '1-Year LPR'       },
  SEK: { rate: 3.75, bank: 'Riksbank',         label: 'Policy Rate'      },
  NOK: { rate: 4.50, bank: 'Norges Bank',      label: 'Policy Rate'      },
};
