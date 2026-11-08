const { ObjectId } = require('mongodb');
const { getDb } = require('../server/db');
const { send, method, body, cleanString } = require('../server/http');
const { currentUser } = require('../server/auth');

module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  const session = await currentUser(req);
  if (!session || session.role !== 'admin') return send(res, 401, { error: 'Main Admin sign in is required.' });
  try {
    const input = body(req);
    const id = cleanString(input.id, 80);
    const status = cleanString(input.status, 20);
    const update = {};
    if (typeof input.paid === 'boolean') update.paid = input.paid;
    if (status) {
      if (!['approved', 'declined', 'pending'].includes(status)) return send(res, 400, { error: 'Invalid account decision.' });
      update.status = status;
    }
    if (!ObjectId.isValid(id) || !Object.keys(update).length) {
      return send(res, 400, { error: 'Invalid account update.' });
    }
    const db = await getDb();
    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), role: 'commissioner' },
      { $set: { ...update, updatedAt: new Date(), updatedBy: session.id } }
    );
    if (!result.matchedCount) return send(res, 404, { error: 'Commissioner account not found.' });
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('Account API error:', error.message);
    return send(res, 500, { error: 'Account update failed.' });
  }
};
