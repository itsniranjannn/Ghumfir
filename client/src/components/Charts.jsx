import { motion } from 'framer-motion';
import { compactNpr, npr } from '../lib/format.js';

// Small hand-written SVG charts (no chart library).

export const COST_COLORS = {
  transport: 'var(--slate)',
  stay: 'var(--brick)',
  food: 'var(--marigold)',
  entry: 'var(--moss)',
  permits: 'var(--glacier)',
  contingency: 'var(--line-strong)',
};
export const COST_LABELS = {
  transport: 'Transport', stay: 'Stays', food: 'Food', entry: 'Entry fees', permits: 'Permits', contingency: 'Buffer (5%)',
};

/** Horizontal stacked bar for the cost breakdown, with legend. */
export function CostBar({ breakdown, height = 14 }) {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <div className="costbar">
      <div className="costbar-track" style={{ height }}>
        {entries.map(([k, v], i) => (
          <motion.div key={k} className="costbar-seg" style={{ background: COST_COLORS[k] }}
            initial={{ width: 0 }} animate={{ width: `${(v / total) * 100}%` }} transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] }}
            title={`${COST_LABELS[k]}: ${npr(v)}`} />
        ))}
      </div>
      <ul className="costbar-legend">
        {entries.map(([k, v]) => (
          <li key={k}>
            <span className="dot" style={{ color: COST_COLORS[k] }} />
            <span>{COST_LABELS[k]}</span>
            <span className="mono">{npr(v)}</span>
            <span className="mono muted">{Math.round((v / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Budget meter: fill = spent / budget, marker at 100%. */
export function BudgetMeter({ spent, budget }) {
  const pct = Math.min(1.25, spent / (budget || 1));
  const over = spent > budget;
  return (
    <div className={`budget-meter ${over ? 'over' : ''}`}>
      <div className="bm-track">
        <motion.div className="bm-fill" initial={{ width: 0 }} animate={{ width: `${(pct / 1.25) * 100}%` }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} />
        <div className="bm-mark" style={{ left: `${100 / 1.25}%` }}><span>budget</span></div>
      </div>
    </div>
  );
}

/** Vertical bars. data: [{label, value}] */
export function BarChart({ data, height = 180, format = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const bw = 100 / Math.max(1, data.length);
  return (
    <svg className="chart" viewBox={`0 0 100 ${height / 3}`} preserveAspectRatio="none" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d, i) => {
        const h = (d.value / max) * (height / 3 - 6);
        return (
          <motion.rect key={d.label} x={i * bw + bw * 0.18} width={bw * 0.64} rx={0.6} fill="var(--brick)"
            initial={{ y: height / 3, height: 0 }} animate={{ y: height / 3 - h, height: h }} transition={{ duration: 0.8, delay: i * 0.05 }}>
            <title>{`${d.label}: ${format(d.value)}`}</title>
          </motion.rect>
        );
      })}
    </svg>
  );
}

/** Horizontal labelled bars. */
export function HBars({ data, format = (v) => v, color = 'var(--slate)' }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <ul className="hbars">
      {data.map((d, i) => (
        <li key={d.label}>
          <span className="hb-label">{d.label}</span>
          <span className="hb-track">
            <motion.span className="hb-fill" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${(d.value / max) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.05 }} />
          </span>
          <span className="mono hb-val">{format(d.value)}</span>
        </li>
      ))}
    </ul>
  );
}

/** Donut. data: [{label, value, color}] */
export function Donut({ data, size = 150, label }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 40, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={label}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--paper-2)" strokeWidth="14" />
        {data.map((d, i) => {
          const len = (d.value / total) * c;
          const el = (
            <motion.circle key={d.label} cx="50" cy="50" r={r} fill="none" stroke={d.color} strokeWidth="14"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-acc} transform="rotate(-90 50 50)"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }} />
          );
          acc += len;
          return el;
        })}
        <text x="50" y="54" textAnchor="middle" className="donut-total">{total}</text>
      </svg>
      <ul className="donut-legend">
        {data.map((d) => (
          <li key={d.label}><span className="dot" style={{ color: d.color }} /> {d.label} <span className="mono muted">{d.value}</span></li>
        ))}
      </ul>
    </div>
  );
}

/** Altitude profile of a route: area chart of stop altitudes in visiting order. */
export function AltitudeProfile({ stops, height = 120 }) {
  if (!stops?.length) return null;
  const W = 600, H = height, pad = 18;
  const max = Math.max(1500, ...stops.map((s) => s.altitude_m || 0));
  const x = (i) => pad + (i / Math.max(1, stops.length - 1)) * (W - pad * 2);
  const y = (a) => H - 22 - ((a || 0) / max) * (H - 44);
  const line = stops.map((s, i) => `${i ? 'L' : 'M'}${x(i)} ${y(s.altitude_m)}`).join(' ');
  const area = `${line} L${x(stops.length - 1)} ${H - 22} L${x(0)} ${H - 22} Z`;
  return (
    <svg className="alt-profile" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Altitude profile of the route">
      <motion.path d={area} fill="var(--slate-wash)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} />
      <motion.path d={line} fill="none" stroke="var(--slate)" strokeWidth="2" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4 }} />
      {stops.map((s, i) => (
        <g key={`${s.name}-${i}`} transform={`translate(${x(i)} ${y(s.altitude_m)})`}>
          <circle r="4" fill="var(--card)" stroke="var(--slate)" strokeWidth="2" />
          <text y={-10} textAnchor={i === 0 ? 'start' : i === stops.length - 1 ? 'end' : 'middle'} className="ap-alt">{(s.altitude_m || 0).toLocaleString('en-IN')} m</text>
          <text y={H - y(s.altitude_m) - 6} textAnchor={i === 0 ? 'start' : i === stops.length - 1 ? 'end' : 'middle'} className="ap-name">{s.name}</text>
        </g>
      ))}
    </svg>
  );
}

export { compactNpr };
