import { useMemo } from 'react';
import { motion } from 'framer-motion';

// Procedural topographic contour lines: rings around a few "peaks", each ring
// radius modulated by a sum of sines so it looks like hand-surveyed terrain.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function ringPath(cx, cy, r, waves, steps = 72) {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    let rr = r;
    for (const w of waves) rr += w.a * Math.sin(w.f * t + w.p);
    const x = cx + rr * Math.cos(t);
    const y = cy + rr * Math.sin(t) * 0.72;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

export default function Contours({ seed = 7, peaks = 3, rings = 9, width = 1200, height = 700, animate = true, className = '' }) {
  const paths = useMemo(() => {
    const rand = rng(seed);
    const out = [];
    for (let p = 0; p < peaks; p++) {
      const cx = width * (0.15 + rand() * 0.75);
      const cy = height * (0.2 + rand() * 0.65);
      const waves = Array.from({ length: 4 }, () => ({ a: 4 + rand() * 14, f: 2 + Math.floor(rand() * 5), p: rand() * 6.28 }));
      const gap = 22 + rand() * 18;
      for (let k = 1; k <= rings; k++) {
        const grown = waves.map((w) => ({ ...w, a: w.a * (1 + k * 0.18) }));
        out.push({ d: ringPath(cx, cy, k * gap, grown), major: k % 4 === 0, k });
      }
    }
    return out;
  }, [seed, peaks, rings, width, height]);

  return (
    <svg className={`contours ${className}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {paths.map((p, i) => (
        <motion.path
          key={i}
          d={p.d}
          fill="none"
          stroke="var(--contour)"
          strokeWidth={p.major ? 1.6 : 0.9}
          initial={animate ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 2.2, delay: 0.02 * p.k + 0.1, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
    </svg>
  );
}
