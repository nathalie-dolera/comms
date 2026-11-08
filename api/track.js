const { getDb } = require('../server/db');
const { send, cleanString } = require('../server/http');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  const id = cleanString(req.query?.id, 40).toUpperCase();
  if (!/^COM-[A-F0-9]{18}$/.test(id)) return send(res, 400, { error: 'Enter the commission ID to check its status.' });
  try {
    const db = await getDb();
    const row = await db.collection('appData').findOne({ key: 'thalie_submissions', 'value.id': id }, { projection: { 'value.$': 1 } });
    const submission = row?.value?.[0];
    if (!submission) return send(res, 404, { error: 'Commission not found.' });
    return send(res, 200, { commission: {
      id: submission.id, service: submission.service, status: submission.status,
      deadline: submission.deadline || '', submittedAt: submission.submittedAt,
      amountPaid: submission.amountPaid || 0, agreedPrice: submission.agreedPrice || 0,
      balance: submission.balance || 0, paymentType: submission.paymentType || '',
      payment: submission.payment || '', description: submission.description || ''
    } });
  } catch (error) {
    console.error('Tracking API error:', error.message);
    return send(res, 500, { error: 'Tracking service is temporarily unavailable.' });
  }
};
