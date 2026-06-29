import React from 'react';
import { inr } from '../lib/format.js';

/** A single labelled bar: name (+ optional tag), ₹/mo, % of total, and a fill bar. */
function Bar({ label, tag, value, total }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="spend-row">
      <div className="spend-row-top">
        <span className="spend-name">
          {label}
          {tag && <span className="spend-tag">{tag}</span>}
        </span>
        <span className="spend-val">
          {inr(value / 12)}/mo <span className="muted small">· {pct.toFixed(0)}%</span>
        </span>
      </div>
      <div className="spend-bar"><div className="spend-bar-fill" style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

/**
 * "Where your money goes" — ranks year-1 retirement spend by category and by
 * line item so the biggest levers to cut are obvious.
 */
export default function SpendBreakdown({ breakdown }) {
  const { items, buckets, total } = breakdown;
  if (!total || total <= 0) {
    return <p className="muted">No recurring retirement spend to break down yet. Add expense lines above.</p>;
  }

  const TOP = 10;
  const top = items.slice(0, TOP);
  const restItems = items.slice(TOP);
  const restTotal = restItems.reduce((s, i) => s + i.annual, 0);

  const top3 = items.slice(0, 3).reduce((s, i) => s + i.annual, 0);
  const top3Pct = Math.round((top3 / total) * 100);
  const top3Names = items.slice(0, 3).map((i) => i.name).join(', ');

  return (
    <div className="spend">
      <p className="muted">
        Year-1 retirement spend is <strong>{inr(total / 12)}/mo</strong> (today's money). Your top 3 lines
        ({top3Names}) are <strong>{top3Pct}%</strong> of it — trimming the longest bars moves the needle most.
      </p>

      <div className="spend-cols">
        <div>
          <h4>By category</h4>
          <div className="spend-list">
            {buckets.map((b) => (
              <Bar key={b.bucket} label={b.bucket} value={b.annual} total={total} />
            ))}
          </div>
        </div>
        <div>
          <h4>Biggest line items</h4>
          <div className="spend-list">
            {top.map((i) => (
              <Bar key={i.id} label={i.name} tag={i.bucket} value={i.annual} total={total} />
            ))}
            {restTotal > 0 && (
              <Bar label={`Everything else (${restItems.length})`} value={restTotal} total={total} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
