/**
 * Strip React.Children / RGL key noise so layout.i matches child keys.
 *
 * Regression: nested map/fragment keys like ".0:$kpi" failed to match layout
 * `i: "kpi"`, so BentoWrapper mounted empty shells for every panel.
 *
 * Examples: "kpi", ".$kpi", ".0:$kpi", ".$0:$kpi" → "kpi"
 */
export function normalizeLayoutKey(i) {
  let s = String(i ?? '');
  for (let n = 0; n < 4 && s; n += 1) {
    if (s.startsWith('.')) s = s.slice(1);
    else if (/^\d+:/.test(s)) s = s.replace(/^\d+:/, '');
    else if (s.startsWith('$')) s = s.slice(1);
    else break;
  }
  return s;
}
