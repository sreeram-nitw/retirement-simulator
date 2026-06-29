import React from 'react';
import { inr, pct, currencySymbol } from '../lib/format.js';
import { newInflow } from '../lib/defaults.js';
import { Button, NumField, PctField } from './ui.jsx';

/** Editor for user-defined post-retirement inflows (spouse income, rent, coast, pension...). */
export default function InflowTable({ inflows, currentAge, retirementAge, planEndAge, currency, onChange }) {
  const update = (id, patch) =>
    onChange(inflows.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  const remove = (id) => onChange(inflows.filter((f) => f.id !== id));
  const add = () => onChange([...inflows, newInflow(retirementAge, currency)]);

  return (
    <div>
      {inflows.length === 0 ? (
        <p className="muted">
          No post-retirement income yet. Add a row to model spouse income, rental/passive
          income, part-time/consulting (coast), a pension or an annuity — each with its own
          start/end age and growth rate. Inflows are treated as net (post-tax).
        </p>
      ) : (
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>Source</th>
                <th className="num">Amount ({currencySymbol()})</th>
                <th>Cadence</th>
                <th className="num">Start age</th>
                <th className="num">End age</th>
                <th className="num">Growth</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inflows.map((f) => {
                const isLife = f.endAge === 'life' || f.endAge == null;
                return (
                  <tr key={f.id}>
                    <td>
                      <input
                        className="input sm wide"
                        value={f.name}
                        onChange={(ev) => update(f.id, { name: ev.target.value })}
                      />
                    </td>
                    <td className="num">
                      <NumField
                        className="input sm num"
                        value={f.amount}
                        step={1000}
                        onChange={(v) => update(f.id, { amount: v })}
                      />
                    </td>
                    <td>
                      <select
                        className="input sm"
                        value={f.cadence}
                        onChange={(ev) => update(f.id, { cadence: ev.target.value })}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </td>
                    <td className="num">
                      <NumField
                        className="input sm num xs"
                        value={f.startAge}
                        min={currentAge}
                        max={planEndAge}
                        onChange={(v) => update(f.id, { startAge: v })}
                      />
                    </td>
                    <td className="num">
                      <span className="endage">
                        <NumField
                          className="input sm num xs"
                          value={isLife ? '' : f.endAge}
                          placeholder="Life"
                          disabled={isLife}
                          onChange={(v) => update(f.id, { endAge: v })}
                        />
                        <label className="life-toggle">
                          <input
                            type="checkbox"
                            checked={isLife}
                            onChange={(ev) =>
                              update(f.id, { endAge: ev.target.checked ? 'life' : planEndAge - 1 })
                            }
                          />
                          life
                        </label>
                      </span>
                    </td>
                    <td className="num">
                      <span className="pctcell">
                        <PctField
                          className="input sm num xs"
                          value={f.growthRate}
                          step={0.5}
                          onChange={(v) => update(f.id, { growthRate: v })}
                        />
                        %
                      </span>
                    </td>
                    <td>
                      <button className="icon-btn" title="Remove" onClick={() => remove(f.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="row-actions">
        <Button onClick={add} variant="ghost">+ Add inflow</Button>
      </div>
    </div>
  );
}
