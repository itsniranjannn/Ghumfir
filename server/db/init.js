// Creates the database, tables and demo data.  Usage: npm run db:init
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { seedRows } from './rows.js';
import { buildCatalog } from '../src/catalog.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const DB = process.env.DB_NAME || 'ghumfir';
if (!/^[A-Za-z0-9_]+$/.test(DB)) throw new Error('DB_NAME may only contain letters, digits and _');

const sslOption = process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('ssl')
  ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  : undefined;

const conn = process.env.DATABASE_URL
  ? await mysql.createConnection({
      uri: process.env.DATABASE_URL,
      ssl: sslOption,
      multipleStatements: true,
    })
  : await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || undefined,
      ssl: sslOption,
      multipleStatements: true,
    });

console.log('Applying database schema...');
if (!process.env.DATABASE_URL) {
  console.log(`Recreating database "${DB}"...`);
  await conn.query(`DROP DATABASE IF EXISTS \`${DB}\`; CREATE DATABASE \`${DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE \`${DB}\`;`);
} else {
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB}\`; USE \`${DB}\`;`);
}
await conn.query(await fs.readFile(path.join(here, 'schema.sql'), 'utf8'));

const rows = seedRows();
const insertMany = async (table, objs, cols) => {
  if (!objs.length) return;
  const sql = `INSERT INTO ${table} (${cols.join(',')}) VALUES ?`;
  await conn.query(sql, [objs.map((o) => cols.map((c) => o[c]))]);
};

await insertMany('destinations', rows.destinations, [
  'id', 'slug', 'name', 'name_np', 'province', 'tagline', 'description', 'lat', 'lng', 'altitude_m', 'tags',
  'best_months', 'min_days', 'ideal_days', 'daily_food_cost', 'has_airport', 'access_factor', 'image_url',
  'image_credit', 'is_start_city', 'permit_fee', 'permit_note', 'weather_risk',
]);
await insertMany('attractions', rows.attractions, ['id', 'destination_id', 'name', 'category', 'description', 'entry_fee', 'duration_hours', 'rating', 'lat', 'lng']);
await insertMany('hotels', rows.hotels, ['id', 'destination_id', 'name', 'tier', 'price_per_night', 'rating', 'amenities', 'image_url', 'image_credit']);
await insertMany('road_links', rows.roadLinks, ['from_id', 'to_id', 'road_km', 'road_hours', 'note']);
console.log(`  ${rows.destinations.length} destinations, ${rows.attractions.length} attractions, ${rows.hotels.length} hotels, ${rows.roadLinks.length} road links`);

// ---- users ----
const hash = (p) => bcrypt.hashSync(p, 10);
const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
const people = [
  ['Ghumfir Admin', 'admin@ghumfir.test', adminPass, 'admin', 'kathmandu', ''],
  ['Demo Traveller', 'demo@ghumfir.test', 'demo123', 'traveler', 'kathmandu', 'culture,nature,food'],
  ['Aarati Shrestha', 'aarati@ghumfir.test', null, 'traveler', 'kathmandu', 'culture,heritage,food'],
  ['Bikash Gurung', 'bikash@ghumfir.test', null, 'traveler', 'pokhara', 'trekking,mountains,adventure'],
  ['Sita Tharu', 'sita@ghumfir.test', null, 'traveler', 'chitwan', 'wildlife,nature,village'],
  ['Rohan Karki', 'rohan@ghumfir.test', null, 'traveler', 'kathmandu', 'adventure,lakes,photography'],
  ['Pema Sherpa', 'pema@ghumfir.test', null, 'traveler', 'kathmandu', 'trekking,spiritual,mountains'],
  ['Nisha Yadav', 'nisha@ghumfir.test', null, 'traveler', 'kathmandu', 'spiritual,culture,food'],
  ['Kiran Thapa', 'kiran@ghumfir.test', null, 'traveler', 'pokhara', 'relaxation,lakes,nature'],
  ['Anil Magar', 'anil@ghumfir.test', null, 'traveler', 'kathmandu', 'heritage,village,photography'],
];
for (const [name, email, pass, role, home, interests] of people) {
  await conn.query('INSERT INTO users (name, email, password_hash, role, home_city_id, interests) VALUES (?,?,?,?,?,?)', [
    name, email, hash(pass || crypto.randomBytes(12).toString('hex')), role, rows.idOf[home], interests,
  ]);
}

