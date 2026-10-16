import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Standard OpenStreetMap tiles (free, attribution required). They are toned to the
// paper palette with a CSS filter, and inverted for dark mode (see .route-map in pages.css).
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const pinIcon = (label, kind) =>
  L.divIcon({
    className: '',
    html: `<div class="map-pin ${kind}"><span>${label}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

// Leaflet measures its container once, but page transitions change that size,
// so re-measure and re-fit whenever the container resizes.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    const fit = () => {
      map.invalidateSize();
      if (!points.length) return;
      if (points.length === 1) map.setView(points[0], 11);
      else map.fitBounds(points, { padding: [36, 36] });
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, points]);
  return null;
}

/**
 * start: {name, lat, lng}; stops: [{name, lat, lng, arriveBy:{mode}}]; returnMode
 * or `points` mode: [{name, lat, lng, label}] for simple marker sets.
 */
export default function RouteMap({ start, stops = [], returnMode, points, height = 420, scrollWheelZoom = false }) {
  const seq = useMemo(() => (start ? [start, ...stops] : []), [start, stops]);
  const all = useMemo(
    () => (points || seq).map((p) => [Number(p.lat), Number(p.lng)]),
    [points, seq]
  );

  const segments = useMemo(() => {
    if (!start) return [];
    const segs = stops.map((s, i) => ({ from: seq[i], to: s, mode: s.arriveBy?.mode }));
    if (stops.length) segs.push({ from: stops[stops.length - 1], to: start, mode: returnMode });
    return segs;
  }, [start, stops, seq, returnMode]);

  return (
    <div className="route-map" style={{ height }}>
      <MapContainer center={[28.2, 84.1]} zoom={7} scrollWheelZoom={scrollWheelZoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} maxZoom={18} />
        <FitBounds points={all} />
        {segments.map((s, i) => (
          <Polyline key={i} positions={[[s.from.lat, s.from.lng], [s.to.lat, s.to.lng]]}
            pathOptions={{ color: s.mode === 'flight' ? '#2e4a5a' : '#b4472c', weight: 3, dashArray: s.mode === 'flight' ? '2 8' : undefined, opacity: 0.9 }} />
        ))}
        {start && (
          <Marker position={[start.lat, start.lng]} icon={pinIcon('◆', 'start')}>
            <Tooltip direction="top" offset={[0, -12]}>{start.name} (start)</Tooltip>
          </Marker>
        )}
        {(points || stops).map((p, i) => (
          <Marker key={`${p.name}-${i}`} position={[p.lat, p.lng]} icon={pinIcon(p.label ?? i + 1, 'stop')}>
            <Tooltip direction="top" offset={[0, -14]} opacity={1} className={p.image_url ? 'map-rich-tooltip' : ''}>
              {p.image_url ? (
                <div className="map-preview-card">
                  <div className="map-preview-media">
                    <img src={p.image_url} alt={p.name} loading="lazy" />
                  </div>
                  <div className="map-preview-body">
                    <div className="map-preview-title">
                      <strong>{p.name}</strong>
                      {p.name_np && <span className="np muted">{p.name_np}</span>}
                    </div>
                    {p.tagline && <p className="map-preview-tagline">{p.tagline}</p>}
                    <div className="map-preview-meta">
                      {p.altitude_m && (
                        <span className="mono tiny">⛰ {Number(p.altitude_m).toLocaleString('en-IN')} m</span>
                      )}
                      {p.avg_rating > 0 && (
                        <span className="mono tiny map-preview-rating">★ {p.avg_rating}</span>
                      )}
                      {p.province && <span className="tiny muted">{p.province}</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <span>{p.name}</span>
              )}
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
