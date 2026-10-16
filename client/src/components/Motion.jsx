// Reusable motion effects. All of them become static when the visitor prefers reduced motion.
import { Children, useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';

const EASE = [0.22, 1, 0.36, 1];

/**
 * Headline that rises in word by word from behind a mask.
 * children: plain text, or text mixed with elements such as <em> (each element counts as one word).
 */
export function SplitWords({ children, as = 'h1', className = '', delay = 0, stagger = 0.06, inView = false }) {
  const Tag = motion[as];
  const words = [];
  Children.forEach(children, (child) => {
    if (typeof child === 'string') child.split(/(\s+)/).forEach((w) => w && words.push(w));
    else words.push(child);
  });
  const trigger = inView ? { whileInView: 'show', viewport: { once: true, margin: '-60px' } } : { animate: 'show' };
  return (
    <Tag className={`split ${className}`} initial="hidden" {...trigger} transition={{ staggerChildren: stagger, delayChildren: delay }}>
      {words.map((w, i) =>
        typeof w === 'string' && /^\s+$/.test(w) ? (
          ' '
        ) : (
          <span key={i} className="split-mask">
            <motion.span className="split-word" variants={{ hidden: { y: '110%', rotate: 4 }, show: { y: '0%', rotate: 0, transition: { duration: 0.8, ease: EASE } } }}>
              {w}
            </motion.span>
          </span>
        )
      )}
    </Tag>
  );
}

/** Pulls its child a little toward the cursor, then springs back. */
export function Magnetic({ children, strength = 0.25, className = '' }) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 250, damping: 18 });
  const y = useSpring(0, { stiffness: 250, damping: 18 });
  const onMove = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  return (
    <motion.span className={`magnetic ${className}`} style={{ x, y, display: 'inline-flex' }} onPointerMove={onMove} onPointerLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

/** 3D tilt toward the pointer with a soft glare. */
export function Tilt({ children, max = 6, className = '', style }) {
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 200, damping: 20 });
  const ry = useSpring(0, { stiffness: 200, damping: 20 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const glare = useTransform([gx, gy], ([a, b]) => `radial-gradient(circle at ${a}% ${b}%, rgba(255,255,255,0.18), transparent 55%)`);
  const onMove = (e) => {
    if (reduce || e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    ry.set((px - 0.5) * 2 * max);
    rx.set(-(py - 0.5) * 2 * max);
    gx.set(px * 100);
    gy.set(py * 100);
  };
  return (
    <motion.div className={`tilt ${className}`} style={{ ...style, rotateX: rx, rotateY: ry, transformPerspective: 900 }} onPointerMove={onMove} onPointerLeave={() => { rx.set(0); ry.set(0); }}>
      {children}
      <motion.span className="tilt-glare" style={{ background: glare }} aria-hidden="true" />
    </motion.div>
  );
}

/** Moves its child vertically as the element scrolls through the viewport. */
export function Parallax({ children, offset = 60, className = '' }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [offset, -offset]);
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}

/** Pointer-follow offset for decorative layers (e.g. hero contours). */
export function usePointerParallax(range = 18) {
  const reduce = useReducedMotion();
  const x = useSpring(0, { stiffness: 60, damping: 20 });
  const y = useSpring(0, { stiffness: 60, damping: 20 });
  const onPointerMove = (e) => {
    if (reduce) return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * range * 2);
    y.set(((e.clientY - r.top) / r.height - 0.5) * range * 2);
  };
  return { x, y, onPointerMove };
}
