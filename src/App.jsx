import React, { useEffect, useMemo, useRef, useState } from 'react';
import { simulate, blend, earliestSafeRetirementAge, maxSafeExpenseFactor, liquidAssetTotal } from './lib/engine.js';
import { defaultScenario, simpleScenario } from './lib/defaults.js';
import { inr, inrFull, pct } from './lib/format.js';
import { shareUrl, scenarioFromHash, rowsToCsv, downloadFile, exportData, parseImport, encodeScenario, createShortLink, shortIdFromPath, fetchScenarioById } from './lib/share.js';
import { Section, Stat, Field, RupeeInput, PercentInput, Slider, Toggle, Button } from './components/ui.jsx';
import ExpenseTable from './components/ExpenseTable.jsx';
import InflowTable from './components/InflowTable.jsx';
import AssetTable from './components/AssetTable.jsx';
import { CorpusChart, ExpenseChart } from './components/Charts.jsx';

const SAVE_KEY = 'retsim:saved:v1';

/* ----------------------------- Allocation editor ----------------------------- */
function AllocationTable({ rows, onChange }) {
  const update = (i, patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const b = blend(rows);
  const shareSum = rows.reduce((s, r) => s + (Number(r.share) || 0), 0);
  return (
    <div className="alloc">
      <table className="grid tight">
        <thead>
          <tr><th>Asset</th><th className="num">Return</th><th className="num">Tax</th><th className="num">Share</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td className="num"><PctCell value={r.ret} onChange={(v) => update(i, { ret: v })} /></td>
              <td className="num"><PctCell value={r.tax} onChange={(v) => update(i, { tax: v })} /></td>
              <td className="num"><PctCell value={r.share} onChange={(v) => update(i, { share: v })} /></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="strong">Blended</td>
            <td className="num strong">{pct(b.ret, 1)}</td>
            <td className="num strong">{pct(b.tax, 1)}</td>
            <td className={`num ${Math.abs(shareSum - 1) > 0.001 ? 'warn-text' : 'muted'}`}>
              {pct(shareSum, 0)}
            </td>
          </tr>
        </tfoot>
      </table>
      {Math.abs(shareSum - 1) > 0.001 && (
        <p className="warn-text small">Shares don't add to 100% — they'll be normalised automatically.</p>
      )}
    </div>
  );
}

function PctCell({ value, onChange }) {
  return (
    <span className="pctcell">
      <input
        className="input sm num xs"
        type="number"
        step={0.5}
        value={+(((value) || 0) * 100).toFixed(2)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />%
    </span>
  );
}

/* --------------------------------- App --------------------------------- */
export default function App() {
  const [scenario, setScenario] = useState(() => scenarioFromHash() || defaultScenario());
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || []; } catch { return []; }
  });
  const [compareOn, setCompareOn] = useState([]);
  const [solver, setSolver] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef(null);

  const set = (field, value) => setScenario((s) => ({ ...s, [field]: value }));

  const result = useMemo(() => simulate(scenario), [scenario]);

  const compare = useMemo(
    () =>
      saved
        .filter((s) => compareOn.includes(s.name))
        .map((s) => ({ name: s.name, result: simulate(s.scenario) })),
    [saved, compareOn]
  );

  useEffect(() => {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(saved)); } catch {}
  }, [saved]);

  // If opened via a short link (/s/:id), load that shared scenario from the backend.
  useEffect(() => {
    const id = shortIdFromPath();
    if (!id) return;
    let cancelled = false;
    fetchScenarioById(id).then((sc) => {
      if (!cancelled && sc) { setScenario(sc); setSolver(null); }
    });
    return () => { cancelled = true; };
  }, []);

  const firstRet = result.rows.find((r) => r.phase === 'Retired');
  const peakRow = result.rows.find((r) => r.age === result.peakSpendAge);
  const lastSpendAge = scenario.endAge - 1;

  // Portfolio: when liquid assets exist they drive the corpus (currentSavings becomes derived).
  const liquidSum = liquidAssetTotal(scenario);
  const usingPortfolio = liquidSum != null;

  /* actions */
  const applyPreset = (fn) => { setScenario(fn()); setSolver(null); };
  const saveCurrent = () => {
    const name = prompt('Name this scenario:', scenario.name || 'My scenario');
    if (!name) return;
    const entry = { name, scenario: { ...scenario, name } };
    setSaved((prev) => [...prev.filter((p) => p.name !== name), entry]);
  };
  const deleteSaved = (name) => {
    setSaved((prev) => prev.filter((p) => p.name !== name));
    setCompareOn((prev) => prev.filter((n) => n !== name));
  };
  const loadSaved = (s) => { setScenario(s.scenario); setSolver(null); };
  const toggleCompare = (name) =>
    setCompareOn((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]));
  const doShare = async () => {
    // Prefer a short backend link; fall back to a long self-contained hash link.
    let url;
    try { url = await createShortLink(scenario); }
    catch { url = shareUrl(scenario); }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { window.location.hash = `s=${encodeScenario(scenario)}`; }
  };
  const exportCsv = () => downloadFile('retirement-projection.csv', rowsToCsv(result.rows));
  const exportAll = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`retirement-backup-${stamp}.json`, exportData(scenario, saved), 'application/json');
  };
  const onImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // let the same file be re-selected later
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { current, saved: incoming } = parseImport(String(reader.result));
        if (incoming.length) {
          setSaved((prev) => {
            const names = new Set(incoming.map((x) => x.name));
            return [...prev.filter((p) => !names.has(p.name)), ...incoming];
          });
        }
        if (current) { setScenario(current); setSolver(null); }
        const parts = [];
        if (current) parts.push('current scenario');
        if (incoming.length) parts.push(`${incoming.length} saved scenario${incoming.length > 1 ? 's' : ''}`);
        alert(`Imported ${parts.join(' and ')}.`);
      } catch (err) {
        alert(err?.message || 'Could not import that file.');
      }
    };
    reader.onerror = () => alert('Could not read that file.');
    reader.readAsText(file);
  };
  const runSolver = () =>
    setSolver({
      earliest: earliestSafeRetirementAge(scenario),
      maxSpend: maxSafeExpenseFactor(scenario),
    });

  return (
    <div className="app">
      {/* ---------------- Top bar ---------------- */}
      <header className="topbar">
        <div className="brand">
          <span className="logo">▦</span>
          <div>
            <h1>Early-Retirement Simulator</h1>
            <p className="muted small">{scenario.name}</p>
          </div>
        </div>
        <div className="topbar-actions">
          <Button variant="primary" onClick={doShare}>{copied ? '✓ Link copied' : 'Share link'}</Button>
          <Button variant="default" onClick={saveCurrent}>Save</Button>
          <Menu label="More">
            <div className="menu-label">Examples</div>
            <MenuItem onClick={() => applyPreset(defaultScenario)}>Detailed example</MenuItem>
            <MenuItem onClick={() => applyPreset(simpleScenario)}>Simple example</MenuItem>
            <div className="menu-sep" />
            <div className="menu-label">Data</div>
            <MenuItem onClick={exportCsv}>Export projection (CSV)</MenuItem>
            <MenuItem onClick={exportAll}>Export backup (JSON)</MenuItem>
            <MenuItem onClick={() => fileInputRef.current?.click()}>Import backup (JSON)</MenuItem>
          </Menu>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={onImportFile}
          />
        </div>
      </header>

      {/* ---------------- Verdict ---------------- */}
      <div className={`verdict ${result.survives ? 'ok' : 'bad'}`}>
        <div className="verdict-main">
          {result.survives ? (
            <>✅ <strong>On track.</strong> Your corpus lasts through age {lastSpendAge}.</>
          ) : (
            <>⚠️ <strong>Shortfall.</strong> You run out of money at age {result.depletionAge}.</>
          )}
        </div>
        <div className="stats">
          <Stat
            label={result.survives ? 'Corpus left at end' : 'Corpus at depletion'}
            value={result.survives ? inr(result.endingCorpus) : `₹0 @ ${result.depletionAge}`}
            tone={result.survives ? 'good' : 'bad'}
          />
          <Stat label="First-year spend (retd.)" value={firstRet ? `${inr(firstRet.expense / 12)}/mo` : '—'}
            sub={firstRet ? `${inr(firstRet.expense)}/yr` : ''} />
          <Stat label="Peak annual spend" value={peakRow ? inr(peakRow.expense) : '—'}
            sub={peakRow ? `at age ${peakRow.age}` : ''} tone="warn" />
          <Stat label="First-year withdrawal" value={firstRet ? pct(firstRet.withdrawalRate, 2) : '—'}
            sub="of corpus" />
        </div>
      </div>

      {/* ---------------- Controls + charts ---------------- */}
      <div className="grid-2">
        <Section title="Assumptions" subtitle="Drag, type, watch the projection update instantly.">
          <div className="fields">
            <Field label="Current age"><NumberBox value={scenario.currentAge} onChange={(v) => set('currentAge', v)} /></Field>
            <Field label={`Retirement age — ${scenario.retirementAge}`}>
              <Slider value={scenario.retirementAge} min={scenario.currentAge} max={scenario.endAge - 1}
                onChange={(v) => set('retirementAge', v)} />
            </Field>
            <Field label="Plan until age" hint={`Last spending year is age ${lastSpendAge}`}>
              <NumberBox value={scenario.endAge} onChange={(v) => set('endAge', v)} />
            </Field>
            <Field label="Current savings (corpus)" hint={usingPortfolio ? 'From portfolio liquid assets below' : undefined}>
              {usingPortfolio
                ? <div className="derived-value">{inr(liquidSum)} <span className="muted small">from portfolio</span></div>
                : <RupeeInput value={scenario.currentSavings} onChange={(v) => set('currentSavings', v)} step={500000} />}
            </Field>
            <Field label="Monthly investment (SIP)"><RupeeInput value={scenario.monthlyInvestment} onChange={(v) => set('monthlyInvestment', v)} step={5000} /></Field>
            <Field label="Annual SIP step-up"><PercentInput value={scenario.savingsStepUp} onChange={(v) => set('savingsStepUp', v)} /></Field>
            <Field label="Inflation"><PercentInput value={scenario.inflation} onChange={(v) => set('inflation', v)} /></Field>
            <Field label="Tax on investment gains" hint="Off = gross returns (simpler classic model)">
              <Toggle checked={scenario.applyTaxDrag} onChange={(v) => set('applyTaxDrag', v)}
                label={scenario.applyTaxDrag ? 'Tax drag ON (accurate)' : 'Tax drag OFF (gross)'} />
            </Field>
          </div>

          <button className="link-btn" onClick={() => setShowAdvanced((v) => !v)}>
            {showAdvanced ? '▾' : '▸'} Investment mix (pre / post retirement)
          </button>
          {showAdvanced && (
            <div className="alloc-grid">
              <div>
                <h4>While earning</h4>
                <AllocationTable rows={scenario.preRetAllocation} onChange={(r) => set('preRetAllocation', r)} />
              </div>
              <div>
                <h4>In retirement</h4>
                <AllocationTable rows={scenario.postRetAllocation} onChange={(r) => set('postRetAllocation', r)} />
              </div>
            </div>
          )}
        </Section>

        <div className="charts-col">
          <Section title="Corpus over time">
            <CorpusChart result={result} compare={compare} currentAge={scenario.currentAge}
              retirementAge={scenario.retirementAge} />
          </Section>
          <Section title="Spending vs income in retirement" subtitle="Watch the college spike, then the glide-down.">
            <ExpenseChart result={result} retirementAge={scenario.retirementAge} />
          </Section>
        </div>
      </div>

      {/* ---------------- Portfolio / net worth ---------------- */}
      <Section title="Portfolio & net worth"
        subtitle="List your holdings. Liquid assets set your starting corpus; illiquid ones (real estate) can be sold or refinanced later to top it up.">
        <AssetTable assets={scenario.assets || []} currentAge={scenario.currentAge}
          planEndAge={scenario.endAge} onChange={(a) => set('assets', a)} />
      </Section>

      {/* ---------------- Solver ---------------- */}
      <Section title="Solver" subtitle="Let the simulator find your safe limits."
        right={<Button variant="primary" onClick={runSolver}>Run solver</Button>}>
        {solver ? (
          <div className="stats">
            <Stat label="Earliest safe retirement age"
              value={solver.earliest != null ? solver.earliest : 'Not within plan'}
              tone={solver.earliest != null && solver.earliest <= scenario.retirementAge ? 'good' : 'warn'}
              sub={solver.earliest != null ? `vs. your ${scenario.retirementAge}` : 'even working to the end falls short'} />
            <Stat label="Max safe spending"
              value={`${Math.round(solver.maxSpend.factor * 100)}% of plan`}
              tone={solver.maxSpend.factor >= 1 ? 'good' : 'bad'}
              sub={`≈ ${inr(solver.maxSpend.monthlyAtRetirement)}/mo in year 1`} />
            <Stat label="Headroom"
              value={solver.maxSpend.factor >= 1 ? `+${Math.round((solver.maxSpend.factor - 1) * 100)}%` : `−${Math.round((1 - solver.maxSpend.factor) * 100)}%`}
              tone={solver.maxSpend.factor >= 1 ? 'good' : 'bad'}
              sub="vs. current spending" />
          </div>
        ) : (
          <p className="muted">Find the earliest age you can safely retire, and how much you can safely spend, holding everything else fixed.</p>
        )}
      </Section>

      {/* ---------------- Expense engine ---------------- */}
      <Section title="Expense line items"
        subtitle="Each line glides in and out by age — the kids' college lines are the early-retirement spike.">
        <ExpenseTable expenses={scenario.expenses} currentAge={scenario.currentAge}
          planEndAge={scenario.endAge} onChange={(e) => set('expenses', e)} />
      </Section>

      {/* ---------------- Inflows ---------------- */}
      <Section title="Post-retirement income (inflows)"
        subtitle="Spouse income, rent, coast/part-time, pension — each with its own growth rate.">
        <InflowTable inflows={scenario.inflows} currentAge={scenario.currentAge}
          planEndAge={scenario.endAge} onChange={(f) => set('inflows', f)} />
      </Section>

      {/* ---------------- Saved scenarios ---------------- */}
      <Section title="Saved scenarios & compare"
        subtitle="Save the current setup, then tick scenarios to overlay them on the corpus chart.">
        {saved.length === 0 ? (
          <p className="muted">No saved scenarios yet. Tune the inputs and hit “Save scenario”.</p>
        ) : (
          <table className="grid">
            <thead><tr><th>Compare</th><th>Name</th><th className="num">Verdict</th><th></th></tr></thead>
            <tbody>
              {saved.map((s) => {
                const r = simulate(s.scenario);
                return (
                  <tr key={s.name}>
                    <td><input type="checkbox" checked={compareOn.includes(s.name)} onChange={() => toggleCompare(s.name)} /></td>
                    <td>{s.name}</td>
                    <td className="num">{r.survives ? <span className="good-text">lasts to {s.scenario.endAge - 1}</span> : <span className="bad-text">out at {r.depletionAge}</span>}</td>
                    <td className="rowbtns">
                      <button className="link-btn" onClick={() => loadSaved(s)}>Load</button>
                      <button className="link-btn danger" onClick={() => deleteSaved(s.name)}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Section>

      {/* ---------------- Year-by-year ---------------- */}
      <Section title="Year-by-year ledger"
        right={<Button variant="ghost" onClick={() => setShowTable((v) => !v)}>{showTable ? 'Hide' : 'Show'}</Button>}>
        {showTable && (
          <div className="table-scroll">
            <table className="grid tight">
              <thead>
                <tr>
                  <th className="num">Age</th><th>Phase</th><th className="num">Start</th>
                  <th className="num">Net growth</th><th className="num">Expense</th>
                  <th className="num">Inflow</th><th className="num">End</th><th className="num">WR%</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((r) => (
                  <tr key={r.age} className={r.depleted ? 'depleted' : ''}>
                    <td className="num">{r.age}</td>
                    <td>{r.phase}</td>
                    <td className="num">{inr(r.start)}</td>
                    <td className="num">{inr(r.netGrowth)}</td>
                    <td className="num">{r.expense ? inr(r.expense) : '—'}</td>
                    <td className="num">{r.inflow ? inr(r.inflow) : '—'}</td>
                    <td className="num">{inr(r.end)}</td>
                    <td className="num">{r.phase === 'Retired' ? (r.withdrawalRate * 100).toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <footer className="foot">
        <p className="muted small">
          Projections are deterministic estimates based on your inputs — not financial advice.
          All sample figures are illustrative. Your numbers stay in your browser, except when you
          create a share link — that scenario is saved so the recipient can open it.
        </p>
      </footer>
    </div>
  );
}

/* dropdown menu for secondary topbar actions */
function Menu({ label, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div className="menu" ref={ref}>
      <Button variant="default" onClick={() => setOpen((o) => !o)}>{label} ▾</Button>
      {open && (
        <div className="menu-pop" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
function MenuItem({ onClick, children }) {
  return <button className="menu-item" role="menuitem" onClick={onClick}>{children}</button>;
}

/* small inline numeric box */
function NumberBox({ value, onChange }) {
  return (
    <input className="input" type="number" value={value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))} />
  );
}
