// Loads everything the planner/recommender needs into memory, with a short cache.
// Admin edits call invalidateCatalog() so changes show up immediately.
import { query } from './db.js';
import { buildCooccurrence } from './algorithms/recommender.js';
import { createPlanner } from './algorithms/planner.js';

let cached = null;
let cachedAt = 0;
const TTL_MS = 60_000;

export function invalidateCatalog() {
  cached = null;
}

/** Shapes raw rows into the catalog structure (also used by tests with seed data). */
export function buildCatalog({ destinations, attractions, hotels, roadLinks, tripStops }) {
  const group = (rows) => {
    const m = new Map();
    for (const r of rows) {
      if (!m.has(r.destination_id)) m.set(r.destination_id, []);
      m.get(r.destination_id).push(r);
    }
    return m;
  };
  const catalog = {
    destinations,
    attractionsByDest: group(attractions),
    hotelsByDest: group(hotels),
    roadLinks,
    cooc: buildCooccurrence(tripStops),
  };
  catalog.planner = createPlanner(catalog);
  return catalog;
}

export async function getCatalog() {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  const [destinations, attractions, hotels, roadLinks, tripStops] = await Promise.all([
    query(`SELECT d.*, COALESCE(AVG(r.rating), 0) AS avg_rating, COUNT(r.id) AS review_count
             FROM destinations d LEFT JOIN reviews r ON r.destination_id = d.id
            GROUP BY d.id ORDER BY d.name`),
    query('SELECT * FROM attractions'),
    query('SELECT * FROM hotels ORDER BY price_per_night'),
    query('SELECT * FROM road_links'),
    query('SELECT trip_id, destination_id FROM trip_destinations'),
  ]);
  for (const d of destinations) {
    d.avg_rating = Number(d.avg_rating);
    d.review_count = Number(d.review_count);
  }
  cached = buildCatalog({ destinations, attractions, hotels, roadLinks, tripStops });
  cachedAt = Date.now();
  return cached;
}
