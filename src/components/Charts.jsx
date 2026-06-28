import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { inr } from '../lib/format.js';

const COMPARE_COLORS = ['#f59e0b', '#ec4899', '#8b5cf6', '#10b981', '#ef4444'];

function TooltipBox({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="tip">
      <div className="tip-age">Age {label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="tip-row">
          <span className="tip-dot" style={{ background: p.color }} />
          <span className="tip-name">{p.name}</span>
          <span className="tip-val">{inr(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/** Corpus-over-time, with optional compared scenarios overlaid. */
export function CorpusChart({ result, compare = [], currentAge, retirementAge }) {
  const ages = result.rows.map((r) => r.age);
  const data = ages.map((age, i) => {
    const row = { age, Current: Math.round(result.rows[i].endClamped) };
    compare.forEach((c) => {
      const cr = c.result.rows.find((x) => x.age === age);
      row[c.name] = cr ? Math.round(cr.endClamped) : null;
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="corpusFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="age" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tickFormatter={inr} width={70} tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <Tooltip content={<TooltipBox />} />
        <Legend />
        <ReferenceLine
          x={retirementAge}
          stroke="#0ea5e9"
          strokeDasharray="4 3"
          label={{ value: 'Retire', position: 'top', fontSize: 11, fill: '#0ea5e9' }}
        />
        {result.depletionAge && (
          <ReferenceLine
            x={result.depletionAge}
            stroke="#ef4444"
            strokeDasharray="4 3"
            label={{ value: 'Runs out', position: 'top', fontSize: 11, fill: '#ef4444' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="Current"
          stroke="#4f46e5"
          strokeWidth={2.5}
          fill="url(#corpusFill)"
        />
        {compare.map((c, i) => (
          <Line
            key={c.name}
            type="monotone"
            dataKey={c.name}
            stroke={COMPARE_COLORS[i % COMPARE_COLORS.length]}
            strokeWidth={2}
            dot={false}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Annual expenses vs inflows over the retirement horizon. */
export function ExpenseChart({ result, retirementAge }) {
  const data = result.rows
    .filter((r) => r.phase === 'Retired')
    .map((r) => ({
      age: r.age,
      Expenses: Math.round(r.expense),
      Inflows: Math.round(r.inflow),
      'Net withdrawal': Math.round(r.netDraw),
    }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="inflowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="age" tick={{ fontSize: 12 }} stroke="#9ca3af" />
        <YAxis tickFormatter={inr} width={70} tick={{ fontSize: 11 }} stroke="#9ca3af" />
        <Tooltip content={<TooltipBox />} />
        <Legend />
        <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fill="url(#expFill)" />
        <Area type="monotone" dataKey="Inflows" stroke="#10b981" strokeWidth={2} fill="url(#inflowFill)" />
        <Line type="monotone" dataKey="Net withdrawal" stroke="#111827" strokeWidth={1.5} dot={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
