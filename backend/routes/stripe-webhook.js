const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { eq, inArray, and } = require('drizzle-orm');
const { db, schema } = require('../db');
const { sendSetPasswordEmail, sendReceipt } = require('../lib/email');

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// Service-role client: server-side only, used to find-or-create the buyer's
// Supabase Auth account and mint the set-password (invite/recovery) link.
function supabaseAdmin() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

const SET_PASSWORD_PAGE = { en: '/en/set-password.html', tr: '/tr/sifre-olustur.html' };

async function alreadyProcessed(eventId) {
  const [row] = await db.select().from(schema.processedStripeEvents)
    .where(eq(schema.processedStripeEvents.eventId, eventId));
  return !!row;
}

async function recordProcessed(eventId) {
  await db.insert(schema.processedStripeEvents)
    .values({ eventId })
    .onConflictDoNothing();
}

// A bundle expands into one entitlement per included single, so the watch
// check is always just "does this user own this product?".
async function expandToProductIds(product) {
  if (product.type !== 'bundle') return [product.id];
  const items = await db.select().from(schema.bundleItems)
    .where(eq(schema.bundleItems.bundleId, product.id));
  return items.map((i) => i.productId);
}

async function handleCheckoutCompleted(event) {
  const session = event.data.object;
  const email = session.customer_details?.email || session.customer_email;
  const productId = session.metadata?.product_id;
  const locale = session.metadata?.locale === 'tr' ? 'tr' : 'en';

  if (!email || !productId) {
    console.error(`webhook ${event.id}: missing email or product_id metadata`);
    return;
  }

  const [product] = await db.select().from(schema.products)
    .where(eq(schema.products.id, productId));
  if (!product) {
    console.error(`webhook ${event.id}: unknown product ${productId}`);
    return;
  }

  const admin = supabaseAdmin();
  const appUrl = process.env.APP_URL || 'https://mindbodyhealingwithleyla.com';
  const redirectTo = `${appUrl}${SET_PASSWORD_PAGE[locale]}`;

  // Find-or-create the Supabase user. generateLink(type: 'invite') creates the
  // user and returns a set-password link WITHOUT sending Supabase's own email
  // (we send our own via Resend). If the email already has an account it fails,
  // and we fall back to a recovery link just to resolve the existing user's id.
  let userId;
  let isNewUser = false;
  let actionLink = null;

  const invite = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo },
  });
  if (!invite.error) {
    isNewUser = true;
    userId = invite.data.user.id;
    actionLink = invite.data.properties.action_link;
  } else {
    const recovery = await admin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo },
    });
    if (recovery.error) {
      throw new Error(`Supabase user lookup failed for ${email}: ${recovery.error.message}`);
    }
    userId = recovery.data.user.id;
    // Existing account: don't email the recovery link, just a receipt.
  }

  // Grant entitlements (bundle → one row per included single); unique
  // constraint + onConflictDoNothing make repeat grants harmless.
  const grantIds = await expandToProductIds(product);
  if (grantIds.length) {
    await db.insert(schema.entitlements)
      .values(grantIds.map((pid) => ({
        userId,
        productId: pid,
        stripeSessionId: session.id,
      })))
      .onConflictDoNothing();
  }

  const productTitle = locale === 'tr' ? product.titleTr : product.titleEn;
  try {
    if (isNewUser) {
      await sendSetPasswordEmail({ to: email, locale, productTitle, actionLink });
    } else {
      await sendReceipt({ to: email, locale, productTitle });
    }
  } catch (err) {
    // Access is already granted; a failed email should not fail the webhook.
    console.error(`webhook ${event.id}: email send failed:`, err);
  }
}

// Refunds and disputes revoke the entitlements from the matching Checkout session.
async function handleRevocation(event) {
  const object = event.data.object; // charge (refund) or dispute
  const paymentIntent = object.payment_intent;
  if (!paymentIntent) return;

  const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent });
  const sessionIds = sessions.data.map((s) => s.id);
  if (!sessionIds.length) return;

  await db.delete(schema.entitlements)
    .where(inArray(schema.entitlements.stripeSessionId, sessionIds));
  console.log(`webhook ${event.id}: revoked entitlements for sessions ${sessionIds.join(', ')}`);
}

// POST /api/stripe/webhook — mounted with express.raw() so the signature
// can be verified against the exact bytes Stripe sent.
router.post('/', async (req, res) => {
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    if (await alreadyProcessed(event.id)) {
      return res.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event);
        break;
      case 'charge.refunded':
      case 'charge.dispute.created':
        await handleRevocation(event);
        break;
      default:
        break; // ignore other events
    }

    await recordProcessed(event.id);
    res.json({ received: true });
  } catch (err) {
    // 500 → Stripe retries; the event ledger keeps retries idempotent.
    console.error(`webhook ${event.id} (${event.type}) failed:`, err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
