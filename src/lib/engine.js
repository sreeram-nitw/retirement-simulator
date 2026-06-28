/**
 * Retirement / Early-FIRE simulation engine.
 *
 * Pure, framework-free. Models a year-by-year corpus ledger alongside a
 * line-item expense inventory.
 *
 * Key features:
 *   1. Expenses are TIME-VARYING line items (start age, end age, cadence,
 *      per-line inflation) instead of one flat monthly number. This makes the
 *      total spend automatically glide down as kids age out, and captures
 *      lumpy spikes (e.g. college fees) natively.
 *   2. User-defined post-retirement INFLOWS, each with its own amount,
 *      start/end age and growth rate (spouse income, rent, coast, pension...).
 *   3. A TAX-DRAG toggle: when on, investment gains are taxed each year using
 *      the blended tax of the allocation (accurate / conservative). When off,
 *      the model grows the corpus at GROSS returns (the simpler classic model).
 *
 * @typedef {Object} AllocRow   {string} name, {number} ret, {number} tax, {number} share
 * @typedef {Object} ExpenseLine
 *   {string} id, {string} bucket, {string} name, {number} amount,
 *   {'monthly'|'yearly'|'oneoff'} cadence,
 *   {number} startAge, {number|'life'} endAge, {number|null} [inflation]
 * @typedef {Object} InflowLine
 *   {string} id, {string} name, {number} amount,
 *   {'monthly'|'yearly'} cadence,
 *   {number} startAge, {number|'life'} endAge, {number} growthRate
 */

/**
 * Sum of LIQUID asset current values, or null if the portfolio isn't in use
 * (no assets, or none marked liquid). When non-null this becomes the starting
 * corpus, overriding the manual `currentSavings` input.
 */
export function liquidAssetTotal(s) {
  const assets = s.assets || [];
  if (assets.length === 0) return null;
  const liquid = assets.filter((a) => a.liquid);
  if (liquid.length === 0) return null;
  return liquid.reduce((sum, a) => sum + (Number(a.value) || 0), 0);
}

/** Starting corpus: portfolio liquid sum if a portfolio is in use, else currentSavings. */
export function startingCorpus(s) {
  const liq = liquidAssetTotal(s);
  return liq != null ? liq : Number(s.currentSavings) || 0;
}

/** Blended (share-weighted) return and tax for an allocation. */
export function blend(alloc) {
  const total = alloc.reduce((s, a) => s + (Number(a.share) || 0), 0);
  if (total === 0) return { ret: 0, tax: 0 };
  const ret = alloc.reduce((s, a) => s + Number(a.ret) * Number(a.share), 0) / total;
  const tax = alloc.reduce((s, a) => s + Number(a.tax) * Number(a.share), 0) / total;
  return { ret, tax };
}

/** Annual amount of a line in TODAY's rupees (before inflation/growth). */
function annualBase(amount, cadence) {
  const a = Number(amount) || 0;
  return cadence === 'monthly' ? a * 12 : a; // yearly & oneoff are already annual
}

/** Resolve an endAge that may be the sentinel 'life'. */
function resolveEnd(endAge, planEndAge) {
  return endAge === 'life' || endAge == null ? planEndAge : Number(endAge);
}

/** Is a line active in a given year? */
function lineActive(line, age, planEndAge) {
  const start = Number(line.startAge);
  if (line.cadence === 'oneoff') return age === start;
  return age >= start && age <= resolveEnd(line.endAge, planEndAge);
}

/**
 * Run the full simulation.
 * @param {Object} s scenario
 * @returns {{rows: Array, survives: boolean, depletionAge: number|null,
 *            endingCorpus: number, peakSpendAge: number|null, pre: Object, post: Object}}
 */
