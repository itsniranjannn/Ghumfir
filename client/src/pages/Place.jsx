import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Bookmark, BookmarkCheck, Clock, Mountain, Plane, Ticket, CalendarDays } from 'lucide-react';
import { Page } from '../components/Layout.jsx';
import PlaceCard from '../components/PlaceCard.jsx';
import RouteMap from '../components/RouteMap.jsx';
import { ErrorNote, Photo, Reveal, SeasonStrip, Skeleton, Stars } from '../components/Bits.jsx';
import { Magnetic, SplitWords, Tilt } from '../components/Motion.jsx';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';
import { useApi, useDocumentTitle, useToast } from '../lib/ui.jsx';
import { fmtDate, hours, npr } from '../lib/format.js';

const FACT = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

/** Hero photo that settles from a slight zoom as the page scrolls. */
function HeroPhoto({ d }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.08, 1.22]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);
  return (
    <motion.div ref={ref} className="place-hero-photo" initial={{ opacity: 0, clipPath: 'inset(12% 8% 12% 8% round 18px)' }} animate={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0% round 18px)' }} transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}>
      <motion.div style={{ scale, y, height: '100%' }}>
        <Photo src={d.image_url} alt={d.name} credit={d.image_credit} np={d.name_np} eager />
      </motion.div>
    </motion.div>
  );
}

export default function Place() {
  const { slug } = useParams();
  const { data, error, loading, reload } = useApi(`/destinations/${slug}`);
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [wish, setWish] = useState(null);
  useDocumentTitle(data?.destination.name);

  if (loading && !data) return <Page className="container section"><Skeleton h={420} r={18} /></Page>;
  if (error) return <Page className="container section"><ErrorNote error={error} onRetry={reload} /></Page>;
  const { destination: d, attractions, hotels, reviews, ratingDistribution, similar, alsoVisited } = data;
  const inWish = wish ?? data.inWishlist;
  const month = new Date().getMonth() + 1;

  const toggleWish = async () => {
    if (!user) return nav(`/login?next=/places/${slug}`);
    try {
      const r = await api(`/destinations/${d.id}/wishlist`, { method: 'POST' });
      setWish(r.inWishlist);
      toast(r.inWishlist ? `${d.name} saved to your wishlist` : 'Removed from wishlist');
    } catch (e) { toast(e.message, 'bad'); }
  };

  return (
    <Page className="place">
      <section className="container place-hero">
        <div className="place-hero-copy">
          <motion.span className="eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{d.province} Province</motion.span>
          <SplitWords key={d.slug} className="place-title">{d.name}</SplitWords>
          <motion.div className="np place-hero-np" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.08 }}>{d.name_np}</motion.div>
          <p className="lede">{d.tagline}</p>
          <motion.dl className="facts" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.3 } } }}>
            <motion.div variants={FACT}><dt><Mountain size={14} /> Altitude</dt><dd className="mono">{d.altitude_m.toLocaleString('en-IN')} m</dd></motion.div>
            <motion.div variants={FACT}><dt><Clock size={14} /> Stay</dt><dd className="mono">{d.min_days === d.ideal_days ? d.min_days : `${d.min_days}–${d.ideal_days}`} {d.ideal_days === 1 ? 'day' : 'days'}</dd></motion.div>
            <motion.div variants={FACT}><dt><Ticket size={14} /> Permit</dt><dd className="mono">{d.permit_fee ? npr(d.permit_fee) : 'None'}</dd></motion.div>
            <motion.div variants={FACT}><dt><Plane size={14} /> Airport</dt><dd className="mono">{d.has_airport ? 'Yes' : 'Road only'}</dd></motion.div>
            <motion.div className="facts-season" variants={FACT}><dt><CalendarDays size={14} /> Best months</dt><dd><SeasonStrip best={d.best_months} month={month} labels /></dd></motion.div>
          </motion.dl>
          {d.permit_note && <p className="small muted">{d.permit_note}{d.weather_risk ? ' · Flights here are often delayed by weather.' : ''}</p>}
          <div className="row" style={{ marginTop: 8 }}>
            <Magnetic><Link className="btn btn-primary btn-lg" to={`/plan?dest=${d.id}`}>Plan a trip here <ArrowRight size={18} className="arrow" /></Link></Magnetic>
            <button className="btn btn-ghost btn-lg" onClick={toggleWish} aria-pressed={inWish}>
              {inWish ? <BookmarkCheck size={18} /> : <Bookmark size={18} />} {inWish ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
        <HeroPhoto d={d} />
      </section>

      <section className="container place-body">
        <div className="place-main stack">
          <Reveal><p className="place-desc">{d.description}</p></Reveal>

          <Reveal as="section" className="stack">
            <div className="row between"><h2>Things to do</h2><span className="mono small muted">{attractions.length} sights</span></div>
            <ol className="sights">
              {attractions.slice().sort((a, b) => b.rating - a.rating).map((a, i) => (
                <motion.li key={a.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }}>
                  <span className="mono sight-n">{String(i + 1).padStart(2, '0')}</span>
                  <div className="grow">
                    <div className="row" style={{ gap: 8 }}><strong>{a.name}</strong><span className="tag">{a.category}</span></div>
                    <p className="small ink-2">{a.description}</p>
                  </div>
                  <div className="sight-meta mono small">
                    <span><Stars value={a.rating} size={11} /> {a.rating}</span>
                    <span className="muted">{hours(a.duration_hours)}</span>
                    <span>{a.entry_fee ? npr(a.entry_fee) : 'Free'}</span>
                  </div>
                </motion.li>
              ))}
            </ol>
          </Reveal>

          <Reveal as="section" className="stack">
            <h2>Where to stay</h2>
            <p className="small muted">Sample listings with typical prices per room per night. The planner picks one to fit your budget.</p>
            <div className="hotels">
              {hotels.map((h, i) => (
                <motion.div key={h.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.5 }}>
                  <Tilt max={5} className={`ticket hotel tier-${h.tier}`}>
                    <Photo src={h.image_url} alt={h.name} credit={h.image_credit} className="hotel-photo" />
                    <span className={`hotel-tier tier-badge-${h.tier}`}>{h.tier}</span>
                    <div className="hotel-top">
                      <strong className="hotel-name">{h.name}</strong>
                      <span className="mono hotel-price">{npr(h.price_per_night)}<small>/night</small></span>
                    </div>
                    <div className="perf" />
                    <div className="hotel-bottom">
                      <span className="row small" style={{ gap: 6 }}><Stars value={h.rating} size={11} /> <span className="mono">{h.rating}</span></span>
                      <div className="amenities">{h.amenities.split(',').map((a) => <span key={a} className="tag">{a}</span>)}</div>
                    </div>
                  </Tilt>
                </motion.div>
              ))}
            </div>
          </Reveal>

          <Reviews d={d} reviews={reviews} dist={ratingDistribution} myReview={data.myReview} onDone={reload} />
        </div>

        <aside className="place-aside">
          <div className="sticky stack">
            <RouteMap points={attractions.map((a, i) => ({ ...a, label: i + 1 }))} height={340} />
            <div className="panel small">
              <span className="label">Getting there</span>
              <p style={{ marginTop: 6 }}>Road times in the planner use real highway hours from Kathmandu and Pokhara, with an extra 30% in the monsoon (Jun–Sep).</p>
            </div>
          </div>
        </aside>
      </section>

      {(alsoVisited.length > 0 || similar.length > 0) && (
        <section className="container section">
          {alsoVisited.length > 0 && (
            <div className="stack" style={{ marginBottom: 48 }}>
              <h2>Travellers also went to</h2>
              <div className="place-grid compact">{alsoVisited.map((p, i) => <PlaceCard key={p.id} place={p} month={month} index={i} showReasons={false} />)}</div>
            </div>
          )}
          <div className="stack">
            <h2>Similar places</h2>
            <div className="place-grid compact">{similar.map((p, i) => <PlaceCard key={p.id} place={p} month={month} index={i} showReasons={false} />)}</div>
          </div>
        </section>
      )}
    </Page>
  );
}