// ---- reviews (deterministic pseudo-random so the demo is repeatable) ----
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const base = { kathmandu: 4.4, bhaktapur: 4.7, pokhara: 4.7, chitwan: 4.6, lumbini: 4.5, bandipur: 4.6, nagarkot: 4.2, 'upper-mustang': 4.8, ilam: 4.4, janakpur: 4.2, gorkha: 4.1, rara: 4.9, namche: 4.8, ghandruk: 4.6, tansen: 4.2, dhulikhel: 4.3, bardiya: 4.5, gosaikunda: 4.7 };
const comments = ['Worth every rupee.', 'Go early to avoid the crowds.', 'The views were unreal.', 'Roads were rough but it was worth it.', 'Loved the food here.', 'Would stay an extra day next time.', 'Peaceful and friendly people.', 'Book the hotel in advance during festivals.'];
const reviewRows = [];
for (let u = 3; u <= people.length; u++) {
  for (const d of rows.destinations) {
    if (rand() < 0.45) continue;
    const r = Math.max(1, Math.min(5, Math.round(base[d.slug] + (rand() - 0.5) * 1.6)));
    reviewRows.push([u, d.id, r, comments[Math.floor(rand() * comments.length)]]);
  }
}
await conn.query('INSERT INTO reviews (user_id, destination_id, rating, comment) VALUES ?', [reviewRows]);
console.log(`  ${people.length} users, ${reviewRows.length} reviews`);

// ---- demo trips, generated by the real planner (feeds "travellers also visited") ----
const catalog = buildCatalog({ ...rows, tripStops: [] });
const I = rows.idOf;
const demoTrips = [
  [3, 'Valley heritage week', 'kathmandu', ['bhaktapur', 'nagarkot', 'dhulikhel'], 5, 40000, 2, 'standard', 'culture,heritage'],
  [3, 'Classic Nepal loop', 'kathmandu', ['pokhara', 'chitwan', 'bandipur'], 8, 110000, 2, 'standard', 'nature,culture'],
  [4, 'Annapurna foothills', 'pokhara', ['ghandruk', 'bandipur'], 5, 35000, 1, 'budget', 'trekking,mountains'],
  [4, 'Into the Kingdom of Lo', 'pokhara', ['upper-mustang'], 7, 90000, 2, 'standard', 'adventure,culture'],
  [5, 'Jungle and Buddha', 'chitwan', ['lumbini', 'tansen'], 5, 45000, 2, 'budget', 'wildlife,spiritual'],
  [5, 'Wild west safari', 'kathmandu', ['bardiya', 'lumbini'], 8, 120000, 2, 'standard', 'wildlife,nature'],
  [6, 'Lakes and lakes', 'kathmandu', ['pokhara', 'rara'], 9, 160000, 2, 'premium', 'lakes,adventure'],
  [6, 'Short escape', 'kathmandu', ['nagarkot', 'bhaktapur'], 3, 25000, 2, 'standard', 'photography'],
  [7, 'Everest gateway', 'kathmandu', ['namche'], 8, 120000, 1, 'standard', 'trekking,mountains'],
  [7, 'Sacred lake trek', 'kathmandu', ['gosaikunda'], 5, 30000, 1, 'budget', 'trekking,spiritual'],
  [8, 'Pilgrim route', 'kathmandu', ['janakpur', 'lumbini'], 7, 60000, 3, 'budget', 'spiritual,culture'],
  [8, 'Eastern tea hills', 'kathmandu', ['ilam', 'janakpur'], 7, 70000, 2, 'standard', 'nature,food'],
  [9, 'Lazy lakeside', 'pokhara', ['bandipur', 'tansen'], 5, 50000, 2, 'standard', 'relaxation'],
  [9, 'Pokhara and Chitwan', 'kathmandu', ['pokhara', 'chitwan'], 6, 80000, 2, 'standard', 'nature,wildlife'],
  [10, 'Old towns of Nepal', 'kathmandu', ['bandipur', 'gorkha', 'tansen'], 7, 60000, 2, 'budget', 'heritage,village'],
  [10, 'Hill towns and Pokhara', 'kathmandu', ['gorkha', 'bandipur', 'pokhara'], 7, 75000, 2, 'standard', 'heritage,photography'],
  [2, 'My first Ghumfir trip', 'kathmandu', ['pokhara', 'bandipur'], 5, 60000, 2, 'standard', 'culture,nature,food'],
];
for (const [userId, title, startSlug, stops, days, budget, travelers, style, interests] of demoTrips) {
  const plan = catalog.planner.plan({
    startId: I[startSlug], destinationIds: stops.map((s) => I[s]), days, budget, travelers, style, interests, month: 11,
  });
  const [res] = await conn.query(
    `INSERT INTO trips (user_id, title, start_city_id, days, budget, travelers, style, interests, total_cost, plan_json, share_code, is_public)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [userId, title, I[startSlug], days, budget, travelers, style, interests, plan.summary.totalCost, JSON.stringify(plan), crypto.randomBytes(5).toString('hex'), 1]
  );
  await conn.query('INSERT INTO trip_destinations (trip_id, destination_id, position, nights) VALUES ?', [
    plan.stops.map((s, i) => [res.insertId, s.id, i + 1, s.nights]),
  ]);
}
console.log(`  ${demoTrips.length} demo trips`);
await conn.query('INSERT INTO wishlist (user_id, destination_id) VALUES ?', [[[2, I.rara], [2, I.chitwan], [2, I.lumbini]]]);

await conn.end();
console.log('\nDone. Logins:');
console.log(`  admin  admin@ghumfir.test / ${process.env.ADMIN_PASSWORD ? '(ADMIN_PASSWORD from .env)' : 'admin123'}`);
console.log('  demo   demo@ghumfir.test  / demo123');
