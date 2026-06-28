import React from 'react';
import { inr, pct } from '../lib/format.js';

/** Card section with a header. */
export function Section({ title, subtitle, right, children }) {
  return (
    <section className="card">
      {(title || right) && (
        <header className="card-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {right && <div className="card-head-right">{right}</div>}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

/** KPI stat block. tone: 'good' | 'bad' | 'warn' | undefined */
export function Stat({ label, value, sub, tone }) {
  return (
    <div className={`stat ${tone || ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

/** Labelled field wrapper. */
export function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

/** Plain numeric input. */
export function NumberInput({ value, onChange, step = 1, min, max }) {
  return (
    <input
      type="number"
      className="input"
      value={value}
      step={step}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
    />
  );
}

/** Rupee input — raw number, with a compact ₹ hint underneath. */
export function RupeeInput({ value, onChange, step = 1000 }) {
  return (
    <div className="rupee">
      <input
        type="number"
        className="input"
        value={value}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
      <span className="rupee-hint">{inr(Number(value) || 0)}</span>
    </div>
  );
}

/** Percent input — stores a fraction (0.08) but displays/edits as percent. */
export function PercentInput({ value, onChange, step = 0.5 }) {
  const shown = value == null ? '' : +(value * 100).toFixed(4);
  return (
    <div className="pctwrap">
      <input
        type="number"
        className="input"
        value={shown}
        step={step}
        onChange={(e) =>
          onChange(e.target.value === '' ? 0 : Number(e.target.value) / 100)
        }
      />
      <span className="pct-suffix">%</span>
    </div>
  );
}

/** Slider with a live value label. */
export function Slider({ value, onChange, min, max, step = 1, format }) {
  return (
    <div className="sliderwrap">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="slider-val">{format ? format(value) : value}</span>
    </div>
  );
}

/** Toggle switch. */
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track"><span className="toggle-thumb" /></span>
      <span className="toggle-label">{label}</span>
    </label>
  );
}

export function Button({ children, onClick, variant = 'default', title, disabled }) {
  return (
    <button className={`btn btn-${variant}`} onClick={onClick} title={title} disabled={disabled}>
      {children}
    </button>
  );
}

export { inr, pct };
