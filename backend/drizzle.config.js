/** @type {import('drizzle-kit').Config} */
module.exports = {
  dialect: 'postgresql',
  schema: './db/schema.js',
  out: './migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL || '',
  },
};
