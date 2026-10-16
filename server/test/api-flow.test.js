// End-to-end API test of the normal user flow, the admin flow and the security rules.
// Needs the API running (npm run dev) on a seeded database (npm run db:init).
//   npm run test:api            (BASE_URL defaults to http://localhost:5000)
import test from 'node:test';
import assert from 'node:assert/strict';
import 'dotenv/config';

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const stamp = Date.now().toString(36);
const ADMIN = { email: 'admin@ghumfir.test', password: process.env.ADMIN_PASSWORD || 'admin123' };

async function call(path, { method = 'GET', body, token, raw, type } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
  if (raw) headers['Content-Type'] = type || 'application/octet-stream';
  const res = await fetch(BASE + path, { method, headers, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data, headers: res.headers };
}

const ctx = {};

test('01 health check', async () => {
  const r = await call('/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.data.ok, true);
});

test('02 meta lists start cities (Kathmandu first) and counts', async () => {
  const r = await call('/api/destinations/meta');
  assert.equal(r.status, 200);
  assert.equal(r.data.startCities[0].slug, 'kathmandu');
  assert.ok(r.data.counts.destinations >= 18);
  ctx.ids = Object.fromEntries(r.data.destinations.map((d) => [d.slug, d.id]));
});

test('03 search tolerates typos (pokhra → Pokhara)', async () => {
  const r = await call('/api/destinations?q=pokhra');
  assert.equal(r.status, 200);
  assert.equal(r.data.results[0].slug, 'pokhara');
});

test('04 destination detail has attractions, hotels and reviews', async () => {
  const r = await call('/api/destinations/chitwan');
  assert.equal(r.status, 200);
  assert.ok(r.data.attractions.length > 0);
  assert.equal(r.data.hotels.length, 3);
  assert.equal((await call('/api/destinations/nowhere')).status, 404);
});

test('05 guest can plan a trip without an account', async () => {
  const r = await call('/api/trips/plan', {
    method: 'POST',
    body: { startId: ctx.ids.kathmandu, destinationIds: [ctx.ids.pokhara, ctx.ids.chitwan], days: 6, budget: 90000, travelers: 2, startDate: '2026-11-10' },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.days.length, 6);
  assert.equal(r.data.days[0].date, '2026-11-10');
  assert.ok(r.data.summary.withinBudget);
  assert.ok(r.data.trace.tsp.twoOptHours <= r.data.trace.tsp.inputOrderHours);
});

test('06 planner rejects an invalid start city', async () => {
  const r = await call('/api/trips/plan', { method: 'POST', body: { startId: 99999, days: 4 } });
  assert.equal(r.status, 400);
});

test('07 register validates input and rejects duplicates', async () => {
  assert.equal((await call('/api/auth/register', { method: 'POST', body: { name: 'A', email: 'bad', password: '1' } })).status, 400);
  const user = { name: 'API Test Traveller', email: `apitest-${stamp}@ghumfir.test`, password: 'secret123', interests: ['nature', 'wildlife'] };
  const r = await call('/api/auth/register', { method: 'POST', body: user });
  assert.equal(r.status, 201);
  assert.ok(r.data.token);
  assert.deepEqual(r.data.user.interests, ['nature', 'wildlife']);
  ctx.user = { ...user, token: r.data.token, id: r.data.user.id };
  assert.equal((await call('/api/auth/register', { method: 'POST', body: user })).status, 409);
});

test('08 login: wrong password fails, right password works', async () => {
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: ctx.user.email, password: 'nope' } })).status, 401);
  const r = await call('/api/auth/login', { method: 'POST', body: { email: ctx.user.email, password: ctx.user.password } });
  assert.equal(r.status, 200);
  assert.equal((await call('/api/auth/me', { token: r.data.token })).data.user.email, ctx.user.email);
});

test('09 protected routes need a token', async () => {
  assert.equal((await call('/api/trips')).status, 401);
  assert.equal((await call('/api/trips', { token: 'not-a-jwt' })).status, 401);
});

test('10 save, list, rename and re-plan a trip', async () => {
  const input = { startId: ctx.ids.kathmandu, destinationIds: [ctx.ids.bandipur, ctx.ids.pokhara], days: 5, budget: 70000, travelers: 2 };
  const saved = await call('/api/trips', { method: 'POST', token: ctx.user.token, body: { input, title: 'Test loop' } });
  assert.equal(saved.status, 201);
  ctx.tripId = saved.data.id;
  const list = await call('/api/trips', { token: ctx.user.token });
  assert.ok(list.data.trips.some((t) => t.id === ctx.tripId));
  const renamed = await call(`/api/trips/${ctx.tripId}`, { method: 'PUT', token: ctx.user.token, body: { title: 'Renamed loop' } });
  assert.equal(renamed.data.trip.title, 'Renamed loop');
  const replanned = await call(`/api/trips/${ctx.tripId}`, { method: 'PUT', token: ctx.user.token, body: { input: { ...input, days: 7 } } });
  assert.equal(replanned.data.trip.days, 7);
  assert.equal(replanned.data.trip.plan.days.length, 7);
});

test('11 sharing: public link works, private link does not', async () => {
  const on = await call(`/api/trips/${ctx.tripId}/share`, { method: 'PATCH', token: ctx.user.token, body: { isPublic: true } });
  const code = on.data.shareCode;
  assert.equal((await call(`/api/trips/shared/${code}`)).status, 200);
  await call(`/api/trips/${ctx.tripId}/share`, { method: 'PATCH', token: ctx.user.token, body: { isPublic: false } });
  assert.equal((await call(`/api/trips/shared/${code}`)).status, 404);
});

