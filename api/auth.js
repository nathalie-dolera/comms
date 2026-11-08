const { getDb } = require('../server/db');
const { send, method, body, cleanString } = require('../server/http');
const { configured, seedMainAdmin, hashPassword, verifyPassword, setSessionCookie, clearSessionCookie, currentUser } = require('../server/auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!configured()) return send(res, 503, { error: 'Authentication is not configured.' });
    return send(res, 200, { user: await currentUser(req) });
  }
  if (!method(req, res, 'POST')) return;
  if (!configured()) return send(res, 503, { error: 'Set MONGODB_URI and SESSION_SECRET in Vercel first.' });

  try {
    const input = body(req);
    const action = cleanString(input.action, 20);
    if (action === 'logout') {
      clearSessionCookie(res);
      return send(res, 200, { ok: true });
    }

    const db = await getDb();
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ role: 1, status: 1 });
    if (action === 'register') {
      const accountName = cleanString(input.accountName, 80);
      const username = accountName.toLowerCase();
      const password = typeof input.password === 'string' ? input.password : '';
      if (accountName.length < 3 || password.length < 12) return send(res, 400, { error: 'Use an account name with at least 3 characters and a password with at least 12.' });
      const user = {
        username, accountName, role: 'commissioner', status: 'pending',
        passwordHash: await hashPassword(password),
        avatar: typeof input.avatar === 'string' && input.avatar.startsWith('data:image/') ? input.avatar.slice(0, 350000) : '',
        createdAt: new Date()
      };
      try { await db.collection('users').insertOne(user); }
      catch (error) {
        if (error.code === 11000) return send(res, 409, { error: 'That commissioner account name is already registered.' });
        throw error;
      }
      return send(res, 201, { ok: true, status: 'pending' });
    }
    if (action === 'login') {
      await seedMainAdmin();
      const accountName = cleanString(input.accountName, 80).toLowerCase();
      const password = typeof input.password === 'string' ? input.password : '';
      const user = await db.collection('users').findOne({ username: accountName });
      if (!user || !(await verifyPassword(password, user.passwordHash))) return send(res, 401, { error: 'Invalid account name or password.' });
      if (user.status !== 'approved') return send(res, 403, { error: user.status === 'declined' ? 'This account was declined. Contact the Main Admin.' : 'Your account is awaiting Main Admin approval.' });
      setSessionCookie(res, user);
      return send(res, 200, { user: { id: String(user._id), username: user.username, accountName: user.accountName, role: user.role, avatar: user.avatar || '' } });
    }
    return send(res, 400, { error: 'Unknown authentication action.' });
  } catch (error) {
    console.error('Authentication API error:', error.message);
    return send(res, 500, { error: 'Authentication service is temporarily unavailable.' });
  }
};
