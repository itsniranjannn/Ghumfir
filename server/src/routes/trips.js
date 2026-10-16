import { Router } from 'express';
import crypto from 'node:crypto';
import { pool, query } from '../db.js';
import { getCatalog, invalidateCatalog } from '../catalog.js';
import { optionalAuth, requireAuth, ah } from '../middleware/auth.js';
import { sendTripItineraryEmail } from '../email.js';

const r = Router();

// POST /api/trips/plan  - works for guests too (value before sign-up).
r.post('/plan', optionalAuth, ah(async (req, res) => {
  const { planner } = await getCatalog();
  res.json(planner.plan(req.body || {}));
}));

const summaryRow = (t) => ({
  id: t.id, title: t.title, days: t.days, budget: t.budget, travelers: t.travelers, style: t.style,
  totalCost: t.total_cost, startDate: t.start_date, isPublic: !!t.is_public, shareCode: t.share_code,
  createdAt: t.created_at, startCity: t.start_name, stops: t.stops ? t.stops.split('|') : [], cover: t.cover,
});

const LIST_SQL = `
  SELECT t.*, s.name AS start_name,
         GROUP_CONCAT(d.name ORDER BY td.position SEPARATOR '|') AS stops,
         SUBSTRING_INDEX(GROUP_CONCAT(d.image_url ORDER BY td.position SEPARATOR ' '), ' ', 1) AS cover
    FROM trips t
    JOIN destinations s ON s.id = t.start_city_id
    LEFT JOIN trip_destinations td ON td.trip_id = t.id
    LEFT JOIN destinations d ON d.id = td.destination_id`;

r.get('/', requireAuth, ah(async (req, res) => {
  const rows = await query(`${LIST_SQL} WHERE t.user_id = ? GROUP BY t.id ORDER BY t.created_at DESC`, [req.user.id]);
  res.json({ trips: rows.map(summaryRow) });
}));

/** Re-runs the planner server-side so a saved plan can never be forged by the client. */
async function saveTrip(conn, userId, input, title, tripId = null) {
  const { planner } = await getCatalog();
  const plan = planner.plan(input);
  const vals = [
    String(title || `${plan.stops.map((s) => s.name).join(', ')} trip`).slice(0, 150),
    plan.start.id, plan.input.startDate, plan.input.days, plan.input.budget, plan.input.travelers,
    plan.input.style, plan.input.interests.join(','), plan.summary.totalCost, JSON.stringify(plan),
  ];
  if (tripId) {
    await conn.query(
      `UPDATE trips SET title=?, start_city_id=?, start_date=?, days=?, budget=?, travelers=?, style=?, interests=?, total_cost=?, plan_json=? WHERE id=?`,
      [...vals, tripId]);
    await conn.query('DELETE FROM trip_destinations WHERE trip_id = ?', [tripId]);
  } else {
    const [ins] = await conn.query(
      `INSERT INTO trips (title, start_city_id, start_date, days, budget, travelers, style, interests, total_cost, plan_json, user_id, share_code)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [...vals, userId, crypto.randomBytes(5).toString('hex')]);
    tripId = ins.insertId;
  }
  await conn.query('INSERT INTO trip_destinations (trip_id, destination_id, position, nights) VALUES ?', [
    plan.stops.map((s, i) => [tripId, s.id, i + 1, Math.max(0, s.nights)]),
  ]);
  return tripId;
}

async function inTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn(conn);
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

r.post('/', requireAuth, ah(async (req, res) => {
  const { input, title } = req.body || {};
  if (!input) return res.status(400).json({ error: 'Missing trip input' });
  const id = await inTransaction((c) => saveTrip(c, req.user.id, input, title));
  invalidateCatalog(); // new co-occurrence data for "also visited"
  res.status(201).json({ id });
}));

async function loadOwned(req, res) {
  const [t] = await query('SELECT * FROM trips WHERE id = ?', [req.params.id]);
  if (!t) { res.status(404).json({ error: 'Trip not found' }); return null; }
  if (t.user_id !== req.user.id && req.user.role !== 'admin') { res.status(403).json({ error: 'Not your trip' }); return null; }
  return t;
}
const full = (t) => ({ ...summaryRow(t), plan: typeof t.plan_json === 'string' ? JSON.parse(t.plan_json) : t.plan_json });

r.get('/shared/:code', ah(async (req, res) => {
  const [t] = await query('SELECT t.*, u.name AS owner FROM trips t JOIN users u ON u.id = t.user_id WHERE share_code = ? AND is_public = 1', [req.params.code]);
  if (!t) return res.status(404).json({ error: 'This trip is private or no longer exists' });
  res.json({ trip: { ...full(t), owner: t.owner } });
}));

r.get('/:id', requireAuth, ah(async (req, res) => {
  const t = await loadOwned(req, res);
  if (t) res.json({ trip: full(t) });
}));

// Re-plan with edited input (and/or rename).
r.put('/:id', requireAuth, ah(async (req, res) => {
  const t = await loadOwned(req, res);
  if (!t) return;
  const { input, title } = req.body || {};
  if (input) await inTransaction((c) => saveTrip(c, t.user_id, input, title || t.title, t.id));
  else if (title) await query('UPDATE trips SET title = ? WHERE id = ?', [String(title).slice(0, 150), t.id]);
  invalidateCatalog();
  const [nt] = await query('SELECT * FROM trips WHERE id = ?', [t.id]);
  res.json({ trip: full(nt) });
}));

r.patch('/:id/share', requireAuth, ah(async (req, res) => {
  const t = await loadOwned(req, res);
  if (!t) return;
  await query('UPDATE trips SET is_public = ? WHERE id = ?', [req.body?.isPublic ? 1 : 0, t.id]);
  res.json({ isPublic: !!req.body?.isPublic, shareCode: t.share_code });
}));

r.delete('/:id', requireAuth, ah(async (req, res) => {
  const t = await loadOwned(req, res);
  if (!t) return;
  await query('DELETE FROM trips WHERE id = ?', [t.id]);
  invalidateCatalog();
  res.json({ ok: true });
}));

// POST /api/trips/:id/email
r.post('/:id/email', requireAuth, ah(async (req, res) => {
  const t = await loadOwned(req, res);
  if (!t) return;
  const { email } = req.body || {};
  const recipient = String(email || req.user.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
    return res.status(400).json({ error: 'Please enter a valid email address' });
  }

  const tripObj = full(t);
  const destinations = tripObj.plan?.stops || [];

  await sendTripItineraryEmail({
    to: recipient,
    trip: {
      id: t.id,
      title: t.title,
      days: t.days,
      style: t.style,
      total_cost: t.total_cost,
      share_code: t.share_code,
      destinations,
    },
    recipientEmail: recipient,
    senderName: req.user.name,
  });

  res.json({ ok: true, message: `Itinerary sent successfully to ${recipient}` });
}));

export default r;
