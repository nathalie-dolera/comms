const { getDb } = require('../server/db');
const { send, method, body, cleanString } = require('../server/http');

module.exports = async (req, res) => {
  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const q = cleanString(req.query?.q || '', 100).toLowerCase().trim();
      if (!q) {
        return send(res, 200, { commissions: [] });
      }

      const row = await db.collection('appData').findOne({ key: 'thalie_submissions' });
      const submissions = Array.isArray(row?.value) ? row.value : [];

      const matches = submissions.filter(s => {
        const nameMatch = String(s.name || '').toLowerCase().includes(q);
        const idMatch = String(s.id || '').toLowerCase().includes(q);
        return nameMatch || idMatch;
      }).slice(0, 10);

      const safeMatches = matches.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email || '',
        contact: s.contact || '',
        service: s.service || '',
        category: s.category || '',
        description: s.description || '',
        deadline: s.deadline || '',
        agreedPrice: Number(s.agreedPrice) || 0,
        amountPaid: Number(s.amountPaid) || 0,
        balance: Number(s.balance) || 0,
        status: s.status || 'Pending',
        referenceFiles: Array.isArray(s.referenceFiles) ? s.referenceFiles : [],
        submittedAt: s.submittedAt || ''
      }));

      return send(res, 200, { commissions: safeMatches });
    }

    if (req.method === 'PUT') {
      const input = body(req);
      const id = cleanString(input.id, 50).toUpperCase();
      const name = cleanString(input.name, 100);

      if (!id || !name) {
        return send(res, 400, { error: 'Commission ID and client name are required.' });
      }

      const row = await db.collection('appData').findOne({ key: 'thalie_submissions' });
      const submissions = Array.isArray(row?.value) ? row.value : [];
      const idx = submissions.findIndex(s => String(s.id).toUpperCase() === id);

      if (idx === -1) {
        return send(res, 404, { error: 'Commission not found.' });
      }

      // Update project details only
      submissions[idx].name = name;
      if (input.email !== undefined) submissions[idx].email = cleanString(input.email, 150);
      if (input.contact !== undefined) submissions[idx].contact = cleanString(input.contact, 150);
      if (input.service !== undefined) submissions[idx].service = cleanString(input.service, 100);
      if (input.description !== undefined) submissions[idx].description = cleanString(input.description, 3000);
      if (input.deadline !== undefined) submissions[idx].deadline = cleanString(input.deadline, 50);
      if (Array.isArray(input.referenceFiles)) submissions[idx].referenceFiles = input.referenceFiles;
      submissions[idx].updatedAt = new Date().toISOString();

      await db.collection('appData').updateOne(
        { key: 'thalie_submissions' },
        { $set: { value: submissions, updatedAt: new Date() } }
      );

      return send(res, 200, { ok: true, commission: submissions[idx] });
    }

    res.setHeader('Allow', 'GET, PUT');
    return send(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Client commissions API error:', error.message);
    return send(res, 500, { error: 'Service is temporarily unavailable.' });
  }
};
