const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { ObjectId } = require('mongodb');
const { getDb } = require('./db');

const scrypt = promisify(crypto.scrypt);
const COOKIE = 'comms_session';
const SESSION_SECONDS = 60 * 60 * 8;

function configured() {
  return Boolean(process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32 && process.env.MONGODB_URI);
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${Buffer.from(key).toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const key = Buffer.from(await scrypt(password, Buffer.from(saltHex, 'hex'), 64));
  const expected = Buffer.from(hashHex, 'hex');
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

function sign(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function readCookie(req) {
  const raw = req.headers.cookie || '';
  const match = raw.split(';').map(v => v.trim()).find(v => v.startsWith(`${COOKIE}=`));
  return match ? decodeURIComponent(match.slice(COOKIE.length + 1)) : '';
}

function sessionFromRequest(req) {
  if (!configured()) return null;
  const token = readCookie(req);
  const [payloadPart, signaturePart] = token.split('.');
  if (!payloadPart || !signaturePart) return null;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET).update(payloadPart).digest();
  let supplied;
  try { supplied = Buffer.from(signaturePart, 'base64url'); } catch { return null; }
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString());
    if (!payload.exp || payload.exp < Date.now() || !payload.id || !payload.role) return null;
    return payload;
  } catch { return null; }
}

async function currentUser(req) {
  const claims = sessionFromRequest(req);
  if (!claims || !ObjectId.isValid(claims.id)) return null;
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: new ObjectId(claims.id) }, { projection: { passwordHash: 0 } });
  if (!user || user.status !== 'approved' || user.role !== claims.role) return null;
  return { ...claims, username: user.username, accountName: user.accountName, role: user.role, avatar: user.avatar || '' };
}

function setSessionCookie(res, user) {
  const now = Date.now();
  const token = sign({
    id: String(user._id),
    username: user.username,
    accountName: user.accountName,
    role: user.role,
    avatar: user.avatar || '',
    iat: now,
    exp: now + SESSION_SECONDS * 1000
  });
  const secureAttribute = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly${secureAttribute}; SameSite=Lax`);
}

function clearSessionCookie(res) {
  const secureAttribute = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0; HttpOnly${secureAttribute}; SameSite=Lax`);
}

async function seedMainAdmin() {
  const username = String(process.env.ADMIN_USERNAME || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!username || password.length < 12) return;
  const db = await getDb();
  const users = db.collection('users');
  await users.createIndex({ username: 1 }, { unique: true });
  const existing = await users.findOne({ role: 'admin' });
  if (existing) return;
  await users.insertOne({
    username,
    accountName: process.env.ADMIN_ACCOUNT_NAME || 'Main Admin',
    role: 'admin',
    status: 'approved',
    passwordHash: await hashPassword(password),
    createdAt: new Date(),
    avatar: ''
  });
}

async function requireSession(req, res, roles = []) {
  const session = sessionFromRequest(req);
  if (!session) {
    res.status(401).json({ error: 'Sign in is required.' });
    return null;
  }
  if (roles.length && !roles.includes(session.role)) {
    res.status(403).json({ error: 'You do not have access to this action.' });
    return null;
  }
  return session;
}

module.exports = {
  COOKIE, SESSION_SECONDS, configured, hashPassword, verifyPassword,
  setSessionCookie, clearSessionCookie, sessionFromRequest, seedMainAdmin, requireSession,
  currentUser
};
