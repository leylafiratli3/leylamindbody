const express = require('express');
const rateLimit = require('express-rate-limit');
const Stripe = require('stripe');
const { eq } = require('drizzle-orm');
const { db, schema } = require('../db');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Locale-specific pages the customer returns to after Stripe Checkout
const SUCCESS_PAGE = { en: '/checkout-success.html', tr: '/tr/odeme-basarili.html' };
const PRODUCT_PAGE = { en: '/product.html', tr: '/tr/ders.html' };

// POST /api/checkout { slug, locale } → { url }
// EN checks out in USD, TR in TRY. Buying is allowed without an account —
// the webhook creates/updates the account from the email Stripe collects.
router.post('/api/checkout', checkoutLimiter, async (req, res) => {
  try {
    const { slug } = req.body || {};
    const locale = req.body?.locale === 'tr' ? 'tr' : 'en';
    if (!slug) return res.status(400).json({ error: 'Missing product slug' });

    const [product] = await db.select().from(schema.products)
      .where(eq(schema.products.slug, slug));
    if (!product || !product.active) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const appUrl = process.env.APP_URL || 'https://leylafiratli.com';
    const stripePriceId = locale === 'tr' ? product.stripePriceIdTry : product.stripePriceIdUsd;

    // Use a pre-created Stripe Price when configured, otherwise inline price_data.
    const lineItem = stripePriceId
      ? { price: stripePriceId, quantity: 1 }
      : {
          price_data: {
            currency: locale === 'tr' ? 'try' : 'usd',
            unit_amount: locale === 'tr' ? product.priceTry : product.priceUsd,
            product_data: {
              name: locale === 'tr' ? product.titleTr : product.titleEn,
            },
          },
          quantity: 1,
        };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      allow_promotion_codes: true, // discount codes created in the Stripe dashboard just work
      line_items: [lineItem],
      success_url: `${appUrl}${SUCCESS_PAGE[locale]}?session_id={CHECKOUT_SESSION_ID}&p=${encodeURIComponent(product.slug)}`,
      cancel_url: `${appUrl}${PRODUCT_PAGE[locale]}?p=${encodeURIComponent(product.slug)}`,
      metadata: {
        product_id: product.id,
        locale,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('checkout failed:', err);
    res.status(500).json({ error: 'Could not start checkout' });
  }
});

module.exports = router;