test("12 another user cannot read or delete someone else's trip", async () => {
  const other = await call('/api/auth/register', { method: 'POST', body: { name: 'API Test Other', email: `apitest-other-${stamp}@ghumfir.test`, password: 'secret123' } });
  ctx.other = { token: other.data.token, id: other.data.user.id, email: `apitest-other-${stamp}@ghumfir.test` };
  assert.equal((await call(`/api/trips/${ctx.tripId}`, { token: ctx.other.token })).status, 403);
  assert.equal((await call(`/api/trips/${ctx.tripId}`, { method: 'DELETE', token: ctx.other.token })).status, 403);
});

test('13 reviews: validation, posting and updating', async () => {
  const id = ctx.ids.lumbini;
  assert.equal((await call(`/api/destinations/${id}/reviews`, { method: 'POST', token: ctx.user.token, body: { rating: 9 } })).status, 400);
  assert.equal((await call(`/api/destinations/${id}/reviews`, { method: 'POST', token: ctx.user.token, body: { rating: 4, comment: 'Calm and beautiful' } })).status, 201);
  await call(`/api/destinations/${id}/reviews`, { method: 'POST', token: ctx.user.token, body: { rating: 5, comment: 'Even better the second time' } });
  const d = await call('/api/destinations/lumbini', { token: ctx.user.token });
  assert.equal(d.data.myReview.rating, 5);
});

test('14 wishlist toggles on and off', async () => {
  const on = await call(`/api/destinations/${ctx.ids.rara}/wishlist`, { method: 'POST', token: ctx.user.token });
  assert.equal(on.data.inWishlist, true);
  assert.ok((await call('/api/me/wishlist', { token: ctx.user.token })).data.results.some((d) => d.slug === 'rara'));
  const off = await call(`/api/destinations/${ctx.ids.rara}/wishlist`, { method: 'POST', token: ctx.user.token });
  assert.equal(off.data.inWishlist, false);
});

test('15 recommendations explain themselves', async () => {
  const r = await call('/api/destinations/recommendations?interests=wildlife&month=11', { token: ctx.user.token });
  assert.equal(r.status, 200);
  assert.ok(['chitwan', 'bardiya'].includes(r.data.results[0].slug));
  assert.ok(r.data.results[0].reasons.length > 0);
});

test('16 profile update keeps only known interests', async () => {
  const r = await call('/api/auth/me', { method: 'PUT', token: ctx.user.token, body: { interests: ['culture', 'hacking'], homeCityId: ctx.ids.pokhara } });
  assert.deepEqual(r.data.user.interests, ['culture']);
  assert.equal(r.data.user.homeCityId, ctx.ids.pokhara);
});

test('17 travellers cannot use admin routes', async () => {
  assert.equal((await call('/api/admin/stats', { token: ctx.user.token })).status, 403);
});

test('18 admin: stats, add a destination with an uploaded photo, plan to it, delete it', async () => {
  const login = await call('/api/auth/login', { method: 'POST', body: ADMIN });
  assert.equal(login.status, 200, 'admin login');
  const token = (ctx.admin = login.data.token);
  assert.equal((await call('/api/admin/stats', { token })).status, 200);

  // 1x1 PNG
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  const up = await call('/api/admin/uploads', { method: 'POST', token, raw: png, type: 'image/png' });
  assert.equal(up.status, 201);
  const img = await fetch(BASE + up.data.url);
  assert.equal(img.status, 200);
  assert.match(img.headers.get('content-type'), /image\/png/);

  // a text file renamed as an image must be refused
  const fake = await call('/api/admin/uploads', { method: 'POST', token, raw: Buffer.from('<script>alert(1)</script>'), type: 'image/png' });
  assert.equal(fake.status, 415);
  assert.equal((await call('/api/admin/uploads', { method: 'POST', token: ctx.user.token, raw: png, type: 'image/png' })).status, 403);

  const slug = `test-place-${stamp}`;
  const created = await call('/api/admin/destinations', {
    method: 'POST', token,
    body: { slug, name: 'Test Place', province: 'Bagmati', description: 'Created by the API test.', lat: 27.9, lng: 85.1, altitude_m: 1500, tags: 'nature', best_months: '10,11', image_url: up.data.url, image_credit: 'Own photo' },
  });
  assert.equal(created.status, 201);
  assert.equal((await call('/api/admin/destinations', { method: 'POST', token, body: { slug: 'Bad Slug!' } })).status, 400);

  const detail = await call(`/api/destinations/${slug}`);
  assert.equal(detail.data.destination.image_url, up.data.url);
  const plan = await call('/api/trips/plan', { method: 'POST', body: { startId: ctx.ids.kathmandu, destinationIds: [created.data.id], days: 3, budget: 40000 } });
  assert.equal(plan.status, 200);
  assert.equal(plan.data.stops[0].name, 'Test Place');

  assert.equal((await call(`/api/admin/destinations/${created.data.id}`, { method: 'DELETE', token })).status, 200);
  assert.equal((await call(`/api/destinations/${slug}`)).status, 404);
});

test('19 admin can deactivate a user, who then cannot log in', async () => {
  await call(`/api/admin/users/${ctx.other.id}`, { method: 'PATCH', token: ctx.admin, body: { isActive: false } });
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: ctx.other.email, password: 'secret123' } })).status, 403);
  await call(`/api/admin/users/${ctx.other.id}`, { method: 'PATCH', token: ctx.admin, body: { isActive: true } });
  assert.equal((await call('/api/auth/login', { method: 'POST', body: { email: ctx.other.email, password: 'secret123' } })).status, 200);
});

test('20 deleting a trip removes it', async () => {
  assert.equal((await call(`/api/trips/${ctx.tripId}`, { method: 'DELETE', token: ctx.user.token })).status, 200);
  assert.equal((await call(`/api/trips/${ctx.tripId}`, { token: ctx.user.token })).status, 404);
});
