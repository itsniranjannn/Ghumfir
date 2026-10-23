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

