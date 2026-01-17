import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Determine database directory based on environment
// In serverless environments (Vercel), use /tmp directory (writable in serverless)
// In local development, use ./data directory
// Note: /tmp is ephemeral in serverless - data may be lost on cold starts
// For production, consider using a persistent database service (PostgreSQL, etc.)
const isServerless = !!(
  process.env.VERCEL || 
  process.env.AWS_LAMBDA_FUNCTION_NAME || 
  process.env.VERCEL_ENV ||
  (typeof process.env.VERCEL_REGION === 'string')
);
const dataDir = isServerless 
  ? path.join(os.tmpdir(), 'mural-pay-demo')
  : path.join(process.cwd(), 'data');

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database file path
// Use DATABASE_URL if provided, otherwise use appropriate directory
let dbPath = process.env.DATABASE_URL?.replace('file:', '');
if (!dbPath) {
  dbPath = path.join(dataDir, 'openDestiny.db');
}

// Create SQLite database connection
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Create Drizzle ORM instance
export const db = drizzle(sqlite, { schema });

// Initialize database tables
export function initializeDatabase() {
  // Create orders table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      total_usdc REAL NOT NULL,
      items TEXT NOT NULL,
      customer_wallet TEXT
    )
  `);

  // Create payments table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      created_at INTEGER NOT NULL,
      mural_transaction_id TEXT,
      transaction_hash TEXT,
      amount REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
    )
  `);

  // Create payouts table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS payouts (
      id TEXT PRIMARY KEY,
      payment_id TEXT NOT NULL REFERENCES payments(id),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      mural_payout_request_id TEXT,
      usdc_amount REAL NOT NULL,
      cop_amount REAL,
      exchange_rate REAL,
      status TEXT NOT NULL DEFAULT 'created'
    )
  `);
}

// Initialize on import
initializeDatabase();

export default db;
