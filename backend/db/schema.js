const { pgTable, uuid, text, integer, boolean, timestamp, primaryKey, unique } = require('drizzle-orm/pg-core');

// Products: singles carry Bunny video GUIDs per language; bundles reference singles via bundle_items.
const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  type: text('type', { enum: ['single', 'bundle'] }).notNull(),
  titleEn: text('title_en').notNull(),
  titleTr: text('title_tr').notNull(),
  descriptionEn: text('description_en').notNull(),
  descriptionTr: text('description_tr').notNull(),
  priceUsd: integer('price_usd').notNull(), // cents
  priceTry: integer('price_try').notNull(), // kuruş
  stripePriceIdUsd: text('stripe_price_id_usd'),
  stripePriceIdTry: text('stripe_price_id_try'),
  videoIdEn: text('video_id_en'), // Bunny GUID, null for bundles
  videoIdTr: text('video_id_tr'), // Bunny GUID, null for bundles
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

const bundleItems = pgTable('bundle_items', {
  bundleId: uuid('bundle_id').notNull().references(() => products.id),
  productId: uuid('product_id').notNull().references(() => products.id),
}, (t) => [
  primaryKey({ columns: [t.bundleId, t.productId] }),
]);

// user_id is the Supabase Auth UUID — users live in Supabase, not in this database.
const entitlements = pgTable('entitlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  productId: uuid('product_id').notNull().references(() => products.id),
  stripeSessionId: text('stripe_session_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique('entitlements_user_product_unique').on(t.userId, t.productId),
]);

// Idempotency ledger: a Stripe event id recorded here has already been fully processed.
const processedStripeEvents = pgTable('processed_stripe_events', {
  eventId: text('event_id').primaryKey(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

module.exports = { products, bundleItems, entitlements, processedStripeEvents };
