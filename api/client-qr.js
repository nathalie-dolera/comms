const { getDb } = require('../server/db');
const { send } = require('../server/http');

// Public read-only endpoint returning QR codes for payment.
// Clients fetch this only when viewing payment options, keeping data.js fast.
module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      return send(res, 405, { error: 'Method not allowed.' });
    }

    const db = await getDb();
    const row = await db.collection('appData').findOne({ key: 'thalie_site_settings' });
    const settings = row?.value || {};
    let paymentQrs = Array.isArray(settings.paymentQrs) ? settings.paymentQrs : [];

    if (paymentQrs.length === 0 && settings.paymentQrCode) {
      paymentQrs = [{ id: 'qr-default', method: 'GCash', image: settings.paymentQrCode }];
    }

    // Return the list of QRs
    return send(res, 200, { paymentQrs });
  } catch (error) {
    console.error('Client QR error:', error.message);
    return send(res, 500, { error: 'Failed to retrieve QR codes.' });
  }
};
