const { Pool } = require('pg');
require('dotenv').config();

// Railway internal hostname doesn't use SSL; external proxy does
const isRailwayInternal = process.env.DATABASE_URL?.includes('railway.internal');
const sslConfig = process.env.NODE_ENV === 'production' && !isRailwayInternal
  ? { rejectUnauthorized: false }
  : undefined;

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'nebs_marketing_os',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL connected successfully');
    client.release();
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error.message || error);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
