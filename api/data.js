const { getDb } = require('../server/db');
const { send, method, body } = require('../server/http');
const { currentUser } = require('../server/auth');

const PUBLIC_KEYS = [
  'thalie_about_content', 'thalie_terms_content', 'thalie_output_categories',
  'thalie_outputs', 'thalie_feedbacks', 'thalie_services',
  'thalie_site_settings', 'thalie_site_theme', 'thalie_calendar_events',
  'thalie_default_feedback_image'
];
const ADMIN_ONLY = new Set([
  'thalie_submissions', 'thalie_payments', 'thalie_payment_proofs',
  'thalie_client_accounts', 'thalie_admin_users'
]);
const STAFF_WRITE = new Set(['thalie_submissions', 'thalie_payments', 'thalie_payment_proofs', 'thalie_calendar_events']);
const PRIVATE_READ = new Set(['thalie_submissions', 'thalie_payments', 'thalie_payment_proofs']);
const ALLOWED = new Set([...PUBLIC_KEYS, ...ADMIN_ONLY]);

module.exports = async (req, res) => {
  try {
    const session = await currentUser(req);
    const db = await getDb();
    if (req.method === 'GET') {
      const visibleKeys = session?.role === 'admin'
        ? null
        : session?.role === 'commissioner' ? [...PUBLIC_KEYS, ...PRIVATE_READ] : PUBLIC_KEYS;
      const filter = visibleKeys ? { key: { $in: visibleKeys } } : {};
      const rows = await db.collection('appData').find(filter).toArray();
      const data = Object.fromEntries(rows.map(row => [row.key, row.value]));
      // Merge accepted commission deadlines into calendar events for client & admin calendars
      const subRow = await db.collection('appData').findOne({ key: 'thalie_submissions' });
      const allSubs = Array.isArray(subRow?.value) ? subRow.value : [];
      const acceptedDeadlines = allSubs
        .filter(s => s.deadline && (s.status === 'Accepted' || s.status === 'In Progress' || s.status === 'Done'))
        .map(s => ({
          id: 'comm-dl-' + s.id,
          date: String(s.deadline).slice(0, 10),
          title: `Deadline: ${s.name} (${s.service || 'Commission'})`,
          type: 'deadline',
          status: 'busy'
        }));
      const baseEvents = Array.isArray(data.thalie_calendar_events) ? data.thalie_calendar_events : [];
      data.thalie_calendar_events = [...baseEvents.filter(e => !e.id?.startsWith('comm-dl-')), ...acceptedDeadlines];

      if (session?.role === 'admin') {
        const users = await db.collection('users').find({ role: 'commissioner' }, {
          projection: { passwordHash: 0 }
        }).sort({ createdAt: -1 }).toArray();
        data.thalie_admin_users = users.map(user => ({
          id: String(user._id), username: user.username, accountName: user.accountName,
          name: user.accountName, avatar: user.avatar || '', createdAt: user.createdAt,
          approvalStatus: user.status, paid: user.paid === true, paymentStatus: user.paid ? 'paid' : 'not_paid'
        }));
      }
      return send(res, 200, { data, user: session });
    }
    if (!method(req, res, 'PUT')) return;
    if (!['admin', 'commissioner'].includes(session?.role)) return send(res, 401, { error: 'An approved Commissioner Portal sign in is required to change data.' });
    const { key, value } = body(req);
    if (!ALLOWED.has(key) || key === 'thalie_admin_users' || key === 'thalie_client_accounts' || (session.role !== 'admin' && !STAFF_WRITE.has(key))) {
      return send(res, 400, { error: 'That data set cannot be changed through this endpoint.' });
    }
    if (JSON.stringify(value).length > 4_500_000) return send(res, 413, { error: 'This data set is too large.' });
    await db.collection('appData').updateOne(
      { key },
      { $set: { value, updatedAt: new Date(), updatedBy: session.id } },
      { upsert: true }
    );
    return send(res, 200, { ok: true });
  } catch (error) {
    console.error('Data API error:', error.message);
    return send(res, 500, { error: 'Data service is temporarily unavailable.' });
  }
};
