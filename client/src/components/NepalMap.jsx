import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';

// A survey-style plot of Nepal drawn from the real coordinates of each destination.
// No borrowed map artwork: points are projected (equirectangular, cos-lat corrected)
// onto a graticule, and the route is drawn as a line that "inks in".

export const NEPAL = { minLng: 80.0, maxLng: 88.3, minLat: 26.3, maxLat: 30.5 };
const W = 800;

function makeProjection(b) {
  const midLat = ((b.minLat + b.maxLat) / 2) * (Math.PI / 180);
  const H = Math.round(W * ((b.maxLat - b.minLat) / ((b.maxLng - b.minLng) * Math.cos(midLat))));
  const project = (lat, lng) => ({
    x: ((lng - b.minLng) / (b.maxLng - b.minLng)) * W,
    y: ((b.maxLat - lat) / (b.maxLat - b.minLat)) * H,
  });
  return { H, project };
}

/**
 * places: [{id, name, lat, lng}]
 * route: [id, id, ...] (closed loop drawn if `loop`)
 * selected: Set of ids; onToggle(id) makes the map a picker.
 * bounds: lat/lng window to show (defaults to all of Nepal).
 */
export default function NepalMap({ places = [], route = [], loop = true, selected, onToggle, startId, labels = 'route', className = '', drawKey, bounds = NEPAL, scale = 1, traveller = false }) {
  const [hover, setHover] = useState(null);
  const { H, project } = useMemo(() => makeProjection(bounds), [bounds]);
  const byId = useMemo(() => new Map(
    places
      .filter((p) => p.lat >= bounds.minLat && p.lat <= bounds.maxLat && p.lng >= bounds.minLng && p.lng <= bounds.maxLng)
      .map((p) => [p.id, { ...p, ...project(p.lat, p.lng) }])
  ), [places, bounds, project]);
  const pts = route.map((id) => byId.get(id)).filter(Boolean);
  const routePts = loop && pts.length > 1 ? [...pts, pts[0]] : pts;
  const d = routePts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const inRoute = new Set(route);

  // graticule every 1° (or 0.5° when zoomed in)
  const step = bounds.maxLng - bounds.minLng > 4 ? 1 : 0.5;
  const graticule = [];
  for (let lng = Math.ceil(bounds.minLng / step) * step; lng <= bounds.maxLng; lng += step) {
    const x = project(0, lng).x;
    graticule.push({ x1: x, y1: 0, x2: x, y2: H, label: `${lng.toFixed(step < 1 ? 1 : 0)}°E`, v: true });
  }
  for (let lat = Math.ceil(bounds.minLat / step) * step; lat <= bounds.maxLat; lat += step) {
    const y = project(lat, bounds.minLng).y;
    graticule.push({ x1: 0, y1: y, x2: W, y2: y, label: `${lat.toFixed(step < 1 ? 1 : 0)}°N` });
  }
  const s = scale;

  return (
    <svg className={`nepal-map ${className}`} viewBox={`-20 -20 ${W + 40} ${H + 40}`} role="img" aria-label="Map of destinations in Nepal" style={{ '--s': s }}>
      <g className="graticule">
        {graticule.map((g, i) => (
          <g key={i}>
            <line x1={g.x1} y1={g.y1} x2={g.x2} y2={g.y2} />
            <text x={g.v ? g.x1 + 4 : 4} y={g.v ? H - 6 : g.y1 - 5} fontSize={11 * s}>{g.label}</text>
          </g>
        ))}
      </g>

      {d && (
        <motion.path
          key={drawKey ?? route.join('-')}
          d={d}
          className="route-line"
          strokeWidth={3 * s}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.8, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
        />
      )}
      {d && traveller && routePts.length > 1 && (
        // SVG animateMotion: the marker rides the route once it has been drawn.
        <g className="traveller" opacity="0" key={`t-${route.join('-')}`}>
          <animate attributeName="opacity" from="0" to="1" begin="2.1s" dur="0.4s" fill="freeze" />
          <circle r={8 * s} className="traveller-halo" />
          <circle r={4.2 * s} className="traveller-dot" />
          <animateMotion dur={`${Math.max(6, routePts.length * 2.2)}s`} begin="2.1s" repeatCount="indefinite" path={d} />
        </g>
      )}

      {[...byId.values()].map((p) => {
        const on = selected ? selected.has(p.id) : inRoute.has(p.id);
        const isStart = p.id === startId;
        const order = route.indexOf(p.id);
        const showLabel = labels === 'all' || on || isStart || hover === p.id;
        const r = (on ? 6 : 3.5) * s;
        return (
          <g
            key={p.id}
            transform={`translate(${p.x} ${p.y})`}
            className={`pin ${on ? 'on' : ''} ${isStart ? 'start' : ''} ${onToggle ? 'clickable' : ''}`}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            onClick={onToggle && !isStart ? () => onToggle(p.id) : undefined}
            role={onToggle && !isStart ? 'button' : undefined}
            tabIndex={onToggle && !isStart ? 0 : undefined}
            onKeyDown={onToggle && !isStart ? (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onToggle(p.id)) : undefined}
            aria-label={onToggle ? `${on ? 'Remove' : 'Add'} ${p.name}` : p.name}
          >
            <circle r={(onToggle ? 16 : 10) * s} className="hit" />
            {isStart ? <rect x={-6 * s} y={-6 * s} width={12 * s} height={12 * s} transform="rotate(45)" /> : <circle r={r} />}
            {on && !isStart && order > 0 && !selected && s >= 1.5 && (
              <text className="order" y={3.5 * s} textAnchor="middle" fontSize={9 * s}>{order}</text>
            )}
            {showLabel && (
              <text className="pin-label" x={10 * s} y={-9 * s} fontSize={15 * s}>{p.name}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
