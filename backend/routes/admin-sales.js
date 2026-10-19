const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { eq, desc } = require('drizzle-orm');
const { db, schema } = require('../db');

const router = express.Router();

// Same Bearer-password guard as the registrations admin (see server.js).
function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  const password = process.env.ADMIN_PASSWORD || 'leyla2026';
  if (!auth || auth !== `Bearer ${password}`) {
    return res.status(401).json({ error: 'Yetkisiz erişim' });
  }
  next();
}

// Buyer emails live in Supabase Auth, not Neon — resolve them via the admin API,
// caching per request since one buyer often owns several products.
async function resolveEmails(userIds) {
  const admin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const emails = {};
  for (const id of [...new Set(userIds)]) {
    try {
      const { data } = await admin.auth.admin.getUserById(id);
      emails[id] = data?.user?.email || '?';
    } catch {
      emails[id] = '?';
    }
  }
  return emails;
}

// GET /api/admin/sales — every entitlement with buyer email and product title.
// Supports ?auth= query param like the registrations CSV export.
router.get('/api/admin/sales', (req, res, next) => {
  if (req.query.auth) req.headers.authorization = `Bearer ${req.query.auth}`;
  requireAdmin(req, res, next);
}, async (req, res) => {
  try {
    const rows = await db.select({
      id: schema.entitlements.id,
      userId: schema.entitlements.userId,
      stripeSessionId: schema.entitlements.stripeSessionId,
      createdAt: schema.entitlements.createdAt,
      titleEn: schema.products.titleEn,
      titleTr: schema.products.titleTr,
      slug: schema.products.slug,
    })
      .from(schema.entitlements)
      .innerJoin(schema.products, eq(schema.entitlements.productId, schema.products.id))
      .orderBy(desc(schema.entitlements.createdAt));

    const emails = await resolveEmails(rows.map((r) => r.userId));
    const sales = rows.map((r) => ({
      email: emails[r.userId],
      product: r.titleTr || r.titleEn,
      slug: r.slug,
      stripeSessionId: r.stripeSessionId,
      createdAt: r.createdAt,
    }));

    res.json({
      sales,
      stats: {
        total: sales.length,
        uniqueBuyers: new Set(rows.map((r) => r.userId)).size,
      },
    });
  } catch (err) {
    console.error('admin sales failed:', err);
    res.status(500).json({ error: 'Satışlar yüklenemedi' });
  }
});

module.exports = router;
