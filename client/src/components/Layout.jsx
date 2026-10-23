import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from 'framer-motion';
import { ArrowRight, ArrowUp, ChevronDown, LogOut, Map as MapIcon, Menu, Moon, Plus, Shield, Sun, User, X } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { useMeta, useTheme } from '../lib/ui.jsx';
import Logo from './Logo.jsx';
import Contours from './Contours.jsx';

export function Brand({ small, intro }) {
  return (
    <Link to="/" className={`brand ${small ? 'small' : ''}`} aria-label="Ghumfir home">
      <Logo size={small ? 30 : 34} intro={intro} />
      <span className="brand-word">Ghumfir</span>
      <span className="brand-np np">घुमफिर</span>
    </Link>
  );
}

function ThemeToggle() {
  const [theme, toggle] = useTheme();
  return (
    <button className="btn btn-quiet btn-icon theme-toggle" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={theme} initial={{ rotate: -90, opacity: 0, scale: 0.6 }} animate={{ rotate: 0, opacity: 1, scale: 1 }} exit={{ rotate: 90, opacity: 0, scale: 0.6 }} transition={{ duration: 0.25 }} style={{ display: 'grid' }}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const loc = useLocation();
  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return (
    <div className="user-menu" ref={ref}>
      <button className="user-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="avatar avatar-img" />
        ) : (
          <span className="avatar" aria-hidden="true">{user.name[0]}</span>
        )}
        <span className="nav-user-name">{user.name.split(' ')[0]}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} style={{ display: 'grid' }}><ChevronDown size={15} /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="user-drop" role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.18 }}>
            <div className="user-drop-head">
              <div className="row" style={{ gap: 10, alignItems: 'center', marginBottom: 4 }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="avatar avatar-img" />
                ) : (
                  <span className="avatar" aria-hidden="true">{user.name[0]}</span>
                )}
                <div>
                  <strong>{user.name}</strong>
                  {user.location && <div className="tiny muted">{user.location}</div>}
                </div>
              </div>
              <span className="mono tiny muted">{user.email}</span>
            </div>
            <Link to="/trips" role="menuitem" onClick={() => setOpen(false)}><MapIcon size={15} /> My trips</Link>
            <Link to="/plan" role="menuitem" onClick={() => setOpen(false)}><Plus size={15} /> New trip</Link>
            <Link to="/trips?tab=profile" role="menuitem" onClick={() => setOpen(false)}><User size={15} /> Profile</Link>
            {user.role === 'admin' && <Link to="/admin" role="menuitem" onClick={() => setOpen(false)}><Shield size={15} /> Admin panel</Link>}
            <button role="menuitem" onClick={() => { setOpen(false); onLogout(); }}><LogOut size={15} /> Log out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Nav() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const { scrollY, scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  // Condense into a floating pill once scrolled; slide away while scrolling down, return on scroll up.
  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(y > 12);
    setHidden(y > prev && y > 220);
  });

  const links = [
    { to: '/explore', label: 'Explore' },
    { to: '/plan', label: 'Plan a trip' },
    { to: '/how-it-works', label: 'How it works' },
    ...(user ? [{ to: '/trips', label: 'My trips' }] : []),
  ];
  // Leave protected pages first, otherwise their auth guard redirects to /login.
  const doLogout = () => { nav('/'); setTimeout(logout, 0); };

  return (
    <>
      <motion.header className={`nav ${scrolled ? 'scrolled' : ''}`} animate={{ y: hidden && !open ? -96 : 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
        <div className="nav-shell">
          <div className="nav-inner">
            <Brand intro={!scrolled} />
            <nav className="nav-links" aria-label="Main">
              {links.map((l) => (
                <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'active' : '')}>
                  {({ isActive }) => (
                    <>
                      {isActive && <motion.span layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 450, damping: 36 }} />}
                      <span className="nav-link-text">{l.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="nav-actions">
              <ThemeToggle />
              {user ? (
                <UserMenu user={user} onLogout={doLogout} />
              ) : (
                <>
                  <Link to="/login" className="btn btn-quiet nav-login">Log in</Link>
                  <Link to="/plan" className="btn btn-primary btn-sm nav-cta">Start planning <ArrowRight size={14} className="arrow" /></Link>
                </>
              )}
              <button className="btn btn-quiet btn-icon nav-burger" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
                <Menu size={20} />
              </button>
            </div>
          </div>
          <motion.div className="nav-progress" style={{ scaleX: progress }} />
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div className="nav-overlay" initial={{ clipPath: 'circle(0% at 95% 4%)' }} animate={{ clipPath: 'circle(150% at 95% 4%)' }} exit={{ clipPath: 'circle(0% at 95% 4%)' }} transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}>
            <Contours seed={9} peaks={3} rings={10} className="overlay-contours" />
            <div className="overlay-top">
              <Brand small />
              <button className="btn btn-quiet btn-icon" onClick={() => setOpen(false)} aria-label="Close menu"><X size={22} /></button>
            </div>
            <nav className="overlay-links" aria-label="Mobile">
              {[...links, ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []), ...(!user ? [{ to: '/login', label: 'Log in' }, { to: '/register', label: 'Create account' }] : [])].map((l, i) => (
                <motion.div key={l.to} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}>
                  <NavLink to={l.to}><span className="mono">{String(i + 1).padStart(2, '0')}</span>{l.label}</NavLink>
                </motion.div>
              ))}
              {user && (
                <motion.button className="linklike overlay-logout" onClick={doLogout} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>Log out</motion.button>
              )}
            </nav>
            <p className="np overlay-np">घुमफिर</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Ridge line of real destination altitudes, west to east (a tiny Nepal skyline). */
function Skyline({ places }) {
  const pts = useMemo(() => {
    const sorted = [...places].sort((a, b) => a.lng - b.lng);
    if (sorted.length < 2) return [];
    const minL = sorted[0].lng, maxL = sorted[sorted.length - 1].lng;
    const maxA = Math.max(...sorted.map((p) => p.altitude_m));
    return sorted.map((p) => ({ ...p, x: ((p.lng - minL) / (maxL - minL)) * 1000, y: 150 - (p.altitude_m / maxA) * 120 }));
  }, [places]);
  if (!pts.length) return null;
  // Smooth ridge: quadratic curves through the midpoints between neighbouring peaks.
  let line = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    line += ` Q${a.x.toFixed(1)} ${a.y.toFixed(1)} ${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  line += ` L${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  const top = pts.reduce((m, p) => (p.altitude_m > m.altitude_m ? p : m));
  return (
    <svg className="skyline" viewBox="0 -24 1000 184" preserveAspectRatio="none" aria-hidden="true">
      <motion.path d={`${line} L1000 160 L0 160 Z`} className="sky-fill" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1.2 }} />
      <motion.path d={line} className="sky-line" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 2.2, ease: 'easeInOut' }} />
      {pts.map((p) => <circle key={p.id} cx={p.x} cy={p.y} r="3" className="sky-dot" />)}
      <text x={top.x} y={top.y - 10} textAnchor="middle" className="sky-label">{top.name} · {top.altitude_m.toLocaleString('en-IN')} m</text>
    </svg>
  );
}

