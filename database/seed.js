#!/usr/bin/env node
/**
 * CAMPUSHUB DATABASE SEED SCRIPT (PostgreSQL / Supabase)
 * Run via: node database/seed.js or npm run db:seed
 */

const db = require('./db');

async function runSeed() {
  console.log('⚡ [CAMPUSHUB DB] Connecting to PostgreSQL database...');
  try {
    const pool = db.getPool();
    console.log('📄 [CAMPUSHUB DB] Initializing relational schema (schema.sql)...');
    await db.initSchema();
    console.log('🌱 [CAMPUSHUB DB] Seeding verified campus datasets (seed.sql)...');
    await db.seedData();

    // Verification stats
    const userCount = (await pool.query('SELECT COUNT(*) as count FROM users')).rows[0].count;
    const teamCount = (await pool.query('SELECT COUNT(*) as count FROM teams')).rows[0].count;
    const commCount = (await pool.query('SELECT COUNT(*) as count FROM communities')).rows[0].count;
    const discCount = (await pool.query('SELECT COUNT(*) as count FROM discussions')).rows[0].count;
    const eventCount = (await pool.query('SELECT COUNT(*) as count FROM events')).rows[0].count;
    const prodCount = (await pool.query('SELECT COUNT(*) as count FROM products')).rows[0].count;

    console.log('✅ [CAMPUSHUB DB] PostgreSQL seeding completed successfully!');
    console.log(`📊 Statistics:
  • Users:         ${userCount}
  • Teams:         ${teamCount}
  • Communities:   ${commCount}
  • Discussions:   ${discCount}
  • Events:        ${eventCount}
  • Products:      ${prodCount}
`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ [CAMPUSHUB DB] Seeding error:', err.message);
    process.exit(1);
  }
}

runSeed();
