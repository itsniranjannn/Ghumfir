// Converts the compact seed arrays into row objects with ids (used by init and tests).
import { destinations, attractions, hotels, roadLinks, permits, weatherRisk } from './seed-data.js';
import { images, hotelImages } from './seed-images.js';

const MOUNTAIN = ['namche', 'gosaikunda', 'rara', 'upper-mustang', 'ghandruk', 'kalinchowk', 'manang', 'muktinath'];
const JUNGLE = ['chitwan', 'bardiya', 'shuklaphanta'];
const VIEW = ['pokhara', 'nagarkot', 'dhulikhel', 'bandipur', 'ilam', 'dharan'];

/** Picks a fitting sample photo for a hotel by place type and tier, rotating through each kind. */
function hotelImage(slug, tier, used) {
  let kinds;
  if (MOUNTAIN.includes(slug)) kinds = { budget: ['teahouse'], standard: ['teahouse', 'homestay'], premium: ['resort', 'teahouse'] }[tier];
  else if (JUNGLE.includes(slug)) kinds = { budget: ['homestay'], standard: ['jungle'], premium: ['jungle', 'resort'] }[tier];
  else if (VIEW.includes(slug)) kinds = { budget: ['guesthouse'], standard: ['city', 'room'], premium: ['resort', 'heritage'] }[tier];
  else kinds = { budget: ['guesthouse'], standard: ['city', 'room'], premium: ['heritage', 'resort'] }[tier];
  for (const k of kinds) {
    const list = hotelImages[k] || [];
    if (!list.length) continue;
    used[k] = (used[k] ?? -1) + 1;
    return list[used[k] % list.length];
  }
  const all = Object.values(hotelImages).flat();
  return all.length ? all[(used.any = (used.any ?? -1) + 1) % all.length] : null;
}

export function seedRows() {
  const dests = destinations.map((r, i) => {
    const [slug, name, name_np, province, tagline, description, lat, lng, altitude_m, tags, best_months,
      min_days, ideal_days, daily_food_cost, has_airport, access_factor, is_start_city] = r;
    const [permit_fee, permit_note] = permits[slug] || [0, ''];
    return {
      id: i + 1, slug, name, name_np, province, tagline, description, lat, lng, altitude_m, tags, best_months,
      min_days, ideal_days, daily_food_cost, has_airport, access_factor, is_start_city,
      permit_fee, permit_note, weather_risk: weatherRisk.includes(slug) ? 1 : 0,
      image_url: images[slug]?.url || '', image_credit: images[slug]?.credit || '',
      avg_rating: 0, review_count: 0,
    };
  });
  const idOf = Object.fromEntries(dests.map((d) => [d.slug, d.id]));
  const attr = attractions.map(([slug, name, category, description, entry_fee, duration_hours, rating, lat, lng], i) => ({
    id: i + 1, destination_id: idOf[slug], name, category, description, entry_fee, duration_hours, rating, lat, lng,
  }));
  const used = {};
  const hot = hotels.map(([slug, name, tier, price_per_night, rating, amenities], i) => {
    const img = hotelImage(slug, tier, used);
    return {
      id: i + 1, destination_id: idOf[slug], name, tier, price_per_night, rating, amenities,
      image_url: img?.url || '', image_credit: img?.credit || '',
    };
  });
  const links = roadLinks.map(([a, b, road_km, road_hours, note]) => ({ from_id: idOf[a], to_id: idOf[b], road_km, road_hours, note }));
  return { destinations: dests, attractions: attr, hotels: hot, roadLinks: links, idOf };
}
