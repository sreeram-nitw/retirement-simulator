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

/**
 * Numeric input that lets the field go empty while editing instead of snapping
 * back to 0 (which used to leave a stuck leading zero). Keeps a local text draft
 * while focused; emits a number (or `emptyValue` when blank) to the model.
 */
export function NumField({ value, onChange, className = 'input', step, min, max, placeholder, disabled, emptyValue = 0 }) {
  const [draft, setDraft] = React.useState(null);
  const shown = draft != null ? draft : (value ?? '');
  return (
    <input
      type="number"
      className={className}
      value={shown}
      step={step}
      min={min}
      max={max}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        onChange(v === '' ? emptyValue : Number(v));
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/** Percent field — stores a fraction (0.08) but displays/edits as percent. Same draft behaviour. */
export function PctField({ value, onChange, className = 'input', step = 0.5, min }) {
  const [draft, setDraft] = React.useState(null);
  const shown = draft != null ? draft : (value == null ? '' : +(value * 100).toFixed(4));
  return (
    <input
      type="number"
      className={className}
      value={shown}
      step={step}
      min={min}
      onChange={(e) => {
        const v = e.target.value;
        setDraft(v);
        onChange(v === '' ? 0 : Number(v) / 100);
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

/** Plain numeric input. */
export function NumberInput({ value, onChange, step = 1, min, max }) {
  return <NumField value={value} onChange={onChange} step={step} min={min} max={max} emptyValue="" />;
}

/** Rupee input — raw number, with a compact ₹ hint underneath. */
export function RupeeInput({ value, onChange, step = 1000 }) {
  return (
    <div className="rupee">
      <NumField value={value} onChange={onChange} step={step} />
      <span className="rupee-hint">{inr(Number(value) || 0)}</span>
    </div>
  );
}

/** Percent input — stores a fraction (0.08) but displays/edits as percent. */
export function PercentInput({ value, onChange, step = 0.5 }) {
  return (
    <div className="pctwrap">
      <PctField value={value} onChange={onChange} step={step} />
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
