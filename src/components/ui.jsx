import React from 'react';
import { inr, pct, groupNumber } from '../lib/format.js';

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

/** Character index just after the Nth digit in a string (for caret restore). */
function caretAfterDigit(str, n) {
  if (n <= 0) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      if (++count === n) return i + 1;
    }
  }
  return str.length;
}

/**
 * Integer input with live thousands separators. A number input can't show
 * commas, so this is a text input that groups the value as you type
 * (e.g. 2,50,000) following the active notation. The caret is tracked by digit
 * position and restored after each reformat so inserted commas don't jump it.
 * Keeps a draft so the field can go empty without snapping back to a stuck 0;
 * emits a number (or `emptyValue` when blank) to the model.
 */
export function NumField({ value, onChange, className = 'input', placeholder, disabled, emptyValue = 0 }) {
  const ref = React.useRef(null);
  const caretDigits = React.useRef(null); // # of digits before the caret, set on change
  const [draft, setDraft] = React.useState(null); // digit string while focused; null at rest
  const editing = draft != null;
  const shown = editing
    ? (draft === '' ? '' : groupNumber(draft))
    : value === '' || value == null ? '' : groupNumber(value);

  React.useLayoutEffect(() => {
    if (caretDigits.current == null || !ref.current) return;
    const pos = caretAfterDigit(shown, caretDigits.current);
    ref.current.setSelectionRange(pos, pos);
    caretDigits.current = null;
  });

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      className={className}
      value={shown}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setDraft(value === '' || value == null ? '' : String(value))}
      onChange={(e) => {
        const el = e.target;
        const caret = el.selectionStart ?? el.value.length;
        caretDigits.current = el.value.slice(0, caret).replace(/\D/g, '').length;
        const cleaned = el.value.replace(/\D/g, '');
        setDraft(cleaned);
        onChange(cleaned === '' ? emptyValue : Number(cleaned));
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
