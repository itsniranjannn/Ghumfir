import mysql from 'mysql2/promise';
import 'dotenv/config';

const sslOption = process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('ssl')
  ? { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  : undefined;

export const pool = process.env.DATABASE_URL
  ? mysql.createPool({
      uri: process.env.DATABASE_URL,
      ssl: sslOption,
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
    })
  : mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ghumfir',
      ssl: sslOption,
      waitForConnections: true,
      connectionLimit: 10,
      decimalNumbers: true,
    });

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

let migrationPromise = null;

/** Ensures backward-compatible database migrations (e.g. adding google_id, nullable password_hash) on startup. */
export async function ensureMigrations() {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    try {
      // 1. Add google_id column if not exists
      const [googleCol] = await pool.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'google_id' AND (TABLE_SCHEMA = DATABASE() OR TABLE_SCHEMA = ?)",
        [process.env.DB_NAME || 'ghumfir']
      );
      if (!googleCol || googleCol.length === 0) {
        await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(100) NULL UNIQUE AFTER password_hash');
        console.log('[db:migration] Added google_id column to users table');
      }

      // 2. Make password_hash nullable (needed for OAuth users who have no password)
      await pool.query('ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL');
    } catch (err) {
      console.warn('[db:migration:warn]', err.message);
    }
  })();
  return migrationPromise;
}

