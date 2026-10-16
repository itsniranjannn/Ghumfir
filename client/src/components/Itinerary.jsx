import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertTriangle, Bus, Car, Plane, BedDouble, Landmark, Ticket, Coffee, Info, ArrowRight, Check, Scissors, Clock, Route as RouteIcon,
} from 'lucide-react';
import RouteMap from './RouteMap.jsx';
import { AltitudeProfile, BudgetMeter, CostBar, HBars, COST_COLORS, COST_LABELS } from './Charts.jsx';
import { CountUp } from './Bits.jsx';
import { cap, fmtDate, hours, npr, plural, weekday } from '../lib/format.js';

const CODES = {
  kathmandu: 'KTM', pokhara: 'PKR', chitwan: 'CTW', lumbini: 'LUM', bhaktapur: 'BKT', bandipur: 'BDP', nagarkot: 'NGK',
  'upper-mustang': 'MST', ilam: 'ILM', janakpur: 'JKR', gorkha: 'GRK', rara: 'RAR', namche: 'NAM', ghandruk: 'GDK',
  tansen: 'TNS', dhulikhel: 'DHK', bardiya: 'BDY', gosaikunda: 'GSK', 'rara-lake': 'RAR', 'namche-bazaar': 'NAM',
};
export const codeOf = (slug, name) =>
  CODES[slug] || CODES[String(name || '').toLowerCase().replace(/\s+/g, '-')] || String(name || slug).slice(0, 3).toUpperCase();
const MODE_ICON = { bus: Bus, jeep: Car, flight: Plane };
const KIND_ICON = { travel: Bus, stay: BedDouble, visit: Landmark, permit: Ticket, free: Coffee, note: Info };