function NepalClock() {
  const fmt = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Kathmandu', hour: '2-digit', minute: '2-digit' });
  const [t, setT] = useState(fmt);
  useEffect(() => {
    const id = setInterval(() => setT(fmt()), 15000);
    return () => clearInterval(id);
  }, []);
  return <span className="mono tiny">Kathmandu <strong>{t}</strong> NPT</span>;
}

export function Footer() {
  const { meta } = useMeta();
  const { user } = useAuth();
  const places = meta?.destinations || [];
  const ticker = places.length ? [...places, ...places] : [];
  const featured = ['pokhara', 'chitwan', 'upper-mustang', 'lumbini', 'rara', 'bhaktapur'].map((s) => places.find((p) => p.slug === s)).filter(Boolean);

  return (
    <footer className="footer">
      <section className="footer-cta">
        <Contours seed={77} peaks={3} rings={10} className="footer-contours" />
        <div className="container footer-cta-inner">
          <div className="stack-sm">
            <span className="eyebrow plain footer-eyebrow">Your next loop</span>
            <h2 className="footer-cta-title">Where to next?</h2>
          </div>
          <Link to="/plan" className="btn btn-lg footer-cta-btn">Plan a trip <ArrowRight size={18} className="arrow" /></Link>
        </div>
        {ticker.length > 0 && (
          <div className="ticker" aria-label="Destinations">
            <div className="ticker-track">
              {ticker.map((p, i) => (
                <Link key={`${p.id}-${i}`} to={`/places/${p.slug}`} tabIndex={i >= places.length ? -1 : 0}>
                  {p.name} <span className="np">{p.name_np}</span> <span className="mono">{p.altitude_m.toLocaleString('en-IN')} m</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="container footer-grid">
        <div className="stack footer-brand">
          <Brand small />
          <p className="small ink-2">
            Plans Nepal trips around real road hours and real rupees: the shortest loop, stays and sights that fit your budget, and every cost shown before you go.
          </p>
          <span className="tag slate">Final-year project · CACS452</span>
        </div>
        <div className="footer-col">
          <span className="label">Plan</span>
          <Link to="/plan">New trip</Link>
          <Link to="/plan?auto=1">Pick places for me</Link>
          <Link to="/how-it-works">How the planner works</Link>
          <Link to="/explore">All destinations</Link>
        </div>
        <div className="footer-col">
          <span className="label">Popular</span>
          {featured.map((p) => <Link key={p.id} to={`/places/${p.slug}`}>{p.name}</Link>)}
        </div>
        <div className="footer-col">
          <span className="label">Account</span>
          {user ? <Link to="/trips">My trips</Link> : <Link to="/login">Log in</Link>}
          {!user && <Link to="/register">Create account</Link>}
          <Link to="/credits">Photo &amp; map credits</Link>
          <span className="tiny muted">Hotel listings are sample data.</span>
        </div>
      </div>

      <div className="container footer-sky">
        <Skyline places={places} />
        <div className="footer-word np" aria-hidden="true">घुमफिर</div>
      </div>

      <div className="container footer-base">
        <span className="mono tiny muted" title="Coordinates of Kathmandu, Nepal">Kathmandu · 27.7172° N, 85.3240° E</span>
        <NepalClock />
        <span className="mono tiny muted">© {new Date().getFullYear()} Ghumfir</span>
        <button className="btn btn-quiet btn-sm to-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
          <ArrowUp size={14} /> Top
        </button>
      </div>
    </footer>
  );
}

/** Page wrapper: route transition. */
export function Page({ children, className = '' }) {
  return (
    <motion.main className={className} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.main>
  );
}
