/**
 * Default scenarios — generic, relatable sample figures, parameterised by
 * currency. We do NOT convert one currency to another; each currency just has
 * its own set of round, locally-relatable default amounts (so a $ user isn't
 * staring at ₹15,00,000). Amounts are derived from the ₹ template via a
 * per-currency scale + "nice" rounding, with the headline numbers pinned.
 *
 * Every scenario carries a `currency` field (the unit its amounts are in).
 */

// Globally-unique id. A plain counter would reset to 0 on each page load and
// collide with ids inside an already-saved/shared scenario (causing React key
// clashes when adding rows), so use a random uuid.
const uid = (p) =>
  `${p}-${typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)}`;

/* ------------------------------ Currency profiles ------------------------------ */

const PROFILES = {
  '₹': { savings: 1500000, sip: 25000, inflation: 0.06, stepUp: 0.08, scale: 1 },
  $: { savings: 150000, sip: 1500, inflation: 0.03, stepUp: 0.04, scale: 0.07 },
  '€': { savings: 140000, sip: 1400, inflation: 0.03, stepUp: 0.04, scale: 0.065 },
  '£': { savings: 130000, sip: 1300, inflation: 0.03, stepUp: 0.04, scale: 0.06 },
};

export const profileFor = (currency) => PROFILES[currency] || PROFILES['₹'];

/** Round to a relatable value (nearest half-order-of-magnitude). */
function nice(v) {
  if (!v || v <= 0) return 0;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const step = mag / 2;
  return Math.round(Math.round(v / step) * step);
}

/** Scale a ₹-template amount into the target currency's relatable default. */
function amt(base, currency) {
  const p = profileFor(currency);
  return p.scale === 1 ? base : nice(base * p.scale);
}

const PRE_RET_ALLOCATION = [
  { name: 'Fixed Returns', ret: 0.07, tax: 0.3, share: 0.1 },
  { name: 'Large Cap MF', ret: 0.12, tax: 0.2, share: 0.5 },
  { name: 'Midcap MF', ret: 0.15, tax: 0.2, share: 0.3 },
  { name: 'Smallcap MF', ret: 0.18, tax: 0.2, share: 0.1 },
];

const POST_RET_ALLOCATION = [
  { name: 'Fixed Returns', ret: 0.07, tax: 0.3, share: 0.75 },
  { name: 'Large Cap MF', ret: 0.12, tax: 0.2, share: 0.25 },
  { name: 'Midcap MF', ret: 0.15, tax: 0.2, share: 0 },
  { name: 'Smallcap MF', ret: 0.18, tax: 0.2, share: 0 },
];

const m = (bucket, name, amount, cadence, startAge, endAge) => ({
  id: uid('e'),
  bucket,
  name,
  amount,
  cadence,
  startAge,
  endAge,
});

/** Sample line-item expense list (amounts scaled to the given currency). */
function buildExpenses(currency) {
  const a = (base) => amt(base, currency);
  return [
    // ---- Kids: school + the optional college spikes ----
    m('Kids', 'Child 1 — school', a(80000), 'yearly', 30, 40),
    m('Kids', 'Child 1 — college', a(600000), 'yearly', 41, 44),
    m('Kids', 'Child 2 — school', a(80000), 'yearly', 30, 43),
    m('Kids', 'Child 2 — college', a(600000), 'yearly', 44, 47),
    m('Kids', 'Tuition & coaching', a(3000), 'monthly', 30, 47),
    m('Kids', 'Activities & sports', a(2000), 'monthly', 30, 45),
    // ---- Utilities ----
    m('Utilities', 'Electricity', a(2500), 'monthly', 30, 'life'),
    m('Utilities', 'Internet & mobile', a(1500), 'monthly', 30, 'life'),
    m('Utilities', 'Domestic help', a(5000), 'monthly', 30, 'life'),
    m('Utilities', 'Cooking gas', a(1000), 'monthly', 30, 'life'),
    m('Utilities', 'Fuel & transport', a(4000), 'monthly', 30, 'life'),
    m('Utilities', 'Society maintenance', a(3500), 'monthly', 30, 'life'),
    // ---- Insurance ----
    m('Insurance', 'Health insurance (family)', a(30000), 'yearly', 30, 'life'),
    m('Insurance', 'Term life insurance', a(15000), 'yearly', 30, 'life'),
    m('Insurance', 'Vehicle insurance', a(8000), 'yearly', 30, 'life'),
    // ---- Food ----
    m('Food', 'Groceries', a(8000), 'monthly', 30, 'life'),
    m('Food', 'Fruits & vegetables', a(4000), 'monthly', 30, 'life'),
    // ---- Entertainment ----
    m('Entertainment', 'OTT subscriptions', a(800), 'monthly', 30, 'life'),
    m('Entertainment', 'Dining out', a(3000), 'monthly', 30, 'life'),
    // ---- Home ----
    m('Home', 'Household essentials', a(3000), 'monthly', 30, 'life'),
    m('Home', 'Property tax', a(8000), 'yearly', 30, 'life'),
    m('Home', 'Home maintenance', a(15000), 'yearly', 30, 'life'),
    m('Home', 'Electronics & appliances', a(20000), 'yearly', 30, 'life'),
    // ---- Travel ----
    m('Travel', 'Domestic travel', a(80000), 'yearly', 30, 'life'),
    m('Travel', 'International travel', a(100000), 'yearly', 30, 'life'),
  ];
}

