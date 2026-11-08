const crypto = require('node:crypto');
const { getDb } = require('../server/db');
const { send, method, body, cleanString } = require('../server/http');

module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  try {
    const input = body(req);
    const clientName = cleanString(input.clientName, 100);
    const receipt = typeof input.receipt === 'string' ? input.receipt : '';
    if (!clientName || !/^data:image\/(png|jpeg|webp);base64,/.test(receipt)) {
      return send(res, 400, { error: 'Client name and a PNG, JPEG, or WebP screenshot are required.' });
    }
    if (receipt.length > 4_000_000) return send(res, 413, { error: 'Payment screenshot must be under 3 MB.' });
    const row = {
      id: `PROOF-${crypto.randomBytes(9).toString('hex')}`,
      clientName,
      receipt,
      amount: Number(input.amount) || 0,
      paymentType: cleanString(input.paymentType || 'downpayment', 30),
      mode: cleanString(input.mode || 'GCash', 50),
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };
    const db = await getDb();
    await db.collection('appData').updateOne(
      { key: 'thalie_payment_proofs' },
      { $push: { value: { $each: [row], $position: 0 } }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    return send(res, 201, { ok: true });
  } catch (error) {
    console.error('Payment proof API error:', error.message);
    return send(res, 500, { error: 'Could not submit payment proof.' });
  }
};
