import { motion } from 'framer-motion';

// Ghumfir mark: one continuous stroke draws the twin "fishtail" ridge like a route
// on a map, with a marigold sun and a dotted road below (ghumfir = to roam).
// Flat, two-colour and fixed so it reads the same at 16px, in light and in dark.
export const MARK = {
  tile: '#B4472C',
  line: '#FBF8F2',
  sun: '#E9B04F',
  ridge: 'M11 43 L24 24 L31.5 34 L39 18 L53 43',
  road: 'M14 51.5 H50',
};

export default function Logo({ size = 32, className = '', intro = false }) {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={`logo ${className}`}
      aria-hidden="true"
      initial={intro ? 'hidden' : 'rest'}
      animate="rest"
      whileHover="hover"
    >
      <rect width="64" height="64" rx="16" fill={MARK.tile} />
      <motion.circle
        cx="50" cy="16" r="5" fill={MARK.sun}
        variants={{
          hidden: { scale: 0, opacity: 0 },
          rest: { scale: 1, opacity: 1, y: 0, transition: { delay: intro ? 0.6 : 0, type: 'spring', stiffness: 300, damping: 18 } },
          hover: { y: [0, -3, 0], transition: { duration: 0.6 } },
        }}
      />
      <motion.path
        d={MARK.ridge}
        fill="none"
        stroke={MARK.line}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0 },
          rest: { pathLength: 1, transition: { duration: 0.9, ease: [0.65, 0, 0.35, 1] } },
          hover: { pathLength: [0, 1], transition: { duration: 0.7, ease: [0.65, 0, 0.35, 1] } },
        }}
      />
      <motion.path
        d={MARK.road}
        fill="none"
        stroke={MARK.sun}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeDasharray="0.5 7.5"
        variants={{
          hidden: { strokeDashoffset: 16, opacity: 0 },
          rest: { strokeDashoffset: 0, opacity: 1, transition: { delay: intro ? 0.4 : 0, duration: 0.6 } },
          hover: { strokeDashoffset: [16, 0], transition: { duration: 0.7, ease: 'linear' } },
        }}
      />
    </motion.svg>
  );
}
