import { Router } from 'express';
import { query } from '../db.js';
import { getCatalog, invalidateCatalog } from '../catalog.js';
import { optionalAuth, requireAuth, ah } from '../middleware/auth.js';
import { recommend, splitList, tagCosine, itemSimilarity } from '../algorithms/recommender.js';
import { searchDestinations } from '../algorithms/search.js';
import { INTEREST_TAGS, PACES, STYLES } from '../algorithms/planner.js';
import { haversine } from '../algorithms/geo.js';

const r = Router();

export const card = (d) => ({
  id: d.id, slug: d.slug, name: d.name, name_np: d.name_np, province: d.province, tagline: d.tagline,
  lat: d.lat, lng: d.lng, altitude_m: d.altitude_m, tags: splitList(d.tags), best_months: splitList(d.best_months).map(Number),
  min_days: d.min_days, ideal_days: d.ideal_days, image_url: d.image_url, image_credit: d.image_credit,
  avg_rating: Math.round(d.avg_rating * 10) / 10, review_count: d.review_count, is_start_city: !!d.is_start_city,
  daily_food_cost: d.daily_food_cost, permit_fee: d.permit_fee,
});

async function userSeeds(userId) {
  if (!userId) return { interests: '', seeds: [] };
  const [[u], wish, past] = await Promise.all([
    query('SELECT interests FROM users WHERE id = ?', [userId]),
    query('SELECT destination_id FROM wishlist WHERE user_id = ?', [userId]),
    query('SELECT td.destination_id FROM trip_destinations td JOIN trips t ON t.id = td.trip_id WHERE t.user_id = ?', [userId]),
  ]);
  return { interests: u?.interests || '', seeds: [...new Set([...wish, ...past].map((x) => x.destination_id))] };
}

r.get('/meta', ah(async (_req, res) => {
  const { destinations, attractionsByDest, hotelsByDest, roadLinks } = await getCatalog();
  const size = (m) => [...m.values()].reduce((s, a) => s + a.length, 0);
  res.json({
    counts: { destinations: destinations.length, attractions: size(attractionsByDest), hotels: size(hotelsByDest), roadLinks: roadLinks.length },
    interests: INTEREST_TAGS,
    styles: STYLES,
    paces: Object.entries(PACES).map(([key, hours]) => ({ key, hours })),
    provinces: [...new Set(destinations.map((d) => d.province))].sort(),
    // Kathmandu first: most trips start at the international airport.
    startCities: destinations.filter((d) => d.is_start_city)
      .sort((a, b) => (b.slug === 'kathmandu') - (a.slug === 'kathmandu') || a.name.localeCompare(b.name))
      .map((d) => ({ id: d.id, name: d.name, slug: d.slug })),
    destinations: destinations.map((d) => ({
      id: d.id, name: d.name, name_np: d.name_np, slug: d.slug, lat: d.lat, lng: d.lng, altitude_m: d.altitude_m,
      min_days: d.min_days, tags: splitList(d.tags), image_url: d.image_url,
    })),
  });
}));

// Photo credits for the Credits page (destinations + distinct hotel photos).
r.get('/credits', ah(async (_req, res) => {
  const { destinations, hotelsByDest } = await getCatalog();
  const seen = new Set();
  const hotels = [];
  for (const list of hotelsByDest.values()) {
    for (const hh of list) {
      if (!hh.image_credit || seen.has(hh.image_url)) continue;
      seen.add(hh.image_url);
      hotels.push({ image_url: hh.image_url, image_credit: hh.image_credit });
    }
  }
  res.json({
    destinations: destinations.filter((d) => d.image_credit).map((d) => ({ id: d.id, name: d.name, image_credit: d.image_credit })),
    hotels,
  });
}));

// GET /api/destinations?q=&tag=&province=&month=&sort=
r.get('/', optionalAuth, ah(async (req, res) => {
  const { destinations, attractionsByDest } = await getCatalog();
  const { q = '', tag = '', province = '', sort = 'recommended' } = req.query;
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const mine = await userSeeds(req.user?.id);
  const interests = req.query.interests !== undefined ? req.query.interests : mine.interests;

  let list = recommend(destinations, { interests, month, includeSeeds: true });
  if (tag) list = list.filter((d) => splitList(d.tags).includes(String(tag).toLowerCase()));
  if (province) list = list.filter((d) => d.province === province);

  let searchHits = null;
  if (String(q).trim()) {
    const docs = list.map((d) => ({ ...d, attractionNames: (attractionsByDest.get(d.id) || []).map((a) => a.name).join(' ') }));
    searchHits = new Map(searchDestinations(docs, q).map((h) => [h.id, h]));
    list = list.filter((d) => searchHits.has(d.id));
  }

  if (searchHits && sort === 'recommended') list.sort((a, b) => searchHits.get(b.id).score - searchHits.get(a.id).score);
  else if (sort === 'rating') list.sort((a, b) => b.signals.bayesian - a.signals.bayesian);
  else if (sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'altitude') list.sort((a, b) => b.altitude_m - a.altitude_m);

  res.json({
    month,
    results: list.map((d) => ({ ...card(d), score: d.score, reasons: d.reasons, signals: d.signals, match: searchHits?.get(d.id)?.matched })),
  });
}));

