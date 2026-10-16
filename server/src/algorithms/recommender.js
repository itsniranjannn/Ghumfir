// Hybrid destination recommender with human-readable reasons.
//
// score = 0.40 interest match (cosine on tag vectors)
//       + 0.25 Bayesian-average rating
//       + 0.20 season fit
//       + 0.15 item-item collaborative signal ("travellers who went to A also went to B")
// When the user has no history, the collaborative weight is redistributed.

export const splitList = (s) =>
  (Array.isArray(s) ? s : String(s || '').split(','))
    .map((x) => String(x).trim().toLowerCase())
    .filter(Boolean);

/** Cosine similarity of two binary tag sets. */
export function tagCosine(a, b) {
  const A = new Set(splitList(a));
  const B = new Set(splitList(b));
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const t of A) if (B.has(t)) common++;
  return common / Math.sqrt(A.size * B.size);
}

/**
 * Bayesian average: pulls ratings with few votes toward the global mean, so
 * one 5-star review cannot beat fifty 4.6-star reviews.
 */
export function bayesianRating(avg, count, globalMean, m = 5) {
  count = Number(count) || 0;
  avg = Number(avg) || 0;
  return (m * globalMean + count * avg) / (m + count);
}

/** 1 in a best month, 0.5 in a month next to one, 0 otherwise. */
export function seasonFit(bestMonths, month) {
  const months = splitList(bestMonths).map(Number);
  if (!month || !months.length) return 0.5;
  if (months.includes(month)) return 1;
  const prev = month === 1 ? 12 : month - 1;
  const next = month === 12 ? 1 : month + 1;
  return months.includes(prev) || months.includes(next) ? 0.5 : 0;
}

/**
 * Item-item co-occurrence from saved trips.
 * tripStops: [{trip_id, destination_id}]  ->  { count: Map(id->n), pair: Map("a-b"->n) }
 */
export function buildCooccurrence(tripStops) {
  const byTrip = new Map();
  for (const r of tripStops) {
    if (!byTrip.has(r.trip_id)) byTrip.set(r.trip_id, []);
    byTrip.get(r.trip_id).push(r.destination_id);
  }
  const count = new Map();
  const pair = new Map();
  for (const ids of byTrip.values()) {
    for (const a of ids) {
      count.set(a, (count.get(a) || 0) + 1);
      for (const b of ids) if (a !== b) pair.set(`${a}-${b}`, (pair.get(`${a}-${b}`) || 0) + 1);
    }
  }
  return { count, pair };
}

/** Cosine-normalised co-occurrence between item a and b (0..1). */
export function itemSimilarity(cooc, a, b) {
  const n = cooc.pair.get(`${a}-${b}`) || 0;
  if (!n) return 0;
  return n / Math.sqrt((cooc.count.get(a) || 1) * (cooc.count.get(b) || 1));
}

/**
 * destinations: rows with id, tags, best_months, avg_rating, review_count
 * ctx: { interests: [], month, seedIds: [] (wishlist/past trips), cooc }
 */
export function recommend(destinations, ctx) {
  const interests = splitList(ctx.interests);
  const seeds = (ctx.seedIds || []).map(Number);
  const rated = destinations.filter((d) => Number(d.review_count) > 0);
  const globalMean = rated.length
    ? rated.reduce((s, d) => s + Number(d.avg_rating), 0) / rated.length
    : 4;

  const useCollab = seeds.length > 0 && ctx.cooc;
  const W = useCollab
    ? { interest: 0.4, rating: 0.25, season: 0.2, collab: 0.15 }
    : { interest: 0.47, rating: 0.3, season: 0.23, collab: 0 };

  return destinations
    .filter((d) => !seeds.includes(d.id) || ctx.includeSeeds)
    .map((d) => {
      const interest = interests.length ? tagCosine(interests, d.tags) : 0.5;
      const bayes = bayesianRating(d.avg_rating, d.review_count, globalMean);
      const rating = Math.max(0, (bayes - 1) / 4); // 1..5 -> 0..1
      const season = seasonFit(d.best_months, ctx.month);
      let collab = 0, collabFrom = null;
      if (useCollab) {
        for (const s of seeds) {
          const sim = itemSimilarity(ctx.cooc, s, d.id);
          if (sim > collab) { collab = sim; collabFrom = s; }
        }
      }
      const score = W.interest * interest + W.rating * rating + W.season * season + W.collab * collab;

      const reasons = [];
      const shared = splitList(d.tags).filter((t) => interests.includes(t));
      if (shared.length) reasons.push(`Matches your interest in ${shared.slice(0, 2).join(' & ')}`);
      if (season === 1) reasons.push('In season for your travel month');
      else if (season === 0) reasons.push('Off season for your month');
      if (Number(d.review_count) > 0) reasons.push(`Rated ${Number(d.avg_rating).toFixed(1)} by ${d.review_count} travellers`);
      if (collabFrom) reasons.push(`Often paired with ${ctx.nameOf?.(collabFrom) || 'places you like'}`);

      return {
        ...d,
        score: Math.round(score * 1000) / 10,
        signals: {
          interest: Math.round(interest * 100),
          rating: Math.round(rating * 100),
          season: Math.round(season * 100),
          collab: Math.round(collab * 100),
          bayesian: Math.round(bayes * 100) / 100,
        },
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);
}