function Reviews({ d, reviews, dist, myReview, onDone }) {
  const { user } = useAuth();
  const toast = useToast();
  const [rating, setRating] = useState(myReview?.rating || 0);
  const [comment, setComment] = useState(myReview?.comment || '');
  const [busy, setBusy] = useState(false);
  const total = dist.reduce((a, b) => a + b, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast('Pick a star rating first', 'bad');
    setBusy(true);
    try {
      await api(`/destinations/${d.id}/reviews`, { method: 'POST', body: { rating, comment } });
      toast('Thanks for the review');
      onDone();
    } catch (err) { toast(err.message, 'bad'); } finally { setBusy(false); }
  };

  return (
    <Reveal as="section" className="stack">
      <h2>Traveller reviews</h2>
      <div className="review-summary">
        <div className="stack-sm">
          <span className="review-avg mono">{d.avg_rating || '–'}</span>
          <Stars value={d.avg_rating} />
          <span className="tiny muted mono">{d.review_count} reviews</span>
        </div>
        <ul className="dist">
          {[5, 4, 3, 2, 1].map((n) => (
            <li key={n}>
              <span className="mono tiny">{n}★</span>
              <span className="dist-track"><motion.span initial={{ width: 0 }} whileInView={{ width: `${total ? (dist[n - 1] / total) * 100 : 0}%` }} viewport={{ once: true }} transition={{ duration: 0.8 }} /></span>
              <span className="mono tiny muted">{dist[n - 1]}</span>
            </li>
          ))}
        </ul>
      </div>

      {user ? (
        <form className="panel stack" onSubmit={submit}>
          <div className="row between">
            <strong>{myReview ? 'Update your review' : 'Been here? Rate it'}</strong>
            <Stars value={rating} size={20} onChange={setRating} />
          </div>
          <textarea className="textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What should the next traveller know?" maxLength={1000} />
          <div><button className="btn btn-ink" disabled={busy}>{busy ? 'Saving…' : 'Post review'}</button></div>
        </form>
      ) : (
        <p className="small muted"><Link to={`/login?next=/places/${d.slug}`}>Log in</Link> to leave a review.</p>
      )}

      <ul className="review-list">
        {reviews.map((r) => (
          <li key={r.id}>
            <div className="row between">
              <span className="row" style={{ gap: 10 }}><span className="avatar sm">{r.name[0]}</span><strong className="small">{r.name}</strong></span>
              <span className="row" style={{ gap: 8 }}><Stars value={r.rating} size={12} /><span className="mono tiny muted">{fmtDate(r.created_at, { month: 'short', year: 'numeric' })}</span></span>
            </div>
            {r.comment && <p className="small ink-2">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </Reveal>
  );
}
