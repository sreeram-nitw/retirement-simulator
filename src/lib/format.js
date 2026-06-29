/**
 * Configurable currency + number formatting.
 *
 * One runtime config (currency symbol + notation system) drives every figure in
 * the app, since all components format through inr()/inrFull(). Grouping (commas)
 * comes from Intl.NumberFormat using the system's locale, so large numbers are
 * always readable.
 */

const SYSTEMS = {
  indian: {
    locale: 'en-IN', // groups as 8,41,46,161
    units: [
      { v: 1e7, s: ' Cr' },
      { v: 1e5, s: ' L' },
    ],
  },
  international: {
    locale: 'en-US', // groups as 84,146,161
    units: [
      { v: 1e9, s: 'B' },
      { v: 1e6, s: 'M' },
      { v: 1e3, s: 'K' },
    ],
  },
};

// Notation follows the currency: ₹ uses Lakh/Crore, the rest use K/M/B.
export const CURRENCIES = [
  { sym: '₹', name: 'INR', system: 'indian' },
  { sym: '$', name: 'USD', system: 'international' },
  { sym: '€', name: 'EUR', system: 'international' },
  { sym: '£', name: 'GBP', system: 'international' },
];

export function systemForCurrency(sym) {
  return (CURRENCIES.find((c) => c.sym === sym) || {}).system || 'international';
}

const DEFAULTS = { system: 'indian', currency: '₹' };
let CONFIG = { ...DEFAULTS };

export function setFormatConfig(c = {}) {
  CONFIG = {
    system: SYSTEMS[c.system] ? c.system : CONFIG.system,
    currency: c.currency || CONFIG.currency,
  };
}
export function getFormatConfig() {
  return { ...CONFIG };
}

/** The active currency symbol — for static labels like column headers. */
export function currencySymbol() {
  return CONFIG.currency;
}

/** Plain grouped number (no currency) for editable inputs, e.g. 1,50,000 / 150,000. */
export function groupNumber(n) {
  if (n === '' || n == null || isNaN(n)) return '';
  return group(Number(n), 2);
}

const sys = () => SYSTEMS[CONFIG.system] || SYSTEMS.indian;

/** Group a number with the active system's locale and up to `maxFrac` decimals. */
function group(n, maxFrac = 0) {
  return new Intl.NumberFormat(sys().locale, { maximumFractionDigits: maxFrac }).format(n);
}

/** Compact currency (e.g. ₹1.5 Cr, $1.5M) — symbol- and notation-aware, grouped. */
export function inr(n) {
  if (n == null || isNaN(n)) return '—';
  const neg = n < 0;
  const a = Math.abs(n);
  const unit = sys().units.find((u) => a >= u.v);
  const body = unit ? `${group(a / unit.v, 2)}${unit.s}` : group(a, 0);
  return `${neg ? '-' : ''}${CONFIG.currency}${body}`;
}

/** Full currency with digit grouping (e.g. ₹8,41,46,161 or $84,146,161). */
export function inrFull(n) {
  if (n == null || isNaN(n)) return '—';
  const neg = n < 0;
  return `${neg ? '-' : ''}${CONFIG.currency}${group(Math.abs(n), 0)}`;
}

/** Percent from a fraction (0.08 -> "8%"). */
export function pct(x, digits = 0) {
  if (x == null || isNaN(x)) return '—';
  return `${(x * 100).toFixed(digits)}%`;
}