export function simulate(s) {
  const currentAge = Number(s.currentAge);
  const retirementAge = Number(s.retirementAge);
  const endAge = Number(s.endAge);
  const inflation = Number(s.inflation);
  const stepUp = Number(s.savingsStepUp);
  const applyTaxDrag = !!s.applyTaxDrag;
  const expenses = s.expenses || [];
  const inflows = s.inflows || [];
  // Illiquid assets flagged for sale/refinance: their grown value drops into the
  // corpus at the chosen age (releasePct lets a refinance release partial equity).
  const sellable = (s.assets || []).filter(
    (a) => !a.liquid && a.liquidate && a.liquidationAge != null
  );

  const pre = blend(s.preRetAllocation || []);
  const post = blend(s.postRetAllocation || []);

  const rows = [];
  let corpus = startingCorpus(s);
  let sip = Number(s.monthlyInvestment) * 12; // annual SIP at start
  let earningYears = 0;
  let depletionAge = null;
  let peakSpend = -1;
  let peakSpendAge = null;

  // "Plan until age N" means the plan ends AT age N, so the last spending year
  // is N-1 (age N = "done").
  for (let age = currentAge; age < endAge; age++) {
    const phase = age < retirementAge ? 'Earning' : 'Retired';
    const start = corpus;

    // ---- Expenses (drawn from corpus only once retired; salary covers them while earning) ----
    let expense = 0;
    if (phase === 'Retired') {
      for (const e of expenses) {
        if (lineActive(e, age, endAge)) {
          const infl = e.inflation != null ? Number(e.inflation) : inflation;
          expense += annualBase(e.amount, e.cadence) * Math.pow(1 + infl, age - currentAge);
        }
      }
    }

    // ---- Inflows (post-retirement, net/post-tax, grown at each line's own rate) ----
    let inflow = 0;
    if (phase === 'Retired') {
      for (const f of inflows) {
        if (lineActive(f, age, endAge)) {
          const g = Number(f.growthRate) || 0;
          inflow += annualBase(f.amount, f.cadence) * Math.pow(1 + g, age - currentAge);
        }
      }
    }

    // ---- Growth (with optional tax on gains) ----
    const rate = phase === 'Earning' ? pre.ret : post.ret;
    const taxRate = phase === 'Earning' ? pre.tax : post.tax;
    const grossGrowth = start * rate;
    const taxOnGrowth = applyTaxDrag ? grossGrowth * taxRate : 0;
    const netGrowth = grossGrowth - taxOnGrowth;

    // ---- Contributions (SIP with annual step-up, only while earning) ----
    let contribution = 0;
    if (phase === 'Earning') {
      if (earningYears > 0) sip = sip * (1 + stepUp);
      contribution = sip;
      earningYears++;
    }

    // ---- Illiquid asset liquidations / refinances landing this year ----
    let liquidation = 0;
    for (const a of sellable) {
      if (Number(a.liquidationAge) === age) {
        const g = Number(a.growth) || 0;
        const rel = a.releasePct == null ? 1 : Number(a.releasePct);
        liquidation += (Number(a.value) || 0) * rel * Math.pow(1 + g, age - currentAge);
      }
    }

    // ---- Year-end corpus ----
    const end =
      phase === 'Earning'
        ? start + netGrowth + contribution + liquidation
        : start + netGrowth - expense + inflow + liquidation;

    const netDraw = expense - inflow;
    const withdrawalRate = phase === 'Retired' && start > 0 ? netDraw / start : 0;
    const depleted = end < 0;
    if (depleted && depletionAge == null) depletionAge = age;
    if (phase === 'Retired' && expense > peakSpend) {
      peakSpend = expense;
      peakSpendAge = age;
    }

    rows.push({
      age,
      phase,
      start,
      grossGrowth,
      tax: taxOnGrowth,
      netGrowth,
      expense,
      inflow,
      netDraw,
      contribution,
      liquidation,
      end,
      // clamp the plotted corpus so a depleted run doesn't dive to huge negatives
      endClamped: Math.max(0, end),
      withdrawalRate,
      depleted,
    });

    corpus = end;
  }

  const survives = depletionAge == null;
  const endingCorpus = rows.length ? rows[rows.length - 1].end : startingCorpus(s);

  return { rows, survives, depletionAge, endingCorpus, peakSpendAge, pre, post };
}

/**
 * Solver 1 — earliest retirement age at which the plan still survives,
 * holding everything else constant. Returns null if it never survives in range.
 */
export function earliestSafeRetirementAge(s) {
  for (let ra = Number(s.currentAge); ra <= Number(s.endAge); ra++) {
    if (simulate({ ...s, retirementAge: ra }).survives) return ra;
  }
  return null;
}

/**
 * Solver 2 — maximum factor by which ALL recurring expenses can be scaled
 * and still survive (1.0 = exactly today's plan). Binary search.
 * Returns { factor, monthlyAtRetirement } where monthlyAtRetirement is the
 * first-year retirement spend (₹/month, inflated) under that factor.
 */
export function maxSafeExpenseFactor(s) {
  const survivesAt = (k) =>
    simulate({
      ...s,
      expenses: (s.expenses || []).map((e) => ({ ...e, amount: Number(e.amount) * k })),
    }).survives;

  // If even zero spend can't survive (e.g. inflows negative), bail.
  if (!survivesAt(0)) return { factor: 0, monthlyAtRetirement: 0 };

  let lo = 0;
  let hi = 1;
  // expand hi until it fails (cap at 50x)
  while (survivesAt(hi) && hi < 50) hi *= 2;
  if (survivesAt(hi)) hi = 50; // survives even at cap
  // binary search the boundary
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (survivesAt(mid)) lo = mid;
    else hi = mid;
  }
  const factor = lo;
  // first retirement-year monthly spend at this factor
  const scaled = simulate({
    ...s,
    expenses: (s.expenses || []).map((e) => ({ ...e, amount: Number(e.amount) * factor })),
  });
  const firstRetRow = scaled.rows.find((r) => r.phase === 'Retired');
  const monthlyAtRetirement = firstRetRow ? firstRetRow.expense / 12 : 0;
  return { factor, monthlyAtRetirement };
}
