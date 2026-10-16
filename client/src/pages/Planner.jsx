import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Pencil, Printer, Save, Shuffle } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import NepalMap from '../components/NepalMap.jsx';
import Itinerary from '../components/Itinerary.jsx';
import Contours from '../components/Contours.jsx';
import { Chips, CustomSelect, Range, Segmented, Skeleton, Stepper } from '../components/Bits.jsx';
import { api, draftStore } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useDocumentTitle, useMeta, useToast } from '../lib/ui.jsx';
import { MONTHS, cap, npr, plural } from '../lib/format.js';

const STEPS = ['Where & when', 'Places', 'Budget', 'Pace & interests'];
const STYLE_COPY = {
  budget: 'Buses, guesthouses, dal bhat. Every rupee goes further.',
  standard: 'Tourist buses, comfortable hotels, the odd splurge.',
  premium: 'Flights or private jeeps, the best rooms in town.',
};
const PACE_COPY = { relaxed: '5 h of sightseeing a day', balanced: '7 h a day', packed: '9 h a day, early starts' };
const PHASES = ['Measuring road hours between stops', 'Ordering stops: nearest neighbour, then 2-opt', 'Fitting days, travel days and nights', 'Knapsack: choosing sights per stop', 'Knapsack: fitting stays to your budget', 'Writing the day-by-day plan'];

const today = () => new Date().toISOString().slice(0, 10);

function initialInput(params, draft, user) {
  const base = {
    startId: null, startDate: '', month: new Date().getMonth() + 1, days: 6, destinationIds: [], auto: false,
    budget: 60000, travelers: 2, style: 'standard', pace: 'balanced', interests: user?.interests || [],
  };
  const fromDraft = draft?.input ? { ...base, ...draft.input } : base;
  const num = (k) => (params.get(k) ? Number(params.get(k)) : undefined);
  const dest = params.get('dest');
  const merged = {
    ...fromDraft,
    ...(num('start') && { startId: num('start') }),
    ...(num('days') && { days: num('days') }),
    ...(num('budget') && { budget: num('budget') }),
    ...(num('travelers') && { travelers: num('travelers') }),
  };
  if (dest) { merged.destinationIds = [Number(dest)]; merged.auto = false; }
  if (params.get('auto')) { merged.auto = true; merged.destinationIds = []; }
  return merged;
}

