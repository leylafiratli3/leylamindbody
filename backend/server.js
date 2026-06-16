const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
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
    'https://mindbodyhealingwithleyla.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

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
