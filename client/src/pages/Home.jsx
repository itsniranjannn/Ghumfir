import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { ArrowRight, Bus, Check, Shuffle } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import Contours from '../components/Contours.jsx';
import NepalMap from '../components/NepalMap.jsx';
import PlaceCard from '../components/PlaceCard.jsx';
import { CountUp, CustomSelect, Range, Reveal, Skeleton, Stepper } from '../components/Bits.jsx';
import { Magnetic, SplitWords, Tilt, usePointerParallax } from '../components/Motion.jsx';
import { useApi, useDocumentTitle, useMeta } from '../lib/ui.jsx';
import { MONTHS, npr } from '../lib/format.js';

const SAMPLE = ['kathmandu', 'bandipur', 'pokhara', 'chitwan'];
const HERO_BOUNDS = { minLng: 83.55, maxLng: 85.75, minLat: 27.35, maxLat: 28.5 };
const EASE = [0.22, 1, 0.36, 1];
const fadeUp = (d = 0) => ({ initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: EASE } });

export default function Home() {
  useDocumentTitle('');
  const { meta } = useMeta();
  const month = new Date().getMonth() + 1;
  const recs = useApi(`/destinations/recommendations?limit=6&month=${month}`);
  const nav = useNavigate();
  const [start, setStart] = useState('');
  const [days, setDays] = useState(6);
  const [budget, setBudget] = useState(60000);
  const [travelers, setTravelers] = useState(2);
  const hero = usePointerParallax(14);

  const places = meta?.destinations || [];
  const route = useMemo(() => SAMPLE.map((s) => places.find((p) => p.slug === s)?.id).filter(Boolean), [places]);
  const startId = start || meta?.startCities?.[0]?.id || '';

  const go = (e) => {
    e.preventDefault();
    nav(`/plan?${new URLSearchParams({ start: startId, days, budget, travelers })}`);
  };

  return (
    <Page className="home">
      {/* ---------- hero ---------- */}
      <section className="hero" onPointerMove={hero.onPointerMove}>
        <motion.div className="hero-contours-wrap" style={{ x: hero.x, y: hero.y }}>
          <Contours seed={11} peaks={4} rings={11} className="hero-contours" />
        </motion.div>
        <div className="container hero-grid">
          <div className="hero-copy">
            <motion.span className="eyebrow" {...fadeUp(0)}>Nepal trip planner <span className="np">· नेपाल घुमफिर</span></motion.span>
            <SplitWords className="hero-title" delay={0.1}>
              Plan Nepal by the hours the roads <em>actually</em> take.
            </SplitWords>
            <motion.p className="lede" {...fadeUp(0.55)}>
              Pick a few places, your days and a budget in rupees. Ghumfir orders the route, fits hotels and sights to your money and
              shows every cost before you book anything. No account needed to try it.
            </motion.p>

            <motion.form className="ticket quick" onSubmit={go} {...fadeUp(0.7)}>
              <div className="quick-grid">
                <div className="field">
                  <label htmlFor="q-start">Starting from</label>
                  <CustomSelect
                    id="q-start"
                    value={startId}
                    onChange={setStart}
                    ariaLabel="Starting from"
                    options={(meta?.startCities || []).map((c) => ({ value: c.id, label: c.name }))}
                  />
                </div>
                <div className="field">
                  <span className="label">Days</span>
                  <Stepper value={days} onChange={setDays} min={2} max={21} label="days" />
                </div>
                <div className="field">
                  <span className="label">Travellers</span>
                  <Stepper value={travelers} onChange={setTravelers} min={1} max={12} label="travellers" />
                </div>
              </div>
              <div className="field quick-budget">
                <div className="row between">
                  <span className="label">Total budget</span>
                  <motion.span key={budget} className="mono quick-budget-v" initial={{ y: -6, opacity: 0.4 }} animate={{ y: 0, opacity: 1 }}>{npr(budget)}</motion.span>
                </div>
                <Range value={budget} onChange={setBudget} min={10000} max={400000} step={5000} label="Total budget" />
              </div>
              <div className="perf" />
              <div className="row between quick-foot">
                <span className="small muted">≈ {npr(budget / travelers / days)} per person per day</span>
                <Magnetic>
                  <button className="btn btn-primary btn-lg" type="submit">Draft my trip <ArrowRight size={18} className="arrow" /></button>
                </Magnetic>
              </div>
            </motion.form>
          </div>

          <motion.figure className="hero-map" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.35, ease: EASE }}>
            <div className="hero-map-frame">
              <span className="frame-tag mono">Central Nepal · live sample loop</span>
              <span className="frame-pulse" aria-hidden="true" />
              {places.length ? (
                <NepalMap places={places} route={route} startId={route[0]} labels="route" bounds={HERO_BOUNDS} scale={1.7} traveller />
              ) : <Skeleton h={320} r={18} />}
            </div>
            <figcaption className="mono tiny">
              <span>Sample loop</span>
              <span>KTM → BDP → PKR → CTW → KTM</span>
              <span>7 days · ~19 h on the road</span>
            </figcaption>
            <motion.div className="receipt" initial={{ opacity: 0, y: 40, rotate: 4 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ delay: 1.3, duration: 0.9, ease: EASE }} whileHover={{ rotate: 0, y: -4 }}>
              <div className="receipt-head mono">SAMPLE ESTIMATE · 2 PAX</div>
              {[['Buses & jeep', 9600], ['6 nights, standard', 29600], ['Food', 25000], ['Entry & park fees', 6900]].map(([k, v]) => (
                <div key={k} className="receipt-row"><span>{k}</span><span className="mono"><CountUp value={v} /></span></div>
              ))}
              <div className="receipt-row total"><span>Total</span><span className="mono"><CountUp value={74655} format={(n) => npr(n)} /></span></div>
            </motion.div>
          </motion.figure>
        </div>
        <motion.div className="scroll-cue mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} aria-hidden="true">
          <span>scroll</span>
          <motion.i animate={{ y: [0, 10, 0] }} transition={{ duration: 1.6, repeat: Infinity }} />
        </motion.div>
      </section>

      {/* ---------- numbers ---------- */}
      <section className="numbers">
        <div className="container numbers-grid">
          {[
            [meta?.counts?.destinations ?? 18, 'destinations', 'from Rara to Ilam'],
            [meta?.counts?.attractions ?? 68, 'sights', 'with fees and hours'],
            [meta?.counts?.roadLinks ?? 33, 'real road links', 'km and bus hours'],
            [7, 'provinces', 'all of them covered'],
          ].map(([v, k, sub], i) => (
            <Reveal key={k} delay={i * 0.08} className="num">
              <span className="num-v"><CountUp value={v} /></span>
              <span className="num-k">{k}</span>
              <span className="num-sub mono">{sub}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------- story: how a plan comes together ---------- */}
      <Story places={places} route={route} />

      {/* ---------- what's different ---------- */}
      <section className="section notes">
        <div className="container">
          <Reveal><span className="eyebrow">Field notes</span></Reveal>
          <SplitWords as="h2" className="notes-title" inView>Three things most trip planners skip.</SplitWords>
          <div className="notes-grid">
            <Reveal className="note-a">
              <Tilt className="note">
                <span className="note-n mono">01</span>
                <h3>Road time, not map distance</h3>
                <p className="ink-2">A short line on the map can be a long day on Nepal's hill roads. Every leg uses real road hours, adds a monsoon allowance, and turns anything over five hours into its own travel day.</p>
                <div className="note-demo">
                  <div className="nd-row"><span>Kathmandu → Pokhara</span></div>
                  <div className="nd-bar"><motion.span style={{ background: 'var(--line-strong)' }} initial={{ width: 0 }} whileInView={{ width: '42%' }} viewport={{ once: true }} transition={{ duration: 1 }} /><em className="mono">143 km straight</em></div>
                  <div className="nd-bar"><motion.span style={{ background: 'var(--slate)' }} initial={{ width: 0 }} whileInView={{ width: '60%' }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.15 }} /><em className="mono">200 km road</em></div>
                  <div className="nd-bar"><motion.span style={{ background: 'var(--brick)' }} initial={{ width: 0 }} whileInView={{ width: '88%' }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }} /><em className="mono">7 h by bus</em></div>
                </div>
              </Tilt>
            </Reveal>
            <Reveal className="note-b-wrap" delay={0.08}>
              <Tilt className="note note-b">
                <span className="note-n mono">02</span>
                <h3>The whole bill before you go</h3>
                <p className="ink-2">Transport, rooms, food, entry tickets and park permits, day by day in rupees. If the budget is tight, you see exactly what was cut and why.</p>
                <ul className="note-ledger mono small">
                  <li><span>Day 3 · Chitwan</span><span>Rs 11,400</span></li>
                  <li className="cut"><span>Paragliding, Pokhara</span><span>over budget</span></li>
                  <li className="cut"><span>Manakamana cable car</span><span>no time</span></li>
                </ul>
              </Tilt>
            </Reveal>
            <Reveal className="note-c" delay={0.16}>
              <Tilt className="note note-dashed">
                <span className="note-n mono">03</span>
                <h3>It shows its working</h3>
                <p className="ink-2">See the travel hours your order would take and the shorter loop the planner found. Recommendations say why they're recommended. Nothing is a black box.</p>
                <Link to="/how-it-works" className="btn btn-ghost btn-sm" style={{ marginTop: 16 }}>How the planner works <ArrowRight size={14} className="arrow" /></Link>
              </Tilt>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ---------- in season ---------- */}
      <section className="section season-sec">
        <div className="container">
          <div className="row between" style={{ alignItems: 'end', marginBottom: 28 }}>
            <div className="stack-sm">
              <Reveal><span className="eyebrow">In season · {MONTHS[month - 1]}</span></Reveal>
              <SplitWords as="h2" inView>Good to go this month</SplitWords>
            </div>
            <Link to="/explore" className="btn btn-ghost">All destinations <ArrowRight size={16} className="arrow" /></Link>
          </div>
          <div className="place-grid">
            {recs.loading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} h={360} r={18} />)}
            {recs.error && <p className="muted">Destinations will appear here once the server is running.</p>}
            {recs.data?.results.map((p, i) => <PlaceCard key={p.id} place={p} month={month} index={i} />)}
          </div>
        </div>
      </section>

      {/* ---------- surprise ---------- */}
      <section className="section surprise">
        <div className="container surprise-inner">
          <Reveal className="stack">
            <span className="eyebrow">Don't know where yet?</span>
            <SplitWords as="h2" inView>Start with nothing but a number of days.</SplitWords>
            <p className="lede">Leave the places empty and Ghumfir picks a cluster that fits your days, your interests and the season, then explains each choice.</p>
            <div className="row">
              <Magnetic><Link to="/plan?auto=1" className="btn btn-ink btn-lg"><Shuffle size={18} /> Pick places for me</Link></Magnetic>
            </div>
          </Reveal>
          <div className="surprise-art" aria-hidden="true">
            <Contours seed={3} peaks={2} rings={8} width={600} height={400} />
            <motion.span className="np surprise-np" initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }}>कहाँ जाने?</motion.span>
            {['Rara', 'Ilam', 'Bandipur', 'Lumbini', 'Mustang'].map((n, i) => (
              <motion.span key={n} className="surprise-chip mono" style={{ left: `${12 + i * 17}%`, top: `${18 + (i % 2) * 58}%` }}
                animate={{ y: [0, -8, 0] }} transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}>
                {n}
              </motion.span>
            ))}
          </div>
        </div>
      </section>
    </Page>
  );
}