/** The default scenario the app loads: full line items + tax drag ON. */
export function defaultScenario(currency = '₹') {
  const p = profileFor(currency);
  return {
    name: 'Detailed plan (line items + tax drag)',
    currency,
    currentAge: 30,
    retirementAge: 60,
    endAge: 85,
    currentSavings: p.savings,
    monthlyInvestment: p.sip,
    savingsStepUp: p.stepUp,
    inflation: p.inflation,
    applyTaxDrag: true,
    preRetAllocation: PRE_RET_ALLOCATION.map((a) => ({ ...a })),
    postRetAllocation: POST_RET_ALLOCATION.map((a) => ({ ...a })),
    expenses: buildExpenses(currency),
    inflows: [],
    assets: [],
  };
}

/**
 * "Simple" preset: a single flat monthly post-retirement expense with tax drag
 * OFF (gross returns) — the classic back-of-envelope retirement model.
 */
export function simpleScenario(currency = '₹') {
  const base = defaultScenario(currency);
  return {
    ...base,
    name: 'Simple plan (flat monthly expense)',
    applyTaxDrag: false,
    inflows: [],
    expenses: [
      {
        id: uid('e'),
        bucket: 'All',
        name: 'Flat post-retirement spend',
        amount: amt(50000, currency),
        cadence: 'monthly',
        startAge: base.retirementAge,
        endAge: 'life',
      },
    ],
  };
}

export const EXPENSE_BUCKETS = [
  'Kids',
  'Utilities',
  'Insurance',
  'Food',
  'Entertainment',
  'Home',
  'Travel',
  'Other',
  'All',
];

export const newExpense = (startAge = 30, currency = '₹') =>
  m('Other', 'New expense', amt(10000, currency), 'monthly', startAge, 'life');

export const newInflow = (startAge = 60, currency = '₹') => ({
  id: uid('i'),
  name: 'New inflow',
  amount: amt(20000, currency),
  cadence: 'monthly',
  startAge,
  endAge: startAge + 5,
  growthRate: 0.05,
});

/**
 * Portfolio asset.
 *   liquid=true  -> counts toward the starting corpus now (grows via the
 *                   investment mix; its own `growth` field is informational).
 *   liquid=false -> illiquid (real estate, etc.); grows at its own `growth`
 *                   rate and only enters the corpus if `liquidate` is on, at
 *                   `liquidationAge`, releasing `releasePct` of its grown value
 *                   (1 = full sale, <1 = refinance / partial equity release).
 */
export const newAsset = (currency = '₹') => ({
  id: uid('a'),
  name: 'New asset',
  value: amt(1000000, currency),
  growth: 0.1,
  liquid: true,
  liquidate: false,
  liquidationAge: 60,
  releasePct: 1,
});

const liquidAsset = (name, base, growth, currency) => ({
  id: uid('a'),
  name,
  value: amt(base, currency),
  growth,
  liquid: true,
  liquidate: false,
  liquidationAge: 60,
  releasePct: 1,
});

/**
 * Sample portfolio (amounts scaled to the given currency) — a liquid corpus
 * plus one illiquid property flagged to sell at retirement.
 */
export function samplePortfolio(currency = '₹') {
  return [
    liquidAsset('Equity mutual funds', 800000, 0.12, currency),
    liquidAsset('Direct stocks', 300000, 0.12, currency),
    liquidAsset('Retirement accounts', 600000, 0.08, currency),
    liquidAsset('Fixed deposits', 400000, 0.07, currency),
    liquidAsset('Pension fund', 200000, 0.1, currency),
    liquidAsset('Gold / ETF', 200000, 0.08, currency),
    liquidAsset("Spouse's mutual funds", 300000, 0.12, currency),
    {
      id: uid('a'),
      name: 'Second property',
      value: amt(5000000, currency),
      growth: 0.07,
      liquid: false,
      liquidate: true,
      liquidationAge: 60,
      releasePct: 1,
    },
  ];
}
