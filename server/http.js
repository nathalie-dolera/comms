function send(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(body));
}

function method(req, res, expected) {
  if (req.method === expected) return true;
  res.setHeader('Allow', expected);
  send(res, 405, { error: 'Method not allowed' });
  return false;
}

function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch { return {}; }
}

function cleanString(value, max = 200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

module.exports = { send, method, body, cleanString };
