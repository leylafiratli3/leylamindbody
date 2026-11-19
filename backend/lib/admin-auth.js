const crypto = require('crypto');

// The admin password comes only from the ADMIN_PASSWORD secret (fly secrets set ADMIN_PASSWORD=...).
// There is no fallback: this repo is public, so a password written here would be no password at all.
// Without the secret, or with a short one, every admin route stays locked.
const MIN_LENGTH = 12;

function requireAdmin(req, res, next) {
  const password = process.env.ADMIN_PASSWORD || '';
  if (password.length < MIN_LENGTH) {
    return res.status(503).json({ error: 'Admin is locked: set the ADMIN_PASSWORD secret (12 characters or more).' });
  }
  const given = Buffer.from(String(req.headers.authorization || ''));
  const wanted = Buffer.from(`Bearer ${password}`);
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }
  next();
}

module.exports = { requireAdmin };
