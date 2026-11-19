const { getDb } = require('../server/db');
const { send, body } = require('../server/http');
const { currentUser } = require('../server/auth');

// Commissioner & Admin endpoint to read/write full QR code data (including base64 images)
// bypassing the public data cache which strips images for size/performance.
module.exports = async (req, res) => {
  try {
    const session = await currentUser(req);
    if (!['admin', 'commissioner'].includes(session?.role)) {
      return send(res, 401, { error: 'Commissioner or Admin access required.' });
    }
    const db = await getDb();

    if (req.method === 'GET') {
      const row = await db.collection('appData').findOne({ key: 'thalie_site_settings' });
      const settings = row?.value || {};
      let paymentQrs = Array.isArray(settings.paymentQrs) ? settings.paymentQrs : [];
      // If no multi-QR list but legacy single QR exists, return it
      if (paymentQrs.length === 0 && settings.paymentQrCode) {
        paymentQrs = [{ id: 'qr-default', method: 'GCash', image: settings.paymentQrCode }];
      }
      return send(res, 200, { paymentQrs });
    }

    if (req.method === 'PUT') {
      const { paymentQrs } = body(req);
      if (!Array.isArray(paymentQrs)) {
        return send(res, 400, { error: 'paymentQrs must be an array.' });
      }
      // Validate each entry
      for (const q of paymentQrs) {
        if (!q.id || !q.method) {
          return send(res, 400, { error: 'Each QR entry must have id and method.' });
        }
      }
      // Size check: 4.5MB total
      const size = JSON.stringify(paymentQrs).length;
      if (size > 4_000_000) {
        return send(res, 413, { error: 'QR data too large. Please use smaller images.' });
      }

      // Read current settings then merge updated QRs
      const row = await db.collection('appData').findOne({ key: 'thalie_site_settings' });
      const settings = row?.value || {};
      settings.paymentQrs = paymentQrs;
      // Keep legacy single QR synced to first entry
      if (paymentQrs.length > 0 && paymentQrs[0].image) {
        settings.paymentQrCode = paymentQrs[0].image;
      } else {
        delete settings.paymentQrCode;
      }

      await db.collection('appData').updateOne(
        { key: 'thalie_site_settings' },
        { $set: { value: settings, updatedAt: new Date(), updatedBy: session.id } },
        { upsert: true }
      );
      return send(res, 200, { ok: true, count: paymentQrs.length });
    }

    return send(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Admin QR API error:', error.message);
    return send(res, 500, { error: 'QR service temporarily unavailable.' });
  }
};