export default function Planner() {
  useDocumentTitle('Plan a trip');
  const { meta } = useMeta();
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tripId = params.get('trip');

  const [input, setInput] = useState(() => initialInput(params, draftStore.get(), user));
  const [step, setStep] = useState(() => (params.get('start') ? 1 : 0));
  const [dir, setDir] = useState(1);
  const [plan, setPlan] = useState(() => (params.get('view') === 'result' ? draftStore.get()?.plan : null) || null);
  const [phase, setPhase] = useState(-1);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const autoSaved = useRef(false);

  const set = (patch) => setInput((x) => ({ ...x, ...patch }));
  const places = meta?.destinations || [];
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);

  // default start city once meta arrives
  useEffect(() => {
    if (meta && !input.startId) set({ startId: meta.startCities[0]?.id });
  }, [meta]); // eslint-disable-line react-hooks/exhaustive-deps

  // editing an existing trip: load its input
  useEffect(() => {
    if (!tripId) return;
    api(`/trips/${tripId}`).then(({ trip }) => {
      const i = trip.plan.input;
      setInput({ ...i, startDate: i.startDate || '', destinationIds: trip.plan.stops.map((s) => s.id), auto: false });
      setStep(1);
    }).catch((e) => toast(e.message, 'bad'));
  }, [tripId]); // eslint-disable-line react-hooks/exhaustive-deps

  // guest planned, then logged in via "save": save the draft automatically
  useEffect(() => {
    if (!user || params.get('save') !== '1' || autoSaved.current) return;
    const draft = draftStore.get();
    if (!draft?.input) return;
    autoSaved.current = true;
    api('/trips', { method: 'POST', body: { input: draft.input } })
      .then(({ id }) => { draftStore.set(null); toast('Trip saved to your account'); nav(`/trips/${id}`); })
      .catch((e) => toast(e.message, 'bad'));
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = input.destinationIds.map((id) => byId.get(id)).filter(Boolean);
  // Rough estimate: minimum stay everywhere plus roughly one travel day per stop.
  // The planner computes the exact figure from real road hours.
  const minDays = selected.reduce((s, d) => s + d.min_days, 0) + selected.length;
  const toggleDest = (id) => {
    if (id === input.startId) return;
    set({ auto: false, destinationIds: input.destinationIds.includes(id) ? input.destinationIds.filter((x) => x !== id) : [...input.destinationIds, id] });
  };

  const canNext = [Boolean(input.startId), input.auto || input.destinationIds.length > 0, input.budget >= 5000, true][step];
  const go = (n) => { setDir(n > step ? 1 : -1); setStep(n); };

  const requestBody = () => ({
    startId: input.startId,
    destinationIds: input.auto ? [] : input.destinationIds,
    days: input.days, budget: input.budget, travelers: input.travelers, style: input.style, pace: input.pace,
    interests: input.interests, startDate: input.startDate || undefined, month: input.month,
  });

  const generate = async (override = {}) => {
    setError('');
    setPhase(0);
    const timer = setInterval(() => setPhase((p) => Math.min(PHASES.length - 1, p + 1)), 330);
    try {
      const body = { ...requestBody(), ...override };
      const nextInput = { ...input, ...override };
      setInput(nextInput);
      const [result] = await Promise.all([api('/trips/plan', { method: 'POST', body }), new Promise((r) => setTimeout(r, PHASES.length * 330 + 150))]);
      draftStore.set({ input: nextInput, plan: result });
      setPlan(result);
      const p = new URLSearchParams(params);
      p.set('view', 'result');
      setParams(p, { replace: true });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e.message);
    } finally {
      clearInterval(timer);
      setPhase(-1);
    }
  };

  const save = async () => {
    if (!user) {
      draftStore.set({ input: { ...input }, plan });
      nav(`/login?next=${encodeURIComponent('/plan?save=1')}&reason=save`);
      return;
    }
    setSaving(true);
    try {
      if (tripId) {
        await api(`/trips/${tripId}`, { method: 'PUT', body: { input: requestBody() } });
        toast('Trip updated');
        nav(`/trips/${tripId}`);
      } else {
        const { id } = await api('/trips', { method: 'POST', body: { input: requestBody() } });
        draftStore.set(null);
        toast('Trip saved');
        nav(`/trips/${id}`);
      }
    } catch (e) { toast(e.message, 'bad'); } finally { setSaving(false); }
  };

  const edit = () => {
    setPlan(null);
    const p = new URLSearchParams(params);
    p.delete('view');
    setParams(p, { replace: true });
    go(1);
  };

  // ---------------- result view ----------------
  if (plan) {
    return (
      <Page className="container planner-result">
        <Itinerary
          plan={plan}
          onFixDays={(days) => generate({ days })}
          subtitle={!user ? 'This is a draft. It stays in this browser until you save it to an account.' : undefined}
          actions={
            <>
              <button className="btn btn-ghost" onClick={edit}><Pencil size={16} /> Edit</button>
              <button className="btn btn-ghost" onClick={() => window.print()}><Printer size={16} /> Print</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}><Save size={16} /> {saving ? 'Saving…' : tripId ? 'Update trip' : user ? 'Save trip' : 'Save (free account)'}</button>
            </>
          }
        />
      </Page>
    );
  }

  // ---------------- wizard ----------------
  return (
    <Page className="planner">
      <Contours seed={5} peaks={3} rings={9} className="planner-contours" />
      <div className="container planner-grid">
        <div className="wizard">
          <div className="wizard-head">
            <span className="eyebrow">{tripId ? 'Re-plan trip' : 'New trip'} · step {step + 1} of {STEPS.length}</span>
            <ol className="steps" aria-label="Steps">
              {STEPS.map((s, i) => (
                <li key={s} className={i === step ? 'on' : i < step ? 'done' : ''}>
                  <button type="button" onClick={() => (i < step || canNext) && go(i)} disabled={i > step && !canNext}>
                    <span className="mono">{i < step ? <Check size={12} /> : i + 1}</span> {s}
                  </button>
                </li>
              ))}
            </ol>
            <div className="wz-progress" aria-hidden="true">
              <motion.span animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
            </div>
          </div>

          <div className="wizard-body">
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={step} custom={dir} initial={{ opacity: 0, x: 40 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 * dir }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
                {step === 0 && (
                  <div className="stack wz">
                    <h2>Where do you start, and for how long?</h2>
                    <div className="field">
                      <span className="label">Starting city</span>
                      {meta ? (
                        <Segmented id="start" value={input.startId} onChange={(v) => set({ startId: v, destinationIds: input.destinationIds.filter((x) => x !== v) })} options={meta.startCities.map((c) => ({ key: c.id, label: c.name }))} />
                      ) : <Skeleton h={46} w={320} />}
                    </div>
                    <div className="wz-row">
                      <div className="field">
                        <span className="label">Number of days</span>
                        <Stepper value={input.days} onChange={(v) => set({ days: v })} min={2} max={30} label="days" />
                      </div>
                      <div className="field">
                        <label htmlFor="sd">Start date (optional)</label>
                        <input id="sd" type="date" className="input" min={today()} value={input.startDate} onChange={(e) => set({ startDate: e.target.value, month: e.target.value ? Number(e.target.value.slice(5, 7)) : input.month })} />
                      </div>
                      {!input.startDate && (
                        <div className="field">
                          <label htmlFor="mo">Or just the month</label>
                          <CustomSelect
                            id="mo"
                            value={input.month}
                            onChange={(m) => set({ month: Number(m) })}
                            ariaLabel="Month"
                            options={MONTHS.map((m, i) => ({ value: i + 1, label: m }))}
                          />
                        </div>
                      )}
                    </div>
                    {[6, 7, 8, 9].includes(input.month) && <p className="hint warn">Monsoon month: roads are slower and some treks close. The planner adds a 30% delay allowance.</p>}
                  </div>
                )}

                {step === 1 && (
                  <div className="stack wz">
                    <h2>Which places?</h2>
                    <p className="ink-2">Tap places on the map or in the list. Order doesn't matter; the planner finds the shortest loop.</p>
                    <button type="button" className={`auto-toggle ${input.auto ? 'on' : ''}`} onClick={() => set({ auto: !input.auto, destinationIds: [] })} aria-pressed={input.auto}>
                      <Shuffle size={18} />
                      <span className="grow"><strong>Let Ghumfir choose</strong><span className="small muted"> · based on your interests, season and days</span></span>
                      <span className="auto-switch"><motion.span layout className="auto-knob" /></span>
                    </button>
                    {!input.auto && (
                      <ul className="dest-list">
                        {places.filter((p) => p.id !== input.startId).map((p) => {
                          const on = input.destinationIds.includes(p.id);
                          return (
                            <li key={p.id}>
                              <button type="button" className={`dest-row ${on ? 'on' : ''}`} onClick={() => toggleDest(p.id)} aria-pressed={on}>
                                <span className="dest-check">{on ? <Check size={14} /> : null}</span>
                                <span className="grow dest-name">{p.name}</span>
                                <span className="tiny muted dest-tags">{p.tags.slice(0, 2).join(' · ')}</span>
                                <span className="mono tiny">{p.min_days}d+</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {!input.auto && selected.length > 0 && minDays > input.days && (
                      <p className="hint warn">These places likely need around {minDays} days once travel days are counted. You have {input.days}; the planner will drop the lowest-value stop, or <button className="linklike" onClick={() => set({ days: Math.min(30, minDays) })}>make it {minDays} days</button>.</p>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="stack wz">
                    <h2>What can you spend?</h2>
                    <div className="field">
                      <div className="row between"><span className="label">Total budget for everyone</span><span className="mono budget-big">{npr(input.budget)}</span></div>
                      <Range value={input.budget} onChange={(v) => set({ budget: v })} min={5000} max={500000} step={1000} label="Budget" />
                      <div className="chips">
                        {[25000, 50000, 100000, 200000].map((b) => (
                          <button key={b} type="button" className={`chip ${input.budget === b ? 'on' : ''}`} onClick={() => set({ budget: b })}>{npr(b)}</button>
                        ))}
                      </div>
                      <span className="small muted">≈ {npr(input.budget / input.travelers / input.days)} per person per day</span>
                    </div>
                    <div className="wz-row">
                      <div className="field">
                        <span className="label">Travellers</span>
                        <Stepper value={input.travelers} onChange={(v) => set({ travelers: v })} min={1} max={20} label="travellers" />
                      </div>
                      <div className="field grow">
                        <span className="label">Travel style</span>
                        <Segmented id="style" value={input.style} onChange={(v) => set({ style: v })} options={['budget', 'standard', 'premium'].map((s) => ({ key: s, label: cap(s) }))} />
                        <span className="small muted">{STYLE_COPY[input.style]}</span>
                      </div>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="stack wz">
                    <h2>How do you like to travel?</h2>
                    <div className="field">
                      <span className="label">Pace</span>
                      <Segmented id="pace" value={input.pace} onChange={(v) => set({ pace: v })} options={['relaxed', 'balanced', 'packed'].map((s) => ({ key: s, label: cap(s) }))} />
                      <span className="small muted">{PACE_COPY[input.pace]}</span>
                    </div>
                    <div className="field">
                      <span className="label">Interests (pick up to 5)</span>
                      <Chips options={meta?.interests || []} value={input.interests} onChange={(v) => set({ interests: v })} max={5} />
                      <span className="small muted">Sights that match get priority when time or money is short.</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="wizard-foot">
            <button className="btn btn-quiet" onClick={() => go(step - 1)} disabled={step === 0}><ArrowLeft size={16} /> Back</button>
            {step < STEPS.length - 1 ? (
              <button className="btn btn-ink" onClick={() => go(step + 1)} disabled={!canNext}>Next <ArrowRight size={16} className="arrow" /></button>
            ) : (
              <button className="btn btn-primary btn-lg" onClick={() => generate()} disabled={phase >= 0 || !input.startId}>Build my itinerary <ArrowRight size={18} className="arrow" /></button>
            )}
          </div>
        </div>

        <aside className="draft">
          <div className="sticky stack">
            <div className="card draft-map">
              {places.length ? (
                <NepalMap places={places} route={[input.startId, ...input.destinationIds]} loop={false} selected={new Set(input.destinationIds)} onToggle={step === 1 && !input.auto ? toggleDest : undefined} startId={input.startId} labels="route" scale={1.9} />
              ) : <Skeleton h={240} />}
            </div>
            <dl className="draft-sum">
              <div><dt>From</dt><dd>{byId.get(input.startId)?.name || '—'}</dd></div>
              <div><dt>When</dt><dd>{input.startDate || MONTHS[input.month - 1]} · {plural(input.days, 'day')}</dd></div>
              <div><dt>Places</dt><dd>{input.auto ? 'Ghumfir will choose' : selected.length ? selected.map((d) => d.name).join(', ') : '—'}</dd></div>
              <div><dt>Budget</dt><dd className="mono">{npr(input.budget)} · {plural(input.travelers, 'person', 'people')}</dd></div>
              <div><dt>Style</dt><dd>{cap(input.style)} · {input.pace}</dd></div>
            </dl>
            {!user && <p className="tiny muted">No account needed. Your draft stays in this browser; <Link to="/register">create an account</Link> to keep it.</p>}
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {phase >= 0 && (
          <motion.div className="thinking" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
            <div className="thinking-card">
              <Contours seed={phase + 2} peaks={2} rings={7} width={500} height={300} />
              <ol>
                {PHASES.map((p, i) => (
                  <motion.li key={p} className={i < phase ? 'done' : i === phase ? 'on' : ''} initial={{ opacity: 0, x: -10 }} animate={{ opacity: i <= phase ? 1 : 0.35, x: 0 }} transition={{ delay: i * 0.05 }}>
                    <span className="mono">{i < phase ? <Check size={12} /> : String(i + 1).padStart(2, '0')}</span> {p}
                  </motion.li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
