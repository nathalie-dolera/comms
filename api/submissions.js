const crypto = require('node:crypto');
const { getDb } = require('../server/db');
const { send, method, body, cleanString } = require('../server/http');
const { currentUser } = require('../server/auth');

module.exports = async (req, res) => {
  if (!method(req, res, 'POST')) return;
  try {
    const input = body(req);
    const name = cleanString(input.name, 100);
    const service = cleanString(input.service, 100);
    if (!name || !service) return send(res, 400, { error: 'Client name and service are required.' });
    const session = await currentUser(req);
    const row = {
      ...input,
      id: `COM-${crypto.randomBytes(9).toString('hex').toUpperCase()}`,
      name, service,
      submittedAt: new Date().toISOString(),
      createdBy: session?.id || null,
      status: 'Pending'
    };
    if (JSON.stringify(row).length > 1_500_000) return send(res, 413, { error: 'Submission is too large.' });
    const db = await getDb();
    await db.collection('appData').updateOne(
      { key: 'thalie_submissions' },
      { $push: { value: { $each: [row], $position: 0 } }, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    const paid = Number(row.amountPaid) || 0;
    if (paid > 0) {
      const agreedPrice = Number(row.agreedPrice) || 0;
      const payment = {
        id: `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
        clientName: row.name, service: row.service, amount: paid, agreedPrice,
        balance: Math.max(0, agreedPrice - paid), mode: row.payment || '',
        paymentType: row.paymentType || 'downpayment', status: 'Submitted',
        date: new Date().toISOString().slice(0, 10), receipt: row.downpaymentReceipt || '',
        notes: `Commission ${row.id}`, commId: row.id, aiVerified: false
      };
      await db.collection('appData').updateOne(
        { key: 'thalie_payments' },
        { $push: { value: { $each: [payment], $position: 0 } }, $set: { updatedAt: new Date() } },
        { upsert: true }
      );
    }
    return send(res, 201, { ok: true, id: row.id });
  } catch (error) {
    console.error('Submission API error:', error.message);
    return send(res, 500, { error: 'Could not save the commission request.' });
  }
};
