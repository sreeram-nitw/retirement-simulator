import React from 'react';
import { inr } from '../lib/format.js';
import { newAsset, samplePortfolio } from '../lib/defaults.js';
import { Button } from './ui.jsx';

/**
 * Portfolio / net-worth editor.
 * Liquid assets sum into the starting corpus (grow via the investment mix).
 * Illiquid assets grow at their own rate and can be sold/refinanced at a chosen
 * age, dropping a share of their grown value back into the corpus.
 */
export default function AssetTable({ assets, currentAge, planEndAge, onChange }) {
  const update = (id, patch) =>
    onChange(assets.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id) => onChange(assets.filter((a) => a.id !== id));
  const add = () => onChange([...assets, newAsset()]);
  const loadSample = () => onChange(samplePortfolio());

  const liquidTotal = assets.filter((a) => a.liquid).reduce((s, a) => s + (Number(a.value) || 0), 0);
  const illiquidTotal = assets.filter((a) => !a.liquid).reduce((s, a) => s + (Number(a.value) || 0), 0);
  const netWorth = liquidTotal + illiquidTotal;

  return (
    <div>
      {assets.length === 0 ? (
        <p className="muted">
          No portfolio yet. Add your holdings, or load the sample. Mark each as
          <strong> liquid</strong> (counts toward your retirement corpus now) or
          <strong> illiquid</strong> (real estate, etc.). Illiquid assets grow at their own rate
          and can be flagged to sell or refinance at a future age — the proceeds then top up the corpus.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="grid">
            <thead>
              <tr>
                <th>Asset</th>
                <th className="num">Value (₹)</th>
                <th className="num">Liquid?</th>
                <th className="num">Growth/yr</th>
                <th className="num">Sell / refi?</th>
                <th className="num">At age</th>
                <th className="num">Release %</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const illiquid = !a.liquid;
                const willSell = illiquid && a.liquidate;
                return (
                  <tr key={a.id}>
                    <td>
                      <input
                        className="input sm wide"
                        value={a.name}
                        onChange={(e) => update(a.id, { name: e.target.value })}
                      />
                    </td>
                    <td className="num">
                      <input
                        className="input sm num"
                        type="number"
                        value={a.value}
                        step={100000}
                        onChange={(e) => update(a.id, { value: Number(e.target.value) })}
                      />
                    </td>
                    <td className="num">
                      <input
                        type="checkbox"
                        checked={!!a.liquid}
                        title="Liquid = part of the corpus now"
                        onChange={(e) => update(a.id, { liquid: e.target.checked })}
                      />
                    </td>
                    <td className="num">
                      {illiquid ? (
                        <span className="pctcell">
                          <input
                            className="input sm num xs"
                            type="number"
                            step={0.5}
                            value={+(((a.growth) || 0) * 100).toFixed(2)}
                            onChange={(e) => update(a.id, { growth: Number(e.target.value) / 100 })}
                          />
                          %
                        </span>
                      ) : (
                        <span className="muted small">via mix</span>
                      )}
                    </td>
                    <td className="num">
                      {illiquid ? (
                        <input
                          type="checkbox"
                          checked={!!a.liquidate}
                          title="Available to sell or refinance later"
                          onChange={(e) => update(a.id, { liquidate: e.target.checked })}
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      {willSell ? (
                        <input
                          className="input sm num xs"
                          type="number"
                          value={a.liquidationAge}
                          min={currentAge}
                          max={planEndAge - 1}
                          onChange={(e) => update(a.id, { liquidationAge: Number(e.target.value) })}
                        />
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      {willSell ? (
                        <span className="pctcell">
                          <input
                            className="input sm num xs"
                            type="number"
                            step={5}
                            value={+(((a.releasePct == null ? 1 : a.releasePct)) * 100).toFixed(0)}
                            onChange={(e) =>
                              update(a.id, { releasePct: Math.max(0, Number(e.target.value)) / 100 })
                            }
                          />
                          %
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td>
                      <button className="icon-btn" title="Remove" onClick={() => remove(a.id)}>
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td className="strong">Net worth</td>
                <td className="num strong">{inr(netWorth)}</td>
                <td colSpan={6} className="muted small">
                  Liquid corpus {inr(liquidTotal)} · Illiquid {inr(illiquidTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <div className="row-actions">
        <Button onClick={add} variant="ghost">+ Add asset</Button>
        {assets.length === 0 && (
          <Button onClick={loadSample} variant="ghost">Load sample portfolio</Button>
        )}
      </div>
    </div>
  );
}
