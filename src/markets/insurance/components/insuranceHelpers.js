/** Pure helpers for Insurance dashboard */
function fmtChangePct(v) {
  if (v == null) return '';
  return v >= 0 ? `+${v.toFixed(2)}%` : `${v.toFixed(2)}%`;
}


export { fmtChangePct };
