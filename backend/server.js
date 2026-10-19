const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { getSignedPlaybackUrl } = require('./lib/video');
const { subscribeFreeClass } = require('./lib/sender');

const app = express();
app.set('trust proxy', 1); // behind Fly.io proxy — needed for correct client IPs (rate limiting)

// The site moved from mindbodyhealingwithleyla.com to leylafiratli.com. The old domain points
// here, and every old address gets a permanent redirect to the same page on the new domain.
const OLD_HOSTS = ['mindbodyhealingwithleyla.com', 'www.mindbodyhealingwithleyla.com'];
app.use((req, res, next) => {
  const host = (req.hostname || '').toLowerCase();
  if (OLD_HOSTS.includes(host)) return res.redirect(301, 'https://leylafiratli.com' + req.originalUrl);
  next();
});
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'leyla2026';
// No capacity limit

// Database setup
const dbPath = path.join(process.env.DATA_DIR || '.', 'registrations.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    registered_at TEXT NOT NULL DEFAULT ''
  )
`);

// Middleware
app.use(cors({
  origin: [
    'https://leylafiratli.com',
    'https://www.leylafiratli.com',
    'https://mindbodyhealingwithleyla.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Stripe webhook needs the raw request body for signature verification,
// so it is mounted before the JSON body parser.
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), require('./routes/stripe-webhook'));

app.use(express.json());

// Video store (data in Neon via Drizzle — see routes/ and db/)
app.use(require('./routes/products'));
app.use(require('./routes/checkout'));
app.use(require('./routes/video-token'));
app.use(require('./routes/admin-sales'));

// Auth middleware for admin routes
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${ADMIN_PASSWORD}`) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }
  next();
}

// POST /api/register - Public signup
app.post('/api/register', (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone?.trim()) {
    return res.status(400).json({ error: 'Ad, e-posta ve telefon zorunludur' });
  }

  // Check duplicate email
  const existing = db.prepare('SELECT id FROM registrations WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ error: 'Bu e-posta zaten kayıtlı', code: 'DUPLICATE' });
  }

  try {
    const stmt = db.prepare("INSERT INTO registrations (name, email, phone, registered_at) VALUES (?, ?, ?, datetime('now'))");
    stmt.run(name.trim(), email.toLowerCase().trim(), phone?.trim() || null);
    res.status(201).json({ message: 'Kayıt başarılı' });
  } catch (err) {
    res.status(500).json({ error: 'Bir hata oluştu' });
  }
});

// ---- Free class lead magnet (email → instant on-demand video) ----

const freeClassLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

function freeClassVideoId(locale) {
  if (locale === 'tr' && process.env.FREE_CLASS_VIDEO_ID_TR) {
    return process.env.FREE_CLASS_VIDEO_ID_TR;
  }
  return process.env.FREE_CLASS_VIDEO_ID_EN || process.env.FREE_CLASS_VIDEO_ID;
}

// POST /api/free-class/signup { name, email, locale } — saves the lead and
// subscribes them to Sender (if configured). A duplicate email still returns ok
// so returning visitors can watch.
app.post('/api/free-class/signup', freeClassLimiter, async (req, res) => {
  const { name, email } = req.body || {};
  const locale = req.body?.locale === 'tr' ? 'tr' : 'en';

  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanName = (name || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required' });
  }

  // Save the lead (UNIQUE email → already signed up, which is fine).
  try {
    db.prepare("INSERT INTO registrations (name, email, phone, registered_at) VALUES (?, ?, ?, datetime('now'))")
      .run(cleanName || cleanEmail, cleanEmail, null);
  } catch (err) {
    if (!/UNIQUE/i.test(err.message)) {
      console.error('free-class signup DB error:', err.message);
    }
  }

  // Subscribe to Sender — never block access if this fails.
  try {
    await subscribeFreeClass({
      email: cleanEmail,
      firstName: cleanName.split(' ')[0],
      locale,
    });
  } catch (err) {
    console.error('Sender subscribe failed:', err.message);
  }

  res.status(201).json({ ok: true });
});

// GET /api/free-class/video?locale=en — short-lived signed Bunny playback URL.
app.get('/api/free-class/video', (req, res) => {
  const locale = req.query.locale === 'tr' ? 'tr' : 'en';
  const videoId = freeClassVideoId(locale);
  if (!videoId) return res.status(404).json({ error: 'Video not configured yet' });
  try {
    const url = getSignedPlaybackUrl(videoId, { expiresInSeconds: 6 * 3600 });
    res.json({ url });
  } catch (err) {
    console.error('free-class video failed:', err.message);
    res.status(500).json({ error: 'Could not load the video' });
  }
});

// GET /api/registrations - Admin: list all
app.get('/api/registrations', requireAdmin, (req, res) => {
  const registrations = db.prepare('SELECT * FROM registrations ORDER BY id ASC').all();
  const total = registrations.length;
  const withPhone = registrations.filter(r => r.phone).length;

  res.json({
    registrations,
    stats: {
      total,
      withPhone,
      withPhone
    }
  });
});

// DELETE /api/registrations/:id - Admin: delete one
app.delete('/api/registrations/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM registrations WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Kayıt bulunamadı' });
  }
  res.json({ message: 'Silindi' });
});

// DELETE /api/registrations - Admin: clear all
app.delete('/api/registrations', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM registrations').run();
  res.json({ message: 'Tüm kayıtlar silindi' });
});

// GET /api/registrations/export - Admin: CSV (supports ?auth= query param for direct download)
app.get('/api/registrations/export', (req, res, next) => {
  if (req.query.auth) {
    req.headers.authorization = `Bearer ${req.query.auth}`;
  }
  requireAdmin(req, res, next);
}, (req, res) => {
  const registrations = db.prepare('SELECT * FROM registrations ORDER BY id ASC').all();

  let csv = '\uFEFF'; // BOM for Turkish
  csv += 'Ad Soyad,E-posta,Telefon,Kayıt Tarihi\n';
  registrations.forEach(r => {
    csv += [r.name, r.email, r.phone || '', r.registered_at]
      .map(c => '"' + String(c).replace(/"/g, '""') + '"')
      .join(',') + '\n';
  });

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=zihin_beden_yolu_kayitlar.csv');
  res.send(csv);
});

// Root
app.get('/', (req, res) => res.json({ app: 'Leyla Mindbody API', status: 'ok' }));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
