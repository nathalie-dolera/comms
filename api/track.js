const { getDb } = require('../server/db');
const { send, cleanString } = require('../server/http');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'Method not allowed.' });
  }
  const query = cleanString(req.query?.name || req.query?.q || req.query?.id || '', 100).trim();
  if (!query) return send(res, 400, { error: 'Enter your client name to check status.' });

  try {
    const db = await getDb();
    const row = await db.collection('appData').findOne({ key: 'thalie_submissions' });
    const submissions = Array.isArray(row?.value) ? row.value : [];
    
    const qLower = query.toLowerCase();
    const matches = submissions.filter(s => {
      const nameMatch = String(s.name || '').toLowerCase().includes(qLower);
      const idMatch = String(s.id || '').toLowerCase() === qLower;
      return nameMatch || idMatch;
    });

    if (!matches.length) return send(res, 404, { error: `No commissions found for "${query}".` });

    const safeList = matches.map(submission => ({
      id: submission.id,
      name: submission.name,
      service: submission.service,
      status: submission.status || 'Pending',
      deadline: submission.deadline || '',
      submittedAt: submission.submittedAt,
      amountPaid: submission.amountPaid || 0,
      agreedPrice: submission.agreedPrice || 0,
      balance: submission.balance || 0,
      paymentType: submission.paymentType || '',
      payment: submission.payment || '',
      description: submission.description || ''
    }));

    return send(res, 200, {
      commissions: safeList,
      commission: safeList[0]
    });
  } catch (error) {
    console.error('Tracking API error:', error.message);
    return send(res, 500, { error: 'Tracking service is temporarily unavailable.' });
  }
};
