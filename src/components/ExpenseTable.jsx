import React from 'react';
import { inr, currencySymbol } from '../lib/format.js';
import { EXPENSE_BUCKETS, newExpense } from '../lib/defaults.js';
import { Button, NumField } from './ui.jsx';

/** Annual amount in today's rupees for display (one-offs are not annual). */
function annualToday(e) {
  const a = Number(e.amount) || 0;
  return e.cadence === 'monthly' ? a * 12 : a;
}

export default function ExpenseTable({ expenses, currentAge, planEndAge, onChange }) {
  const update = (id, patch) =>
    onChange(expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id) => onChange(expenses.filter((e) => e.id !== id));
  const add = () => onChange([...expenses, newExpense(currentAge)]);

  // Separate the steady run-rate from one-offs so the total isn't muddied by
  // a future lump sum being treated as a yearly cost.
  const oneOffs = expenses.filter((e) => e.cadence === 'oneoff');
  const recurringAnnual = expenses
    .filter((e) => e.cadence !== 'oneoff')
    .reduce((s, e) => s + annualToday(e), 0);
  const oneOffTotal = oneOffs.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div>
      <div className="table-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Bucket</th>
              <th>Item</th>
              <th className="num">Amount ({currencySymbol()})</th>
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
                    <NumField
                      className="input sm num"
                      value={e.amount}
                      step={1000}
                      onChange={(v) => update(e.id, { amount: v })}
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
                    <NumField
                      className="input sm num xs"
                      value={e.startAge}
                      min={currentAge}
                      max={planEndAge}
                      onChange={(v) => update(e.id, { startAge: v })}
                    />
                  </td>
                  <td className="num">
                    {e.cadence === 'oneoff' ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className="endage">
                        <NumField
                          className="input sm num xs"
                          value={isLife ? '' : e.endAge}
                          placeholder="Life"
                          disabled={isLife}
                          min={currentAge}
                          max={planEndAge}
                          onChange={(v) => update(e.id, { endAge: v })}
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
                  <td className="num muted">
                    {e.cadence === 'oneoff'
                      ? `${inr(Number(e.amount) || 0)} once`
                      : inr(annualToday(e))}
                  </td>
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
              <td colSpan={6} className="num strong">Recurring / year (today's money)</td>
              <td className="num strong">{inr(recurringAnnual)}</td>
              <td></td>
            </tr>
            {oneOffs.length > 0 && (
              <tr>
                <td colSpan={6} className="num muted">
                  + {oneOffs.length} one-off {oneOffs.length > 1 ? 'items' : 'item'} (counted in their start year)
                </td>
                <td className="num muted">{inr(oneOffTotal)}</td>
                <td></td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      <div className="row-actions">
        <Button onClick={add} variant="ghost">+ Add expense</Button>
        <span className="muted small">
          Totals are in today's money. Each line only applies within its start–end age window, and the projection
          inflates it to the year spent. Expenses draw from the corpus only once you're retired.
        </span>
      </div>
    </div>
  );
}
