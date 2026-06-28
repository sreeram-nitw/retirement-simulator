/** Indian-notation currency + number formatting helpers. */

/** Compact ₹ in Lakh / Crore (e.g. ₹1.50 Cr, ₹25.00 L). */
export function inr(n) {
  if (n == null || isNaN(n)) return '—';
  const neg = n < 0;
  const a = Math.abs(n);
  let s;
  if (a >= 1e7) s = `${(a / 1e7).toFixed(2)} Cr`;
  else if (a >= 1e5) s = `${(a / 1e5).toFixed(2)} L`;
  else if (a >= 1e3) s = `${Math.round(a).toLocaleString('en-IN')}`;
  else s = `${Math.round(a)}`;
  return `${neg ? '-' : ''}₹${s}`;
}

/** Full ₹ with Indian digit grouping (e.g. ₹8,41,46,161). */
export function inrFull(n) {
  if (n == null || isNaN(n)) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

/** Percent from a fraction (0.08 -> "8%"). */
export function pct(x, digits = 0) {
  if (x == null || isNaN(x)) return '—';
  return `${(x * 100).toFixed(digits)}%`;
}
