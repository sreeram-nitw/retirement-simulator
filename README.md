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
- **Scenarios** — save setups, overlay them to compare, **share via a short
  link** (`/s/:id`), export the full year-by-year projection to CSV, and back up
  / restore everything as a JSON file.

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

No environment variables are required for the core app.

---

## Short links (optional)

The **Share link** button works with zero setup: it falls back to a long,
self-contained URL that carries the whole scenario in its hash. To get short
`/s/:id` links instead, connect a Redis store — the scenario is saved there and
the link just references its id.

1. In the Vercel dashboard → **Storage → Create Database → Upstash for Redis**
   (free tier is plenty) and **connect it to this project**.
2. Vercel injects the credentials as environment variables. The serverless
   functions read either naming scheme:
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN`, or
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
3. Redeploy. The **Share link** button now returns `/s/:id` links.

Shared scenarios are stored for one year. Until a store is connected, sharing
still works via the long hash link. The two functions live in [`api/`](api/).

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
    share.js       URL/short links, CSV export, JSON backup/restore
  components/
    ui.jsx         inputs, sliders, toggles, stat blocks
    ExpenseTable.jsx
    InflowTable.jsx
    AssetTable.jsx portfolio / net-worth editor
    Charts.jsx     corpus + spending charts (Recharts)
  App.jsx          orchestrates state, layout and actions
  main.jsx         React entry point
  styles.css
api/
  save.js          POST a scenario, get a short id (Redis-backed)
  get.js           GET a scenario by short id
```

Stack: **React 18**, **Vite 5**, **Recharts**. No backend.

---

## License

[MIT](LICENSE).
