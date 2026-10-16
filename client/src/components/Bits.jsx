import { useEffect, useRef, useState } from 'react';
import { animate, motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { Star, ChevronDown } from 'lucide-react';
import { MONTHS } from '../lib/format.js';

/** Fades/rises children in when they scroll into view. */
export function Reveal({ children, delay = 0, y = 18, className = '', as = 'div' }) {
  const M = motion[as];
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </M>
  );
}

/** Animated number (counts up once it is visible). */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString('en-IN'), duration = 1.1 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  // Track the number actually on screen, so a cancelled animation (StrictMode
  // re-runs effects) resumes from where it stopped instead of jumping.
  const current = useRef(reduce ? value : 0);
  useEffect(() => {
    if (!inView) return;
    if (reduce) { current.current = value; setShown(value); return; }
    const c = animate(current.current, value, {
      duration, ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => { current.current = v; setShown(v); },
    });
    return () => c.stop();
  }, [value, inView, reduce, duration]);
  return <span ref={ref} className="mono">{format(shown)}</span>;
}

/** 12-month strip; best months filled, current month outlined. */
export function SeasonStrip({ best = [], month = new Date().getMonth() + 1, labels = false }) {
  const bestText = best.length ? `Best season: ${best.map((m) => MONTHS[m - 1]).join(', ')}` : 'Best season: Any time';
  return (
    <div className="season-wrap" title={bestText}>
      <div className="season">
        {MONTHS.map((m, i) => (
          <span
            key={m}
            className={`${best.includes(i + 1) ? 'best' : ''} ${month === i + 1 ? 'now' : ''}`}
            aria-label={`${m}: ${best.includes(i + 1) ? 'Best' : 'Regular'}`}
          />
        ))}
      </div>
      {labels && (
        <div className="season-labels">{MONTHS.map((m) => <span key={m}>{m[0]}</span>)}</div>
      )}
    </div>
  );
}

/** Photo with graceful fallback (Devanagari initial on contour paper) and visible credit. */
export function Photo({ src, alt, credit, np, className = '', style, eager = false, nested = false }) {
  const [failed, setFailed] = useState(!src);
  const [loaded, setLoaded] = useState(false);
  const parts = (credit || '').split(' · ');
  const link = parts.find((p) => p.startsWith('http'));
  return (
    <div className={`photo ${className}`} style={style}>
      {!failed && (
        <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer"
          style={{ opacity: loaded ? 1 : 0 }} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
      )}
      {(failed || !loaded) && <div className="fallback np" aria-hidden="true">{np?.[0] || ''}</div>}
      {credit && !failed && (nested ? (
        // Inside a card link: a nested <a> is invalid HTML, so show plain text (full credits page links out).
        <span className="credit" title={credit}>© {parts[0]} · {parts[1]}</span>
      ) : (
        <a className="credit" href={link} target="_blank" rel="noreferrer" title={credit}>
          © {parts[0]} · {parts[1]}
        </a>
      ))}
    </div>
  );
}

export function Stars({ value = 0, size = 14, onChange }) {
  return (
    <span className="stars" role={onChange ? 'radiogroup' : 'img'} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const fill = value >= n - 0.25 ? 'currentColor' : 'none';
        const icon = <Star size={size} fill={fill} strokeWidth={1.6} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star`} onClick={() => onChange(n)}>{icon}</button>
        ) : <span key={n}>{icon}</span>;
      })}
    </span>
  );
}

export function Stepper({ value, onChange, min = 1, max = 30, suffix = '', label }) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Fewer ${label}`}>−</button>
      <output aria-live="polite">{value}{suffix}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`More ${label}`}>+</button>
    </div>
  );
}

export function Segmented({ options, value, onChange, id }) {
  return (
    <div className="segmented" role="radiogroup">
      {options.map((o) => {
        const key = typeof o === 'string' ? o : o.key;
        const label = typeof o === 'string' ? o : o.label;
        return (
          <button key={key} type="button" role="radio" aria-checked={value === key} className={value === key ? 'on' : ''} onClick={() => onChange(key)}>
            {value === key && <motion.span layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Chips({ options, value = [], onChange, max }) {
  const toggle = (o) => {
    if (value.includes(o)) onChange(value.filter((x) => x !== o));
    else if (!max || value.length < max) onChange([...value, o]);
  };
  return (
    <div className="chips">
      {options.map((o, i) => (
        <motion.button key={o} type="button" className={`chip ${value.includes(o) ? 'on' : ''}`} onClick={() => toggle(o)} aria-pressed={value.includes(o)}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.03 }} whileTap={{ scale: 0.92 }} whileHover={{ y: -2 }}>
          {o}
        </motion.button>
      ))}
    </div>
  );
}

export function Range({ value, onChange, min, max, step = 1, label }) {
  const p = ((value - min) / (max - min)) * 100;
  return (
    <input className="range" type="range" min={min} max={max} step={step} value={value} aria-label={label}
      style={{ '--p': `${p}%` }} onChange={(e) => onChange(Number(e.target.value))} />
  );
}

export function Skeleton({ h = 20, w = '100%', r }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r }} />;
}

export function Modal({ open, onClose, children, label }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" role="dialog" aria-modal="true" aria-label={label} initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ ease: [0.22, 1, 0.36, 1] }}>
        {children}
      </motion.div>
    </motion.div>
  );
}

export function ErrorNote({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="empty">
      <h3>That didn't load</h3>
      <p>{error.message}</p>
      {onRetry && <button className="btn btn-sm" style={{ marginTop: 16 }} onClick={onRetry}>Try again</button>}
    </div>
  );
}

/** Custom dropdown matching Ghumfir's warm system design. */
export function CustomSelect({ value, onChange, options = [], ariaLabel, className = '', id, style }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const normalized = options.map((opt) =>
    typeof opt === 'object' && opt !== null && 'value' in opt
      ? opt
      : { value: opt, label: opt }
  );

  const selected = normalized.find((o) => String(o.value) === String(value ?? '')) || normalized[0] || { value: '', label: '' };
  const isPlaceholder = !selected.value && selected.value !== 0;

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`custom-select-wrap ${className}`} ref={ref} style={style}>
      <button
        type="button"
        id={id}
        className="custom-select-btn"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`custom-select-val ${isPlaceholder ? 'is-placeholder' : ''}`}>
          {selected.label}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="custom-select-arrow" style={{ display: 'grid' }}>
          <ChevronDown size={15} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className="custom-select-menu"
            role="listbox"
            aria-label={ariaLabel}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {normalized.map((opt) => {
              const isSelected = String(opt.value) === String(value ?? '');
              return (
                <li
                  key={String(opt.value)}
                  role="option"
                  aria-selected={isSelected}
                  className={`custom-select-item ${isSelected ? 'active' : ''}`}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span>{opt.label}</span>
                  {isSelected && <span className="custom-select-check">✓</span>}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

