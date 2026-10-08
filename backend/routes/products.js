const express = require('express');
const { eq, inArray } = require('drizzle-orm');
const { db, schema } = require('../db');
const { requireSupabaseUser } = require('../middleware/supabase-auth');

const router = express.Router();

// Localized public shape — never exposes Bunny video IDs or Stripe price IDs.
function publicProduct(p, locale) {
  const tr = locale === 'tr';
  return {
    slug: p.slug,
    type: p.type,
    title: tr ? p.titleTr : p.titleEn,
    description: tr ? p.descriptionTr : p.descriptionEn,
    price: tr ? p.priceTry : p.priceUsd, // minor units (cents / kuruş)
    currency: tr ? 'TRY' : 'USD',
  };
}

// GET /api/products?locale=en|tr — public: active products for the store page
router.get('/api/products', async (req, res) => {
  try {
    const locale = req.query.locale === 'tr' ? 'tr' : 'en';
    const rows = await db.select().from(schema.products).where(eq(schema.products.active, true));
    res.json({ products: rows.map((p) => publicProduct(p, locale)) });
  } catch (err) {
    console.error('products list failed:', err);
    res.status(500).json({ error: 'Could not load products' });
  }
});

// GET /api/products/:slug?locale=en|tr — public: one product (+ bundle contents)
router.get('/api/products/:slug', async (req, res) => {
  try {
    const locale = req.query.locale === 'tr' ? 'tr' : 'en';
    const [product] = await db.select().from(schema.products)
      .where(eq(schema.products.slug, req.params.slug));
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const result = publicProduct(product, locale);
    if (product.type === 'bundle') {
      const items = await db.select().from(schema.bundleItems)
        .where(eq(schema.bundleItems.bundleId, product.id));
      const singles = items.length
        ? await db.select().from(schema.products)
            .where(inArray(schema.products.id, items.map((i) => i.productId)))
        : [];
      result.includes = singles.map((s) => publicProduct(s, locale));
    }
    res.json({ product: result });
  } catch (err) {
    console.error('product fetch failed:', err);
    res.status(500).json({ error: 'Could not load product' });
  }
});

// GET /api/library?locale=en|tr — auth: everything the user owns
router.get('/api/library', requireSupabaseUser, async (req, res) => {
  try {
    const locale = req.query.locale === 'tr' ? 'tr' : 'en';
    const owned = await db.select({ product: schema.products })
      .from(schema.entitlements)
      .innerJoin(schema.products, eq(schema.entitlements.productId, schema.products.id))
      .where(eq(schema.entitlements.userId, req.user.id));
    res.json({ products: owned.map((r) => publicProduct(r.product, locale)) });
  } catch (err) {
    console.error('library fetch failed:', err);
    res.status(500).json({ error: 'Could not load library' });
  }
});

module.exports = router;
