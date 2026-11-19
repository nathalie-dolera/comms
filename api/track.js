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

    // Also load payments to cross-reference actual payment status
    const payRow = await db.collection('appData').findOne({ key: 'thalie_payments' });
    const allPayments = Array.isArray(payRow?.value) ? payRow.value : [];

    const safeList = matches.map(submission => {
      // Find most recent matching payment by commId or client name
      const matchedPay = allPayments.find(p => p.commId === submission.id) ||
        allPayments.find(p => p.clientName && submission.name &&
          p.clientName.trim().toLowerCase() === submission.name.trim().toLowerCase());

      const resolvedAmountPaid = Number(matchedPay?.amount) || Number(submission.amountPaid) || 0;
      const resolvedAgreedPrice = Number(matchedPay?.agreedPrice) || Number(submission.agreedPrice) || 0;
      const resolvedBalance = matchedPay
        ? (Number(matchedPay.balance) || Math.max(0, resolvedAgreedPrice - resolvedAmountPaid))
        : (Number(submission.balance) || Math.max(0, resolvedAgreedPrice - resolvedAmountPaid));
      const resolvedPaymentType = matchedPay?.paymentType || submission.paymentType || '';
      const resolvedPayment = matchedPay?.mode || submission.payment || '';
      const isFullyPaid = resolvedPaymentType === 'fully_paid' || (resolvedAmountPaid > 0 && resolvedAgreedPrice > 0 && resolvedAmountPaid >= resolvedAgreedPrice);

      return {
        id: submission.id,
        name: submission.name,
        service: submission.service,
        status: submission.status || 'Pending',
        deadline: submission.deadline || '',
        submittedAt: submission.submittedAt,
        amountPaid: resolvedAmountPaid,
        agreedPrice: resolvedAgreedPrice,
        balance: isFullyPaid ? 0 : resolvedBalance,
        paymentType: isFullyPaid ? 'fully_paid' : resolvedPaymentType,
        payment: resolvedPayment,
        description: submission.description || '',
        adminNote: submission.adminNote || ''
      };
    });

    return send(res, 200, {
      commissions: safeList,
      commission: safeList[0]
    });
  } catch (error) {
    console.error('Tracking API error:', error.message);
    return send(res, 500, { error: 'Tracking service is temporarily unavailable.' });
  }
};
