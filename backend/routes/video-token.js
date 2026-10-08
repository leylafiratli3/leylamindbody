const express = require('express');
const rateLimit = require('express-rate-limit');
const { eq, and } = require('drizzle-orm');
const { db, schema } = require('../db');
const { requireSupabaseUser } = require('../middleware/supabase-auth');
const { getSignedPlaybackUrl } = require('../lib/video');

const router = express.Router();

const tokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/video-token { slug, locale } + Bearer <supabase access token>
// Verifies the JWT, confirms the entitlement in Neon, then mints a
// short-lived signed Bunny URL for the requested language variant.
// Never returns a URL without the ownership check.
router.post('/api/video-token', tokenLimiter, requireSupabaseUser, async (req, res) => {
  try {
    const { slug } = req.body || {};
    const locale = req.body?.locale === 'tr' ? 'tr' : 'en';
    if (!slug) return res.status(400).json({ error: 'Missing product slug' });

    const [product] = await db.select().from(schema.products)
      .where(eq(schema.products.slug, slug));
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Product not found' });
    }
    if (product.type !== 'single') {
      return res.status(400).json({ error: 'Bundles have no video of their own — open one of the included videos' });
    }

    const [entitlement] = await db.select().from(schema.entitlements)
      .where(and(
        eq(schema.entitlements.userId, req.user.id),
        eq(schema.entitlements.productId, product.id)
      ));
    if (!entitlement) {
      return res.status(403).json({ error: 'not_owned' });
    }

    const videoId = locale === 'tr' ? product.videoIdTr : product.videoIdEn;
    if (!videoId) {
      return res.status(404).json({ error: 'Video not available in this language yet' });
    }

    const url = getSignedPlaybackUrl(videoId, { expiresInSeconds: 3600 });
    res.json({ url, expiresInSeconds: 3600 });
  } catch (err) {
    console.error('video-token failed:', err);
    res.status(500).json({ error: 'Could not create playback URL' });
  }
});

module.exports = router;
