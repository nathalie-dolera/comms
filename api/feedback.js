const crypto = require('node:crypto');
const { getDb } = require('../server/db');
const { send, method, body, cleanString } = require('../server/http');

module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  try {
    const input = body(req);
    const clientName = cleanString(input.clientName, 100);
    const project = cleanString(input.project, 100);
    const notes = cleanString(input.notes, 1200);
    const imageUrl = typeof input.imageUrl === 'string' && /^data:image\/(png|jpeg|webp);base64,/.test(input.imageUrl) ? input.imageUrl : '';
    if (!clientName || !project) return send(res, 400, { error: 'Name and project are required.' });
    if (imageUrl.length > 4_000_000) return send(res, 413, { error: 'Feedback image must be under 3 MB.' });
    const feedback = { id: `FB-${crypto.randomBytes(8).toString('hex')}`, clientName, project, notes, imageUrl, date: new Date().toISOString().slice(0, 10) };
    const db = await getDb();
    await db.collection('appData').updateOne(
      { key: 'thalie_feedbacks' },
      { $push: { value: { $each: [feedback], $position: 0 } }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    if (imageUrl) await db.collection('appData').updateOne(
      { key: 'thalie_default_feedback_image' }, { $set: { value: imageUrl, updatedAt: new Date() } }, { upsert: true }
    );
    return send(res, 201, { ok: true });
  } catch (error) {
    console.error('Feedback API error:', error.message);
    return send(res, 500, { error: 'Could not submit feedback.' });
  }
};
