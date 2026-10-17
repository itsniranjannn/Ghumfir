import express, { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { signToken, requireAuth, ah } from '../middleware/auth.js';
import { INTEREST_TAGS } from '../algorithms/planner.js';
import { splitList } from '../algorithms/recommender.js';
import { UPLOAD_DIR } from '../paths.js';
import { sendWelcomeEmail, sendVerificationEmail, sendPasswordResetEmail } from '../email.js';

const r = Router();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanInterests = (v) => splitList(v).filter((t) => INTEREST_TAGS.includes(t)).join(',');

function sniffImage(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

const publicUser = (u) => ({
  id: u.id, name: u.name, email: u.email, role: u.role,
  homeCityId: u.home_city_id, location: u.location || '', avatarUrl: u.avatar_url || '',
  interests: splitList(u.interests), isVerified: !!u.is_verified, createdAt: u.created_at,
});

r.post('/register', ah(async (req, res) => {
  const { name, email, password, interests, homeCityId } = req.body || {};
  if (!name || String(name).trim().length < 2) return res.status(400).json({ error: 'Please enter your name' });
  if (!EMAIL.test(email || '')) return res.status(400).json({ error: 'Please enter a valid email' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password needs at least 6 characters' });
  const exists = await query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
  if (exists.length) return res.status(409).json({ error: 'An account with this email already exists' });
  
  const verifyToken = crypto.randomBytes(32).toString('hex');
  const result = await query(
    'INSERT INTO users (name, email, password_hash, home_city_id, interests, is_verified, verify_token) VALUES (?,?,?,?,?,?,?)',
    [String(name).trim(), email.toLowerCase(), await bcrypt.hash(password, 10), Number(homeCityId) || null, cleanInterests(interests), 0, verifyToken]
  );
  const [user] = await query('SELECT * FROM users WHERE id = ?', [result.insertId]);

  // Send branded welcome and verification emails (non-blocking)
  sendWelcomeEmail({ to: user.email, name: user.name }).catch((err) => console.error('[email:welcome]', err.message));
  sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken }).catch((err) => console.error('[email:verify]', err.message));

  res.status(201).json({
    ok: true,
    requiresVerification: true,
    message: 'Account created! Please check your email to verify your address before logging in.',
    email: user.email,
  });
}));

r.post('/login', ah(async (req, res) => {
  const { email, password } = req.body || {};
  const [user] = await query('SELECT * FROM users WHERE email = ?', [String(email || '').toLowerCase()]);
  if (!user || !(await bcrypt.compare(password || '', user.password_hash))) {
    return res.status(401).json({ error: 'Email or password is incorrect' });
  }
  if (!user.is_active) return res.status(403).json({ error: 'This account has been deactivated' });
  if (!user.is_verified) {
    return res.status(403).json({
      error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
      unverified: true,
      email: user.email,
    });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
}));

r.get('/me', requireAuth, ah(async (req, res) => {
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user || !user.is_active) return res.status(401).json({ error: 'Session expired' });
  res.json({ user: publicUser(user) });
}));

r.put('/me', requireAuth, ah(async (req, res) => {
  const { name, interests, homeCityId, location, avatarUrl } = req.body || {};
  if (name !== undefined && String(name).trim().length < 2) return res.status(400).json({ error: 'Name is too short' });
  const [cur] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  await query('UPDATE users SET name = ?, interests = ?, home_city_id = ?, location = ?, avatar_url = ? WHERE id = ?', [
    name !== undefined ? String(name).trim() : cur.name,
    interests !== undefined ? cleanInterests(interests) : cur.interests,
    homeCityId !== undefined ? Number(homeCityId) || null : cur.home_city_id,
    location !== undefined ? String(location).trim() : (cur.location || ''),
    avatarUrl !== undefined ? String(avatarUrl).trim() : (cur.avatar_url || ''),
    req.user.id,
  ]);
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(user) });
}));

r.post('/avatar', requireAuth, express.raw({ type: () => true, limit: '6mb' }), ah(async (req, res) => {
  const buf = req.body;
  if (!Buffer.isBuffer(buf) || !buf.length) return res.status(400).json({ error: 'No file received' });
  const ext = sniffImage(buf);
  if (!ext) return res.status(415).json({ error: 'Only JPEG, PNG or WebP images are allowed' });
  const name = `avatar_${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 20)}.${ext}`;
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(new URL(name, UPLOAD_DIR), buf);
  const url = `/uploads/${name}`;
  await query('UPDATE users SET avatar_url = ? WHERE id = ?', [url, req.user.id]);
  const [user] = await query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ url, user: publicUser(user) });
}));

// GET /api/auth/verify?token=...
r.get('/verify', ah(async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Missing verification token' });
  const [user] = await query('SELECT * FROM users WHERE verify_token = ?', [String(token)]);
  if (!user) {
    return res.status(400).json({ error: 'Verification link is invalid or has expired' });
  }
  if (!user.is_verified) {
    await query('UPDATE users SET is_verified = 1 WHERE id = ?', [user.id]);
  }
  const [updatedUser] = await query('SELECT * FROM users WHERE id = ?', [user.id]);
  res.json({
    ok: true,
    message: 'Email verified successfully! You are all set to explore Nepal.',
    token: signToken(updatedUser),
    user: publicUser(updatedUser),
  });
}));

// POST /api/auth/resend-verification
r.post('/resend-verification', ah(async (req, res) => {
  let user = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.slice(7), process.env.JWT_SECRET || 'dev-secret-change-me');
      const [u] = await query('SELECT * FROM users WHERE id = ?', [decoded.id]);
      user = u;
    } catch { /* proceed */ }
  }
  if (!user && req.body?.email) {
    const [u] = await query('SELECT * FROM users WHERE email = ?', [String(req.body.email).toLowerCase().trim()]);
    user = u;
  }
  if (!user) {
    return res.json({ ok: true, message: 'If an account exists with that email, a verification link has been sent.' });
  }
  if (user.is_verified) {
    return res.json({ ok: true, message: 'Your email is already verified. You can log in.' });
  }
  const verifyToken = crypto.randomBytes(32).toString('hex');
  await query('UPDATE users SET verify_token = ? WHERE id = ?', [verifyToken, user.id]);
  await sendVerificationEmail({ to: user.email, name: user.name, token: verifyToken });
  res.json({ ok: true, message: 'Verification email sent! Please check your inbox.' });
}));

// POST /api/auth/forgot-password
r.post('/forgot-password', ah(async (req, res) => {
  const { email } = req.body || {};
  if (!email || !EMAIL.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  const [user] = await query('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
  if (user && user.is_active) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    await query('UPDATE users SET reset_token = ?, reset_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR) WHERE id = ?', [resetToken, user.id]);
    sendPasswordResetEmail({ to: user.email, name: user.name, token: resetToken }).catch((err) => console.error('[email:reset]', err.message));
  }
  res.json({ ok: true, message: 'If an account exists with that email, we have sent password reset instructions.' });
}));

// POST /api/auth/reset-password
r.post('/reset-password', ah(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Missing password reset token' });
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password needs at least 6 characters' });
  const [user] = await query('SELECT * FROM users WHERE reset_token = ? AND reset_expires > NOW()', [String(token)]);
  if (!user) return res.status(400).json({ error: 'This password reset link is invalid or has expired' });
  const hash = await bcrypt.hash(password, 10);
  await query('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?', [hash, user.id]);
  res.json({ ok: true, message: 'Your password has been reset successfully. You can now log in.' });
}));

export default r;
