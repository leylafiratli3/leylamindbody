const { neon } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-http');
const schema = require('./schema');

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set — store endpoints will fail until it is configured.');
}

const sql = neon(process.env.DATABASE_URL || 'postgres://placeholder:placeholder@localhost/placeholder');
const db = drizzle(sql, { schema });

module.exports = { db, schema };
