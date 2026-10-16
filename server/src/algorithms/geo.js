// Distances, Nepal-realistic road times and transport-mode choice for one leg.

const EARTH_KM = 6371;
const toRad = (d) => (d * Math.PI) / 180;

/** Great-circle distance between two {lat,lng} points (Haversine formula). */
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

const WINDING = 1.55; // Nepal hill roads are ~55% longer than the straight line
const AVG_SPEED = 30; // km/h, realistic for highway buses incl. stops
export const MONSOON_MONTHS = [6, 7, 8, 9];
const MONSOON_FACTOR = 1.3;
const FLIGHT_HUBS = ['kathmandu', 'pokhara'];

/**
 * Builds a road lookup: known links from the DB first, haversine estimate otherwise.
 * links: [{from_id, to_id, road_km, road_hours, note}]
 */
export function createRoadGraph(links) {
  const map = new Map();
  for (const l of links) {
    const v = { km: Number(l.road_km), hours: Number(l.road_hours), note: l.note || '', known: true };
    map.set(`${l.from_id}-${l.to_id}`, v);
    map.set(`${l.to_id}-${l.from_id}`, v);
  }
  return function road(a, b) {
    if (a.id === b.id) return { km: 0, hours: 0, note: '', known: true };
    const hit = map.get(`${a.id}-${b.id}`);
    if (hit) return hit;
    const km = haversine(a, b) * WINDING;
    const access = Math.max(Number(a.access_factor) || 1, Number(b.access_factor) || 1);
    return { km: Math.round(km), hours: Math.round((km / AVG_SPEED) * access * 10) / 10, note: 'Estimated', known: false };
  };
}

/** All feasible modes for a leg with cost for the whole group and door-to-door hours. */
export function legOptions(a, b, road, { travelers, month }) {
  const r = road(a, b);
  const monsoon = MONSOON_MONTHS.includes(month);
  const roadHours = Math.round(r.hours * (monsoon ? MONSOON_FACTOR : 1) * 10) / 10;
  const options = [
    { mode: 'bus', label: 'Tourist bus', hours: roadHours, cost: Math.round(r.km * 6.5) * travelers },
    {
      mode: 'jeep', label: 'Private jeep',
      hours: Math.round(roadHours * 0.85 * 10) / 10,
      cost: Math.ceil(travelers / 4) * Math.round(r.km * 65),
    },
  ];
  const hubLeg = FLIGHT_HUBS.includes(a.slug) || FLIGHT_HUBS.includes(b.slug);
  if (a.has_airport && b.has_airport && hubLeg && r.km > 80) {
    const air = haversine(a, b);
    options.push({
      mode: 'flight', label: 'Domestic flight',
      hours: Math.round((air / 250 + 2.5) * 10) / 10, // +2.5 h for transfers and check-in
      cost: Math.round(3000 + air * 14) * travelers,
      weatherRisk: !!(a.weather_risk || b.weather_risk),
    });
  }
  return { km: r.km, note: r.note, known: r.known, monsoon, options };
}

/** Picks a mode by travel style: budget = cheapest, standard = bus unless it is a slog, premium = fastest. */
export function chooseMode(options, style) {
  const byCost = [...options].sort((x, y) => x.cost - y.cost);
  const byTime = [...options].sort((x, y) => x.hours - y.hours);
  if (style === 'budget') return byCost[0];
  if (style === 'premium') return byTime[0];
  const bus = options.find((o) => o.mode === 'bus');
  const flight = options.find((o) => o.mode === 'flight');
  if (bus.hours > 9 && flight) return flight;
  return bus;
}
