const { ObjectId } = require('mongodb');
const { getDb } = require('../server/db');
const { send, method, body } = require('../server/http');
const { currentUser } = require('../server/auth');

module.exports = async (req, res) => {
  if (!method(req, res, 'PUT')) return;
  const user = await currentUser(req);
  if (!user) return send(res, 401, { error: 'Sign in is required.' });
  const avatar = body(req).avatar;
  if (typeof avatar !== 'string' || !/^data:image\/(png|jpeg|webp);base64,/.test(avatar) || avatar.length > 1_500_000) {
    return send(res, 400, { error: 'Choose a PNG, JPEG, or WebP profile image under 1 MB.' });
  }
  try {
    const db = await getDb();
    await db.collection('users').updateOne({ _id: new ObjectId(user.id) }, { $set: { avatar, updatedAt: new Date() } });
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('Profile API error:', error.message);
    return send(res, 500, { error: 'Could not save profile image.' });
  }
};
