// Applies pending Drizzle migrations to the Neon database.
// Runs automatically on Fly deploy (see fly.toml release_command) or manually:
//   DATABASE_URL=... npm run db:migrate
const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const { migrate } = require('drizzle-orm/neon-http/migrator');
const path = require('path');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  const db = drizzle(neon(process.env.DATABASE_URL));
  await migrate(db, { migrationsFolder: path.join(__dirname, '..', 'migrations') });
  console.log('Migrations applied.');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
