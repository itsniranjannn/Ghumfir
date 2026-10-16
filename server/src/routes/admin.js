import express, { Router } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { query } from '../db.js';
import { invalidateCatalog } from '../catalog.js';
import { requireAdmin, ah } from '../middleware/auth.js';
import { UPLOAD_DIR } from '../paths.js';

const r = Router();
r.use(requireAdmin);

// ---- image upload (raw body, max 6 MB) ----
// The file type is decided from the file's first bytes ("magic numbers"), never from
// the name or Content-Type, so a renamed script can't be stored as an image.
function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

r.post('/uploads', express.raw({ type: () => true, limit: '6mb' }), ah(async (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'No file received' });
  const ext = sniffImage(buf);
  if (!ext) return res.status(415).json({ error: 'Only JPEG, PNG or WebP images are allowed' });
  // Content-addressed name: the same photo uploaded twice is stored once.
  const name = `${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20)}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(new URL(name, UPLOAD_DIR), buf);
  res.status(201).json({ url: `/uploads/${name}`, bytes: buf.length });
}));

r.get('/stats', ah(async (_req, res) => {
  const [[counts], perMonth, topDest, styles, budgets, recentTrips] = await Promise.all([
    query(`SELECT (SELECT COUNT(*) FROM users WHERE role='traveler') AS travelers,
                  (SELECT COUNT(*) FROM trips) AS trips,
                  (SELECT COUNT(*) FROM destinations) AS destinations,
                  (SELECT COUNT(*) FROM reviews) AS reviews,
                  (SELECT COALESCE(ROUND(AVG(total_cost)),0) FROM trips) AS avgCost,
                  (SELECT COALESCE(ROUND(AVG(days),1),0) FROM trips) AS avgDays`),
    query(`SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS trips FROM trips
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH) GROUP BY month ORDER BY month`),
    query(`SELECT d.name, COUNT(*) AS visits FROM trip_destinations td JOIN destinations d ON d.id = td.destination_id
            GROUP BY d.id ORDER BY visits DESC LIMIT 8`),
    query('SELECT style, COUNT(*) AS n FROM trips GROUP BY style'),
    query(`SELECT CASE WHEN budget < 30000 THEN 'Under 30k' WHEN budget < 75000 THEN '30k-75k'
                       WHEN budget < 150000 THEN '75k-150k' ELSE '150k+' END AS band, COUNT(*) AS n
             FROM trips GROUP BY band`),
    query(`SELECT t.id, t.title, t.total_cost, t.days, t.created_at, u.name AS user FROM trips t
             JOIN users u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 6`),
  ]);
  res.json({ counts, perMonth, topDest, styles, budgets, recentTrips });
}));

// ---- generic, whitelisted CRUD for catalog tables ----
const TABLES = {
  destinations: ['slug', 'name', 'name_np', 'province', 'tagline', 'description', 'lat', 'lng', 'altitude_m', 'tags',
    'best_months', 'min_days', 'ideal_days', 'daily_food_cost', 'has_airport', 'access_factor', 'image_url',
    'image_credit', 'is_start_city', 'permit_fee', 'permit_note', 'weather_risk'],
  attractions: ['destination_id', 'name', 'category', 'description', 'entry_fee', 'duration_hours', 'rating', 'lat', 'lng'],
  hotels: ['destination_id', 'name', 'tier', 'price_per_night', 'rating', 'amenities', 'image_url', 'image_credit'],
};
const REQUIRED = {
  destinations: ['slug', 'name', 'province', 'description', 'lat', 'lng'],
  attractions: ['destination_id', 'name', 'category', 'lat', 'lng'],
  hotels: ['destination_id', 'name', 'tier', 'price_per_night'],
};

function pickFields(table, body, partial) {
  const cols = TABLES[table];
  const data = {};
  // Empty optional fields are skipped so the column default applies.
  for (const c of cols) if (body[c] !== undefined && body[c] !== '' && body[c] !== null) data[c] = body[c];
  if (!partial) {
    const missing = REQUIRED[table].filter((c) => data[c] === undefined || data[c] === null);
    if (missing.length) throw Object.assign(new Error(`Missing: ${missing.join(', ')}`), { status: 400 });
  }
  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) throw Object.assign(new Error('Slug: lowercase letters, digits and dashes only'), { status: 400 });
  if (data.lat !== undefined && !(Math.abs(Number(data.lat)) <= 90)) throw Object.assign(new Error('Invalid latitude'), { status: 400 });
  if (data.lng !== undefined && !(Math.abs(Number(data.lng)) <= 180)) throw Object.assign(new Error('Invalid longitude'), { status: 400 });
  return data;
}

for (const table of Object.keys(TABLES)) {
  r.get(`/${table}`, ah(async (req, res) => {
    const where = req.query.destination_id ? 'WHERE destination_id = ?' : '';
    const order = table === 'destinations' ? 'name' : 'destination_id, name';
    res.json({ rows: await query(`SELECT * FROM ${table} ${where} ORDER BY ${order}`, req.query.destination_id ? [req.query.destination_id] : []) });
  }));
  r.post(`/${table}`, ah(async (req, res) => {
    const data = pickFields(table, req.body || {}, false);
    const result = await query(`INSERT INTO ${table} SET ?`, [data]);
    invalidateCatalog();
    res.status(201).json({ id: result.insertId });
  }));
  r.put(`/${table}/:id`, ah(async (req, res) => {
    const data = pickFields(table, req.body || {}, true);
    if (!Object.keys(data).length) return res.status(400).json({ error: 'Nothing to update' });
    const result = await query(`UPDATE ${table} SET ? WHERE id = ?`, [data, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    invalidateCatalog();
    res.json({ ok: true });
  }));
  r.delete(`/${table}/:id`, ah(async (req, res) => {
    const result = await query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Not found' });
    invalidateCatalog();
    res.json({ ok: true });
  }));
}

r.get('/users', ah(async (_req, res) => {
  res.json({
    rows: await query(`SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at,
                              (SELECT COUNT(*) FROM trips t WHERE t.user_id = u.id) AS trips,
                              (SELECT COUNT(*) FROM reviews v WHERE v.user_id = u.id) AS reviews
                         FROM users u ORDER BY u.created_at DESC`),
  });
}));

r.patch('/users/:id', ah(async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: "You can't deactivate yourself" });
  await query('UPDATE users SET is_active = ? WHERE id = ?', [req.body?.isActive ? 1 : 0, req.params.id]);
  res.json({ ok: true });
}));

r.get('/reviews', ah(async (_req, res) => {
  res.json({
    rows: await query(`SELECT r.id, r.rating, r.comment, r.created_at, u.name AS user, d.name AS destination
                         FROM reviews r JOIN users u ON u.id = r.user_id JOIN destinations d ON d.id = r.destination_id
                        ORDER BY r.created_at DESC LIMIT 200`),
  });
}));

r.delete('/reviews/:id', ah(async (req, res) => {
  await query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  invalidateCatalog();
  res.json({ ok: true });
}));

export default r;