export default function Itinerary({ plan, title, subtitle, actions, onFixDays }) {
  const [tab, setTab] = useState('days');
  const tabsRef = useRef(null);
  const switchTab = (k) => {
    setTab(k);
    // If the tab bar has scrolled out of view, bring it back so the new tab starts at its top.
    const top = tabsRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) window.scrollTo({ top: window.scrollY + top - 90, behavior: 'smooth' });
  };
  const s = plan.summary;
  const returnLeg = plan.legs[plan.legs.length - 1];
  const profileStops = [plan.start, ...plan.stops, plan.start].map((x) => ({ name: x.name, altitude_m: x.altitude_m }));

  const tabs = [
    { key: 'days', label: 'Day by day' },
    { key: 'costs', label: 'Costs' },
    { key: 'route', label: 'Route & transport' },
    { key: 'why', label: 'Why this plan' },
  ];

  return (
    <div className="itinerary">
      {/* boarding-pass style header */}
      <motion.section className="ticket itin-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <div className="itin-head-top">
          <div className="stack-sm">
            <span className="eyebrow plain">{plan.input.startDate ? `${fmtDate(plan.input.startDate, { day: 'numeric', month: 'long', year: 'numeric' })} · ` : ''}{plural(s.days, 'day')} · {plural(plan.input.travelers, 'traveller')} · {plan.input.style} · {plan.input.pace}</span>
            <h1 className="itin-title">{title || plan.stops.map((x) => x.name).join(' · ')}</h1>
            {subtitle && <p className="muted small">{subtitle}</p>}
          </div>
          {actions && <div className="row itin-actions no-print">{actions}</div>}
        </div>
        <ol className="stations" aria-label="Route">
          {[plan.start, ...plan.stops, plan.start].map((x, i, arr) => (
            <li key={`${x.id}-${i}`} className={i === 0 || i === arr.length - 1 ? 'is-start' : ''}>
              <motion.span className="code mono" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.08 }}>
                {codeOf(x.slug, x.name)}
              </motion.span>
              <span className="st-name">{x.name}</span>
              {i > 0 && i < arr.length - 1 && <span className="st-nights mono">{plural(x.nights ?? 0, 'night')}</span>}
              {i < arr.length - 1 && (
                <span className="st-leg" aria-hidden="true">
                  {(() => { const L = plan.legs[i]; const Icon = MODE_ICON[L?.chosen.mode] || Bus; return <><Icon size={13} /> <span className="mono">{hours(L?.chosen.hours)}</span></>; })()}
                </span>
              )}
            </li>
          ))}
        </ol>
        <div className="perf" />
        <div className="itin-stats">
          <div className="stat"><span className="k">Total</span><span className="v"><CountUp value={s.totalCost} format={(n) => npr(n)} /></span></div>
          <div className="stat"><span className="k">Per person</span><span className="v"><CountUp value={s.perPerson} format={(n) => npr(n)} /></span></div>
          <div className="stat"><span className="k">On the road</span><span className="v mono">{hours(s.travelHours)}</span></div>
          <div className="stat"><span className="k">Distance</span><span className="v mono">{s.distanceKm.toLocaleString('en-IN')} km</span></div>
          <div className="stat itin-budget">
            <span className="k">{s.withinBudget ? `${npr(s.remaining)} left of ${npr(s.budget)}` : `${npr(-s.remaining)} over ${npr(s.budget)}`}</span>
            <BudgetMeter spent={s.totalCost} budget={s.budget} />
          </div>
        </div>
      </motion.section>

      {plan.warnings.length > 0 && (
        <ul className="warnings">
          {plan.warnings.map((w) => (
            <motion.li key={w} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}><AlertTriangle size={15} /> {w}</motion.li>
          ))}
          {onFixDays && !plan.trace.autoPicked && plan.trace.daysNeeded > plan.input.days && (
            <li className="warn-fix no-print">
              <span className="grow">Want every stop you picked?</span>
              <button className="btn btn-ink btn-sm" onClick={() => onFixDays(plan.trace.daysNeeded)}>Re-plan with {plan.trace.daysNeeded} days</button>
            </li>
          )}
        </ul>
      )}

      <div className="tabs no-print" role="tablist" ref={tabsRef}>
        {tabs.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'on' : ''} onClick={() => switchTab(t.key)}>
            {t.label}
            {tab === t.key && <motion.span layoutId="itin-tab" className="tab-line" />}
          </button>
        ))}
      </div>

      {/* No exit animation: the new tab replaces the old one in place, so the page never
          collapses to zero height and the scroll position never jumps. */}
      <motion.div key={tab} className="tab-panel" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        {tab === 'days' && <DaysTab plan={plan} returnLeg={returnLeg} profileStops={profileStops} />}
        {tab === 'costs' && <CostsTab plan={plan} />}
        {tab === 'route' && <RouteTab plan={plan} />}
        {tab === 'why' && <WhyTab plan={plan} />}
      </motion.div>
    </div>
  );
}

