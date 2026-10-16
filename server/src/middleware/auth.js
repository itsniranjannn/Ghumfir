import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';

export function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
}

function readToken(req) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(h.slice(7), SECRET);
  } catch {
    return null;
  }
}

/** Attaches req.user if a valid token is present, but never blocks. */
export function optionalAuth(req, _res, next) {
  req.user = readToken(req);
  next();
}

export function requireAuth(req, res, next) {
  req.user = readToken(req);
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue' });
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    next();
  });
}

/** Wraps async route handlers so thrown errors reach the error middleware. */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
