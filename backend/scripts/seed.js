// One-time seed: two single videos + one bundle containing both.
// Fill in every `// TODO: fill in` value below, then run:
//   DATABASE_URL=... npm run seed
// The script refuses to run while TODO placeholders remain, so nothing
// invented ever lands in the database. Safe to re-run: existing slugs are skipped.
const { eq } = require('drizzle-orm');
const { db, schema } = require('../db');

const TODO = 'TODO';

const SINGLES = [
  {
    slug: 'video-1', // TODO: fill in — URL-friendly id, shared by EN and TR pages
    titleEn: TODO,   // TODO: fill in — English title
    titleTr: TODO,   // TODO: fill in — Turkish title
    descriptionEn: TODO, // TODO: fill in
    descriptionTr: TODO, // TODO: fill in
    priceUsd: 0,     // TODO: fill in — USD price in CENTS (e.g. 2900 = $29.00)
    priceTry: 0,     // TODO: fill in — TRY price in KURUŞ (e.g. 89900 = ₺899.00)
    videoIdEn: TODO, // TODO: fill in — Bunny Stream video GUID (English version)
    videoIdTr: TODO, // TODO: fill in — Bunny Stream video GUID (Turkish version)
  },
  {
    slug: 'video-2', // TODO: fill in
    titleEn: TODO,   // TODO: fill in
    titleTr: TODO,   // TODO: fill in
    descriptionEn: TODO, // TODO: fill in
    descriptionTr: TODO, // TODO: fill in
    priceUsd: 0,     // TODO: fill in — cents
    priceTry: 0,     // TODO: fill in — kuruş
    videoIdEn: TODO, // TODO: fill in
    videoIdTr: TODO, // TODO: fill in
  },
];

const BUNDLE = {
  slug: 'bundle-both', // TODO: fill in
  titleEn: TODO,       // TODO: fill in — e.g. "Both practices (bundle)"
  titleTr: TODO,       // TODO: fill in
  descriptionEn: TODO, // TODO: fill in
  descriptionTr: TODO, // TODO: fill in
  priceUsd: 0,         // TODO: fill in — cents (usually less than the two singles combined)
  priceTry: 0,         // TODO: fill in — kuruş
  includesSlugs: ['video-1', 'video-2'], // keep in sync with the single slugs above
};

function findPlaceholders() {
  const missing = [];
  const check = (obj, label) => {
    for (const [k, v] of Object.entries(obj)) {
      if (v === TODO) missing.push(`${label}.${k}`);
      if ((k === 'priceUsd' || k === 'priceTry') && v === 0) missing.push(`${label}.${k}`);
    }
  };
  SINGLES.forEach((s, i) => check(s, `SINGLES[${i}] (${s.slug})`));
  check(BUNDLE, `BUNDLE (${BUNDLE.slug})`);
  return missing;
}

async function upsertProduct(values) {
  const [existing] = await db.select().from(schema.products)
    .where(eq(schema.products.slug, values.slug));
  if (existing) {
    console.log(`- ${values.slug}: already exists, skipping`);
    return existing;
  }
  const [row] = await db.insert(schema.products).values(values).returning();
  console.log(`- ${values.slug}: created`);
  return row;
}

async function main() {
  const missing = findPlaceholders();
  if (missing.length) {
    console.error('Seed aborted — fill in these TODO values first:');
    missing.forEach((m) => console.error(`  • ${m}`));
    process.exit(1);
  }

  const singleRows = [];
  for (const s of SINGLES) {
    singleRows.push(await upsertProduct({ ...s, type: 'single' }));
  }

  const { includesSlugs, ...bundleValues } = BUNDLE;
  const bundleRow = await upsertProduct({
    ...bundleValues,
    type: 'bundle',
    videoIdEn: null,
    videoIdTr: null,
  });

  for (const slug of includesSlugs) {
    const single = singleRows.find((r) => r.slug === slug);
    if (!single) throw new Error(`Bundle references unknown slug: ${slug}`);
    await db.insert(schema.bundleItems)
      .values({ bundleId: bundleRow.id, productId: single.id })
      .onConflictDoNothing();
  }

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