// Personalised picks with reasons.
r.get('/recommendations', optionalAuth, ah(async (req, res) => {
  const { destinations, cooc } = await getCatalog();
  const mine = await userSeeds(req.user?.id);
  const month = Number(req.query.month) || new Date().getMonth() + 1;
  const byId = new Map(destinations.map((d) => [d.id, d]));
  const list = recommend(destinations, {
    interests: req.query.interests !== undefined ? req.query.interests : mine.interests,
    month, cooc, seedIds: mine.seeds, nameOf: (id) => byId.get(id)?.name,
  });
  res.json({ month, results: list.slice(0, Number(req.query.limit) || 6).map((d) => ({ ...card(d), score: d.score, reasons: d.reasons, signals: d.signals })) });
}));

r.get('/:slug', optionalAuth, ah(async (req, res) => {
  const { destinations, attractionsByDest, hotelsByDest, cooc } = await getCatalog();
  const d = destinations.find((x) => x.slug === req.params.slug);
  if (!d) return res.status(404).json({ error: 'Destination not found' });

  const reviews = await query(
    `SELECT r.id, r.rating, r.comment, r.created_at, r.user_id, u.name FROM reviews r JOIN users u ON u.id = r.user_id
      WHERE r.destination_id = ? ORDER BY r.created_at DESC LIMIT 30`, [d.id]);
  const dist = [1, 2, 3, 4, 5].map((n) => reviews.filter((x) => x.rating === n).length);

  // Similar = tag cosine (70%) + closeness (30%). Also-visited = trip co-occurrence.
  const similar = destinations.filter((x) => x.id !== d.id).map((x) => ({
    x, s: 0.7 * tagCosine(d.tags, x.tags) + 0.3 * Math.max(0, 1 - haversine(d, x) / 400),
  })).sort((a, b) => b.s - a.s).slice(0, 4).map(({ x, s }) => ({ ...card(x), similarity: Math.round(s * 100) }));
  const alsoVisited = destinations.filter((x) => x.id !== d.id)
    .map((x) => ({ x, s: itemSimilarity(cooc, d.id, x.id) })).filter((y) => y.s > 0)
    .sort((a, b) => b.s - a.s).slice(0, 4).map(({ x, s }) => ({ ...card(x), similarity: Math.round(s * 100) }));

  let inWishlist = false, myReview = null;
  if (req.user) {
    inWishlist = (await query('SELECT 1 FROM wishlist WHERE user_id = ? AND destination_id = ?', [req.user.id, d.id])).length > 0;
    myReview = reviews.find((x) => x.user_id === req.user.id) || null;
  }

  res.json({
    destination: { ...card(d), description: d.description, permit_note: d.permit_note, has_airport: !!d.has_airport, weather_risk: !!d.weather_risk },
    attractions: attractionsByDest.get(d.id) || [],
    hotels: hotelsByDest.get(d.id) || [],
    reviews: reviews.map(({ user_id, ...rest }) => rest),
    ratingDistribution: dist,
    similar, alsoVisited, inWishlist, myReview,
  });
}));

r.post('/:id/reviews', requireAuth, ah(async (req, res) => {
  const rating = Number(req.body?.rating);
  const comment = String(req.body?.comment || '').slice(0, 1000);
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Rating must be 1 to 5' });
  const [d] = await query('SELECT id FROM destinations WHERE id = ?', [req.params.id]);
  if (!d) return res.status(404).json({ error: 'Destination not found' });
  await query(
    `INSERT INTO reviews (user_id, destination_id, rating, comment) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), created_at = CURRENT_TIMESTAMP`,
    [req.user.id, d.id, Math.round(rating), comment]
  );
  invalidateCatalog();
  res.status(201).json({ ok: true });
}));

r.post('/:id/wishlist', requireAuth, ah(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await query('SELECT 1 FROM wishlist WHERE user_id = ? AND destination_id = ?', [req.user.id, id]);
  if (existing.length) await query('DELETE FROM wishlist WHERE user_id = ? AND destination_id = ?', [req.user.id, id]);
  else await query('INSERT INTO wishlist (user_id, destination_id) VALUES (?,?)', [req.user.id, id]);
  res.json({ inWishlist: !existing.length });
}));

export default r;