function DaysTab({ plan, returnLeg, profileStops }) {
  return (
    <div className="days-layout">
      <ol className="days">
        {plan.days.map((d, i) => (
          <motion.li key={d.day} className={`day-card day-${d.type}`} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.05 }}>
            <header className="day-head">
              <div className="day-num">
                <span className="mono">DAY</span>
                <strong className="mono">{String(d.day).padStart(2, '0')}</strong>
              </div>
              <div className="grow">
                <div className="row" style={{ gap: 8 }}>
                  <span className="tag">{d.type === 'explore' ? d.destination.name : d.type}</span>
                  {d.date && <span className="mono tiny muted">{weekday(d.date)} {fmtDate(d.date)}</span>}
                </div>
                <h3 className="day-title">{d.title}</h3>
              </div>
              <span className="np day-np" aria-hidden="true">{d.destination.name_np}</span>
            </header>
            <ul className="day-items">
              {d.items.map((it, k) => {
                const Icon = it.kind === 'travel' ? MODE_ICON[it.mode] || Bus : KIND_ICON[it.kind] || Info;
                return (
                  <li key={k} className={`it it-${it.kind}`}>
                    <span className="it-time mono">{it.time || ''}</span>
                    <span className="it-icon"><Icon size={14} /></span>
                    <div className="it-body">
                      <div className="it-title">{it.title}</div>
                      {it.detail && <div className="it-detail">{it.detail}</div>}
                      {it.image && <img className="it-photo" src={it.image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    </div>
                    <span className="it-cost mono">{it.cost ? npr(it.cost) : it.kind === 'visit' ? 'free' : ''}</span>
                  </li>
                );
              })}
            </ul>
            <footer className="day-foot mono">
              {Object.entries(d.cost).filter(([, v]) => v).map(([k, v]) => (
                <span key={k}><span className="dot" style={{ color: COST_COLORS[k] }} /> {COST_LABELS[k]} {npr(v)}</span>
              ))}
              <strong>{npr(d.total)}</strong>
            </footer>
          </motion.li>
        ))}
      </ol>
      <aside className="days-aside">
        <div className="sticky stack">
          <RouteMap start={plan.start} stops={plan.stops} returnMode={returnLeg.chosen.mode} height={360} />
          <div className="panel">
            <span className="label">Altitude along the route</span>
            <AltitudeProfile stops={profileStops} />
          </div>
          <div className="panel">
            <span className="label">Where the money goes</span>
            <div style={{ marginTop: 12 }}><CostBar breakdown={plan.breakdown} /></div>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CostsTab({ plan }) {
  return (
    <div className="costs-grid">
      <section className="panel">
        <h3>Breakdown</h3>
        <p className="small muted" style={{ margin: '6px 0 16px' }}>Every rupee in this plan, including a 5% buffer for tips, snacks and surprises.</p>
        <CostBar breakdown={plan.breakdown} height={18} />
      </section>
      <section className="panel">
        <h3>Stays and sights by stop</h3>
        <div className="stack" style={{ marginTop: 14 }}>
          {plan.stops.map((st) => (
            <div key={st.id} className="stop-cost">
              <div className="row between">
                <strong>{st.name} <span className="muted small">· {plural(st.nights, 'night')}</span></strong>
                <span className="tag slate">{st.package.label}</span>
              </div>
              {st.hotel ? (
                <div className="stop-hotel">
                  {st.hotel.image_url && <img src={st.hotel.image_url} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                  <p className="small">{st.hotel.name} <span className="muted">({st.hotel.tier}, {st.hotel.rating}★)</span> · <span className="mono">{npr(st.hotel.total)}</span></p>
                </div>
              ) :<p className="small muted">{st.nights > 0 ? 'Local guesthouse (estimated)' : 'Day visit, no overnight stay'}</p>}
              {st.hotelAlternatives.length > 0 && (
                <ul className="alts">
                  {st.hotelAlternatives.map((h) => (
                    <li key={h.id} className="small">
                      <span>{h.name} <span className="muted">· {h.tier} · {h.rating}★</span></span>
                      <span className={`mono ${h.delta > 0 ? 'muted' : 'accent'}`}>{h.delta > 0 ? '+' : '−'}{npr(Math.abs(h.delta))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>
      <section className="panel costs-days">
        <h3>Day ledger</h3>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="table">
            <thead>
              <tr><th>Day</th><th>Where</th>{Object.keys(COST_LABELS).filter((k) => k !== 'contingency').map((k) => <th key={k} style={{ textAlign: 'right' }}>{COST_LABELS[k]}</th>)}<th style={{ textAlign: 'right' }}>Total</th></tr>
            </thead>
            <tbody>
              {plan.days.map((d) => (
                <tr key={d.day}>
                  <td className="mono">{String(d.day).padStart(2, '0')}</td>
                  <td>{d.destination.name}</td>
                  {Object.keys(COST_LABELS).filter((k) => k !== 'contingency').map((k) => <td key={k} className="mono" style={{ textAlign: 'right' }}>{d.cost[k] ? npr(d.cost[k]) : '·'}</td>)}
                  <td className="mono" style={{ textAlign: 'right', fontWeight: 600 }}>{npr(d.total)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={2}>Buffer (5%)</td>
                <td colSpan={5} />
                <td className="mono" style={{ textAlign: 'right' }}>{npr(plan.breakdown.contingency)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const MODE_COLOR = { bus: 'var(--brick)', jeep: 'var(--marigold)', flight: 'var(--slate)' };

/** How twisty a road is, from its average speed: slower roads draw more bends. */
function roadCharacter(l) {
  const bus = l.options.find((o) => o.mode === 'bus');
  const speed = bus && bus.hours ? l.km / bus.hours : 30;
  if (speed < 24) return { speed, label: 'Slow mountain road', bends: 7, amp: 13 };
  if (speed < 34) return { speed, label: 'Winding hill highway', bends: 5, amp: 10 };
  return { speed, label: 'Faster highway', bends: 3, amp: 6 };
}

/** Procedural road ribbon: a sine path whose bends reflect the road's character. */
function RoadRibbon({ character, mode, delay = 0 }) {
  const W = 320, H = 44;
  const pts = [];
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    pts.push(`${i ? 'L' : 'M'}${(t * W).toFixed(1)} ${(H / 2 + Math.sin(t * Math.PI * character.bends) * character.amp * Math.sin(t * Math.PI)).toFixed(1)}`);
  }
  const d = pts.join(' ');
  const flight = mode === 'flight';
  return (
    <svg className="road-ribbon" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      {flight ? (
        <motion.path d={`M0 ${H - 6} Q${W / 2} ${-H * 0.6} ${W} ${H - 6}`} className="rr-air" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.2, delay }} />
      ) : (
        <>
          <path d={d} className="rr-bed" />
          <motion.path d={d} className="rr-line" style={{ stroke: MODE_COLOR[mode] }} initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, delay, ease: 'easeInOut' }} />
          <path d={d} className="rr-dash" />
        </>
      )}
    </svg>
  );
}

function RouteTab({ plan }) {
  const nodes = [plan.start, ...plan.stops, plan.start];
  const totalH = plan.legs.reduce((s, l) => s + l.chosen.hours, 0) || 1;
  const roadKm = plan.legs.filter((l) => l.chosen.mode !== 'flight').reduce((s, l) => s + l.km, 0);
  const roadH = plan.legs.filter((l) => l.chosen.mode !== 'flight').reduce((s, l) => s + l.chosen.hours, 0);
  const mix = plan.legs.reduce((m, l) => ({ ...m, [l.chosen.mode]: (m[l.chosen.mode] || 0) + 1 }), {});

  return (
    <div className="roadways">
      {/* journey strip: each segment's width is its share of travel hours */}
      <section className="panel journey">
        <div className="row between" style={{ alignItems: 'baseline' }}>
          <span className="label">The whole loop, scaled by hours on the move</span>
          <span className="mono tiny muted">{hours(totalH)} total</span>
        </div>
        <div className="journey-strip">
          {plan.legs.map((l, i) => {
            const Icon = MODE_ICON[l.chosen.mode] || Bus;
            return (
              <motion.div key={i} className={`js-seg js-${l.chosen.mode}`} style={{ flexGrow: l.chosen.hours }}
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.6, delay: 0.1 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}>
                <span className="js-code mono">{codeOf(nodes[i].slug, nodes[i].name)}</span>
                <span className="js-meta mono"><Icon size={12} /> {hours(l.chosen.hours)}</span>
              </motion.div>
            );
          })}
          <span className="js-end mono">{codeOf(plan.start.slug, plan.start.name)}</span>
          <motion.span className="js-vehicle" initial={{ left: '0%' }} animate={{ left: ['0%', '100%'] }} transition={{ duration: 7, repeat: Infinity, ease: 'linear', repeatDelay: 0.8 }}>
            <Bus size={14} />
          </motion.span>
        </div>
        <div className="journey-stats">
          <div className="stat"><span className="k">By road</span><span className="v mono">{roadKm.toLocaleString('en-IN')} km</span></div>
          <div className="stat"><span className="k">Road hours</span><span className="v mono">{hours(roadH)}</span></div>
          <div className="stat"><span className="k">Avg road speed</span><span className="v mono">{roadH ? Math.round(roadKm / roadH) : 0} km/h</span></div>
          <div className="stat"><span className="k">Mode mix</span><span className="v small">{Object.entries(mix).map(([m, n]) => `${n}× ${m}`).join(' · ')}</span></div>
        </div>
      </section>

      <ol className="legs">
        {plan.legs.map((l, i) => {
          const ch = roadCharacter(l);
          const maxH = Math.max(...l.options.map((o) => o.hours));
          const maxC = Math.max(...l.options.map((o) => o.cost));
          const ChosenIcon = MODE_ICON[l.chosen.mode] || Bus;
          return (
            <motion.li key={i} className="leg" initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.5, delay: Math.min(i, 3) * 0.06 }}>
              <div className="leg-rail" aria-hidden="true">
                <span className="leg-n mono">{String(i + 1).padStart(2, '0')}</span>
                <span className="leg-rail-line" />
              </div>
              <div className="leg-card">
                <div className="leg-top">
                  <div className="leg-ends">
                    <span className="code mono">{codeOf(nodes[i].slug, nodes[i].name)}</span>
                    <div className="leg-road">
                      <RoadRibbon character={ch} mode={l.chosen.mode} delay={0.1} />
                      <span className="leg-chosen"><ChosenIcon size={13} /> {l.chosen.label} · {hours(l.chosen.hours)}</span>
                    </div>
                    <span className="code mono">{codeOf(nodes[i + 1].slug, nodes[i + 1].name)}</span>
                  </div>
                  <div className="leg-names">
                    <strong>{l.from}</strong>
                    <span className="mono tiny muted">{l.km} km{l.known ? '' : ' (estimated)'} · {l.chosen.mode === 'flight' ? 'by air' : `${ch.label.toLowerCase()}, ~${Math.round(ch.speed)} km/h`}</span>
                    <strong>{l.to}</strong>
                  </div>
                </div>
                {(l.note || l.monsoon) && (
                  <div className="leg-notes">
                    {l.note && <span className="small ink-2"><Info size={13} /> {l.note}</span>}
                    {l.monsoon && <span className="tag marigold"><AlertTriangle size={11} /> monsoon +30%</span>}
                  </div>
                )}
                <div className="mode-compare">
                  {l.options.map((o) => {
                    const Icon = MODE_ICON[o.mode];
                    const chosen = o.mode === l.chosen.mode;
                    return (
                      <div key={o.mode} className={`mc-row ${chosen ? 'chosen' : ''}`}>
                        <span className="mc-mode"><Icon size={15} /> {o.label}{chosen && <Check size={13} className="mc-check" />}</span>
                        <span className="mc-bar" title={`${hours(o.hours)}`}>
                          <motion.span style={{ background: MODE_COLOR[o.mode] }} initial={{ width: 0 }} whileInView={{ width: `${(o.hours / maxH) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.7 }} />
                        </span>
                        <span className="mono small mc-v">{hours(o.hours)}</span>
                        <span className="mc-bar cost" title={npr(o.cost)}>
                          <motion.span initial={{ width: 0 }} whileInView={{ width: `${(o.cost / maxC) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.1 }} />
                        </span>
                        <span className="mono small mc-v">{npr(o.cost)}</span>
                        {o.weatherRisk && <span className="tag marigold mc-risk">weather-prone</span>}
                      </div>
                    );
                  })}
                  <div className="mc-legend mono tiny muted"><span /> <span>time</span><span /><span>cost (whole group)</span></div>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function WhyTab({ plan }) {
  const t = plan.trace;
  const k = t.knapsack;
  const fixedTotal = k.fixed.transport + k.fixed.food + k.fixed.permits;
  const waterfall = [
    { label: 'Your budget', value: k.budget, tone: 'ink' },
    { label: '5% buffer kept aside', value: -k.contingencyReserve },
    { label: 'Transport', value: -k.fixed.transport },
    { label: 'Food', value: -k.fixed.food },
    { label: 'Permits & park fees', value: -k.fixed.permits },
    { label: 'Left for stays + sights', value: k.availableForStaysAndSights, tone: 'brick' },
  ];
  return (
    <div className="why-grid">
      <section className="panel why-card">
        <span className="eyebrow">Step 1 · Visiting order</span>
        <h3>Shortest loop by travel hours</h3>
        <p className="small ink-2">
          Stops are ordered with a <strong>nearest-neighbour</strong> tour, then improved with <strong>2-opt</strong>, which reverses any
          stretch of the route that makes the loop shorter. Costs are real road hours{plan.legs.some((l) => l.monsoon) ? ' with a monsoon allowance' : ''}, not straight lines.
        </p>
        <HBars
          color="var(--slate)"
          format={(v) => hours(v)}
          data={[
            { label: t.autoPicked ? 'Ranked order' : 'Your order', value: t.tsp.inputOrderHours },
            { label: 'Nearest neighbour', value: t.tsp.nearestNeighbourHours },
            { label: 'After 2-opt', value: t.tsp.twoOptHours },
          ]}
        />
        {t.tsp.hoursSaved > 0 ? (
          <p className="callout"><RouteIcon size={15} /> Saved <strong>{hours(t.tsp.hoursSaved)}</strong> of travel compared with {t.autoPicked ? 'the ranked order' : 'the order you picked'}.</p>
        ) : <p className="callout"><Check size={15} /> Your order was already the shortest loop.</p>}
      </section>

      <section className="panel why-card">
        <span className="eyebrow">Step 2 · Fitting the budget</span>
        <h3>Multiple-choice knapsack</h3>
        <p className="small ink-2">
          For every stop we priced each hotel against three sightseeing packages, then a dynamic-programming knapsack picked exactly one
          option per stop to get the most value without crossing the money left over.
        </p>
        <ul className="waterfall">
          {waterfall.map((w) => (
            <li key={w.label} className={w.tone || ''}>
              <span>{w.label}</span>
              <span className="mono">{w.value < 0 ? '−' : ''}{npr(Math.abs(w.value))}</span>
            </li>
          ))}
        </ul>
        <p className="tiny muted mono" style={{ marginTop: 10 }}>
          {k.optionsPerStop.map((o) => `${o.stop}: ${o.options} options`).join(' · ')} · {k.dpCells.toLocaleString('en-IN')} table cells at Rs {k.unit} steps
          {fixedTotal ? '' : ''}
        </p>
      </section>

      <section className="panel why-card why-wide">
        <span className="eyebrow">Step 3 · What didn't make it</span>
        <h3>{plan.dropped.length ? `${plan.dropped.length} sights left out, and why` : 'Nothing left out'}</h3>
        <p className="small ink-2">Inside each stop, a 0/1 knapsack chose the sights with the best rating × interest value that fit your {plan.trace.pace.hoursPerDay}-hour sightseeing days.</p>
        {plan.dropped.length > 0 && (
          <ul className="dropped">
            {plan.dropped.map((d) => (
              <li key={`${d.destination}-${d.name}`}>
                <Scissors size={13} />
                <span className="grow"><strong>{d.name}</strong> <span className="muted">· {d.destination}</span></span>
                <span className="mono tiny muted">{hours(d.hours)}{d.fee ? ` · Rs ${d.fee}` : ''}</span>
                <span className={`tag ${d.reason === 'budget' ? 'marigold' : 'slate'}`}>{d.reason === 'budget' ? 'over budget' : 'no time'}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {t.autoPicked && (
        <section className="panel why-card why-wide">
          <span className="eyebrow">Step 0 · Picking places</span>
          <h3>Why these destinations</h3>
          <p className="small ink-2">Each place is scored on interest match (cosine similarity), Bayesian-averaged rating, season fit and what other travellers paired together.</p>
          <ul className="recs">
            {t.recommendations.map((r) => (
              <li key={r.id}>
                <span className="mono rec-score">{r.score}</span>
                <div><strong>{r.name}</strong><div className="tiny muted">{r.reasons.join(' · ')}</div></div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="tiny muted why-wide">Mode per leg: {cap(t.transportStyle)} preference. Pace: {t.pace.name} ({t.pace.hoursPerDay} h of sightseeing a day). <Link to="/how-it-works">How the planner works →</Link></p>
    </div>
  );
}
