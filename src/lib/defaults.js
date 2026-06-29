/**
 * Default scenario — generic, representative figures for an urban Indian
 * middle-class household (sample data only; tune everything in the UI).
 *
 * The two children's school lines carry an optional "college spike": school
 * fees for several years, then a higher college cost for four years. If you
 * drag the retirement age earlier, those spikes can land inside retirement and
 * show up in the projection. All amounts, ages and rates are editable.
 */

// Globally-unique id. A plain counter would reset to 0 on each page load and
// collide with ids inside an already-saved/shared scenario (causing React key
// clashes when adding rows), so use a random uuid.
const uid = (p) =>
  `${p}-${typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)}`;

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

/** Sample line-item expense list (generic Indian household). */
function buildExpenses() {
  return [
    // ---- Kids: school + the optional college spikes ----
    m('Kids', 'Child 1 — school', 80000, 'yearly', 30, 40),
    m('Kids', 'Child 1 — college', 600000, 'yearly', 41, 44),
    m('Kids', 'Child 2 — school', 80000, 'yearly', 30, 43),
    m('Kids', 'Child 2 — college', 600000, 'yearly', 44, 47),
    m('Kids', 'Tuition & coaching', 3000, 'monthly', 30, 47),
    m('Kids', 'Activities & sports', 2000, 'monthly', 30, 45),
    // ---- Utilities ----
    m('Utilities', 'Electricity', 2500, 'monthly', 30, 'life'),
    m('Utilities', 'Internet & mobile', 1500, 'monthly', 30, 'life'),
    m('Utilities', 'Domestic help', 5000, 'monthly', 30, 'life'),
    m('Utilities', 'Cooking gas', 1000, 'monthly', 30, 'life'),
    m('Utilities', 'Fuel & transport', 4000, 'monthly', 30, 'life'),
    m('Utilities', 'Society maintenance', 3500, 'monthly', 30, 'life'),
    // ---- Insurance ----
    m('Insurance', 'Health insurance (family)', 30000, 'yearly', 30, 'life'),
    m('Insurance', 'Term life insurance', 15000, 'yearly', 30, 'life'),
    m('Insurance', 'Vehicle insurance', 8000, 'yearly', 30, 'life'),
    // ---- Food ----
    m('Food', 'Groceries', 8000, 'monthly', 30, 'life'),
    m('Food', 'Fruits & vegetables', 4000, 'monthly', 30, 'life'),
    // ---- Entertainment ----
    m('Entertainment', 'OTT subscriptions', 800, 'monthly', 30, 'life'),
    m('Entertainment', 'Dining out', 3000, 'monthly', 30, 'life'),
    // ---- Home ----
    m('Home', 'Household essentials', 3000, 'monthly', 30, 'life'),
    m('Home', 'Property tax', 8000, 'yearly', 30, 'life'),
    m('Home', 'Home maintenance', 15000, 'yearly', 30, 'life'),
    m('Home', 'Electronics & appliances', 20000, 'yearly', 30, 'life'),
    // ---- Travel ----
    m('Travel', 'Domestic travel', 80000, 'yearly', 30, 'life'),
    m('Travel', 'International travel', 100000, 'yearly', 30, 'life'),
  ];
}

/** The default scenario the app loads: full line items + tax drag ON. */
export function defaultScenario() {
  return {
    name: 'Detailed plan (line items + tax drag)',
    currentAge: 30,
    retirementAge: 60,
    endAge: 85,
    currentSavings: 1500000,
    monthlyInvestment: 25000,
    savingsStepUp: 0.08,
    inflation: 0.06,
    applyTaxDrag: true,
    preRetAllocation: PRE_RET_ALLOCATION.map((a) => ({ ...a })),
    postRetAllocation: POST_RET_ALLOCATION.map((a) => ({ ...a })),
    expenses: buildExpenses(),
    inflows: [],
    assets: [],
  };
}

/**
 * "Simple" preset: a single flat monthly post-retirement expense with tax drag
 * OFF (gross returns) — the classic back-of-envelope retirement model.
 */
export function simpleScenario() {
  const base = defaultScenario();
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
        amount: 50000,
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

export const newExpense = (startAge = 30) =>
  m('Other', 'New expense', 10000, 'monthly', startAge, 'life');

export const newInflow = () => ({
  id: uid('i'),
  name: 'New inflow',
  amount: 20000,
  cadence: 'monthly',
  startAge: 60,
  endAge: 65,
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
export const newAsset = () => ({
  id: uid('a'),
  name: 'New asset',
  value: 1000000,
  growth: 0.1,
  liquid: true,
  liquidate: false,
  liquidationAge: 60,
  releasePct: 1,
});

const liquidAsset = (name, valueL, growth) => ({
  id: uid('a'),
  name,
  value: Math.round(valueL * 100000), // value given in lakhs
  growth,
  liquid: true,
  liquidate: false,
  liquidationAge: 60,
  releasePct: 1,
});

/**
 * Sample portfolio (generic) — ~₹28 L liquid corpus, plus one illiquid property
 * flagged to sell at retirement to show how a liquidation tops up the corpus.
 */
export function samplePortfolio() {
  return [
    liquidAsset('Equity mutual funds', 8.0, 0.12),
    liquidAsset('Direct stocks', 3.0, 0.12),
    liquidAsset('EPF & PPF', 6.0, 0.08),
    liquidAsset('Fixed deposits', 4.0, 0.07),
    liquidAsset('NPS', 2.0, 0.1),
    liquidAsset('Gold (SGB / ETF)', 2.0, 0.08),
    liquidAsset("Spouse's mutual funds", 3.0, 0.12),
    {
      id: uid('a'),
      name: 'Second property',
      value: 5000000, // ₹50 L
      growth: 0.07,
      liquid: false,
      liquidate: true,
      liquidationAge: 60,
      releasePct: 1,
    },
  ];
}
