# Early-Retirement (FIRE) Simulator

An interactive, client-side retirement simulator built for the early-retirement
case where post-retirement expenses stay high for a few years (kids in
school/college, EMIs) and then glide down. It models a year-by-year corpus
ledger with time-varying, line-item expenses instead of one flat number.

Everything runs **in the browser**. Your numbers never leave your machine — there
is no backend, no account, and no tracking.

> ⚠️ Sample figures are illustrative defaults for a generic Indian household.
> Replace them with your own. Projections are deterministic estimates, **not
> financial advice**.

---

## What it does

- **Line-item expense engine** — every expense is a row with a *start age*,
  *end age* and cadence (monthly / yearly / one-off), each inflating over time.
  Total spend automatically **glides down** as items end.
- **College spike, modelled** — children's school/college lines can carry a
  multi-year cost spike; if it lands inside retirement, the projection shows it.
- **User-defined inflows** — add any post-retirement income (spouse income, rent,
  coast/part-time, pension) with its own amount, start/end age and growth rate.
- **Portfolio & net worth** — list your holdings and mark each **liquid**
  (counts toward the corpus now) or **illiquid** (real estate, etc.). Illiquid
  assets grow at their own rate and can be **sold or refinanced** at a chosen
  age to top up the corpus.
- **Tax-aware drawdown** — toggle tax on investment gains. ON = accurate /
  conservative; OFF = the simpler gross-return model.
- **Live charts** — corpus over time, and spending-vs-income over time.
- **Solver** — finds your *earliest safe retirement age* and *maximum safe
  spending*.
- **Scenarios** — save setups, overlay them to compare, share via URL, export
  the full year-by-year projection to CSV, and back up / restore everything as a
  JSON file.

Two presets are built in:
- **Detailed** — full line items + tax drag ON.
- **Simple** — a single flat monthly spend with gross returns (the classic
  back-of-envelope model).

---

## Run locally

```bash
npm install
npm run dev      # open the printed http://localhost:5180
```

Build a production bundle:

```bash
npm run build    # outputs to dist/
npm run preview  # serve the production build locally
```

---

## Deploy to Vercel

**Option A — Git (recommended)**
1. Push this repo to GitHub/GitLab.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Vercel auto-detects **Vite** (build `vite build`, output `dist`). Click **Deploy**.

**Option B — Vercel CLI**
```bash
npm i -g vercel
vercel          # from this folder; accept the detected Vite settings
vercel --prod   # promote to production
```

No environment variables or backend are required.

---

## How the model works (one screen)

For each year of age:

- **While earning** (`age < retirement age`): the corpus grows at the blended
  *pre-retirement* return; your SIP is added and steps up each year. Living
  expenses are covered by salary, so they don't touch the corpus.
- **In retirement** (`retirement age ≤ age < plan-until age`): no SIP. The corpus
  grows at the blended *post-retirement* return, then the year's **expenses** (sum
  of all active line items, inflated) are withdrawn and any **inflows** are added.
  Any **illiquid asset** flagged to sell/refinance that year drops its (grown)
  proceeds into the corpus.
- **Tax drag** (when ON): investment *gains* each year are taxed at the
  allocation's blended tax rate, so growth is modelled post-tax.
- **"Plan until age N"** means the plan ends at N — the last spending year is
  **N − 1**.

The blended return/tax for each phase is the share-weighted average of the asset
mix you set under **Investment mix**.

---

## Project structure

```
src/
  lib/
    engine.js      core simulation + solvers (framework-free, unit-verifiable)
    defaults.js    sample scenario + portfolio (illustrative figures)
    format.js      ₹ Lakh/Crore formatting
    share.js       URL share-links, CSV export, JSON backup/restore
  components/
    ui.jsx         inputs, sliders, toggles, stat blocks
    ExpenseTable.jsx
    InflowTable.jsx
    AssetTable.jsx portfolio / net-worth editor
    Charts.jsx     corpus + spending charts (Recharts)
  App.jsx          orchestrates state, layout and actions
  main.jsx         React entry point
  styles.css
```

Stack: **React 18**, **Vite 5**, **Recharts**. No backend.

---

## License

[MIT](LICENSE).