/** Scroll-driven explanation: the visual on the right changes as you scroll through 4 steps. */
const STEPS = [
  { k: 'Pick', t: 'Pick places, or let it pick', d: 'Choose a few destinations on the map, or leave it empty and the recommender ranks places by your interests, the season and ratings.' },
  { k: 'Order', t: 'Find the shortest loop', d: 'Nearest-neighbour builds a first route, then 2-opt keeps reversing stretches until no swap makes the loop shorter in real road hours.' },
  { k: 'Fit', t: 'Fit it into your days', d: 'Long legs become travel days, every stop gets its minimum stay, and spare days go to the places worth them most.' },
  { k: 'Budget', t: 'Fit it into your rupees', d: 'A knapsack picks one hotel and one sightseeing package per stop, so you get the most out of the money left after transport and food.' },
];

function Story({ places, route }) {
  const ref = useRef(null);
  const [step, setStep] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  useMotionValueEvent(scrollYProgress, 'change', (p) => setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(p * STEPS.length * 0.999)))));

  return (
    <section className="story" ref={ref}>
      <div className="story-sticky">
        <div className="container story-grid">
          <div className="story-copy">
            <span className="eyebrow">How a plan comes together</span>
            <ol className="story-steps">
              {STEPS.map((s, i) => (
                <li key={s.k} className={i === step ? 'on' : i < step ? 'done' : ''}>
                  <span className="mono story-n">{i < step ? <Check size={13} /> : String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <h3>{s.t}</h3>
                    <AnimatePresence initial={false}>
                      {i === step && (
                        <motion.p className="ink-2" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.35 }}>
                          {s.d}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </li>
              ))}
            </ol>
            <div className="story-progress"><motion.span style={{ scaleX: progress }} /></div>
          </div>

          <div className="story-visual card">
            <span className="frame-tag mono">{String(step + 1).padStart(2, '0')} / {STEPS[step].k}</span>
            <AnimatePresence mode="wait">
              <motion.div key={step} className="story-stage" initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.4, ease: EASE }}>
                {step === 0 && places.length > 0 && (
                  <NepalMap places={places} route={route.slice(0, 1)} loop={false} selected={new Set(route.slice(1))} startId={route[0]} bounds={HERO_BOUNDS} scale={1.7} labels="route" />
                )}
                {step === 1 && (
                  <div className="stack">
                    {places.length > 0 && <NepalMap places={places} route={route} startId={route[0]} bounds={HERO_BOUNDS} scale={1.7} traveller />}
                    <div className="story-bars mono small">
                      {[['Ranked order', 22.5], ['Nearest neighbour', 19.5], ['After 2-opt', 19]].map(([k, v], i) => (
                        <div key={k} className="sb-row"><span>{k}</span><span className="sb-track"><motion.span initial={{ width: 0 }} animate={{ width: `${(v / 22.5) * 100}%` }} transition={{ delay: 0.3 + i * 0.15, duration: 0.7 }} /></span><span>{v} h</span></div>
                      ))}
                    </div>
                  </div>
                )}
                {step === 2 && (
                  <div className="story-days">
                    {[['01', 'travel', 'Kathmandu → Bandipur'], ['02', 'explore', 'Bandipur bazaar'], ['03', 'travel', 'Bandipur → Pokhara'], ['04', 'explore', 'Sarangkot sunrise'], ['05', 'explore', 'Phewa Lake'], ['06', 'explore', 'Chitwan jeep safari'], ['07', 'travel', 'Back to Kathmandu']].map(([n, type, t], i) => (
                      <motion.div key={n} className={`sd sd-${type}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08, ease: EASE }}>
                        <span className="mono">DAY {n}</span>
                        <strong>{t}</strong>
                        {type === 'travel' && <Bus size={14} />}
                      </motion.div>
                    ))}
                  </div>
                )}
                {step === 3 && (
                  <div className="story-ledger">
                    {[['Transport', 9600, 'var(--slate)'], ['Stays', 29600, 'var(--brick)'], ['Food', 25000, 'var(--marigold)'], ['Sights & permits', 6900, 'var(--moss)']].map(([k, v, c], i) => (
                      <motion.div key={k} className="sl-row" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                        <span><i style={{ background: c }} /> {k}</span>
                        <span className="mono"><CountUp value={v} format={(n) => npr(n)} duration={0.9} /></span>
                      </motion.div>
                    ))}
                    <div className="sl-total"><span>Total for 2 people</span><span className="mono"><CountUp value={74655} format={(n) => npr(n)} /></span></div>
                    <div className="sl-meter"><motion.span initial={{ width: 0 }} animate={{ width: '93%' }} transition={{ delay: 0.5, duration: 1 }} /><i style={{ left: '100%' }} /></div>
                    <span className="mono tiny muted">Rs 5,345 left of Rs 80,000</span>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
