import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { UPLOAD_DIR } from './paths.js';
import { query } from './db.js';
import { requireAuth, ah } from './middleware/auth.js';
import authRoutes from './routes/auth.js';
import destinationRoutes, { card } from './routes/destinations.js';
import tripRoutes from './routes/trips.js';
import adminRoutes from './routes/admin.js';
import { getCatalog } from './catalog.js';

if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET is not set; using an insecure development secret.');

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN
  ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '200kb' }));
// Admin-uploaded photos. nosniff + fixed extensions keep these served strictly as images.
app.use('/uploads', express.static(fileURLToPath(UPLOAD_DIR), {
  maxAge: '30d',
  immutable: true,
  setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
}));

app.get('/api/health', ah(async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
}));
app.use('/api/auth', authRoutes);
app.use('/api/destinations', destinationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/me/wishlist', requireAuth, ah(async (req, res) => {
  const { destinations } = await getCatalog();
  const wish = await query(
    'SELECT destination_id, created_at FROM wishlist WHERE user_id = ? ORDER BY created_at DESC',
    [req.user.id]
  );
  const byId = new Map(destinations.map((d) => [d.id, d]));
  const results = wish
    .map((w) => {
      const d = byId.get(w.destination_id);
      return d ? { ...card(d), wishlisted_at: w.created_at } : null;
    })
    .filter(Boolean);
  res.json({ results });
}));

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  const status = err.status || 500;
  if (status >= 500) console.error(err);
  const dbDown = ['ECONNREFUSED', 'ER_BAD_DB_ERROR', 'ER_ACCESS_DENIED_ERROR'].includes(err.code);
  res.status(dbDown ? 503 : status).json({
    error: dbDown ? 'Database unavailable. Check MySQL is running and run "npm run db:init".' : status >= 500 ? 'Something went wrong' : err.message,
  });
});

const PORT = Number(process.env.PORT || 5000);
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Ghumfir API on http://localhost:${PORT}`));
}

export default app;
