import React from 'react';
import { inr } from '../lib/format.js';
import { EXPENSE_BUCKETS, newExpense } from '../lib/defaults.js';
import { Button } from './ui.jsx';

/** Annual amount in today's rupees for display. */
function annualToday(e) {
  const a = Number(e.amount) || 0;
  return e.cadence === 'monthly' ? a * 12 : a;
}

export default function ExpenseTable({ expenses, currentAge, planEndAge, onChange }) {
  const update = (id, patch) =>
    onChange(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id) => onChange(expenses.filter((e) => e.id !== id));
  const add = () => onChange([...expenses, newExpense()]);

  const totalAnnual = expenses.reduce((s, e) => s + annualToday(e), 0);

  return (
    <div>
      <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Item</th>
              <th className="num">Amount (₹)</th>
              <th>Cadence</th>
              <th className="num">Start age</th>
              <th className="num">End age</th>
              <th className="num">Annual (today)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((e) => {
              const isLife = e.endAge === 'life' || e.endAge == null;
              return (
                <tr key={e.id}>
                  <td>
                    <select
                      className="input sm"
                      value={e.bucket}
                      onChange={(ev) => update(e.id, { bucket: ev.target.value })}
                    >
                      {EXPENSE_BUCKETS.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      className="input sm wide"
                      value={e.name}
                      onChange={(ev) => update(e.id, { name: ev.target.value })}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="input sm num"
                      type="number"
                      value={e.amount}
                      step={1000}
                      onChange={(ev) => update(e.id, { amount: Number(ev.target.value) })}
                    />
                  </td>
                  <td>
                    <select
                      className="input sm"
                      value={e.cadence}
                      onChange={(ev) => update(e.id, { cadence: ev.target.value })}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                      <option value="oneoff">One-off</option>
                    </select>
                  </td>
                  <td className="num">
                    <input
                      className="input sm num xs"
                      type="number"
                      value={e.startAge}
                      min={currentAge}
                      max={planEndAge}
                      onChange={(ev) => update(e.id, { startAge: Number(ev.target.value) })}
                    />
                  </td>
                  <td className="num">
                    {e.cadence === 'oneoff' ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className="endage">
                        <input
                          className="input sm num xs"
                          type="number"
                          value={isLife ? '' : e.endAge}
                          placeholder="Life"
                          disabled={isLife}
                          min={currentAge}
                          max={planEndAge}
                          onChange={(ev) => update(e.id, { endAge: Number(ev.target.value) })}
                        />
                        <label className="life-toggle" title="Lasts for life">
                          <input
                            type="checkbox"
                            checked={isLife}
                            onChange={(ev) =>
                              update(e.id, { endAge: ev.target.checked ? 'life' : planEndAge - 1 })
                            }
                          />
                          life
                        </label>
                      </span>
                    )}
                  </td>
                  <td className="num muted">{inr(annualToday(e))}</td>
                  <td>
                    <button className="icon-btn" title="Remove" onClick={() => remove(e.id)}>
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={6} className="num strong">Total recurring (today's rupees)</td>
              <td className="num strong">{inr(totalAnnual)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="row-actions">
        <Button onClick={add} variant="ghost">+ Add expense</Button>
        <span className="muted small">
          Expenses only draw from the corpus once you're retired. One-off lines hit only in their start year.
        </span>
      </div>
    </div>
  );
}
